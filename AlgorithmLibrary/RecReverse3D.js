// AlgorithmLibrary/RecReverse3D.js
// 递归逆转：输入串字符排成一行 VBox，右侧 VNode 栈显示调用帧 rev(s[0..])…rev(s[n-1..])，
// 回溯时字符依次飞到反转后的位置，最终 VText 显示结果。
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VBox, VText, easeInOut } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
import { pop, spark } from '../3D/effects/Fx.js';
applyTheme('RecReverse3D');

const scene = new Scene3D('scene', { cameraPos: [0, 220, 640], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const MAXLEN = 6;
const status = panel.addStatus('');
const objects = [];

function clearAll() {
  for (const o of objects) o.remove();
  objects.length = 0;
  status.textContent = '';
}

function reverse() {
  clearAll();
  let s = input.value.trim();
  if (s.length < 2) { status.textContent = '请输入至少 2 个字符'; return; }
  if (s.length > MAXLEN) s = s.slice(0, MAXLEN);
  const n = s.length;
  status.textContent = '正在反转 "' + s + '"…';
  const startX = -(n - 1) * 35;
  const chars = [];
  for (let i = 0; i < n; i++) {
    const box = new VBox(scene, { w: 52, h: 52, d: 52, x: startX + i * 70, y: 80, z: 0, label: s[i], color: PALETTE.blue, emissive: PALETTE.blueEmissive });
    box.mesh.scale.setScalar(0.01);
    objects.push(box);
    chars.push(box);
    let fxBox = false;
    C(250, (p) => { if (!fxBox) { fxBox = true; pop(scene, box.mesh); } box.mesh.scale.setScalar(0.01 + 0.99 * easeInOut(p)); }, () => {});
  }
  const frames = [];
  for (let i = 0; i < n; i++) {
    const node = new VNode(scene, { label: 'rev(' + s.slice(i) + ')', x: 275, y: 150 - i * 75, z: 0, radius: 20, color: PALETTE.blue, emissive: PALETTE.blueEmissive });
    node.mesh.scale.setScalar(0.01);
    objects.push(node);
    frames.push(node);
    let fxNode = false;
    C(250, (p) => { if (!fxNode) { fxNode = true; pop(scene, node.mesh); } node.mesh.scale.setScalar(0.01 + 0.99 * easeInOut(p)); }, () => {});
  }
  for (let i = n - 1; i >= 0; i--) {
    const inX = startX + i * 70;
    const outX = startX + (n - 1 - i) * 70;
    const box = chars[i];
    let fxFly = false, fxCommit = false;
    C(400, (p) => {
      if (p >= 1 && !fxFly) { fxFly = true; spark(scene, outX, 80, 0, PALETTE.green, 5); }
      const e = easeInOut(p);
      box.mesh.position.x = inX + (outX - inX) * e;
      box.mesh.position.y = 80 - 160 * e;
      box.mesh.position.z = 50 * Math.sin(e * Math.PI);
    }, () => { box.mesh.position.x = inX; box.mesh.position.y = 80; box.mesh.position.z = 0; });
    C(200, (p) => frames[i].mesh.scale.setScalar(1 - 0.9 * easeInOut(p)), () => {});
    C(1, () => frames[i].remove(), () => {});
    C(1, () => { if (!fxCommit) { fxCommit = true; spark(scene, box.mesh.position.x, box.mesh.position.y, box.mesh.position.z, PALETTE.green, 4); } box.setColor(PALETTE.green, PALETTE.greenEmissive); }, () => box.setColor(PALETTE.blue, PALETTE.blueEmissive));
  }
  const res = s.split('').reverse().join('');
  const t = new VText(scene, { text: '反转结果: ' + res, x: 0, y: -170, z: 0, color: PALETTE.textGlow, scale: 1.2 });
  objects.push(t);
  t.sprite.scale.setScalar(0.01);
  C(450, (p) => { const e = easeInOut(p); t.sprite.scale.set(120 * e, 60 * e, 1); }, () => {});
  status.textContent = '完成: "' + s + '" → "' + res + '"';
}

let input = panel.addInput('字符串 (≥2, ≤6)', (v) => { if (v.trim().length >= 2) reverse(); }, 6);
panel.addButton('逆转', () => { if (input.value.trim()) reverse(); });
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
