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
// 木の床（1枚の絵＝1.2m 角、幅15cm の板 8列。板ごとに色を変え、木目を描く）
const plankTex = (tones, seed = 3, rep = 1) => canvasTex('pk' + tones.join('_') + seed + '@' + rep, 1024, 1024, (g, W, H) => {
  const r = rnd(seed), ROW = H / 8;
  for (let row = 0; row < 8; row++) {
    let x = -r() * 600;
    while (x < W) {
      const L = 300 + r() * 600, base = tones[Math.floor(r() * tones.length)], j = (r() - 0.5) * 10, y0 = row * ROW;
      const draw = (ox) => {
        g.fillStyle = rgb(base, j); g.fillRect(ox, y0, L, ROW);
        // 板の中の明暗（ゆるいグラデーション）
        const gr = g.createLinearGradient(ox, 0, ox + L, 0); gr.addColorStop(0, rgb(base, j - 8, 0.35)); gr.addColorStop(0.5, rgb(base, j + 6, 0.15)); gr.addColorStop(1, rgb(base, j - 6, 0.35));
        g.fillStyle = gr; g.fillRect(ox, y0, L, ROW);
        // 木目（ゆらぐ細い線）
        for (let k = 0; k < 26; k++) {
          const yy = y0 + 4 + r() * (ROW - 8), amp = 1 + r() * 3, ph = r() * 6.28, fr = 0.004 + r() * 0.01;
          g.strokeStyle = rgb(base, (r() - 0.6) * 34, 0.35 + r() * 0.3); g.lineWidth = 0.6 + r() * 1.4; g.beginPath();
          for (let t = 0; t <= L; t += 12) { const py = yy + Math.sin(ph + t * fr) * amp; t ? g.lineTo(ox + t, py) : g.moveTo(ox, py); }
          g.stroke();
        }
        if (r() < 0.18) { const kx = ox + 40 + r() * (L - 80), ky = y0 + ROW * (0.3 + r() * 0.4); g.fillStyle = rgb(base, -45, 0.6); g.beginPath(); g.ellipse(kx, ky, 6 + r() * 6, 3 + r() * 3, 0, 0, 6.28); g.fill(); }
        g.fillStyle = 'rgba(25,18,12,0.55)'; g.fillRect(ox, y0, 2, ROW);   // 板の継ぎ目
      };
      draw(x); if (x + L > W) draw(x - W);
      x += L;
    }
    g.fillStyle = 'rgba(25,18,12,0.5)'; g.fillRect(0, row * ROW, W, 2);
  }
}, rep, rep);
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
// 面の指定： [模様, 色や色の組]。模様は planks（木の板）／tile（タイル）／stone（石目）／plaster（塗り壁・コンクリート調）
const ACACIA = [0xa8784c, 0x956541, 0xb38457, 0x8a5b3a, 0x9f7049];
const ASHGREY = [0x8f8370, 0x857966, 0x988c79, 0x7e725f, 0x8b7f6c];
const NATURAL = [0xb98a5c, 0xa87a4d, 0xc89a6a, 0x9c6e44];
const DARKOAK = [0x6a4a34, 0x5a3d2a, 0x7a563c, 0x4f3423];
const WALNUT = [0x6b4630, 0x5a3a26, 0x7a5238, 0x4e3220, 0x83593c];
export const PATTERNS = {
  orig: { name: 'はじめの色' },
  p1: { name: '① グレー×木の床', note: '薄いグレーの壁＋グレーの塗り壁、色むらのある木の床、グレーのキッチン、濃いグレーの扉（写真1の雰囲気）',
    floor: ['planks', ACACIA], wall: ['plaster', 0xb3b1ad, 6], ceiling: ['plaster', 0xc6c4c0, 4], accent: ['plaster', 0x77797c, 16], woodceil: ['planks', DARKOAK],
    tread: 0x5e4029, oriage: 0x46484a, riser: 0x4e3626, kitchen: ['plaster', 0x6d6f72, 14], counter: ['plaster', 0x7a7c7f, 12], door: 0x393b3e, frame: 0x262728,
    steel: 0x1c1d1e, baseboard: 0x393b3e, siding: 0x3a3d40, roof: 0x2b2c2e, soffit: 0x3a3b3c },
  p2: { name: '② 白×グレー×木の天井', note: 'あたたかいグレージュの壁、グレーの塗り壁、明るい木の床、和室の天井と階段は木（写真2の雰囲気）',
    floor: ['planks', ASHGREY], wall: ['plaster', 0xc2b9ab, 6], ceiling: ['plaster', 0xd0c9be, 4], accent: ['plaster', 0x6f7275, 16], woodceil: ['planks', NATURAL],
    tread: 0xa87a4d, oriage: 0xb3875a, riser: 0x8a6440, kitchen: ['plaster', 0x686b6e, 14], counter: 0xe9e7e2, door: 0xdcd6cc, frame: 0x3a3b3c,
    steel: 0x2a2b2c, baseboard: 0xcfc8bc, siding: 0x8a8c8e, roof: 0x2f3033, soffit: 0xb3875a },
  p3: { name: '③ ダーク×石目タイル', note: 'グレーのタイルの床、グレーの壁と天井、テレビの壁は濃い石目、キッチンと扉は黒（写真3の雰囲気）',
    floor: ['tile', 0x6f6b67], wall: ['plaster', 0x9c9a96, 8], ceiling: ['plaster', 0xb2b0ac, 5], accent: ['stone', 0x515356], woodceil: ['plaster', 0x5f6163, 12],
    tread: 0x46474a, oriage: 0x36373a, riser: 0x36373a, kitchen: 0x26272a, counter: ['plaster', 0x48494c, 14], door: 0x2a2b2e, frame: 0x1a1b1c,
    steel: 0x141516, baseboard: 0x36373a, siding: 0x232426, roof: 0x1e1f21, soffit: 0x2e2f31 },
  p4: { name: '④ 濃い茶×黒×白', note: 'ウォールナットのような濃い床、ベージュの壁、テレビの壁と階段は濃い茶、キッチンと扉は黒、外壁は白',
    floor: ['planks', WALNUT], wall: ['plaster', 0xbfb3a1, 6], ceiling: ['plaster', 0xcdc3b4, 4], accent: ['planks', WALNUT], woodceil: ['planks', WALNUT],
    tread: 0x5a3b26, oriage: 0x46301f, riser: 0x46301f, kitchen: 0x1e1f21, counter: ['plaster', 0x2e2f31, 10], door: 0x1e1f21, frame: 0x1e1f21,
    steel: 0x18191a, baseboard: 0x2e2f31, siding: 0xe6e3dd, roof: 0x2b2c2e, soffit: 0x5a3b26 },
};
// 材料ごとの、模様1枚の大きさ（GLB の UV は floor＝1.2m、wall・ceiling＝1m、accent・woodceil＝0.6m、kitchen 等＝1m 単位）
const REP = { floor: 1, accent: 0.5, woodceil: 0.5, wall: 1, ceiling: 1, kitchen: 1, counter: 1 };

