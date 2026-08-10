// AlgorithmLibrary/InterpolationSearch3D.js — 插值搜索：按值比例估算位置（查字典式），适合均匀分布
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('InterpolationSearch3D');

const scene = new Scene3D('scene', { cameraPos: [0, 260, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, BLUE = 0x38bdf8, RED = 0xf87171;
const hint = new VText(scene, { text: '点击「运行插值搜索」开始', x: 0, y: 250, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const DATA = [5, 12, 18, 26, 33, 41, 49, 57, 64, 72, 80, 88];
const KEY = 57, N = DATA.length, SPX = 42;
const bars = [];
for (let i = 0; i < N; i++) {
  bars.push(new VBox(scene, { w: 30, h: 36, d: 36, x: (i - 5.5) * SPX, y: 0, z: 0, label: String(DATA[i]), color: DIM, emissive: DIM }));
}
new VText(scene, { text: '数组近似等差（均匀分布）→ 可用"按值比例"直接估算下标', x: 0, y: 300, z: 0, color: PALETTE.textDim, scale: 0.7 });
const lowM = new VBox(scene, { w: 10, h: 10, d: 10, x: -2000, y: -78, z: 0, color: BLUE, emissive: BLUE });
const highM = new VBox(scene, { w: 10, h: 10, d: 10, x: -2000, y: -78, z: 0, color: BLUE, emissive: BLUE });
const lowT = new VText(scene, { text: '', x: 0, y: -60, z: 0, color: BLUE, scale: 0.6 });
const highT = new VText(scene, { text: '', x: 0, y: -78, z: 0, color: BLUE, scale: 0.6 });
const formulaT = new VText(scene, { text: '', x: 0, y: -110, z: 0, color: PALETTE.textGlow, scale: 0.7 });
const foundT = new VText(scene, { text: '', x: 0, y: 205, z: 0, color: GREEN, scale: 0.8 });

function setH(i) { bars[i].mesh.scale.y = Math.max(DATA[i] / 100, 0.04); bars[i].mesh.position.y = 18 * DATA[i] / 100 - 18; }
function resetAll() {
  engine.clear();
  DATA.forEach((_, i) => { setH(i); bars[i].setColor(DIM, DIM); });
  [lowM, highM].forEach(m => m.mesh.position.x = -2000);
  lowT.setText(''); highT.setText(''); formulaT.setText(''); foundT.setText('');
}
function moveMark(m, i) { m.mesh.position.x = (i - 5.5) * SPX; }

function runInterp() {
  resetAll();
  hint.setText('插值搜索 = 二分搜索的"智能版"：二分固定取中点，插值按 key 在区间内的比例取点');
  let low = 0, high = N - 1;
  C(700, () => {
    moveMark(lowM, low); moveMark(highM, high);
    lowT.setText('low = ' + low); highT.setText('high = ' + high);
    hint.setText('初始区间 [0, 11]，查找 key = ' + KEY + '（值 5…88）');
  });
  let steps = 0;
  while (low <= high && KEY >= DATA[low] && KEY <= DATA[high]) {
    steps++;
    const pos = low + Math.floor(((high - low) * (KEY - DATA[low])) / (DATA[high] - DATA[low]));
    const lv = DATA[low], hv = DATA[high];
    C(700, () => {
      bars[pos].setColor(GOLD, GOLD);
      formulaT.setText(`pos = low + (high−low)·(key−a[low])/(a[high]−a[low]) = ${low} + ${high - low}·(${KEY}−${lv})/(${hv}−${lv}) = ${pos}`);
      hint.setText(`第 ${steps} 步：按比例估算 pos = ${pos}，a[${pos}] = ${DATA[pos]}`);
    });
    if (DATA[pos] === KEY) {
      C(800, () => {
        bars[pos].setColor(GREEN, GREEN);
        foundT.setText('✓ 命中！a[' + pos + '] = ' + KEY);
        status.textContent = `插值搜索完成：${steps} 步命中（二分需 4 步；均匀分布时插值常一步即中）`;
        hint.setText('均匀分布下插值搜索期望 O(log log N) —— 一次估算即命中是常态');
      });
      return;
    }
    const nl = DATA[pos] < KEY ? pos + 1 : low, nh = DATA[pos] < KEY ? high : pos - 1;
    C(600, () => {
      bars[pos].setColor(RED, RED);
      formulaT.setText(`a[${pos}] = ${DATA[pos]} ${DATA[pos] < KEY ? '<' : '>'} key=${KEY} → 区间收缩`);
      hint.setText(`a[${pos}] ${DATA[pos] < KEY ? '小于' : '大于'} key，区间更新为 [${nl}, ${nh}]`);
      moveMark(lowM, nl); moveMark(highM, nh);
      lowT.setText('low = ' + nl); highT.setText('high = ' + nh);
    });
    low = nl; high = nh;
  }
  C(800, () => {
    status.textContent = '插值搜索未找到 key';
    hint.setText('搜索结束：key 超出当前区间范围（a[low] ≤ key ≤ a[high] 不成立）');
  });
}

panel.addButton('运行插值搜索', runInterp);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；key=57）');

scene.start(engine);
