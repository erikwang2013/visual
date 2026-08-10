// AlgorithmLibrary/RotateTranslate2D3D.js
// 2D 旋转+平移：转变 = 先绕 z 轴旋转 angle°，再平移 (dx, dy)，
// 分步动画并实时显示 3x3 复合矩阵 T·R；改变形状轮换图形。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Geometry3D } from '../3D/modes/Geometry3D.js';
import { VText, easeInOut } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
import { ripple, spark } from '../3D/effects/Fx.js';
applyTheme('RotateTranslate2D3D');

const scene = new Scene3D('scene', { cameraPos: [0, 220, 640], fov: 55 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const geo = new Geometry3D(scene, { axisLen: 190 });
const SHAPES = [
  { name: '矩形', make: () => new THREE.BoxGeometry(100, 70, 10) },
  { name: '三角', make: () => { const s = new THREE.Shape(); s.moveTo(0, 40); s.lineTo(-46, -30); s.lineTo(46, -30); s.closePath(); return new THREE.ShapeGeometry(s); } },
  { name: '五角', make: () => { const s = new THREE.Shape(); for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 - Math.PI / 2; const x = Math.cos(a) * 48, y = Math.sin(a) * 48; i === 0 ? s.moveTo(x, y) : s.lineTo(x, y); } s.closePath(); return new THREE.ShapeGeometry(s); } },
  { name: '圆', make: () => new THREE.CircleGeometry(52, 40) },
];
let shapeIdx = 0;
geo.addShape(SHAPES[0].make(), { color: 0x22c55e, opacity: 0.92 });

const matrixText = new VText(scene, { text: '', x: 0, y: -120, z: 0, color: PALETTE.textDim, scale: 0.7 });
const hint = new VText(scene, { text: '输入角度与位移，点击「转变」', x: 0, y: 230, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

let curRot = 0, curDx = 0, curDy = 0;   // 当前姿态（旋转绝对值，位移累积）

// ---- 模型（与 /tmp/3dtest/2i_model.mjs 一致）----
function rotateTranslateModel(angleDeg, dx, dy, x, y) {
  const rad = angleDeg * Math.PI / 180;
  return { x: Math.cos(rad) * x - Math.sin(rad) * y + dx, y: Math.sin(rad) * x + Math.cos(rad) * y + dy };
}

function updateMatrix(angleDeg, dx, dy) {
  const rad = angleDeg * Math.PI / 180, m = (v) => v.toFixed(2);
  matrixText.setText('M = T·R = [ ' + m(Math.cos(rad)) + ' ' + m(-Math.sin(rad)) + ' ' + m(dx) + ' ;  ' + m(Math.sin(rad)) + ' ' + m(Math.cos(rad)) + ' ' + m(dy) + ' ;  0 0 1 ]');
}

function removeShape() {
  if (!geo.shape) return;
  geo.shape.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  scene.remove(geo.shape);
  geo.shape = null;
}

function clearAll() {
  engine.clear();
  shapeIdx = 0;
  curRot = 0; curDx = 0; curDy = 0;
  removeShape();
  geo.addShape(SHAPES[0].make(), { color: 0x22c55e, opacity: 0.92 });
  updateMatrix(0, 0, 0);
  hint.setText('输入角度与位移，点击「转变」');
  status.textContent = '已清空';
}

function applyTransform() {
  const angle = parseFloat(angleInput.value);
  const dx = parseFloat(dxInput.value);
  const dy = parseFloat(dyInput.value);
  if (isNaN(angle)) { hint.setText('请输入有效角度'); return; }
  const tDx = isNaN(dx) ? 0 : dx, tDy = isNaN(dy) ? 0 : dy;
  const fromRot = geo.shape.rotation.z, fromPos = geo.shape.position.clone();
  const toRot = angle * Math.PI / 180;
  curRot = toRot; curDx += tDx; curDy += tDy;
  const toPos = new THREE.Vector3(fromPos.x + tDx, fromPos.y + tDy, fromPos.z);
  C(1, () => hint.setText('第 1 步：绕 z 轴旋转 ' + angle + '°'), () => {});
  let fxRot = false, fxTr = false;
  C(600, (p) => { if (!fxRot) { fxRot = true; ripple(scene, fromPos.x, fromPos.y, fromPos.z, PALETTE.highlight, 80); } const t = easeInOut(p); geo.shape.rotation.z = fromRot + (toRot - fromRot) * t; }, () => {});
  C(1, () => { updateMatrix(angle, curDx, curDy); hint.setText('第 2 步：平移 (' + tDx + ', ' + tDy + ')'); }, () => {});
  C(600, (p) => { if (!fxTr) { fxTr = true; spark(scene, toPos.x, toPos.y, toPos.z, PALETTE.highlight, 5); } const t = easeInOut(p); geo.shape.position.lerpVectors(fromPos, toPos, t); }, () => {});
  C(1, () => {
    updateMatrix(angle, curDx, curDy);
    const p = rotateTranslateModel(angle, tDx, tDy, 1, 0);
    status.textContent = '复合矩阵 M = T·R = [ ' + Math.cos(angle * Math.PI / 180).toFixed(2) + ' ' + (-Math.sin(angle * Math.PI / 180)).toFixed(2) + ' ' + tDx + ' ; ' + Math.sin(angle * Math.PI / 180).toFixed(2) + ' ' + Math.cos(angle * Math.PI / 180).toFixed(2) + ' ' + tDy + ' ; 0 0 1 ]';
    hint.setText('变换完成：(1,0) → (' + p.x.toFixed(2) + ', ' + p.y.toFixed(2) + ')');
  }, () => {});
}

function changeShape() {
  shapeIdx = (shapeIdx + 1) % SHAPES.length;
  removeShape();
  geo.addShape(SHAPES[shapeIdx].make(), { color: 0x22c55e, opacity: 0.92 });
  geo.shape.rotation.z = curRot;
  geo.shape.position.set(curDx, curDy, 0);
  C(1, () => hint.setText('形状切换为' + SHAPES[shapeIdx].name + '（保留当前变换）'), () => {});
}

const angleInput = panel.addInput('角度', () => applyTransform(), 6);
angleInput.value = '45';
const dxInput = panel.addInput('dx', () => applyTransform(), 5);
dxInput.value = '0';
const dyInput = panel.addInput('dy', () => applyTransform(), 5);
dyInput.value = '0';
panel.addButton('转变', applyTransform);
panel.addButton('改变形状', changeShape);
panel.addButton('清空', clearAll);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

updateMatrix(0, 0, 0);
scene.start(engine);
