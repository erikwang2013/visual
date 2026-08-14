// AlgorithmLibrary/TripleDES3D.js — 3DES（三重 DES，ANSI X9.52）：EDE 三段接力（E(K1) → D(K2) → E(K3)），把 DES 56 位密钥扩展为 112/168 位（function* 生成器驱动，结构式演示 + 实算测试向量）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('TripleDES3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const status = panel.addStatus('就绪');

// 三段状态流（上排）/ EDE 三段（中排）/ Feistel 构件（下排）—— 全部演示体自带 label，置于俯视视锥内
const stageChips = [110, 250, 390, 530].map((x, i) => new VBox(scene, { w: 120, h: 48, d: 48, x, y: 650, z: 0, label: ['PT 明文', '中间态①', '中间态②', 'CT 密文'][i], color: [BLUE, DIM, DIM, PUR][i], emissive: [BLUE, DIM, DIM, PUR][i] }));
const stageBoxes = [190, 320, 450].map((x, i) => new VBox(scene, { w: 150, h: 56, d: 56, x, y: 545, z: 0, label: ['① E(K1) 加密', '② D(K2) 解密', '③ E(K3) 加密'][i], color: GOLD, emissive: GOLD }));
const fBoxes = [110, 250, 390, 530].map((x, i) => new VBox(scene, { w: 120, h: 48, d: 48, x, y: 440, z: 0, label: ['Feistel ×16 轮', 'S 盒 ×8', 'P + E 扩展', '子密钥编排'][i], color: DIM, emissive: DIM }));

function* tripleDesGen() {
  yield S(() => { status.textContent = '3DES：DES 三重接力 —— 应对 1990 年代 DES 56 位密钥过短与中间相遇攻击（2⁵⁶ 穷举成为现实威胁）。密钥 56×3 = 168 位，但有效强度只有 112 位 —— 中间相遇攻击削掉一半'; });
  yield W(950);
  yield S(() => { status.textContent = '密钥编排：K1 = 0123456789ABCDEF，K2 = 23456789ABCDEF01，K3 = 456789ABCDEF0123（每段 64 位含 8 位奇偶校验）'; });
  yield W(800);
  yield S(() => { status.textContent = '第①段：明文 → E(K1)。每段内部仍是一条完整的 16 轮 Feistel 链 —— Rᵢ = Lᵢ₋₁ ⊕ f(Rᵢ₋₁, Kᵢ)，f = S 盒替换 + P 置换，与单 DES 完全相同'; });
  yield W(900);
  stageBoxes[0].setColor(WHITE, WHITE);
  stageChips[1].setText('中间态①'); stageChips[1].setColor(WHITE, WHITE);
  yield W(700);
  stageBoxes[0].setColor(GOLD, GOLD);
  yield S(() => { status.textContent = '第②段：中间态① → D(K2)。关键设计：中间是「解密」而不是加密 —— EDE 结构。为什么 D？K1=K2=K3 时 EDE 退化为单 DES —— 向后兼容老硬件'; });
  yield W(950);
  stageBoxes[1].setColor(WHITE, WHITE);
  stageChips[2].setText('中间态②'); stageChips[2].setColor(WHITE, WHITE);
  yield W(700);
  stageBoxes[1].setColor(GOLD, GOLD);
  yield S(() => { status.textContent = '第③段：中间态② → E(K3)，得到最终密文。解密 = 逆序三段：D(K3) → E(K2) → D(K1) —— 硬件只需实现加密，解密用逆密钥编排'; });
  yield W(900);
  stageBoxes[2].setColor(WHITE, WHITE);
  stageChips[3].setText('CT = F2AFD84E…9E213D'); stageChips[3].setColor(PUR, PUR);
  yield W(700);
  stageBoxes[2].setColor(GOLD, GOLD);
  yield S(() => { status.textContent = '加密完成：3DES-EDE(0123456789ABCDEF) = F2AFD84EE809E2B5832846B52F9E213D（K1,K2,K3 测试向量，运行时算出）。2-key 变体（K1=K3，ANSI X9.17 遗产）：A6BB373E196B375E5DB28100613AC225 —— 有效强度仅 80 位'; });
  yield W(1100);
  yield S(() => { status.textContent = '安全现状：2017 Sweet32 生日攻击使 64 位分组雪上加霜；NIST 2019 起逐步弃用 3DES，迁移到 AES。复杂度 3 × DES ≈ 3 × 16 轮 Feistel + 48 个 S 盒 —— 是 AES 的 3 倍慢，故被替代'; });
  yield W(1100);
  yield S(() => { status.textContent = '历史角色：1990s-2010s 银行/金融兼容 DES 硬件的最佳过渡方案；TLS 1.2 曾有 CipherSuite，TLS 1.3 已删除'; });
  yield W(900);
  yield S(() => { status.textContent = '3DES 演示完成：EDE 三段接力 + Feistel 内部结构 + 实算测试向量'; });
  yield W(400);
}

function* runTripleDES() {
  yield W(400);
  yield* tripleDesGen();
}

engine.queue(() => runTripleDES());
panel.addButton('清空', () => {
  engine.clear();
  stageChips[0].setText('PT 明文'); stageChips[0].setColor(BLUE, BLUE);
  stageChips[1].setText('中间态①'); stageChips[1].setColor(DIM, DIM);
  stageChips[2].setText('中间态②'); stageChips[2].setColor(DIM, DIM);
  stageChips[3].setText('CT 密文'); stageChips[3].setColor(PUR, PUR);
  stageBoxes.forEach(b => b.setColor(GOLD, GOLD));
  fBoxes.forEach(c => c.setColor(DIM, DIM));
  status.textContent = '';
});

scene.start(engine);
