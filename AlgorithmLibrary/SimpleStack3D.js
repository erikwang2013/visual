// AlgorithmLibrary/SimpleStack3D.js — 数组栈：push 写入 top 并上移，pop 弹出 top —— 后进先出，只在一端操作（function* 生成器驱动）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
applyTheme('SimpleStack3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, RED = 0xfb7185, DIM = 0x334155;
const status = panel.addStatus('就绪');

const SIZE = 10;
const slotY = i => 250 + i * 44;
const slots = [];
for (let i = 0; i < SIZE; i++) slots.push(new VBox(scene, { w: 46, h: 46, d: 46, x: 320, y: slotY(i), z: 0, label: '', color: DIM, emissive: DIM }));

let top = -1;

function setSlot(i, v, c) { slots[i].setText(String(v)); slots[i].setColor(c, c); }
function clearSlot(i) { slots[i].setText(''); slots[i].setColor(DIM, DIM); }
function stackVals() { const a = []; for (let i = 0; i <= top; i++) a.push(slots[i].text); return a.join(' → ') || '空'; }

function* push(v) {
  yield S(() => { status.textContent = 'push(' + v + ')：top 上移一格，写入栈顶'; });
  yield W(400);
  top++;
  yield W(350);
  setSlot(top, v, GOLD);
  yield S(() => { status.textContent = v + ' 写入槽 ' + top + '（金）—— 栈 = ' + stackVals(); });
  yield W(500);
  setSlot(top, v, BLUE);
}

function* pop() {
  yield S(() => { status.textContent = 'pop()：取出栈顶 ' + slots[top].text + '（红）'; });
  yield W(450);
  const v = slots[top].text;
  setSlot(top, v, RED);
  yield W(450);
  clearSlot(top);
  top--;
  yield S(() => { status.textContent = v + ' 弹出，top 下移 —— 栈 = ' + stackVals(); });
  yield W(450);
}

function* stackGen() {
  yield S(() => { status.textContent = '数组栈演示：push 5, 3, 8, 1, 7 → pop×2 → push 4 → pop×3（top 指针升降）'; });
  yield W(700);
  for (const v of [5, 3, 8, 1, 7]) yield* push(v);
  yield S(() => { status.textContent = 'push×5 完成：栈 = ' + stackVals() + '（top=' + top + '，栈底固定 5）'; });
  yield W(800);
  yield* pop();
  yield* pop();
  yield* push(4);
  yield* pop();
  yield* pop();
  yield* pop();
  yield S(() => { status.textContent = '复杂度：push/pop/取顶 O(1) —— 栈是函数调用、表达式求值、浏览器「前进/后退」的底层结构'; });
  yield W(1100);
  yield S(() => { status.textContent = '数组栈演示完成：push×6 + pop×5，top 从 -1 升到 4 再回 0，最终栈 [5]；push/pop/取顶均 O(1)'; });
  yield W(400);
}

function* runStack() {
  yield S(() => { status.textContent = '数组栈：push/pop 只动 top（后进先出）'; });
  yield W(400);
  yield* stackGen();
}

engine.queue(() => runStack());
panel.addButton('清空', () => { engine.clear(); for (let i = 0; i < SIZE; i++) clearSlot(i); top = -1; status.textContent = ''; });

scene.start(engine);
