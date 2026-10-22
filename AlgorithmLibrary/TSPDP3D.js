// AlgorithmLibrary/TSPDP3D.js — 状压 DP 旅行商：mask×末城表逐层填，回程合拢金色最优环。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, tubeBetween } from '../3D/VisualObject3D.js';
import { applyTheme, PALETTE } from '../3D/Glow.js';
import { StoryDirector } from '../3D/director/StoryDirector.js';
import { InputKit } from '../3D/director/InputKit.js';
import { TableStage } from '../3D/director/TableStage.js';
applyTheme('TSPDP3D');

const scene = new Scene3D('scene', { cameraPos: [560, 760, 1220], lookAt: [470, 470, 0], fov: 50 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });
const input = new InputKit(panel);
const status = panel.addStatus('就绪');
const mob = matchMedia('(max-width: 900px)').matches;

const N = 4;
const BLUE = 0x60a5fa, GOLD = 0xfcd34d, CYAN = 0x22d3ee, RED = 0xfb7185, GREEN = 0x4ade80, DIM = 0x334155;
const PRESETS = [
  { name: '经典方阵', d: [[0, 10, 25, 15], [10, 0, 40, 35], [25, 40, 0, 20], [15, 35, 20, 0]] },
  { name: '三角捷径', d: [[0, 12, 30, 18], [12, 0, 22, 40], [30, 22, 0, 9], [18, 40, 9, 0]] },
  { name: '近邻陷阱', d: [[0, 5, 20, 8], [5, 0, 6, 20], [20, 6, 0, 7], [8, 20, 7, 0]] },
];
let PRESET = PRESETS[0];
let D = PRESET.d.map((row) => row.slice());
let dp = [], prev = [], cands = [];
let bestEnd = 1, ans = 0, tour = [];
let currentMask = 0, currentCity = 0, candidates = [];
let shown = new Set();
let returnShown = false, routeShown = 0;
let phase = '建立';
const edgeByKey = new Map();
const distText = new Map();
const cities = [];
const CITIES = [[680, 600], [860, 600], [860, 450], [680, 450]];
const EDGES = [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]];
const DIST_POS = { '0-1': [770, 578], '0-2': [733, 548], '0-3': [658, 525], '1-2': [882, 525], '1-3': [807, 548], '2-3': [770, 472] };

function edgeKey(a, b) { return a < b ? a + '-' + b : b + '-' + a; }
EDGES.forEach(([a, b]) => {
  const key = edgeKey(a, b);
  edgeByKey.set(key, tubeBetween(scene, [CITIES[a][0], CITIES[a][1], 0], [CITIES[b][0], CITIES[b][1], 0], { color: PALETTE.edge, opacity: 0.5, radius: 4 }));
  const [x, y] = DIST_POS[key];
  distText.set(key, new VText(scene, { text: String(D[a][b]), x, y, z: 0, color: '#cbd5e1', scale: 0.45 }));
});
for (let i = 0; i < N; i++) {
  cities.push(new VNode(scene, { radius: 24, x: CITIES[i][0], y: CITIES[i][1], z: 0, label: String(i), color: BLUE, emissive: BLUE }));
}

const stage = new TableStage(scene, {
  rows: 7, cols: 3, origin: [330, 450, 0], cellW: 58, cellH: 38, gapX: 8, gapY: 7,
  color: BLUE, textScale: 0.48, rowLabels: ['001', '010', '011', '100', '101', '110', '111'],
  colLabels: ['城1', '城2', '城3'], corner: 'mask \\ 末城', rowLabelOffset: 54, arrows: 12,
});
const tableTitle = new VText(scene, { text: 'dp[mask][末城] · 集合的最短子路径', x: 330, y: 650, z: 0, color: '#93c5fd', scale: 0.46 });
const mapTitle = new VText(scene, { text: '4 城距离地图 · 起点 0', x: 780, y: 690, z: 0, color: '#93c5fd', scale: 0.48 });

const SHOT_HOME = { pos: [560, 760, 1220], target: [470, 470, 0], ms: 900 };
const SHOT_TABLE = { pos: [330, 620, 760], target: [320, 430, 0], ms: 800 };
const SHOT_MAP = { pos: [780, 700, 830], target: [770, 530, 0], ms: 850 };
const SHOT_FULL = { pos: [600, 720, 1100], target: [470, 480, 0], ms: 900 };
const SHOT_FINAL = { pos: [640, 760, 1180], target: [500, 480, 0], ms: 950 };

