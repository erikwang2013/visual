// AlgorithmLibrary/SM43D.js — SM4 国密分组密码（GB/T 32907）：128 位密钥 32 轮；轮函数 X_{i+4} = X_i ⊕ T(X_{i+1}⊕X_{i+2}⊕X_{i+3}⊕rk_i)，T = τ(S 盒)∘L；轮密钥由 MK⊕FK 经 CK 与 T′ 派生（function* 生成器驱动，结构式演示 + 标准测试向量）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('SM43D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const status = panel.addStatus('就绪');

const mkChip = new VBox(scene, { w: 440, h: 54, d: 54, x: 340, y: 690, z: 0, label: '密钥 MK = 0123456789abcdeffedcba9876543210', color: PUR, emissive: PUR });
const regChips = [135, 280, 425, 570].map((x, i) => new VBox(scene, { w: 130, h: 56, d: 56, x, y: 600, z: 0, label: ['X0','X1','X2','X3'][i], color: BLUE, emissive: BLUE }));
const rkChip = new VBox(scene, { w: 165, h: 52, d: 52, x: 170, y: 480, z: 0, label: 'rk_i = 轮密钥', color: GOLD, emissive: GOLD });
const tBox = new VBox(scene, { w: 140, h: 72, d: 72, x: 375, y: 480, z: 0, label: 'T = τ ∘ L', color: CYAN, emissive: CYAN });
const sBox = new VBox(scene, { w: 100, h: 52, d: 52, x: 470, y: 400, z: 0, label: 'τ：S 盒×4', color: DIM, emissive: DIM });
const lBox = new VBox(scene, { w: 100, h: 52, d: 52, x: 565, y: 400, z: 0, label: 'L：循环移位异或', color: DIM, emissive: DIM });

function* sm4Gen() {
  yield S(() => { status.textContent = 'SM4：国密分组密码（GB/T 32907）—— 128 位明文/密钥，32 轮，与 DES/AES 同属迭代分组密码；明文 128 位 = 4 个 32 位字 X0..X3，密钥 MK = 0123456789abcdeffedcba9876543210'; });
  yield W(950);
  yield S(() => { status.textContent = '密钥扩展：K = MK ⊕ FK（FK = 系统参数 4 个字）；轮 i 用 K_i 与前 3 个字、常数 CK_i 推出 rk_i；rk_i = K_i ⊕ T′(K_{i+1}⊕K_{i+2}⊕K_{i+3}⊕CK_i) —— 与加密同构的「反轮」结构；T′ = τ ∘ L′，L′ = B ⊕ (B<<<13) ⊕ (B<<<23)'; });
  yield W(950);
  yield S(() => { status.textContent = '加密主循环 32 轮。轮 i：B = X_{i+1} ⊕ X_{i+2} ⊕ X_{i+3} ⊕ rk_i；T(B) = L(τ(B))；X_{i+4} = X_i ⊕ T(B)。τ = 4 个 S 盒并行替换；L = B ⊕ (B<<<2) ⊕ (B<<<10) ⊕ (B<<<18) ⊕ (B<<<24)'; });
  yield W(950);
  for (let i = 0; i < 32; i++) {
    const slot = i % 4;
    regChips[slot].setColor(WHITE, WHITE);
    yield S(() => { status.textContent = '第 ' + (i + 1) + '/32 轮：X' + (i + 4) + ' = X' + i + ' ⊕ T(X' + (i + 1) + ' ⊕ X' + (i + 2) + ' ⊕ X' + (i + 3) + ' ⊕ rk_' + i + ') —— B → τ 查表 → L 置换 → 与 X' + i + ' 异或，窗口右端长出新字 X' + (i + 4) + '，左端挤掉旧字'; });
    yield W(46);
    regChips[slot].setText('X' + (i + 4));
    regChips[slot].setColor(BLUE, BLUE);
    yield W(20);
  }
  yield S(() => { status.textContent = '32 轮完成：最后一轮结果反序输出（X35,X34,X33,X32）→ 128 位密文；解密 = 同一结构用反序轮密钥（rk_31..rk_0）—— 硬件可复用'; });
  yield W(900);
  yield S(() => { status.textContent = 'SM4(MK 测试向量) = 681edf34d206965e86b3e94f536e4246，与国标 GB/T 32907 测试向量一致；应用：国密 TLS（GM/T 0024）、WAPI、金融 IC 卡、物联网 —— 与 SM2/SM3 组成国密三件套'; });
  yield W(1100);
  yield S(() => { status.textContent = '设计特点：S 盒代数结构公开、无弱密钥；32 轮提供足够雪崩；软件实现优于 3DES。复杂度：32 轮 × (4 查表 + 异或链)；硬件面积小，适合嵌入式'; });
  yield W(1100);
  yield S(() => { status.textContent = 'SM4 演示完成：密钥扩展 + 32 轮 T 变换 → 标准测试向量密文'; });
  yield W(400);
}

function* runSM4() {
  yield W(400);
  yield* sm4Gen();
}

engine.queue(() => runSM4());
panel.addButton('清空', () => {
  engine.clear();
  mkChip.setColor(PUR, PUR);
  regChips.forEach((c, i) => { c.setText(['X0','X1','X2','X3'][i]); c.setColor(BLUE, BLUE); });
  rkChip.setColor(GOLD, GOLD);
  tBox.setColor(CYAN, CYAN);
  sBox.setColor(DIM, DIM);
  lBox.setColor(DIM, DIM);
  status.textContent = '';
});

scene.start(engine);
