// AlgorithmLibrary/UnboundedKnapsack3D.js — 完全背包：容量轴逐格正扫，物品可重复，容量柱随 dp 抬高，回溯装出重复物品。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
import { StoryDirector } from '../3D/director/StoryDirector.js';
import { InputKit } from '../3D/director/InputKit.js';
import { TableStage } from '../3D/director/TableStage.js';
applyTheme('UnboundedKnapsack3D');

const scene = new Scene3D('scene', { cameraPos: [420, 680, 900], lookAt: [320, 470, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });
const input = new InputKit(panel);
const status = panel.addStatus('就绪');

const BASE = 0x60a5fa, DIM = 0x475569, TAKE = 0xfb923c, CUR = 0x22d3ee, GOLD = 0xfde047, GREEN = 0x4ade80;
let ITEMS = [{ id: 'A', w: 3, v: 4 }, { id: 'B', w: 5, v: 8 }, { id: 'C', w: 4, v: 6 }];
let CAP = 10;
let stage = null;
let itemBoxes = [];
let itemLabels = [];
let drawer = [];
let shelfLabel = null;
let resultText = null;
let dp = [];
let pick = [];
let cur = null;
let picked = [];

const director = new StoryDirector(scene, {
  title: '完全背包 · 柱',
  total: 8,
  legend: [
    { label: '物品', color: '#60a5fa' },
    { label: '当前容量', color: '#22d3ee' },
    { label: '这次装入', color: '#fb923c' },
    { label: '最优价值', color: '#fde047' },
  ],
  onReplay: () => restart(true),
});

function fmt(v) { return String(v); }

function state() {
  const c = cur;
  return {
    blocks: [
      { type: 'kv', label: '当前容量', items: c
        ? [{ k: 'w', v: c.w + ' / ' + CAP }, { k: '物品', v: c.item || '—' }]
        : [{ k: 'w', v: '—' }, { k: '物品', v: '—' }] },
      { type: 'text', label: '候选', value: c?.cand ?? '—' },
      { type: 'chips', label: 'dp[容量]', items: dp.map((v, w) => ({ text: w + ':' + fmt(v), cls: c && c.w === w ? 'current' : w <= (c ? c.w : -1) ? 'visited' : '' })) },
      { type: 'chips', label: '重复装入', items: picked.map((it) => ({ text: it.id + '(' + it.w + '/' + it.v + ')', cls: 'done' })), empty: '—' },
      { type: 'text', label: '最大价值', value: String(dp[CAP]) },
    ],
    footer: 'dp[w] = max(dp[w - wi] + vi)，w 正序扫描允许同一物品重复',
  };
}

function cellShot(w, ms = 650) {
  return { pos: [stage.xOf(w) + 190, stage.yOf(0) + 250, 520], target: [stage.xOf(w), stage.yOf(0), 0], ms };
}

const SHOT_ESTABLISH = { pos: [480, 710, 920], target: [320, 480, 0], ms: 900 };
const SHOT_TOP = { pos: [320, 950, 580], target: [320, 500, 0], ms: 850 };
const SHOT_FILL = { pos: [500, 710, 900], target: [320, 470, 0], ms: 750 };
const SHOT_TERRAIN = { pos: [620, 500, 820], target: [320, 430, 0], ms: 950 };
const SHOT_BACK = { pos: [500, 590, 780], target: [320, 400, 0], ms: 850 };
const SHOT_FINAL = { pos: [390, 590, 960], target: [320, 450, 0], ms: 950 };

function release(obj) {
  if (!obj) return;
  const root = obj.mesh || obj.sprite || obj;
  obj.remove?.();
  scene.remove(root);
  root.traverse?.((o) => {
    if (o.geometry && !o.isSprite) o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
  });
}

function clearBuild() {
  if (stage) stage.dispose();
  [...itemBoxes, ...itemLabels, ...drawer, shelfLabel, resultText].forEach(release);
  itemBoxes = []; itemLabels = []; drawer = []; shelfLabel = null; resultText = null;
}

function itemX(k) {
  const n = ITEMS.length;
  const total = n * 92 + (n - 1) * 22;
  return 320 - total / 2 + 46 + k * 114;
}

function build() {
  clearBuild();
  const cellW = Math.min(52, (540 - 6 * CAP) / (CAP + 1));
  stage = new TableStage(scene, {
    rows: 1, cols: CAP + 1, origin: [320, 470, 0],
    cellW, cellH: 42, gapX: 6, gapY: 6, color: BASE, textScale: 0.5,
    colLabels: Array.from({ length: CAP + 1 }, (_, w) => String(w)),
    colLabelOffset: 0, arrows: 8,
  });
  itemBoxes = ITEMS.map((it, k) => {
    const b = new VBox(scene, {
      w: 90, h: 48, d: 24, x: itemX(k), y: 650, z: 0,
      label: it.id + '  w' + it.w + ' v' + it.v, color: BASE, emissive: BASE,
    });
    b.label.scale.multiplyScalar(0.48);
    return b;
  });
  itemLabels = ITEMS.map((it, k) => new VText(scene, {
    text: '无限件', x: itemX(k), y: 608, z: 0, color: '#cbd5e1', scale: 0.4,
  }));
  shelfLabel = new VText(scene, { text: '物品货架', x: 90, y: 650, z: 0, color: '#60a5fa', scale: 0.46 });

  const dx = Math.min(38, 440 / CAP);
  drawer = Array.from({ length: CAP }, (_, k) => {
    const b = new VBox(scene, {
      w: dx - 4, h: 38, d: 20, x: 320 + (k - (CAP - 1) / 2) * dx, y: 330, z: 0,
      color: 0x0a0f2e, emissive: 0x0a0f2e,
    });
    b.mesh.material.transparent = true;
    b.mesh.material.opacity = 0.4;
    return b;
  });
  resultText = new VText(scene, { text: '最大价值 = —', x: 320, y: 245, z: 0, color: '#fde047', scale: 0.6 });

  dp = new Array(CAP + 1).fill(0);
  pick = new Array(CAP + 1).fill(null);
  cur = null;
  picked = [];
  stage.setValue(0, 0, 0, DIM);
  for (let w = 1; w <= CAP; w++) stage.hideValue(0, w);
  director.stateUpdate(state());
}

function fillCapacity(w) {
  let best = 0, bestItem = null;
  const cands = [];
  for (let k = 0; k < ITEMS.length; k++) {
    const it = ITEMS[k];
    if (it.w > w) {
      cur = { w, item: it.id, cand: '放不下（' + it.w + ' > ' + w + '）' };
      director.stateUpdate(state());
      continue;
    }
    const cand = dp[w - it.w] + it.v;
    cands.push(it.id + '=' + cand);
    itemBoxes[k].setColor(TAKE, TAKE);
    if (cand > best) { best = cand; bestItem = it; }
    cur = { w, item: it.id, cand: 'dp[' + (w - it.w) + '] + ' + it.v + ' = ' + cand };
    director.stateUpdate(state());
  }
  dp[w] = best;
  pick[w] = bestItem;
  itemBoxes.forEach((b) => b.setColor(BASE, BASE));
  stage.clearArrows();
  if (bestItem) stage.arrow(0, w - bestItem.w, 0, w, TAKE, 10);
  stage.focus(0, w);
  stage.setValue(0, w, best, bestItem ? BASE : DIM);
  cur = { w, item: bestItem ? bestItem.id : '—', cand: cands.length ? cands.join(' · ') : '没有物品放得下' };
  director.stateUpdate(state());
  director.setBeatState('dp[' + w + '] = ' + best + (bestItem ? ' · 最后装 ' + bestItem.id : ' · 空容量'));
  return { best, bestItem };
}

function* runUB() {
  director.reset();
  stage.reset();
  const c0 = stage.cell(0, 0);
  if (c0 && c0.label) c0.label.visible = true;
  stage.setColor(0, 0, DIM);
  for (let w = 1; w <= CAP; w++) {
    stage.hideValue(0, w);
    stage.setColor(0, w, BASE);
    stage.setExtrude(0, w, 1);
  }
  itemBoxes.forEach((b) => b.setColor(BASE, BASE));
  drawer.forEach((b) => { b.setText(''); b.setColor(0x0a0f2e, 0x0a0f2e); });
  resultText.setText('最大价值 = —', { color: '#fde047' });
  dp = new Array(CAP + 1).fill(0);
  pick = new Array(CAP + 1).fill(null);
  cur = null;
  picked = [];
  director.stateUpdate(state());

  director.chapter('建立');
  yield S(() => director.beat({
    title: '容量轴与无限物品',
    why: '完全背包里每件物品可以取任意多次。dp[w] 回答“容量 w 最多值多少”，容量轴从左到右正扫。',
    stateText: ITEMS.map((it) => it.id + '(' + it.w + '/' + it.v + ')').join(' · ') + ' · 容量 ' + CAP,
    progress: 0,
    camera: SHOT_ESTABLISH,
    annotations: [
      { id: 'items', text: '容量 0 → ' + CAP + ' · 物品无限', anchor: () => new THREE.Vector3(320, 650, 0), offset: [0, -20], className: 'gold' },
      { id: 'hook', text: '最多能装多少价值？', anchor: () => new THREE.Vector3(320, 430, 0), offset: [0, -22], className: 'final' },
    ],
  }));
  yield W(750);

  director.chapter('初始化');
  yield S(() => director.beat({
    title: 'dp[0] = 0',
    why: '容量 0 装不下任何物品，价值为 0；其余容量先置 0，随后逐个物品尝试“再装一件”。',
    stateText: 'dp[0] = 0 · 容量轴就绪',
    progress: 1,
    camera: SHOT_TOP,
    annotations: [{ id: 'zero', text: '容量 0 → 0', anchor: () => stage.anchor(0, 0), offset: [0, -18], className: 'gold' }],
  }));
  yield W(550);

  const minW = Math.min(...ITEMS.map((it) => it.w));
  const canFit = minW <= CAP;
  const demoW = canFit ? minW : Math.min(3, CAP);
  const firstFit = canFit ? ITEMS.filter((it) => it.w === minW) : [];
  const firstBest = canFit ? firstFit.reduce((a, b) => (b.v > a.v ? b : a)) : null;
  yield S(() => director.beat({
    title: canFit ? '容量 ' + demoW + '：第一次装下 ' + firstBest.id : '容量 ' + demoW + '：没有物品放得下',
    why: canFit
      ? firstFit.map((it) => it.id + '（w' + it.w + '/v' + it.v + '）').join('、') + ' 在容量 ' + demoW + ' 第一次放得下，dp[' + demoW + '] = dp[0] + ' + firstBest.v + ' = ' + firstBest.v + '。'
      : '最轻的 ' + ITEMS.map((it) => it.id + '（w' + it.w + '）').join('、') + ' 都重于容量 ' + CAP + '，任何容量都装不下物品，dp 全部为 0。',
    stateText: canFit ? '容量 ' + demoW + ' · 逐一尝试物品' : '容量 ' + demoW + ' · 无物品可装',
    progress: 2,
    camera: cellShot(demoW),
    annotations: canFit
      ? [{ id: 'first', text: 'dp[' + demoW + '] = dp[0] + v' + firstBest.id, anchor: () => stage.anchor(0, demoW), offset: [0, -18], className: 'final' }]
      : [{ id: 'first', text: '最轻 ' + minW + ' > 容量 ' + CAP, anchor: () => stage.anchor(0, demoW), offset: [0, -18], className: 'warn' }],
  }));
  yield W(300);
  for (let w = 1; canFit && w <= demoW; w++) {
    yield S(() => fillCapacity(w));
    yield W(90);
  }
  yield W(600);

  const scanStart = canFit ? demoW + 1 : 1;
  director.chapter('正序扫描');
  yield S(() => director.beat({
    title: canFit ? '容量正序，物品可以重复' : '无物品可装，dp 保持 0',
    why: canFit
      ? 'dp[w - wi] 在当前容量之前已经算好，可能刚刚装过同一件物品；正序扫描因此允许无限重复。'
      : '所有物品都重于容量，扫描每个容量都找不到可放物品；dp[0..' + CAP + '] 保持 0。',
    stateText: canFit
      ? (scanStart <= CAP ? '从容量 ' + scanStart + ' 扫到 ' + CAP + ' · 每格枚举 ' + ITEMS.length + ' 件物品' : '容量轴已填满 · dp[' + CAP + '] = ' + dp[CAP])
      : '容量 1 到 ' + CAP + ' 均无解 · dp[' + CAP + '] = 0',
    progress: 3,
    camera: SHOT_FILL,
    annotations: [{ id: 'scan', text: canFit ? '正序 → 可重复取' : '全部放不下', anchor: () => new THREE.Vector3(320, 560, 0), offset: [0, -20], className: canFit ? 'gold' : 'warn' }],
  }));
  yield W(300);
  for (let w = scanStart; w <= CAP; w++) {
    yield S(() => fillCapacity(w));
    yield W(90);
  }
  stage.clearArrows();
  stage.hideFocus();
  director.setProgress(3.6);
  director.setBeatState('容量轴填满 · dp[' + CAP + '] = ' + dp[CAP]);
  yield W(550);

  // 第 5 拍：容量柱与结果（按最大 dp 限高，避免大价值把场景顶穿）
  const hScale = Math.min(0.16, 4 / Math.max(1, dp[CAP]));
  yield S(() => director.beat({
    title: '容量柱抬高：最大价值 ' + dp[CAP],
    why: '把每格 dp 值拉伸成柱高，能直观看到价值如何随容量累积；最后一格就是答案。',
    stateText: 'dp[' + CAP + '] = ' + dp[CAP],
    progress: 4,
    camera: SHOT_TERRAIN,
    annotations: [{ id: 'ridge', text: '柱高 = dp[容量]', anchor: () => new THREE.Vector3(320, 560, 0), offset: [0, -20], className: 'final' }],
  }));
  yield A(900, (p) => {
    const e = p * p * (3 - 2 * p);
    for (let w = 0; w <= CAP; w++) stage.setExtrude(0, w, 1 + dp[w] * hScale * e);
  });
  for (let w = 0; w <= CAP; w++) stage.setExtrude(0, w, 1 + dp[w] * hScale);
  yield W(500);

  // 第 6 拍：回溯重复物品
  director.chapter('回溯');
  picked = [];
  let w = CAP;
  yield S(() => director.beat({
    title: '回溯：同一件可以反复取',
    why: '从 dp[CAP] 反复减去最后装入物品的重量；只要容量还够，同一件物品就会再次出现在组合里。',
    stateText: '从容量 ' + CAP + ' 出发',
    progress: 5,
    camera: SHOT_BACK,
    annotations: [{ id: 'back', text: '每次减掉最后装那件', anchor: () => new THREE.Vector3(320, 500, 0), offset: [0, -18], className: 'gold' }],
  }));
  yield W(400);
  while (w > 0 && pick[w]) {
    const it = pick[w];
    const slot = picked.length;
    picked.push(it);
    stage.setColor(0, w, GOLD);
    stage.focus(0, w);
    stage.clearArrows();
    stage.arrow(0, w - it.w, 0, w, GOLD, 10);
    if (drawer[slot]) {
      drawer[slot].setColor(TAKE, TAKE);
      drawer[slot].setText(it.id);
      drawer[slot].label.scale.multiplyScalar(0.55);
    }
    const w0 = w;
    w -= it.w;
    yield S(() => { director.stateUpdate(state()); director.setBeatState('dp[' + w0 + '] 装 ' + it.id + ' → 容量 ' + w0 + '−' + it.w + ' = ' + w); });
    yield W(330);
  }
  stage.hideFocus();
  stage.clearArrows();
  stage.setColor(0, CAP, GOLD);
  const solvable = dp[CAP] > 0;
  resultText.setText(solvable ? '最大价值 ' + dp[CAP] + ' · ' + picked.map((it) => it.id).join('+') : '装不满最大价值 0', { color: '#fde047' });

  // 第 7 拍：组合
  yield S(() => director.beat({
    title: solvable ? picked.map((it) => it.id).join(' + ') + ' → ' + dp[CAP] : '没有可装物品',
    why: solvable
      ? '回溯得到的物品可以重复：总重不超过容量，价值正好是 dp[CAP]；完全背包的最优组合可以包含多件同款。'
      : '所有物品都重于容量，回溯一开始就结束；最大价值保持 0，组合为空。',
    stateText: '组合 ' + (picked.map((it) => it.id).join('+') || '无') + ' · 价值 ' + dp[CAP],
    progress: 6,
    camera: SHOT_FINAL,
    annotations: [{ id: 'res', text: '最大价值 ' + dp[CAP], anchor: () => new THREE.Vector3(320, 270, 0), offset: [0, -20], className: 'final' }],
  }));
  status.textContent = '完全背包演示完成：容量 ' + CAP + '，物品 ' + ITEMS.map((it) => it.id + '(' + it.w + '/' + it.v + ')').join(' ') +
    '，最大价值 ' + dp[CAP] + '，组合 ' + (picked.map((it) => it.id).join('+') || '无') + ' · O(nW)';
  yield W(1000);

  director.chapter('复盘');
  yield S(() => director.beat({
    title: '正序扫描 = 无限件',
    why: '0/1 背包要倒序扫容量，避免同一件被重复取；完全背包正序扫，让 dp[w - wi] 已经包含当前物品，允许再次取用。',
    stateText: 'O(nW) 时间 / O(W) 空间 · ' + ITEMS.length + ' 件物品',
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
  const ws = parseNums(wInput.value);
  const vs = parseNums(vInput.value);
  const cap = parseNums(capInput.value)[0];
  if (ws.length < 2 || ws.length > 4 || ws.length !== vs.length) {
    status.textContent = '重量与价值个数需相同（2–4 件）';
    return;
  }
  if (ws.some((w) => w < 1 || w > 8) || vs.some((v) => v < 1 || v > 30)) {
    status.textContent = '重量 1–8，价值 1–30';
    return;
  }
  if (!(cap >= 5 && cap <= 12)) {
    status.textContent = '容量需在 5–12 之间';
    return;
  }
  ITEMS = ws.map((w, i) => ({ id: 'ABCD'[i], w, v: vs[i] }));
  CAP = Math.round(cap);
  wInput.value = ws.join(',');
  vInput.value = vs.join(',');
  capInput.value = String(CAP);
  restart(true);
}

const preset = input.addSelect('预设', ['3,5,4/4,8,6 · 10', '2,3,4/3,4,5 · 8', '1,3,5/1,4,7 · 9'], '3,5,4/4,8,6 · 10', (v) => {
  const [ws, vs, cap] = v.split(/[\/·]/).map((s) => s.trim());
  wInput.value = ws;
  vInput.value = vs;
  capInput.value = cap;
  applyInputs();
});
const wInput = panel.addInput('重量 3,5,4', applyInputs, 24);
const vInput = panel.addInput('价值 4,8,6', applyInputs, 24);
const capInput = panel.addInput('容量 10', applyInputs, 4);
wInput.value = ITEMS.map((it) => it.w).join(',');
vInput.value = ITEMS.map((it) => it.v).join(',');
capInput.value = String(CAP);

function restart(auto = true) {
  status.textContent = '';
  engine.clear();
  director.reset();
  build();
  engine.queue(() => runUB());
  if (auto) engine.toggle();
}

input.addButton('重播', () => restart(true));
input.addButton('清空', () => { engine.clear(); director.reset(); build(); status.textContent = ''; });

build();
engine.queue(() => runUB());
scene.start(engine);
