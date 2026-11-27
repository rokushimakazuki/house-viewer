// 照明計画（11/28）。11/27 プランシートの部屋ごとに、照明器具の案（たたき台）を置き、夜に点ける。
// 位置は平面図の cm（原点＝建物の北西の角、x＝東、y＝南）。天井の高さは 3D の家から測る（吹抜け・折り上げ・2階）。
// 器具の明るさ（lm）は一般的な製品の目安で、まだ何も決まっていない【推測】。照明計画を話すための材料。
// 重さ対策：本物の光（PointLight）は 12 個だけ。見ている所に近い部屋から順に割り当てる。ほかの部屋は器具の光と床の光の広がりだけ
import * as THREE from 'three';

const PX = (x) => (x - 477.75) / 100, PZ = (y) => (y - 409.5) / 100;
const FL1 = 0.59, FL2 = 3.0;
const POOL = 12;

// ---- 器具の種類（明るさは一般的な目安）----
const TYPES = {
  dl:   { name: 'ダウンライト', lm: 600, r: 0.055 },
  dlh:  { name: 'ダウンライト（高天井用）', lm: 900, r: 0.07 },
  ceil: { name: 'シーリングライト', lm: 3300, r: 0.26 },
  pend: { name: 'ペンダント', lm: 450, r: 0.14 },
  cove: { name: '間接照明（ライン）', lm: 1000 },
  bra:  { name: 'ブラケット（壁付け）', lm: 400 },
  foot: { name: '足元灯', lm: 40 },
  pole: { name: '外の足元灯（ポール）', lm: 150 },
  ub:   { name: '浴室灯（ユニットバスに付く）', lm: 700 },
};
// ---- 部屋（面積を出すための長方形、cm）。area は暮らしの動きの「場所」と同じ名前。jo は居室の畳数（目安を出す）----
const ROOMS = [
  { id: 'porch', name: 'ポーチ', fl: 1, r: [[0, 0, 150, 125]], area: '外' },
  { id: 'genkan', name: '玄関', fl: 1, r: [[0, 125, 182, 250]], area: '玄関' },
  { id: 'shoecl', name: 'シューズクローク', fl: 1, r: [[182, 0, 318.5, 225]], area: 'シューズクローク' },
  { id: 'hall', name: 'ホール・手洗い', fl: 1, r: [[0, 250, 227.5, 380], [0, 380, 90, 445], [120, 380, 227.5, 640]], area: 'ホール' },
  { id: 'toil1', name: '1階トイレ', fl: 1, r: [[0, 450, 120, 545]], area: '1階トイレ' },
  { id: 'shosai', name: '書斎', fl: 1, r: [[0, 640, 227.5, 819]], area: '書斎', jo: 2.5 },
  { id: 'stair', name: '階段', fl: 1, r: [[227.5, 364, 318.5, 549]], area: '階段' },
  { id: 'washitsu', name: '和室', fl: 1, r: [[318.5, 364, 591.5, 637]], area: '和室', jo: 4.5 },
  { id: 'kitchen', name: 'キッチン', fl: 1, r: [[591.5, 0, 955.5, 260]], area: 'LDK', grp: 'LDK' },
  { id: 'dining', name: 'ダイニング', fl: 1, r: [[318.5, 0, 591.5, 260]], area: 'LDK', grp: 'LDK' },
  { id: 'ldkmid', name: 'LDK の中ほど・入口', fl: 1, r: [[227.5, 250, 955.5, 364]], area: 'LDK', grp: 'LDK' },
  { id: 'living', name: 'リビング（吹抜け）', fl: 1, r: [[591.5, 364, 955.5, 637]], area: 'LDK', grp: 'LDK' },
  { id: 'senmen', name: '洗面所', fl: 2, r: [[0, 181, 135, 362]], area: '洗面所' },
  { id: 'datsui', name: '脱衣所', fl: 2, r: [[86, 0, 185, 181]], area: '脱衣所' },
  { id: 'bath', name: '浴室', fl: 2, r: [[185, 0, 415, 194]], area: '浴室' },
  { id: 'toil2', name: '2階トイレ', fl: 2, r: [[230, 202, 415, 285]], area: '2階トイレ' },
  { id: 'corr', name: '2階の廊下', fl: 2, r: [[135, 285, 682.5, 364]], area: '2階の廊下' },
  { id: 'yo2', name: '洋室2', fl: 2, r: [[409.5, 0, 682.5, 273]], area: '洋室2', jo: 4.5 },
  { id: 'yo3', name: '洋室3（寝室）', fl: 2, r: [[682.5, 0, 955.5, 364]], area: '洋室3', jo: 6 },
  { id: 'yo1', name: '洋室1', fl: 2, r: [[318.5, 364, 591.5, 637]], area: '洋室1', jo: 4.5 },
  { id: 'laundry', name: 'ランドリー', fl: 2, r: [[0, 375, 135, 630]], area: 'ランドリー' },
  { id: 'wic', name: 'WIC', fl: 2, r: [[0, 637, 273, 819]], area: 'WIC' },
  { id: 'out', name: '外（アプローチ・自転車置き場）', fl: 0, r: [], area: '外' },
];
const LDK_JO = 20.59;   // プランシートの LDK の畳数
// ---- 器具の案（たたき台）：[部屋, 種類, x, y, その他] ----
// h＝床からの高さ（ペンダント・壁付け・足元灯・間接照明）、x2/y2＝ライン照明の終わり、sensor＝人感センサー向き、note＝メモ
const FIX = [
  ['porch', 'dl', 80, 60, { lm: 400, sensor: 1, note: '軒天に。人感センサー付き' }],
  ['genkan', 'dl', 90, 160, { sensor: 1 }], ['genkan', 'dl', 90, 222, {}],
  ['shoecl', 'dl', 250, 110, { sensor: 1 }],
  ['hall', 'dl', 110, 300, {}], ['hall', 'dl', 175, 430, {}], ['hall', 'dl', 180, 570, {}], ['hall', 'dl', 45, 412, { lm: 500, note: '手洗いの上' }],
  ['toil1', 'dl', 62, 498, { sensor: 1 }],
  ['shosai', 'dl', 70, 730, {}], ['shosai', 'dl', 165, 730, {}],
  ['stair', 'bra', 315, 470, { h: 2.0, note: '階段の東の壁' }], ['stair', 'foot', 232, 420, { h: 0.3 }], ['stair', 'foot', 232, 520, { h: 0.3 }],
  ['stair', 'dl', 225, 505, { fl: 2, lm: 700, note: '2階の天井（吹抜けの上）' }],
  ['washitsu', 'cove', 375, 425, { x2: 535, y2: 585, rect: 1, h: 'ceil', lm: 1400, note: '折り上げ天井のまわり' }], ['washitsu', 'dl', 455, 505, { lm: 800, note: '折り上げの中央' }],
  ['kitchen', 'dl', 640, 110, {}], ['kitchen', 'dl', 760, 110, {}], ['kitchen', 'dl', 880, 110, {}],
  ['kitchen', 'dl', 690, 205, { note: 'アイランドの手元' }], ['kitchen', 'dl', 820, 205, { note: 'アイランドの手元' }],
  ['dining', 'pend', 450, 208, { h: 1.7 }], ['dining', 'pend', 510, 208, { h: 1.7 }], ['dining', 'pend', 570, 208, { h: 1.7 }],
  ['dining', 'dl', 360, 90, {}],
  ['ldkmid', 'dl', 275, 310, {}], ['ldkmid', 'dl', 420, 312, {}], ['ldkmid', 'dl', 700, 312, {}], ['ldkmid', 'dl', 860, 312, {}],
  ['ldkmid', 'cove', 595, 362, { x2: 952, y2: 362, h: 'ceil', lm: 1200, note: '図面の「ダウンシーリング150 リビング側 間接照明」【推測】吹抜け側の天井を照らす' }],
  ['living', 'dlh', 660, 440, {}], ['living', 'dlh', 660, 570, {}], ['living', 'dlh', 880, 440, {}], ['living', 'dlh', 880, 570, {}],
  ['living', 'cove', 950, 400, { x2: 950, y2: 600, h: 2.35, lm: 800, note: '図面の「ふかし壁 ゲームニッチ 上部 間接照明検討」' }],
  ['senmen', 'dl', 70, 235, { lm: 500 }], ['senmen', 'dl', 70, 335, { lm: 500 }], ['senmen', 'bra', 6, 315, { h: 1.9, note: '洗面台の鏡の上（洗面台に付くことが多い）' }],
  ['datsui', 'dl', 135, 90, {}],
  ['bath', 'ub', 300, 12, { h: 2.0 }],
  ['toil2', 'dl', 325, 243, { sensor: 1 }],
  ['corr', 'dl', 230, 325, {}], ['corr', 'dl', 420, 325, {}], ['corr', 'dl', 600, 325, {}],
  ['corr', 'foot', 640, 288, { h: 0.3, note: '寝室〜トイレの夜の足元' }], ['corr', 'foot', 380, 288, { h: 0.3 }],
  ['yo2', 'ceil', 546, 137, {}], ['yo1', 'ceil', 455, 500, {}],
  ['yo3', 'ceil', 819, 182, { lm: 3800, note: '調光できるもの' }], ['yo3', 'foot', 690, 340, { h: 0.3, note: '入口の足元' }],
  ['laundry', 'dl', 65, 440, {}], ['laundry', 'dl', 65, 570, {}],
  ['wic', 'dl', 90, 700, { lm: 500, sensor: 1 }], ['wic', 'dl', 200, 760, { lm: 500 }],
  ['out', 'pole', 55, -45, { h: 0.6 }], ['out', 'pole', 120, -95, { h: 0.6 }],
  ['out', 'bra', 470, -3, { h: 1.9, sensor: 1, note: '自転車置き場の壁' }],
];
const COLORS = { 2700: { name: '電球色（2700K）', c: 0xffc98f }, 3500: { name: '温白色（3500K）', c: 0xffe2bf }, 5000: { name: '昼白色（5000K）', c: 0xfff6ec } };

