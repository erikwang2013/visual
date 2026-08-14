// AlgorithmLibrary/DPLCS3D.js — 最长公共子序列 LCS：7×8 DP 表逐格填表（相等→左上+1 对角 GREEN 弧，不等→max(上,左) CYAN 双弧），
// 回溯六步金色路径逐格收集匹配字符飞入收集槽，结果动态拼接入状态栏（function* 生成器驱动，不硬编码 LCS 常量）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, VTorus } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('DPLCS3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GOLD = 0xfde047, GREEN = 0x4ade80, BLUE = 0x60a5fa, CYAN = 0x67e8f9;
const status = panel.addStatus('就绪');

// ---- 数据：上串 7 字符（列）、左串 6 字符（行）；LCS 结果全程运行时收集，绝不硬编码 ----
const SA = 'ABCBDAB', B = 'BDCABA';
const dp = Array.from({ length: 7 }, () => new Array(8).fill(0));

const lerp = (a, b, p) => a + (b - a) * p;
const ease = p => p * p * (3 - 2 * p);
const colX = j => 161 + 52 * j;          // 格 x：161..525
const rowY = i => 830 - 46 * i;          // 格 y：830..554
const slotX = k => 320 + (k - 3) * 44;   // 收集槽 x：188..452
const cellOf = (i, j) => grid[i * 8 + j];

// ---- 56 格（7 行×8 列）：边界 i=0/j=0 初始即显 '0'，内容格 label 初始隐藏 ----
const grid = [];
for (let i = 0; i < 7; i++) {
  for (let j = 0; j < 8; j++) {
    const border = i === 0 || j === 0;
    const c = new VBox(scene, { w: 48, h: 40, d: 14, x: colX(j), y: rowY(i), z: 0, label: border ? '0' : undefined, color: BLUE, emissive: BLUE });
    grid.push(c);
  }
}

// ---- 列标签（上串 7）/ 行标签（左串 6），CYAN ----
const colLabels = [1, 2, 3, 4, 5, 6, 7].map(j => new VText(scene, { text: SA[j - 1], x: colX(j), y: 864, z: 0, color: CYAN, scale: 0.45 }));
const rowLabels = [1, 2, 3, 4, 5, 6].map(i => new VText(scene, { text: B[i - 1], x: 100, y: rowY(i), z: 0, color: CYAN, scale: 0.5 }));

// ---- 焦点环（定位当前格，可选元素） ----
const ring = new VTorus(scene, { radius: 26, x: colX(1), y: rowY(1), z: 10, color: PALETTE.highlight });
ring.mesh.visible = false;

// ---- 方向箭头 6 个（单字符 sprite，格内右下，初始隐藏） ----
const arrows = [0, 1, 2, 3, 4, 5].map(() => new VText(scene, { text: '↖', x: 0, y: 0, z: 18, color: CYAN, scale: 0.45 }));
arrows.forEach(a => a.sprite.visible = false);

// ---- 收集槽 7（半透明灰框）+ 槽字符用槽自带 label（GOLD） ----
const slotBox = [0, 1, 2, 3, 4, 5, 6].map(k => {
  const c = new VBox(scene, { w: 40, h: 40, d: 14, x: slotX(k), y: 500, z: 0, color: PALETTE.edge, emissive: PALETTE.edgeEmissive });
  c.mesh.material.transparent = true;   // 透明先设，否则 opacity 无效
  c.mesh.material.opacity = 0.2;
  return c;
});

// ---- 弧线池：arcDiag GREEN 对角（匹配）/ arcUp+arcLeft CYAN 双弧（不等），发射显式互斥 ----
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
const arcDiag = mkArc(GREEN), arcUp = mkArc(CYAN), arcLeft = mkArc(CYAN);
[arcDiag, arcUp, arcLeft].forEach(a => fxGroup.add(a.line));
const setArc = (a, x0, y0, x1, y1, cx, cy) => {
  a.v0.set(x0, y0, 0); a.v1.set(cx, cy, 10); a.v2.set(x1, y1, 0);
  a.geo.setFromPoints(a.curve.getPoints(24));
  a.line.computeLineDistances();
};
const fireDiag = (i, j) => {                 // 匹配：左上格 → 当前格对角弧
  setArc(arcDiag, colX(j - 1), rowY(i - 1), colX(j), rowY(i), (colX(j - 1) + colX(j)) / 2, (rowY(i - 1) + rowY(i)) / 2 + 30);
  arcDiag.line.visible = true; arcUp.line.visible = false; arcLeft.line.visible = false;
  fxGroup.visible = true;
};
const fireDual = (i, j) => {                 // 不等：上格→当前 + 左格→当前 双弧
  setArc(arcUp, colX(j), rowY(i - 1), colX(j), rowY(i), colX(j) + 30, (rowY(i - 1) + rowY(i)) / 2);
  setArc(arcLeft, colX(j - 1), rowY(i), colX(j), rowY(i), (colX(j - 1) + colX(j)) / 2, rowY(i) + 30);
  arcDiag.line.visible = false; arcUp.line.visible = true; arcLeft.line.visible = true;
  fxGroup.visible = true;
};

