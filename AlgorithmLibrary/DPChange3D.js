// AlgorithmLibrary/DPChange3D.js — 找零 DP：面额货架 + 金额格 + 找零抽屉，逐金额枚举硬币取最少枚数。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
import { StoryDirector } from '../3D/director/StoryDirector.js';
import { InputKit } from '../3D/director/InputKit.js';
import { TableStage } from '../3D/director/TableStage.js';
applyTheme('DPChange3D');

const scene = new Scene3D('scene', { cameraPos: [420, 660, 900], lookAt: [320, 470, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });
const input = new InputKit(panel);
const status = panel.addStatus('就绪');

const BASE = 0x60a5fa, DIM = 0x475569, COIN = 0xfacc15, ORANGE = 0xfb923c, CUR = 0x22d3ee, GOLD = 0xfde047;
let COINS = [1, 3, 4];
let AMOUNT = 10;
let stage = null;
let coinBoxes = [];
let coinLabels = [];
let drawer = [];
let shelfLabel = null;
let resultText = null;
let dp = [];
let use = [];
let cur = null;
let picked = [];

const director = new StoryDirector(scene, {
  title: '找零 · 抽屉',
  total: 8,
  legend: [
    { label: '硬币面额', color: '#facc15' },
    { label: '当前金额', color: '#22d3ee' },
    { label: '已凑金额', color: '#60a5fa' },
    { label: '找零组合', color: '#fde047' },
  ],
  onReplay: () => restart(true),
});

function fmt(v) { return Number.isFinite(v) ? String(v) : '∞'; }

function state() {
  const c = cur;
  return {
    blocks: [
      { type: 'kv', label: '当前金额', items: c
        ? [{ k: '金额', v: c.w + ' / ' + AMOUNT }, { k: '尝试硬币', v: c.coin ?? '—' }, { k: '候选', v: c.cand ?? '—' }]
        : [{ k: '金额', v: '—' }, { k: '尝试硬币', v: '—' }, { k: '候选', v: '—' }] },
      { type: 'chips', label: 'dp[金额]', items: dp.map((v, w) => ({ text: w + ':' + fmt(v), cls: c && c.w === w ? 'current' : Number.isFinite(v) ? 'visited' : '' })), empty: '—' },
      { type: 'chips', label: '找零抽屉', items: picked.map((v) => ({ text: String(v), cls: 'done' })), empty: '—' },
      { type: 'text', label: '最少枚数', value: fmt(dp[AMOUNT]) },
    ],
    footer: 'dp[w] = 凑出金额 w 的最少硬币数',
  };
}

function cellShot(w, ms = 650) {
  return { pos: [stage.xOf(w) + 190, stage.yOf(0) + 250, 520], target: [stage.xOf(w), stage.yOf(0), 0], ms };
}

const SHOT_ESTABLISH = { pos: [470, 700, 900], target: [320, 470, 0], ms: 900 };
const SHOT_TOP = { pos: [320, 930, 560], target: [320, 490, 0], ms: 850 };
const SHOT_FILL = { pos: [460, 700, 880], target: [320, 470, 0], ms: 700 };
const SHOT_FINAL = { pos: [420, 600, 900], target: [320, 430, 0], ms: 900 };

// 文字纹理与 Sprite 几何共享；只释放页面私有几何/材质。
function release(obj) {
  if (!obj) return;
  const root = obj.mesh || obj.sprite;
  obj.remove?.();
  scene.remove(root);
  root.traverse?.((o) => {
    if (o.geometry && !o.isSprite) o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
  });
}

function clearBuild() {
  if (stage) stage.dispose();
  [...coinBoxes, ...coinLabels, ...drawer, shelfLabel, resultText].forEach(release);
  coinBoxes = []; coinLabels = []; drawer = []; shelfLabel = null; resultText = null;
}

function shelfX(k) {
  const total = COINS.length * 64 + (COINS.length - 1) * 18;
  return 320 - total / 2 + 32 + k * 82;
}

function build() {
  clearBuild();
  const cellW = Math.min(48, (540 - 6 * AMOUNT) / (AMOUNT + 1));
  stage = new TableStage(scene, {
    rows: 1, cols: AMOUNT + 1, origin: [320, 470, 0],
    cellW, cellH: 42, gapX: 6, gapY: 6, color: BASE, textScale: 0.52,
    colLabels: Array.from({ length: AMOUNT + 1 }, (_, w) => String(w)),
    colLabelOffset: 0, arrows: 0,
  });
  coinBoxes = COINS.map((c, k) => {
    const b = new VBox(scene, { w: 62, h: 54, d: 26, x: shelfX(k), y: 645, z: 0, label: String(c), color: COIN, emissive: COIN });
    b.label.scale.multiplyScalar(0.62);
    return b;
  });
  coinLabels = COINS.map((c, k) => new VText(scene, {
    text: '面额 ' + c, x: shelfX(k), y: 600, z: 0, color: '#cbd5e1', scale: 0.4,
  }));
  shelfLabel = new VText(scene, { text: '硬币货架', x: stage.x0 - stage.cw / 2 - 66, y: 645, z: 0, color: '#facc15', scale: 0.46 });

  const dx = Math.min(38, 430 / AMOUNT);
  drawer = Array.from({ length: AMOUNT }, (_, k) => new VBox(scene, {
    w: dx - 4, h: 40, d: 20, x: 320 + (k - (AMOUNT - 1) / 2) * dx, y: 300, z: 0,
    color: 0x0a0f2e, emissive: 0x0a0f2e,
  }));
  drawer.forEach((b) => {
    b.mesh.material.transparent = true;
    b.mesh.material.opacity = 0.4;
  });
  resultText = new VText(scene, { text: '最少枚数 = —', x: 320, y: 220, z: 0, color: '#fde047', scale: 0.62 });

  dp = new Array(AMOUNT + 1).fill(Infinity);
  dp[0] = 0;
  use = new Array(AMOUNT + 1).fill(undefined);
  cur = null;
  picked = [];
  for (let w = 0; w <= AMOUNT; w++) stage.hideValue(0, w);
  director.stateUpdate(state());
}

function coinFlash(k, color) {
  coinBoxes[k]?.setColor(color, color);
}

function fillAmount(w) {
  let best = Infinity, bestCoin;
  const cands = [];
  for (let k = 0; k < COINS.length; k++) {
    const c = COINS[k];
    if (c > w || !Number.isFinite(dp[w - c])) continue;
    const v = dp[w - c] + 1;
    cands.push(c + '→' + v);
    coinFlash(k, ORANGE);
    if (v < best) { best = v; bestCoin = c; }
  }
  dp[w] = best;
  use[w] = bestCoin;
  stage.setValue(0, w, fmt(best), Number.isFinite(best) ? CUR : DIM);
  stage.focus(0, w);
  cur = { w, coin: bestCoin ?? '—', cand: cands.length ? cands.join(' / ') : '无可用硬币' };
  director.stateUpdate(state());
  director.setBeatState('dp[' + w + '] = ' + fmt(best) + ' · ' +
    (bestCoin !== undefined ? '用 ' + bestCoin + ' 分：dp[' + (w - bestCoin) + '] + 1' : '没有硬币能凑出'));
  return cur;
}

function greed() {
  const sorted = COINS.slice().sort((a, b) => b - a);
  let left = AMOUNT, n = 0;
  const got = [];
  for (const c of sorted) {
    while (left >= c) { left -= c; n++; got.push(c); }
  }
  return { ok: left === 0, n, got };
}

function* runChange() {
  director.reset();
  stage.reset();
  for (let w = 0; w <= AMOUNT; w++) stage.hideValue(0, w);
  stage.setValue(0, 0, 0, DIM);
  coinBoxes.forEach((b) => b.setColor(COIN, COIN));
  drawer.forEach((b) => { b.setText(''); b.setColor(0x0a0f2e, 0x0a0f2e); });
  resultText.setText('最少枚数 = —', { color: '#fde047' });
  dp = new Array(AMOUNT + 1).fill(Infinity);
  dp[0] = 0;
  use = new Array(AMOUNT + 1).fill(undefined);
  cur = null;
  picked = [];
  director.stateUpdate(state());

  director.chapter('建立');
  yield S(() => director.beat({
    title: '硬币货架与金额格',
    why: '每种硬币无限枚；金额格 dp[w] 回答“凑出 w 最少要几枚”。从左到右逐额求解，每格只依赖更小的金额。',
    stateText: '面额 ' + COINS.join(' / ') + ' · 目标 ' + AMOUNT,
    progress: 0,
    camera: SHOT_ESTABLISH,
    annotations: [
      { id: 'coins', text: '硬币面额 ' + COINS.join('、'), anchor: () => new THREE.Vector3(320, 690, 0), offset: [0, -20], className: 'gold' },
      { id: 'hook', text: '凑出 ' + AMOUNT + '，最少几枚？', anchor: () => new THREE.Vector3(320, 430, 0), offset: [0, -22], className: 'final' },
    ],
  }));
  yield W(750);

  director.chapter('初始化');
  stage.setColor(0, 0, GOLD);
  yield S(() => director.beat({
    title: 'dp[0] = 0',
    why: '凑出 0 分不需要硬币，这是整张表的起点；其余金额先记为 ∞（还不知道怎么凑）。',
    stateText: 'dp[0] = 0 · dp[1..' + AMOUNT + '] = ∞',
    progress: 1,
    camera: SHOT_TOP,
    annotations: [{ id: 'zero', text: '金额 0 → 0 枚', anchor: () => stage.anchor(0, 0), offset: [0, -18], className: 'gold' }],
  }));
  yield W(550);
  stage.setColor(0, 0, DIM);

  director.chapter('第一格');
  const first = fillAmount(1);
  yield S(() => director.beat({
    title: '金额 1：枚举硬币',
    why: '只考虑不超过当前金额、且能由已知金额转移过来的硬币。候选 = dp[w - c] + 1，取最小。',
    stateText: 'dp[1] = ' + fmt(first.best ?? dp[1]) + ' · 候选 ' + (first.cand ?? '—'),
    progress: 2,
    camera: cellShot(1),
    annotations: [{ id: 'one', text: '候选 ' + (first.cand || '无'), anchor: () => stage.anchor(0, 1), offset: [0, -18], className: 'final' }],
  }));
  coinBoxes.forEach((b) => b.setColor(COIN, COIN));
  yield W(800);

  director.chapter('填表');
  yield S(() => director.beat({
    title: '逐额枚举每种硬币',
    why: 'dp[w] = min(dp[w - c] + 1)；同一面额可以反复使用。金额从小到大扫描，每个子问题都已算好。',
    stateText: '从金额 2 扫到 ' + AMOUNT + ' · 每种硬币试一次',
    progress: 3,
    camera: SHOT_FILL,
    annotations: [{ id: 'fill', text: '金额轴从左到右', anchor: () => new THREE.Vector3(320, 550, 0), offset: [0, -20] }],
  }));
  yield W(500);

  for (let w = 2; w <= AMOUNT; w++) {
    coinBoxes.forEach((b) => b.setColor(COIN, COIN));
    yield S(() => fillAmount(w));
    yield W(Math.max(140, 260 - COINS.length * 24));
  }
  coinBoxes.forEach((b) => b.setColor(COIN, COIN));
  stage.hideFocus();
  director.setProgress(3.6);
  director.setBeatState('填表完成 · dp[' + AMOUNT + '] = ' + fmt(dp[AMOUNT]));
  yield W(500);

  // 第 5 拍：最少枚数落定
  yield S(() => director.beat({
    title: '最少枚数 = ' + fmt(dp[AMOUNT]),
    why: '表的最后一格就是答案。每一格都取了所有硬币候选中的最小值，因此不会漏掉更优组合。',
    stateText: 'dp[' + AMOUNT + '] = ' + fmt(dp[AMOUNT]) + '（' + (Number.isFinite(dp[AMOUNT]) ? '可达' : '无解') + '）',
    progress: 4,
    camera: cellShot(AMOUNT),
    annotations: [{ id: 'ans', text: 'dp[' + AMOUNT + '] = ' + fmt(dp[AMOUNT]), anchor: () => stage.anchor(0, AMOUNT), offset: [0, -18], className: 'final' }],
  }));
  yield W(700);

  // 第 6 拍：回溯到抽屉
  director.chapter('回溯');
  picked = [];
  let w = AMOUNT;
  yield S(() => director.beat({
    title: '回溯找零抽屉',
    why: 'dp[w] 的最优解用了某枚硬币 c，则 dp[w - c] 也必是最优解；不断减去 c，就能还原整组硬币。',
    stateText: '从金额 ' + AMOUNT + ' 出发 · 每次减掉选中的面额',
    progress: 5,
    camera: { pos: [500, 520, 780], target: [320, 350, 0], ms: 800 },
    annotations: [{ id: 'drawer', text: '抽屉按顺序装入硬币', anchor: () => new THREE.Vector3(320, 330, 0), offset: [0, -18], className: 'gold' }],
  }));
  yield W(450);
  while (w > 0 && use[w] !== undefined) {
    const c = use[w];
    const slot = picked.length;
    picked.push(c);
    stage.setColor(0, w, GOLD);
    stage.focus(0, w);
    if (drawer[slot]) {
      drawer[slot].setColor(GOLD, GOLD);
      drawer[slot].setText(String(c));
      drawer[slot].label.scale.multiplyScalar(0.55);
    }
    const w0 = w;
    w -= c;
    yield S(() => { director.stateUpdate(state()); director.setBeatState('dp[' + w0 + '] 用 ' + c + ' 分 → 金额 ' + w0 + ' − ' + c + ' = ' + w); });
    yield W(320);
  }
  stage.hideFocus();
  stage.setColor(0, AMOUNT, GOLD);
  const solvable = Number.isFinite(dp[AMOUNT]);
  if (resultText) resultText.setText(solvable ? '最少 ' + picked.length + ' 枚' : '无解', { color: '#fde047' });

  // 第 7 拍：方案
  yield S(() => director.beat({
    title: picked.length ? picked.join(' + ') + ' = ' + AMOUNT : '无法凑出 ' + AMOUNT,
    why: '把回溯得到的硬币放回金额格：每枚硬币正好覆盖一段金额，抽屉拼出目标金额，枚数就是 dp 值。',
    stateText: '方案 ' + (picked.join(' + ') || '无') + ' · 共 ' + picked.length + ' 枚',
    progress: 6,
    camera: SHOT_FINAL,
    annotations: [{ id: 'res', text: '最少 ' + picked.length + ' 枚', anchor: () => new THREE.Vector3(320, 245, 0), offset: [0, -20], className: 'final' }],
  }));
  status.textContent = '找零演示完成：面额 ' + COINS.join('/') + '，金额 ' + AMOUNT + '，最少 ' + (solvable ? picked.length : '∞') +
    ' 枚（' + (solvable ? picked.join('+') : '无解') + '） · O(金额 × 币种)';
  yield W(1000);

  // 第 8 拍：复盘
  const g = greed();
  const counter = g.ok && g.n > picked.length
    ? '贪心优先大额会拿 ' + g.got.join('+') + ' = ' + g.n + ' 枚，DP 只用 ' + picked.length + ' 枚。'
    : '贪心在这里也不差，但换一组面额就可能失手；DP 枚举所有面额候选，始终最优。';
  director.chapter('复盘');
  yield S(() => director.beat({
    title: 'DP 用所有候选换确定最优',
    why: counter,
    stateText: 'O(' + AMOUNT + ' × ' + COINS.length + ') 时间 · O(' + AMOUNT + ') 空间',
    progress: 8,
    camera: SHOT_FINAL,
    annotations: [],
  }));
  yield W(700);
}

function parseNums(s) {
  return s.split(/[^0-9]+/).filter(Boolean).map(Number);
}

function applyInputs() {
  const coins = [...new Set(parseNums(coinInput.value))].filter((c) => c > 0 && c <= 12).sort((a, b) => a - b);
  const amount = parseNums(amountInput.value)[0];
  if (coins.length < 2 || coins.length > 4) {
    status.textContent = '硬币面额需 2–4 种（1–12，逗号分隔）';
    return;
  }
  if (!(amount >= 3 && amount <= 12)) {
    status.textContent = '目标金额需在 3–12 之间';
    return;
  }
  if (coins.some((c) => c > amount)) {
    status.textContent = '硬币面额不能大于目标金额';
    return;
  }
  COINS = coins;
  AMOUNT = amount;
  coinInput.value = COINS.join(',');
  amountInput.value = String(AMOUNT);
  restart(true);
}

const preset = input.addSelect('预设', ['1,3,4 · 10', '1,5,6 · 11', '2,5,7 · 12'], '1,3,4 · 10', (v) => {
  if (v.startsWith('自定义')) return;
  const [cs, am] = v.split('·').map((s) => s.trim());
  coinInput.value = cs;
  amountInput.value = am;
  applyInputs();
});
const coinInput = panel.addInput('硬币 1,3,4', applyInputs, 24);
const amountInput = panel.addInput('金额 10', applyInputs, 4);
coinInput.value = COINS.join(',');
amountInput.value = String(AMOUNT);

function restart(auto = true) {
  status.textContent = '';
  engine.clear();
  director.reset();
  build();
  engine.queue(() => runChange());
  if (auto) engine.toggle();
}

input.addButton('重播', () => restart(true));
input.addButton('清空', () => { engine.clear(); director.reset(); build(); status.textContent = ''; });

build();
engine.queue(() => runChange());
scene.start(engine);
