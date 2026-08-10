// AlgorithmLibrary/BucketSort3D.js
// 桶排序：值 0..4 映射到 5 个桶，分桶后按序收集
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Array3D } from '../3D/modes/Array3D.js';
import { VText, VBox } from '../3D/VisualObject3D.js';
import { PALETTE } from '../3D/Glow.js';

const scene = new Scene3D('scene', { cameraPos: [0, 220, 640], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

const N = 10, BUCKETS = 5;
const status = panel.addStatus('');
const say = (msg) => C(1, () => { status.textContent = msg; });
const state = { data: [] };
const array = new Array3D(scene, { type: 'bar', count: N, w: 40, h: 40, spacing: 70, startY: 0, z: 0 });
array.create();
const buckets = Array.from({ length: BUCKETS }, () => []);
const bucketBoxes = [];

const bucketX = (k) => (k - (BUCKETS - 1) / 2) * 95;
const itemY = (j) => -45 - 30 * (j + 1);

function buildBucketHeads() {
  for (let k = 0; k < BUCKETS; k++) {
    new VBox(scene, { label: '桶' + k, x: bucketX(k), y: -45, w: 52, h: 28, d: 22, color: PALETTE.blue, emissive: PALETTE.blueEmissive });
  }
}
buildBucketHeads();

function clearBuckets() {
  for (const b of bucketBoxes) { b.remove(); }
  bucketBoxes.length = 0;
  for (const b of buckets) b.length = 0;
}

function setBar(i, v, cmd) {
  const el = array.elems[i];
  const prev = el.height;
  cmd({ duration: 280, fn: () => el.setHeight((v + 1) * 12), undo: () => el.setHeight(prev) });
}

function fly(text, fromX, fromY, toX, toY, dur) {
  const t = new VText(scene, { text, x: fromX, y: fromY, z: 0, color: PALETTE.text, scale: 0.8 });
  C(dur, (p) => {
    const e = easeInOut(p);
    t.sprite.position.x = fromX + (toX - fromX) * e;
    t.sprite.position.y = fromY + (toY - fromY) * e;
  }, () => t.remove());
  return t;
}

function randomize() {
  say('随机列表');
  for (let i = 0; i < N; i++) {
    state.data[i] = Math.floor(Math.random() * BUCKETS); // 0..4
    setBar(i, state.data[i], C);
  }
}

function bucketSort() {
  if (bucketBoxes.length) { status.textContent = '请先点击 随机列表'; return; }
  say('桶排序：扫描数组，按值分桶');
  for (let i = 0; i < N; i++) {
    const v = state.data[i];
    const k = v; // 值即桶号
    array.highlight(i, C);
    say('元素 ' + v + ' 放入桶 ' + k);
    const j = buckets[k].length;
    const box = new VBox(scene, { label: '', x: bucketX(k), y: itemY(j), w: 40, h: 26, d: 16, color: PALETTE.green, emissive: PALETTE.greenEmissive });
    buckets[k].push({ v, box });
    bucketBoxes.push(box);
    const lbl = fly(v, array.xOf(i), (v + 1) * 12, bucketX(k), itemY(j), 420);
    C(30, () => { lbl.remove(); box.setText(v); }, () => { lbl.remove(); box.setText(''); });
    array.unhighlight(i, C);
  }
  let k = 0;
  for (let b = 0; b < BUCKETS; b++) {
    say('收集桶 ' + b);
    for (const it of buckets[b]) {
      array.highlight(k, C);
      const lbl = fly(it.v, it.box.mesh.position.x, it.box.mesh.position.y, array.xOf(k), (it.v + 1) * 12, 420);
      state.data[k] = it.v;
      setBar(k, it.v, C);
      C(30, () => lbl.remove(), () => {});
      array.unhighlight(k, C);
      k++;
    }
  }
  say('排序完成');
}

panel.addButton('随机列表', () => { clearBuckets(); randomize(); });
panel.addButton('桶排序', () => {
  if (engine.queue.length || engine.current) { status.textContent = '请先完成或清空当前动画'; return; }
  bucketSort();
});
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

randomize();
scene.start(engine);
