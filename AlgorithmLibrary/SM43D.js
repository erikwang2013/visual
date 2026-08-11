// AlgorithmLibrary/SM43D.js — SM4 国密分组密码（GB/T 32907）：128 位密钥 32 轮；轮函数 X_{i+4} = X_i ⊕ T(X_{i+1}⊕X_{i+2}⊕X_{i+3}⊕rk_i)，T = τ(S 盒)∘L；轮密钥由 MK⊕FK 经 CK 与 T′ 派生（function* 生成器驱动，结构式演示 + 标准测试向量）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('SM43D');

const scene = new Scene3D('scene', { cameraPos: [0, 330, 680], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「运行演示」开始：SM4 —— 国密 128 位分组密码，32 轮迭代', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 0, y: 262, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: 130, z: 0, color: PALETTE.textGlow, scale: 0.42 });
const outT = new VText(scene, { text: '', x: 0, y: -235, z: 0, color: PALETTE.textGlow, scale: 0.62 });

const mkChip = new VBox(scene, { w: 520, h: 54, d: 54, x: 0, y: 200, z: 0, label: '密钥 MK = 0123456789abcdeffedcba9876543210', color: PUR, emissive: PUR });
const regChips = [-270, -90, 90, 270].map((x, i) => new VBox(scene, { w: 150, h: 56, d: 56, x, y: 115, z: 0, label: ['X0','X1','X2','X3'][i], color: BLUE, emissive: BLUE }));
new VText(scene, { text: 'X0~X3 = 4 个 32 位字（128 位明文分组）—— 每轮在窗口右端长出新字 X_{i+4}，左端挤掉旧字', x: 0, y: 70, z: 0, color: PALETTE.textDim, scale: 0.38 });
const rkChip = new VBox(scene, { w: 280, h: 52, d: 52, x: -290, y: -5, z: 0, label: 'rk_i = 轮密钥', color: GOLD, emissive: GOLD });
const tBox = new VBox(scene, { w: 240, h: 72, d: 72, x: 60, y: -5, z: 0, label: 'T = τ ∘ L', color: CYAN, emissive: CYAN });
const sBox = new VBox(scene, { w: 150, h: 52, d: 52, x: 250, y: -30, z: 0, label: 'τ：S 盒×4', color: DIM, emissive: DIM });
const lBox = new VBox(scene, { w: 150, h: 52, d: 52, x: 420, y: -30, z: 0, label: 'L：循环移位异或', color: DIM, emissive: DIM });
new VText(scene, { text: 'T′（密钥扩展用）= τ ∘ L′，L′ = B ⊕ (B<<<13) ⊕ (B<<<23)', x: 0, y: -60, z: 0, color: PALETTE.textDim, scale: 0.36 });
const ckT = new VText(scene, { text: '密钥扩展：K = MK ⊕ FK（系统参数）；rk_i = K_{i+4} = K_i ⊕ T′(K_{i+1}⊕K_{i+2}⊕K_{i+3}⊕CK_i)，CK_i = 固定常数', x: 0, y: -95, z: 0, color: PALETTE.textDim, scale: 0.36 });

function* sm4Gen() {
  yield S(() => { hint.setText('SM4：国密分组密码（GB/T 32907）—— 128 位明文/密钥，32 轮，与 DES/AES 同属迭代分组密码'); stageT.setText('128 位明文 = 4 个 32 位字 X0..X3；128 位密钥 MK 经扩展得 32 个轮密钥 rk_0..rk_31'); });
  yield W(950);
  yield S(() => { stageT.setText('密钥扩展：K = MK ⊕ FK（FK = 系统参数 4 个字）；轮 i 用 K_i 与前 3 个字、常数 CK_i 推出 rk_i'); eqT.setText('rk_i = K_i ⊕ T′(K_{i+1} ⊕ K_{i+2} ⊕ K_{i+3} ⊕ CK_i) —— 与加密同构的「反轮」结构'); });
  yield W(950);
  yield S(() => { stageT.setText('加密主循环 32 轮。轮 i：B = X_{i+1} ⊕ X_{i+2} ⊕ X_{i+3} ⊕ rk_i；T(B) = L(τ(B))；X_{i+4} = X_i ⊕ T(B)'); eqT.setText('τ = 4 个 S 盒并行替换；L = B ⊕ (B<<<2) ⊕ (B<<<10) ⊕ (B<<<18) ⊕ (B<<<24)'); });
  yield W(950);
  for (let i = 0; i < 32; i++) {
    const slot = i % 4;
    regChips[slot].setColor(WHITE, WHITE);
    yield S(() => { stageT.setText('第 ' + (i + 1) + '/32 轮：X' + (i + 4) + ' = X' + i + ' ⊕ T(X' + (i + 1) + ' ⊕ X' + (i + 2) + ' ⊕ X' + (i + 3) + ' ⊕ rk_' + i + ')'); eqT.setText('B = X' + (i + 1) + '⊕X' + (i + 2) + '⊕X' + (i + 3) + '⊕rk_' + i + ' → τ 查表 → L 置换 → 与 X' + i + ' 异或'); });
    yield W(46);
    regChips[slot].setText('X' + (i + 4));
    regChips[slot].setColor(BLUE, BLUE);
    yield W(20);
  }
  yield S(() => { stageT.setText('32 轮完成：最后一轮结果反序输出（X35,X34,X33,X32）→ 128 位密文'); eqT.setText('解密 = 同一结构用反序轮密钥（rk_31..rk_0）—— 硬件可复用'); });
  yield W(900);
  yield S(() => { outT.setText('SM4(MK 测试向量) = 681edf34d206965e86b3e94f536e4246'); status.textContent = 'SM4：681edf34…536e4246'; hint.setText('应用：国密 TLS（GM/T 0024）、WAPI、金融 IC 卡、物联网 —— 与 SM2/SM3 组成国密三件套'); });
  yield W(1100);
  yield S(() => { hint.setText('设计特点：S 盒代数结构公开、无弱密钥；32 轮提供足够雪崩；软件实现优于 3DES'); outT.setText('复杂度：32 轮 × (4 查表 + 异或链)；硬件面积小，适合嵌入式'); });
  yield W(1100);
  yield S(() => { hint.setText('SM4 演示完成：密钥扩展 + 32 轮 T 变换 → 标准测试向量密文'); outT.setText(''); });
  yield W(400);
}

function* runSM4() {
  hint.setText('SM4：国密分组密码');
  yield W(400);
  yield* sm4Gen();
}

panel.addButton('运行演示', () => engine.start(runSM4()));
panel.addButton('清空', () => {
  engine.clear();
  regChips.forEach((c, i) => { c.setText(['X0','X1','X2','X3'][i]); c.setColor(BLUE, BLUE); });
  stageT.setText(''); eqT.setText(''); outT.setText('');
  hint.setText('已清空，可重新运行'); status.textContent = '';
});
panel.addLabel('（拖拽旋转视角，滚轮缩放；紫 = 密钥、蓝 = 数据字窗口（白闪 = 正在生成的新字）、金 = 轮密钥、青 = T 变换盒、灰 = τ/L 构件；32 轮快速循环后输出国标测试向量）');

scene.start(engine);
