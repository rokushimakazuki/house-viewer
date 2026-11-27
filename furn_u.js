// 11/20 プラン用のシンプルな家具（ソファと、ダイニングの椅子）。u.html から呼ぶ。
// 以前は革張りのソファ・椅子のモデルを使っていたが、一般的な布張りのものに替えた（11/20 六嶋さん）。
// 位置は平面図の cm（原点＝建物の北西の角）。向き a は FURN と同じ決め方（0＝南を向く）
import * as THREE from 'three';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { shape, buildModel, bake } from './props_u.js';

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
  addStorage(furn, FL1);
}

// ---- テレビの大きさを切り替える（11/26）。モデルのテレビ（材料名 tv、55インチで作ってある）を、中心を変えずに拡大・縮小する ----
// 外形は一般的な製品の大きさ（幅×高さ cm）。画面の中心の高さは床から 1.05m のまま
const TVS = { 50: [112, 65], 55: [123, 71.5], 65: [145, 84], 75: [167, 96.5] };
const EYE_TO_TV = 2.58;   // 11/27 テレビの壁をふかしたので 12cm 近い   // ソファに座った目から画面まで（m）
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

// ---- テレビにサンプル映像を映す（11/26）。絵はこのファイルの中で描く（山と湖の風景。雲と光がゆっくり動く） ----
const SCR_W = 1.218 / 1.23, SCR_H = 0.685 / 0.715;   // 外形に対する画面の割合（55インチの値。どのサイズもほぼ同じ）
const scr = document.createElement('canvas'); scr.width = 960; scr.height = 540;
const sg = scr.getContext('2d');
const scrTex = new THREE.CanvasTexture(scr); scrTex.colorSpace = THREE.SRGBColorSpace;
const scrMat = new THREE.MeshBasicMaterial({ map: scrTex, toneMapped: false, color: 0xd8d8d8 });
scrMat.name = 'tvscreen';
let tvOn = true;
try { tvOn = localStorage.getItem('tv_on_u') !== '0'; } catch (e) { /* 使えないときは映す */ }
// 山の稜線（毎回同じ形になるよう、決まった乱数で作っておく）
const ridges = [0, 1, 2].map((k) => { let a = 7 + k * 13; const r = () => { a = (a * 16807) % 2147483647; return a / 2147483647; }; const pts = []; let y = 0.5; for (let i = 0; i <= 48; i++) { y += (r() - 0.5) * (0.09 - k * 0.02); y = Math.min(0.75, Math.max(0.2, y)); pts.push(y); } return pts; });
const clouds = Array.from({ length: 7 }, (_, i) => ({ x: (i * 173) % 960, y: 40 + ((i * 61) % 140), w: 120 + ((i * 37) % 120), v: 6 + (i % 3) * 4 }));
function drawScreen(t) {
  const W = 960, H = 540, HOR = 330;
  const sky = sg.createLinearGradient(0, 0, 0, HOR);
  sky.addColorStop(0, '#24365e'); sky.addColorStop(0.55, '#e7876a'); sky.addColorStop(1, '#f8c98a');
  sg.fillStyle = sky; sg.fillRect(0, 0, W, HOR);
  const sx = 640, sy = 250 + Math.sin(t / 20) * 6;   // 夕日
  const sun = sg.createRadialGradient(sx, sy, 10, sx, sy, 160); sun.addColorStop(0, 'rgba(255,240,200,1)'); sun.addColorStop(0.15, 'rgba(255,214,150,.9)'); sun.addColorStop(1, 'rgba(255,180,120,0)');
  sg.fillStyle = sun; sg.fillRect(0, 0, W, HOR);
  for (const c of clouds) {   // 雲
    const x = ((c.x + t * c.v) % (W + 300)) - 150;
    sg.fillStyle = 'rgba(255,225,215,.55)';
    for (let k = 0; k < 4; k++) { sg.beginPath(); sg.ellipse(x + k * c.w * 0.25, c.y + (k % 2) * 8, c.w * 0.3, 16, 0, 0, Math.PI * 2); sg.fill(); }
  }
  const cols = ['#7a6a8e', '#4f4a6e', '#2c2c47'];
  ridges.forEach((pts, k) => {   // 山（奥から手前へ）
    sg.fillStyle = cols[k]; sg.beginPath(); sg.moveTo(0, HOR);
    pts.forEach((y, i) => sg.lineTo((i / 48) * W, HOR - (1 - y) * (120 + k * 40) + k * 20));
    sg.lineTo(W, HOR); sg.closePath(); sg.fill();
  });
  // 湖（空と山を上下逆に映し、横に揺らす）
  sg.save(); sg.translate(0, HOR * 2); sg.scale(1, -1);
  sg.globalAlpha = 0.55; sg.drawImage(scr, 0, 0, W, HOR, 0, 0, W, HOR); sg.restore(); sg.globalAlpha = 1;
  sg.fillStyle = 'rgba(20,30,60,.35)'; sg.fillRect(0, HOR, W, H - HOR);
  for (let y = HOR + 4; y < H; y += 6) {   // さざ波
    const off = Math.sin(t * 2 + y * 0.15) * 20;
    sg.fillStyle = `rgba(255,220,180,${0.05 + 0.1 * Math.max(0, 1 - Math.abs(off + 640 - sx) / 300)})`;
    sg.fillRect(sx - 60 + off - (y - HOR) * 0.4, y, 120 + (y - HOR) * 0.8, 2);
  }
  // 手前の小舟
  const bx = 200 + (t * 8) % 700;
  sg.fillStyle = '#1b1b28'; sg.beginPath(); sg.moveTo(bx, 430); sg.lineTo(bx + 70, 430); sg.lineTo(bx + 58, 442); sg.lineTo(bx + 10, 442); sg.closePath(); sg.fill();
  sg.fillRect(bx + 32, 392, 3, 38);
  sg.beginPath(); sg.moveTo(bx + 35, 394); sg.lineTo(bx + 60, 426); sg.lineTo(bx + 35, 426); sg.closePath(); sg.fill();
  scrTex.needsUpdate = true;
}
function attachScreens() {
  const d = window._dbg; if (!d) return;
  d.rig.traverse((o) => {
    if (!o.isMesh || !o.material || o.material.name !== 'tv' || !o.userData.tvBase || o.userData.screen) return;
    o.geometry.computeBoundingBox();
    const bb = o.geometry.boundingBox, w = bb.max.z - bb.min.z, h = bb.max.y - bb.min.y;
    const g = new THREE.PlaneGeometry(w * SCR_W, h * SCR_H); g.rotateY(-Math.PI / 2);   // 画面は西（-x）向き
    const p = new THREE.Mesh(g, scrMat); p.position.x = bb.min.x - 0.001; p.userData.noOcc = true;
    o.add(p); o.userData.screen = p; p.visible = tvOn;
  });
}
function setTVOn(on) {
  tvOn = on;
  try { localStorage.setItem('tv_on_u', on ? '1' : '0'); } catch (e) { /* 保存できなくても切り替えはできる */ }
  const d = window._dbg; d && d.rig.traverse((o) => { if (o.userData.screen) o.userData.screen.visible = on; });
  document.querySelectorAll('.tvonbtn').forEach((b) => { b.textContent = on ? '映像を消す' : '映像を映す'; b.classList.toggle('on', on); });
}
function tvOnButton() { const b = document.createElement('button'); b.className = 'tvonbtn'; b.onclick = () => setTVOn(!tvOn); return b; }
document.querySelectorAll('.tvsel').forEach((s) => s.after(tvOnButton()));
setTVOn(tvOn);
let t0 = performance.now();
setInterval(() => {
  attachScreens();
  if (!tvOn || document.hidden) return;
  drawScreen((performance.now() - t0) / 1000);
  const d = window._dbg; d && d.ext && d.ext.invalidate && d.ext.invalidate();
}, 100);
drawScreen(0);
window._tv.setTVOn = setTVOn; window._tv.drawScreen = drawScreen;


