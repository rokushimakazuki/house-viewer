// 11/20 プランの「内装・外装のパターン」切り替え。u.html の最後で読み込む。
// モデル（GLB）の材料の名前（floor, wall, accent …）ごとに、色と模様を差し替える。元の見た目にも戻せる。
// 模様（木の床・塗り壁・タイル・石目・サイディング）はこのファイルの中で描く（画像ファイルは使わない）。
import * as THREE from 'three';

const tl = new THREE.TextureLoader();
const cache = {};
function load(name, srgb, rep) {
  const k = name + '@' + rep;
  if (!cache[k]) {
    const t = tl.load('assets/tex/' + name + '.jpg');
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    cache[k] = t;
  }
  return cache[k];
}
function rnd(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function canvasTex(key, w, h, draw, rx = 1, ry = 1) {
  if (cache[key]) return cache[key];
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8; t.colorSpace = THREE.SRGBColorSpace; t.flipY = false;
  return (cache[key] = t);
}
const hex = (n) => '#' + n.toString(16).padStart(6, '0');
function rgb(n, k = 0, a = 1) {   // 色を明るく（k>0）・暗く（k<0）
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + k)));
  return `rgba(${f(r)},${f(g)},${f(b)},${a})`;
}
// ふちが目立たないように、上下左右に繰り返して描く
function wrapDraw(g, W, H, fn) { for (const dx of [-W, 0, W]) for (const dy of [-H, 0, H]) { g.save(); g.translate(dx, dy); fn(); g.restore(); } }

// 塗り壁・コンクリート調（1枚の絵＝2m 角。まだらと細かい粒）
const plasterTex = (col, amt = 10, seed = 1) => canvasTex('pl' + col + '_' + amt + '_' + seed, 512, 512, (g, W, H) => {
  const r = rnd(seed);
  g.fillStyle = hex(col); g.fillRect(0, 0, W, H);
  for (let i = 0; i < 160; i++) {
    const x = r() * W, y = r() * H, rad = 30 + r() * 140, k = (r() - 0.5) * 2 * amt;
    wrapDraw(g, W, H, () => { const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, rgb(col, k, 0.35)); gr.addColorStop(1, rgb(col, k, 0)); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); });
  }
  for (let i = 0; i < 9000; i++) { g.fillStyle = rgb(col, (r() - 0.5) * amt * 1.6, 0.5); g.fillRect(r() * W, r() * H, 1.5, 1.5); }
}, 0.5, 0.5);
// 写真の素材（assets/tex の *_diff.jpg）を、そのまま読み込んで「色を掛けて」指定の色にする。
// 写真の平均の色（リニア値。Python で計算）で割って、平均がちょうど指定の色になるようにする
const PHOTO_MEAN = {
  oak_wood_planks: [0.3645, 0.1811, 0.0886],
  wood_floor: [0.2176, 0.1175, 0.0554],
  white_plaster_02: [0.272, 0.2461, 0.1985],
};
function tint(m, name, col) {
  const c = new THREE.Color(col);   // sRGB の指定 → three.js の中ではリニア値
  const mean = PHOTO_MEAN[name];
  m.color.setRGB(c.r / mean[0], c.g / mean[1], c.b / mean[2], THREE.LinearSRGBColorSpace);
}
// クロス（壁紙）：色はほぼ一様、ごく細かい粒だけ（1枚の絵＝1m 角）
const clothTex = (col) => canvasTex('cl' + col, 512, 512, (g, W, H) => {
  const r = rnd(9);
  g.fillStyle = hex(col); g.fillRect(0, 0, W, H);
  for (let i = 0; i < 26000; i++) { g.fillStyle = rgb(col, (r() - 0.5) * 7, 0.6); g.fillRect(r() * W, r() * H, 1, 1); }
});
// 600mm 角のタイル（1枚の絵＝1.2m）
const tileTex = (col) => canvasTex('tile' + col, 1024, 1024, (g, W) => {
  const r = rnd(11), T = W / 2;
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
    g.fillStyle = rgb(col, (r() - 0.5) * 10); g.fillRect(i * T, j * T, T, T);
    for (let k = 0; k < 60; k++) { const x = i * T + r() * T, y = j * T + r() * T, rad = 20 + r() * 90, gr = g.createRadialGradient(x, y, 0, x, y, rad); const kk = (r() - 0.5) * 16; gr.addColorStop(0, rgb(col, kk, 0.3)); gr.addColorStop(1, rgb(col, kk, 0)); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
    for (let k = 0; k < 3000; k++) { g.fillStyle = rgb(col, (r() - 0.5) * 22, 0.6); g.fillRect(i * T + r() * T, j * T + r() * T, 2, 2); }
  }
  g.fillStyle = rgb(col, -40); for (const p of [0, T]) { g.fillRect(p, 0, 4, W); g.fillRect(0, p, W, 4); }
});
// 石目のタイル 600×300（1枚の絵＝1.2m 角）
const stoneTex = (col) => canvasTex('stone' + col, 1024, 1024, (g) => {
  const r = rnd(23);
  for (let row = 0; row < 4; row++) {
    const off = row % 2 ? 256 : 0;
    for (let i = -1; i < 3; i++) {
      const x = i * 512 + off, y = row * 256, b = (r() - 0.5) * 26;
      g.fillStyle = rgb(col, b); g.fillRect(x, y, 512, 256);
      for (let k = 0; k < 40; k++) { const cx = x + r() * 512, cy = y + r() * 256, rad = 15 + r() * 70, gr = g.createRadialGradient(cx, cy, 0, cx, cy, rad); const kk = b + (r() - 0.5) * 30; gr.addColorStop(0, rgb(col, kk, 0.4)); gr.addColorStop(1, rgb(col, kk, 0)); g.fillStyle = gr; g.fillRect(cx - rad, cy - rad, rad * 2, rad * 2); }
      for (let k = 0; k < 900; k++) { g.fillStyle = rgb(col, b + (r() - 0.5) * 36, 0.7); g.fillRect(x + r() * 512, y + r() * 256, 2 + r() * 4, 1 + r() * 2); }
      g.fillStyle = rgb(col, -40); g.fillRect(x, y, 512, 3); g.fillRect(x, y, 3, 256);
    }
  }
}, 0.5, 0.5);
// 外壁のサイディング（1枚の絵＝1.82m×0.91m、縦の目地 455mm）
const sidingTex = (col) => canvasTex('siding' + col, 1024, 512, (g, W, H) => {
  const r = rnd(5);
  g.fillStyle = hex(col); g.fillRect(0, 0, W, H);
  for (let k = 0; k < 6000; k++) { g.fillStyle = rgb(col, (r() - 0.5) * 14, 0.6); g.fillRect(r() * W, r() * H, 2, 2); }
  for (let x = 0; x < W; x += 256) { g.fillStyle = rgb(col, -28); g.fillRect(x, 0, 3, H); g.fillStyle = rgb(col, 14, 0.6); g.fillRect(x + 3, 0, 2, H); }
  g.fillStyle = rgb(col, -24); g.fillRect(0, 0, W, 3);
});

