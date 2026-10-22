// AlgorithmLibrary/MatrixChain3D.js — 矩阵连乘：三角 m 表逐链长合并 + 切分候选 + 最优括号拱门。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
import { StoryDirector } from '../3D/director/StoryDirector.js';
import { InputKit } from '../3D/director/InputKit.js';
import { TableStage } from '../3D/director/TableStage.js';
applyTheme('MatrixChain3D');

const scene = new Scene3D('scene', { cameraPos: [440, 720, 920], lookAt: [320, 480, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });
const input = new InputKit(panel);
const status = panel.addStatus('就绪');

const BASE = 0x60a5fa, DIM = 0x334155, VOID = 0x1e293b, CYAN = 0x22d3ee, GOLD = 0xfde047, GREEN = 0x4ade80, ORANGE = 0xfb923c;
let P = [5, 4, 6, 2, 7, 3];
let stage = null;
let matrixBoxes = [];
let dimLabels = [];
let resultText = null;
let arches = [];
let m = [];
let s = [];
let cur = null;

const director = new StoryDirector(scene, {
  title: '矩阵连乘 · 拱门',
  total: 8,
  legend: [
    { label: '已算区间', color: '#60a5fa' },
    { label: '当前区间', color: '#22d3ee' },
    { label: '最优分割', color: '#fde047' },
    { label: '括号拱门', color: '#4ade80' },
  ],
  onReplay: () => restart(true),
});

function nOf() { return P.length - 1; }
function fmt(v) { return v === null || v === undefined ? '·' : String(v); }

function state() {
  const n = nOf();
  const row = cur ? cur.i : 0;
  const tableRows = Array.from({ length: n }, (_, r) =>
    Array.from({ length: n }, (_, c) => (r <= c ? fmt(m[r][c]) : '')));
  return {
    blocks: [
      { type: 'kv', label: '当前区间', items: cur
        ? [{ k: 'i..j', v: (cur.i + 1) + '..' + (cur.j + 1) }, { k: '链长', v: cur.j - cur.i + 1 }, { k: '最优 k', v: cur.bk !== undefined ? cur.bk + 1 : '—' }, { k: '候选', v: cur.cands || '—' }]
        : [{ k: 'i..j', v: '—' }, { k: '链长', v: '—' }, { k: '最优 k', v: '—' }, { k: '候选', v: '—' }] },
      { type: 'table', label: 'm 上三角（行 i / 列 j）', rows: tableRows, current: cur ? [cur.i, cur.j] : [-1, -1] },
      { type: 'chips', label: 's 行 ' + row, items: Array.from({ length: n }, (_, c) => ({
        text: (c + 1) + ':' + (s[row] && s[row][c] !== undefined ? s[row][c] + 1 : '·'),
        cls: cur && c === cur.j ? 'current' : s[row] && s[row][c] !== undefined ? 'done' : '',
      })) },
      { type: 'text', label: '最小乘法次数', value: m[0] && m[0][n - 1] !== null ? String(m[0][n - 1]) : '—' },
    ],
    footer: 'm[i][j] = min_k m[i][k] + m[k+1][j] + p_i·p_{k+1}·p_{j+1}',
  };
}

function cellShot(i, j, ms = 700) {
  return { pos: [stage.xOf(j) + 200, stage.yOf(i) + 210, 560], target: [stage.xOf(j), stage.yOf(i), 0], ms };
}

const SHOT_ESTABLISH = { pos: [500, 760, 940], target: [320, 520, 0], ms: 900 };
const SHOT_TOP = { pos: [320, 990, 580], target: [320, 500, 0], ms: 850 };
const SHOT_FILL = { pos: [480, 720, 920], target: [320, 480, 0], ms: 750 };
const SHOT_SPLIT = { pos: [570, 640, 760], target: [320, 450, 0], ms: 850 };
const SHOT_ARCH = { pos: [470, 720, 840], target: [320, 510, 0], ms: 900 };
const SHOT_FINAL = { pos: [360, 610, 950], target: [320, 460, 0], ms: 950 };

function release(obj) {
  if (!obj) return;
  const root = obj.mesh || obj.sprite;
  obj.remove?.();
  scene.remove(root);
  root.traverse?.((o) => {
    if (o.geometry && !o.isSprite) o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((mm) => mm.dispose());
  });
}

function clearArches() {
  for (const a of arches) {
    scene.remove(a.line);
    a.line.geometry.dispose();
    a.line.material.dispose();
  }
  arches = [];
}

function clearBuild() {
  if (stage) stage.dispose();
  clearArches();
  [...matrixBoxes, ...dimLabels, resultText].forEach(release);
  matrixBoxes = []; dimLabels = []; resultText = null;
}

function dimLower() {
  const n = nOf();
  for (let i = 0; i < n; i++) for (let j = 0; j < i; j++) stage.setColor(i, j, VOID);
}

function build() {
  clearBuild();
  const n = nOf();
  const cellW = Math.min(56, 430 / n);
  stage = new TableStage(scene, {
    rows: n, cols: n, origin: [320, 440, 0],
    cellW, cellH: 42, gapX: 8, gapY: 8, color: BASE, textScale: 0.5,
    rowLabels: Array.from({ length: n }, (_, i) => 'A' + (i + 1)),
    colLabels: Array.from({ length: n }, (_, j) => 'A' + (j + 1)),
    colLabelOffset: 0, rowLabelOffset: 48, arrows: 24,
  });
  dimLower();
  for (let i = 0; i < n; i++) stage.setValue(i, i, 0, DIM);

  const boxW = Math.min(74, 400 / n);
  const span = n * (boxW + 12);
  matrixBoxes = Array.from({ length: n }, (_, i) => {
    const b = new VBox(scene, {
      w: boxW, h: 44, d: 24, x: 320 - span / 2 + boxW / 2 + i * (boxW + 12), y: 810, z: 0,
      label: 'A' + (i + 1), color: BASE, emissive: BASE,
    });
    b.label.scale.multiplyScalar(0.55);
    return b;
  });
  dimLabels = Array.from({ length: n }, (_, i) => new VText(scene, {
    text: P[i] + '×' + P[i + 1], x: matrixBoxes[i].mesh.position.x, y: 770, z: 0, color: '#cbd5e1', scale: 0.38,
  }));
  resultText = new VText(scene, { text: '最小代价 = —', x: 320, y: stage.yOf(n - 1) - 52, z: 0, color: '#fde047', scale: 0.6 });
  m = Array.from({ length: n }, () => new Array(n).fill(null));
  s = Array.from({ length: n }, () => new Array(n).fill(undefined));
  for (let i = 0; i < n; i++) m[i][i] = 0;
  cur = null;
  director.stateUpdate(state());
}

function calc(i, j) {
  const cands = [];
  let best = Infinity, bk = i;
  for (let k = i; k < j; k++) {
    const v = m[i][k] + m[k + 1][j] + P[i] * P[k + 1] * P[j + 1];
    cands.push('k' + (k + 1) + '=' + v);
    if (v < best) { best = v; bk = k; }
  }
  m[i][j] = best;
  s[i][j] = bk;
  stage.clearArrows();
  stage.arrow(i, bk, i, j, CYAN, 8);
  stage.arrow(bk + 1, j, i, j, ORANGE, 8);
  stage.focus(i, j);
  stage.setValue(i, j, best, BASE);
  cur = { i, j, bk, best, cands: cands.join(' / ') };
  director.stateUpdate(state());
  director.setBeatState('m[' + (i + 1) + '][' + (j + 1) + '] = ' + best + '（切分 k=' + (bk + 1) + '）');
  return cur;
}

function addArch(i, j, depth) {
  const x1 = stage.xOf(i), x2 = stage.xOf(j);
  const y = stage.y0 + stage.ch / 2 + 44 + depth * 22;
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(x1, y, 0),
    new THREE.Vector3((x1 + x2) / 2, y + 42 + Math.abs(x2 - x1) * 0.22, 0),
    new THREE.Vector3(x2, y, 0),
  );
  const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(26));
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: GREEN, transparent: true, opacity: 0.9 }));
  scene.add(line);
  arches.push({ line });
}

