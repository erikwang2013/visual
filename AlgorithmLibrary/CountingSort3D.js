// AlgorithmLibrary/CountingSort3D.js
// 计数排序：统计 -> 累计 -> 稳定输出
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Array3D } from '../3D/modes/Array3D.js';
import { Table3D } from '../3D/modes/Table3D.js';
import { VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('CountingSort3D');

const scene = new Scene3D('scene', { cameraPos: [0, 220, 640], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

const N = 10, MAXV = 9;
const status = panel.addStatus('');
const say = (msg) => C(1, () => { status.textContent = msg; });
const state = { data: [], count: [], out: [] };
const array = new Array3D(scene, { type: 'bar', count: N, w: 40, h: 40, spacing: 70, startY: 0, z: 0 });
array.create();
const table = new Table3D(scene, { rows: 1, cols: MAXV + 1, cellW: 60, cellH: 42, startX: 0, startY: -60 });
table.create();
table.setRowLabel(0, '计数');
const output = new Array3D(scene, { type: 'bar', count: N, w: 40, h: 40, spacing: 70, startY: -190, z: 0 });
output.create();
// VBar 底座固定 y=0，包装 setHeight 把输出柱子整体下移
for (const el of output.elems) {
  const orig = el.setHeight.bind(el);
  el.setHeight = (h) => { orig(h); el.mesh.position.y -= 190; };
}
const outLabel = new VText(scene, { text: '输出', x: -380, y: -190, z: 0, color: PALETTE.textDim, scale: 0.8 });

function setBar(arr, i, v, cmd) {
  const el = arr.elems[i];
  const prev = el.height;
  cmd({ duration: 280, fn: () => el.setHeight((v + 1) * 10), undo: () => el.setHeight(prev) });
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
  for (let i = 0; i < N; i++) {
    state.data[i] = Math.floor(Math.random() * (MAXV + 1));
    if (animate === false) { array.elems[i].setHeight((state.data[i] + 1) * 10); output.elems[i].setHeight(10); }
    else { setBar(array, i, state.data[i], C); setBar(output, i, 0, C); }
    state.out[i] = 0;
  }
}

function countingSort() {
  say('计数排序：统计各值出现次数');
  for (let i = 0; i <= MAXV; i++) state.count[i] = 0;
  for (let i = 0; i < N; i++) {
    const v = state.data[i];
    array.highlight(i, C);
    table.highlightCell(0, v, C);
    say('统计元素 ' + v + '，count[' + v + ']++');
    state.count[v]++;
    table.setCell(0, v, state.count[v], C);
    table.unhighlightCell(0, v, C);
    array.unhighlight(i, C);
  }
  say('累计前缀和');
  for (let k = 1; k <= MAXV; k++) {
    table.highlightCell(0, k, C);
    table.highlightCell(0, k - 1, C);
    state.count[k] += state.count[k - 1];
    table.setCell(0, k, state.count[k], C);
    table.unhighlightCell(0, k, C);
    table.unhighlightCell(0, k - 1, C);
    say('count[' + k + '] += count[' + (k - 1) + '] = ' + state.count[k]);
  }
  say('从后往前放置元素（稳定）');
  for (let i = N - 1; i >= 0; i--) {
    const v = state.data[i];
    array.highlight(i, C);
    table.highlightCell(0, v, C);
    const pos = state.count[v] - 1;
    state.count[v]--;
    table.setCell(0, v, state.count[v], C);
    say('放置 ' + v + ' 到输出 [' + pos + ']');
    const lbl = fly(v, array.xOf(i), (v + 1) * 10, output.xOf(pos), -190 + (v + 1) * 10, 420);
    state.out[pos] = v;
    setBar(output, pos, v, C);
    C(30, () => lbl.remove(), () => {});
    table.unhighlightCell(0, v, C);
    array.unhighlight(i, C);
  }
  say('排序完成');
}

panel.addButton('随机列表', randomize);
panel.addButton('计数排序', () => {
  if (engine.queue.length || engine.current) { status.textContent = '请先完成或清空当前动画'; return; }
  countingSort();
});
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

randomize(false);
scene.start(engine);
