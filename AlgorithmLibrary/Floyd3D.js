// AlgorithmLibrary/Floyd3D.js — Floyd-Warshall 全源最短路：距离矩阵热区 + 中转点 k 五轮扩散。
// 矩阵舞台复用 TableStage（只读），8 拍固定叙事：初始矩阵 → k=0..4 → 收敛/负环 → 复盘。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
import { StoryDirector } from '../3D/director/StoryDirector.js';
import { InputKit } from '../3D/director/InputKit.js';
import { TableStage } from '../3D/director/TableStage.js';
applyTheme('Floyd3D');

const N = 5;
const INF = Infinity;
const INIT = [
  [0, 3, 8, INF, -4],
  [INF, 0, INF, 1, 7],
  [INF, 4, 0, INF, INF],
  [2, INF, -5, 0, INF],
  [INF, INF, INF, 6, 0],
];
const C = {
  base: 0x334155, diag: 0x1e293b, row: 0xfbbf24, via: 0x22d3ee,
  update: 0xfb923c, better: 0x4ade80, watch: 0x38bdf8, bad: 0xf87171,
};
const TEXT_SCALE = 0.5;
const isMobile = typeof matchMedia !== 'undefined' && matchMedia('(max-width: 900px)').matches;
const view = (pos, target, ms) => ({
  pos: isMobile ? target.map((v, i) => Math.round(v + (pos[i] - v) * 0.4)) : pos,
  target, ms,
});
const HOME = view([520, 760, 900], [320, 500, 0], 0).pos;
const scene = new Scene3D('scene', { cameraPos: HOME, lookAt: [320, 500, 0], fov: 50 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });
const input = new InputKit(panel);
const status = panel.addStatus('就绪');

const annos = (list) => (isMobile ? list.slice(0, 1) : list);
const SHOT_ESTABLISH = view([520, 760, 900], [320, 500, 0], 900);
const SHOT_ROUND = view([540, 690, 930], [320, 480, 0], 720);
const SHOT_FINAL = view([320, 700, 940], [320, 470, 0], 900);

let weights = INIT.map((row) => row.slice());
let D = [];
let stage = null;
let axisLabels = [];
let currentK = -1;
let curCell = null;
let updatedThisBeat = [];
let updatedTotal = 0;
let watchU = 0;
let watchV = 4;

const director = new StoryDirector(scene, {
  title: 'Floyd · 距离矩阵',
  total: 8,
  legend: [
    { label: '中转行/列 k', color: '#fbbf24' },
    { label: '依赖格', color: '#22d3ee' },
    { label: '更短更新', color: '#fb923c' },
    { label: '本轮已改写', color: '#4ade80' },
    { label: '负环', color: '#f87171' },
  ],
  onReplay: () => restart(true),
});
const fromSelect = input.addSelect('起点', Array.from({ length: N }, (_, i) => i), watchU, (v) => { watchU = Number(v); restart(true); });
const toSelect = input.addSelect('目标', Array.from({ length: N }, (_, i) => i), watchV, (v) => { watchV = Number(v); restart(true); });

function fmt(v) { return v === INF ? '∞' : String(v); }
function cloneMatrix(m) { return m.map((row) => row.slice()); }

function dropText(t) {
  if (!t) return;
  if (t.sprite && t.sprite.material) t.sprite.material.dispose();
  t.remove();
}

function disposeTable() {
  if (stage) { stage.dispose(); stage = null; }
  axisLabels.forEach(dropText);
  axisLabels = [];
}

function putCell(r, c, value, color) {
  const cell = stage.cell(r, c);
  if (!cell) return;
  cell.setText(fmt(value));
  if (cell.label) {
    cell.label.visible = true;
    cell.label.scale.multiplyScalar(TEXT_SCALE);
    cell.label.position.z = stage.labelZ(cell.mesh.scale.z);
  }
  if (color !== undefined) stage.setColor(r, c, color);
}

function buildTable() {
  disposeTable();
  D = cloneMatrix(weights);
  stage = new TableStage(scene, {
    rows: N,
    cols: N,
    origin: [320, 490, 0],
    cellW: 58,
    cellH: 40,
    cellD: 13,
    gapX: 4,
    gapY: 6,
    color: C.base,
    textScale: TEXT_SCALE,
    arrows: 0,
  });
  for (let r = 0; r < N; r++) {
    axisLabels.push(new VText(scene, {
      text: String(r), x: stage.x0 - stage.cw / 2 - 34, y: stage.yOf(r), z: 4,
      color: '#cbd5e1', scale: 0.6,
    }));
    axisLabels.push(new VText(scene, {
      text: String(r), x: stage.xOf(r), y: stage.y0 + stage.ch / 2 + 29, z: 4,
      color: '#cbd5e1', scale: 0.6,
    }));
    for (let c = 0; c < N; c++) putCell(r, c, D[r][c], r === c ? C.diag : C.base);
  }
  axisLabels.push(new VText(scene, { text: 'D', x: stage.x0 - stage.cw / 2 - 34, y: stage.y0 + stage.ch / 2 + 29, z: 4, color: '#fde047', scale: 0.7 }));
  currentK = -1;
  curCell = null;
  updatedThisBeat = [];
  updatedTotal = 0;
}

