// AlgorithmLibrary/HeapSort3D.js
// 堆排序：建堆（下沉）+ 反复取出堆顶，右侧变灰表示已排序
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Array3D } from '../3D/modes/Array3D.js';
import { PALETTE } from '../3D/Glow.js';

const scene = new Scene3D('scene', { cameraPos: [0, 220, 640], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const N = 12, GRAY = 0x64748b, GRAY_EMISSIVE = 0x334155;
const status = panel.addStatus('');
const say = (msg) => C(1, () => { status.textContent = msg; });
const state = { data: [] };
const array = new Array3D(scene, { type: 'bar', count: N, w: 44, h: 44, spacing: 62, startY: 0, z: 0 });
array.create();

function swapArr(i, j) {
  const t = state.data[i]; state.data[i] = state.data[j]; state.data[j] = t;
  array.swap(i, j, C);
}

function gray(i) {
  const el = array.elems[i];
  C(200, () => el.setColor(GRAY, GRAY_EMISSIVE), () => el.setColor(PALETTE.node, PALETTE.nodeEmissive));
}

function randomize() {
  say('随机化数组');
  for (let i = 0; i < N; i++) {
    const el = array.elems[i];
    C(1, () => el.setColor(PALETTE.node, PALETTE.nodeEmissive), () => {});
    state.data[i] = 1 + Math.floor(Math.random() * 20);
    array.setValue(i, state.data[i], C);
  }
}

// 堆中下沉 a[i]，堆长度为 heapLen
function siftDown(i, heapLen) {
  say('下沉 a[' + i + ']（堆长度 ' + heapLen + '）');
  while (true) {
    let child = 2 * i + 1;
    if (child >= heapLen) break;
    if (child + 1 < heapLen) {
      array.highlight(child, C); array.highlight(child + 1, C);
      say('比较子节点 a[' + child + '] 与 a[' + (child + 1) + ']');
      if (state.data[child + 1] > state.data[child]) { array.unhighlight(child, C); child++; }
      else { array.unhighlight(child + 1, C); }
    } else {
      array.highlight(child, C);
    }
    array.highlight(i, C);
    say('比较 a[' + i + '] 与 a[' + child + ']');
    if (state.data[i] >= state.data[child]) {
      array.unhighlight(child, C);
      array.unhighlight(i, C);
      break;
    }
    swapArr(i, child);
    array.unhighlight(i, C);
    array.unhighlight(child, C);
    i = child;
  }
}

function heapSort() {
  say('建堆：自底向上下沉');
  for (let i = Math.floor(N / 2) - 1; i >= 0; i--) siftDown(i, N);
  say('堆排序：反复取出堆顶');
  for (let end = N - 1; end > 0; end--) {
    say('堆长度 ' + (end + 1) + '：交换堆顶与 a[' + end + ']');
    swapArr(0, end);
    gray(end);
    siftDown(0, end);
  }
  gray(0);
  say('排序完成');
}

panel.addButton('随机化数组', randomize);
panel.addButton('堆排序', () => {
  if (engine.queue.length || engine.current) { status.textContent = '请先完成或清空当前动画'; return; }
  heapSort();
});
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

randomize();
scene.start(engine);
