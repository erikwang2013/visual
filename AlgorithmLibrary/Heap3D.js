// AlgorithmLibrary/Heap3D.js
// 最小堆：完全二叉树 + 数组实现。节点 id = 数组下标，上滤/下滤时交换值与位置。
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Tree3D } from '../3D/modes/Tree3D.js';
import { VText, easeInOut } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Heap3D');

const scene = new Scene3D('scene', { cameraPos: [0, 220, 640], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const tree = new Tree3D(scene);
const status = panel.addStatus('');
const idxLabels = new Map();   // 下标 id -> VText
let heapArr = [];              // 堆数组

// ---- 布局：完全二叉树，i 的深度 d = floor(log2(i+1)) ----
function depthOf(i) { return Math.floor(Math.log2(i + 1)); }
function layoutPos(i) {
  const d = depthOf(i);
  const level = 1 << d;
  const offset = i - (level - 1);
  const gap = Math.max(56, 96 - d * 10);
  return { x: (offset - (level - 1) / 2) * gap, y: 210 - d * 95, z: 0 };
}

function addIdxLabel(i, y) {
  const p = layoutPos(i);
  const lbl = new VText(scene, { text: String(i), x: p.x, y: y !== undefined ? y - 36 : p.y - 36, z: p.z, color: PALETTE.textDim, scale: 0.55 });
  idxLabels.set(i, lbl);
}

// 节点连同下标标签一起移动
function moveWithLabel(i, x, y, z) {
  const e = tree.nodes.get(i);
  const lbl = idxLabels.get(i);
  const fx = e ? e.x : x, fy = e ? e.y : y, fz = e ? e.z : z;
  tree.moveNode(i, x, y, z, C);
  if (lbl) C(500, (pp) => {
    const t = easeInOut(pp);
    lbl.sprite.position.set(fx + (x - fx) * t, fy - 36 + (y - fy) * t, fz + (z - fz) * t);
  }, () => { lbl.sprite.position.set(fx, fy - 36, fz); });
}

// 交换两个下标处的值：模型交换 + 标签交换 + 节点互换位置
function swapNodes(a, b) {
  const ta = heapArr[a], tb = heapArr[b];
  heapArr[a] = tb; heapArr[b] = ta;
  const pa = layoutPos(a), pb = layoutPos(b);
  tree.nodes.get(a).node.setText(String(heapArr[a]));
  tree.nodes.get(b).node.setText(String(heapArr[b]));
  moveWithLabel(a, pb.x, pb.y, pb.z);
  moveWithLabel(b, pa.x, pa.y, pa.z);
}

function removeNodeAt(i) {
  const e = tree.nodes.get(i);
  const lbl = idxLabels.get(i);
  if (!e) { heapArr.pop(); return; }
  C(350, (p) => {
    e.node.mesh.scale.setScalar(Math.max(1 - easeInOut(p), 0.01));
    if (p === 1) { tree.removeNode(i); if (lbl) { lbl.remove(); idxLabels.delete(i); } }
  }, () => { e.node.mesh.scale.set(1, 1, 1); });
  heapArr.pop();
}

// ---- 插入：新节点飞入末尾，上滤 ----
function insertValue(v) {
  if (heapArr.length >= 40) { status.textContent = '堆已满'; return; }
  status.textContent = '插入 ' + v;
  const i = heapArr.length;
  heapArr[i] = v;
  const p = layoutPos(i);
  tree.addNode(i, String(v), p.x, p.y + 250, p.z);
  addIdxLabel(i, p.y + 250);
  tree.highlight(i, C);
  moveWithLabel(i, p.x, p.y, p.z);
  tree.unhighlight(i, C);
  // 上滤
  let cur = i;
  while (cur > 0) {
    const par = Math.floor((cur - 1) / 2);
    if (heapArr[cur] >= heapArr[par]) break;
    tree.highlight(par, C);
    status.textContent = '上滤: ' + heapArr[cur] + ' 与父节点 ' + heapArr[par] + ' 交换';
    swapNodes(cur, par);
    tree.unhighlight(par, C);
    cur = par;
  }
  status.textContent = '';
}

// ---- 删除最小的：末尾与根交换后删除，下滤 ----
function deleteMin() {
  if (heapArr.length === 0) { status.textContent = '堆为空'; return; }
  const min = heapArr[0];
  status.textContent = '删除最小 ' + min;
  tree.highlight(0, C);
  const last = heapArr.length - 1;
  if (last > 0) {
    status.textContent = min + ' 与末尾 ' + heapArr[last] + ' 交换';
    swapNodes(0, last);
    tree.unhighlight(0, C);
    removeNodeAt(last);
    let cur = 0;
    while (true) {
      const l = 2 * cur + 1, r = 2 * cur + 2;
      if (l >= heapArr.length) break;
      let m = l;
      if (r < heapArr.length && heapArr[r] < heapArr[l]) m = r;
      if (heapArr[m] >= heapArr[cur]) break;
      tree.highlight(m, C);
      status.textContent = '下滤: ' + heapArr[cur] + ' 与子节点 ' + heapArr[m] + ' 交换';
      swapNodes(cur, m);
      tree.unhighlight(m, C);
      cur = m;
    }
  } else {
    removeNodeAt(last);
  }
  status.textContent = '';
}

// ---- 清除堆 ----
function clearHeap() {
  tree.clear();
  for (const lbl of idxLabels.values()) lbl.remove();
  idxLabels.clear();
  heapArr = [];
}

function siftDownModel(i) {
  const n = heapArr.length;
  while (true) {
    const l = 2 * i + 1, r = 2 * i + 2;
    if (l >= n) return;
    let m = l;
    if (r < n && heapArr[r] < heapArr[l]) m = r;
    if (heapArr[m] >= heapArr[i]) return;
    const t = heapArr[i]; heapArr[i] = heapArr[m]; heapArr[m] = t;
    i = m;
  }
}

// ---- 构建堆：空格分隔多个值，原地建堆后一次性渲染（轻微弹入） ----
function buildHeap(raw) {
  const vals = String(raw).trim().split(/\s+/).map(x => parseInt(x)).filter(x => !isNaN(x));
  if (!vals.length) { status.textContent = '请输入数字'; return; }
  clearHeap();
  heapArr = vals.slice();
  for (let i = Math.floor(heapArr.length / 2) - 1; i >= 0; i--) siftDownModel(i);
  heapArr.forEach((val, i) => {
    const p = layoutPos(i);
    tree.addNode(i, String(val), p.x, p.y, p.z);
    addIdxLabel(i);
  });
  C(700, (p) => {
    const s = 0.25 + 0.75 * easeInOut(p);
    heapArr.forEach((_, i) => { const e = tree.nodes.get(i); if (e) e.node.mesh.scale.setScalar(s); });
  }, () => {
    heapArr.forEach((_, i) => { const e = tree.nodes.get(i); if (e) e.node.mesh.scale.set(1, 1, 1); });
  });
  status.textContent = '构建堆完成，共 ' + heapArr.length + ' 个元素';
}

// 控件
let input = panel.addInput('输入数字（构建堆可空格分隔多个）', (v) => { if (v) insertValue(parseInt(v)); }, 30);
panel.addButton('插入', () => { const v = parseInt(input.value); if (!isNaN(v)) insertValue(v); });
panel.addButton('删除最小的', deleteMin);
panel.addButton('清除堆', clearHeap);
panel.addButton('构建堆', () => buildHeap(input.value));
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
