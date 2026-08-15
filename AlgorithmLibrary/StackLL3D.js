// AlgorithmLibrary/StackLL3D.js — 链表栈：Top 指针在右端，push 挂右、pop 摘右 —— 单链表天然 LIFO（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('StackLL3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, RED = 0xfb7185, GREEN = 0x4ade80;
const status = panel.addStatus('就绪');
const ease = p => p * p * (3 - 2 * p);

const NODE_X = i => 320 + (i - 2.5) * 104;
const NODE_Y = 620, TOP_Y = 770, DROP_Y = 890;
const VALUES = [5, 3, 8, 1, 7, 4];

// ---- 节点对象池（峰值 5，池 6）：运行期仅改文字/显隐/变色，绝不 new ----
const nodePool = [], nodeFree = [];
for (let i = 0; i < VALUES.length; i++) {
  const vn = new VNode(scene, { radius: 24, x: -600, y: 0, z: 0, label: String(VALUES[i]), color: BLUE, emissive: BLUE });
  vn.mesh.visible = false;
  nodePool.push(vn);
}
nodeFree.push(...nodePool);

const nodes = [];            // { v, vn }：自底向上
const topLbl = new VText(scene, { text: 'Top →', x: 320, y: TOP_Y, z: 0, color: GOLD, scale: 0.55 });
const emptyT = new VText(scene, { text: '空栈', x: 320, y: NODE_Y, z: 0, color: PALETTE.textDim, scale: 0.6 });

let edgeMeshes = [];
function syncEdges() {
  edgeMeshes.forEach(m => { scene.remove(m); m.geometry.dispose(); m.material.dispose(); });
  edgeMeshes = [];
  for (let i = 0; i + 1 < nodes.length; i++) {
    edgeMeshes.push(tubeBetween(scene, { x: NODE_X(i), y: NODE_Y, z: 0 }, { x: NODE_X(i + 1), y: NODE_Y, z: 0 }, { color: PALETTE.edge, opacity: 0.4, radius: 2 }));
  }
}
function relayout() {
  nodes.forEach((n, i) => n.vn.moveTo(NODE_X(i), NODE_Y, 0, 380));
  topLbl.moveTo(nodes.length ? NODE_X(nodes.length - 1) + 110 : 320, TOP_Y, 0, 380);
  emptyT.visible = nodes.length === 0;
  syncEdges();
}
function allocNode(v) {
  const vn = nodeFree.pop();
  vn.setText(String(v));
  vn.setColor(BLUE, BLUE);
  return vn;
}
function setCol(n, c) { n.vn.setColor(c, c); }
function stackVals() { return nodes.map(n => n.v).join(' → ') || '空'; }

function* push(v) {
  const vn = allocNode(v);
  const idx = nodes.length;
  vn.mesh.position.set(NODE_X(idx), DROP_Y, 0);
  vn.mesh.scale.setScalar(0.4);
  vn.mesh.visible = true;
  yield S(() => { status.textContent = 'push(' + v + ')：新节点在 Top 端上方生成，滑落挂链'; });
  yield W(450);
  yield A(420, p => {
    const e = ease(p);
    vn.mesh.position.y = DROP_Y + (NODE_Y - DROP_Y) * e;
    vn.mesh.scale.setScalar(0.4 + 0.6 * e);
  });
  vn.mesh.scale.setScalar(1);
  nodes.push({ v, vn });
  relayout();
  setCol(nodes[nodes.length - 1], GOLD);
  yield S(() => { status.textContent = v + '（金）挂到链右端，Top 指针右移 —— 栈 = ' + stackVals(); });
  yield W(550);
  setCol(nodes[nodes.length - 1], BLUE);
}

function* pop() {
  const { v, vn } = nodes[nodes.length - 1];
  yield S(() => { status.textContent = 'pop()：摘掉 Top 端节点 ' + v + '（红闪）'; });
  setCol(nodes[nodes.length - 1], RED);
  yield W(450);
  yield A(380, p => {
    const e = ease(p);
    vn.mesh.position.y = NODE_Y + (DROP_Y - NODE_Y) * e;
    vn.mesh.scale.setScalar(1 - 0.6 * e);
  });
  vn.mesh.visible = false;
  vn.mesh.scale.setScalar(1);
  nodeFree.push(vn);
  nodes.pop();
  relayout();
  yield S(() => { status.textContent = v + ' 弹出（升空消失），Top 指针左移 —— 栈 = ' + stackVals(); });
  yield W(500);
}

function* runStack() {
  yield S(() => { status.textContent = '链表栈：Top 固定在链右端 —— push 挂右、pop 摘右，单链表天然 LIFO。演示：push 5,3,8,1,7 → pop×2 → push 4 → pop×2'; });
  yield W(700);
  for (const v of [5, 3, 8, 1, 7]) yield* push(v);
  yield S(() => { status.textContent = 'push×5 完成：栈 = ' + stackVals() + '（Top→7）'; });
  yield W(600);
  yield* pop();
  yield* pop();
  yield* push(4);
  yield* pop();
  yield* pop();
  yield S(() => { status.textContent = '链表栈演示完成：push×6 + pop×4，最终栈 = ' + stackVals() + '；push/pop 均 O(1)，链表无容量上限，适合深度不确定的递归模拟'; });
  yield W(800);
}

engine.queue(() => runStack());
panel.addButton('清空', () => {
  engine.clear();
  nodes.forEach(n => { n.vn.mesh.visible = false; n.vn.mesh.scale.setScalar(1); nodeFree.push(n.vn); });
  nodes.length = 0;
  syncEdges();
  topLbl.sprite.position.set(320, TOP_Y, 0);
  emptyT.visible = true;
  status.textContent = '';
});

scene.start(engine);
