// AlgorithmLibrary/StackArray3D.js — 数组栈（下标式）：横排槽位 + top 指示框，push 写入 top 槽、pop 移出 top 槽 —— 栈顶永远在右端（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, VBox, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('StackArray3D');

const scene = new Scene3D('scene', { cameraPos: [0, 120, 560], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：下标式数组栈 push×7 + pop×4（top 框右移左移）', x: 0, y: 230, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 0, y: 188, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: -70, z: 0, color: PALETTE.textGlow, scale: 0.56 });
const outT = new VText(scene, { text: '', x: 0, y: -155, z: 0, color: PALETTE.textGlow, scale: 0.62 });

const SIZE = 12;
const slotX = i => (i - (SIZE - 1) / 2) * 56;
const slots = [];
for (let i = 0; i < SIZE; i++) slots.push(new VBox(scene, { w: 46, h: 46, d: 46, x: slotX(i), y: 0, z: 0, label: '', color: DIM, emissive: DIM }));
const idxT = [];
for (let i = 0; i < SIZE; i++) idxT.push(new VText(scene, { text: String(i), x: slotX(i), y: -52, z: 0, color: PALETTE.textDim, scale: 0.4 }));
const topBox = new VBox(scene, { w: 58, h: 20, d: 20, x: slotX(-1), y: 62, z: 0, label: 'top=空', color: GOLD, emissive: GOLD });
const topArr = new VText(scene, { text: '▼', x: slotX(-1), y: 44, z: 0, color: GOLD, scale: 0.5 });

let top = -1;

function setSlot(i, v, c) { slots[i].setText(String(v)); slots[i].setColor(c, c); }
function clearSlot(i) { slots[i].setText(''); slots[i].setColor(DIM, DIM); }
function moveTop() {
  const x = slotX(top);
  topBox.moveTo(x, 62, 0, 350);
  topArr.moveTo(x, 44, 0, 350);
  topBox.setText(top === -1 ? 'top=空' : 'top=' + top);
}
function stackVals() { const a = []; for (let i = 0; i <= top; i++) a.push(slots[i].text); return a.join(' → ') || '空'; }

function* push(v) {
  yield S(() => stageT.setText('push(' + v + ')：top++，写入槽 ' + (top + 1)));
  yield W(400);
  top++;
  moveTop();
  yield W(350);
  setSlot(top, v, GOLD);
  yield S(() => stageT.setText(v + ' 入栈（金）：栈顶在右端 —— 栈 = ' + stackVals()));
  yield W(500);
  setSlot(top, v, BLUE);
}

function* pop() {
  yield S(() => stageT.setText('pop()：取出 top 槽 ' + slots[top].text + '（红），top--'));
  yield W(450);
  const v = slots[top].text;
  setSlot(top, v, RED);
  yield W(450);
  clearSlot(top);
  top--;
  moveTop();
  yield S(() => stageT.setText(v + ' 出栈，top 框左移 —— 栈 = ' + stackVals()));
  yield W(450);
}

function* stackGen() {
  yield S(() => { hint.setText('数组栈：下标 0 固定栈底，top 指示器向右扩展 —— push = 写 top 槽，pop = 清 top 槽'); stageT.setText('演示：push 5, 3, 8, 1, 7 → pop → push 4, 6 → pop×3（top 框左右滑动）'); });
  yield W(700);
  for (const v of [5, 3, 8, 1, 7]) yield* push(v);
  yield S(() => { outT.setText('push×5 完成：栈 = ' + stackVals() + '（top=' + top + '）'); status.textContent = '数组栈：栈 = ' + stackVals(); });
  yield W(800);
  yield* pop();
  yield* push(4);
  yield* push(6);
  yield* pop();
  yield* pop();
  yield* pop();
  yield S(() => { hint.setText('复杂度：push/pop O(1) —— 数组栈是编译器的「符号表」「调用栈」的教科书实现'); outT.setText('应用：表达式求值、撤销操作栈、深度优先 —— top 即长度，栈空 top=-1'); });
  yield W(1100);
  yield S(() => { hint.setText('数组栈演示完成：push×7 + pop×4，top 从 -1 走到 4 再回 2 —— 最终栈 [5, 3, 4]'); outT.setText(''); });
  yield W(400);
}

function* runStack() {
  hint.setText('数组栈：top 框滑动');
  yield W(400);
  yield* stackGen();
}

engine.queue(() => runStack());
panel.addButton('清空', () => { engine.clear(); for (let i = 0; i < SIZE; i++) clearSlot(i); top = -1; moveTop(); stageT.setText(''); eqT.setText(''); outT.setText(''); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；金 = 刚入栈，红 = 待出栈；金色 top 框 + ▼ 箭头指示栈顶；下标在下排）');

scene.start(engine);
