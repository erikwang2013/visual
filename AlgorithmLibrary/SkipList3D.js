// AlgorithmLibrary/SkipList3D.js — 跳表：多层有序链表加速查找 —— 顶层稀疏「快车道」，底层全量兜底；搜索 = 逐层向右 + 向下（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, VBox, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('SkipList3D');

const scene = new Scene3D('scene', { cameraPos: [0, 380, 640], fov: 50 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：跳表搜索 19（找到）+ 搜索 10（未找到）', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 0, y: 262, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: -70, z: 0, color: PALETTE.textGlow, scale: 0.56 });
const outT = new VText(scene, { text: '', x: 0, y: -130, z: 0, color: PALETTE.textGlow, scale: 0.62 });

const LANES = [[3, 17, 25], [3, 9, 17, 25], [3, 6, 9, 12, 17, 19, 22, 25], [3, 6, 9, 12, 17, 19, 22, 25, 28]];
const LAYER_Y = [190, 130, 70, 10];
const vx = v => -300 + v * 20;

const nodes = new Map();
let edgeMeshes = new Map();
LANES.forEach((lane, li) => {
  lane.forEach(v => {
    nodes.set(li + '-' + v, new VNode(scene, { radius: 18, x: vx(v), y: LAYER_Y[li], z: 0, label: String(v), color: BLUE, emissive: BLUE }));
  });
});
new VText(scene, { text: 'L3 顶层（稀疏）', x: -360, y: 190, z: 0, color: PALETTE.textDim, scale: 0.45 });
new VText(scene, { text: 'L0 底层（全量）', x: -360, y: 10, z: 0, color: PALETTE.textDim, scale: 0.45 });

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
  yield S(() => stageT.setText('搜索 ' + key + '：从顶层 L' + l + ' 起点 ' + cur + ' 出发（青 = 当前考察）'));
  yield W(600);
  while (true) {
    const lane = LANES[l];
    const i = lane.indexOf(cur);
    const next = lane[i + 1];
    if (next !== undefined && next < key) {
      setCol(l, cur, GOLD);
      cur = next;
      setCol(l, cur, CYAN);
      yield S(() => stageT.setText('L' + l + '：' + next + ' < ' + key + ' → 向右推进（路径金色）'));
      yield W(550);
      continue;
    }
    if (next !== undefined && next === key) {
      setCol(l, next, GREEN);
      yield S(() => { stageT.setText('L' + l + '：' + next + ' == ' + key + ' → 找到！'); outT.setText('搜索 ' + key + ' 成功 ✓ —— 顶层大步跳过大量节点，只访问了少数几个'); status.textContent = '跳表搜索 ' + key + '：找到（L' + l + '）'; });
      yield W(900);
      return;
    }
    if (l < LANES.length - 1) {
      setCol(l, cur, ORANGE);
      yield S(() => stageT.setText('L' + l + '：' + next + ' > ' + key + ' 或已到头 → 向下 down 到 L' + (l + 1) + '（橙）'));
      yield W(550);
      l++;
      cur = LANES[l][LANES[l].indexOf(cur)];
      setCol(l, cur, CYAN);
      continue;
    }
    setCol(l, cur, RED);
    yield S(() => { stageT.setText('L' + l + '：' + next + ' ≠ ' + key + ' 且已到底层 → 未找到（红）'); outT.setText('搜索 ' + key + ' 失败 ✗ —— 跳表保证期望 O(log n)，但单次最坏 O(n)'); status.textContent = '跳表搜索 ' + key + '：未找到'; });
    yield W(900);
    return;
  }
}

function* skipGen() {
  yield S(() => { hint.setText('跳表：每层是上一层的「抽样快车道」—— 顶层大步跳、底层精确走，查找期望 O(log n)'); stageT.setText('演示 1：搜索 19 —— 观察向右推进与向下换层'); });
  yield W(700);
  yield* searchGen(19);
  yield S(() => stageT.setText('演示 2：搜索 10（不在表中）—— 最后落到 L3 底层才确定失败'));
  yield W(600);
  resetAll();
  yield W(400);
  yield* searchGen(10);
  yield S(() => { hint.setText('复杂度：查找/插入/删除期望 O(log n)（随机化层高）；最坏 O(n) —— Redis 有序集合 zset 与 LevelDB MemTable 的底层'); outT.setText('插入 = 搜索路径 + 按硬币随机提升层数；删除 = 搜索后逐层摘链 —— 比平衡树实现更简单'); });
  yield W(1100);
  yield S(() => { hint.setText('跳表演示完成：搜索 19 命中 L2（跳过底层大量比较）；搜索 10 确认不存在'); outT.setText(''); });
  yield W(400);
}

function* runSkip() {
  hint.setText('跳表：快车道搜索');
  yield W(400);
  yield* skipGen();
}

engine.queue(() => runSkip());
panel.addButton('清空', () => { engine.clear(); resetAll(); buildEdges(); stageT.setText(''); eqT.setText(''); outT.setText(''); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；青 = 当前考察，金 = 已走过路径，橙 = 向下换层，绿 = 命中，红 = 未找到；竖线 = down 指针）');

scene.start(engine);
