// AlgorithmLibrary/ComparisonSort3D.js — 比较排序 6 合 1：冒泡/选择/插入/希尔/归并/快速（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme, glowMaterial } from '../3D/Glow.js';
applyTheme('ComparisonSort3D');

const scene = new Scene3D('scene', { cameraPos: [0, 230, 700], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BASE = 0x60a5fa, WHITE = 0xf8fafc, GOLD = 0xfcd34d, CYAN = 0x22d3ee;
const PURPLE = 0xc084fc, RED = 0xef4444, BLUE = 0x3b82f6, YELLOW = 0xfacc15, OK = 0x4ade80;
const GROUP = [0x38bdf8, 0xfb923c, 0x4ade80, 0xf472b6];

const hint = new VText(scene, { text: '比较排序 6 合 1：冒泡 / 选择 / 插入 / 希尔 / 归并 / 快速 — 点击按钮开始', x: 0, y: 330, z: 0, color: PALETTE.textGlow, scale: 0.8 });
const status = panel.addStatus('就绪');
new VText(scene, { text: '临时区', x: 385, y: -152, z: 0, color: PALETTE.textDim, scale: 0.6 });

const DATA = [9, 5, 16, 3, 12, 8, 18, 6, 14, 4, 11, 17, 7, 10];
const N = DATA.length;
const SP = 46;
const X0 = -(N - 1) * SP / 2;
const slotX = i => X0 + i * SP;

const data = DATA.slice();
const bars = [];
for (let i = 0; i < N; i++) {
  const g = new THREE.Group();
  g.position.set(slotX(i), 0, 0);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(30, 1, 30), glowMaterial(BASE, { emissive: BASE }));
  g.add(mesh);
  const lbl = new VText(scene, { text: '', x: 0, y: 0, z: 0, color: PALETTE.textGlow, scale: 0.6 });
  scene.remove(lbl.sprite);
  g.add(lbl.sprite);
  scene.add(g);
  bars.push({ g, mesh, lbl });
}
function setV(i, v) {
  data[i] = v;
  const b = bars[i];
  b.mesh.scale.y = v * 6;
  b.mesh.position.y = v * 3;
  b.lbl.sprite.position.y = v * 6 + 16;
  b.lbl.setText(String(v));
  setBarColor(b, BASE, BASE);
}
function setBarColor(b, c, e) {
  b.mesh.material.color.setHex(c);
  b.mesh.material.emissive.setHex(e ?? c);
}

// ---- 预建辅助视觉：指针球 / 归并墙 / 希尔 gap 平面 ----
const ptrL = new THREE.Mesh(new THREE.SphereGeometry(8, 16, 16), glowMaterial(RED, { emissive: RED }));
const ptrR = new THREE.Mesh(new THREE.SphereGeometry(8, 16, 16), glowMaterial(BLUE, { emissive: BLUE }));
ptrL.position.y = 215; ptrR.position.y = 215;
ptrL.visible = false; ptrR.visible = false;
scene.add(ptrL); scene.add(ptrR);

const wall1 = new THREE.Mesh(new THREE.PlaneGeometry(16, 260), new THREE.MeshBasicMaterial({ color: OK, transparent: true, opacity: 0 }));
const wall2 = new THREE.Mesh(new THREE.PlaneGeometry(16, 260), new THREE.MeshBasicMaterial({ color: OK, transparent: true, opacity: 0 }));
wall1.position.z = -20; wall2.position.z = -20;
scene.add(wall1); scene.add(wall2);

const gapPlanes = [];
for (let r = 0; r < Math.floor(N / 2); r++) {
  const p = new THREE.Mesh(new THREE.PlaneGeometry(14, 300), new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0, side: THREE.DoubleSide }));
  p.position.set(slotX(r), 130, -30);
  scene.add(p);
  gapPlanes.push(p);
}

// ---- 火花粒子（交换碰撞） ----
let fxGroup = new THREE.Group();
scene.add(fxGroup);
const clearFx = () => { scene.remove(fxGroup); fxGroup = new THREE.Group(); scene.add(fxGroup); };
function* sparks(x, y, color = GOLD, n = 12) {
  const parts = [];
  for (let i = 0; i < n; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(2.6, 6, 6), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 }));
    s.position.set(x, y, 10);
    const a = Math.random() * Math.PI * 2, sp = 90 + Math.random() * 110;
    parts.push({ s, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp + 60 });
    fxGroup.add(s);
  }
  yield A(450, p => parts.forEach(pt => {
    pt.s.position.set(x + pt.vx * 0.5 * p, y + pt.vy * 0.5 * p - 60 * p * p, 10);
    pt.s.material.opacity = 0.95 * (1 - p);
  }));
  parts.forEach(pt => fxGroup.remove(pt.s));
}

