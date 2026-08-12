// AlgorithmLibrary/Heap3D.js — 最小堆：插入尾随+上浮、删根+下沉 —— 堆序（父≤子）+ 完全二叉树，插入/删除都 O(log n)（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Heap3D');

const scene = new Scene3D('scene', { cameraPos: [0, 210, 620], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155, ROSE = 0xfb7185, VIOLET = 0xa78bfa, AMBER = 0xfbbf24;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：最小堆 插入×5 + 删除最小', x: 0, y: 290, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 0, y: 258, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: -120, z: 0, color: PALETTE.textGlow, scale: 0.56 });
const outT = new VText(scene, { text: '', x: 0, y: -205, z: 0, color: PALETTE.textGlow, scale: 0.62 });
const arrT = new VText(scene, { text: '堆数组：[]', x: 0, y: -160, z: 0, color: CYAN, scale: 0.58 });

const nodes = [];   // 堆下标 -> VNode
const heap = [];    // 值数组
let edgeMeshes = new Map();
function posOf(i) {
  const d = Math.floor(Math.log2(i + 1));
  const idx = i + 1 - (1 << d);
  const cnt = 1 << d;
  return { x: (idx - (cnt - 1) / 2) * 90, y: 165 - d * 85 };
}
function ensureNode(i) {
  if (!nodes[i]) {
    const p = posOf(i);
    nodes[i] = new VNode(scene, { radius: 24, x: p.x, y: p.y, z: 0, label: String(heap[i]), color: BLUE, emissive: BLUE });
  }
  return nodes[i];
}
function refreshEdges() {
  edgeMeshes.forEach(m => scene.remove(m));
  edgeMeshes = new Map();
  for (let i = 1; i < heap.length; i++) {
    const a = posOf(Math.floor((i - 1) / 2)), b = posOf(i);
    edgeMeshes.set(i, tubeBetween(scene, { x: a.x, y: a.y, z: 0 }, { x: b.x, y: b.y, z: 0 }, { color: PALETTE.edge, opacity: 0.4, radius: 2 }));
  }
}
function showArr() { arrT.setText('堆数组：[' + heap.join(', ') + ']', { color: CYAN }); }

function* siftUp(idx) {
  let i = idx;
  while (i > 0) {
    const p = Math.floor((i - 1) / 2);
    if (heap[p] <= heap[i]) {
      yield S(() => stageT.setText('父 ' + heap[p] + ' ≤ 子 ' + heap[i] + ' —— 堆序满足，' + heap[i] + ' 停在位置 ' + i));
      yield W(550);
      return;
    }
    nodes[p].setColor(RED, RED); nodes[i].setColor(ORANGE, ORANGE);
    eqT.setText('父 ' + heap[p] + ' > 子 ' + heap[i] + ' —— 违反堆序（红=父，橙=子）');
    yield S(() => stageT.setText('上浮：' + heap[i] + ' 与父 ' + heap[p] + ' 交换位置'));
    yield W(650);
    const t = heap[p]; heap[p] = heap[i]; heap[i] = t;
    const np = posOf(p), ni = posOf(i);
    nodes[p].moveTo(ni.x, ni.y, 0, 450);
    nodes[i].moveTo(np.x, np.y, 0, 450);
    const tn = nodes[p]; nodes[p] = nodes[i]; nodes[i] = tn;
    yield W(500);
    nodes[p].setColor(BLUE, BLUE); nodes[i].setColor(BLUE, BLUE);
    eqT.setText('');
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
      yield S(() => stageT.setText(heap[i] + ' 落在位置 ' + i + '：两个孩子都不更小，堆序恢复'));
      yield W(550);
      return;
    }
    nodes[m].setColor(RED, RED); nodes[i].setColor(ORANGE, ORANGE);
    eqT.setText('孩子 ' + heap[m] + ' < 父 ' + heap[i] + ' —— 与更小的孩子交换（红=子，橙=父）');
    yield S(() => stageT.setText('下沉：' + heap[i] + ' 与孩子 ' + heap[m] + ' 交换位置'));
    yield W(650);
    const t = heap[m]; heap[m] = heap[i]; heap[i] = t;
    const nm = posOf(m), ni = posOf(i);
    nodes[m].moveTo(ni.x, ni.y, 0, 450);
    nodes[i].moveTo(nm.x, nm.y, 0, 450);
    const tn = nodes[m]; nodes[m] = nodes[i]; nodes[i] = tn;
    yield W(500);
    nodes[m].setColor(BLUE, BLUE); nodes[i].setColor(BLUE, BLUE);
    eqT.setText('');
    i = m;
  }
}

function* heapGen() {
  yield S(() => { hint.setText('最小堆两条铁律：堆序（父 ≤ 子）+ 完全二叉树。插入/删除都只沿一条路径 O(log n)'); stageT.setText('演示：插入 5, 3, 8, 1, 7，再删除最小 —— 全程可视化上浮/下沉'); });
  yield W(700);
  const ins = [5, 3, 8, 1, 7];
  for (let k = 0; k < ins.length; k++) {
    const v = ins[k];
    heap.push(v);
    const idx = heap.length - 1;
    ensureNode(idx);
    yield S(() => stageT.setText('插入 ' + v + '：先追加到完全二叉树的末尾（位置 ' + idx + '）—— 完全性天然满足'));
    yield W(550);
    refreshEdges();
    showArr();
    yield W(350);
    yield* siftUp(idx);
    if (heap.length === ins.length) {
      yield S(() => { outT.setText('插入全部完成：堆 = ' + heap.join(' → ') + '（根最小）—— 数组形式 [' + heap.join(',') + ']'); status.textContent = '最小堆：[1,3,8,5,7]（5 次插入，3 次交换）'; });
      yield W(900);
    }
  }
  yield S(() => stageT.setText('删除最小：根 ' + heap[0] + ' 弹出（红）—— 用最后一位 ' + heap[heap.length - 1] + ' 顶到根，再下沉'));
  yield W(700);
  nodes[0].setColor(RED, RED);
  yield W(500);
  nodes[0].remove(); nodes[0] = null;
  const lastIdx = heap.length - 1;
  const lastNode = nodes[lastIdx];
  nodes[lastIdx] = null;
  heap[0] = heap.pop();
  nodes[0] = lastNode;
  const p0 = posOf(0);
  lastNode.moveTo(p0.x, p0.y, 0, 500);
  lastNode.setColor(ORANGE, ORANGE);
  yield S(() => stageT.setText('最后一位 ' + heap[0] + ' 顶到根（橙）—— 完全性恢复，但堆序可能被破坏'));
  yield W(700);
  refreshEdges();
  showArr();
  yield* siftDown(0);
  nodes[0].setColor(GOLD, GOLD);
  yield S(() => { outT.setText('删除完成：堆 = ' + heap.join(' → ') + '（根 3 最小）—— 旧根 1 已弹出 ✓'); status.textContent = '最小堆最终：[3,5,8,7]（extract-min 后堆序完整）'; });
  yield W(900);
  yield S(() => { hint.setText('复杂度：插入 O(log n)（上浮最多到根），删除最小 O(log n)（下沉最多到叶）—— 但取最小值是 O(1)'); outT.setText('应用：优先队列、Dijkstra/Prim 优化、Top-K（大小根堆配合）、调度器。i 的子 = 2i+1、2i+2，父 = ⌊(i−1)/2⌋'); });
  yield W(1100);
  yield S(() => { hint.setText('最小堆演示完成：插入 ×5 → [1,3,8,5,7]，删除最小 → [3,5,8,7]'); outT.setText(''); });
  yield W(400);
}

function* runHeap() {
  hint.setText('最小堆：插入上浮，删除下沉');
  yield W(400);
  yield* heapGen();
}

engine.queue(() => runHeap());
panel.addButton('清空', () => { engine.clear(); nodes.forEach((n, i) => { if (n) { n.remove(); nodes[i] = null; } }); heap.length = 0; refreshEdges(); stageT.setText(''); eqT.setText(''); outT.setText(''); arrT.setText('堆数组：[]'); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；红 = 待交换的父/子，橙 = 上浮或下沉的节点，金 = 最终根；下方 = 堆数组）');

scene.start(engine);
