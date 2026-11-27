// 暮らしの動きのシミュレーション（11/27）。家族5人が平日の朝・夜にどこをどう歩くかを、3D の中で再生する。
// 位置は平面図の cm（原点＝建物の北西の角）、高さ h は 1階の床からの m。u.html の window._dbg を使う。
// 時間割は 11/27 に六嶋さんから聞いた平日の流れ。聞いていない所（子どもの起床・お風呂の時刻など）は推測で入れてあり、画面に【推測】と出す。
import * as THREE from 'three';

const PX = (x) => (x - 477.75) / 100, PZ = (y) => (y - 409.5) / 100;
const FL2 = 3.0;

// ---- 歩ける所（点）と、つながり（線）----
const N = {
  // 外・玄関
  road: [140, -110, -0.59, '北の道路'], bike: [470, -75, -0.59, '自転車置き場（北）'], porch_o: [60, -30, -0.59, 'ポーチの外'],
  porch: [95, 70, -0.35, 'ポーチ'], genkan: [95, 185, -0.12, '玄関'], shoecl: [245, 110, -0.12, 'シューズクローク'],
  // 1階
  hall_n: [110, 280, 0, 'ホール'], hall_m: [110, 390, 0, 'ホール'], tearai: [100, 407, 0, '手洗い'], hall_s: [180, 500, 0, 'ホール'],
  toil1_d: [125, 500, 0, '1階トイレの前'], toil1: [75, 500, 0, '1階トイレ'], under: [180, 590, 0, '階段下'], shosai: [110, 720, 0, '書斎'],
  ldk_door: [235, 305, 0, 'LDK の入口'], ldk_w: [290, 320, 0, 'LDK'], ldk_c: [600, 320, 0, 'LDK'],
  isl_w: [385, 205, 0, 'ダイニング'], aisle_w: [450, 115, 0, 'キッチン'], kitchen: [720, 115, 0, 'キッチン'], fridge: [905, 115, 0, '冷蔵庫'],
  dining: [500, 300, 0, 'ダイニング'], sofa: [700, 515, 0, 'ソファ'], washitsu_e: [600, 470, 0, 'リビング'], washitsu: [470, 500, 0.24, '和室'],
  // 階段（東の列を南へ → 回り段 → 西の列を北へ）
  stair_b: [273, 362, 0, '階段'], s8: [273, 540, 1.5, '階段'], w1: [273, 600, 1.9, '階段'], w2: [180, 600, 2.3, '階段'], s13: [182, 548, 2.65, '階段'],
  // 2階
  top: [182, 495, FL2, '2階の廊下'], c1: [182, 410, FL2, '2階の廊下'], c2: [182, 320, FL2, '2階の廊下'], c3: [280, 320, FL2, '2階の廊下'],
  c4: [455, 320, FL2, '2階の廊下'], c5: [640, 320, FL2, '2階の廊下'],
  senmen_o: [150, 320, FL2, '洗面所'], senmen: [85, 282, FL2, '洗面所'], datsui_d: [135, 195, FL2, '脱衣所'], datsui: [135, 110, FL2, '脱衣所'],
  bath_d: [185, 140, FL2, '浴室の入口'], bath: [250, 95, FL2, '浴室'],
  toil2_d: [278, 285, FL2, '2階トイレの前'], toil2: [335, 227, FL2, '2階トイレ'],
  yo2_d: [455, 280, FL2, '洋室2'], yo2: [520, 160, FL2, '洋室2'], yo2_chest: [550, 200, FL2, '洋室2（子どもの服）'],
  yo3_d: [690, 316, FL2, '洋室3'], yo3: [710, 200, FL2, '洋室3（寝室）'],
  bed1: [755, 65, FL2 + 0.45, '洋室3（寝室）'], bed2: [755, 170, FL2 + 0.45, '洋室3（寝室）'], bed3: [755, 275, FL2 + 0.45, '洋室3（寝室）'],   // 足元の位置（まくらは東）
  yo1_d: [360, 350, FL2, '洋室1'], yo1: [450, 470, FL2, '洋室1'],
  laundry_d: [140, 500, FL2, 'ランドリー'], laundry: [100, 420, FL2, 'ランドリー'], wic_d: [95, 560, FL2, 'WIC'], wic: [90, 700, FL2, 'WIC'],
};
const E = `road-porch_o porch_o-porch bike-porch_o bike-road porch-genkan genkan-shoecl genkan-hall_n hall_n-hall_m hall_m-tearai hall_m-hall_s
  hall_s-toil1_d toil1_d-toil1 hall_s-under under-shosai hall_n-ldk_door ldk_door-ldk_w ldk_w-stair_b ldk_w-ldk_c ldk_w-isl_w isl_w-aisle_w
  aisle_w-kitchen kitchen-fridge isl_w-dining ldk_c-dining ldk_c-sofa ldk_c-washitsu_e washitsu_e-washitsu washitsu_e-sofa
  stair_b-s8 s8-w1 w1-w2 w2-s13 s13-top top-c1 c1-c2 c2-senmen_o senmen_o-senmen senmen-datsui_d datsui_d-datsui datsui-bath_d bath_d-bath
  c2-c3 c3-toil2_d toil2_d-toil2 c3-c4 c4-yo2_d yo2_d-yo2 yo2-yo2_chest c4-c5 c5-yo3_d yo3_d-yo3 yo3-bed1 yo3-bed2 yo3-bed3
  c3-yo1_d yo1_d-yo1 top-laundry_d laundry_d-laundry laundry-wic_d wic_d-wic`.trim().split(/\s+/).map((e) => e.split('-'));
