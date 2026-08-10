// AlgorithmLibrary/RSA3D.js — RSA 公钥加密：密钥生成 / 加密 / 解密
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('RSA3D');

const scene = new Scene3D('scene', { cameraPos: [0, 380, 720], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GREEN = 0x4ade80, BLUE = 0x60a5fa, RED = 0xf87171, YELLOW = 0xfacc15, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「运行演示」开始', x: 0, y: 330, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const P = 61, Q = 53, N = P * Q, PHI = (P - 1) * (Q - 1), E = 17, D = 2753, M = 65, C0 = 2790;

const nodeP = new VNode(scene, { x: -260, y: 240, z: 0, radius: 30, label: 'p = ' + P, color: 0xa78bfa, emissive: 0xa78bfa });
const nodeQ = new VNode(scene, { x: 260, y: 240, z: 0, radius: 30, label: 'q = ' + Q, color: 0xa78bfa, emissive: 0xa78bfa });
const nodeN = new VNode(scene, { x: 0, y: 150, z: 0, radius: 34, label: 'n = ' + N, color: DIM, emissive: DIM });
const phiText = new VText(scene, { text: '', x: 0, y: 100, z: 0, color: PALETTE.textGlow, scale: 0.8 });
const nodePub = new VNode(scene, { x: -230, y: -20, z: 0, radius: 30, label: '公钥 (n, e)', color: BLUE, emissive: BLUE });
const nodePriv = new VNode(scene, { x: 230, y: -20, z: 0, radius: 30, label: '私钥 (n, d)', color: RED, emissive: RED });
const pubT = new VText(scene, { text: '', x: -230, y: -75, z: 0, color: BLUE, scale: 0.75 });
const privT = new VText(scene, { text: '', x: 230, y: -75, z: 0, color: RED, scale: 0.75 });
const nodeM = new VNode(scene, { x: -320, y: -180, z: 0, radius: 26, label: 'M = ' + M, color: PALETTE.node, emissive: PALETTE.nodeEmissive });
const nodeC = new VNode(scene, { x: 0, y: -180, z: 0, radius: 26, label: 'C = ?', color: DIM, emissive: DIM });
const nodeD = new VNode(scene, { x: 320, y: -180, z: 0, radius: 26, label: 'M = ?', color: DIM, emissive: DIM });
const calcT = new VText(scene, { text: '', x: 0, y: -250, z: 0, color: PALETTE.textGlow, scale: 0.75 });
const tube1 = tubeBetween(scene, nodeM.mesh.position, nodeC.mesh.position, { color: BLUE, opacity: 0.35 });
const tube2 = tubeBetween(scene, nodeC.mesh.position, nodeD.mesh.position, { color: GREEN, opacity: 0.35 });
tube1.visible = false; tube2.visible = false;

function resetAll() {
  engine.clear();
  nodeP.setColor(0xa78bfa, 0xa78bfa); nodeQ.setColor(0xa78bfa, 0xa78bfa);
  nodeN.setColor(DIM, DIM); nodePub.setColor(BLUE, BLUE); nodePriv.setColor(RED, RED);
  nodeM.setColor(PALETTE.node, PALETTE.nodeEmissive);
  nodeC.setColor(DIM, DIM); nodeD.setColor(DIM, DIM);
  nodeC.setText('C = ?'); nodeD.setText('M = ?');
  phiText.setText(''); pubT.setText(''); privT.setText(''); calcT.setText('');
  tube1.visible = false; tube2.visible = false;
}

function runDemo() {
  resetAll();
  hint.setText('RSA：选取大素数 → 计算模数 → 选取公钥指数 → 扩展欧几里得求私钥');
  C(300, () => nodeP.pulse(0.3));
  C(100, () => nodeQ.pulse(0.3));
  hint.setText('选取两个大素数 p = ' + P + '，q = ' + Q + '（乘积作为模数）');
  C(900, () => {
    nodeN.setColor(GREEN, GREEN);
    tubeBetween(scene, nodeP.mesh.position, nodeN.mesh.position, { color: GREEN, opacity: 0.3 });
    tubeBetween(scene, nodeQ.mesh.position, nodeN.mesh.position, { color: GREEN, opacity: 0.3 });
  });
  hint.setText('模数 n = p × q = ' + P + ' × ' + Q + ' = ' + N);
  C(900, () => {
    phiText.setText('φ(n) = (p-1)(q-1) = 60 × 52 = ' + PHI);
  });
  hint.setText('欧拉函数 φ(n) = (p-1)(q-1) = ' + PHI);
  C(800, () => {
    nodePub.setText('公钥 (n, e)');
    pubT.setText('e = ' + E + '（gcd(e, φ) = 1）');
  });
  hint.setText('选取公钥指数 e = ' + E + '，与 φ(n) 互质');
  C(800, () => {
    nodePriv.setText('私钥 (n, d)');
    privT.setText('d = e⁻¹ mod φ(n) = ' + D);
  });
  hint.setText('扩展欧几里得求逆：d ≡ e⁻¹ (mod ' + PHI + ')，即 e·d mod ' + PHI + ' = 1 → d = ' + D);
  C(900, () => {
    nodeM.setColor(YELLOW, YELLOW);
    tube1.visible = true;
  });
  hint.setText('加密：明文 M = ' + M + '，C = M^e mod n');
  C(700, () => calcT.setText('C = ' + M + '^' + E + ' mod ' + N + ' = ' + C0));
  hint.setText('快速幂：' + M + '^16 mod ' + N + ' = 789，789 × ' + M + ' mod ' + N + ' = ' + C0);
  C(900, () => {
    nodeC.setColor(GREEN, GREEN);
    nodeC.setText('C = ' + C0);
    tube2.visible = true;
  });
  hint.setText('解密：M = C^d mod n = ' + C0 + '^' + D + ' mod ' + N);
  C(800, () => {
    nodeD.setColor(GREEN, GREEN);
    nodeD.setText('M = ' + M + ' ✓');
    status.textContent = 'RSA 验证成功：' + M + ' → ' + C0 + ' → ' + M;
    hint.setText('只有持有私钥 d 的一方才能从 ' + C0 + ' 还原出明文 ' + M);
  });
}

panel.addButton('运行演示', runDemo);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
