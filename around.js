// 敷地の周り（家・塀・生け垣・木・電柱）を around_data.js から組み立てる。
// 座標はモデル座標（m）：X＝東、Z＝南、Y＝設計GLからの高さ。平面図 m → モデル m は X = x − 4.7775、Z = y − 4.095。
// 返すのは 2 つのグループ：south（「南側の隣地の低さ」の分だけ下げる）と fixed（そのまま）。
import * as THREE from 'three';
import { AROUND } from './around_data.js';

const MX = (x) => x - 4.7775, MZ = (y) => y - 4.095;

function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// 同じ色の面を 1 つのメッシュにまとめる（Quest で軽くするため）
class Batch {
  constructor() { this.m = new Map(); }
  tri(key, a, b, c) { let p = this.m.get(key); if (!p) this.m.set(key, p = []); p.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]); }
  quad(key, a, b, c, d) { this.tri(key, a, b, c); this.tri(key, a, c, d); }
  // 軸に平行でない箱：底面の 4 点（反時計・時計どちらでも）と高さ
  prism(key, pts, y0, y1) {
    const n = pts.length;
    for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; this.quad(key, [p[0], y0, p[1]], [q[0], y0, q[1]], [q[0], y1, q[1]], [p[0], y1, p[1]]); }
    for (let i = 1; i < n - 1; i++) this.tri(key, [pts[0][0], y1, pts[0][1]], [pts[i][0], y1, pts[i][1]], [pts[i + 1][0], y1, pts[i + 1][1]]);
  }
  blob(key, c, r, sy, rand) {   // ごつごつした球（木の葉のかたまり）
    const g = new THREE.IcosahedronGeometry(1, 1).toNonIndexed(), p = g.attributes.position;
    const jit = new Map();
    for (let i = 0; i < p.count; i += 3) {
      const v = [0, 1, 2].map((k) => {
        const x = p.getX(i + k), y = p.getY(i + k), z = p.getZ(i + k), id = x.toFixed(2) + y.toFixed(2) + z.toFixed(2);
        if (!jit.has(id)) jit.set(id, 0.82 + rand() * 0.36);
        const s = jit.get(id); return [c[0] + x * r * s, c[1] + y * r * sy * s, c[2] + z * r * s];
      });
      this.tri(key, v[0], v[1], v[2]);
    }
  }
  meshes(matOf) {
    const out = [];
    for (const [key, arr] of this.m) {
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); g.computeVertexNormals();
      const m = new THREE.Mesh(g, matOf(key)); m.castShadow = true; m.receiveShadow = true; out.push(m);
    }
    return out;
  }
}

