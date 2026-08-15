// AlgorithmLibrary/StackArray3D.js — 数组栈（下标式）：横排槽位 + top 指示框，push 写入 top 槽、pop 移出 top 槽 —— 栈顶永远在右端（function* 生成器驱动）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('StackArray3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, RED = 0xfb7185, DIM = 0x334155;
const status = panel.addStatus('就绪');

const SIZE = 12;
const slotX = i => 320 + (i - (SIZE - 1) / 2) * 48;
const SLOT_Y = 450, IDX_Y = 400, BOX_Y = 505, ARR_Y = 487;
const slots = [];
for (let i = 0; i < SIZE; i++) slots.push(new VBox(scene, { w: 40, h: 46, d: 46, x: slotX(i), y: SLOT_Y, z: 0, label: '', color: DIM, emissive: DIM }));
const idxT = [];
for (let i = 0; i < SIZE; i++) idxT.push(new VText(scene, { text: String(i), x: slotX(i), y: IDX_Y, z: 0, color: PALETTE.textDim, scale: 0.4 }));
const topBox = new VBox(scene, { w: 58, h: 20, d: 20, x: slotX(-1), y: BOX_Y, z: 0, label: 'top=空', color: GOLD, emissive: GOLD });
const topArr = new VText(scene, { text: '▼', x: slotX(-1), y: ARR_Y, z: 0, color: GOLD, scale: 0.5 });

let top = -1;

function setSlot(i, v, c) { slots[i].setText(String(v)); slots[i].setColor(c, c); }
function clearSlot(i) { slots[i].setText(''); slots[i].setColor(DIM, DIM); }
function moveTop() {
  const x = slotX(top);
  topBox.moveTo(x, BOX_Y, 0, 350);
  topArr.moveTo(x, ARR_Y, 0, 350);
  topBox.setText(top === -1 ? 'top=空' : 'top=' + top);
}
function stackVals() { const a = []; for (let i = 0; i <= top; i++) a.push(slots[i].text); return a.join(' → ') || '空'; }

function* push(v) {
  yield S(() => { status.textContent = 'push(' + v + ')：top++，写入槽 ' + (top + 1); });
  yield W(400);
  top++;
  moveTop();
  yield W(350);
  setSlot(top, v, GOLD);
  yield S(() => { status.textContent = v + ' 入栈（金）：栈顶在右端 —— 栈 = ' + stackVals(); });
  yield W(500);
  setSlot(top, v, BLUE);
}

function* pop() {
  yield S(() => { status.textContent = 'pop()：取出 top 槽 ' + slots[top].text + '（红），top--'; });
  yield W(450);
  const v = slots[top].text;
  setSlot(top, v, RED);
  yield W(450);
  clearSlot(top);
  top--;
  moveTop();
  yield S(() => { status.textContent = v + ' 出栈，top 框左移 —— 栈 = ' + stackVals(); });
  yield W(450);
}

function* stackGen() {
  yield S(() => { status.textContent = '数组栈演示：push 5, 3, 8, 1, 7 → pop → push 4, 6 → pop×3（top 框左右滑动）'; });
  yield W(700);
  for (const v of [5, 3, 8, 1, 7]) yield* push(v);
  yield S(() => { status.textContent = 'push×5 完成：栈 = ' + stackVals() + '（top=' + top + '）'; });
  yield W(800);
  yield* pop();
  yield* push(4);
  yield* push(6);
  yield* pop();
  yield* pop();
  yield* pop();
  yield S(() => { status.textContent = '复杂度：push/pop O(1) —— 数组栈是编译器的「符号表」「调用栈」的教科书实现'; });
  yield W(1100);
  yield S(() => { status.textContent = '数组栈演示完成：push×7 + pop×4，top 从 -1 升到 5 再回 2，最终栈 [5, 3, 8]；push/pop 均 O(1)'; });
  yield W(400);
}

function* runStack() {
  yield S(() => { status.textContent = '数组栈：下标 0 固定栈底，top 框滑动（栈顶在右端）'; });
  yield W(400);
  yield* stackGen();
}

engine.queue(() => runStack());
panel.addButton('清空', () => { engine.clear(); for (let i = 0; i < SIZE; i++) clearSlot(i); top = -1; moveTop(); status.textContent = ''; });

scene.start(engine);
