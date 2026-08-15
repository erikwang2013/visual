// AlgorithmLibrary/KM3D.js — Kuhn-Munkres（KM）：顶标 lx/ly + 相等子图 + 交替树 + delta 调整，O(n³) 最大权完美匹配（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('KM3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, ORANGE = 0xfb923c, CYAN = 0x22d3ee;
const status = panel.addStatus('就绪');

const WM = [[4, 2, 3], [3, 2, 2], [1, 3, 4]];
const N = 3;
const cellView = new Map();   // 'i-j' -> VBox
const lxView = new Map();     // i -> 左侧顶标标签
const lyView = new Map();     // j -> 顶部顶标标签
let lx = [], ly = [], matchR = [], matchL = [], slack = [];

function clearView() {
  cellView.forEach(c => scene.remove(c.box.mesh));
  lxView.forEach(t => scene.remove(t.sprite));
  lyView.forEach(t => scene.remove(t.sprite));
  cellView.clear(); lxView.clear(); lyView.clear();
}
function buildMatrix() {
  clearView();
  for (let i = 0; i < N; i++) {
    const lT = new VText(scene, { text: '', x: 115, y: (2 - i) * 90 + 360, z: 0, color: ORANGE, scale: 0.5 });
    lxView.set(i, lT);
  }
  for (let j = 0; j < N; j++) {
    const lT = new VText(scene, { text: '', x: (j - 1) * 90 + 320, y: 640, z: 0, color: ORANGE, scale: 0.5 });
    lyView.set(j, lT);
  }
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const box = new VBox(scene, { w: 78, h: 78, d: 16, x: (j - 1) * 90 + 320, y: (2 - i) * 90 + 360, z: 0, label: String(WM[i][j]), color: BLUE, emissive: BLUE });
      cellView.set(i + '-' + j, { box, w: WM[i][j] });
    }
  }
  refreshLabels();
}
function setCellColor(i, j, c) { const e = cellView.get(i + '-' + j); if (e) e.box.setColor(c, c); }
function refreshLabels() {
  for (let i = 0; i < N; i++) lxView.get(i).setText('lx=' + lx[i]);
  for (let j = 0; j < N; j++) lyView.get(j).setText('ly=' + ly[j]);
}
function resetCells() {
  cellView.forEach((e, key) => {
    const [i, j] = key.split('-').map(Number);
    setCellColor(i, j, matchR[j] === i ? GOLD : BLUE);
  });
}

function* kmDfs(u, visL, visR) {
  visL.add(u);
  yield S(() => { status.textContent = '交替树访问 L' + u + '（lx=' + lx[u] + '），扫描相等边 lx+ly==w'; });
  yield W(260);
  for (let v = 0; v < N; v++) {
    if (visR.has(v)) continue;
    const gap = lx[u] + ly[v] - WM[u][v];
    if (gap !== 0) { slack[v] = Math.min(slack[v], gap); continue; }
    visR.add(v);
    setCellColor(u, v, CYAN);
    yield S(() => { status.textContent = '相等边 L' + u + '-R' + v + '：' + lx[u] + '+' + ly[v] + '=' + WM[u][v] + (matchR[v] === -1 ? '，R 未匹配' : '，R 已配给 L' + matchR[v] + ' → 递归'); });
    yield W(300);
    if (matchR[v] === -1 || (yield* kmDfs(matchR[v], visL, visR))) {
      matchR[v] = u; matchL[u] = v;
      setCellColor(u, v, GOLD);
      yield S(() => { status.textContent = '匹配 L' + u + '-R' + v + '！'; });
      yield W(350);
      return true;
    }
    setCellColor(u, v, BLUE);
  }
  return false;
}

function* kmGen() {
  lx = WM.map(r => Math.max(...r));
  ly = Array(N).fill(0);
  matchR = Array(N).fill(-1); matchL = Array(N).fill(-1);
  buildMatrix();
  yield S(() => { status.textContent = 'KM：顶标 lx=行最大权、ly=0；只沿「相等子图」（lx[u]+ly[v]==w）增广，失败则调顶标让新边变相等'; });
  yield W(650);
  for (let u = 0; u < N; u++) {
    yield S(() => { status.textContent = '为 L' + u + ' 匹配（lx=' + lx[u] + '）'; });
    yield W(350);
    while (matchL[u] === -1) {
      const visL = new Set(), visR = new Set();
      slack = Array(N).fill(Infinity);
      const ok = yield* kmDfs(u, visL, visR);
      if (ok) break;
      let d = Infinity;
      for (let v = 0; v < N; v++) if (!visR.has(v)) d = Math.min(d, slack[v]);
      for (const a of visL) lx[a] -= d;
      for (const b of visR) ly[b] += d;
      refreshLabels();
      yield S(() => { status.textContent = '增广失败 → 顶标调整 delta=' + d + '：已访问行 lx-' + d + '，已访问列 ly+' + d + '，新增相等边'; });
      yield W(500);
      resetCells();
    }
    refreshLabels();
    yield S(() => { status.textContent = 'L' + u + ' 匹配 R' + matchL[u] + ' 完成'; });
    yield W(400);
  }
  const total = WM.reduce((s, r, i) => s + (matchL[i] >= 0 ? r[matchL[i]] : 0), 0);
  yield S(() => { status.textContent = '完美匹配：' + WM.map((r, i) => 'L' + i + '-R' + matchL[i]).join('、') + '，总权 ' + total; });
  yield W(550);
  yield S(() => { status.textContent = '演示完成：KM 最大权完美匹配，总权 ' + total + '，O(n³)'; });
  yield W(450);
  resetCells();
}

function* runKM() {
  yield S(() => { status.textContent = 'KM：顶标 + 相等子图交替增广'; });
  yield W(400);
  yield* kmGen();
}

buildMatrix();  // 初始化默认演示体：权矩阵 + 顶标
engine.queue(() => runKM());
panel.addButton('清空', () => { engine.clear(); lx = WM.map(r => Math.max(...r)); ly = Array(N).fill(0); matchR = Array(N).fill(-1); matchL = Array(N).fill(-1); buildMatrix(); status.textContent = ''; });

scene.start(engine);