let S = null;
function floorY(fl) { return fl === 2 ? FL1 + FL2 : fl === 1 ? FL1 : 0; }
function roomOf(id) { return ROOMS.find((r) => r.id === id); }
function areaM2(r) { return r.r.reduce((s, [a, b, c, d]) => s + (c - a) * (d - b) / 1e4, 0); }

// 天井の高さを 3D の家から測る（真上に線を飛ばして、最初に当たった天井）
function houseMeshes(d) {
  const list = [], OK = new Set(['ceiling', 'oriage', 'woodceil', 'soffit']);
  const vis = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
  d.rig.traverse((o) => { if (o.isMesh && o.material && OK.has(o.material.name) && vis(o)) list.push(o); });
  return list;
}
function probeCeil(d, list, x, y, fy) {
  const ray = new THREE.Raycaster(), o = d.rig.localToWorld(new THREE.Vector3(PX(x), fy + 1.0, PZ(y)));
  ray.set(o, new THREE.Vector3(0, 1, 0).transformDirection(d.rig.matrixWorld)); ray.far = 5;
  const h = ray.intersectObjects(list, false)[0];
  return h ? d.rig.worldToLocal(h.point.clone()).y : fy + 2.4;
}

// 床の高さ（光の広がりを床の上に出すため。和室の小上がりなどで高さが変わる）
function floorMeshes(d) {
  const list = [], OK = new Set(['floor', 'tatami', 'tile', 'tread', 'rug']);
  const vis = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
  d.rig.traverse((o) => { if (o.isMesh && o.material && OK.has(o.material.name) && vis(o)) list.push(o); });
  return list;
}
function probeFloor(d, list, x, y, fy) {
  const ray = new THREE.Raycaster(), o = d.rig.localToWorld(new THREE.Vector3(PX(x), fy + 0.6, PZ(y)));
  ray.set(o, new THREE.Vector3(0, -1, 0).transformDirection(d.rig.matrixWorld)); ray.far = 1.0;
  const h = ray.intersectObjects(list, false)[0];
  return h ? d.rig.worldToLocal(h.point.clone()).y : fy;
}
function glowTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); return t;
}

