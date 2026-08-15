// AlgorithmLibrary/ChangingCoordinates2D3D.js — 2D 坐标变换：点 P 与三角对象先绕原点旋转 90°，再平移 (40,-30)；分步 A() 动画，步骤写入状态栏（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Geometry3D } from '../3D/modes/Geometry3D.js';
import { VNode, easeInOut } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
import { ripple } from '../3D/effects/Fx.js';
applyTheme('ChangingCoordinates2D3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const geo = new Geometry3D(scene, { axisLen: 150, x: 320, y: 360 });
const P0 = { x: 70, y: 50 };
const T = { x: 40, y: -30 };
const OFF = { x: 320, y: 360 };
const point = new VNode(scene, { label: 'P', x: P0.x + OFF.x, y: P0.y + OFF.y, z: 0, radius: 16, color: PALETTE.highlight, emissive: PALETTE.highlightEmissive });
const tri = new THREE.Shape();
tri.moveTo(0, 34); tri.lineTo(-26, -22); tri.lineTo(26, -22); tri.closePath();
const objMesh = new THREE.Mesh(new THREE.ShapeGeometry(tri), new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0x7c2d12, emissiveIntensity: 0.5, transparent: true, opacity: 0.9 }));
objMesh.position.set(P0.x + OFF.x, P0.y + OFF.y, 0);
scene.add(objMesh);
const status = panel.addStatus('就绪');

const FROM = new THREE.Vector3(P0.x + OFF.x, P0.y + OFF.y, 0);
const MIDM = new THREE.Vector3(-P0.y, P0.x, 0);
const MID = MIDM.clone().add(new THREE.Vector3(OFF.x, OFF.y, 0));
const TOM = new THREE.Vector3(MIDM.x + T.x, MIDM.y + T.y, 0);
const TO = new THREE.Vector3(MID.x + T.x, MID.y + T.y, 0);

function* cc2dGen() {
  yield S(() => { status.textContent = '步骤 1：点 P(70,50) 与三角对象绕原点旋转 90°（R = [0 -1 ; 1 0]）'; });
  yield W(700);
  yield A(700, p => {
    const t = easeInOut(p);
    point.mesh.position.lerpVectors(FROM, MID, t);
    objMesh.rotation.z = Math.PI / 2 * t;
    objMesh.position.lerpVectors(FROM, MID, t);
  });
  yield S(() => { ripple(scene, MID.x, MID.y, 0, PALETTE.green, 52); status.textContent = '旋转完成：P 到 (-50, 70) —— 旋转矩阵把 (x,y) 变成 (-y,x)'; });
  yield W(700);
  yield S(() => { status.textContent = '步骤 2：整体平移 (40, -30)'; });
  yield W(700);
  yield A(700, p => {
    const t = easeInOut(p);
    point.mesh.position.lerpVectors(MID, TO, t);
    objMesh.position.lerpVectors(MID, TO, t);
  });
  yield S(() => {
    ripple(scene, TO.x, TO.y, 0, PALETTE.highlight, 52);
    status.textContent = '变换完成：P(70,50) → (-10, 40) —— 复合矩阵 T·R';
  });
  yield W(800);
  yield S(() => { status.textContent = '2D 坐标变换演示完成：点 P(70,50) 与三角对象旋转 90° 再平移 (40,-30)，终位 (-10,40)；复合矩阵 T·R 先旋转后平移，单点变换 O(1)'; });
  yield W(500);
}

engine.queue(() => cc2dGen());
panel.addButton('清空', () => {
  engine.clear();
  point.mesh.position.set(P0.x + OFF.x, P0.y + OFF.y, 0);
  point.mesh.scale.set(1, 1, 1);
  objMesh.position.set(P0.x + OFF.x, P0.y + OFF.y, 0);
  objMesh.rotation.set(0, 0, 0);
  status.textContent = '';
});

scene.start(engine);
