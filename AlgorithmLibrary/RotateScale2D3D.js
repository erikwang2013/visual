// AlgorithmLibrary/RotateScale2D3D.js — 2D 旋转+缩放：五边形绕 z 轴旋转 45° 并放大 1.5 倍 —— A() 插值动画 + 2x2 矩阵文本实时更新（function* 生成器驱动，矩阵元素运行时计算）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Geometry3D } from '../3D/modes/Geometry3D.js';
import { VText, easeInOut } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
import { ripple } from '../3D/effects/Fx.js';
applyTheme('RotateScale2D3D');

const scene = new Scene3D('scene', { cameraPos: [0, 220, 640], fov: 55 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const geo = new Geometry3D(scene, { axisLen: 190 });
const ANGLE = 45, SCALE = 1.5, RAD = ANGLE * Math.PI / 180;
const penta = new THREE.Shape();
for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 - Math.PI / 2; const x = Math.cos(a) * 48, y = Math.sin(a) * 48; i === 0 ? penta.moveTo(x, y) : penta.lineTo(x, y); }
penta.closePath();
geo.addShape(new THREE.ShapeGeometry(penta), { color: 0xa855f7, opacity: 0.92 });

const matrixText = new VText(scene, { text: '', x: 0, y: -120, z: 0, color: PALETTE.textDim, scale: 0.75 });
const hint = new VText(scene, { text: '点击「▶ 演示」开始：2D 旋转 + 缩放', x: 0, y: 230, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');

const m = v => v.toFixed(2);
const updateMatrix = (angleDeg, s) => {
  const r = angleDeg * Math.PI / 180;
  matrixText.setText('M = R·S = [ ' + m(Math.cos(r) * s) + '  ' + m(-Math.sin(r) * s) + ' ;  ' + m(Math.sin(r) * s) + '  ' + m(Math.cos(r) * s) + ' ]');
};
const e1 = { x: Math.cos(RAD) * SCALE, y: Math.sin(RAD) * SCALE };

function* rs2dGen() {
  yield S(() => { hint.setText('初始矩阵 M = I（单位阵）：五边形保持原状'); updateMatrix(0, 1); });
  yield W(700);
  yield S(() => { hint.setText('施加变换：旋转 ' + ANGLE + '°，缩放 ' + SCALE + ' 倍 —— 矩阵元素全部由角度与缩放实时算出'); });
  yield W(700);
  yield A(750, p => {
    const t = easeInOut(p);
    geo.shape.rotation.z = RAD * t;
    const s = 1 + (SCALE - 1) * t;
    geo.shape.scale.set(s, s, 1);
  });
  yield S(() => { ripple(scene, 0, 0, 0, PALETTE.highlight, 90); updateMatrix(ANGLE, SCALE); });
  yield W(700);
  yield S(() => {
    hint.setText('变换完成：(1,0) → (' + e1.x.toFixed(2) + ', ' + e1.y.toFixed(2) + ') —— 旋转+缩放同时作用');
    status.textContent = 'M = [ ' + m(Math.cos(RAD) * SCALE) + ' ' + m(-Math.sin(RAD) * SCALE) + ' ; ' + m(Math.sin(RAD) * SCALE) + ' ' + m(Math.cos(RAD) * SCALE) + ' ] —— 45° 旋转 × 1.5 倍缩放';
  });
  yield W(1000);
  yield S(() => { hint.setText('M = R·S：先缩放再旋转 —— 对角元 = s·cos θ，交叉元 = ∓s·sin θ'); });
  yield W(500);
}

engine.queue(() => rs2dGen());
panel.addButton('清空', () => {
  engine.clear();
  geo.shape.rotation.z = 0;
  geo.shape.scale.set(1, 1, 1);
  updateMatrix(0, 1);
  hint.setText('已清空，可重新运行'); status.textContent = '';
});
panel.addLabel('（拖拽旋转视角，滚轮缩放；紫色五边形 = 旋转 45° + 放大 1.5 倍的复合变换）');

scene.start(engine);
