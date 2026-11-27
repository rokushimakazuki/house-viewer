// 収納の中身・置く物を、四角い箱ではなく「それらしい形」で作る（11/27 夕方）。furn_u.js から呼ぶ。
// 寸法は m。物の向き：正面＝ローカル +z、幅＝x、高さ＝y（床＝0）。
// 部品が多くなるので、動かない部分は bake() で材料ごとに1つの形にまとめて、描く回数を減らす。
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// ---- 材料（同じ色・質感は同じ材料を使い回す。まとめるときに効く）----
const MC = {};
export function pm(col, rough = 0.8, metal = 0) {
  const k = col + '/' + rough + '/' + metal;
  return MC[k] || (MC[k] = new THREE.MeshStandardMaterial({ color: col, roughness: rough, metalness: metal }));
}
const PL = (c) => pm(c, 0.45);              // プラスチック
const FA = (c) => pm(c, 0.95);              // 布
const ME = (c = 0xb8bcc0) => pm(c, 0.35, 0.8);   // 金属
const RU = (c = 0x1d1d1e) => pm(c, 0.85);   // ゴム・黒い樹脂
const MIR = new THREE.MeshStandardMaterial({ color: 0xbcc9d1, roughness: 0.12, metalness: 0.3, envMapIntensity: 0.35 });   // 鏡（空が映り込まないように控えめ）
const shade = (c, k) => new THREE.Color(c).multiplyScalar(k).getHex();
let seed = 1;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

// ---- 部品 ----
function add(g, geo, m, x = 0, y = 0, z = 0) { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; g.add(o); return o; }
// 角の丸い箱。(x, y, z)＝底の中心
function rb(g, w, h, d, m, x = 0, y = 0, z = 0, r = 0.01) {
  r = Math.min(r, w / 2 - 0.0005, h / 2 - 0.0005, d / 2 - 0.0005);
  const geo = r > 0.0015 ? new RoundedBoxGeometry(w, h, d, r > 0.02 ? 2 : 1, r) : new THREE.BoxGeometry(w, h, d);
  return add(g, geo, m, x, y + h / 2, z);
}
// 立てた円柱（底の中心）／寝かせた円柱（中心・ax の向き）
function cy(g, r1, r2, h, m, x = 0, y = 0, z = 0, seg = 18) { return add(g, new THREE.CylinderGeometry(r1, r2, h, seg), m, x, y + h / 2, z); }
function cyh(g, r, len, m, x, y, z, ax = 'x', seg = 18) {
  const geo = new THREE.CylinderGeometry(r, r, len, seg);
  if (ax === 'x') geo.rotateZ(Math.PI / 2); else geo.rotateX(Math.PI / 2);
  return add(g, geo, m, x, y, z);
}
// 2点を結ぶ棒（パイプ）
const UP = new THREE.Vector3(0, 1, 0);
function tb(g, a, b, r, m, seg = 8) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), dv = B.clone().sub(A), L = dv.length();
  const o = add(g, new THREE.CylinderGeometry(r, r, L, seg), m);
  o.position.copy(A).addScaledVector(dv, 0.5); o.quaternion.setFromUnitVectors(UP, dv.normalize()); return o;
}
// 楕円体（中心）
function sp(g, rx, ry, rz, m, x, y, z, seg = 12) { const o = add(g, new THREE.SphereGeometry(1, seg, Math.max(8, seg >> 1)), m, x, y, z); o.scale.set(rx, ry, rz); return o; }
// 円弧（ハンドル・フック）。XY 面の上半分から始まる
function arc(g, R, t, ang, m, x, y, z) { return add(g, new THREE.TorusGeometry(R, t, 6, 16, ang), m, x, y, z); }
// 板（横から見て角の丸い長方形。厚み w は x 方向）
function slab(g, w, h, d, r, m, x = 0, y = 0, z = 0) {
  const s = new THREE.Shape(), a = d / 2, b = h / 2;
  s.moveTo(-a + r, -b); s.lineTo(a - r, -b); s.quadraticCurveTo(a, -b, a, -b + r); s.lineTo(a, b - r); s.quadraticCurveTo(a, b, a - r, b);
  s.lineTo(-a + r, b); s.quadraticCurveTo(-a, b, -a, b - r); s.lineTo(-a, -b + r); s.quadraticCurveTo(-a, -b, -a + r, -b);
  const geo = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false, curveSegments: 6 });
  geo.translate(0, 0, -w / 2); geo.rotateY(Math.PI / 2);
  return add(g, geo, m, x, y + h / 2, z);
}
// 車輪（中心）。ax＝車軸の向き。spokes＝スポークの本数（0 なら円盤）
function wheel(g, R, t, x, y, z, ax = 'z', spokes = 0) {
  const w = new THREE.Group(); w.position.set(x, y, z); if (ax === 'x') w.rotation.y = Math.PI / 2; g.add(w);
  add(w, new THREE.TorusGeometry(R - t, t, 8, 28), RU());
  if (spokes) {
    add(w, new THREE.TorusGeometry(R - t * 2.1, t * 0.35, 6, 28), ME());
    cyh(w, 0.025, 0.08, ME(), 0, 0, 0, 'z', 12);
    for (let k = 0; k < spokes; k++) { const a = k * Math.PI * 2 / spokes; tb(w, [0, 0, 0], [Math.cos(a) * (R - t * 2.1), Math.sin(a) * (R - t * 2.1), 0], 0.0022, ME(), 4); }
  } else cyh(w, R - t * 1.3, t * 1.5, PL(0x6a6d70), 0, 0, 0, 'z', 20);
  return w;
}
// かご（上が開いた箱）。fill＝中身の色
function basket(g, w, h, d, c, fill) {
  const m = pm(c, 1), t = 0.012;
  rb(g, w, t, d, m, 0, 0, 0, 0.004);
  for (const [bw, bd, x, z] of [[t, d, -w / 2 + t / 2, 0], [t, d, w / 2 - t / 2, 0], [w, t, 0, -d / 2 + t / 2], [w, t, 0, d / 2 - t / 2]]) rb(g, bw, h, bd, m, x, 0, z, 0.004);
  for (const y of [h * 0.3, h * 0.62]) rb(g, w + 0.004, 0.012, d + 0.004, pm(shade(c, 0.72), 1), 0, y, 0, 0.004);   // 編み目の帯
  rb(g, w + 0.008, 0.018, d + 0.008, pm(shade(c, 0.85), 1), 0, h - 0.018, 0, 0.007);   // ふち
  const n = Math.max(2, Math.round(w / 0.08));
  for (let i = 0; i < n && fill.length; i++) {
    const cc = fill[i % fill.length], x = -w / 2 + 0.045 + (w - 0.09) * (i + 0.5) / n, z = (rnd() - 0.5) * (d - 0.12), s = 0.035 + rnd() * 0.03;
    if (rnd() < 0.45) sp(g, s, s, s, PL(cc), x, h * 0.78, z, 12); else rb(g, s * 1.7, s * 1.5, s * 1.3, PL(cc), x, h * 0.5, z, 0.01);
  }
}
const FILL = {
  toy: [0xe07a5f, 0x81b29a, 0xf2cc8f, 0x5fa8d3, 0xd77fa1],
  food: [0xd94f3d, 0xf0c04a, 0x7a4a2a, 0xe8e2d0, 0x3c7d3a],
  misc: [0xf2f0ea, 0x9aa6b2, 0x5a6e7f, 0xd8c8b0],
};

