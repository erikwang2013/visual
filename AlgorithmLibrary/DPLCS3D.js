// AlgorithmLibrary/DPLCS3D.js — 最长公共子序列：DP 表格舞台 + 匹配对角/不匹配上左依赖箭头 + 金色回溯蛇形。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
import { StoryDirector } from '../3D/director/StoryDirector.js';
import { InputKit } from '../3D/director/InputKit.js';
import { TableStage } from '../3D/director/TableStage.js';
applyTheme('DPLCS3D');

const scene = new Scene3D('scene', { cameraPos: [420, 640, 900], lookAt: [320, 450, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });
const input = new InputKit(panel);
const status = panel.addStatus('就绪');

const BASE = 0x60a5fa, DIM = 0x475569, MATCH = 0x4ade80, DEP = 0x67e8f9, CUR = 0x22d3ee, GOLD = 0xfde047;
let SA = 'ABCBDAB';   // 上串 = 列
let SB = 'BDCABA';    // 左串 = 行
let stage = null;
let resultText = null;
let dp = [];
let curCell = null;
let backChars = [];

const director = new StoryDirector(scene, {
  title: 'LCS · 公共子序列',
  total: 8,
  legend: [
    { label: '已填', color: '#60a5fa' },
    { label: '匹配', color: '#4ade80' },
    { label: '当前格', color: '#22d3ee' },
    { label: '回溯路径', color: '#fde047' },
  ],
  onReplay: () => restart(true),
});

function newDp() {
  return Array.from({ length: SB.length + 1 }, () => new Array(SA.length + 1).fill(0));
}

function state() {
  const rowIdx = curCell ? curCell.i : dp.length - 1;
  const row = dp[rowIdx] || [];
  const rowItems = row.map((v, j) => ({ text: j + ':' + v, cls: curCell && j === curCell.j ? 'current' : '' }));
  const chars = backChars.map((c) => ({ text: c, cls: 'done' }));
  const pair = curCell && curCell.i > 0 && curCell.j > 0
    ? { k: '字符', v: SB[curCell.i - 1] + ' vs ' + SA[curCell.j - 1] }
    : { k: '字符', v: 'ε' };
  return {
    blocks: [
      { type: 'kv', label: '当前格', items: curCell ? [{ k: 'i,j', v: curCell.i + ',' + curCell.j }, pair] : [{ k: 'i,j', v: '—' }, pair] },
      { type: 'chips', label: 'dp 行 ' + rowIdx, items: rowItems, empty: '—' },
      { type: 'chips', label: '回溯收集（右→左）', items: chars, empty: '—' },
      { type: 'text', label: 'LCS 长度', value: String(dp[dp.length - 1][SA.length]) },
    ],
    footer: 'dp[i][j] = 前缀 i / j 的 LCS 长度',
  };
}

function cellShot(i, j, ms = 720) {
  return { pos: [stage.xOf(j) + 250, stage.yOf(i) + 210, 560], target: [stage.xOf(j), stage.yOf(i), 0], ms };
}

const SHOT_ESTABLISH = { pos: [480, 680, 880], target: [320, 440, 0], ms: 900 };
const SHOT_TOP = { pos: [320, 930, 560], target: [320, 455, 0], ms: 850 };
const SHOT_FILL = { pos: [430, 640, 840], target: [320, 445, 0], ms: 750 };
const SHOT_PATH = { pos: [540, 580, 720], target: [320, 420, 0], ms: 850 };
const SHOT_FINAL = { pos: [340, 600, 900], target: [320, 410, 0], ms: 950 };

function build() {
  if (stage) stage.dispose();
  if (resultText) { resultText.remove(); resultText = null; }
  stage = new TableStage(scene, {
    rows: SB.length + 1, cols: SA.length + 1, origin: [320, 455, 0],
    cellW: 44, cellH: 36, gapX: 6, gapY: 6, color: BASE, textScale: 0.5,
    rowLabels: [...SB], colLabels: [...SA], corner: 'ε', rowLabelOffset: 38, arrows: 18,
  });
  for (let j = 0; j <= SA.length; j++) stage.setValue(0, j, 0, DIM);
  for (let i = 1; i <= SB.length; i++) stage.setValue(i, 0, 0, DIM);
  resultText = new VText(scene, { text: 'LCS = —', x: 320, y: 282, z: 0, color: '#fde047', scale: 0.72 });
  dp = newDp();
  curCell = null;
  backChars = [];
  director.stateUpdate(state());
}

function applyCell(i, j) {
  const eq = SB[i - 1] === SA[j - 1];
  const up = dp[i - 1][j], left = dp[i][j - 1], diag = dp[i - 1][j - 1];
  const v = eq ? diag + 1 : Math.max(up, left);
  dp[i][j] = v;
  stage.clearArrows();
  if (eq) stage.arrow(i - 1, j - 1, i, j, MATCH);
  else {
    stage.arrow(i - 1, j, i, j, DEP);
    stage.arrow(i, j - 1, i, j, DEP);
  }
  stage.focus(i, j);
  stage.setValue(i, j, v, eq ? MATCH : CUR);
  curCell = { i, j };
  director.stateUpdate(state());
  director.setBeatState('dp[' + i + '][' + j + '] = ' + v + ' · ' +
    (eq ? SB[i - 1] + ' 匹配 → 左上 ' + diag + ' + 1' : 'max(上 ' + up + ', 左 ' + left + ')'));
  return { eq, v, up, left, diag };
}

function* runLCS() {
  director.reset();
  stage.reset();
  dp = newDp();
  curCell = null;
  backChars = [];
  for (let j = 0; j <= SA.length; j++) stage.setValue(0, j, 0, DIM);
  for (let i = 1; i <= SB.length; i++) stage.setValue(i, 0, 0, DIM);
  if (resultText) resultText.setText('LCS = —', { color: '#fde047' });
  director.stateUpdate(state());

  director.chapter('建立');
  yield S(() => director.beat({
    title: '两串与空表格',
    why: '行 = 左串前缀，列 = 上串前缀；每格只回答一个问题：这两个前缀的 LCS 有多长？',
    stateText: '上串 ' + SA + ' · 左串 ' + SB,
    progress: 0,
    camera: SHOT_ESTABLISH,
    annotations: [
      { id: 'top', text: '上串 ' + SA, anchor: () => new THREE.Vector3(320, stage.y0 + stage.ch / 2 + 62, 0), offset: [0, -20], className: 'gold' },
      { id: 'left', text: '左串 ' + SB, anchor: () => new THREE.Vector3(stage.x0 - stage.cw / 2 - 96, 455, 0), offset: [0, -20] },
      { id: 'hook', text: '最长公共子序列有多长？', anchor: () => new THREE.Vector3(320, 640, 0), offset: [0, -22], className: 'final' },
    ],
  }));
  yield W(750);

  director.chapter('初始化');
  for (let j = 0; j <= SA.length; j++) stage.setColor(0, j, GOLD);
  for (let i = 1; i <= SB.length; i++) stage.setColor(i, 0, GOLD);
  yield S(() => director.beat({
    title: '边界置 0',
    why: '空串和任何串的 LCS 都是 0——这一行/列是递推的起点。',
    stateText: 'dp[0][*] = dp[*][0] = 0',
    progress: 1,
    camera: SHOT_TOP,
    annotations: [{ id: 'zero', text: '空串 → LCS = 0', anchor: () => new THREE.Vector3(320, 640, 0), offset: [0, -20] }],
  }));
  yield W(600);
  for (let j = 0; j <= SA.length; j++) stage.setColor(0, j, DIM);
  for (let i = 1; i <= SB.length; i++) stage.setColor(i, 0, DIM);

  // 第 2、3 拍：用 (1,1)、(1,2) 分别展示不匹配与匹配的转移
  const a = applyCell(1, 1);
  yield S(() => {
    director.chapter('不匹配');
    director.beat({
      title: a.eq ? '匹配 → 对角线 +1' : '不匹配 → max(上, 左)',
      why: a.eq
        ? '两字符相等，可以同时消耗两个前缀：dp[i-1][j-1] + 1。'
        : '两字符不等，当前格不能同时收两个字符，只能从丢掉一边的上/左格继承较大值。',
      stateText: 'dp[1][1] = ' + a.v + ' · 上 ' + a.up + ' / 左 ' + a.left,
      progress: 2,
      camera: cellShot(1, 1),
      annotations: [{
        id: 'c11', text: a.eq ? '相等 → 左上 + 1' : '不等 → 取上/左最大',
        anchor: () => stage.anchor(1, 1), offset: [0, -18], className: a.eq ? 'final' : 'warn',
      }],
    });
  });
  yield W(800);

  const b = applyCell(1, 2);
  yield S(() => {
    director.chapter('匹配');
    director.beat({
      title: b.eq ? '匹配 → 对角线 +1' : '不匹配 → max(上, 左)',
      why: b.eq
        ? 'SB[0] = SA[1] = ' + SB[0] + '，两个前缀末尾相同，对角线小问题 +1 即得当前格。'
        : '末尾仍不同，继续从上/左继承——匹配只在字符相等时发生。',
      stateText: 'SB[0]=' + SB[0] + ' vs SA[1]=' + SA[1] + ' · dp[1][2] = ' + b.v + ' · 上 ' + b.up + ' / 左 ' + b.left,
      progress: 3,
      camera: cellShot(1, 2),
      annotations: [{
        id: 'c12', text: b.eq ? SB[0] + ' = ' + SA[1] + ' → 左上 ' + b.diag + ' + 1 = ' + b.v : '不等 → max(上 ' + b.up + ', 左 ' + b.left + ')',
        anchor: () => stage.anchor(1, 2), offset: [0, -18], className: b.eq ? 'final' : 'warn',
      }],
    });
  });
  yield W(800);

  director.chapter('填表');
  yield S(() => director.beat({
    title: '逐行填满 DP 表',
    why: '每个格只依赖已经算好的上、左、左上三格；子问题最优 ⇒ 全局最优。',
    stateText: '从第 1 行开始，逐格取匹配/不匹配规则',
    progress: 4,
    camera: SHOT_FILL,
    annotations: [{ id: 'fill', text: '匹配走对角，不匹配看上/左', anchor: () => new THREE.Vector3(320, 620, 0), offset: [0, -20] }],
  }));
  let count = 0;
  for (let i = 1; i <= SB.length; i++) {
    for (let j = 1; j <= SA.length; j++) {
      if ((i === 1 && j === 1) || (i === 1 && j === 2)) continue;
      yield S(() => applyCell(i, j));
      count++;
      if (count % 3 === 0) yield W(110);
    }
  }
  yield S(() => {
    stage.clearArrows();
    stage.hideFocus();
    director.setProgress(4.6);
    director.setBeatState('填表完成 · 右下角 dp[' + SB.length + '][' + SA.length + '] = ' + dp[SB.length][SA.length] + ' 就是 LCS 长度');
  });
  yield W(550);

  // 第 5 拍：回溯蛇形
  director.chapter('回溯');
  stage.clearArrows();
  let i = SB.length, j = SA.length;
  backChars = [];
  curCell = { i, j };
  yield S(() => {
    director.beat({
      title: '从右下角回溯',
      why: '相等 ⇐ 来自左上（收下该字符）；不等 ⇐ 来自上/左中较大的那格。',
      stateText: 'dp[' + i + '][' + j + '] = ' + dp[i][j] + ' · 开始回走',
      progress: 5,
      camera: SHOT_PATH,
      annotations: [{ id: 'back', text: '回溯：匹配走 ↖，不匹配走 ↑ / ←', anchor: () => stage.anchor(i, j), offset: [0, -18], className: 'gold' }],
    });
  });
  yield W(500);
  while (i > 0 && j > 0) {
    const i0 = i, j0 = j;
    let move;
    if (SB[i - 1] === SA[j - 1]) {
      backChars.push(SB[i - 1]);
      stage.setColor(i, j, GOLD);
      stage.arrow(i, j, i - 1, j - 1, GOLD);
      i--; j--;
      move = '匹配 ' + SB[i0 - 1] + ' → 左上（收字符）';
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      stage.setColor(i, j, GOLD);
      stage.arrow(i, j, i - 1, j, GOLD);
      i--;
      move = '上 ' + dp[i0 - 1][j0] + ' ≥ 左 ' + dp[i0][j0 - 1] + ' → 当前走上';
    } else {
      stage.setColor(i, j, GOLD);
      stage.arrow(i, j, i, j - 1, GOLD);
      j--;
      move = '左 ' + dp[i0][j0 - 1] + ' > 上 ' + dp[i0 - 1][j0] + ' → 当前走左';
    }
    stage.focus(i, j);
    curCell = { i, j };
    yield S(() => {
      director.stateUpdate(state());
      director.setBeatState('(' + i0 + ',' + j0 + ') → (' + i + ',' + j + ') · ' + move);
    });
    yield W(260);
  }
  const lcs = backChars.slice().reverse().join('');

  // 第 6 拍：结果
  stage.hideFocus();
  stage.clearArrows();
  yield S(() => {
    if (resultText) resultText.setText('LCS = ' + (lcs || 'ε'), { color: '#fde047' });
    director.chapter('结算');
    director.beat({
      title: 'LCS = ' + (lcs || 'ε') + ' · 长度 ' + lcs.length,
      why: '回溯只经过匹配字符；把它们按正序连起来就是最长公共子序列。',
      stateText: '到达边界 (' + i + ',' + j + ') · 长度 ' + lcs.length,
      progress: 7,
      camera: SHOT_FINAL,
      annotations: [{ id: 'lcs', text: 'LCS = ' + (lcs || 'ε'), anchor: () => new THREE.Vector3(320, 330, 0), offset: [0, -20], className: 'final' }],
    });
    director.stateUpdate(state());
  });
  status.textContent = 'LCS("' + SA + '","' + SB + '") = "' + lcs + '"，长度 ' + lcs.length +
    ' · dp ' + (SB.length + 1) + '×' + (SA.length + 1) + ' · O(mn)';
  yield W(1000);

  director.chapter('复盘');
  yield S(() => director.beat({
    title: 'DP 消除重复子问题',
    why: '暴力枚举所有公共子序列是指数级；DP 每格只算一次，用 O(mn) 个格子的表换掉重复计算。',
    stateText: 'O(mn) 时间/空间 · ' + (SB.length * SA.length) + ' 个子问题',
    progress: 8,
    camera: SHOT_FINAL,
    annotations: [],
  }));
  yield W(700);
}

function applyInputs() {
  const a = topInput.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  const b = leftInput.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
  if (a.length < 2 || b.length < 2) {
    status.textContent = '两串至少各 2 个字符（仅字母/数字，上串 ≤8、左串 ≤7）';
    return;
  }
  SA = a; SB = b;
  topInput.value = SA;
  leftInput.value = SB;
  restart(true);
}

const topInput = panel.addInput('上串（列）', applyInputs, 12);
topInput.value = SA;
const leftInput = panel.addInput('左串（行）', applyInputs, 12);
leftInput.value = SB;

function restart(auto = true) {
  status.textContent = '';
  engine.clear();
  director.reset();
  build();
  engine.queue(() => runLCS());
  if (auto) engine.toggle();
}

input.addButton('重播', () => restart(true));
input.addButton('清空', () => { engine.clear(); director.reset(); build(); status.textContent = ''; });

build();
engine.queue(() => runLCS());
scene.start(engine);
