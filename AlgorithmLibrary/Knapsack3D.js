// AlgorithmLibrary/Knapsack3D.js — 0/1 背包 DP：物品盒一行 + 容量盒 + DP 表逐格填（不含 vs 含两路弧线），
// 回溯 (4,8)→(3,3)→(2,3)→(1,0)，选中物品橙色上浮入结果槽（function* 生成器驱动，坐标/文案依 /tmp/knapsack_design.md）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Knapsack3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GOLD = 0xfde047, GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x60a5fa, CYAN = 0x67e8f9, ORANGE = 0xfb923c;
const status = panel.addStatus('就绪');

// ---- 数据（全部硬编码，勿运行时计算 dp；数值依设计 §3 帧表） ----
const W_ = [2, 3, 4, 5], V_ = [3, 4, 5, 6];
const BOX_X = [160, 270, 390, 510];
const cellX = c => 128 + c * 56;
const cellY = r => 690 - r * 44;
// 每格 C1 文案 / 格值 / 模式：t=含更优 s=不含更优 tie=平局 i=放不下
const MSG = {
  '1,1': 'dp[1][1]：w2 大于容量 1，放不下，只能不含=dp[0][1]=0',
  '1,2': 'dp[1][2]：不含=dp[0][2]=0，含=dp[0][0]+3=0+3=3',
  '1,3': 'dp[1][3]：不含=dp[0][3]=0，含=dp[0][1]+3=0+3=3',
  '1,4': 'dp[1][4]：不含=dp[0][4]=0，含=dp[0][2]+3=0+3=3',
  '1,5': 'dp[1][5]：不含=dp[0][5]=0，含=dp[0][3]+3=0+3=3',
  '1,6': 'dp[1][6]：不含=dp[0][6]=0，含=dp[0][4]+3=0+3=3',
  '1,7': 'dp[1][7]：不含=dp[0][7]=0，含=dp[0][5]+3=0+3=3',
  '1,8': 'dp[1][8]：不含=dp[0][8]=0，含=dp[0][6]+3=0+3=3',
  '2,1': 'dp[2][1]：w3 大于容量 1，放不下，只能不含=dp[1][1]=0',
  '2,2': 'dp[2][2]：w3 大于容量 2，放不下，只能不含=dp[1][2]=3',
  '2,3': 'dp[2][3]：不含=dp[1][3]=3，含=dp[1][0]+4=0+4=4',
  '2,4': 'dp[2][4]：不含=dp[1][4]=3，含=dp[1][1]+4=0+4=4',
  '2,5': 'dp[2][5]：不含=dp[1][5]=3，含=dp[1][2]+4=3+4=7',
  '2,6': 'dp[2][6]：不含=dp[1][6]=3，含=dp[1][3]+4=3+4=7',
  '2,7': 'dp[2][7]：不含=dp[1][7]=3，含=dp[1][4]+4=3+4=7',
  '2,8': 'dp[2][8]：不含=dp[1][8]=3，含=dp[1][5]+4=3+4=7',
  '3,1': 'dp[3][1]：w4 大于容量 1，放不下，只能不含=dp[2][1]=0',
  '3,2': 'dp[3][2]：w4 大于容量 2，放不下，只能不含=dp[2][2]=3',
  '3,3': 'dp[3][3]：w4 大于容量 3，放不下，只能不含=dp[2][3]=4',
  '3,4': 'dp[3][4]：不含=dp[2][4]=4，含=dp[2][0]+5=0+5=5',
  '3,5': 'dp[3][5]：不含=dp[2][5]=7，含=dp[2][1]+5=0+5=5',
  '3,6': 'dp[3][6]：不含=dp[2][6]=7，含=dp[2][2]+5=3+5=8',
  '3,7': 'dp[3][7]：不含=dp[2][7]=7，含=dp[2][3]+5=4+5=9',
  '3,8': 'dp[3][8]：不含=dp[2][8]=7，含=dp[2][4]+5=4+5=9',
  '4,1': 'dp[4][1]：w5 大于容量 1，放不下，只能不含=dp[3][1]=0',
  '4,2': 'dp[4][2]：w5 大于容量 2，放不下，只能不含=dp[3][2]=3',
  '4,3': 'dp[4][3]：w5 大于容量 3，放不下，只能不含=dp[3][3]=4',
  '4,4': 'dp[4][4]：w5 大于容量 4，放不下，只能不含=dp[3][4]=5',
  '4,5': 'dp[4][5]：不含=dp[3][5]=7，含=dp[3][0]+6=0+6=6',
  '4,6': 'dp[4][6]：不含=dp[3][6]=8，含=dp[3][1]+6=0+6=6',
  '4,7': 'dp[4][7]：不含=dp[3][7]=9，含=dp[3][2]+6=3+6=9，两路相同取 9',
  '4,8': 'dp[4][8]：不含=dp[3][8]=9，含=dp[3][3]+6=4+6=10',
};
const VAL = { // 每格最终值（r1..r4 × c1..c8）
  '1,1': 0, '1,2': 3, '1,3': 3, '1,4': 3, '1,5': 3, '1,6': 3, '1,7': 3, '1,8': 3,
  '2,1': 0, '2,2': 3, '2,3': 4, '2,4': 4, '2,5': 7, '2,6': 7, '2,7': 7, '2,8': 7,
  '3,1': 0, '3,2': 3, '3,3': 4, '3,4': 5, '3,5': 7, '3,6': 8, '3,7': 9, '3,8': 9,
  '4,1': 0, '4,2': 3, '4,3': 4, '4,4': 5, '4,5': 7, '4,6': 8, '4,7': 9, '4,8': 10,
};
const MODE = {
  '1,1': 'i', '1,2': 't', '1,3': 't', '1,4': 't', '1,5': 't', '1,6': 't', '1,7': 't', '1,8': 't',
  '2,1': 'i', '2,2': 'i', '2,3': 't', '2,4': 't', '2,5': 't', '2,6': 't', '2,7': 't', '2,8': 't',
  '3,1': 'i', '3,2': 'i', '3,3': 'i', '3,4': 't', '3,5': 's', '3,6': 't', '3,7': 't', '3,8': 't',
  '4,1': 'i', '4,2': 'i', '4,3': 'i', '4,4': 'i', '4,5': 's', '4,6': 's', '4,7': 'tie', '4,8': 't',
};

