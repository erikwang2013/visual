// AlgorithmLibrary/Hungarian3D.js — 匈牙利算法（Kuhn 增广）：二分图最大匹配
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Graph3D } from '../3D/modes/Graph3D.js';
import { VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Hungarian3D');

const scene = new Scene3D('scene', { cameraPos: [0, 300, 700], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const graph = new Graph3D(scene, { radius: 18 });
const LX = -300, RX = 300, GAP = 180, Y0 = 180;
const LEFT = 3, RIGHT = 3;
for (let u = 0; u < LEFT; u++) graph.addNode('L' + u, 'L' + u, LX, Y0 - u * GAP, 0);
for (let v = 0; v < RIGHT; v++) graph.addNode('R' + v, 'R' + v, RX, Y0 - v * GAP, 0);
const adjL = [[0, 1], [0, 2], [1, 2]];
for (let u = 0; u < LEFT; u++) for (const v of adjL[u]) graph.addEdge('L' + u, 'R' + v, { directed: true });

const status = panel.addStatus('');
const hint = new VText(scene, { text: '点击「运行匈牙利」开始：二分图最大匹配', x: 0, y: 265, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const resultLabel = new VText(scene, { text: '', x: 0, y: -270, z: 0, color: PALETTE.textDim, scale: 0.8 });

// 预生成 Kuhn 增广事件序列
function genEvents() {
  const matchR = Array(RIGHT).fill(-1);
  const matchL = Array(LEFT).fill(-1);
  const events = [];
  const tryMatch = (u, seen) => {
    for (const v of adjL[u]) {
      if (seen[v]) continue;
      seen[v] = true;
      events.push({ t: 'try', u, v });
      if (matchR[v] === -1) {
        events.push({ t: 'aug', u, v, old: -1 });
        matchR[v] = u; matchL[u] = v;
        return true;
      }
      const w = matchR[v];
      events.push({ t: 'conf', u, v, w });
      if (tryMatch(w, seen)) {
        events.push({ t: 'aug', u, v, old: w });
        matchR[v] = u; matchL[u] = v;
        return true;
      }
    }
    return false;
  };
  for (let u = 0; u < LEFT; u++) {
    const seen = Array(RIGHT).fill(false);
    events.push({ t: 'start', u });
    tryMatch(u, seen);
  }
  return events;
}

function runHungarian() {
  engine.clear();
  const events = genEvents();
  for (let u = 0; u < LEFT; u++) graph.dehighlightNode('L' + u, C);
  for (let v = 0; v < RIGHT; v++) graph.dehighlightNode('R' + v, C);
  for (const key of graph.edges.keys()) {
    const [a, b] = key.split('->');
    graph.lightEdge(a, b, false, C);
  }
  resultLabel.setText('');

  const matched = new Set();
  let i = 0;
  const step = () => {
    if (i >= events.length) {
      const n = matched.size;
      status.textContent = '匈牙利算法完成：最大匹配 ' + n + ' 对';
      hint.setText('最大匹配数 = ' + n);
      resultLabel.setText('匹配边 ' + n + ' 条（着色边）');
      return;
    }
    const e = events[i]; i++;
    if (e.t === 'start') {
      hint.setText('尝试为左侧节点 L' + e.u + ' 寻找匹配');
      graph.highlightNode('L' + e.u, C);
      C(420, step);
    } else if (e.t === 'try') {
      graph.highlightNode('R' + e.v, C, PALETTE.orange);
      graph.lightEdge('L' + e.u, 'R' + e.v, true, C);
      hint.setText('L' + e.u + ' 尝试连接 R' + e.v);
      C(500, step);
    } else if (e.t === 'conf') {
      graph.lightEdge('L' + e.u, 'R' + e.v, false, C);
      C(120, () => graph.lightEdge('R' + e.v, 'L' + e.w, true, C), () => {});
      hint.setText('R' + e.v + ' 已被 L' + e.w + ' 匹配，尝试为 L' + e.w + ' 重新寻找');
      C(700, step);
    } else {
      const key = 'L' + e.u + '->R' + e.v;
      graph.lightEdge('L' + e.u, 'R' + e.v, true, C);
      C(300, () => {
        const entry = graph.edges.get(key);
        if (entry) entry.mesh.material.color.setHex(PALETTE.green);
        const cone = scene.children.find(o => o.isMesh && o.geometry && o.geometry.type === 'ConeGeometry' && o.position.distanceTo(entry.mesh.position) < 200);
        if (cone) cone.material.color.setHex(PALETTE.green);
      }, () => {});
      matched.add(key);
      hint.setText('增广成功：L' + e.u + ' ↔ R' + e.v + ' 加入匹配');
      C(620, step);
    }
  };
  step();
}

function clearAll() {
  engine.clear();
  for (const [, e] of graph.nodes) e.node.remove();
  graph.nodes.clear();
  for (const [, e] of graph.edges) {
    scene.remove(e.mesh);
    if (e.weightLabel) e.weightLabel.remove();
  }
  graph.edges.clear();
  status.textContent = '';
  hint.setText('已清空画布');
  resultLabel.setText('');
}

panel.addButton('运行匈牙利', runHungarian);
panel.addButton('清空', clearAll);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
