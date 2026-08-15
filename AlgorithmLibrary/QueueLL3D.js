// AlgorithmLibrary/QueueLL3D.js — 链表队列：Head 出队、Tail 入队 —— 两个指针一出一进，链式无容量限制（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('QueueLL3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, RED = 0xfb7185, CYAN = 0x22d3ee;
const status = panel.addStatus('就绪');

const ROW_Y = 430;
const NODE_X = i => 120 + i * 96;

// ---- 对象池：6 节点（峰值 5）+ 5 条等长边管（峰值 4），模块级预建 ----
const nodeFree = [];
for (let i = 0; i < 6; i++) {
  const vn = new VNode(scene, { radius: 22, x: 0, y: 0, z: 0, label: '', color: BLUE, emissive: BLUE });
  vn.mesh.visible = false;
  nodeFree.push({ v: 0, vn });
}
const edgeFree = [];
for (let i = 0; i < 5; i++) {
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(96, 0, 0)]);
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 2, 2, 6), new THREE.MeshBasicMaterial({ color: PALETTE.edge, transparent: true, opacity: 0.4 }));
  m.visible = false;
  scene.add(m);
  edgeFree.push(m);
}

const nodes = [];
const headLbl = new VText(scene, { text: 'Head →', x: 30, y: 540, z: 0, color: CYAN, scale: 0.55 });
const tailLbl = new VText(scene, { text: 'Tail →', x: 30, y: 300, z: 0, color: GOLD, scale: 0.55 });
const emptyT = new VText(scene, { text: '空队列', x: 320, y: ROW_Y, z: 0, color: PALETTE.textDim, scale: 0.6 });

function relayout() {
  nodes.forEach((n, i) => n.vn.moveTo(NODE_X(i), ROW_Y, 0, 380));
  headLbl.moveTo(nodes.length ? NODE_X(0) - 90 : 30, 540, 0, 380);
  tailLbl.moveTo(nodes.length ? NODE_X(nodes.length - 1) + 100 : 30, 300, 0, 380);
  emptyT.sprite.visible = nodes.length === 0;
  edgeFree.forEach(m => { m.visible = false; });
  for (let i = 0; i + 1 < nodes.length; i++) {
    const m = edgeFree[i];
    m.position.set(NODE_X(i), ROW_Y, 0);
    m.visible = true;
  }
}
function queueVals() { return nodes.map(n => n.v).join(' → ') || '空'; }

function* enqueue(v) {
  const n = nodeFree.pop();
  n.v = v;
  n.vn.setText(String(v));
  n.vn.setColor(BLUE, BLUE);
  n.vn.mesh.position.set(560, ROW_Y, 0);
  n.vn.mesh.visible = true;
  yield S(() => { status.textContent = '入队 ' + v + '：新节点在 Tail 端生成（从右侧入场）'; });
  yield W(500);
  nodes.push(n);
  relayout();
  n.vn.setColor(GOLD, GOLD);
  yield S(() => { status.textContent = '入队完成：' + v + '（金）挂到链尾，Tail 指针右移 —— 队 = ' + queueVals(); });
  yield W(550);
  n.vn.setColor(BLUE, BLUE);
}

function* dequeue() {
  yield S(() => { status.textContent = '出队：取 Head 端节点 ' + nodes[0].v + '（红）'; });
  yield W(450);
  const n = nodes[0];
  n.vn.setColor(RED, RED);
  yield W(500);
  nodes.shift();
  n.vn.mesh.visible = false;
  nodeFree.push(n);
  relayout();
  yield S(() => { status.textContent = n.v + ' 出队，Head 指针右移 —— 队 = ' + queueVals(); });
  yield W(500);
}

function* runQueue() {
  yield S(() => { status.textContent = '链表队列：Head 出 / Tail 入，链式结构无容量上限，两端操作均 O(1)；演示：入队 5,3,8,1,7 → 出队×2 → 入队 4 → 出队'; });
  yield W(700);
  for (const v of [5, 3, 8, 1, 7]) yield* enqueue(v);
  yield S(() => { status.textContent = '入队 ×5 完成：队 = ' + queueVals() + '（Head→5, Tail→7）'; });
  yield W(800);
  yield* dequeue();
  yield* dequeue();
  yield* enqueue(4);
  yield* dequeue();
  yield S(() => { status.textContent = '复杂度：入队/出队 O(1)，仅改 Head/Tail 指针无需移动元素 —— 链表队列是无界场景下优于数组环形缓冲的选择'; });
  yield W(1000);
  yield S(() => { status.textContent = '链表队列演示完成：入队 ×6 + 出队 ×3，最终队 = ' + queueVals() + '；入队/出队均 O(1)'; });
  yield W(600);
}

engine.queue(() => runQueue());
panel.addButton('清空', () => { engine.clear(); nodes.forEach(n => { n.vn.mesh.visible = false; nodeFree.push(n); }); nodes.length = 0; relayout(); status.textContent = ''; });

scene.start(engine);
