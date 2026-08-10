// AlgorithmLibrary/RotateScale3D3D.js
// 3D 坐标轴（XYZ 彩色箭头）+ 网格地面 + "房子"多面体。
// 绕 Z 旋转 + X/Y 缩放（v' = R·S·v），动画补间 + 实时变换矩阵显示。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Geometry3D } from '../3D/modes/Geometry3D.js';
import { VText, easeInOut } from '../3D/VisualObject3D.js';
import { PALETTE } from '../3D/Glow.js';

const scene = new Scene3D('scene', { cameraPos: [0, 260, 620], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const geo = new Geometry3D(scene, { axisLen: 200 });
// 房子 = 盒身 + 四棱锥屋顶（合成 Group）
geo.addShape([new THREE.BoxGeometry(100, 64, 64), new THREE.ConeGeometry(70, 56, 4)], { color: 0xa855f7, opacity: 0.92 });
geo.shape.children[1].position.y = 32 + 28;
geo.shape.children[1].rotation.y = Math.PI / 4;

const matrixText = new VText(scene, { text: '', x: 0, y: -130, z: 0, color: PALETTE.textDim, scale: 0.72 });
const hint = new VText(scene, { text: '', x: 0, y: 230, z: 0, color: PALETTE.textGlow, scale: 0.8 });

let angleDeg = 0, scaleX = 1, scaleY = 1;

function updateMatrix() {
  const rad = angleDeg * Math.PI / 180;
  const m00 = (Math.cos(rad) * scaleX).toFixed(2);
  const m01 = (-Math.sin(rad) * scaleY).toFixed(2);
  const m10 = (Math.sin(rad) * scaleX).toFixed(2);
  const m11 = (Math.cos(rad) * scaleY).toFixed(2);
  matrixText.setText('M = [ ' + m00 + '  ' + m01 + ' ]   [ ' + m10 + '  ' + m11 + ' ]');
}

function applyTransform() {
  const fromRot = geo.shape.rotation.z;
  const fromSX = geo.shape.scale.x, fromSY = geo.shape.scale.y;
  const toRot = angleDeg * Math.PI / 180;
  hint.setText('旋转 ' + angleDeg + '°，缩放 (' + scaleX + ', ' + scaleY + ')');
  C(700, (p) => {
    const t = easeInOut(p);
    geo.shape.rotation.z = fromRot + (toRot - fromRot) * t;
    geo.shape.scale.set(fromSX + (scaleX - fromSX) * t, fromSY + (scaleY - fromSY) * t, 1);
  });
  C(60, updateMatrix);
}

function reset() {
  angleDeg = 0; scaleX = 1; scaleY = 1;
  rotSlider.value = 0; sxSlider.value = 1; sySlider.value = 1;
  applyTransform();
  hint.setText('已重置');
}

panel.addLabel('旋转角（绕 Z 轴）');
const rotSlider = panel.addSlider('θ', -180, 180, 5, 0, (v) => { angleDeg = v; });
panel.addLabel('缩放');
const sxSlider = panel.addSlider('X', 0.2, 3, 0.1, 1, (v) => { scaleX = v; });
const sySlider = panel.addSlider('Y', 0.2, 3, 0.1, 1, (v) => { scaleY = v; });
panel.addButton('应用', applyTransform);
panel.addButton('重置', reset);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

updateMatrix();
scene.start(engine);
