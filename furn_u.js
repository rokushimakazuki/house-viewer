// 11/20 プラン用のシンプルな家具（ソファと、ダイニングの椅子）。u.html から呼ぶ。
// 以前は革張りのソファ・椅子のモデルを使っていたが、一般的な布張りのものに替えた（11/20 六嶋さん）。
// 位置は平面図の cm（原点＝建物の北西の角）。向き a は FURN と同じ決め方（0＝南を向く）
import * as THREE from 'three';

const PX = (x) => (x - 477.75) / 100, PZ = (y) => (y - 409.5) / 100;
const fabric = (col) => new THREE.MeshStandardMaterial({ color: col, roughness: 1.0, metalness: 0 });
const M = {
  sofa: fabric(0x8e8a84),        // 明るいグレーの布
  cushion: fabric(0x96928c),
  seat: fabric(0x77736d),        // 椅子の座面（グレーの布）
  wood: new THREE.MeshStandardMaterial({ color: 0x8a6446, roughness: 0.7 }),   // 木（オーク色）
  leg: new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5, metalness: 0.3 }),
};
// 角を少し丸めた箱（クッションらしく見せる）
function rbox(mat, w, h, d, r = 0.03) {
  const s = new THREE.Shape(), x = w / 2 - r, y = h / 2 - r;
  s.moveTo(-x, -h / 2); s.lineTo(x, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -y); s.lineTo(w / 2, y);
  s.quadraticCurveTo(w / 2, h / 2, x, h / 2); s.lineTo(-x, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, y);
  s.lineTo(-w / 2, -y); s.quadraticCurveTo(-w / 2, -h / 2, -x, -h / 2);
  const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * r, bevelEnabled: true, bevelThickness: r, bevelSize: r * 0.6, bevelSegments: 3, curveSegments: 4 });
  g.translate(0, 0, -(d - 2 * r) / 2);
  const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; return m;
}
function box(mat, w, h, d) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.castShadow = m.receiveShadow = true; return m; }
function at(o, x, y, z) { o.position.set(x, y, z); return o; }

// 2人掛けのソファ（幅 1.6m・奥行 0.82m・座面 0.42m・背 0.75m）。前＝+z（11/20 小さめに）
function sofa() {
  const g = new THREE.Group(), W = 1.6, D = 0.82;
  g.add(at(rbox(M.sofa, W, 0.22, D, 0.03), 0, 0.23, 0));                       // 台
  g.add(at(rbox(M.sofa, W - 0.1, 0.4, 0.2, 0.05), 0, 0.54, -D / 2 + 0.12));    // 背もたれ
  for (const sx of [-1, 1]) g.add(at(rbox(M.sofa, 0.16, 0.36, D, 0.04), sx * (W / 2 - 0.08), 0.42, 0));   // ひじ掛け
  for (const k of [-0.5, 0.5]) g.add(at(rbox(M.cushion, 0.62, 0.1, D - 0.24, 0.035), k * 0.64, 0.39, 0.08));   // 座面クッション
  for (const k of [-0.5, 0.5]) g.add(at(rbox(M.cushion, 0.62, 0.36, 0.14, 0.05), k * 0.64, 0.59, -D / 2 + 0.26));   // 背クッション
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(at(box(M.leg, 0.03, 0.12, 0.03), sx * (W / 2 - 0.06), 0.06, sz * (D / 2 - 0.06)));
  return g;
}
// ダイニングの椅子（木のフレーム＋布の座面。座面 0.44m・背 0.80m）。前＝+z
function chair() {
  const g = new THREE.Group(), W = 0.44, D = 0.46, SH = 0.44, T = 0.03;
  for (const sx of [-1, 1]) {
    g.add(at(box(M.wood, T, SH - 0.04, T), sx * (W / 2 - T / 2), (SH - 0.04) / 2, D / 2 - T / 2));     // 前の脚
    g.add(at(box(M.wood, T, 0.8, T), sx * (W / 2 - T / 2), 0.4, -D / 2 + T / 2));                      // 後ろの脚（背まで）
  }
  g.add(at(box(M.wood, W, 0.03, D), 0, SH - 0.055, 0));                     // 座枠
  g.add(at(rbox(M.seat, W - 0.02, 0.05, D - 0.02, 0.02), 0, SH - 0.015, 0.0));   // 座面（布）
  g.add(at(box(M.wood, W - 2 * T, 0.09, 0.02), 0, 0.72, -D / 2 + T / 2));   // 背の上の板
  g.add(at(box(M.wood, W - 2 * T, 0.04, 0.02), 0, 0.56, -D / 2 + T / 2));   // 背の下の横木
  return g;
}
export function addSimpleFurniture(furn, FL1) {
  const put = (o, x, y, a) => { o.position.set(PX(x), FL1, PZ(y)); o.rotation.y = -a; furn.add(o); };
  // ソファは東（テレビ）を向く。以前のモデルと同じ位置（中心 x=684, y=515）
  put(sofa(), 684, 515, -Math.PI / 2);
  for (const x of [447.5, 502.5, 557.5]) { put(chair(), x, 153, 0); put(chair(), x, 272, Math.PI); }
}