function build() {
  const d = window._dbg; if (!d || !d.rig || !d.ext || !d.ext.setNight) return false;
  const list = houseMeshes(d); if (!list.length) return false;   // 家のモデルがまだ読み込まれていない
  const root = new THREE.Group(); root.name = 'lightplan'; d.rig.add(root);
  const fixG = new THREE.Group(), glowG = new THREE.Group(), poolG = new THREE.Group(), markG = new THREE.Group(); root.add(fixG, glowG, poolG, markG); glowG.visible = false; poolG.visible = false; markG.visible = false;
  const markMat = new THREE.MeshBasicMaterial({ color: 0xff8a2a, depthWrite: false, transparent: true, opacity: 0.95 });
  const matOff = new THREE.MeshStandardMaterial({ color: 0xf4f4f2, roughness: 0.5 });
  const matOn = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffe2bf, emissiveIntensity: 2.2, roughness: 0.5 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.6 });
  const tex = glowTex();
  const glowMat = new THREE.MeshBasicMaterial({ map: tex, color: 0xffe2bf, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
  const pool = []; for (let i = 0; i < POOL; i++) { const l = new THREE.PointLight(0xffe2bf, 0, 0, 2); poolG.add(l); pool.push(l); }
  S = { d, root, fixG, glowG, poolG, markG, markMat, pool, matOn, matOff, dark, glowMat, list, fx: [], on: false, K: 3500, mode: 'all', pick: {}, occ: null, glow: true, assignT: 0 };
  for (const r of ROOMS) S.pick[r.id] = true;
  placeAll();
  // 夜にする（自動・手動）と連動
  const orig = d.ext.setNight; d.ext.setNight = (on) => { orig(on); setOn(on); };
  setOn(d.ext.isNight());
  // 吹抜け・窓の高さを変えると天井が変わるので測り直す
  document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('[data-f],[data-h],[data-v]')) setTimeout(placeAll, 1500); });
  setInterval(() => { floorMarks(); if (S.on) assign(); }, 250);
  addButtons();
  return true;
}

