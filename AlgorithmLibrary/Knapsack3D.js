// AlgorithmLibrary/Knapsack3D.js
// 0/1 背包：物品盒（重量/价值）一行排开，DP 表格逐格填。
// 填表高亮比较「不含 vs 含」，回溯阶段选中物品橙色上浮，路径格绿色。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Table3D } from '../3D/modes/Table3D.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Knapsack3D');

const scene = new Scene3D('scene', { cameraPos: [0, 360, 880], fov: 60 });
const engine = new AnimationEngine({ speed: 1.5 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const status = panel.addStatus('');
const hint = new VText(scene, { text: '输入物品(重量/价值)与容量，点击「求解」开始', x: 0, y: 310, z: 0, color: PALETTE.textGlow, scale: 0.85 });

let table = null;
const aux = [];

function clearAll() {
  engine.clear();
  for (const o of aux) o.remove();
  aux.length = 0;
  if (table) {
    for (const row of table.cells) for (const b of row) if (b) b.remove();
    for (const l of table.rowLabels) l.remove();
    for (const l of table.colLabels) l.remove();
    table = null;
  }
  hint.setText('输入物品(重量/价值)与容量，点击「求解」开始');
  status.textContent = '已清空';
}

// ---- 模型 ----
function parseItems(s) {
  const out = [];
  for (const part of s.split(/[,，;；\s]+/)) {
    const m = part.match(/^(\d+)\/(\d+)$/);
    if (m) out.push({ w: parseInt(m[1], 10), v: parseInt(m[2], 10) });
  }
  return out.slice(0, 6);
}

function knapModel(items, cap) {
  const n = items.length;
  const dp = Array.from({ length: n + 1 }, () => Array(cap + 1).fill(0));
  const fill = [];   // {r, c, skip, take, useTake, w, v}
  for (let r = 1; r <= n; r++) {
    const { w, v } = items[r - 1];
    for (let c = 1; c <= cap; c++) {
      const skip = dp[r - 1][c];
      const take = c >= w ? dp[r - 1][c - w] + v : -Infinity;
      dp[r][c] = Math.max(skip, take);
      fill.push({ r, c, skip, take, useTake: take > skip, w, v });
    }
  }
  const chosen = []; // 0-based 物品下标
  let r = n, c = cap;
  while (r > 0 && c > 0) {
    if (dp[r][c] === dp[r - 1][c]) r--;
    else { chosen.push(r - 1); c -= items[r - 1].w; r--; }
  }
  return { dp, fill, chosen: chosen.reverse(), max: dp[n][cap] };
}

function fadeBack(r, c) {
  const box = table.cells[r][c];
  const from = new THREE.Color(PALETTE.highlight), to = new THREE.Color(PALETTE.node);
  C(280, (p) => {
    box.mesh.material.color.copy(from).lerp(to, p);
    box.mesh.material.emissive.setHex(PALETTE.nodeEmissive);
  }, () => { box.mesh.material.color.setHex(PALETTE.node); box.mesh.material.emissive.setHex(PALETTE.nodeEmissive); });
}

function run() {
  engine.clear();
  clearAll();
  const items = parseItems(itemInput.value);
  const cap = Math.min(Math.max(parseInt(capInput.value, 10) || 8, 1), 12);
  if (!items.length) { status.textContent = '物品格式：重量/价值，逗号分隔，如 2/3,3/4'; return; }
  itemInput.value = items.map((x) => x.w + '/' + x.v).join(',');
  capInput.value = String(cap);
  const n = items.length;

  // 物品盒一行
  const boxes = [];
  for (let i = 0; i < n; i++) {
    const x = -170 + i * 95;
    const b = new VBox(scene, { w: 58, h: 58, d: 26, x, y: 200, z: 0, label: 'w' + items[i].w, color: PALETTE.blue, emissive: PALETTE.blueEmissive });
    boxes.push(b); aux.push(b);
    const capT = new VText(scene, { text: '物品' + (i + 1), x, y: 256, z: 0, color: PALETTE.textDim, scale: 0.62 });
    const valT = new VText(scene, { text: 'v' + items[i].v, x, y: 148, z: 0, color: PALETTE.textDim, scale: 0.62 });
    aux.push(capT, valT);
  }
  const capBox = new VBox(scene, { w: 72, h: 72, d: 30, x: 300, y: 200, z: 0, label: 'C=' + cap, color: PALETTE.orange, emissive: PALETTE.orangeEmissive });
  aux.push(capBox);

  // DP 表格
  table = new Table3D(scene, { rows: n + 1, cols: cap + 1, cellW: 44, cellH: 40, startX: 0, startY: -8 });
  table.create();
  for (let r = 1; r <= n; r++) table.setRowLabel(r, '物品' + r);
  table.rowLabels[0].setText('无');
  table.colLabels[0].setText('0');
  for (let c = 0; c <= cap; c++) table.setCell(0, c, 0, C);

  const { fill, chosen, max } = knapModel(items, cap);
  C(1, () => hint.setText('① 填表：dp[r][c] = max(不含物品r, 含物品r)'), () => {});
  for (const e of fill) {
    table.highlightCell(e.r, e.c, C);
    table.setCell(e.r, e.c, dpVal(e.skip, e.take), C);
    C(1, () => {
      hint.setText('dp[' + e.r + '][' + e.c + ']：不含=' + e.skip + '，含(价值' + e.v + ')= ' + (e.take === -Infinity ? '容量不足' : e.take) + ' → ' + (e.useTake ? '含更优' : '不含更优'));
    }, () => {});
    fadeBack(e.r, e.c);
  }

  C(1, () => hint.setText('② 回溯：从 dp[' + n + '][' + cap + '] 倒推选取哪些物品'), () => {});
  let rr = n, cc = cap;
  while (rr > 0 && cc > 0) {
    if (knapAt(rr, cc) === knapAt(rr - 1, cc)) {
      table.highlightCell(rr, cc, C);
      C(1, () => hint.setText('dp[' + rr + '][' + cc + '] = dp[' + (rr - 1) + '][' + cc + ']，物品' + rr + ' 未选，上行'), () => {});
      rr--;
    } else {
      const idx = rr - 1;
      table.highlightCell(rr, cc, C);
      const bx = boxes[idx];
      const baseY = bx.mesh.position.y;
      C(500, (p) => { bx.mesh.position.y = baseY + 46 * Math.sin(p * Math.PI); bx.mesh.material.emissiveIntensity = 0.35 + 0.65 * p; }, () => { bx.mesh.position.y = baseY; bx.mesh.material.emissiveIntensity = 0.35; });
      C(1, () => hint.setText('物品' + (idx + 1) + ' 被选中（w=' + items[idx].w + '），容量左移 ' + items[idx].w + ' 继续'), () => {});
      cc -= items[idx].w;
      rr--;
    }
  }
  C(1, () => {
    status.textContent = '最大价值 ' + max + '：选取物品 [' + chosen.map((x) => x + 1).join(', ') + ']';
    hint.setText('完成：最大价值 ' + max + '，选取物品 ' + chosen.map((x) => x + 1).join('、'));
  }, () => {});

  function dpVal(skip, take) { return take === -Infinity ? skip : Math.max(skip, take); }
  function knapAt(r, c) { return table.cells[r][c].text; }
}

const itemInput = panel.addInput('物品(w/v)', run, 30);
itemInput.value = '2/3,3/4,4/5,5/6';
const capInput = panel.addInput('容量', run, 4);
capInput.value = '8';
panel.addButton('求解', run);
panel.addButton('清空', clearAll);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
