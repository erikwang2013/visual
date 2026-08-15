// AlgorithmLibrary/RotateTranslate2D3D.js — 2D 旋转+平移：绿色三角先绕 z 轴旋转 45°，再平移 (60, 30) —— 分步 A() 动画，3×3 复合矩阵 T·R 结果写入状态栏（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Geometry3D } from '../3D/modes/Geometry3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
import { ripple, spark } from '../3D/effects/Fx.js';
applyTheme('RotateTranslate2D3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const geo = new Geometry3D(scene, { axisLen: 150, x: 320, y: 360 });
const ANGLE = 45, DX = 60, DY = 30, RAD = ANGLE * Math.PI / 180;
const tri = new THREE.Shape();
tri.moveTo(0, 40); tri.lineTo(-46, -30); tri.lineTo(46, -30); tri.closePath();
geo.addShape(new THREE.ShapeGeometry(tri), { color: 0x22c55e, opacity: 0.92 });
geo.shape.position.set(320, 360, 0);

const status = panel.addStatus('就绪');

const E = p => p * p * (3 - 2 * p);
const m = v => v.toFixed(2);
const e1 = {
  x: Math.cos(RAD) * 1 - Math.sin(RAD) * 0 + DX,
  y: Math.sin(RAD) * 1 + Math.cos(RAD) * 0 + DY,
};
const SV_FROM = new THREE.Vector3(320, 360, 0);
const SV_TO = new THREE.Vector3(320 + DX, 360 + DY, 0);
const MAT = 'T·R = [ ' + m(Math.cos(RAD)) + ' ' + m(-Math.sin(RAD)) + ' ' + DX + ' ; ' + m(Math.sin(RAD)) + ' ' + m(Math.cos(RAD)) + ' ' + DY + ' ; 0 0 1 ]';

function* rt2dGen() {
  yield S(() => { status.textContent = '初始：三角位于原点，M = I（单位阵）'; });
  yield W(700);
  yield S(() => { status.textContent = '第 1 步：绕 Z 轴旋转 ' + ANGLE + '°'; });
  yield W(700);
  yield A(600, p => { geo.shape.rotation.z = RAD * E(p); });
  yield S(() => { ripple(scene, 320, 360, 0, PALETTE.highlight, 80); status.textContent = '旋转完成 —— 现在平移 (' + DX + ', ' + DY + ')'; });
  yield W(700);
  yield A(600, p => { geo.shape.position.lerpVectors(SV_FROM, SV_TO, E(p)); });
  yield S(() => {
    spark(scene, 320 + DX, 360 + DY, 0, PALETTE.highlight, 5);
    status.textContent = '变换完成：点 (1,0) → (' + m(e1.x) + ', ' + m(e1.y) + ')；复合矩阵 ' + MAT;
  });
  yield W(1000);
  yield S(() => {
    status.textContent = '旋转平移演示完成：三角先绕 Z 旋转 45° 再平移 (60, 30)，(1,0) → (' + m(e1.x) + ', ' + m(e1.y) + ')；3×3 齐次矩阵 ' + MAT + ' 统一仿射变换，每点 O(1)';
  });
  yield W(800);
}

engine.queue(() => rt2dGen());
panel.addButton('清空', () => {
  engine.clear();
  geo.shape.rotation.z = 0;
  geo.shape.position.set(320, 360, 0);
  status.textContent = '';
});

scene.start(engine);