// ---- 交换动画：弧线升起 + 缠绕旋转半圈 + 碰撞火花 ----
function* arcSwap(i, j, opts = {}) {
  const a = bars[i], b = bars[j];
  const ax = a.g.position.x, bx = b.g.position.x;
  const ay = a.g.position.y, by = b.g.position.y;
  const lift = opts.lift ?? 90, ms = opts.ms ?? 460;
  yield A(ms, p => {
    a.g.position.x = ax + (bx - ax) * p;
    b.g.position.x = bx + (ax - bx) * p;
    a.g.position.y = ay + lift * Math.sin(Math.PI * p);
    b.g.position.y = by + lift * Math.sin(Math.PI * p);
    a.g.rotation.y = Math.PI * p;
    b.g.rotation.y = Math.PI * p;
  });
  a.g.rotation.y = 0; b.g.rotation.y = 0;
  a.g.position.y = ay; b.g.position.y = by;
  if (opts.sparks) yield* sparks((ax + bx) / 2, Math.max(ay, by) + lift * 0.6, opts.sparks);
  const t = data[i]; data[i] = data[j]; data[j] = t;
  bars[i] = b; bars[j] = a;
}

function resetAll() {
  ptrL.visible = false; ptrR.visible = false;
  wall1.material.opacity = 0; wall2.material.opacity = 0;
  gapPlanes.forEach(p => { p.material.opacity = 0; });
  clearFx();
  for (let i = 0; i < N; i++) {
    const b = bars[i];
    b.g.position.set(slotX(i), 0, 0);
    b.g.rotation.set(0, 0, 0);
    setV(i, data[i]);
  }
}
function* doneMsg(msg) {
  yield S(() => { hint.setText(msg); status.textContent = msg; bars.forEach(b => setBarColor(b, OK, OK)); });
  yield W(700);
}

// ---- 冒泡：相邻白闪 + 弧线交换 + 每轮最大金色沉底 ----
function* bubbleSort() {
  yield S(resetAll);
  hint.setText('冒泡排序：相邻比较白闪，大者交换上浮，每轮最大金色沉底');
  for (let end = N - 1; end > 0; end--) {
    let swapped = false;
    for (let j = 0; j < end; j++) {
      setBarColor(bars[j], WHITE, WHITE);
      setBarColor(bars[j + 1], WHITE, WHITE);
      yield S(() => hint.setText('比较 a[' + j + ']=' + data[j] + ' 与 a[' + (j + 1) + ']=' + data[j + 1]));
      yield W(160);
      if (data[j] > data[j + 1]) {
        yield S(() => hint.setText('交换 ' + data[j] + ' 与 ' + data[j + 1]));
        yield* arcSwap(j, j + 1);
        swapped = true;
      }
      setBarColor(bars[j], BASE, BASE);
      setBarColor(bars[j + 1], BASE, BASE);
    }
    if (!swapped) { yield S(() => hint.setText('本轮无交换，数组已有序')); yield W(300); break; }
    setBarColor(bars[end], GOLD, GOLD);
    yield W(160);
  }
  yield* doneMsg('冒泡排序完成：金色元素依次沉底');
}

// ---- 选择：青=当前最小，紫=已定位 ----
function* selectionSort() {
  yield S(resetAll);
  hint.setText('选择排序：青=当前最小，每轮与最左未定位交换，紫=已定位');
  for (let i = 0; i < N - 1; i++) {
    let min = i;
    setBarColor(bars[min], CYAN, CYAN);
    for (let j = i + 1; j < N; j++) {
      setBarColor(bars[j], WHITE, WHITE);
      yield S(() => hint.setText('比较 a[' + j + ']=' + data[j] + ' 与当前最小 a[' + min + ']=' + data[min]));
      yield W(150);
      if (data[j] < data[min]) {
        setBarColor(bars[min], BASE, BASE);
        min = j;
        setBarColor(bars[min], CYAN, CYAN);
      } else {
        setBarColor(bars[j], BASE, BASE);
      }
    }
    if (min !== i) {
      yield S(() => hint.setText('最小 ' + data[min] + ' 交换到 a[' + i + ']'));
      yield* arcSwap(i, min, { lift: 70 });
    }
    setBarColor(bars[i], PURPLE, PURPLE);
    yield W(160);
  }
  setBarColor(bars[N - 1], PURPLE, PURPLE);
  yield* doneMsg('选择排序完成：紫色为已定位有序区');
}