// ---- 靴（1足＝左右2つ）----
function shoe1(g, x, sw, h, d, c, k) {
  const up = k === 'le' || k === 'bo' ? pm(c, 0.32) : FA(c);
  if (k === 'sa') {   // サンダル：底と2本のベルト
    rb(g, sw, 0.03, d, pm(shade(c, 0.9), 0.7), x, 0, 0, 0.012);
    for (const z of [-d * 0.08, d * 0.22]) rb(g, sw * 0.96, 0.028, 0.035, FA(c), x, 0.028, z, 0.012);
    return;
  }
  rb(g, sw, 0.02, d, k === 'sn' ? pm(0xefede8, 0.7) : RU(0x1a1a1a), x, 0, 0, 0.008);   // 底（スニーカーは白）
  if (k === 'bo') {   // 長靴：筒が高い
    rb(g, sw * 0.9, h - 0.02, d * 0.5, up, x, 0.015, -d * 0.22, 0.03);
    sp(g, sw * 0.46, 0.065, d * 0.3, up, x, 0.02, d * 0.14);
    rb(g, sw * 0.62, 0.004, d * 0.32, RU(0x141414), x, h - 0.006, -d * 0.22, 0.002);
    return;
  }
  const hh = k === 'le' ? h * 0.62 : h * 0.85;
  rb(g, sw * 0.94, hh - 0.02, d * 0.55, up, x, 0.018, -d * 0.2, Math.min(0.024, sw * 0.3));   // かかと側
  sp(g, sw * 0.47, hh * 0.52, d * 0.33, up, x, 0.02, d * 0.12);   // つま先
  rb(g, sw * 0.6, 0.004, d * 0.3, RU(0x141414), x, 0.018 + hh - 0.022, -d * 0.22, 0.002);   // 履き口
  if (k === 'sn') rb(g, sw * 0.42, 0.006, d * 0.2, pm(0xf4f2ee, 0.8), x, 0.018 + hh * 0.72, d * 0.04, 0.002);   // ひも
  if (k === 'le') cy(g, 0.012, 0.009, 0.04, RU(0x1a1a1a), x, 0, -d * 0.42, 10);   // ヒール
}
const pair = (k) => (g, w, h, d, c) => { const sw = w / 2 - 0.012; for (const s of [-1, 1]) shoe1(g, s * w / 4, sw, h, d, c, k); };

