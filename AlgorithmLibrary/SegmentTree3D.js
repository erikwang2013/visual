// AlgorithmLibrary/SegmentTree3D.js — 线段树（区间和）：堆式存储自底向上建树 + 区间查询三类节点 + 点更新自叶到根重算（function* 生成器驱动）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
applyTheme('SegmentTree3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, WHITE = 0xffffff, GREEN = 0x4ade80, GOLD = 0xfcd34d, ROSE = 0xfb7185;
const status = panel.addStatus('就绪');

const ARR = [5, 3, 8, 1, 9, 4, 7, 2];
const N = ARR.length, TREE = 2 * N - 1;
const boxes = new Map();  // id -> VBox

const isLeaf = id => id >= N;
const ROOT_Y = 800, STEP_Y = 70;
function posOf(id) {
  const depth = Math.floor(Math.log2(id));
  const idxInRow = id - (1 << depth);
  const x = 320 + ((idxInRow + 0.5) / (1 << depth) - 0.5) * 560;
  return [x, ROOT_Y - depth * STEP_Y];
}
for (let id = 1; id <= TREE; id++) {
  const [x, y] = posOf(id);
  const leaf = isLeaf(id);
  const b = new VBox(scene, { w: leaf ? 52 : 44, h: leaf ? 52 : 44, d: 18, x, y, z: 0, label: leaf ? String(ARR[id - N]) : '', color: leaf ? BLUE : WHITE, emissive: leaf ? BLUE : WHITE });
  b.mesh.scale.setScalar(leaf ? 1 : 0.01);
  boxes.set(id, b);
}

const sumOf = id => parseInt(boxes.get(id).text, 10) || 0;
function setBoxText(id, txt) { boxes.get(id).setText(txt); }
const filled = id => isLeaf(id) || boxes.get(id).text !== '';
function flashBox(id) {
  boxes.get(id).setColor(GOLD, GOLD);
  boxes.get(id).mesh.scale.setScalar(1.25);
}
function unflashAll() {
  boxes.forEach((b, id) => {
    b.setColor(isLeaf(id) ? BLUE : WHITE, isLeaf(id) ? BLUE : WHITE);
    b.mesh.scale.setScalar(filled(id) ? 1 : 0.01);
  });
}
function clearView() {
  boxes.forEach((b, id) => {
    const leaf = isLeaf(id);
    b.setText(leaf ? String(ARR[id - N]) : '');
    b.setColor(leaf ? BLUE : WHITE, leaf ? BLUE : WHITE);
    b.mesh.scale.setScalar(leaf ? 1 : 0.01);
  });
}

function* pulseSum(id, v) {
  const b = boxes.get(id);
  const baseY = b.mesh.position.y;
  const s0 = b.mesh.scale.x;
  yield A(340, p => {
    b.mesh.scale.setScalar(s0 + (1 - s0) * (p * p * (3 - 2 * p)));
    b.mesh.position.y = baseY + 22 * Math.sin(p * Math.PI);
    b.mesh.material.color.setHex(GREEN);
    if (p === 1) setBoxText(id, String(v));
  });
  b.mesh.position.y = baseY;
  b.mesh.material.color.setHex(isLeaf(id) ? BLUE : WHITE);
}

function* buildGen() {
  yield S(() => { status.textContent = '线段树（区间和）：' + N + ' 个叶子按 2 的幂分层存放数组值，内部节点存区间和 —— 自底向上合并建树'; });
  yield W(600);
  for (let d = 2; d >= 0; d--) {
    yield S(() => { status.textContent = '第 ' + (3 - d) + ' 层合并：子节点和上浮填入父节点'; });
    yield W(400);
    for (let id = 1 << d; id < 1 << (d + 1); id++) {
      const lc = id * 2, rc = id * 2 + 1;
      if (rc > TREE) continue;
      flashBox(lc); flashBox(rc);
      yield S(() => { status.textContent = '节点 ' + id + ' = 左 ' + sumOf(lc) + ' + 右 ' + sumOf(rc) + '（金色 = 两个孩子）'; });
      yield W(300);
      yield* pulseSum(id, sumOf(lc) + sumOf(rc));
      unflashAll();
      yield W(160);
    }
  }
  yield S(() => { status.textContent = '建树完成：根 = 总和 ' + sumOf(1) + '（' + N + ' 叶 + ' + (N - 1) + ' 内，O(n)）'; });
  yield W(500);
}

function* queryNodeGen(id, lo, hi, ql, qr, acc) {
  if (ql > hi || qr < lo) {
    yield S(() => { status.textContent = '节点 ' + id + ' [' + lo + ',' + hi + '] 与 [' + ql + ',' + qr + '] 不相交 → 剪枝'; });
    yield W(380);
    return;
  }
  if (ql <= lo && hi <= qr) {
    flashBox(id);
    yield S(() => { status.textContent = '节点 ' + id + ' [' + lo + ',' + hi + '] 完全覆盖 → 直接取和 ' + sumOf(id) + '（金色）'; });
    yield W(500);
    acc(sumOf(id));
    yield W(200);
    unflashAll();
    return;
  }
  flashBox(id);
  yield S(() => { status.textContent = '节点 ' + id + ' [' + lo + ',' + hi + '] 部分覆盖 → 下钻左右孩子'; });
  yield W(450);
  const mid = (lo + hi) >> 1;
  yield* queryNodeGen(id * 2, lo, mid, ql, qr, acc);
  yield* queryNodeGen(id * 2 + 1, mid + 1, hi, ql, qr, acc);
  unflashAll();
}
function* queryGen(l, r) {
  let total = 0;
  yield S(() => { status.textContent = '区间查询 [' + l + ',' + r + ']：从根递归，三类节点判定 —— 完全覆盖取和 / 部分覆盖下钻 / 不相交剪枝'; });
  yield W(450);
  yield* queryNodeGen(1, 0, N - 1, l, r, v => { total += v; });
  yield S(() => { status.textContent = '区间 [' + l + ',' + r + '] 的和 = ' + total; });
  yield W(600);
}

function* updateGen(idx, val) {
  const old = sumOf(N + idx);
  const leaf = boxes.get(N + idx);
  flashBox(N + idx);
  leaf.setColor(ROSE, ROSE);
  yield S(() => { status.textContent = '点更新：arr[' + idx + '] = ' + old + ' → ' + val + '（红 = 更新叶）'; });
  yield W(450);
  setBoxText(N + idx, String(val));
  yield W(200);
  for (let id = (N + idx) >> 1; id >= 1; id >>= 1) {
    const v = sumOf(id * 2) + sumOf(id * 2 + 1);
    yield S(() => { status.textContent = '重算节点 ' + id + ' = 左 ' + sumOf(id * 2) + ' + 右 ' + sumOf(id * 2 + 1) + ' = ' + v; });
    yield W(350);
    yield* pulseSum(id, v);
    yield W(150);
  }
  unflashAll();
  yield S(() => { status.textContent = '更新完成：arr[' + idx + '] = ' + val + '，祖先链全部重算，根 = ' + sumOf(1); });
  yield W(500);
}

function* runSegTree() {
  clearView();
  yield W(300);
  yield* buildGen();
  yield* queryGen(2, 5);
  yield* updateGen(3, 9);
  yield* queryGen(0, N - 1);
  yield S(() => { status.textContent = '线段树演示完成：查询/更新 O(log n)、空间 2n —— 查询 [2,5]=22，arr[3] 1→9 后根=47，全区间查询=47'; });
  yield W(800);
}

engine.queue(() => runSegTree());
panel.addButton('清空', () => { engine.clear(); clearView(); status.textContent = ''; });

scene.start(engine);
