// AlgorithmLibrary/Search3D.js
// 二分查找 / 线性搜索：Array3D box 模式 12 槽预填升序数组。
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Array3D } from '../3D/modes/Array3D.js';
import { VText, VArrow, easeInOut } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Search3D');

const scene = new Scene3D('scene', { cameraPos: [0, 220, 640], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const N = 12;
const data = [3, 7, 12, 18, 25, 33, 41, 56, 62, 70, 81, 95];
const array = new Array3D(scene, { type: 'box', count: N, spacing: 70, startY: 0, w: 56, h: 56 });
array.create();
for (let i = 0; i < N; i++) array.setValue(i, data[i], C);
const status = panel.addStatus('');
const annotations = [];

function clearAll() {
  engine.clear();
  for (const o of annotations) o.remove();
  annotations.length = 0;
  for (let i = 0; i < N; i++) {
    const el = array.elems[i];
    el.mesh.material.emissiveIntensity = 0.35;
    el.mesh.material.color.setHex(PALETTE.node);
  }
  status.textContent = '已清空';
}

function binarySearch(v) {
  const target = parseInt(v);
  if (isNaN(target)) return;
  status.textContent = '二分查找 ' + target;
  let lo = 0, hi = N - 1, mid = 0, found = false;
  const loT = new VText(scene, { text: 'lo', x: array.xOf(lo), y: 78, z: 0, color: PALETTE.orange, scale: 0.9 });
  const hiT = new VText(scene, { text: 'hi', x: array.xOf(hi), y: 78, z: 0, color: PALETTE.orange, scale: 0.9 });
  annotations.push(loT, hiT);
  let loX = array.xOf(lo), hiX = array.xOf(hi);
  while (lo <= hi) {
    mid = (lo + hi) >> 1;
    const midX = array.xOf(mid);
    const midT = new VText(scene, { text: 'mid', x: midX, y: -78, z: 0, color: PALETTE.yellow, scale: 0.9 });
    annotations.push(midT);
    array.highlight(mid, C);
    if (data[mid] === target) {
      array.highlight(mid, C, PALETTE.green);
      found = true;
      C(60, () => midT.remove(), () => {});
      break;
    }
    if (data[mid] < target) lo = mid + 1; else hi = mid - 1;
    const nlo = array.xOf(lo), nhi = array.xOf(hi);
    C(380, (p) => {
      loT.sprite.position.x = loX + (nlo - loX) * easeInOut(p);
      hiT.sprite.position.x = hiX + (nhi - hiX) * easeInOut(p);
    }, () => { loT.sprite.position.x = loX; hiT.sprite.position.x = hiX; });
    loX = nlo; hiX = nhi;
    array.unhighlight(mid, C);
    C(60, () => midT.remove(), () => {});
  }
  C(100, () => { loT.remove(); hiT.remove(); }, () => {});
  status.textContent = found ? '查找 ' + target + '：找到（下标 ' + mid + '）' : '查找 ' + target + '：未找到';
}

function linearSearch(v) {
  const target = parseInt(v);
  if (isNaN(target)) return;
  status.textContent = '线性搜索 ' + target;
  let found = false, foundI = -1;
  const arrow = new VArrow(scene, { x: array.xOf(0), y: -72, z: 0 });
  annotations.push(arrow);
  let ax = array.xOf(0);
  for (let i = 0; i < N; i++) {
    array.highlight(i, C);
    const nx = array.xOf(i);
    C(300, (p) => { arrow.group.position.x = ax + (nx - ax) * easeInOut(p); }, () => { arrow.group.position.x = ax; });
    ax = nx;
    if (data[i] === target) { array.highlight(i, C, PALETTE.green); found = true; foundI = i; break; }
    array.unhighlight(i, C);
  }
  C(100, () => arrow.remove(), () => {});
  status.textContent = found ? '查找 ' + target + '：找到（下标 ' + foundI + '）' : '查找 ' + target + '：未找到';
}

let input = panel.addInput('输入数字', (v) => { if (v) binarySearch(v); }, 4);
input.value = '41';
panel.addButton('二分查找', () => { if (input.value) binarySearch(input.value); });
panel.addButton('线性搜索', () => { if (input.value) linearSearch(input.value); });
panel.addButton('清空', clearAll);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