// ---- 収納（11/27 六嶋さんと決めた配置）。タップすると扉・引き出し・ふたが開いて、中身と名札が見える ----
// 位置は平面図の cm（原点＝建物の北西の角）、高さは m。lv：'1'＝1階の床、'2'＝2階の床（+3.00）、'L'＝ロフトの床（+4.05）、'G'＝地面（−0.59）
// f：正面（手前）の向き。S＝南、N＝北、E＝東、W＝西。kind：
//   shelf＝扉のない棚（中身は最初から見える。タップで名札）／drawers＝引き出し（タップで引き出す）／boxes＝ふた付きの箱（ふたが開く）
//   shed＝物置（引き戸）／item＝物そのもの（半透明の箱）。door：別に開き戸がある（leaf＝ここで作る、glb＝家のモデルの扉を回す）
// 棚の中身 it：[段, 名札, 個数, 形, 幅, 高さ, 奥行, 色, 左端からの位置(m・省略可)]。形は props_u.js の shape()（b＝箱、shoe＝靴、book＝本、bk_toy＝かご など）
const LV = { '1': 0, '2': 3.0, 'L': 4.05, 'G': -0.59 };
const CB = 0xb08a5a;   // 段ボールの色
const SHOE = [0x2b2b2d, 0xe9e7e2, 0x6b4a33, 0x3a4c6b, 0x8d8f92, 0xb5523b, 0x1e1e1f, 0xcfc7b8];
const KID = [0xe07a5f, 0x81b29a, 0xf2cc8f, 0x5fa8d3, 0xd77fa1];
const UNITS = [
  // ---- 1階 シューズクローク（東の壁ぞいの棚 7段・扉なし）----
  { id: 'shoe', name: 'シューズクロークの棚', lv: '1', r: [288, 10, 316, 220], h: [0, 2.0], f: 'W', kind: 'shelf', col: 0x4f7fb0,
    b: [0, 0.32, 0.56, 0.80, 1.04, 1.30, 1.60],
    it: [[0, '長靴・子どもの長靴', 5, 'boot', 0.18, 0.28, 0.25, [0x2d4a3a, 0x3a3a3a, 0xd9b21f, 0x2c5d9e, 0xc04848]],
      [1, '大人の靴（スニーカー）', 8, 'shoe', 0.2, 0.11, 0.27, SHOE], [2, '大人の靴（スニーカー）', 8, 'shoe', 0.2, 0.11, 0.27, SHOE.slice(3).concat(SHOE)],
      [3, '大人の靴（革靴・パンプス）', 8, 'lshoe', 0.2, 0.12, 0.27, [0x1e1e1f, 0x5a3a28, 0x2b2b2d, 0x8a6a4a]], [4, '大人の靴（サンダルなど）', 6, 'sandal', 0.22, 0.09, 0.27, SHOE],
      [5, '子どもの靴', 10, 'shoe', 0.14, 0.08, 0.18, KID], [6, 'シーズン外の靴（箱）', 5, 'cb', 0.33, 0.12, 0.22, CB]],
    note: '大人 約30足＋子ども10足＋長靴5足 ＝ 約45足分。棚は7段（扉なし）' },
  { id: 'stroller', name: 'ベビーカー・キャンプ用カート', lv: '1', r: [190, 15, 270, 90], h: [0, 1.0], f: 'S', kind: 'item', col: 0x4f7fb0, note: 'たたんで置く。玄関からの通り道（y 141〜223）はあけておく' },
  { id: 'balls', name: 'ボール・外遊びのおもちゃ・傘', lv: '1', r: [190, 95, 250, 135], h: [0, 0.9], f: 'S', kind: 'item', col: 0x4f7fb0, note: 'かごに入れて置く' },
  // ---- 1階 収納(2)：ホール南から入る奥行 1.28m の小部屋。扉を付ける ----
  { id: 'store2', name: '収納(2)', lv: '1', r: [6, 552, 130, 631], h: [0, 2.3], f: 'E', kind: 'shelf', col: 0x6b8f5e, sd: 0.45,
    b: [0, 1.15, 1.5, 1.85],
    it: [[0, '掃除機（立てて充電）', 1, 'vac', 0.22, 1.1, 0.22, 0x8a8f94], [0, 'トイレットペーパー・ティッシュ', 1, 'tp', 0.3, 0.45, 0.4, 0xeeeeea], [0, 'ストックの箱', 1, 'cb', 0.24, 0.35, 0.38, CB],
      [1, '救急箱', 1, 'aid', 0.3, 0.18, 0.22, 0xd9d9d6], [1, '充電器・電池・電球の箱', 1, 'cont', 0.3, 0.15, 0.3, 0x5a6e7f],
      [2, '日用品ストック（洗剤など）', 3, 'bottle', 0.24, 0.25, 0.3, [0x7fb0d0, 0xe6e6e0, 0x9fc47e]], [3, '紙袋・使わない物', 2, 'pbag', 0.36, 0.25, 0.35, CB]],
    door: { type: 'leaf', x: 136.5, y0: 555.5, y1: 627.5, h0: 0, h1: 2.0, sync: 'door' },
    note: '入口はホール南の側（幅約73cm）。奥（西）に棚、手前は掃除機などを置く' },
  // ---- 1階 収納(1)：回り階段の下。和室から開ける押入れ（家のモデルの扉を回す）----
  { id: 'store1', name: '収納(1)（階段下）', lv: '1', r: [233, 552, 314, 631], h: [0.24, 1.46], f: 'E', kind: 'shelf', col: 0x6b8f5e,
    b: [0],
    it: [[0, '来客用マットレス 2枚（三つ折りを立てて）', 2, 'mattress', 0.24, 0.97, 0.65, 0xe9e3d5], [0, '掛け布団・まくら（圧縮袋）', 1, 'futon', 0.26, 0.5, 0.6, 0x9db0c4]],
    door: { type: 'glb', mat: 'washdoor', knob: 'washknob' },
    note: '【計算】中は約81×79cm・高さ1.40m。三つ折りマットレス（約97×65cm）は寝かせると入らないので、立てて入れる（高さ97cm＜1.40m）' },
  // ---- 書斎 ----
  { id: 'desk', name: '机（新しく買う）', lv: '1', r: [10, 760, 130, 815], h: [0, 0.72], f: 'N', kind: 'item', col: 0x8a6aa8 },
  { id: 'files', name: '書類の棚', lv: '1', r: [10, 643, 100, 678], h: [0, 1.8], f: 'S', kind: 'shelf', col: 0x8a6aa8,
    b: [0, 0.38, 0.76, 1.14, 1.52],
    it: [[0, '書類ファイル（家・車・保険）', 6, 'file', 0.1, 0.32, 0.28, [0x3a5a8c, 0x3a5a8c, 0x8c3a3a, 0x3a7a5a, 0xd0c8b0, 0x555]], [1, '書類ファイル（仕事）', 6, 'file', 0.1, 0.32, 0.28, [0x444, 0x666, 0x888]],
      [2, '取扱説明書・保証書', 5, 'file', 0.1, 0.3, 0.26, [0xd8d4c8, 0xb8c8d8]], [3, '本', 3, 'book', 0.22, 0.24, 0.18, [0x9a6a4a, 0x4a6a8a, 0xc8b070]], [4, '思い出の物（小さな箱）', 2, 'cb', 0.3, 0.2, 0.25, CB]] },
  { id: 'bench', name: 'トレーニングベンチ（立てて）・ダンベル', lv: '1', r: [185, 685, 220, 815], h: [0, 1.25], f: 'W', kind: 'item', col: 0x8a6aa8, note: '入口（北の壁の東より）にかからないよう、南に寄せた' },
  // ---- キッチン ----
  { id: 'cuptop', name: 'カップボード（上の家電・下の引き出し）', lv: '1', r: [603, 8, 856, 60], h: [0.88, 1.3], f: 'S', kind: 'shelf', col: 0xc07a3a,
    b: [0],
    it: [[0, '電気ケトル', 1, 'kettle', 0.17, 0.23, 0.17, 0x2f3032, 0.25], [0, 'トースター', 1, 'toaster', 0.36, 0.22, 0.27, 0xe6e3dc, 0.6], [0, '炊飯器', 1, 'rice', 0.27, 0.24, 0.3, 0xefefed, 1.25], [0, '電子レンジ', 1, 'micro', 0.5, 0.3, 0.4, 0x2b2c2e, 1.85]] },
  { id: 'cupboard', name: 'カップボード（引き出し）', lv: '1', r: [603, 8, 856, 60], h: [0, 0.85], f: 'S', kind: 'drawers', col: 0xc07a3a, front: 'kitchen', fo: 0.002, nolabel: true,
    cols: 5, rows: [[0.60, 0.83], [0.36, 0.60], [0.10, 0.36]],
    dl: [['カトラリー', 0xc9c9c9], ['調理道具（おたまなど）', 0x6a6a6a], ['ラップ・ホイル・袋', 0xd8d8d0], ['子どもの食器', 0xf2a65a], ['お茶・コーヒー', 0x8a5a3a],
      ['茶わん・汁わん', 0xeae6dc], ['小皿・取り皿', 0xf2f0ea], ['大皿', 0xe8e6e0], ['コップ・マグ', 0x9fc7d8], ['保存容器', 0xdfe8ea],
      ['鍋・フライパン', 0x3a3b3d], ['ボウル・ザル', 0xb9bcbf], ['保存容器（大）', 0xdfe8ea], ['食品のストック', 0xd9b36a], ['ゴミ袋・洗剤のストック', 0x7fb0d0]],
    note: '吊戸棚をやめたので、今の吊戸棚の中身もここへ。引き出しの分け方は一例' },
  // キッチンの収納（11/27）：キッチン側（北）とダイニング側（南）の両方に引き出し。扉の色はキッチンの扉に合わせる
  // シンク（x 636〜724）の下は、槽と排水があるので収納にしない（六嶋さん 11/27）。IH の下と、シンクの西の細い所だけ
  { id: 'island_k', name: 'キッチンの収納（キッチン側・IH の下）', lv: '1', r: [730, 161, 860, 209], h: [0, 0.85], f: 'N', kind: 'drawers', col: 0xc07a3a, front: 'kitchen', fo: 0.002,
    cols: 2, rows: [[0.6, 0.83], [0.34, 0.6], [0.08, 0.34]],
    dl: [['菜箸・計量スプーン・包丁', 0x8a6a4a], ['布巾・キッチンペーパー', 0xf2f0ea], ['フライパン', 0x3a3b3d], ['ボウル・ザル', 0xb9bcbf], ['鍋（大）', 0x3a3b3d], ['米びつ', 0xe8e6e0]],
    note: 'シンクの下は槽と排水があるので収納なし。引き出しの分け方は一例' },
  { id: 'island_k2', name: 'キッチンの収納（キッチン側・細い引き出し）', lv: '1', r: [598, 161, 632, 209], h: [0, 0.85], f: 'N', kind: 'drawers', col: 0xc07a3a, front: 'kitchen', fo: 0.002,
    cols: 1, rows: [[0.6, 0.83], [0.34, 0.6], [0.08, 0.34]],
    dl: [['調味料（塩・砂糖など）', 0xe9e3d5], ['油・しょうゆ', 0xc8a050], ['ラップ・保存袋', 0xd8d8d0]],
    note: 'シンクの西の幅30cmほどの引き出し' },
  { id: 'island_d', name: 'キッチンの収納（ダイニング側）', lv: '1', r: [730, 209, 860, 259], h: [0, 0.85], f: 'S', kind: 'drawers', col: 0xd0a030, front: 'kitchen', fo: 0.002,
    cols: 2, rows: [[0.46, 0.83], [0.08, 0.46]],
    dl: [['書類（学校・園のお便り）', 0xf2f0ea], ['書類（家計・保険）', 0x3a5a8c], ['子どものおもちゃ（ブロック）', 0xf2cc8f], ['絵本・ぬりえ・クレヨン', 0x81b29a]],
    note: 'ダイニング側。シンクの裏は収納なし。引き出しの分け方は一例' },
  { id: 'island_d2', name: 'キッチンの収納（ダイニング側・細い引き出し）', lv: '1', r: [598, 209, 632, 259], h: [0, 0.85], f: 'S', kind: 'drawers', col: 0xd0a030, front: 'kitchen', fo: 0.002,
    cols: 1, rows: [[0.46, 0.83], [0.08, 0.46]],
    dl: [['文房具・はさみ・薬', 0x5fa8d3], ['ゲーム・トランプ・ぬいぐるみ', 0xd77fa1]],
    note: 'シンクの西の幅30cmほどの引き出し' },
  { id: 'pantry', name: 'パントリーの可動棚（D45・4段）', lv: '1', r: [868, 10, 951, 56], h: [0, 2.0], f: 'S', kind: 'shelf', col: 0xc07a3a,
    b: [0, 0.5, 0.95, 1.35, 1.75],
    it: [[0, 'ホットプレート・グリル鍋（箱）', 2, 'cb', 0.38, 0.22, 0.4, CB], [1, 'ホームベーカリー', 1, 'hb', 0.28, 0.38, 0.38, 0xf1efe9], [1, 'お米', 1, 'ricebag', 0.25, 0.38, 0.38, 0xdcdcdc],
      [2, '食品ストック（かご）', 3, 'bk_food', 0.25, 0.2, 0.35, 0xc8a878], [3, '食品ストック（かご）', 3, 'bk_food', 0.25, 0.2, 0.35, 0xc8a878], [4, '紙皿・季節の調理器具', 2, 'cont', 0.36, 0.18, 0.35, 0xd7d2c8]] },
  // ---- 和室（遊び場）----
  { id: 'toys', name: 'おもちゃ棚・絵本ラック', lv: '1', r: [325, 460, 365, 545], h: [0.24, 1.04], f: 'E', kind: 'shelf', col: 0xd0a030,
    b: [0, 0.3, 0.56],
    it: [[0, 'おもちゃ（かご）', 3, 'bk_toy', 0.26, 0.22, 0.3, KID], [1, '絵本', 3, 'book', 0.26, 0.23, 0.2, [0x5fa8d3, 0xf2cc8f, 0xe07a5f]], [2, 'ぬいぐるみ・小物', 3, 'plush', 0.24, 0.18, 0.25, KID.slice(2)]] },
  { id: 'kitchen_toy', name: 'おままごとキッチン', lv: '1', r: [325, 380, 365, 455], h: [0.24, 1.14], f: 'E', kind: 'item', col: 0xd0a030 },
  { id: 'slide', name: 'すべり台・ブランコ（折りたたみ）', lv: '1', r: [440, 450, 580, 620], h: [0.24, 1.44], f: 'N', kind: 'item', col: 0xd0a030 },
  { id: 'mat', name: '折りたたみマット', lv: '1', r: [375, 368, 435, 398], h: [0.24, 0.44], f: 'S', kind: 'item', col: 0xd0a030, note: '収納(1)の扉が開く範囲（扉から60cm）をあけた' },
  // ---- 2階 WIC ----
  { id: 'wicdr', name: 'WIC の引き出しケース', lv: '2', r: [10, 770, 262, 815], h: [0, 0.72], f: 'N', kind: 'drawers', col: 0xb05a6a, carcass: 'case', front: 'case',
    cols: 4, rows: [[0.36, 0.72], [0, 0.36]],
    dl: [['肌着・靴下（大人）', 0xe9e6e0], ['Tシャツ（大人）', 0x5a7a9a], ['ズボン（大人）', 0x3a4a5a], ['パジャマ（大人）', 0x9a8aa8],
      ['子どもの肌着', 0xf2e2c8], ['子どもの服', 0xe07a5f], ['子どものズボン', 0x5fa8d3], ['タオルケット・季節の小物', 0xc8d8c0]],
    note: '上に掛ける服（家族全員で約2.5m）。洋室にクローゼットが無いので、掛ける服はぎりぎり。引き出しの分け方は一例' },
  { id: 'wicshelf', name: 'WIC の棚（バッグ・帽子）', lv: '2', r: [135, 643, 265, 683], h: [0, 1.8], f: 'S', kind: 'shelf', col: 0xb05a6a,
    b: [0, 0.45, 0.9, 1.35],
    it: [[0, '旅行かばん', 2, 'suit', 0.45, 0.4, 0.3, [0x2b2b2d, 0x6a7a8a]], [1, 'バッグ', 4, 'bag', 0.28, 0.3, 0.15, [0x8a5a3a, 0x2b2b2d, 0xc8b8a0, 0x4a5a6a]],
      [2, '帽子・ベルト・小物（かご）', 3, 'bk_misc', 0.3, 0.2, 0.3, 0xc8a878], [3, 'シーズン外の小物（箱）', 3, 'cb', 0.35, 0.25, 0.3, CB]],
    note: '入口（北の壁の西より）にかからないよう、東に寄せた' },
  // ---- 2階 ランドリー・子ども部屋 ----
  { id: 'laundry', name: 'ランドリーの棚', lv: '2', r: [5, 445, 40, 541], h: [0, 1.8], f: 'E', kind: 'shelf', col: 0x3f9a9a,
    b: [0, 0.4, 0.8, 1.2, 1.55],
    it: [[0, '洗剤・柔軟剤のストック', 4, 'bottle', 0.2, 0.3, 0.12, [0x7fb0d0, 0xe6e6e0, 0xd0a0c0, 0x9fc47e]], [1, 'バスタオル', 3, 'towel', 0.32, 0.3, 0.3, [0xf2f0ea, 0xd8e4ea, 0xe8dcc8]],
      [2, 'フェイスタオル', 4, 'towel', 0.24, 0.22, 0.3, [0xf2f0ea, 0xd8e4ea]], [3, '洗濯ネット・ハンガー（かご）', 2, 'bk_misc', 0.35, 0.2, 0.3, 0xc8a878], [4, '掃除用品のストック', 2, 'cb', 0.35, 0.2, 0.3, CB]] },
  { id: 'kidchest', name: '子どもの服（チェスト）', lv: '2', r: [510, 225, 590, 268], h: [0, 0.85], f: 'N', kind: 'drawers', col: 0x3f9a9a, carcass: 'chest', front: 'chest',
    cols: 2, rows: [[0.64, 0.84], [0.43, 0.64], [0.22, 0.43], [0.02, 0.22]],
    dl: [['肌着', 0xf2e2c8], ['靴下・小物', 0xe07a5f], ['Tシャツ', 0x5fa8d3], ['長そで', 0xf2cc8f], ['ズボン', 0x3a4a5a], ['スカート・半ズボン', 0xd77fa1], ['パジャマ', 0x9a8aa8], ['園・学校の物', 0x81b29a]],
    note: '洋室2の入口（西より）にかからないよう、東に寄せた' },
  { id: 'kidrack', name: '子どものハンガーラック（上着・園の服）', lv: '2', r: [600, 225, 660, 268], h: [0, 1.3], f: 'N', kind: 'item', col: 0x3f9a9a },
  // ---- ロフト ----
  { id: 'dolls', name: 'ひな人形・五月人形', lv: 'L', r: [700, 380, 800, 440], h: [0, 0.6], f: 'S', kind: 'boxes', col: 0x7a6f60,
    bx: [['ひな人形', 0.45, 0.42, 0.45, CB, [['b', 0.12, 0.2, 0.1, 0xc0392b], ['b', 0.12, 0.2, 0.1, 0x2c3e70], ['b', 0.1, 0.1, 0.1, 0xe8d8b0]]],
      ['五月人形', 0.42, 0.48, 0.45, CB, [['b', 0.14, 0.26, 0.12, 0x2b2b2d], ['c', 0.08, 0.2, 0.08, 0xc9a227]]]] },
  { id: 'tree', name: 'クリスマスツリー（140cm）', lv: 'L', r: [820, 380, 940, 420], h: [0, 0.35], f: 'S', kind: 'boxes', col: 0x7a6f60,
    bx: [['ツリー（たたんで）', 0.8, 0.3, 0.3, CB, [['cl', 0.7, 0.2, 0.2, 0x2f6b3a]]], ['オーナメント', 0.34, 0.28, 0.3, CB, [['c', 0.08, 0.08, 0.08, 0xc0392b], ['c', 0.08, 0.08, 0.08, 0xd4ac0d], ['c', 0.08, 0.08, 0.08, 0x2c7a9e]]]] },
  { id: 'photos', name: '写真の段ボール・手芸用品', lv: 'L', r: [700, 560, 800, 625], h: [0, 0.6], f: 'N', kind: 'boxes', col: 0x7a6f60,
    bx: [['写真・アルバム', 0.45, 0.35, 0.4, CB, [['b', 0.32, 0.25, 0.06, 0x6a4a3a], ['b', 0.32, 0.25, 0.06, 0x3a4a6a], ['b', 0.32, 0.25, 0.06, 0x8a7a5a]]],
      ['手芸用品', 0.4, 0.3, 0.35, 0xdfe8ea, [['b', 0.1, 0.08, 0.1, 0xd77fa1], ['b', 0.1, 0.08, 0.1, 0x5fa8d3], ['c', 0.06, 0.08, 0.06, 0xf2cc8f]]]] },
  { id: 'cases', name: '季節外の服（衣装ケース）', lv: 'L', r: [820, 560, 940, 625], h: [0, 0.6], f: 'N', kind: 'drawers', col: 0x7a6f60, carcass: 'case', front: 'case',
    cols: 3, rows: [[0.3, 0.6], [0, 0.3]],
    dl: [['冬服（大人）', 0x5a4a3a], ['冬服（大人）', 0x3a4a5a], ['冬服（子ども）', 0xe07a5f], ['夏服（大人）', 0xe9e6e0], ['夏服（子ども）', 0x5fa8d3], ['お下がり・次のサイズ', 0xf2cc8f]] },
  { id: 'lofttoys', name: '子どものおもちゃ（箱2つ）', lv: 'L', r: [705, 465, 835, 525], h: [0, 0.42], f: 'S', kind: 'boxes', col: 0xd0a030,
    bx: [['おもちゃ（ブロック・車）', 0.6, 0.36, 0.4, 0x9fc7d8, [['b', 0.12, 0.08, 0.1, 0xe07a5f], ['b', 0.1, 0.1, 0.1, 0xf2cc8f], ['c', 0.1, 0.12, 0.1, 0x5fa8d3], ['b', 0.14, 0.07, 0.09, 0x81b29a]]],
      ['おもちゃ（ぬいぐるみ・人形）', 0.6, 0.36, 0.4, 0xf4b6b9, [['plush', 0.16, 0.2, 0.14, 0xd77fa1], ['plush', 0.14, 0.18, 0.12, 0xf2cc8f], ['plush', 0.14, 0.18, 0.12, 0x9fc7d8]]]],
    note: '季節で入れ替えるおもちゃ。ロフトの入口に近い所' },
  { id: 'camp', name: '軽いキャンプ道具（イス・マット）', lv: 'L', r: [850, 440, 945, 545], h: [0, 0.3], f: 'W', kind: 'shelf', col: 0x7a6f60,
    b: [0], it: [[0, 'キャンプ用のイス（収納袋）4脚', 4, 'bagz', 0.17, 0.17, 0.8, 0x3d5a40], [0, 'インフレータブルマット', 2, 'bagz', 0.14, 0.14, 0.6, 0x2c5d9e]] },
  // ---- 外（物置は仮の位置：東の隣地との間）----
  { id: 'shed', name: '物置（外・仮の位置）', lv: 'G', r: [1005, 100, 1080, 280], h: [0, 1.6], f: 'W', kind: 'shed', col: 0x5a5a5a,
    b: [0, [0.8, 0, 0.65], [1.2, 0, 0.65]],
    it: [[0, 'テント（収納袋）', 1, 'tent', 0.55, 0.26, 0.26, 0x3f5a3a], [0, 'クーラーボックス', 1, 'cooler', 0.45, 0.4, 0.33, 0x2f6db0], [0, '折りたたみテーブル', 1, 'ftable', 0.08, 0.6, 0.55, 0x9a9a96],
      [0, 'ゴルフバッグ', 1, 'golf', 0.3, 1.2, 0.3, 0x2b2b2d, 1.22], [0, 'スノーボード', 1, 'snow', 0.05, 1.45, 0.28, 0xc0392b, 1.58],
      [1, 'キャンプ用品の大きな箱 2つ', 2, 'cont', 0.52, 0.35, 0.45, CB], [2, 'ランタン・小物（箱）', 2, 'cont', 0.4, 0.25, 0.35, 0x5a6e7f]],
    note: '幅1.8m×奥行0.75m×高さ1.6m の物置を想定。引き戸は片側ずつ開く。場所は外構と合わせて決める' },
  { id: 'bikes', name: '自転車 4台（北側・斜めに止める）', lv: 'G', r: [290, -133, 790, -5], h: [0, 1.0], f: 'S', kind: 'item', col: 0x5a5a5a,
    note: '家の北の壁と北の境界の間（約1.3m）に、30°ななめに4台。子ども乗せ電動・シティサイクル・子どもの自転車・クロスバイクを仮に置いた。北の窓・給湯器・エアコンの室外機の位置と合わせて決める' },
];

