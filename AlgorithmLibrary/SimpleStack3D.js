// AlgorithmLibrary/SimpleStack3D.js — 数组栈：push 写入 top 并上移，pop 弹出 top —— 后进先出，只在一端操作（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, VBox, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('SimpleStack3D');

const scene = new Scene3D('scene', { cameraPos: [0, 140, 560], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：数组栈 push×6 + pop×5（top 指针移动）', x: 0, y: 240, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 0, y: 198, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: -70, z: 0, color: PALETTE.textGlow, scale: 0.56 });
const outT = new VText(scene, { text: '', x: 0, y: -155, z: 0, color: PALETTE.textGlow, scale: 0.62 });

const SIZE = 10;
const slotY = i => -200 + i * 52;
const slots = [];
for (let i = 0; i < SIZE; i++) slots.push(new VBox(scene, { w: 46, h: 46, d: 46, x: 0, y: slotY(i), z: 0, label: '', color: DIM, emissive: DIM }));
const topInd = new VText(scene, { text: 'top=空', x: 80, y: slotY(-1) - 40, z: 0, color: GOLD, scale: 0.55 });

let top = -1;

function setSlot(i, v, c) { slots[i].setText(String(v)); slots[i].setColor(c, c); }
function clearSlot(i) { slots[i].setText(''); slots[i].setColor(DIM, DIM); }
function moveTop() { topInd.moveTo(80, slotY(top) - 40, 0, 350); topInd.setText(top === -1 ? 'top=空' : 'top=' + top); }
function stackVals() { const a = []; for (let i = 0; i <= top; i++) a.push(slots[i].text); return a.join(' → ') || '空'; }

function* push(v) {
  yield S(() => stageT.setText('push(' + v + ')：top 上移一格，写入栈顶'));
  yield W(400);
  top++;
  moveTop();
  yield W(350);
  setSlot(top, v, GOLD);
  yield S(() => stageT.setText(v + ' 写入槽 ' + top + '（金）—— 栈 = ' + stackVals()));
  yield W(500);
  setSlot(top, v, BLUE);
}

function* pop() {
  yield S(() => stageT.setText('pop()：取出栈顶 ' + slots[top].text + '（红）'));
  yield W(450);
  const v = slots[top].text;
  setSlot(top, v, RED);
  yield W(450);
  clearSlot(top);
  top--;
  moveTop();
  yield S(() => stageT.setText(v + ' 弹出，top 下移 —— 栈 = ' + stackVals()));
  yield W(450);
}

function* stackGen() {
  yield S(() => { hint.setText('栈：后进先出（LIFO）—— push 压入栈顶、pop 弹出栈顶，只在一端操作（叠盘子模型）'); stageT.setText('演示：push 5, 3, 8, 1, 7 → pop×2 → push 4 → pop×3（看 top 指针升降）'); });
  yield W(700);
  for (const v of [5, 3, 8, 1, 7]) yield* push(v);
  yield S(() => { outT.setText('push×5 完成：栈 = ' + stackVals() + '（top=' + top + '，栈底固定 5）'); status.textContent = '数组栈：栈 = ' + stackVals(); });
  yield W(800);
  yield* pop();
  yield* pop();
  yield* push(4);
  yield* pop();
  yield* pop();
  yield* pop();
  yield S(() => { hint.setText('复杂度：push/pop/取顶 O(1) —— 栈是函数调用、表达式求值、浏览器「前进/后退」的底层结构'); outT.setText('应用：函数调用栈、括号匹配、逆波兰表达式、回溯搜索 —— 弹夹装弹顺序'); });
  yield W(1100);
  yield S(() => { hint.setText('数组栈演示完成：push×6 + pop×5，top 从 -1 升到 4 再回 0 —— 最终栈 [5]'); outT.setText(''); });
  yield W(400);
}

function* runStack() {
  hint.setText('数组栈：push/pop 只动 top');
  yield W(400);
  yield* stackGen();
}

engine.queue(() => runStack());
panel.addButton('清空', () => { engine.clear(); for (let i = 0; i < SIZE; i++) clearSlot(i); top = -1; moveTop(); stageT.setText(''); eqT.setText(''); outT.setText(''); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；金 = 刚压入，红 = 待弹出；金色 top 指针跟随栈顶；槽从底部向上堆叠）');

scene.start(engine);
