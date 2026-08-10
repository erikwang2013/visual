// AlgorithmLibrary/ComparisonSort3D.js
// 比较排序：插入/选择/冒泡/壳/归并/快速
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Array3D } from '../3D/modes/Array3D.js';
import { VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('ComparisonSort3D');

const scene = new Scene3D('scene', { cameraPos: [0, 220, 640], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

const status = panel.addStatus('');
const say = (msg) => C(1, () => { status.textContent = msg; });
let count = 20;
const state = { data: [] };
let array = null, aux = null;
const auxLabel = new VText(scene, { text: '辅助数组', x: -470, y: -175, z: 0, color: PALETTE.textDim, scale: 0.8 });

function layoutFor(n) {
  const spacing = n <= 20 ? 42 : Math.max(24, 760 / (n - 1));
  return { spacing, w: n <= 20 ? 30 : Math.max(16, spacing - 6) };
}

function removeArray(a) {
  if (!a) return;
  for (const el of a.elems) el.remove();
  for (const l of a.indexLabels) l.remove();
  a.clearLines();
}

// VBar 底座固定 y=0，这里包装 setHeight 把柱子整体下移 dy
function lowerBars(arr, dy) {
  for (const el of arr.elems) {
    const orig = el.setHeight.bind(el);
    el.setHeight = (h) => { orig(h); el.mesh.position.y += dy; };
  }
}

function rebuild(n) {
  removeArray(array); removeArray(aux);
  const { spacing, w } = layoutFor(n);
  array = new Array3D(scene, { type: 'bar', count: n, w, h: w, spacing, startY: 0, z: 0 });
  array.create();
  aux = new Array3D(scene, { type: 'bar', count: n, w, h: w, spacing, startY: -175, z: 0 });
  aux.create();
  lowerBars(aux, -175);
  if (n > 20) {
    const f = (spacing - 6) / 40; // 柱体默认宽 40，大数组收窄
    for (const el of array.elems) { el.mesh.scale.x = f; el.mesh.scale.z = f; }
    for (const el of aux.elems) { el.mesh.scale.x = f; el.mesh.scale.z = f; }
  }
}

function swapArr(i, j) {
  const t = state.data[i]; state.data[i] = state.data[j]; state.data[j] = t;
  array.swap(i, j, C);
}

function randomize(animate) {
  if (animate === false) status.textContent = '随机化数组'; else say('随机化数组');
  for (let i = 0; i < count; i++) {
    state.data[i] = 1 + Math.floor(Math.random() * 20);
    if (animate === false) array.elems[i].setHeight(state.data[i] * 6);
    else array.setValue(i, state.data[i], C);
  }
  for (let i = 0; i < count; i++) {
    const el = aux.elems[i]; const prev = el.height;
    if (animate === false) el.setHeight(0.5);
    else C(100, () => el.setHeight(0.5), () => el.setHeight(prev));
  }
}

function insertionSort() {
  say('插入排序');
  for (let i = 1; i < count; i++) {
    let j = i;
    array.highlight(j, C);
    while (j > 0) {
      array.highlight(j - 1, C);
      say('比较 a[' + j + '] 与 a[' + (j - 1) + ']');
      if (state.data[j - 1] <= state.data[j]) { array.unhighlight(j - 1, C); break; }
      swapArr(j, j - 1);
      array.unhighlight(j, C);
      j--;
    }
    array.unhighlight(j, C);
  }
}

function selectionSort() {
  say('选择排序');
  for (let i = 0; i < count - 1; i++) {
    let min = i;
    array.highlight(min, C);
    for (let j = i + 1; j < count; j++) {
      array.highlight(j, C);
      say('比较 a[' + j + '] 与 a[' + min + ']');
      if (state.data[j] < state.data[min]) {
        array.unhighlight(min, C);
        min = j;
        array.highlight(min, C);
      } else {
        array.unhighlight(j, C);
      }
    }
    if (min !== i) {
      say('找到最小 a[' + min + ']，交换到 a[' + i + ']');
      swapArr(min, i);
    }
    array.unhighlight(i, C);
  }
}

function bubbleSort() {
  say('冒泡排序');
  for (let i = count - 1; i > 0; i--) {
    for (let j = 0; j < i; j++) {
      array.highlight(j, C); array.highlight(j + 1, C);
      say('比较 a[' + j + '] 与 a[' + (j + 1) + ']');
      if (state.data[j] > state.data[j + 1]) swapArr(j, j + 1);
      array.unhighlight(j, C); array.unhighlight(j + 1, C);
    }
  }
}

function shellSort() {
  say('壳排序');
  for (let gap = Math.floor(count / 2); gap >= 1; gap = Math.floor(gap / 2)) {
    say('增量 gap = ' + gap);
    for (let i = gap; i < count; i++) {
      let j = i;
      array.highlight(j, C);
      while (j >= gap) {
        array.highlight(j - gap, C);
        say('比较 a[' + j + '] 与 a[' + (j - gap) + ']');
        if (state.data[j - gap] <= state.data[j]) { array.unhighlight(j - gap, C); break; }
        swapArr(j, j - gap);
        array.unhighlight(j, C);
        j -= gap;
      }
      array.unhighlight(j, C);
    }
  }
}

function quickSort() {
  say('快速排序');
  qs(0, count - 1);
}
function qs(low, high) {
  if (low >= high) return;
  const pivot = state.data[low];
  array.highlight(low, C, PALETTE.orange);
  say('枢轴 a[' + low + '] = ' + pivot);
  let i = low + 1, j = high;
  while (i <= j) {
    while (i <= high && state.data[i] < pivot) i++;
    while (j >= low + 1 && state.data[j] > pivot) j--;
    if (i <= j) {
      array.highlight(i, C); array.highlight(j, C);
      say('交换 a[' + i + '] 与 a[' + j + ']');
      swapArr(i, j);
      array.unhighlight(i, C); array.unhighlight(j, C);
      i++; j--;
    }
  }
  swapArr(low, j);
  say('枢轴 ' + pivot + ' 就位 a[' + j + ']');
  array.unhighlight(j, C);
  qs(low, j - 1);
  qs(j + 1, high);
}

function mergeSort() {
  say('归并排序');
  ms(0, count - 1);
}
function ms(low, high) {
  if (low >= high) return;
  const mid = Math.floor((low + high) / 2);
  ms(low, mid);
  ms(mid + 1, high);
  merge(low, mid, high);
}
function merge(low, mid, high) {
  say('归并段 [' + low + ' .. ' + high + ']');
  for (let i = low; i <= high; i++) {
    state.auxData[i] = state.data[i];
    aux.setValue(i, state.auxData[i], C);
  }
  let li = low, ri = mid + 1, k = low;
  while (li <= mid && ri <= high) {
    array.highlight(li, C); array.highlight(ri, C);
    say('比较 aux[' + li + '] 与 aux[' + ri + ']');
    if (state.auxData[li] <= state.auxData[ri]) {
      state.data[k] = state.auxData[li];
      array.setValue(k, state.data[k], C);
      array.unhighlight(li, C);
      li++;
    } else {
      state.data[k] = state.auxData[ri];
      array.setValue(k, state.data[k], C);
      array.unhighlight(ri, C);
      ri++;
    }
    k++;
  }
  while (li <= mid) {
    state.data[k] = state.auxData[li];
    array.highlight(li, C);
    array.setValue(k, state.data[k], C);
    array.unhighlight(li, C);
    li++; k++;
  }
  while (ri <= high) {
    state.data[k] = state.auxData[ri];
    array.highlight(ri, C);
    array.setValue(k, state.data[k], C);
    array.unhighlight(ri, C);
    ri++; k++;
  }
}

function sortGuard(fn) {
  if (engine.queue.length || engine.current) { status.textContent = '请先完成或清空当前动画'; return; }
  fn();
}

panel.addButton('随机化数组', randomize);
panel.addButton('插入排序', () => sortGuard(insertionSort));
panel.addButton('选择排序', () => sortGuard(selectionSort));
panel.addButton('冒泡排序', () => sortGuard(bubbleSort));
panel.addButton('壳排序', () => sortGuard(shellSort));
panel.addButton('归并排序', () => sortGuard(mergeSort));
panel.addButton('快速排序', () => sortGuard(quickSort));
const SORTS = { '插入排序': insertionSort, '选择排序': selectionSort, '冒泡排序': bubbleSort, '壳排序': shellSort, '归并排序': mergeSort, '快速排序': quickSort };
const algoSelect = panel.addSelect('选择演示算法', Object.keys(SORTS), '插入排序');
panel.addButton('演示所选', () => { const fn = SORTS[algoSelect.value]; if (fn) sortGuard(fn); });
const sizeInput = panel.addInput('大小 (5-30)', () => {}, 2);
sizeInput.value = '20';
panel.addButton('更改大小', () => {
  const n = parseInt(sizeInput.value, 10);
  if (!(n >= 5 && n <= 30)) { status.textContent = '大小需在 5-30 之间'; return; }
  count = n;
  state.data.length = n;
  rebuild(n);
  randomize();
});
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

rebuild(count);
state.data.length = count;
randomize(false);
scene.start(engine);
