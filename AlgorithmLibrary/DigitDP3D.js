// AlgorithmLibrary/DigitDP3D.js — 数位DP：[0,89] 不含数字 7 共 72 个，减 1 去 0 → 1..89 = 71；
// 十位候选 0..8 逐枚（7 红叉跳过，其余 ×9）累计 9→…→63→72 → 个位 ×1 逐格 → 72−1=71（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('DigitDP3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GOLD = 0xfde047, GREEN = 0x4ade80, CYAN = 0x67e8f9, BLUE = 0x60a5fa, RED = 0xf87171;
const status = panel.addStatus('就绪');

// ---- 上限数码盒（常驻顶部，label 常显 BLUE） ----
const capBox = [
  new VBox(scene, { w: 56, h: 56, d: 56, x: 280, y: 800, z: 0, label: '8', color: BLUE, emissive: BLUE }),
  new VBox(scene, { w: 56, h: 56, d: 56, x: 380, y: 800, z: 0, label: '9', color: BLUE, emissive: BLUE }),
];

// ---- 十位候选盒 0..8（初始暗色，label 常显）+ 十位徽章（×9 GOLD；d=7 为 ✗ RED，初始隐藏） ----
const tX = d => 320 + (d - 4) * 50;                       // 120..520
const tBox = Array.from({ length: 9 }, (_, d) =>
  new VBox(scene, { w: 44, h: 44, d: 44, x: tX(d), y: 700, z: 0, label: String(d), color: PALETTE.edge, emissive: PALETTE.edgeEmissive }));
const tBadge = Array.from({ length: 9 }, (_, d) => {
  const t = new VText(scene, { text: d === 7 ? '✗' : '×9', x: tX(d), y: 748, z: 10, color: d === 7 ? RED : GOLD, scale: 0.5 });
  t.sprite.visible = false;
  return t;
});

// ---- 个位候选盒 0..9 + 个位徽章（×1 GOLD；d=7 为 ✗ RED，初始隐藏） ----
const uX = d => 320 + (d - 4.5) * 46;                     // 113..527
const uBox = Array.from({ length: 10 }, (_, d) =>
  new VBox(scene, { w: 40, h: 40, d: 40, x: uX(d), y: 560, z: 0, label: String(d), color: PALETTE.edge, emissive: PALETTE.edgeEmissive }));
const uBadge = Array.from({ length: 10 }, (_, d) => {
  const t = new VText(scene, { text: d === 7 ? '✗' : '×1', x: uX(d), y: 606, z: 10, color: d === 7 ? RED : GOLD, scale: 0.45 });
  t.sprite.visible = false;
  return t;
});

// ---- 累计计数（常显）+ 答案盒 + 答案标注（答案盒/标注初始隐藏） ----
const countT = new VText(scene, { text: '累计 0', x: 470, y: 430, z: 10, color: GOLD, scale: 0.55 });
const ansBox = new VBox(scene, { w: 56, h: 56, d: 56, x: 320, y: 360, z: 0, label: '72', color: GOLD, emissive: GOLD });
ansBox.mesh.visible = false;
const ansT = new VText(scene, { text: '1..89 = 71', x: 470, y: 360, z: 10, color: GOLD, scale: 0.5 });
ansT.sprite.visible = false;

// ---- 十位累计序列（BigInt 核验硬编码，勿运行时计算） ----
const CNT = ['9', '18', '27', '36', '45', '54', '63'];
const ULEGAL = [0, 1, 2, 3, 4, 5, 6, 8, 9];               // 个位合法 9 枚（除 7）

// ---- 全复位（清空按钮与首帧共用；label 常显不动） ----
function resetAll() {
  capBox.forEach(c => c.setColor(BLUE, BLUE));
  tBox.forEach(b => b.setColor(PALETTE.edge, PALETTE.edgeEmissive));
  uBox.forEach(b => b.setColor(PALETTE.edge, PALETTE.edgeEmissive));
  tBadge.forEach(t => { t.sprite.visible = false; });
  uBadge.forEach(t => { t.sprite.visible = false; });
  countT.setText('累计 0');
  ansBox.mesh.visible = false; ansBox.setText('72'); ansBox.setColor(GOLD, GOLD);
  ansT.sprite.visible = false;
}

