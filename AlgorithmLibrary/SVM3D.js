// AlgorithmLibrary/SVM3D.js — 支持向量机：最大间隔超平面 + 支持向量（function* 生成器驱动）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('SVM3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });
const status = panel.addStatus('就绪');
const ease = p => p * p * (3 - 2 * p);

const GREEN = 0x4ade80, ROSE = 0xfb7185, YELLOW = 0xfacc15, GOLD = 0xfcd34d, DIM = 0x334155;

const POS = [[1, 1], [2, 2], [2, 1.5]], NEG = [[-1, -1], [-2, -2], [-1.5, -2]];
const PX = v => v * 60 + 320, PY = v => -v * 60 + 460;

// ---- 小球对象池（两类着色）：运行期仅改颜色/显隐/缩放，绝不 new ----
const pts = [];
POS.forEach(([x, y]) => {
  const vn = new VNode(scene, { radius: 21, x: PX(x), y: PY(y), z: 0, label: '', color: GREEN, emissive: GREEN });
  pts.push({ vn, cls: 1 });
});
NEG.forEach(([x, y]) => {
  const vn = new VNode(scene, { radius: 21, x: PX(x), y: PY(y), z: 0, label: '', color: ROSE, emissive: ROSE });
  pts.push({ vn, cls: -1 });
});

const line = new VBox(scene, { w: 300, h: 4, d: 4, x: 320, y: 460, z: 0, label: '', color: YELLOW, emissive: YELLOW });
const m1 = new VBox(scene, { w: 300, h: 2.5, d: 2.5, x: 320, y: 460, z: 0, label: '', color: DIM, emissive: DIM });
const m2 = new VBox(scene, { w: 300, h: 2.5, d: 2.5, x: 320, y: 460, z: 0, label: '', color: DIM, emissive: DIM });
[line, m1, m2].forEach(b => (b.mesh.visible = false));

const svLbl1 = new VText(scene, { text: '(1, 1)', x: 452, y: 356, z: 0, color: GOLD, scale: 0.45 });
const svLbl2 = new VText(scene, { text: '(−1, −1)', x: 188, y: 564, z: 0, color: GOLD, scale: 0.45 });
svLbl1.sprite.visible = false; svLbl2.sprite.visible = false;

function placeLine(c, box) {
  const p1 = { x: PX(-2.4), y: PY(c + 2.4) }, p2 = { x: PX(2.4), y: PY(c - 2.4) };
  const cx = (p1.x + p2.x) / 2, cy = (p1.y + p2.y) / 2;
  const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  box.mesh.rotation.z = Math.atan2(p2.y - p1.y, p2.x - p1.x);
  box.mesh.scale.set(len / 300, 1, 1);
  box.mesh.position.set(cx, cy, 0);
}

function setClsCol(p) { p.vn.setColor(p.cls === 1 ? GREEN : ROSE, p.cls === 1 ? GREEN : ROSE); }
function resetAll() {
  pts.forEach(p => { p.vn.mesh.scale.setScalar(1); setClsCol(p); });
  [line, m1, m2].forEach(b => (b.mesh.visible = false));
  svLbl1.sprite.visible = false; svLbl2.sprite.visible = false;
}

function* runSVM() {
  resetAll();
  yield S(() => { status.textContent = 'SVM（支持向量机）：正例 3 个（绿）+ 负例 3 个（红），找一个超平面分开两类，且到两侧最近点的间隔最大'; });
  yield W(700);
  yield S(() => {
    pts.forEach(p => (p.vn.mesh.visible = true));
    status.textContent = '数据就位：无数直线都能分开这两类 —— 哪条最好？SVM 的答案：间隔最大的那条';
  });
  yield W(700);
  yield A(700, p => { const e = ease(p); pts.forEach(pp => pp.vn.mesh.scale.setScalar(0.3 + 0.7 * e)); });
  yield S(() => { status.textContent = '候选超平面 w·x + b = 0，取 w = (1,1)、b = 0 → x + y = 0（过原点、斜 45° 的中线）'; });
  yield W(700);
  yield S(() => {
    line.mesh.visible = true;
    placeLine(0, line);
    status.textContent = '黄线即超平面：左下方 x+y<0 判负类，右上方 x+y>0 判正类';
  });
  yield W(800);
  yield S(() => {
    m1.mesh.visible = true; m2.mesh.visible = true;
    placeLine(1, m1); placeLine(-1, m2);
    status.textContent = '间隔边界 w·x + b = ±1：x+y = 1 与 x+y = −1（灰线），平行且等距 —— 中间带状区域不含任何点';
  });
  yield W(800);
  yield S(() => {
    [pts[0], pts[3]].forEach(p => { p.vn.setColor(GOLD, GOLD); p.vn.mesh.scale.setScalar(1.45); });
    svLbl1.sprite.visible = true; svLbl2.sprite.visible = true;
    status.textContent = '支持向量 (1,1) 与 (−1,−1)（金球放大）：恰好压在间隔边界上 —— 只有它们决定超平面位置，其余点可删';
  });
  yield W(900);
  yield S(() => { status.textContent = '间隔 = 2/‖w‖ = 2/√2 = √2 ≈ 1.41 —— 最大化间隔 → 分类最稳健、泛化最好'; });
  yield W(800);
  yield S(() => { status.textContent = 'SVM 演示完成：6 点（3 正 3 负）线性可分，最大间隔超平面 x+y=0，间隔 2/‖w‖=√2≈1.41，支持向量 (1,1)/(−1,−1) 唯一决定分割；训练（SMO）约 O(n²·d)、预测 O(d)'; });
  yield W(800);
}

engine.queue(() => runSVM());
panel.addButton('清空', () => {
  engine.clear();
  pts.forEach(p => { p.vn.mesh.scale.setScalar(1); setClsCol(p); });
  [line, m1, m2].forEach(b => (b.mesh.visible = false));
  svLbl1.sprite.visible = false; svLbl2.sprite.visible = false;
  status.textContent = '';
});

scene.start(engine);
