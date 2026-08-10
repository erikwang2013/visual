// AlgorithmLibrary/Graham3D.js — Graham 扫描凸包：按极角排序 + 单调栈左转判定
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Graham3D');

const scene = new Scene3D('scene', { cameraPos: [0, 480, 560], fov: 50 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GREEN = 0x4ade80, DIM = 0x475569;
const PTS = [[-180, 40], [120, 90], [220, -30], [60, -120], [-60, -160], [-200, -90], [-260, 0], [160, 150], [20, 170], [-120, 120], [0, -40], [-40, 60]];
const nodes = PTS.map((p, i) => new VNode(scene, { radius: 14, x: p[0], y: p[1], z: 0, label: String(i), color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
const hint = new VText(scene, { text: '点击「运行Graham」开始：求点集凸包', x: 0, y: 250, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');
const hullEdges = [];

function addHullEdge(a, b) {
  const A = new THREE.Vector3(a[0], a[1], 0), B = new THREE.Vector3(b[0], b[1], 0);
  const dir = B.clone().sub(A);
  const len = dir.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, len, 8), new THREE.MeshBasicMaterial({ color: GREEN }));
  mesh.position.copy(A.clone().add(B).multiplyScalar(0.5));
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  scene.add(mesh);
  hullEdges.push(mesh);
}

function rebuildHull(stack, done) {
  for (const m of hullEdges) scene.remove(m);
  hullEdges.length = 0;
  for (let k = 0; k + 1 < stack.length; k++) addHullEdge(PTS[stack[k]], PTS[stack[k + 1]]);
  if (done && stack.length > 2) addHullEdge(PTS[stack[stack.length - 1]], PTS[stack[0]]);
}

function runGraham() {
  engine.clear();
  for (const m of hullEdges) scene.remove(m);
  hullEdges.length = 0;
  nodes.forEach(n => n.setColor(PALETTE.node, PALETTE.nodeEmissive));

  let P0 = 0;
  for (let k = 1; k < PTS.length; k++) {
    if (PTS[k][1] < PTS[P0][1] || (PTS[k][1] === PTS[P0][1] && PTS[k][0] < PTS[P0][0])) P0 = k;
  }
  hint.setText('找最下点 P' + P0 + '，其余点按极角排序');
  const others = [...PTS.keys()].filter(i => i !== P0);
  others.sort((a, b) => {
    const ang = (x) => Math.atan2(PTS[x][1] - PTS[P0][1], PTS[x][0] - PTS[P0][0]);
    return ang(a) - ang(b);
  });
  const order = [P0, ...others];
  const cross = (o, a, b) => (PTS[a][0] - PTS[o][0]) * (PTS[b][1] - PTS[o][1]) - (PTS[a][1] - PTS[o][1]) * (PTS[b][0] - PTS[o][0]);

  const events = [];
  const stack = [order[0], order[1]];
  events.push({ t: 'stack', s: [...stack], done: false });
  for (let k = 2; k < order.length; k++) {
    const p = order[k];
    events.push({ t: 'visit', i: p });
    while (stack.length >= 2 && cross(stack[stack.length - 2], stack[stack.length - 1], p) <= 0) {
      stack.pop();
      events.push({ t: 'pop', i: p, s: [...stack] });
    }
    stack.push(p);
    events.push({ t: 'stack', s: [...stack], done: false });
  }
  events.push({ t: 'stack', s: [...stack], done: true });

  let i = 0;
  const step = () => {
    if (i >= events.length) {
      status.textContent = 'Graham 完成：凸包 ' + stack.length + ' 个顶点';
      hint.setText('凸包顶点：' + stack.join(' → ') + '（首尾相连）');
      stack.forEach(idx => nodes[idx].setColor(GREEN, GREEN));
      return;
    }
    const e = events[i]; i++;
    if (e.t === 'visit') {
      nodes[e.i].setColor(PALETTE.highlight, PALETTE.highlightEmissive);
      hint.setText('按极角序访问点 ' + e.i);
      C(420, step);
    } else if (e.t === 'pop') {
      nodes[e.i].setColor(DIM, DIM);
      hint.setText('右转（或共线）：弹出栈顶点 ' + e.i + '，不构成凸包');
      rebuildHull(e.s, false);
      C(480, step);
    } else {
      rebuildHull(e.s, e.done);
      hint.setText(e.done ? '扫描完成：路径闭合，形成凸包' : '栈：' + e.s.join(' → '));
      C(e.done ? 900 : 380, step);
    }
  };
  step();
}

panel.addButton('运行Graham', runGraham);
panel.addButton('清空', () => {
  engine.clear();
  for (const m of hullEdges) scene.remove(m);
  hullEdges.length = 0;
  nodes.forEach(n => n.setColor(PALETTE.node, PALETTE.nodeEmissive));
  hint.setText('已清空画布');
  status.textContent = '';
});
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
