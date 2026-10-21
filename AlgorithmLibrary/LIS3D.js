// AlgorithmLibrary/LIS3D.js — 最长递增子序列：柱阵山脊 + dp/前驱逐位递推 + 前驱链浮起为 LIS 山脊线。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBar, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
import { StoryDirector } from '../3D/director/StoryDirector.js';
import { InputKit } from '../3D/director/InputKit.js';
applyTheme('LIS3D');

const scene = new Scene3D('scene', { cameraPos: [460, 620, 900], lookAt: [320, 430, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });
const input = new InputKit(panel);
const status = panel.addStatus('就绪');

const isMobile = typeof matchMedia !== 'undefined' && matchMedia('(max-width: 900px)').matches;
const SCALE = isMobile ? 0.72 : 1;
const BASE = 300;
const IDLE = 0x60a5fa, CUR = 0x22d3ee, CMP = 0xfb923c, BETTER = 0x4ade80, GOLD = 0xfde047;
const ease = (p) => p * p * (3 - 2 * p);

let ARR = [10, 22, 9, 33, 21, 50, 41, 60, 80];
let dp = [];
let pred = [];
let bars = [];
let valLabels = [];
let dpLabels = [];
let idxLabels = [];
let resultText = null;
let ridgeGroup = null;
let tempRidge = null;
let chain = [];
let cur = null;

const director = new StoryDirector(scene, {
  title: 'LIS · 山脊',
  total: 8,
  legend: [
    { label: '待算', color: '#60a5fa' },
    { label: '比较', color: '#fb923c' },
    { label: '更新', color: '#4ade80' },
    { label: 'LIS', color: '#22c55e' },
  ],
  onReplay: () => restart(true),
});

function barH(i) { return (60 + (ARR[i] / Math.max(1, ...ARR)) * 260) * SCALE; }
function xOf(i) {
  const step = (ARR.length > 1 ? Math.min(72, 540 / (ARR.length - 1)) : 72) * SCALE;
  return 320 + (i - (ARR.length - 1) / 2) * step;
}
function topOf(i) { return new THREE.Vector3(xOf(i), BASE + barH(i) + 8, 10); }

function state() {
  const preItems = pred.map((p, i) => ({ text: i + ':' + (p < 0 ? '—' : p), cls: cur && cur.j === i ? 'current' : '' }));
  const chainItems = chain.map((i) => ({ text: ARR[i], cls: 'done' }));
  return {
    blocks: [
      { type: 'kv', label: '当前元素', items: cur ? [{ k: 'i', v: cur.i }, { k: 'a[i]', v: ARR[cur.i] }] : [{ k: 'i', v: '—' }, { k: 'a[i]', v: '—' }] },
      { type: 'dist', label: 'dp[]（以 i 结尾）', values: dp, current: cur ? cur.i : undefined },
      { type: 'chips', label: 'pred[]', items: preItems },
      { type: 'chips', label: 'LIS 路径', items: chainItems, empty: '—' },
      { type: 'text', label: 'LIS 长度', value: String(Math.max(0, ...dp)) },
    ],
    footer: 'dp[i] = 以 a[i] 结尾的 LIS 长度',
  };
}

const SHOT_ORBIT = { pos: [540, 600, 840], target: [320, 430, 0], ms: 900 };
const SHOT_PUSH = { pos: [390, 520, 720], target: [320, 430, 0], ms: 800 };
const SHOT_FILL = { pos: [470, 560, 820], target: [320, 430, 0], ms: 750 };
const SHOT_SIDE = { pos: [700, 420, 620], target: [320, 430, 0], ms: 900 };
const SHOT_FINAL = { pos: [320, 620, 980], target: [320, 410, 0], ms: 950 };

function clearRidges() {
  if (!ridgeGroup) return;
  ridgeGroup.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) o.material.dispose();
  });
  scene.remove(ridgeGroup);
  ridgeGroup = null;
}

function clearTempRidge() {
  if (!tempRidge) return;
  scene.remove(tempRidge);
  tempRidge.geometry.dispose();
  tempRidge.material.dispose();
  tempRidge = null;
}

function makeRidge(a, b, color, radius = 3.4) {
  const pa = topOf(a), pb = topOf(b);
  const mid = pa.clone().add(pb).multiplyScalar(0.5);
  mid.y += 34;
  mid.z += 18;
  const curve = new THREE.CatmullRomCurve3([pa, mid, pb]);
  return new THREE.Mesh(
    new THREE.TubeGeometry(curve, 20, radius, 6, false),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.92, depthWrite: false }),
  );
}

