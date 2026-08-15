// AlgorithmLibrary/Floyd3D.js — Floyd-Warshall 全源最短路径：5×5 距离矩阵逐 k 中转轮更新 + 行/列高亮（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
applyTheme('Floyd3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, WHITE = 0xffffff, SLATE = 0x475569;
const status = panel.addStatus('就绪');

const N = 5;
const INF = Infinity;
// 初始邻接矩阵（有向）
const W0 = [
  [0, 3, 8, INF, -4],
  [INF, 0, INF, 1, 7],
  [INF, 4, 0, INF, INF],
  [2, INF, -5, 0, INF],
  [INF, INF, INF, 6, 0],
];
const cells = new Map();  // 'r,c' -> { mesh, lbl, v }
const rowLbl = [], colLbl = [];
let D = [];
function cellPos(r, c) { return new THREE.Vector3((c - (N - 1) / 2) * 108 + 320, 700 - r * 88, 0); }
function fmt(v) { return v === INF ? '∞' : String(v); }
function clearView() {
  cells.forEach(o => { scene.remove(o.mesh); scene.remove(o.lbl.sprite); });
  rowLbl.forEach(t => scene.remove(t.sprite));
  colLbl.forEach(t => scene.remove(t.sprite));
  cells.clear(); rowLbl.length = 0; colLbl.length = 0;
}
function buildMatrix() {
  clearView();
  for (let r = 0; r < N; r++) {
    rowLbl.push(new VText(scene, { text: '行' + r, x: 606, y: cellPos(r, 0).y, z: 0, color: '#cbd5e1', scale: 0.55 }));
    colLbl.push(new VText(scene, { text: '列' + r, x: cellPos(0, r).x, y: 745, z: 0, color: '#cbd5e1', scale: 0.55 }));
    for (let c = 0; c < N; c++) {
      const p = cellPos(r, c);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(70, 52, 22), new THREE.MeshBasicMaterial({ color: WHITE }));
      mesh.position.copy(p);
      mesh.scale.setScalar(1);
      scene.add(mesh);
      const lbl = new VText(scene, { text: fmt(D[r][c]), x: p.x, y: p.y, z: 12, color: '#ffffff', scale: 0.55 });
      cells.set(r + ',' + c, { mesh, lbl });
    }
  }
}
function setCellColor(r, c, col) { cells.get(r + ',' + c).mesh.material.color.setHex(col); }
function setCellText(r, c) { cells.get(r + ',' + c).lbl.setText(fmt(D[r][c])); }
function resetMatrixColors() {
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) setCellColor(r, c, r === c ? SLATE : WHITE);
}
function* pulseCell(r, c, col) {
  const o = cells.get(r + ',' + c);
  setCellColor(r, c, col);
  yield A(300, p => { o.mesh.scale.setScalar(0.9 + 0.3 * Math.sin(p * Math.PI)); });
  o.mesh.scale.setScalar(1);
}

function* floydGen() {
  D = W0.map(row => row.slice());
  buildMatrix();
  yield S(() => { status.textContent = 'Floyd 动态规划：初始矩阵 D = 邻接矩阵（对角 0，无直达边为 ∞）'; });
  yield W(600);
  for (let k = 0; k < N; k++) {
    yield S(() => { status.textContent = '——— 第 ' + k + ' 轮：中转点 k=' + k + '，D[i][j] = min(D[i][j], D[i][k] + D[k][j]) ———'; });
    for (let c = 0; c < N; c++) setCellColor(k, c, GOLD);
    for (let r = 0; r < N; r++) setCellColor(r, k, GOLD);
    yield W(500);
    for (let i = 0; i < N; i++) {
      if (i === k || D[i][k] === INF) continue;
      for (let j = 0; j < N; j++) {
        if (j === k || D[k][j] === INF) continue;
        const via = D[i][k] + D[k][j];
        if (via < D[i][j]) {
          setCellColor(i, j, ORANGE);
          setCellColor(i, k, RED);
          setCellColor(k, j, RED);
          yield S(() => { status.textContent = 'D[' + i + '][' + j + '] ' + fmt(D[i][j]) + ' → ' + via + '（' + i + '→' + k + '→' + j + '）'; });
          D[i][j] = via;
          setCellText(i, j);
          yield* pulseCell(i, j, GREEN);
          yield W(330);
          setCellColor(i, k, GOLD);
          setCellColor(k, j, GOLD);
        }
      }
    }
    resetMatrixColors();
    yield S(() => { status.textContent = '第 ' + k + ' 轮完成：以 ' + k + ' 为中转的动态规划更新结束'; });
    yield W(350);
  }
  yield S(() => { status.textContent = '最终矩阵：5×5 全源最短路径'; });
  yield W(500);
  for (let i = 0; i < N; i++) {
    const row = D[i].map(fmt).join('  ');
    yield S(() => { status.textContent = '第 ' + i + ' 行最终：' + row; });
    yield W(450);
  }
  yield S(() => {
    status.textContent = '演示完成：Floyd 全源最短路径（支持负权、无负环），复杂度 O(V³)。D[0][3]=' + D[0][3] + '，D[3][2]=' + D[3][2];
  });
  yield W(400);
}

function* runFloyd() {
  clearView();
  yield W(300);
  yield* floydGen();
}

D = W0.map(row => row.slice());
buildMatrix();  // 初始化默认演示体：邻接矩阵，点播放才动画
engine.queue(() => runFloyd());
panel.addButton('清空', () => { engine.clear(); D = W0.map(row => row.slice()); buildMatrix(); resetMatrixColors(); status.textContent = ''; });

scene.start(engine);