const STAIR = new Set(['stair_b', 's8', 'w1', 'w2', 's13', 'top']);
const SMALL = { toil1: '1階トイレ', toil2: '2階トイレ', senmen: '2階の洗面所', datsui: '脱衣所', bath: '浴室', tearai: '1階の手洗い', genkan: '玄関', shoecl: 'シューズクローク' };
const ADJ = {};
const dist3 = (a, b) => { const p = N[a], q = N[b]; return Math.hypot((p[0] - q[0]) / 100, (p[1] - q[1]) / 100, (p[2] - q[2]) * 1.5); };
for (const [a, b] of E) { (ADJ[a] ||= []).push(b); (ADJ[b] ||= []).push(a); }
function route(a, b) {   // いちばん短い道（ダイクストラ）
  if (a === b) return [a];
  const D = { [a]: 0 }, P = {}, open = new Set([a]);
  while (open.size) {
    let u = null; for (const k of open) if (u === null || D[k] < D[u]) u = k;
    open.delete(u); if (u === b) break;
    for (const v of ADJ[u] || []) { const nd = D[u] + dist3(u, v); if (D[v] === undefined || nd < D[v]) { D[v] = nd; P[v] = u; open.add(v); } }
  }
  const r = [b]; while (r[0] !== a) { const p = P[r[0]]; if (!p) return [a, b]; r.unshift(p); }
  return r;
}