// 影（AO）の計算のときは名札（Sprite）と半透明の箱を外す。入れたままだと名札が真っ黒に写る（パソコンで AO が入っているとき）
{
  const P = GTAOPass.prototype, ov = P.overrideVisibility;
  P.overrideVisibility = function () { ov.call(this); this.scene.traverse((o) => { if (o.isSprite || o.userData.noAO) o.visible = false; }); };
}
// ---- 材料 ----
const SM = {
  board: new THREE.MeshStandardMaterial({ color: 0xe8e4dc, roughness: 0.8 }),   // 棚板（白）
  shed: new THREE.MeshStandardMaterial({ color: 0x7d8286, roughness: 0.55, metalness: 0.35 }),
  shedDoor: new THREE.MeshStandardMaterial({ color: 0x9aa0a5, roughness: 0.5, metalness: 0.4 }),
  shedIn: new THREE.MeshStandardMaterial({ color: 0x4a4d50, roughness: 0.8 }),
  case: new THREE.MeshStandardMaterial({ color: 0xf4f4f2, roughness: 0.3, transparent: true, opacity: 0.72 }),   // 衣装ケース（半透明の白）
  chest: new THREE.MeshStandardMaterial({ color: 0xd9cbb4, roughness: 0.6 }),
  knob: new THREE.MeshStandardMaterial({ color: 0x2a2b2c, roughness: 0.5, metalness: 0.4 }),
  tray: new THREE.MeshStandardMaterial({ color: 0xdedad2, roughness: 0.8 }),
};
const MC = {};
const mat = (col) => MC[col] || (MC[col] = new THREE.MeshStandardMaterial({ color: col, roughness: 0.8 }));
const ROT = { S: 0, N: Math.PI, E: Math.PI / 2, W: -Math.PI / 2 };   // 正面（ローカル +z）を東西南北に向ける

