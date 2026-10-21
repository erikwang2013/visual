// AlgorithmLibrary/EditDistance3D.js — 编辑距离：DP 表格 + 插入/删除/替换三色箭头 + 金色回溯操作路径。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
import { StoryDirector } from '../3D/director/StoryDirector.js';
import { InputKit } from '../3D/director/InputKit.js';
import { TableStage } from '../3D/director/TableStage.js';
applyTheme('EditDistance3D');

const scene = new Scene3D('scene', { cameraPos: [430, 650, 900], lookAt: [320, 445, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });
const input = new InputKit(panel);
const status = panel.addStatus('就绪');

const BASE = 0x60a5fa, DIM = 0x475569, MATCH = 0x4ade80, INS = 0x22d3ee, DEL = 0xfb923c, REP = 0xa78bfa, GOLD = 0xfde047;
let T = 'kitten';    // 行：改写起点
let TARGET = 'sitting';   // 列：改写终点
let stage = null;
let resultText = null;
let dp = [];
let curCell = null;
let cands = null;
let ops = [];
let finalDist = null;

const director = new StoryDirector(scene, {
  title: '编辑距离 · 三操作',
  total: 8,
  legend: [
    { label: '插入', color: '#22d3ee' },
    { label: '删除', color: '#fb923c' },
    { label: '替换', color: '#a78bfa' },
    { label: '路径', color: '#fde047' },
  ],
  onReplay: () => restart(true),
});

function newDp() {
  return Array.from({ length: T.length + 1 }, () => new Array(TARGET.length + 1).fill(0));
}

function opText(kind, i, j) {
  if (kind === 'rep') return '替 ' + T[i - 1] + '→' + TARGET[j - 1];
  if (kind === 'del') return '删 ' + T[i - 1];
  return '插 ' + TARGET[j - 1];
}

function state() {
  const i = curCell ? curCell.i : T.length;
  const j = curCell ? curCell.j : TARGET.length;
  const row = dp[i] || [];
  const pair = curCell && i > 0 && j > 0 ? T[i - 1] + ' vs ' + TARGET[j - 1] : 'ε';
  let opItems;
  if (cands) {
    opItems = [
      { text: '插 ' + cands.ins, cls: cands.win === 'ins' ? 'done' : '' },
      { text: '删 ' + cands.del, cls: cands.win === 'del' ? 'done' : '' },
      { text: '替 ' + cands.rep, cls: cands.win === 'rep' ? 'done' : '' },
    ];
  } else {
    opItems = [];
  }
  return {
    blocks: [
      { type: 'kv', label: '当前格', items: curCell ? [{ k: 'i,j', v: i + ',' + j }, { k: '字符', v: pair }] : [{ k: 'i,j', v: '—' }, { k: '字符', v: pair }] },
      { type: 'chips', label: '候选（插/删/替）', items: opItems, empty: '—' },
      { type: 'chips', label: 'dp 行 ' + i, items: row.map((v, k) => ({ text: k + ':' + v, cls: curCell && k === j ? 'current' : '' })), empty: '—' },
      { type: 'chips', label: '编辑路径（正向）', items: ops.map((o) => ({ text: o.text, cls: 'done' })), empty: '—' },
      { type: 'text', label: '编辑距离', value: finalDist === null ? '—' : String(finalDist) },
    ],
    footer: 'dp[i][j] = 前 i / j 个字符的最少编辑数',
  };
}

function cellShot(i, j, ms = 720) {
  return { pos: [stage.xOf(j) + 240, stage.yOf(i) + 200, 560], target: [stage.xOf(j), stage.yOf(i), 0], ms };
}

const SHOT_ESTABLISH = { pos: [480, 700, 900], target: [320, 450, 0], ms: 900 };
const SHOT_TOP = { pos: [320, 920, 500], target: [320, 455, 0], ms: 850 };
const SHOT_FILL = { pos: [440, 650, 860], target: [320, 440, 0], ms: 750 };
const SHOT_PATH = { pos: [570, 560, 760], target: [320, 420, 0], ms: 850 };
const SHOT_FINAL = { pos: [330, 620, 940], target: [320, 410, 0], ms: 950 };

function build() {
  if (stage) stage.dispose();
  if (resultText) { resultText.remove(); resultText = null; }
  stage = new TableStage(scene, {
    rows: T.length + 1, cols: TARGET.length + 1, origin: [320, 455, 0],
    cellW: 40, cellH: 34, gapX: 5, gapY: 6, color: BASE, textScale: 0.5,
    rowLabels: [...T], colLabels: [...TARGET], corner: 'ε', rowLabelOffset: 34, arrows: 14,
  });
  resultText = new VText(scene, { text: '编辑距离 = —', x: 320, y: 280, z: 0, color: '#fde047', scale: 0.66 });
  dp = newDp();
  curCell = null;
  cands = null;
  ops = [];
  finalDist = null;
  director.stateUpdate(state());
}

// 计算 (i,j) 并落格；arrows=false 用于初始化阶段预热依赖格。
function applyCell(i, j, arrows = true) {
  const eq = T[i - 1] === TARGET[j - 1];
  const rep = dp[i - 1][j - 1] + (eq ? 0 : 1);
  const del = dp[i - 1][j] + 1;
  const ins = dp[i][j - 1] + 1;
  const v = eq ? rep : Math.min(rep, del, ins);
  dp[i][j] = v;
  const win = eq ? 'diag' : v === ins ? 'ins' : v === del ? 'del' : 'rep';
  if (arrows) {
    stage.clearArrows();
    if (eq) stage.arrow(i - 1, j - 1, i, j, MATCH);
    else {
      stage.arrow(i, j - 1, i, j, INS);
      stage.arrow(i - 1, j, i, j, DEL);
      stage.arrow(i - 1, j - 1, i, j, REP);
    }
    stage.focus(i, j);
  }
  stage.setValue(i, j, v, eq ? MATCH : BASE);
  curCell = { i, j };
  cands = { rep, del, ins, win, eq };
  director.stateUpdate(state());
  director.setBeatState('dp[' + i + '][' + j + '] = ' + v + ' · ' +
    (eq ? T[i - 1] + ' = ' + TARGET[j - 1] + ' → 左上 + 0' : 'min(插 ' + ins + ', 删 ' + del + ', 替 ' + rep + ')'));
  return { v, eq, rep, del, ins, win };
}

function* runEdit() {
  director.reset();
  stage.reset();
  dp = newDp();
  curCell = null;
  cands = null;
  ops = [];
  finalDist = null;
  for (let j = 0; j <= TARGET.length; j++) { dp[0][j] = j; stage.setValue(0, j, j, DIM); }
  for (let i = 1; i <= T.length; i++) { dp[i][0] = i; stage.setValue(i, 0, i, DIM); }
  if (resultText) resultText.setText('编辑距离 = —', { color: '#fde047' });
  director.stateUpdate(state());

  director.chapter('建立');
  yield S(() => director.beat({
    title: '两串 + 空表格',
    why: '行 = 原串 ' + T + '，列 = 目标串 ' + TARGET + '；dp[i][j] 回答：前 i 个字符改成前 j 个字符最少几步？',
    stateText: '原串 ' + T + ' → 目标串 ' + TARGET,
    progress: 0,
    camera: SHOT_ESTABLISH,
    annotations: [
      { id: 'cols', text: '目标串 ' + TARGET, anchor: () => new THREE.Vector3(320, stage.y0 + stage.ch / 2 + 60, 0), offset: [0, -20], className: 'gold' },
      { id: 'rows', text: '原串 ' + T, anchor: () => new THREE.Vector3(stage.x0 - stage.cw / 2 - 52, 455, 0), offset: [0, -20] },
      { id: 'hook', text: '改几个字符能一样？', anchor: () => new THREE.Vector3(320, 650, 0), offset: [0, -22], className: 'final' },
    ],
  }));
  yield W(750);

  director.chapter('初始化');
  for (let j = 0; j <= TARGET.length; j++) stage.setColor(0, j, GOLD);
  for (let i = 1; i <= T.length; i++) stage.setColor(i, 0, GOLD);
  yield S(() => director.beat({
    title: '空串边界：全是插入/删除',
    why: '第一行 = 从空串插入 j 个字符；第一列 = 删除 i 个字符——这就是边界代价。',
    stateText: 'dp[0][j] = j · dp[i][0] = i',
    progress: 1,
    camera: SHOT_TOP,
    annotations: [{ id: 'zero', text: '空串 → 插入/删除', anchor: () => new THREE.Vector3(320, 650, 0), offset: [0, -20] }],
  }));
  yield W(550);
  for (let j = 0; j <= TARGET.length; j++) stage.setColor(0, j, DIM);
  for (let i = 1; i <= T.length; i++) stage.setColor(i, 0, DIM);

  // 示例格由实际字符决定；预热为示例格补齐行列依赖，避免固定下标的越界/错叙。
  let demoMatch = null, demoMismatch = null;
  for (let i = 1; i <= T.length && (!demoMatch || !demoMismatch); i++) {
    for (let j = 1; j <= TARGET.length && (!demoMatch || !demoMismatch); j++) {
      const eq = T[i - 1] === TARGET[j - 1];
      if (eq && !demoMatch) demoMatch = { i, j };
      if (!eq && !demoMismatch) demoMismatch = { i, j };
    }
  }
  const computed = new Set();
  const keyAt = (i, j) => i + ',' + j;
  const preheat = (i0, j0) => {
    for (let i = 1; i <= i0; i++) {
      for (let j = 1; j <= (i === i0 ? j0 : TARGET.length); j++) {
        if (computed.has(keyAt(i, j))) continue;
        applyCell(i, j, false);
        computed.add(keyAt(i, j));
      }
    }
  };
  const calm = () => {
    for (const k of computed) {
      const [ci, cj] = k.split(',').map(Number);
      stage.setColor(ci, cj, BASE);
    }
  };

  // 第 2 拍：匹配（或说明本输入无相等字符对）
  director.chapter('匹配');
  if (demoMatch) {
    preheat(demoMatch.i, demoMatch.j);
    calm();
    const m = applyCell(demoMatch.i, demoMatch.j);
    computed.add(keyAt(demoMatch.i, demoMatch.j));
    const mi = demoMatch.i, mj = demoMatch.j;
    yield S(() => director.beat({
      title: '相等 → 左上 + 0',
      why: '末尾字符相同，不需要任何操作，代价原样继承 dp[i-1][j-1]。',
      stateText: 'T[' + (mi - 1) + '] = 目标[' + (mj - 1) + '] = ' + T[mi - 1] + ' · dp[' + mi + '][' + mj + '] = ' + m.v,
      progress: 2,
      camera: cellShot(mi, mj),
      annotations: [{ id: 'match', text: '“' + T[mi - 1] + '” = “' + TARGET[mj - 1] + '” → 免费继承左上', anchor: () => stage.anchor(mi, mj), offset: [0, -18], className: 'final' }],
    }));
  } else {
    yield S(() => director.beat({
      title: '本次没有相同字符对',
      why: '两串没有任何对齐位置字符相等；等号分支本次不触发，但遇到不等时仍按三操作取最小。',
      stateText: 'T = ' + T + ' · 目标 = ' + TARGET + ' · 无相等字符对',
      progress: 2,
      camera: SHOT_FILL,
      annotations: [{ id: 'match', text: '无相等字符对 → 走三操作分支', anchor: () => new THREE.Vector3(320, 650, 0), offset: [0, -20], className: 'warn' }],
    }));
  }
  yield W(750);

  // 第 3 拍：不匹配三候选（或说明本输入全部对齐）
  director.chapter('不匹配');
  if (demoMismatch) {
    preheat(demoMismatch.i, demoMismatch.j);
    calm();
    const x = applyCell(demoMismatch.i, demoMismatch.j);
    computed.add(keyAt(demoMismatch.i, demoMismatch.j));
    const xi = demoMismatch.i, xj = demoMismatch.j;
    const dir = x.win === 'ins' ? '取插入 ' + x.ins + ' → 走左' : x.win === 'del' ? '取删除 ' + x.del + ' → 走上' : '取替换 ' + x.rep + ' → 走左上';
    yield S(() => director.beat({
      title: '三操作取最小 + 1',
      why: '替 = 左上 + 1；删 = 上 + 1；插 = 左 + 1。当前格取三者中最便宜的一步。',
      stateText: '“' + T[xi - 1] + '” ≠ “' + TARGET[xj - 1] + '” · 插 ' + x.ins + ' · 删 ' + x.del + ' · 替 ' + x.rep + ' → min ' + x.v,
      progress: 3,
      camera: cellShot(xi, xj),
      annotations: [{ id: 'ops', text: dir, anchor: () => stage.anchor(xi, xj), offset: [0, -18], className: 'warn' }],
    }));
  } else {
    stage.clearArrows();
    stage.hideFocus();
    yield S(() => director.beat({
      title: '本次没有不等字符对',
      why: '所有对齐位置字符都相等；min(插, 删, 替) 本次不触发，遇到不等时仍取三者最小值。',
      stateText: 'T = ' + T + ' · 目标 = ' + TARGET + ' · 全部匹配',
      progress: 3,
      camera: SHOT_FILL,
      annotations: [{ id: 'ops', text: '全等 · 触发的都是左上继承', anchor: () => new THREE.Vector3(320, 650, 0), offset: [0, -20], className: 'final' }],
    }));
  }
  yield W(850);
  stage.clearArrows();
  stage.hideFocus();

  // 第 4 拍：填满
  director.chapter('填表');
  yield S(() => director.beat({
    title: '逐行填满 DP 表',
    why: '每格的三个候选都已在上一行/左一格算好；局部最优一步步拼出全局最优。',
    stateText: 'i = 1 … ' + T.length + '，j = 1 … ' + TARGET.length,
    progress: 4,
    camera: SHOT_FILL,
    annotations: [{ id: 'fill', text: '插 ←，删 ↑，替 ↖', anchor: () => new THREE.Vector3(320, 650, 0), offset: [0, -20] }],
  }));
  let n = 0;
  for (let i = 1; i <= T.length; i++) {
    for (let j = 1; j <= TARGET.length; j++) {
      if (computed.has(keyAt(i, j))) continue;
      yield S(() => applyCell(i, j));
      computed.add(keyAt(i, j));
      n++;
      if (n % 4 === 0) yield W(70);
    }
  }
  yield S(() => {
    stage.clearArrows();
    stage.hideFocus();
    finalDist = dp[T.length][TARGET.length];
    director.setProgress(4.6);
    director.setBeatState('填表完成 · 右下角 dp[' + T.length + '][' + TARGET.length + '] = ' + finalDist);
    director.stateUpdate(state());
  });
  yield W(500);

  // 第 5 拍：回溯操作路径
  director.chapter('回溯');
  stage.clearArrows();
  let i = T.length, j = TARGET.length;
  const rev = [];
  const path = [];
  curCell = { i, j };
  stage.setColor(i, j, GOLD);
  yield S(() => director.beat({
    title: '从右下角回走',
    why: '相等 ↖（不操作）；否则看 dp 值来自插入 ←、删除 ↑ 还是替换 ↖，每步还原一个操作。',
    stateText: 'dp[' + i + '][' + j + '] = ' + finalDist,
    progress: 5,
    camera: SHOT_PATH,
    annotations: [{ id: 'back', text: '比较 → 选中代价来源', anchor: () => stage.anchor(i, j), offset: [0, -18], className: 'gold' }],
  }));
  yield W(450);
  while (i > 0 || j > 0) {
    let kind;
    if (i > 0 && j > 0 && T[i - 1] === TARGET[j - 1]) {
      kind = 'match';
      stage.arrow(i - 1, j - 1, i, j, GOLD);
      i--; j--;
    } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      kind = 'rep';
      stage.arrow(i - 1, j - 1, i, j, GOLD);
      rev.push({ kind, text: opText('rep', i, j) });
      i--; j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      kind = 'del';
      stage.arrow(i - 1, j, i, j, GOLD);
      rev.push({ kind, text: opText('del', i, j) });
      i--;
    } else {
      kind = 'ins';
      stage.arrow(i, j - 1, i, j, GOLD);
      rev.push({ kind, text: opText('ins', i, j) });
      j--;
    }
    path.push({ i, j });
    stage.setColor(i, j, GOLD);
    stage.focus(i, j);
    curCell = { i, j };
    cands = null;
    ops = rev.slice().reverse();
    const label = kind === 'match' ? '匹配 ' + T[i] + ' → 左上（不操作）' : rev[rev.length - 1].text;
    yield S(() => {
      director.stateUpdate(state());
      director.setBeatState(label + ' · 剩余 dp = ' + dp[i][j]);
    });
    yield W(270);
  }
  ops = rev.slice().reverse();

  // 第 6 拍：结算
  stage.hideFocus();
  stage.clearArrows();
  const opLine = ops.length ? ops.map((o) => o.text).join(' · ') : '完全相同';
  yield S(() => {
    if (resultText) resultText.setText('编辑距离 = ' + finalDist, { color: '#fde047' });
    director.chapter('结算');
    director.beat({
      title: '编辑距离 = ' + finalDist,
      why: '回溯路径上的非匹配步就是最少的插入/删除/替换序列，步数等于 dp 右下角。',
      stateText: opLine,
      progress: 7,
      camera: SHOT_FINAL,
      annotations: [{ id: 'dist', text: '最少 ' + finalDist + ' 步', anchor: () => new THREE.Vector3(320, 300, 0), offset: [0, -20], className: 'final' }],
    });
    director.stateUpdate(state());
  });
  status.textContent = '编辑距离 "' + T + '" → "' + TARGET + '" = ' + finalDist + ' · ' + opLine +
    ' · dp ' + T.length + '×' + TARGET.length + ' · O(mn)';
  yield W(1000);

  director.chapter('复盘');
  yield S(() => director.beat({
    title: 'O(mn) 换掉指数枚举',
    why: '编辑距离是拼写纠错、模糊搜索与 DNA 比对的核心；每格只算一次，回溯还能给出具体操作。',
    stateText: '时间/空间 O(mn) · ' + (T.length * TARGET.length) + ' 个子问题',
    progress: 8,
    camera: SHOT_FINAL,
    annotations: [],
  }));
  yield W(700);
}

function applyInputs() {
  const a = rowInput.value.trim().toLowerCase().replace(/[^a-z]/g, '').slice(0, 7);
  const b = colInput.value.trim().toLowerCase().replace(/[^a-z]/g, '').slice(0, 7);
  if (!a || !b) {
    status.textContent = '两串至少各 1 个字母（a–z，各 ≤7）';
    return;
  }
  T = a; TARGET = b;
  rowInput.value = T;
  colInput.value = TARGET;
  restart(true);
}

const rowInput = panel.addInput('原串（行）', applyInputs, 12);
rowInput.value = T;
const colInput = panel.addInput('目标串（列）', applyInputs, 12);
colInput.value = TARGET;

function restart(auto = true) {
  status.textContent = '';
  engine.clear();
  director.reset();
  build();
  engine.queue(() => runEdit());
  if (auto) engine.toggle();
}

input.addButton('重播', () => restart(true));
input.addButton('清空', () => { engine.clear(); director.reset(); build(); status.textContent = ''; });

build();
engine.queue(() => runEdit());
scene.start(engine);
