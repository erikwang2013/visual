// AlgorithmLibrary/DisjointSets3D.js — 并查集：8 元素森林 + 父指针/秩表；查找沿父链高亮 + 路径压缩；联合按秩合并（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText, VNode } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('DisjointSets3D');

const scene = new Scene3D('scene', { cameraPos: [320, 500, 900], lookAt: [320, 500, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, ORANGE = 0xfb923c, GREEN = 0x4ade80, RED = 0xfb7185, WHITE = 0xffffff;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：并查集按秩合并 + 路径压缩', x: 700, y: 560, z: 0, color: PALETTE.textGlow, scale: 0.7, wrapChars: 7 });
const status = panel.addStatus('就绪');
const outT = new VText(scene, { text: '', x: 700, y: 420, z: 0, color: PALETTE.textGlow, scale: 0.55, wrapChars: 8 });

const N = 8;
let parent = Array.from({ length: N }, (_, i) => i);
let size = Array(N).fill(1);

// ---- 纯模型 ----
function findRoot(x) {
  const chain = [x];
  while (parent[chain[chain.length - 1]] !== chain[chain.length - 1]) chain.push(parent[chain[chain.length - 1]]);
  return chain;
}

// ---- 布局：根固定两行，孩子相对父均分下沉 ----
function layout() {
  const pos = {};
  for (let i = 0; i < N; i++) {
    const r = i < 4 ? 0 : 1;
    pos[i] = parent[i] === i ? { x: 225 + (i % 4) * 150, y: r === 0 ? 430 : 320, z: 0 } : null;
  }
  let moved = true;
  while (moved) {
    moved = false;
    for (let i = 0; i < N; i++) {
      if (pos[i]) continue;
      const p = parent[i];
      if (pos[p]) {
        const sibs = [];
        for (let j = 0; j < N; j++) if (parent[j] === p) sibs.push(j);
        pos[i] = { x: pos[p].x + (sibs.indexOf(i) - (sibs.length - 1) / 2) * 62, y: pos[p].y - 80, z: 0 };
        moved = true;
      }
    }
  }
  return pos;
}

// ---- 视觉：节点 + 边 + 父/秩表 ----
const nodeView = new Map();  // i -> VNode
const edgeView = new Map();  // i -> tube（父边）
const tblRow0 = [];  // 父
const tblRow1 = [];  // 秩
const rowLbl = [];
function colX(i) { return 95 + (i % 4) * 150; }
function clearView() {
  nodeView.forEach(v => scene.remove(v.mesh));
  edgeView.forEach(m => { scene.remove(m); m.geometry.dispose(); m.material.dispose(); });
  tblRow0.forEach(t => scene.remove(t.sprite));
  tblRow1.forEach(t => scene.remove(t.sprite));
  rowLbl.forEach(t => scene.remove(t.sprite));
  nodeView.clear(); edgeView.clear(); tblRow0.length = 0; tblRow1.length = 0; rowLbl.length = 0;
}
function buildStatic() {
  const pos = layout();
  for (let i = 0; i < N; i++) {
    const p = pos[i];
    const vn = new VNode(scene, { radius: 18, x: p.x, y: p.y, z: p.z, label: String(i), color: BLUE, emissive: BLUE });
    nodeView.set(i, vn);
  }
  rowLbl.push(new VText(scene, { text: '父', x: 10, y: 215, z: 0, color: PALETTE.textDim, scale: 0.6 }));
  rowLbl.push(new VText(scene, { text: '秩', x: 10, y: 170, z: 0, color: PALETTE.textDim, scale: 0.6 }));
  for (let i = 0; i < N; i++) {
    tblRow0.push(new VText(scene, { text: String(parent[i]), x: colX(i), y: 215, z: 0, color: '#ffffff', scale: 0.62 }));
    tblRow1.push(new VText(scene, { text: String(size[i]), x: colX(i), y: 170, z: 0, color: '#ffffff', scale: 0.62 }));
  }
  syncEdges();
}
function tube(a, b) {
  const A = a.clone(), B = b.clone();
  const mid = new THREE.Vector3((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2 + 18);
  const curve = new THREE.CatmullRomCurve3([A, mid, B]);
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, 2, 6), new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, opacity: 0.7 }));
  scene.add(m);
  return m;
}
function syncEdges() {
  edgeView.forEach(m => { scene.remove(m); m.geometry.dispose(); m.material.dispose(); });
  edgeView.clear();
  for (let i = 0; i < N; i++) {
    if (parent[i] !== i) edgeView.set(i, tube(nodeView.get(i).mesh.position, nodeView.get(parent[i]).mesh.position));
  }
}
function setNodeColor(i, c) { nodeView.get(i).setColor(c, c); }
function resetNodeColors() { nodeView.forEach(v => v.setColor(BLUE, BLUE)); }
function updateTable(i) {
  tblRow0[i].setText(String(parent[i]));
  tblRow1[i].setText(String(size[i]));
}
function* moveToLayout() {
  const pos = layout();
  const tasks = [];
  nodeView.forEach((vn, i) => {
    const p = pos[i];
    if (!p) return;
    const f = vn.mesh.position.clone();
    if (f.distanceTo(p) < 0.5) return;
    tasks.push({ vn, from: f, to: new THREE.Vector3(p.x, p.y, p.z) });
  });
  if (!tasks.length) { syncEdges(); return; }
  yield A(440, pp => tasks.forEach(t => t.vn.mesh.position.lerpVectors(t.from, t.to, pp)));
  syncEdges();
}
function* pulseRoot(i) {
  const vn = nodeView.get(i);
  yield A(450, p => { vn.mesh.scale.setScalar(1 + 0.25 * Math.sin(p * Math.PI)); });
  vn.mesh.scale.setScalar(1);
}

