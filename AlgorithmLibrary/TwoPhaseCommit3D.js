// AlgorithmLibrary/TwoPhaseCommit3D.js — 两阶段提交：Prepare 征询 → 全 YES 则 Commit，否则 Abort（function* 生成器驱动）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('TwoPhaseCommit3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GREEN = 0x4ade80, BLUE = 0x60a5fa, DIM = 0x334155;
const status = panel.addStatus('就绪');

const coord = new VNode(scene, { x: 320, y: 490, z: 0, radius: 30, label: '协调者', color: PALETTE.node, emissive: PALETTE.nodeEmissive });
const parts = [];
const POS = [[-260, 320], [0, 230], [260, 320]];
for (let i = 0; i < 3; i++) {
  parts.push(new VNode(scene, { x: POS[i][0] + 320, y: POS[i][1], z: 0, radius: 25, label: '参与者' + (i + 1), color: DIM, emissive: DIM }));
}
const tubes = parts.map(p => tubeBetween(scene, coord.mesh.position, p.mesh.position, { color: BLUE, opacity: 0.4, radius: 2.2 }));
tubes.forEach(t => t.visible = false);

function resetAll() {
  coord.setColor(PALETTE.node, PALETTE.nodeEmissive);
  coord.setText('协调者');
  parts.forEach((p, i) => { p.setColor(DIM, DIM); p.setText('参与者' + (i + 1)); });
  tubes.forEach(t => { t.visible = false; t.material.color.setHex(BLUE); });
}

function* tpcGen() {
  resetAll();
  yield S(() => { status.textContent = '两阶段提交（2PC）：分布式转账，账户 A 扣 100 → 账户 B 加 100，需 3 个参与者（数据库分片）同时生效 —— 要么全成功、要么全不生效（原子性）'; });
  yield W(900);
  yield S(() => { tubes.forEach(t => t.visible = true); parts.forEach(p => p.pulse(0.3)); status.textContent = '阶段 1/2 Prepare：协调者广播准备，各参与者先执行本地事务、锁定资源，但暂不提交'; });
  yield W(900);
  yield S(() => { parts.forEach((p, i) => { p.setColor(GREEN, GREEN); }); status.textContent = '3 个参与者本地执行成功、资源锁定 → 回复 YES（3/3），等待最终指令'; });
  yield W(900);
  yield S(() => { status.textContent = '只要有一个 NO（如余额不足）就进入中止；本例 3/3 全 YES → 进入提交阶段'; });
  yield W(900);
  yield S(() => { tubes.forEach(t => { t.material.color.setHex(GREEN); }); status.textContent = '阶段 2/2 Commit：协调者广播提交，所有参与者同时提交本地事务'; });
  yield W(900);
  yield S(() => { parts.forEach((p, i) => { p.pulse(0.4); }); status.textContent = '3 个参与者全部提交成功、释放资源 —— 扣款与入账同时生效'; });
  yield W(900);
  yield S(() => { coord.setColor(GREEN, GREEN); coord.pulse(0.4); status.textContent = '两阶段提交演示完成：Prepare → 3/3 YES → Commit，全部提交成功；若任一 NO 则全体 Abort 回滚；代价是协调者单点、参与者等待期间持锁阻塞'; });
  yield W(600);
}

engine.queue(() => tpcGen());
panel.addButton('清空', () => { engine.clear(); resetAll(); status.textContent = ''; });

scene.start(engine);