// 器具を置く（天井の高さは測った値）
function placeAll() {
  const d = S.d; S.list = houseMeshes(d); S.floors = floorMeshes(d);
  for (const g of [S.fixG, S.glowG, S.markG]) while (g.children.length) { const o = g.children[0]; g.remove(o); o.traverse((m) => m.geometry && m.geometry.dispose()); }
  S.fx = [];
  for (const [rid, type, x, y, o] of FIX) {
    const room = roomOf(rid), T = TYPES[type], fl = o.fl || room.fl, fy = floorY(fl);
    const cy = probeCeil(d, S.list, x, y, fy), gy = probeFloor(d, S.floors, x, y, fy) + 0.015;   // 天井と床の高さ
    const lm = o.lm || T.lm, f = { rid, type, x, y, fl, lm, o, meshes: [], glows: [] };
    const P = (xx, yy, hh) => new THREE.Vector3(PX(xx), hh, PZ(yy));
    let src;   // 光の出る位置
    if (type === 'dl' || type === 'dlh' || type === 'ceil') {
      const r = T.r, th = type === 'ceil' ? 0.08 : 0.012;
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * (type === 'ceil' ? 0.9 : 1), th, 24), S.matOff); m.position.copy(P(x, y, cy - th / 2 - 0.002)); S.fixG.add(m); f.meshes.push(m);
      src = P(x, y, cy - 0.05);
      const fh = cy - fy, rad = type === 'ceil' ? 1.6 : Math.min(1.4, fh * (type === 'dlh' ? 0.35 : 0.5));
      f.glows.push(glowAt(P(x, y, gy), rad * 2, rad * 2, Math.min(0.55, lm / 1400)));
    } else if (type === 'pend') {
      const hh = fy + o.h;
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, cy - hh, 6), S.dark); cord.position.copy(P(x, y, (cy + hh) / 2)); S.fixG.add(cord);
      const sh = new THREE.Mesh(new THREE.ConeGeometry(T.r, 0.2, 24, 1, true), S.matOff); sh.material = S.matOff; sh.position.copy(P(x, y, hh + 0.08)); S.fixG.add(sh); f.meshes.push(sh);
      src = P(x, y, hh); f.glows.push(glowAt(P(x, y, gy), 1.4, 1.4, 0.35));
    } else if (type === 'cove') {
      const hh = o.h === 'ceil' ? cy - 0.12 : fy + o.h, x2 = o.x2, y2 = o.y2;
      const seg = o.rect ? [[x, y, x2, y], [x2, y, x2, y2], [x2, y2, x, y2], [x, y2, x, y]] : [[x, y, x2, y2]];
      for (const [a, b, c, e] of seg) {
        const A = P(a, b, hh), B = P(c, e, hh), len = A.distanceTo(B);
        const m = new THREE.Mesh(new THREE.BoxGeometry(len, 0.02, 0.03), S.matOff); m.position.copy(A).add(B).multiplyScalar(0.5); m.rotation.y = -Math.atan2(B.z - A.z, B.x - A.x); S.fixG.add(m); f.meshes.push(m);
        const g = glowAt(P((a + c) / 2, (b + e) / 2, probeFloor(d, S.floors, (a + c) / 2, (b + e) / 2, fy) + 0.015), len + 0.8, 1.2, 0.3); g.rotation.z = -Math.atan2(B.z - A.z, B.x - A.x); f.glows.push(g);
      }
      src = P((x + x2) / 2, (y + y2) / 2, hh);
    } else {   // 壁付け・足元灯・外のポール・浴室灯
      const hh = fy + (o.h || 1.8), w = type === 'foot' ? 0.12 : type === 'pole' ? 0.08 : 0.18;
      if (type === 'pole') { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, o.h, 8), S.dark); p.position.copy(P(x, y, fy + o.h / 2)); S.fixG.add(p); }
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, type === 'foot' ? 0.06 : 0.1, type === 'foot' ? 0.02 : 0.08), S.matOff); m.position.copy(P(x, y, hh)); S.fixG.add(m); f.meshes.push(m);
      src = P(x, y, hh);
      f.glows.push(glowAt(P(x, y, gy), type === 'foot' ? 0.8 : 1.6, type === 'foot' ? 0.8 : 1.6, type === 'foot' ? 0.3 : 0.35));
    }
    f.src = src; f.meshes.forEach((m) => { m.userData.noOcc = true; m.castShadow = false; }); S.fx.push(f);
    // 床の印（上から見たときに器具の位置が分かるように）：○ダウンライト ◎高天井用 大きい○シーリング ●ペンダント ■壁付け・足元灯 ━間接照明
    const mk = (geo, xx, yy, rot) => { const m = new THREE.Mesh(geo, S.markMat); m.rotation.x = -Math.PI / 2; if (rot) m.rotation.z = rot; m.position.copy(P(xx, yy, gy + 0.008)); m.renderOrder = 6; S.markG.add(m); };
    if (type === 'dl') mk(new THREE.RingGeometry(0.06, 0.09, 24), x, y);
    else if (type === 'dlh') { mk(new THREE.RingGeometry(0.06, 0.09, 24), x, y); mk(new THREE.RingGeometry(0.13, 0.16, 28), x, y); }
    else if (type === 'ceil') mk(new THREE.RingGeometry(0.22, 0.27, 36), x, y);
    else if (type === 'pend') mk(new THREE.CircleGeometry(0.09, 20), x, y);
    else if (type === 'cove') { const seg = o.rect ? [[x, y, o.x2, y], [o.x2, y, o.x2, o.y2], [o.x2, o.y2, x, o.y2], [x, o.y2, x, y]] : [[x, y, o.x2, o.y2]]; for (const [a, b, c, e] of seg) { const L = Math.hypot((c - a) / 100, (e - b) / 100); mk(new THREE.PlaneGeometry(L, 0.04), (a + c) / 2, (b + e) / 2, -Math.atan2((e - b), (c - a))); } }
    else mk(new THREE.PlaneGeometry(0.12, 0.12), x, y);
  }
  // 部屋ごとの光（明るさの重心と、合計の明るさ）
  S.rooms = ROOMS.map((r) => {
    const fs = S.fx.filter((f) => f.rid === r.id); let lm = 0; const c = new THREE.Vector3();
    for (const f of fs) { lm += f.lm; c.addScaledVector(f.src, f.lm); }
    if (lm) c.multiplyScalar(1 / lm);
    if (fs.length && fs.every((f) => f.type === 'dl' || f.type === 'dlh' || f.type === 'ceil')) c.y -= 0.3;   // 天井の器具は少し下から照らす（壁にも光が回るように）
    return { r, fs, lm, c };
  });
  apply();
}
function glowAt(p, w, h, op) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), S.glowMat.clone()); m.material.opacity = op; m.userData.op = op;
  m.rotation.x = -Math.PI / 2; m.position.copy(p); m.renderOrder = 5; m.userData.noOcc = true; S.glowG.add(m); return m;
}