// ---- E1 物品盒（label 内嵌 w2..w5）+ E2 价值文本 v3..v6 ----
const boxes = W_.map((w, i) => new VBox(scene, { w: 56, h: 56, d: 24, x: BOX_X[i], y: 800, z: 0, label: 'w' + w, color: BLUE, emissive: BLUE }));
boxes.forEach(b => { b.label.scale.multiplyScalar(0.7); });
const boxVal = V_.map((v, i) => new VText(scene, { text: 'v' + v, x: BOX_X[i], y: 762, z: 0, color: PALETTE.text, scale: 0.4 }));

// ---- E3 容量盒（C=8→C=3→C=0，轴右端） ----
const capBox = new VBox(scene, { w: 72, h: 72, d: 28, x: 600, y: 800, z: 0, label: 'C=8', color: ORANGE, emissive: ORANGE });
capBox.label.scale.multiplyScalar(0.4);

// ---- E4 容量刻度 0..8 + E5 行头 i0..i4 ----
for (let c = 0; c <= 8; c++) new VText(scene, { text: String(c), x: cellX(c), y: 734, z: 0, color: PALETTE.textDim, scale: 0.38 });
for (let r = 0; r <= 4; r++) new VText(scene, { text: 'i' + r, x: 56, y: cellY(r), z: 0, color: PALETTE.textDim, scale: 0.38 });

// ---- E6 DP 表 45 格：行 0 灰格 '0'；其余 36 格暗边、label 隐藏 ----
const cells = [];
for (let r = 0; r <= 4; r++) {
  cells[r] = [];
  for (let c = 0; c <= 8; c++) {
    const isRow0 = r === 0;
    const cell = new VBox(scene, { w: 50, h: 40, d: 14, x: cellX(c), y: cellY(r), z: 0, label: isRow0 ? '0' : undefined, color: PALETTE.edge, emissive: PALETTE.edgeEmissive });
    cell.mesh.material.transparent = true;
    cell.mesh.material.opacity = isRow0 ? 0.55 : 0.35;
    cells[r][c] = cell;
  }
}

// ---- E7 结果槽托盘 + E8 mini 格（选中显示 i2/i4） ----
const tray = new VBox(scene, { w: 560, h: 64, d: 10, x: 320, y: 400, z: 0, color: PALETTE.edge, emissive: PALETTE.edgeEmissive });
tray.mesh.material.transparent = true;
tray.mesh.material.opacity = 0.12;
const mini = BOX_X.map(x => {
  const m = new VBox(scene, { w: 40, h: 40, d: 12, x, y: 400, z: 0, color: PALETTE.edge, emissive: PALETTE.edgeEmissive });
  m.mesh.material.transparent = true;
  m.mesh.material.opacity = 0.35;
  return m;
});