// ---- 插入：红牌抽取浮起，黄=待右移，落回定位 ----
function* insertionSort() {
  yield S(resetAll);
  hint.setText('插入排序：红牌抽取浮起，黄=待右移元素');
  for (let i = 1; i < N; i++) {
    const key = data[i];
    const keyBar = bars[i];
    setBarColor(keyBar, RED, RED);
    yield A(320, p => { keyBar.g.position.y = key * 3 + 110 * p; });
    yield S(() => hint.setText('抽取 a[' + i + ']=' + key + ' 浮起'));
    yield W(220);
    let j = i - 1;
    while (j >= 0 && data[j] > key) {
      setBarColor(bars[j], YELLOW, YELLOW);
      yield S(() => hint.setText('a[' + j + ']=' + data[j] + ' > ' + key + '，右移留位'));
      yield W(180);
      const b = bars[j];
      yield A(260, p => { b.g.position.x = slotX(j) + (slotX(j + 1) - slotX(j)) * p; });
      data[j + 1] = data[j];
      bars[j + 1] = b;
      setBarColor(b, BASE, BASE);
      j--;
    }
    data[j + 1] = key;
    bars[j + 1] = keyBar;
    yield S(() => hint.setText(key + ' 落回 a[' + (j + 1) + ']'));
    yield A(300, p => {
      keyBar.g.position.x = slotX(i) + (slotX(j + 1) - slotX(i)) * p;
      keyBar.g.position.y = key * 3 + 110 * (1 - p);
    });
    setBarColor(keyBar, OK, OK);
    yield W(140);
    setBarColor(keyBar, BASE, BASE);
  }
  yield* doneMsg('插入排序完成');
}

// ---- 希尔：gap 半透明平面标记分组，组色显示同组 ----
function* shellSort() {
  yield S(resetAll);
  for (let gap = Math.floor(N / 2); gap >= 1; gap = Math.floor(gap / 2)) {
    for (let r = 0; r < gap; r++) gapPlanes[r].material.opacity = 0.14;
    yield S(() => hint.setText('希尔排序：增量 gap = ' + gap + '，半透明平面标记同组元素'));
    yield W(380);
    for (let i = gap; i < N; i++) {
      const key = data[i];
      const keyBar = bars[i];
      setBarColor(keyBar, RED, RED);
      yield W(110);
      let j = i - gap;
      while (j >= 0 && data[j] > key) {
        setBarColor(bars[j], GROUP[j % 4], GROUP[j % 4]);
        yield S(() => hint.setText('组内比较 a[' + j + ']=' + data[j] + ' 与 ' + key));
        yield W(170);
        const b = bars[j];
        yield A(230, p => { b.g.position.x = slotX(j) + (slotX(j + gap) - slotX(j)) * p; });
        data[j + gap] = data[j];
        bars[j + gap] = b;
        setBarColor(b, BASE, BASE);
        j -= gap;
      }
      data[j + gap] = key;
      bars[j + gap] = keyBar;
      yield A(230, p => { keyBar.g.position.x = slotX(i) + (slotX(j + gap) - slotX(i)) * p; });
      setBarColor(keyBar, BASE, BASE);
      yield W(80);
    }
  }
  gapPlanes.forEach(p => { p.material.opacity = 0; });
  yield* doneMsg('希尔排序完成');
}

// ---- 快速：金=枢轴放大，红/蓝指针球，交换 180° 翻转 ----
function* quickSort() {
  yield S(resetAll);
  yield S(() => hint.setText('快速排序：金=枢轴放大，红/蓝小球为左右指针，交换 180° 翻转'));
  yield* qsGen(0, N - 1);
  yield* doneMsg('快速排序完成');
}
function* qsGen(lo, hi) {
  if (lo >= hi) return;
  const pivot = data[lo];
  setBarColor(bars[lo], GOLD, GOLD);
  yield A(340, p => { bars[lo].mesh.scale.set(1, pivot * 6 * (1 + 0.4 * p), 1); });
  yield S(() => hint.setText('枢轴 a[' + lo + '] = ' + pivot + '（金色放大）'));
  yield W(260);
  ptrL.visible = true; ptrR.visible = true;
  ptrL.position.x = slotX(lo + 1); ptrR.position.x = slotX(hi);
  let i = lo + 1, j = hi;
  while (i <= j) {
    ptrL.position.x = slotX(Math.min(i, N - 1));
    ptrR.position.x = slotX(Math.max(j, 0));
    yield S(() => hint.setText('左指针 i=' + i + '（红）向右，右指针 j=' + j + '（蓝）向左'));
    yield W(170);
    while (i <= hi && data[i] <= pivot) { i++; ptrL.position.x = slotX(Math.min(i, N - 1)); yield W(70); }
    while (j >= lo + 1 && data[j] > pivot) { j--; ptrR.position.x = slotX(Math.max(j, 0)); yield W(70); }
    if (i <= j) {
      yield S(() => hint.setText('交换 a[' + i + ']=' + data[i] + ' 与 a[' + j + ']=' + data[j]));
      yield* arcSwap(i, j, { lift: 100, ms: 540 });
      i++; j--;
    }
  }
  yield S(() => hint.setText('枢轴 ' + pivot + ' 落位 a[' + j + ']'));
  yield* arcSwap(lo, j, { lift: 100, ms: 540 });
  ptrL.visible = false; ptrR.visible = false;
  const pv = bars[j];
  pv.mesh.scale.set(1, pivot * 6, 1);
  setBarColor(pv, OK, OK);
  yield W(220);
  yield* qsGen(lo, j - 1);
  yield* qsGen(j + 1, hi);
}

