// AlgorithmLibrary/Prim3D.js
// Prim 最小生成树：加权无向图（圆形布局，边长标注），从起始节点出发，
// 树内节点染为青绿色，候选边闪烁青色后熄灭，选中边保持绿色并记录到顶部序列行。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Graph3D } from '../3D/modes/Graph3D.js';
import { VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Prim3D');

const scene = new Scene3D('scene', { cameraPos: [0, 300, 620], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });
function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

const N = 6, R = 210;
const TREE_COLOR = 0x22d3ee;   // 树内节点青绿
const SELECT_COLOR = 0x34d399; // 选中边绿
const graph = new Graph3D(scene, { radius: 17 });
const POS = [];
for (let i = 0; i < N; i++) {
  const a = (i / N) * Math.PI * 2 - Math.PI / 2;
  POS[i] = [Math.cos(a) * R, 0, Math.sin(a) * R];
  graph.addNode(String(i), String(i), POS[i][0], POS[i][1], POS[i][2]);
}
const adjW = [[1, 2], [0, 2, 3], [0, 1, 3, 4], [1, 2, 4, 5], [2, 3, 5], [3, 4]];
const w6 = { '0->1': 4, '1->0': 4, '0->2': 2, '2->0': 2, '1->2': 1, '2->1': 1, '1->3': 5, '3->1': 5, '2->3': 8, '3->2': 8, '2->4': 10, '4->2': 10, '3->4': 2, '4->3': 2, '3->5': 6, '5->3': 6, '4->5': 3, '5->4': 3 };
for (const [a, b] of [[0, 1], [0, 2], [1, 2], [1, 3], [2, 3], [2, 4], [3, 4], [3, 5], [4, 5]]) {
  graph.addEdge(String(a), String(b), { weight: w6[`${a}->${b}`] });
}

// ---- 模型（与 /tmp/3dtest/graphmodel.mjs 一致）----
function primModel(adj, w, n, start) {
  const inTree = Array(n).fill(false);
  const key = Array(n).fill(Infinity);
  const parent = Array(n).fill(-1);
  key[start] = 0;
  const selected = [];
  const steps = [];
  for (let iter = 0; iter < n; iter++) {
    let u = -1;
    for (let i = 0; i < n; i++) if (!inTree[i] && (u === -1 || key[i] < key[u])) u = i;
    if (u === -1) break;
    inTree[u] = true;
    if (parent[u] !== -1) selected.push([parent[u], u]);
    const cand = [];
    for (const v of adj[u]) {
      if (inTree[v]) continue;
      cand.push(v);
      const wuv = w[`${u}->${v}`];
      if (wuv < key[v]) { key[v] = wuv; parent[v] = u; }
    }
    steps.push({ u, cand });
  }
  return { selected, steps };
}

const status = panel.addStatus('');
const hint = new VText(scene, { text: '点击「运行Prim」开始', x: 0, y: 240, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const seqTexts = [];

function colorEdge(a, b, color) {
  const e = graph.edges.get(`${a}->${b}`);
  if (!e) return;
  const from = new THREE.Color(e.baseColor);
  const to = new THREE.Color(color);
  C(300, (p) => {
    e.mesh.material.color.copy(from).lerp(to, p);
    e.mesh.material.opacity = e.baseOpacity + p * 0.35;
  }, () => { e.mesh.material.color.setHex(e.baseColor); e.mesh.material.opacity = e.baseOpacity; });
}

function markTreeNode(u) {
  const m = graph.nodes.get(String(u)).node.mesh;
  const from = new THREE.Color(PALETTE.node);
  const to = new THREE.Color(TREE_COLOR);
  C(300, (p) => {
    m.material.color.copy(from).lerp(to, p);
    m.material.emissive.copy(to).multiplyScalar(0.6);
  }, () => { m.material.color.setHex(PALETTE.node); m.material.emissive.setHex(PALETTE.nodeEmissive); });
  const mm = m;
  C(380, (p) => { mm.scale.setScalar(1.12 + 0.18 * Math.sin(p * Math.PI)); }, () => mm.scale.setScalar(1));
}

// 选中边文字从边中点飞入顶部序列行
function spawnSeqText(a, b) {
  const w = w6[`${a}->${b}`];
  const mx = (POS[a][0] + POS[b][0]) / 2;
  const mz = (POS[a][2] + POS[b][2]) / 2;
  const idx = seqTexts.length;
  const vt = new VText(scene, { text: `(${a},${b}) w${w}`, x: mx, y: 30, z: mz, color: PALETTE.text, scale: 0.75 });
  vt.sprite.scale.set(0.1, 0.05, 1);
  const to = { x: -280 + idx * 110, y: 185, z: 0 };
  C(300, (p) => { const s = 0.01 + p * 0.99; vt.sprite.scale.set(75 * s, 37 * s, 1); }, () => vt.sprite.scale.set(0.1, 0.05, 1));
  C(600, (p) => {
    const t = easeInOut(p);
    vt.sprite.position.set(mx + (to.x - mx) * t, 30 + (to.y - 30) * t, mz + (0 - mz) * t);
  }, () => vt.sprite.position.set(mx, 30, mz));
  seqTexts.push(vt);
}

function runPrim() {
  engine.clear();
  for (let i = 0; i < N; i++) graph.dehighlightNode(String(i), C);
  for (const key of graph.edges.keys()) {
    const [a, b] = key.split('->');
    graph.lightEdge(a, b, false, C);
  }
  seqTexts.forEach((vt) => vt.remove());
  seqTexts.length = 0;

  const start = Math.min(Math.max((startId | 0), 0), N - 1);
  const { selected, steps } = primModel(adjW, w6, N, start);
  let total = 0;
  for (const [a, b] of selected) total += w6[`${a}->${b}`];

  // 预展开为扁平命令序列：命令 fn 会在动画期间每帧被调用，
  // 若在 fn 内再入队命令会指数膨胀，必须一次性入队。
  for (let si = 0; si < steps.length; si++) {
    const { u, cand } = steps[si];
    const isFirst = si === 0;
    if (!isFirst) {
      const [pa, pb] = selected[si - 1];
      colorEdge(pa, pb, SELECT_COLOR);
      spawnSeqText(pa, pb);
    }
    markTreeNode(u);
    C(1, () => hint.setText('将节点 ' + u + ' 加入树' + (isFirst ? '（起点）' : '，经边 (' + selected[si - 1].join(',') + ') 连接')), () => {});
    // 候选边闪烁
    for (const v of cand) {
      C(1, () => hint.setText('节点 ' + u + ' 的候选边 ' + u + '→' + v + '（权重 ' + w6[`${u}->${v}`] + '）'), () => {});
      graph.lightEdge(String(u), String(v), true, C);
      C(550, () => graph.lightEdge(String(u), String(v), false, C));
      C(180, () => {}, () => {});
    }
    C(250, () => {}, () => {});
  }
  C(1, () => {
    status.textContent = 'MST 总权重 = ' + total;
    hint.setText('Prim 完成，MST 总权重 = ' + total);
  }, () => {});
}

function clearAll() {
  engine.clear();
  seqTexts.forEach((vt) => vt.remove());
  seqTexts.length = 0;
  for (const [, e] of graph.nodes) e.node.remove();
  graph.nodes.clear();
  for (const [, e] of graph.edges) {
    scene.remove(e.mesh);
    if (e.weightLabel) e.weightLabel.remove();
  }
  graph.edges.clear();
  startId = 0;
  status.textContent = '';
  hint.setText('已清空画布');
}

let startId = 0;
panel.addLabel('起始节点: ');
panel.addInput('0', (v) => { startId = parseInt(v, 10) || 0; runPrim(); }, 1);
panel.addButton('运行Prim', runPrim);
panel.addButton('清空', clearAll);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
