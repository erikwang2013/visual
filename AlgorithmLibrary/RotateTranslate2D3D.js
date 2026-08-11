// AlgorithmLibrary/RotateTranslate2D3D.js — 2D 旋转+平移：绿色三角先绕 z 轴旋转 45°，再平移 (60, 30) —— 分步 A() 动画 + 3x3 复合矩阵 T·R 实时更新（function* 生成器驱动，矩阵元素运行时计算）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Geometry3D } from '../3D/modes/Geometry3D.js';
import { VText, easeInOut } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
import { ripple, spark } from '../3D/effects/Fx.js';
applyTheme('RotateTranslate2D3D');

const scene = new Scene3D('scene', { cameraPos: [0, 220, 640], fov: 55 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const geo = new Geometry3D(scene, { axisLen: 190 });
const ANGLE = 45, DX = 60, DY = 30, RAD = ANGLE * Math.PI / 180;
const tri = new THREE.Shape();
tri.moveTo(0, 40); tri.lineTo(-46, -30); tri.lineTo(46, -30); tri.closePath();
geo.addShape(new THREE.ShapeGeometry(tri), { color: 0x22c55e, opacity: 0.92 });

const matrixText = new VText(scene, { text: '', x: 0, y: -120, z: 0, color: PALETTE.textDim, scale: 0.7 });
const hint = new VText(scene, { text: '点击「运行演示」开始：2D 旋转 + 平移', x: 0, y: 230, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');

const m = v => v.toFixed(2);
const updateMatrix = (angleDeg, dx, dy) => {
  const r = angleDeg * Math.PI / 180;
  matrixText.setText('M = T·R = [ ' + m(Math.cos(r)) + ' ' + m(-Math.sin(r)) + ' ' + m(dx) + ' ;  ' + m(Math.sin(r)) + ' ' + m(Math.cos(r)) + ' ' + m(dy) + ' ;  0 0 1 ]');
};
const e1 = {
  x: Math.cos(RAD) * 1 - Math.sin(RAD) * 0 + DX,
  y: Math.sin(RAD) * 1 + Math.cos(RAD) * 0 + DY,
};

function* rt2dGen() {
  yield S(() => { hint.setText('初始：三角位于原点，M = I（单位阵）'); updateMatrix(0, 0, 0); });
  yield W(700);
  yield S(() => { hint.setText('第 1 步：绕 z 轴旋转 ' + ANGLE + '°'); });
  yield W(700);
  yield A(600, p => {
    const t = easeInOut(p);
    geo.shape.rotation.z = RAD * t;
  });
  yield S(() => { ripple(scene, 0, 0, 0, PALETTE.highlight, 80); hint.setText('旋转完成 —— 现在平移 (' + DX + ', ' + DY + ')'); updateMatrix(ANGLE, DX, DY); });
  yield W(700);
  yield A(600, p => {
    const t = easeInOut(p);
    geo.shape.position.lerpVectors(new THREE.Vector3(0, 0, 0), new THREE.Vector3(DX, DY, 0), t);
  });
  yield S(() => {
    spark(scene, DX, DY, 0, PALETTE.highlight, 5);
    hint.setText('变换完成：(1,0) → (' + e1.x.toFixed(2) + ', ' + e1.y.toFixed(2) + ') —— 旋转+平移复合');
    status.textContent = '复合矩阵 M = T·R = [ ' + m(Math.cos(RAD)) + ' ' + m(-Math.sin(RAD)) + ' ' + DX + ' ; ' + m(Math.sin(RAD)) + ' ' + m(Math.cos(RAD)) + ' ' + DY + ' ; 0 0 1 ]';
  });
  yield W(1000);
  yield S(() => { hint.setText('T·R：先旋转后平移 —— 3x3 矩阵把 2D 仿射变换统一为一次线性映射'); });
  yield W(500);
}

panel.addButton('运行演示', () => engine.start(rt2dGen()));
panel.addButton('清空', () => {
  engine.clear();
  geo.shape.rotation.z = 0;
  geo.shape.position.set(0, 0, 0);
  updateMatrix(0, 0, 0);
  hint.setText('已清空，可重新运行'); status.textContent = '';
});
panel.addLabel('（拖拽旋转视角，滚轮缩放；绿色三角 = 旋转 45° 后平移 (60, 30) 的复合变换）');

scene.start(engine);
