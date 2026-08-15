// AlgorithmLibrary/LIS3D.js — 最长递增子序列：柱状数组 + 逐位比较更新 dp（前驱链），最终 LIS 元素绿色高亮、dp 值金色标注（function* 生成器驱动）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBar, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('LIS3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, ORANGE = 0xfb923c, CYAN = 0x22d3ee, WHITE = 0xffffff;
const status = panel.addStatus('就绪');
const ease = p => p * p * (3 - 2 * p);

const SA = [10, 22, 9, 33, 21, 50, 41, 60, 80];
const N = SA.length;
const BASE = 380;                                   // 柱底基线
const xOf = i => 320 + (i - (N - 1) / 2) * 66;
const barH = i => SA[i] * 4.5;

const dp = Array(N).fill(0);
const pred = Array(N).fill(-1);

// ---- 列对象池（峰值 9，池 10）：柱体 + 柱顶数值 + dp 标注 + 下标，运行期仅改文字/颜色/显隐/高度 ----
const colPool = [], colFree = [];
for (let i = 0; i <= N; i++) {
  const bar = new VBar(scene, { w: 38, d: 14, x: -600, y: 0, z: 0, color: BLUE, emissive: BLUE });
  const valT = new VText(scene, { text: '', x: -600, y: 0, z: 0, color: WHITE, scale: 0.55 });
  const dpT = new VText(scene, { text: '', x: -600, y: 0, z: 0, color: GOLD, scale: 0.6 });
  const idxT = new VText(scene, { text: '', x: -600, y: 0, z: 0, color: PALETTE.textDim, scale: 0.45 });
  bar.mesh.visible = false; valT.sprite.visible = false; dpT.sprite.visible = false; idxT.sprite.visible = false;
  colPool.push({ bar, valT, dpT, idxT });
}
colFree.push(...colPool);
const cols = [];                                    // 运行期活跃列：cols[i] = 列对象

function allocCol(i) {
  const c = colFree.pop();
  const x = xOf(i), h = barH(i);
  c.bar.baseX = x; c.bar.baseY = BASE;
  c.bar.setHeight(h);
  c.bar.setColor(BLUE, BLUE);
  c.bar.mesh.visible = true;
  c.valT.sprite.position.set(x, BASE + h + 24, 0);
  c.valT.setText(String(SA[i]));
  c.valT.sprite.visible = true;
  c.dpT.setText('');
  c.dpT.sprite.position.set(x, BASE + h + 58, 0);
  c.dpT.sprite.visible = true;
  c.idxT.setText('a[' + i + ']');
  c.idxT.sprite.position.set(x, BASE - 30, 0);
  c.idxT.sprite.visible = true;
  cols[i] = c;
  return c;
}
function freeCols() {
  for (const c of cols) {
    c.bar.mesh.visible = false; c.valT.sprite.visible = false;
    c.dpT.sprite.visible = false; c.idxT.sprite.visible = false;
    colFree.push(c);
  }
  cols.length = 0;
}
function col(i) { return cols[i]; }

function* runLIS() {
  freeCols();
  dp.fill(0); pred.fill(-1);
  yield S(() => { status.textContent = 'LIS（最长递增子序列）：dp[i] = 以 a[i] 结尾的最长递增子序列长度；dp[i] = max(dp[j]+1 | j<i 且 a[j]<a[i])，前驱链记录构成序列'; });
  yield W(900);
  for (let i = 0; i < N; i++) {
    const c = allocCol(i);
    const h = barH(i);
    c.bar.setHeight(1);
    yield A(420, p => c.bar.setHeight(Math.max(1, h * ease(p))));
    c.bar.setColor(CYAN, CYAN);
    yield S(() => { status.textContent = '计算 dp[' + i + ']（a[' + i + ']=' + SA[i] + '）：与全部前驱 a[j]（j<' + i + '）比较'; });
    yield W(500);
    let best = 1, pre = -1;
    for (let j = 0; j < i; j++) {
      const bj = col(j);
      bj.bar.setColor(ORANGE, ORANGE);
      const oldBest = best;
      let msg;
      if (SA[j] < SA[i] && dp[j] + 1 > best) {
        best = dp[j] + 1; pre = j;
        bj.bar.setColor(GREEN, GREEN);
        msg = 'a[' + j + ']=' + SA[j] + ' < a[' + i + ']=' + SA[i] + '：dp[' + j + ']+1=' + (dp[j] + 1) + ' > 暂优 ' + oldBest + ' → 更新为 ' + best;
      } else if (SA[j] < SA[i]) {
        bj.bar.setColor(BLUE, BLUE);
        msg = 'a[' + j + ']=' + SA[j] + ' < a[' + i + ']=' + SA[i] + '：但 dp[' + j + ']+1=' + (dp[j] + 1) + ' ≤ 暂优 ' + best + '，不更新';
      } else {
        bj.bar.setColor(BLUE, BLUE);
        msg = 'a[' + j + ']=' + SA[j] + ' ≥ a[' + i + ']=' + SA[i] + '：不能衔接，跳过';
      }
      yield S(() => { status.textContent = msg; });
      yield W(430);
    }
    dp[i] = best; pred[i] = pre;
    c.dpT.setText('dp=' + best);
    c.bar.setColor(GOLD, GOLD);
    yield S(() => { status.textContent = '→ dp[' + i + '] = ' + best + (pre >= 0 ? '（前驱 a[' + pre + ']=' + SA[pre] + '）' : '（自身为起点）'); });
    yield W(600);
    c.bar.setColor(BLUE, BLUE);
  }
  let idx = 0;
  for (let i = 1; i < N; i++) if (dp[i] > dp[idx]) idx = i;
  const seqIdx = [];
  for (let i = idx; i >= 0; i = pred[i]) seqIdx.push(i);
  seqIdx.reverse();
  yield S(() => { status.textContent = '最大 dp[' + idx + ']=' + dp[idx] + '，沿前驱链还原 LIS 成员'; });
  yield W(600);
  for (const i of seqIdx) {
    col(i).bar.setColor(GREEN, GREEN);
    yield S(() => { status.textContent = 'LIS 成员：a[' + i + ']=' + SA[i]; });
    yield W(420);
  }
  yield S(() => { status.textContent = 'LIS 演示完成：a=[' + SA.join(',') + ']，最长递增子序列长度 ' + dp[idx] + ' = ' + seqIdx.map(i => SA[i]).join('→') + '；O(n²) 时间，O(n) 空间'; });
  yield W(900);
}

for (let i = 0; i < N; i++) allocCol(i);   // 加载即显示演示体，点播放才动画
engine.queue(() => runLIS());
panel.addButton('清空', () => { engine.clear(); freeCols(); for (let i = 0; i < N; i++) allocCol(i); status.textContent = ''; });

scene.start(engine);
