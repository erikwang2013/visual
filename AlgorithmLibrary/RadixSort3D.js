// AlgorithmLibrary/RadixSort3D.js — 基数排序（LSD）：数字小球瀑布式落入 0-9 桶，再按桶序收成有序河。
// 每趟按个位/十位/百位稳定分桶；桶计数与当前序列实时进面板。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { applyTheme } from '../3D/Glow.js';
import { StoryDirector } from '../3D/director/StoryDirector.js';
import { InputKit } from '../3D/director/InputKit.js';
import { SortStage } from '../3D/director/SortStage.js';
applyTheme('RadixSort3D');

const scene = new Scene3D('scene', { cameraPos: [320, 640, 980], lookAt: [320, 360, 0], fov: 50 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });
const input = new InputKit(panel);
const status = panel.addStatus('就绪');
const mob = matchMedia('(max-width: 900px)').matches;

const N = 15;
const SEED = [170, 45, 75, 90, 802, 24, 2, 66, 745, 91, 351, 488, 611, 223, 990];
const NAMES = ['个位', '十位', '百位', '千位'];
const C = { base: 0x60a5fa, active: 0xfbbf24, sorted: 0x4ade80, chain: 0xfde047 };
const SHOT_HOOK = { pos: [320, 640, 980], target: [320, 360, 0], ms: 900 };
const SHOT_BUCKETS = { pos: [320, 810, 540], target: [320, 300, -60], ms: 750 };
const SHOT_SIDE = { pos: [720, 430, 780], target: [320, 390, 0], ms: 700 };
const SHOT_FINAL = { pos: [320, 620, 1140], target: [320, 360, 0], ms: 900 };

const stage = new SortStage(scene, { n: N, cx: 320, baseY: 520, spacing: 44 });
stage.buildBalls(SEED, { radius: 16, labelScale: 0.38 });
stage.balls.forEach((ball, i) => ball.group.position.copy(stage.rowPos(i)));
stage.buildBuckets(10, { cx: 320, y: 250, z: -60, gap: 64, radius: 26, height: 190 });

let seed = SEED.slice();
let order = stage.balls.slice();
let buckets = Array.from({ length: 10 }, () => []);
let maxDigits = 3;
let passNo = 0;
let activeBucket = -1;
let activeIdx = -1;
let note = '按位分桶，再按桶序收集';

const director = new StoryDirector(scene, {
  title: '基数排序 · 桶阵',
  total: 8,
  legend: [
    { label: '待分桶', color: '#60a5fa' },
    { label: '当前元素', color: '#fbbf24' },
    { label: '已有序', color: '#4ade80' },
    { label: '有序链', color: '#fde047' },
    { label: '当前桶', color: '#22d3ee' },
  ],
  onReplay: () => restart(true),
});

const digitOf = (v, p) => Math.floor(v / (10 ** p)) % 10;
const digitCount = () => Math.max(1, String(Math.max(0, ...seed)).length);

function stateBlocks() {
  const counts = Array.from({ length: 10 }, (_, d) => (buckets[d] ? buckets[d].length : 0));
  return {
    blocks: [
      { type: 'kv', label: '轮次', items: [
        { k: '当前位', v: passNo < maxDigits ? NAMES[passNo] : '—' },
        { k: '轮次', v: `${Math.min(passNo + 1, maxDigits)}/${maxDigits}` },
        { k: '元素', v: order.length },
        { k: '稳定', v: '是' },
      ] },
      { type: 'chips', label: '0-9 桶（数量）', items: counts.map((n, d) => ({
        text: `${d}×${n}`,
        cls: d === activeBucket ? 'current' : (n ? 'open' : ''),
      })) },
      { type: 'dist', label: '序列', values: order.map((b) => b.value), current: activeIdx },
      { type: 'text', label: '当前', value: note },
    ],
    footer: '不变量：<b>每轮收集后低 k 位有序；稳定分桶保住前一轮顺序</b>',
  };
}
function refresh(text) {
  if (text !== undefined) note = text;
  director.stateUpdate(stateBlocks());
}