// ---- 点け方 ----
function roomIsOn(r) {
  if (!S.on) return false;
  if (S.mode === 'pick') return !!S.pick[r.id];
  if (S.mode === 'people' && S.occ) return S.occ.has(r.area);
  return true;
}
function apply() {
  if (!S) return;
  const col = new THREE.Color(COLORS[S.K].c);
  S.matOn.emissive.copy(col);
  for (const R of S.rooms) {
    const on = roomIsOn(R.r);
    for (const f of R.fs) { for (const m of f.meshes) m.material = on ? S.matOn : S.matOff; for (const g of f.glows) { g.visible = on && S.glow; g.material.color.copy(col); } }
  }
  S.poolG.visible = S.on;
  floorMarks();
  for (const l of S.pool) l.color.copy(col);
  assign(true);
}
// 床の印と光の広がりは、上から・外から見るときだけ（中から見ると床のじゃまになる）。印は夜か、照明の一覧を開いているとき
function floorMarks() {
  const inside = S.d.inside && S.d.inside.on;
  S.glowG.visible = S.on && S.glow && !inside;
  S.markG.visible = S.glow && !inside && (S.on || (box && box.style.display !== 'none'));
}
// 本物の光（12個）を、点いている部屋のうち見ている所に近い順に割り当てる
const _cam = new THREE.Vector3();
function assign(force) {
  if (!S || !S.on) return;
  const d = S.d, now = performance.now(); if (!force && now - S.assignT < 200) return; S.assignT = now;
  d.camera.getWorldPosition(_cam); d.rig.worldToLocal(_cam);
  const sim = window._sim && window._sim.isOpen && window._sim.isOpen() ? window._sim.viewFloor && window._sim.viewFloor() : null;
  const camFl = sim || (_cam.y > FL1 + FL2 + 0.5 && _cam.y < FL1 + FL2 + 2.6 ? 2 : _cam.y < FL1 + 2.6 ? 1 : null);
  const cand = S.rooms.filter((R) => R.lm && roomIsOn(R.r)).map((R) => {
    let s = R.c.distanceTo(_cam); if (camFl && R.r.fl && R.r.fl !== camFl) s += 30; return { R, s };
  }).sort((a, b) => a.s - b.s);
  const K = 0.16;   // 明るさの合わせ（画面で見て合わせた）
  for (let i = 0; i < S.pool.length; i++) {
    const l = S.pool[i], c = cand[i];
    if (!c) { l.intensity = 0; continue; }
    l.position.copy(c.R.c); l.intensity = c.R.lm / (4 * Math.PI) * K;
  }
}
function setOn(on) { if (!S) return; S.on = !!on; apply(); refreshBox(); }