function setTempRidge(a, b, color) {
  clearTempRidge();
  if (a < 0 || b < 0) return;
  tempRidge = makeRidge(a, b, color);
  scene.add(tempRidge);
}

// 文字纹理与 Sprite 几何全站共享，只释放柱体/文字 sprite 的私有几何和材质。
function release(scene, obj) {
  if (!obj) return;
  const root = obj.mesh || obj.sprite;
  obj.remove();
  scene.remove(root);
  root.traverse((o) => {
    if (o.geometry && !o.isSprite) o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
  });
}

function clearStage() {
  for (const o of [...bars, ...valLabels, ...dpLabels, ...idxLabels, resultText]) release(scene, o);
  bars = []; valLabels = []; dpLabels = []; idxLabels = []; resultText = null;
  clearTempRidge();
  clearRidges();
}

function build() {
  clearStage();
  const N = ARR.length;
  const step = (N > 1 ? Math.min(72, 540 / (N - 1)) : 72) * SCALE;
  const w = Math.min(36 * SCALE, step * 0.6);
  for (let i = 0; i < N; i++) {
    const x = xOf(i), h = barH(i);
    const bar = new VBar(scene, { w, d: 16 * SCALE, x, y: BASE, z: 0, height: h, color: IDLE, emissive: IDLE });
    bars.push(bar);
    valLabels.push(new VText(scene, { text: String(ARR[i]), x, y: BASE + h + 24 * SCALE, z: 10, color: '#e2e8f0', scale: 0.5 * SCALE }));
    const t = new VText(scene, { text: '', x, y: BASE + h + 54 * SCALE, z: 10, color: '#fde047', scale: 0.5 * SCALE });
    t.sprite.visible = false;
    dpLabels.push(t);
    idxLabels.push(new VText(scene, { text: 'a[' + i + ']', x, y: BASE - 30 * SCALE, z: 10, color: PALETTE.textDim, scale: 0.34 * SCALE }));
  }
  resultText = new VText(scene, { text: 'LIS = —', x: 320, y: 200, z: 0, color: '#4ade80', scale: 0.62 });
  dp = new Array(N).fill(0);
  pred = new Array(N).fill(-1);
  chain = [];
  cur = null;
  director.stateUpdate(state());
}

function resetRun() {
  bars.forEach((b) => b.setColor(IDLE, IDLE));
  dpLabels.forEach((t) => { t.setText(''); t.sprite.visible = false; });
  dp = new Array(ARR.length).fill(0);
  pred = new Array(ARR.length).fill(-1);
  chain = [];
  cur = null;
  clearTempRidge();
  clearRidges();
  if (resultText) resultText.setText('LIS = —', { color: '#4ade80' });
  director.stateUpdate(state());
}

function* calcRow(i) {
  bars[i].setColor(CUR, CUR);
  let best = 1, pre = -1;
  for (let j = 0; j < i; j++) {
    const can = ARR[j] < ARR[i];
    const better = can && dp[j] + 1 > best;
    bars[j].setColor(better ? BETTER : CMP, better ? BETTER : CMP);
    if (better) { best = dp[j] + 1; pre = j; }
    cur = { i, j, pre, best };
    yield S(() => {
      director.stateUpdate(state());
      director.setBeatState('a[' + j + ']=' + ARR[j] + (can ? ' < ' : ' ≥ ') + 'a[' + i + ']=' + ARR[i] +
        (better ? ' → dp[' + j + ']+1=' + (dp[j] + 1) + ' 更新暂优' : can ? ' → 接上但不变优' : ' → 不能接'));
    });
    yield W(better ? 260 : 120);
    bars[j].setColor(IDLE, IDLE);
  }
  dp[i] = best;
  pred[i] = pre;
  setTempRidge(pre, i, GOLD);
  dpLabels[i].setText('dp=' + best);
  dpLabels[i].sprite.visible = true;
  bars[i].setColor(GOLD, GOLD);
  cur = { i, j: null, pre, best };
  yield S(() => {
    director.stateUpdate(state());
    director.setBeatState('dp[' + i + '] = ' + best + (pre >= 0 ? ' · 前驱 a[' + pre + ']=' + ARR[pre] : ' · 自己为起点'));
  });
  yield W(240);
  bars[i].setColor(IDLE, IDLE);
}

