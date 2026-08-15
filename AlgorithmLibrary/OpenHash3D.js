// AlgorithmLibrary/OpenHash3D.js — 开放哈希（链地址法）：10 桶 + 桶内链；h(x)=x%10；冲突挂链不搬家（function* 生成器驱动，解说入状态栏）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('OpenHash3D');

const BUCKETS = 10, STEP = -56, OX = 30;
const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const CYAN = 0x67e8f9, GREEN = 0x4ade80;
const status = panel.addStatus('就绪');
const E = p => p * p * (3 - 2 * p);

const buckets = [...Array(BUCKETS)].map((_, i) =>
  new VBox(scene, { w: 50, h: 50, d: 30, x: (i - 4.5) * 78 + 360, y: 460, z: 0, label: '', color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
const bx = i => (i - 4.5) * 78 + 360;
const chainX = k => bx(k) + OX;
const h = x => ((x % BUCKETS) + BUCKETS) % BUCKETS;
const nullTexts = [...Array(BUCKETS)].map((_, k) =>
  new VText(scene, { text: '/', x: bx(k), y: 388, z: 0, color: PALETTE.textDim, scale: 0.8 }));

// 链节点对象池：模块级预建（演示最多 5 个节点），运行期仅换标签/移动/显隐
const pool = [...Array(5)].map(() =>
  new VBox(scene, { w: 44, h: 40, d: 30, x: 0, y: 0, z: 0, label: '', color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
pool.forEach(n => { n.mesh.visible = false; n.tube = null; });
const freeIdx = [...Array(5).keys()].reverse();
const chains = Array.from({ length: BUCKETS }, () => []);

function makeTube(x1, y1, x2, y2) {
  return tubeBetween(scene, new THREE.Vector3(x1, y1, 0), new THREE.Vector3(x2, y2, 0), { color: PALETTE.edge });
}
function dropTube(m) {
  if (!m) return;
  scene.remove(m);
  if (m.geometry) m.geometry.dispose();
  if (m.material) m.material.dispose();
}
function chainTube(k, prev, next) {
  const x = chainX(k);
  const y1 = prev ? prev.mesh.position.y - 20 : 435;
  const x1 = prev ? x : bx(k);
  return makeTube(x1, y1, x, next.mesh.position.y + 20);
}
function resetAll() {
  chains.forEach((ch, k) => {
    for (const n of ch) { dropTube(n.tube); n.mesh.visible = false; }
    ch.length = 0;
    buckets[k].setText(''); buckets[k].setColor(PALETTE.node, PALETTE.nodeEmissive);
    nullTexts[k].sprite.visible = true;
  });
  freeIdx.length = 0; freeIdx.push(...[...Array(5).keys()].reverse());
}
function takeNode(x, k, idx) {
  const n = pool[freeIdx.pop()];
  n.mesh.visible = true;
  n.mesh.scale.setScalar(0.01);
  n.mesh.position.set(chainX(k), 460 + idx * STEP, 0);
  n.setText(x);
  n.setColor(PALETTE.node, PALETTE.nodeEmissive);
  return n;
}
function freeNode(n) {
  dropTube(n.tube); n.tube = null;
  n.mesh.visible = false;
  freeIdx.push(pool.indexOf(n));
}
function* addNode(k, x) {
  const idx = chains[k].length;
  const node = takeNode(x, k, idx);
  yield A(200, p => node.mesh.scale.setScalar(0.01 + 0.99 * E(p)));
  node.tube = chainTube(k, idx ? chains[k][idx - 1] : null, node);
  if (idx === 0) nullTexts[k].sprite.visible = false;
  chains[k].push(node);
}
function* delNode(k, node) {
  const di = chains[k].indexOf(node);
  const baseY = node.mesh.position.y;
  yield A(350, p => {
    node.mesh.scale.setScalar(Math.max(0.01, 1 - p));
    node.mesh.position.y = baseY - 45 * p;
  });
  node.mesh.scale.setScalar(1);
  if (di < chains[k].length - 1) {
    const next = chains[k][di + 1];
    dropTube(next.tube);
    next.tube = chainTube(k, di > 0 ? chains[k][di - 1] : null, next);
  }
  chains[k].splice(di, 1);
  freeNode(node);
  if (chains[k].length === 0) nullTexts[k].sprite.visible = true;
}
function* walkChain(k, x) {
  let found = -1;
  for (let i = 0; i < chains[k].length; i++) {
    const node = chains[k][i];
    yield S(() => { node.setColor(CYAN, CYAN); status.textContent = '链 ' + k + ' 第 ' + (i + 1) + ' 个：' + node.text + (node.text === x ? ' = 目标！' : ' ≠ ' + x + '，继续'); });
    yield W(300);
    if (node.text === x) { found = i; break; }
    yield S(() => node.setColor(PALETTE.node, PALETTE.nodeEmissive));
    yield W(120);
  }
  return found;
}

function* openHashGen() {
  resetAll();
  yield S(() => { status.textContent = '链地址哈希：h(x) = x % 10，冲突元素同桶挂链。依次插入 25、35、45 → 桶 5；18、28 → 桶 8'; });
  yield W(500);
  for (const x of [25, 35, 45, 18, 28]) {
    const k = h(x);
    yield S(() => { buckets[k].setColor(CYAN, CYAN); status.textContent = '插入 ' + x + '：h(' + x + ') = ' + x + ' % 10 = ' + k + ' → 桶 ' + k + ' 挂到链尾'; });
    yield W(350);
    yield* addNode(k, x);
    yield S(() => { buckets[k].setColor(PALETTE.node, PALETTE.nodeEmissive); status.textContent = x + ' 已挂入桶 ' + k + '，链长 ' + chains[k].length; });
    yield W(150);
  }
  yield S(() => { buckets[5].setColor(CYAN, CYAN); status.textContent = '查找 35：h(35) = 5 → 桶 5，沿链逐个比较'; });
  yield W(350);
  const fi = yield* walkChain(5, 35);
  yield S(() => { chains[5][fi].setColor(GREEN, GREEN); status.textContent = '桶 5 第 ' + (fi + 1) + ' 个节点 = 35，命中！链内比较只走 ' + (fi + 1) + ' 步'; });
  yield W(450);
  yield S(() => { chains[5][fi].setColor(PALETTE.node, PALETTE.nodeEmissive); buckets[5].setColor(PALETTE.node, PALETTE.nodeEmissive); status.textContent = '删除 45：h(45) = 5 → 直接摘掉链尾节点，无需墓碑'; });
  yield W(400);
  yield* delNode(5, chains[5][chains[5].length - 1]);
  yield S(() => { status.textContent = '45 已摘除：桶 5 链重连为 25 → 35 — 删除是局部操作，其余节点不受影响'; });
  yield W(450);
  yield S(() => { status.textContent = '链地址演示完成：桶 5 链 25→35，桶 8 链 18→28 — 冲突挂链不搬家，删除无需墓碑；查找 O(1+α)，α = 5/10 = 0.5'; });
  yield W(700);
}

engine.queue(() => openHashGen());
panel.addButton('清空', () => { engine.clear(); resetAll(); status.textContent = ''; });
scene.start(engine);