// ---- パターン ----
// 面の指定： [種類, …]
//   wood（写真の木を染め直す：素材名・色・木目の強さ）／concrete（写真のコンクリートを染め直す：色・強さ）
//   cloth（クロス）／tile（600角タイル）／stone（石目・エコカラット調）
// 木の床は「オークの挽き板」（oak_wood_planks・幅広）と「細めの板」（wood_floor）の2種類
export const PATTERNS = {
  orig: { name: 'はじめの色' },
  p1: { name: '① グレー×木の床', note: '薄いグレーのクロス、オークの挽き板の床、テレビの壁はグレーの石目タイル（エコカラット調）、キッチンはコンクリート調、扉は濃いグレー（写真1の雰囲気）',
    floor: ['wood', 'oak_wood_planks', 0xa57a52, 1.1], wall: ['cloth', 0xb6b4b0], ceiling: ['cloth', 0xc8c6c2], accent: ['stone', 0x76787b], woodceil: ['wood', 'oak_wood_planks', 0x5e4330, 1.2],
    oriage: ['wood', 'oak_wood_planks', 0x7a5a40, 1.1], tread: 0x5e4029, riser: 0x4e3626, kitchen: ['concrete', 0x75777a, 1.3], counter: ['concrete', 0x86888b, 1.1], door: 0x393b3e, frame: 0x262728,
    steel: 0x1c1d1e, baseboard: 0x393b3e, siding: 0x3a3d40, roof: 0x2b2c2e, soffit: 0x3a3b3c },
  p2: { name: '② グレージュ×明るい木', note: 'グレージュのクロス、明るい色のオークの挽き板、テレビの壁はグレーの塗り壁、和室の天井と階段は木（写真2の雰囲気）',
    floor: ['wood', 'oak_wood_planks', 0x8a6c4e, 1.0], wall: ['cloth', 0xc4bbad], ceiling: ['cloth', 0xd2cbc0], accent: ['concrete', 0x76797c, 1.4], woodceil: ['wood', 'oak_wood_planks', 0xa87a4d, 1.1],
    oriage: ['wood', 'oak_wood_planks', 0xb3875a, 1.0], tread: 0xa87a4d, riser: 0x8a6440, kitchen: ['concrete', 0x6c6f72, 1.3], counter: 0xe9e7e2, door: 0xdcd6cc, frame: 0x3a3b3c,
    steel: 0x2a2b2c, baseboard: 0xcfc8bc, siding: 0x8a8c8e, roof: 0x2f3033, soffit: 0xb3875a },
  p3: { name: '③ ダーク×石目タイル', note: 'グレーのタイルの床、グレーのクロス、テレビの壁は濃い石目、キッチンと扉は黒（写真3の雰囲気）',
    floor: ['tile', 0x6f6b67], wall: ['cloth', 0x9e9c98], ceiling: ['cloth', 0xb4b2ae], accent: ['stone', 0x56585b], woodceil: ['concrete', 0x5f6163, 1.2],
    oriage: ['concrete', 0x6a6c6e, 1.0], tread: 0x46474a, riser: 0x36373a, kitchen: 0x26272a, counter: ['concrete', 0x4c4d50, 1.2], door: 0x2a2b2e, frame: 0x1a1b1c,
    steel: 0x141516, baseboard: 0x36373a, siding: 0x232426, roof: 0x1e1f21, soffit: 0x2e2f31 },
  p4: { name: '④ 濃い茶×黒×白', note: 'ウォールナット色の細めの板の床、ベージュのクロス、テレビの壁は濃い茶の木、キッチンと扉は黒、外壁は白',
    floor: ['wood', 'oak_wood_planks', 0x5c3c2a, 1.1], wall: ['cloth', 0xc2b6a4], ceiling: ['cloth', 0xd0c6b7], accent: ['wood', 'oak_wood_planks', 0x8a6246, 1.0], woodceil: ['wood', 'oak_wood_planks', 0x5c3c2a, 1.1],
    oriage: ['wood', 'oak_wood_planks', 0x8a6246, 1.0], tread: 0x5a3b26, riser: 0x46301f, kitchen: 0x1e1f21, counter: ['concrete', 0x333437, 1.1], door: 0x1e1f21, frame: 0x1e1f21,
    steel: 0x18191a, baseboard: 0x2e2f31, siding: 0xe6e3dd, roof: 0x2b2c2e, soffit: 0x5a3b26 },
};
// 材料ごとの、絵1枚の大きさの調整（GLB の UV は floor＝1.2m、wall・ceiling＝1m、accent・woodceil＝0.6m 単位）
// 写真の木は1枚＝約2m（オーク）にしたいので floor は 0.6
const REP = { floor: 0.6, accent: 0.3, woodceil: 0.3, oriage: 0.5, wall: 1, ceiling: 1, kitchen: 0.5, counter: 0.5 };

