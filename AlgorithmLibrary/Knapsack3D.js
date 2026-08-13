// AlgorithmLibrary/Knapsack3D.js — 0/1 背包：物品盒一行 + DP 表逐格填（不含 vs 含），回溯阶段路径格金色、选中物品橙色上浮（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Knapsack3D');

const scene = new Scene3D('scene', { cameraPos: [320, 500, 900], lookAt: [320, 500, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：0/1 背包（容量 8）', x: 700, y: 560, z: 0, color: PALETTE.textGlow, scale: 0.7, wrapChars: 7 });
const status = panel.addStatus('就绪');
const outT = new VText(scene, { text: '', x: 700, y: 420, z: 0, color: PALETTE.textGlow, scale: 0.62, wrapChars: 8 });

const ITEMS = [{ w: 2, v: 3 }, { w: 3, v: 4 }, { w: 4, v: 5 }, { w: 5, v: 6 }];
const N = ITEMS.length, CAP = 8;
const itemBox = new Map();    // i -> VBox
const cellView = new Map();   // 'r-c' -> VBox
const dp = Array.from({ length: N + 1 }, () => Array(CAP + 1).fill(0));

function clearView() {
  itemBox.forEach(b => scene.remove(b.mesh));
  cellView.forEach(c => scene.remove(c.box.mesh));
  itemBox.clear(); cellView.clear();
}
function buildView() {
  clearView();
  for (let i = 0; i < N; i++) {
    const x = 170 + i * 88;
    const b = new VBox(scene, { w: 56, h: 56, d: 24, x, y: 580, z: 0, label: 'w' + ITEMS[i].w, color: BLUE, emissive: BLUE });
    itemBox.set(i, b);
    new VText(scene, { text: '物品' + (i + 1) + ' v' + ITEMS[i].v, x, y: 630, z: 0, color: WHITE, scale: 0.5 });
  }
  const capBox = new VBox(scene, { w: 72, h: 72, d: 28, x: 570, y: 580, z: 0, label: 'C=' + CAP, color: ORANGE, emissive: ORANGE });
  new VText(scene, { text: '0', x: 104, y: 490, z: 0, color: WHITE, scale: 0.42 });
  for (let c = 1; c <= CAP; c++) {
    new VText(scene, { text: String(c), x: 104 + c * 54, y: 490, z: 0, color: WHITE, scale: 0.42 });
  }
  new VText(scene, { text: '无', x: 50, y: 435, z: 0, color: WHITE, scale: 0.46 });
  for (let r = 1; r <= N; r++) {
    new VText(scene, { text: '物品' + r, x: 50, y: 435 - r * 48, z: 0, color: WHITE, scale: 0.46 });
  }
  for (let r = 0; r <= N; r++) {
    for (let c = 0; c <= CAP; c++) {
      const box = new VBox(scene, { w: 50, h: 42, d: 14, x: 104 + c * 54, y: 435 - r * 48, z: 0, label: String(dp[r][c]), color: BLUE, emissive: BLUE });
      cellView.set(r + '-' + c, { box, val: dp[r][c] });
    }
  }
}
function setCell(r, c, v, col) {
  dp[r][c] = v;
  const e = cellView.get(r + '-' + c);
  e.box.setText(String(v));
  e.box.setColor(col, col);
}
function setCellColor(r, c, col) { const e = cellView.get(r + '-' + c); if (e) e.box.setColor(col, col); }

function* knapGen() {
  for (let r = 1; r <= N; r++) {
    const { w, v } = ITEMS[r - 1];
    yield S(() => outT.setText('——— 处理物品' + r + '（w=' + w + ', v=' + v + '）———'));
    yield W(380);
    for (let c = 1; c <= CAP; c++) {
      const skip = dp[r - 1][c];
      const take = c >= w ? dp[r - 1][c - w] + v : -1;
      setCellColor(r, c, CYAN);
      yield S(() => outT.setText('dp[' + r + '][' + c + ']：不含 = ' + skip + '；含 = ' + (take < 0 ? '容量不足' : dp[r - 1][c - w] + '+' + v + '=' + take) + ' → 取 max'));
      yield W(230);
      setCell(r, c, Math.max(skip, take), take > skip ? ORANGE : BLUE);
      yield W(160);
    }
  }
  yield S(() => outT.setText('填表完成。② 回溯：从 dp[' + N + '][' + CAP + ']=' + dp[N][CAP] + ' 倒推：若与上行相同则未选，否则选物品并左移容量'));
  yield W(650);
  const chosen = [];
  let r = N, c = CAP;
  while (r > 0 && c > 0) {
    setCellColor(r, c, GOLD);
    if (dp[r][c] === dp[r - 1][c]) {
      yield S(() => outT.setText('dp[' + r + '][' + c + '] = dp[' + (r - 1) + '][' + c + '] → 物品' + r + ' 未选，上行'));
      yield W(400);
      r--;
    } else {
      const idx = r - 1;
      chosen.push(idx);
      yield S(() => outT.setText('dp[' + r + '][' + c + '] ≠ 上行 → 选中物品' + r + '（w=' + ITEMS[idx].w + ', v=' + ITEMS[idx].v + '），容量 -' + ITEMS[idx].w));
      yield W(420);
      const b = itemBox.get(idx);
      const baseY = b.mesh.position.y;
      yield A(500, p => { b.mesh.position.y = baseY + 46 * Math.sin(p * Math.PI); });
      b.setColor(ORANGE, ORANGE);
      c -= ITEMS[idx].w;
      r--;
    }
  }
  const totalV = chosen.reduce((s, i) => s + ITEMS[i].v, 0);
  yield S(() => outT.setText('完成：最大价值 ' + totalV + '，选取物品 [' + chosen.map(i => i + 1).join(', ') + ']'));
  yield W(600);
  yield S(() => { status.textContent = '0/1 背包完成：最大价值 ' + totalV + '（物品' + chosen.map(i => i + 1).join('、') + '），O(nC)'; });
  yield W(450);
}

function* runKnap() {
  buildView();
  hint.setText('0/1 背包：dp[r][c] = max(不含, 含)，回溯找选取方案');
  yield W(400);
  yield* knapGen();
  yield S(() => { outT.setText(''); hint.setText('0/1 背包完成：最大价值 10（物品2 + 物品4），O(nC)'); });
}

engine.queue(() => runKnap());
panel.addButton('清空', () => { engine.clear(); clearView(); hint.setText('已清空，可重新运行'); status.textContent = ''; outT.setText(''); });
panel.addLabel('（拖拽旋转视角，滚轮缩放；青 = 计算中，橙 = 含更优，金 = 回溯路径；选中物品橙色上浮）');

scene.start(engine);
