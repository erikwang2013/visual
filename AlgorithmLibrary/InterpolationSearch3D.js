// AlgorithmLibrary/InterpolationSearch3D.js — 插值搜索：按值比例估算位置（查字典式）—— 12 元素、key=57 两步命中（pos=6→49<57，pos=7→57）（function* 生成器驱动，估算与收缩运行时计算）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('InterpolationSearch3D');

const scene = new Scene3D('scene', { cameraPos: [0, 260, 640], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, BLUE = 0x38bdf8, RED = 0xf87171;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：插值搜索 —— 按值比例估算位置', x: 0, y: 250, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');

const DATA = [5, 12, 18, 26, 33, 41, 49, 57, 64, 72, 80, 88];
const KEY = 57, N = DATA.length, SPX = 42;
const bars = [];
for (let i = 0; i < N; i++) {
  bars.push(new VBox(scene, { w: 30, h: 36, d: 36, x: (i - 5.5) * SPX, y: 0, z: 0, label: String(DATA[i]), color: DIM, emissive: DIM }));
}
new VText(scene, { text: '数组近似等差（均匀分布）→ 按值比例估算', x: 0, y: 305, z: 0, color: PALETTE.textDim, scale: 0.7 });
const lowM = new VBox(scene, { w: 10, h: 10, d: 10, x: -2000, y: -78, z: 0, color: BLUE, emissive: BLUE });
const highM = new VBox(scene, { w: 10, h: 10, d: 10, x: -2000, y: -78, z: 0, color: BLUE, emissive: BLUE });
const lowT = new VText(scene, { text: '', x: 0, y: -60, z: 0, color: BLUE, scale: 0.6 });
const highT = new VText(scene, { text: '', x: 0, y: -78, z: 0, color: BLUE, scale: 0.6 });
const formulaT = new VText(scene, { text: '', x: 0, y: -110, z: 0, color: PALETTE.textGlow, scale: 0.7 });
const foundT = new VText(scene, { text: '', x: 0, y: 205, z: 0, color: GREEN, scale: 0.8 });

const setH = i => { bars[i].mesh.scale.y = Math.max(DATA[i] / 100, 0.04); bars[i].mesh.position.y = 18 * DATA[i] / 100 - 18; };
const moveMark = (m, i) => { m.mesh.position.x = (i - 5.5) * SPX; };

function* interpGen() {
  let low = 0, high = N - 1;
  yield S(() => { hint.setText('插值搜索 = 二分搜索的"智能版"：二分固定取中点，插值按 key 在区间内的比例取点'); });
  yield W(700);
  yield S(() => {
    moveMark(lowM, low); moveMark(highM, high);
    lowT.setText('low = ' + low); highT.setText('high = ' + high);
    hint.setText('初始区间 [0, 11]，查找 key = ' + KEY + '（值 5…88）');
  });
  yield W(700);
  let steps = 0;
  while (low <= high && KEY >= DATA[low] && KEY <= DATA[high]) {
    steps++;
    const pos = low + Math.floor(((high - low) * (KEY - DATA[low])) / (DATA[high] - DATA[low]));
    const lv = DATA[low], hv = DATA[high];
    yield S(() => {
      bars[pos].setColor(GOLD, GOLD);
      formulaT.setText('pos = low + (high−low)·(key−a[low])/(a[high]−a[low]) = ' + low + ' + ' + (high - low) + '·(' + KEY + '−' + lv + ')/(' + hv + '−' + lv + ') = ' + pos);
      hint.setText('第 ' + steps + ' 步：按比例估算 pos = ' + pos + '，a[' + pos + '] = ' + DATA[pos]);
    });
    yield W(700);
    if (DATA[pos] === KEY) {
      yield S(() => {
        bars[pos].setColor(GREEN, GREEN);
        foundT.setText('✓ 命中！a[' + pos + '] = ' + KEY);
        status.textContent = '插值搜索完成：' + steps + ' 步命中（二分需 4 步；均匀分布时插值常一步即中）';
        hint.setText('均匀分布下插值搜索期望 O(log log N) —— 一次估算即命中是常态');
      });
      yield W(1000);
      yield S(() => { hint.setText('插值搜索演示完成：pos=6 → a[6]=49<57 → pos=7 一步命中 —— 查字典式的跳跃'); });
      yield W(400);
      return;
    }
    const nl = DATA[pos] < KEY ? pos + 1 : low, nh = DATA[pos] < KEY ? high : pos - 1;
    yield S(() => {
      bars[pos].setColor(RED, RED);
      formulaT.setText('a[' + pos + '] = ' + DATA[pos] + ' ' + (DATA[pos] < KEY ? '<' : '>') + ' key=' + KEY + ' → 区间收缩');
      hint.setText('a[' + pos + '] ' + (DATA[pos] < KEY ? '小于' : '大于') + ' key，区间更新为 [' + nl + ', ' + nh + ']');
      moveMark(lowM, nl); moveMark(highM, nh);
      lowT.setText('low = ' + nl); highT.setText('high = ' + nh);
    });
    yield W(600);
    low = nl; high = nh;
  }
  yield S(() => {
    status.textContent = '插值搜索未找到 key';
    hint.setText('搜索结束：key 超出当前区间范围（a[low] ≤ key ≤ a[high] 不成立）');
  });
  yield W(800);
}

engine.queue(() => interpGen());
panel.addButton('清空', () => {
  engine.clear();
  DATA.forEach((_, i) => { setH(i); bars[i].setColor(DIM, DIM); });
  [lowM, highM].forEach(m => m.mesh.position.x = -2000);
  lowT.setText(''); highT.setText(''); formulaT.setText(''); foundT.setText('');
  hint.setText('已清空，可重新运行'); status.textContent = '';
});
panel.addLabel('（拖拽旋转视角，滚轮缩放；key=57，蓝方块 = 区间边界）');

scene.start(engine);