// 中身の形は props_u.js の shape()（靴・本・かご・家電など）
function labelSprite(text, col, h = 0.11, front = false) {
  const c = document.createElement('canvas'), g = c.getContext('2d'), fs = 36;
  g.font = `bold ${fs}px "Hiragino Sans","Yu Gothic",sans-serif`;
  const w = Math.min(1400, Math.ceil(g.measureText(text).width) + 40); c.width = w; c.height = fs + 28;
  g.font = `bold ${fs}px "Hiragino Sans","Yu Gothic",sans-serif`;
  g.fillStyle = 'rgba(255,255,255,0.92)'; g.fillRect(0, 0, w, c.height);
  g.fillStyle = '#' + col.toString(16).padStart(6, '0'); g.fillRect(0, 0, 10, c.height);
  g.fillStyle = '#222'; g.textBaseline = 'middle'; g.fillText(text, 22, c.height / 2 + 1);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: !front, transparent: true }));
  if (front) s.renderOrder = 20;   // 中身の名札は、扉や壁に隠れないように手前に描く
  s.scale.set(h * w / c.height, h, 1); s.userData.noOcc = true; return s;
}
const hexs = (c) => '#' + c.toString(16).padStart(6, '0');

// ---- 組み立て ----
const storeGroup = new THREE.Group(); storeGroup.name = 'storage';
const byId = {};
let storeOn = true;
try { storeOn = localStorage.getItem('store_u') !== '0'; } catch (e) { /* 使えないときは出す */ }
const tag = (o, id) => { o.traverse((m) => { m.userData.storeId = id; m.userData.noOcc = true; }); return o; };