// ---- 家族と時間割 ----
// 時間割の1行：[出発する時刻, 行き先, していること, いっしょに動く組（同じ組なら同じ部屋にいても混雑にしない）]
// 行き先 'mom' は「お母さんに抱っこ」
const PEOPLE = [
  { id: 'papa', name: '父（31）', col: 0x3f6fb0, h: 1.72, v: 1.15 },
  { id: 'mama', name: '母（32）', col: 0xd05a5a, h: 1.60, v: 1.1 },
  { id: 'k1', name: '上の子（4）', col: 0xe89a20, h: 1.03, v: 0.85 },
  { id: 'k2', name: '下の子（2）', col: 0x4aa060, h: 0.86, v: 0.7 },
  { id: 'baby', name: '赤ちゃん（0）', col: 0xe880b0, h: 0.6, v: 1.1, baby: true },
];
const SCEN = {
  am: {
    name: '平日の朝（6:00〜8:45）', t0: '06:00', t1: '08:45',
    papa: [['06:00', 'bed3', '寝ている'], ['06:40', 'toil2', 'トイレ'], ['06:44', 'senmen', '歯みがき・ひげそり'], ['06:53', 'wic', '着替え'], ['07:01', 'dining', '朝ごはん', 'eat'],
      ['07:18', 'toil1', 'トイレ'], ['07:22', 'shoecl', '靴・かばん'], ['07:26', 'genkan', 'いってきます'], ['07:28', 'road', '出発（駅へ）']],
    mama: [['06:00', 'bed2', '寝ている'], ['06:05', 'toil2', 'トイレ'], ['06:09', 'senmen', '洗顔'], ['06:15', 'wic', '着替え'], ['06:21', 'laundry', '洗濯機を回す'],
      ['06:25', 'kitchen', '朝ごはんの準備'], ['06:37', 'yo3', '子どもを起こす', 'wake'], ['06:42', 'toil2', '上の子のトイレに付きそう', 'k1t'], ['06:47', 'kitchen', '朝ごはんの仕上げ'],
      ['07:02', 'dining', '子どもと朝ごはん', 'eat'], ['07:30', 'kitchen', '片付け'], ['07:55', 'yo2_chest', '子どもの着替え', 'dress'], ['08:07', 'senmen', '子どもの歯みがき', 'teeth'],
      ['08:15', 'shoecl', 'くつ・帽子・かばん', 'shoes'], ['08:24', 'bike', '自転車に乗せる', 'bike'], ['08:30', 'road', '幼稚園へ出発', 'bike']],
    k1: [['06:00', 'bed1', '寝ている'], ['06:39', 'yo3', '起きる', 'wake'], ['06:42', 'toil2', 'トイレ', 'k1t'], ['06:47', 'washitsu', '和室で遊ぶ', 'kplay'], ['07:02', 'dining', '朝ごはん', 'eat'],
      ['07:30', 'washitsu', '和室で遊ぶ', 'kplay'], ['07:55', 'yo2_chest', '着替え', 'dress'], ['08:07', 'senmen', '歯みがき', 'teeth'], ['08:12', 'toil1', 'トイレ'], ['08:16', 'shoecl', 'くつをはく', 'shoes'],
      ['08:24', 'bike', '自転車', 'bike'], ['08:30', 'road', '幼稚園へ', 'bike']],
    k2: [['06:00', 'bed1', '寝ている'], ['06:39', 'yo3', '起きる', 'wake'], ['06:44', 'washitsu', '和室で遊ぶ', 'kplay'], ['07:02', 'dining', '朝ごはん', 'eat'], ['07:30', 'washitsu', '和室で遊ぶ', 'kplay'],
      ['07:55', 'yo2_chest', '着替え・おむつ', 'dress'], ['08:07', 'senmen', '歯みがき', 'teeth'], ['08:16', 'shoecl', 'くつをはく', 'shoes'], ['08:24', 'bike', '自転車', 'bike'], ['08:30', 'road', '幼稚園へ（いっしょに）', 'bike']],
    baby: [['06:00', 'bed2', '寝ている'], ['06:37', 'mom', 'ママに抱っこ']],
    guess: ['子どもが起きたら母が2階へ迎えに行く（6:37）', '起きてから朝ごはんまで、子どもは和室で遊ぶ', '父のトイレ・洗面の順番', '着替えと歯みがきは2階（洋室2・洗面所）', '2歳の子もいっしょに自転車で出る', '0歳は母が抱っこ'],
  },
  pm: {
    name: '平日の夜（17:15〜23:10）', t0: '17:15', t1: '23:10',
    papa: [['17:15', 'road', '会社から帰宅中'], ['18:28', 'genkan', 'ただいま'], ['18:30', 'shoecl', '靴・かばん'], ['18:32', 'tearai', '手洗い・うがい'], ['18:35', 'wic', '部屋着に着替え'],
      ['18:42', 'dining', '夕ごはん'], ['19:00', 'datsui', 'お風呂へ'], ['19:03', 'bath', 'お風呂'], ['19:18', 'datsui', '体をふく'], ['19:23', 'senmen', 'ドライヤー'],
      ['19:30', 'washitsu', '子どもと遊ぶ', 'play'], ['20:08', 'kitchen', '片付け・明日の準備'], ['20:35', 'shosai', '書斎で用事'], ['21:00', 'sofa', '夫婦の時間', 'couple'],
      ['22:00', 'sofa', 'ひとりの時間'], ['22:50', 'senmen', '歯みがき'], ['22:55', 'toil2', 'トイレ'], ['23:00', 'bed3', '寝る']],
    mama: [['17:15', 'kitchen', '夕ごはんの準備'], ['17:30', 'dining', '子どもと夕ごはん', 'eat'], ['17:52', 'datsui', 'お風呂の準備', 'kbath'], ['17:55', 'bath', '子ども2人とお風呂', 'kbath'],
      ['18:12', 'datsui', '体をふく・パジャマ', 'kbath'], ['18:20', 'senmen', 'ドライヤー', 'kbath'], ['18:28', 'kitchen', '夫の夕ごはんの用意'], ['19:00', 'sofa', '子どもと過ごす', 'tv'],
      ['19:40', 'laundry', '洗濯物を取り出す'], ['19:47', 'wic', '服をしまう'], ['20:00', 'kitchen', '片付け'], ['20:12', 'senmen', '子どもの歯みがき', 'teeth'],
      ['20:22', 'bed2', '寝かしつけ', 'sleep'], ['21:00', 'sofa', '夫婦の時間', 'couple'], ['22:00', 'senmen', '歯みがき'], ['22:06', 'toil2', 'トイレ'], ['22:10', 'bed2', '寝る']],
    k1: [['17:15', 'washitsu', '和室で遊ぶ'], ['17:30', 'dining', '夕ごはん', 'eat'], ['17:52', 'datsui', 'お風呂へ', 'kbath'], ['17:55', 'bath', 'お風呂', 'kbath'], ['18:12', 'datsui', 'パジャマ', 'kbath'],
      ['18:20', 'senmen', 'ドライヤー', 'kbath'], ['18:28', 'sofa', 'テレビ・遊ぶ', 'tv'], ['19:30', 'washitsu', 'パパと遊ぶ', 'play'], ['20:12', 'senmen', '歯みがき', 'teeth'],
      ['20:17', 'toil2', 'トイレ'], ['20:22', 'bed1', '寝る（寝かしつけ）', 'sleep']],
    k2: [['17:15', 'washitsu', '和室で遊ぶ'], ['17:30', 'dining', '夕ごはん', 'eat'], ['17:52', 'datsui', 'お風呂へ', 'kbath'], ['17:55', 'bath', 'お風呂', 'kbath'], ['18:12', 'datsui', 'パジャマ・おむつ', 'kbath'],
      ['18:20', 'senmen', 'ドライヤー', 'kbath'], ['18:28', 'sofa', 'テレビ・遊ぶ', 'tv'], ['19:30', 'washitsu', 'パパと遊ぶ', 'play'], ['20:12', 'senmen', '歯みがき', 'teeth'], ['20:22', 'bed1', '寝る（寝かしつけ）', 'sleep']],
    baby: [['17:15', 'mom', 'ママに抱っこ'], ['17:52', 'datsui', '脱衣所のバウンサーで待つ（母が入浴中）', 'kbath'], ['18:20', 'mom', 'ママに抱っこ'], ['20:22', 'bed2', '寝る', 'sleep']],
    guess: ['子どものお風呂 17:55〜18:10（順番が逆の日もある）', '父の 20:35〜21:00 は書斎', '母の入浴中、0歳は脱衣所で待つ', '洗濯物は夜に取り出して WIC へしまう', '寝る場所は全員 洋室3'],
  },
};
const tmin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const fmt = (m) => { const h = Math.floor(m / 60), mm = Math.floor(m % 60); return h + ':' + String(mm).padStart(2, '0'); };