function* runDigitDP() {
  // F0 开场：复位 + 上限两盒亮 BLUE
  yield S(resetAll);
  yield S(() => { status.textContent = '问题：1..89 中有多少个数不含数字 7？暴力要数 89 次；数位 DP 按位递推，2 位 × 4 状态 = 8 步'; });
  yield W(1200);
  // F1 上限轻微 pulse
  yield S(() => {
    capBox[0].moveTo(280, 806, 0, 280); capBox[1].moveTo(380, 806, 0, 280);
    status.textContent = '上限 89 是两位：十位最高 8、个位最高 9；两位都不是 7，紧/松两条路径都要走';
  });
  yield W(300);
  yield S(() => { capBox[0].moveTo(280, 800, 0, 280); capBox[1].moveTo(380, 800, 0, 280); });
  yield W(600);
  // F2 十位行总览（短暂 CYAN 后回 edge）
  yield S(() => {
    tBox.forEach(b => b.setColor(CYAN, CYAN));
    status.textContent = '十位候选 0..8 逐位考察：非 7 的每位各配 9 个后选数（个位除 7 共 9 种），计数逐位累加';
  });
  yield W(450);
  yield S(() => { tBox.forEach(b => b.setColor(PALETTE.edge, PALETTE.edgeEmissive)); });
  yield W(550);
  // T1..T7 十位松分支 0..6：×9 徽章 + 累计 9→63
  for (let d = 0; d < 7; d++) {
    yield S(() => {
      tBox[d].setColor(CYAN, CYAN);
      tBadge[d].sprite.visible = true;
      countT.setText('累计 ' + CNT[d]);
      status.textContent = '十位 d=' + d + '：松分支（个位 0..9 自由），后选 9 种 → 累计 ' + CNT[d];
    });
    yield W(550);
  }
  // T8 十位 d=7：红叉跳过，countT 不变
  yield S(() => { tBadge[7].sprite.visible = true; status.textContent = '十位 d=7：含禁用数字 7，0 种后选，跳过 → 累计仍 63'; });
  yield W(700);
  // T9 十位 d=8：紧分支（个位上限仍 9），累计 72
  yield S(() => {
    tBox[8].setColor(GOLD, GOLD);
    tBadge[8].sprite.visible = true;
    countT.setText('累计 72');
    status.textContent = '十位 d=8：紧分支（个位上限仍 9，不受限），后选 9 种 → 累计 63 + 9 = 72';
  });
  yield W(800);
  // U1..U9 个位合法逐格：×1 徽章，countT 保持「累计 72」绝不重复累加
  for (const d of ULEGAL) {
    yield S(() => {
      uBox[d].setColor(GREEN, GREEN);
      uBadge[d].sprite.visible = true;
      status.textContent = '个位 d=' + d + '：合法，后选 1 种（空后缀）；个位 0..9 除 7 外共 9 种';
    });
    yield W(420);
  }
  // U10 个位 d=7：红叉跳过
  yield S(() => { uBadge[7].sprite.visible = true; status.textContent = '个位 d=7：含禁用数字 7，0 种后选，跳过'; });
  yield W(600);
  // U11 合法个位全绿定格
  yield S(() => { ULEGAL.forEach(d => uBox[d].setColor(GREEN, GREEN)); status.textContent = '个位 0..9 除 7 外 9 种合法：十位每枚 ×9 的 9 即由此而来'; });
  yield W(500);
  // E1 答案盒「72」+ 减 1
  yield S(() => {
    ansBox.mesh.visible = true;
    countT.setText('72 − 1 = 71');
    status.textContent = '累计 72 个含 0（十位 0 个位 0 的数即 0 本身）；区间从 1 开始 → 减 1';
  });
  yield W(800);
  // E2 答案「71」（setText 后重施 GOLD）+ ansT 显示
  yield S(() => {
    ansBox.setText('71'); ansBox.setColor(GOLD, GOLD);
    ansT.sprite.visible = true;
    status.textContent = '答案：1..89 中不含数字 7 的数 = 71';
  });
  yield W(1000);
  // E3 全绿定格收尾
  yield S(() => {
    ULEGAL.forEach(d => uBox[d].setColor(GREEN, GREEN));
    status.textContent = '复杂度 O(位数 × 状态)；区间 [L,R] = f(R) − f(L−1)，10¹⁸ 也只需 2 × 4 状态';
  });
  yield W(1500);
}

engine.queue(() => runDigitDP());
panel.addButton('清空', () => { engine.clear(); resetAll(); status.textContent = ''; });

scene.start(engine);