function buildBrackets(i, j, depth = 0) {
  if (i >= j) return;
  const k = s[i][j];
  buildBrackets(i, k, depth + 1);
  buildBrackets(k + 1, j, depth + 1);
  addArch(i, j, depth);
}

function parens(i, j) {
  if (i === j) return 'A' + (i + 1);
  const k = s[i][j];
  return '(' + parens(i, k) + parens(k + 1, j) + ')';
}

function* runMC() {
  director.reset();
  clearArches();
  const n = nOf();
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < i; j++) stage.setColor(i, j, VOID);
    stage.setColor(i, i, BASE);
    const c = stage.cell(i, i);
    if (c && c.label) c.label.visible = true;
    for (let j = i + 1; j < n; j++) {
      stage.hideValue(i, j);
      stage.setColor(i, j, BASE);
      stage.setExtrude(i, j, 1);
    }
  }
  m = Array.from({ length: n }, () => new Array(n).fill(null));
  s = Array.from({ length: n }, () => new Array(n).fill(undefined));
  for (let i = 0; i < n; i++) m[i][i] = 0;
  cur = null;
  matrixBoxes.forEach((b) => b.setColor(BASE, BASE));
  resultText.setText('最小代价 = —', { color: '#fde047' });
  director.stateUpdate(state());

  director.chapter('建立');
  yield S(() => director.beat({
    title: '矩阵链与三角表',
    why: '矩阵乘法满足结合律，不同括号化代价不同。m[i][j] 存 Ai..Aj 的最小乘法次数；只填上三角。',
    stateText: 'A1..A' + n + ' · 维度 ' + P.join('×'),
    progress: 0,
    camera: SHOT_ESTABLISH,
    annotations: [
      { id: 'dims', text: P.join(' × '), anchor: () => new THREE.Vector3(320, 852, 0), offset: [0, -20], className: 'gold' },
      { id: 'hook', text: '怎样加括号最省？', anchor: () => new THREE.Vector3(320, 610, 0), offset: [0, -22], className: 'final' },
    ],
  }));
  yield W(750);

  director.chapter('链长 1');
  for (let i = 0; i < n; i++) stage.setColor(i, i, GOLD);
  yield S(() => director.beat({
    title: '单矩阵代价为 0',
    why: '长度为 1 的链不需要相乘，m[i][i] = 0；这条对角线是递推的底。',
    stateText: 'm[i][i] = 0（' + n + ' 个单矩阵）',
    progress: 1,
    camera: SHOT_TOP,
    annotations: [{ id: 'diag', text: '长度为 1 → 0 次乘法', anchor: () => stage.anchor(0, 0), offset: [0, -18], className: 'gold' }],
  }));
  yield W(550);
  for (let i = 0; i < n; i++) stage.setColor(i, i, DIM);

  director.chapter('链长 2');
  yield S(() => director.beat({
    title: '两个矩阵只有一种分法',
    why: '长度 2 的区间只能从中间切开：m[i][i] + m[i+1][i+1] + p_i·p_{i+1}·p_{i+2}。',
    stateText: '从左到右填完所有长度 2 区间',
    progress: 2,
    camera: cellShot(0, 1),
    annotations: [{ id: 'len2', text: '唯一分割 k = i', anchor: () => stage.anchor(0, 1), offset: [0, -18], className: 'final' }],
  }));
  yield W(300);
  for (let i = 0; i + 1 < n; i++) { yield S(() => calc(i, i + 1)); yield W(80); }
  yield S(() => director.setBeatState('链长 2 填完 · m[1][2] = ' + m[0][1]));
  yield W(650);

  director.chapter('枚举切分');
  const demo = calc(0, Math.min(2, n - 1));
  yield S(() => director.beat({
    title: '链长 3：枚举所有切分点',
    why: '切在 k 处，左子链和右子链都已算好；总代价要加上这次合并的 p_i·p_{k+1}·p_{j+1}。',
    stateText: 'm[1][' + (demo.j + 1) + '] 候选 ' + demo.cands + ' → ' + demo.best,
    progress: 3,
    camera: cellShot(demo.i, demo.j),
    annotations: [
      { id: 'left', text: '左子链', anchor: () => stage.anchor(demo.i, demo.bk), offset: [0, -16] },
      { id: 'right', text: '右子链', anchor: () => stage.anchor(demo.bk + 1, demo.j), offset: [0, -16], className: 'gold' },
    ],
  }));
  yield W(700);
  for (let len = 3, i = 1; i + len - 1 < n; i++) { calc(i, i + len - 1); yield W(90); }
  for (let len = 4; len <= n; len++) {
    for (let i = 0; i + len - 1 < n; i++) { calc(i, i + len - 1); yield W(80); }
  }
  stage.clearArrows();
  stage.hideFocus();
  director.setProgress(3.6);
  director.setBeatState('上三角填满 · 总代价 m[1][' + n + '] = ' + m[0][n - 1]);
  yield W(550);

  director.chapter('填满三角');
  yield S(() => director.beat({
    title: '逐层合并到整个链',
    why: '外层按链长递增，内层枚举切分点；每个区间都依赖更短的区间，所以填表顺序不能乱。',
    stateText: 'm[1][' + n + '] = ' + m[0][n - 1] + ' · 共 ' + (n * (n + 1) / 2) + ' 个区间',
    progress: 4,
    camera: SHOT_FILL,
    annotations: [{ id: 'tri', text: '上三角逐层抬高', anchor: () => new THREE.Vector3(320, 620, 0), offset: [0, -20] }],
  }));
  yield W(600);

  director.chapter('切分选择');
  stage.focus(0, n - 1);
  stage.setColor(0, n - 1, GOLD);
  yield S(() => director.beat({
    title: '最优切分 k = ' + (s[0][n - 1] + 1),
    why: '根节点切分把整条链分成两段；继续递归读取 s 表，就能还原整棵括号树。',
    stateText: 'm[1][' + n + '] = ' + m[0][n - 1] + ' · 根切分 k = ' + (s[0][n - 1] + 1),
    progress: 5,
    camera: SHOT_SPLIT,
    annotations: [{ id: 'root', text: '根切分 A' + (s[0][n - 1] + 2), anchor: () => stage.anchor(0, n - 1), offset: [0, -18], className: 'final' }],
  }));
  yield W(750);

  // 第 7 拍：括号拱门
  buildBrackets(0, n - 1);
  const tree = parens(0, n - 1);
  matrixBoxes.forEach((b) => b.setColor(GREEN, GREEN));
  resultText.setText('最小代价 ' + m[0][n - 1], { color: '#4ade80' });
  yield S(() => director.beat({
    title: '最优括号像拱门架起',
    why: '每个拱门 = 一次合并；内层子链先合并，拱门从下往上逐层架起，最终跨住整条矩阵链。',
    stateText: tree,
    progress: 6,
    camera: SHOT_ARCH,
    annotations: [{ id: 'tree', text: tree, anchor: () => new THREE.Vector3(320, 690, 0), offset: [0, -22], className: 'final' }],
  }));
  status.textContent = '矩阵连乘演示完成：维度 ' + P.join('×') + '，最小乘法次数 ' + m[0][n - 1] + '，方案 ' + tree + ' · O(n³)';
  yield W(1000);

  director.chapter('复盘');
  yield S(() => director.beat({
    title: 'DP 枚举切分，避免指数枚举',
    why: '暴力括号化是卡特兰数级；DP 只算 O(n²) 个区间，每个区间 O(n) 个切分，用 O(n³) 换确定最优。',
    stateText: 'O(n³) 时间 · O(n²) 空间 · ' + n + ' 个矩阵',
    progress: 8,
    camera: SHOT_FINAL,
    annotations: [],
  }));
  yield W(700);
}

