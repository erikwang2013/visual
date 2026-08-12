// AlgorithmLibrary/QueueArray3D.js — 数组队列（循环）：head/tail 指针绕环滑动，enqueue 写入 tail、dequeue 移出 head —— 满则队满，空则队空（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, VBox, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('QueueArray3D');

const scene = new Scene3D('scene', { cameraPos: [300, 392, 900], lookAt: [300, 72, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：循环队列 入队×12 + 出队×5（tail 绕环回卷）', x: 760, y: 460, z: 0, color: PALETTE.textGlow, scale: 0.7, wrapChars: 7 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 760, y: 360, z: 0, color: GOLD, scale: 0.55, wrapChars: 8 });
const eqT = new VText(scene, { text: '', x: 760, y: 270, z: 0, color: PALETTE.textGlow, scale: 0.55, wrapChars: 8 });
const outT = new VText(scene, { text: '', x: 760, y: 175, z: 0, color: PALETTE.textGlow, scale: 0.53, wrapChars: 8 });

const SIZE = 12;
const slots = [];
for (let i = 0; i < SIZE; i++) slots.push(new VBox(scene, { w: 40, h: 46, d: 46, x: 300 + (i - (SIZE - 1) / 2) * 44, y: 72, z: 0, label: '', color: DIM, emissive: DIM }));
const headInd = new VText(scene, { text: 'head=0', x: 300, y: 134, z: 0, color: CYAN, scale: 0.55 });
const tailInd = new VText(scene, { text: 'tail=0', x: 300, y: 30, z: 0, color: GOLD, scale: 0.55 });
const slotX = i => 300 + (i - (SIZE - 1) / 2) * 44;

let head = 0, tail = 0, count = 0;

function setSlot(i, v) {
  slots[i].setText(String(v));
  slots[i].setColor(BLUE, BLUE);
}
function clearSlot(i) {
  slots[i].setText('');
  slots[i].setColor(DIM, DIM);
}
function setColorSlot(i, c) { slots[i].setColor(c, c); }
function moveInd(ind, i) {
  ind.moveTo(slotX(i), ind === headInd ? 134 : 30, 0, 350);
}
function qText() {
  const a = [];
  for (let k = 0; k < count; k++) a.push(slots[(head + k) % SIZE].text);
  return a.join(' ← ') || '空';
}

function* enqueue(v) {
  yield S(() => stageT.setText('入队 ' + v + '：tail 指向空位，写入数据'));
  yield W(400);
  setSlot(tail, v);
  setColorSlot(tail, GOLD);
  yield S(() => stageT.setText(v + ' 写入槽 ' + tail + '（金）—— head 不动'));
  yield W(500);
  const old = tail;
  tail = (tail + 1) % SIZE;
  count++;
  moveInd(tailInd, tail);
  yield S(() => stageT.setText('tail: ' + old + ' → ' + tail + '（尾指针后移，绕环回卷）'));
  yield W(450);
  if (tail === head) {
    yield S(() => { stageT.setText('⚠ tail 追上 head —— 队满！count = ' + count + ' = SIZE'); status.textContent = '队满：' + qText(); });
    yield W(700);
  }
  setColorSlot(old, BLUE);
}

function* dequeue() {
  yield S(() => stageT.setText('出队：head 指向 ' + slots[head].text + '（红）—— 取值并让出位置'));
  yield W(450);
  const v = slots[head].text;
  setColorSlot(head, RED);
  yield S(() => stageT.setText(v + ' 出队：槽 ' + head + ' 清空，head 后移'));
  yield W(500);
  clearSlot(head);
  const old = head;
  head = (head + 1) % SIZE;
  count--;
  moveInd(headInd, head);
  yield S(() => stageT.setText('head: ' + old + ' → ' + head + ' —— 队 = ' + qText()));
  yield W(450);
}

function* queueGen() {
  yield S(() => { hint.setText('循环队列：数组 + head/tail 指针绕环滑动 —— 入队写 tail、出队移 head，环转一圈复用空间'); stageT.setText('演示：入队 5, 3, 8, 1, 7 → 出队 ×2 → 入队 4 → 出队 → 再入队 6 个（tail 绕环回卷）'); });
  yield W(700);
  for (const v of [5, 3, 8, 1, 7]) yield* enqueue(v);
  yield S(() => { outT.setText('入队 5 个完成：队 = ' + qText() + '（head=' + head + ', tail=' + tail + '）'); status.textContent = '循环队列：队 = ' + qText(); });
  yield W(800);
  yield* dequeue();
  yield* dequeue();
  yield* enqueue(4);
  yield* dequeue();
  yield S(() => stageT.setText('现在连续入队 6 个 —— tail 从 11 绕回 0，把队头让出的槽位重新用上'));
  yield W(600);
  for (const v of [6, 9, 2, 11, 7, 3]) yield* enqueue(v);
  yield S(() => { outT.setText('全部完成：队 = ' + qText() + '（head=' + head + ', tail=' + tail + '）—— 环上无碎片空间'); status.textContent = '循环队列最终：队 = ' + qText(); });
  yield W(900);
  yield* dequeue();
  yield* dequeue();
  yield S(() => { hint.setText('复杂度：入队/出队 O(1)（无移动）—— 环形缓冲是生产者-消费者、BFS、打印机队列的经典底座'); outT.setText('应用：BFS 队列、滑动窗口、双缓冲 —— 满判断 count=SIZE，空判断 count=0'); });
  yield W(1100);
  yield S(() => { hint.setText('循环队列演示完成：入队 ×12 + 出队 ×5（head 从 0 走到 5，tail 回卷一圈）'); outT.setText(''); });
  yield W(400);
}

function* runQueue() {
  hint.setText('循环队列：head/tail 绕环滑动');
  yield W(400);
  yield* queueGen();
}

engine.queue(() => runQueue());
panel.addButton('清空', () => { engine.clear(); for (let i = 0; i < SIZE; i++) clearSlot(i); head = 0; tail = 0; count = 0; moveInd(headInd, 0); moveInd(tailInd, 0); stageT.setText(''); eqT.setText(''); outT.setText(''); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；金 = 新入队槽，红 = 出队槽，青 = head 指针，金 = tail 指针；循环队列 = 环上滑动窗口）');

scene.start(engine);
