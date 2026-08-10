// AlgorithmLibrary/ClosedHashBucket3D.js
// 桶内链闭哈希：10 个固定容量桶 + 桶内链；h(x) = x % 10；无空链指示
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Array3D } from '../3D/modes/Array3D.js';
import { VText, VBox, tubeBetween, easeInOut } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('ClosedHashBucket3D');

const BUCKETS = 10, CAP = 4, STEP = -56, OX = 30;
const scene = new Scene3D('scene', { cameraPos: [0, 220, 640], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const array = new Array3D(scene, { type: 'box', count: BUCKETS, spacing: 78, startY: 60 });
array.create();
const status = panel.addStatus('');
const state = { chains: Array.from({ length: BUCKETS }, () => []) };
const h = (x) => ((x % BUCKETS) + BUCKETS) % BUCKETS;
const bx = (k) => array.xOf(k);
const chainX = (k) => bx(k) + OX;

function makeTube(x1, y1, x2, y2) {
  return tubeBetween(scene, new THREE.Vector3(x1, y1, 0), new THREE.Vector3(x2, y2, 0), { color: PALETTE.edge });
}
function dropTube(m) {
  if (!m) return;
  scene.remove(m);
  if (m.geometry) m.geometry.dispose();
  if (m.material) m.material.dispose();
}
// 连接 prev（null 表示桶槽）到 next 链节点，端点在盒子边缘
function chainTube(k, prev, next) {
  const x = chainX(k);
  const y1 = prev ? prev.box.mesh.position.y - 20 : 35;
  const x1 = prev ? x : bx(k);
  return makeTube(x1, y1, x, next.box.mesh.position.y + 20);
}
function moveXY(sprite, from, to, p) {
  sprite.position.x = from.x + (to.x - from.x) * easeInOut(p);
  sprite.position.y = from.y + (to.y - from.y) * easeInOut(p);
}

function insert(value) {
  const x = parseInt(value);
  if (isNaN(x)) return;
  const k = h(x);
  status.textContent = '插入 ' + x + '：h(x) = ' + x + ' % 10 = ' + k;
  if (state.chains[k].length >= CAP) { status.textContent = '插入 ' + x + '：桶 ' + k + ' 已满'; return; }
  const formula = new VText(scene, { text: 'h(' + x + ') = ' + x + ' % 10 = ' + k, x: 0, y: 175, z: 0, color: PALETTE.textGlow, scale: 1 });
  const tmp = new VText(scene, { text: x, x: 0, y: 230, z: 0, color: PALETTE.text, scale: 1 });
  let from = { x: 0, y: 230 };
  C(420, (p) => moveXY(tmp.sprite, from, { x: bx(k), y: 40 }, p), () => tmp.remove());
  const chain = state.chains[k];
  for (let i = 0; i < chain.length; i++) {
    const box = chain[i].box;
    const to = { x: chainX(k) + 26, y: i * STEP };
    C(300, (p) => moveXY(tmp.sprite, from, to, p), () => {});
    C(120, () => box.setColor(PALETTE.highlight), () => box.setColor(PALETTE.node));
    C(240, () => {}, () => {});
    C(120, () => box.setColor(PALETTE.node), () => box.setColor(PALETTE.highlight));
    from = to;
  }
  const idx = chain.length;
  const box = new VBox(scene, { w: 44, h: 40, d: 30, x: chainX(k), y: idx * STEP, z: 0, label: x, color: PALETTE.node, emissive: PALETTE.nodeEmissive });
  box.mesh.scale.setScalar(0.01);
  const node = { box, val: x, tube: null };
  C(280, (p) => box.mesh.scale.setScalar(0.01 + 0.99 * easeInOut(p)), () => {});
  C(1, () => {
    node.tube = chainTube(k, chain.length ? chain[chain.length - 1] : null, node);
  }, () => {});
  chain.push(node);
  C(60, () => tmp.remove(), () => {});
  C(60, () => formula.remove(), () => {});
}

function del(value) {
  const x = parseInt(value);
  if (isNaN(x)) return;
  const k = h(x);
  status.textContent = '删除 ' + x + '：h(x) = ' + x + ' % 10 = ' + k;
  const formula = new VText(scene, { text: 'h(' + x + ') = ' + x + ' % 10 = ' + k, x: 0, y: 175, z: 0, color: PALETTE.textGlow, scale: 1 });
  const tmp = new VText(scene, { text: x, x: 0, y: 230, z: 0, color: PALETTE.text, scale: 1 });
  let from = { x: 0, y: 230 };
  C(420, (p) => moveXY(tmp.sprite, from, { x: bx(k), y: 40 }, p), () => tmp.remove());
  const chain = state.chains[k];
  let found = -1;
  for (let i = 0; i < chain.length; i++) {
    const box = chain[i].box;
    const to = { x: chainX(k) + 26, y: i * STEP };
    C(300, (p) => moveXY(tmp.sprite, from, to, p), () => {});
    C(120, () => box.setColor(PALETTE.highlight), () => box.setColor(PALETTE.node));
    C(240, () => {}, () => {});
    from = to;
    if (chain[i].val === x) { found = i; break; }
    C(120, () => box.setColor(PALETTE.node), () => box.setColor(PALETTE.highlight));
  }
  if (found < 0) {
    status.textContent = '删除 ' + x + '：未找到';
  } else {
    const node = chain[found];
    const baseY = found * STEP;
    C(380, (p) => {
      node.box.mesh.scale.setScalar(Math.max(0.01, 1 - p));
      node.box.mesh.position.y = baseY - 45 * p;
    }, () => {});
    C(1, () => {
      dropTube(node.tube);
      if (found < chain.length - 1) {
        const next = chain[found + 1];
        dropTube(next.tube);
        next.tube = chainTube(k, found > 0 ? chain[found - 1] : null, next);
      }
      scene.remove(node.box.mesh);
    }, () => {});
    chain.splice(found, 1);
    status.textContent = '删除 ' + x + '：成功';
  }
  C(60, () => tmp.remove(), () => {});
  C(60, () => formula.remove(), () => {});
}

function find(value) {
  const x = parseInt(value);
  if (isNaN(x)) return;
  const k = h(x);
  status.textContent = '查找 ' + x + '：h(x) = ' + x + ' % 10 = ' + k;
  const formula = new VText(scene, { text: 'h(' + x + ') = ' + x + ' % 10 = ' + k, x: 0, y: 175, z: 0, color: PALETTE.textGlow, scale: 1 });
  const tmp = new VText(scene, { text: x, x: 0, y: 230, z: 0, color: PALETTE.text, scale: 1 });
  let from = { x: 0, y: 230 };
  C(420, (p) => moveXY(tmp.sprite, from, { x: bx(k), y: 40 }, p), () => tmp.remove());
  const chain = state.chains[k];
  let found = -1;
  for (let i = 0; i < chain.length; i++) {
    const box = chain[i].box;
    const to = { x: chainX(k) + 26, y: i * STEP };
    C(300, (p) => moveXY(tmp.sprite, from, to, p), () => {});
    C(120, () => box.setColor(PALETTE.highlight), () => box.setColor(PALETTE.node));
    C(240, () => {}, () => {});
    from = to;
    if (chain[i].val === x) { found = i; break; }
    C(120, () => box.setColor(PALETTE.node), () => box.setColor(PALETTE.highlight));
  }
  if (found >= 0) {
    C(120, () => chain[found].box.setColor(PALETTE.node), () => {});
    status.textContent = '查找 ' + x + '：找到（第 ' + (found + 1) + ' 个节点）';
  } else {
    status.textContent = '查找 ' + x + '：未找到';
  }
  C(60, () => tmp.remove(), () => {});
  C(60, () => formula.remove(), () => {});
}

let input = panel.addInput('值', (v) => { if (v) insert(v.trim()); }, 6);
panel.addButton('插入', () => { if (input.value) insert(input.value.trim()); });
panel.addButton('删除', () => { if (input.value) del(input.value.trim()); });
panel.addButton('查找', () => { if (input.value) find(input.value.trim()); });
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
