// AlgorithmLibrary/Boruvka3D.js — Borůvka 最小生成树：每轮每个连通分量选最廉价出边并合并
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Graph3D } from '../3D/modes/Graph3D.js';
import { VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Boruvka3D');

const scene = new Scene3D('scene', { cameraPos: [0, 300, 700], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const N = 6, R = 200;
const graph = new Graph3D(scene, { radius: 17 });
const POS = [];
for (let i = 0; i < N; i++) {
  const a = (i / N) * Math.PI * 2 - Math.PI / 2;
  POS[i] = [Math.cos(a) * R, 0, Math.sin(a) * R];
  graph.addNode(String(i), String(i), POS[i][0], POS[i][1], POS[i][2]);
}
// 无向加权图（MST = 24：0-1 2, 1-2 3, 3-4 5, 3-5 8, 2-3 6）
const EDGES = [[0, 1, 2], [0, 2, 4], [1, 2, 3], [2, 3, 6], [2, 4, 7], [3, 4, 5], [3, 5, 8], [4, 5, 9]];
const COMP_COLORS = [PALETTE.blue, PALETTE.green, PALETTE.orange, PALETTE.purple, PALETTE.red, PALETTE.yellow];
const edgeKeys = [];
for (const [u, v, w] of EDGES) {
  const k = u + '->' + v;
  graph.addEdge(String(u), String(v), { weight: w });
  edgeKeys.push(k);
}

const status = panel.addStatus('');
const hint = new VText(scene, { text: '点击「运行 Boruvka」开始：分量合并求最小生成树', x: 0, y: 265, z: 0, color: PALETTE.textGlow, scale: 0.85 });

// 预计算各轮：cands 每分量最廉价边 / adds 本轮新增边 / comps 合并后分量
function computeRounds() {
  const rounds = [];
  let comp = Array.from({ length: N }, (_, i) => i);
  const added = [];
  while (new Set(comp).size > 1) {
    const best = new Map();
    for (const [u, v, w] of EDGES) {
      if (comp[u] === comp[v]) continue;
      for (const c of [comp[u], comp[v]]) {
        if (!best.has(c) || w < best.get(c)[2]) best.set(c, [u, v, w]);
      }
    }
    const cands = [...best.values()];
    const seen = new Set();
    const adds = [];
    for (const [u, v, w] of cands) {
      const k = u < v ? u + 'x' + v : v + 'x' + u;
      if (!seen.has(k)) { seen.add(k); adds.push([u, v, w]); }
    }
    added.push(...adds);
    const adjM = Array.from({ length: N }, () => []);
    for (const [u, v] of added) { adjM[u].push(v); adjM[v].push(u); }
    const nc = Array(N).fill(-1);
    let cid = 0;
    for (let i = 0; i < N; i++) {
      if (nc[i] !== -1) continue;
      const st = [i]; nc[i] = cid;
      while (st.length) {
        const x = st.pop();
        for (const y of adjM[x]) if (nc[y] === -1) { nc[y] = cid; st.push(y); }
      }
      cid++;
    }
    rounds.push({ cands, adds, comps: nc });
    comp = nc;
  }
  return rounds;
}

function paintComps(comps) {
  for (let i = 0; i < N; i++) {
    const e = graph.nodes.get(String(i));
    const c = COMP_COLORS[comps[i] % COMP_COLORS.length];
    C(250, () => e.node.setColor(c, c), () => {});
  }
}

function runBoruvka() {
  engine.clear();
  const rounds = computeRounds();
  for (let i = 0; i < N; i++) graph.dehighlightNode(String(i), C);
  for (const k of edgeKeys) {
    const [a, b] = k.split('->');
    graph.lightEdge(a, b, false, C);
  }
  for (let i = 0; i < N; i++) graph.nodes.get(String(i)).node.setColor(PALETTE.node, PALETTE.nodeEmissive);

  let r = 0;
  let total = 0;
  const step = () => {
    if (r >= rounds.length) {
      status.textContent = 'Borůvka 完成：最小生成树权重 = ' + total;
      hint.setText('所有节点同属一个分量，算法结束');
      return;
    }
    const round = rounds[r]; r++;
    hint.setText('第 ' + r + ' 轮：每个连通分量选择自己的最廉价出边');
    let k = 0;
    const flashNext = () => {
      if (k >= round.cands.length) {
        total += round.adds.reduce((s, x) => s + x[2], 0);
        for (const [u, v, w] of round.adds) {
          const key = u + '->' + v;
          C(300, () => {
            const entry = graph.edges.get(key);
            if (entry) entry.mesh.material.color.setHex(PALETTE.green);
          }, () => {});
        }
        hint.setText('选定边加入生成树，分量合并为 ' + new Set(round.comps).size + ' 组');
        paintComps(round.comps);
        status.textContent = '第 ' + r + ' 轮新增 ' + round.adds.length + ' 条边，累计权重 ' + total;
        C(700, step);
        return;
      }
      const [u, v, w] = round.cands[k]; k++;
      hint.setText('分量候选边 ' + u + '—' + v + '（权 ' + w + '）');
      C(420, () => {
        graph.lightEdge(String(u), String(v), true, C);
        flashNext();
      });
    };
    flashNext();
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
}

panel.addButton('运行 Boruvka', runBoruvka);
panel.addButton('清空', clearAll);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
