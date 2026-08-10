// AlgorithmLibrary/SPFA3D.js — 队列优化的 Bellman-Ford（SPFA）：带负权边的最短路径
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Graph3D } from '../3D/modes/Graph3D.js';
import { VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('SPFA3D');

const scene = new Scene3D('scene', { cameraPos: [0, 300, 620], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });
function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

const N = 6, R = 210;
const RELAX_COLOR = 0x22d3ee;
const graph = new Graph3D(scene, { radius: 17 });
const POS = [];
for (let i = 0; i < N; i++) {
  const a = (i / N) * Math.PI * 2 - Math.PI / 2;
  POS[i] = [Math.cos(a) * R, 0, Math.sin(a) * R];
  graph.addNode(String(i), String(i), POS[i][0], POS[i][1], POS[i][2]);
}
// 有向负权图（无负环，模型验证 d=[0,5,-2,-5,-6,-3]）
const adjW = [[1, 2], [2, 3], [3, 4], [4, 5], [5], []];
const w = { '0->1': 5, '0->2': -2, '1->2': 1, '1->3': 3, '2->3': -3, '2->4': 4, '3->4': -1, '3->5': 2, '4->5': 6 };
for (let u = 0; u < N; u++) for (const v of adjW[u]) graph.addEdge(String(u), String(v), { weight: w[`${u}->${v}`], directed: true });

const status = panel.addStatus('');
const hint = new VText(scene, { text: '点击「运行 SPFA」开始（起点 0）', x: 0, y: 255, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const distLabels = [];
const queueLabel = new VText(scene, { text: '队列：', x: -520, y: -225, z: 0, color: PALETTE.textDim, scale: 0.8 });

function spawnDistLabel(u) {
  const [x, , z] = POS[u];
  const vt = new VText(scene, { text: '∞', x, y: 82, z, color: PALETTE.textDim, scale: 0.7 });
  vt.sprite.scale.set(0.1, 0.05, 1);
  C(250, (p) => { const s = 0.01 + p * 0.99; vt.sprite.scale.set(70 * s, 35 * s, 1); }, () => vt.sprite.scale.set(0.1, 0.05, 1));
  distLabels[u] = vt;
}

function updateDistLabel(u, text, color) {
  if (!distLabels[u]) spawnDistLabel(u);
  const vt = distLabels[u];
  vt.setText(text, { color: color || PALETTE.text });
  vt.sprite.scale.set(0.1, 0.05, 1);
  C(250, (p) => { const s = 0.01 + p * 0.99; vt.sprite.scale.set(70 * s, 35 * s, 1); }, () => vt.sprite.scale.set(70, 35, 1));
}

function runSPFA() {
  engine.clear();
  for (let i = 0; i < N; i++) graph.dehighlightNode(String(i), C);
  for (const key of graph.edges.keys()) {
    const [a, b] = key.split('->');
    graph.lightEdge(a, b, false, C);
  }
  for (let i = 0; i < N; i++) if (distLabels[i]) { distLabels[i].remove(); distLabels[i] = null; }

  const dist = Array(N).fill(Infinity);
  dist[0] = 0;
  const inQ = Array(N).fill(false);
  const q = [0]; inQ[0] = true;
  const log = []; // {type:'pop'|'relax'|'push', u, v, nd}
  while (q.length) {
    const u = q.shift(); inQ[u] = false;
    log.push({ type: 'pop', u });
    for (const v of adjW[u]) {
      const nd = dist[u] + w[`${u}->${v}`];
      if (nd < dist[v]) {
        log.push({ type: 'relax', u, v, nd });
        dist[v] = nd;
        if (!inQ[v]) { inQ[v] = true; q.push(v); log.push({ type: 'push', v }); }
      }
    }
  }
  spawnDistLabel(0);
  updateDistLabel(0, '0', PALETTE.textGlow);
  hint.setText('初始化：d[0]=0 入队，其余 ∞');
  let i = 0;
  const step = () => {
    if (i >= log.length) {
      const ds = dist.map((d, u) => u + ':' + d).join(' ');
      status.textContent = 'SPFA 完成（含负权边）: ' + ds;
      hint.setText('SPFA 完成: ' + ds);
      return;
    }
    const e = log[i]; i++;
    if (e.type === 'pop') {
      graph.highlightNode(String(e.u), C);
      hint.setText('出队节点 ' + e.u + '（d[' + e.u + ']=' + dist[e.u] + '），松弛其出边');
      C(420, step);
    } else if (e.type === 'relax') {
      graph.lightEdge(String(e.u), String(e.v), true, C);
      updateDistLabel(e.v, String(e.nd), PALETTE.textGlow);
      hint.setText('松弛 ' + e.u + '→' + e.v + '：d[' + e.v + '] 更新为 ' + e.nd);
      C(520, step);
    } else {
      graph.highlightNode(String(e.v), C, PALETTE.orange);
      hint.setText('节点 ' + e.v + ' 入队（新值 ' + dist[e.v] + '）');
      C(380, step);
    }
  };
  step();
}

function clearAll() {
  engine.clear();
  for (let i = 0; i < N; i++) if (distLabels[i]) { distLabels[i].remove(); distLabels[i] = null; }
  for (const [, e] of graph.nodes) e.node.remove();
  graph.nodes.clear();
  for (const [, e] of graph.edges) {
    scene.remove(e.mesh);
    if (e.weightLabel) e.weightLabel.remove();
  }
  graph.edges.clear();
  status.textContent = '';
  hint.setText('已清空画布');
}

panel.addButton('运行 SPFA', runSPFA);
panel.addButton('清空', clearAll);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