function buildShelf(u, g, W, D, H) {
  const sd = u.sd || D, zc = -D / 2 + sd / 2, cur = {};
  for (const b of u.b) {
    const [y, f0, f1] = Array.isArray(b) ? b : [b, 0, 1];
    if (y > 0) { const bw = W * (f1 - f0); const m = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.02, sd), SM.board); m.position.set(-W / 2 + W * f0 + bw / 2, y - 0.01, zc); m.receiveShadow = m.castShadow = true; g.add(m); }
  }
  const ys = u.b.map((b) => (Array.isArray(b) ? b[0] : b));
  for (const [s, label, n, t, w, h, d, col, at] of u.it) {
    const y = ys[s];
    if (at != null) cur[s] = -W / 2 + at;
    let x = cur[s] ?? (-W / 2 + 0.02); const x0 = x;
    for (let i = 0; i < n; i++) {
      const m = shape(t, w, h, d, Array.isArray(col) ? col[i % col.length] : col);
      m.position.x = x + w / 2; m.position.y += y; m.position.z = zc; g.add(m); x += w + 0.015;
    }
    cur[s] = x;
    addLabel(u, g, label, (x0 + x) / 2, y + Math.min(h, 0.4) * 0.55, Math.min(D / 2, zc + d / 2) + 0.04);
  }
}
function addLabel(u, g, text, x, y, z) {
  const s = labelSprite(text, u.col, 0.07, true); s.position.set(x, y, z); s.visible = false; g.add(s); u.labels.push(s);
}
function buildDrawers(u, g, W, D, H) {
  if (u.carcass) {   // 外箱（上・横・後ろ）
    const cm = SM[u.carcass], t = 0.012;
    for (const [w, h, d, x, y, z] of [[W, t, D, 0, H - t / 2, 0], [t, H, D, -W / 2 + t / 2, H / 2, 0], [t, H, D, W / 2 - t / 2, H / 2, 0], [W, H, t, 0, H / 2, -D / 2 + t / 2]]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), cm); m.position.set(x, y, z); g.add(m);
    }
  }
  const dw = W / u.cols; let k = 0;
  u.drawers = [];
  u.rows.forEach(([hb, ht], r) => {
    for (let c = 0; c < u.cols; c++, k++) {
      const [label, col] = u.dl[k] || ['', 0x999999];
      const dh = ht - hb, dr = new THREE.Group(); dr.position.set(-W / 2 + dw * (c + 0.5), hb, 0); dr.userData.dyn = true;
      const fm = u.front === 'case' ? SM.case : u.front === 'chest' ? SM.chest : SM.chest;
      const front = new THREE.Mesh(new THREE.BoxGeometry(dw - 0.006, dh - 0.006, 0.018), fm);
      front.position.set(0, dh / 2, D / 2 + 0.009 + (u.fo || 0)); front.castShadow = true; dr.add(front);
      if (u.front === 'kitchen') front.userData.sync = 'kitchen';
      const knob = new THREE.Mesh(new THREE.BoxGeometry(Math.min(0.12, dw * 0.3), 0.012, 0.012), SM.knob);
      knob.position.set(0, dh - 0.035, D / 2 + 0.024 + (u.fo || 0)); dr.add(knob);
      const td = D - 0.05, tz = D / 2 - td / 2, th = Math.max(0.06, dh * 0.6);
      const bot = new THREE.Mesh(new THREE.BoxGeometry(dw - 0.03, 0.01, td), SM.tray); bot.position.set(0, 0.015, tz); dr.add(bot);
      for (const sx of [-1, 1]) { const sdm = new THREE.Mesh(new THREE.BoxGeometry(0.01, th, td), SM.tray); sdm.position.set(sx * (dw / 2 - 0.02), th / 2 + 0.01, tz); dr.add(sdm); }
      const bk = new THREE.Mesh(new THREE.BoxGeometry(dw - 0.03, th, 0.01), SM.tray); bk.position.set(0, th / 2 + 0.01, tz - td / 2); dr.add(bk);
      // 中身：同じ色の物を3つ（たたんだ服・食器などのかたまり）
      const iw = (dw - 0.08) / 3, ih = Math.min(0.12, th * 0.8);
      for (let i = 0; i < 3; i++) {
        const cc = new THREE.Color(col).multiplyScalar(0.85 + 0.12 * i).getHex();
        const m = shape('b', iw - 0.01, ih, td * 0.75, cc); m.position.x = -dw / 2 + 0.04 + iw * (i + 0.5); m.position.y += 0.02; m.position.z = tz + 0.02; dr.add(m);
      }
      const s = labelSprite(label, u.col, 0.065, true); s.position.set(0, dh + 0.04, D / 2 + 0.1); s.visible = false; dr.add(s); u.labels.push(s);
      dr.userData.delay = (r * u.cols + c) * 0.04;
      g.add(dr); u.drawers.push(dr);
    }
  });
  const md = (u.drawers.length - 1) * 0.04;
  u.set = ([t]) => { for (const dr of u.drawers) { const k2 = Math.min(1, Math.max(0, (t - dr.userData.delay) / (1 - md))); dr.position.z = k2 * D * 0.62; } };
}
function buildBoxes(u, g, W, D, H) {
  let x = -W / 2 + 0.02; u.lids = [];
  for (const [label, w, h, d, col, inner] of u.bx) {
    const bm = mat(col), t = 0.008, bg = new THREE.Group(); bg.position.set(x + w / 2, 0, 0);
    for (const [bw, bh, bd, px, py, pz] of [[w, t, d, 0, t / 2, 0], [t, h, d, -w / 2 + t / 2, h / 2, 0], [t, h, d, w / 2 - t / 2, h / 2, 0], [w, h, t, 0, h / 2, -d / 2 + t / 2], [w, h, t, 0, h / 2, d / 2 - t / 2]]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), bm); m.position.set(px, py, pz); m.castShadow = m.receiveShadow = true; bg.add(m);
    }
    const lid = new THREE.Group(); lid.position.set(0, h, -d / 2); lid.userData.dyn = true;
    const lm = new THREE.Mesh(new THREE.BoxGeometry(w + 0.01, 0.012, d + 0.01), bm); lm.position.set(0, 0.006, d / 2); lm.castShadow = true; lid.add(lm); bg.add(lid); u.lids.push(lid);
    let ix = -w / 2 + 0.03;
    for (const [tt, iw, ih, id, ic] of inner) { const m = shape(tt, iw, Math.min(ih, h - 0.03), id, ic); m.position.x = ix + iw / 2; m.position.y += t; ix += iw + 0.02; bg.add(m); }
    const s = labelSprite(label, u.col, 0.07, true); s.position.set(0, h + 0.12, d / 2 + 0.05); s.visible = false; bg.add(s); u.labels.push(s);
    g.add(bg); x += w + 0.05;
  }
  u.set = ([t]) => { for (const l of u.lids) l.rotation.x = -1.9 * t; };
}
function buildShed(u, g, W, D, H) {
  const t = 0.03;
  for (const [w, h, d, x, y, z, m] of [[W, t, D, 0, t / 2, 0, SM.shedIn], [t, H, D, -W / 2 + t / 2, H / 2, 0, SM.shed], [t, H, D, W / 2 - t / 2, H / 2, 0, SM.shed], [W, H, t, 0, H / 2, -D / 2 + t / 2, SM.shed],
    [W + 0.08, 0.04, D + 0.1, 0, H + 0.02, -0.02, SM.shed], [W, 0.08, 0.04, 0, H - 0.04, D / 2 - 0.02, SM.shed], [W, 0.05, 0.05, 0, 0.025, D / 2 - 0.02, SM.shed]]) {
    const mm = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); mm.position.set(x, y, z); mm.castShadow = mm.receiveShadow = true; g.add(mm);
  }
  // 中の背板（暗め）
  const bk = new THREE.Mesh(new THREE.BoxGeometry(W - 0.06, H - 0.1, 0.005), SM.shedIn); bk.position.set(0, H / 2, -D / 2 + t + 0.003); g.add(bk);
  buildShelf(u, g, W - 0.06, D - 0.08, H);
  // 引き戸 2枚（A＝左・奥のレール、B＝右・手前のレール）
  const dw = W / 2 + 0.02, dh = H - 0.12;
  const mk = (z) => { const d = new THREE.Group(); d.userData.dyn = true; const p = new THREE.Mesh(new THREE.BoxGeometry(dw, dh, 0.02), SM.shedDoor); p.position.y = 0.05 + dh / 2; p.castShadow = true; d.add(p);
    for (let k = 1; k < 4; k++) { const r = new THREE.Mesh(new THREE.BoxGeometry(dw - 0.04, 0.012, 0.006), SM.shed); r.position.set(0, 0.05 + dh * k / 4, 0.012); d.add(r); }
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.14, 0.015), SM.knob); h.position.set(0, 0.85, 0.018); d.add(h); h.name = 'handle'; d.position.z = z; g.add(d); return d; };
  const A = mk(D / 2 + 0.012), B = mk(D / 2 + 0.036);
  A.children.find((o) => o.name === 'handle').position.x = dw / 2 - 0.06; B.children.find((o) => o.name === 'handle').position.x = -dw / 2 + 0.06;
  const ax = -W / 2 + dw / 2, bx = W / 2 - dw / 2, run = W - dw;
  u.set = ([a, b]) => { A.position.x = ax + run * a; B.position.x = bx - run * b; };
  u.n = 2;
}
function buildItem(u, g, W, D, H) {
  if (buildModel(u.id, g, W, D, H)) return;   // 机・ベビーカー・傘・自転車など（props_u.js）
  const m = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), new THREE.MeshBasicMaterial({ color: u.col, transparent: true, opacity: 0.28, depthWrite: false }));
  m.position.y = H / 2; m.userData.noAO = true; g.add(m);
  m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: u.col })));
}
// 開き戸：leaf＝ここで作る（材料は家のモデルの同じ名前の物に合わせる）
function buildLeaf(u, FL1) {
  const d = u.door, L = (d.y1 - d.y0) / 100, H = d.h1 - d.h0;
  const pv = new THREE.Group(); pv.position.set(PX(d.x + 2), FL1 + LV[u.lv] + d.h0, PZ(d.y1));
  const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.035, H, L), SM.chest); leaf.position.set(0, H / 2, -L / 2); leaf.castShadow = true; leaf.userData.sync = d.sync; pv.add(leaf);
  const kb = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.12), SM.knob); kb.position.set(0.03, 1.0 - d.h0, -L + 0.08); pv.add(kb);
  storeGroup.add(tag(pv, u.id)); u.pivot = pv;
}
// ---- 設備・ベッド（家のモデルでは 'fixture' の箱。ビューアでは隠して、ここで形のある物を出す）----
// [形, 階, x, y, 幅, 奥行, 高さ(cm), 向き(rad・プランシートと同じ), 追加]
const FIX = [
  // 2階（11/27 の図面の位置）
  ['washer', '2', 40, 407, 65, 65, 105, 4.712389],             // ランドリー
  ['slop', '2', 112, 394, 45, 48, 90, 0],                      // スロップシンク（11/27）
  ['basin2', '2', 34, 282, 160, 52, 90, 4.712389],             // 洗面所：カウンター幅160cm（11/27 六嶋さん）
  ['toilet', '2', 365, 227.5, 40, 80, 62, 1.5707964],          // トイレ(2)は浴室の南へ（11/27）
  ['bath', '2', 352.5, 97.5, 155, 85, 60, 1.5707964],          // 浴槽
  ['shower', '2', 246, 91, 182, 128, 200, 4.712389, { ox: 0.35 }],   // 洗い場。水栓・鏡は入口（y 101〜175）をよけて北寄り
  ['bed', '2', 832.5, 65, 100, 205, 45, 4.712389, { col: 0xb7c7dd }], ['bed', '2', 832.5, 170, 100, 205, 45, 4.712389, { col: 0xd8d2c4 }],
  ['bed', '2', 832.5, 275, 100, 205, 45, 4.712389, { col: 0x9fb5a0 }], ['bed', '2', 568.5, 65, 100, 205, 45, 4.712389, { col: 0xe8c9b8 }],
  ['bed', '2', 526, 527.5, 100, 205, 45, 0, { col: 0xc9c9d6 }],
  // 1階
  ['toilet', '1', 48, 500, 40, 80, 62, 4.712389, { tankless: true }],   // タンクなし（ツアー 11/27）
  ['basin2', '1', 54.5, 407.5, 65, 45, 85, 4.712389, { small: true }],   // 手洗い（南海プライウッド S タイプ・ニッチの中）
  ['closet', '2', 136.5, 793, 253, 60, 170, 0, { n: 30, max: 0.85 }],          // WIC 南のパイプの服（上着・シャツ）
  ['closet', '2', 31.5, 658, 204, 60, 170, 1.5707964, { n: 26, pole: true, max: 1.2 }],   // WIC 西の壁に新しいパイプ（コート・ワンピースなど長い物も）
];
function addFixtures(furn, FL1) {
  const fg = new THREE.Group(); fg.name = 'fixtures';
  for (const [t, lv, x, y, w, d, h, a, o] of FIX) {
    const g = new THREE.Group(); g.position.set(PX(x), FL1 + LV[lv], PZ(y)); g.rotation.y = -a;
    buildModel(t, g, w / 100, d / 100, h / 100, o); bake(g); fg.add(g);
  }
  furn.add(fg);
}
// ---- 間接照明（11/27）：テレビのふかし壁の上と、キッチンのダウンシーリングのリビング側。夜に明るく ----
function glowTex(dir) {   // 片側から光って、だんだん消える
  const c = document.createElement('canvas'); c.width = 4; c.height = 128; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, dir > 0 ? 128 : 0, 0, dir > 0 ? 0 : 128);
  gr.addColorStop(0, 'rgba(255,214,150,1)'); gr.addColorStop(0.25, 'rgba(255,205,140,0.45)'); gr.addColorStop(1, 'rgba(255,200,130,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 4, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const coves = [];
function addCoves(furn, FL1) {
  const cg = new THREE.Group(); cg.name = 'coves';
  const lineM = new THREE.MeshBasicMaterial({ color: 0xffe2b0 });
  const mk = (w, h, tex, px, py, pz, ry, rx) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    m.position.set(px, py, pz); m.rotation.set(rx || 0, ry || 0, 0); m.userData.noAO = true; m.raycast = () => {}; cg.add(m); coves.push(m); return m;
  };
  // テレビのふかし壁（x 936〜948・高さ 2.4m）の上：元の壁（x 948）を下から照らす
  const ty = (364 + 637) / 2, tl = (637 - 364) / 100;
  const line = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.012, tl - 0.02), lineM); line.position.set(PX(947), FL1 + 2.406, PZ(ty)); line.raycast = () => {}; cg.add(line);
  mk(tl, 1.3, glowTex(1), PX(947.8), FL1 + 2.4 + 0.65, PZ(ty), -Math.PI / 2);
  // ダウンシーリング（高さ 2.25m・南の縁 y=270）：リビング側の天井（2.4m）を照らす
  const kx = (318.5 + 865) / 2, kl = (865 - 318.5) / 100;
  const line2 = new THREE.Mesh(new THREE.BoxGeometry(kl, 0.012, 0.02), lineM); line2.position.set(PX(kx), FL1 + 2.39, PZ(271)); line2.raycast = () => {}; cg.add(line2);
  const pl = mk(kl, 0.7, glowTex(1), PX(kx), FL1 + 2.398, PZ(270 + 35), 0, Math.PI / 2);
  furn.add(cg);
  const upd = () => { const d = window._dbg, night = d && d.ext && d.ext.isNight && d.ext.isNight(); for (const m of coves) m.material.opacity = night ? 1 : 0.35; };
  upd(); setInterval(upd, 1500);
}
export function addStorage(furn, FL1) {
  addFixtures(furn, FL1); addCoves(furn, FL1);
  for (const u of UNITS) {
    byId[u.id] = u; u.labels = []; u.cur = [0, 0]; u.tgt = [0, 0]; u.n = 1;
    const [x0, y0, x1, y1] = u.r, [h0, h1] = u.h, ns = u.f === 'N' || u.f === 'S';
    const W = (ns ? x1 - x0 : y1 - y0) / 100, D = (ns ? y1 - y0 : x1 - x0) / 100, H = h1 - h0;
    const g = new THREE.Group(); g.position.set(PX((x0 + x1) / 2), FL1 + LV[u.lv] + h0, PZ((y0 + y1) / 2)); g.rotation.y = ROT[u.f];
    if (u.kind === 'shelf') buildShelf(u, g, W, D, H);
    else if (u.kind === 'drawers') buildDrawers(u, g, W, D, H);
    else if (u.kind === 'boxes') buildBoxes(u, g, W, D, H);
    else if (u.kind === 'shed') buildShed(u, g, W, D, H);
    else buildItem(u, g, W, D, H);
    bake(g);   // 動かない部品はまとめて描く（部品が多いので）
    if (u.door && u.door.type === 'leaf') buildLeaf(u, FL1);
    // 名前の札（いつも出す）
    if (!u.nolabel) { const s = labelSprite(u.name + (u.kind === 'item' ? '' : '　▶タップ'), u.col, 0.08); s.position.set(0, H + 0.1, 0); g.add(s); }
    storeGroup.add(tag(g, u.id)); u.group = g;
  }
  storeGroup.visible = storeOn; furn.add(storeGroup);
}

