// AlgorithmLibrary/SimpleStack3D.js
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Array3D } from '../3D/modes/Array3D.js';
import { VText } from '../3D/VisualObject3D.js';
import { PALETTE } from '../3D/Glow.js';

const SIZE = 15;
const scene = new Scene3D('scene', { cameraPos: [0, 220, 640], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand({ duration, fn, undo: undo || (() => {}) });

const array = new Array3D(scene, { count: SIZE, startY: -40, w: 46, h: 46, spacing: 50 });
array.create();
const status = panel.addStatus('');
const state = { top: 0, data: new Array(SIZE) };

function push(value) {
  if (state.top >= SIZE) { status.textContent = '栈已满'; return; }
  status.textContent = '入栈: ' + value;
  const targetX = array.xOf(state.top);
  array.highlight(state.top, C);
  // 值标签从顶部中央飞入槽位
  const tmp = new VText(scene, { text: value, x: 0, y: 200, z: 0, color: PALETTE.text, scale: 1 });
  C(450, (p) => {
    tmp.sprite.position.x = 0 + (targetX - 0) * p;
    tmp.sprite.position.y = 200 + (-40 - 200) * p;
  }, () => { tmp.remove(); });
  state.data[state.top] = value;
  array.setValue(state.top, value, C);
  C(60, () => tmp.remove(), () => {});
  state.top++;
  array.unhighlight(state.top - 1, C);
  status.textContent = '';
}

function pop() {
  if (state.top <= 0) { status.textContent = '栈为空'; return; }
  const value = state.data[state.top - 1];
  status.textContent = '出栈: ' + value;
  state.top--;
  const x = array.xOf(state.top);
  array.highlight(state.top, C);
  // 值标签飞出到底部中央
  const tmp = new VText(scene, { text: value, x, y: -40, z: 0, color: PALETTE.text, scale: 1 });
  C(450, (p) => {
    tmp.sprite.position.x = x + (0 - x) * p;
    tmp.sprite.position.y = -40 + (-230 - -40) * p;
  }, () => { tmp.remove(); });
  state.data[state.top] = '';
  array.setValue(state.top, '', C);
  array.unhighlight(state.top, C);
  C(60, () => tmp.remove(), () => {});
  status.textContent = '';
}

function clear() {
  for (let i = 0; i < state.top; i++) array.setValue(i, '', C);
  state.top = 0;
}

let pushInput = panel.addInput('输入数字', (v) => { if (v) push(v.trim()); }, 6);
panel.addButton('入栈', () => { if (pushInput.value) push(pushInput.value.trim()); });
panel.addButton('出栈', pop);
panel.addButton('清空', clear);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
