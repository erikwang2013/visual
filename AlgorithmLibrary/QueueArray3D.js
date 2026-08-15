// AlgorithmLibrary/QueueArray3D.js — 数组队列（循环）：head/tail 指针绕环滑动，enqueue 写入 tail、dequeue 移出 head —— 环转一圈复用空间（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('QueueArray3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, RED = 0xfb7185, GREEN = 0x4ade80, CYAN = 0x22d3ee, DIM = 0x334155;
const status = panel.addStatus('就绪');

const SIZE = 12;
const SLOT_Y = 600, HEAD_Y = 672, TAIL_Y = 528;
const slotX = i => 320 + (i - (SIZE - 1) / 2) * 44;
const slots = [];
for (let i = 0; i < SIZE; i++) slots.push(new VBox(scene, { w: 40, h: 46, d: 46, x: slotX(i), y: SLOT_Y, z: 0, label: '', color: DIM, emissive: DIM }));
const headInd = new VText(scene, { text: 'head=0', x: slotX(0), y: HEAD_Y, z: 0, color: CYAN, scale: 0.55 });
const tailInd = new VText(scene, { text: 'tail=0', x: slotX(0), y: TAIL_Y, z: 0, color: GOLD, scale: 0.55 });

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
  ind.moveTo(slotX(i), ind === headInd ? HEAD_Y : TAIL_Y, 0, 350);
}
function qText() {
  const a = [];
  for (let k = 0; k < count; k++) a.push(slots[(head + k) % SIZE].text);
  return a.join(' ← ') || '空';
}

function* enqueue(v) {
  yield S(() => { status.textContent = '入队 ' + v + '：tail 指向空位，写入数据'; });
  yield W(400);
  setSlot(tail, v);
  setColorSlot(tail, GOLD);
  yield S(() => { status.textContent = v + ' 写入槽 ' + tail + '（金）—— head 不动'; });
  yield W(500);
  const old = tail;
  tail = (tail + 1) % SIZE;
  count++;
  moveInd(tailInd, tail);
  yield S(() => { status.textContent = 'tail: ' + old + ' → ' + tail + '（尾指针后移）—— 队 = ' + qText(); });
  yield W(450);
  setColorSlot(old, BLUE);
}

function* dequeue() {
  yield S(() => { status.textContent = '出队：head 指向 ' + slots[head].text + '（红）—— 取值并让出位置'; });
  yield W(450);
  const v = slots[head].text;
  setColorSlot(head, RED);
  yield S(() => { status.textContent = v + ' 出队：槽 ' + head + ' 清空，head 后移'; });
  yield W(500);
  clearSlot(head);
  const old = head;
  head = (head + 1) % SIZE;
  count--;
  moveInd(headInd, head);
  yield S(() => { status.textContent = 'head: ' + old + ' → ' + head + ' —— 队 = ' + qText(); });
  yield W(450);
}

function* runQueue() {
  yield S(() => { status.textContent = '循环队列：数组 + head/tail 指针绕环滑动 —— 入队写 tail、出队移 head，环转一圈复用空间。演示：入队 5 个 → 出队 2 → 入队 4 → 出队 1 → 再入队 6 个（tail 绕环回卷）'; });
  yield W(700);
  for (const v of [5, 3, 8, 1, 7]) yield* enqueue(v);
  yield S(() => { status.textContent = '入队 5 个完成：队 = ' + qText() + '（head=' + head + ', tail=' + tail + '）'; });
  yield W(700);
  yield* dequeue();
  yield* dequeue();
  yield* enqueue(4);
  yield* dequeue();
  yield S(() => { status.textContent = '连续入队 6 个 —— tail 从 11 绕回 0，复用队头让出的槽位'; });
  yield W(600);
  for (const v of [6, 9, 2, 11, 7, 3]) yield* enqueue(v);
  yield S(() => { status.textContent = '全部入队完成：队 = ' + qText() + '（head=' + head + ', tail=' + tail + '）—— 环上无碎片空间'; });
  yield W(700);
  yield* dequeue();
  yield* dequeue();
  yield S(() => { status.textContent = '循环队列演示完成：入队 ×12 + 出队 ×5，最终队 = ' + qText() + '（head=' + head + ', tail=' + tail + '）；入队/出队均 O(1) 无移动，环形缓冲复用空间无碎片，是生产者-消费者与 BFS 的经典底座'; });
  yield W(900);
}

engine.queue(() => runQueue());
panel.addButton('清空', () => {
  engine.clear();
  for (let i = 0; i < SIZE; i++) clearSlot(i);
  head = 0; tail = 0; count = 0;
  headInd.sprite.position.set(slotX(0), HEAD_Y, 0);
  tailInd.sprite.position.set(slotX(0), TAIL_Y, 0);
  status.textContent = '';
});

scene.start(engine);