// ---- 棚の中身の形 ----
const S = {
  b: (g, w, h, d, c) => rb(g, w, h, d, pm(c), 0, 0, 0, Math.min(w, h, d) * 0.12),
  c: (g, w, h, d, c) => cy(g, w / 2, w / 2, h, pm(c)),
  cl: (g, w, h, d, c) => cyh(g, h / 2, w, pm(c), 0, h / 2, 0, 'x'),
  // 段ボール（ガムテープつき）
  cb: (g, w, h, d, c) => {
    rb(g, w, h, d, pm(c, 0.95), 0, 0, 0, 0.004);
    const tp = pm(0xc9a36a, 0.45), tw = Math.min(0.05, d * 0.3);
    rb(g, w + 0.003, 0.002, tw, tp, 0, h, 0, 0);
    for (const s of [-1, 1]) rb(g, 0.002, 0.06, tw, tp, s * (w / 2 + 0.0015), h - 0.06, 0, 0);
  },
  shoe: pair('sn'), lshoe: pair('le'), sandal: pair('sa'), boot: pair('bo'),
  // 本（厚さ・高さを少しずつ変えて並べる）
  book: (g, w, h, d, c) => {
    let x = -w / 2;
    while (x < w / 2 - 0.012) {
      const t = Math.min(w / 2 - x, 0.013 + rnd() * 0.02), bh = h * (0.8 + 0.2 * rnd()), bd = d * (0.85 + 0.15 * rnd());
      rb(g, t - 0.002, bh, bd, pm(shade(c, [0.75, 1, 1.18][Math.floor(rnd() * 3)]), 0.7), x + t / 2, 0, d / 2 - bd / 2, 0.002); x += t;
    }
  },
  // ファイル（背に白いラベルと指を掛ける穴）
  file: (g, w, h, d, c) => {
    rb(g, w - 0.006, h, d, pm(c, 0.55), 0, 0, 0, 0.005);
    rb(g, (w - 0.006) * 0.62, h * 0.3, 0.003, pm(0xf4f2ec, 0.8), 0, h * 0.52, d / 2, 0);
    cyh(g, 0.011, 0.004, RU(0x151515), 0, h * 0.22, d / 2, 'z', 12);
  },
  bk_toy: (g, w, h, d, c) => basket(g, w, h, d, c, FILL.toy),
  bk_food: (g, w, h, d, c) => basket(g, w, h, d, c, FILL.food),
  bk_misc: (g, w, h, d, c) => basket(g, w, h, d, c, FILL.misc),
  // バッグ（持ち手つき）
  bag: (g, w, h, d, c) => {
    const bh = h * 0.72;
    rb(g, w * 0.92, bh, d * 0.85, pm(c, 0.5), 0, 0, 0, 0.03);
    rb(g, w * 0.92 + 0.004, 0.01, d * 0.85 + 0.004, pm(shade(c, 0.7), 0.5), 0, bh * 0.78, 0, 0.004);
    arc(g, w * 0.22, 0.009, Math.PI, pm(shade(c, 0.8), 0.5), 0, bh, 0);
  },
  // スーツケース（車輪・持ち手）
  suit: (g, w, h, d, c) => {
    rb(g, w * 0.96, h - 0.04, d * 0.96, pm(c, 0.35), 0, 0.035, 0, 0.03);
    for (const x of [-w * 0.22, 0, w * 0.22]) rb(g, 0.012, (h - 0.04) * 0.82, 0.006, pm(shade(c, 0.8), 0.35), x, 0.07, d * 0.48, 0.003);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) sp(g, 0.02, 0.02, 0.02, RU(), sx * w * 0.4, 0.02, sz * d * 0.38, 8);
    rb(g, 0.14, 0.02, 0.03, RU(), 0, h - 0.004, 0, 0.008);
  },
  // たたんだタオル（重ねる）
  towel: (g, w, h, d, c) => {
    const n = Math.max(2, Math.round(h / 0.06)), lh = h / n;
    for (let i = 0; i < n; i++) rb(g, w, lh - 0.002, d, FA(i % 2 ? c : shade(c, 0.94)), 0, i * lh, 0, lh * 0.45);
  },
  // 洗剤などのボトル
  bottle: (g, w, h, d, c) => {
    rb(g, w * 0.86, h * 0.78, d * 0.86, PL(c), 0, 0, 0, 0.02);
    rb(g, w * 0.5, h * 0.08, d * 0.5, PL(c), -w * 0.1, h * 0.76, 0, 0.02);
    cy(g, w * 0.12, w * 0.13, h * 0.12, PL(0xf4f4f2), -w * 0.14, h * 0.83, 0, 12);
    rb(g, w * 0.66, h * 0.32, 0.002, PL(0xfafafa), 0, h * 0.22, d * 0.43, 0);
  },
  // スティック掃除機（充電スタンドに立てる）
  vac: (g, w, h, d) => {
    const dk = PL(0x2b2c2e);
    rb(g, w, 0.015, d, PL(0x3a3c3f), 0, 0, 0, 0.006);
    tb(g, [0, 0.015, -d * 0.4], [0, h * 0.8, -d * 0.4], 0.014, PL(0xe8e8e6));
    rb(g, w * 0.95, 0.05, 0.08, dk, 0, 0.015, d * 0.22, 0.015);
    tb(g, [0, 0.06, d * 0.22], [0, h * 0.6, -0.01], 0.013, ME(0x9aa0a6));
    cy(g, 0.045, 0.04, 0.16, PL(0x8a8f94), 0, h * 0.6, -0.02);
    cy(g, 0.04, 0.04, 0.1, pm(0xb8c4cc, 0.15), 0, h * 0.6 + 0.16, -0.02);
    tb(g, [0, h * 0.86, -0.03], [0, h, -0.07], 0.016, dk);
  },
  // トイレットペーパー（12ロール）とティッシュ
  tp: (g, w, h, d) => {
    const r = 0.055, nx = Math.max(1, Math.floor(w / (2 * r))), nz = Math.max(1, Math.floor(d / (2 * r)));
    for (let ly = 0; ly < 2; ly++) for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++)
      cy(g, r - 0.003, r - 0.003, 0.1, FA(0xf6f6f3), -w / 2 + r + i * 2 * r, ly * 0.105, -d / 2 + r + k * 2 * r, 14);
    for (let i = 0; i < 2; i++) { rb(g, w - 0.02, 0.08, d - 0.04, PL(0xf2f0ea), 0, 0.215 + i * 0.085, 0, 0.006); rb(g, w - 0.018, 0.02, d - 0.038, PL(0x9fc7d8), 0, 0.245 + i * 0.085, 0, 0.004); }
  },
  // 救急箱（赤い十字）
  aid: (g, w, h, d) => {
    rb(g, w, h, d, PL(0xf1f0ec), 0, 0, 0, 0.015);
    rb(g, 0.07, 0.022, 0.003, PL(0xd23a3a), 0, h * 0.5 - 0.011, d / 2, 0); rb(g, 0.022, 0.07, 0.003, PL(0xd23a3a), 0, h * 0.5 - 0.035, d / 2, 0);
    rb(g, 0.1, 0.02, 0.025, PL(0xd8d6d0), 0, h, 0, 0.008);
  },
  // ふた付きの収納ケース
  cont: (g, w, h, d, c) => {
    rb(g, w, h * 0.88, d, pm(c, 0.4), 0, 0, 0, 0.012);
    rb(g, w + 0.01, h * 0.12, d + 0.01, pm(shade(c, 0.8), 0.4), 0, h * 0.88, 0, 0.01);
    for (const s of [-1, 1]) rb(g, 0.04, 0.05, 0.01, pm(shade(c, 0.8), 0.4), s * w * 0.3, h * 0.78, d / 2 + 0.002, 0.004);
  },
  // 三つ折りマットレス（立てる）
  mattress: (g, w, h, d, c) => { for (let i = 0; i < 3; i++) rb(g, w / 3 - 0.004, h, d, FA(i % 2 ? shade(c, 0.95) : c), -w / 2 + (i + 0.5) * w / 3, 0, 0, 0.035); },
  // 圧縮袋の布団
  futon: (g, w, h, d, c) => { rb(g, w, h, d, pm(c, 0.25), 0, 0, 0, Math.min(w, h, d) * 0.4); rb(g, w * 0.6, 0.04, 0.012, pm(0xd8dde2, 0.3), 0, h - 0.1, d / 2 - 0.02, 0.004); },
  // 電気ケトル
  kettle: (g, w, h, d, c) => {
    cy(g, w * 0.5, w * 0.5, 0.02, RU(0x1a1a1a), 0, 0, 0, 20);
    cy(g, w * 0.36, w * 0.44, h * 0.76, pm(c, 0.35), 0, 0.02, 0, 24);
    cy(g, w * 0.28, w * 0.36, h * 0.06, pm(c, 0.35), 0, 0.02 + h * 0.76, 0, 24);
    const hd = arc(g, h * 0.28, 0.013, Math.PI, pm(c, 0.35), w * 0.36, h * 0.52, 0); hd.rotation.z = -Math.PI / 2;
    tb(g, [-w * 0.34, h * 0.6, 0], [-w * 0.52, h * 0.8, 0], 0.012, pm(c, 0.35));
  },
  // オーブントースター（ガラスの扉・つまみ）
  toaster: (g, w, h, d, c) => {
    rb(g, w, h * 0.92, d, pm(c, 0.4), 0, 0.015, 0, 0.02);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) cy(g, 0.012, 0.012, 0.015, RU(), sx * w * 0.4, 0, sz * d * 0.38, 8);
    rb(g, w * 0.62, h * 0.55, 0.004, pm(0x1a1d20, 0.12), -w * 0.12, h * 0.16, d / 2, 0.008);
    rb(g, w * 0.5, 0.014, 0.02, pm(0x2a2a2a, 0.4), -w * 0.12, h * 0.76, d / 2 + 0.012, 0.006);
    for (const y of [h * 0.3, h * 0.6]) cyh(g, 0.022, 0.016, pm(0x2a2a2a, 0.4), w * 0.36, y, d / 2 + 0.006, 'z', 14);
  },
  // 炊飯器
  rice: (g, w, h, d, c) => {
    cy(g, w * 0.48, w * 0.44, h * 0.62, PL(c), 0, 0, 0, 28);
    sp(g, w * 0.48, h * 0.26, w * 0.48, PL(shade(c, 0.97)), 0, h * 0.62, 0, 24);
    rb(g, w * 0.34, h * 0.16, 0.01, pm(0x2a2c2e, 0.3), 0, h * 0.34, w * 0.43, 0.004);
    arc(g, w * 0.22, 0.01, Math.PI, PL(0x9a9a9a), 0, h * 0.8, 0);
  },
  // 電子レンジ
  micro: (g, w, h, d, c) => {
    rb(g, w, h, d, pm(c, 0.4), 0, 0, 0, 0.012);
    rb(g, w * 0.62, h * 0.62, 0.004, pm(0x101214, 0.1), -w * 0.12, h * 0.18, d / 2, 0.006);
    rb(g, w * 0.2, h * 0.72, 0.003, pm(0x3a3c3f, 0.4), w * 0.36, h * 0.13, d / 2, 0.004);
  },
  // ホームベーカリー
  hb: (g, w, h, d, c) => {
    rb(g, w, h, d, PL(c), 0, 0, 0, 0.04);
    rb(g, w * 1.0, 0.006, d * 1.0, PL(shade(c, 0.85)), 0, h * 0.72, 0, 0.003);
    rb(g, w * 0.42, 0.004, d * 0.32, pm(0x202224, 0.12), 0, h - 0.002, -d * 0.08, 0.004);
    rb(g, w * 0.6, h * 0.12, 0.004, pm(0x2a2c2e, 0.3), 0, h * 0.5, d / 2, 0.004);
  },
  // お米（袋）
  ricebag: (g, w, h, d, c) => { const r = Math.min(w, d) * 0.3; rb(g, w, h, d, pm(c, 0.7), 0, 0, 0, r); rb(g, w + 0.004, h * 0.22, d + 0.004, pm(0x3c7d3a, 0.7), 0, h * 0.42, 0, r); },
  // ぬいぐるみ
  plush: (g, w, h, d, c) => {
    sp(g, w * 0.42, h * 0.32, d * 0.38, FA(c), 0, h * 0.32, 0);
    sp(g, w * 0.34, h * 0.26, d * 0.32, FA(c), 0, h * 0.72, 0.01);
    for (const s of [-1, 1]) { sp(g, w * 0.1, h * 0.1, d * 0.07, FA(shade(c, 0.85)), s * w * 0.22, h * 0.94, 0, 10); sp(g, 0.008, 0.008, 0.005, RU(0x111111), s * w * 0.1, h * 0.76, 0.01 + d * 0.31, 8); }
  },
  // ゴルフバッグ（クラブのヘッドカバーが見える）
  golf: (g, w, h, d, c) => {
    cy(g, w * 0.45, w * 0.42, h * 0.78, pm(c, 0.5), 0, 0, 0, 20);
    cy(g, w * 0.47, w * 0.47, 0.05, pm(0x555555, 0.5), 0, h * 0.75, 0, 20);
    rb(g, w * 0.4, h * 0.3, 0.04, pm(shade(c, 1.6), 0.5), 0, h * 0.18, w * 0.42, 0.015);
    [[0.06, 0.05, 0xc0392b], [-0.06, 0.05, 0x2c5d9e], [0.0, -0.06, 0xd4ac0d], [0.07, -0.05, 0xeeeeee], [-0.07, -0.05, 0x333333]].forEach(([x, z, hc]) => {
      tb(g, [x * w * 4, h * 0.75, z * w * 4], [x * w * 4, h * 0.94, z * w * 4], 0.006, ME()); sp(g, 0.045, 0.06, 0.045, FA(hc), x * w * 4, h * 0.95, z * w * 4, 10);
    });
  },
  // スノーボード（立てる）
  snow: (g, w, h, d, c) => {
    slab(g, w * 0.4, h, d, Math.min(d * 0.45, 0.12), pm(c, 0.3));
    rb(g, w * 0.42, h * 0.12, d * 0.86, PL(0xf2f0ea), 0, h * 0.58, 0, 0.004);
    for (const y of [h * 0.3, h * 0.62]) rb(g, 0.05, 0.12, d * 0.8, RU(), w * 0.2 + 0.025, y, 0, 0.012);
  },
  // テント・寝袋など（収納袋・ベルト2本）。横向き
  tent: (g, w, h, d, c) => {
    cyh(g, h / 2, w, FA(c), 0, h / 2, 0, 'x');
    for (const x of [-w * 0.25, w * 0.25]) cyh(g, h / 2 + 0.004, 0.03, FA(shade(c, 0.55)), x, h / 2, 0, 'x');
  },
  // 収納袋（奥行の向きに長い）
  bagz: (g, w, h, d, c) => {
    cyh(g, w / 2, d, FA(c), 0, w / 2, 0, 'z');
    for (const z of [-d * 0.25, d * 0.25]) cyh(g, w / 2 + 0.004, 0.03, FA(shade(c, 0.55)), 0, w / 2, z, 'z');
  },
  // クーラーボックス
  cooler: (g, w, h, d, c) => {
    rb(g, w, h * 0.84, d, PL(c), 0, 0, 0, 0.03);
    rb(g, w + 0.006, h * 0.16, d + 0.006, PL(0xf2f0ea), 0, h * 0.84, 0, 0.025);
    for (const s of [-1, 1]) rb(g, 0.02, 0.03, 0.12, PL(0xf2f0ea), s * (w / 2 + 0.006), h * 0.66, 0, 0.006);
  },
  // 折りたたみテーブル（たたんだ状態）
  ftable: (g, w, h, d) => {
    for (let i = 0; i < 5; i++) rb(g, 0.022, h, d / 5 - 0.004, ME(0xc4c6c8), -w * 0.22, 0, -d / 2 + (i + 0.5) * d / 5, 0.004);
    for (const s of [-1, 1]) tb(g, [w * 0.15, 0.05, s * -d * 0.4], [w * 0.15, h - 0.05, s * d * 0.4], 0.008, ME(0x555555));
  },
  // 紙袋（取っ手つき）
  pbag: (g, w, h, d, c) => {
    rb(g, w, h, d, pm(c, 0.9), 0, 0, 0, 0.002);
    rb(g, w - 0.012, 0.002, d - 0.012, pm(0x4a3a2a, 0.9), 0, h - 0.001, 0, 0);
    for (const z of [-d * 0.3, d * 0.3]) { const a = arc(g, w * 0.15, 0.004, Math.PI, pm(0x8a6a4a, 0.8), 0, h, z); }
  },
};
let si = 0;
// 形を作る（底の中心が原点のグループ）。t がわからないときは箱
export function shape(t, w, h, d, col) {
  const g = new THREE.Group(); seed = 1 + ((si++ * 7919) % 2147483000); rnd();
  (S[t] || S.b)(g, w, h, d, col);
  return g;
}

