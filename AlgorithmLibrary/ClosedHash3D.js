// AlgorithmLibrary/ClosedHash3D.js — 闭寻址哈希（线性探测）：10 槽直接存值；h(x)=x%10；删除置 '×' 墓碑（function* 生成器驱动）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, VArrow, easeInOut } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('ClosedHash3D');

const SIZE = 10, TOMB = 0x64748b, TOMB_E = 0x334155;
const scene = new Scene3D('scene', { cameraPos: [0, 220, 640], fov: 55 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const CYAN = 0x67e8f9, GREEN = 0x4ade80, GOLD = 0xfcd34d;
const hint = new VText(scene, { text: '点击「运行演示」开始：闭寻址（线性探测）', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');

const cells = [...Array(SIZE)].map((_, i) =>
  new VBox(scene, { w: 50, h: 50, d: 30, x: (i - 4.5) * 78, y: 60, z: 0, label: '', color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
new VText(scene, { text: '闭寻址：冲突就往下一个槽放（线性探测）· 灰色 × = 墓碑', x: 0, y: 150, z: 0, color: PALETTE.textDim, scale: 0.7 });
const eqT = new VText(scene, { text: '', x: 0, y: 178, z: 0, color: PALETTE.textGlow, scale: 0.8 });
const stepT = new VText(scene, { text: '', x: 0, y: -55, z: 0, color: PALETTE.textGlow, scale: 0.72 });
const slots = new Array(SIZE).fill('');
const h = x => ((x % SIZE) + SIZE) % SIZE;
const xOf = i => (i - 4.5) * 78;
let arrow = null, arrowX = null;

function mark(i, c) { cells[i].setColor(c, c); }
function resetAll() {
  for (let i = 0; i < SIZE; i++) { slots[i] = ''; cells[i].setText(''); mark(i, PALETTE.node); }
  eqT.setText(''); stepT.setText('');
  if (arrow) { arrow.remove(); arrow = null; arrowX = null; }
}
function* arrowTo(i) {
  if (!arrow) { arrow = new VArrow(scene, { x: xOf(i), y: 100, z: 25, down: true, color: PALETTE.orange }); arrowX = xOf(i); }
  const sx = arrowX, tx = xOf(i);
  yield A(150, p => { arrow.group.position.x = sx + (tx - sx) * easeInOut(p); });
  arrowX = tx;
}
function showFormula(x, k) { eqT.setText('h(' + x + ') = ' + x + ' % 10 = ' + k); }

function* closedHashGen() {
  resetAll();
  yield S(() => hint.setText('闭寻址哈希（线性探测）：h(x) = x % 10；冲突向后找空槽 — 删除置 × 墓碑，保证查找不提前中断'));
  yield S(() => { stepT.setText('依次插入 25、47、18、35、57：先算 h(x)，槽被占就往后探测'); });
  yield W(350);
  for (const x of [25, 47, 18]) {
    const k = h(x);
    yield S(() => { showFormula(x, k); mark(k, CYAN); stepT.setText('插入 ' + x + '：h(' + x + ') = ' + k + ' → 槽 ' + k + ' 空，直接放入'); });
    yield W(350);
    yield* arrowTo(k);
    yield S(() => { cells[k].setText(String(x)); mark(k, PALETTE.node); slots[k] = x; });
    yield W(150);
  }
  yield S(() => { showFormula(35, 5); mark(5, CYAN); stepT.setText('插入 35：h(35) = 5 → 槽 5 已被 25 占用 → 线性探测'); });
  yield W(350);
  yield* arrowTo(5);
  yield S(() => { mark(6, CYAN); stepT.setText('探测 5 → 6：槽 6 空 → 放入 35'); });
  yield W(350);
  yield* arrowTo(6);
  yield S(() => { cells[6].setText('35'); mark(6, PALETTE.node); slots[6] = 35; });
  yield W(150);
  yield S(() => { showFormula(57, 7); mark(7, CYAN); stepT.setText('插入 57：h(57) = 7 → 槽 7 被 47 占用 → 继续探测'); });
  yield W(300);
  yield* arrowTo(7);
  yield S(() => { mark(8, CYAN); stepT.setText('探测 7 → 8：槽 8 被 18 占用 → 再探测'); });
  yield W(300);
  yield* arrowTo(8);
  yield S(() => { mark(9, CYAN); stepT.setText('探测 8 → 9：槽 9 空 → 放入 57'); });
  yield W(300);
  yield* arrowTo(9);
  yield S(() => { cells[9].setText('57'); mark(9, PALETTE.node); slots[9] = 57; });
  yield W(150);
  yield S(() => { showFormula(35, 5); mark(5, CYAN); stepT.setText('查找 35：h(35) = 5 → 槽 5 是 25 ≠ 35 → 探测下一个'); });
  yield W(300);
  yield* arrowTo(5);
  yield* arrowTo(6);
  yield S(() => { mark(6, GREEN); stepT.setText('槽 6 = 35 命中！探测路径上的占用/墓碑都不影响继续找'); });
  yield W(450);
  yield S(() => { showFormula(47, 7); mark(7, CYAN); stepT.setText('删除 47：h(47) = 7 → 槽 7 直接命中 → 置墓碑'); });
  yield W(300);
  yield* arrowTo(7);
  yield S(() => {
    cells[7].setText('×'); mark(7, TOMB); slots[7] = '×';
    stepT.setText('置 × 墓碑：查找遇到 × 继续往后，遇到空槽才停 — 保证不提前中断');
  });
  yield W(450);
  yield S(() => { showFormula(67, 7); mark(7, CYAN); stepT.setText('插入 67：h(67) = 7 → 槽 7 是墓碑 ×（可复用）→ 放入 67'); });
  yield W(300);
  yield* arrowTo(7);
  yield S(() => { cells[7].setText('67'); mark(7, PALETTE.node); slots[7] = 67; });
  yield W(150);
  yield S(() => {
    status.textContent = '闭寻址完成：表 [·,·,·,·,·,25,35,67,18,57] — 2 次冲突探测 + 1 次墓碑复用';
    stepT.setText('负载因子 α = 6/10 = 0.6：α < 0.7 均摊 O(1)；α 接近 1 退化为 O(n)，应扩容');
    hint.setText('线性探测的代价：删除必须用墓碑占位，否则会把后插入元素的查找路径挖断');
  });
  yield W(700);
}

panel.addButton('运行演示', () => engine.start(closedHashGen()));
panel.addButton('清空', () => { engine.clear(); resetAll(); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；青 = 当前定位槽，绿 = 命中，灰 × = 墓碑，橙箭头 = 探测位置）');

scene.start(engine);