// ---- 回溯六步（坐标/方向/文案按设计 §3 F4 逐字；匹配字符运行时取自上串） ----
const PATH = [
  { i: 6, j: 7, dir: '↑', slot: 0, text: '步(6,7)：A vs B 不等，上 dp(5,7)=4 ≥ 左 dp(6,6)=4 → 走上，箭头↑' },
  { i: 5, j: 7, dir: '↖', slot: 1, text: "步(5,7)：B==B 匹配 → 收 'B' 飞入槽 1，箭头↖" },
  { i: 4, j: 6, dir: '↖', slot: 2, text: "步(4,6)：A==A 匹配 → 收 'A' 飞入槽 2，↖" },
  { i: 3, j: 5, dir: '↑', slot: 0, text: '步(3,5)：C vs D 不等，上 2=左 2 → 走上 ↑' },
  { i: 2, j: 5, dir: '↖', slot: 3, text: "步(2,5)：D==D 匹配 → 收 'D' 飞入槽 3，↖" },
  { i: 1, j: 4, dir: '↖', slot: 4, text: "步(1,4)：B==B 匹配 → 收 'B' 飞入槽 4，↖，至 (0,3) 结束" },
];

// ---- 运行时状态（resetAll 一并还原，保证重播干净） ----
const result = [];
let lastMatch = null;   // 上一匹配格（GREEN 瞬时，下一格前还原 BLUE）
let prevRow = 0;        // 上一高亮行标签

// ---- 全复位（清空按钮与生成器首帧共用；不做任何 new/销毁） ----
function resetAll() {
  for (let i = 0; i < 7; i++) {
    for (let j = 0; j < 8; j++) {
      const c = cellOf(i, j);
      c.setColor(BLUE, BLUE);
      c.mesh.scale.setScalar(1);
      if (i === 0 || j === 0) { c.setText('0'); if (c.label) c.label.visible = true; }
      else { if (c.label) { c.setText(''); c.label.visible = false; } }
    }
  }
  colLabels.forEach((t, j) => t.setText(SA[j], { color: CYAN }));
  rowLabels.forEach((t, i) => t.setText(B[i], { color: CYAN }));
  ring.mesh.visible = false;
  ring.mesh.position.set(colX(1), rowY(1), 10);
  fxGroup.visible = false;
  arcDiag.line.visible = false; arcUp.line.visible = false; arcLeft.line.visible = false;
  arrows.forEach(a => a.sprite.visible = false);
  slotBox.forEach(c => { if (c.label) { c.setText(''); c.label.visible = false; } c.mesh.material.opacity = 0.2; });
  result.length = 0;
  lastMatch = null;
  prevRow = 0;
}

