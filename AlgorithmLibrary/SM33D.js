// AlgorithmLibrary/SM33D.js — SM3（国密哈希，GB/T 32905）：512 位分组、消息扩展 W/W′、64 轮（FF/GG 布尔函数 + P0/P1 置换），8 寄存器，256 位摘要（function* 生成器驱动，结构式演示 + 标准测试向量）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('SM33D');

const scene = new Scene3D('scene', { cameraPos: [0, 330, 680], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「运行演示」开始：SM3 —— 国密哈希，结构与 SHA-256 同族，64 轮输出 256 位', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 0, y: 262, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: 132, z: 0, color: PALETTE.textGlow, scale: 0.44 });
const outT = new VText(scene, { text: '', x: 0, y: -235, z: 0, color: PALETTE.textGlow, scale: 0.62 });

const padChips = [-330, -110, 110].map((x, i) => new VBox(scene, { w: 200, h: 50, d: 50, x, y: 190, z: 0, label: ['消息 "abc"', '填充 + 64 位长度', '512 位分组'], color: [BLUE, CYAN, PUR][i], emissive: [BLUE, CYAN, PUR][i] }));
const wChip = new VBox(scene, { w: 300, h: 50, d: 50, x: 280, y: 190, z: 0, label: 'W[0..67] + W′[0..63]', color: ORANGE, emissive: ORANGE });
const regChips = [-336, -240, -144, -48, 48, 144, 240, 336].map((x, i) => new VBox(scene, { w: 84, h: 50, d: 50, x, y: 100, z: 0, label: ['V0','V1','V2','V3','V4','V5','V6','V7'][i], color: GOLD, emissive: GOLD }));
new VText(scene, { text: 'V0~V7 = 8 个 32 位寄存器。每轮：SS1 = ((V0<<<12) + V4 + (T_j<<<j)) <<< 7；SS2 = SS1 ⊕ (V0<<<12)；TT1 = FF + V3 + SS2 + W′[j]；TT2 = GG + V7 + SS1 + W[j]；链式左移并做 P0/P1 置换', x: 0, y: 55, z: 0, color: PALETTE.textDim, scale: 0.36 });
const fBoxes = [-330, -110, 110, 330].map((x, i) => new VBox(scene, { w: 200, h: 54, d: 54, x, y: -10, z: 0, label: ['FF_j：轮 0~15 XOR / 16~63 多数', 'GG_j：轮 0~15 XOR / 16~63 选择', 'P0(X) = X⊕(X<<<9)⊕(X<<<17)', 'P1(X) = X⊕(X<<<15)⊕(X<<<23)'][i], color: DIM, emissive: DIM }));
new VText(scene, { text: '常数 T_j：轮 0~15 = 79cc4519，轮 16~63 = 7a879d8a；W′[j] = W[j] ⊕ W[j+4]', x: 0, y: -45, z: 0, color: PALETTE.textDim, scale: 0.36 });

function* sm3Gen() {
  yield S(() => { hint.setText('SM3：国标 GB/T 32905 商用密码哈希 —— 国内合规场景（SM2 签名、证书）的标配'); stageT.setText('消息 "abc"：填充（补 1 + 补 0 + 64 位长度）→ 512 位分组 → 扩展出 W[0..67] 与 W′[0..63]'); });
  yield W(950);
  yield S(() => { stageT.setText('W[0..15] = 分组 16 字；W[j] 递推展开，W′[j] = W[j] ⊕ W[j+4] —— 每轮同时喂两个派生字'); });
  yield W(750);
  yield S(() => { stageT.setText('64 轮压缩：SS1/SS2 中间量 + FF/GG 布尔函数 + P0/P1 置换，寄存器链整体旋转'); eqT.setText('IV = 7380166f 4914b2b9 172442d7 da8a0600 a96f30bc 163138aa e38dee4d b0fb0e4e'); });
  yield W(900);
  for (let r = 0; r < 64; r++) {
    const phase = r < 16 ? '0~15' : '16~63';
    yield S(() => { stageT.setText('第 ' + (r + 1) + '/64 轮：SS1 = ((V0<<<12) + V4 + (T<<<' + r + ')) <<<7；TT1 = FF(V0,V1,V2) + V3 + SS2 + W′[' + r + ']；TT2 = GG(V4,V5,V6) + V7 + SS1 + W[' + r + ']'); eqT.setText('FF/GG 用 ' + phase + ' 分支；D 前置 P0(TT2)，C 前置 B<<<9 —— 扩散每轮翻倍'); });
    yield W(42);
  }
  yield S(() => { stageT.setText('64 轮完成：寄存器与 IV 相加 → 256 位摘要'); eqT.setText('与 SHA-256 同构但更「国」：中国商用密码体系 SM2/SM3/SM4 全部国标化'); });
  yield W(900);
  yield S(() => { outT.setText('SM3("abc") = 66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0'); status.textContent = 'SM3("abc") = 66c7f0f4…f4ba8e0'; hint.setText('应用：SM2 数字签名的消息摘要、SM3 完整性校验、区块链国密版本（长安链等）'); });
  yield W(1100);
  yield S(() => { hint.setText('设计上与 SHA-256 同族（Merkle-Damgård + 分组压缩），安全性分析未见公开严重弱点'); outT.setText('复杂度：O(n)，每 512 位分组 64 轮 + 扩展 —— 与 SHA-256 相当'); });
  yield W(1100);
  yield S(() => { hint.setText('SM3 演示完成：消息扩展 + 64 轮压缩 → 256 位摘要'); outT.setText(''); });
  yield W(400);
}

function* runSM3() {
  hint.setText('SM3：国密 256 位摘要');
  yield W(400);
  yield* sm3Gen();
}

panel.addButton('运行演示', () => engine.start(runSM3()));
panel.addButton('清空', () => {
  engine.clear();
  fBoxes.forEach(c => c.setColor(DIM, DIM));
  stageT.setText(''); eqT.setText(''); outT.setText('');
  hint.setText('已清空，可重新运行'); status.textContent = '';
});
panel.addLabel('（拖拽旋转视角，滚轮缩放；顶排 = 填充与消息扩展，金块 = 8 个寄存器 V0~V7，下排 = FF/GG/P0/P1 构件；64 轮快速循环后输出国标测试向量）');

scene.start(engine);
