// AlgorithmLibrary/DPChange3D.js — 零钱兑换（DP）：币 1/3/4 凑 10，dp[r][c]=min(不放, 放) 逐格填表，
// 回溯金色路径 4+3+3，结尾对比贪心反例 4+4+1+1（function* 生成器驱动；数据与文案全部硬编码，勿运行时算 dp）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, VNode } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('DPChange3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GOLD = 0xfde047, YELLOW = 0xfacc15, BLUE = 0x60a5fa, CYAN = 0x67e8f9;
const status = panel.addStatus('就绪');

// ---- 坐标常量（设计 §2/§7） ----
const cellX = c => 64 + 48 * c;              // 格心 x：c=0→64 … c=10→544
const cellY = r => 470 - 48 * r;             // 格心 y：r=0→470 … r=3→326
const slotX = k => 320 + (k - 1) * 56;       // 槽 x：264/320/376
const COIN = { 1: 1, 2: 3, 3: 4 };           // r 行对应硬币面额

// ---- 静态演示体：列标签 / 行标签 / 硬币圆点（resetAll 不得隐藏） ----
const colH = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(c => new VText(scene, { text: String(c), x: cellX(c), y: 515, z: 10, color: PALETTE.text, scale: 0.42 }));
const rowL = ['1币', '3币', '4币'].map((t, r) => new VText(scene, { text: t, x: 20, y: cellY(r + 1), z: 10, color: PALETTE.text, scale: 0.42 }));
const coinDot = [1, 2, 3].map(r => new VNode(scene, { radius: 5, x: 36, y: cellY(r), z: 8, color: GOLD, emissive: GOLD }));

// ---- 表单元格 4×11=44（初始无 label）+ 硬币输出槽 3 ----
const cell = [0, 1, 2, 3].map(r => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(c =>
  new VBox(scene, { w: 40, h: 44, d: 12, x: cellX(c), y: cellY(r), z: 0, color: PALETTE.edge, emissive: PALETTE.edgeEmissive })));
const coinSlot = [0, 1, 2].map(k => new VBox(scene, { w: 44, h: 40, d: 12, x: slotX(k), y: 620, z: 0, color: PALETTE.edge, emissive: PALETTE.edgeEmissive }));

