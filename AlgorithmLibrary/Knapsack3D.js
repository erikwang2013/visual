// AlgorithmLibrary/Knapsack3D.js — 0/1 背包：物品盒 + 容量列 DP 表 + 含/不含双依赖箭头 + 金色回溯 + 地形拉伸。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
import { StoryDirector } from '../3D/director/StoryDirector.js';
import { InputKit } from '../3D/director/InputKit.js';
import { TableStage } from '../3D/director/TableStage.js';
applyTheme('Knapsack3D');

const scene = new Scene3D('scene', { cameraPos: [440, 660, 900], lookAt: [320, 470, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });
const input = new InputKit(panel);
const status = panel.addStatus('就绪');

const BASE = 0x60a5fa, DIM = 0x475569, SKIP = 0x67e8f9, TAKE = 0xfb923c, TIE = 0x22d3ee, GOLD = 0xfde047, YELLOW = 0xfacc15;
let WEIGHTS = [2, 3, 4, 5];
let VALUES = [3, 4, 5, 6];
let CAP = 8;
let stage = null;
let items = [];
let itemVals = [];
let tray = null;
let shelfLabel = null;
let capText = null;
let resultText = null;
let dp = [];
let selected = [];
let cur = null;

const ease = (p) => p * p * (3 - 2 * p);

const director = new StoryDirector(scene, {
  title: '0/1 背包 · 地形',
  total: 8,
  legend: [
    { label: '不含', color: '#67e8f9' },
    { label: '含', color: '#fb923c' },
    { label: '当前格', color: '#22d3ee' },
    { label: '回溯路径', color: '#fde047' },
  ],
  onReplay: () => restart(true),
});

function newDp() {
  return Array.from({ length: WEIGHTS.length + 1 }, () => new Array(CAP + 1).fill(0));
}

function state() {
  const n = WEIGHTS.length;
  const rowIdx = cur ? cur.i : 0;
  const row = dp[rowIdx] || [];
  const sel = selected.slice().reverse().map((i) => ({ text: 'i' + i + ':w' + WEIGHTS[i - 1] + 'v' + VALUES[i - 1], cls: 'done' }));
  const item = cur && cur.i > 0 ? { k: '重量/价值', v: WEIGHTS[cur.i - 1] + ' / ' + VALUES[cur.i - 1] } : { k: '重量/价值', v: '—' };
  return {
    blocks: [
      { type: 'kv', label: '当前格', items: cur ? [{ k: '物品/容量', v: cur.i + ' / ' + cur.c }, item] : [{ k: '物品/容量', v: '—' }, item] },
      { type: 'kv', label: '候选', items: cur ? [
        { k: '不含', v: cur.skip },
        { k: '含', v: cur.take !== null ? cur.take : cur.i > 0 ? '放不下' : '—' },
      ] : [{ k: '不含', v: '—' }, { k: '含', v: '—' }] },
      { type: 'chips', label: 'dp 行 ' + rowIdx, items: row.map((v, c) => ({ text: c + ':' + v, cls: cur && c === cur.c ? 'current' : '' })) },
      { type: 'chips', label: '已选物品', items: sel, empty: '—' },
      { type: 'text', label: '最优价值', value: String(dp[n][CAP]) },
    ],
    footer: 'dp[i][c] = 前 i 件、容量 c 的最优价值',
  };
}

function cellShot(i, c, ms = 720) {
  return { pos: [stage.xOf(c) + 250, stage.yOf(i) + 210, 560], target: [stage.xOf(c), stage.yOf(i), 0], ms };
}

const SHOT_ESTABLISH = { pos: [500, 700, 900], target: [320, 480, 0], ms: 900 };
const SHOT_TOP = { pos: [320, 960, 600], target: [320, 490, 0], ms: 850 };
const SHOT_FILL = { pos: [450, 700, 900], target: [320, 470, 0], ms: 750 };
const SHOT_BACK = { pos: [570, 620, 760], target: [320, 450, 0], ms: 850 };
const SHOT_TERRAIN = { pos: [660, 430, 820], target: [320, 400, 0], ms: 950 };
const SHOT_FINAL = { pos: [420, 580, 940], target: [320, 440, 0], ms: 950 };

// 文字纹理与 Sprite 几何全站共享，只释放物品盒/文字的私有几何和材质。
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

function clearBuild() {
  if (stage) stage.dispose();
  for (const o of [...items, ...itemVals, tray, shelfLabel, capText, resultText]) release(scene, o);
  items = []; itemVals = []; tray = null; shelfLabel = null; capText = null; resultText = null;
}

function itemX(k) {
  const n = WEIGHTS.length;
  const left = stage.x0 - stage.cw / 2;
  const right = stage.x0 + CAP * stage.stepX + stage.cw / 2;
  return left + ((k + 0.5) * (right - left)) / n;
}

function build() {
  clearBuild();
  const n = WEIGHTS.length;
  const cellW = Math.min(46, (470 - 6 * CAP) / (CAP + 1));
  stage = new TableStage(scene, {
    rows: n + 1, cols: CAP + 1, origin: [320, 430, 0],
    cellW, cellH: 36, gapX: 6, gapY: 6, color: BASE, textScale: 0.5,
    rowLabels: WEIGHTS.map((w, i) => 'w' + w + ' v' + VALUES[i]),
    colLabels: Array.from({ length: CAP + 1 }, (_, c) => String(c)),
    colLabelOffset: 0, rowLabelOffset: 54, arrows: 12,
  });
  for (let c = 0; c <= CAP; c++) stage.setValue(0, c, 0, DIM);
  for (let i = 1; i <= n; i++) stage.setValue(i, 0, 0, DIM);

  const itemY = stage.y0 + stage.ch / 2 + 120;
  items = WEIGHTS.map((w, i) => {
    const b = new VBox(scene, { w: 56, h: 52, d: 24, x: itemX(i), y: itemY, z: 0, label: 'w' + w, color: BASE, emissive: BASE });
    b.label.scale.multiplyScalar(0.55);
    return b;
  });
  itemVals = VALUES.map((v, i) => new VText(scene, {
    text: 'v' + v, x: itemX(i), y: itemY - 42, z: 0, color: '#cbd5e1', scale: 0.42,
  }));
  items.forEach((b) => { b.homeY = itemY; });

  const shelfY = itemY + 112;
  tray = new VBox(scene, {
    w: stage.cw + CAP * stage.stepX + 30, h: 58, d: 8, x: 320, y: shelfY, z: 0,
    color: 0x0a0f2e, emissive: 0x0a0f2e,
  });
  tray.mesh.material.transparent = true;
  tray.mesh.material.opacity = 0.35;
  shelfLabel = new VText(scene, { text: '已选背包', x: stage.x0 - stage.cw / 2 - 66, y: shelfY, z: 0, color: '#fde047', scale: 0.44 });
  capText = new VText(scene, {
    text: 'C = ' + CAP,
    x: stage.x0 + CAP * stage.stepX + stage.cw / 2 + 62,
    y: itemY, z: 0, color: '#fb923c', scale: 0.55,
  });
  resultText = new VText(scene, { text: '最大价值 = —', x: 320, y: stage.yOf(n) - 56, z: 0, color: '#fde047', scale: 0.62 });

  dp = newDp();
  selected = [];
  cur = null;
  director.stateUpdate(state());
}

function fillCell(i, c) {
  const w = WEIGHTS[i - 1], v = VALUES[i - 1];
  const skip = dp[i - 1][c];
  const take = c >= w ? dp[i - 1][c - w] + v : null;
  const best = take !== null && take > skip ? take : skip;
  dp[i][c] = best;
  stage.clearArrows();
  stage.arrow(i - 1, c, i, c, SKIP);
  if (take !== null) stage.arrow(i - 1, c - w, i, c, TAKE);
  stage.focus(i, c);
  const color = take !== null && take > skip ? TAKE : take === skip ? TIE : BASE;
  stage.setValue(i, c, best, color);
  cur = { i, c, skip, take, best };
  director.stateUpdate(state());
  director.setBeatState('dp[' + i + '][' + c + '] = max(不含 ' + skip + ', 含 ' +
    (take === null ? '—' : take) + ') = ' + best);
  return { skip, take, best };
}

function* runKnapsack() {
  director.reset();
  stage.reset();
  dp = newDp();
  selected = [];
  cur = null;
  for (let c = 0; c <= CAP; c++) stage.setValue(0, c, 0, DIM);
  for (let i = 1; i <= WEIGHTS.length; i++) stage.setValue(i, 0, 0, DIM);
  items.forEach((b) => { b.moveTo(itemX(items.indexOf(b)), b.homeY, 0, 260); b.setColor(BASE, BASE); });
  itemVals.forEach((t) => t.moveTo(t.sprite.position.x, b0Y(), 0, 260));
  if (resultText) resultText.setText('最大价值 = —', { color: '#fde047' });
  if (capText) capText.setText('C = ' + CAP, { color: '#fb923c' });
  director.stateUpdate(state());

  director.chapter('建立');
  yield S(() => director.beat({
    title: '物品与容量',
    why: '每件物品只有取 / 不取两种选择；容量 c 是约束，dp 表回答“前 i 件、容量 c 最多值多少”。',
    stateText: WEIGHTS.length + ' 件物品 · 容量 ' + CAP,
    progress: 0,
    camera: SHOT_ESTABLISH,
    annotations: [
      { id: 'items', text: WEIGHTS.map((w, i) => 'w' + w + '/v' + VALUES[i]).join('  '), anchor: () => new THREE.Vector3(320, items[0].mesh.position.y + 62, 0), offset: [0, -20], className: 'gold' },
      { id: 'cap', text: '容量 C = ' + CAP, anchor: () => new THREE.Vector3(capText.sprite.position.x, capText.sprite.position.y + 26, 0), offset: [0, -18] },
      { id: 'hook', text: '带走哪些，价值最大？', anchor: () => new THREE.Vector3(320, 700, 0), offset: [0, -22], className: 'final' },
    ],
  }));
  yield W(800);

  director.chapter('初始化');
  for (let c = 0; c <= CAP; c++) stage.setColor(0, c, YELLOW);
  yield S(() => director.beat({
    title: '第 0 行全 0',
    why: '没有物品可选时，任何容量的最优价值都是 0；容量 0 同理。',
    stateText: 'dp[0][*] = 0 · dp[*][0] = 0',
    progress: 1,
    camera: SHOT_TOP,
    annotations: [{ id: 'zero', text: '无物品 / 无容量 → 价值 0', anchor: () => new THREE.Vector3(320, 700, 0), offset: [0, -20] }],
  }));
  yield W(550);
  for (let c = 0; c <= CAP; c++) stage.setColor(0, c, DIM);

  // 第 2 拍：第一件物品 w2 v3 在容量 2 上的完整递推
  items[0].setColor(YELLOW, YELLOW);
  const first = fillCell(1, Math.min(WEIGHTS[0], CAP));
  const fc = Math.min(WEIGHTS[0], CAP);
  const takeTxt = first.take === null ? '放不下' : String(first.take);
  yield S(() => director.beat({
    title: '含 vs 不含',
    why: '不含 = 上一行同容量；含 = 留出 w 的容量后的最优值 + 本件价值。两条箭头就是这两个候选。',
    stateText: 'dp[1][' + fc + '] = max(不含 ' + first.skip + ', 含 ' + takeTxt + ') = ' + first.best,
    progress: 2,
    camera: cellShot(1, fc),
    annotations: [
      { id: 'skip', text: '不含：正上方', anchor: () => stage.anchor(0, fc), offset: [0, -16] },
      { id: 'take', text: first.take === null ? '容量不足 → 只能不含' : '含：左上 + v' + VALUES[0], anchor: () => stage.anchor(0, Math.max(0, fc - WEIGHTS[0])), offset: [0, -16], className: 'gold' },
    ],
  }));
  yield W(900);

  // 第 3 拍：较大值落格，然后填完整表
  yield S(() => {
    director.chapter('选择');
    director.beat({
      title: '取较大值落格',
      why: '0/1 背包每件只能取一次，所以“含”只能从上一行转移——这正是不等式约束的来源。',
      stateText: 'dp[1][' + fc + '] = ' + first.best + '（' +
        (first.take === null ? '本格放不下' : first.take > first.skip ? '含更优' : first.take === first.skip ? '两路相同' : '不含更优') + '）',
      progress: 3,
      camera: SHOT_FILL,
      annotations: [{ id: 'land', text: '最大值写入当前格', anchor: () => stage.anchor(1, fc), offset: [0, -18], className: 'final' }],
    });
  });
  yield A(450, (p) => { stage.ring.scale.setScalar(1 + 0.22 * Math.sin(p * Math.PI)); });
  stage.ring.scale.setScalar(1);

  for (let i = 1; i <= WEIGHTS.length; i++) {
    items.forEach((b, k) => b.setColor(k === i - 1 ? YELLOW : BASE, k === i - 1 ? YELLOW : BASE));
    for (let c = 1; c <= CAP; c++) {
      if (i === 1 && c === fc) continue;
      yield S(() => fillCell(i, c));
      if (c % 3 === 0) yield W(100);
    }
  }
  items.forEach((b) => b.setColor(BASE, BASE));
  stage.clearArrows();
  stage.hideFocus();
  director.setProgress(3.6);
  director.setBeatState('填表完成 · dp[' + WEIGHTS.length + '][' + CAP + '] = ' + dp[WEIGHTS.length][CAP]);

  // 第 4 拍：回溯
  director.chapter('回溯');
  stage.clearArrows();
  selected = [];
  let i = WEIGHTS.length, c = CAP;
  const cursorAt = (ri, rc) => {
    const skip = ri > 0 ? dp[ri - 1][rc] : 0;
    const w = ri > 0 ? WEIGHTS[ri - 1] : 0;
    const v = ri > 0 ? VALUES[ri - 1] : 0;
    const take = ri > 0 && rc >= w ? dp[ri - 1][rc - w] + v : null;
    return { i: ri, c: rc, skip, take, best: dp[ri][rc] };
  };
  cur = cursorAt(i, c);
  yield S(() => director.beat({
    title: '从右下角回溯',
    why: 'dp[i][c] 与 dp[i-1][c] 不同 ⇒ 这件物品被选中，跳到 (i-1, c-w)；相同 ⇒ 没选，直接上移。',
    stateText: 'dp[' + i + '][' + c + '] = ' + dp[i][c] + ' · 开始回走',
    progress: 4,
    camera: SHOT_BACK,
    annotations: [{ id: 'back', text: '值变小 → 选了这件', anchor: () => stage.anchor(i, c), offset: [0, -18], className: 'gold' }],
  }));
  yield W(500);
  while (i > 0) {
    const w = WEIGHTS[i - 1], v = VALUES[i - 1];
    stage.setColor(i, c, GOLD);
    const skip = dp[i - 1][c];
    const take = c >= w ? dp[i - 1][c - w] + v : null;
    let move;
    if (take !== null && dp[i][c] === take && take > skip) {
      selected.push(i);
      stage.arrow(i - 1, Math.max(0, c - w), i, c, GOLD);
      items[i - 1].setColor(TAKE, TAKE);
      items[i - 1].moveTo(itemX(i - 1), items[i - 1].homeY + 112, 0, 480);
      itemVals[i - 1].setText('v' + v, { color: '#fb923c' });
      itemVals[i - 1].moveTo(itemX(i - 1), items[i - 1].homeY + 74, 0, 480);
      c -= w;
      move = '选中物品 ' + i + '（w' + w + ' v' + v + '）· 剩余容量 ' + c;
    } else {
      stage.arrow(i - 1, c, i, c, GOLD);
      move = '物品 ' + i + ' 未选 · 行上移';
    }
    i--;
    stage.focus(i, c);
    cur = cursorAt(i, c);
    if (capText) capText.setText('C = ' + c, { color: '#fb923c' });
    yield S(() => {
      director.stateUpdate(state());
      director.setBeatState(move);
    });
    yield W(430);
  }

  // 第 5 拍：地形与不变量
  const total = dp[WEIGHTS.length][CAP];
  yield S(() => director.beat({
    title: '表格变地形：每格都是子问题最优',
    why: '地形高度就是 dp 值；每个格子在“前 i 件、容量 c”下都取到了最优，最优子结构把答案托到右下角。',
    stateText: '不变量：dp[i][c] = 前 i 件、容量 c 的最大价值',
    progress: 6,
    camera: SHOT_TERRAIN,
    annotations: [{ id: 'ridge', text: '选/不选两条路在山脊汇合', anchor: () => new THREE.Vector3(320, 640, 0), offset: [0, -22], className: 'final' }],
  }));
  yield A(950, (p) => {
    const e = ease(p);
    for (let r = 0; r <= WEIGHTS.length; r++) {
      for (let cc = 0; cc <= CAP; cc++) stage.setExtrude(r, cc, 1 + dp[r][cc] * 0.12 * e);
    }
  });
  yield W(500);

  // 第 6 拍：结算
  const chosen = selected.slice().reverse();
  const totalW = chosen.reduce((s, k) => s + WEIGHTS[k - 1], 0);
  yield S(() => {
    if (resultText) resultText.setText('最大价值 ' + total, { color: '#fde047' });
    director.chapter('结算');
    director.beat({
      title: '最大价值 = ' + total,
      why: '回溯选中的物品总重不超过容量；dp 表保证这是所有 0/1 组合里的最大值。',
      stateText: '物品 ' + (chosen.length ? chosen.join('+') : '无') + ' · 总重 ' + totalW + ' / ' + CAP + ' · 价值 ' + total,
      progress: 7,
      camera: SHOT_FINAL,
      annotations: [{ id: 'res', text: '最大价值 ' + total, anchor: () => new THREE.Vector3(320, resultText.sprite.position.y + 26, 0), offset: [0, -20], className: 'final' }],
    });
    director.stateUpdate(state());
  });
  status.textContent = '0/1 背包：容量 ' + CAP + '，选物品 ' + (chosen.length ? chosen.join('+') : '无') +
    '，总重 ' + totalW + '，最大价值 ' + total + ' · O(nC)';
  yield W(1000);

  director.chapter('复盘');
  yield S(() => director.beat({
    title: '0/1 背包不能贪心',
    why: '按单位价值贪心可能先拿小件而错过更优组合；DP 枚举“取/不取”的所有子问题，用 O(nC) 保证最优。',
    stateText: 'O(nC) 时间/空间 · ' + (WEIGHTS.length * CAP) + ' 个子问题',
    progress: 8,
    camera: SHOT_FINAL,
    annotations: [],
  }));
  yield W(700);
}

function b0Y() {
  return items[0] ? items[0].homeY - 42 : 600;
}

function parseNums(s) {
  return s.split(/[^0-9]+/).filter(Boolean).map(Number);
}

function applyInputs() {
  const ws = parseNums(wInput.value);
  const vs = parseNums(vInput.value);
  const cap = parseNums(capInput.value)[0];
  if (ws.length < 1 || ws.length !== vs.length || ws.length > 5) {
    status.textContent = '重量与价值个数必须相同（1–5 件）';
    return;
  }
  if (ws.some((w) => w < 1 || w > 15) || vs.some((v) => v < 1 || v > 99)) {
    status.textContent = '重量 1–15，价值 1–99';
    return;
  }
  if (!(cap >= 2 && cap <= 10)) {
    status.textContent = '容量需在 2–10 之间（表格规模限制）';
    return;
  }
  WEIGHTS = ws;
  VALUES = vs;
  CAP = Math.round(cap);
  wInput.value = WEIGHTS.join(',');
  vInput.value = VALUES.join(',');
  capInput.value = String(CAP);
  restart(true);
}

const wInput = panel.addInput('重量 2,3,4,5', applyInputs, 24);
const vInput = panel.addInput('价值 3,4,5,6', applyInputs, 24);
const capInput = panel.addInput('容量 8', applyInputs, 4);
wInput.value = WEIGHTS.join(',');
vInput.value = VALUES.join(',');
capInput.value = String(CAP);

function restart(auto = true) {
  status.textContent = '';
  engine.clear();
  director.reset();
  build();
  engine.queue(() => runKnapsack());
  if (auto) engine.toggle();
}

input.addButton('重播', () => restart(true));
input.addButton('清空', () => { engine.clear(); director.reset(); build(); status.textContent = ''; });

build();
engine.queue(() => runKnapsack());
scene.start(engine);
