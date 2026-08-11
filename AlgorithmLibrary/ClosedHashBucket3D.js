// AlgorithmLibrary/ClosedHashBucket3D.js — 桶内链闭哈希：10 个固定容量桶（CAP=4）+ 桶内链；h(x)=x%10；桶满拒绝（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, tubeBetween, easeInOut } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('ClosedHashBucket3D');

const BUCKETS = 10, CAP = 4, STEP = -56, OX = 30;
const scene = new Scene3D('scene', { cameraPos: [0, 220, 640], fov: 55 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const CYAN = 0x67e8f9, GREEN = 0x4ade80, ROSE = 0xfb7185, GOLD = 0xfcd34d;
const hint = new VText(scene, { text: '点击「运行演示」开始：桶内链闭哈希', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');

const buckets = [...Array(BUCKETS)].map((_, i) =>
  new VBox(scene, { w: 50, h: 50, d: 30, x: (i - 4.5) * 78, y: 60, z: 0, label: '', color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
const bx = i => (i - 4.5) * 78;
const chainX = k => bx(k) + OX;
const h = x => ((x % BUCKETS) + BUCKETS) % BUCKETS;
const chains = Array.from({ length: BUCKETS }, () => []);
new VText(scene, { text: '桶内链：每桶容量固定 CAP = 4，桶满时新 key 被拒绝（需扩容/二次散列）', x: 0, y: 150, z: 0, color: PALETTE.textDim, scale: 0.7 });
const eqT = new VText(scene, { text: '', x: 0, y: 178, z: 0, color: PALETTE.textGlow, scale: 0.8 });
const stepT = new VText(scene, { text: '', x: 0, y: -140, z: 0, color: PALETTE.textGlow, scale: 0.72 });

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
  const y1 = prev ? prev.mesh.position.y - 20 : 35;
  const x1 = prev ? x : bx(k);
  return makeTube(x1, y1, x, next.mesh.position.y + 20);
}
function resetAll() {
  for (const ch of chains) {
    for (const node of ch) { node.remove(); dropTube(node.tube); }
    ch.length = 0;
  }
  for (let k = 0; k < BUCKETS; k++) { buckets[k].setText(''); buckets[k].setColor(PALETTE.node, PALETTE.nodeEmissive); }
  eqT.setText(''); stepT.setText('');
}
function* addNode(k, x) {
  const idx = chains[k].length;
  const node = new VBox(scene, { w: 44, h: 40, d: 30, x: chainX(k), y: 60 + idx * STEP, z: 0, label: x, color: PALETTE.node, emissive: PALETTE.nodeEmissive });
  node.mesh.scale.setScalar(0.01);
  yield A(200, p => node.mesh.scale.setScalar(0.01 + 0.99 * easeInOut(p)));
  node.tube = chainTube(k, idx ? chains[k][idx - 1] : null, node);
  chains[k].push(node);
}
function* walkChain(k, x) {
  let found = -1;
  for (let i = 0; i < chains[k].length; i++) {
    const node = chains[k][i];
    yield S(() => { node.setColor(CYAN, CYAN); stepT.setText('桶 ' + k + ' 链第 ' + (i + 1) + ' 个：' + node.text + ' ' + (node.text === x ? '= 目标！' : '≠ ' + x + '，继续')); });
    yield W(300);
    if (node.text === x) { found = i; break; }
    yield S(() => node.setColor(PALETTE.node, PALETTE.nodeEmissive));
    yield W(120);
  }
  return found;
}

function* closedBucketGen() {
  resetAll();
  yield S(() => hint.setText('桶内链闭哈希：h(x) = x % 10；每桶固定容量 4，桶满拒绝 — 与纯链地址不同，链长有上限'));
  yield S(() => { stepT.setText('往桶 5 连插 25、35、45、55：链依次长到 1、2、3、4（容量满）'); });
  yield W(350);
  for (const x of [25, 35, 45, 55]) {
    const k = h(x);
    yield S(() => { eqT.setText('h(' + x + ') = ' + x + ' % 10 = ' + k); buckets[k].setColor(CYAN, CYAN); stepT.setText('插入 ' + x + ' → 桶 ' + k + '（' + chains[k].length + '/4），挂到链尾'); });
    yield W(350);
    yield* addNode(k, x);
    yield S(() => { buckets[k].setColor(PALETTE.node, PALETTE.nodeEmissive); });
    yield W(150);
  }
  yield S(() => { eqT.setText('h(65) = 5'); buckets[5].setColor(ROSE, ROSE); stepT.setText('插入 65：桶 5 已满 4/4 → 拒绝！固定容量桶没有溢出余地'); });
  yield W(500);
  yield S(() => { buckets[5].setColor(PALETTE.node, PALETTE.nodeEmissive); eqT.setText('h(45) = 5'); buckets[5].setColor(CYAN, CYAN); stepT.setText('查找 45：先到桶 5，沿链逐个比较（最多 4 步，链长有界）'); });
  yield W(350);
  const fi = yield* walkChain(5, 45);
  yield S(() => { chains[5][fi].setColor(GREEN, GREEN); stepT.setText('桶 5 第 ' + (fi + 1) + ' 个 = 45，命中！链长上限保证了最坏查找时间 O(CAP)'); });
  yield W(450);
  yield S(() => { chains[5][fi].setColor(PALETTE.node, PALETTE.nodeEmissive); buckets[5].setColor(PALETTE.node, PALETTE.nodeEmissive); });
  yield S(() => { eqT.setText('h(35) = 5'); buckets[5].setColor(CYAN, CYAN); stepT.setText('删除 35：摘掉链中节点，前后节点重连'); });
  yield W(400);
  const di = chains[5].findIndex(n => n.text === 35);
  const node = chains[5][di];
  const baseY = node.mesh.position.y;
  yield A(350, p => {
    node.mesh.scale.setScalar(Math.max(0.01, 1 - p));
    node.mesh.position.y = baseY - 45 * p;
  });
  yield S(() => {
    dropTube(node.tube);
    if (di < chains[5].length - 1) {
      const next = chains[5][di + 1];
      dropTube(next.tube);
      next.tube = chainTube(5, di > 0 ? chains[5][di - 1] : null, next);
    }
    node.remove();
    chains[5].splice(di, 1);
    buckets[5].setColor(PALETTE.node, PALETTE.nodeEmissive);
    stepT.setText('35 已摘除：链重连为 25 → 45 → 55 — 桶内链删除是局部重连');
  });
  yield W(450);
  yield S(() => {
    status.textContent = '桶内链完成：桶5 链 25→45→55（3/4）— 65 因桶满被拒绝，删除 35 局部重连';
    hint.setText('固定容量桶的取舍：链长有界 → 最坏查找 O(CAP)；代价是桶满需策略（扩容/二次散列/溢出区）— Redis 字典即为此类');
  });
  yield W(700);
}

panel.addButton('运行演示', () => engine.start(closedBucketGen()));
panel.addButton('清空', () => { engine.clear(); resetAll(); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；青 = 当前桶/节点，绿 = 命中，红 = 桶满拒绝，节点沿竖直链向下挂）');

scene.start(engine);
