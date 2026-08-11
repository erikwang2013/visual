// AlgorithmLibrary/HeapSort3D.js — 堆排序：完全二叉树三维分层 + 橙色牵引光束 + 交换碰撞火花（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme, glowMaterial } from '../3D/Glow.js';
applyTheme('HeapSort3D');

const scene = new Scene3D('scene', { cameraPos: [0, 80, 660], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BASE = 0x60a5fa, WHITE = 0xf8fafc, GOLD = 0xfcd34d, ORANGE = 0xfb923c, OK = 0x4ade80;

const hint = new VText(scene, { text: '堆排序：完全二叉树三维分层，橙色牵引光束 = 父子比较，火花 = 交换', x: 0, y: 385, z: 0, color: PALETTE.textGlow, scale: 0.8 });
const status = panel.addStatus('就绪');

const N = 15;
const depthOf = i => Math.floor(Math.log2(i + 1));
const nodeX = i => { const d = depthOf(i), k = i - (2 ** d - 1), step = [0, 96, 100, 52][d]; return (k - (2 ** d - 1) / 2) * step; };
const nodeY = d => 300 - d * 95;
const nodeZ = d => -d * 40;
const pos = i => new THREE.Vector3(nodeX(i), nodeY(depthOf(i)), nodeZ(depthOf(i)));

const nodes = [], heap = [], edges = [];
for (let i = 0; i < N; i++) {
  const v = 6 + Math.floor(Math.random() * 15);
  const g = new THREE.Group();
  const s = new THREE.Mesh(new THREE.SphereGeometry(17, 20, 20), glowMaterial(BASE, { emissive: BASE }));
  g.add(s);
  const lbl = new VText(scene, { text: String(v), x: 0, y: 0, z: 0, color: '#ffffff', scale: 0.72 });
  scene.remove(lbl.sprite); g.add(lbl.sprite);
  g.position.copy(pos(i));
  scene.add(g);
  nodes.push({ g, s, lbl, value: v });
  heap.push(nodes[i]);
}
for (let i = 1; i < N; i++) {
  edges.push(tubeBetween(scene, pos((i - 1) >> 1), pos(i), { color: PALETTE.edge, radius: 2, opacity: 0.35 }));
}
const setNodeColor = (n, c) => { n.s.material.color.setHex(c); n.s.material.emissive.setHex(c); };

// ---- 橙色牵引光束（父子比较时显现） ----
let beam = null;
function showBeam(a, b) {
  hideBeam();
  const curve = new THREE.CatmullRomCurve3([a.clone(), b.clone()]);
  beam = new THREE.Mesh(new THREE.TubeGeometry(curve, 3, 3.2, 6), new THREE.MeshBasicMaterial({ color: ORANGE, transparent: true, opacity: 0.85 }));
  scene.add(beam);
}
function hideBeam() {
  if (!beam) return;
  scene.remove(beam);
  beam.geometry.dispose(); beam.material.dispose();
  beam = null;
}

// ---- 火花粒子（交换碰撞） ----
let fxGroup = new THREE.Group();
scene.add(fxGroup);
const clearFx = () => { scene.remove(fxGroup); fxGroup = new THREE.Group(); scene.add(fxGroup); };
function* sparks(x, y, z, color = GOLD, n = 12) {
  const parts = [];
  for (let i = 0; i < n; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(2.8, 6, 6), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 }));
    s.position.set(x, y, z);
    const a = Math.random() * Math.PI * 2, sp = 90 + Math.random() * 110;
    parts.push({ s, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp + 60 });
    fxGroup.add(s);
  }
  yield A(450, p => parts.forEach(pt => {
    pt.s.position.set(x + pt.vx * 0.5 * p, y + pt.vy * 0.5 * p - 60 * p * p, z);
    pt.s.material.opacity = 0.95 * (1 - p);
  }));
  parts.forEach(pt => fxGroup.remove(pt.s));
}

// ---- 交换：两节点沿弧线互换槽位（缠绕 + 火花） ----
function* swapSlots(i, j, opts = {}) {
  const a = heap[i], b = heap[j];
  const pi = pos(i), pj = pos(j);
  const lift = opts.lift ?? 60, ms = opts.ms ?? 480;
  yield A(ms, p => {
    a.g.position.set(pi.x + (pj.x - pi.x) * p, pi.y + (pj.y - pi.y) * p + lift * Math.sin(Math.PI * p), pi.z + (pj.z - pi.z) * p);
    b.g.position.set(pj.x + (pi.x - pj.x) * p, pj.y + (pi.y - pj.y) * p + lift * Math.sin(Math.PI * p), pj.z + (pi.z - pj.z) * p);
    a.g.rotation.y = Math.PI * p;
    b.g.rotation.y = Math.PI * p;
  });
  a.g.rotation.y = 0; b.g.rotation.y = 0;
  const t = heap[i]; heap[i] = heap[j]; heap[j] = t;
  if (opts.sparks) yield* sparks((pi.x + pj.x) / 2, Math.min(pi.y, pj.y) + lift * 0.7, (pi.z + pj.z) / 2, opts.sparks);
}

