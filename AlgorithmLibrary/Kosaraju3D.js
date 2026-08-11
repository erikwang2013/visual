// AlgorithmLibrary/Kosaraju3D.js — Kosaraju 强连通分量：第一遍 DFS 求完成序（顶行栈盒），反图按完成序逆序 DFS，每棵 DFS 树 = 一个 SCC（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText, VNode, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Kosaraju3D');

const scene = new Scene3D('scene', { cameraPos: [0, 260, 720], fov: 55 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff;
const hint = new VText(scene, { text: '点击「运行演示」开始：Kosaraju 强连通分量（两次 DFS）', x: 0, y: 315, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');
const outT = new VText(scene, { text: '', x: 0, y: -215, z: 0, color: PALETTE.textGlow, scale: 0.7 });

const N = 7, R = 205;
const EDGES = [[0, 1], [1, 2], [2, 0], [2, 3], [3, 4], [4, 3], [3, 5], [5, 6]];
const adj = Array.from({ length: N }, () => []);
const radj = Array.from({ length: N }, () => []);
const nodeView = new Map();
const edgeView = new Map();   // 'f->t' -> { tube, arrow }
const finView = new Map();    // i -> 完成序号标签
const stackBoxes = [];
const SCC_COLORS = [RED, ORANGE, CYAN, PUR, GREEN, GOLD];
let state = [], state2 = [], members = [];
const finishOrder = [];
const sccList = [];

function posOf(i) { const a = (i / N) * Math.PI * 2 - Math.PI / 2; return new THREE.Vector3(Math.cos(a) * R, 0, Math.sin(a) * R); }
function tube(a, b) {
  const curve = new THREE.CatmullRomCurve3([a, b]);
  return new THREE.Mesh(new THREE.TubeGeometry(curve, 4, 2.5, 6), new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, opacity: 0.55 }));
}
function arrow(a, b) {
  const d = new THREE.Vector3().subVectors(b, a).normalize();
  const cone = new THREE.Mesh(new THREE.ConeGeometry(7, 16, 8), new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, opacity: 0.55 }));
  cone.position.copy(b).addScaledVector(d, -24);
  cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
  return cone;
}
function clearView() {
  nodeView.forEach(v => scene.remove(v.mesh));
  edgeView.forEach(e => { scene.remove(e.tube); e.tube.geometry.dispose(); e.tube.material.dispose(); scene.remove(e.arrow); e.arrow.geometry.dispose(); e.arrow.material.dispose(); });
  stackBoxes.forEach(e => scene.remove(e.box.mesh));
  nodeView.clear(); edgeView.clear(); stackBoxes.length = 0; sccList.length = 0;
}
function buildGraph() {
  clearView();
  for (let i = 0; i < N; i++) { adj[i].length = 0; radj[i].length = 0; }
  for (let i = 0; i < N; i++) {
    const p = posOf(i);
    const vn = new VNode(scene, { radius: 20, x: p.x, y: p.y, z: p.z, label: String(i), color: BLUE, emissive: BLUE });
    nodeView.set(i, vn);
    const fT = new VText(scene, { text: '', x: 0, y: 46, z: 0, color: CYAN, scale: 0.58 });
    vn.mesh.add(fT.sprite);
    finView.set(i, fT);
  }
  for (const [f, t] of EDGES) {
    const a = posOf(f), b = posOf(t);
    const m = tube(a, b);
    const ar = arrow(a, b);
    scene.add(m); scene.add(ar);
    edgeView.set(f + '->' + t, { tube: m, arrow: ar });
    adj[f].push(t);
    radj[t].push(f);
  }
}
function setNodeColor(i, c) { nodeView.get(i).setColor(c, c); }
function setEdgeColor(f, t, c, op) { const e = edgeView.get(f + '->' + t); if (e) { e.tube.material.color.setHex(c); e.tube.material.opacity = op; e.arrow.material.color.setHex(c); e.arrow.material.opacity = op; } }
function resetEdgeColors() { edgeView.forEach(e => { e.tube.material.color.setHex(WHITE); e.tube.material.opacity = 0.55; e.arrow.material.color.setHex(WHITE); e.arrow.material.opacity = 0.55; }); }
function* pushBox(id) {
  const x = 165 - stackBoxes.length * 55;
  const box = new VBox(scene, { w: 42, h: 42, d: 20, x, y: 175, z: 0, label: id, color: ORANGE, emissive: ORANGE });
  box.mesh.scale.setScalar(0.01);
  yield A(280, p => { box.mesh.scale.setScalar(0.01 + 0.99 * p); });
  stackBoxes.push({ id, box });
}
function* popBox() {
  const e = stackBoxes.pop();
  if (!e) return;
  yield A(240, p => { e.box.mesh.scale.setScalar(1 - p); });
  scene.remove(e.box.mesh);
}

