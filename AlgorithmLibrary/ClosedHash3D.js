// AlgorithmLibrary/ClosedHash3D.js
// 闭寻址哈希（线性探测）：10 个槽直接存值；h(x) = x % 10；删除置 '×' 墓碑
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Array3D } from '../3D/modes/Array3D.js';
import { VText, VArrow, easeInOut } from '../3D/VisualObject3D.js';
import { PALETTE } from '../3D/Glow.js';

const SIZE = 10, TOMB = 0x64748b, TOMB_E = 0x334155;
const scene = new Scene3D('scene', { cameraPos: [0, 220, 640], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const array = new Array3D(scene, { type: 'box', count: SIZE, spacing: 78, startY: 60 });
array.create();
const status = panel.addStatus('');
const slots = new Array(SIZE).fill('');
const h = (x) => ((x % SIZE) + SIZE) % SIZE;
const bx = (k) => array.xOf(k);

let arrow = null, arrowX = null;
function ensureArrow(k) {
  if (!arrow) {
    arrow = new VArrow(scene, { x: bx(k), y: 100, z: 25, down: true, color: PALETTE.orange });
    arrowX = bx(k);
  }
}
function arrowTo(k, ms) {
  const tx = bx(k), sx = arrowX;
  C(ms, (p) => { arrow.group.position.x = sx + (tx - sx) * easeInOut(p); }, () => {});
  arrowX = tx;
}
function dropArrow() {
  C(40, () => { if (arrow) { arrow.remove(); arrow = null; arrowX = null; } }, () => {});
}
function prep(x, k) {
  const formula = new VText(scene, { text: 'h(' + x + ') = ' + x + ' % 10 = ' + k, x: 0, y: 175, z: 0, color: PALETTE.textGlow, scale: 1 });
  const tmp = new VText(scene, { text: x, x: 0, y: 230, z: 0, color: PALETTE.text, scale: 1 });
  C(420, (p) => { tmp.sprite.position.x = bx(k) * p; tmp.sprite.position.y = 230 + (45 - 230) * p; }, () => tmp.remove());
  ensureArrow(k);
  return { formula, tmp };
}
function finish(formula, tmp) {
  C(40, () => tmp.remove(), () => {});
  C(40, () => formula.remove(), () => {});
  dropArrow();
}

function insert(value) {
  const x = parseInt(value);
  if (isNaN(x)) return;
  const k = h(x);
  status.textContent = '插入 ' + x + '：h(x) = ' + x + ' % 10 = ' + k;
  const { formula, tmp } = prep(x, k);
  const hl = [k];
  array.highlight(k, C);
  let outcome = '', placed = -1;
  if (slots[k] === '' || slots[k] === '×') {
    placed = k; outcome = '槽 ' + k;
  } else if (slots[k] == x) {
    outcome = '已存在';
  } else {
    for (let d = 1; d < SIZE; d++) {
      const j = (k + d) % SIZE;
      arrowTo(j, 300);
      array.highlight(j, C);
      hl.push(j);
      if (slots[j] === '' || slots[j] === '×') { placed = j; outcome = '线性探测到槽 ' + j; break; }
      if (slots[j] == x) { outcome = '已存在'; break; }
    }
    if (placed < 0 && !outcome) outcome = '表已满';
  }
  if (placed >= 0) {
    if (slots[placed] === '×') C(1, () => array.elems[placed].setColor(PALETTE.node, PALETTE.nodeEmissive), () => {});
    array.setValue(placed, x, C);
    slots[placed] = x;
  }
  for (const s of hl) array.unhighlight(s, C);
  status.textContent = '插入 ' + x + '：' + (placed >= 0 ? outcome + '，成功' : outcome);
  finish(formula, tmp);
}

function del(value) {
  const x = parseInt(value);
  if (isNaN(x)) return;
  const k = h(x);
  status.textContent = '删除 ' + x + '：h(x) = ' + x + ' % 10 = ' + k;
  const { formula, tmp } = prep(x, k);
  const hl = [k];
  array.highlight(k, C);
  let target = -1;
  if (slots[k] === x) target = k;
  else if (slots[k] !== '' && slots[k] !== '×') {
    for (let d = 1; d < SIZE; d++) {
      const j = (k + d) % SIZE;
      arrowTo(j, 300);
      array.highlight(j, C);
      hl.push(j);
      if (slots[j] === x) { target = j; break; }
      if (slots[j] === '') break;
    }
  }
  if (target >= 0) {
    array.setValue(target, '×', C);
    C(1, () => array.elems[target].setColor(TOMB, TOMB_E), () => {});
    slots[target] = '×';
    status.textContent = '删除 ' + x + '：成功（槽 ' + target + ' 置为 ×）';
  } else {
    status.textContent = '删除 ' + x + '：未找到';
  }
  for (const s of hl) if (s !== target) array.unhighlight(s, C);
  finish(formula, tmp);
}

function find(value) {
  const x = parseInt(value);
  if (isNaN(x)) return;
  const k = h(x);
  status.textContent = '查找 ' + x + '：h(x) = ' + x + ' % 10 = ' + k;
  const { formula, tmp } = prep(x, k);
  const hl = [k];
  array.highlight(k, C);
  let target = -1;
  if (slots[k] === x) target = k;
  else if (slots[k] !== '' && slots[k] !== '×') {
    for (let d = 1; d < SIZE; d++) {
      const j = (k + d) % SIZE;
      arrowTo(j, 300);
      array.highlight(j, C);
      hl.push(j);
      if (slots[j] === x) { target = j; break; }
      if (slots[j] === '') break;
    }
  }
  status.textContent = target >= 0 ? '查找 ' + x + '：找到（槽 ' + target + '）' : '查找 ' + x + '：未找到';
  for (const s of hl) array.unhighlight(s, C);
  finish(formula, tmp);
}

let input = panel.addInput('值', (v) => { if (v) insert(v.trim()); }, 6);
panel.addButton('插入', () => { if (input.value) insert(input.value.trim()); });
panel.addButton('删除', () => { if (input.value) del(input.value.trim()); });
panel.addButton('查找', () => { if (input.value) find(input.value.trim()); });
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