// ---- 家のモデル側の物とつなぐ（モデルを読み直したときにも）：収納(1)の扉を回せるようにし、材料の見た目を合わせる ----
function hookModel() {
  const d = window._dbg; if (!d) return;
  d.rig.traverse((o) => { if (o.isMesh && o.material && o.material.name === 'fixture') o.visible = false; });   // 設備・ベッドの箱は隠す（形のある物を出している）
  const byMat = {};
  d.rig.traverse((o) => { if (o.isMesh && o.material && o.material.name && !o.userData.storeId && !byMat[o.material.name]) byMat[o.material.name] = o.material; });
  // 収納(1)：家のモデルの扉（washdoor）と取っ手（washknob）を、蝶番（北の端・和室側の面）を軸に回す
  const u = byId.store1;
  if (u) {
    let door = null, knob = null;
    d.rig.traverse((o) => { if (o.isMesh && !o.userData.hooked) { const n = o.material && o.material.name; if (n === 'washdoor') door = o; if (n === 'washknob') knob = o; } });
    if (door && door.parent) {
      const bb = new THREE.Box3().setFromObject(door), par = door.parent;
      const pv = new THREE.Group(); par.add(pv); par.updateMatrixWorld(true);
      pv.position.copy(par.worldToLocal(new THREE.Vector3(bb.max.x, bb.min.y, bb.max.z)));
      pv.updateMatrixWorld(true); pv.attach(door); if (knob) pv.attach(knob);
      for (const o of [door, knob]) if (o) { o.userData.hooked = true; o.userData.storeId = 'store1'; }
      door.userData.sync = 'tread'; u.pivot = pv; applyUnit(u);
    }
  }
  // 見た目を合わせる（扉＝建具の色、カップボードの引き出し＝キッチンの扉の色、収納(1)の扉＝和室の扉の色）
  const all = [d.rig];
  for (const root of all) root.traverse((o) => { if (o.isMesh && o.userData.sync && byMat[o.userData.sync] && o.material !== byMat[o.userData.sync]) o.material = byMat[o.userData.sync]; });
}
setInterval(hookModel, 1500);

