// AlgorithmLibrary/Johnson3D.js — Johnson：负权图全源最短路 = Bellman-Ford 重加权 + 每点 Dijkstra
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Johnson3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, ROSE = 0xfb7185, CYAN = 0x67e8f9, PUR = 0xc4b5fd, WHITE = 0xe2e8f0;
const hint = new VText(scene, { text: '点击「运行 Johnson」开始', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const POS = { S: [0, 180, 0], 0: [-130, 40, 0], 1: [130, 40, 0], 2: [-130, -75, 0], 3: [130, -75, 0], 4: [0, -135, 0] };
const EDGES = [
  { u: 0, v: 1, w: 4 }, { u: 0, v: 2, w: 2 }, { u: 1, v: 2, w: 3 },
  { u: 2, v: 1, w: -1 }, { u: 2, v: 3, w: 2 }, { u: 3, v: 4, w: 5 },
  { u: 4, v: 0, w: 8 }, { u: 4, v: 2, w: 1 },
];
const N = 5;

function bellmanFord() {
  const d = [0, Infinity, Infinity, Infinity, Infinity];
  const steps = [];
  for (let r = 0; r < N; r++) {
    let changed = false;
    for (const e of EDGES) {
      if (d[e.u] + e.w < d[e.v]) {
        d[e.v] = d[e.u] + e.w;
        changed = true;
        steps.push({ r, e, d: [...d] });
      }
    }
    if (!changed) break;
  }
  return { h: d, steps };
}
const bf = bellmanFord();
const H = bf.h;
const WP = EDGES.map(e => ({ ...e, w2: e.w + H[e.u] - H[e.v] }));

function dijkstra(src) {
  const dist = new Array(N).fill(Infinity); dist[src] = 0;
  const done = new Array(N).fill(false);
  const steps = [];
  for (let it = 0; it < N; it++) {
    let u = -1;
    for (let i = 0; i < N; i++) if (!done[i] && (u === -1 || dist[i] < dist[u])) u = i;
    done[u] = true;
    steps.push({ type: 'pick', u, dist: [...dist] });
    for (const e of WP) if (e.u === u && !done[e.v] && dist[u] + e.w2 < dist[e.v]) {
      dist[e.v] = dist[u] + e.w2;
      steps.push({ type: 'relax', u, e, dist: [...dist] });
    }
  }
  return { dist, steps };
}
const dj = dijkstra(2);
const real = dj.dist.map((d, v) => d + H[v] - H[2]);

const nodes = [0, 1, 2, 3, 4].map(i =>
  new VNode(scene, { radius: 26, x: POS[i][0], y: POS[i][1], z: 0, label: String(i), color: CYAN, emissive: CYAN }));
const sNode = new VNode(scene, { radius: 20, x: POS.S[0], y: POS.S[1], z: 0, label: 'S', color: WHITE, emissive: WHITE });
const sTubes = [0, 1, 2, 3, 4].map(i =>
  tubeBetween(scene, POS.S, POS[i], { color: 0x64748b, opacity: 0.25, radius: 1.4 }));
const valT = [0, 1, 2, 3, 4].map(i =>
  new VText(scene, { text: 'h = ∞', x: POS[i][0], y: POS[i][1] - 46, z: 0, color: PUR, scale: 0.58 }));
const edges = EDGES.map(e => {
  const a = POS[e.u], b = POS[e.v];
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  const tube = tubeBetween(scene, a, b, { color: e.w < 0 ? ROSE : PALETTE.edge, opacity: 0.5, radius: 2.4 });
  const wt = new VText(scene, { text: String(e.w), x: mx, y: my, z: 8, color: e.w < 0 ? ROSE : PALETTE.textDim, scale: 0.55 });
  return { e, tube, wt };
});
new VText(scene, { text: '负权边 2→1 = −1（红色）：Dijkstra 遇到它就失效，Bellman-Ford 又太慢', x: 0, y: 225, z: 0, color: PALETTE.textDim, scale: 0.68 });
new VText(scene, { text: 'Johnson 思路：加超级源点 S → Bellman-Ford 求 h(v) → 重加权 w′ = w + h(u) − h(v)（全非负）→ 再跑 Dijkstra', x: 0, y: -170, z: 0, color: PALETTE.textDim, scale: 0.62 });
const stageT = new VText(scene, { text: '', x: 0, y: 255, z: 0, color: GOLD, scale: 0.72 });
const outT = new VText(scene, { text: '', x: 0, y: -205, z: 0, color: PALETTE.textGlow, scale: 0.62 });

function resetAll() {
  engine.clear();
  nodes.forEach((n, i) => { n.setColor(CYAN, CYAN); n.setText(String(i)); });
  valT.forEach(t => t.setText('h = ∞', { color: PUR }));
  edges.forEach(({ e, tube, wt }) => {
    tube.material.color.setHex(e.w < 0 ? ROSE : PALETTE.edge); tube.material.opacity = 0.5;
    wt.setText(String(e.w), { color: e.w < 0 ? ROSE : PALETTE.textDim });
  });
  stageT.setText(''); outT.setText('');
}

function runJohnson() {
  resetAll();
  hint.setText('Johnson 解决「负权图的全源最短路」：Dijkstra 快但怕负权，Bellman-Ford 抗负权但慢 —— 两者合体');
  C(900, () => {
    stageT.setText('步骤 1：加超级源点 S，S 到所有节点连 0 权边（浅色细管）');
    sTubes.forEach(t => { t.material.opacity = 0.5; });
  });
  for (const s of bf.steps) {
    C(620, () => {
      const { e } = s;
      edges.forEach(({ tube }, i) => tube.material.color.setHex(i === EDGES.indexOf(e) ? GOLD : (EDGES[i].w < 0 ? ROSE : PALETTE.edge)));
      [0, 1, 2, 3, 4].forEach(i => {
        const v = s.d[i];
        valT[i].setText('h = ' + (v === Infinity ? '∞' : v), { color: v === Infinity ? PUR : GOLD });
      });
      stageT.setText(`步骤 1：Bellman-Ford 松弛 ${e.u}→${e.v}：h(${e.v}) = h(${e.u}) + ${e.w} = ${s.d[e.v]}`);
      hint.setText('每轮对所有边「松弛」：若 h(u)+w < h(v) 则更新 h(v)；N−1 轮后 h 收敛');
    });
  }
  C(900, () => {
    edges.forEach(({ tube }) => tube.material.color.setHex(PALETTE.edge));
    stageT.setText('步骤 2：重加权 w′ = w + h(u) − h(v) —— 所有边变为非负，最短路径结构不变！');
    hint.setText('重加权后 w′ ≥ 0（h 满足三角不等式），负权边 2→1 消失，Dijkstra 可以安全运行');
  });
  edges.forEach(({ e, wt }) => {
    C(480, () => {
      wt.setText(String(e.w2) + '（原 ' + e.w + '）', { color: e.w2 >= 0 ? GREEN : ROSE });
      stageT.setText(`重加权：w′(${e.u}→${e.v}) = ${e.w} + h(${e.u}) − h(${e.v}) = ${e.w} + ${H[e.u]} − ${H[e.v]} = ${e.w2}`);
    });
  });
  C(800, () => {
    stageT.setText('步骤 3：以重加权后的图运行 Dijkstra（从节点 2 出发）');
    valT.forEach(t => t.setText('d = ∞', { color: PUR }));
    hint.setText('h 值已固定，现在每个节点的标签切换为「到源点 2 的 w′ 距离」');
  });
  for (const s of dj.steps) {
    C(560, () => {
      if (s.type === 'pick') {
        nodes[s.u].setColor(GOLD, GOLD); nodes[s.u].pulse();
        stageT.setText(`Dijkstra 取出最小距离节点 ${s.u}（已确定），松弛其出边`);
      } else {
        const { e } = s;
        edges.forEach(({ tube }, i) => tube.material.color.setHex(i === EDGES.indexOf(e) ? GOLD : PALETTE.edge));
        stageT.setText(`Dijkstra 松弛 ${e.u}→${e.v}：d(${e.v}) = d(${e.u}) + w′ = ${s.d[e.v]}`);
      }
      [0, 1, 2, 3, 4].forEach(i => {
        valT[i].setText('d = ' + (s.d[i] === Infinity ? '∞' : s.d[i]), { color: s.d[i] === Infinity ? PUR : (s.d[i] === 0 ? WHITE : GOLD) });
      });
    });
  }
  C(1000, () => {
    edges.forEach(({ tube }) => tube.material.color.setHex(PALETTE.edge));
    nodes.forEach((n, i) => { n.setColor(CYAN, CYAN); n.setText(i + '\n' + real[i]); });
    stageT.setText('步骤 4：还原真实距离 d(u,v) = d′(u,v) + h(v) − h(u)');
    outT.setText('从节点 2 出发的真实最短路：d(2,·) = [' + real.join(', ') + ']（可为负，如 d(2,1) = −1）');
    status.textContent = 'Johnson 全源最短路：从 2 出发真实距离 [' + real.join(', ') + ']';
    hint.setText('最短路径不变性：重加权只是给所有路径「加同一个常数偏移」，最短路径选择不受影响');
  });
  C(1200, () => {
    outT.setText('复杂度：Bellman-Ford O(VE) 一次 + Dijkstra O(E·logV) 每点 → 稠密图优于 N 次 Bellman-Ford');
    hint.setText('Johnson 常用于「带负权边的大规模图」，如 Google Maps 多源查询前的预处理');
  });
}

panel.addButton('运行 Johnson', runJohnson);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；含负权边 2→1 = −1，注意重加权前后变化）');

scene.start(engine);
