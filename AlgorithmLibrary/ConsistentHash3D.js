// AlgorithmLibrary/ConsistentHash3D.js — 一致性哈希：哈希环 + 顺时针寻路 + 增量迁移（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('ConsistentHash3D');

const scene = new Scene3D('scene', { cameraPos: [0, 480, 640], fov: 50 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const R = 250;
const GREEN = 0x4ade80, ORANGE = 0xfb923c, YELLOW = 0xfacc15, RED = 0xf87171, DIM = 0x475569;
const pos = h => [R * Math.cos(h * Math.PI / 180), 0, R * Math.sin(h * Math.PI / 180)];
const SERVERS = [['A', 130], ['B', 250], ['C', 390]];
const KEYS = [['k1', 60, 'A'], ['k2', 170, 'B'], ['k3', 300, 'C'], ['k4', 40, 'A'], ['k5', 340, 'C']];
const NEW_SERVER = ['D', 220];

const hint = new VText(scene, { text: '点击「运行演示」开始：一致性哈希', x: 0, y: 310, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');
const serverNodes = [], serverLbls = [], keyNodes = [], arcs = [], notes = [];

function ringLine(degA, degB, color, opacity, radius = R, y = 0) {
  const pts = [];
  let a = degA, b = degB;
  while (b < a) b += 360;
  for (let k = 0; k <= 48; k++) {
    const th = (a + (b - a) * k / 48) * Math.PI / 180;
    pts.push(new THREE.Vector3(radius * Math.cos(th), y, radius * Math.sin(th)));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mesh = new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
  scene.add(mesh);
  arcs.push(mesh);
}
function clearAll() {
  for (const n of serverNodes) n.remove();
  for (const t of serverLbls) t.remove();
  for (const n of keyNodes) n.remove();
  for (const m of arcs) scene.remove(m);
  for (const t of notes) t.remove();
  serverNodes.length = 0; serverLbls.length = 0; keyNodes.length = 0; arcs.length = 0; notes.length = 0;
}
function addServer(name, hash, isNew) {
  const nd = new VNode(scene, { radius: 20, x: pos(hash)[0], y: pos(hash)[1], z: pos(hash)[2], label: name, color: isNew ? YELLOW : PALETTE.blue, emissive: isNew ? YELLOW : PALETTE.blue });
  const lb = new VText(scene, { text: 'hash=' + hash, x: pos(hash)[0], y: -40, z: pos(hash)[2], color: PALETTE.textDim, scale: 0.65 });
  serverNodes.push(nd); serverLbls.push(lb);
}
function addKey(name, hash, srvName) {
  const nd = new VNode(scene, { radius: 14, x: pos(hash)[0], y: pos(hash)[1], z: pos(hash)[2], label: name, color: ORANGE, emissive: ORANGE });
  keyNodes.push(nd);
  return nd;
}

function* chGen() {
  clearAll();
  ringLine(0, 360, DIM, 0.35, R, 0);
  yield S(() => hint.setText('把服务器和 key 都哈希到 [0,360) 的环上；key 沿顺时针遇到的第一台服务器即归属'));
  yield W(400);
  for (const [p, hash] of SERVERS) {
    yield S(() => { addServer(p, hash, false); hint.setText('服务器 ' + p + '：hash(' + p + ') = ' + hash + '，放到环上'); });
    yield W(500);
  }
  for (const [k, hash, srv] of KEYS) {
    yield S(() => {
      addKey(k, hash, srv);
      hint.setText('key ' + k + '：hash = ' + hash + '，顺时针遇到 ' + srv + ' → 归属 ' + srv);
      ringLine(hash, SERVERS.find(s => s[0] === srv)[1], GREEN, 0.55, R, -6);
      const nt = new VText(scene, { text: k + ' → ' + srv, x: (pos(hash)[0] + pos(SERVERS.find(s => s[0] === srv)[1])[0]) / 2, y: 18, z: (pos(hash)[2] + pos(SERVERS.find(s => s[0] === srv)[1])[2]) / 2, color: GREEN, scale: 0.7 });
      notes.push(nt);
      keyNodes[keyNodes.length - 1].setColor(GREEN, GREEN);
    });
    yield W(450);
  }
  yield S(() => { addServer(NEW_SERVER[0], NEW_SERVER[1], true); hint.setText('新增服务器 D：hash(D) = 220 落入环上 — 看哪些 key 的顺时针路径被截胡'); });
  yield W(700);
  yield S(() => {
    const nd = addKey('k2', 170, 'D');
    nd.setColor(RED, RED);
    const kt = new VText(scene, { text: 'k2 → B → D', x: pos(170)[0], y: -45, z: pos(170)[2], color: RED, scale: 0.7 });
    notes.push(kt);
    hint.setText('k2(170) 在 A(130) 与 D(220) 之间：原来顺时针遇到 B，现在先遇到 D → 只有它需要迁移');
  });
  yield W(650);
  yield S(() => {
    ringLine(170, 220, GREEN, 0.7, R, -6);
    keyNodes[keyNodes.length - 1].setColor(GREEN, GREEN);
    status.textContent = '一致性哈希完成：加入 D 只迁移 1/5 的 key（k2），其余映射不变';
    hint.setText('总结：普通取模需重映射全部 key；一致性哈希只迁移环上相邻区间 — 分布式缓存扩容的标配');
    const nt = new VText(scene, { text: '加入新节点 D，仅 k2 需要迁移（20%），k1/k3/k4/k5 不动', x: 0, y: -260, z: 0, color: GREEN, scale: 0.85 });
    notes.push(nt);
  });
  yield W(900);
}

panel.addButton('运行演示', () => engine.start(chGen()));
panel.addButton('清空', () => { engine.clear(); clearAll(); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；绿弧 = key 到归属服务器的顺时针路径，红 = 需要迁移的 key）');

scene.start(engine);