function roofTris(B, key, c, ev, rg, kind, over) {
  // 軒先の輪郭（壁から over だけ外へ）
  const n = c.length, ctr = [c.reduce((a, p) => a + p[0], 0) / n, c.reduce((a, p) => a + p[1], 0) / n];
  const oc = c.map((p, i) => {
    const a = c[(i + n - 1) % n], b = c[(i + 1) % n];
    const e1 = [p[0] - a[0], p[1] - a[1]], e2 = [p[0] - b[0], p[1] - b[1]], l1 = Math.hypot(...e1), l2 = Math.hypot(...e2);
    return [p[0] + (e1[0] / l1 + e2[0] / l2) * over, p[1] + (e1[1] / l1 + e2[1] / l2) * over];
  });
  const P = (q, y) => [q[0], y, q[1]];
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const e01 = Math.hypot(oc[1][0] - oc[0][0], oc[1][1] - oc[0][1]), e12 = Math.hypot(oc[2][0] - oc[1][0], oc[2][1] - oc[1][1]);
  const long01 = e01 >= e12;
  if (kind === 'hip' || kind === 'gable-l') {
    // 棟は長い辺と平行。m0・m1 は短い辺の中点
    const m0 = long01 ? mid(oc[0], oc[3]) : mid(oc[0], oc[1]), m1 = long01 ? mid(oc[1], oc[2]) : mid(oc[3], oc[2]);
    const half = (long01 ? e12 : e01) / 2, L = Math.hypot(m1[0] - m0[0], m1[1] - m0[1]), d = [(m1[0] - m0[0]) / L, (m1[1] - m0[1]) / L];
    const inset = kind === 'hip' ? Math.min(half, L / 2) : 0;
    const r0 = [m0[0] + d[0] * inset, m0[1] + d[1] * inset], r1 = [m1[0] - d[0] * inset, m1[1] - d[1] * inset];
    const [a0, a1, b0, b1] = long01 ? [oc[0], oc[3], oc[1], oc[2]] : [oc[0], oc[1], oc[3], oc[2]];   // a* は m0 側の 2 点、b* は m1 側
    B.quad(key, P(a0, ev), P(b0, ev), P(r1, rg), P(r0, rg)); B.quad(key, P(b1, ev), P(a1, ev), P(r0, rg), P(r1, rg));
    if (kind === 'hip') { B.tri(key, P(a1, ev), P(a0, ev), P(r0, rg)); B.tri(key, P(b0, ev), P(b1, ev), P(r1, rg)); }
    return kind === 'gable-l' ? [[a0, a1, r0], [b0, b1, r1]] : [];
  }
  // 片流れ：shed-e は東（辺 1-2）が高い、shed-s は南（辺 2-3）が高い
  const hi = kind === 'shed-e' ? [1, 2] : [2, 3];
  const y = (i) => (hi.includes(i) ? rg : ev);
  B.quad(key, P(oc[0], y(0)), P(oc[1], y(1)), P(oc[2], y(2)), P(oc[3], y(3)));
  return [];
}

