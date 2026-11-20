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
// 写真の木（オーク）を切り貼りして作る模様。読み込むまでは平均の色。色はあとで材料の色を掛ける（tint）
function woodCanvas(key, draw, rx = 1, ry = 1, rot = 0) {
  if (cache[key]) return cache[key];
  const c = document.createElement('canvas'); c.width = c.height = 1024;
  const g = c.getContext('2d'); g.fillStyle = '#a2754f'; g.fillRect(0, 0, 1024, 1024);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8; t.colorSpace = THREE.SRGBColorSpace;
  if (rot) { t.center.set(0.5, 0.5); t.rotation = rot; }
  const img = new Image();
  img.onload = () => { draw(g, img); t.needsUpdate = true; const d = window._dbg; d && d.ext && d.ext.invalidate && d.ext.invalidate(); };
  img.src = 'assets/tex/oak_wood_planks_diff.jpg';
  return (cache[key] = t);
}
// ヘリンボーン張り：幅9cm・長さ36cm の板。1枚の絵＝72cm 角（板 8枚分で繰り返す）、床に 45° で貼る
const herringTex = () => woodCanvas('herring', (g, img) => {
  const w = 128, L = 4 * w, r = rnd(17);
  const plank = (x, y, horiz) => {
    const sx = r() * (1024 - 512), sy = r() * (1024 - 128);
    for (const ox of [-1024, 0, 1024]) for (const oy of [-1024, 0, 1024]) {
      g.save(); g.translate(x + ox, y + oy);
      if (horiz) g.drawImage(img, sx, sy, 512, 128, 0, 0, L, w);
      else { g.translate(w, 0); g.rotate(Math.PI / 2); g.drawImage(img, sx, sy, 512, 128, 0, 0, L, w); }
      g.strokeStyle = 'rgba(30,20,12,0.6)'; g.lineWidth = 2; g.strokeRect(0, 0, L, w);
      g.restore();
    }
  };
  for (let n = -2; n <= 2; n++) for (let k = -1; k < 9; k++) { plank((k + 8 * n) * w, k * w, true); plank((k + 8 * n) * w, (k + 1) * w, false); }
}, 1.2 / 0.72 * 0.6 / 0.6, 1.2 / 0.72, Math.PI / 4);
// 木のルーバー（縦の細い板と、奥の暗いすき間）。1枚の絵＝約2m
const louverTex = () => woodCanvas('louver', (g, img) => {
  g.fillStyle = '#1a140e'; g.fillRect(0, 0, 1024, 1024);
  const r = rnd(23);
  // 壁では絵の縦横が入れ替わるので、絵の上では横向きの帯 → 壁で縦の板 … のはずが逆だったため、縦の帯で描く
  for (let x = 0; x < 1024; x += 40) { const sy = r() * (1024 - 40); g.save(); g.translate(x + 31, 0); g.rotate(Math.PI / 2); g.drawImage(img, 0, sy, 1024, 30, 0, 0, 1024, 31); g.restore(); }
});
// 縁なし半畳（琉球畳風・和紙畳）：い草の目が半畳ごとに縦・横と入れ替わる（市松）。光の当たり方で2色に見える
const ryukyuTex = (col) => canvasTex('ryukyu' + col, 1024, 1024, (g) => {
  const r = rnd(29), S = 512;
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
    const x0 = i * S, y0 = j * S, horiz = (i + j) % 2 === 0, tone = horiz ? 12 : -12;
    g.fillStyle = rgb(col, tone); g.fillRect(x0, y0, S, S);
    // い草の目（細い線を 4px おき）
    for (let k = 0; k < S; k += 4) {
      g.fillStyle = rgb(col, tone + (r() - 0.5) * 22 - 12, 0.7);
      if (horiz) g.fillRect(x0, y0 + k, S, 1.6); else g.fillRect(x0 + k, y0, 1.6, S);
    }
    // 経糸（目と直角に、うっすら）
    for (let k = 20; k < S; k += 44) {
      g.fillStyle = rgb(col, tone - 16, 0.25);
      if (horiz) g.fillRect(x0 + k, y0, 2, S); else g.fillRect(x0, y0 + k, S, 2);
    }
    // 縁（へり）のない角の丸み：ふちを少し暗く
    const gr = g.createLinearGradient(0, 0, 0, 1);
    g.strokeStyle = rgb(col, -45, 0.9); g.lineWidth = 3; g.strokeRect(x0 + 1.5, y0 + 1.5, S - 3, S - 3);
    g.strokeStyle = rgb(col, -20, 0.5); g.lineWidth = 6; g.strokeRect(x0 + 5, y0 + 5, S - 10, S - 10);
  }
});
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
const marbleTex = (base = 0x2e2f31, vc = 0xcdcdc8) => canvasTex('marble' + base + '_' + vc, 1024, 1024, (g, W, H) => {
  const r = rnd(41);
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
          g.strokeStyle = rgb(vc, 0, la); g.lineWidth = lw; g.beginPath();
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
const OAK = 'oak_wood_planks';   // 写真の木（パターンと候補の両方で使う）
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
  p5: { name: '⑤ ホテルライク（グレー×石）', note: '大判のグレーのタイル、グレーのクロス、テレビの壁は石目（エコカラット調）、下り天井はチャコール、キッチンはグレージュの扉にグレーのセラミックの天板',
    floor: ['tile', 0x6f6c69], wall: ['cloth', 0xc9c6c1], ceiling: ['cloth', 0xd6d3ce], accent: ['stone', 0x8d8a86], woodceil: ['cloth', 0x4a4a4b], tread: ['plain', 0x3d3e40, 0.6], oriage: ['cloth', 0x8f8c88], riser: ['plain', 0x3d3e40, 0.6],
    kitchen: ['plain', 0xbdb6aa, 0.5], counter: ['plain', 0x5a5b5d, 0.55], door: ['plain', 0xbdb6aa, 0.5], sofa: ['plain', 0x9d978d, 1], rug: ['tint', 0xffffff, 1.6], tatami: ['ryukyu', 0xbab6a8],
    frame: 0x262728, steel: 0x1c1d1e, baseboard: 0x8f8c88, siding: 0x5d5f62, roof: 0x2b2c2e, soffit: 0x3a3b3c },
  p6: { name: '⑥ ジャパンディ（生成り×白木）', note: '生成りの壁、白木のオークの床、テレビの壁は木のルーバー、木の下り天井、キッチンは明るい木目。黒は窓の枠などに少しだけ',
    floor: ['wood', OAK, 0xb48a62, 0.9], wall: ['cloth', 0xe2dccf], ceiling: ['cloth', 0xe8e3d8], accent: ['louver', 0xa77d55], woodceil: ['wood', OAK, 0xb08458, 1.0], tread: ['wood', OAK, 0xa87a4d, 1.0], oriage: ['cloth', 0xe2d8c3], riser: ['wood', OAK, 0xa87a4d, 1.0],
    kitchen: ['wood', OAK, 0xb08a60, 1.0], counter: ['plain', 0xe8e4dc, 0.35], door: ['wood', OAK, 0xb08a60, 1.0], sofa: ['plain', 0xc2b8a3, 1], rug: ['tint', 0xffe2b8, 2.0], tatami: ['ryukyu', 0xc2aa7c],
    frame: 0x262728, steel: 0x1c1d1e, baseboard: 0xb08a60, siding: 0xcfc9bd, roof: 0x2b2c2e, soffit: 0xa87a4d },
  p7: { name: '⑦ 北欧ナチュラル（白×明るい木×ネイビー）', note: '白い壁、明るい木の床と板張りの天井、テレビの壁はネイビー、キッチンは白に木のカウンター',
    floor: ['wood', OAK, 0xbf9a72, 0.9], wall: ['cloth', 0xe4e3df], ceiling: ['wood', OAK, 0xc8a47a, 0.9], accent: ['cloth', 0x3d4f63], woodceil: ['wood', OAK, 0xc49a6c, 0.9], tread: ['wood', OAK, 0xc49a6c, 0.9], oriage: ['wood', OAK, 0xc8a47a, 0.9], riser: ['wood', OAK, 0xc49a6c, 0.9],
    kitchen: ['plain', 0xeeece7, 0.4], counter: ['wood', OAK, 0xb58b5f, 1.0], door: ['plain', 0xeeece7, 0.5], sofa: ['plain', 0x8f9a8c, 1], rug: ['tint', 0xfff4e2, 2.3], tatami: ['tint', 0xffffff],
    frame: 0xe6e3dd, steel: 0x2a2b2c, baseboard: 0xe4e3df, siding: 0xe6e3dd, roof: 0x2f3033, soffit: 0xb3875a },
  p8: { name: '⑧ インダストリアル（モルタル×黒×古木）', note: 'モルタル調の床、コンクリート調の天井とテレビの壁、濃い古木の下り天井、黒のキッチンにステンレスの天板、キャメルの革風ソファ',
    floor: ['concrete', 0x63625f, 1.2], wall: ['cloth', 0xbab7b1], ceiling: ['concrete', 0x9c9a96, 1.0], accent: ['concrete', 0x58595b, 1.3], woodceil: ['wood', OAK, 0x4e3423, 1.2], tread: ['plain', 0x1e1e1e, 0.6], oriage: ['concrete', 0x8a8986, 1.0], riser: ['plain', 0x1e1e1e, 0.6],
    kitchen: ['plain', 0x232425, 0.5], counter: ['metal', 0xb5b8bb], door: ['plain', 0x2a2b2d, 0.5], sofa: ['plain', 0x8a5e3e, 1], rug: ['tint', 0x9a948c], tatami: ['ryukyu', 0x57544f],
    frame: 0x1e1f21, steel: 0x141516, baseboard: 0x2a2b2d, siding: 0x2a2c2e, roof: 0x1e1f21, soffit: 0x4e3423 },
  p9: { name: '⑨ ウォールナット×黒大理石', note: 'ウォールナットのヘリンボーン張りの床、テレビの壁はウォールナットのルーバー、ウォールナットのキッチンに黒の大理石の天板。重厚で落ち着いた感じ',
    floor: ['herring', 0x5c3c2a], wall: ['cloth', 0xc9c3b9], ceiling: ['cloth', 0xd9d4cb], accent: ['louver', 0x5c3c2a], woodceil: ['wood', OAK, 0x5c3c2a, 1.1], tread: ['wood', OAK, 0x4e3423, 1.1], oriage: ['wood', OAK, 0x5c3c2a, 1.1], riser: ['wood', OAK, 0x4e3423, 1.1],
    kitchen: ['wood', OAK, 0x4e3423, 1.1], counter: ['marble'], door: ['wood', OAK, 0x5c3c2a, 1.1], sofa: ['plain', 0x4d4c4a, 1], rug: ['tint', 0x8a8a8a], tatami: ['ryukyu', 0x8c6c4c],
    frame: 0x1e1f21, steel: 0x18191a, baseboard: 0x3b2a1e, siding: 0x2a2c2e, roof: 0x1e1f21, soffit: 0x5c3c2a },
  p10: { name: '⑩ 白×アイボリー（韓国風）', note: '白とアイボリーでまとめ、床は淡い木、キッチンは白に白の大理石の天板、ソファとラグはアイボリー',
    floor: ['wood', OAK, 0xc7ad8c, 0.8], wall: ['cloth', 0xece8df], ceiling: ['cloth', 0xf0ede6], accent: ['cloth', 0xe2d9c8], woodceil: ['plain', 0xece8df, 0.7], tread: ['plain', 0xe8e3d8, 0.6], oriage: ['cloth', 0xece8df], riser: ['plain', 0xe8e3d8, 0.6],
    kitchen: ['plain', 0xf0eee9, 0.4], counter: ['marble', 0xe9e7e2, 0xb9b9b5], door: ['plain', 0xf0eee9, 0.5], sofa: ['plain', 0xe6dfd2, 1], rug: ['tint', 0xfff4e2, 2.6], tatami: ['ryukyu', 0xbab6a8],
    frame: 0xe6e3dd, steel: 0x2a2b2c, baseboard: 0xece8df, siding: 0xe6e3dd, roof: 0x2f3033, soffit: 0xe8e3d8 },
};
// 材料ごとの、絵1枚の大きさの調整（GLB の UV は floor＝1.2m、wall・ceiling＝1m、accent・woodceil＝0.6m 単位）
// 写真の木は1枚＝約2m（オーク）にしたいので floor は 0.6
const REP = { floor: 0.6, accent: 0.3, woodceil: 0.3, oriage: 0.5, wall: 1, ceiling: 1, kitchen: 0.5, counter: 0.5 };

function remember(m) {
  if (m.userData.orig) return;
  m.userData.orig = { map: m.map, normalMap: m.normalMap, roughnessMap: m.roughnessMap, bumpMap: m.bumpMap, bumpScale: m.bumpScale, color: m.color.getHex(), roughness: m.roughness, metalness: m.metalness };
}
function restore(m) {
  const o = m.userData.orig; if (!o) return;
  m.map = o.map; m.normalMap = o.normalMap; m.roughnessMap = o.roughnessMap; m.bumpMap = o.bumpMap; m.bumpScale = o.bumpScale; m.color.setHex(o.color); m.roughness = o.roughness; m.metalness = o.metalness; m.needsUpdate = true;
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
// 木の色（明るい順）
const W_LIGHT = 0xc8a47a, W_NAT = 0xa57a52, W_TEAK = 0x8a5a34, W_MID = 0x8a6246, W_WAL = 0x5c3c2a, W_DARK = 0x3b2a1e;
const WOODS = [['白木（明るい）', ['wood', OAK, W_LIGHT, 0.9]], ['ナチュラル', ['wood', OAK, W_NAT, 1.0]], ['チーク', ['wood', OAK, W_TEAK, 1.0]], ['中間の木', ['wood', OAK, W_MID, 1.0]],
  ['ウォールナット', ['wood', OAK, W_WAL, 1.1]], ['ダークブラウン', ['wood', OAK, W_DARK, 1.1]], ['グレージュ塗装', ['plain', 0xb3aa9c, 0.6]], ['白', ['plain', 0xe8e5df, 0.6]], ['黒', ['plain', 0x262626, 0.6]]];
const CLOTHS = [['白', ['cloth', 0xdedcd8]], ['オフホワイト（生成り）', ['cloth', 0xe4ddcf]], ['薄いグレー', ['cloth', 0xb6b4b0]], ['グレージュ', ['cloth', 0xc4bbad]], ['ベージュ', ['cloth', 0xcdbfa6]],
  ['モカ', ['cloth', 0x8f7a68]], ['濃いグレー', ['cloth', 0x7d7b78]], ['チャコール', ['cloth', 0x4a4a4b]], ['くすみグリーン（セージ）', ['cloth', 0x8f9a86]], ['ネイビー', ['cloth', 0x3d4f63]],
  ['テラコッタ', ['cloth', 0xb06a4c]], ['白い塗り壁', ['concrete', 0xd6d3cc, 0.7]], ['コンクリート調', ['concrete', 0x9c9a96, 1.2]], ['木の羽目板', ['wood', OAK, W_NAT, 1.0]]];
const FABRIC = (pal) => pal.map(([n, c]) => [n, ['plain', c, 1.0]]);
export const CHOICES = {
  floor: { label: '床', opts: [['白木のオーク', ['wood', OAK, W_LIGHT, 0.9]], ['ナチュラルオーク', ['wood', OAK, W_NAT, 1.1]], ['グレージュの木', ['wood', OAK, 0x8a7a66, 1.0]], ['アッシュグレー', ['wood', OAK, 0x8f8c86, 0.9]],
    ['チーク', ['wood', OAK, W_TEAK, 1.0]], ['ウォールナット', ['wood', OAK, W_WAL, 1.1]], ['ヘリンボーン（オーク）', ['herring', W_NAT]], ['ヘリンボーン（ウォールナット）', ['herring', W_WAL]],
    ['グレーのタイル', ['tile', 0x6f6b67]], ['ベージュのタイル', ['tile', 0x9a8f80]], ['濃いグレーのタイル', ['tile', 0x4a4948]], ['モルタル調', ['concrete', 0x63625f, 1.2]]] },
  wall: { label: '壁（クロス）', opts: CLOTHS },
  ceiling: { label: '天井', opts: [['白', ['cloth', 0xdedcd8]], ['オフホワイト', ['cloth', 0xe4ddcf]], ['グレー', ['cloth', 0xb4b2ae]], ['チャコール', ['cloth', 0x4a4a4b]],
    ['白木の板張り', ['wood', OAK, W_LIGHT, 0.9]], ['木の板張り', ['wood', OAK, W_NAT, 1.0]], ['濃い木の板張り', ['wood', OAK, W_WAL, 1.1]], ['コンクリート調', ['concrete', 0x9c9a96, 1.0]]] },
  accent: { label: 'テレビの壁', opts: [['石目・グレー（エコカラット調）', ['stone', 0x76787b]], ['石目・ライトグレー', ['stone', 0xa6a5a1]], ['石目・ベージュ', ['stone', 0xa89b88]], ['石目・ダークグレー', ['stone', 0x4a4b4e]],
    ['木のルーバー（明るい）', ['louver', W_NAT]], ['木のルーバー（ウォールナット）', ['louver', W_WAL]], ['木の板張り', ['wood', OAK, W_MID, 1.0]],
    ['グレーの塗り壁', ['concrete', 0x76797c, 1.4]], ['黒の塗り壁', ['concrete', 0x3a3b3d, 1.2]], ['チャコールのクロス', ['cloth', 0x4a4a4b]], ['ネイビーのクロス', ['cloth', 0x3d4f63]], ['くすみグリーンのクロス', ['cloth', 0x8f9a86]], ['黒の大理石', ['marble']]] },
  woodceil: { label: '木の部分（下り天井・梁・柱）', opts: [...WOODS, ['チャコールのクロス', ['cloth', 0x4a4a4b]]] },
  tread: { label: '格子・階段・和室の扉', opts: WOODS },
  riser: { label: '小上がりの側面', opts: WOODS },
  oriage: { label: '和室の天井', opts: [['白木', ['wood', OAK, W_LIGHT, 0.9]], ['ナチュラル', ['wood', OAK, W_NAT, 1.0]], ['濃い木', ['wood', OAK, 0x6a4a34, 1.0]], ['グレー', ['cloth', 0x9e9c98]], ['白', ['cloth', 0xdedcd8]], ['黒', ['cloth', 0x2c2c2d]], ['和紙調（生成り）', ['cloth', 0xe2d8c3]]] },
  tatami: { label: '畳', opts: [['縁あり・緑', ['tint', 0xffffff]], ['縁あり・グレー', ['tint', 0xb4b4ae]], ['縁あり・黄金色', ['tint', 0xf2dc9a]],
    ['縁なし市松・白茶（ベージュ）', ['ryukyu', 0xc2aa7c]], ['縁なし市松・銀白', ['ryukyu', 0xbab6a8]], ['縁なし市松・黄金', ['ryukyu', 0xc8a862]], ['縁なし市松・若草', ['ryukyu', 0xa0a56e]],
    ['縁なし市松・灰桜', ['ryukyu', 0xb09a90]], ['縁なし市松・胡桃（茶）', ['ryukyu', 0x8c6c4c]], ['縁なし市松・墨', ['ryukyu', 0x57544f]], ['縁なし市松・藍', ['ryukyu', 0x5b6579]]] },
  kitchen: { label: 'キッチンの扉', opts: [['白', ['plain', 0xe8e6e1, 0.4]], ['グレージュ', ['plain', 0xbdb6aa, 0.5]], ['ライトグレー', ['plain', 0xb4b5b5, 0.5]], ['チャコール', ['plain', 0x4a4b4d, 0.5]], ['黒', ['plain', 0x1e1f21, 0.5]],
    ['コンクリート調', ['concrete', 0x6c6f72, 1.3]], ['明るい木目', ['wood', OAK, W_NAT, 1.0]], ['ウォールナット木目', ['wood', OAK, W_WAL, 1.1]], ['くすみグリーン', ['plain', 0x7f8a76, 0.5]], ['ネイビー', ['plain', 0x2f3e52, 0.5]]] },
  counter: { label: 'キッチンの天板', opts: [['黒の大理石', ['marble']], ['白の大理石', ['marble', 0xe6e4df, 0x9d9d99]], ['グレーの大理石', ['marble', 0x8d8c89, 0xe0dfda]], ['グレーのセラミック（マット）', ['plain', 0x5a5b5d, 0.55]],
    ['白', ['plain', 0xe9e7e2, 0.3]], ['ステンレス', ['metal', 0xb5b8bb]], ['コンクリート調', ['concrete', 0x86888b, 1.1]], ['木のカウンター', ['wood', OAK, W_NAT, 1.0]]] },
  door: { label: 'ドア', opts: [['白', ['plain', 0xe6e3dd, 0.5]], ['グレージュ', ['plain', 0xbdb6aa, 0.5]], ['ライトグレー', ['plain', 0xb4b5b5, 0.5]], ['明るい木', ['wood', OAK, W_NAT, 1.0]], ['ウォールナット', ['wood', OAK, W_WAL, 1.1]], ['黒', ['plain', 0x1e1f21, 0.5]]] },
  table: { label: 'ダイニングテーブルの天板', opts: [['グレーのセラミック（はじめの色）', ['concrete', 0x535659, 0.6]], ['濃いグレーのセラミック', ['concrete', 0x4a4b4d, 0.6]], ['ベージュのセラミック', ['concrete', 0xa89f92, 0.6]], ['白木のオーク', ['wood', OAK, W_LIGHT, 0.9]], ['ナチュラル', ['wood', OAK, 0xb08a60, 1.0]], ['ウォールナット', ['wood', OAK, W_WAL, 1.1]], ['黒', ['plain', 0x222222, 0.5]], ['白', ['plain', 0xe8e6e1, 0.4]], ['白の大理石', ['marble', 0xe6e4df, 0x9d9d99]], ['黒の大理石', ['marble']]] },
  chair_wood: { label: '椅子の脚', opts: [['黒', ['plain', 0x1f1f20, 0.45]], ['ゴールド', ['metal', 0xb8975a]], ['白', ['plain', 0xe8e6e1, 0.5]], ['明るい木', ['plain', 0xc8a47a, 0.7]], ['ウォールナット', ['plain', 0x4e3423, 0.7]]] },
  chair_seat: { label: '椅子（革風）', opts: [['ブルーグレー（はじめの色）', ['plain', 0x7f888c, 0.62]], ['ライトグレー', ['plain', 0xb9bab8, 0.62]], ['グレージュ', ['plain', 0xb3a99b, 0.62]], ['キャメル', ['plain', 0x9a6a42, 0.62]], ['ブラック', ['plain', 0x2a2a2a, 0.55]], ['くすみグリーン', ['plain', 0x7f8a76, 0.62]]] },
  sofa: { label: 'ソファ', opts: FABRIC([['明るいグレー', 0x8e8a84], ['ベージュ', 0xb3a78f], ['アイボリー', 0xd9d2c4], ['チャコール', 0x4d4c4a], ['くすみグリーン', 0x7f8a76], ['ネイビー', 0x2f3e52], ['キャメル', 0x9a6a42]]) },
  rug: { label: 'ラグ', opts: [['グレー', ['tint', 0xffffff]], ['濃いグレー', ['tint', 0x8a8a8a]], ['ライトグレー', ['tint', 0xffffff, 1.7]], ['ベージュ', ['tint', 0xffe2b8, 2.0]], ['アイボリー', ['tint', 0xfff4e2, 2.6]], ['くすみグリーン', ['tint', 0xc8dcb4, 1.5]], ['ネイビー', ['tint', 0x8aa0c8, 0.9]], ['テラコッタ', ['tint', 0xffa880, 1.8]]] },
  siding: { label: '外壁', opts: [['黒', ['siding', 0x3a3d40]], ['チャコール', ['siding', 0x55585b]], ['グレー', ['siding', 0x8a8c8e]], ['白', ['siding', 0xe6e3dd]], ['ベージュ', ['siding', 0xcfc6b6]], ['ネイビー', ['siding', 0x2f3e52]], ['木（焼杉風）', ['siding', 0x2a2420]]] },
  frame: { label: '窓の枠', opts: [['黒', ['plain', 0x262728, 0.45]], ['白', ['plain', 0xe6e3dd, 0.45]], ['ブロンズ', ['plain', 0x5a4a3c, 0.45]], ['シルバー', ['metal', 0xb5b8bb]]] },
};
let OVR = {};
try { OVR = JSON.parse(localStorage.getItem('design_u_ovr') || '{}'); } catch (e) { OVR = {}; }
function applySpec(m, v, n) {
  if (!Array.isArray(v)) { plain(m, v, 0.6); return; }
  const k = v[0];
  if (k === 'plain') plain(m, v[1], v[2] ?? 0.6);
  else if (k === 'tint') { m.color.setHex(v[1]).multiplyScalar(v[2] ?? 1); m.needsUpdate = true; }   // v[2]＞1 で明るくもできる（グレーの模様をベージュ等にする）
  else if (k === 'marble') { m.map = marbleTex(v[1], v[2]); m.normalMap = null; m.roughnessMap = null; m.color.setHex(0xffffff); m.roughness = 0.22; m.metalness = 0; m.needsUpdate = true; }
  else if (k === 'metal') plain(m, v[1], 0.32, 0.85);
  else if (k === 'ryukyu') {
    const t = ryukyuTex(v[1]); t.offset.set(0.875, 0.25);   // 和室の端（x318.5, y364）に半畳の目地をそろえる
    m.map = t; m.bumpMap = t; m.bumpScale = 1.5; m.normalMap = null; m.roughnessMap = null; m.color.setHex(0xffffff); m.roughness = 0.9; m.metalness = 0; m.needsUpdate = true;
  }
  else if (k === 'herring') { m.map = herringTex(); m.normalMap = null; m.roughnessMap = null; m.metalness = 0; tint(m, 'oak_wood_planks', v[1]); m.roughness = 0.7; m.needsUpdate = true; }
  else if (k === 'louver') { m.map = louverTex(); m.map.repeat.set(REP[n] ?? 1, REP[n] ?? 1); m.normalMap = null; m.roughnessMap = null; m.metalness = 0; tint(m, 'oak_wood_planks', v[1]); m.roughness = 0.85; m.needsUpdate = true; }
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
  if (Array.isArray(v)) applySpec(m, v, n);
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
  applyParts(d);
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
// あとから読み込まれたモデル（窓の高さを変えたとき）にも当てる
setInterval(applyAll, 1500);
const nightChk = document.querySelector('#night'); if (nightChk) nightChk.addEventListener('change', () => setTimeout(applyAll, 0));   // 昼夜を切り替えたらすぐ露出を合わせる
// ---- 壁を1面ずつ ----
const PART_MATS = ['wall'];
let PARTS = {};
try { PARTS = JSON.parse(localStorage.getItem('design_u_parts') || '{}'); } catch (e) { PARTS = {}; }
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _n = new THREE.Vector3();
const pkey = (v) => `${Math.round(v.x * 1000)},${Math.round(v.y * 1000)},${Math.round(v.z * 1000)}`;
// 三角形ごとの平面（向き＋位置）と頂点の位置
function triInfo(geo) {
  const ver = geo.index ? geo.index.version + ':' + geo.index.count + ':' + geo.index.array[0] : 'n';   // 並べ替え（BVH）や切り出しで作り直す
  if (geo.userData.tri && geo.userData.tri.ver === ver) return geo.userData.tri;
  const pos = geo.attributes.position, idx = geo.index, n = (idx ? idx.count : pos.count) / 3;
  const plane = new Array(n), verts = new Array(n);
  for (let t = 0; t < n; t++) {
    const i0 = idx ? idx.getX(3 * t) : 3 * t, i1 = idx ? idx.getX(3 * t + 1) : 3 * t + 1, i2 = idx ? idx.getX(3 * t + 2) : 3 * t + 2;
    _a.fromBufferAttribute(pos, i0); _b.fromBufferAttribute(pos, i1); _c.fromBufferAttribute(pos, i2);
    _n.subVectors(_c, _b).cross(_b.clone().sub(_a)); const L = _n.length(); if (L < 1e-9) { plane[t] = null; continue; } _n.divideScalar(L);
    if (_n.x < -1e-6 || (Math.abs(_n.x) < 1e-6 && (_n.y < -1e-6 || (Math.abs(_n.y) < 1e-6 && _n.z < 0)))) _n.negate();   // 表裏は区別しない
    const dd = _n.dot(_a);
    plane[t] = `${_n.x.toFixed(2)},${_n.y.toFixed(2)},${_n.z.toFixed(2)}|${dd.toFixed(2)}`;
    verts[t] = [pkey(_a), pkey(_b), pkey(_c), [i0, i1, i2]];
  }
  return (geo.userData.tri = { plane, verts, ver });
}
// 種の点を含む三角形から、同じ平面でつながっている三角形を集める
function region(geo, planeKey, seed) {
  const { plane, verts } = triInfo(geo), pos = geo.attributes.position;
  const cand = []; for (let t = 0; t < plane.length; t++) if (plane[t] === planeKey) cand.push(t);
  if (!cand.length) return null;
  let start = cand[0], best = Infinity;
  for (const t of cand) {   // 種に一番近い三角形（重心の距離）
    const [, , , [i0, i1, i2]] = verts[t];
    _a.fromBufferAttribute(pos, i0).add(_b.fromBufferAttribute(pos, i1)).add(_c.fromBufferAttribute(pos, i2)).divideScalar(3);
    const dd = _a.distanceToSquared(seed); if (dd < best) { best = dd; start = t; }
  }
  const byV = new Map(); for (const t of cand) for (const k of verts[t].slice(0, 3)) { if (!byV.has(k)) byV.set(k, []); byV.get(k).push(t); }
  const seen = new Set([start]), q = [start];
  while (q.length) { const t = q.pop(); for (const k of verts[t].slice(0, 3)) for (const u of byV.get(k)) if (!seen.has(u)) { seen.add(u); q.push(u); } }
  return seen;
}
// 面を切り出して、元の部品の子にする
function splitPart(mesh, key) {
  const [, pn, pd, sx, sy, sz] = key.split('|'), planeKey = pn + '|' + pd;   // 平面のキー自体に | が入っている
  const seed = new THREE.Vector3(+sx / 100, +sy / 100, +sz / 100);
  const geo = mesh.geometry, set = region(geo, planeKey, seed); if (!set) return null;
  const { verts } = triInfo(geo), keep = [], take = [];
  for (let t = 0; t < verts.length; t++) { if (!verts[t]) continue; (set.has(t) ? take : keep).push(...verts[t][3]); }
  geo.setIndex(keep); geo.userData.tri = null;
  if (geo.boundsTree && geo.computeBoundsTree) { geo.disposeBoundsTree && geo.disposeBoundsTree(); geo.computeBoundsTree(); }
  const g2 = new THREE.BufferGeometry();
  for (const k in geo.attributes) g2.setAttribute(k, geo.attributes[k]);
  g2.setIndex(take); g2.computeBoundingSphere(); g2.computeBoundingBox();
  const part = new THREE.Mesh(g2, mesh.material); part.castShadow = mesh.castShadow; part.receiveShadow = mesh.receiveShadow;
  part.userData.partKey = key; part.userData.base = mesh;
  mesh.add(part); (mesh.userData.parts ||= {})[key] = part;
  return part;
}
function applyParts(d) {
  const bases = [];
  d.rig.traverse((o) => { if (o.isMesh && !o.userData.partKey && PART_MATS.includes(o.material.name)) bases.push(o); });
  for (const mesh of bases) {
    for (const key in PARTS) {
      if (!key.startsWith(mesh.material.name + '|')) continue;
      const part = (mesh.userData.parts && mesh.userData.parts[key]) || splitPart(mesh, key); if (!part) continue;
      const i = PARTS[key], c = CHOICES[mesh.material.name];
      if (i == null || !c.opts[i]) { part.material = mesh.material; continue; }
      if (part.userData.opt !== i || part.material === mesh.material) {
        const m = mesh.material.clone(); m.name = 'wallpart'; m.userData = {}; applySpec(m, c.opts[i][1], mesh.material.name);
        part.material = m; part.userData.opt = i;
      }
    }
    for (const key in (mesh.userData.parts || {})) if (!(key in PARTS)) mesh.userData.parts[key].material = mesh.material;   // 元に戻した面
  }
}
export function setPart(key, i) {
  if (i == null) delete PARTS[key]; else PARTS[key] = i;
  try { localStorage.setItem('design_u_parts', JSON.stringify(PARTS)); } catch (e) { /* 保存できなくても切り替えはできる */ }
  applyAll();
}
function partKeyOf(hit) {
  const o = hit.object; if (o.userData.partKey) return o.userData.partKey;
  if (!PART_MATS.includes(o.material.name) || hit.faceIndex == null) return null;
  const { plane } = triInfo(o.geometry), pk = plane[hit.faceIndex]; if (!pk) return null;
  const L = o.worldToLocal(hit.point.clone());
  return `${o.material.name}|${pk}|${Math.round(L.x * 100)}|${Math.round(L.y * 100)}|${Math.round(L.z * 100)}`;
}

// ---- タップで色・素材を選ぶ ----
// 1本指で軽くタップ（ほとんど動かさず 0.4 秒以内）したときだけ反応。なぞる・二本指は今まで通り
const pop = document.createElement('div');
pop.style.cssText = 'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:50;background:rgba(28,30,33,.94);color:#fff;border-radius:14px;padding:12px 12px 10px;width:min(560px,92vw);max-height:55vh;overflow-y:auto;box-shadow:0 6px 20px rgba(0,0,0,.4);display:none;font-size:15px';
document.body.append(pop);
function closePop() { pop.style.display = 'none'; }
// ボタンの色見本（候補の代表の色）
const TINT_BASE = { rug: 0x6a6c6f, tatami: 0xb9b48c };   // 色を掛ける物の元の色（見本の色を出すため）
function swatchOf(v, n) {
  if (!Array.isArray(v)) return v;
  const k = v[0];
  if (k === 'tint') { const c = new THREE.Color(TINT_BASE[n] ?? 0x888888).multiply(new THREE.Color(v[1])).multiplyScalar(v[2] ?? 1); return c.getHex(); }
  if (k === 'wood') return v[2];
  if (k === 'ryukyu') return v[1];
  if (k === 'marble') return v[1] ?? 0x2e2f31;
  return v[1];
}
function chip(col) { return `<span style="display:inline-block;width:14px;height:14px;border-radius:4px;margin-right:6px;vertical-align:-2px;border:1px solid rgba(255,255,255,.35);background:${hex(col ?? 0x888888)}"></span>`; }
function openPop(n, pkeyHit) {
  const c = CHOICES[n]; pop.innerHTML = '';
  const h = document.createElement('div'); h.style.cssText = 'font-weight:700;margin-bottom:8px;display:flex;justify-content:space-between;gap:12px;align-items:center';
  h.textContent = c.label + ' を変える';
  const x = document.createElement('button'); x.textContent = '×'; x.style.cssText = 'background:none;border:0;color:#fff;font-size:22px;padding:0 4px'; x.onclick = closePop; h.append(x);
  pop.append(h);
  const row = document.createElement('div'); row.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px';
  const btn = (label, on, f, col) => { const b = document.createElement('button'); b.innerHTML = (col != null ? chip(col) : '') + label; b.style.cssText = `padding:8px 12px;border-radius:10px;border:1px solid ${on ? '#e8792f' : '#555'};background:${on ? '#3a2a1f' : '#2c2f33'};color:${on ? '#ffb27a' : '#fff'};font-size:15px`; b.onclick = f; row.append(b); };
  if (pkeyHit) {   // 壁：この面だけ
    const cap = document.createElement('div'); cap.textContent = 'この面だけ'; cap.style.cssText = 'font-size:13px;color:#bbb;margin:2px 0 4px'; pop.append(cap);
    pop.append(row);
    c.opts.forEach(([label, v], i) => btn(label, PARTS[pkeyHit] === i, () => { setPart(pkeyHit, i); openPop(n, pkeyHit); }, swatchOf(v, n)));
    btn('元に戻す', PARTS[pkeyHit] == null, () => { setPart(pkeyHit, null); openPop(n, pkeyHit); });
    const cap2 = document.createElement('div'); cap2.textContent = '壁ぜんぶ'; cap2.style.cssText = 'font-size:13px;color:#bbb;margin:10px 0 4px'; pop.append(cap2);
    const row2 = document.createElement('div'); row2.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px'; pop.append(row2);
    const btn2 = (label, on, f, col) => { const b = document.createElement('button'); b.innerHTML = (col != null ? chip(col) : '') + label; b.style.cssText = `padding:8px 12px;border-radius:10px;border:1px solid ${on ? '#e8792f' : '#555'};background:${on ? '#3a2a1f' : '#2c2f33'};color:${on ? '#ffb27a' : '#fff'};font-size:15px`; b.onclick = f; row2.append(b); };
    c.opts.forEach(([label, v], i) => btn2(label, OVR[n] === i, () => { setOverride(n, i); openPop(n, pkeyHit); }, swatchOf(v, n)));
    btn2('パターンどおり', OVR[n] == null, () => { setOverride(n, null); openPop(n, pkeyHit); });
    pop.style.display = 'block'; return;
  }
  c.opts.forEach(([label, v], i) => btn(label, OVR[n] === i, () => { setOverride(n, i); openPop(n); }, swatchOf(v, n)));
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
    let n = h.object.material && h.object.material.name;
    if (n === 'glass') continue;   // ガラスの向こうを見る
    if (h.object.userData.partKey) n = h.object.userData.base.material.name;   // 切り出した壁の面
    if (!CHOICES[n]) return null;  // 一番手前の物だけ（選べない物なら何もしない）
    return { n, pk: partKeyOf(h) };
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
      const hit = pick(e.clientX, e.clientY); t0 = null;
      if (hit) openPop(hit.n, hit.pk); else closePop();
    };
    c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
  }, 300);
}
setDesign(current);   // 最初の適用（壁の面の一覧なども宣言し終えてから）
window._design = { setDesign, setTop, setOverride, setPart, PATTERNS, CHOICES, pick, PARTS: () => PARTS };
