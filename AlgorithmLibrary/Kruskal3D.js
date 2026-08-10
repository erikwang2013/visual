// AlgorithmLibrary/Kruskal3D.js
// Kruskal 最小生成树：加权无向图（左侧圆形布局），边按权重升序检查，
// 选中边染绿并记录，成环的边闪红，右侧 9x3 表格 [边,权重,状态] 同步标记 ✓/✗，
// 顶部显示并查集 parent 数组变化。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Graph3D } from '../3D/modes/Graph3D.js';
import { Table3D } from '../3D/modes/Table3D.js';
import { VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Kruskal3D');

const scene = new Scene3D('scene', { cameraPos: [0, 300, 620], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });
function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

const N = 6, R = 150, CX = -190;
const SELECT_COLOR = 0x34d399; // 选中边绿
const RED_COLOR = 0xef4444;    // 成环边红
const graph = new Graph3D(scene, { radius: 15 });
const POS = [];
for (let i = 0; i < N; i++) {
  const a = (i / N) * Math.PI * 2 - Math.PI / 2;
  POS[i] = [CX + Math.cos(a) * R, 0, Math.sin(a) * R];
  graph.addNode(String(i), String(i), POS[i][0], POS[i][1], POS[i][2]);
}
const w6 = { '0->1': 4, '1->0': 4, '0->2': 2, '2->0': 2, '1->2': 1, '2->1': 1, '1->3': 5, '3->1': 5, '2->3': 8, '3->2': 8, '2->4': 10, '4->2': 10, '3->4': 2, '4->3': 2, '3->5': 6, '5->3': 6, '4->5': 3, '5->4': 3 };
const EDGES = [[0, 1], [0, 2], [1, 2], [1, 3], [2, 3], [2, 4], [3, 4], [3, 5], [4, 5]];
for (const [a, b] of EDGES) graph.addEdge(String(a), String(b), { weight: w6[`${a}->${b}`] });

// 右侧表格：9 行 [边, 权重, 状态]
const M = EDGES.length;
const table = new Table3D(scene, { rows: M, cols: 3, cellW: 66, cellH: 34, startX: 150, startY: 130 });
table.create();
table.colLabels[0].setText('边');
table.colLabels[1].setText('权重');
table.colLabels[2].setText('状态');
for (let r = 0; r < M; r++) table.setRowLabel(r, String(r));

// ---- 模型（与 /tmp/3dtest/graphmodel.mjs 一致）----
function kruskalModel(edges, n) {
  const sorted = [...edges].sort((x, y) => x.w - y.w);
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x) => { while (parent[x] !== x) x = parent[x]; return x; };
  const selected = [];
  const rejected = [];
  const steps = [];
  for (const e of sorted) {
    const ra = find(e.a), rb = find(e.b);
    if (ra !== rb) { parent[ra] = rb; selected.push(e); steps.push({ e, action: 'select', parent: [...parent] }); }
    else { rejected.push(e); steps.push({ e, action: 'reject', parent: [...parent] }); }
  }
  return { selected, rejected, sorted, steps };
}

const edges = EDGES.map(([a, b]) => ({ a, b, w: w6[`${a}->${b}`] }));
const status = panel.addStatus('');
const hint = new VText(scene, { text: '点击「运行Kruskal」开始', x: 0, y: 240, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const parentText = new VText(scene, { text: '', x: 0, y: 215, z: 0, color: PALETTE.textDim, scale: 0.7 });

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

function flashRed(a, b) {
  const e = graph.edges.get(`${a}->${b}`);
  if (!e) return;
  C(280, (p) => { e.mesh.material.color.copy(new THREE.Color(e.baseColor)).lerp(new THREE.Color(RED_COLOR), p); e.mesh.material.opacity = e.baseOpacity + p * 0.4; }, () => { e.mesh.material.color.setHex(e.baseColor); e.mesh.material.opacity = e.baseOpacity; });
  C(620, (p) => { e.mesh.material.color.copy(new THREE.Color(RED_COLOR)).lerp(new THREE.Color(e.baseColor), p); }, () => {});
}

function flashEndpoints(u) {
  const m = graph.nodes.get(String(u)).node.mesh;
  C(420, (p) => { m.scale.setScalar(1 + 0.25 * Math.sin(p * Math.PI)); }, () => m.scale.setScalar(1));
}

function runKruskal() {
  engine.clear();
  for (let i = 0; i < N; i++) graph.dehighlightNode(String(i), C);
  for (const key of graph.edges.keys()) {
    const [a, b] = key.split('->');
    graph.lightEdge(a, b, false, C);
  }
  parentText.setText('');
  for (let r = 0; r < M; r++) { table.unhighlightCell(r, 0, C); table.unhighlightCell(r, 2, C); table.setCell(r, 0, '-', C); table.setCell(r, 1, '-', C); table.setCell(r, 2, '', C); }
  hint.setText('边按权重升序排列，依次检查是否成环');

  const { steps } = kruskalModel(edges, N);
  let total = 0;
  for (const e of steps) if (e.action === 'select') total += e.e.w;

  let si = 0;
  function step() {
    if (si >= steps.length) {
      status.textContent = 'MST 总权重 = ' + total;
      hint.setText('Kruskal 完成，MST 总权重 = ' + total);
      return;
    }
    const { e, action, parent } = steps[si];
    table.setCell(si, 0, e.a + '-' + e.b, C);
    table.setCell(si, 1, String(e.w), C);
    flashEndpoints(e.a); flashEndpoints(e.b);
    parentText.setText('parent: [' + parent.join(', ') + ']');
    if (action === 'select') {
      colorEdge(e.a, e.b, SELECT_COLOR);
      table.setCell(si, 2, '✓', C);
      table.highlightCell(si, 2, C);
      hint.setText('边 ' + e.a + '-' + e.b + '（权重 ' + e.w + '）不成环，选中');
    } else {
      flashRed(e.a, e.b);
      table.setCell(si, 2, '✗', C);
      table.highlightCell(si, 2, C);
      hint.setText('边 ' + e.a + '-' + e.b + '（权重 ' + e.w + '）与已选边成环，跳过');
    }
    si++;
    C(350, () => table.unhighlightCell(si - 1, 2, C));
    C(650, step);
  }
  step();
}

panel.addButton('运行Kruskal', runKruskal);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
