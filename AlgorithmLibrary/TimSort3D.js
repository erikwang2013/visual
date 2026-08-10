// AlgorithmLibrary/TimSort3D.js — TimSort：自然 run 识别 + 小 run 插入排序 + 归并栈合并（Python/Java 内置排序）
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('TimSort3D');

const scene = new Scene3D('scene', { cameraPos: [0, 260, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, PINK = 0xf0abfc;
const RUN_COLORS = [0x38bdf8, 0xfb923c, 0x4ade80, 0xf472b6, 0xfacc15, 0x2dd4bf, 0xa78bfa, 0xf87171];
const hint = new VText(scene, { text: '点击「运行 TimSort」开始', x: 0, y: 250, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const MINRUN = 4, N = 18;
const DATA = [34, 8, 25, 60, 61, 90, 5, 30, 58, 59, 62, 12, 77, 15, 21, 22, 45, 88];
const bars = [], vt = [], RUN = Array(N).fill(-1);
for (let i = 0; i < N; i++) {
  bars.push(new VBox(scene, { w: 30, h: 36, d: 36, x: (i - 8.5) * 36, y: 0, z: 0, label: String(DATA[i]), color: DIM, emissive: DIM }));
  vt.push(new VText(scene, { text: '', x: (i - 8.5) * 36, y: -46, z: 0, color: PALETTE.textDim, scale: 0.55 }));
}
new VText(scene, { text: '18 个随机元素 —— 色带 = 自然升序 run（段）', x: 0, y: 300, z: 0, color: PALETTE.textDim, scale: 0.7 });
const mergeT = new VText(scene, { text: '', x: 0, y: -80, z: 0, color: PALETTE.textGlow, scale: 0.7 });

function setH(i, v) { bars[i].setText(String(v)); bars[i].mesh.scale.y = Math.max(v / 100, 0.04); bars[i].mesh.position.y = 18 * v / 100 - 18; }
function resetAll() {
  engine.clear();
  DATA.forEach((v, i) => { RUN[i] = -1; setH(i, v); bars[i].setColor(DIM, DIM); });
  vt.forEach(t => t.setText(''));
  mergeT.setText('');
}

function runTimSort() {
  resetAll();
  hint.setText('TimSort 的思路：现实数据常含"天然有序段"，先找出它们再合并，比全程归并更快');
  C(700, () => { hint.setText('第 1 步 识别 run：从左到右扫描，把连续非降序列切成段'); });

  const runs = [];
  let st = 0;
  for (let i = 1; i <= N; i++) {
    if (i === N || DATA[i] < DATA[i - 1]) { runs.push([st, i - 1]); st = i; }
  }
  let t = 0;
  for (const [a, b] of runs) {
    const id = t++;
    C(520, () => {
      for (let i = a; i <= b; i++) { RUN[i] = id; bars[i].setColor(RUN_COLORS[id % 8], RUN_COLORS[id % 8]); }
      vt[a].setText('run ' + (id + 1));
      hint.setText(`发现 run ${id + 1}：区间 [${a}, ${b}]，长度 ${b - a + 1}${b - a + 1 < MINRUN ? '（< 4，稍后补长）' : ''}`);
    });
  }

  runs.forEach((r, ri) => {
    const [a, b] = r;
    if (b - a + 1 < MINRUN) {
      const end = Math.min(a + MINRUN - 1, N - 1);
      C(600, () => { hint.setText(`run ${ri + 1} 区间 [${a}, ${b}] 长度 < ${MINRUN}：用插入排序就地补长`); });
      const arr = DATA.slice();
      for (let i = a + 1; i <= end; i++) {
        const cur = arr[i]; let j = i - 1;
        while (j >= a && arr[j] > cur) { arr[j + 1] = arr[j]; j--; }
        arr[j + 1] = cur;
      }
      for (let k = a; k <= end; k++) {
        C(240, () => { setH(k, arr[k]); bars[k].setColor(GOLD, GOLD); });
      }
      C(500, () => {
        for (let k = a; k <= end; k++) { setH(k, arr[k]); bars[k].setColor(RUN_COLORS[ri % 8], RUN_COLORS[ri % 8]); }
        for (let k = a; k <= end; k++) DATA[k] = arr[k];
        vt[a].setText('run ' + (ri + 1) + ' 补长');
        hint.setText(`run ${ri + 1} 补长完成：长度 ≥ ${MINRUN} 且有序`);
      });
    }
  });

  const mergeRuns = (L, R) => {
    C(650, () => {
      for (let k = L[0]; k <= R[1]; k++) { bars[k].setColor(DIM, DIM); bars[k].mesh.scale.y = 0.06; bars[k].mesh.position.y = -16; }
      mergeT.setText(`归并：run[${L[0]}..${L[1]}] × run[${R[0]}..${R[1]}] —— 两段均有序，双指针取小`);
    });
    const merged = [];
    let i = L[0], j = R[0];
    while (i <= L[1] || j <= R[1]) {
      if (j > R[1] || (i <= L[1] && DATA[i] <= DATA[j])) { merged.push(DATA[i]); i++; }
      else { merged.push(DATA[j]); j++; }
    }
    merged.forEach((v, idx) => {
      C(240, () => { setH(L[0] + idx, v); bars[L[0] + idx].setColor(GOLD, GOLD); });
    });
    C(420, () => {
      const id = RUN[L[0]];
      for (let k = L[0]; k <= R[1]; k++) { RUN[k] = id; bars[k].setColor(RUN_COLORS[id % 8], RUN_COLORS[id % 8]); }
      mergeT.setText(`归并完成：${merged.length} 个元素一段有序，颜色统一`);
    });
    return [L[0], R[1]];
  };
  let pool = runs.slice();
  while (pool.length > 1) {
    const next = [];
    for (let i = 0; i < pool.length; i += 2) {
      if (i + 1 < pool.length) next.push(mergeRuns(pool[i], pool[i + 1]));
      else next.push(pool[i]);
    }
    pool = next;
  }

  C(800, () => {
    for (let i = 0; i < N; i++) bars[i].setColor(GREEN, GREEN);
    mergeT.setText('全部归并完成 —— 整个数组有序！');
    status.textContent = 'TimSort 完成：18 个元素 3 轮归并（Python sorted 与 Java Arrays.sort 的默认实现）';
    hint.setText('为什么快：找 run 免去无谓拆分；插入排序补短 run；归并稳定 —— 对近似有序数据接近 O(N)');
  });
}

panel.addButton('运行 TimSort', runTimSort);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；minrun=4）');

scene.start(engine);