function* runLCS() {
  // F1 开场
  yield S(resetAll);
  yield S(() => { status.textContent = 'LCS("' + SA + '","' + B + '")：上串 7 字符、左串 6 字符，求最长公共子序列。dp[i][j]=左串前 i 字符与上串前 j 字符的 LCS 长度，表 7 行×8 列，边界行/列全为 0'; });
  yield W(1500);
  // F2 逐行逐格填表（i=1..6 × j=1..7，dp 值运行时计算写入文案）
  for (let i = 1; i <= 6; i++) {
    yield S(() => {
      if (prevRow) rowLabels[prevRow - 1].setText(B[prevRow - 1], { color: CYAN });
      rowLabels[i - 1].setText(B[i - 1], { color: PALETTE.highlight });
      prevRow = i;
      ring.mesh.visible = true;
      ring.moveTo(colX(1), rowY(i), 10, 300);
    });
    yield W(350);
    for (let j = 1; j <= 7; j++) {
      const sa = SA[j - 1], b = B[i - 1];
      if (sa === b) {
        const v = dp[i - 1][j - 1] + 1;
        dp[i][j] = v;
        yield S(() => {
          if (lastMatch) { lastMatch.setColor(BLUE, BLUE); lastMatch = null; }
          const c = cellOf(i, j);
          c.setText(String(v)); if (c.label) c.label.visible = true;
          c.setColor(GREEN, GREEN);
          lastMatch = c;
          fireDiag(i, j);
          ring.moveTo(colX(j), rowY(i), 10, 240);
          status.textContent = '格(' + i + ',' + j + ')：' + sa + ' vs ' + b + ' → 相等 → dp(' + i + ',' + j + ')=左上' + dp[i - 1][j - 1] + '+1=' + v + '（对角弧）';
        });
        yield W(400);
      } else {
        const v = Math.max(dp[i - 1][j], dp[i][j - 1]);
        dp[i][j] = v;
        yield S(() => {
          if (lastMatch) { lastMatch.setColor(BLUE, BLUE); lastMatch = null; }
          cellOf(i, j).setText(String(v));
          fireDual(i, j);
          ring.moveTo(colX(j), rowY(i), 10, 240);
          status.textContent = '格(' + i + ',' + j + ')：A[j-1]=' + sa + ' vs B[i-1]=' + b + ' → 不等 → dp(' + i + ',' + j + ')=max(上' + dp[i - 1][j] + ',左' + dp[i][j - 1] + ')=' + v;
        });
        yield W(260);
      }
    }
  }
  // F3 填表完成定格 + 右下格脉冲
  yield S(() => {
    if (lastMatch) { lastMatch.setColor(BLUE, BLUE); lastMatch = null; }
    if (prevRow) { rowLabels[prevRow - 1].setText(B[prevRow - 1], { color: CYAN }); prevRow = 0; }
    ring.mesh.visible = false;
    fxGroup.visible = false;
    status.textContent = '填表完成：右下 dp(6,7)=4=LCS 长度。回溯：相等走左上↖收字符，不等走上/左较大者（上≥左走上）';
  });
  yield A(800, p => { cellOf(6, 7).mesh.scale.setScalar(1 + 0.14 * Math.sin(p * Math.PI * 2)); });
  // F4 回溯六步：染金 + 箭头；匹配步字符起跳飞入收集槽
  for (let s = 0; s < PATH.length; s++) {
    const st = PATH[s];
    yield S(() => {
      cellOf(st.i, st.j).setColor(GOLD, GOLD);
      arrows[s].setText(st.dir);
      arrows[s].sprite.position.set(colX(st.j) + 14, rowY(st.i) - 12, 18);
      arrows[s].sprite.visible = true;
      status.textContent = st.text;
    });
    yield W(200);
    if (st.slot > 0) {
      const k = st.slot - 1, ch = SA[st.j - 1];   // 匹配字符运行时取自上串，动态拼接结果
      result.push(ch);
      yield S(() => {
        const lb = slotBox[k];
        lb.setText(ch);
        lb.label.material.color.setHex(GOLD);
        lb.label.visible = true;
        lb.label.scale.multiplyScalar(0.8);
        lb.label.position.set(0, 90, 60);
        lb.mesh.material.opacity = 0.75;
      });
      yield A(600, p => {
        const e = ease(p), lb = slotBox[k].label;
        lb.position.y = lerp(90, 0, e);
        lb.position.z = lerp(60, 21, e);
      });
      yield W(200);
    }
  }
  // F5 收尾：路径格/槽字符保 GOLD，弧/箭头隐藏，结果入状态栏
  yield S(() => {
    fxGroup.visible = false;
    arrows.forEach(a => a.sprite.visible = false);
    const lcsStr = [...result].reverse().join('');   // 回溯自右下往左上收集，须反转才是正序 LCS
    status.textContent = '完成：LCS("' + SA + '","' + B + '")="' + lcsStr + '"，长度 ' + result.length + '；收集槽 ' + result.join('-') + '；时间复杂度 O(mn)=O(7×6)=O(42)';
  });
  yield W(1500);
}

engine.queue(() => runLCS());
panel.addButton('清空', () => { engine.clear(); resetAll(); status.textContent = ''; });

scene.start(engine);