// ---- 查找：沿父链上溯 + 路径压缩 ----
function* findGen(x, compress) {
  yield S(() => outT.setText('find(' + x + ')：沿父指针链上溯'));
  const chain = findRoot(x);
  for (let k = 0; k < chain.length - 1; k++) {
    setNodeColor(chain[k], GOLD);
    yield W(300);
  }
  const r = chain[chain.length - 1];
  setNodeColor(r, GREEN);
  yield S(() => outT.setText('find(' + x + ') = ' + r + '（绿色 = 根，链：' + chain.join(' → ') + '）'));
  yield* pulseRoot(r);
  yield W(450);
  if (compress && chain.length > 2) {
    const flat = chain.slice(0, -1);
    yield S(() => outT.setText('路径压缩：链上节点直接指向根（' + flat.join('、') + ' → ' + r + '）'));
    for (const c of flat) {
      parent[c] = r;
      updateTable(c);
      setNodeColor(c, ORANGE);
      yield W(320);
    }
    yield* moveToLayout();
    yield S(() => outT.setText('路径压缩完成：树高减小，后续 find 更快'));
    yield W(400);
  }
  resetNodeColors();
  yield W(200);
}

// ---- 联合：两链高亮 → 按秩合并 ----
function* unionGen(a, b) {
  yield S(() => outT.setText('联合 ' + a + ' 与 ' + b + '：先找各自根'));
  const ca = findRoot(a), cb = findRoot(b);
  for (const n of ca) setNodeColor(n, GOLD);
  for (const n of cb) setNodeColor(n, ORANGE);
  yield W(500);
  const ra = ca[ca.length - 1], rb = cb[cb.length - 1];
  if (ra === rb) {
    yield S(() => outT.setText(a + ' 与 ' + b + ' 已在同一集合（根 ' + ra + '），无需合并'));
    yield W(500);
    resetNodeColors();
    yield W(200);
    return;
  }
  let big = ra, small = rb;
  if (size[big] < size[small]) { const t = big; big = small; small = t; }
  yield S(() => outT.setText('按秩合并：根 ' + ra + '（秩 ' + size[ra] + '）vs 根 ' + rb + '（秩 ' + size[rb] + '）→ ' + small + ' 并入 ' + big));
  yield W(500);
  parent[small] = big;
  size[big] += size[small];
  updateTable(small);
  updateTable(big);
  setNodeColor(small, RED);
  setNodeColor(big, GREEN);
  yield* moveToLayout();
  yield S(() => outT.setText('合并完成：parent[' + small + '] = ' + big + '，新秩 ' + size[big]));
  yield W(450);
  resetNodeColors();
  yield W(200);
}

function* runDS() {
  clearView();
  parent = Array.from({ length: N }, (_, i) => i);
  size = Array(N).fill(1);
  hint.setText('并查集：森林 + 父指针/秩表；find 路径压缩，union 按秩合并');
  buildStatic();
  yield W(400);
  yield* unionGen(0, 1);
  yield* unionGen(2, 3);
  yield* unionGen(0, 2);
  yield* unionGen(4, 5);
  yield* unionGen(6, 7);
  yield* unionGen(4, 6);
  yield* unionGen(0, 4);
  yield S(() => outT.setText('7 次联合完成：形成一棵以 0 为根的树，深度 3'));
  yield W(450);
  yield* findGen(7, true);
  yield* findGen(3, true);
  yield S(() => {
    outT.setText('');
    hint.setText('并查集完成：find + union 均近似 O(1)（反阿克曼函数 α(n)）');
    status.textContent = '并查集演示完成：7 次按秩联合 → 单树根 0（秩 8），find(7) 链 7→6→4→0 与 find(3) 链 3→2→0 均路径压缩到深度 1';
  });
}

engine.queue(() => runDS());
panel.addButton('清空', () => { engine.clear(); clearView(); parent = Array.from({ length: N }, (_, i) => i); size = Array(N).fill(1); hint.setText('已清空，可重新运行'); status.textContent = ''; outT.setText(''); });
panel.addLabel('（拖拽旋转视角，滚轮缩放；金/橙 = 两棵查找链，绿 = 根/大根，红 = 被并入的小根）');

scene.start(engine);
