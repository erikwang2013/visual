// AlgorithmLibrary/HopcroftKarp3D.js — Hopcroft-Karp：BFS 分层（dist 标注）+ DFS 沿最短增广路批量翻转，O(E√V) 二分图最大匹配（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText, VNode, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('HopcroftKarp3D');

const scene = new Scene3D('scene', { cameraPos: [0, 300, 760], fov: 55 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff;
const hint = new VText(scene, { text: '点击「运行演示」开始：Hopcroft-Karp（BFS 分层 + DFS 批量增广）', x: 0, y: 310, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');
const outT = new VText(scene, { text: '', x: 0, y: -250, z: 0, color: PALETTE.textGlow, scale: 0.7 });

const NL = 4, NR = 4;
const LX = -140, RX = 140;
const LY = [110, 35, -40, -115];
const EDGES = [[0, 0], [0, 1], [1, 0], [1, 2], [2, 2], [3, 1], [3, 3]];
const adj = Array.from({ length: NL }, () => []);
const nodeView = new Map();   // 'L0' / 'R1' -> VNode
const edgeView = new Map();   // 'u-v' -> { tube }
const distView = new Map();   // 'L0' -> dist 标签
const queueBoxes = [];
let pairL = [], pairR = [], dist = [];

function tube(a, b) {
  const curve = new THREE.CatmullRomCurve3([a, b]);
  return new THREE.Mesh(new THREE.TubeGeometry(curve, 4, 2.5, 6), new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, opacity: 0.55 }));
}
function clearView() {
  nodeView.forEach(v => scene.remove(v.mesh));
  edgeView.forEach(e => { scene.remove(e.tube); e.tube.geometry.dispose(); e.tube.material.dispose(); });
  queueBoxes.forEach(e => scene.remove(e.box.mesh));
  nodeView.clear(); edgeView.clear(); queueBoxes.length = 0;
}
function buildGraph() {
  clearView();
  for (let i = 0; i < NL; i++) adj[i].length = 0;
  for (let i = 0; i < NL; i++) {
    const vn = new VNode(scene, { radius: 20, x: LX, y: LY[i], z: 0, label: 'L' + i, color: BLUE, emissive: BLUE });
    nodeView.set('L' + i, vn);
    const dT = new VText(scene, { text: '', x: 0, y: 46, z: 0, color: CYAN, scale: 0.55 });
    vn.mesh.add(dT.sprite);
    distView.set('L' + i, dT);
  }
  for (let j = 0; j < NR; j++) {
    const vn = new VNode(scene, { radius: 20, x: RX, y: LY[j], z: 0, label: 'R' + j, color: BLUE, emissive: BLUE });
    nodeView.set('R' + j, vn);
  }
  for (const [u, v] of EDGES) {
    const a = new THREE.Vector3(LX, LY[u], 0), b = new THREE.Vector3(RX, LY[v], 0);
    const m = tube(a, b);
    scene.add(m);
    edgeView.set(u + '-' + v, { tube: m });
    adj[u].push(v);
  }
}
function setNodeColor(key, c) { nodeView.get(key).setColor(c, c); }
function setEdgeColor(u, v, c, op) { const e = edgeView.get(u + '-' + v); if (e) { e.tube.material.color.setHex(c); e.tube.material.opacity = op; } }
function refreshMatched() {
  edgeView.forEach((e, key) => {
    const [u, v] = key.split('-').map(Number);
    const isMatched = pairR[v] === u;
    e.tube.material.color.setHex(isMatched ? GREEN : WHITE);
    e.tube.material.opacity = isMatched ? 1 : 0.55;
  });
  nodeView.forEach((v, key) => {
    if (!key.startsWith('L')) v.setColor(pairR[Number(key.slice(1))] !== -1 ? GREEN : BLUE, pairR[Number(key.slice(1))] !== -1 ? GREEN : BLUE);
  });
}
function showDists() {
  for (let i = 0; i < NL; i++) distView.get('L' + i).setText(dist[i] === Infinity ? 'd=∞' : 'd=' + dist[i]);
}
function* pushBox(id) {
  const x = -150 + queueBoxes.length * 55;
  const box = new VBox(scene, { w: 42, h: 42, d: 20, x, y: 190, z: 0, label: id, color: ORANGE, emissive: ORANGE });
  box.mesh.scale.setScalar(0.01);
  yield A(280, p => { box.mesh.scale.setScalar(0.01 + 0.99 * p); });
  queueBoxes.push({ id, box });
}
function* popBox() {
  const e = queueBoxes.shift();
  if (!e) return;
  yield A(240, p => { e.box.mesh.scale.setScalar(1 - p); });
  scene.remove(e.box.mesh);
  const tasks = queueBoxes.map(b => ({ box: b.box, from: b.box.mesh.position.x }));
  if (tasks.length) yield A(300, p => tasks.forEach(t => t.box.mesh.position.x = t.from - 55 * p));
}

function* bfsLayers() {
  dist.fill(Infinity);
  const q = [];
  for (let i = 0; i < NL; i++) {
    if (pairL[i] === -1) { dist[i] = 0; q.push(i); yield* pushBox('L' + i); }
  }
  showDists();
  yield S(() => outT.setText('BFS 分层：自由左点 dist=0 入队（' + (q.map(x => 'L' + x).join('、') || '无') + '）'));
  yield W(450);
  let head = 0, found = false;
  while (head < q.length) {
    const u = q[head++];
    setNodeColor('L' + u, GOLD);
    yield* popBox();
    yield S(() => outT.setText('出队 L' + u + '（d=' + dist[u] + '），扫描其边'));
    yield W(300);
    for (const v of adj[u]) {
      setEdgeColor(u, v, CYAN, 1);
      yield W(180);
      if (pairR[v] === -1) {
        setEdgeColor(u, v, PUR, 1);
        found = true;
        yield S(() => outT.setText('R' + v + ' 自由 → 找到增广路（最短距离层次完成）'));
        yield W(320);
      } else {
        const w = pairR[v];
        if (dist[w] === Infinity) {
          dist[w] = dist[u] + 1;
          q.push(w);
          yield* pushBox('L' + w);
          setNodeColor('L' + w, ORANGE);
          yield S(() => outT.setText('R' + v + ' 已配给 L' + w + ' → L' + w + ' 入队，dist=' + dist[w]));
          yield W(340);
        } else {
          yield S(() => outT.setText('R' + v + ' 的配对方 L' + w + ' 已分层（d=' + dist[w] + '），跳过'));
          yield W(240);
        }
      }
    }
    setNodeColor('L' + u, BLUE);
    refreshMatched();
  }
  showDists();
  yield S(() => outT.setText('BFS 结束' + (found ? '：存在最短增广路，转入 DFS 批量增广' : '：无增广路 → 匹配最大')));
  yield W(450);
  return found;
}

function* dfsAug(u) {
  for (const v of adj[u]) {
    if (dist[pairR[v] === -1 ? -1 : pairR[v]] === dist[u] + 1) {
      setEdgeColor(u, v, GOLD, 1);
      setNodeColor('R' + v, ORANGE);
      yield S(() => outT.setText('DFS L' + u + ' → R' + v + '（满足 dist 层次 +1）' + (pairR[v] === -1 ? '，R 自由 → 翻转' : '，继续深入 L' + pairR[v])));
      yield W(320);
      if (pairR[v] === -1 || (yield* dfsAug(pairR[v]))) {
        pairR[v] = u; pairL[u] = v;
        refreshMatched();
        setEdgeColor(u, v, GOLD, 1);
        setNodeColor('L' + u, GREEN);
        yield S(() => outT.setText('增广翻转：L' + u + '-R' + v + ' 成为匹配边'));
        yield W(380);
        return true;
      }
      setEdgeColor(u, v, WHITE, 0.4);
    }
  }
  return false;
}

function* hkGen() {
  pairL = Array(NL).fill(-1); pairR = Array(NR).fill(-1); dist = Array(NL).fill(Infinity);
  yield S(() => outT.setText('Hopcroft-Karp：每次「BFS 求最短增广路距离 + DFS 批量翻转」为一阶段，共 O(√V) 阶段'));
  yield W(600);
  let phase = 0;
  while (true) {
    phase++;
    yield S(() => outT.setText('——— 第 ' + phase + ' 阶段：BFS 分层 ———'));
    yield W(450);
    const found = yield* bfsLayers();
    if (!found) break;
    yield S(() => outT.setText('——— DFS 批量增广（只走 dist 递增的边）———'));
    yield W(450);
    for (let u = 0; u < NL; u++) {
      if (pairL[u] !== -1 || dist[u] !== 0) continue;
      setNodeColor('L' + u, GOLD);
      yield S(() => outT.setText('自由左点 L' + u + ' 尝试 DFS 增广'));
      yield W(280);
      if (yield* dfsAug(u)) {
        yield S(() => outT.setText('L' + u + ' 增广成功'));
      } else {
        setNodeColor('L' + u, RED);
        yield S(() => outT.setText('L' + u + ' 无可用的最短增广路（已尽力）'));
        yield W(300);
        setNodeColor('L' + u, BLUE);
      }
    }
    refreshMatched();
    yield S(() => outT.setText('第 ' + phase + ' 阶段完成，重新 BFS 分层'));
    yield W(500);
  }
  const pairs = [];
  for (let v = 0; v < NR; v++) if (pairR[v] !== -1) pairs.push('L' + pairR[v] + '-R' + v);
  yield S(() => outT.setText('最大匹配 ' + pairs.length + ' 对：' + pairs.join('、') + '，共 ' + (phase - 1) + ' 个阶段'));
  yield W(550);
  yield S(() => { status.textContent = 'Hopcroft-Karp 完成：最大匹配 ' + pairs.length + '，O(E√V)'; });
  yield W(450);
  refreshMatched();
}

function* runHK() {
  buildGraph();
  hint.setText('Hopcroft-Karp：BFS 分层 + DFS 批量增广');
  yield W(400);
  yield* hkGen();
  yield S(() => { outT.setText(''); hint.setText('Hopcroft-Karp 完成：最大匹配 ' + pairR.filter(x => x !== -1).length + '，O(E√V)'); });
}

panel.addButton('运行演示', () => engine.start(runHK()));
panel.addButton('清空', () => { engine.clear(); clearView(); hint.setText('已清空，可重新运行'); status.textContent = ''; outT.setText(''); });
panel.addLabel('（拖拽旋转视角，滚轮缩放；顶行 = BFS 队列；青 = 探测边，金 = 增广边，绿 = 匹配边，紫 = 自由右点；左点上方 d=N 为层次）');

scene.start(engine);
