// AlgorithmLibrary/FibonacciSearch3D.js — 斐波那契搜索：用黄金分割比例定位，只需加/减无需除法
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('FibonacciSearch3D');

const scene = new Scene3D('scene', { cameraPos: [0, 260, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, VIOLET = 0xa78bfa, RED = 0xf87171;
const hint = new VText(scene, { text: '点击「运行斐波那契搜索」开始', x: 0, y: 250, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const DATA = [3, 8, 15, 19, 26, 34, 41, 47, 55, 62, 68, 74, 81];
const KEY = 47, N = DATA.length, SPX = 42;
const bars = [];
for (let i = 0; i < N; i++) {
  bars.push(new VBox(scene, { w: 30, h: 36, d: 36, x: (i - 6) * SPX, y: 0, z: 0, label: String(DATA[i]), color: DIM, emissive: DIM }));
}
new VText(scene, { text: '13 个元素（斐波那契数 F7=13）—— 每次把区间按黄金比 0.618 切开', x: 0, y: 300, z: 0, color: PALETTE.textDim, scale: 0.7 });
const fibT = new VText(scene, { text: '', x: 0, y: 205, z: 0, color: VIOLET, scale: 0.7 });
const logT = new VText(scene, { text: '', x: 0, y: -95, z: 0, color: PALETTE.textGlow, scale: 0.65 });
const foundT = new VText(scene, { text: '', x: 0, y: -130, z: 0, color: GREEN, scale: 0.75 });
new VText(scene, { text: '黄金分割比 φ ≈ 0.618', x: 0, y: -155, z: 0, color: GOLD, scale: 0.6 });

function setH(i) { bars[i].mesh.scale.y = Math.max(DATA[i] / 100, 0.04); bars[i].mesh.position.y = 18 * DATA[i] / 100 - 18; }
function resetAll() {
  engine.clear();
  DATA.forEach((_, i) => { setH(i); bars[i].setColor(DIM, DIM); });
  fibT.setText(''); logT.setText(''); foundT.setText('');
}

function runFib() {
  resetAll();
  hint.setText('斐波那契搜索 = 二分亲戚：用 F(k)=F(k-1)+F(k-2) 划分区间，探针位于黄金分割点');
  let f0 = 0, f1 = 1, f2 = 1;
  while (f2 < N) { f0 = f1; f1 = f2; f2 = f0 + f1; }
  let offset = -1, steps = 0;
  C(700, () => {
    fibT.setText(`斐波那契三元组 (${f0}, ${f1}, ${f2})（≥ 区间长度 ${N}）`);
    hint.setText('初始化：取不小于 N=13 的斐波那契数 F=13，三元组 (f0, f1, f2) = (5, 8, 13)');
  });
  while (f1 > 0) {
    steps++;
    const i = Math.min(offset + f1, N - 1);
    C(650, () => {
      bars[i].setColor(GOLD, GOLD);
      fibT.setText(`三元组 (${f0}, ${f1}, ${f2}) → 探针 i = offset+f1 = ${i}`);
      logT.setText(`第 ${steps} 步：比较 a[${i}] = ${DATA[i]} vs key=${KEY}`);
      hint.setText(`探针在区间 ${offset + 1}…${offset + f2} 的黄金分割处（i=${i}）`);
    });
    if (DATA[i] < KEY) {
      C(500, () => {
        bars[i].setColor(RED, RED);
        for (let j = offset + 1; j <= i; j++) bars[j].setColor(VIOLET, VIOLET);
        fibT.setText(`a[${i}] < key → 右移：offset=${i}，三元组 (${f1 - f0}, ${f0}, ${f1})`);
        logT.setText(`右半区继续：新区间 ${i + 1}…${offset + f2}`);
      });
      offset = i; f2 = f1; f1 = f0; f0 = f2 - f1;
    } else if (DATA[i] > KEY) {
      C(500, () => {
        bars[i].setColor(RED, RED);
        for (let j = i; j <= offset + f2; j++) bars[j].setColor(VIOLET, VIOLET);
        fibT.setText(`a[${i}] > key → 左移：三元组 (${f1 - f0}, ${f0}, ${f1})`);
        logT.setText(`左半区继续：区间保持 ${offset + 1}…${i - 1}`);
      });
      f2 = f0; f1 = f1 - f0; f0 = f2 - f1;
    } else {
      C(800, () => {
        bars[i].setColor(GREEN, GREEN);
        foundT.setText('✓ 命中！a[' + i + '] = ' + KEY);
        status.textContent = `斐波那契搜索完成：${steps} 步命中（只用加减与比较，无需除法）`;
        hint.setText('黄金分割省操作：区间收缩比 0.618，复杂度 O(log N)，适合嵌入式硬件');
      });
      return;
    }
  }
  C(700, () => {
    if (offset >= 0 && DATA[offset] === KEY) {
      bars[offset].setColor(GREEN, GREEN);
      foundT.setText('✓ 边界命中！a[' + offset + ']');
      status.textContent = '斐波那契搜索完成：最后一步比较 offset 位置命中';
    } else {
      status.textContent = '斐波那契搜索未找到 key=' + KEY;
      hint.setText('f1 归零，key 不存在');
    }
  });
}

panel.addButton('运行斐波那契搜索', runFib);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；key=47）');

scene.start(engine);