const director = new StoryDirector(scene, {
  title: 'TSP · 状压 DP',
  total: 8,
  legend: [
    { label: '状态格', color: '#60a5fa' },
    { label: '候选来源', color: '#22d3ee' },
    { label: '最短值', color: '#fcd34d' },
    { label: '最优环', color: '#4ade80' },
  ],
  onReplay: () => restart(true),
});
const annos = (list) => (mob ? list.slice(0, 1) : list);

const rowOf = (mask) => mask - 1;
const colOf = (city) => city - 1;
const bitsOf = (mask) => [3, 2, 1].map((i) => (mask & (1 << (i - 1))) ? '1' : '0').join('');
const maskText = (mask) => bitsOf(mask) + '₂ {' + [1, 2, 3].filter((i) => mask & (1 << (i - 1))).join(',') + '}';

function fmt(v) { return Number.isFinite(v) ? String(v) : '—'; }

function compute() {
  dp = Array.from({ length: 8 }, () => Array(4).fill(Infinity));
  prev = Array.from({ length: 8 }, () => Array(4).fill(0));
  cands = Array.from({ length: 8 }, () => Array(4).fill(null));
  for (let i = 1; i < N; i++) {
    const m = 1 << (i - 1);
    dp[m][i] = D[0][i];
    cands[m][i] = [{ from: 0, val: D[0][i], best: true }];
  }
  for (let mask = 1; mask < 8; mask++) {
    let count = 0;
    for (let b = 1; b < N; b++) if (mask & (1 << (b - 1))) count++;
    if (count < 2) continue;
    for (let i = 1; i < N; i++) {
      if (!(mask & (1 << (i - 1)))) continue;
      const pm = mask ^ (1 << (i - 1));
      let best = Infinity, bf = -1;
      const list = [];
      for (let k = 1; k < N; k++) {
        if (k === i || !(pm & (1 << (k - 1)))) continue;
        const v = dp[pm][k] + D[k][i];
        list.push({ from: k, val: v });
        if (v < best) { best = v; bf = k; }
      }
      if (!list.length) continue;
      list.forEach((c) => { c.best = c.from === bf; });
      dp[mask][i] = best;
      prev[mask][i] = bf;
      cands[mask][i] = list;
    }
  }
  ans = Infinity;
  bestEnd = 1;
  for (let i = 1; i < N; i++) {
    const v = dp[7][i] + D[i][0];
    if (v < ans) { ans = v; bestEnd = i; }
  }
  const path = [];
  let mask = 7, city = bestEnd;
  while (mask !== (1 << (city - 1))) {
    path.push(city);
    const k = prev[mask][city];
    mask ^= 1 << (city - 1);
    city = k;
  }
  path.push(city);
  path.reverse();
  tour = [0, ...path, 0];
}

function setEdge(a, b, color, opacity) {
  const key = edgeKey(a, b);
  const mesh = edgeByKey.get(key);
  if (!mesh) return;
  mesh.material.color.setHex(color);
  mesh.material.opacity = opacity;
  const label = distText.get(key);
  if (label) label.setText(String(D[a][b]), { color: color === PALETTE.edge ? '#cbd5e1' : '#' + color.toString(16).padStart(6, '0') });
}

function resetMap() {
  EDGES.forEach(([a, b]) => setEdge(a, b, PALETTE.edge, 0.35));
  cities.forEach((c) => c.setColor(BLUE, BLUE));
}

function resetVisual() {
  stage.reset();
  stage.clearArrows();
  for (let mask = 1; mask < 8; mask++) {
    for (let i = 1; i < N; i++) {
      const r = rowOf(mask), c = colOf(i);
      stage.hideValue(r, c);
      stage.setColor(r, c, (mask & (1 << (i - 1))) ? DIM : 0x1e293b);
    }
  }
  EDGES.forEach(([a, b]) => {
    const t = distText.get(edgeKey(a, b));
    if (t) t.setText(String(D[a][b]), { color: '#cbd5e1' });
  });
  resetMap();
  shown = new Set();
  currentMask = 0; currentCity = 0; candidates = [];
  returnShown = false; routeShown = 0; phase = '建立';
  director.stateUpdate(state());
}