function resetVisual() {
  if (!stage) return;
  stage.reset();
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      stage.setColor(r, c, r === c ? C.diag : C.base);
      putCell(r, c, D[r][c]);
    }
  }
  stage.hideFocus();
}

function hasNegativeCycle() {
  for (let i = 0; i < N; i++) if (D[i][i] < 0) return true;
  return false;
}

function blocks(note, current = curCell) {
  const recent = updatedThisBeat.slice(-8).map((u) => ({
    text: u.text,
    cls: u.r === (current ? current[0] : -1) && u.c === (current ? current[1] : -1) ? 'current' : '',
  }));
  return {
    blocks: [
      { type: 'table', label: 'D[i][j] 距离矩阵', rows: D.map((row) => row.map(fmt)), current },
      { type: 'kv', label: '本轮', items: [
        { k: 'k', v: currentK < 0 ? '—' : currentK },
        { k: '本拍更新', v: updatedThisBeat.length },
        { k: '累计更新', v: updatedTotal },
        { k: '负环', v: hasNegativeCycle() ? '是' : '否' },
      ] },
      { type: 'chips', label: '更短路径', items: recent, empty: '—' },
      { type: 'text', label: '状态', value: note + ' · 关注 D[' + watchU + '][' + watchV + ']=' + fmt(D[watchU][watchV]) },
    ],
    footer: 'D[i][j] = min(D[i][j], D[i][k] + D[k][j])',
  };
}

function updateState(note, current = curCell) {
  director.stateUpdate(blocks(note, current));
}

function setWeightByText(text) {
  const m = String(text).trim().match(/^(\d)\s*>\s*(\d)\s*:\s*(-?\d{1,3})$/);
  if (!m) { status.textContent = '改权格式：u>v:w（如 0>2:8，可负权）'; return; }
  const u = Number(m[1]), v = Number(m[2]), w = Number(m[3]);
  if (u >= N || v >= N || u === v) { status.textContent = '改权无效：u,v 需在 0..4 且 u≠v'; return; }
  weights[u][v] = w;
  restart(true);
}

function* floydRound(k) {
  currentK = k;
  updatedThisBeat = [];
  curCell = null;
  for (let c = 0; c < N; c++) stage.setColor(k, c, C.row);
  for (let r = 0; r < N; r++) stage.setColor(r, k, C.row);
  updateState('允许经过 k=' + k + '，扫描所有点对');
  director.setBeatState('中转点 k=' + k + '：行/列 ' + k + ' 作为依赖来源');
  yield W(420);

  for (let i = 0; i < N; i++) {
    if (i === k || D[i][k] === INF) continue;
    for (let j = 0; j < N; j++) {
      if (j === k || D[k][j] === INF) continue;
      const via = D[i][k] + D[k][j];
      if (via >= D[i][j]) continue;
      const old = D[i][j];
      D[i][j] = via;
      curCell = [i, j];
      updatedTotal++;
      const item = { r: i, c: j, text: i + ',' + j + ': ' + fmt(old) + '→' + via };
      updatedThisBeat.push(item);
      stage.focus(i, j);
      stage.setColor(i, k, C.via);
      stage.setColor(k, j, C.via);
      putCell(i, j, via, C.update);
      const msg = 'D[' + i + '][' + j + ']: ' + fmt(old) + ' → ' + via + '（' + i + '→' + k + '→' + j + '）';
      status.textContent = msg;
      director.setBeatState(msg);
      updateState('经 k=' + k + ' 找到更短路径', [i, j]);
      yield A(280, (p) => stage.setExtrude(i, j, 1 + 0.5 * Math.sin(p * Math.PI)));
      stage.setExtrude(i, j, 1);
      stage.setColor(i, j, C.better);
      stage.setColor(i, k, C.row);
      stage.setColor(k, j, C.row);
      yield W(70);
    }
  }

  stage.hideFocus();
  curCell = null;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) stage.setColor(r, c, r === c ? C.diag : C.base);
  }
  updateState('k=' + k + ' 轮完成，矩阵继续收敛');
  yield W(320);
}

