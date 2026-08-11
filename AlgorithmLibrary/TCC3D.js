// AlgorithmLibrary/TCC3D.js — TCC 分布式事务：Try 锁定 → Confirm 提交 / Cancel 回滚（转账 100）
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('TCC3D');

const scene = new Scene3D('scene', { cameraPos: [0, 330, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x67e8f9, ROSE = 0xfb7185, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「TCC 事务」开始', x: 0, y: 265, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

// 协调者 + 账户 A、B
const coord = new VBox(scene, { w: 130, h: 66, d: 66, x: 0, y: 195, z: 0, label: 'TCC 协调者', color: PALETTE.node, emissive: PALETTE.nodeEmissive });
const AX = [-210, 210];
const accs = AX.map((x, i) => ({
  box: new VBox(scene, { w: 170, h: 90, d: 90, x, y: -55, z: 0, label: '账户 ' + (i ? 'B' : 'A'), color: PALETTE.node, emissive: PALETTE.nodeEmissive }),
  bal: new VText(scene, { text: '', x, y: -20, z: 30, color: PALETTE.textGlow, scale: 0.6 }),
}));
accs[0].bal.setText('余额 200'); accs[1].bal.setText('余额 0');

// 消息线（协调者 → 账户）
const msgLine = new VBox(scene, { w: 200, h: 3.5, d: 3.5, x: 0, y: 0, z: 0, label: '', color: YELLOW, emissive: YELLOW });
msgLine.mesh.visible = false;
function lineTo(dstX) {
  const x1 = 0, y1 = 195, x2 = dstX, y2 = -55;
  msgLine.mesh.position.set((x1 + x2) / 2, (y1 + y2) / 2, 0);
  msgLine.mesh.rotation.z = Math.atan2(y2 - y1, x2 - x1);
  msgLine.mesh.scale.set(Math.hypot(x2 - x1, y2 - y1) / 200, 1, 1);
  msgLine.mesh.visible = true;
}

// 转账金额芯片（在账户间飞行）
const money = new VBox(scene, { w: 54, h: 38, d: 38, x: 0, y: 0, z: 0, label: '100', color: YELLOW, emissive: YELLOW });
money.mesh.visible = false;

const phaseT = new VText(scene, { text: '', x: 0, y: 95, z: 0, color: PALETTE.textGlow, scale: 0.75 });
const stepT = new VText(scene, { text: '', x: 0, y: 45, z: 0, color: PALETTE.textGlow, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: -145, z: 0, color: PALETTE.textDim, scale: 0.68 });

function resetAll() {
  engine.clear();
  coord.setColor(PALETTE.node, PALETTE.nodeEmissive);
  accs.forEach((a, i) => {
    a.box.setColor(PALETTE.node, PALETTE.nodeEmissive);
    a.bal.setText(i ? '余额 0' : '余额 200');
  });
  msgLine.mesh.visible = false; money.mesh.visible = false;
  phaseT.setText(''); stepT.setText(''); eqT.setText('');
}

function runTCC() {
  resetAll();
  hint.setText('TCC：Try 锁资源 → Confirm 提交 → Cancel 补偿 — 业务级的「两阶段提交」');
  C(400, () => { phaseT.setText('成功路径：转账 100（A → B）'); stepT.setText('协调者发起 Try：A 冻结 100 准备扣款，B 预留 100 准备入账'); });
  C(800, () => {
    coord.setColor(YELLOW, YELLOW);
    lineTo(AX[0]); accs[0].box.setColor(BLUE, BLUE);
    accs[0].bal.setText('余额 200 · 冻结 100');
    stepT.setText('Try(A)：-100 被锁定（余额未变，但 100 已冻结，其他事务动不了）');
  });
  C(800, () => {
    lineTo(AX[1]); accs[1].box.setColor(BLUE, BLUE);
    accs[1].bal.setText('余额 0 · 预留 100');
    stepT.setText('Try(B)：+100 预留成功 — 两边资源都锁定，事务暂未生效');
  });
  C(800, () => {
    coord.setColor(GREEN, GREEN);
    phaseT.setText('Confirm：正式提交');
    money.mesh.visible = true; money.mesh.position.set(-210, -55, 0);
    stepT.setText('两个 Try 都成功 → Confirm：A 真正扣 100，B 真正加 100');
  });
  C(800, () => {
    money.mesh.position.set(210, -55, 0);
    accs[0].bal.setText('余额 100'); accs[1].bal.setText('余额 100');
    accs.forEach(a => a.box.setColor(GREEN, GREEN));
    stepT.setText('结果：A 200→100，B 0→100 — 转账完成 ✓');
  });
  C(900, () => {
    resetAll();
    phaseT.setText('失败路径：B 入账失败');
    stepT.setText('这次 B 的 Try 失败（如账户被冻结/风控拦截）→ 只回滚 A，不能硬提交');
  });
  C(800, () => {
    coord.setColor(ROSE, ROSE); coord.setText('协调者 ✗');
    lineTo(AX[0]); accs[0].box.setColor(BLUE, BLUE);
    accs[0].bal.setText('余额 200 · 冻结 100');
    stepT.setText('Try(A) 冻结了 100 → Try(B) 失败 ✗ → 协调者走 Cancel 补偿');
  });
  C(900, () => {
    coord.setText('TCC 协调者');
    lineTo(AX[0]); accs[0].box.setColor(ROSE, ROSE);
    accs[0].bal.setText('余额 200（解冻）');
    phaseT.setText('Cancel：回滚补偿');
    stepT.setText('Cancel(A)：释放冻结的 100 → A 余额恢复 200，B 不变 — 事务干净回滚');
    eqT.setText('TCC 三动作：Try 锁定 → Confirm 提交 / Cancel 回滚 — 业务接口三件套，Seata 框架的实现');
  });
  C(900, () => {
    status.textContent = 'TCC 完成：成功路径 Try(冻结)→Confirm(扣 100)；失败路径 Try(B) 失败→Cancel(A) 解冻，事务一致';
    hint.setText('TCC 把「锁定/提交/回滚」写成业务接口 — 适合跨库转账、钱包余额等强一致场景');
  });
}

panel.addButton('TCC 事务', runTCC);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；蓝=Try 锁定，绿=Confirm 成功，红=Cancel/失败，黄=资金流动）');

scene.start(engine);
