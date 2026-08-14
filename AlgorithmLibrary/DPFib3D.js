// AlgorithmLibrary/DPFib3D.js — DP 斐波那契：n=7，2 行×8 列表（上排下标 0..7、下排值格），
// 自底向上逐格计算 F(2..7)，弧线引用 i-2/i-1 源格 + 金粒子沿弧飞行，结果 F(7)=13 金字落场（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, VNode, VTorus } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('DPFib3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GOLD = 0xfde047, BLUE = 0x60a5fa, CYAN = 0x67e8f9;
const status = panel.addStatus('就绪');

// ---- 数据/坐标/文案常量（全部硬编码，勿运行时拼数字；数值依据 /tmp/dpfib_research.md §2 BigInt 核验） ----
const FV = ['0', '1', '1', '2', '3', '5', '8', '13'];   // F(0..7)，长度 8 与坐标表一致
const INIT = '?';
const RESULT_TXT = 'F(7)=13';
const CELL_Y = 690, IDX_Y = 790, CTRL_Y = 560, ARC_Z = 10, RING_Z = 16;
const cellX = i => 40 + i * 72;                          // i=0..7 → 40..544
// 考察帧弧数据（i=2..7 各一行）：[arc0 源 x, arc0 控 x, 终点 x(=ring), arc1 控 x, arc1 源 x]
const ARC = [
  [40, 112, 184, 148, 112],
  [112, 184, 256, 220, 184],
  [184, 256, 328, 292, 256],
  [256, 328, 400, 364, 328],
  [328, 400, 472, 436, 400],
  [400, 472, 544, 508, 472],
];
const OPENING = 'DP 斐波那契：F(n)=F(n-1)+F(n-2)。建表 2 行 8 列：上排下标 0..7，下排值格；边界 F(0)=0、F(1)=1';
const EXAM = [
  '计算 F(2)：弧线引用 F(1)=1 与 F(0)=0，F(2)=F(1)+F(0)',
  '计算 F(3)：弧线引用 F(2)=1 与 F(1)=1，F(3)=F(2)+F(1)',
  '计算 F(4)：弧线引用 F(3)=2 与 F(2)=1，F(4)=F(3)+F(2)',
  '计算 F(5)：弧线引用 F(4)=3 与 F(3)=2，F(5)=F(4)+F(3)',
  '计算 F(6)：弧线引用 F(5)=5 与 F(4)=3，F(6)=F(5)+F(4)',
  '计算 F(7)：弧线引用 F(6)=8 与 F(5)=5，F(7)=F(6)+F(5)',
];
const WRITE = [
  'F(2)=1 → 写入格 2', 'F(3)=2 → 写入格 3', 'F(4)=3 → 写入格 4',
  'F(5)=5 → 写入格 5', 'F(6)=8 → 写入格 6', 'F(7)=13 → 写入格 7',
];
const FINAL = '完成：F(7)=13 ✓。自底向上每值只算一次：时间 O(n)、空间 O(n)；滚动两变量可优化到 O(1)';

const lerp = (a, b, p) => a + (b - a) * p;
const ease = p => p * p * (3 - 2 * p);

// ---- 值格 2 行×8 列下排（i=0..7，56×56×16；格 0/1 边界恒 GOLD，格 2..7 初始 '?' 半透明槽） ----
const valCell = FV.map((_, i) => {
  const isBound = i <= 1;
  const c = new VBox(scene, {
    w: 56, h: 56, d: 16, x: cellX(i), y: CELL_Y, z: 0,
    label: isBound ? FV[i] : INIT,
    color: isBound ? GOLD : PALETTE.edge, emissive: isBound ? GOLD : PALETTE.edgeEmissive,
  });
  c.mesh.material.transparent = true;                    // 透明先设，防黑方块
  c.mesh.material.opacity = isBound ? 1 : 0.35;
  if (c.label) c.label.material.color.setHex(isBound ? GOLD : PALETTE.textDim);
  return c;
});
const idxLabel = FV.map((_, i) => new VText(scene, { text: String(i), x: cellX(i), y: IDX_Y, z: 10, color: CYAN, scale: 0.45 }));

// ---- 当前计算格高亮环（初始隐藏，注册表补间 moveTo） ----
const focusRing = new VTorus(scene, { radius: 24, x: 40, y: CELL_Y, z: RING_Z, color: GOLD });
focusRing.mesh.visible = false;

