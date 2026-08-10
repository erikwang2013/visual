// AlgorithmLibrary/ChangingCoordinates3D3D.js
// 3D 坐标变换：点 P 与二十面体先绕 Z 轴旋转 90°，再绕 X 轴旋转 90°，
// 最后平移 (x, y, z)；分步动画 + 矩阵 VText 逐步更新；移动对象对对象整体变换。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Geometry3D } from '../3D/modes/Geometry3D.js';
import { VNode, VText, easeInOut } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
import { ripple } from '../3D/effects/Fx.js';
applyTheme('ChangingCoordinates3D3D');

const scene = new Scene3D('scene', { cameraPos: [260, 280, 560], fov: 55 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const geo = new Geometry3D(scene, { axisLen: 200 });
const P0 = { x: 60, y: 70, z: 50 };
const point = new VNode(scene, { label: 'P', x: P0.x, y: P0.y, z: P0.z, radius: 15, color: PALETTE.highlight, emissive: PALETTE.highlightEmissive });
const ico = new THREE.Mesh(new THREE.IcosahedronGeometry(30, 0), new THREE.MeshStandardMaterial({ color: 0xa855f7, emissive: 0x581c87, emissiveIntensity: 0.5, transparent: true, opacity: 0.9 }));
ico.position.set(P0.x, P0.y, P0.z);
scene.add(ico);

const matrixText = new VText(scene, { text: '', x: 0, y: -140, z: 0, color: PALETTE.textDim, scale: 0.68 });
const hint = new VText(scene, { text: '输入 x、y、z，点击「变换点」', x: 0, y: 250, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

function clearAll() {
  engine.clear();
  point.mesh.position.set(P0.x, P0.y, P0.z);
  point.mesh.scale.set(1, 1, 1);
  ico.position.set(P0.x, P0.y, P0.z);
  ico.rotation.set(0, 0, 0);
  matrixText.setText('');
  hint.setText('输入 x、y、z，点击「变换点」');
  status.textContent = '已清空';
}

// ---- 模型（与 /tmp/3dtest/2i_model.mjs 一致）----
function transformPoint3DModel(px, py, pz, tx, ty, tz) {
  const x1 = -py, y1 = px, z1 = pz;          // Rz(90°)
  const x2 = x1, y2 = z1, z2 = -y1;          // 再 Rx(90°)
  return { x: x2 + tx, y: y2 + ty, z: z2 + tz };
}

function runTransform() {
  const tx = parseFloat(xInput.value);
  const ty = parseFloat(yInput.value);
  const tz = parseFloat(zInput.value);
  if (isNaN(tx) || isNaN(ty) || isNaN(tz)) { hint.setText('请输入有效坐标'); return; }
  xInput.value = String(tx); yInput.value = String(ty); zInput.value = String(tz);
  const from = point.mesh.position.clone();
  const k1 = new THREE.Vector3(-from.y, from.x, from.z);
  const k2 = new THREE.Vector3(k1.x, k1.z, -k1.y);
  const to = new THREE.Vector3(k2.x + tx, k2.y + ty, k2.z + tz);
  matrixText.setText('Rz = [ 0 -1 0 ; 1 0 0 ; 0 0 1 ]');
  C(1, () => hint.setText('步骤 1：绕 Z 轴旋转 90°'), () => {});
  let fx1 = false, fx2 = false, fx3 = false;
  C(600, (p) => { if (!fx1) { fx1 = true; ripple(scene, from.x, from.y, from.z, PALETTE.highlight, 46); } const t = easeInOut(p); point.mesh.position.lerpVectors(from, k1, t); }, () => {});
  C(1, () => { matrixText.setText('Rx·Rz = [ 0 -1 0 ; 0 0 1 ; -1 0 0 ]'); hint.setText('步骤 2：绕 X 轴旋转 90°'); }, () => {});
  C(600, (p) => { if (!fx2) { fx2 = true; ripple(scene, k1.x, k1.y, k1.z, PALETTE.green, 46); } const t = easeInOut(p); point.mesh.position.lerpVectors(k1, k2, t); }, () => {});
  C(1, () => { matrixText.setText('T·Rx·Rz = [ 0 -1 0 ' + tx + ' ; 0 0 1 ' + ty + ' ; -1 0 0 ' + tz + ' ; 0 0 0 1 ]'); hint.setText('步骤 3：平移 (' + tx + ', ' + ty + ', ' + tz + ')'); }, () => {});
  C(600, (p) => { if (!fx3) { fx3 = true; ripple(scene, k2.x, k2.y, k2.z, PALETTE.highlight, 46); } const t = easeInOut(p); point.mesh.position.lerpVectors(k2, to, t); }, () => {});
  C(1, () => {
    const r = transformPoint3DModel(from.x, from.y, from.z, tx, ty, tz);
    status.textContent = '新坐标: (' + r.x.toFixed(1) + ', ' + r.y.toFixed(1) + ', ' + r.z.toFixed(1) + ')';
    hint.setText('变换点完成：(' + from.x + ',' + from.y + ',' + from.z + ') → (' + r.x.toFixed(1) + ', ' + r.y.toFixed(1) + ', ' + r.z.toFixed(1) + ')');
  }, () => {});
}

function runMoveObject() {
  const tx = parseFloat(xInput.value);
  const ty = parseFloat(yInput.value);
  const tz = parseFloat(zInput.value);
  if (isNaN(tx) || isNaN(ty) || isNaN(tz)) { hint.setText('请输入有效坐标'); return; }
  const from = ico.position.clone();
  const k1 = new THREE.Vector3(-from.y, from.x, from.z);
  const k2 = new THREE.Vector3(k1.x, k1.z, -k1.y);
  const to = new THREE.Vector3(k2.x + tx, k2.y + ty, k2.z + tz);
  C(1, () => hint.setText('移动对象：绕 Z 轴旋转 90°'), () => {});
  let fxM1 = false, fxM2 = false, fxM3 = false;
  C(600, (p) => { if (!fxM1) { fxM1 = true; ripple(scene, from.x, from.y, from.z, PALETTE.highlight, 56); } const t = easeInOut(p); ico.rotation.z = Math.PI / 2 * t; ico.position.lerpVectors(from, k1, t); }, () => {});
  C(1, () => hint.setText('移动对象：绕 X 轴旋转 90°'), () => {});
  C(600, (p) => { if (!fxM2) { fxM2 = true; ripple(scene, k1.x, k1.y, k1.z, PALETTE.green, 56); } const t = easeInOut(p); ico.rotation.x = Math.PI / 2 * t; ico.position.lerpVectors(k1, k2, t); }, () => {});
  C(1, () => hint.setText('移动对象：平移 (' + tx + ', ' + ty + ', ' + tz + ')'), () => {});
  C(600, (p) => { if (!fxM3) { fxM3 = true; ripple(scene, k2.x, k2.y, k2.z, PALETTE.highlight, 56); } const t = easeInOut(p); ico.position.lerpVectors(k2, to, t); }, () => {});
  C(1, () => {
    const r = transformPoint3DModel(from.x, from.y, from.z, tx, ty, tz);
    status.textContent = '对象新位置: (' + r.x.toFixed(1) + ', ' + r.y.toFixed(1) + ', ' + r.z.toFixed(1) + ')';
    hint.setText('移动对象完成');
  }, () => {});
}

const xInput = panel.addInput('x', () => runTransform(), 6);
xInput.value = '30';
const yInput = panel.addInput('y', () => runTransform(), 6);
yInput.value = '20';
const zInput = panel.addInput('z', () => runTransform(), 6);
zInput.value = '-40';
panel.addButton('变换点', runTransform);
panel.addButton('移动对象', runMoveObject);
panel.addButton('清空', clearAll);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
