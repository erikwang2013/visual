// AlgorithmLibrary/RecFact3D.js
// 递归阶乘：VNode 球递归链自顶向下展开（n=8…n=1），
// 叶子 f(1)=1 后回溯，逐层 VText 飞入 f(k)=…，最终大号结果浮现中央并 pulse。
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, easeInOut } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('RecFact3D');

const scene = new Scene3D('scene', { cameraPos: [0, 220, 640], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const MAXN = 8;
const status = panel.addStatus('');
const objects = [];

function clearAll() {
  for (const o of objects) o.remove();
  objects.length = 0;
  status.textContent = '';
}

function compute() {
  clearAll();
  let n = parseInt(nInput.value, 10);
  if (isNaN(n) || n < 1) n = 6;
  if (n > MAXN) n = MAXN;
  status.textContent = '正在计算 f(' + n + ')…';
  const nodes = [];
  for (let i = 0; i < n; i++) {
    const k = n - i;
    const node = new VNode(scene, { label: 'n=' + k, x: -55 * i, y: 200 - 60 * i, z: 0, radius: 22, color: PALETTE.blue, emissive: PALETTE.blueEmissive });
    node.mesh.scale.setScalar(0.01);
    objects.push(node);
    nodes.push(node);
    C(300, (p) => node.mesh.scale.setScalar(0.01 + 0.99 * easeInOut(p)), () => {});
  }
  const leaf = nodes[n - 1];
  C(500, (p) => {
    leaf.setColor(PALETTE.green, PALETTE.greenEmissive);
    leaf.setText('f(1)=1');
    leaf.mesh.scale.setScalar(1 + 0.25 * Math.sin(p * Math.PI));
  }, () => {});
  let result = 1;
  for (let k = 2; k <= n; k++) {
    result *= k;
    const idx = n - k;
    const nx = -55 * idx, ny = 200 - 60 * idx;
    const t = new VText(scene, { text: 'f(' + k + ') = ' + result, x: nx + 200, y: ny + 10, z: 0, color: PALETTE.text, scale: 1 });
    objects.push(t);
    C(450, (p) => { t.sprite.position.x = nx + 200 - 140 * easeInOut(p); }, () => {});
  }
  const big = new VText(scene, { text: 'f(' + n + ') = ' + result, x: 0, y: -120, z: 0, color: PALETTE.textGlow, scale: 1.9 });
  objects.push(big);
  big.sprite.scale.setScalar(0.01);
  C(500, (p) => { const e = easeInOut(p); big.sprite.scale.set(190 * e, 95 * e, 1); }, () => {});
  C(900, (p) => { const s = 1 + 0.18 * Math.sin(p * Math.PI * 2); big.sprite.scale.set(190 * s, 95 * s, 1); }, () => {});
  status.textContent = '完成: f(' + n + ') = ' + result;
}

let nInput = panel.addInput('n (1-8)', (v) => { if (v) compute(); }, 2);
nInput.value = '6';
panel.addButton('阶乘', compute);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