let outIdx = 0;
function* flyOut(n, from) {
  const outX = 270 - outIdx * 40;
  outIdx++;
  yield S(() => hint.setText(n.value + ' 归位到有序输出区（金色）'));
  yield A(520, p => {
    n.g.position.set(from.x + (outX - from.x) * p, from.y + (-200 - from.y) * p, from.z + (0 - from.z) * p);
    n.g.scale.setScalar(1.35 - 0.35 * p);
  });
  n.g.scale.setScalar(1);
  setNodeColor(n, GOLD);
  yield W(220);
}

// ---- 上浮：与父比较，孩子更大则沿光束交换 ----
function* siftUp(i) {
  while (i > 0) {
    const p = (i - 1) >> 1;
    showBeam(pos(i), pos(p));
    setNodeColor(heap[i], WHITE); setNodeColor(heap[p], WHITE);
    yield S(() => hint.setText('上浮比较：a[' + i + ']=' + heap[i].value + ' 与父 a[' + p + ']=' + heap[p].value));
    yield W(320);
    if (heap[i].value <= heap[p].value) {
      setNodeColor(heap[i], BASE); setNodeColor(heap[p], BASE);
      hideBeam(); break;
    }
    setNodeColor(heap[i], ORANGE); setNodeColor(heap[p], ORANGE);
    yield S(() => hint.setText('孩子更大，沿光束交换（火花）'));
    yield* swapSlots(i, p, { sparks: ORANGE });
    setNodeColor(heap[i], BASE); setNodeColor(heap[p], BASE);
    hideBeam();
    yield W(140);
    i = p;
  }
}

// ---- 下沉：与较大孩子比较，更大则交换 ----
function* siftDown(i, size) {
  while (true) {
    const l = 2 * i + 1;
    if (l >= size) break;
    let m = l;
    const r = l + 1;
    if (r < size && heap[r].value > heap[l].value) m = r;
    showBeam(pos(i), pos(m));
    setNodeColor(heap[i], WHITE); setNodeColor(heap[m], WHITE);
    yield S(() => hint.setText('下沉比较：a[' + i + ']=' + heap[i].value + ' 与较大孩子 a[' + m + ']=' + heap[m].value));
    yield W(320);
    if (heap[i].value >= heap[m].value) {
      setNodeColor(heap[i], BASE); setNodeColor(heap[m], BASE);
      hideBeam(); break;
    }
    setNodeColor(heap[i], ORANGE); setNodeColor(heap[m], ORANGE);
    yield S(() => hint.setText('孩子更大，交换下沉（火花）'));
    yield* swapSlots(i, m, { sparks: ORANGE });
    setNodeColor(heap[i], BASE); setNodeColor(heap[m], BASE);
    hideBeam();
    yield W(140);
    i = m;
  }
}

function resetAll() {
  hideBeam(); clearFx();
  outIdx = 0;
  for (let i = 0; i < N; i++) {
    nodes[i].g.position.copy(pos(i));
    nodes[i].g.rotation.set(0, 0, 0);
    nodes[i].g.scale.setScalar(1);
    setNodeColor(nodes[i], BASE);
    heap[i] = nodes[i];
  }
}
function* doneMsg() {
  yield S(() => { hint.setText('堆排序完成：数组已升序排列'); status.textContent = '堆排序完成：O(n log n)'; nodes.forEach(n => setNodeColor(n, OK)); });
  yield W(700);
}

function* heapSort() {
  yield S(resetAll);
  hint.setText('阶段 1/2：构建最大堆（逐节点上浮）');
  yield W(400);
  for (let i = 1; i < N; i++) {
    yield S(() => hint.setText('插入 a[' + i + ']=' + heap[i].value + '，上浮调整'));
    yield* siftUp(i);
  }
  yield S(() => { hint.setText('最大堆构建完成：根 a[0]=' + heap[0].value + ' 为最大值'); status.textContent = '最大堆构建完成'; });
  yield W(500);
  hint.setText('阶段 2/2：反复取根（最大）放入有序区，再下沉调整');
  yield W(400);
  for (let size = N; size > 1; size--) {
    const root = heap[0];
    setNodeColor(root, GOLD);
    yield S(() => hint.setText('根 a[0]=' + root.value + ' 为当前最大值，与堆尾交换'));
    yield A(360, p => root.g.scale.setScalar(1 + 0.35 * p));
    yield W(220);
    yield* swapSlots(0, size - 1, { sparks: GOLD });
    yield* flyOut(root, pos(size - 1));
    yield* siftDown(0, size - 1);
  }
  yield* flyOut(heap[0], pos(0));
  yield* doneMsg();
}

function* randomizeGen() {
  yield S(resetAll);
  hint.setText('随机打乱数组');
  for (let i = 0; i < N; i++) {
    const v = 6 + Math.floor(Math.random() * 15);
    nodes[i].value = v;
    nodes[i].lbl.setText(String(v));
    yield W(60);
  }
  yield S(() => hint.setText('已随机化，可点击「运行堆排序」'));
}

panel.addButton('随机化', () => engine.start(randomizeGen()));
panel.addButton('运行堆排序', () => engine.start(heapSort()));
panel.addButton('清空', () => { engine.clear(); resetAll(); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；橙光束 = 父子比较，火花 = 交换碰撞）');

scene.start(engine);
