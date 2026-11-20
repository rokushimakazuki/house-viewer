// 11/20 プランの「内装・外装のパターン」切り替え。u.html の最後で読み込む。
// モデル（GLB）の材料の名前（floor, wall, accent …）ごとに、色と模様を差し替える。元の見た目にも戻せる。
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
function shade(n, k) {   // 色を明るく（k>0）・暗く（k<0）
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + k)));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}
// 600mm 角のタイル（1枚の絵＝1.2m）
const tileTex = (col) => canvasTex('tile' + col, 512, 512, (g, W) => {
  const r = rnd(11);
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
    g.fillStyle = shade(col, (r() - 0.5) * 10); g.fillRect(i * 256, j * 256, 256, 256);
    for (let k = 0; k < 900; k++) { g.fillStyle = shade(col, (r() - 0.5) * 18); g.fillRect(i * 256 + r() * 256, j * 256 + r() * 256, 2, 2); }
  }
  g.fillStyle = shade(col, -35); for (const p of [0, 256]) { g.fillRect(p, 0, 3, 512); g.fillRect(0, p, 512, 3); }
});
// 石目のタイル 600×300（1枚の絵＝1.2m 角）
const stoneTex = (col) => canvasTex('stone' + col, 512, 512, (g) => {
  const r = rnd(23);
  for (let row = 0; row < 4; row++) {
    const off = row % 2 ? 128 : 0;
    for (let i = -1; i < 3; i++) {
      const x = i * 256 + off, y = row * 128;
      g.fillStyle = shade(col, (r() - 0.5) * 22); g.fillRect(x, y, 256, 128);
      for (let k = 0; k < 500; k++) { g.fillStyle = shade(col, (r() - 0.5) * 30); g.fillRect(x + r() * 256, y + r() * 128, 2 + r() * 3, 1 + r() * 2); }
      g.fillStyle = shade(col, -30); g.fillRect(x, y, 256, 2); g.fillRect(x, y, 2, 128);
    }
  }
}, 0.5, 0.5);
// 外壁のサイディング（1枚の絵＝1.82m×0.91m、縦の目地 455mm）
const sidingTex = (col) => canvasTex('siding' + col, 512, 256, (g, W, H) => {
  const r = rnd(5);
  g.fillStyle = hex(col); g.fillRect(0, 0, W, H);
  for (let k = 0; k < 2500; k++) { g.fillStyle = shade(col, (r() - 0.5) * 10); g.fillRect(r() * W, r() * H, 2, 2); }
  g.fillStyle = shade(col, -22); for (let x = 0; x < W; x += 128) g.fillRect(x, 0, 2, H);
  g.fillRect(0, 0, W, 2);
});

// ---- パターン ----
// floor: [模様, 色]（oak＝木の床に色をかける／tile＝タイル）、accent: [模様, 色]（plaster＝塗り壁／stone＝石目タイル／wood＝木）
export const PATTERNS = {
  orig: { name: 'はじめの色' },
  p1: { name: '① グレー×木の床', note: '白い壁＋グレーの塗り壁、中間色の木の床、扉は濃いグレー（写真1の雰囲気）',
    floor: ['oak', 0xc39d7e], wall: 0xf2f1ee, ceiling: 0xf5f4f1, accent: ['plaster', 0x8c8e90], woodceil: ['wood', 0x6a4a34],
    tread: 0x6e4a30, oriage: 0x4a4b4d, riser: 0x5a3e2b, kitchen: 0x6f7173, counter: 0x7d7f81, door: 0x3b3d40, frame: 0x2a2b2c,
    steel: 0x1f2021, baseboard: 0xf2f1ee, siding: 0x3a3d40, roof: 0x2b2c2e, soffit: 0x3a3b3c },
  p2: { name: '② 白×グレー×木の天井', note: '白とグレーに明るい床、和室の天井と階段は木（写真2の雰囲気）',
    floor: ['oak', 0xe4dbd0], wall: 0xf4f3ef, ceiling: 0xf6f5f2, accent: ['plaster', 0x77797b], woodceil: ['wood', 0xc08a58],
    tread: 0xb0814f, oriage: 0xc08a58, riser: 0x8a6440, kitchen: 0x6a6d70, counter: 0xf0efec, door: 0xefeeea, frame: 0x3a3b3c,
    steel: 0x2a2b2c, baseboard: 0xf0efec, siding: 0x8a8c8e, roof: 0x2f3033, soffit: 0xc08a58 },
  p3: { name: '③ ダーク×石目タイル', note: 'グレーのタイルの床、テレビの壁は濃い石目、キッチンと扉は黒（写真3の雰囲気）',
    floor: ['tile', 0x9e9a94], wall: 0xe2e0dc, ceiling: 0xf3f2ef, accent: ['stone', 0x56585a], woodceil: ['plaster', 0x6b6d6f],
    tread: 0x48494b, oriage: 0x3a3b3d, riser: 0x3a3b3d, kitchen: 0x2a2b2d, counter: 0x4a4b4d, door: 0x2c2d30, frame: 0x1c1d1e,
    steel: 0x161718, baseboard: 0x3a3b3d, siding: 0x232426, roof: 0x1e1f21, soffit: 0x2e2f31 },
  p4: { name: '④ 濃い茶×黒×白', note: 'ウォールナットのような濃い床、テレビの壁と階段は濃い茶、キッチンと扉は黒、外壁は白',
    floor: ['oak', 0x86603f], wall: 0xf3f2ee, ceiling: 0xf6f5f2, accent: ['wood', 0x5a3e2a], woodceil: ['wood', 0x5a3e2a],
    tread: 0x5e3f29, oriage: 0x4a3020, riser: 0x4a3020, kitchen: 0x1f2022, counter: 0x2e2f31, door: 0x1f2022, frame: 0x1f2022,
    steel: 0x1a1b1c, baseboard: 0x2e2f31, siding: 0xe9e7e2, roof: 0x2b2c2e, soffit: 0x5e3f29 },
};