// ---- 開け閉め（なめらかに動かす）----
function applyUnit(u) {
  if (u.set) u.set(u.cur);
  if (u.pivot) u.pivot.rotation.y = -1.75 * u.cur[0];   // 開き戸：手前（東）へ約100°
  const open = u.tgt.some((v) => v > 0);
  for (const s of u.labels) s.visible = open;
}
let anim = false, lastT = 0;
function tick(now) {
  let more = false;
  const step = Math.min(0.25, Math.max(0.01, ((now || performance.now()) - (lastT || now || 0)) / 1000 * 1.8)); lastT = now || performance.now();   // 約0.6秒で開く（コマ落ちしても時間で進める）
  for (const u of UNITS) {
    for (let i = 0; i < 2; i++) {
      const dv = u.tgt[i] - u.cur[i];
      if (Math.abs(dv) > 0.002) { u.cur[i] += Math.sign(dv) * Math.min(Math.abs(dv), step); more = true; } else u.cur[i] = u.tgt[i];
    }
    applyUnit(u);
  }
  const d = window._dbg; d && d.ext && d.ext.invalidate && d.ext.invalidate();
  if (more) requestAnimationFrame(tick); else anim = false;
}
function setTarget(u, tg) { u.tgt = tg; for (const s of u.labels) s.visible = tg.some((v) => v > 0); if (!anim) { anim = true; lastT = performance.now(); requestAnimationFrame(tick); } }
const isOpen = (u) => u.tgt.some((v) => v > 0);

