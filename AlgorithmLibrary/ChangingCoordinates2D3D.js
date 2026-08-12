// AlgorithmLibrary/ChangingCoordinates2D3D.js — 2D 坐标变换：点 P 与三角对象先绕原点旋转 90°，再平移 (40,-30) —— 分步 A() 动画 + 矩阵文本逐步更新（function* 生成器驱动，目标坐标运行时计算）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Geometry3D } from '../3D/modes/Geometry3D.js';
import { VNode, VText, easeInOut } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
import { ripple } from '../3D/effects/Fx.js';
applyTheme('ChangingCoordinates2D3D');

const scene = new Scene3D('scene', { cameraPos: [0, 220, 640], fov: 55 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const geo = new Geometry3D(scene, { axisLen: 200 });
const P0 = { x: 70, y: 50 };
const T = { x: 40, y: -30 };
const point = new VNode(scene, { label: 'P', x: P0.x, y: P0.y, z: 0, radius: 16, color: PALETTE.highlight, emissive: PALETTE.highlightEmissive });
const tri = new THREE.Shape();
tri.moveTo(0, 34); tri.lineTo(-26, -22); tri.lineTo(26, -22); tri.closePath();
const objMesh = new THREE.Mesh(new THREE.ShapeGeometry(tri), new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0x7c2d12, emissiveIntensity: 0.5, transparent: true, opacity: 0.9 }));
objMesh.position.set(P0.x, P0.y, 0);
scene.add(objMesh);

const matrixText = new VText(scene, { text: '', x: 0, y: -130, z: 0, color: PALETTE.textDim, scale: 0.72 });
const hint = new VText(scene, { text: '点击「▶ 演示」开始：2D 坐标变换 —— 旋转 90° 再平移', x: 0, y: 230, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');

const MID = new THREE.Vector3(-P0.y, P0.x, 0);
const TO = new THREE.Vector3(MID.x + T.x, MID.y + T.y, 0);

function* cc2dGen() {
  yield S(() => { hint.setText('步骤 1：点 P(' + P0.x + ',' + P0.y + ') 与橙色对象绕原点旋转 90°'); matrixText.setText('R = [ 0  -1 ;  1  0 ]'); });
  yield W(700);
  yield A(700, p => {
    const t = easeInOut(p);
    point.mesh.position.lerpVectors(new THREE.Vector3(P0.x, P0.y, 0), MID, t);
    objMesh.rotation.z = Math.PI / 2 * t;
    objMesh.position.lerpVectors(new THREE.Vector3(P0.x, P0.y, 0), MID, t);
  });
  yield S(() => { ripple(scene, MID.x, MID.y, 0, PALETTE.green, 52); hint.setText('旋转完成：P 到 (' + MID.x.toFixed(0) + ', ' + MID.y.toFixed(0) + ') —— 旋转矩阵 R 把 (x,y) 变成 (−y,x)'); });
  yield W(700);
  yield S(() => { hint.setText('步骤 2：整体平移 (' + T.x + ', ' + T.y + ')'); matrixText.setText('T·R = [ 0  -1  ' + T.x + ' ;  1  0  ' + T.y + ' ;  0 0 1 ]'); });
  yield W(700);
  yield A(700, p => {
    const t = easeInOut(p);
    point.mesh.position.lerpVectors(MID, TO, t);
    objMesh.position.lerpVectors(MID, TO, t);
  });
  yield S(() => {
    ripple(scene, TO.x, TO.y, 0, PALETTE.highlight, 52);
    hint.setText('变换完成：P(' + P0.x + ',' + P0.y + ') → (' + TO.x.toFixed(0) + ', ' + TO.y.toFixed(0) + ')');
    status.textContent = '新坐标: (' + TO.x.toFixed(1) + ', ' + TO.y.toFixed(1) + ') —— 先旋转 90° 再平移，复合矩阵 T·R';
  });
  yield W(1000);
  yield S(() => { hint.setText('复合变换 = T·R：R 先作用，T 后作用 —— 矩阵乘法顺序与执行顺序相反'); });
  yield W(500);
}

engine.queue(() => cc2dGen());
panel.addButton('清空', () => {
  engine.clear();
  point.mesh.position.set(P0.x, P0.y, 0);
  point.mesh.scale.set(1, 1, 1);
  objMesh.position.set(P0.x, P0.y, 0);
  objMesh.rotation.set(0, 0, 0);
  matrixText.setText('');
  hint.setText('已清空，可重新运行'); status.textContent = '';
});
panel.addLabel('（拖拽旋转视角，滚轮缩放；点 P 与对象施加相同的旋转 + 平移复合变换）');

scene.start(engine);