function remember(m) {
  if (m.userData.orig) return;
  m.userData.orig = { map: m.map, normalMap: m.normalMap, roughnessMap: m.roughnessMap, color: m.color.getHex(), roughness: m.roughness, metalness: m.metalness };
}
function restore(m) {
  const o = m.userData.orig; if (!o) return;
  m.map = o.map; m.normalMap = o.normalMap; m.roughnessMap = o.roughnessMap; m.color.setHex(o.color); m.roughness = o.roughness; m.metalness = o.metalness; m.needsUpdate = true;
}
function plain(m, col, rough = 0.6, metal = 0) { m.map = null; m.roughnessMap = null; m.color.setHex(col); m.roughness = rough; m.metalness = metal; m.needsUpdate = true; }
function surface(m, kind, col) {
  if (kind === 'oak') { m.map = load('oak_wood_planks_diff', true, 1); m.normalMap = load('oak_wood_planks_nor', false, 1); m.roughnessMap = load('oak_wood_planks_rough', false, 1); m.roughness = 1; m.color.setHex(col); }
  else if (kind === 'wood') { m.map = load('oak_wood_planks_diff', true, 0.5); m.normalMap = load('oak_wood_planks_nor', false, 0.5); m.roughnessMap = null; m.roughness = 0.75; m.color.setHex(col); }
  else if (kind === 'tile') { m.map = tileTex(col); m.normalMap = null; m.roughnessMap = null; m.roughness = 0.45; m.color.setHex(0xffffff); }
  else if (kind === 'stone') { m.map = stoneTex(col); m.normalMap = load('white_plaster_02_nor', false, 1); m.roughnessMap = null; m.roughness = 0.8; m.color.setHex(0xffffff); }
  else { m.map = null; m.normalMap = load('white_plaster_02_nor', false, 1); m.roughnessMap = null; m.roughness = 0.92; m.color.setHex(col); }
  m.metalness = 0; m.needsUpdate = true;
}
function applyTo(m, p) {
  const n = m.name;
  if (!p.floor) { restore(m); return; }
  if (n === 'floor') surface(m, ...p.floor);
  else if (n === 'accent') surface(m, ...p.accent);
  else if (n === 'woodceil') surface(m, ...p.woodceil);
  else if (n === 'wall' || n === 'ceiling') { m.color.setHex(p[n]); m.needsUpdate = true; }
  else if (n === 'siding') { m.map = sidingTex(p.siding); m.color.setHex(0xffffff); m.needsUpdate = true; }
  else if (['tread', 'oriage', 'riser', 'kitchen', 'counter', 'door', 'baseboard', 'roof', 'soffit'].includes(n)) plain(m, p[n], n === 'counter' ? 0.35 : 0.65);
  else if (n === 'frame' || n === 'steel') plain(m, p[n], 0.45, 0.3);
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
window._design = { setDesign, PATTERNS };