// ---- 時間割から、分ごとの位置を計算する ----
function plan(sc) {
  const out = {};
  for (const p of PEOPLE) {
    const rows = SCEN[sc][p.id]; const segs = []; let cur = rows[0][1], free = tmin(rows[0][0]);
    segs.push({ type: 'stay', t0: tmin(SCEN[sc].t0) - 1, t1: tmin(rows[0][0]), node: cur, act: rows[0][2], grp: rows[0][3] });
    for (let i = 0; i < rows.length; i++) {
      const [ts, to, act, grp] = rows[i]; const t = Math.max(tmin(ts), free);
      if (to === 'mom' || cur === 'mom') { segs.push({ type: to === 'mom' ? 'mom' : 'stay', t0: t, t1: 1e9, node: to, act, grp, from: cur }); cur = to; free = t; continue; }
      const r = route(cur, to); let len = 0, stairs = 0;
      for (let k = 1; k < r.length; k++) { const d = dist3(r[k - 1], r[k]); len += d; if (STAIR.has(r[k - 1]) && STAIR.has(r[k])) stairs += d; }
      const sec = (len - stairs) / p.v + stairs / (p.v * 0.5);
      const t1 = t + sec / 60;
      if (r.length > 1) segs.push({ type: 'walk', t0: t, t1, path: r, len, act: '移動中 → ' + N[to][3], grp });
      segs.push({ type: 'stay', t0: t1, t1: 1e9, node: to, act, grp });
      cur = to; free = t1;
    }
    for (let i = 0; i < segs.length - 1; i++) segs[i].t1 = Math.min(segs[i].t1, segs[i + 1].t0);
    out[p.id] = segs;
  }
  return out;
}
const nodeXYZ = (n) => [N[n][0], N[n][1], N[n][2]];
const OFF = { papa: [-20, -14], mama: [20, -14], k1: [-20, 16], k2: [20, 16], baby: [0, 0] };   // 同じ所にいるときに重ならないように（cm）
function posAt(P, id, t, depth = 0) {   // → {x, y(平面 cm), h, seg}
  const segs = P[id]; let s = segs[0];
  for (const g of segs) if (g.t0 <= t) s = g; else break;
  if (s.type === 'mom' && depth < 2) { const m = posAt(P, 'mama', t, depth + 1); return { x: m.x + 14, y: m.y + 4, h: m.h + 1.05, seg: s, carried: true, lying: m.lying }; }
  if (s.type === 'walk') {
    const f = Math.min(1, Math.max(0, (t - s.t0) / Math.max(1e-6, s.t1 - s.t0))) * s.len; let acc = 0;
    for (let k = 1; k < s.path.length; k++) {
      const d = dist3(s.path[k - 1], s.path[k]);
      if (acc + d >= f || k === s.path.length - 1) { const u = d ? Math.min(1, (f - acc) / d) : 1, a = nodeXYZ(s.path[k - 1]), b = nodeXYZ(s.path[k]); return { x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u, h: a[2] + (b[2] - a[2]) * u, seg: s, walking: true, on: [s.path[k - 1], s.path[k]] }; }
      acc += d;
    }
  }
  const n = nodeXYZ(s.node), lying = /^bed/.test(s.node), o = lying ? [0, 0] : OFF[id] || [0, 0];
  return { x: n[0] + o[0], y: n[1] + o[1], h: n[2], seg: s, lying };
}