// ---- 中身の一覧（下に出る板）----
const pop = document.createElement('div');
pop.style.cssText = 'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:51;background:rgba(28,30,33,.94);color:#fff;border-radius:14px;padding:12px 14px 10px;width:min(520px,92vw);max-height:50vh;overflow-y:auto;box-shadow:0 6px 20px rgba(0,0,0,.4);display:none;font-size:15px;line-height:1.5';
document.body.append(pop);
function closePop() { pop.style.display = 'none'; }
function contentsOf(u) {
  if (u.it) return u.it.map((x) => [x[1], Array.isArray(x[7]) ? x[7][0] : x[7]]);
  if (u.dl) return u.dl;
  if (u.bx) return u.bx.map((x) => [x[0], x[4]]);
  return [[u.name, u.col]];
}
function showPop(u) {
  pop.innerHTML = '';
  const h = document.createElement('div'); h.style.cssText = 'font-weight:700;margin-bottom:6px;display:flex;justify-content:space-between;gap:12px;align-items:center';
  h.textContent = u.name;
  const x = document.createElement('button'); x.textContent = '×'; x.style.cssText = 'background:none;border:0;color:#fff;font-size:22px;padding:0 4px'; x.onclick = closePop; h.append(x); pop.append(h);
  const seen = new Set(), ul = document.createElement('div');
  for (const [label, col] of contentsOf(u)) {
    if (seen.has(label)) continue; seen.add(label);
    const r = document.createElement('div'); r.innerHTML = `<span style="display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:8px;vertical-align:-1px;background:${hexs(col)}"></span>`;
    r.append(label); ul.append(r);
  }
  pop.append(ul);
  if (u.note) { const n = document.createElement('div'); n.textContent = u.note; n.style.cssText = 'font-size:13px;color:#bbb;margin-top:6px'; pop.append(n); }
  const row = document.createElement('div'); row.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-top:8px';
  const btn = (label, on, f) => { const b = document.createElement('button'); b.textContent = label; b.style.cssText = `padding:8px 12px;border-radius:10px;border:1px solid ${on ? '#e8792f' : '#555'};background:${on ? '#3a2a1f' : '#2c2f33'};color:${on ? '#ffb27a' : '#fff'};font-size:15px`; b.onclick = f; row.append(b); };
  if (u.kind === 'shed') {
    btn('左の戸を開ける', u.tgt[0] > 0, () => { setTarget(u, [1, 0]); showPop(u); });
    btn('右の戸を開ける', u.tgt[1] > 0, () => { setTarget(u, [0, 1]); showPop(u); });
    btn('閉める', !isOpen(u), () => { setTarget(u, [0, 0]); showPop(u); });
  } else if (u.kind !== 'item') {
    const moving = u.set || u.pivot;
    btn(moving ? (isOpen(u) ? '閉める' : '開ける') : (isOpen(u) ? '名札を消す' : '名札を出す'), false, () => { setTarget(u, isOpen(u) ? [0, 0] : [1, 0]); showPop(u); });
  }
  if (row.childElementCount) pop.append(row);
  pop.style.display = 'block';
}
// タップされたとき（design_u.js から呼ぶ）：閉まっていれば開けて一覧を出す。開いていれば閉める
function tap(id) {
  const u = byId[id]; if (!u) return;
  if (u.kind === 'item') { showPop(u); return; }
  if (u.kind === 'shed') { const nx = u.tgt[0] > 0 ? [0, 1] : u.tgt[1] > 0 ? [0, 0] : [1, 0]; setTarget(u, nx); }   // 左 → 右 → 閉める
  else setTarget(u, isOpen(u) ? [0, 0] : [1, 0]);
  if (isOpen(u) || u.kind === 'shed') showPop(u); else closePop();
}
function setAll(on) {
  for (const u of UNITS) if (u.kind !== 'item') setTarget(u, on ? [1, 0] : [0, 0]);
  document.querySelectorAll('.storeallbtn').forEach((b) => { b.textContent = on ? '収納をぜんぶ閉める' : '収納をぜんぶ開ける'; b.classList.toggle('on', on); });
  closePop();
}
function setStore(on) {
  storeOn = on; storeGroup.visible = on;
  try { localStorage.setItem('store_u', on ? '1' : '0'); } catch (e) { /* 保存できなくても切り替えはできる */ }
  document.querySelectorAll('.storebtn').forEach((b) => { b.textContent = on ? '収納の中身を消す' : '収納の中身を出す'; b.classList.toggle('on', on); });
  const d = window._dbg; d && d.ext && d.ext.invalidate && d.ext.invalidate();
}
{
  let allOn = false;
  const mk = () => { const b = document.createElement('button'); b.className = 'storebtn'; b.onclick = () => setStore(!storeOn); return b; };
  const mkAll = () => { const b = document.createElement('button'); b.className = 'storeallbtn'; b.textContent = '収納をぜんぶ開ける'; b.onclick = () => { allOn = !allOn; setAll(allOn); }; return b; };
  document.querySelectorAll('.tvonbtn').forEach((b) => b.after(mk(), mkAll()));
  setStore(storeOn);
}
window._store = { setStore, setAll, tap, closePop, UNITS, byId };
