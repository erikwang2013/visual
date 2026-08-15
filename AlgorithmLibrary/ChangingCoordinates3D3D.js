// AlgorithmLibrary/ChangingCoordinates3D3D.js — 3D 坐标变换：点 P 与二十面体先绕 Z 轴旋转 90°，再绕 X 轴旋转 90°，最后平移 (30,20,-40)；分步 A() 动画，步骤写入状态栏（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Geometry3D } from '../3D/modes/Geometry3D.js';
import { VNode, easeInOut } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
import { ripple } from '../3D/effects/Fx.js';
applyTheme('ChangingCoordinates3D3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const geo = new Geometry3D(scene, { axisLen: 200, x: 320, y: 360 });
const P0 = { x: 60, y: 70, z: 50 };
const T = { x: 30, y: 20, z: -40 };
const OFF = { x: 320, y: 360 };
const point = new VNode(scene, { label: 'P', x: P0.x + OFF.x, y: P0.y + OFF.y, z: P0.z, radius: 15, color: PALETTE.highlight, emissive: PALETTE.highlightEmissive });
const ico = new THREE.Mesh(new THREE.IcosahedronGeometry(30, 0), new THREE.MeshStandardMaterial({ color: 0xa855f7, emissive: 0x581c87, emissiveIntensity: 0.5, transparent: true, opacity: 0.9 }));
ico.position.set(P0.x + OFF.x, P0.y + OFF.y, P0.z);
scene.add(ico);
const status = panel.addStatus('就绪');

const FROM = new THREE.Vector3(P0.x + OFF.x, P0.y + OFF.y, P0.z);
const K1 = new THREE.Vector3(-P0.y + OFF.x, P0.x + OFF.y, P0.z);
const K2 = new THREE.Vector3(-P0.y + OFF.x, P0.z + OFF.y, -P0.x);
const TO = new THREE.Vector3(K2.x + T.x, K2.y + T.y, K2.z + T.z);

function* cc3dGen() {
  yield S(() => { status.textContent = '步骤 1：点 P(60,70,50) 与紫色二十面体绕 Z 轴旋转 90°（Rz = [0 -1 0 ; 1 0 0 ; 0 0 1]）'; });
  yield W(700);
  yield A(700, p => {
    const t = easeInOut(p);
    point.mesh.position.lerpVectors(FROM, K1, t);
    ico.rotation.z = Math.PI / 2 * t;
    ico.position.lerpVectors(FROM, K1, t);
  });
  yield S(() => { ripple(scene, K1.x, K1.y, K1.z, PALETTE.green, 46); status.textContent = 'Rz 完成：P → (-70, 60, 50)，(x,y,z) 变成 (-y,x,z)'; });
  yield W(700);
  yield S(() => { status.textContent = '步骤 2：绕 X 轴旋转 90°（Rx·Rz = [0 -1 0 ; 0 0 1 ; -1 0 0]）'; });
  yield W(700);
  yield A(700, p => {
    const t = easeInOut(p);
    point.mesh.position.lerpVectors(K1, K2, t);
    ico.rotation.x = Math.PI / 2 * t;
    ico.position.lerpVectors(K1, K2, t);
  });
  yield S(() => { ripple(scene, K2.x, K2.y, K2.z, PALETTE.highlight, 46); status.textContent = 'Rx 完成：P → (-70, 50, -60)，(y,z) 变成 (z,-y)'; });
  yield W(700);
  yield S(() => { status.textContent = '步骤 3：平移 (30, 20, -40)'; });
  yield W(700);
  yield A(700, p => {
    const t = easeInOut(p);
    point.mesh.position.lerpVectors(K2, TO, t);
    ico.position.lerpVectors(K2, TO, t);
  });
  yield S(() => {
    ripple(scene, TO.x, TO.y, TO.z, PALETTE.highlight, 46);
    status.textContent = '变换完成：P(60,70,50) → (-40, 70, -100) —— 复合矩阵 T·Rx·Rz';
  });
  yield W(800);
  yield S(() => { status.textContent = '3D 坐标变换演示完成：点 P(60,70,50) 与二十面体依次绕 Z 轴、X 轴旋转 90° 再平移 (30,20,-40)，终位 (-40,70,-100)；复合矩阵 T·Rx·Rz 从右往左读，单点变换 O(1)'; });
  yield W(500);
}

engine.queue(() => cc3dGen());
panel.addButton('清空', () => {
  engine.clear();
  point.mesh.position.set(P0.x + OFF.x, P0.y + OFF.y, P0.z);
  point.mesh.scale.set(1, 1, 1);
  ico.position.set(P0.x + OFF.x, P0.y + OFF.y, P0.z);
  ico.rotation.set(0, 0, 0);
  status.textContent = '';
});

scene.start(engine);