// ---- E9 弧线池 ×3（CYAN 不含 / ORANGE 含 / GOLD 回溯）+ 3 金粒子（fxGroup 统一显隐） ----
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
const arcs = [mkArc(CYAN), mkArc(ORANGE), mkArc(GOLD)];
arcs.forEach(a => fxGroup.add(a.line));
const setArc = (a, x0, y0, x1, y1) => {
  a.v0.set(x0, y0, 18); a.v2.set(x1, y1, 18);
  a.v1.set((x0 + x1) / 2, (y0 + y1) / 2 + 16, 18);
  a.geo.setFromPoints(a.curve.getPoints(24));
  a.line.computeLineDistances();
};
const parts = [0, 1, 2].map(() => {
  const m = new THREE.Mesh(new THREE.SphereGeometry(4, 8, 8), new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.9 }));
  fxGroup.add(m);
  return m;
});
const flyPts = [0, 1, 2].map(() => new THREE.Vector3());
const flyParticles = (curves, ms) => A(ms, p => {
  const e = ease(p);
  curves.forEach((cv, i) => { cv.getPoint((e + i * 0.18) % 1, flyPts[i]); parts[i].position.set(flyPts[i].x, flyPts[i].y, 20); });
});
const lerp = (a, b, p) => a + (b - a) * p;
const ease = p => p * p * (3 - 2 * p);

// ---- 工具：mini 显值 / 弧发射（先隐藏全组防串显）/ 格显数 ----
const setMini = (m, text) => {
  m.setText(text);
  m.label.visible = true;
  m.label.scale.multiplyScalar(0.36);
  m.setColor(ORANGE, ORANGE);
};
const fireArc = (k, x0, y0, x1, y1) => {
  fxGroup.visible = false;
  arcs.forEach((a, i) => { a.line.visible = i === k; });
  setArc(arcs[k], x0, y0, x1, y1);
  fxGroup.visible = true;
};
const setCellVal = (r, c, v, col) => {
  cells[r][c].setText(String(v));
  cells[r][c].label.scale.multiplyScalar(0.5);
  cells[r][c].setColor(col, col);
};

// ---- 全复位（清空按钮与生成器首帧共用；设计 §4 全部 9 项） ----
function resetAll() {
  boxes.forEach((b, i) => { b.moveTo(BOX_X[i], 800, 0, 300); b.setColor(BLUE, BLUE); b.mesh.scale.setScalar(1); });
  boxVal.forEach((t, i) => t.moveTo(BOX_X[i], 762, 0, 300));
  capBox.setText('C=8');
  capBox.setColor(ORANGE, ORANGE);
  for (let r = 1; r <= 4; r++) for (let c = 0; c <= 8; c++) { if (cells[r][c].label) cells[r][c].label.visible = false; cells[r][c].setColor(PALETTE.edge, PALETTE.edgeEmissive); }
  for (let c = 0; c <= 8; c++) { cells[0][c].setText('0'); cells[0][c].setColor(PALETTE.edge, PALETTE.edgeEmissive); }
  mini.forEach(m => { if (m.label) m.label.visible = false; m.setColor(PALETTE.edge, PALETTE.edgeEmissive); });
  fxGroup.visible = false;
  arcs.forEach(a => setArc(a, 0, 0, 0, 0));
  parts.forEach(p => p.position.set(0, 0, 0));
  status.textContent = '';
}