function remember(m) {
  if (m.userData.orig) return;
  m.userData.orig = { map: m.map, normalMap: m.normalMap, roughnessMap: m.roughnessMap, color: m.color.getHex(), roughness: m.roughness, metalness: m.metalness };
}
function restore(m) {
  const o = m.userData.orig; if (!o) return;
  m.map = o.map; m.normalMap = o.normalMap; m.roughnessMap = o.roughnessMap; m.color.setHex(o.color); m.roughness = o.roughness; m.metalness = o.metalness; m.needsUpdate = true;
}
function plain(m, col, rough = 0.6, metal = 0) { m.map = null; m.normalMap = null; m.roughnessMap = null; m.color.setHex(col); m.roughness = rough; m.metalness = metal; m.needsUpdate = true; }
function surface(m, spec, name) {
  const kind = spec[0], rp = REP[name] ?? 1;
  m.roughnessMap = null; m.metalness = 0; m.color.setHex(0xffffff);
  const nrm = (tex, rep, k) => { m.normalMap = load(tex + '_nor', false, rep); m.normalScale && m.normalScale.set(k, k); };
  if (kind === 'wood') {
    const [, tex, col, ct] = spec;
    m.map = load(tex + '_diff', true, rp); tint(m, tex, col); nrm(tex, rp, 0.8 * (ct || 1));
    m.roughness = name === 'floor' ? 0.7 : 0.85;   // 粗さの画像は使わない（濃くてツヤが出すぎ、空が映った）
  } else if (kind === 'concrete') {
    const [, col, ct] = spec;
    m.map = load('white_plaster_02_diff', true, rp); tint(m, 'white_plaster_02', col); nrm('white_plaster_02', rp, 0.8 * (ct || 1)); m.roughness = 0.85;
  } else if (kind === 'cloth') {
    m.map = clothTex(spec[1]); m.map.repeat.set(rp, rp); nrm('white_plaster_02', 3, 0.25); m.roughness = 0.95;
  } else if (kind === 'tile') { m.map = tileTex(spec[1]); nrm('white_plaster_02', 2, 0.15); m.roughness = 0.3; }
  else if (kind === 'stone') { m.map = stoneTex(spec[1]); m.map.repeat.set(0.5, 0.5); nrm('white_plaster_02', 1, 1.6); m.roughness = 0.8; }
  m.needsUpdate = true;
}
const SPEC_KEYS = ['floor', 'wall', 'ceiling', 'accent', 'woodceil', 'oriage', 'kitchen', 'counter'];
function applyTo(m, p) {
  const n = m.name;
  if (!p.floor) { restore(m); return; }
  const v = p[n];
  if (v === undefined) return;
  if (SPEC_KEYS.includes(n) && Array.isArray(v)) surface(m, v, n);
  else if (n === 'siding') { m.map = sidingTex(v); m.normalMap = null; m.color.setHex(0xffffff); m.roughness = 0.8; m.needsUpdate = true; }
  else if (n === 'frame' || n === 'steel') plain(m, v, 0.45, 0.3);
  else plain(m, v, n === 'counter' ? 0.35 : 0.6);
}

