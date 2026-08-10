// AlgorithmLibrary/LIS3D.js
// 最长递增子序列：随机数组 VBar + 每位置 dp 值 VText 标注 + 前驱记录（高亮表示），
// 求解时逐位置与全部前序位置比较更新 dp（比较对高亮），
// 最终 dp 最大值标注绿色，最长 LIS 元素绿色高亮。
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Array3D } from '../3D/modes/Array3D.js';
import { VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('LIS3D');

const scene = new Scene3D('scene', { cameraPos: [0, 220, 640], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const status = panel.addStatus('');
const hint = new VText(scene, { text: '最长递增子序列：先随机化数组，再点「求解」', x: 0, y: 235, z: 0, color: PALETTE.textGlow, scale: 0.85 });

const N = 12;
const data = new Array(N);
const dp = new Array(N);
const pred = new Array(N);
let array = null;
const dpLabels = [];

const xOf = (i) => (i - (N - 1) / 2) * 58;
const hexStr = (c) => '#' + c.toString(16).padStart(6, '0');

function buildArray() {
  array = new Array3D(scene, { type: 'bar', count: N, w: 32, h: 32, spacing: 58, startY: 0, z: 0 });
  array.create();
  for (let i = 0; i < N; i++) {
    dpLabels.push(new VText(scene, { text: '', x: xOf(i), y: 168, z: 0, color: PALETTE.textDim, scale: 0.7 }));
  }
}

// 恢复柱体本色并清空 dp 标注（数组不存在则重建）
function resetBars() {
  if (!array) buildArray();
  for (let i = 0; i < N; i++) {
    const el = array.elems[i];
    el.mesh.material.color.setHex(PALETTE.node);
    el.mesh.material.emissive.setHex(PALETTE.nodeEmissive);
    el.mesh.material.emissiveIntensity = 0.35;
    dpLabels[i].setText('');
  }
}

function randomize(animate) {
  engine.clear();
  resetBars();
  if (animate) C(1, () => { status.textContent = '随机化数组'; }, () => {});
  else status.textContent = '随机化数组';
  for (let i = 0; i < N; i++) {
    data[i] = 1 + Math.floor(Math.random() * 20);
    if (animate) array.setValue(i, data[i], C);
    else array.elems[i].setHeight(data[i] * 6);
  }
  hint.setText('已生成 ' + N + ' 个 1-20 的随机数，点击「求解」计算最长递增子序列');
}

function solve() {
  if (!array) randomize(false);
  engine.clear();
  resetBars();
  C(1, () => { status.textContent = 'dp[i] = max(dp[j] + 1 | j < i 且 a[j] < a[i])'; }, () => {});
  for (let i = 0; i < N; i++) {
    array.highlight(i, C);
    let best = 1, pre = -1;
    for (let j = 0; j < i; j++) {
      array.highlight(j, C);
      C(1, () => { status.textContent = '比较 a[' + j + ']=' + data[j] + ' 与 a[' + i + ']=' + data[i] + '，当前 dp[' + i + ']=' + best; }, () => {});
      if (data[j] < data[i] && dp[j] + 1 > best) {
        best = dp[j] + 1;
        pre = j;
        C(180, () => array.elems[j].mesh.material.color.setHex(PALETTE.green), () => array.elems[j].mesh.material.color.setHex(PALETTE.node));
      }
      array.unhighlight(j, C);
    }
    dp[i] = best; pred[i] = pre;
    C(240, () => dpLabels[i].setText(String(best), { color: PALETTE.text }), () => dpLabels[i].setText(''));
    C(1, () => { status.textContent = 'dp[' + i + '] = ' + best + (pre >= 0 ? '（前驱 a[' + pre + ']=' + data[pre] + '）' : ''); }, () => {});
    array.unhighlight(i, C);
  }
  // 找 dp 最大值，沿前驱链还原最长递增子序列
  let idx = 0;
  for (let i = 1; i < N; i++) if (dp[i] > dp[idx]) idx = i;
  const seqIdx = [];
  for (let i = idx; i >= 0; i = pred[i]) seqIdx.push(i);
  seqIdx.reverse();
  for (const i of seqIdx) {
    array.highlight(i, C, PALETTE.green);
    C(240, () => dpLabels[i].setText(String(dp[i]), { color: hexStr(PALETTE.green) }), () => {});
  }
  const seq = seqIdx.map((i) => data[i]).join(' ');
  C(1, () => {
    hint.setText('最长递增子序列长度 = ' + dp[idx] + '：' + seq);
    status.textContent = 'LIS 长度 ' + dp[idx] + '，序列：' + seq;
  }, () => {});
}

function clearAll() {
  engine.clear();
  if (array) {
    for (const el of array.elems) el.remove();
    for (const l of array.indexLabels) l.remove();
    array.clearLines();
    array = null;
  }
  for (const l of dpLabels) l.remove();
  dpLabels.length = 0;
  hint.setText('最长递增子序列：先随机化数组，再点「求解」');
  status.textContent = '已清空';
}

panel.addButton('随机化数组', () => randomize(true));
panel.addButton('求解', solve);
panel.addButton('清空', clearAll);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

randomize(false);
scene.start(engine);
