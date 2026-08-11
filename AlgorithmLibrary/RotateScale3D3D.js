// AlgorithmLibrary/RotateScale3D3D.js — 3D 旋转+缩放：「房子」绕 Z 轴旋转 45° 并做 (1.5, 0.8) 非均匀缩放 —— v' = R·S·v，A() 补间动画 + 2x2 矩阵实时显示（function* 生成器驱动，矩阵元素运行时计算）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Geometry3D } from '../3D/modes/Geometry3D.js';
import { VText, easeInOut } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
import { ripple } from '../3D/effects/Fx.js';
applyTheme('RotateScale3D3D');

const scene = new Scene3D('scene', { cameraPos: [0, 260, 620], fov: 55 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const geo = new Geometry3D(scene, { axisLen: 200 });
geo.addShape([new THREE.BoxGeometry(100, 64, 64), new THREE.ConeGeometry(70, 56, 4)], { color: 0xa855f7, opacity: 0.92 });
geo.shape.children[1].position.y = 32 + 28;
geo.shape.children[1].rotation.y = Math.PI / 4;

const matrixText = new VText(scene, { text: '', x: 0, y: -130, z: 0, color: PALETTE.textDim, scale: 0.72 });
const hint = new VText(scene, { text: '点击「运行演示」开始：3D 旋转 + 非均匀缩放', x: 0, y: 230, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');

const ANG = 45, SX = 1.5, SY = 0.8, RAD = ANG * Math.PI / 180;
const m = v => v.toFixed(2);
const updateMatrix = (rad, sx, sy) => {
  matrixText.setText('M = [ ' + m(Math.cos(rad) * sx) + '  ' + m(-Math.sin(rad) * sy) + ' ]   [ ' + m(Math.sin(rad) * sx) + '  ' + m(Math.cos(rad) * sy) + ' ]');
};

function* rs3dGen() {
  yield S(() => { hint.setText('初始：房子未变换，M = I'); updateMatrix(0, 1, 1); });
  yield W(700);
  yield S(() => { hint.setText('施加变换：绕 Z 旋转 ' + ANG + '°，X 缩放 ' + SX + '，Y 缩放 ' + SY + ' —— 非均匀缩放把房子压扁再转'); });
  yield W(700);
  yield A(800, p => {
    const t = easeInOut(p);
    geo.shape.rotation.z = RAD * t;
    geo.shape.scale.set(1 + (SX - 1) * t, 1 + (SY - 1) * t, 1);
  });
  yield S(() => { ripple(scene, 0, 0, 0, PALETTE.highlight, 90); updateMatrix(RAD, SX, SY); });
  yield W(700);
  yield S(() => {
    hint.setText('变换完成：45° 旋转 × (1.5, 0.8) 缩放 —— X 拉伸 Y 压缩，房子形状不再对称');
    status.textContent = 'M = [ ' + m(Math.cos(RAD) * SX) + ' ' + m(-Math.sin(RAD) * SY) + ' ; ' + m(Math.sin(RAD) * SX) + ' ' + m(Math.cos(RAD) * SY) + ' ] —— R·S 复合';
  });
  yield W(1000);
  yield S(() => { hint.setText('M = R·S：先缩放后旋转 —— 非均匀缩放使旋转后的形状发生畸变，2D 矩阵仍适用'); });
  yield W(500);
}

panel.addButton('运行演示', () => engine.start(rs3dGen()));
panel.addButton('清空', () => {
  engine.clear();
  geo.shape.rotation.z = 0;
  geo.shape.scale.set(1, 1, 1);
  updateMatrix(0, 1, 1);
  hint.setText('已清空，可重新运行'); status.textContent = '';
});
panel.addLabel('（拖拽旋转视角，滚轮缩放；紫色房子 = 绕 Z 旋转 45° + X/Y 非均匀缩放的复合变换）');

scene.start(engine);