function* runFloyd() {
  director.reset();
  status.textContent = '';
  buildTable();
  resetVisual();
  updateState('初始 D = 邻接矩阵；∞ 表示无直达边');

  director.chapter('建立');
  yield S(() => director.beat({
    title: '邻接矩阵登场',
    why: 'D[i][j] 初始是直达边权；Floyd 每一轮允许一个额外中转点，逐步逼近全源最短路。',
    stateText: '5×5 矩阵 · 对角 0 · 无直达边 ∞ · k 从 0 到 4',
    progress: 1,
    camera: SHOT_ESTABLISH,
    annotations: annos([
      { id: 'row', text: '行 i = 起点', anchor: () => new THREE.Vector3(stage.x0 - stage.cw / 2 - 36, stage.y0, 0), offset: [0, -20] },
      { id: 'col', text: '列 j = 终点', anchor: () => new THREE.Vector3(stage.x0 + 2 * stage.stepX, stage.y0 + stage.ch / 2 + 36, 0), offset: [0, -20], className: 'gold' },
    ]),
  }));
  yield W(750);

  for (let k = 0; k < N; k++) {
    director.chapter('k = ' + k);
    yield S(() => director.beat({
      title: '中转点 k=' + k,
      why: '对所有 i,j 尝试 i→' + k + '→j；更短就改写 D[i][j]。行/列 ' + k + ' 是依赖来源。',
      stateText: 'D[i][j] = min(D[i][j], D[i][' + k + '] + D[' + k + '][j])',
      progress: 2 + k,
      camera: SHOT_ROUND,
      annotations: annos([
        { id: 'krow', text: '第 ' + k + ' 行 / 列作为中转依赖', anchor: () => new THREE.Vector3(stage.xOf(k), stage.yOf(k) + 75, 0), offset: [0, -22], className: 'gold' },
        { id: 'formula', text: 'min(原值, 经 ' + k + ' 中转)', anchor: () => new THREE.Vector3(320, 300, 0), offset: [0, -22] },
      ]),
    }));
    updateState('k=' + k + ' 轮开始');
    yield* floydRound(k);
    yield W(240);
  }

  director.chapter('收敛');
  currentK = -1;
  curCell = [watchU, watchV];
  const neg = hasNegativeCycle();
  resetVisual();
  stage.setColor(watchU, watchV, neg ? C.bad : C.watch);
  stage.focus(watchU, watchV);
  const answer = fmt(D[watchU][watchV]);
  status.textContent = neg
    ? 'Floyd 演示完成：检测到负权环，最短路无定义'
    : 'Floyd 演示完成：D[' + watchU + '][' + watchV + ']=' + answer + ' · 全源最短路 · O(V³)';
  updateState(neg ? '对角出现负数 → 负权环' : '五轮中转结束，矩阵收敛', [watchU, watchV]);
  yield S(() => director.beat({
    title: neg ? '发现负权环' : '所有点对收敛',
    why: neg ? '若某轮后 D[i][i] < 0，说明存在可无限缩短的负环，全源最短路无定义。' : '每个点对都尝试过全部 5 个中转点；D[' + watchU + '][' + watchV + '] 即最短距离。',
    stateText: neg ? '负环：最短路无定义' : 'D[' + watchU + '][' + watchV + '] = ' + answer,
    progress: 7,
    camera: SHOT_FINAL,
    annotations: annos([
      { id: 'answer', text: 'D[' + watchU + '][' + watchV + '] = ' + answer, anchor: () => new THREE.Vector3(stage.xOf(watchV), stage.yOf(watchU) + 75, 0), offset: [0, -22], className: neg ? 'warn' : 'final' },
      { id: 'done', text: neg ? '负权环不可求最短路' : '全源最短路矩阵已完成', anchor: () => new THREE.Vector3(320, stage.y0 + 90, 0), offset: [0, -22], className: 'gold' },
    ]),
  }));
  yield W(950);

  director.chapter('复盘');
  yield S(() => director.beat({
    title: '五轮中转 · O(V³)',
    why: 'k 在外层表示“只允许 0..k 作为中转”。支持负权边，但无法处理负权环。',
    stateText: 'V=5 · 25 个点对 · 125 次松弛 · O(V³)',
    progress: 8,
    camera: SHOT_FINAL,
    annotations: [],
  }));
  yield W(700);
}

function restart(autoPlay = true) {
  status.textContent = '';
  engine.clear();
  director.reset();
  buildTable();
  resetVisual();
  engine.queue(() => runFloyd());
  if (autoPlay) engine.toggle();
}

input.addInput('改权 u>v:w', setWeightByText, 12);
input.addButton('重播', () => restart(true));
input.addButton('清空', () => {
  engine.clear();
  director.reset();
  status.textContent = '';
  buildTable();
  resetVisual();
  updateState('已清空，等待播放');
});
buildTable();
resetVisual();
updateState('就绪：点播放，观察矩阵逐轮收敛');
engine.queue(() => runFloyd());
scene.start(engine);
