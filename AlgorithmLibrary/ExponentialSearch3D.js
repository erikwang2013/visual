// AlgorithmLibrary/ExponentialSearch3D.js — 指数搜索：指数步进找上界 + 二分收尾，适合无界/大数组
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('ExponentialSearch3D');

const scene = new Scene3D('scene', { cameraPos: [0, 260, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, TEAL = 0x2dd4bf, BLUE = 0x38bdf8, RED = 0xf87171;
const hint = new VText(scene, { text: '点击「运行指数搜索」开始', x: 0, y: 250, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const DATA = [3, 8, 15, 19, 26, 34, 41, 47, 55, 62, 68, 74, 81, 90];
const KEY = 62, N = DATA.length, SPX = 42;
const bars = [];
for (let i = 0; i < N; i++) {
  bars.push(new VBox(scene, { w: 30, h: 36, d: 36, x: (i - 6.5) * SPX, y: 0, z: 0, label: String(DATA[i]), color: DIM, emissive: DIM }));
}
new VText(scene, { text: '14 个已排序元素 —— 指数步进以 1→2→4→8… 翻倍推进，快速圈定上界', x: 0, y: 300, z: 0, color: PALETTE.textDim, scale: 0.7 });
const edgeT = new VText(scene, { text: '', x: 0, y: 205, z: 0, color: GOLD, scale: 0.75 });
const logT = new VText(scene, { text: '', x: 0, y: -95, z: 0, color: PALETTE.textGlow, scale: 0.65 });
const foundT = new VText(scene, { text: '', x: 0, y: -130, z: 0, color: GREEN, scale: 0.75 });

function setH(i) { bars[i].mesh.scale.y = Math.max(DATA[i] / 100, 0.04); bars[i].mesh.position.y = 18 * DATA[i] / 100 - 18; }
function resetAll() {
  engine.clear();
  DATA.forEach((_, i) => { setH(i); bars[i].setColor(DIM, DIM); });
  edgeT.setText(''); logT.setText(''); foundT.setText('');
}

function runExp() {
  resetAll();
  hint.setText('指数搜索两阶段：① 以 i=1,2,4,8… 翻倍探测，直到 a[i] ≥ key；② 在 [i/2, i] 内二分');
  let i = 1;
  const steps = [];
  while (i < N && DATA[i] < KEY) { steps.push(i); i *= 2; }
  steps.push(i >= N ? N - 1 : i);
  let k = 0;
  for (const idx of steps) {
    k++;
    C(550, () => {
      for (let j = 0; j <= idx; j++) bars[j].setColor(TEAL, TEAL);
      bars[idx].setColor(GOLD, GOLD);
      logT.setText(`第 ${k} 步：i = ${idx}，a[${idx}] = ${DATA[idx]}${DATA[idx] < KEY ? ' < key → 继续翻倍' : ' ≥ key → 停下！'}`);
      hint.setText(`探测 i=${idx}：a[${idx}] = ${DATA[idx]}，${DATA[idx] < KEY ? '仍小于 key=' + KEY + '，边界翻倍' : '首次 ≥ key，上界确定'}`);
    });
  }
  const hi = i >= N ? N - 1 : i;
  const lo = Math.floor(i / 2);
  C(600, () => {
    for (let j = 0; j < N; j++) bars[j].setColor(DIM, DIM);
    for (let j = lo; j <= hi; j++) bars[j].setColor(BLUE, BLUE);
    edgeT.setText(`边界已锁定：候选区间 [${lo}, ${hi}]（指数步进只用了 ${steps.length} 次比较）`);
    hint.setText(`第 2 阶段：在 [${lo}, ${hi}] 内做二分查找 key=${KEY}`);
  });
  let l = lo, h = hi, cnt = 0;
  while (l <= h) {
    const m = (l + h) >> 1;
    cnt++;
    C(550, () => {
      bars[m].setColor(GOLD, GOLD);
      logT.setText(`二分第 ${cnt} 步：mid = ${m}，a[${m}] = ${DATA[m]} vs key=${KEY}`);
    });
    if (DATA[m] === KEY) {
      C(750, () => {
        bars[m].setColor(GREEN, GREEN);
        foundT.setText('✓ 命中！a[' + m + '] = ' + KEY);
        status.textContent = `指数搜索完成：步进 ${steps.length} 次 + 二分 ${cnt} 次 = ${steps.length + cnt} 次比较（全程二分约需 4 次）`;
        hint.setText('指数搜索的优势：不知道数组大小时也安全（适合无界流/大数组），复杂度 O(log i)，i 为目标位置');
      });
      return;
    }
    const nl = DATA[m] < KEY ? m + 1 : l, nh = DATA[m] < KEY ? h : m - 1;
    C(450, () => {
      bars[m].setColor(RED, RED);
      logT.setText(`a[${m}] ${DATA[m] < KEY ? '<' : '>'} key → 区间 [${nl}, ${nh}]`);
    });
    l = nl; h = nh;
  }
  C(700, () => {
    status.textContent = '指数搜索未找到 key=' + KEY;
    hint.setText('区间耗尽，key 不存在');
  });
}

panel.addButton('运行指数搜索', runExp);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；key=62）');

scene.start(engine);
