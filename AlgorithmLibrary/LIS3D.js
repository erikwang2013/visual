// AlgorithmLibrary/LIS3D.js — 最长递增子序列：柱状数组 + 逐位比较更新 dp（前驱链），最终 LIS 元素绿色高亮、dp 值金色标注（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('LIS3D');

const scene = new Scene3D('scene', { cameraPos: [320, 500, 900], lookAt: [320, 500, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：最长递增子序列 LIS', x: 700, y: 560, z: 0, color: PALETTE.textGlow, scale: 0.7, wrapChars: 7 });
const status = panel.addStatus('就绪');
const outT = new VText(scene, { text: '', x: 0, y: 70, z: 0, color: PALETTE.textGlow, scale: 0.62 });

const SA = [10, 22, 9, 33, 21, 50, 41, 60, 80];
const N = SA.length;
const barView = new Map();   // i -> VBox
const dpView = new Map();    // i -> VText
const dp = Array(N).fill(0);
const pred = Array(N).fill(-1);

function xOf(i) { return (i - (N - 1) / 2) * 66 + 320; }
function clearView() {
  barView.forEach(b => scene.remove(b.mesh));
  dpView.forEach(t => scene.remove(t.sprite));
  barView.clear(); dpView.clear();
}
function buildBars() {
  clearView();
  for (let i = 0; i < N; i++) {
    const h = SA[i] * 5.5;
    const b = new VBox(scene, { w: 38, h, d: 16, x: xOf(i), y: -h / 2 + 310, z: 0, label: String(SA[i]), color: BLUE, emissive: BLUE });
    barView.set(i, b);
    const t = new VText(scene, { text: '', x: xOf(i), y: h / 2 + 344, z: 0, color: GOLD, scale: 0.62 });
    dpView.set(i, t);
  }
}
function setBarColor(i, c) { const e = barView.get(i); if (e) e.setColor(c, c); }

function* lisGen() {
  yield S(() => outT.setText('LIS：dp[i] = max(dp[j]+1 | j<i 且 a[j]<a[i])；前驱链记录构成序列，O(n²)'));
  yield W(650);
  for (let i = 0; i < N; i++) {
    setBarColor(i, CYAN);
    let best = 1, pre = -1;
    yield S(() => outT.setText('——— 计算 dp[' + i + ']（a[' + i + ']=' + SA[i] + '）：与全部前驱比较 ———'));
    yield W(380);
    for (let j = 0; j < i; j++) {
      setBarColor(j, ORANGE);
      yield S(() => outT.setText('比较 a[' + j + ']=' + SA[j] + ' 与 a[' + i + ']=' + SA[i] + (SA[j] < SA[i] ? '：a[j]<a[i]' + (dp[j] + 1 > best ? ' → dp[' + j + ']+1=' + (dp[j] + 1) + ' 更新暂优' : '，但 dp[' + j + ']+1=' + (dp[j] + 1) + ' ≤ 当前 ' + best) : '：a[j]≥a[i]，跳过')));
      yield W(250);
      if (SA[j] < SA[i] && dp[j] + 1 > best) {
        best = dp[j] + 1;
        pre = j;
        setBarColor(j, GREEN);
      }
      setBarColor(j, BLUE);
    }
    dp[i] = best; pred[i] = pre;
    dpView.get(i).setText('dp=' + best);
    yield S(() => outT.setText('→ dp[' + i + '] = ' + best + (pre >= 0 ? '（前驱 a[' + pre + ']=' + SA[pre] + '）' : '（自身为起点）')));
    yield W(450);
    setBarColor(i, BLUE);
  }
  let idx = 0;
  for (let i = 1; i < N; i++) if (dp[i] > dp[idx]) idx = i;
  const seqIdx = [];
  for (let i = idx; i >= 0; i = pred[i]) seqIdx.push(i);
  seqIdx.reverse();
  yield S(() => outT.setText('最大 dp[' + idx + ']=' + dp[idx] + '，沿前驱链还原 LIS'));
  yield W(500);
  for (const i of seqIdx) {
    setBarColor(i, GREEN);
    yield S(() => outT.setText('LIS 成员：a[' + i + ']=' + SA[i]));
    yield W(350);
  }
  const seq = seqIdx.map(i => SA[i]).join(' → ');
  yield S(() => outT.setText('完成：LIS 长度 ' + dp[idx] + '：' + seq + '，O(n²)'));
  yield W(650);
  yield S(() => { status.textContent = 'LIS 长度 ' + dp[idx] + '：' + seq; });
  yield W(450);
}

function* runLIS() {
  buildBars();
  hint.setText('LIS：逐位比较前驱，dp 表 + 前驱链还原');
  yield W(400);
  yield* lisGen();
  yield S(() => { outT.setText(''); hint.setText('LIS 完成：长度 6（10→22→33→50→60→80），O(n²)'); });
}

engine.queue(() => runLIS());
panel.addButton('清空', () => { engine.clear(); clearView(); hint.setText('已清空，可重新运行'); status.textContent = ''; outT.setText(''); });
panel.addLabel('（拖拽旋转视角，滚轮缩放；青 = 当前位，橙 = 比较位，绿 = 更优前驱/最终 LIS 成员；柱顶 dp=N 标注）');

scene.start(engine);
