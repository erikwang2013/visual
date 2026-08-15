// AlgorithmLibrary/ConsistentHash3D.js — 一致性哈希：哈希环 + 顺时针寻路 + 增量迁移（function* 生成器驱动，解说入状态栏）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('ConsistentHash3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const R = 250, SEG = 48, CY = 300;
const GREEN = 0x4ade80, ORANGE = 0xfb923c, YELLOW = 0xfacc15, RED = 0xf87171, DIM = 0x475569;
const E = p => p * p * (3 - 2 * p);
const status = panel.addStatus('就绪');
const SERVERS = [['A', 130], ['B', 250], ['C', 390]];
const KEYS = [['k1', 60, 'A'], ['k2', 170, 'B'], ['k3', 300, 'C'], ['k4', 40, 'A'], ['k5', 340, 'C']];
const NEW_SERVER = ['D', 220];

// ---- 环上位置：hash 值均为常量，模块级预计算 ----
const PV = {};
for (const d of [130, 250, 390, 60, 170, 300, 40, 340, 220]) {
  PV[d] = new THREE.Vector3(R * Math.cos(d * Math.PI / 180) + 320, CY, R * Math.sin(d * Math.PI / 180));
}
const pv = d => PV[d];

// ---- 静态基环 ----
const ringPos = new Float32Array((SEG + 1) * 3);
for (let k = 0; k <= SEG; k++) {
  const th = k * 360 / SEG * Math.PI / 180;
  ringPos[k * 3] = R * Math.cos(th) + 320;
  ringPos[k * 3 + 1] = CY;
  ringPos[k * 3 + 2] = R * Math.sin(th);
}
const ringGeo = new THREE.BufferGeometry();
ringGeo.setAttribute('position', new THREE.BufferAttribute(ringPos, 3));
scene.add(new THREE.Line(ringGeo, new THREE.LineBasicMaterial({ color: DIM, transparent: true, opacity: 0.35 })));

// ---- 弧线池（绿弧 = 归属路径，峰值 6 条） ----
const arcPool = [], arcFree = [];
function mkArc() {
  const pos = new Float32Array((SEG + 1) * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: GREEN, transparent: true, opacity: 0.55 }));
  line.visible = false;
  scene.add(line);
  const a = { line, pos };
  arcPool.push(a);
  return a;
}
function setArc(a, degA, degB, color, opacity, y) {
  let b = degB;
  while (b < degA) b += 360;
  for (let k = 0; k <= SEG; k++) {
    const th = (degA + (b - degA) * k / SEG) * Math.PI / 180;
    a.pos[k * 3] = R * Math.cos(th) + 320;
    a.pos[k * 3 + 1] = y;
    a.pos[k * 3 + 2] = R * Math.sin(th);
  }
  a.line.geometry.attributes.position.needsUpdate = true;
  a.line.material.color.setHex(color);
  a.line.material.opacity = opacity;
  a.line.visible = true;
}

// ---- 对象池：服务器节点(4)+hash 标签(4)、key 节点(6)、弧上标注(6)；红标注为迁移 key 专用 ----
const srvPool = [], srvFree = [], srvLblPool = [], srvLblFree = [];
function mkServer() {
  const nd = new VNode(scene, { radius: 20, x: 0, y: 0, z: 0, label: '', color: PALETTE.blue, emissive: PALETTE.blue });
  nd.mesh.visible = false;
  nd.mesh.scale.setScalar(0.01);
  srvPool.push(nd);
  const lb = new VText(scene, { text: '', x: 0, y: 0, z: 0, color: PALETTE.textDim, scale: 0.65 });
  lb.sprite.visible = false;
  srvLblPool.push(lb);
}
const keyPool = [], keyFree = [];
function mkKey() {
  const nd = new VNode(scene, { radius: 14, x: 0, y: 0, z: 0, label: '', color: ORANGE, emissive: ORANGE });
  nd.mesh.visible = false;
  nd.mesh.scale.setScalar(0.01);
  keyPool.push(nd);
}
const notePool = [], noteFree = [];
function mkNote() {
  const t = new VText(scene, { text: '', x: 0, y: 0, z: 0, color: GREEN, scale: 0.7 });
  t.sprite.visible = false;
  notePool.push(t);
  return t;
}
const redNote = new VText(scene, { text: '', x: 0, y: 0, z: 0, color: RED, scale: 0.7 });
redNote.sprite.visible = false;