function* beginRadix() {
  passNo = 0;
  buckets = Array.from({ length: 10 }, () => []);
  activeBucket = -1;
  activeIdx = -1;
  maxDigits = digitCount();
  order = stage.balls.slice();
  stage.balls.forEach((ball, i) => {
    stage.setBallValue(ball, seed[i]);
    stage.setBallColor(ball, C.base);
    stage.setBallDigit(ball, '');
    ball.group.position.copy(stage.rowPos(i));
  });
  stage.hideChain();
  note = '0-9 桶待命';
  refresh();
  director.chapter('建立');
  yield S(() => director.beat({
    title: '不比较也能排序？',
    why: '基数排序把数字按位拆开，逐个丢进 0-9 桶，再按桶序收回；从最低位开始。',
    stateText: `当前位 ${NAMES[0]} · 桶 0-9 待命`,
    progress: 0,
    camera: SHOT_HOOK,
    annotations: [
      { id: 'hook', text: '数字卡片 + 0-9 桶', anchor: () => new THREE.Vector3(320, 430, -60), offset: [0, -20] },
      { id: 'why', text: '从低位开始，为什么？', anchor: () => new THREE.Vector3(320, 600, 0), offset: [0, -20], className: 'gold' },
    ],
  }));
  for (let d = 0; d < 10; d++) stage.setBucketActive(d, true);
  yield W(420);
  for (let d = 0; d < 10; d++) stage.setBucketActive(d, false);
  yield W(120);
}

function* radixPass(p) {
  passNo = p;
  const name = NAMES[p] || `第 ${p + 1} 位`;
  director.chapter(`第 ${p + 1} 趟 · ${name}`);
  stage.hideChain();
  buckets = Array.from({ length: 10 }, () => []);
  activeBucket = -1;
  activeIdx = -1;
  for (const ball of order) {
    stage.setBallColor(ball, C.base);
    stage.setBallDigit(ball, String(digitOf(ball.value, p)));
  }
  yield S(() => director.beat({
    title: `按${name}分桶`,
    why: p === 0
      ? '最低位先分桶；每一趟只关心当前这一位，桶内顺序保持进入顺序。'
      : '高位优先级更高；稳定分桶让低位已排好的顺序在高位相同时保持不变。',
    stateText: `第 ${p + 1}/${maxDigits} 趟 · 当前位 ${name}`,
    progress: 1 + p * 2,
    camera: SHOT_BUCKETS,
    annotations: [{ id: 'pass', text: `按${name}分桶`, anchor: () => new THREE.Vector3(320, 190, -60), offset: [0, -20], className: 'gold' }],
  }));
  yield W(400);

  for (let i = 0; i < order.length; i++) {
    const ball = order[i];
    const d = digitOf(ball.value, p);
    activeIdx = i;
    activeBucket = d;
    stage.setBallColor(ball, C.active);
    stage.setBucketActive(d, true);
    const to = stage.bucketSlot(d, buckets[d].length);
    refresh(`a[${i}]=${ball.value} 的${name} = ${d} → 桶 ${d}`);
    director.annotations.set('digit', { text: `${name} = ${d}`, anchor: () => to.clone().add(new THREE.Vector3(0, 54, 0)), offset: mob ? [d < 5 ? -76 : 76, -18] : [0, -18] });
    yield stage.flyBall(ball, to, { lift: 80, ms: 330 });
    ball.group.position.copy(to);
    buckets[d].push(ball);
    stage.setBallColor(ball, C.base);
    stage.setBucketActive(d, false);
    yield W(40);
  }
  activeBucket = -1;
  activeIdx = -1;

  yield S(() => director.beat({
    title: p === 0 ? '按桶序收集：低位有序' : '收集：稳定保住前序',
    why: '从桶 0 到桶 9 依次收回主行；同桶内保持进入顺序，所以分桶是稳定的。',
    stateText: `桶内元素 ${order.length} 个 · 收集到主行`,
    progress: 2 + p * 2,
    camera: SHOT_SIDE,
    annotations: [{ id: 'collect', text: '桶 0→9 依次收集', anchor: () => new THREE.Vector3(320, 430, -60), offset: [0, -20], className: 'gold' }],
  }));
  yield W(280);

  const next = [];
  let k = 0;
  for (let d = 0; d < 10; d++) {
    for (const ball of buckets[d]) {
      next.push(ball);
      activeIdx = k;
      refresh(`桶 ${d} → 主行 [${k}]`);
      const target = stage.rowPos(k);
      yield stage.flyBall(ball, target, { lift: 55, ms: 270 });
      ball.group.position.copy(target);
      k++;
    }
  }
  order = next;
  activeIdx = -1;
  stage.linkChain(order, C.chain, 0.38);
  refresh(`第 ${p + 1} 趟完成：低 ${p + 1} 位有序`);
  yield W(220);
}