// ---- 置く物（item）：それぞれの形。W＝幅（x）、D＝奥行（z、正面が +z）、H＝高さ ----
const MODELS = {
  // 机（天板・黒い脚）とモニター・キーボード、手前にオフィスチェア
  desk(g, W, D, H) {
    const top = pm(0xb8916a, 0.55), stl = pm(0x2a2b2d, 0.45, 0.5), blk = pm(0x1c1d1f, 0.4);
    rb(g, W, 0.03, D, top, 0, H - 0.03, 0, 0.004);
    for (const s of [-1, 1]) {
      const x = s * (W / 2 - 0.05);
      for (const z of [-D / 2 + 0.04, D / 2 - 0.04]) tb(g, [x, 0, z], [x, H - 0.03, z], 0.016, stl);
      tb(g, [x, 0.012, -D / 2 + 0.02], [x, 0.012, D / 2 - 0.02], 0.012, stl);
      tb(g, [x, H - 0.06, -D / 2 + 0.04], [x, H - 0.06, D / 2 - 0.04], 0.012, stl);
    }
    tb(g, [-W / 2 + 0.05, H - 0.08, -D / 2 + 0.04], [W / 2 - 0.05, H - 0.08, -D / 2 + 0.04], 0.012, stl);
    rb(g, 0.22, 0.012, 0.16, blk, 0, H, -D / 2 + 0.14, 0.005); tb(g, [0, H, -D / 2 + 0.1], [0, H + 0.14, -D / 2 + 0.1], 0.018, blk);
    rb(g, 0.62, 0.37, 0.03, blk, 0, H + 0.1, -D / 2 + 0.13, 0.006); rb(g, 0.6, 0.35, 0.002, pm(0x0e1620, 0.12), 0, H + 0.11, -D / 2 + 0.146, 0);
    rb(g, 0.38, 0.016, 0.13, pm(0x2b2c2e, 0.6), -0.05, H, 0.06, 0.006); sp(g, 0.03, 0.016, 0.05, pm(0x2b2c2e, 0.5), 0.25, H + 0.004, 0.07, 10);
    const c = new THREE.Group(); c.position.set(0.05, 0, D / 2 + 0.32); g.add(c);
    const cm = FA(0x3a3d42);
    for (let k = 0; k < 5; k++) { const a = k * Math.PI * 2 / 5; tb(c, [0, 0.07, 0], [Math.cos(a) * 0.3, 0.05, Math.sin(a) * 0.3], 0.016, blk); sp(c, 0.028, 0.028, 0.028, blk, Math.cos(a) * 0.3, 0.028, Math.sin(a) * 0.3, 8); }
    cy(c, 0.025, 0.025, 0.36, ME(0x9a9ea2), 0, 0.07, 0);
    rb(c, 0.5, 0.07, 0.48, cm, 0, 0.42, 0, 0.03);
    rb(c, 0.46, 0.52, 0.06, cm, 0, 0.56, 0.25, 0.03);
    tb(c, [0, 0.45, 0.2], [0, 0.6, 0.26], 0.02, blk);
    for (const s of [-1, 1]) { tb(c, [s * 0.24, 0.46, 0.05], [s * 0.24, 0.64, 0.05], 0.012, blk); rb(c, 0.06, 0.025, 0.24, blk, s * 0.24, 0.64, 0.02, 0.01); }
  },
  // トレーニングベンチ（立てた状態）とダンベル2つ・ケトルベル
  bench(g, W, D, H) {
    const blk = pm(0x1e1f21, 0.45), stl = pm(0x2f3134, 0.4, 0.6), x0 = -W / 2 + 0.22, z0 = -D / 2 + 0.1;
    tb(g, [x0, 0.02, z0 - 0.04], [x0, 1.2, z0 - 0.04], 0.025, stl);
    tb(g, [x0, 0.02, -D / 2 + 0.02], [x0, 0.02, D / 2 - 0.02], 0.02, stl);
    tb(g, [x0 - 0.18, 0.02, z0 - 0.04], [x0 + 0.18, 0.02, z0 - 0.04], 0.02, stl);
    rb(g, 0.28, 0.78, 0.07, blk, x0, 0.4, z0 + 0.02, 0.025);
    rb(g, 0.28, 0.3, 0.07, blk, x0, 0.06, z0 + 0.02, 0.025);
    for (const s of [-1, 1]) cyh(g, 0.035, 0.03, RU(), x0 + s * 0.12, 0.035, z0 - 0.08, 'x', 14);
    for (const dz of [-0.09, 0.09]) {
      const cx = x0 + 0.5, y = 0.085;
      cyh(g, 0.016, 0.4, ME(0x8a8d90), cx, y, dz, 'x', 10);
      for (const s of [-1, 1]) for (const k of [0, 1]) cyh(g, 0.085 - k * 0.015, 0.035, pm(0x1c1c1d, 0.6), cx + s * (0.11 + k * 0.037), y, dz, 'x', 20);
    }
    const kx = x0 + 0.92;
    sp(g, 0.08, 0.075, 0.08, pm(0x1c1c1d, 0.5), kx, 0.075, 0, 16); arc(g, 0.05, 0.012, Math.PI, pm(0x1c1c1d, 0.5), kx, 0.13, 0);
  },
  // たたんだベビーカーと、たたんだキャンプ用ワゴン
  stroller(g, W, D, H) {
    const fr = pm(0x2b2c2e, 0.4, 0.5), fab = FA(0x2f3d55);
    const s = new THREE.Group(); s.position.set(-W / 2 + 0.26, 0, -0.05); g.add(s);
    for (const sx of [-1, 1]) { const x = sx * 0.2; tb(s, [x, 0.09, 0.15], [x, 0.95, -0.08], 0.012, fr); tb(s, [x, 0.09, -0.14], [x, 0.62, 0.0], 0.012, fr); }
    tb(s, [-0.21, 0.95, -0.08], [0.21, 0.95, -0.08], 0.017, RU());
    rb(s, 0.36, 0.5, 0.06, fab, 0, 0.28, 0.03, 0.02).rotation.x = -0.28;
    const hood = add(s, new THREE.CylinderGeometry(0.11, 0.11, 0.38, 16, 1, false, 0, Math.PI), fab, 0, 0.72, -0.03); hood.rotation.z = Math.PI / 2;
    rb(s, 0.3, 0.08, 0.22, pm(0x1d1d1e, 0.9), 0, 0.12, 0, 0.01);
    for (const [x, z] of [[-0.18, 0.15], [0.18, 0.15], [-0.2, -0.14], [0.2, -0.14]]) wheel(s, 0.075, 0.018, x, 0.075, z, 'x');
    const c = new THREE.Group(); c.position.set(W / 2 - 0.2, 0, 0); g.add(c);
    rb(c, 0.28, 0.62, 0.24, FA(0x56664a), 0, 0.14, 0, 0.03);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) tb(c, [sx * 0.14, 0.1, sz * 0.12], [sx * 0.14, 0.8, sz * 0.12], 0.01, fr);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) wheel(c, 0.09, 0.03, sx * 0.17, 0.09, sz * 0.13, 'x');
    tb(c, [0, 0.8, -0.12], [0, 0.98, -0.14], 0.012, fr); tb(c, [-0.08, 0.98, -0.14], [0.08, 0.98, -0.14], 0.015, RU());
  },
  // ボールのかごと、傘立て（傘3本）
  balls(g, W, D, H) {
    const bx = -W / 2 + 0.2, bk = new THREE.Group(); bk.position.set(bx, 0, 0); g.add(bk);
    basket(bk, 0.36, 0.24, 0.32, 0xb89a6a, []);
    sp(bk, 0.1, 0.1, 0.1, PL(0xd94f3d), -0.07, 0.25, 0.03); sp(bk, 0.085, 0.085, 0.085, PL(0x3a78c2), 0.09, 0.24, -0.05); sp(bk, 0.06, 0.06, 0.06, PL(0xf0c04a), 0.08, 0.28, 0.08);
    const ux = W / 2 - 0.12;
    cy(g, 0.09, 0.08, 0.42, pm(0x8d9196, 0.35, 0.6), ux, 0, 0, 20); cy(g, 0.082, 0.082, 0.002, RU(0x111111), ux, 0.42, 0, 20);
    [[0x23304a, 1], [0xd9b21f, 0.78], [0xe9eef1, 1]].forEach(([c, sc], i) => {
      const a = i * 2.1, u = new THREE.Group(); u.position.set(ux + Math.cos(a) * 0.035, 0.02, Math.sin(a) * 0.035); u.rotation.z = (i - 1) * 0.07; u.rotation.x = (i - 1) * 0.05; u.scale.setScalar(sc); g.add(u);
      tb(u, [0, 0, 0], [0, 0.86, 0], 0.006, ME(0x9a9ea2));
      add(u, new THREE.CylinderGeometry(0.032, 0.006, 0.56, 12), i === 2 ? pm(c, 0.2) : FA(c), 0, 0.38, 0);
      cyh(u, 0.012, 0.03, FA(shade(c, 0.7)), 0, 0.5, 0, 'z', 8);
      arc(u, 0.03, 0.008, Math.PI, pm(i === 1 ? 0xd9b21f : 0x3a2a1e, 0.5), 0.03, 0.86, 0);
    });
  },
  // おままごとキッチン（コンロ・シンク・オーブン）
  kitchen_toy(g, W, D, H) {
    const wh = PL(0xf3f0ea), wd = pm(0xd6b88e, 0.6), mint = PL(0x9fd3c7), pink = PL(0xf4b6b9), blk = PL(0x2a2b2d);
    rb(g, W, 0.5, D - 0.02, wh, 0, 0.02, -0.01, 0.012);
    for (const s of [-1, 1]) rb(g, 0.04, 0.02, D - 0.04, wd, s * (W / 2 - 0.04), 0, -0.01, 0.005);
    rb(g, W + 0.01, 0.03, D, wd, 0, 0.52, 0, 0.008);
    for (const x of [-W * 0.3, -W * 0.1]) cy(g, 0.06, 0.06, 0.006, blk, x, 0.55, 0.03, 20);
    cy(g, 0.05, 0.045, 0.05, PL(0xd94f3d), -W * 0.3, 0.556, 0.03, 16);
    rb(g, 0.22, 0.004, 0.18, ME(), W * 0.2, 0.549, 0.02, 0.01);
    tb(g, [W * 0.2, 0.55, -0.1], [W * 0.2, 0.68, -0.1], 0.01, ME()); tb(g, [W * 0.2, 0.68, -0.1], [W * 0.2, 0.66, -0.02], 0.01, ME());
    rb(g, W * 0.45, 0.36, 0.012, mint, -W * 0.24, 0.08, D / 2 - 0.016, 0.01); rb(g, W * 0.3, 0.16, 0.004, pm(0x1c2a33, 0.15), -W * 0.24, 0.22, D / 2 - 0.008, 0.008);
    rb(g, W * 0.42, 0.36, 0.012, pink, W * 0.24, 0.08, D / 2 - 0.016, 0.01); sp(g, 0.015, 0.015, 0.015, wd, W * 0.08, 0.3, D / 2 - 0.004, 8);
    for (const x of [-W * 0.36, -W * 0.24, -W * 0.12]) cyh(g, 0.016, 0.02, blk, x, 0.48, D / 2 - 0.01, 'z', 12);
    rb(g, W, 0.38, 0.02, mint, 0, 0.55, -D / 2 + 0.01, 0.008); rb(g, W * 0.9, 0.015, 0.1, wd, 0, 0.76, -D / 2 + 0.06, 0.004);
    [0xd94f3d, 0xf0c04a, 0x3a78c2].forEach((c, i) => cy(g, 0.03, 0.025, 0.06, PL(c), -0.2 + i * 0.12, 0.775, -D / 2 + 0.06, 12));
    cyh(g, 0.05, 0.01, wh, 0.22, 0.86, -D / 2 + 0.025, 'z', 20);
  },
  // 室内用のすべり台（階段・踊り場・すべる面）とブランコ
  slide(g, W, D, H) {
    const iv = PL(0xf1ece2), bl = PL(0x8fc9e8), ye = PL(0xf6d36b), gr = PL(0x9fd3a0);
    const sx0 = -W / 2 + 0.3, zb = -D / 2 + 0.1, zp = -D / 2 + 0.45, yp = 0.75;
    for (const s of [-1, 1]) tb(g, [sx0 + s * 0.24, 0, zb], [sx0 + s * 0.24, yp + 0.25, zp - 0.2], 0.03, iv);
    for (let k = 1; k <= 3; k++) { const t = k / 4; rb(g, 0.44, 0.04, 0.16, ye, sx0, yp * t - 0.02, zb + (zp - 0.2 - zb) * t, 0.015); }
    rb(g, 0.52, 0.06, 0.42, iv, sx0, yp - 0.06, zp, 0.02);
    for (const s of [-1, 1]) rb(g, 0.04, 0.3, 0.42, gr, sx0 + s * 0.26, yp, zp, 0.015);
    const z1 = zp + 0.21, z2 = D / 2 - 0.05, L = Math.hypot(z2 - z1, yp - 0.06);
    const sl = new THREE.Group(); sl.position.set(sx0, (yp + 0.06) / 2, (z1 + z2) / 2); sl.rotation.x = Math.atan2(yp - 0.06, z2 - z1); g.add(sl);
    rb(sl, 0.44, 0.025, L, bl, 0, -0.0125, 0, 0.01);
    for (const s of [-1, 1]) rb(sl, 0.03, 0.09, L, bl, s * 0.235, -0.01, 0, 0.012);
    const x1 = -W / 2 + 0.68, x2 = W / 2 - 0.04, yb = 1.15, xm = (x1 + x2) / 2;
    tb(g, [x1, yb, 0], [x2, yb, 0], 0.025, iv);
    for (const x of [x1, x2]) for (const s of [-1, 1]) tb(g, [x, yb, 0], [x, 0, s * 0.5], 0.028, iv);
    rb(g, 0.34, 0.04, 0.2, ye, xm, 0.3, 0, 0.015);
    for (const s of [-1, 1]) for (const zz of [-0.08, 0.08]) tb(g, [xm + s * 0.15, yb, 0], [xm + s * 0.15, 0.34, zz], 0.005, pm(0xdddddd, 0.6), 4);
  },
  // 折りたたみマット（4つに折って重ねた状態）
  mat(g, W, D, H) {
    const n = 4, lh = H / n;
    for (let i = 0; i < n; i++) rb(g, W, lh - 0.003, D, FA(i % 2 ? 0xcfe3d8 : 0xf2e6d0), 0, i * lh, 0, lh * 0.45);
  },
  // 子どものハンガーラック（木）：服6着・下の段にリュックと帽子
  kidrack(g, W, D, H) {
    const wd = pm(0xd8b98a, 0.6), yb = H - 0.08;
    for (const s of [-1, 1]) { const x = s * (W / 2 - 0.03); tb(g, [x, 0.03, 0], [x, H - 0.05, 0], 0.018, wd); tb(g, [x, 0.03, -D / 2 + 0.02], [x, 0.03, D / 2 - 0.02], 0.02, wd); }
    tb(g, [-W / 2 + 0.03, yb, 0], [W / 2 - 0.03, yb, 0], 0.014, wd);
    rb(g, W - 0.08, 0.02, D * 0.7, wd, 0, 0.22, 0, 0.006);
    rb(g, 0.22, 0.26, 0.14, FA(0xe07a5f), -0.13, 0.24, 0, 0.05);
    cy(g, 0.1, 0.11, 0.01, FA(0xf2cc8f), 0.12, 0.24, 0, 20); sp(g, 0.07, 0.06, 0.07, FA(0xf2cc8f), 0.12, 0.25, 0, 14);
    [0xe07a5f, 0x81b29a, 0xf2cc8f, 0x5fa8d3, 0xd77fa1, 0x3a4a5a].forEach((c, i) => {
      const x = -0.22 + i * 0.088, len = 0.36 + ((i * 37) % 5) * 0.04;
      arc(g, 0.02, 0.003, Math.PI * 1.3, ME(0x9a9ea2), x, yb + 0.005, 0).rotation.y = Math.PI / 2;
      rb(g, 0.012, 0.02, 0.3, pm(0xe8dcc8, 0.6), x, yb - 0.05, 0, 0.004);
      rb(g, 0.03, len, 0.26, FA(c), x, yb - 0.045 - len, 0, 0.012);
      for (const s of [-1, 1]) rb(g, 0.026, len * 0.42, 0.06, FA(c), x, yb - 0.05 - len * 0.42, s * 0.15, 0.012);
    });
  },
  // 自転車4台（北側に斜めに止める）：子ども乗せ電動・シティサイクル・子どもの自転車・クロスバイク
  bikes(g, W, D, H) {
    const kinds = [{ col: 0x4a5a52, seat: true, basket: true }, { col: 0xb9bcc0, basket: true }, { col: 0xc0392b, s: 0.7 }, { col: 0x26282b, sport: true }];
    kinds.forEach((o, i) => {
      const b = new THREE.Group(); b.position.set(-W / 2 + 0.75 + i * 1.08, 0, 0.03); b.rotation.y = -Math.PI / 6;
      b.scale.setScalar(o.s || 1); g.add(b); MODELS.bike(b, 1.8, 0.6, 1.0, o);
    });
  },
  // 自転車（前が -x）。o.seat＝後ろに子ども乗せ、o.basket＝前かご、o.sport＝細いタイヤ
  bike(g, W, D, H, o = { seat: true, basket: true, col: 0x4a5a52 }) {
    const fm = pm(o.col ?? 0x4a5a52, 0.45, 0.3), R = 0.3, fx = -0.58, rx = 0.58;
    const tw = o.sport ? 0.014 : 0.025;
    wheel(g, R, tw, fx, R, 0, 'z', 16); wheel(g, R, tw, rx, R, 0, 'z', 16);
    const h1 = [-0.4, 0.68, 0], h2 = [-0.44, 0.86, 0], low = [-0.22, 0.26, 0], bb = [0.02, 0.27, 0], st = [0.16, 0.84, 0];
    tb(g, h1, low, 0.024, fm); tb(g, low, bb, 0.024, fm); tb(g, bb, st, 0.02, fm); tb(g, h1, h2, 0.026, fm);
    for (const s of [-1, 1]) {
      tb(g, [-0.41, 0.7, s * 0.03], [fx, R, s * 0.045], 0.012, fm);
      tb(g, bb, [rx, R, s * 0.05], 0.011, fm); tb(g, [0.15, 0.78, 0], [rx, R, s * 0.05], 0.01, fm);
    }
    tb(g, h2, [-0.46, 1.0, 0], 0.016, fm); tb(g, [-0.42, 1.0, -0.28], [-0.42, 1.0, 0.28], 0.012, ME(0x2b2c2e));
    for (const s of [-1, 1]) cyh(g, 0.018, 0.1, RU(), -0.42, 1.0, s * 0.24, 'z', 12);
    tb(g, st, [0.17, 0.92, 0], 0.014, ME(0x9a9ea2)); rb(g, 0.26, 0.06, 0.16, RU(0x1e1e1f), 0.18, 0.91, 0, 0.03);
    if (o.seat) rb(g, 0.09, 0.3, 0.09, pm(0x2b2c2e, 0.4), 0.12, 0.4, 0, 0.02).rotation.z = -0.22;   // 電動のバッテリー
    rb(g, 0.5, 0.1, 0.02, fm, 0.3, 0.22, 0.06, 0.03);
    for (const s of [-1, 1]) { tb(g, [0.02, 0.27, s * 0.07], [0.02 + s * 0.08, 0.27 - s * 0.14, s * 0.08], 0.01, ME(0x555555)); rb(g, 0.09, 0.02, 0.06, RU(), 0.02 + s * 0.08, 0.26 - s * 0.14, s * 0.12, 0.006); }
    // 泥よけ
    for (const x of [fx, rx]) { const f = arc(g, R + 0.015, 0.03, Math.PI * 0.75, fm, x, R, 0); f.rotation.z = Math.PI * 0.12; f.scale.z = 1.5; }
    // スタンド
    for (const s of [-1, 1]) tb(g, [0.42, 0.27, s * 0.06], [0.46, 0.0, s * 0.16], 0.01, ME(0x777777));
    if (!o.seat && !o.basket) return;
    // うしろの荷台
    rb(g, 0.36, 0.02, 0.16, fm, 0.58, 0.66, 0, 0.005);
    for (const s of [-1, 1]) tb(g, [0.42, 0.66, s * 0.07], [rx, R + 0.02, s * 0.06], 0.008, fm);
    if (o.seat) {   // 子ども乗せ
    const cs = PL(0x3a3c3f);
    rb(g, 0.3, 0.06, 0.3, cs, 0.56, 0.68, 0, 0.03); rb(g, 0.06, 0.5, 0.32, cs, 0.73, 0.68, 0, 0.03);
    for (const s of [-1, 1]) rb(g, 0.28, 0.18, 0.03, cs, 0.57, 0.72, s * 0.16, 0.012);
    }
    // 前のかご（金網）
    const bm = pm(0x2b2c2e, 0.4, 0.5), kx = -0.66, ky = 0.8;
    rb(g, 0.3, 0.008, 0.34, bm, kx, ky, 0, 0);
    for (const [w, d, x, z] of [[0.006, 0.34, -0.15, 0], [0.006, 0.34, 0.15, 0], [0.3, 0.006, 0, -0.17], [0.3, 0.006, 0, 0.17]]) rb(g, w, 0.22, d, bm, kx + x, ky, z, 0);
    sp(g, 0.035, 0.035, 0.03, pm(0xf2f0ea, 0.3), -0.5, 0.86, 0, 10);
  },
  // ベッド（シングル）：木の枠・マットレス・掛け布団・まくら。頭が -z
  bed(g, W, D, H, o = {}) {
    const wd = pm(0xc8a47c, 0.6), duv = FA(o.col ?? 0xb7c7dd);
    rb(g, W, 0.2, D, wd, 0, 0.08, 0, 0.01);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) rb(g, 0.06, 0.08, 0.06, wd, sx * (W / 2 - 0.05), 0, sz * (D / 2 - 0.05), 0.005);
    rb(g, W, 0.7, 0.05, wd, 0, 0.08, -D / 2 + 0.025, 0.012);
    rb(g, W - 0.04, 0.2, D - 0.08, FA(0xf4f2ee), 0, 0.28, 0.02, 0.05);
    rb(g, W + 0.02, 0.07, D * 0.66, duv, 0, 0.45, D / 2 - D * 0.33, 0.035);
    rb(g, W + 0.03, 0.2, 0.04, duv, 0, 0.3, D / 2 + 0.005, 0.02);   // 足元に垂れた所
    rb(g, W * 0.62, 0.1, 0.36, FA(0xf8f7f3), 0, 0.47, -D / 2 + 0.3, 0.045);
  },
  // ドラム式洗濯機：丸い扉（ガラス）・上の操作パネル・洗剤の引き出し
  washer(g, W, D, H) {
    const wh = pm(0xeeeff0, 0.35), dk = pm(0x2a2c2f, 0.25);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) cy(g, 0.025, 0.03, 0.03, RU(), sx * (W / 2 - 0.08), 0, sz * (D / 2 - 0.08), 10);
    rb(g, W - 0.02, H - 0.03, D - 0.04, wh, 0, 0.03, -0.01, 0.025);
    const cz = D / 2 - 0.03, cyy = 0.47;
    add(g, new THREE.TorusGeometry(0.2, 0.025, 10, 32), pm(0xc9ccd0, 0.3, 0.5), 0, cyy, cz + 0.01);
    cyh(g, 0.185, 0.02, pm(0x1c2329, 0.08), 0, cyy, cz, 'z', 32);
    rb(g, 0.05, 0.12, 0.02, pm(0xc9ccd0, 0.3, 0.5), 0.2, cyy - 0.06, cz + 0.01, 0.008);
    rb(g, (W - 0.02) * 0.62, 0.09, 0.012, dk, 0.08, H - 0.15, cz - 0.005, 0.01);
    rb(g, 0.18, 0.06, 0.012, pm(0xdcdde0, 0.35), -W / 2 + 0.14, H - 0.14, cz - 0.004, 0.008);
  },
  // トイレ（タンクの低い一体型）：便器・便座・ふた・タンク。後ろが -z
  toilet(g, W, D, H, o = {}) {
    const wh = pm(0xf7f7f5, 0.18);
    rb(g, 0.26, 0.3, 0.4, wh, 0, 0, 0.02, 0.06);
    sp(g, 0.19, 0.1, 0.25, wh, 0, 0.33, 0.06, 20);
    const seat = add(g, new THREE.TorusGeometry(0.15, 0.035, 8, 28), wh, 0, 0.41, 0.06); seat.rotation.x = Math.PI / 2; seat.scale.set(1.15, 1.45, 0.5);
    sp(g, 0.19, 0.025, 0.25, pm(0xf2f2f0, 0.25), 0, 0.445, 0.06, 20);   // ふた（閉じている）
    if (o.tankless) {   // タンクなし：後ろは低い機能部だけ。壁にリモコン
      rb(g, 0.34, 0.1, 0.2, wh, 0, 0.36, -0.2, 0.04);
      rb(g, 0.1, 0.16, 0.025, pm(0xe8e8e6, 0.3), W / 2 + 0.12, 0.75, -0.05, 0.01);
      return;
    }
    rb(g, W, 0.25, 0.22, wh, 0, 0.36, -D / 2 + 0.11, 0.04);
    rb(g, W * 0.7, 0.04, 0.12, pm(0xe6e6e4, 0.3), 0, 0.6, -D / 2 + 0.11, 0.015);
  },
  // 木のカウンターの洗面（ツアー 11/27）：下はあいていて、上に白いボウル・壁から出る水栓・鏡
  basin2(g, W, D, H, o = {}) {
    const wd = pm(0xc9a77c, 0.5), wh = pm(0xf8f8f6, 0.15), hh = o.small ? 0.75 : 0.8;
    rb(g, W, 0.04, D, wd, 0, hh - 0.04, 0, 0.006);
    for (const s of [-1, 1]) rb(g, 0.03, 0.03, D - 0.08, ME(0x9a9ea2), s * (W / 2 - 0.12), hh - 0.07, -0.02, 0.006);
    rb(g, 0.42, 0.13, 0.34, wh, 0, hh, 0.03, 0.05);
    sp(g, 0.18, 0.01, 0.14, pm(0xdfe5e8, 0.12), 0, hh + 0.13, 0.03, 20);
    tb(g, [0, hh + 0.3, -D / 2], [0, hh + 0.3, -D / 2 + 0.16], 0.012, ME());
    rb(g, 0.06, 0.06, 0.03, ME(), 0, hh + 0.27, -D / 2 + 0.015, 0.01);
    const mw = Math.min(W - 0.1, 1.4);   // 鏡（黒い細い枠つき）
    rb(g, mw + 0.03, 0.78, 0.012, pm(0x2a2b2d, 0.4, 0.5), 0, hh + 0.405, -D / 2 + 0.006, 0.004);
    rb(g, mw, 0.75, 0.012, MIR, 0, hh + 0.42, -D / 2 + 0.014, 0.004);
    if (!o.small) for (let k = 0; k < Math.floor(W / 0.5); k++) rb(g, 0.36, 0.26, 0.28, pm(0xd8c8a8, 1), -W / 2 + 0.25 + k * 0.45, 0, 0, 0.02);   // 下にかご
  },
  // ハンガーパイプと掛けた服（パイプは x の向き。服は z の向きに広がる）。o.n＝着数、o.max＝いちばん長い服、o.pole＝パイプも作る
  closet(g, W, D, H, o = {}) {
    const top = 1.7, n = o.n || 24, mx = o.max || 1.0;
    if (o.pole) { tb(g, [-W / 2, top, 0], [W / 2, top, 0], 0.016, ME()); for (const s of [-1, 1]) rb(g, 0.02, 0.08, 0.06, ME(), s * (W / 2 - 0.01), top - 0.04, 0, 0.005); }
    const COL = [0x23304a, 0xf2f0ea, 0x8a8f94, 0xc9b79c, 0x1e1e20, 0x5f6b4a, 0x9cb8cf, 0x7a3b3b, 0xe6dcc8, 0x3d4f66, 0xb5a7c4, 0x4a3a2e];
    const hang = pm(0x7a5a3a, 0.6), step = (W - 0.06) / n;
    for (let i = 0; i < n; i++) {
      const x = -W / 2 + 0.03 + step * (i + 0.5), c = COL[Math.floor(rnd() * COL.length)], r = rnd();
      const t = r < 0.45 ? 'shirt' : r < 0.65 ? 'jacket' : r < 0.8 ? 'pants' : mx > 1 ? (r < 0.9 ? 'coat' : 'dress') : 'shirt';
      const len = { shirt: 0.68, jacket: 0.75, pants: 0.55, coat: Math.min(mx, 1.05), dress: Math.min(mx, 1.1) }[t] * (0.92 + 0.16 * rnd());
      const w = t === 'pants' ? 0.34 : 0.44, th = t === 'coat' || t === 'jacket' ? 0.06 : 0.035, m = FA(c), y0 = top - 0.06;
      arc(g, 0.022, 0.003, Math.PI * 1.2, ME(0x9a9ea2), x, top + 0.003, 0).rotation.y = Math.PI / 2;   // フック
      tb(g, [x, y0, -w / 2 + 0.02], [x, y0 + 0.04, 0], 0.006, hang); tb(g, [x, y0 + 0.04, 0], [x, y0, w / 2 - 0.02], 0.006, hang);   // ハンガーの肩
      if (t === 'pants') {   // ハンガーのバーに二つ折り
        rb(g, 0.05, len, w, m, x, y0 - len, 0, 0.015);
      } else if (t === 'dress') {   // すそが広がる
        const dg = add(g, new THREE.CylinderGeometry(0.17, 0.27, len, 16), m, x, y0 - len / 2, 0); dg.scale.x = 0.22;
      } else {
        rb(g, th, len, w * 0.92, m, x, y0 - len, 0, 0.018);   // 身ごろ
        for (const s of [-1, 1]) { const sl = rb(g, th * 0.8, len * 0.62, 0.1, m, x, y0 - len * 0.62 - 0.03, s * (w / 2 - 0.03), 0.02); sl.rotation.x = s * 0.06; }   // そで
        if (t !== 'shirt') rb(g, th + 0.01, 0.06, 0.16, FA(shade(c, 0.8)), x, y0 - 0.06, 0, 0.012);   // えり
      }
    }
  },
  // スロップシンク（深い流し・壁が -z）
  slop(g, W, D, H) {
    const wh = pm(0xf4f4f2, 0.2);
    for (const sx of [-1, 1]) tb(g, [sx * (W / 2 - 0.04), 0, 0], [sx * (W / 2 - 0.04), 0.62, 0], 0.018, ME(0xb8bcc0));
    rb(g, W, 0.28, D, wh, 0, 0.62, 0, 0.03);
    rb(g, W - 0.08, 0.02, D - 0.1, pm(0xdfe5e8, 0.12), 0, 0.89, 0.01, 0.01);
    tb(g, [0, 0.9, -D / 2 + 0.05], [0, 1.2, -D / 2 + 0.05], 0.012, ME()); tb(g, [0, 1.2, -D / 2 + 0.05], [0, 1.15, -D / 2 + 0.2], 0.012, ME());
  },
  // 浴室の洗い場：壁の水栓・スライドバーのシャワー・鏡・カウンター（壁が -z）
  shower(g, W, D, H, o = {}) {
    const ch = ME(0xc8ccd0);
    rb(g, W, 0.008, D, pm(0xb9bcbf, 0.7), 0, 0, 0, 0.002);   // 洗い場の床（グレー）
    const f = new THREE.Group(); f.position.x = o.ox || 0; g.add(f); g = f;   // 水栓・鏡などは入口をよけて横へずらす
    rb(g, 0.3, 0.07, 0.08, ch, 0, 0.75, -D / 2 + 0.04, 0.02);
    tb(g, [0.05, 0.75, -D / 2 + 0.08], [0.05, 0.72, -D / 2 + 0.16], 0.01, ch);
    tb(g, [0.22, 0.95, -D / 2 + 0.03], [0.22, 1.85, -D / 2 + 0.03], 0.012, ch);
    rb(g, 0.04, 0.04, 0.05, ch, 0.22, 1.55, -D / 2 + 0.06, 0.01);
    cyh(g, 0.05, 0.03, ch, 0.22, 1.6, -D / 2 + 0.11, 'z', 16);
    rb(g, 0.5, 0.65, 0.01, MIR, -0.15, 0.95, -D / 2 + 0.005, 0.01);
    rb(g, 0.6, 0.03, 0.12, pm(0xe4e4e2, 0.3), -0.1, 0.88, -D / 2 + 0.06, 0.01);
  },
  // 浴槽（エプロンつき）。洗い場が +z
  bath(g, W, D, H) {
    const wh = pm(0xf3f3f1, 0.2), t = 0.08;
    rb(g, W, 0.12, D, wh, 0, 0, 0, 0.02);
    rb(g, W, H, t, wh, 0, 0, D / 2 - t / 2, 0.03);
    rb(g, W, H, t, wh, 0, 0, -D / 2 + t / 2, 0.03);
    for (const s of [-1, 1]) rb(g, t, H, D, wh, s * (W / 2 - t / 2), 0, 0, 0.03);
    rb(g, W, 0.03, 0.16, wh, 0, H - 0.03, -D / 2 + 0.08, 0.015);   // 壁側の広いふち
    rb(g, 0.36, 0.3, D - 2 * t, wh, -W / 2 + t + 0.18, 0.1, 0, 0.03);   // 中の段（腰かけ）
    rb(g, W - 2 * t, 0.36, D - 2 * t, pm(0x9fc4d4, 0.05), 0, 0.12, 0, 0.04);   // お湯
    tb(g, [-W * 0.2, H + 0.25, -D / 2 - 0.02], [W * 0.2, H + 0.25, -D / 2 - 0.02], 0.014, ME(0xc8ccd0));   // 手すり
    cy(g, 0.03, 0.03, 0.06, ME(), W / 2 - 0.12, H, -D / 2 + 0.04, 10);
  },
  // 洗面台（下に収納・上に鏡の収納）。壁が -z
  basin(g, W, D, H) {
    const wh = pm(0xf2efe8, 0.4), top = pm(0xf8f8f6, 0.2), hh = Math.min(0.78, H - 0.06);
    rb(g, W, hh - 0.08, D - 0.03, wh, 0, 0.08, -0.015, 0.01);
    rb(g, W - 0.04, 0.08, D - 0.08, pm(0x6a6560, 0.8), 0, 0, -0.04, 0);
    for (const s of [-1, 1]) { rb(g, W / 2 - 0.006, hh - 0.1, 0.012, wh, s * W / 4, 0.09, D / 2 - 0.02, 0.006); rb(g, 0.012, 0.1, 0.012, ME(), s * 0.03, hh - 0.2, D / 2 - 0.005, 0.004); }
    rb(g, W, 0.06, D, top, 0, hh, 0, 0.015);
    sp(g, Math.min(0.2, W * 0.34), 0.012, D * 0.3, pm(0xdfe5e8, 0.15), 0, hh + 0.06, 0.03, 24);
    tb(g, [0, hh + 0.06, -D / 2 + 0.07], [0, hh + 0.24, -D / 2 + 0.07], 0.014, ME()); tb(g, [0, hh + 0.24, -D / 2 + 0.07], [0, hh + 0.22, -D / 2 + 0.16], 0.012, ME());
    rb(g, W, 0.7, 0.13, wh, 0, hh + 0.36, -D / 2 + 0.065, 0.01);
    rb(g, W - 0.04, 0.62, 0.004, MIR, 0, hh + 0.4, -D / 2 + 0.131, 0);
  },
};
// 形のある物を作る。作れたら true
export function buildModel(id, g, W, D, H, o) {
  const f = MODELS[id]; if (!f) return false;
  seed = 7; f(g, W, D, H, o); return true;
}

// ---- 動かない部品を、材料ごとに1つの形にまとめる（userData.dyn の付いたグループの中は動くので残す）----
export function bake(root) {
  root.updateMatrixWorld(true);
  const inv = root.matrixWorld.clone().invert(), buckets = new Map(), kill = [], M4 = new THREE.Matrix4();
  root.traverse((o) => {
    if (!o.isMesh || o.children.length || o.userData.sync || (o.material && o.material.transparent)) return;
    for (let p = o.parent; p && p !== root; p = p.parent) if (p.userData.dyn) return;
    const geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k);
    if (!geo.attributes.uv || !geo.attributes.normal) return;
    geo.applyMatrix4(M4.multiplyMatrices(inv, o.matrixWorld));
    if (!buckets.has(o.material)) buckets.set(o.material, []);
    buckets.get(o.material).push(geo); kill.push(o);
  });
  for (const o of kill) o.parent.remove(o);
  for (const [m, geos] of buckets) {
    const geo = mergeGeometries(geos, false); if (!geo) continue;
    const o = new THREE.Mesh(geo, m); o.castShadow = o.receiveShadow = true; root.add(o);
  }
}
