// AlgorithmLibrary/SkipList3D.js — 跳表：多层有序链表加速查找 —— 顶层稀疏「快车道」，底层全量兜底；搜索 = 逐层向右 + 向下（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('SkipList3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, GREEN = 0x4ade80;
const status = panel.addStatus('就绪');

const LANES = [[3, 17, 25], [3, 9, 17, 25], [3, 6, 9, 12, 17, 19, 22, 25], [3, 6, 9, 12, 17, 19, 22, 25, 28]];
const LAYER_Y = [530, 470, 410, 350];
const vx = v => 20 + v * 20;

const nodes = new Map();
let edgeMeshes = new Map();
LANES.forEach((lane, li) => {
  lane.forEach(v => {
    nodes.set(li + '-' + v, new VNode(scene, { radius: 18, x: vx(v), y: LAYER_Y[li], z: 0, label: String(v), color: BLUE, emissive: BLUE }));
  });
});
new VText(scene, { text: 'L3', x: -40, y: LAYER_Y[0], z: 0, color: PALETTE.textDim, scale: 0.45 });
new VText(scene, { text: 'L0', x: -40, y: LAYER_Y[3], z: 0, color: PALETTE.textDim, scale: 0.45 });

function buildEdges() {
  edgeMeshes.forEach(m => scene.remove(m));
  edgeMeshes = new Map();
  const mk = (li, v1, v2) => {
    const a = { x: vx(v1), y: LAYER_Y[li], z: 0 }, b = { x: vx(v2), y: LAYER_Y[li], z: 0 };
    edgeMeshes.set(li + '-' + v1 + '-' + v2, tubeBetween(scene, a, b, { color: PALETTE.edge, opacity: 0.35, radius: 2 }));
  };
  LANES.forEach((lane, li) => {
    for (let i = 0; i + 1 < lane.length; i++) mk(li, lane[i], lane[i + 1]);
  });
  for (let li = 1; li < LANES.length; li++) {
    LANES[li - 1].forEach(v => {
      if (!LANES[li].includes(v)) return;
      const a = { x: vx(v), y: LAYER_Y[li - 1], z: 0 }, b = { x: vx(v), y: LAYER_Y[li], z: 0 };
      edgeMeshes.set('down-' + li + '-' + v, tubeBetween(scene, a, b, { color: PALETTE.edge, opacity: 0.2, radius: 1.5 }));
    });
  }
}
buildEdges();
const nodeAt = (li, v) => nodes.get(li + '-' + v);
function setCol(li, v, c) { nodeAt(li, v).setColor(c, c); }
function resetAll() { LANES.forEach((lane, li) => lane.forEach(v => setCol(li, v, BLUE))); }

function* searchGen(key) {
  let l = 0;
  let cur = LANES[0][0];
  setCol(l, cur, CYAN);
  yield S(() => { status.textContent = '搜索 ' + key + '：从顶层 L' + l + ' 起点 ' + cur + ' 出发（青 = 当前考察）'; });
  yield W(600);
  while (true) {
    const lane = LANES[l];
    const i = lane.indexOf(cur);
    const next = lane[i + 1];
    if (next !== undefined && next < key) {
      setCol(l, cur, GOLD);
      cur = next;
      setCol(l, cur, CYAN);
      yield S(() => { status.textContent = 'L' + l + '：' + next + ' < ' + key + ' → 向右推进（路径金色）'; });
      yield W(550);
      continue;
    }
    if (next !== undefined && next === key) {
      setCol(l, next, GREEN);
      yield S(() => { status.textContent = 'L' + l + '：' + next + ' == ' + key + ' → 找到！（绿）—— 顶层大步跳过大量节点，期望 O(log n)'; });
      yield W(900);
      return;
    }
    if (l < LANES.length - 1) {
      setCol(l, cur, ORANGE);
      yield S(() => { status.textContent = 'L' + l + '：' + next + ' > ' + key + ' 或已到头 → 向下到 L' + (l + 1) + '（橙）'; });
      yield W(550);
      l++;
      cur = LANES[l][LANES[l].indexOf(cur)];
      setCol(l, cur, CYAN);
      continue;
    }
    setCol(l, cur, RED);
    yield S(() => { status.textContent = 'L' + l + '：' + next + ' ≠ ' + key + ' 且已到底层 → 未找到（红）；期望 O(log n)，最坏 O(n)'; });
    yield W(900);
    return;
  }
}

function* skipGen() {
  yield S(() => { status.textContent = '跳表：每层是上一层的「抽样快车道」—— 顶层大步跳、底层精确走，查找期望 O(log n)；演示 1：搜索 19'; });
  yield W(700);
  yield* searchGen(19);
  yield S(() => { status.textContent = '演示 2：搜索 10（不在表中）—— 观察向右推进与向下换层'; });
  yield W(600);
  resetAll();
  yield W(400);
  yield* searchGen(10);
  yield S(() => { status.textContent = '复杂度：查找/插入/删除期望 O(log n)（随机化层高），最坏 O(n) —— Redis 有序集合 zset 与 LevelDB MemTable 的底层'; });
  yield W(1100);
  yield S(() => { status.textContent = '跳表演示完成：搜索 19 命中 L2（顶层大步跳过大量比较）、搜索 10 确认不存在；查找期望 O(log n)'; });
  yield W(500);
}

function* runSkip() {
  yield* skipGen();
}

engine.queue(() => runSkip());
panel.addButton('清空', () => { engine.clear(); resetAll(); buildEdges(); status.textContent = ''; });

scene.start(engine);