// ---- 虚线弧池 ×2（arcs[0] BLUE 不放/上弧，arcs[1] CYAN 放/左弧），fxGroup 统一显隐 ----
const fxGroup = new THREE.Group();
fxGroup.visible = false;
scene.add(fxGroup);
const mkArc = color => {
  const v0 = new THREE.Vector3(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
  const curve = new THREE.QuadraticBezierCurve3(v0, v1, v2);
  const geo = new THREE.BufferGeometry();
  const line = new THREE.Line(geo, new THREE.LineDashedMaterial({ color, dashSize: 6, gapSize: 4, transparent: true, opacity: 0.9 }));
  return { v0, v1, v2, curve, geo, line };
};
const arcs = [mkArc(BLUE), mkArc(CYAN)];
arcs.forEach(a => fxGroup.add(a.line));
const setArc = (a, x0, y0, z0, x1, y1, z1, x2, y2, z2) => {
  a.v0.set(x0, y0, z0); a.v1.set(x1, y1, z1); a.v2.set(x2, y2, z2);
  a.geo.setFromPoints(a.curve.getPoints(24));
  a.line.computeLineDistances();
};
// 上弧：当前格 → 上行格 dp[r-1][c]；左弧：当前格 → dp[r][c-coin]（v1.y 必须 = cellY(r)-16，r=3 行最低 310）
const setUpArc = (r, c) => { const cx = cellX(c), cy = cellY(r); setArc(arcs[0], cx, cy, 24, cx, cy - 16, 40, cx, cy + 48, 24); };
const setLeftArc = (r, c, coin) => { const cx = cellX(c), cy = cellY(r), lx = cellX(c - coin); setArc(arcs[1], cx, cy, 24, (cx + lx) / 2, cy - 16, 40, lx, cy, 24); };

// ---- 填表数据（60 格帧，文案逐字取自设计 §3；v=格内数值，col=胜出色：YELLOW 放更优/BLUE 不放更优） ----
const DATA = [
  [1, 1, '1', YELLOW, '填 dp[1][1]：不放 = 上方 dp[0][1] = ∞；放 1 分 = dp[1][0] + 1 = 1', 'dp[1][1] = min(∞, 1) = 1，放更优'],
  [1, 2, '2', YELLOW, '填 dp[1][2]：不放 = dp[0][2] = ∞；放 1 分 = dp[1][1] + 1 = 2', 'dp[1][2] = min(∞, 2) = 2，放更优'],
  [1, 3, '3', YELLOW, '填 dp[1][3]：不放 = dp[0][3] = ∞；放 1 分 = dp[1][2] + 1 = 3', 'dp[1][3] = min(∞, 3) = 3，放更优'],
  [1, 4, '4', YELLOW, '填 dp[1][4]：不放 = dp[0][4] = ∞；放 1 分 = dp[1][3] + 1 = 4', 'dp[1][4] = min(∞, 4) = 4，放更优'],
  [1, 5, '5', YELLOW, '填 dp[1][5]：不放 = dp[0][5] = ∞；放 1 分 = dp[1][4] + 1 = 5', 'dp[1][5] = min(∞, 5) = 5，放更优'],
  [1, 6, '6', YELLOW, '填 dp[1][6]：不放 = dp[0][6] = ∞；放 1 分 = dp[1][5] + 1 = 6', 'dp[1][6] = min(∞, 6) = 6，放更优'],
  [1, 7, '7', YELLOW, '填 dp[1][7]：不放 = dp[0][7] = ∞；放 1 分 = dp[1][6] + 1 = 7', 'dp[1][7] = min(∞, 7) = 7，放更优'],
  [1, 8, '8', YELLOW, '填 dp[1][8]：不放 = dp[0][8] = ∞；放 1 分 = dp[1][7] + 1 = 8', 'dp[1][8] = min(∞, 8) = 8，放更优'],
  [1, 9, '9', YELLOW, '填 dp[1][9]：不放 = dp[0][9] = ∞；放 1 分 = dp[1][8] + 1 = 9', 'dp[1][9] = min(∞, 9) = 9，放更优'],
  [1, 10, '10', YELLOW, '填 dp[1][10]：不放 = dp[0][10] = ∞；放 1 分 = dp[1][9] + 1 = 10', 'dp[1][10] = min(∞, 10) = 10，放更优'],
  [2, 1, '1', BLUE, '填 dp[2][1]：不放 = dp[1][1] = 1；放 3 分放不下（1 < 3）', 'dp[2][1] = 1，不放更优'],
  [2, 2, '2', BLUE, '填 dp[2][2]：不放 = dp[1][2] = 2；放 3 分放不下（2 < 3）', 'dp[2][2] = 2，不放更优'],
  [2, 3, '1', YELLOW, '填 dp[2][3]：不放 = dp[1][3] = 3；放 3 分 = dp[2][0] + 1 = 1', 'dp[2][3] = min(3, 1) = 1，放更优'],
  [2, 4, '2', YELLOW, '填 dp[2][4]：不放 = dp[1][4] = 4；放 3 分 = dp[2][1] + 1 = 2', 'dp[2][4] = min(4, 2) = 2，放更优'],
  [2, 5, '3', YELLOW, '填 dp[2][5]：不放 = dp[1][5] = 5；放 3 分 = dp[2][2] + 1 = 3', 'dp[2][5] = min(5, 3) = 3，放更优'],
  [2, 6, '2', YELLOW, '填 dp[2][6]：不放 = dp[1][6] = 6；放 3 分 = dp[2][3] + 1 = 2', 'dp[2][6] = min(6, 2) = 2，放更优'],
  [2, 7, '3', YELLOW, '填 dp[2][7]：不放 = dp[1][7] = 7；放 3 分 = dp[2][4] + 1 = 3', 'dp[2][7] = min(7, 3) = 3，放更优'],
  [2, 8, '4', YELLOW, '填 dp[2][8]：不放 = dp[1][8] = 8；放 3 分 = dp[2][5] + 1 = 4', 'dp[2][8] = min(8, 4) = 4，放更优'],
  [2, 9, '3', YELLOW, '填 dp[2][9]：不放 = dp[1][9] = 9；放 3 分 = dp[2][6] + 1 = 3', 'dp[2][9] = min(9, 3) = 3，放更优'],
  [2, 10, '4', YELLOW, '填 dp[2][10]：不放 = dp[1][10] = 10；放 3 分 = dp[2][7] + 1 = 4', 'dp[2][10] = min(10, 4) = 4，放更优'],
  [3, 1, '1', BLUE, '填 dp[3][1]：不放 = dp[2][1] = 1；放 4 分放不下（1 < 4）', 'dp[3][1] = 1，不放更优'],
  [3, 2, '2', BLUE, '填 dp[3][2]：不放 = dp[2][2] = 2；放 4 分放不下（2 < 4）', 'dp[3][2] = 2，不放更优'],
  [3, 3, '1', BLUE, '填 dp[3][3]：不放 = dp[2][3] = 1；放 4 分放不下（3 < 4）', 'dp[3][3] = 1，不放更优'],
  [3, 4, '1', YELLOW, '填 dp[3][4]：不放 = dp[2][4] = 2；放 4 分 = dp[3][0] + 1 = 1', 'dp[3][4] = min(2, 1) = 1，放更优'],
  [3, 5, '2', YELLOW, '填 dp[3][5]：不放 = dp[2][5] = 3；放 4 分 = dp[3][1] + 1 = 2', 'dp[3][5] = min(3, 2) = 2，放更优'],
  [3, 6, '2', BLUE, '填 dp[3][6]：不放 = dp[2][6] = 2；放 4 分 = dp[3][2] + 1 = 3', 'dp[3][6] = min(2, 3) = 2，不放更优'],
  [3, 7, '2', YELLOW, '填 dp[3][7]：不放 = dp[2][7] = 3；放 4 分 = dp[3][3] + 1 = 2', 'dp[3][7] = min(3, 2) = 2，放更优'],
  [3, 8, '2', YELLOW, '填 dp[3][8]：不放 = dp[2][8] = 4；放 4 分 = dp[3][4] + 1 = 2', 'dp[3][8] = min(4, 2) = 2，放更优'],
  [3, 9, '3', BLUE, '填 dp[3][9]：不放 = dp[2][9] = 3；放 4 分 = dp[3][5] + 1 = 3', 'dp[3][9] = min(3, 3) = 3，不放更优（取上行）'],
  [3, 10, '3', YELLOW, '填 dp[3][10]：不放 = dp[2][10] = 4；放 4 分 = dp[3][6] + 1 = 3', 'dp[3][10] = min(4, 3) = 3，放更优'],
];

// ---- 格内写入：setText 重建 sprite 后重施白字 + scale + visible（Brotli setEntry 教训） ----
const setEntry = (box, text, s, color = 0xffffff) => {
  box.setText(text);
  if (box.label) {
    box.label.material.color.setHex(color);
    box.label.scale.multiplyScalar(s);
    box.label.visible = true;
  }
};

// ---- 全复位（清空按钮与生成器首帧共用；不碰 status / colH / rowL / coinDot） ----
function resetAll() {
  cell.forEach(row => row.forEach(b => { b.setColor(PALETTE.edge, PALETTE.edgeEmissive); if (b.label) b.label.visible = false; b.mesh.scale.setScalar(1); b.tweenPos = null; }));
  setArc(arcs[0], 112, 470, 24, 112, 454, 40, 112, 422, 24);
  setArc(arcs[1], 112, 470, 24, 112, 454, 40, 112, 422, 24);
  arcs.forEach(a => a.line.visible = true);
  fxGroup.visible = false;
  coinSlot.forEach(s => { s.setColor(PALETTE.edge, PALETTE.edgeEmissive); if (s.label) s.label.visible = false; s.mesh.scale.setScalar(1); });
}

// ---- 单格 A/B 两帧（独立生成器函数，r/c 走参数闭包，规避循环变量陷阱） ----
function* cellFrames(d) {
  const r = d[0], c = d[1], coin = COIN[r];
  yield S(() => {
    cell[r][c].setColor(CYAN, CYAN);
    setUpArc(r, c);
    arcs[0].line.visible = true;
    if (c >= coin) { setLeftArc(r, c, coin); arcs[1].line.visible = true; }   // 放不下：只显上弧不画左弧
    else arcs[1].line.visible = false;
    fxGroup.visible = true;
    status.textContent = d[4];
  });
  yield W(120);
  yield S(() => {
    cell[r][c].setColor(d[3], d[3]);
    setEntry(cell[r][c], d[2], 0.42);
    fxGroup.visible = false;
    status.textContent = d[5];
  });
  yield W(80);
}

function* dpGen() {
  yield S(resetAll);
  // O1/O2 开场
  yield S(() => { status.textContent = '零钱兑换：硬币面额 1、3、4 分各无限枚，凑出 10 分最少几枚？用动态规划逐格填表'; });
  yield W(900);
  yield S(() => { status.textContent = '建表：行 = 前 r 种币（0~3），列 = 金额 0~10；dp[r][c] = 用前 r 种币凑 c 分的最少枚数'; });
  yield W(700);
  // F1 边界首行（c=0 '0'，c=1..10 '∞' 白字）/ F2 边界首列
  yield S(() => { for (let c = 0; c <= 10; c++) setEntry(cell[0][c], c === 0 ? '0' : '∞', 0.42); status.textContent = '边界首行 dp[0][c]：0 种币凑不出正金额 → 全为 ∞；dp[0][0] = 0'; });
  yield W(600);
  yield S(() => { for (let r = 1; r <= 3; r++) setEntry(cell[r][0], '0', 0.42); status.textContent = '边界首列 dp[r][0] = 0：凑 0 分不用任何硬币'; });
  yield W(600);
  // 填表 30 格 × 2 帧
  for (const d of DATA) yield* cellFrames(d);
  // B1..B5 回溯（路径格 GOLD，槽按序点亮）
  yield S(() => { cell[3][10].setColor(GOLD, GOLD); setEntry(coinSlot[0], '4', 0.5, GOLD); status.textContent = '回溯：从 dp[3][10] = 3 出发。用一枚 4 分硬币 → 左移到金额 10 − 4 = 6'; });
  yield W(600);
  yield S(() => { cell[3][6].setColor(GOLD, GOLD); status.textContent = 'dp[3][6] = dp[2][6] = 2，相等 → 此格未用 4 分，上行到 dp[2][6]'; });
  yield W(600);
  yield S(() => { cell[2][6].setColor(GOLD, GOLD); setEntry(coinSlot[1], '3', 0.5, GOLD); status.textContent = 'dp[2][6] = 2：用一枚 3 分硬币 → 左移到金额 6 − 3 = 3'; });
  yield W(600);
  yield S(() => { cell[2][3].setColor(GOLD, GOLD); setEntry(coinSlot[2], '3', 0.5, GOLD); status.textContent = 'dp[2][3] = 1：再用一枚 3 分硬币 → 左移到金额 3 − 3 = 0'; });
  yield W(600);
  yield S(() => { status.textContent = '回溯完成：10 = 4 + 3 + 3，共 3 枚（路径格金色高亮）'; });
  yield W(600);
  // G1..G3 贪心反例 + 收尾
  yield S(() => { status.textContent = '贪心反例：优先取大额 → 10 取 4 + 4 剩 2 → 4 + 4 + 1 + 1 = 4 枚'; });
  yield W(900);
  yield S(() => { status.textContent = '最优 dp[3][10] = 3 枚（4 + 3 + 3）< 贪心 4 枚：贪心并非最优，动态规划胜出'; });
  yield W(1100);
  yield S(() => { status.textContent = '复杂度 O(币种数 × 金额) = O(3 × 10)，空间可滚动数组优化为 O(金额)；演示完成'; });
  yield W(1600);
}

engine.queue(() => dpGen());
panel.addButton('清空', () => { engine.clear(); resetAll(); status.textContent = ''; });

scene.start(engine);
