// AlgorithmLibrary/StackArray3D.js
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Array3D } from '../3D/modes/Array3D.js';
import { VText, VBox, VArrow } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('StackArray3D');

const SIZE = 15;
const scene = new Scene3D('scene', { cameraPos: [0, 220, 640], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

// 数组槽位（中心 x=0）
const array = new Array3D(scene, { count: SIZE, startY: -40, w: 46, h: 46, spacing: 50 });
array.create();

// top 指示器（数组右侧上方）
const rightX = array.xOf(SIZE - 1);
const topLabel = new VText(scene, { text: 'top', x: rightX + 70, y: 60, z: 0, color: PALETTE.textGlow, scale: 0.8 });
const topBox = new VBox(scene, { w: 46, h: 46, d: 28, x: rightX + 70, y: -40, z: 0, label: '0', color: PALETTE.blue, emissive: PALETTE.blueEmissive });
const arrow = new VArrow(scene, { x: rightX + 70, y: 0, z: 0, down: true });

// 浮动提示标签（顶部中央）
const hint = new VText(scene, { text: '', x: 0, y: 200, z: 0, color: PALETTE.textGlow, scale: 0.9 });
const status = panel.addStatus('');

const state = { top: 0, data: new Array(SIZE) };
void topLabel;

function moveArrowTo(x, y, duration) {
  C(duration, (p) => {
    const sx = arrow.group.position.x, sy = arrow.group.position.y;
    arrow.group.position.x = sx + (x - sx) * p;
    arrow.group.position.y = sy + (y - sy) * p;
  });
}

function push(value) {
  if (state.top >= SIZE) { status.textContent = '栈已满'; return; }
  status.textContent = '入栈: ' + value;
  hint.setText('入栈: ' + value);
  // 高亮目标槽位
  array.highlight(state.top, C);
  moveArrowTo(array.xOf(state.top), -40, 350);
  // 浮动值标签动画到槽位
  const tmp = new VText(scene, { text: value, x: 0, y: 200, z: 0, color: PALETTE.text, scale: 1 });
  const targetX = array.xOf(state.top);
  C(450, (p) => {
    tmp.sprite.position.x = 0 + (targetX - 0) * p;
    tmp.sprite.position.y = 200 + (-40 - 200) * p;
  }, () => { tmp.remove(); });
  state.data[state.top] = value;
  array.setValue(state.top, value, C);
  C(60, () => tmp.remove(), () => {});
  state.top++;
  // 更新 top 显示
  C(150, () => topBox.setText(String(state.top)));
  array.unhighlight(state.top - 1, C);
  status.textContent = '';
  hint.setText('');
}

function pop() {
  if (state.top <= 0) { status.textContent = '栈为空'; return; }
  const value = state.data[state.top - 1];
  status.textContent = '出栈: ' + value;
  hint.setText('出栈: ' + value);
  state.top--;
  moveArrowTo(array.xOf(state.top), -40, 350);
  array.setValue(state.top, '', C);
  C(150, () => topBox.setText(String(state.top)));
  status.textContent = '';
  hint.setText('');
}

function clear() {
  for (let i = 0; i < state.top; i++) array.setValue(i, '', C);
  state.top = 0;
  moveArrowTo(rightX + 70, 0, 300);
  C(150, () => topBox.setText('0'));
}

// 控件
let pushInput = panel.addInput('输入数字', (v) => { if (v) push(v.trim()); }, 6);
panel.addButton('入栈', () => { if (pushInput.value) push(pushInput.value.trim()); });
panel.addButton('出栈', pop);
panel.addButton('清空', clear);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

// 初始空栈箭头位置
arrow.group.position.set(rightX + 70, 0, 0);

scene.start(engine);
