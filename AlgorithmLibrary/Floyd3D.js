// AlgorithmLibrary/Floyd3D.js
// Floyd-Warshall 全源最短路径：5x5 距离矩阵（∞ 表示不可达），
// 每轮 k 高亮第 k 行/列，发生更新的单元闪亮并写入新值，全部完成后展示最终矩阵。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Table3D } from '../3D/modes/Table3D.js';
import { VText } from '../3D/VisualObject3D.js';
import { PALETTE } from '../3D/Glow.js';

const scene = new Scene3D('scene', { cameraPos: [0, 300, 620], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const N = 5;
const table = new Table3D(scene, { rows: N, cols: N, cellW: 76, cellH: 50, startX: 0, startY: 130 });
table.create();
for (let r = 0; r < N; r++) table.setRowLabel(r, String(r));

// ---- 模型（与 /tmp/3dtest/graphmodel.mjs 一致）----
function floydModel(w, n) {
  const d = Array.from({ length: n }, () => Array(n).fill(Infinity));
  for (let i = 0; i < n; i++) d[i][i] = 0;
  for (const key in w) {
    const [a, b] = key.split('->').map(Number);
    d[a][b] = Math.min(d[a][b], w[key]);
  }
  const updates = [];
  for (let k = 0; k < n; k++)
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++)
        if (d[i][k] + d[k][j] < d[i][j]) {
          updates.push({ k, i, j, old: d[i][j], val: d[i][k] + d[k][j] });
          d[i][j] = d[i][k] + d[k][j];
        }
  return { d, updates };
}

const fw = { '0->1': 3, '0->2': 8, '1->2': 4, '1->3': 1, '2->3': 2, '2->4': 7, '3->4': 3, '4->2': 1 };
const fmt = (v) => (v === Infinity ? '∞' : String(v));

const status = panel.addStatus('');
const hint = new VText(scene, { text: '点击「运行Floyd-Warshall」开始', x: 0, y: 240, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const roundTexts = [];

// 更新单元闪光后熄灭：直接改材质颜色，不经过 unhighlightCell（避免在命令 fn 内再入队）
function fadeCellBack(r, c, delay) {
  const box = table.cells[r][c];
  if (!box) return;
  const from = new THREE.Color(PALETTE.highlight);
  const to = new THREE.Color(PALETTE.node);
  C(delay, (p) => {
    box.mesh.material.color.copy(from).lerp(to, p);
    box.mesh.material.emissive.setHex(PALETTE.nodeEmissive);
  }, () => { box.mesh.material.color.setHex(PALETTE.node); box.mesh.material.emissive.setHex(PALETTE.nodeEmissive); });
}

function runFloyd() {
  engine.clear();
  roundTexts.forEach((vt) => vt.remove());
  roundTexts.length = 0;

  // 初始矩阵
  const init = Array.from({ length: N }, () => Array(N).fill(Infinity));
  for (let i = 0; i < N; i++) init[i][i] = 0;
  for (const key in fw) {
    const [a, b] = key.split('->').map(Number);
    init[a][b] = Math.min(init[a][b], fw[key]);
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { table.unhighlightCell(i, j, C); table.setCell(i, j, fmt(init[i][j]), C); }

  const { d, updates } = floydModel(fw, N);
  const updatesByK = Array.from({ length: N }, () => []);
  for (const u of updates) updatesByK[u.k].push(u);
  C(1, () => hint.setText('初始矩阵（∞ 表示不可达）'), () => {});

  // 预展开为扁平命令序列：命令 fn 会在动画期间每帧被调用，
  // 若在 fn 内再入队命令会指数膨胀，必须一次性入队。
  for (let k = 0; k < N; k++) {
    const vt = new VText(scene, { text: '第 ' + k + ' 轮：经过节点 ' + k, x: 0, y: 230 - k * 22, z: 0, color: PALETTE.textGlow, scale: 0.75 });
    vt.sprite.scale.set(0.1, 0.05, 1);
    C(250, (p) => { const s = 0.01 + p * 0.99; vt.sprite.scale.set(75 * s, 37 * s, 1); }, () => vt.sprite.scale.set(0.1, 0.05, 1));
    roundTexts.push(vt);
    C(1, () => hint.setText('第 ' + k + ' 轮：经过节点 ' + k + '，高亮第 ' + k + ' 行与列'), () => {});
    for (let i = 0; i < N; i++) { table.highlightCell(k, i, C); table.highlightCell(i, k, C); }
    const us = updatesByK[k];
    for (const u of us) {
      table.highlightCell(u.i, u.j, C);
      table.setCell(u.i, u.j, fmt(u.val), C);
      C(1, () => hint.setText('d[' + u.i + '][' + u.j + ']: ' + fmt(u.old) + ' → ' + u.val + '（经节点 ' + k + '）'), () => {});
      fadeCellBack(u.i, u.j, 350);
    }
    for (let i = 0; i < N; i++) { table.unhighlightCell(k, i, C); table.unhighlightCell(i, k, C); }
    C(1, () => hint.setText('第 ' + k + ' 轮完成，' + us.length + ' 个单元更新'), () => {});
    C(300, () => {}, () => {});
  }
  C(1, () => {
    const lines = d.map((row) => row.map(fmt).join(' ')).join(' | ');
    status.textContent = '最终距离矩阵: ' + lines;
    hint.setText('Floyd-Warshall 完成，最短路径矩阵已就绪');
  }, () => {});
}

panel.addButton('运行Floyd-Warshall', runFloyd);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