function* dfs1(u) {
  state[u] = 1;
  setNodeColor(u, GOLD);
  yield S(() => outT.setText('第一遍 DFS 访问 ' + u));
  yield W(300);
  for (const v of adj[u]) {
    if (state[v] === 0) {
      setEdgeColor(u, v, CYAN, 1);
      yield S(() => outT.setText('树边 ' + u + '→' + v + '：递归'));
      yield W(280);
      yield* dfs1(v);
      resetEdgeColors();
    } else if (state[v] === 1) {
      setEdgeColor(u, v, RED, 0.8);
      yield S(() => outT.setText('后向边 ' + u + '→' + v + '（' + v + ' 尚未完成）'));
      yield W(260);
      resetEdgeColors();
    }
  }
  state[u] = 2;
  finishOrder.push(u);
  setNodeColor(u, GREEN);
  finView.get(u).setText('fin=' + finishOrder.length);
  yield* pushBox(String(u));
  yield S(() => outT.setText('完成 ' + u + '：入栈（完成序 #' + finishOrder.length + '）'));
  yield W(320);
}
function* dfs2(u, ci) {
  state2[u] = 1;
  members.push(u);
  setNodeColor(u, SCC_COLORS[ci]);
  yield S(() => outT.setText('反图 DFS 到 ' + u + '，加入 SCC'));
  yield W(280);
  for (const v of radj[u]) {
    if (state2[v] === 0) {
      setEdgeColor(v, u, PUR, 0.9);
      yield* dfs2(v, ci);
      resetEdgeColors();
    }
  }
}

function* kosarajuGen() {
  state = Array(N).fill(0); state2 = Array(N).fill(0); finishOrder.length = 0; sccList.length = 0;
  yield S(() => outT.setText('Kosaraju：① 原图 DFS 求完成序 → ② 反图按完成序逆序 DFS，每棵 DFS 树 = 一个 SCC'));
  yield W(600);
  for (let i = 0; i < N; i++) {
    if (state[i] === 0) {
      yield S(() => outT.setText('——— 第一遍新 DFS 根：' + i + ' ———'));
      yield W(300);
      yield* dfs1(i);
    }
  }
  yield S(() => outT.setText('完成序（栈顶 = 最后完成）：' + finishOrder.join(' → ')));
  yield W(550);
  yield S(() => outT.setText('——— 第二遍：边全部反向（紫），按完成序逆序出栈 DFS ———'));
  yield W(500);
  while (finishOrder.length) {
    const u = finishOrder.pop();
    yield* popBox();
    if (state2[u] === 0) {
      members = [];
      yield S(() => outT.setText('反图新根 ' + u + '：DFS 树上全部节点组成一个 SCC'));
      yield W(320);
      yield* dfs2(u, sccList.length % SCC_COLORS.length);
      sccList.push(members.slice());
      yield S(() => outT.setText('发现 SCC {' + members.join(',') + '}'));
      yield W(550);
    }
  }
  yield S(() => outT.setText('全部 ' + sccList.length + ' 个 SCC：' + sccList.map(s => '{' + s.join(',') + '}').join('  ')));
  yield W(550);
  yield S(() => { status.textContent = 'Kosaraju 完成：' + sccList.length + ' 个 SCC，O(V+E)'; });
  yield W(450);
  resetEdgeColors();
}

function* runKosaraju() {
  buildGraph();
  hint.setText('Kosaraju：两次 DFS 找 SCC，思路直观');
  yield W(400);
  yield* kosarajuGen();
  yield S(() => { outT.setText(''); hint.setText('Kosaraju 完成：SCC ' + sccList.length + ' 个：' + sccList.map(s => '{' + s.join(',') + '}').join(' ')); });
}

panel.addButton('运行演示', () => engine.start(runKosaraju()));
panel.addButton('清空', () => { engine.clear(); clearView(); hint.setText('已清空，可重新运行'); status.textContent = ''; outT.setText(''); });
panel.addLabel('（拖拽旋转视角，滚轮缩放；青 = 第一遍树边，红 = 后向边，紫 = 反图遍历边；顶行为完成序栈；同色节点 = 同一 SCC）');

scene.start(engine);
