// AlgorithmLibrary/ClosedHash3D.js — 闭寻址哈希（线性探测）：10 槽直接存值；h(x)=x%10；删除置 '×' 墓碑（function* 生成器驱动，解说入状态栏）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VArrow } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('ClosedHash3D');

const SIZE = 10, TOMB = 0x64748b, TOMB_E = 0x334155;
const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const CYAN = 0x67e8f9, GREEN = 0x4ade80;
const status = panel.addStatus('就绪');
const E = p => p * p * (3 - 2 * p);

const cells = [...Array(SIZE)].map((_, i) =>
  new VBox(scene, { w: 50, h: 50, d: 30, x: (i - 4.5) * 78 + 360, y: 460, z: 0, label: '', color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
const arrow = new VArrow(scene, { x: 0, y: 400, z: 25, down: true, color: PALETTE.orange });
arrow.group.visible = false;
const slots = new Array(SIZE).fill('');
const h = x => ((x % SIZE) + SIZE) % SIZE;
const xOf = i => (i - 4.5) * 78 + 360;

function mark(i, c) { cells[i].setColor(c, c); }
function resetAll() {
  for (let i = 0; i < SIZE; i++) { slots[i] = ''; cells[i].setText(''); mark(i, PALETTE.node); }
  arrow.group.visible = false;
}
function* arrowTo(i) {
  const tx = xOf(i);
  if (!arrow.group.visible) { arrow.group.position.x = tx; arrow.group.visible = true; }
  const sx = arrow.group.position.x;
  if (Math.abs(sx - tx) > 0.5) {
    yield A(150, p => { arrow.group.position.x = sx + (tx - sx) * E(p); });
  }
  arrow.group.position.x = tx;
}

function* closedHashGen() {
  resetAll();
  yield S(() => { status.textContent = '闭寻址哈希（线性探测）：h(x) = x % 10，冲突向后找空槽；删除置 × 墓碑。依次插入 25、47、18、35、57'; });
  yield W(500);
  for (const x of [25, 47, 18]) {
    const k = h(x);
    yield S(() => { mark(k, CYAN); status.textContent = '插入 ' + x + '：h(' + x + ') = ' + k + ' → 槽 ' + k + ' 空，直接放入'; });
    yield W(350);
    yield* arrowTo(k);
    yield S(() => { cells[k].setText(String(x)); mark(k, PALETTE.node); slots[k] = x; status.textContent = x + ' 已放入槽 ' + k; });
    yield W(150);
  }
  yield S(() => { mark(5, CYAN); status.textContent = '插入 35：h(35) = 5 → 槽 5 已被 25 占用 → 线性探测'; });
  yield W(350);
  yield* arrowTo(5);
  yield S(() => { mark(6, CYAN); status.textContent = '探测 5 → 6：槽 6 空 → 放入 35'; });
  yield W(350);
  yield* arrowTo(6);
  yield S(() => { cells[6].setText('35'); mark(6, PALETTE.node); slots[6] = 35; });
  yield W(150);
  yield S(() => { mark(7, CYAN); status.textContent = '插入 57：h(57) = 7 → 槽 7 被 47 占用 → 继续探测'; });
  yield W(300);
  yield* arrowTo(7);
  yield S(() => { mark(8, CYAN); status.textContent = '探测 7 → 8：槽 8 被 18 占用 → 再探测'; });
  yield W(300);
  yield* arrowTo(8);
  yield S(() => { mark(9, CYAN); status.textContent = '探测 8 → 9：槽 9 空 → 放入 57'; });
  yield W(300);
  yield* arrowTo(9);
  yield S(() => { cells[9].setText('57'); mark(9, PALETTE.node); slots[9] = 57; });
  yield W(150);
  yield S(() => { mark(5, CYAN); status.textContent = '查找 35：h(35) = 5 → 槽 5 是 25 ≠ 35 → 探测下一个'; });
  yield W(300);
  yield* arrowTo(5);
  yield* arrowTo(6);
  yield S(() => { mark(6, GREEN); status.textContent = '槽 6 = 35 命中！探测路径上的占用/墓碑都不影响继续找'; });
  yield W(450);
  yield S(() => { mark(7, CYAN); status.textContent = '删除 47：h(47) = 7 → 槽 7 直接命中 → 置墓碑'; });
  yield W(300);
  yield* arrowTo(7);
  yield S(() => { cells[7].setText('×'); mark(7, TOMB); slots[7] = '×'; status.textContent = '置 × 墓碑：查找遇到 × 继续往后，遇到空槽才停 — 保证不提前中断'; });
  yield W(450);
  yield S(() => { mark(7, CYAN); status.textContent = '插入 67：h(67) = 7 → 槽 7 是墓碑 ×（可复用）→ 放入 67'; });
  yield W(300);
  yield* arrowTo(7);
  yield S(() => { cells[7].setText('67'); mark(7, PALETTE.node); slots[7] = 67; });
  yield W(150);
  yield S(() => { status.textContent = '闭寻址演示完成：表 [·,·,·,·,·,25,35,67,18,57] — 2 次冲突探测 + 1 次墓碑复用；α < 0.7 均摊 O(1)，α 接近 1 退化为 O(n) 需扩容'; });
  yield W(700);
}

engine.queue(() => closedHashGen());
panel.addButton('清空', () => { engine.clear(); resetAll(); status.textContent = ''; });
scene.start(engine);