// ---- 一覧の板 ----
const css = `
#lightbox{position:fixed;right:8px;top:8px;z-index:61;width:min(420px,94vw);max-height:70vh;overflow:auto;-webkit-overflow-scrolling:touch;background:rgba(28,30,33,.94);color:#fff;border-radius:14px;padding:8px 12px;font-size:13px;line-height:1.45;box-shadow:0 6px 20px rgba(0,0,0,.4);display:none}
#lightbox select,#lightbox button{font:inherit;font-size:13px;border-radius:8px;border:1px solid #555;background:#2c3035;color:#fff;padding:5px 8px;margin:2px;touch-action:manipulation}
#lightbox table{border-collapse:collapse;width:100%;font-size:12.5px;margin-top:6px}#lightbox td,#lightbox th{border-bottom:1px solid #444;padding:3px 4px;text-align:left;vertical-align:top}
#lightbox .sub{color:#b8bcc0;font-size:12px}#lightbox .ok{color:#9fd59f}#lightbox .low{color:#ffb27a}
`;
function el(h) { const d = document.createElement('div'); d.innerHTML = h.trim(); return d.firstChild; }
let box = null;
function openBox() {
  if (!box) {
    document.head.append(el(`<style>${css}</style>`));
    box = el(`<div id="lightbox"><div style="display:flex;align-items:center;gap:6px"><b style="flex:1">照明の案（たたき台）</b><button id="lbx" aria-label="閉じる">✕</button></div>
      <div class="sub">夜（日の入り後）は自動で点きます。器具の種類・数・明るさは一般的な目安で、まだ何も決まっていません【推測】</div>
      <div><select id="lbk">${Object.entries(COLORS).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('')}</select>
        <select id="lbm"><option value="all">全部点ける</option><option value="pick">部屋を選んで点ける</option><option value="people">人のいる所だけ（暮らしの動き）</option></select>
        <button id="lbn">夜にする</button></div>
      <div><label class="sub"><input type="checkbox" id="lbg" checked> 器具の印と光の広がりを床に出す（上から見ると器具の位置が分かる）</label></div>
      <div id="lbt"></div></div>`);
    document.body.append(box);
    for (const ev of ['pointerdown', 'pointermove', 'pointerup', 'wheel']) box.addEventListener(ev, (e) => e.stopPropagation());
    box.querySelector('#lbx').onclick = () => { box.style.display = 'none'; apply(); };
    box.querySelector('#lbk').onchange = (e) => { S.K = +e.target.value; apply(); };
    box.querySelector('#lbm').onchange = (e) => { S.mode = e.target.value; apply(); refreshBox(); };
    box.querySelector('#lbg').onchange = (e) => { S.glow = e.target.checked; apply(); };
    box.querySelector('#lbn').onclick = () => { const n = document.getElementById('night'); const on = !S.d.ext.isNight(); S.d.ext.setNight(on); if (n) n.checked = on; };
    box.querySelector('#lbt').addEventListener('change', (e) => { const id = e.target.dataset && e.target.dataset.room; if (!id) return; S.pick[id] = e.target.checked; if (S.mode !== 'pick') { S.mode = 'pick'; box.querySelector('#lbm').value = 'pick'; } apply(); });
  }
  box.querySelector('#lbk').value = S.K; box.querySelector('#lbm').value = S.mode;
  box.style.display = 'block'; apply(); refreshBox();
}
function refreshBox() {
  if (!box || box.style.display === 'none' || !S.rooms) return;
  box.querySelector('#lbn').textContent = S.d.ext.isNight() ? '昼に戻す' : '夜にする';
  // 居室の明るさの目安：日本照明工業会のシーリングライトの適用畳数の下限（4.5畳 2,200lm・6畳 2,700lm、以後 2畳ごとに +600lm）
  const need = (jo) => jo < 4.5 ? Math.round(2200 * jo / 4.5 / 100) * 100 : jo <= 4.5 ? 2200 : 2700 + (jo - 6) * 300;   // 4.5畳より狭い部屋は広さの割合で縮めた【推測】
  let h = '<table><tr><th></th><th>部屋</th><th>器具</th><th>合計</th><th>目安との比較</th></tr>';
  const ldk = S.rooms.filter((R) => R.r.grp === 'LDK').reduce((s, R) => s + R.lm, 0);
  for (const R of S.rooms) {
    const cnt = {}; for (const f of R.fs) { const n = TYPES[f.type].name.replace(/（.*/, ''); cnt[n] = (cnt[n] || 0) + 1; }
    const kinds = Object.entries(cnt).map(([n, c]) => n + (c > 1 ? '×' + c : '')).join('・') || '—';
    const sen = R.fs.some((f) => f.o.sensor) ? '<div class="sub">人感センサー向きの器具あり</div>' : '';
    const notes = R.fs.filter((f) => f.o.note).map((f) => f.o.note); const nt = notes.length ? `<div class="sub">${[...new Set(notes)].join('／')}</div>` : '';
    let cmp = '<span class="sub">—</span>';
    if (R.r.jo) { const n = need(R.r.jo), ok = R.lm >= n; cmp = `<span class="${ok ? 'ok' : 'low'}">${R.r.jo}畳：目安 ${n.toLocaleString()}lm 以上${R.r.jo < 4.5 ? '【推測】' : ''} → ${ok ? '足りる' : '少なめ'}</span>`; }
    if (R.r.id === 'ldkmid') { const n = need(LDK_JO); cmp = `<span class="${ldk >= n ? 'ok' : 'low'}">LDK 全体 ${LDK_JO}畳：${ldk.toLocaleString()}lm／目安 ${n.toLocaleString()}lm 以上【推測】（14畳より広い分は同じ割合で延ばした）</span>`; }
    const a = areaM2(R.r);
    h += `<tr><td><input type="checkbox" data-room="${R.r.id}" ${roomIsOn(R.r) || (S.mode === 'pick' && S.pick[R.r.id]) ? 'checked' : ''}></td><td>${R.r.name}${a ? `<div class="sub">約${a.toFixed(1)}㎡</div>` : ''}</td><td>${kinds}${sen}${nt}</td><td>${R.lm.toLocaleString()}lm</td><td>${cmp}</td></tr>`;
  }
  const tot = S.rooms.reduce((s, R) => s + R.lm, 0), w = Math.round(tot / 100);   // LED はおよそ 1W で 100lm
  h += `</table><div class="sub" style="margin-top:6px">【計算】全部で ${S.fx.length} 台・${tot.toLocaleString()}lm。全部点けると約 ${w}W（LED はおよそ 100lm/W として）。<br>目安は「日本照明工業会のシーリングライトの適用畳数」の下限。ダウンライトだけの部屋は、光が真下に集まるので同じ lm でも部屋の隅は暗めに感じます【推測】</div>`;
  box.querySelector('#lbt').innerHTML = h;
}

