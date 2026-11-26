// 11/20 プラン用のシンプルな家具（ソファと、ダイニングの椅子）。u.html から呼ぶ。
// 以前は革張りのソファ・椅子のモデルを使っていたが、一般的な布張りのものに替えた（11/20 六嶋さん）。
// 位置は平面図の cm（原点＝建物の北西の角）。向き a は FURN と同じ決め方（0＝南を向く）
import * as THREE from 'three';

const PX = (x) => (x - 477.75) / 100, PZ = (y) => (y - 409.5) / 100;
const fabric = (col) => new THREE.MeshStandardMaterial({ color: col, roughness: 1.0, metalness: 0 });
const M = {
  sofa: fabric(0x8e8a84),        // 明るいグレーの布
  cushion: fabric(0x96928c),
  seat: new THREE.MeshStandardMaterial({ color: 0x7f888c, roughness: 0.62, metalness: 0 }),   // 椅子（グレーの革風）
  wood: new THREE.MeshStandardMaterial({ color: 0x1f1f20, roughness: 0.45, metalness: 0.4 }),   // 椅子の脚（黒い金属）。名前は chair_wood のまま（タップで色を変えられる）
  leg: new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5, metalness: 0.3 }),
};
// タップで色を変えるときの名前（design_u.js の CHOICES と合わせる）
M.sofa.name = 'sofa'; M.cushion.name = 'sofa'; M.seat.name = 'chair_seat'; M.wood.name = 'chair_wood';
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
// ダイニングの椅子：丸い座面と、すき間をあけた丸い背もたれ（包み込む形）。グレーの革風・黒い細い脚。前＝+z
// 座面の高さ 0.45m・背もたれの上 0.78m・幅 約0.54m
function ringBand(mat, rOut, rIn, a0, a1, h, bev) {   // 上から見て扇形の帯（背もたれ）を、縦に厚みを付けて作る
  const sh = new THREE.Shape();
  sh.absarc(0, 0, rOut, a0, a1, false); sh.absarc(0, 0, rIn, a1, a0, true);
  const g = new THREE.ExtrudeGeometry(sh, { depth: h - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 4, curveSegments: 32 });
  g.rotateX(-Math.PI / 2);   // 押し出しを縦（上向き）に
  const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; return m;
}
function chair() {
  const g = new THREE.Group(), SH = 0.45;
  // 座面：丸みのある円盤（少し前後に長い）
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.255, 0.24, 0.075, 40), M.seat);
  seat.scale.z = 0.92; seat.position.y = SH - 0.035; seat.castShadow = seat.receiveShadow = true; g.add(seat);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.245, 0.025, 10, 40), M.seat);
  rim.rotation.x = Math.PI / 2; rim.scale.y = 0.92; rim.position.y = SH - 0.01; g.add(rim);
  // 背もたれ：後ろ側を約 190° 囲む帯（座面とすき間をあける）
  const back = ringBand(M.seat, 0.27, 0.215, -Math.PI * 0.03, Math.PI * 1.03, 0.16, 0.025);   // 形の角度 90° が後ろ（-z）
  back.position.y = SH + 0.14; g.add(back);   // 0.59〜0.76m
  // 脚：4本、少し外へ開く
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.007, SH - 0.06, 10), M.wood);
    leg.position.set(sx * 0.17, (SH - 0.06) / 2, sz * 0.15); leg.rotation.z = -sx * 0.10; leg.rotation.x = sz * 0.10; leg.castShadow = true; g.add(leg);
  }
  return g;
}
// ダイニングテーブル：グレーのセラミック天板（厚み 1.2cm）＋黒の幕板と四角い脚。180×90cm・高さ 0.72m
const T = {
  top: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0 }),
  frame: new THREE.MeshStandardMaterial({ color: 0x1c1c1d, roughness: 0.45, metalness: 0.35 }),
};
T.top.name = 'table';   // タップで天板の色・素材を変えられる
{
  const tl = new THREE.TextureLoader();
  const t = tl.load('assets/tex/white_plaster_02_diff.jpg'); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1.2, 0.6);
  T.top.map = t;
  T.top.color.setRGB(0.085 / 0.272, 0.089 / 0.2461, 0.093 / 0.1985, THREE.LinearSRGBColorSpace);   // 写真の平均（リニア値）で割って、グレー（#717577 前後）にする
}
function table() {
  const g = new THREE.Group(), W = 1.8, D = 0.9, H = 0.72;
  g.add(at(box(T.top, W, 0.012, D), 0, H - 0.006, 0));
  for (const sz of [-1, 1]) g.add(at(box(T.frame, W - 0.16, 0.05, 0.02), 0, H - 0.04, sz * (D / 2 - 0.06)));   // 幕板（長手）
  for (const sx of [-1, 1]) g.add(at(box(T.frame, 0.02, 0.05, D - 0.16), sx * (W / 2 - 0.08), H - 0.04, 0));   // 幕板（短手）
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(at(box(T.frame, 0.06, H - 0.012, 0.06), sx * (W / 2 - 0.08), (H - 0.012) / 2, sz * (D / 2 - 0.08)));   // 脚
  return g;
}
// ---- キッチンの細かい所（シンク・水栓・IH・レンジフード・ガラスのガード・扉の目地）----
// 本体の箱（色はパターンで変わる）は家のモデルにあり、ここでは上に載せる物だけ作る。
// キッチン本体：x 595〜865・y 161〜262（作業する人は北側 y<161）。カップボード：x 603〜856・y 8〜60（前は南 y=60）
const K = {
  steel: new THREE.MeshStandardMaterial({ color: 0xb9bcbf, roughness: 0.35, metalness: 0.8 }),
  basin: new THREE.MeshStandardMaterial({ color: 0x8e9194, roughness: 0.45, metalness: 0.7 }),
  ih: new THREE.MeshStandardMaterial({ color: 0x0d0d0f, roughness: 0.12, metalness: 0.1 }),
  ring: new THREE.MeshStandardMaterial({ color: 0x5a5d61, roughness: 0.4, emissive: 0x3a0a05, emissiveIntensity: 0.6 }),
  glass: new THREE.MeshStandardMaterial({ color: 0xdfe8ea, roughness: 0.05, transparent: true, opacity: 0.22 }),
  hood: new THREE.MeshStandardMaterial({ color: 0xaeb0b2, roughness: 0.75, metalness: 0.2 }),   // 銀色のツヤ消し（11/20）
  groove: new THREE.MeshStandardMaterial({ color: 0x1b1b1c, roughness: 0.8 }),
};
// 平面図の cm と高さ m で箱を置く
function kbox(g, mat, x0, y0, x1, y1, h0, h1, FL1) {
  const m = box(mat, (x1 - x0) / 100, h1 - h0, (y1 - y0) / 100);
  m.position.set(PX((x0 + x1) / 2), FL1 + (h0 + h1) / 2, PZ((y0 + y1) / 2)); g.add(m); return m;
}
export function addKitchenDetails(furn, FL1) {
  const g = new THREE.Group(); g.name = 'kitchenDetails';
  const T = 0.90;   // 天板の上面
  // シンク（幅80cm）：縁のステンレスと、一段暗い槽
  kbox(g, K.steel, 636, 172, 724, 228, T, T + 0.003, FL1);
  kbox(g, K.basin, 642, 177, 718, 223, T + 0.003, T + 0.004, FL1);
  // 水栓（シンクの奥＝南側の縁）
  const tap = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.30, 16), K.steel);
  tap.position.set(PX(680), FL1 + T + 0.15, PZ(236)); g.add(tap);
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.20, 12), K.steel);
  spout.rotation.x = Math.PI / 2; spout.position.set(PX(680), FL1 + T + 0.29, PZ(226)); g.add(spout);
  // IH（3口のうち2口を表示）：黒いガラスと輪
  kbox(g, K.ih, 768, 176, 846, 234, T, T + 0.006, FL1);
  for (const [cx, cy, r] of [[788, 202, 0.085], [826, 202, 0.085], [807, 224, 0.06]]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.004, 6, 40), K.ring);
    ring.rotation.x = Math.PI / 2; ring.position.set(PX(cx), FL1 + T + 0.008, PZ(cy)); g.add(ring);
  }
  // IH の奥（南）のガラスのオイルガード
  kbox(g, K.glass, 760, 257, 865, 258.2, T, T + 0.30, FL1);
  // レンジフード（薄型）と、下り天井（2.20m）までのダクトカバー
  kbox(g, K.hood, 768, 176, 848, 236, 1.62, 1.70, FL1);
  kbox(g, K.hood, 790, 190, 826, 222, 1.70, 2.20, FL1);
  // キッチン本体の作業側（北面 y=161）の扉の目地：縦に4本、引き出しの横目地
  for (const x of [662, 730, 798]) kbox(g, K.groove, x - 0.3, 160.4, x + 0.3, 161, 0.1, 0.85, FL1);
  for (const h of [0.30, 0.58]) kbox(g, K.groove, 597, 160.4, 863, 161, h - 0.003, h + 0.003, FL1);
  // カップボード（南面 y=60）：下の扉と引き出しの目地、吊戸棚（前面 y=43）の扉の目地
  for (let x = 653; x < 856; x += 50.6) kbox(g, K.groove, x - 0.3, 60, x + 0.3, 60.6, 0.1, 0.83, FL1);
  for (const h of [0.36, 0.60]) kbox(g, K.groove, 605, 60, 854, 60.6, h - 0.003, h + 0.003, FL1);
  furn.add(g);
}
// ---- ラグ（グレーの毛足のある感じ。白い線で大きな区切り模様）----
// 毛並みは「短い線をたくさん」描いた絵で表し、同じ絵を凹凸（bumpMap）にも使う。1枚の絵＝ラグ全体（1.8m×1.4m）
function rugTexture() {
  const W = 1024, H = 800, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  let a = 7; const r = () => { a = (a * 16807) % 2147483647; return a / 2147483647; };
  g.fillStyle = '#5f6164'; g.fillRect(0, 0, W, H);
  // 大きな区切りの白い線（ゆがんだ格子）
  const lines = [];
  for (let i = 1; i < 6; i++) { const x = (i / 6) * W + (r() - 0.5) * 90; lines.push([[x + (r() - 0.5) * 120, 0], [x + (r() - 0.5) * 120, H]]); }
  for (let i = 1; i < 4; i++) { const y = (i / 4) * H + (r() - 0.5) * 80; lines.push([[0, y + (r() - 0.5) * 100], [W, y + (r() - 0.5) * 100]]); }
  g.strokeStyle = '#b9bab8'; g.lineWidth = 6; g.lineCap = 'round';
  for (const [[x0, y0], [x1, y1]] of lines) { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
  // 毛並み：短い線を明暗ランダムに
  for (let i = 0; i < 90000; i++) {
    const x = r() * W, y = r() * H, ang = r() * Math.PI * 2, L = 2 + r() * 6, v = 60 + r() * 90 | 0;
    g.strokeStyle = `rgba(${v},${v + 2},${v + 4},0.5)`; g.lineWidth = 1 + r();
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(ang) * L, y + Math.sin(ang) * L); g.stroke();
  }
  // 端のふち（少し濃く）
  g.strokeStyle = 'rgba(60,62,64,0.5)'; g.lineWidth = 10; g.strokeRect(5, 5, W - 10, H - 10);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
export function styleRug(root) {
  let rug = null; root.traverse((o) => { if (o.name === 'rug') rug = o; });
  if (!rug || rug.userData.styled) return !!rug;
  const t = rugTexture();
  rug.material = new THREE.MeshStandardMaterial({ map: t, bumpMap: t, bumpScale: 6, roughness: 1.0, metalness: 0 });
  rug.material.name = 'rug';
  rug.scale.y = 2.0;   // 厚み 0.8cm → 約1.6cm（毛足）
  rug.userData.styled = true; return true;
}

// ---- ソファ：はじめは出さない。ボタンで出し入れ（11/20 六嶋さん）----
let sofaObj = null;
function sofaButton() {
  const b = document.createElement('button'); b.className = 'sofabtn'; b.textContent = 'ソファを出す';
  b.onclick = () => setSofa(!sofaObj.visible); return b;
}
function setSofa(on) {
  if (!sofaObj) return;
  sofaObj.visible = on;
  document.querySelectorAll('.sofabtn').forEach((b) => { b.textContent = on ? 'ソファを消す' : 'ソファを出す'; b.classList.toggle('on', on); });
  const d = window._dbg; d && d.ext && d.ext.invalidate && d.ext.invalidate();
}
export function addSimpleFurniture(furn, FL1) {
  const put = (o, x, y, a) => { o.position.set(PX(x), FL1, PZ(y)); o.rotation.y = -a; furn.add(o); };
  // ソファは東（テレビ）を向く。以前のモデルと同じ位置（中心 x=684, y=515）
  sofaObj = sofa(); put(sofaObj, 684, 515, -Math.PI / 2); sofaObj.visible = false;
  { const note = document.querySelector('#designnote'); if (note) { const b = sofaButton(); b.style.marginTop = '6px'; note.after(b); } }
  { const ds = document.querySelector('#designsel'); if (ds) { const grp = document.createElement('span'); grp.className = 'grp'; grp.append(sofaButton()); ds.parentElement.after(grp); } }
  // ラグ（extras 側で作られる）を見つけたら見た目を替える
  const tryRug = () => { const d = window._dbg; if (!(d && styleRug(d.rig))) setTimeout(tryRug, 500); };
  tryRug();
  put(table(), 501.5, 212.5, 0);
  for (const x of [441.5, 501.5, 561.5]) { put(chair(), x, 150, 0); put(chair(), x, 275, Math.PI); }
  addKitchenDetails(furn, FL1);
}

// ---- テレビの大きさを切り替える（11/26）。モデルのテレビ（材料名 tv、55インチで作ってある）を、中心を変えずに拡大・縮小する ----
// 外形は一般的な製品の大きさ（幅×高さ cm）。画面の中心の高さは床から 1.05m のまま
const TVS = { 50: [112, 65], 55: [123, 71.5], 65: [145, 84], 75: [167, 96.5] };
const EYE_TO_TV = 2.70;   // ソファに座った目から画面まで（m）
let tvSize = 55;
try { tvSize = +localStorage.getItem('tv_u') || 55; } catch (e) { /* 使えないときは 55 */ }
if (!TVS[tvSize]) tvSize = 55;
function tvInfo(n) {
  const [w, h] = TVS[n], ang = 2 * Math.atan(w / 200 / EYE_TO_TV) * 180 / Math.PI;
  return `${n}インチ：幅${w}cm・高さ${h}cm／座った目から約${EYE_TO_TV}m、横の視野角 約${ang.toFixed(0)}°（迫力の目安 30°）`;
}
function applyTV() {
  const d = window._dbg; if (!d) return;
  const [w, h] = TVS[tvSize];
  d.rig.traverse((o) => {
    if (!o.isMesh || !o.material || o.material.name !== 'tv') return;
    if (!o.userData.tvBase) {   // 1回だけ：形の中心を原点に移し、位置で元に戻す（拡大の中心をテレビの中心にする）
      o.geometry = o.geometry.clone(); o.geometry.computeBoundingBox();
      const c = o.geometry.boundingBox.getCenter(new THREE.Vector3());
      o.geometry.translate(-c.x, -c.y, -c.z); o.position.add(c); o.userData.tvBase = true;
    }
    o.scale.set(1, h / 71.5, w / 123);   // テレビは東の壁（向きは -x）。幅は z、高さは y
  });
  d.ext && d.ext.invalidate && d.ext.invalidate();
}
function setTV(n) {
  tvSize = n;
  try { localStorage.setItem('tv_u', String(n)); } catch (e) { /* 保存できなくても切り替えはできる */ }
  document.querySelectorAll('.tvsel').forEach((s) => { s.value = String(n); });
  document.querySelectorAll('.tvinfo').forEach((p) => { p.textContent = tvInfo(n); });
  applyTV();
}
function tvSelect() {
  const s = document.createElement('select'); s.className = 'tvsel'; s.style.cssText = 'font-size:14px;padding:6px';
  for (const n of Object.keys(TVS)) { const o = document.createElement('option'); o.value = n; o.textContent = 'テレビ ' + n + 'インチ'; s.append(o); }
  s.value = String(tvSize); s.onchange = () => setTV(+s.value); return s;
}
{
  const note = document.querySelector('#designnote');
  if (note) {
    const s = tvSelect(); s.style.marginTop = '6px';
    const p = document.createElement('p'); p.className = 'sub tvinfo'; p.style.margin = '4px 0 0'; p.textContent = tvInfo(tvSize);
    note.after(s, p);
  }
  const ds = document.querySelector('#designsel');
  if (ds) { const grp = document.createElement('span'); grp.className = 'grp'; grp.append(tvSelect()); ds.parentElement.after(grp); }
}
setInterval(applyTV, 1500);   // 窓の高さを変えて別のモデルを読み込んだときにも当てる
window._tv = { setTV, TVS, tvInfo };