function* finishRadix() {
  order.forEach((ball) => stage.setBallColor(ball, C.sorted));
  stage.linkChain(order, C.chain, 0.52);
  director.chapter('结算');
  yield S(() => director.beat({
    title: '整列有序',
    why: `${maxDigits} 趟 LSD：每趟按一位稳定分桶，收集后整体升序。`,
    stateText: `${N} 个元素 · ${maxDigits} 趟 · O(kn)`,
    progress: 7,
    camera: SHOT_FINAL,
    annotations: [
      { id: 'done', text: 'LSD 基数排序完成', anchor: () => new THREE.Vector3(320, 620, 0), offset: [-80, -12], className: 'final' },
      { id: 'chain', text: '有序河', anchor: () => new THREE.Vector3(320, 520, 0), offset: [80, -12], className: 'gold' },
    ],
  }));
  refresh('完成');
  status.textContent = `基数排序完成：${maxDigits} 趟 LSD · ${N} 个元素升序 [${order.map((b) => b.value).join(', ')}]`;
  director.setProgress(8);
  yield W(750);
  director.chapter('复盘');
  yield S(() => director.beat({
    title: '非比较排序的边界',
    why: 'O(kn) 快于比较排序下界，但要求键可按位拆分；稳定是 LSD 正确性的前提。',
    stateText: 'O(kn) · 稳定 · 需要额外桶空间',
    progress: 8,
    camera: SHOT_FINAL,
    annotations: [],
  }));
  yield W(600);
}

function* runRadix() {
  yield* beginRadix();
  for (let p = 0; p < maxDigits; p++) yield* radixPass(p);
  yield* finishRadix();
}

function resetStage() {
  maxDigits = digitCount();
  order = stage.balls.slice();
  stage.balls.forEach((ball, i) => {
    stage.setBallValue(ball, seed[i]);
    stage.setBallColor(ball, C.base);
    stage.setBallDigit(ball, '');
    ball.group.position.copy(stage.rowPos(i));
  });
  buckets = Array.from({ length: 10 }, () => []);
  passNo = 0;
  activeBucket = -1;
  activeIdx = -1;
  note = '按位分桶，再按桶序收集';
  stage.hideChain();
  director.stateUpdate(stateBlocks());
  status.textContent = '';
}

function restart(autoPlay = true) {
  engine.clear();
  director.reset();
  resetStage();
  engine.queue(() => runRadix());
  if (autoPlay) engine.toggle();
}

input.addButton('随机', () => {
  seed = Array.from({ length: N }, () => Math.floor(Math.random() * 1000));
  restart(true);
});
input.addButton('清空', () => { engine.clear(); director.reset(); resetStage(); });
panel.addInput('自定义: 170,45,75', (text) => {
  const nums = text.split(/[^0-9]+/).filter(Boolean).map(Number).filter((n) => n >= 0 && n <= 999);
  if (nums.length < 2) { status.textContent = '请输入至少 2 个 0..999 的整数'; return; }
  seed = Array.from({ length: N }, (_, i) => nums[i % nums.length]);
  restart(true);
  status.textContent = `自定义数组已循环补齐为 ${N} 个元素`;
}, 90);

resetStage();
engine.queue(() => runRadix());
scene.start(engine);