function remember(m) {
  if (m.userData.orig) return;
  m.userData.orig = { map: m.map, normalMap: m.normalMap, roughnessMap: m.roughnessMap, color: m.color.getHex(), roughness: m.roughness, metalness: m.metalness };
}
function restore(m) {
  const o = m.userData.orig; if (!o) return;
  m.map = o.map; m.normalMap = o.normalMap; m.roughnessMap = o.roughnessMap; m.color.setHex(o.color); m.roughness = o.roughness; m.metalness = o.metalness; m.needsUpdate = true;
}
function plain(m, col, rough = 0.6, metal = 0) { m.map = null; m.roughnessMap = null; m.color.setHex(col); m.roughness = rough; m.metalness = metal; m.needsUpdate = true; }
function surface(m, spec, name) {
  const [kind, val, amt] = spec, rp = REP[name] ?? 1;
  m.roughnessMap = null; m.metalness = 0; m.color.setHex(0xffffff);
  if (kind === 'planks') {
    const t = plankTex(val, name === 'floor' ? 3 : 7, rp); m.map = t;
    m.normalMap = load('oak_wood_planks_nor', false, rp); m.normalScale && m.normalScale.set(0.6, 0.6); m.roughness = name === 'floor' ? 0.55 : 0.7;
  } else if (kind === 'tile') { m.map = tileTex(val); m.normalMap = null; m.roughness = 0.32; }
  else if (kind === 'stone') { m.map = stoneTex(val); m.normalMap = load('white_plaster_02_nor', false, 1); m.normalScale && m.normalScale.set(1, 1); m.roughness = 0.75; }
  else {
    const t = plasterTex(val, amt ?? 10, name.length); t.repeat.set(rp * 0.5, rp * 0.5); m.map = t;
    m.normalMap = load('white_plaster_02_nor', false, 1); m.normalScale && m.normalScale.set(0.5, 0.5); m.roughness = 0.9;
  }
  m.needsUpdate = true;
}
const SPEC_KEYS = ['floor', 'wall', 'ceiling', 'accent', 'woodceil', 'kitchen', 'counter'];
function applyTo(m, p) {
  const n = m.name;
  if (!p.floor) { restore(m); return; }
  const v = p[n];
  if (v === undefined) return;
  if (SPEC_KEYS.includes(n) && Array.isArray(v)) surface(m, v, n);
  else if (n === 'siding') { m.map = sidingTex(v); m.color.setHex(0xffffff); m.roughness = 0.8; m.needsUpdate = true; }
  else if (n === 'frame' || n === 'steel') plain(m, v, 0.45, 0.3);
  else plain(m, v, n === 'counter' ? 0.35 : 0.6);
}

let current = 'orig';
try { current = localStorage.getItem('design_u') || 'orig'; } catch (e) { /* 使えないときは、はじめの色 */ }
if (!PATTERNS[current]) current = 'orig';
const KEYS = ['floor', 'wall', 'ceiling', 'accent', 'woodceil', 'tread', 'oriage', 'riser', 'kitchen', 'counter', 'door', 'frame', 'steel', 'baseboard', 'siding', 'roof', 'soffit'];
let baseExposure = null;
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
  if (baseExposure === null) baseExposure = d.renderer.toneMappingExposure;
  d.renderer.toneMappingExposure = p.floor ? baseExposure * 0.85 : baseExposure;
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
