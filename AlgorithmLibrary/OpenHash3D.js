// AlgorithmLibrary/OpenHash3D.js — 开放哈希（链地址法）：10 桶 + 桶内链；h(x)=x%10；冲突挂链不搬家（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, tubeBetween, easeInOut } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('OpenHash3D');

const BUCKETS = 10, STEP = -56, OX = 30;
const scene = new Scene3D('scene', { cameraPos: [0, 220, 640], fov: 55 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const CYAN = 0x67e8f9, GREEN = 0x4ade80, GOLD = 0xfcd34d, ROSE = 0xfb7185;
const hint = new VText(scene, { text: '点击「运行演示」开始：链地址哈希', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');

const buckets = [...Array(BUCKETS)].map((_, i) =>
  new VBox(scene, { w: 50, h: 50, d: 30, x: (i - 4.5) * 78, y: 60, z: 0, label: '', color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
const bx = i => (i - 4.5) * 78;
const chainX = k => bx(k) + OX;
const h = x => ((x % BUCKETS) + BUCKETS) % BUCKETS;
const chains = Array.from({ length: BUCKETS }, () => []);
const nullTexts = [...Array(BUCKETS)].map((_, k) =>
  new VText(scene, { text: '/', x: bx(k), y: 0, z: 0, color: PALETTE.textDim, scale: 0.8 }));
new VText(scene, { text: '链地址：冲突的元素在同一桶下挂成链表 — 查找只在链内线性走 O(1+α)', x: 0, y: 150, z: 0, color: PALETTE.textDim, scale: 0.7 });
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
  for (let k = 0; k < BUCKETS; k++) {
    buckets[k].setText(''); buckets[k].setColor(PALETTE.node, PALETTE.nodeEmissive);
    if (!nullTexts[k].sprite) {
      nullTexts[k] = new VText(scene, { text: '/', x: bx(k), y: 0, z: 0, color: PALETTE.textDim, scale: 0.8 });
    }
  }
  eqT.setText(''); stepT.setText('');
}
function* addNode(k, x) {
  const idx = chains[k].length;
  const node = new VBox(scene, { w: 44, h: 40, d: 30, x: chainX(k), y: 60 + idx * STEP, z: 0, label: x, color: PALETTE.node, emissive: PALETTE.nodeEmissive });
  node.mesh.scale.setScalar(0.01);
  yield A(200, p => node.mesh.scale.setScalar(0.01 + 0.99 * easeInOut(p)));
  node.tube = chainTube(k, idx ? chains[k][idx - 1] : null, node);
  if (idx === 0) nullTexts[k].remove();
  chains[k].push(node);
}
function* walkChain(k, x) {
  let found = -1;
  for (let i = 0; i < chains[k].length; i++) {
    const node = chains[k][i];
    yield S(() => { node.setColor(CYAN, CYAN); stepT.setText('链 ' + k + ' 第 ' + (i + 1) + ' 个：' + node.text + ' ' + (node.text === x ? '= 目标！' : '≠ ' + x + '，继续')); });
    yield W(300);
    if (node.text === x) { found = i; break; }
    yield S(() => node.setColor(PALETTE.node, PALETTE.nodeEmissive));
    yield W(120);
  }
  return found;
}

function* openHashGen() {
  resetAll();
  yield S(() => hint.setText('链地址法：h(x) = x % 10；冲突元素在同一桶下挂链 — 删除直接摘节点，不需要墓碑'));
  yield S(() => { stepT.setText('依次插入 25、35、45 → 桶 5 挂链；18、28 → 桶 8 挂链'); });
  yield W(350);
  for (const x of [25, 35, 45]) {
    const k = h(x);
    yield S(() => { eqT.setText('h(' + x + ') = ' + x + ' % 10 = ' + k); buckets[k].setColor(CYAN, CYAN); stepT.setText('插入 ' + x + ' → 桶 ' + k + '，挂到链尾'); });
    yield W(350);
    yield* addNode(k, x);
    yield S(() => { buckets[k].setColor(PALETTE.node, PALETTE.nodeEmissive); });
    yield W(150);
  }
  for (const x of [18, 28]) {
    const k = h(x);
    yield S(() => { eqT.setText('h(' + x + ') = ' + x + ' % 10 = ' + k); buckets[k].setColor(CYAN, CYAN); stepT.setText('插入 ' + x + ' → 桶 ' + k + '，挂到链尾'); });
    yield W(350);
    yield* addNode(k, x);
    yield S(() => { buckets[k].setColor(PALETTE.node, PALETTE.nodeEmissive); });
    yield W(150);
  }
  yield S(() => { eqT.setText('h(35) = 5'); buckets[5].setColor(CYAN, CYAN); stepT.setText('查找 35：先到桶 5，再沿链逐个比较'); });
  yield W(350);
  const fi = yield* walkChain(5, 35);
  yield S(() => { chains[5][fi].setColor(GREEN, GREEN); stepT.setText('桶 5 第 ' + (fi + 1) + ' 个节点 = 35，命中！链内比较只走了 ' + (fi + 1) + ' 步'); });
  yield W(450);
  yield S(() => { chains[5][fi].setColor(PALETTE.node, PALETTE.nodeEmissive); buckets[5].setColor(PALETTE.node, PALETTE.nodeEmissive); });
  yield S(() => { eqT.setText('h(45) = 5'); buckets[5].setColor(CYAN, CYAN); stepT.setText('删除 45：桶 5 链 = 25 → 35 → 45，直接摘掉链尾节点'); });
  yield W(400);
  const di = chains[5].findIndex(n => n.text === 45);
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
    if (chains[5].length === 0) nullTexts[5] = new VText(scene, { text: '/', x: bx(5), y: 0, z: 0, color: PALETTE.textDim, scale: 0.8 });
    buckets[5].setColor(PALETTE.node, PALETTE.nodeEmissive);
    stepT.setText('45 已摘除：链重连为 25 → 35 — 删除是局部操作，其余节点不受影响');
  });
  yield W(450);
  yield S(() => {
    status.textContent = '链地址完成：桶5 链 25→35，桶8 链 18→28 — 冲突挂链，无数据搬家，无需墓碑';
    hint.setText('负载因子 α = 5/10 = 0.5：查找 O(1+α)；链地址不怕 α 升高 — 只退化不丢数据，是 HashMap 的经典实现');
  });
  yield W(700);
}

panel.addButton('运行演示', () => engine.start(openHashGen()));
panel.addButton('清空', () => { engine.clear(); resetAll(); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；青 = 当前桶/节点，绿 = 命中，节点沿竖直链向下挂，删除直接摘除）');

scene.start(engine);