function clearAll() {
  srvFree.length = 0; srvFree.push(...srvPool);
  srvLblFree.length = 0; srvLblFree.push(...srvLblPool);
  keyFree.length = 0; keyFree.push(...keyPool);
  noteFree.length = 0; noteFree.push(...notePool);
  arcFree.length = 0; arcFree.push(...arcPool);
  srvPool.forEach(n => { n.mesh.visible = false; n.mesh.scale.setScalar(0.01); });
  srvLblPool.forEach(t => t.sprite.visible = false);
  keyPool.forEach(n => { n.mesh.visible = false; n.mesh.scale.setScalar(0.01); });
  notePool.forEach(t => t.sprite.visible = false);
  arcPool.forEach(a => a.line.visible = false);
  redNote.sprite.visible = false;
}
function addServer(name, hash, isNew) {
  const nd = srvFree.pop();
  nd.mesh.position.copy(pv(hash));
  nd.setText(name);
  nd.setColor(isNew ? YELLOW : PALETTE.blue, isNew ? YELLOW : PALETTE.blue);
  nd.mesh.visible = true;
  nd.mesh.scale.setScalar(0.01);
  const lb = srvLblFree.pop();
  lb.setText('hash=' + hash);
  lb.sprite.position.set(pv(hash).x, 258, pv(hash).z);
  lb.sprite.visible = true;
  return nd;
}
function addKey(name, hash) {
  const nd = keyFree.pop();
  nd.mesh.position.copy(pv(hash));
  nd.setText(name);
  nd.setColor(ORANGE, ORANGE);
  nd.mesh.visible = true;
  nd.mesh.scale.setScalar(0.01);
  return nd;
}
function setNote(t, text, x, y, z) {
  t.setText(text);
  t.sprite.position.set(x, y, z);
  t.sprite.visible = true;
}
function* growIn(nd) {
  yield A(250, p => nd.mesh.scale.setScalar(0.01 + 0.99 * E(p)));
}

function* chGen() {
  clearAll();
  yield S(() => { status.textContent = '一致性哈希：把服务器与 key 都哈希到 [0,360) 环上，key 沿顺时针遇到的第一台服务器即归属'; });
  yield W(400);
  for (const [p, hash] of SERVERS) {
    let nd;
    yield S(() => { nd = addServer(p, hash, false); status.textContent = '服务器 ' + p + '：hash(' + p + ') = ' + hash + '°，放到环上'; });
    yield* growIn(nd);
    yield W(500);
  }
  for (const [k, hash, srv] of KEYS) {
    const sh = SERVERS.find(s => s[0] === srv)[1];
    let nd;
    yield S(() => {
      nd = addKey(k, hash);
      setArc(arcFree.pop(), hash, sh, GREEN, 0.55, 294);
      setNote(noteFree.pop(), k + ' → ' + srv, (pv(hash).x + pv(sh).x) / 2, 318, (pv(hash).z + pv(sh).z) / 2);
      nd.setColor(GREEN, GREEN);
      status.textContent = 'key ' + k + '：hash = ' + hash + '°，顺时针遇到 ' + srv + ' → 归属 ' + srv;
    });
    yield* growIn(nd);
    yield W(450);
  }
  let dNode;
  yield S(() => { dNode = addServer(NEW_SERVER[0], NEW_SERVER[1], true); status.textContent = '新增服务器 D：hash(D) = 220° 落入环上 — 看哪些 key 的顺时针路径被截胡'; });
  yield* growIn(dNode);
  yield W(700);
  let mNode;
  yield S(() => {
    mNode = addKey('k2', 170);
    mNode.setColor(RED, RED);
    setNote(redNote, 'k2 → B → D', pv(170).x, 235, pv(170).z);
    status.textContent = 'k2(170°) 在 A(130°) 与 D(220°) 之间：原顺时针遇 B，现先遇 D → 只有 k2 需要迁移';
  });
  yield* growIn(mNode);
  yield W(650);
  yield S(() => {
    setArc(arcFree.pop(), 170, 220, GREEN, 0.7, 294);
    mNode.setColor(GREEN, GREEN);
    status.textContent = '一致性哈希演示完成：加入 D 只迁移 1/5 的 key（k2 由 B → D），k1/k3/k4/k5 映射不变；环上顺时针定位 O(1)';
  });
  yield W(900);
}

for (let i = 0; i < 4; i++) mkServer();
for (let i = 0; i < 6; i++) mkKey();
for (let i = 0; i < 6; i++) mkNote();
for (let i = 0; i < 7; i++) mkArc();
clearAll();
engine.queue(() => chGen());
panel.addButton('清空', () => { engine.clear(); clearAll(); status.textContent = ''; });

scene.start(engine);