// ---- 归并：两堵绿墙夹击，元素落入临时区，按序弹回 ----
function* mergeSort() {
  yield S(resetAll);
  yield S(() => hint.setText('归并排序：两堵绿墙包夹，元素落入下方临时区，按序弹回'));
  yield* msGen(0, N - 1);
  yield* doneMsg('归并排序完成');
}
function* msGen(lo, hi) {
  if (lo >= hi) return;
  const mid = Math.floor((lo + hi) / 2);
  yield* msGen(lo, mid);
  yield* msGen(mid + 1, hi);
  yield* mergeGen(lo, mid, hi);
}
function* mergeGen(lo, mid, hi) {
  wall1.position.x = slotX(mid);
  wall2.position.x = slotX(mid + 1);
  yield A(300, p => { wall1.material.opacity = 0.5 * p; wall2.material.opacity = 0.5 * p; });
  yield S(() => hint.setText('归并 [' + lo + '..' + mid + '] 与 [' + (mid + 1) + '..' + hi + ']'));
  yield W(240);
  const col = bars.slice();
  const picked = [];
  let li = lo, ri = mid + 1, k = lo;
  const pick = function* (src, kk) {
    const v = data[src];
    picked.push(src);
    setBarColor(col[src], GOLD, GOLD);
    col[src].lbl.setText(String(v));
    yield A(400, p => {
      const b = col[src];
      b.g.position.x = slotX(src) + (slotX(kk) - slotX(src)) * p;
      b.g.position.y = v * 3 + (-150 - v * 3) * p;
      b.g.position.z = 60 * Math.sin(Math.PI * p);
    });
    data[kk] = v;
  };
  while (li <= mid && ri <= hi) {
    setBarColor(bars[li], WHITE, WHITE);
    setBarColor(bars[ri], WHITE, WHITE);
    yield S(() => hint.setText('比较 ' + data[li] + ' 与 ' + data[ri]));
    yield W(200);
    if (data[li] <= data[ri]) { yield* pick(li, k); li++; } else { yield* pick(ri, k); ri++; }
    k++;
  }
  while (li <= mid) { yield* pick(li, k); li++; k++; }
  while (ri <= hi) { yield* pick(ri, k); ri++; k++; }
  yield S(() => hint.setText('临时区已排好，按序弹回主行'));
  yield W(240);
  for (let k2 = lo; k2 <= hi; k2++) {
    const b = bars[k2];
    const v = data[k2];
    setBarColor(b, OK, OK);
    yield A(280, p => { b.g.position.y = -150 + (v * 3 + 150) * p; b.g.position.z = 60 * Math.sin(Math.PI * p); });
    setBarColor(b, BASE, BASE);
    yield W(50);
  }
  yield A(280, p => { wall1.material.opacity = 0.5 * (1 - p); wall2.material.opacity = 0.5 * (1 - p); });
  const col2 = bars.slice();
  picked.forEach((src, idx) => { bars[lo + idx] = col2[src]; });
}

for (let i = 0; i < N; i++) setV(i, data[i]);
panel.addButton('随机化', () => engine.start(randomizeGen()));
panel.addButton('冒泡排序', () => engine.start(bubbleSort()));
panel.addButton('选择排序', () => engine.start(selectionSort()));
panel.addButton('插入排序', () => engine.start(insertionSort()));
panel.addButton('希尔排序', () => engine.start(shellSort()));
panel.addButton('归并排序', () => engine.start(mergeSort()));
panel.addButton('快速排序', () => engine.start(quickSort()));
engine.queue(() => demoDefault());
panel.addButton('清空', () => { engine.clear(); resetAll(); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；每次运行自动复位当前数组）');

function* demoDefault() { yield* randomizeGen(); yield* quickSort(); }

function* randomizeGen() {
  yield S(resetAll);
  hint.setText('随机打乱数组');
  for (let i = 0; i < N; i++) {
    const v = 1 + Math.floor(Math.random() * 20);
    yield S(() => setV(i, v));
    yield W(70);
  }
  yield S(() => hint.setText('已随机化，可点击任一排序'));
}

scene.start(engine);
