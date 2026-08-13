// AlgorithmLibrary/TwoPhaseCommit3D.js — 两阶段提交：Prepare 征询 → 全 YES 则 Commit，否则 Abort（function* 生成器驱动）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('TwoPhaseCommit3D');

const scene = new Scene3D('scene', { cameraPos: [320, 500, 900], lookAt: [320, 500, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GREEN = 0x4ade80, BLUE = 0x60a5fa, YELLOW = 0xfacc15, RED = 0xf87171, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：2PC 事务', x: 700, y: 560, z: 0, color: PALETTE.textGlow, scale: 0.7, wrapChars: 7 });
const status = panel.addStatus('就绪');

const coord = new VNode(scene, { x: 320, y: 490, z: 0, radius: 30, label: '协调者', color: PALETTE.node, emissive: PALETTE.nodeEmissive });
const parts = [];
const pStates = [];
const POS = [[-260, 320], [0, 230], [260, 320]];
for (let i = 0; i < 3; i++) {
  parts.push(new VNode(scene, { x: POS[i][0] + 320, y: POS[i][1], z: 0, radius: 25, label: '参与者' + (i + 1), color: DIM, emissive: DIM }));
  pStates.push(new VText(scene, { text: '就绪待命', x: POS[i][0], y: POS[i][1] + 55, z: 0, color: PALETTE.textDim, scale: 0.55 }));
}
const tubes = parts.map(p => tubeBetween(scene, coord.mesh.position, p.mesh.position, { color: BLUE, opacity: 0.4, radius: 2.2 }));
tubes.forEach(t => t.visible = false);
const phaseT = new VText(scene, { text: '', x: 320, y: 555, z: 0, color: PALETTE.textGlow, scale: 0.72, wrapChars: 7 });
const ruleT = new VText(scene, { text: '规则：任一参与者回复 NO（如余额不足）→ 协调者广播 ABORT，全体回滚', x: 700, y: 330, z: 0, color: PALETTE.textDim, scale: 0.5, wrapChars: 8 });

function resetAll() {
  coord.setColor(PALETTE.node, PALETTE.nodeEmissive);
  coord.setText('协调者');
  parts.forEach((p, i) => { p.setColor(DIM, DIM); p.setText('参与者' + (i + 1)); });
  pStates.forEach(t => t.setText('就绪待命'));
  tubes.forEach(t => t.visible = false);
  phaseT.setText('');
}

function* tpcGen() {
  resetAll();
  yield S(() => hint.setText('两阶段提交：让分布在不同节点的操作「要么全成功，要么全不生效」（原子性）'));
  yield S(() => {
    phaseT.setText('分布式转账事务：账户 A 扣 100 → 账户 B 加 100');
    hint.setText('协调者收到客户端请求，需要 3 个参与者（数据库分片）同时生效');
  });
  yield W(600);
  yield S(() => {
    phaseT.setText('阶段 1：Prepare（准备）');
    tubes.forEach(t => t.visible = true);
    parts.forEach(p => p.pulse(0.3));
    hint.setText('协调者广播 Prepare：各参与者先执行本地事务但暂不提交');
  });
  yield W(800);
  yield S(() => {
    parts.forEach((p, i) => { p.setColor(GREEN, GREEN); pStates[i].setText('已就绪 ✓'); });
    hint.setText('各参与者本地执行成功、锁定资源 → 回复 YES，等待最终指令');
  });
  yield W(800);
  yield S(() => {
    phaseT.setText('协调者收到 3/3 个 YES');
    hint.setText('只要有一个 NO 就进入中止；本例全部 YES → 进入提交阶段');
  });
  yield W(900);
  yield S(() => {
    phaseT.setText('阶段 2：Commit（提交）');
    tubes.forEach(t => { t.material.color.setHex(GREEN); });
    hint.setText('协调者广播 Commit：所有参与者同时提交本地事务');
  });
  yield W(800);
  yield S(() => {
    parts.forEach((p, i) => { p.pulse(0.4); pStates[i].setText('已提交 ✓'); });
    hint.setText('3 个参与者全部提交成功，释放资源');
  });
  yield W(900);
  yield S(() => {
    coord.setColor(GREEN, GREEN);
    coord.pulse(0.4);
    phaseT.setText('事务完成：扣款与入账同时生效');
    status.textContent = '2PC 成功：Prepare → 3/3 YES → Commit → 全部提交（若任一 NO 则全体 Abort 回滚）';
    hint.setText('2PC 的代价：协调者是单点，参与者等待期间持锁阻塞；三阶段提交（3PC）缓解了阻塞问题');
  });
  yield W(600);
}

engine.queue(() => tpcGen());
panel.addButton('清空', () => { engine.clear(); resetAll(); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；经典分布式事务协议，XA / JTA 的实现基础）');

scene.start(engine);