function parseNums(str) {
  return str.split(/[^0-9]+/).filter(Boolean).map(Number);
}

function applyInputs() {
  const dims = parseNums(dimInput.value);
  const n = dims.length - 1;
  if (dims.length < 4 || dims.length > 7) {
    status.textContent = '维度需 4–7 个数（即 3–6 个矩阵），如 5,4,6,2,7,3';
    return;
  }
  if (dims.some((d) => d < 1 || d > 60)) {
    status.textContent = '每个维度需在 1–60 之间';
    return;
  }
  P = dims;
  dimInput.value = P.join(',');
  restart(true);
}

const preset = input.addSelect('预设', ['5,4,6,2,7,3', '4,10,3,12,20', '2,3,4,5,6,7'], '5,4,6,2,7,3', (v) => {
  if (v.startsWith('自定义')) return;
  dimInput.value = v;
  applyInputs();
});
const dimInput = panel.addInput('维度 5,4,6,2,7,3', applyInputs, 32);
dimInput.value = P.join(',');

function restart(auto = true) {
  status.textContent = '';
  engine.clear();
  director.reset();
  build();
  engine.queue(() => runMC());
  if (auto) engine.toggle();
}

input.addButton('重播', () => restart(true));
input.addButton('清空', () => { engine.clear(); director.reset(); build(); status.textContent = ''; });

build();
engine.queue(() => runMC());
scene.start(engine);