// ---- 数字のまとめ：歩いた距離・階段・混み合い ----
function analyze(sc, P) {
  const S = SCEN[sc], a = tmin(S.t0), b = tmin(S.t1), res = { per: {}, clash: [] };
  for (const p of PEOPLE) {
    let m = 0, up = 0, dn = 0;
    for (const g of P[p.id]) if (g.type === 'walk' && g.t0 < b) {
      m += g.len; const h0 = N[g.path[0]][2], h1 = N[g.path[g.path.length - 1]][2];
      if (h0 < 1.5 && h1 > 1.5) up++; if (h0 > 1.5 && h1 < 1.5) dn++;
    }
    const carried = P[p.id].some((g) => g.type === 'mom');
    res.per[p.id] = { m, up, dn, carried };
  }
  const open = {};
  for (let t = a; t <= b; t += 1 / 6) {
    const at = {}; for (const p of PEOPLE) at[p.id] = posAt(P, p.id, t);
    for (let i = 0; i < PEOPLE.length; i++) for (let j = i + 1; j < PEOPLE.length; j++) {
      const A = at[PEOPLE[i].id], B = at[PEOPLE[j].id]; if (A.carried || B.carried) continue;
      let where = null;
      if (!A.walking && !B.walking && A.seg.node === B.seg.node && SMALL[A.seg.node]) where = SMALL[A.seg.node];
      const dir = (q) => Math.sign(N[q.seg.path[q.seg.path.length - 1]][2] - N[q.seg.path[0]][2]);
      if (A.walking && B.walking && A.on.every((n) => STAIR.has(n)) && B.on.every((n) => STAIR.has(n)) && dir(A) !== dir(B)) where = '階段（すれ違い）';
      const key = PEOPLE[i].id + '|' + PEOPLE[j].id + '|' + where;
      if (where && !(A.seg.grp && A.seg.grp === B.seg.grp)) { if (!open[key]) open[key] = { who: [PEOPLE[i].name, PEOPLE[j].name], where, t0: t, t1: t }; else open[key].t1 = t; }
      else if (open[key]) { res.clash.push(open[key]); delete open[key]; }
    }
  }
  for (const k in open) res.clash.push(open[k]);
  res.clash.sort((x, y) => x.t0 - y.t0);
  return res;
}

// ---- 3D の人形 ----
function label(text, col) {
  const c = document.createElement('canvas'), g = c.getContext('2d'), fs = 34;
  g.font = `bold ${fs}px "Hiragino Sans","Yu Gothic",sans-serif`;
  const w = Math.min(1400, Math.ceil(g.measureText(text).width) + 36); c.width = w; c.height = fs + 22;
  g.font = `bold ${fs}px "Hiragino Sans","Yu Gothic",sans-serif`;
  g.fillStyle = 'rgba(255,255,255,0.93)'; g.fillRect(0, 0, w, c.height);
  g.fillStyle = '#' + col.toString(16).padStart(6, '0'); g.fillRect(0, 0, 12, c.height);
  g.fillStyle = '#222'; g.textBaseline = 'middle'; g.fillText(text, 20, c.height / 2 + 1);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.renderOrder = 30;
  s.scale.set(0.16 * w / c.height, 0.16, 1); s.userData.base = s.scale.clone(); s.userData.noOcc = true; return s;
}
function figure(p) {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: p.col, roughness: 0.6 }), skin = new THREE.MeshStandardMaterial({ color: 0xf0d2b8, roughness: 0.7 });
  const s = p.h / 1.7, r = p.baby ? 0.07 : 0.15 * Math.max(0.6, s);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(0.05, p.h * 0.62 - 2 * r), 6, 14), m); body.position.y = p.h * 0.36; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(p.baby ? 0.07 : 0.1 * Math.max(0.75, s), 16, 12), skin); head.position.y = p.h * 0.86; g.add(head);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), m); nose.position.set(0, p.h * 0.86, (p.baby ? 0.07 : 0.1 * Math.max(0.75, s))); g.add(nose);   // 向きが分かるように
  g.traverse((o) => { o.castShadow = true; o.userData.noAO = true; });
  // 足元の色の丸（上から見たときに見つけやすく）
  const disc = new THREE.Mesh(new THREE.CircleGeometry(p.baby ? 0.12 : 0.32, 28), new THREE.MeshBasicMaterial({ color: p.col, transparent: true, opacity: 0.8, depthWrite: false }));
  disc.rotation.x = -Math.PI / 2; disc.position.y = 0.03; disc.userData.noAO = true; g.add(disc); g.userData.disc = disc;
  return g;
}

// ---- 画面（下の板）----
const css = `
#simbox{position:fixed;left:8px;top:8px;z-index:60;width:min(360px,94vw);max-height:40vh;overflow:auto;-webkit-overflow-scrolling:touch;overflow-wrap:anywhere;background:rgba(28,30,33,.92);color:#fff;border-radius:14px;padding:6px 10px 8px;box-shadow:0 6px 20px rgba(0,0,0,.4);font-size:14px;line-height:1.45;display:none}
#simbox.min{width:auto;max-height:none;overflow:visible}
#simbox.min .simbody,#simbox.min .simttl{display:none}
#simbox .simhead{display:flex;align-items:center;gap:4px}
#simbox .simhead button{min-width:44px;min-height:40px;font-size:15px}
#simbox button,#simbox select,#simbox summary{touch-action:manipulation;-webkit-tap-highlight-color:rgba(255,255,255,.2)}
#simbox button,#simbox select{font:inherit;font-size:13px;border-radius:8px;border:1px solid #555;background:#2c3035;color:#fff;padding:5px 9px;margin:2px 2px}
#simbox summary{cursor:pointer;padding:4px 0}
#simbox button.on{background:#d85a10;border-color:#d85a10}
#simbox .clock{font-size:22px;font-weight:700;letter-spacing:1px;white-space:nowrap;flex:none;min-width:3.2em}
#simbox .who{display:flex;gap:6px;align-items:flex-start;padding:1px 0;cursor:pointer;font-size:13px}#simbox .who .sub{display:inline;margin-left:6px}#simbox .who > div{display:block}
#simbox .who.sel{background:rgba(255,255,255,.08);border-radius:6px}
#simbox .dot{width:12px;height:12px;border-radius:50%;margin-top:4px;flex:none}
#simbox .sub{color:#b8bcc0;font-size:12px}
#simbox table{border-collapse:collapse;width:100%;font-size:12.5px}#simbox td,#simbox th{border-bottom:1px solid #444;padding:3px 4px;text-align:left}
#simbox input[type=range]{width:100%}
`;
let state = null;
function el(html) { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }

