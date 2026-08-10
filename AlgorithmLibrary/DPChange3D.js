// AlgorithmLibrary/DPChange3D.js
// 找零钱四种模式：表（逐格填 dp）/记忆（按递归记忆顺序填充，保留高亮）/
// 递归（金额-币种递归树，深度限制）/贪婪（金额递减 + 选币脉冲，提示是否最优）。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Table3D } from '../3D/modes/Table3D.js';
import { VNode, VBox, VText, tubeBetween, easeInOut } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('DPChange3D');

const scene = new Scene3D('scene', { cameraPos: [0, 300, 780], fov: 62 });
const engine = new AnimationEngine({ speed: 1.5 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const status = panel.addStatus('');
const hint = new VText(scene, { text: '输入金额与币种，选择模式开始', x: 0, y: 270, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const aux = [];
let table = null;

function clearAll() {
  for (const o of aux) o.remove();
  aux.length = 0;
  if (table) {
    for (const row of table.cells) for (const b of row) if (b) b.remove();
    for (const l of table.rowLabels) l.remove();
    for (const l of table.colLabels) l.remove();
    table = null;
  }
}

// ---- 模型（与 /tmp/3dtest/2i_model.mjs 一致）----
function parseCoins(s) {
  const arr = s.split(/[,，\s]+/).map((v) => parseInt(v, 10)).filter((v) => v > 0);
  return [...new Set(arr)].sort((a, b) => a - b);
}
function changeModel(coins, amount, mode) {
  const R = coins.length;
  const dp = Array.from({ length: R + 1 }, () => Array(amount + 1).fill(Infinity));
  for (let r = 0; r <= R; r++) dp[r][0] = 0;
  const events = [];
  const memo = Array.from({ length: R + 1 }, () => Array(amount + 1).fill(false));
  const rec = (r, c) => {
    if (memo[r][c]) return dp[r][c];
    memo[r][c] = true;
    if (r === 0 || c === 0) return dp[r][c];
    const use = c >= coins[r - 1] ? rec(r, c - coins[r - 1]) + 1 : Infinity;
    const skip = rec(r - 1, c);
    dp[r][c] = Math.min(skip, use);
    events.push({ r, c, v: dp[r][c], use: use < skip });
    return dp[r][c];
  };
  if (mode === 'memo') {
    rec(R, amount);
  } else {
    for (let r = 1; r <= R; r++) for (let c = 1; c <= amount; c++) {
      const use = c >= coins[r - 1] ? dp[r][c - coins[r - 1]] + 1 : Infinity;
      const skip = dp[r - 1][c];
      dp[r][c] = Math.min(skip, use);
      events.push({ r, c, v: dp[r][c], use: use < skip });
    }
  }
  const sol = [];
  let r = R, c = amount;
  while (c > 0 && r > 0) {
    if (dp[r][c] === dp[r - 1][c]) r--;
    else { sol.push(coins[r - 1]); c -= coins[r - 1]; }
  }
  return { dp, events, sol, min: dp[R][amount] };
}
function greedyModel(coins, amount) {
  const sorted = [...coins].sort((a, b) => b - a);
  const steps = [];
  let rem = amount;
  for (const c of sorted) while (rem >= c) { steps.push(c); rem -= c; }
  return { steps, rem, count: steps.length };
}
function recModel(coins, amount, maxDepth) {
  const R = coins.length;
  const dp = changeModel(coins, amount, 'table').dp;
  const nodes = [], edges = [];
  const MAX = 90;
  const visit = (r, c, depth, parentId) => {
    if (nodes.length >= MAX) return;
    const id = nodes.length;
    nodes.push({ id, r, c, depth, parentId });
    if (parentId !== null) edges.push([parentId, id]);
    if (r === 0 || c === 0 || depth >= maxDepth) return;
    if (c >= coins[r - 1]) visit(r, c - coins[r - 1], depth + 1, id);
    visit(r - 1, c, depth + 1, id);
  };
  visit(R, amount, 0, null);
  const path = new Set();
  let r = R, c = amount;
  while (c > 0 && r > 0) {
    path.add(r + ',' + c);
    if (dp[r][c] === dp[r - 1][c]) r--;
    else c -= coins[r - 1];
  }
  return { nodes, edges, path, min: dp[R][amount] };
}

function layoutTree(nodes, edges) {
  const children = new Map();
  for (const e of edges) { if (!children.has(e[0])) children.set(e[0], []); children.get(e[0]).push(e[1]); }
  const xof = new Map();
  let leafCount = 0;
  const assign = (id) => {
    const ch = children.get(id) || [];
    if (ch.length === 0) { xof.set(id, leafCount++); return; }
    for (const cid of ch) assign(cid);
    xof.set(id, (xof.get(ch[0]) + xof.get(ch[ch.length - 1])) / 2);
  };
  assign(0);
  return nodes.map((n) => ({ ...n, x: (xof.get(n.id) - (leafCount - 1) / 2) * 76, y: 180 - n.depth * 64 }));
}

const fmt = (v) => (v === Infinity ? '∞' : String(v));

function fadeCellBack(r, c, delay) {
  const box = table.cells[r][c];
  const from = new THREE.Color(PALETTE.highlight), to = new THREE.Color(PALETTE.node);
  C(delay, (p) => {
    box.mesh.material.color.copy(from).lerp(to, p);
    box.mesh.material.emissive.setHex(PALETTE.nodeEmissive);
  }, () => { box.mesh.material.color.setHex(PALETTE.node); box.mesh.material.emissive.setHex(PALETTE.nodeEmissive); });
}

function runTable(mode) {
  engine.clear();
  clearAll();
  const amount = Math.min(Math.max(parseInt(amountInput.value, 10) || 26, 1), 30);
  const coins = parseCoins(coinInput.value);
  amountInput.value = String(amount); coinInput.value = coins.join(',');
  const rows = coins.length + 1, cols = amount + 1;
  table = new Table3D(scene, { rows, cols, cellW: 30, cellH: 38, startX: 0, startY: 85 });
  table.create();
  for (let r = 1; r < rows; r++) table.setRowLabel(r, coins[r - 1] + '币');
  table.colLabels[0].setText('0');
  for (let c = 0; c < cols; c++) table.setCell(0, c, c === 0 ? '0' : '∞', C);
  const res = changeModel(coins, amount, mode);
  const isMemo = mode === 'memo';
  C(1, () => hint.setText(isMemo ? '记忆化递归：按递归记忆顺序填充，已算格保留高亮' : '动态规划填表：用币 ' + coins[0] + ' 时 min(不含, 含)'), () => {});
  for (const e of res.events) {
    table.highlightCell(e.r, e.c, C);
    table.setCell(e.r, e.c, fmt(e.v), C);
    if (!isMemo) fadeCellBack(e.r, e.c, 300);
    if (e.use) C(1, () => hint.setText('dp[' + e.r + '][' + e.c + ']=' + e.v + '：含币 ' + coins[e.r - 1] + ' 更优'), () => {});
  }
  C(1, () => {
    status.textContent = amount + ' 最少需 ' + res.min + ' 枚硬币: ' + res.sol.join('+');
    hint.setText('完成：' + amount + ' = ' + res.sol.join('+') + '，共 ' + res.min + ' 枚');
  }, () => {});
}

function runGreedy() {
  engine.clear();
  clearAll();
  const amount = Math.min(Math.max(parseInt(amountInput.value, 10) || 26, 1), 30);
  const coins = parseCoins(coinInput.value);
  amountInput.value = String(amount); coinInput.value = coins.join(',');
  const { steps, count } = greedyModel(coins, amount);
  const opt = changeModel(coins, amount, 'table').min;
  const boxes = [];
  for (let i = 0; i < coins.length; i++) {
    const b = new VBox(scene, { w: 56, h: 56, d: 24, x: -250 + i * 72, y: 40, z: 0, label: String(coins[i]), color: PALETTE.blue, emissive: PALETTE.blueEmissive });
    boxes.push(b); aux.push(b);
  }
  const amtBox = new VBox(scene, { w: 76, h: 76, d: 30, x: 230, y: 60, z: 0, label: String(amount), color: PALETTE.orange, emissive: PALETTE.orangeEmissive });
  aux.push(amtBox);
  const formula = new VText(scene, { text: '', x: -230, y: -70, z: 0, color: PALETTE.text, scale: 0.8 });
  aux.push(formula);
  C(1, () => hint.setText('贪婪：每次取不超过剩余金额的最大币'), () => {});
  let rem = amount, used = [];
  for (const c of steps) {
    const i = coins.indexOf(c);
    C(500, (p) => { const s = 1 + 0.25 * Math.sin(p * Math.PI); boxes[i].mesh.scale.setScalar(s); }, () => boxes[i].mesh.scale.setScalar(1));
    rem -= c; used.push(c);
    C(1, () => { amtBox.setText(String(rem)); hint.setText('取币 ' + c + '，剩余 ' + rem); formula.setText(used.join('+')); }, () => {});
    C(260, () => {}, () => {});
  }
  C(1, () => {
    const optimal = count === opt;
    hint.setText('贪婪共 ' + count + ' 枚，' + (optimal ? '即最优方案' : '非最优（最优 ' + opt + ' 枚）'));
    status.textContent = amount + ' 贪婪需 ' + count + ' 枚: ' + steps.join('+') + (optimal ? '' : '（最优 ' + opt + ' 枚）');
  }, () => {});
}

function runRec() {
  engine.clear();
  clearAll();
  const amount = Math.min(Math.max(parseInt(amountInput.value, 10) || 26, 1), 30);
  const coins = parseCoins(coinInput.value);
  amountInput.value = String(amount); coinInput.value = coins.join(',');
  const { nodes, edges, path, min } = recModel(coins, amount, 12);
  const laid = layoutTree(nodes, edges);
  for (const e of edges) {
    const a = laid[e[0]], b = laid[e[1]];
    const t = tubeBetween(scene, new THREE.Vector3(a.x, a.y, 0), new THREE.Vector3(b.x, b.y, 0), { color: PALETTE.edge, opacity: 0.4, radius: 1.6 });
    aux.push({ remove: () => { scene.remove(t); t.geometry.dispose(); t.material.dispose(); } });
  }
  let lastDepth = -1;
  for (const n of laid) {
    const node = new VNode(scene, { label: 'f' + n.c + ',' + n.r, x: n.x, y: n.y, z: 0, radius: 15, color: PALETTE.blue, emissive: PALETTE.blueEmissive });
    node.mesh.scale.setScalar(0.01);
    aux.push(node);
    C(280, (p) => node.mesh.scale.setScalar(0.01 + 0.99 * easeInOut(p)), () => {});
    if (n.depth !== lastDepth) {
      lastDepth = n.depth;
      const branch = n.r > 0 && n.c > 0 ? '：用币 ' + coins[n.r - 1] + ' 或不用' : '（边界：' + (n.c === 0 ? '已凑齐' : '币已用尽') + '）';
      C(1, () => hint.setText('递归深度 ' + n.depth + '：f(' + n.c + ',' + n.r + ')' + branch), () => {});
    } else {
      C(1, () => hint.setText('展开 f(' + n.c + ',' + n.r + ')'), () => {});
    }
  }
  C(1, () => hint.setText('最优路径高亮'), () => {});
  for (const n of laid) {
    if (path.has(n.r + ',' + n.c)) {
      C(1, () => n.node.setColor(PALETTE.highlight, PALETTE.highlightEmissive), () => {});
    }
  }
  C(1, () => {
    status.textContent = amount + ' 最少需 ' + min + ' 枚硬币';
    hint.setText('递归树完成：f(' + amount + ',' + coins.length + ') = ' + min);
  }, () => {});
}

const amountInput = panel.addInput('金额', () => runTable('table'), 4);
amountInput.value = '26';
const coinInput = panel.addInput('币种(逗号分隔)', () => runTable('table'), 20);
coinInput.value = '1,5,10,25';
panel.addButton('更改表', () => runTable('table'));
panel.addButton('更改贪婪', runGreedy);
panel.addButton('更改递归', runRec);
panel.addButton('更改记忆', () => runTable('memo'));
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