function* runLIS() {
  director.reset();
  resetRun();

  director.chapter('建立');
  yield S(() => director.beat({
    title: '柱阵起伏，山脊在哪？',
    why: '每个位置都可能成为某条上升脊线的终点；先只看“以 i 结尾”的局部问题。',
    stateText: ARR.length + ' 个元素 · dp[] 未计算',
    progress: 0,
    camera: SHOT_ORBIT,
    annotations: [
      { id: 'arr', text: 'a = [' + ARR.join(', ') + ']', anchor: () => new THREE.Vector3(320, BASE + 370 * SCALE, 0), offset: [0, -22], className: 'gold' },
      { id: 'hook', text: '最长上升子序列在哪？', anchor: () => new THREE.Vector3(320, BASE + 250 * SCALE, 0), offset: [0, -22], className: 'final' },
    ],
  }));
  yield W(750);

  director.chapter('初始化');
  for (let i = 0; i < ARR.length; i++) {
    dp[i] = 1;
    pred[i] = -1;
    dpLabels[i].setText('dp=1');
    dpLabels[i].sprite.visible = true;
    bars[i].setColor(BETTER, BETTER);
  }
  cur = { i: 0, j: null, pre: -1, best: 1 };
  yield S(() => director.beat({
    title: '每个元素自己算 1',
    why: '只含 a[i] 的子序列长度是 1——所有 dp[i] 从 1 起步，前驱为空。',
    stateText: 'dp[i] = 1 · pred[i] = —',
    progress: 1,
    camera: SHOT_PUSH,
    annotations: [{ id: 'init', text: 'dp 全部置 1', anchor: () => new THREE.Vector3(320, BASE + 150 * SCALE, 0), offset: [0, -20] }],
  }));
  yield W(600);
  bars.forEach((b) => b.setColor(IDLE, IDLE));

  // 第 2 拍：对 i=1 演示前序比较，随后复用真实 calcRow 递推
  const can01 = ARR[0] < ARR[1];
  bars[1].setColor(CUR, CUR);
  bars[0].setColor(CMP, CMP);
  cur = { i: 1, j: 0, pre: -1, best: 1 };
  yield S(() => director.beat({
    title: '比较全部前序',
    why: '要接在 a[j] 后面，先要求 a[j] < a[i]；再比较 dp[j] + 1 是否超过当前最优。',
    stateText: 'a[0]=' + ARR[0] + (can01 ? ' < ' : ' ≥ ') + 'a[1]=' + ARR[1] + ' · 当前 dp[1]=1',
    progress: 2,
    camera: { pos: [xOf(1) + 190, BASE + barH(1) + 150, 640], target: [xOf(1), BASE + barH(1) * 0.55, 0], ms: 780 },
    annotations: [{ id: 'cmp', text: ARR[0] + (can01 ? ' < ' : ' ≥ ') + ARR[1] + (can01 ? ' → 可以接上' : ' → 不能接'), anchor: () => topOf(0), offset: [0, -18], className: can01 ? 'final' : '' }],
  }));
  yield W(650);
  yield* calcRow(1);

  // 第 3 拍：读取真实递推结果，更新 dp[1] 与前驱脊线
  const pre1 = pred[1];
  bars[1].setColor(GOLD, GOLD);
  if (pre1 >= 0) bars[pre1].setColor(BETTER, BETTER);
  yield S(() => director.beat({
    title: 'dp[i] = max(dp[j] + 1)',
    why: '在所有可接前驱里取最大值，并记住它——pred 链就是以后回溯 LIS 的唯一线索。',
    stateText: 'dp[1] = ' + dp[1] + ' · pred[1] = ' + (pre1 < 0 ? '—' : pre1),
    progress: 3,
    camera: { pos: [xOf(1) + 170, BASE + barH(1) + 190, 620], target: [xOf(1), BASE + barH(1) * 0.6, 0], ms: 750 },
    annotations: [{ id: 'ridge', text: pre1 >= 0 ? '前驱 a[' + pre1 + '] → a[1]' : '无更小前序 · 自己为起点', anchor: () => topOf(1), offset: [0, -20], className: 'gold' }],
  }));
  yield W(700);
  bars[1].setColor(IDLE, IDLE);
  if (pre1 >= 0) bars[pre1].setColor(IDLE, IDLE);

  // 第 4 拍：不变量 + 其余元素递推
  director.chapter('不变量');
  yield S(() => director.beat({
    title: 'dp[i] 以 a[i] 结尾',
    why: '状态定义必须锁死结尾：只有这样，接上一个更小元素时长度才能安全加 1。',
    stateText: '继续计算 i = 2 … ' + (ARR.length - 1),
    progress: 4,
    camera: SHOT_FILL,
    annotations: [{ id: 'inv', text: 'dp[i] = 以 a[i] 结尾的 LIS', anchor: () => new THREE.Vector3(320, BASE + 330 * SCALE, 0), offset: [0, -22] }],
  }));
  for (let i = 2; i < ARR.length; i++) {
    yield* calcRow(i);
    director.setProgress(4 + (i / ARR.length) * 1.5);
  }
  stageResetHelper();
  yield W(350);

  // 第 5 拍：回溯前驱链
  let bestIdx = 0;
  for (let i = 1; i < ARR.length; i++) if (dp[i] > dp[bestIdx]) bestIdx = i;
  const idxChain = [];
  for (let k = bestIdx; k >= 0; k = pred[k]) {
    idxChain.push(k);
    if (pred[k] < 0) break;
  }
  idxChain.reverse();
  chain = idxChain;
  clearTempRidge();
  clearRidges();
  ridgeGroup = new THREE.Group();
  for (let k = 1; k < idxChain.length; k++) ridgeGroup.add(makeRidge(idxChain[k - 1], idxChain[k], 0x22c55e, 4));
  scene.add(ridgeGroup);
  idxChain.forEach((i) => bars[i].setColor(0x22c55e, 0x22c55e));
  director.chapter('回溯');
  yield S(() => director.beat({
    title: '沿 pred 链回溯',
    why: '从 dp 最大的位置出发，每次跳到 pred[i]；这条链就是一条真实存在的上升子序列。',
    stateText: 'dp[' + bestIdx + '] = ' + dp[bestIdx] + ' · 链长 ' + idxChain.length,
    progress: 6,
    camera: SHOT_SIDE,
    annotations: [{ id: 'chain', text: 'pred 链 = LIS', anchor: () => topOf(bestIdx), offset: [0, -22], className: 'gold' }],
  }));
  for (const i of idxChain) {
    yield S(() => {
      director.stateUpdate(state());
      director.setBeatState('LIS 成员 a[' + i + '] = ' + ARR[i] + ' · dp ' + dp[i]);
    });
    yield W(300);
  }

  // 第 6 拍：山脊浮起
  const seq = idxChain.map((i) => ARR[i]);
  yield S(() => {
    if (resultText) resultText.setText('LIS 长度 ' + seq.length, { color: '#4ade80' });
    director.chapter('结算');
    director.beat({
      title: '山脊线浮起 · 长度 ' + seq.length,
      why: '前驱链上的柱子按高度依次升高，连成的山脊就是答案；dp 最大值就是 LIS 长度。',
      stateText: 'LIS = ' + seq.join(' → '),
      progress: 7,
      camera: SHOT_FINAL,
      annotations: [{ id: 'lis', text: 'LIS = ' + seq.join(' → '), anchor: () => new THREE.Vector3(320, BASE + 300 * SCALE, 0), offset: [0, -22], className: 'final' }],
    });
    director.stateUpdate(state());
  });
  yield A(850, (p) => { if (ridgeGroup) ridgeGroup.position.y = 46 * ease(p); });
  status.textContent = 'LIS：a=[' + ARR.join(',') + ']，最长递增子序列长度 ' + seq.length + ' = ' + seq.join('→') +
    ' · dp O(n²) · 二分 O(n log n)';
  yield W(950);

  director.chapter('复盘');
  yield S(() => director.beat({
    title: 'O(n²) 与 O(n log n) 的取舍',
    why: 'DP 写法直观、能还原整条序列；二分 + 贪心只维护“长度为 k 的最小结尾”，更快但需额外结构才能回溯。',
    stateText: 'O(n²) DP · O(n log n) 二分 · 本例 ' + ARR.length + ' 个元素',
    progress: 8,
    camera: SHOT_FINAL,
    annotations: [],
  }));
  yield W(700);
}

function stageResetHelper() {
  clearTempRidge();
  bars.forEach((b, i) => { if (!chain.includes(i)) b.setColor(IDLE, IDLE); });
  director.stateUpdate(state());
}

function applyInputs() {
  const nums = arrInput.value.split(/[^0-9]+/).filter(Boolean).map(Number);
  if (nums.length < 3 || nums.length > 10) {
    status.textContent = '数组需 3–10 个正整数（用逗号分隔）';
    return;
  }
  if (nums.some((v) => v < 1 || v > 99)) {
    status.textContent = '元素范围 1–99（正整数）';
    return;
  }
  ARR = nums;
  arrInput.value = ARR.join(',');
  restart(true);
}

const arrInput = panel.addInput('数组 10,22,9,33,21,50,41,60,80', applyInputs, 40);
arrInput.value = ARR.join(',');

function restart(auto = true) {
  status.textContent = '';
  engine.clear();
  director.reset();
  build();
  engine.queue(() => runLIS());
  if (auto) engine.toggle();
}

input.addButton('重播', () => restart(true));
input.addButton('清空', () => { engine.clear(); director.reset(); build(); status.textContent = ''; });

build();
engine.queue(() => runLIS());
scene.start(engine);
