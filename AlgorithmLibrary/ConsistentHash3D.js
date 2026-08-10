// AlgorithmLibrary/ConsistentHash3D.js — 一致性哈希：哈希环 + 顺时针寻路 + 增量迁移
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('ConsistentHash3D');

const scene = new Scene3D('scene', { cameraPos: [0, 480, 640], fov: 50 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const R = 250;
const GREEN = 0x4ade80, ORANGE = 0xfb923c, YELLOW = 0xfacc15, RED = 0xf87171, DIM = 0x475569;
const pos = h => [R * Math.cos(h * Math.PI / 180), 0, R * Math.sin(h * Math.PI / 180)];
// 服务器（哈希值）与 key（哈希值）
const SERVERS = [['A', 130], ['B', 250], ['C', 390]];
const KEYS = [['k1', 60], ['k2', 170], ['k3', 300], ['k4', 40], ['k5', 340]];
const NEW_SERVER = ['D', 220];

const hint = new VText(scene, { text: '点击「运行一致性哈希」开始：哈希环寻址', x: 0, y: 310, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');
const serverNodes = [];
const serverLbls = [];
const keyNodes = [];
const arcs = [];
const notes = [];

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
  engine.clear();
  for (const n of serverNodes) n.remove();
  for (const t of serverLbls) t.remove();
  for (const n of keyNodes) n.remove();
  for (const m of arcs) scene.remove(m);
  for (const t of notes) t.remove();
  serverNodes.length = 0; serverLbls.length = 0; keyNodes.length = 0; arcs.length = 0; notes.length = 0;
}

function nextServer(hash, servers) {
  const sorted = servers.slice().sort((a, b) => a[1] - b[1]);
  for (const s of sorted) if (s[1] > hash) return s;
  return sorted[0];
}

function runConsistentHash() {
  clearAll();
  ringLine(0, 360, DIM, 0.35, R, 0);
  hint.setText('把服务器和 key 都哈希到 [0,360) 的环上；key 沿顺时针遇到的第一台服务器即归属');

  const events = [];
  const servers = [];
  SERVERS.forEach(s => {
    events.push({ t: 'addServer', s });
    servers.push(s);
  });
  KEYS.forEach(k => events.push({ t: 'addKey', k, srv: nextServer(k[1], servers) }));
  events.push({ t: 'addServer', s: NEW_SERVER, isNew: true });
  events.push({ t: 'migrate', k: KEYS[1], from: ['B', 250], to: NEW_SERVER });

  let i = 0;
  const step = () => {
    if (i >= events.length) {
      status.textContent = '一致性哈希完成：加入 D 只迁移 1/5 的 key，其余映射不变';
      hint.setText('总结：普通取模需重映射全部 key；一致性哈希只迁移环上相邻区间');
      const nt = new VText(scene, { text: '加入新节点 D，仅 k2 需要迁移（20%），k1/k3/k4/k5 不动', x: 0, y: -260, z: 0, color: GREEN, scale: 0.85 });
      notes.push(nt);
      return;
    }
    const e = events[i]; i++;
    if (e.t === 'addServer') {
      const [p, hash] = e.s;
      const nd = new VNode(scene, { radius: 20, x: pos(hash)[0], y: pos(hash)[1], z: pos(hash)[2], label: p, color: e.isNew ? YELLOW : PALETTE.blue, emissive: e.isNew ? YELLOW : PALETTE.blue });
      const lb = new VText(scene, { text: 'hash=' + hash, x: pos(hash)[0], y: -40, z: pos(hash)[2], color: PALETTE.textDim, scale: 0.65 });
      serverNodes.push(nd); serverLbls.push(lb);
      hint.setText(e.isNew ? '新增服务器 D：hash(' + p + ') = ' + hash + ' 落入环上' : '服务器 ' + p + '：hash(' + p + ') = ' + hash + '，放到环上');
      C(e.isNew ? 700 : 500, step);
    } else if (e.t === 'addKey') {
      const [p, hash] = e.k;
      const nd = new VNode(scene, { radius: 14, x: pos(hash)[0], y: pos(hash)[1], z: pos(hash)[2], label: p, color: ORANGE, emissive: ORANGE });
      keyNodes.push(nd);
      hint.setText('key ' + p + '：hash = ' + hash + '，顺时针遇到 ' + e.srv[0] + ' → 归属 ' + e.srv[0]);
      C(450, () => {
        ringLine(hash, e.srv[1], GREEN, 0.55, R, -6);
        const nt = new VText(scene, { text: p + ' → ' + e.srv[0], x: (pos(hash)[0] + pos(e.srv[1])[0]) / 2, y: 18, z: (pos(hash)[2] + pos(e.srv[1])[2]) / 2, color: GREEN, scale: 0.7 });
        notes.push(nt);
        nd.setColor(GREEN, GREEN);
        step();
      });
    } else {
      const nd = new VNode(scene, { radius: 14, x: pos(e.k[1])[0], y: pos(e.k[1])[1], z: pos(e.k[1])[2], label: e.k[0], color: RED, emissive: RED });
      keyNodes.push(nd);
      const kt = new VText(scene, { text: e.k[0] + ' → ' + e.from[0] + ' → ' + e.to[0], x: pos(e.k[1])[0], y: -45, z: pos(e.k[1])[2], color: RED, scale: 0.7 });
      notes.push(kt);
      hint.setText('k2(170) 在 A 与 D 之间：原来顺时针遇到 B，现在先遇到 D → 需要迁移');
      C(650, () => {
        ringLine(e.k[1], e.to[1], GREEN, 0.7, R, -6);
        nd.setColor(GREEN, GREEN);
        step();
      });
    }
  };
  step();
}

panel.addButton('运行一致性哈希', runConsistentHash);
panel.addButton('清空', () => { clearAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
