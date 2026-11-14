// 見た目と検討の追加機能（外まわり・周りの家の外観・夜・カーテン・見え方と日だまりの計算・Quest のメジャーと瞬間移動・比較画像）
// 座標はすべてモデル座標（m）：X＝東、Z＝南、Y＝敷地の地面(GL)からの高さ。1階の床は +0.59
import * as THREE from 'three';
import { computeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

const FL1 = 0.59;
// 平面図 cm → モデル m
const PX = (x) => (x - 477.75) / 100, PZ = (y) => (y - 409.5) / 100;
// 敷地（配置図 10/31）
const LOT = { W: PX(-313.2), E: PX(1091.1), N: PZ(-134.5), S: 4.86 };
const HOUSE = { W: PX(0), E: PX(955.5), N: PZ(0), S: PZ(637) };
const ROAD = { WW: LOT.W - 4.0, NN: LOT.N - 4.0, NE: 11.0 };   // 西の公道・北の私道 幅4m

// ---- 決まった乱数（毎回同じ見た目にする） ----
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function canvasTex(w, h, draw, { rep = null, srgb = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  if (rep) t.repeat.set(1 / rep[0], 1 / rep[1]);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function speckle(g, w, h, base, n, smin, smax, amp, r) {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) {
    const v = (r() - 0.5) * amp, s = smin + r() * (smax - smin);
    g.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`;
    g.fillRect(r() * w, r() * h, s, s);
  }
}
// 1 枚の絵が表す長さ（m）を rep で渡す。UV は m 単位で作る
const asphaltTex = () => { const r = rng(11); return canvasTex(512, 512, (g, w, h) => speckle(g, w, h, '#5d5f62', 26000, 1, 3, 0.28, r), { rep: [2, 2] }); };
const concreteTex = () => { const r = rng(12); return canvasTex(512, 512, (g, w, h) => { speckle(g, w, h, '#bdb9b1', 9000, 1, 2, 0.10, r); for (let i = 0; i < 14; i++) { g.fillStyle = `rgba(90,85,78,${0.03 + r() * 0.04})`; g.beginPath(); g.ellipse(r() * w, r() * h, 20 + r() * 60, 10 + r() * 40, r() * 3, 0, 7); g.fill(); } }, { rep: [2, 2] }); };
const gravelTex = () => { const r = rng(13); return canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#8f8a83'; g.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { const c = 120 + r() * 110 | 0; g.fillStyle = `rgb(${c},${c - 4},${c - 10})`; g.beginPath(); g.ellipse(r() * w, r() * h, 2 + r() * 4, 2 + r() * 3, r() * 3, 0, 7); g.fill(); } }, { rep: [1, 1] }); };
const meshFenceAlpha = () => canvasTex(64, 96, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; for (const x of [0, 21, 42]) g.fillRect(x, 0, 3, h); g.fillRect(0, 0, w, 4); }, { rep: [0.15, 0.15], srgb: false });

// ---- 四角い板（上面を関数で高さ指定、側面は bottom まで） ----
// UV は m。上面 (x,z)、側面 (辺に沿った長さ, y)
function slabRect(x0, x1, z0, z1, fn, bottom, nx = 1, nz = 1) {
  const pos = [], uv = [], groups = [[], []];
  const tri = (g, a, b, c, ua, ub, uc) => { const i = pos.length / 3; pos.push(...a, ...b, ...c); uv.push(...ua, ...ub, ...uc); groups[g].push(i); };
  const X = (i) => x0 + (x1 - x0) * i / nx, Z = (j) => z0 + (z1 - z0) * j / nz;
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const p = [[X(i), Z(j)], [X(i + 1), Z(j)], [X(i + 1), Z(j + 1)], [X(i), Z(j + 1)]].map(([x, z]) => [x, fn(x, z), z]);
    const u = p.map((q) => [q[0], -q[2]]);
    tri(0, p[0], p[3], p[2], u[0], u[3], u[2]); tri(0, p[0], p[2], p[1], u[0], u[2], u[1]);   // 上向き
  }
  // 側面（外向き）
  const side = (pts) => {   // pts: 上端の点列（外から見て左→右）
    let s = 0;
    for (let k = 0; k < pts.length - 1; k++) {
      const [ax, az] = pts[k], [bx, bz] = pts[k + 1], L = Math.hypot(bx - ax, bz - az);
      const at = [ax, fn(ax, az), az], bt = [bx, fn(bx, bz), bz], ab = [ax, bottom, az], bb = [bx, bottom, bz];
      tri(1, ab, bb, bt, [s, bottom], [s + L, bottom], [s + L, bt[1]]); tri(1, ab, bt, at, [s, bottom], [s + L, bt[1]], [s, at[1]]);
      s += L;
    }
  };
  const row = (n, f) => Array.from({ length: n + 1 }, (_, i) => f(i));
  side(row(nx, (i) => [X(i), z1]));                 // 南面（南から見て 西→東）
  side(row(nz, (j) => [x1, Z(nz - j)]));            // 東面
  side(row(nx, (i) => [X(nx - i), z0]));            // 北面
  side(row(nz, (j) => [x0, Z(j)]));                 // 西面
  // 三角形をグループ順に並べ直す
  const P2 = [], U2 = [], geo = new THREE.BufferGeometry();
  let start = 0;
  groups.forEach((list, gi) => { for (const i of list) { P2.push(...pos.slice(i * 3, i * 3 + 9)); U2.push(...uv.slice(i * 2, i * 2 + 6)); } geo.addGroup(start, list.length * 3, gi); start += list.length * 3; });
  geo.setAttribute('position', new THREE.Float32BufferAttribute(P2, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(U2, 2));
  geo.computeVertexNormals();
  return geo;
}
const boxAt = (mat, x0, x1, y0, y1, z0, z1) => { const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); return m; };

// =====================================================================
export function initExtras(ctx) {
  const { THREE: _T, scene, rig, renderer, camera, models, furn, nbr, NEIGHBORS, tex } = ctx;
  const ext = {};
  const shadow = (o, cast = true) => { o.traverse((m) => { if (m.isMesh) { m.castShadow = cast; m.receiveShadow = true; } }); return o; };

  // ---------------- 外まわり ----------------
  const site = new THREE.Group(); site.name = 'site'; rig.add(site);
  // 芝の絵 1 枚 ＝ 2.5m（UV は m 単位）
  const gl = new THREE.TextureLoader(), gt = (n, srgb) => { const t = gl.load('assets/tex/' + n + '.jpg'); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(0.4, 0.4); t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
  const grassM = new THREE.MeshStandardMaterial({ map: gt('grass_ground_diff', true), normalMap: gt('grass_ground_nor', false), roughness: 1, color: 0xb8d0a0 });
  const concM = new THREE.MeshStandardMaterial({ map: concreteTex(), roughness: 0.95, color: 0xb4b0a8 });
  const asphM = new THREE.MeshStandardMaterial({ map: asphaltTex(), roughness: 0.95, color: 0xdddddd });
  const gravM = new THREE.MeshStandardMaterial({ map: gravelTex(), roughness: 1 });
  const cbM = new THREE.MeshStandardMaterial({ color: 0xa9a59d, roughness: 0.95 });
  const fenceM = new THREE.MeshStandardMaterial({ color: 0x3a3632, roughness: 0.6, metalness: 0.3 });
  const meshM = new THREE.MeshStandardMaterial({ color: 0x3a3632, roughness: 0.6, metalness: 0.3, alphaMap: meshFenceAlpha(), alphaTest: 0.5, side: THREE.DoubleSide });

  // 高さの変わらない部分（敷地と同じ高さ ±0）：敷地・東の隣地・北側
  const HIGH = [
    [HOUSE.W, LOT.E, LOT.N, LOT.S],          // 敷地（駐車場の帯を除く）
    [LOT.E, 60, LOT.N, 14],                  // 東の隣地（配置図 ±0）
    [ROAD.NE, 60, ROAD.NN, LOT.N],           // 私道の東の突き当たりの先
    [-60, 60, -60, ROAD.NN],                 // 私道の北
  ];
  const flat = (m) => { m.userData.flat = true; return m; };
  for (const [x0, x1, z0, z1] of HIGH) site.add(flat(new THREE.Mesh(slabRect(x0, x1, z0, z1, () => 0, -3), [grassM, concM])));
  // 土間コンクリート（北の帯）と砂利（東の帯）
  site.add(flat(new THREE.Mesh(slabRect(HOUSE.W, 5.3, LOT.N, HOUSE.N, () => 0.012, -0.05), [concM, concM])));
  site.add(flat(new THREE.Mesh(slabRect(HOUSE.E, LOT.E - 0.12, HOUSE.N, 2.3, () => 0.01, -0.05), [gravM, gravM])));

  // 高さの変わる部分：道路・駐車場（南の隣地の低さ dh に合わせて作り直す）
  const varGroup = new THREE.Group(); site.add(varGroup);
  let DH = 0.5;
  // 西の道路：北端 GL−0.15 → 南端（敷地の南の角）GL−dh
  const roadH = (z) => (z <= LOT.N ? -0.15 : z >= LOT.S ? -DH : -0.15 + (-DH + 0.15) * (z - LOT.N) / (LOT.S - LOT.N));
  const carMeshes = [];
  function buildVar() {
    varGroup.clear();
    varGroup.add(new THREE.Mesh(slabRect(ROAD.WW, ROAD.NE, ROAD.NN, LOT.N, () => -0.15, -3), [asphM, concM]));        // 北の私道
    varGroup.add(new THREE.Mesh(slabRect(ROAD.WW, LOT.W, LOT.N, LOT.S, (x, z) => roadH(z), -3, 1, 6), [asphM, concM])); // 西の公道（坂）
    varGroup.add(new THREE.Mesh(slabRect(ROAD.WW, LOT.W, LOT.S, 40, () => -DH, -3), [asphM, concM]));
    // 駐車場：道路側の縁は道路の高さ、家の側は ±0（勾配は推測）
    const park = (x, z) => roadH(z) * (x - HOUSE.W) / (LOT.W - HOUSE.W);
    varGroup.add(new THREE.Mesh(slabRect(LOT.W, HOUSE.W, LOT.N, LOT.S, park, -3, 4, 12), [concM, concM]));
    // マンホール（私道）
    const mh = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.01, 32), new THREE.MeshStandardMaterial({ color: 0x45464a, roughness: 0.5, metalness: 0.5 }));
    mh.position.set(PX(-260), -0.143, PZ(-280)); varGroup.add(mh);
    // 車 2 台（置き場の目安）
    for (const [z, col] of [[-2.65, 0xf2f2f0], [2.08, 0x50555c]]) {
      const c = car(col); const x = (LOT.W + HOUSE.W) / 2;
      c.position.set(x, park(x, z), z); varGroup.add(c);
    }
    shadow(varGroup);
    varGroup.traverse((m) => { if (m.isMesh && m.geometry.type !== 'BoxGeometry' && m.geometry.type !== 'CylinderGeometry') m.castShadow = false; });
  }
  function car(color) {
    const g = new THREE.Group();
    const body = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.4 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x1d2328, roughness: 0.1, metalness: 0.2 });
    const tire = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
    g.add(boxAt(body, -0.85, 0.85, 0.28, 0.95, -2.2, 2.2));
    g.add(boxAt(glass, -0.78, 0.78, 0.95, 1.45, -1.25, 0.95));
    g.add(boxAt(body, -0.8, 0.8, 1.45, 1.52, -1.2, 0.9));
    for (const sx of [-0.78, 0.78]) for (const sz of [-1.45, 1.4]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 20), tire); w.rotation.z = Math.PI / 2; w.position.set(sx, 0.32, sz); g.add(w);
    }
    return g;
  }
  buildVar();

  // ブロック1段＋メッシュフェンス（南・東の境界。配置図）
  const fence = new THREE.Group(); site.add(fence);
  function fenceRun(ax, az, bx, bz) {
    const L = Math.hypot(bx - ax, bz - az), dx = (bx - ax) / L, dz = (bz - az) / L, ang = Math.atan2(-dz, dx);
    const seg = new THREE.Group(); seg.position.set(ax, 0, az); seg.rotation.y = ang;
    seg.add(boxAt(cbM, 0, L, 0, 0.19, -0.06, 0.06));                         // CB（高さ19cm）
    for (let s = 0; s <= L + 1e-6; s += Math.min(2, L)) seg.add(boxAt(fenceM, s - 0.02, s + 0.02, 0.19, 0.99, -0.02, 0.02));
    seg.add(boxAt(fenceM, 0, L, 0.96, 0.99, -0.015, 0.015));
    seg.add(boxAt(fenceM, 0, L, 0.22, 0.24, -0.01, 0.01));
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(L, 0.75), meshM.clone());
    panel.material.alphaMap = meshM.alphaMap.clone(); panel.material.alphaMap.repeat.set(L / 0.15, 0.75 / 0.225); panel.material.alphaMap.needsUpdate = true;
    panel.position.set(L / 2, 0.24 + 0.375, 0); panel.userData.noOcc = true; seg.add(panel);
    fence.add(seg);
  }
  fenceRun(LOT.W, LOT.S - 0.06, LOT.E - 0.06, LOT.S - 0.06);
  fenceRun(LOT.E - 0.06, LOT.S - 0.06, LOT.E - 0.06, LOT.N);
  shadow(fence);

  // 植栽（配置図の丸 3 本：南西・南東・北東）と庭のテーブル
  function tree(x, z, h, seed) {
    const r = rng(seed), g = new THREE.Group(); g.position.set(x, 0, z);
    g.add(boxAt(new THREE.MeshStandardMaterial({ color: 0x6b5442, roughness: 0.9 }), -0.05, 0.05, 0, h * 0.6, -0.05, 0.05));
    for (let i = 0; i < 7; i++) {
      const c = new THREE.Color().setHSL(0.26 + r() * 0.07, 0.35 + r() * 0.2, 0.13 + r() * 0.08);
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35 + r() * 0.3, 1), new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, flatShading: true }));
      const a = r() * 6.28, d = r() * 0.45;
      m.position.set(Math.cos(a) * d, h * 0.55 + r() * h * 0.4, Math.sin(a) * d); g.add(m);
    }
    return g;
  }
  site.add(tree(-6.74, 4.44, 3.0, 21), tree(5.45, 4.21, 3.2, 22), tree(5.26, -4.94, 2.6, 23));
  const wood = new THREE.MeshStandardMaterial({ color: 0x8a6a4c, roughness: 0.7 });
  const tbl = new THREE.Group(); tbl.position.set(3.44, 0, 3.68);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.04, 28), wood); top.position.y = 0.7; tbl.add(top);
  tbl.add(boxAt(wood, -0.04, 0.04, 0, 0.7, -0.04, 0.04));
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.785, c = boxAt(wood, -0.22, 0.22, 0.42, 0.46, -0.22, 0.22); c.position.x += Math.cos(a) * 0.7; c.position.z += Math.sin(a) * 0.7; tbl.add(c); }
  site.add(tbl);
  // エコキュート（薄型 370L）
  const ecoM = new THREE.MeshStandardMaterial({ color: 0xe6e5e1, roughness: 0.5 });
  site.add(boxAt(ecoM, 5.45, 5.88, 0, 1.83, -3.5, -2.4), boxAt(ecoM, 5.4, 5.7, 0, 0.7, -4.3, -3.6));
  // 街灯（西の道路）
  const pole = new THREE.Group(); pole.position.set(ROAD.WW + 0.3, 0, 0.6);
  const poleM = new THREE.MeshStandardMaterial({ color: 0x8c9196, roughness: 0.5, metalness: 0.5 });
  pole.add(boxAt(poleM, -0.06, 0.06, -0.5, 5.2, -0.06, 0.06), boxAt(poleM, 0, 1.0, 5.1, 5.18, -0.04, 0.04));
  const lampM = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff0d8, emissiveIntensity: 0 });
  pole.add(boxAt(lampM, 0.75, 1.1, 5.02, 5.1, -0.08, 0.08));
  site.add(pole); shadow(site);
  // 地面の板は影を落とさない
  site.children.forEach((m) => { if (m.userData.flat) m.castShadow = false; });

  ext.site = site;
  ext.setSlope = (dh) => { DH = dh; buildVar(); ext.invalidate(); };

  // ---------------- 周りの家（外観：窓・色・軒） ----------------
  const PALETTE = [['#e9e3d6', '#3e4246'], ['#d6cfc3', '#4b3a2f'], ['#f0efea', '#2f3a48'], ['#cbc3b4', '#3b3d40'], ['#e3dccd', '#5a4636'], ['#dfe1de', '#363a3e']];
  const EAVE = 5.8, RIDGE = 7.6, H = EAVE + 3, TILE = 3.64;
  const nightMats = [];
  function facadeTex(seed, wallCol) {
    const r = rng(seed), pxm = 512 / TILE, pym = 1024 / H;
    const y = (m) => (H - (m + 3)) * pym;   // 高さ m → 絵の y
    const wins = [];
    for (const [y0, y1, p] of [[0.9, 2.0, 0.75], [3.7, 4.8, 0.8]]) {
      if (r() > p) continue;
      const w = 0.8 + r() * 0.9, x0 = 0.3 + r() * (TILE - 0.6 - w);
      wins.push([x0, x0 + w, y0, y1, r() < 0.55]);
    }
    const map = canvasTex(512, 1024, (g, W) => {
      g.fillStyle = wallCol; g.fillRect(0, 0, W, 1024);
      g.strokeStyle = 'rgba(0,0,0,0.06)'; g.lineWidth = 1;
      for (let m = 0.4; m < EAVE; m += 0.455) { g.beginPath(); g.moveTo(0, y(m)); g.lineTo(W, y(m)); g.stroke(); }
      g.fillStyle = '#8f8d88'; g.fillRect(0, y(0.4), W, 1024 - y(0.4));                // 基礎
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, y(EAVE), W, y(EAVE - 0.25) - y(EAVE)); // 軒下の陰
      for (const [x0, x1, y0, y1] of wins) {
        g.fillStyle = '#dcdcd8'; g.fillRect(x0 * pxm - 4, y(y1) - 4, (x1 - x0) * pxm + 8, (y1 - y0) * pym + 8);
        const gr = g.createLinearGradient(0, y(y1), 0, y(y0)); gr.addColorStop(0, '#3c4852'); gr.addColorStop(1, '#232a30');
        g.fillStyle = gr; g.fillRect(x0 * pxm, y(y1), (x1 - x0) * pxm, (y1 - y0) * pym);
        g.fillStyle = '#c9c9c5'; g.fillRect((x0 + x1) / 2 * pxm - 2, y(y1), 4, (y1 - y0) * pym);
        g.fillStyle = '#4a4d50'; g.fillRect(x0 * pxm - 6, y(y1 + 0.22), (x1 - x0) * pxm + 12, 0.2 * pym);   // シャッターボックス
      }
    }, { rep: null });
    map.repeat.set(1, 1);
    const em = canvasTex(256, 512, (g, W) => {
      g.fillStyle = '#000'; g.fillRect(0, 0, W, 512);
      for (const [x0, x1, y0, y1, lit] of wins) if (lit) { g.fillStyle = '#ffcf8f'; g.fillRect(x0 * pxm / 2, y(y1) / 2, (x1 - x0) * pxm / 2, (y1 - y0) * pym / 2); }
    });
    return { map, em };
  }
  function buildNeighbors() {
    nbr.clear();
    NEIGHBORS.forEach((h, idx) => {
      const pts = h.c.map(([x, y]) => new THREE.Vector2(PX(x), PZ(y)));
      // 時計回りに揃える（外向きの面にするため）
      const area = pts.reduce((a, p, i) => { const q = pts[(i + 1) % pts.length]; return a + (p.x * q.y - q.x * p.y); }, 0);
      if (area < 0) pts.reverse();
      const [wallCol, roofCol] = PALETTE[idx % PALETTE.length];
      const { map, em } = facadeTex(100 + idx, wallCol);
      const wallM = new THREE.MeshStandardMaterial({ map, roughness: 0.9, emissiveMap: em, emissive: 0xffffff, emissiveIntensity: 0 });
      nightMats.push(wallM);
      const pos = [], uv = [];
      let s = 0;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length], L = a.distanceTo(b);
        const A0 = [a.x, -3, a.y], B0 = [b.x, -3, b.y], A1 = [a.x, EAVE, a.y], B1 = [b.x, EAVE, b.y];
        const u0 = s / TILE, u1 = (s + L) / TILE;
        pos.push(...A0, ...B1, ...B0, ...A0, ...A1, ...B1); uv.push(u0, 0, u1, 1, u1, 0, u0, 0, u0, 1, u1, 1);
        s += L;
      }
      const wg = new THREE.BufferGeometry();
      wg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); wg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); wg.computeVertexNormals();
      // 外向きか確認（重心から離れる向き）して、逆なら裏返す
      const cx = pts.reduce((a, q) => a + q.x, 0) / pts.length, cz = pts.reduce((a, q) => a + q.y, 0) / pts.length;
      const n = wg.attributes.normal, p0 = wg.attributes.position;
      if ((p0.getX(0) - cx) * n.getX(0) + (p0.getZ(0) - cz) * n.getZ(0) < 0) {
        for (let i = 0; i < p0.count; i += 3) { for (const arr of [wg.attributes.position, wg.attributes.uv]) { const k = arr.itemSize; for (let c = 0; c < k; c++) { const t = arr.array[(i + 1) * k + c]; arr.array[(i + 1) * k + c] = arr.array[(i + 2) * k + c]; arr.array[(i + 2) * k + c] = t; } } }
        wg.computeVertexNormals();
      }
      const wall = new THREE.Mesh(wg, wallM);
      // 屋根：軒を 0.45m 出した四角すい
      const R = pts.reduce((a, q) => a + Math.hypot(q.x - cx, q.y - cz), 0) / pts.length, k = 1 + 0.45 / R;
      const ep = pts.map((q) => [cx + (q.x - cx) * k, cz + (q.y - cz) * k]);
      const rp = [];
      for (let i = 0; i < 4; i++) { const a = ep[i], b = ep[(i + 1) % 4]; rp.push(a[0], EAVE - 0.12, a[1], cx, RIDGE, cz, b[0], EAVE - 0.12, b[1]); }
      const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3)); rg.computeVertexNormals();
      const roof = new THREE.Mesh(rg, new THREE.MeshStandardMaterial({ color: roofCol, roughness: 0.8, side: THREE.DoubleSide }));
      // 雨どい（軒先の細い帯）
      const gut = new THREE.Group();
      for (let i = 0; i < 4; i++) {
        const a = ep[i], b = ep[(i + 1) % 4], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const m = new THREE.Mesh(new THREE.BoxGeometry(L, 0.1, 0.1), new THREE.MeshStandardMaterial({ color: 0x55585b, roughness: 0.6 }));
        m.position.set((a[0] + b[0]) / 2, EAVE - 0.17, (a[1] + b[1]) / 2); m.rotation.y = Math.atan2(-(b[1] - a[1]), b[0] - a[0]); gut.add(m);
      }
      const g = new THREE.Group(); g.userData.cz = cz; g.userData.name = h.n; g.userData.south = !!h.south;
      g.add(wall, roof, gut); shadow(g); nbr.add(g);
    });
  }
  buildNeighbors();

  // ---------------- 室内：ラグ・テレビ台・カーテン・照明 ----------------
  const interior = new THREE.Group(); rig.add(interior);
  const rug = boxAt(new THREE.MeshStandardMaterial({ color: 0xcfc6b8, roughness: 1 }), 2.93 - 1.0, 2.93 + 1.0, FL1, FL1 + 0.008, 0.545 - 0.7, 0.545 + 0.7);
  const tvb = boxAt(new THREE.MeshStandardMaterial({ color: 0x5b4332, roughness: 0.6 }), 4.33, 4.73, FL1, FL1 + 0.38, 0.05, 1.85);
  interior.add(rug, tvb); shadow(interior);

  // カーテン（リビング南の掃き出し窓。開いた状態は両脇に寄せる）
  const WIN = { x0: PX(640), x1: PX(896), z: PZ(637) - 0.17 };
  const curtainM = new THREE.MeshStandardMaterial({ color: 0xd8cfc2, roughness: 1, side: THREE.DoubleSide });
  const curtain = new THREE.Group(); interior.add(curtain);
  let curtainClosed = false, curtainHead = 2.2;
  function panel(xa, xb, y0, y1, folds) {
    const g = new THREE.PlaneGeometry(xb - xa, y1 - y0, Math.max(8, folds * 8), 1);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const u = (p.getX(i) + (xb - xa) / 2) / (xb - xa); p.setZ(i, 0.035 * Math.sin(u * folds * Math.PI * 2)); }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, curtainM); m.position.set((xa + xb) / 2, (y0 + y1) / 2, WIN.z); return m;
  }
  function buildCurtain() {
    curtain.clear();
    const top = FL1 + Math.min(curtainHead + 0.12, 5.3), bot = FL1 + 0.01, ext = 0.15;
    const a = WIN.x0 - ext, b = WIN.x1 + ext, mid = (a + b) / 2;
    if (curtainClosed) curtain.add(panel(a, mid + 0.03, bot, top, 9), panel(mid - 0.03, b, bot, top, 9));
    else curtain.add(panel(a, a + 0.32, bot, top, 4), panel(b - 0.32, b, bot, top, 4));
    curtain.add(boxAt(new THREE.MeshStandardMaterial({ color: 0xe8e5df }), a - 0.05, b + 0.05, top, top + 0.03, WIN.z - 0.03, WIN.z + 0.03));
    shadow(curtain);
  }
  ext.setCurtain = (closed, headM) => { if (closed != null) curtainClosed = closed; if (headM != null) curtainHead = headM; buildCurtain(); ext.invalidate(); };
  buildCurtain();

  // 照明（夜だけ点ける）。器具の位置はおおよそ
  const lights = new THREE.Group(); lights.visible = false; rig.add(lights);
  const fixtureM = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff1dc, emissiveIntensity: 0 });
  const fixtures = new THREE.Group(); interior.add(fixtures);
  const LIGHT_K = 0.11;   // 明るさの調整（画面で見て合わせた）
  const C1 = FL1 + 2.40 - 0.01, CV = FL1 + 5.40 - 0.01, C2 = FL1 + 5.40 - 0.01;
  const LIGHTS = [
    // [x, y, z, cd, 器具あり]
    [-1.3, C1, -3.2, 160], [0.8, FL1 + 1.75, -1.95, 220], [2.6, C1, -3.2, 160], [2.6, C1, -1.4, 160], [-1.3, C1, -1.4, 140],   // LDK
    [2.2, CV, 0.9, 520], [3.8, CV, 0.9, 520],                                                                               // 吹抜け
    [-0.25, C1, 0.9, 150],                                                                                                   // 和室
    [-0.45, C2, 0.9, 140], [-3.4, C2, 1.8, 140],                                                                             // 2階
    [-3.9, C1, -3.2, 90],                                                                                                    // ポーチ
  ];
  for (const [x, y, z, cd] of LIGHTS) {
    const l = new THREE.PointLight(0xffe2bd, cd * LIGHT_K, 0, 2); l.position.set(x, y - 0.06, z); lights.add(l);
    const f = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.012, 16), fixtureM); f.position.set(x, y + 0.004, z); fixtures.add(f);
    if (y < C1 - 0.1) { const cord = boxAt(new THREE.MeshStandardMaterial({ color: 0x222222 }), x - 0.004, x + 0.004, y, C1, z - 0.004, z + 0.004); fixtures.add(cord); const sh = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.18, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0x2a2a2a, side: THREE.DoubleSide })); sh.position.set(x, y + 0.04, z); fixtures.add(sh); }
  }
  const street = new THREE.PointLight(0xfff0d8, 70, 0, 2); street.position.set(ROAD.WW + 1.25, 4.9, 0.6); lights.add(street);

  let night = false;
  ext.isNight = () => night;
  ext.setNight = (on) => {
    night = on; lights.visible = on;
    fixtureM.emissiveIntensity = on ? 2.5 : 0; lampM.emissiveIntensity = on ? 3 : 0;
    for (const m of nightMats) m.emissiveIntensity = on ? 0.9 : 0;
    ctx.onNight(on);
  };

  // ---------------- 計算：遮るものの一覧 ----------------
  const SKIP = new Set(['glass', 'lotline', 'north', 'stakecap']);
  function occluders(key) {
    const list = [];
    const add = (root) => root && root.traverse((m) => {
      if (!m.isMesh || m.userData.noOcc || (m.material && SKIP.has(m.material.name))) return;
      if (!m.geometry.boundsTree) m.geometry.computeBoundsTree();
      list.push(m);
    });
    add(models[key]); add(furn); add(interior);
    if (nbr.visible) add(nbr);
    if (site.visible) add(site);
    return list;
  }
  const ray = new THREE.Raycaster(); ray.firstHitOnly = true;
  function blocked(list, from, to) {
    const d = to.clone().sub(from), L = d.length();
    ray.set(from, d.multiplyScalar(1 / L)); ray.near = 0; ray.far = L - 0.03;
    return ray.intersectObjects(list, false).length > 0;
  }
  const W = (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(rig.matrixWorld);

  // リビング（吹抜けの下）の点：床と、座った人の顔の高さ
  const LIV = { x0: PX(592) + 0.15, x1: PX(955.5) - 0.15, z0: PZ(364) + 0.15, z1: PZ(637) - 0.2 };
  ext.seeInside = async (eye, h) => {
    const key = ctx.state.v + '_' + h; await ctx.loadModel(key);
    rig.updateMatrixWorld(true);
    const list = occluders(key);
    const E = W(...eye); let nf = 0, vf = 0, nh = 0, vh = 0;
    for (let x = LIV.x0; x <= LIV.x1; x += 0.25) for (let z = LIV.z0; z <= LIV.z1; z += 0.25) {
      nf++; if (!blocked(list, E, W(x, FL1 + 0.02, z))) vf++;
      nh++; if (!blocked(list, E, W(x, FL1 + 1.1, z))) vh++;
    }
    return { floor: vf / nf, head: vh / nh };
  };

  // 日だまり：LDK＋和室の床の点（20cm 間隔）に、太陽の方向から光が届くか
  const floorPts = {};
  function floorSamples(key) {
    if (floorPts[key]) return floorPts[key];
    const list = []; models[key].traverse((m) => { if (m.isMesh && ['floor', 'tatami'].includes(m.material.name)) { if (!m.geometry.boundsTree) m.geometry.computeBoundsTree(); list.push(m); } });
    rig.updateMatrixWorld(true);
    const inv = rig.matrixWorld.clone().invert(), down = new THREE.Vector3(0, -1, 0).transformDirection(rig.matrixWorld), pts = [];
    for (let x = PX(273) + 0.1; x < PX(955.5) - 0.05; x += 0.2) for (let z = PZ(0) + 0.1; z < PZ(637) - 0.05; z += 0.2) {
      if (x < PX(318) && z > PZ(364)) continue;
      ray.set(W(x, FL1 + 1.0, z), down); ray.near = 0; ray.far = 2;
      const hit = ray.intersectObjects(list, false)[0];
      if (hit && hit.point.clone().applyMatrix4(inv).y < FL1 + 0.35) pts.push(hit.point.clone().applyMatrix4(inv).add(new THREE.Vector3(0, 0.01, 0)));
    }
    return (floorPts[key] = pts);
  }
  ext.sunArea = (key, sunDirModel) => {
    if (!models[key] || sunDirModel.y <= 0.01) return 0;
    rig.updateMatrixWorld(true);
    const list = occluders(key);
    const pts = floorSamples(key), dir = sunDirModel.clone().transformDirection(rig.matrixWorld);
    let lit = 0;
    for (const p of pts) { ray.set(W(p.x, p.y, p.z), dir); ray.near = 0.001; ray.far = 80; if (ray.intersectObjects(list, false).length === 0) lit++; }
    return lit * 0.04;
  };
  ext.invalidate = () => {};   // 置き換え可能なフック

  // ---------------- Quest：レーザー・メジャー・瞬間移動 ----------------
  const laserM = new THREE.LineBasicMaterial({ color: 0xffb27a });
  const laser = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]), laserM);
  laser.visible = false;
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.08, 0.11, 32), new THREE.MeshBasicMaterial({ color: 0xffb27a, depthTest: false, transparent: true }));
  ring.rotation.x = -Math.PI / 2; ring.renderOrder = 998; ring.visible = false; scene.add(ring);
  const measure = new THREE.Group(); rig.add(measure);
  let mA = null, mLabel = null;
  const xr = { aimHit: null, teleporting: false };
  function aim(ctrl) {
    const o = new THREE.Vector3(), q = new THREE.Quaternion();
    ctrl.getWorldPosition(o); ctrl.getWorldQuaternion(q);
    const d = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
    const list = occluders(ctx.curKey()).filter((m) => m.visible);
    if (ctx.ground.visible) list.push(ctx.ground);
    ray.set(o, d); ray.near = 0; ray.far = 40;
    const hit = ray.intersectObjects(list, false)[0];
    return hit || null;
  }
  ext.xrFrame = (ctrl, teleportHeld) => {
    if (!ctrl) { laser.visible = ring.visible = false; return; }
    if (laser.parent !== ctrl) ctrl.add(laser);
    const hit = aim(ctrl); xr.aimHit = hit;
    laser.visible = true;
    laser.scale.z = hit ? hit.distance : 3;
    laserM.color.set(teleportHeld ? 0x6fe39a : 0xffb27a);
    ring.material.color.set(teleportHeld ? 0x6fe39a : 0xffb27a);
    if (hit) { ring.visible = true; ring.position.copy(hit.point).add(new THREE.Vector3(0, 0.01, 0)); } else ring.visible = false;
  };
  function labelSprite(text) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 96;
    const g = c.getContext('2d'); g.fillStyle = 'rgba(20,22,24,0.85)'; g.beginPath(); g.roundRect(0, 0, 256, 96, 20); g.fill();
    g.fillStyle = '#fff'; g.font = 'bold 56px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 128, 50);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false })); s.scale.set(0.24, 0.09, 1); s.renderOrder = 999; return s;
  }
  // 右トリガー：1回目＝始点、2回目＝終点（長さを表示）、3回目＝消して新しく始める
  ext.measureClick = () => {
    const hit = xr.aimHit; if (!hit) return null;
    rig.updateMatrixWorld(true);
    const p = rig.worldToLocal(hit.point.clone());
    const dot = (v) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.015, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffb27a, depthTest: false })); m.renderOrder = 998; m.position.copy(v); return m; };
    if (!mA || mLabel) { measure.clear(); mA = p; mLabel = null; measure.add(dot(p)); return null; }
    const L = mA.distanceTo(p);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([mA, p]), new THREE.LineBasicMaterial({ color: 0xffb27a, depthTest: false })); line.renderOrder = 998;
    mLabel = labelSprite(L.toFixed(2) + ' m'); mLabel.position.copy(mA).add(p).multiplyScalar(0.5).add(new THREE.Vector3(0, 0.08, 0));
    measure.add(dot(p), line, mLabel);
    return L;
  };
  ext.clearMeasure = () => { measure.clear(); mA = null; mLabel = null; };
  // 右グリップを離したところへ移動。指した面が足元（現実の床）に来るようにする
  ext.teleport = (headPos) => {
    const hit = xr.aimHit; if (!hit) return false;
    rig.position.x += headPos.x - hit.point.x; rig.position.z += headPos.z - hit.point.z;
    rig.position.y -= hit.point.y;   // 現実の床 y=0 に合わせる
    return true;
  };

  // ---------------- 比較画像（3案 × 窓の高さ 3 種） ----------------
  ext.makeSheet = async (vp, title) => {
    const CW = 640, CH = 480, HEAD = 70, LBL = 34;
    const sheet = document.createElement('canvas'); sheet.width = CW * 3; sheet.height = HEAD + (CH + LBL) * 3;
    const g = sheet.getContext('2d');
    g.fillStyle = '#f4f2ee'; g.fillRect(0, 0, sheet.width, sheet.height);
    g.fillStyle = '#22262a'; g.font = 'bold 30px sans-serif'; g.fillText(title, 20, 45);
    const old = { v: ctx.state.v, h: ctx.state.h, size: renderer.getSize(new THREE.Vector2()), pr: renderer.getPixelRatio(), pos: camera.position.clone(), q: camera.quaternion.clone(), fov: camera.fov, aspect: camera.aspect };
    renderer.setPixelRatio(1); renderer.setSize(CW, CH, false); ctx.composer.setPixelRatio(1); ctx.composer.setSize(CW, CH);
    camera.aspect = CW / CH; camera.fov = 70; camera.updateProjectionMatrix();
    camera.position.set(...vp.eye); camera.rotation.set(vp.pitch, vp.yaw, 0, 'YXZ');
    const VN = { A: 'A 低いFIX×2', B: 'B 少し上のFIX×2', C: 'C 横長FIX' };
    let row = 0;
    for (const v of ['A', 'B', 'C']) {
      let col = 0;
      for (const h of ['20', '22', '24']) {
        const key = v + '_' + h; await ctx.loadModel(key);
        for (const k in models) models[k].visible = k === key;
        ext.setCurtain(null, +h / 10);
        ctx.render();
        const x = col * CW, y = HEAD + row * (CH + LBL);
        g.drawImage(renderer.domElement, 0, 0, CW, CH, x, y + LBL, CW, CH);
        g.fillStyle = '#22262a'; g.font = 'bold 22px sans-serif'; g.fillText(`${VN[v]}　／　リビングの窓 ${(+h / 10).toFixed(1)}m`, x + 12, y + 25);
        col++;
      }
      row++;
    }
    // 元に戻す
    renderer.setPixelRatio(old.pr); renderer.setSize(old.size.x, old.size.y); ctx.composer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); ctx.composer.setSize(old.size.x, old.size.y);
    camera.position.copy(old.pos); camera.quaternion.copy(old.q); camera.fov = old.fov; camera.aspect = old.aspect; camera.updateProjectionMatrix();
    for (const k in models) models[k].visible = k === old.v + '_' + old.h;
    ext.setCurtain(null, +old.h / 10);
    return sheet;
  };

  return ext;
}
