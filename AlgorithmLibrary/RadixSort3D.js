// AlgorithmLibrary/RadixSort3D.js
// 基数排序：按个位、十位依次分桶收集（LSD）
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Array3D } from '../3D/modes/Array3D.js';
import { VText, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('RadixSort3D');

const scene = new Scene3D('scene', { cameraPos: [0, 220, 640], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

const N = 10, RADIX = 10;
const status = panel.addStatus('');
const say = (msg) => C(1, () => { status.textContent = msg; });
const state = { data: [] };
const array = new Array3D(scene, { type: 'bar', count: N, w: 40, h: 40, spacing: 72, startY: 0, z: 0 });
array.create();
const bucketBoxes = [];
const phaseLabel = new VText(scene, { text: '基数排序', x: 0, y: 215, z: 0, color: PALETTE.textGlow, scale: 1.2 });

const bucketX = (k) => (k - (RADIX - 1) / 2) * 72;
const itemY = (j) => -67 - 18 * j;

function clearBuckets() {
  for (const b of bucketBoxes) { b.remove(); }
  bucketBoxes.length = 0;
}

function setBar(i, v, cmd) {
  const el = array.elems[i];
  const prev = el.height;
  cmd({ duration: 280, fn: () => el.setHeight((v + 1) * 2), undo: () => el.setHeight(prev) });
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

function randomize(animate) {
  if (animate === false) status.textContent = '随机列表'; else say('随机列表');
  phaseLabel.setText('基数排序');
  for (let i = 0; i < N; i++) {
    state.data[i] = Math.floor(Math.random() * 100); // 0..99
    if (animate === false) array.elems[i].setHeight((state.data[i] + 1) * 2);
    else setBar(i, state.data[i], C);
  }
}

function radixSort() {
  if (bucketBoxes.length) { status.textContent = '请先点击 随机列表'; return; }
  for (const pass of [0, 1]) {
    const isUnits = pass === 0;
    phaseLabel.setText(isUnits ? '按个位分桶' : '按十位分桶');
    say(isUnits ? '按个位分桶' : '按十位分桶');
    const buckets = Array.from({ length: RADIX }, () => []);
    for (let i = 0; i < N; i++) {
      const v = state.data[i];
      const d = isUnits ? v % 10 : Math.floor(v / 10);
      const j = buckets[d].length;
      array.highlight(i, C);
      say('元素 ' + v + ' 的' + (isUnits ? '个位' : '十位') + ' ' + d + ' 放入桶 ' + d);
      const box = new VBox(scene, { label: '', x: bucketX(d), y: itemY(j), w: 30, h: 16, d: 12, color: PALETTE.green, emissive: PALETTE.greenEmissive });
      buckets[d].push({ v, d, box });
      bucketBoxes.push(box);
      const lbl = fly(d, array.xOf(i), (v + 1) * 2, bucketX(d), itemY(j), 380);
      C(30, () => { lbl.remove(); box.setText(d); }, () => { lbl.remove(); box.setText(''); });
      array.unhighlight(i, C);
    }
    phaseLabel.setText('收集回数组');
    say('收集回数组');
    let k = 0;
    for (let b = 0; b < RADIX; b++) {
      for (const it of buckets[b]) {
        array.highlight(k, C);
        const lbl = fly(it.v, it.box.mesh.position.x, it.box.mesh.position.y, array.xOf(k), (it.v + 1) * 2, 380);
        state.data[k] = it.v;
        setBar(k, it.v, C);
        C(30, () => lbl.remove(), () => {});
        array.unhighlight(k, C);
        k++;
      }
    }
    clearBuckets();
  }
  phaseLabel.setText('排序完成');
  say('排序完成');
}

panel.addButton('随机列表', () => { clearBuckets(); randomize(); });
panel.addButton('基数排序', () => {
  if (engine.queue.length || engine.current) { status.textContent = '请先完成或清空当前动画'; return; }
  radixSort();
});
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

randomize(false);
scene.start(engine);
