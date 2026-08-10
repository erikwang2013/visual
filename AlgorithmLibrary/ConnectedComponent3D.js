// AlgorithmLibrary/ConnectedComponent3D.js
// 连通分量：左右两个分量的样例图，逐分量 BFS 遍历，
// 节点与边染成分量色（分量1 青绿、分量2 紫色），并标注分量编号。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Graph3D } from '../3D/modes/Graph3D.js';
import { VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('ConnectedComponent3D');

const scene = new Scene3D('scene', { cameraPos: [0, 300, 620], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const N = 8;
const COMP_COLORS = [0x22d3ee, 0xa78bfa]; // 分量1 青绿，分量2 紫
const graph = new Graph3D(scene, { radius: 16 });

// 分量1：左侧 5 节点圆；分量2：右侧 3 节点圆
function circ(cx, cz, r, i, n) {
  const a = (i / n) * Math.PI * 2 - Math.PI / 2;
  return [cx + Math.cos(a) * r, 0, cz + Math.sin(a) * r];
}
const POS = [];
for (let i = 0; i < 5; i++) POS[i] = circ(-170, 0, 120, i, 5);
for (let i = 0; i < 3; i++) POS[5 + i] = circ(200, 0, 95, i, 3);
for (let i = 0; i < N; i++) graph.addNode(String(i), String(i), POS[i][0], POS[i][1], POS[i][2]);

const EDGES = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 4], [1, 3], [5, 6], [6, 7], [5, 7]];
const adj = Array.from({ length: N }, () => []);
for (const [a, b] of EDGES) {
  graph.addEdge(String(a), String(b));
  adj[a].push(b); adj[b].push(a);
}

// ---- 模型（与 /tmp/3dtest/graphmodel.mjs 一致）----
function connectedModel(adj, n) {
  const comps = [];
  const seen = new Set();
  for (let s = 0; s < n; s++) {
    if (seen.has(s)) continue;
    const comp = [];
    const stack = [s];
    seen.add(s);
    while (stack.length) {
      const u = stack.pop();
      comp.push(u);
      for (const v of adj[u]) if (!seen.has(v)) { seen.add(v); stack.push(v); }
    }
    comps.push(comp);
  }
  return comps;
}

const status = panel.addStatus('');
const hint = new VText(scene, { text: '点击「运行连接组件」开始', x: 0, y: 240, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const compLabels = [];

function colorNode(id, color) {
  const m = graph.nodes.get(String(id)).node.mesh;
  const from = new THREE.Color(PALETTE.node);
  const to = new THREE.Color(color);
  C(300, (p) => {
    m.material.color.copy(from).lerp(to, p);
    m.material.emissive.setHex(color);
  }, () => { m.material.color.setHex(PALETTE.node); m.material.emissive.setHex(PALETTE.nodeEmissive); });
}

function colorEdge(a, b, color) {
  const e = graph.edges.get(`${a}->${b}`);
  if (!e) return;
  const from = new THREE.Color(e.baseColor);
  const to = new THREE.Color(color);
  C(280, (p) => {
    e.mesh.material.color.copy(from).lerp(to, p);
    e.mesh.material.opacity = e.baseOpacity + p * 0.35;
  }, () => { e.mesh.material.color.setHex(e.baseColor); e.mesh.material.opacity = e.baseOpacity; });
}

function runCC() {
  engine.clear();
  for (let i = 0; i < N; i++) graph.dehighlightNode(String(i), C);
  for (const key of graph.edges.keys()) {
    const [a, b] = key.split('->');
    graph.lightEdge(a, b, false, C);
  }
  compLabels.forEach((vt) => vt.remove());
  compLabels.length = 0;

  const comps = connectedModel(adj, N);
  const compOf = Array(N).fill(-1);
  comps.forEach((c, ci) => c.forEach((u) => { compOf[u] = ci; }));
  const edgeComp = new Map();
  for (const [a, b] of EDGES) edgeComp.set(`${a}->${b}`, compOf[a]);

  // 预展开为扁平命令序列：命令 fn 会在动画期间每帧被调用，
  // 若在 fn 内再入队命令会指数膨胀，必须一次性入队。
  for (let ci = 0; ci < comps.length; ci++) {
    const comp = comps[ci];
    const color = COMP_COLORS[ci % COMP_COLORS.length];
    // 分量编号标签（置于分量几何中心上方）
    const cx = comp.reduce((s, u) => s + POS[u][0], 0) / comp.length;
    const lbl = new VText(scene, { text: '连通分量 ' + (ci + 1), x: cx, y: 125, z: 0, color: PALETTE.textGlow, scale: 0.8 });
    lbl.sprite.scale.set(0.1, 0.05, 1);
    C(300, (p) => { const s = 0.01 + p * 0.99; lbl.sprite.scale.set(80 * s, 40 * s, 1); }, () => lbl.sprite.remove());
    compLabels.push(lbl);
    C(1, () => hint.setText('开始遍历连通分量 ' + (ci + 1) + '：' + comp.join(', ')), () => {});
    for (const u of comp) {
      graph.highlightNode(String(u), C);
      colorNode(u, color);
      C(1, () => hint.setText('分量 ' + (ci + 1) + '：访问节点 ' + u), () => {});
      // 点亮本分量内与该节点相连的边
      for (const v of adj[u]) {
        if (compOf[v] === ci && v > u) colorEdge(u, v, color);
      }
      C(160, () => {}, () => {});
    }
    C(1, () => { status.textContent = '分量 ' + (ci + 1) + ' 完成（' + comp.join(', ') + '），共 ' + comps.length + ' 个分量'; }, () => {});
    C(220, () => {}, () => {});
  }
  C(1, () => {
    status.textContent = '共 ' + comps.length + ' 个连通分量，遍历完成';
    hint.setText('连接组件分析完成：共 ' + comps.length + ' 个连通分量');
  }, () => {});
}

function clearAll() {
  engine.clear();
  compLabels.forEach((vt) => vt.remove());
  compLabels.length = 0;
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

panel.addButton('运行连接组件', runCC);
panel.addButton('清空', clearAll);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