function state() {
  const rows = [];
  for (let mask = 1; mask < 8; mask++) {
    const row = [];
    for (let i = 1; i < N; i++) {
      row.push(shown.has(mask + ',' + i) ? fmt(dp[mask][i]) : '·');
    }
    rows.push(row);
  }
  const route = routeShown > 0 ? tour.slice(0, routeShown + 1).join(' → ') : '—';
  return {
    blocks: [
      { type: 'kv', label: '当前状态', items: [
        { k: 'mask', v: currentMask ? bitsOf(currentMask) + '₂' : '—' },
        { k: '集合', v: currentMask ? '{' + [1, 2, 3].filter((i) => currentMask & (1 << (i - 1))).join(',') + '}' : '—' },
        { k: '末城', v: currentCity ? String(currentCity) : '—' },
        { k: '阶段', v: phase },
      ] },
      { type: 'chips', label: '已访问城市（1/2/3）', items: [1, 2, 3].map((i) => ({ text: '城' + i, cls: currentMask & (1 << (i - 1)) ? 'current' : '' })) },
      { type: 'chips', label: '最后一步候选', items: candidates.map((c) => ({ text: c.from + '→' + currentCity + '=' + c.val, cls: c.best ? 'current' : '' })), empty: '—' },
      { type: 'table', label: 'dp[mask][末城]', rows, current: currentMask ? [rowOf(currentMask), colOf(currentCity)] : [-1, -1] },
      { type: 'text', label: '最优环', value: route },
      { type: 'text', label: '回程最短总长', value: returnShown ? String(ans) : '—' },
      { type: 'text', label: '复杂度', value: '时间 O(n²·2ⁿ) · 空间 O(n·2ⁿ)' },
    ],
    footer: 'dp[mask][i] = min_{k∈mask\\{i}} (dp[mask\\{i}][k] + d[k][i])',
  };
}

function stepText(mask, i, list, value) {
  if (mask === (1 << (i - 1))) return 'dp[' + maskText(mask) + '][' + i + '] = d[0][' + i + '] = ' + value;
  return 'dp[' + maskText(mask) + '][' + i + '] = min(' + list.map((c) => 'dp[' + bitsOf(mask ^ (1 << (i - 1))) + '][' + c.from + ']+' + D[c.from][i] + '=' + c.val).join(', ') + ') = ' + value;
}

function highlightStep(mask, i) {
  resetMap();
  const list = cands[mask][i] || [];
  const pm = mask ^ (1 << (i - 1));
  list.forEach((c) => {
    setEdge(c.from, i, c.best ? GOLD : CYAN, c.best ? 0.95 : 0.55);
    if (mask !== (1 << (i - 1))) stage.arrow(rowOf(pm), colOf(c.from), rowOf(mask), colOf(i), c.best ? GOLD : CYAN, 8);
  });
  cities[i].setColor(GOLD, GOLD);
  if (list[0]) cities[list[0].from].setColor(CYAN, CYAN);
}

function* fillCell(mask, i, hold = 330) {
  const list = cands[mask][i] || [];
  const value = dp[mask][i];
  currentMask = mask;
  currentCity = i;
  candidates = list;
  stage.clearArrows();
  highlightStep(mask, i);
  yield S(() => {
    stage.focus(rowOf(mask), colOf(i));
    director.setBeatState(stepText(mask, i, list, value));
    director.stateUpdate(state());
  });
  yield W(210);
  stage.setValue(rowOf(mask), colOf(i), String(value), GOLD);
  stage.setColor(rowOf(mask), colOf(i), GOLD);
  shown.add(mask + ',' + i);
  yield W(hold);
}

function* fillGroup(pairs) {
  for (const [mask, i] of pairs) yield* fillCell(mask, i);
  stage.hideFocus();
  stage.clearArrows();
  resetMap();
}

function setReturn() {
  resetMap();
  returnShown = true;
  for (let i = 1; i < N; i++) {
    const v = dp[7][i] + D[i][0];
    setEdge(i, 0, i === bestEnd ? GOLD : CYAN, i === bestEnd ? 0.95 : 0.55);
    if (v === ans) cities[i].setColor(GOLD, GOLD);
  }
  cities[0].setColor(GOLD, GOLD);
  currentMask = 7;
  currentCity = bestEnd;
  stage.focus(rowOf(7), colOf(bestEnd));
}

