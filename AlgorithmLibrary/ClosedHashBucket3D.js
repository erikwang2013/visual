// AlgorithmLibrary/ClosedHashBucket3D.js — 桶内链闭哈希：10 桶（CAP=4）桶满拒绝；h(x)=x%10；链长有界最坏 O(CAP)（function* 生成器驱动，解说入状态栏）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('ClosedHashBucket3D');

const BUCKETS = 10, CAP = 4, STEP = -56, OX = 30;
const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const CYAN = 0x67e8f9, GREEN = 0x4ade80, ROSE = 0xfb7185;
const E = p => p * p * (3 - 2 * p);
const status = panel.addStatus('就绪');

const buckets = [...Array(BUCKETS)].map((_, i) =>
  new VBox(scene, { w: 50, h: 50, d: 30, x: (i - 4.5) * 78 + 360, y: 360, z: 0, label: String(i), color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
const bx = i => (i - 4.5) * 78 + 360;
const chainX = k => bx(k) + OX;
const h = x => ((x % BUCKETS) + BUCKETS) % BUCKETS;
const chains = Array.from({ length: BUCKETS }, () => []);

// ---- 对象池：链节点盒（峰值 4）+ 连接管（峰值 4），模块级预建 ----
const nodePool = [], nodeFree = [];
function mkNode() {
  const v = new VBox(scene, { w: 44, h: 40, d: 30, x: 0, y: 0, z: 0, label: '', color: PALETTE.node, emissive: PALETTE.nodeEmissive });
  v.mesh.visible = false;
  v.mesh.scale.setScalar(0.01);
  nodePool.push(v);
  return v;
}
const tubePool = [], tubeFree = [];
function mkTube() {
  const pts = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const curve = new THREE.CatmullRomCurve3(pts);
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 8, 2.5, 6), new THREE.MeshBasicMaterial({ color: PALETTE.edge, transparent: true, opacity: 0.55 }));
  tube.visible = false;
  scene.add(tube);
  const t = { tube, curve, pts };
  tubePool.push(t);
  return t;
}
function resetPools() {
  nodeFree.length = 0; nodeFree.push(...nodePool);
  tubeFree.length = 0; tubeFree.push(...tubePool);
  nodePool.forEach(v => { v.mesh.visible = false; v.mesh.scale.setScalar(0.01); });
  tubePool.forEach(t => t.tube.visible = false);
}
function setTube(t, x1, y1, x2, y2) {
  t.pts[0].set(x1, y1, 0);
  t.pts[1].set((x1 + x2) / 2, (y1 + y2) / 2, 14);
  t.pts[2].set(x2, y2, 0);
  t.tube.geometry.dispose();
  t.tube.geometry = new THREE.TubeGeometry(t.curve, 8, 2.5, 6);
  t.tube.visible = true;
}
function chainTube(k, prev, next) {
  const x = chainX(k);
  const y1 = prev ? prev.mesh.position.y - 20 : 335;
  const x1 = prev ? x : bx(k);
  const t = tubeFree.pop();
  setTube(t, x1, y1, x, next.mesh.position.y + 20);
  return t;
}
function resetAll() {
  resetPools();
  for (const ch of chains) ch.length = 0;
  for (let k = 0; k < BUCKETS; k++) buckets[k].setColor(PALETTE.node, PALETTE.nodeEmissive);
}

function* addNode(k, x) {
  const idx = chains[k].length;
  const v = nodeFree.pop();
  v.mesh.position.set(chainX(k), 360 + idx * STEP, 0);
  v.setText(String(x));
  v.mesh.visible = true;
  v.mesh.scale.setScalar(0.01);
  yield A(200, p => v.mesh.scale.setScalar(0.01 + 0.99 * E(p)));
  v.tube = chainTube(k, idx ? chains[k][idx - 1] : null, v);
  chains[k].push(v);
}
function* walkChain(k, x) {
  let found = -1;
  for (let i = 0; i < chains[k].length; i++) {
    const node = chains[k][i];
    yield S(() => { node.setColor(CYAN, CYAN); status.textContent = '查找 ' + x + '：桶 ' + k + ' 链第 ' + (i + 1) + ' 个 ' + node.text + (node.text === String(x) ? ' = 目标！' : ' ≠ ' + x + '，继续'); });
    yield W(300);
    if (node.text === String(x)) { found = i; break; }
    yield S(() => node.setColor(PALETTE.node, PALETTE.nodeEmissive));
    yield W(120);
  }
  return found;
}

function* closedBucketGen() {
  resetAll();
  yield S(() => { status.textContent = '桶内链闭哈希：h(x) = x % 10；每桶容量 CAP = 4，桶满拒绝 — 链长有界，最坏查找 O(CAP)'; });
  yield W(400);
  for (const x of [25, 35, 45, 55]) {
    const k = h(x);
    yield S(() => { buckets[k].setColor(CYAN, CYAN); status.textContent = '插入 ' + x + '：h(' + x + ') = ' + k + ' → 桶 ' + k + '（' + chains[k].length + '/4），挂到链尾'; });
    yield W(350);
    yield* addNode(k, x);
    yield S(() => buckets[k].setColor(PALETTE.node, PALETTE.nodeEmissive));
    yield W(150);
  }
  yield S(() => { buckets[5].setColor(ROSE, ROSE); status.textContent = '插入 65：h(65) = 5 → 桶 5 已满 4/4，拒绝！固定容量桶没有溢出余地'; });
  yield W(500);
  yield S(() => { buckets[5].setColor(CYAN, CYAN); status.textContent = '查找 45：h(45) = 5 → 沿桶 5 链逐个比较（最多 4 步，链长有界）'; });
  yield W(350);
  const fi = yield* walkChain(5, 45);
  yield S(() => { chains[5][fi].setColor(GREEN, GREEN); status.textContent = '桶 5 第 ' + (fi + 1) + ' 个 = 45，命中！最坏查找时间 O(CAP = 4)'; });
  yield W(450);
  yield S(() => chains[5][fi].setColor(PALETTE.node, PALETTE.nodeEmissive));
  yield W(150);
  yield S(() => { buckets[5].setColor(CYAN, CYAN); status.textContent = '删除 35：h(35) = 5 → 摘掉链中节点，前后节点重连'; });
  yield W(400);
  const di = chains[5].findIndex(n => n.text === '35');
  const node = chains[5][di];
  const baseY = node.mesh.position.y;
  yield A(350, p => {
    node.mesh.scale.setScalar(Math.max(0.01, 1 - p));
    node.mesh.position.y = baseY - 45 * p;
  });
  yield S(() => {
    node.tube.tube.visible = false; tubeFree.push(node.tube);
    if (di < chains[5].length - 1) {
      const next = chains[5][di + 1];
      next.tube.tube.visible = false; tubeFree.push(next.tube);
      next.tube = chainTube(5, di > 0 ? chains[5][di - 1] : null, next);
    }
    node.mesh.visible = false; nodeFree.push(node);
    chains[5].splice(di, 1);
    buckets[5].setColor(PALETTE.node, PALETTE.nodeEmissive);
    status.textContent = '35 已摘除：链重连为 25 → 45 → 55 — 桶内链删除是局部重连';
  });
  yield W(450);
  yield S(() => { status.textContent = '桶内链闭哈希演示完成：桶 5 链 25 → 45 → 55（3/4）；65 因桶满被拒，删除 35 局部重连；链长有界最坏 O(CAP = 4)'; });
  yield W(700);
}

for (let i = 0; i < 6; i++) mkNode();
for (let i = 0; i < 6; i++) mkTube();
resetPools();
engine.queue(() => closedBucketGen());
panel.addButton('清空', () => { engine.clear(); resetAll(); status.textContent = ''; });

scene.start(engine);