function* runKnapsack() {
  yield S(resetAll);
  yield S(() => { status.textContent = '0/1 背包：4 件物品 w2v3、w3v4、w4v5、w5v6，背包容量 8，每件只能取 0/1 次，求最大价值'; });
  yield W(1500);
  yield S(() => { status.textContent = '第 0 行全 0：空背包价值为 0'; });
  yield W(800);
  for (let r = 1; r <= 4; r++) {
    const w = W_[r - 1], v = V_[r - 1];
    yield S(() => {
      boxes.forEach(b => b.setColor(BLUE, BLUE));
      boxes[r - 1].setColor(YELLOW, YELLOW);
      status.textContent = '第 ' + r + ' 行：物品' + r + ' 重量 ' + w + ' 价值 ' + v + '，逐格递推 dp[r][c]=max(不含, 含)';
    });
    yield W(500);
    for (let c = 1; c <= 8; c++) {
      const key = r + ',' + c, val = VAL[key], mode = MODE[key];
      const hasTake = c >= w;
      // C1：当前格 CYAN；c≥w 时 ORANGE 弧 (r-1,c-w)→(r,c) 与 CYAN 弧 (r-1,c)→(r,c) 同显；不足格只显 CYAN 弧
      yield S(() => {
        fxGroup.visible = false;
        cells[r][c].setColor(CYAN, CYAN);
        arcs[0].line.visible = true;
        setArc(arcs[0], cellX(c), cellY(r - 1), cellX(c), cellY(r));
        arcs[1].line.visible = hasTake;
        if (hasTake) setArc(arcs[1], cellX(c - w), cellY(r - 1), cellX(c), cellY(r));
        arcs[2].line.visible = false;
        fxGroup.visible = true;
        status.textContent = MSG[key];
      });
      yield flyParticles(hasTake ? [arcs[0].curve, arcs[1].curve, arcs[0].curve] : [arcs[0].curve, arcs[0].curve, arcs[0].curve], 450);
      // C2：弧隐藏；填值；take>skip→ORANGE 否则 BLUE（平局归 BLUE）
      yield S(() => {
        fxGroup.visible = false;
        setCellVal(r, c, val, mode === 't' ? ORANGE : BLUE);
        status.textContent = '→ 取 max = ' + val + (mode === 't' ? '（含更优）' : mode === 'tie' ? '（两路相同）' : '（不含更优）');
      });
      yield W(300);
    }
  }
  // B1：回溯起点 (4,8)
  yield S(() => { cells[4][8].setColor(GOLD, GOLD); status.textContent = '回溯：从 dp[4][8]=10 倒推，10≠dp[3][8]=9 → 选物品4（w5v6），容量 8−5=3'; });
  yield W(700);
  // B2：物品4 上浮橙色 + mini4 'i4' + 容量 C=3 + GOLD 弧 (4,8)→(3,3)
  yield S(() => {
    boxes[3].moveTo(BOX_X[3], 846, 0, 500); boxes[3].setColor(ORANGE, ORANGE);
    boxVal[3].moveTo(BOX_X[3], 808, 0, 500);
    setMini(mini[3], 'i4');
    capBox.setText('C=3');
    capBox.setColor(ORANGE, ORANGE);
    fireArc(2, cellX(8), cellY(4), cellX(3), cellY(3));
  });
  yield flyParticles([arcs[2].curve, arcs[2].curve, arcs[2].curve], 500);
  yield W(300);
  // B3：格(3,3) GOLD + GOLD 弧 (3,3)→(2,3)，未选行上移
  yield S(() => {
    cells[3][3].setColor(GOLD, GOLD);
    fireArc(2, cellX(3), cellY(3), cellX(3), cellY(2));
    status.textContent = 'dp[3][3]=4=dp[2][3]=4 → 物品3 未选，行上移';
  });
  yield flyParticles([arcs[2].curve, arcs[2].curve, arcs[2].curve], 450);
  yield W(300);
  // B4：格(2,3) GOLD，选中物品2
  yield S(() => { fxGroup.visible = false; cells[2][3].setColor(GOLD, GOLD); status.textContent = 'dp[2][3]=4≠dp[1][3]=3 → 选物品2（w3v4），容量 3−3=0'; });
  yield A(450, () => {});
  yield W(300);
  // B5：物品2 上浮橙色 + mini2 'i2' + 容量 C=0 + GOLD 弧 (2,3)→(1,0)
  yield S(() => {
    boxes[1].moveTo(BOX_X[1], 846, 0, 500); boxes[1].setColor(ORANGE, ORANGE);
    boxVal[1].moveTo(BOX_X[1], 808, 0, 500);
    setMini(mini[1], 'i2');
    capBox.setText('C=0');
    capBox.setColor(ORANGE, ORANGE);
    fireArc(2, cellX(3), cellY(2), cellX(0), cellY(1));
  });
  yield flyParticles([arcs[2].curve, arcs[2].curve, arcs[2].curve], 500);
  yield W(300);
  // B6：终点 (1,0) 容量清零
  yield S(() => { cells[1][0].setColor(GOLD, GOLD); status.textContent = '容量清零：背包总重 3+5=8=容量，总价值 4+6=10'; });
  yield W(900);
  // B7：收尾
  yield S(() => { status.textContent = '完成：最大价值 10（物品2+物品4），状态数 4×8=32，时间复杂度 O(nC)、空间 O(nC）'; });
  yield W(1800);
}

engine.queue(() => runKnapsack());
panel.addButton('清空', () => { engine.clear(); resetAll(); status.textContent = ''; });

scene.start(engine);