let current = 'orig';
try { current = localStorage.getItem('design_u') || 'orig'; } catch (e) { /* 使えないときは、はじめの色 */ }
if (!PATTERNS[current]) current = 'orig';
const KEYS = ['floor', 'wall', 'ceiling', 'accent', 'woodceil', 'tread', 'oriage', 'riser', 'kitchen', 'counter', 'door', 'frame', 'steel', 'baseboard', 'siding', 'roof', 'soffit'];
function applyAll() {
  const d = window._dbg; if (!d) return false;
  const p = PATTERNS[current];
  d.rig.traverse((o) => {
    if (!o.isMesh || !KEYS.includes(o.material.name)) return;
    const m = o.material;
    if (m.userData.design === current) return;
    remember(m); applyTo(m, p); m.userData.design = current;
  });
  // 白っぽく飛びにくいように、パターンを選んだときは少しだけ露出を下げる
  // 昼・夜の基準（u.html と同じ：昼 1.1、夜 1.0）に、パターンを選んだときだけ係数を掛ける（夜は照明で白く飛びやすいので強め）
  const night = d.ext && d.ext.isNight && d.ext.isNight();
  const base = night ? 1.0 : 1.1;
  d.renderer.toneMappingExposure = p.floor ? base * (night ? 0.6 : 0.85) : base;
  d.ext && d.ext.invalidate && d.ext.invalidate();
  return true;
}
export function setDesign(k) {
  current = k;
  try { localStorage.setItem('design_u', k); } catch (e) { /* 保存できなくても切り替えはできる */ }
  document.querySelectorAll('[data-design]').forEach((b) => b.classList.toggle('on', b.dataset.design === k));
  const note = document.querySelector('#designnote'); if (note) note.textContent = PATTERNS[k].note || '';
  const s2 = document.querySelector('#designsel'); if (s2) s2.value = k;
  applyAll();
}
// 画面のボタン
const wrap = document.querySelector('#designs');
if (wrap) {
  for (const k in PATTERNS) {
    const b = document.createElement('button'); b.dataset.design = k; b.textContent = PATTERNS[k].name;
    b.onclick = () => setDesign(k); wrap.append(b);
  }
}
const sel = document.querySelector('#designsel');
if (sel) {
  for (const k in PATTERNS) { const o = document.createElement('option'); o.value = k; o.textContent = PATTERNS[k].name; sel.append(o); }
  sel.onchange = () => setDesign(sel.value);
}
setDesign(current);
// あとから読み込まれたモデル（窓の高さを変えたとき）にも当てる
setInterval(applyAll, 1500);
const nightChk = document.querySelector('#night'); if (nightChk) nightChk.addEventListener('change', () => setTimeout(applyAll, 0));   // 昼夜を切り替えたらすぐ露出を合わせる
window._design = { setDesign, PATTERNS };