function* runTSP() {
  director.reset();
  compute();
  resetVisual();
  phase = '建立';
  director.chapter('建立');
  yield S(() => director.beat({
    title: '城市地图 + 压位集合',
    why: '4 个城市、起点 0；mask 的第 i 位表示城市 i 已访问。dp[mask][i] 只记“走完集合、停在 i”的最短长度，不记排列。',
    stateText: 'n=4 · 起点 0 · mask 3 位（城1..3）· 3 种可能环',
    progress: 1,
    camera: SHOT_HOME,
    annotations: annos([
      { id: 'map', text: '城市 0 固定为起点/终点', anchor: () => new THREE.Vector3(680, 640, 0), offset: mob ? [60, -24] : [0, -22], className: 'gold' },
      { id: 'table', text: '行 = mask · 列 = 最后停留的城市', anchor: () => new THREE.Vector3(330, 650, 0), offset: [0, -22] },
    ]),
  }));
  yield W(800);

  // 单城状态
  director.chapter('单城');
  phase = '单城';
  yield S(() => director.beat({
    title: '只访问一个城市',
    why: '从 0 出发直达 i，dp[{i}][i] = d[0][i]。这是所有更大集合的种子。',
    stateText: '填 mask=001,010,100 三个对角状态',
    progress: 2,
    camera: SHOT_TABLE,
    annotations: [{ id: 'seed', text: '单城状态 = 起点到该城的边', anchor: () => new THREE.Vector3(330, 650, 0), offset: [0, -22] }],
  }));
  yield W(450);
  yield* fillGroup([[1, 1], [2, 2], [4, 3]]);
  yield W(500);

  // 两城状态
  director.chapter('两城');
  phase = '两城';
  yield S(() => director.beat({
    title: '两城集合：复用单城最短子路径',
    why: 'mask 新增一个城市 i 时，枚举“上一步停在哪个 k”。每个 dp[子集][k] 已经算好，只做加法和取最小。',
    stateText: 'mask=011/101/110 · 每个末城只有 1 个来源',
    progress: 3,
    camera: SHOT_FULL,
    annotations: [{ id: 'reuse', text: '候选来源 k 都在更小的 mask 行', anchor: () => new THREE.Vector3(330, 470, 0), offset: mob ? [70, -24] : [0, -22], className: 'gold' }],
  }));
  yield W(450);
  yield* fillGroup([[3, 1], [3, 2], [5, 1], [5, 3], [6, 2], [6, 3]]);
  yield W(600);

  // 全集合
  director.chapter('全集合');
  phase = '全集合';
  yield S(() => director.beat({
    title: '三城集合：最后一步有两个来源',
    why: 'mask=111 的末城 i 可从另外两个城市来；比较两条候选边，保留更短的一条。箭头就是转移依赖。',
    stateText: 'mask=111 · 每个末城枚举 2 个来源',
    progress: 4,
    camera: SHOT_FULL,
    annotations: [{ id: 'cand', text: '青色候选，金色最优', anchor: () => new THREE.Vector3(330, 470, 0), offset: mob ? [70, -24] : [0, -22], className: 'gold' }],
  }));
  yield W(450);
  yield* fillGroup([[7, 1], [7, 2], [7, 3]]);
  yield W(600);

  // 全表与当前最短
  director.chapter('查表');
  phase = '查表';
  currentMask = 7;
  currentCity = bestEnd;
  candidates = cands[7][bestEnd];
  stage.focus(rowOf(7), colOf(bestEnd));
  stage.setColor(rowOf(7), colOf(bestEnd), GREEN);
  resetMap();
  cities[bestEnd].setColor(GREEN, GREEN);
  yield S(() => {
    director.beat({
      title: '全表完成：dp 只存最短值',
      why: '同一个 mask 行中，每个末城保留自己的最短子路径；回溯时用 prev 找到来源，不需要保存整条排列。',
      stateText: '12 个有效状态 · 最短末城 ' + bestEnd + ' · dp[111][' + bestEnd + ']=' + dp[7][bestEnd],
      progress: 5,
      camera: SHOT_TABLE,
      annotations: [{ id: 'best', text: '最短子路径停在城 ' + bestEnd, anchor: () => new THREE.Vector3(stage.xOf(colOf(bestEnd)), stage.yOf(rowOf(7)) + 55, 0), offset: [0, -22], className: 'gold' }],
    });
    director.stateUpdate(state());
  });
  yield W(850);

  // 回到起点
  director.chapter('回程');
  phase = '回程';
  setReturn();
  yield S(() => {
    director.beat({
      title: '回到起点：再枚举一次末城',
      why: 'dp[全][i] 只是“访问完停在 i”；环还需要 d[i][0]。三条回程边中取最短，就得到 TSP 最优值。',
      stateText: 'ans = min(dp[111][i] + d[i][0]) = ' + ans + ' · 末端城 ' + bestEnd,
      progress: 6,
      camera: SHOT_MAP,
      annotations: [{ id: 'back', text: '回程候选边，金色最短', anchor: () => new THREE.Vector3(715, 520, 0), offset: mob ? [60, -24] : [0, -22], className: 'final' }],
    });
    director.stateUpdate(state());
  });
  yield W(850);

  // 回溯
  director.chapter('回溯');
  phase = '回溯';
  stage.hideFocus();
  resetMap();
  routeShown = 0;
  yield S(() => director.beat({
    title: 'prev 回溯：把最短子路径接成环',
    why: '从最优末城开始，反复查 prev[mask][i] 退回上一个城市；去掉当前位，直到只剩一个城市，最后补上 0。',
    stateText: '回溯链 → ' + tour.join(' → ') + ' · 总长 ' + ans,
    progress: 7,
    camera: SHOT_MAP,
    annotations: [{ id: 'route', text: '金色闭合环', anchor: () => new THREE.Vector3(770, 525, 0), offset: mob ? [60, -24] : [0, -22], className: 'final' }],
  }));
  yield W(450);
  for (let e = 0; e < tour.length - 1; e++) {
    setEdge(tour[e], tour[e + 1], GREEN, 0.98);
    cities[tour[e]].setColor(GREEN, GREEN);
    cities[tour[e + 1]].setColor(GREEN, GREEN);
    routeShown = e + 1;
    yield S(() => {
      director.stateUpdate(state());
      director.setBeatState('第 ' + (e + 1) + ' 段：城 ' + tour[e] + ' → 城 ' + tour[e + 1] + '（d=' + D[tour[e]][tour[e + 1]] + '）');
    });
    yield W(430);
  }
  yield W(650);

  // 复盘
  director.chapter('复盘');
  phase = '复盘';
  yield S(() => {
    director.beat({
      title: '状压 DP：用集合代替排列',
      why: '暴力枚举 (n−1)! 条环；状压 DP 把“已访问集合 + 最后城市”压成 n·2ⁿ 个状态，每个状态只留最短值，复杂度 O(n²·2ⁿ)。',
      stateText: '4 城最优环 ' + tour.join(' → ') + ' = ' + ans + ' · 12 个状态',
      progress: 8,
      camera: SHOT_FINAL,
      annotations: [{ id: 'done', text: '最优环 ' + tour.join('→') + ' = ' + ans, anchor: () => new THREE.Vector3(770, 690, 0), offset: mob ? [50, -24] : [0, -22], className: 'final' }],
    });
    director.setProgress(8);
    director.stateUpdate(state());
    status.textContent = 'TSPDP 完成 · 环长 ' + ans + ' · O(n²2ⁿ)';
  });
  yield W(900);
}

