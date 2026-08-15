// AlgorithmLibrary/Heap3D.js — 最小堆：插入尾随+上浮、删根+下沉 —— 堆序（父≤子）+ 完全二叉树，插入/删除都 O(log n)（function* 生成器驱动）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Heap3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, RED = 0xfb7185, ORANGE = 0xfb923c;
const status = panel.addStatus('就绪');

const INS = [5, 3, 8, 1, 7];
const nodes = [];   // 堆下标 -> VNode（模块级预建）
const heap = [];    // 值数组
let edgeMeshes = new Map();

const ROOT_Y = 800, STEP_Y = 80;
function posOf(i) {
  const d = Math.floor(Math.log2(i + 1));
  const idx = i + 1 - (1 << d);
  return { x: 320 + (idx - ((1 << d) - 1) / 2) * 90, y: ROOT_Y - d * STEP_Y };
}
for (let i = 0; i < INS.length; i++) {
  const p = posOf(i);
  const n = new VNode(scene, { radius: 24, x: p.x, y: p.y, z: 0, label: String(INS[i]), color: BLUE, emissive: BLUE });
  n.mesh.scale.setScalar(0.01);
  nodes.push(n);
}
function refreshEdges() {
  edgeMeshes.forEach(m => scene.remove(m));
  edgeMeshes = new Map();
  for (let i = 1; i < heap.length; i++) {
    const a = posOf(Math.floor((i - 1) / 2)), b = posOf(i);
    edgeMeshes.set(i, tubeBetween(scene, { x: a.x, y: a.y, z: 0 }, { x: b.x, y: b.y, z: 0 }, { color: PALETTE.edge, opacity: 0.4, radius: 2 }));
  }
}
function resetAll() {
  heap.length = 0;
  nodes.forEach((n, i) => {
    if (!n) return;
    const p = posOf(i);
    n.mesh.position.set(p.x, p.y, 0);
    n.mesh.scale.setScalar(0.01);
    n.setText(String(INS[i]));
    n.setColor(BLUE, BLUE);
  });
  refreshEdges();
}

function* siftUp(idx) {
  let i = idx;
  while (i > 0) {
    const p = Math.floor((i - 1) / 2);
    if (heap[p] <= heap[i]) {
      yield S(() => { status.textContent = '上浮停止：父 ' + heap[p] + ' ≤ 子 ' + heap[i] + ' —— 堆序满足，' + heap[i] + ' 停在位置 ' + i; });
      yield W(550);
      return;
    }
    nodes[p].setColor(RED, RED); nodes[i].setColor(ORANGE, ORANGE);
    yield S(() => { status.textContent = '违反堆序（红=父，橙=子）：' + heap[i] + ' 与父 ' + heap[p] + ' 交换位置，继续上浮'; });
    yield W(650);
    const t = heap[p]; heap[p] = heap[i]; heap[i] = t;
    const np = posOf(p), ni = posOf(i);
    nodes[p].moveTo(ni.x, ni.y, 0, 450);
    nodes[i].moveTo(np.x, np.y, 0, 450);
    const tn = nodes[p]; nodes[p] = nodes[i]; nodes[i] = tn;
    yield W(500);
    nodes[p].setColor(BLUE, BLUE); nodes[i].setColor(BLUE, BLUE);
    i = p;
  }
}

function* siftDown(idx) {
  let i = idx;
  const n = heap.length;
  while (true) {
    const l = 2 * i + 1, r = 2 * i + 2;
    let m = i;
    if (l < n && heap[l] < heap[m]) m = l;
    if (r < n && heap[r] < heap[m]) m = r;
    if (m === i) {
      yield S(() => { status.textContent = '下沉停止：' + heap[i] + ' 落在位置 ' + i + ' —— 两个孩子都不更小，堆序恢复'; });
      yield W(550);
      return;
    }
    nodes[m].setColor(RED, RED); nodes[i].setColor(ORANGE, ORANGE);
    yield S(() => { status.textContent = '违反堆序（红=子，橙=父）：孩子 ' + heap[m] + ' < 父 ' + heap[i] + ' —— 与更小的孩子交换'; });
    yield W(650);
    const t = heap[m]; heap[m] = heap[i]; heap[i] = t;
    const nm = posOf(m), ni = posOf(i);
    nodes[m].moveTo(ni.x, ni.y, 0, 450);
    nodes[i].moveTo(nm.x, nm.y, 0, 450);
    const tn = nodes[m]; nodes[m] = nodes[i]; nodes[i] = tn;
    yield W(500);
    nodes[m].setColor(BLUE, BLUE); nodes[i].setColor(BLUE, BLUE);
    i = m;
  }
}

function* heapGen() {
  yield S(() => { status.textContent = '最小堆两条铁律：堆序（父 ≤ 子）+ 完全二叉树。演示：插入 5, 3, 8, 1, 7，再删除最小 —— 全程可视化上浮/下沉'; });
  yield W(800);
  for (let k = 0; k < INS.length; k++) {
    const v = INS[k];
    heap.push(v);
    const idx = heap.length - 1;
    const n = nodes[idx];
    yield S(() => { status.textContent = '插入 ' + v + '：追加到完全二叉树的末尾（位置 ' + idx + '）—— 完全性天然满足'; });
    yield W(500);
    yield A(320, p => n.mesh.scale.setScalar(0.01 + 0.99 * (p * p * (3 - 2 * p))));
    refreshEdges();
    yield W(200);
    yield* siftUp(idx);
  }
  yield S(() => { status.textContent = '插入全部完成：堆 = [' + heap.join(',') + ']，根 1 最小 —— 5 次插入共 3 次交换'; });
  yield W(700);
  yield S(() => { status.textContent = '删除最小：根 1 弹出（红）—— 用最后一位 7 顶到根，再下沉恢复堆序'; });
  yield W(600);
  nodes[0].setColor(RED, RED);
  yield W(500);
  nodes[0].mesh.scale.setScalar(0.01);
  const lastIdx = heap.length - 1;
  const lastNode = nodes[lastIdx];
  nodes[lastIdx] = null;
  heap[0] = heap.pop();
  nodes[0] = lastNode;
  const p0 = posOf(0);
  lastNode.moveTo(p0.x, p0.y, 0, 500);
  lastNode.setColor(ORANGE, ORANGE);
  yield S(() => { status.textContent = '最后一位 ' + heap[0] + ' 顶到根（橙）—— 完全性恢复，但堆序可能被破坏'; });
  yield W(600);
  refreshEdges();
  yield W(250);
  yield* siftDown(0);
  nodes[0].setColor(GOLD, GOLD);
  yield S(() => { status.textContent = 'extract-min 完成：堆 = [' + heap.join(',') + ']，根 ' + heap[0] + ' 最小，旧根 1 已弹出'; });
  yield W(800);
  yield S(() => { status.textContent = '复杂度：插入/删除 O(log n)、取最小 O(1)；应用：优先队列、Dijkstra/Prim 优化、Top-K、调度器 —— 子 = 2i+1/2i+2，父 = ⌊(i−1)/2⌋'; });
  yield W(1000);
  yield S(() => { status.textContent = '最小堆演示完成：插入 ×5 → [1,3,8,5,7]，删除最小 → [3,5,8,7]'; });
  yield W(400);
}

nodes[0].mesh.scale.setScalar(1);  // 初始化默认演示体：首个堆节点
function* runHeap() {
  resetAll();
  yield W(300);
  yield* heapGen();
}

engine.queue(() => runHeap());
panel.addButton('清空', () => { engine.clear(); resetAll(); status.textContent = ''; });

scene.start(engine);
