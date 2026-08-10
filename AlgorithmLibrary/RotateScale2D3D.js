// AlgorithmLibrary/RotateScale2D3D.js
// 2D 旋转+缩放：扁平几何体（薄 z 厚度）站在 xy 平面，相机正对观察，
// 转变 = 绕 z 轴旋转 angle° 并缩放 s，实时显示 2x2 变换矩阵；改变形状轮换图形。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Geometry3D } from '../3D/modes/Geometry3D.js';
import { VText, easeInOut } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('RotateScale2D3D');

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
geo.addShape(SHAPES[0].make(), { color: 0xa855f7, opacity: 0.92 });

const matrixText = new VText(scene, { text: '', x: 0, y: -120, z: 0, color: PALETTE.textDim, scale: 0.75 });
const hint = new VText(scene, { text: '输入角度与缩放，点击「转变」', x: 0, y: 230, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

// ---- 模型（与 /tmp/3dtest/2i_model.mjs 一致）----
function rotateScaleModel(angleDeg, s, x, y) {
  const rad = angleDeg * Math.PI / 180;
  return { x: Math.cos(rad) * s * x - Math.sin(rad) * s * y, y: Math.sin(rad) * s * x + Math.cos(rad) * s * y };
}

function updateMatrix(angleDeg, s) {
  const rad = angleDeg * Math.PI / 180;
  const m = (v) => v.toFixed(2);
  matrixText.setText('M = R·S = [ ' + m(Math.cos(rad) * s) + '  ' + m(-Math.sin(rad) * s) + ' ;  ' + m(Math.sin(rad) * s) + '  ' + m(Math.cos(rad) * s) + ' ]');
}

function removeShape() {
  if (!geo.shape) return;
  geo.shape.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  scene.remove(geo.shape);
  geo.shape = null;
}

function applyTransform() {
  const angle = parseFloat(angleInput.value);
  const s = parseFloat(scaleInput.value);
  if (isNaN(angle)) { hint.setText('请输入有效角度'); return; }
  const tScale = isNaN(s) || s <= 0 ? 1 : s;
  scaleInput.value = String(tScale);
  const fromRot = geo.shape.rotation.z, fromS = geo.shape.scale.x;
  const toRot = angle * Math.PI / 180;
  C(1, () => hint.setText('旋转 ' + angle + '°，缩放 ' + tScale + ' 倍'), () => {});
  C(700, (p) => {
    const t = easeInOut(p);
    geo.shape.rotation.z = fromRot + (toRot - fromRot) * t;
    geo.shape.scale.set(fromS + (tScale - fromS) * t, fromS + (tScale - fromS) * t, 1);
  }, () => {});
  C(1, () => {
    updateMatrix(angle, tScale);
    const rad = angle * Math.PI / 180, m = (v) => v.toFixed(2);
    status.textContent = 'M = [ ' + m(Math.cos(rad) * tScale) + ' ' + m(-Math.sin(rad) * tScale) + ' ; ' + m(Math.sin(rad) * tScale) + ' ' + m(Math.cos(rad) * tScale) + ' ]';
    const p = rotateScaleModel(angle, tScale, 1, 0);
    hint.setText('变换完成：(1,0) → (' + p.x.toFixed(2) + ', ' + p.y.toFixed(2) + ')');
  }, () => {});
}

function changeShape() {
  shapeIdx = (shapeIdx + 1) % SHAPES.length;
  removeShape();
  geo.addShape(SHAPES[shapeIdx].make(), { color: 0xa855f7, opacity: 0.92 });
  C(1, () => hint.setText('形状切换为' + SHAPES[shapeIdx].name + '（保留当前变换）'), () => {});
}

const angleInput = panel.addInput('角度', () => applyTransform(), 6);
angleInput.value = '45';
const scaleInput = panel.addInput('缩放', () => applyTransform(), 4);
scaleInput.value = '1';
panel.addButton('转变', applyTransform);
panel.addButton('改变形状', changeShape);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

updateMatrix(0, 1);
scene.start(engine);
