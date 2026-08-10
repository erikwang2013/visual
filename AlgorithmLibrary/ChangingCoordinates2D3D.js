// AlgorithmLibrary/ChangingCoordinates2D3D.js
// 2D 坐标变换：点 P 与三角对象先绕原点旋转 90°，再平移 (x, y)，
// 分步动画 + 矩阵 VText 逐步更新；移动对象对对象整体施加相同变换。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Geometry3D } from '../3D/modes/Geometry3D.js';
import { VNode, VText, easeInOut } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
import { ripple } from '../3D/effects/Fx.js';
applyTheme('ChangingCoordinates2D3D');

const scene = new Scene3D('scene', { cameraPos: [0, 220, 640], fov: 55 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const geo = new Geometry3D(scene, { axisLen: 200 });
const P0 = { x: 70, y: 50 };
const point = new VNode(scene, { label: 'P', x: P0.x, y: P0.y, z: 0, radius: 16, color: PALETTE.highlight, emissive: PALETTE.highlightEmissive });
const tri = new THREE.Shape();
tri.moveTo(0, 34); tri.lineTo(-26, -22); tri.lineTo(26, -22); tri.closePath();
const objMesh = new THREE.Mesh(new THREE.ShapeGeometry(tri), new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0x7c2d12, emissiveIntensity: 0.5, transparent: true, opacity: 0.9 }));
objMesh.position.set(P0.x, P0.y, 0);
scene.add(objMesh);

const matrixText = new VText(scene, { text: '', x: 0, y: -130, z: 0, color: PALETTE.textDim, scale: 0.72 });
const hint = new VText(scene, { text: '输入 x、y，点击「变换点」', x: 0, y: 230, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

function clearAll() {
  engine.clear();
  point.mesh.position.set(P0.x, P0.y, 0);
  point.mesh.scale.set(1, 1, 1);
  objMesh.position.set(P0.x, P0.y, 0);
  objMesh.rotation.set(0, 0, 0);
  matrixText.setText('');
  hint.setText('输入 x、y，点击「变换点」');
  status.textContent = '已清空';
}

// ---- 模型（与 /tmp/3dtest/2i_model.mjs 一致）----
function transformPointModel(px, py, tx, ty) {
  return { x: -py + tx, y: px + ty };   // 先绕原点旋转 90°，再平移
}

function runTransform() {
  const tx = parseFloat(xInput.value);
  const ty = parseFloat(yInput.value);
  if (isNaN(tx) || isNaN(ty)) { hint.setText('请输入有效坐标'); return; }
  xInput.value = String(tx); yInput.value = String(ty);
  const from = point.mesh.position.clone();
  const mid = new THREE.Vector3(-from.y, from.x, 0);
  const to = new THREE.Vector3(mid.x + tx, mid.y + ty, 0);
  matrixText.setText('R = [ 0  -1 ;  1  0 ]');
  C(1, () => hint.setText('步骤 1：点 P 绕原点旋转 90°'), () => {});
  let fxR = false, fxT = false;
  C(600, (p) => { if (!fxR) { fxR = true; ripple(scene, from.x, from.y, 0, PALETTE.highlight, 52); } const t = easeInOut(p); point.mesh.position.lerpVectors(from, mid, t); }, () => {});
  C(1, () => { matrixText.setText('T·R = [ 0  -1  ' + tx + ' ;  1  0  ' + ty + ' ;  0 0 1 ]'); hint.setText('步骤 2：平移 (' + tx + ', ' + ty + ')'); }, () => {});
  C(600, (p) => { if (!fxT) { fxT = true; ripple(scene, mid.x, mid.y, 0, PALETTE.green, 52); } const t = easeInOut(p); point.mesh.position.lerpVectors(mid, to, t); }, () => {});
  C(1, () => {
    const r = transformPointModel(from.x, from.y, tx, ty);
    status.textContent = '新坐标: (' + r.x.toFixed(1) + ', ' + r.y.toFixed(1) + ')';
    hint.setText('变换点完成：P(' + from.x + ',' + from.y + ') → (' + r.x.toFixed(1) + ', ' + r.y.toFixed(1) + ')');
  }, () => {});
}

function runMoveObject() {
  const tx = parseFloat(xInput.value);
  const ty = parseFloat(yInput.value);
  if (isNaN(tx) || isNaN(ty)) { hint.setText('请输入有效坐标'); return; }
  const fromPos = objMesh.position.clone();
  const midPos = new THREE.Vector3(-fromPos.y, fromPos.x, 0);
  const toPos = new THREE.Vector3(midPos.x + tx, midPos.y + ty, 0);
  C(1, () => hint.setText('移动对象：整体旋转 90° 再平移 (' + tx + ', ' + ty + ')'), () => {});
  let fxM = false;
  C(600, (p) => {
    if (!fxM) { fxM = true; ripple(scene, fromPos.x, fromPos.y, 0, PALETTE.highlight, 60); }
    const t = easeInOut(p);
    objMesh.rotation.z = Math.PI / 2 * t;
    objMesh.position.lerpVectors(fromPos, midPos, t);
  }, () => {});
  C(600, (p) => { const t = easeInOut(p); objMesh.position.lerpVectors(midPos, toPos, t); }, () => {});
  C(1, () => {
    const r = transformPointModel(fromPos.x, fromPos.y, tx, ty);
    status.textContent = '对象新位置: (' + r.x.toFixed(1) + ', ' + r.y.toFixed(1) + ')';
    hint.setText('移动对象完成');
  }, () => {});
}

const xInput = panel.addInput('x', () => runTransform(), 6);
xInput.value = '40';
const yInput = panel.addInput('y', () => runTransform(), 6);
yInput.value = '-30';
panel.addButton('变换点', runTransform);
panel.addButton('移动对象', runMoveObject);
panel.addButton('清空', clearAll);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