function build() {
  const d = window._dbg; if (!d || !d.furn) return null;
  document.head.append(el(`<style>${css}</style>`));
  // 上の1行（時計・再生・たたむ・閉じる）はたたんでも残す。たたむと、この1行だけの小さな板になる
  const box = el(`<div id="simbox"><div class="simhead"><b class="simttl" style="font-size:13px">暮らしの動き</b><span class="clock" id="simclk">6:00</span>
    <button id="simplay" aria-label="再生">▶</button><span style="flex:1"></span><button id="simmin">たたむ</button><button id="simx" aria-label="閉じる">✕</button></div>
  <div class="simbody">
    <div><select id="simsc"><option value="am">${SCEN.am.name}</option><option value="pm">${SCEN.pm.name}</option></select><select id="simspd"><option value="30">30倍</option><option value="60" selected>60倍</option><option value="120">120倍</option></select></div>
    <input type="range" id="simt" min="0" max="100" step="0.1" value="0">
    <div><button data-view="auto" class="on">自動</button><button data-view="1">上から1階</button><button data-view="2">上から2階</button><button data-view="in">中から</button>
      <label class="sub"><input type="checkbox" id="simtrail" checked> 歩いた道</label></div>
    <details id="simppl" open><summary><b>家族</b> <span class="sub">名前をタップ＝その人を追いかける</span></summary><div id="simwho"></div></details>
    <details id="simres"><summary><b>結果（歩いた距離・混み合い）</b></summary><div id="simresb"></div><div class="sub" id="simguess" style="margin-top:6px"></div></details>
  </div></div>`);
  document.body.append(box);
  const root = new THREE.Group(); root.name = 'sim'; d.furn.add(root);
  const FL1 = 0.59;
  const figs = {}, labels = {};
  for (const p of PEOPLE) { const f = figure(p); root.add(f); figs[p.id] = f; }
  const trails = new THREE.Group(); root.add(trails);
  state = { d, box, root, figs, labels, trails, sc: 'am', t: 0, play: false, view: 'auto', sel: 'mama', last: 0, FL1, P: null, res: null };
  const $ = (q) => box.querySelector(q);
  // 板の上の操作が、下の 3D（指で回す・タップで色選び）に伝わらないようにする
  for (const ev of ['pointerdown', 'pointermove', 'pointerup', 'wheel']) box.addEventListener(ev, (e) => e.stopPropagation());
  tap($('#simx'), () => close());
  tap($('#simmin'), () => fold(!box.classList.contains('min')));
  $('#simsc').onchange = () => load($('#simsc').value);
  tap($('#simplay'), () => { state.play = !state.play; if (state.play && state.t >= tmin(SCEN[state.sc].t1)) state.t = tmin(SCEN[state.sc].t0); setPlayBtn(); state.last = performance.now(); loop(); });
  tap($('#simwho'), (e) => { const x = e.target.closest && e.target.closest('.who'); if (!x) return; state.sel = x.dataset.id; applyView(true); update(); });
  $('#simt').oninput = () => { const S = SCEN[state.sc]; state.t = tmin(S.t0) + (tmin(S.t1) - tmin(S.t0)) * $('#simt').value / 100; update(); };
  $('#simtrail').onchange = () => { trails.visible = $('#simtrail').checked; inval(); };
  for (const b of box.querySelectorAll('[data-view]')) tap(b, () => { state.view = b.dataset.view; for (const x of box.querySelectorAll('[data-view]')) x.classList.toggle('on', x === b); applyView(true); update(); });
  return state;
}
// タップ：指を離した時点で動かす（iPad では、時計が毎コマ書き換わっていると click が届かないことがあるため）。
// 板をスクロールしただけのときは pointercancel になり、動かない。キーボード操作の click も受ける
function tap(elm, fn) {
  let id = null, x0 = 0, y0 = 0, done = 0;
  elm.addEventListener('pointerdown', (e) => { id = e.pointerId; x0 = e.clientX; y0 = e.clientY; });
  elm.addEventListener('pointercancel', () => { id = null; });
  elm.addEventListener('pointerup', (e) => {
    if (e.pointerId !== id) return; id = null;
    if (Math.hypot(e.clientX - x0, e.clientY - y0) > 12) return;
    done = performance.now(); fn(e);
  });
  elm.addEventListener('click', (e) => { if (performance.now() - done < 700) return; fn(e); });   // 指で押したときは pointerup で済んでいる
}
function setPlayBtn() { const b = state.box.querySelector('#simplay'); b.textContent = state.play ? '⏸' : '▶'; b.setAttribute('aria-label', state.play ? '止める' : '再生'); b.classList.toggle('on', state.play); }
function fold(min) { const b = state.box; b.classList.toggle('min', min); b.querySelector('#simmin').textContent = min ? 'ひらく' : 'たたむ'; }
function inval() { const d = state.d; d.ext && d.ext.invalidate && d.ext.invalidate(); }
function load(sc) {
  state.sc = sc; const S = SCEN[sc]; state.P = plan(sc); state.res = analyze(sc, state.P); state.t = tmin(S.t0);
  // 歩いた道（人ごとの色の線）
  const tr = state.trails; while (tr.children.length) tr.remove(tr.children[0]);
  for (const p of PEOPLE) {
    if (p.baby) continue;
    const pts = [];
    for (const g of state.P[p.id]) if (g.type === 'walk') for (const n of g.path) { const q = N[n]; pts.push(new THREE.Vector3(PX(q[0]) + (PEOPLE.indexOf(p) - 2) * 0.03, state.FL1 + q[2] + 0.04, PZ(q[1]))); }
    if (pts.length < 2) continue;
    tr.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: p.col, transparent: true, opacity: 0.75, depthTest: false })));
  }
  // 結果の表
  const r = state.res;
  let h = '<table><tr><th>人</th><th>歩いた距離</th><th>階段（上り／下り）</th></tr>';
  for (const p of PEOPLE) { const x = r.per[p.id]; h += `<tr><td><span style="color:#${p.col.toString(16).padStart(6, '0')}">●</span> ${p.name}</td><td>${x.carried && p.baby ? '（抱っこ）' : '約 ' + Math.round(x.m) + ' m'}</td><td>${x.up}回／${x.dn}回</td></tr>`; }
  h += '</table><div style="margin-top:6px"><b>同じ時間に同じ狭い場所にいる所</b>（いっしょに動く組は除く）</div>';
  h += r.clash.length ? '<ul style="margin:4px 0;padding-left:18px">' + r.clash.map((c) => `<li>${fmt(c.t0)}〜${fmt(c.t1 + 1 / 6)}　${c.where}：${c.who.join('と')}</li>`).join('') + '</ul>' : '<div class="sub">なし</div>';
  state.box.querySelector('#simresb').innerHTML = h;
  state.box.querySelector('#simguess').innerHTML = '【推測】で入れた所：' + S.guess.join('／') + '。直したい所は教えてください。';
  update(); applyView(true);
}
function update() {
  const S = SCEN[state.sc], t = state.t, P = state.P;
  const box = state.box;
  applyView(false);   // 先に見る階を決めてから、人の表示を決める
  box.querySelector('#simclk').textContent = fmt(t);
  box.querySelector('#simt').value = (t - tmin(S.t0)) / (tmin(S.t1) - tmin(S.t0)) * 100;
  let wh = '';
  for (const p of PEOPLE) {
    const q = posAt(P, p.id, t), f = state.figs[p.id];
    f.position.set(PX(q.x), state.FL1 + q.h, PZ(q.y));
    // 向き：歩いている方向
    if (q.walking) { const nx = posAt(P, p.id, t + 0.05); const dx = PX(nx.x) - PX(q.x), dz = PZ(nx.y) - PZ(q.y); if (Math.hypot(dx, dz) > 1e-4) f.rotation.y = Math.atan2(dx, dz); }
    f.rotation.x = 0; f.rotation.z = q.lying && !p.baby ? Math.PI / 2 : 0;
    if (q.lying && !p.baby) { f.position.y += 0.15; f.rotation.y = Math.PI; }   // 寝ている人は頭が東（まくらの側）
    const act = q.seg.act, top = state.view !== 'in', txt = top ? p.name.replace(/（.*/, '') : p.name.replace(/（.*/, '') + '：' + act;
    if (state.labels[p.id] !== txt) {
      if (f.userData.lab) f.remove(f.userData.lab);
      const L = label(txt, p.col); f.add(L); f.userData.lab = L; state.labels[p.id] = txt;
    }
    if (f.userData.lab) f.userData.lab.visible = !q.carried && (state.view === 'in' || p.id === state.sel);   // 上から見るときは、選んだ人だけ名札（ほかの人は色で見分ける）
    f.userData.disc.visible = !q.carried && !q.lying;
    f.visible = state.view === 'in' || (q.h > 1.6 ? 2 : 1) === state.floor;   // 上から見るときは、見ている階の人だけ
    if (f.userData.lab) { const k = state.view === 'in' ? 1 : 2.0; f.userData.lab.scale.copy(f.userData.lab.userData.base).multiplyScalar(k); f.userData.lab.position.y = (k > 1 ? 1.6 : p.h + 0.25); }
    const where = N[q.walking ? q.on[1] : (q.seg.node === 'mom' ? 'kitchen' : q.seg.node)];
    wh += `<div class="who${state.sel === p.id ? ' sel' : ''}" data-id="${p.id}"><span class="dot" style="background:#${p.col.toString(16).padStart(6, '0')}"></span><div><b>${p.name}</b>　${q.carried ? 'ママに抱っこ' : act}<div class="sub">${q.carried ? '' : (q.walking ? '移動中' : where[3])}</div></div></div>`;
  }
  const w = box.querySelector('#simwho'); if (w.dataset.h !== wh) { w.innerHTML = wh; w.dataset.h = wh; }   // 変わったときだけ書き換える（指の下の名前が消えないように）
  inval();
}
// 見る方向：上から見るときは、その階の天井より上を切って見せる
let lastFloor = null;
function applyView(force) {
  const d = state.d, view = state.view;
  const q = posAt(state.P, state.sel, state.t), floor = view === '1' ? 1 : view === '2' ? 2 : (q.h > 1.6 ? 2 : 1);
  if (view === 'in') {
    d.renderer.clippingPlanes = [];
    if (force) { if (!d.inside.on) d.enterInside(); lastFloor = null; const w = state.figs[state.sel].getWorldPosition(new THREE.Vector3()); d.camera.position.set(w.x - 1.0, w.y + 1.55, w.z + 1.0); d.inside.yaw = d.heading(new THREE.Vector3(1, 0, -1)); d.inside.pitch = -0.3; }
    return;
  }
  if (!force && floor === lastFloor) return;
  lastFloor = floor; state.floor = floor;
  if (d.inside.on) d.exitInside();
  const base = state.FL1 + (floor === 2 ? FL2 : 0);
  const c = d.furn.localToWorld(new THREE.Vector3(PX(477.75), base, PZ(409.5)));
  const cut = d.furn.localToWorld(new THREE.Vector3(0, base + 2.1, 0)).y;
  d.renderer.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, -1, 0), cut)];
  if (d.orbit) {   // 縦長の画面（スマホ）は少し引いて、上の操作板に隠れないよう家を下に寄せる
    // 横長の画面（iPad 横・パソコン）は、左上の板をよけて家を右へ寄せる
    const asp = innerWidth / innerHeight, k = Math.max(1, 1.3 / asp), sh = asp < 1 ? 6 : 0, sx = asp >= 1 ? 2.2 : 0;
    d.camera.position.set(c.x - sx, c.y + 10 * k, c.z + 5 * k - sh); d.orbit.target.set(c.x - sx, c.y, c.z - sh); d.orbit.update();
  }
  inval();
}
function loop() {
  if (!state || !state.play) return;
  const now = performance.now(), dt = (now - state.last) / 1000; state.last = now;
  const spd = +state.box.querySelector('#simspd').value;   // 1秒で何分進めるか（60倍＝1秒で1分）
  state.t += dt * spd / 60; const end = tmin(SCEN[state.sc].t1);
  if (state.t >= end) { state.t = end; state.play = false; setPlayBtn(); if (!state.box.classList.contains('min')) state.box.querySelector('#simres').open = true; }
  update();
  requestAnimationFrame(loop);
}
function open() {
  if (!state && !build()) return;
  state.box.style.display = 'block'; state.root.visible = true;
  const ui = document.getElementById('ui'); if (ui) { state.uiDisp = ui.style.display; ui.style.display = 'none'; }   // スマホで重ならないように、説明の板は隠す
  window._design && window._design.closePop && window._design.closePop(); window._store && window._store.closePop && window._store.closePop();   // 下に出ている色選び・収納の板は閉じる
  if (!state.P) load('am'); else applyView(true);
}
function close() {
  const ui = document.getElementById('ui'); if (ui && !state.d.inside.on) ui.style.display = state.uiDisp || '';
  state.play = false; state.box.style.display = 'none'; state.root.visible = false; state.d.renderer.clippingPlanes = []; lastFloor = null; inval();
}
// ボタンを置く（外から見るときの左の板と、中から見るときの下の操作）
function addButtons() {
  const ui = document.getElementById('ui'), bar = document.querySelector('#bar #exit');
  if (!ui || !bar) return setTimeout(addButtons, 500);
  const b1 = document.createElement('button'); b1.textContent = '暮らしの動き（朝・夜）'; b1.style.cssText = 'margin:6px 0;font-weight:600';
  b1.onclick = open; const sub = ui.querySelector('p.sub'); (sub ? sub.parentNode.insertBefore(b1, sub.nextSibling) : ui.prepend(b1));
  const b2 = document.createElement('button'); b2.textContent = '暮らしの動き'; b2.onclick = open; bar.parentNode.insertBefore(b2, bar);
}
addButtons();
window._sim = { open, close, plan, analyze, SCEN, PEOPLE, N, route, isOpen: () => !!state && state.box.style.display !== 'none' };