export function buildAround({ nightMats = [] } = {}) {
  const south = new THREE.Group(), fixed = new THREE.Group();
  south.userData.south = true; south.userData.name = '周り（南側）'; fixed.userData.name = '周り';
  const grp = (o) => (o.g === 'S' ? south : fixed);
  const mats = new Map();
  const mat = (key) => {
    if (!mats.has(key)) {
      const [kind, col] = key.split('|');
      const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(col), roughness: kind === 'roof' ? 0.8 : kind === 'leaf' ? 1 : 0.9, side: kind === 'roof' ? THREE.DoubleSide : THREE.FrontSide, flatShading: kind === 'leaf' });
      if (kind !== 'roof') m.side = THREE.DoubleSide;
      mats.set(key, m);
    }
    return mats.get(key);
  };
  const glassM = new THREE.MeshStandardMaterial({ color: 0x2b343b, roughness: 0.25, metalness: 0.1, emissive: 0xffcf8f, emissiveIntensity: 0, side: THREE.DoubleSide });
  const darkGlassM = new THREE.MeshStandardMaterial({ color: 0x2b343b, roughness: 0.25, metalness: 0.1, side: THREE.DoubleSide });
  nightMats.push(glassM);
  const BS = new Batch(), BF = new Batch(), bat = (o) => (o.g === 'S' ? BS : BF);
  const A = AROUND;

  // ---- 家 ----
  A.bld.forEach((o, idx) => {
    const B = bat(o), c = o.c.map(([x, y]) => [MX(x), MZ(y)]), n = c.length;
    const b = o.base || 0, ev = b + o.eave, rg = b + o.ridge;
    B.prism('wall|' + o.wall, c, b - 1.2, ev);
    // 基礎の帯
    if (!o.far) for (let i = 0; i < n; i++) {
      const p = c[i], q = c[(i + 1) % n], L = Math.hypot(q[0] - p[0], q[1] - p[1]), nx = (q[1] - p[1]) / L, nz = -(q[0] - p[0]) / L;
      const cx = c.reduce((a, v) => a + v[0], 0) / n, cz = c.reduce((a, v) => a + v[1], 0) / n;
      const s = ((p[0] + q[0]) / 2 - cx) * nx + ((p[1] + q[1]) / 2 - cz) * nz > 0 ? 1 : -1, e = 0.012 * s;
      B.quad('wall|#9a9791', [p[0] + nx * e, b - 1.2, p[1] + nz * e], [q[0] + nx * e, b - 1.2, q[1] + nz * e], [q[0] + nx * e, b + 0.4, q[1] + nz * e], [p[0] + nx * e, b + 0.4, p[1] + nz * e]);
      if (o.belt) B.quad('wall|' + o.belt, [p[0] + nx * e, b + 2.75, p[1] + nz * e], [q[0] + nx * e, b + 2.75, q[1] + nz * e], [q[0] + nx * e, b + 3.0, q[1] + nz * e], [p[0] + nx * e, b + 3.0, p[1] + nz * e]);
    }
    const gables = roofTris(B, 'roof|' + o.roofc, c, ev, rg, o.roof, o.over || 0.4);
    for (const [a, bb, r] of gables) B.tri('wall|' + o.wall, [a[0], ev, a[1]], [bb[0], ev, bb[1]], [r[0], rg, r[1]]);
    // 窓（壁から 3cm 浮かせた枠とガラス）
    const cx = c.reduce((a, v) => a + v[0], 0) / n, cz = c.reduce((a, v) => a + v[1], 0) / n;
    (o.wins || []).forEach((w, wi) => {
      const p = c[w.e], q = c[(w.e + 1) % n], L = Math.hypot(q[0] - p[0], q[1] - p[1]), d = [(q[0] - p[0]) / L, (q[1] - p[1]) / L];
      let nx = d[1], nz = -d[0]; if (((p[0] + q[0]) / 2 - cx) * nx + ((p[1] + q[1]) / 2 - cz) * nz < 0) { nx = -nx; nz = -nz; }
      const at = (u, y, off) => [p[0] + d[0] * u + nx * off, b + y, p[1] + d[1] * u + nz * off];
      const f = 0.05;
      B.quad('wall|' + (w.col || '#e6e6e2'), at(w.u0 - f, w.z0 - f, 0.03), at(w.u1 + f, w.z0 - f, 0.03), at(w.u1 + f, w.z1 + f, 0.03), at(w.u0 - f, w.z1 + f, 0.03));
      const lit = (idx * 7 + wi * 3) % 5 < 2;
      const g = new THREE.BufferGeometry();
      const v = [at(w.u0, w.z0, 0.045), at(w.u1, w.z0, 0.045), at(w.u1, w.z1, 0.045), at(w.u0, w.z1, 0.045)];
      g.setAttribute('position', new THREE.Float32BufferAttribute([...v[0], ...v[1], ...v[2], ...v[0], ...v[2], ...v[3]], 3)); g.computeVertexNormals();
      grp(o).add(new THREE.Mesh(g, w.col ? mat('wall|' + w.col) : (lit ? glassM : darkGlassM)));
      if (w.grille) for (let u = w.u0 + 0.1; u < w.u1; u += 0.13) B.quad('wall|#f2f2ee', at(u - 0.012, w.z0, 0.09), at(u + 0.012, w.z0, 0.09), at(u + 0.012, w.z1, 0.09), at(u - 0.012, w.z1, 0.09));
      if (w.shutter) B.quad('wall|#5b4a40', at(w.u0 - f, w.z1 + f, 0.1), at(w.u1 + f, w.z1 + f, 0.1), at(w.u1 + f, w.z1 + 0.3, 0.1), at(w.u0 - f, w.z1 + 0.3, 0.1));
    });
  });

  // ---- 塀・フェンス ----
  const railM = new THREE.MeshStandardMaterial({ color: 0x2c2b2a, roughness: 0.6, metalness: 0.3 });
  const panelM = new THREE.MeshBasicMaterial({ color: 0x2c2b2a, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false });
  for (const o of A.wall) {
    const a = [MX(o.a[0]), MZ(o.a[1])], e = [MX(o.b[0]), MZ(o.b[1])], L = Math.hypot(e[0] - a[0], e[1] - a[1]);
    const d = [(e[0] - a[0]) / L, (e[1] - a[1]) / L], nx = d[1] * o.t / 2, nz = -d[0] * o.t / 2;
    bat(o).prism('wall|' + o.col, [[a[0] + nx, a[1] + nz], [e[0] + nx, e[1] + nz], [e[0] - nx, e[1] - nz], [a[0] - nx, a[1] - nz]], o.z0 - 0.6, o.z1);
    if (o.fence) {
      const seg = new THREE.Group(); seg.position.set(a[0], 0, a[1]); seg.rotation.y = Math.atan2(-d[1], d[0]);
      const box = (x0, x1, y0, y1, t) => { const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, t), railM); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0); m.castShadow = true; return m; };
      seg.add(box(0, L, o.fence - 0.03, o.fence, 0.03), box(0, L, o.z1 + 0.04, o.z1 + 0.06, 0.02));
      for (let s = 0; s <= L + 1e-6; s += L / Math.max(1, Math.round(L / 2))) seg.add(box(s - 0.02, s + 0.02, o.z1, o.fence, 0.04));
      if (o.lattice) for (let s = 0.12; s < L; s += 0.12) seg.add(box(s - 0.008, s + 0.008, o.z1 + 0.06, o.fence - 0.03, 0.016));
      else { const pn = new THREE.Mesh(new THREE.PlaneGeometry(L, o.fence - o.z1 - 0.09), panelM); pn.position.set(L / 2, (o.fence + o.z1) / 2, 0); pn.userData.noOcc = true; seg.add(pn); }
      grp(o).add(seg);
    }
  }

  // ---- 生け垣 ----
  for (const o of A.hedge) {
    const c = o.c.map(([x, y]) => [MX(x), MZ(y)]); bat(o).prism('leaf|' + o.col, c, o.z0, o.z1 - 0.25);
    // 上をでこぼこにする
    const r = rng(77 + Math.round(c[0][0] * 10)), x0 = Math.min(...c.map((p) => p[0])), x1 = Math.max(...c.map((p) => p[0])), z0 = Math.min(...c.map((p) => p[1])), z1 = Math.max(...c.map((p) => p[1]));
    const step = 1.1;
    for (let x = x0 + 0.5; x < x1; x += step) for (let z = z0 + 0.5; z < z1; z += step) bat(o).blob('leaf|' + o.col, [x + (r() - 0.5) * 0.4, o.z1 - 0.5 + r() * 0.25, z + (r() - 0.5) * 0.4], 0.7, 0.6, r);
  }

  // ---- 木 ----
  const LEAF = { ever: ['#1f3a26', '#27462c', '#1b3120'], shrub: ['#27402a', '#2f4a2c', '#39542d', '#4a5c30'], round: ['#243f26', '#2b4a2a'], olive: ['#6f7f6a', '#7d8b76', '#62735e'], pollard: ['#6a6440', '#74583a', '#5f5a3c'], bare: ['#6b5d50'] };
  A.tree.forEach((o, i) => {
    const B = bat(o), r = rng(500 + i * 13), x = MX(o.p[0]), z = MZ(o.p[1]), b = o.base || 0, h = o.h, R = o.r, cols = LEAF[o.kind] || LEAF.ever;
    const col = () => 'leaf|' + cols[Math.floor(r() * cols.length)];
    const tw = o.kind === 'pollard' ? 0.22 : o.kind === 'olive' ? 0.12 : 0.06;
    if (!['shrub', 'round'].includes(o.kind)) B.prism('wall|#5d4a3c', [[x - tw, z - tw], [x + tw, z - tw], [x + tw, z + tw], [x - tw, z + tw]], b, b + h * (o.kind === 'bare' ? 0.95 : 0.7));
    if (o.kind === 'shrub') { B.blob(col(), [x, b + h * 0.45, z], R, h * 0.5 / R, r); B.blob(col(), [x + (r() - 0.5) * 0.3, b + h - R * 0.7, z + (r() - 0.5) * 0.3], R * 0.8, 1, r); }
    else if (o.kind === 'round') B.blob(col(), [x, b + h * 0.55, z], R, h * 0.5 / R, r);
    else if (o.kind === 'bare') { for (let k = 0; k < 5; k++) { const a = r() * 6.28, d = R * (0.3 + r() * 0.6); B.blob(col(), [x + Math.cos(a) * d, b + h * (0.6 + r() * 0.35), z + Math.sin(a) * d], 0.18, 2.2, r); } }
    else {
      if (o.kind === 'pollard') {   // 大きなケヤキ：太い幹の上に、葉のかたまりがまばらに付く（晩秋）
        for (let k = 0; k < 13; k++) {
          const t = r(), a = k * 2.4 + r(), yy = b + h * (0.5 + 0.45 * t), d = R * (0.15 + 0.75 * r()) * Math.sin((0.15 + 0.8 * t) * Math.PI);
          B.blob(col(), [x + Math.cos(a) * d, Math.min(yy, b + h - 0.8), z + Math.sin(a) * d], 0.9 + r() * 0.6, 0.75, r);
        }
      } else if (o.kind === 'olive') {   // 細かい葉のかたまりを散らす（枝ぶりが透けて見える木）
        for (let k = 0; k < 26; k++) {
          const t = r(), a = r() * 6.28, yy = b + h * (0.42 + 0.58 * t), d = R * Math.sqrt(r()) * (0.35 + 0.65 * Math.sin((0.15 + 0.85 * t) * Math.PI));
          B.blob(col(), [x + Math.cos(a) * d, Math.min(yy, b + h - 0.35), z + Math.sin(a) * d], 0.45 + r() * 0.3, 0.8, r);
        }
      } else {
        const low = o.kind === 'ever' ? 0.25 : 0.45, nb = o.kind === 'pollard' ? 9 : 8;
        for (let k = 0; k < nb; k++) {
          const t = k / (nb - 1), a = r() * 6.28, yy = b + h * (low + (1 - low) * t) - R * 0.35;
          const rr = R * (o.kind === 'ever' ? 0.9 - 0.45 * t : 0.55 + 0.3 * Math.sin(t * Math.PI)), d = R * 0.45 * (1 - t) * r();
          B.blob(col(), [x + Math.cos(a) * d, yy, z + Math.sin(a) * d], rr, 0.9, r);
        }
      }
    }
  });

  // ---- 高くなっている地面・電柱・物干し ----
  for (const o of A.ground) {
    const c = o.c.map(([x, y]) => [MX(x), MZ(y)]);
    bat(o).prism('wall|' + (o.mat === 'conc' ? '#b9b5ad' : o.mat === 'weed' ? '#9d9066' : '#8d8371'), c, -0.4, o.z);
  }
  for (const o of A.pole) { const x = MX(o.p[0]), z = MZ(o.p[1]), t = 0.14; bat(o).prism('wall|#8b8880', [[x - t, z - t], [x + t, z - t], [x + t, z + t], [x - t, z + t]], -0.6, o.h); }
  for (const o of A.frame) {
    const g = new THREE.Group(); g.position.set(MX(o.p[0]), 0, MZ(o.p[1])); g.rotation.y = -o.ang * Math.PI / 180;
    const pm = new THREE.MeshStandardMaterial({ color: 0xd8dadb, roughness: 0.4, metalness: 0.6 });
    const pipe = (x0, y0, z0, x1, y1, z1) => { const L = Math.hypot(x1 - x0, y1 - y0, z1 - z0), m = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, L, 8), pm); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(x1 - x0, y1 - y0, z1 - z0).normalize()); m.castShadow = true; return m; };
    for (const sx of [-o.w / 2, 0, o.w / 2]) g.add(pipe(sx, 0, -o.d / 2, sx, o.h, 0), pipe(sx, 0, o.d / 2, sx, o.h, 0));
    g.add(pipe(-o.w / 2, o.h, 0, o.w / 2, o.h, 0)); grp(o).add(g);
  }

  south.add(...BS.meshes(mat)); fixed.add(...BF.meshes(mat));
  return { south, fixed };
}
