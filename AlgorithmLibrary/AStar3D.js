// AlgorithmLibrary/AStar3D.js — A* 寻路：网格 f=g+h 标签 + open/closed 双色扩展 + 启发式说明 + 路径回溯（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
applyTheme('AStar3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const COLS = 6, ROWS = 5, GAP = 92, SIZE = 74;
const START = [0, 0], END = [4, 5];
const OBS = [[1, 1], [2, 1], [3, 1], [1, 3], [2, 3], [3, 3]];
const skey = START[0] + ',' + START[1], ekey = END[0] + ',' + END[1];
const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, SLATE = 0x475569;
const status = panel.addStatus('就绪');

const cells = new Map();  // 'r,c' -> { mesh, fT, ghT }
const g = {}, h = {}, f = {}, par = {};
const obsSet = new Set(OBS.map(([r, c]) => r + ',' + c));

function cellPos(r, c) {
  return new THREE.Vector3((c - (COLS - 1) / 2) * GAP + 320, (ROWS - 1) / 2 * GAP - r * GAP + 560, 0);
}
function clearView() {
  cells.forEach(o => { scene.remove(o.mesh); scene.remove(o.fT.sprite); scene.remove(o.ghT.sprite); });
  cells.clear();
}
function buildGrid() {
  clearView();
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const key = r + ',' + c;
    const obs = obsSet.has(key);
    const p = cellPos(r, c);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(SIZE, SIZE, 24), new THREE.MeshBasicMaterial({ color: obs ? SLATE : BLUE }));
    mesh.position.copy(p);
    scene.add(mesh);
    const fT = new VText(scene, { text: '', x: p.x, y: p.y + 52, z: 0, color: GOLD, scale: 0.55 });
    const ghT = new VText(scene, { text: '', x: p.x, y: p.y + 28, z: 0, color: '#94a3b8', scale: 0.45 });
    cells.set(key, { mesh, fT, ghT });
  }
}
function setCell(key, c) { cells.get(key).mesh.material.color.setHex(c); }
function setLabel(key, fv, gh) { cells.get(key).fT.setText(fv); cells.get(key).ghT.setText(gh); }
function* pulseCell(key) {
  const o = cells.get(key);
  yield A(300, p => { o.mesh.scale.setScalar(0.9 + 0.25 * Math.sin(p * Math.PI)); });
  o.mesh.scale.setScalar(1);
}

function* astarGen() {
  const open = new Map();  // key -> f 值
  const closed = new Set();
  const heu = (r, c) => Math.abs(r - END[0]) + Math.abs(c - END[1]);
  open.set(skey, heu(START[0], START[1]));
  g[skey] = 0; h[skey] = heu(START[0], START[1]); f[skey] = h[skey];
  setCell(skey, GREEN);
  setLabel(skey, 'f=' + f[skey], 'g=0 h=' + h[skey]);
  yield S(() => { status.textContent = '启发式 h = 曼哈顿距离 |Δr|+|Δc|（到终点）。S 入 open 表'; });
  yield W(600);
  let steps = 0;
  while (open.size && steps++ < 100) {
    let cur = null, best = Infinity;
    for (const [k, v] of open) if (v < best) { best = v; cur = k; }
    open.delete(cur);
    const [r, c] = cur.split(',').map(Number);
    setCell(cur, GOLD);
    yield S(() => { status.textContent = '从 open 取 f 最小格 (' + r + ',' + c + ')：f=' + f[cur] + ' = g' + g[cur] + ' + h' + h[cur]; });
    yield* pulseCell(cur);
    yield W(420);
    if (cur === ekey) {
      setCell(cur, GREEN);
      yield S(() => { status.textContent = '到达终点！开始回溯路径'; });
      yield W(450);
      break;
    }
    closed.add(cur);
    setCell(cur, BLUE);
    for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nr = r + dr, nc = c + dc;
      const nk = nr + ',' + nc;
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || obsSet.has(nk) || closed.has(nk)) continue;
      const ng = g[cur] + 1;
      const better = !(nk in g) || ng < g[nk];
      if (better) {
        g[nk] = ng; h[nk] = heu(nr, nc); f[nk] = ng + h[nk]; par[nk] = cur;
        setLabel(nk, 'f=' + f[nk], 'g=' + ng + ' h=' + h[nk]);
        if (!open.has(nk)) { open.set(nk, f[nk]); setCell(nk, ORANGE); }
        yield S(() => { status.textContent = '扩展邻居 (' + nr + ',' + nc + ')：g=' + ng + '，f=' + f[nk] + '（f = g + h，启发式引导优先向右下）'; });
        yield* pulseCell(nk);
        yield W(300);
      }
    }
  }
  // 回溯
  const path = [];
  let k = ekey;
  while (k !== undefined) { path.unshift(k); k = par[k]; }
  if (path[0] !== skey) { yield S(() => { status.textContent = '无路径可达终点'; }); yield W(400); }
  else {
    for (const kk of path) { setCell(kk, GREEN); yield W(160); }
    yield S(() => { status.textContent = '最短路径（步数 ' + (path.length - 1) + '）：' + path.map(p => '(' + p.split(',')[0] + ',' + p.split(',')[1] + ')').join(' → '); });
    yield W(600);
  }
  yield S(() => { status.textContent = 'A* 演示完成：S(0,0) → E(4,5) 最短路径 ' + (path[0] === skey ? path.length - 1 : '—') + ' 步，h 可采纳则最优'; });
  yield W(400);
}

function* runAStar() {
  buildGrid();
  setCell(ekey, RED);
  yield W(400);
  yield* astarGen();
}

buildGrid();
setCell(ekey, RED);
engine.queue(() => runAStar());
panel.addButton('清空', () => { engine.clear(); buildGrid(); setCell(ekey, RED); status.textContent = ''; });

scene.start(engine);
