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

// 大理石（グレーに近い黒）：地の色むら＋白っぽい太い筋＋細い筋
const marbleTex = () => canvasTex('marble', 1024, 1024, (g, W, H) => {
  const r = rnd(41), base = 0x2e2f31;
  g.fillStyle = hex(base); g.fillRect(0, 0, W, H);
  for (let i = 0; i < 70; i++) {
    const x = r() * W, y = r() * H, rad = 60 + r() * 220, k = (r() - 0.5) * 16;
    wrapDraw(g, W, H, () => { const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, rgb(base, k, 0.5)); gr.addColorStop(1, rgb(base, k, 0)); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); });
  }
  const vein = (w, a, n) => {
    for (let v = 0; v < n; v++) {
      let x = r() * W, y = r() * H, ang = -0.6 + r() * 0.5;
      const pts = [[x, y]];
      for (let k = 0; k < 40; k++) { ang += (r() - 0.5) * 0.5; x += Math.cos(ang) * 30; y += Math.sin(ang) * 30; pts.push([x, y]); }
      wrapDraw(g, W, H, () => {
        for (const [lw, la] of [[w * 4, a * 0.15], [w * 2, a * 0.3], [w, a]]) {
          g.strokeStyle = `rgba(205,205,200,${la})`; g.lineWidth = lw; g.beginPath();
          pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py))); g.stroke();
        }
      });
    }
  };
  vein(2.2, 0.55, 5); vein(0.8, 0.35, 18);
  for (let i = 0; i < 12000; i++) { g.fillStyle = rgb(base, (r() - 0.5) * 18, 0.5); g.fillRect(r() * W, r() * H, 1, 1); }
}, 0.5, 0.5);
const TOPS = { pattern: '天板：パターンどおり', marble: '天板：黒の大理石（グレー寄り）' };
let topSel = 'pattern';
try { topSel = localStorage.getItem('design_u_top') || 'pattern'; } catch (e) { /* 使えないときはパターンどおり */ }
if (!TOPS[topSel]) topSel = 'pattern';

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
// ---- タップで選べる候補（材料の名前ごと）----
// 書き方：['wood', 写真, 色, 木目の強さ] ／ ['cloth', 色] ／ ['concrete', 色, 強さ] ／ ['tile', 色] ／ ['stone', 色]
//        ['marble'] ／ ['plain', 色, 粗さ] ／ ['tint', 色]（今の模様のまま色を掛ける） ／ ['siding', 色]
const OAK = 'oak_wood_planks';
const WOODS = [['明るい木', ['wood', OAK, 0xb3875a, 1.0]], ['中間の木', ['wood', OAK, 0x8a6246, 1.0]], ['濃い木', ['wood', OAK, 0x5c3c2a, 1.1]], ['黒', ['plain', 0x262626, 0.6]]];
export const CHOICES = {
  floor: { label: '床', opts: [['明るいオーク', ['wood', OAK, 0xa57a52, 1.1]], ['グレージュの木', ['wood', OAK, 0x8a7a66, 1.0]], ['ウォールナット', ['wood', OAK, 0x5c3c2a, 1.1]], ['グレーのタイル', ['tile', 0x6f6b67]]] },
  wall: { label: '壁（クロス）', opts: [['白', ['cloth', 0xd8d6d2]], ['薄いグレー', ['cloth', 0xb6b4b0]], ['グレージュ', ['cloth', 0xc4bbad]], ['濃いグレー', ['cloth', 0x7d7b78]]] },
  ceiling: { label: '天井', opts: [['白', ['cloth', 0xdedcd8]], ['グレー', ['cloth', 0xb4b2ae]], ['木', ['wood', OAK, 0xa87a4d, 1.0]]] },
  accent: { label: 'テレビの壁', opts: [['石目（エコカラット調）', ['stone', 0x76787b]], ['木', ['wood', OAK, 0x8a6246, 1.0]], ['グレーの塗り壁', ['concrete', 0x76797c, 1.4]], ['黒の塗り壁', ['concrete', 0x3a3b3d, 1.2]]] },
  woodceil: { label: '木の部分（下り天井・梁・柱）', opts: WOODS },
  tread: { label: '格子・階段・和室の扉', opts: WOODS },
  riser: { label: '小上がりの側面', opts: WOODS },
  oriage: { label: '和室の天井', opts: [['明るい木', ['wood', OAK, 0xb3875a, 1.0]], ['濃い木', ['wood', OAK, 0x6a4a34, 1.0]], ['グレー', ['cloth', 0x9e9c98]]] },
  tatami: { label: '畳', opts: [['緑', ['tint', 0xffffff]], ['グレー（和紙畳）', ['tint', 0xb4b4ae]], ['黄金色', ['tint', 0xf2dc9a]]] },
  kitchen: { label: 'キッチンの扉', opts: [['黒', ['plain', 0x1e1f21, 0.5]], ['グレーのコンクリート調', ['concrete', 0x6c6f72, 1.3]], ['白', ['plain', 0xe8e6e1, 0.4]], ['木', ['wood', OAK, 0x8a6246, 1.0]]] },
  counter: { label: 'キッチンの天板', opts: [['黒の大理石', ['marble']], ['白', ['plain', 0xe9e7e2, 0.3]], ['グレーのコンクリート調', ['concrete', 0x86888b, 1.1]]] },
  door: { label: 'ドア', opts: [['白', ['plain', 0xe6e3dd, 0.5]], ['木', ['wood', OAK, 0x9a7350, 1.0]], ['黒', ['plain', 0x1e1f21, 0.5]]] },
  table: { label: 'ダイニングテーブル', opts: [['明るい木', ['wood', OAK, 0xb08a60, 1.0]], ['ウォールナット', ['wood', OAK, 0x5c3c2a, 1.1]], ['黒', ['plain', 0x222222, 0.5]]] },
  chair_wood: { label: '椅子の木', opts: [['明るい木', ['plain', 0xa57a52, 0.7]], ['濃い木', ['plain', 0x4e3423, 0.7]], ['黒', ['plain', 0x222222, 0.6]]] },
  chair_seat: { label: '椅子の座面', opts: [['グレー', ['plain', 0x77736d, 1.0]], ['ベージュ', ['plain', 0xb5a88f, 1.0]], ['黒', ['plain', 0x2a2a2a, 1.0]]] },
  sofa: { label: 'ソファ', opts: [['明るいグレー', ['plain', 0x8e8a84, 1.0]], ['ベージュ', ['plain', 0xb3a78f, 1.0]], ['濃いグレー', ['plain', 0x4d4c4a, 1.0]]] },
  rug: { label: 'ラグ', opts: [['グレー', ['tint', 0xffffff]], ['濃いグレー', ['tint', 0x8a8a8a]], ['ベージュ', ['tint', 0xe8d6b4]]] },
  siding: { label: '外壁', opts: [['黒', ['siding', 0x3a3d40]], ['グレー', ['siding', 0x8a8c8e]], ['白', ['siding', 0xe6e3dd]]] },
  frame: { label: '窓の枠', opts: [['黒', ['plain', 0x262728, 0.45]], ['白', ['plain', 0xe6e3dd, 0.45]], ['ブロンズ', ['plain', 0x5a4a3c, 0.45]]] },
};
let OVR = {};
try { OVR = JSON.parse(localStorage.getItem('design_u_ovr') || '{}'); } catch (e) { OVR = {}; }
function applySpec(m, v, n) {
  if (!Array.isArray(v)) { plain(m, v, 0.6); return; }
  const k = v[0];
  if (k === 'plain') plain(m, v[1], v[2] ?? 0.6);
  else if (k === 'tint') { m.color.setHex(v[1]); m.needsUpdate = true; }
  else if (k === 'marble') { m.map = marbleTex(); m.normalMap = null; m.roughnessMap = null; m.color.setHex(0xffffff); m.roughness = 0.22; m.metalness = 0; m.needsUpdate = true; }
  else if (k === 'siding') { m.map = sidingTex(v[1]); m.normalMap = null; m.color.setHex(0xffffff); m.roughness = 0.8; m.needsUpdate = true; }
  else surface(m, v, n);
}
function applyTo(m, p) {
  const n = m.name;
  applyPattern(m, p);
  if (n === 'counter' && topSel === 'marble') applySpec(m, ['marble'], n);   // 天板を大理石にする（どのパターンでも）
  const o = OVR[n], c = CHOICES[n];
  if (c && o != null && c.opts[o]) applySpec(m, c.opts[o][1], n);          // タップで選んだもの
}
function applyPattern(m, p) {
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
const KEYS = [...new Set(['floor', 'wall', 'ceiling', 'accent', 'woodceil', 'tread', 'oriage', 'riser', 'kitchen', 'counter', 'door', 'frame', 'steel', 'baseboard', 'siding', 'roof', 'soffit', ...Object.keys(CHOICES)])];
function applyAll() {
  const d = window._dbg; if (!d) return false;
  const p = PATTERNS[current];
  d.rig.traverse((o) => {
    if (!o.isMesh || !KEYS.includes(o.material.name)) return;
    const m = o.material;
    const tag = current + '|' + topSel + '|' + (OVR[m.name] ?? '');
    if (m.userData.design === tag) return;
    remember(m); restore(m); applyTo(m, p); m.userData.design = tag;
  });
  // 白っぽく飛びにくいように、パターンを選んだときは少しだけ露出を下げる
  // 昼・夜の基準（u.html と同じ：昼 1.1、夜 1.0）に、パターンを選んだときだけ係数を掛ける（夜は照明で白く飛びやすいので強め）
  const night = d.ext && d.ext.isNight && d.ext.isNight();
  const base = night ? 1.0 : 1.1;
  d.renderer.toneMappingExposure = p.floor ? base * (night ? 0.6 : 0.85) : base;
  d.ext && d.ext.invalidate && d.ext.invalidate();
  return true;
}
export function setTop(k) {
  topSel = k;
  try { localStorage.setItem('design_u_top', k); } catch (e) { /* 保存できなくても切り替えはできる */ }
  document.querySelectorAll('.topsel').forEach((s) => { s.value = k; });
  applyAll();
}
function topSelect() {
  const s = document.createElement('select'); s.className = 'topsel'; s.style.cssText = 'font-size:14px;padding:6px';
  for (const k in TOPS) { const o = document.createElement('option'); o.value = k; o.textContent = TOPS[k]; s.append(o); }
  s.value = topSel; s.onchange = () => setTop(s.value); return s;
}
{
  const note = document.querySelector('#designnote');
  if (note) {
    const s = topSelect(); s.style.marginTop = '6px'; note.after(s);
    const hint = document.createElement('p'); hint.className = 'sub'; hint.style.margin = '6px 0 0';
    hint.textContent = '「中から見る」で、変えたい所（壁・天井・床・木の部分・キッチン・テーブル・椅子・ラグ・畳など）を軽くタップすると、色や素材を選べます。二本指で広げる／縮めると前後に進みます。';
    s.after(hint);
  }
  const ds = document.querySelector('#designsel');
  if (ds) { const grp = document.createElement('span'); grp.className = 'grp'; grp.append(topSelect()); ds.parentElement.after(grp); }
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
// ---- タップで色・素材を選ぶ ----
// 1本指で軽くタップ（ほとんど動かさず 0.4 秒以内）したときだけ反応。なぞる・二本指は今まで通り
const pop = document.createElement('div');
pop.style.cssText = 'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:50;background:rgba(28,30,33,.94);color:#fff;border-radius:14px;padding:12px 12px 10px;max-width:92vw;box-shadow:0 6px 20px rgba(0,0,0,.4);display:none;font-size:15px';
document.body.append(pop);
function closePop() { pop.style.display = 'none'; }
function openPop(n) {
  const c = CHOICES[n]; pop.innerHTML = '';
  const h = document.createElement('div'); h.style.cssText = 'font-weight:700;margin-bottom:8px;display:flex;justify-content:space-between;gap:12px;align-items:center';
  h.textContent = c.label + ' を変える';
  const x = document.createElement('button'); x.textContent = '×'; x.style.cssText = 'background:none;border:0;color:#fff;font-size:22px;padding:0 4px'; x.onclick = closePop; h.append(x);
  pop.append(h);
  const row = document.createElement('div'); row.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px';
  const btn = (label, on, f) => { const b = document.createElement('button'); b.textContent = label; b.style.cssText = `padding:8px 12px;border-radius:10px;border:1px solid ${on ? '#e8792f' : '#555'};background:${on ? '#3a2a1f' : '#2c2f33'};color:${on ? '#ffb27a' : '#fff'};font-size:15px`; b.onclick = f; row.append(b); };
  c.opts.forEach(([label], i) => btn(label, OVR[n] === i, () => { setOverride(n, i); openPop(n); }));
  btn('パターンどおり', OVR[n] == null, () => { setOverride(n, null); openPop(n); });
  pop.append(row); pop.style.display = 'block';
}
export function setOverride(n, i) {
  if (i == null) delete OVR[n]; else OVR[n] = i;
  try { localStorage.setItem('design_u_ovr', JSON.stringify(OVR)); } catch (e) { /* 保存できなくても切り替えはできる */ }
  applyAll();
}
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function visibleChain(o) { for (; o; o = o.parent) if (!o.visible) return false; return true; }
function pick(cx, cy) {
  const d = window._dbg; if (!d) return null;
  const r = d.renderer.domElement.getBoundingClientRect();
  ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
  d.camera.updateMatrixWorld(); ray.setFromCamera(ndc, d.camera); ray.firstHitOnly = false;
  const hits = ray.intersectObject(d.rig, true);
  for (const h of hits) {
    if (!h.object.isMesh || !visibleChain(h.object)) continue;
    const n = h.object.material && h.object.material.name;
    if (n === 'glass') continue;   // ガラスの向こうを見る
    return CHOICES[n] ? n : null;  // 一番手前の物だけ（選べない物なら何もしない）
  }
  return null;
}
{
  const cv = () => window._dbg && window._dbg.renderer.domElement;
  let t0 = null, touches = 0;
  const wait = setInterval(() => {
    const c = cv(); if (!c) return; clearInterval(wait);
    c.addEventListener('pointerdown', (e) => { touches++; t0 = touches === 1 ? { x: e.clientX, y: e.clientY, t: performance.now() } : null; });
    c.addEventListener('pointermove', (e) => { if (t0 && Math.hypot(e.clientX - t0.x, e.clientY - t0.y) > 8) t0 = null; });
    const up = (e) => {
      touches = Math.max(0, touches - 1);
      if (!t0 || e.type !== 'pointerup' || performance.now() - t0.t > 400) { t0 = null; return; }
      const n = pick(e.clientX, e.clientY); t0 = null;
      if (n) openPop(n); else closePop();
    };
    c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
  }, 300);
}
window._design = { setDesign, setTop, setOverride, PATTERNS, CHOICES, pick };