function setDistance(text) {
  const m = String(text).trim().match(/^(\d)\s*-\s*(\d)\s*[:=]\s*(\d{1,2})$/);
  if (!m) { status.textContent = '改距格式：u-v:w（如 1-2:30）'; return; }
  const a = Number(m[1]), b = Number(m[2]), v = Number(m[3]);
  if (a >= N || b >= N || a === b || v < 1) { status.textContent = '改距无效：城市 0..3、u≠v、距离 ≥1'; return; }
  D[a][b] = D[b][a] = v;
  restart(true);
}

function restart(auto = true) {
  status.textContent = '';
  engine.clear();
  director.reset();
  compute();
  resetVisual();
  engine.queue(() => runTSP());
  if (auto) engine.toggle();
}

input.addSelect('预设', PRESETS.map((p) => p.name), PRESETS[0].name, (v) => {
  PRESET = PRESETS.find((x) => x.name === v) || PRESETS[0];
  D = PRESET.d.map((row) => row.slice());
  restart(true);
});
input.addInput('改距 1-2:30', setDistance, 12);
input.addButton('重播', () => restart(true));
input.addButton('清空', () => {
  engine.clear();
  director.reset();
  compute();
  resetVisual();
  status.textContent = '';
});

compute();
resetVisual();
engine.queue(() => runTSP());
scene.start(engine);