// ---- 虚线弧池 ×2（arc0 CYAN i-2→i、arc1 BLUE i-1→i）+ 金粒子池 ×3（fxGroup 统一显隐） ----
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
const arcs = [mkArc(CYAN), mkArc(BLUE)];
arcs.forEach(a => fxGroup.add(a.line));
const setArc = (a, x0, y0, z0, x1, y1, z1, x2, y2, z2) => {
  a.v0.set(x0, y0, z0); a.v1.set(x1, y1, z1); a.v2.set(x2, y2, z2);
  a.geo.setFromPoints(a.curve.getPoints(24));            // 重建点列，不 new geometry
  a.line.computeLineDistances();
};
const parts = [0, 1, 2].map(() => {
  const m = new THREE.Mesh(new THREE.SphereGeometry(4, 8, 8), new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.9 }));
  fxGroup.add(m);
  return m;
});
const flyPts = [0, 1, 2].map(() => new THREE.Vector3());
const flyParticles = (curve, ms) => A(ms, p => { const e = ease(p); parts.forEach((v, i) => v.position.copy(curve.getPoint((e + i * 0.18) % 1, flyPts[i]))); });

// ---- 结果文本 'F(7)=13'（演示体，初始隐藏） ----
const resultText = new VText(scene, { text: RESULT_TXT, x: 320, y: 360, z: 20, color: GOLD, scale: 0.55 });
resultText.sprite.visible = false;

// ---- 工具：写入格 / 双弧发射 / 全表回闪 / 全复位 ----
const setEntry = (box, text) => {
  box.setText(text);                                     // setText 每次重算 sprite.scale
  if (box.label) {
    box.label.material.color.setHex(GOLD);               // 重施 GOLD 染色
    box.label.visible = true;                            // resetAll 隐藏过 label，须补回
  }
};
const fire = k => {                                      // k=0..5 对应 i=2..7
  const d = ARC[k];
  setArc(arcs[0], d[0], CELL_Y, ARC_Z, d[1], CTRL_Y, ARC_Z, d[2], CELL_Y, ARC_Z);
  setArc(arcs[1], d[4], CELL_Y, ARC_Z, d[3], CTRL_Y, ARC_Z, d[2], CELL_Y, ARC_Z);
  arcs[0].line.visible = true;
  arcs[1].line.visible = true;
  fxGroup.visible = true;
};
const pulseAll = ms => A(ms, p => { const s = 1 + 0.14 * Math.sin(p * Math.PI * 2); valCell.forEach(c => c.mesh.scale.setScalar(s)); });
function resetAll() {
  valCell.forEach((c, i) => {
    c.mesh.scale.setScalar(1);
    if (i <= 1) {
      c.setColor(GOLD, GOLD);
      c.mesh.material.opacity = 1;
      c.setText(FV[i]);
      if (c.label) { c.label.material.color.setHex(GOLD); c.label.visible = true; }
    } else {
      c.setColor(PALETTE.edge, PALETTE.edgeEmissive);
      c.mesh.material.opacity = 0.35;
      c.setText(INIT);
      if (c.label) { c.label.material.color.setHex(PALETTE.textDim); c.label.visible = true; }
    }
  });
  focusRing.mesh.visible = false;
  focusRing.mesh.position.set(40, CELL_Y, RING_Z);
  fxGroup.visible = false;
  resultText.sprite.visible = false;
}

function* runFib() {
  yield S(resetAll);
  yield S(() => { status.textContent = OPENING; });
  yield W(1500);
  // F2..F13：i=2..7 六轮「考察 → 写入」，每轮 950 + 550
  for (let k = 0; k < 6; k++) {
    yield S(() => {
      focusRing.mesh.visible = true;
      focusRing.moveTo(ARC[k][2], CELL_Y, RING_Z, 300);  // 注册表补间，随 W(250) 等待
      valCell[k].setColor(CYAN, CYAN);                   // 源 i-2 考察色
      valCell[k + 1].setColor(BLUE, BLUE);               // 源 i-1 考察色
      fire(k);
      status.textContent = EXAM[k];
    });
    yield W(250);
    yield flyParticles(arcs[0].curve, 550);
    yield W(150);
    yield S(() => {
      valCell[k].setColor(GOLD, GOLD);                   // 源格回金
      valCell[k + 1].setColor(GOLD, GOLD);
      valCell[k + 2].setColor(GOLD, GOLD);               // 写入格
      valCell[k + 2].mesh.material.opacity = 1;
      setEntry(valCell[k + 2], FV[k + 2]);
      fxGroup.visible = false;                           // 写入帧必须隐藏弧线，防残留
      status.textContent = WRITE[k];
    });
    yield W(550);
  }
  // F14 收尾：全表金 + 结果文本 + 全表回闪 + 复杂度
  yield S(() => {
    valCell.forEach(c => { c.setColor(GOLD, GOLD); c.mesh.material.opacity = 1; });
    resultText.sprite.visible = true;
    focusRing.mesh.visible = false;
  });
  yield pulseAll(700);
  yield S(() => { status.textContent = FINAL; });
  yield W(2000);
}

engine.queue(() => runFib());
panel.addButton('清空', () => { engine.clear(); resetAll(); status.textContent = ''; });

scene.start(engine);