// ボタン：外から見るときの左の板、中から見るときの下の操作
function addButtons() {
  const ui = document.getElementById('ui'), bar = document.querySelector('#bar #exit'), night = document.getElementById('night');
  if (!ui || !bar) return setTimeout(addButtons, 500);
  const b1 = document.createElement('button'); b1.textContent = '照明の案（部屋ごとの一覧）'; b1.style.cssText = 'margin:4px 0'; b1.onclick = openBox;
  if (night && night.parentNode) night.parentNode.parentNode.insertBefore(b1, night.parentNode.nextSibling); else ui.append(b1);
  const b2 = document.createElement('button'); b2.textContent = '照明'; b2.onclick = openBox; bar.parentNode.insertBefore(b2, bar);
}

function start() { if (!build()) setTimeout(start, 700); }
start();
window._light = {
  open: openBox, apply, setOcc: (set) => { if (!S) return; const k = set ? [...set].sort().join('|') : ''; if (k === S.occK) return; S.occK = k; S.occ = set; if (S.mode === 'people') apply(); },
  setMode: (m) => { if (!S) return; S.mode = m; apply(); if (box) box.querySelector('#lbm').value = m; refreshBox(); },
  mode: () => S && S.mode, ROOMS, FIX, TYPES, state: () => S,
};
