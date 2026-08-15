// AlgorithmLibrary/RotateScale3D3D.js — 3D 旋转+缩放：「房子」绕 Z 轴旋转 45° 并做 (1.5, 0.8) 非均匀缩放 —— v' = R·S·v，A() 补间动画，矩阵结果写入状态栏（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Geometry3D } from '../3D/modes/Geometry3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
import { ripple } from '../3D/effects/Fx.js';
applyTheme('RotateScale3D3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const geo = new Geometry3D(scene, { axisLen: 150, x: 320, y: 360 });
geo.addShape([new THREE.BoxGeometry(100, 64, 64), new THREE.ConeGeometry(70, 56, 4)], { color: 0xa855f7, opacity: 0.92 });
geo.shape.position.set(320, 360, 0);
geo.shape.children[1].position.y = 32 + 28;
geo.shape.children[1].rotation.y = Math.PI / 4;

const status = panel.addStatus('就绪');

const ANG = 45, SX = 1.5, SY = 0.8, RAD = ANG * Math.PI / 180;
const E = p => p * p * (3 - 2 * p);
const m = v => v.toFixed(2);
const COS = m(Math.cos(RAD) * SX), NSIN = m(-Math.sin(RAD) * SY), SIN = m(Math.sin(RAD) * SX), COSY = m(Math.cos(RAD) * SY);

function* rs3dGen() {
  yield S(() => { status.textContent = '初始：房子未变换，M = I（单位阵）'; });
  yield W(700);
  yield S(() => { status.textContent = '施加变换：绕 Z 旋转 ' + ANG + '°，X 缩放 ' + SX + '，Y 缩放 ' + SY + ' —— 非均匀缩放把房子压扁再转'; });
  yield W(700);
  yield A(800, p => {
    const t = E(p);
    geo.shape.rotation.z = RAD * t;
    geo.shape.scale.set(1 + (SX - 1) * t, 1 + (SY - 1) * t, 1);
  });
  yield S(() => {
    ripple(scene, 320, 360, 0, PALETTE.highlight, 90);
    status.textContent = '变换完成：M = R·S = [ ' + COS + ' ' + NSIN + ' ; ' + SIN + ' ' + COSY + ' ] —— X 拉伸 Y 压缩，形状不再对称';
  });
  yield W(1000);
  yield S(() => {
    status.textContent = '旋转缩放演示完成：房子绕 Z 旋转 45° 并做 (1.5, 0.8) 非均匀缩放，复合矩阵 M = [ ' + COS + ' ' + NSIN + ' ; ' + SIN + ' ' + COSY + ' ]；每顶点 O(1) 应用 2×2 矩阵，共 O(n)';
  });
  yield W(800);
}

engine.queue(() => rs3dGen());
panel.addButton('清空', () => {
  engine.clear();
  geo.shape.rotation.z = 0;
  geo.shape.scale.set(1, 1, 1);
  status.textContent = '';
});

scene.start(engine);
