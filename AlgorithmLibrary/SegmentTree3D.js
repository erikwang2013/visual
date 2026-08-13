// AlgorithmLibrary/SegmentTree3D.js — 线段树（区间和）：堆式存储自底向上建树 + 区间查询三类节点 + 点更新自叶到根重算（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('SegmentTree3D');

const scene = new Scene3D('scene', { cameraPos: [320, 500, 900], lookAt: [320, 500, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, WHITE = 0xffffff, GREEN = 0x4ade80, GOLD = 0xfcd34d;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：建树 → 区间查询 → 点更新', x: 700, y: 560, z: 0, color: PALETTE.textGlow, scale: 0.7, wrapChars: 7 });
const status = panel.addStatus('就绪');
const outT = new VText(scene, { text: '', x: 0, y: 250, z: 0, color: PALETTE.textGlow, scale: 0.62 });

const ARR = [5, 3, 8, 1, 9, 4, 7, 2];
const N = ARR.length, TREE = 2 * N - 1;
const boxes = new Map();  // id -> VBox

const isLeaf = id => id >= N;
function posOf(id) {
  const depth = Math.floor(Math.log2(id));
  const idxInRow = id - (1 << depth);
  const x = ((idxInRow + 0.5) / (1 << depth) - 0.5) * 560;
  return [x, 515 - depth * 70];
}
function sumOf(id) {
  const t = boxes.get(id).text;
  return parseInt(t, 10) || 0;
}
function setBoxText(id, txt) { boxes.get(id).setText(txt); }
function flashBox(id) {
  boxes.get(id).setColor(GOLD, GOLD);
  boxes.get(id).mesh.scale.setScalar(1.25);
}
function unflashAll() {
  boxes.forEach((b, id) => {
    b.setColor(isLeaf(id) ? BLUE : WHITE, isLeaf(id) ? BLUE : WHITE);
    b.mesh.scale.setScalar(1);
  });
}

function* buildGen() {
  yield S(() => outT.setText('建树：8 个叶子节点按 2 的幂分层放置'));
  const todo = [];
  for (let id = 1; id <= TREE; id++) {
    const [x, y] = posOf(id);
    const b = new VBox(scene, { w: isLeaf(id) ? 52 : 44, h: isLeaf(id) ? 52 : 44, d: 18, x, y, z: 0, label: isLeaf(id) ? String(ARR[id - N]) : '', color: isLeaf(id) ? BLUE : WHITE, emissive: isLeaf(id) ? BLUE : WHITE });
    b.mesh.scale.setScalar(0.01);
    boxes.set(id, b);
    todo.push({ b, to: new THREE.Vector3(x, y, 0) });
  }
  yield A(420, p => todo.forEach(t => t.b.mesh.scale.setScalar(0.01 + 0.99 * p)));
  yield W(250);
  // 自底向上合并（depth 2 → 0）
  for (let d = 2; d >= 0; d--) {
    yield S(() => outT.setText('第 ' + (3 - d) + ' 层合并：子节点和上浮填入父节点'));
    for (let id = 1 << d; id < 1 << (d + 1); id++) {
      const lc = id * 2, rc = id * 2 + 1;
      if (rc > TREE) continue;
      flashBox(lc); flashBox(rc);
      yield W(260);
      const v = sumOf(lc) + sumOf(rc);
      yield* pulseSum(id, v);
      unflashAll();
      yield W(180);
    }
  }
  yield S(() => {
    outT.setText('建树完成：根 = 数组总和 ' + sumOf(1));
    status.textContent = '线段树构建完成：' + N + ' 个叶子 + ' + (N - 1) + ' 个内部节点';
  });
  yield W(400);
}
function* pulseSum(id, v) {
  const b = boxes.get(id);
  const baseY = b.mesh.position.y;
  yield A(320, p => {
    b.mesh.position.y = baseY + 26 * Math.sin(p * Math.PI);
    b.mesh.material.color.setHex(GREEN);
    if (p === 1) setBoxText(id, String(v));
  });
  b.mesh.position.y = baseY;
  b.mesh.material.color.setHex(isLeaf(id) ? BLUE : WHITE);
}

// ---- 区间查询：完全覆盖取和 / 部分覆盖下钻 / 不相交剪枝 ----
function* queryNodeGen(id, lo, hi, ql, qr, acc) {
  if (ql > hi || qr < lo) {
    yield S(() => outT.setText('节点 ' + id + ' [' + lo + ',' + hi + '] 与 [' + ql + ',' + qr + '] 不相交 → 剪枝'));
    yield W(380);
    return;
  }
  if (ql <= lo && hi <= qr) {
    flashBox(id);
    const v = sumOf(id);
    yield S(() => outT.setText('节点 ' + id + ' [' + lo + ',' + hi + '] 完全覆盖 → 直接取和 ' + v + '（金色高亮）'));
    yield W(500);
    acc(v);
    yield W(200);
    unflashAll();
    return;
  }
  flashBox(id);
  yield S(() => outT.setText('节点 ' + id + ' [' + lo + ',' + hi + '] 部分覆盖 → 下钻左右孩子'));
  yield W(450);
  const mid = (lo + hi) >> 1;
  yield* queryNodeGen(id * 2, lo, mid, ql, qr, acc);
  yield* queryNodeGen(id * 2 + 1, mid + 1, hi, ql, qr, acc);
  unflashAll();
}
function* queryGen(l, r) {
  let total = 0;
  yield S(() => outT.setText('区间查询 [' + l + ',' + r + ']：自根递归，三类节点判定'));
  yield W(450);
  yield* queryNodeGen(1, 0, N - 1, l, r, v => { total += v; });
  yield S(() => {
    outT.setText('区间 [' + l + ',' + r + '] 的和 = ' + total + '（完全覆盖节点直接求和）');
    status.textContent = '区间查询 [' + l + ',' + r + '] = ' + total;
  });
  yield W(600);
}

// ---- 点更新：叶子改写 → 自叶到根重算 ----
function* updateGen(idx, val) {
  const old = sumOf(N + idx);
  yield S(() => outT.setText('点更新：arr[' + idx + '] ' + old + ' → ' + val + '（红色叶闪）'));
  flashBox(N + idx);
  boxes.get(N + idx).setColor(0xfb7185, 0xfb7185);
  yield W(450);
  setBoxText(N + idx, String(val));
  yield W(200);
  for (let id = (N + idx) >> 1; id >= 1; id >>= 1) {
    const v = sumOf(id * 2) + sumOf(id * 2 + 1);
    yield* pulseSum(id, v);
    yield S(() => outT.setText('重算节点 ' + id + ' = 左 ' + sumOf(id * 2) + ' + 右 ' + sumOf(id * 2 + 1) + ' = ' + v));
    yield W(380);
  }
  unflashAll();
  yield S(() => {
    outT.setText('更新完成：根节点变为 ' + sumOf(1));
    status.textContent = 'arr[' + idx + '] = ' + val + ' 已更新，祖先全部重算';
  });
  yield W(500);
}

function* runSegTree() {
  boxes.forEach(b => scene.remove(b.mesh));
  boxes.clear();
  hint.setText('线段树（区间和）：叶子存数组值，内部节点存区间和');
  yield W(300);
  yield* buildGen();
  yield* queryGen(2, 5);
  yield* updateGen(3, 9);
  yield* queryGen(0, N - 1);
  yield S(() => {
    outT.setText('');
    hint.setText('线段树完成：查询/更新 O(log n)，空间 2n，完全覆盖节点直接取和');
    status.textContent = '线段树演示完成：建树 15 节点，查询 [2,5]=22，更新 arr[3]=9 后根=47，全区间查询 = 47';
  });
}

engine.queue(() => runSegTree());
panel.addButton('清空', () => { engine.clear(); boxes.forEach(b => scene.remove(b.mesh)); boxes.clear(); hint.setText('已清空，可重新运行'); status.textContent = ''; outT.setText(''); });
panel.addLabel('（拖拽旋转视角，滚轮缩放；金 = 完全覆盖/访问，绿 = 合并上浮，红 = 更新点）');

scene.start(engine);
