// AlgorithmLibrary/RotateScale2D3D.js — 2D 旋转+缩放：五边形绕 z 轴旋转 45° 并放大 1.5 倍 —— A() 插值动画 + 2x2 矩阵文本实时更新（function* 生成器驱动，矩阵元素运行时计算）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Geometry3D } from '../3D/modes/Geometry3D.js';
import { VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
import { ripple } from '../3D/effects/Fx.js';
applyTheme('RotateScale2D3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const geo = new Geometry3D(scene, { axisLen: 150, x: 320, y: 360 });
const ANGLE = 45, SCALE = 1.5, RAD = ANGLE * Math.PI / 180;
const penta = new THREE.Shape();
for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 - Math.PI / 2; const x = Math.cos(a) * 48, y = Math.sin(a) * 48; i === 0 ? penta.moveTo(x, y) : penta.lineTo(x, y); }
penta.closePath();
geo.addShape(new THREE.ShapeGeometry(penta), { color: 0xa855f7, opacity: 0.92 });
geo.shape.position.set(320, 360, 0);

const matrixText = new VText(scene, { text: '', x: 0, y: 150, z: 0, color: PALETTE.textDim, scale: 0.75 });
const status = panel.addStatus('就绪');
const E = p => p * p * (3 - 2 * p);

const m = v => v.toFixed(2);
const updateMatrix = (angleDeg, s) => {
  const r = angleDeg * Math.PI / 180;
  matrixText.setText('M = R·S = [ ' + m(Math.cos(r) * s) + '  ' + m(-Math.sin(r) * s) + ' ;  ' + m(Math.sin(r) * s) + '  ' + m(Math.cos(r) * s) + ' ]');
};
const e1 = { x: Math.cos(RAD) * SCALE, y: Math.sin(RAD) * SCALE };

function* rs2dGen() {
  yield S(() => { updateMatrix(0, 1); status.textContent = '初始矩阵 M = I（单位阵），五边形保持原状'; });
  yield W(700);
  yield S(() => { status.textContent = '施加变换：旋转 ' + ANGLE + '°，缩放 ' + SCALE + ' 倍，矩阵元素由角度与缩放实时算出'; });
  yield W(700);
  yield A(750, p => {
    const t = E(p);
    geo.shape.rotation.z = RAD * t;
    const s = 1 + (SCALE - 1) * t;
    geo.shape.scale.set(s, s, 1);
  });
  yield S(() => { ripple(scene, 320, 360, 0, PALETTE.highlight, 90); updateMatrix(ANGLE, SCALE); status.textContent = '变换完成：对角元 = s·cosθ，交叉元 = ∓s·sinθ'; });
  yield W(900);
  yield S(() => { status.textContent = '单位向量 (1,0) → (' + e1.x.toFixed(2) + ', ' + e1.y.toFixed(2) + ')：旋转 + 缩放同时作用'; });
  yield W(900);
  yield S(() => { status.textContent = '旋转缩放演示完成：θ=' + ANGLE + '°，s=' + SCALE + '，(1,0) → (' + e1.x.toFixed(2) + ', ' + e1.y.toFixed(2) + ')，2×2 复合矩阵每次变换 O(1)'; });
  yield W(800);
}

engine.queue(() => rs2dGen());
panel.addButton('清空', () => {
  engine.clear();
  geo.shape.rotation.z = 0;
  geo.shape.scale.set(1, 1, 1);
  updateMatrix(0, 1);
  status.textContent = '';
});

scene.start(engine);
