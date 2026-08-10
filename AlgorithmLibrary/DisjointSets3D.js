// AlgorithmLibrary/DisjointSets3D.js
// 并查集：8 个元素 = 森林（Tree3D 单节点树排两行）+ 父指针/秩 Table3D。
// 查找沿父链高亮到根并显示 find(x)=r；联合按秩合并，小根节点移动为大根子树。
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Table3D } from '../3D/modes/Table3D.js';
import { Tree3D } from '../3D/modes/Tree3D.js';
import { VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('DisjointSets3D');

const scene = new Scene3D('scene', { cameraPos: [0, 300, 680], fov: 55 });
const engine = new AnimationEngine({ speed: 1.4 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const tree = new Tree3D(scene, { radius: 18 });
for (let i = 0; i < 8; i++) {
  const r = i < 4 ? 0 : 1;
  tree.addNode(String(i), String(i), -225 + (i % 4) * 150, r === 0 ? 130 : 20, 0);
}
const table = new Table3D(scene, { rows: 2, cols: 8, cellW: 62, cellH: 46, startX: 0, startY: -85 });
table.create();
table.setRowLabel(0, '父');
table.setRowLabel(1, '秩');
for (let i = 0; i < 8; i++) { table.cells[0][i].setText(String(i)); table.cells[1][i].setText('1'); }

const status = panel.addStatus('');
const hint = new VText(scene, { text: '输入值(0~7)，点「查找」或「联合」', x: 0, y: 250, z: 0, color: PALETTE.textGlow, scale: 0.85 });
let findText = null;

let parent = Array.from({ length: 8 }, (_, i) => i);
let size = Array(8).fill(1);
let lastSel = 0;   // 最近一次查找/联合的值：联合(a) 与 lastSel 合并

function clearAux() {
  if (findText) { findText.remove(); findText = null; }
}

// ---- 模型（与 /tmp/3dtest/2i_model.mjs 一致）----
function findRoot(x) {
  const chain = [x];
  while (parent[chain[chain.length - 1]] !== chain[chain.length - 1]) chain.push(parent[chain[chain.length - 1]]);
  return chain;
}
function dsModel(ops) {
  const p = Array.from({ length: 8 }, (_, i) => i);
  const s = Array(8).fill(1);
  const out = [];
  const root = (x) => { const c = [x]; while (p[c[c.length - 1]] !== c[c.length - 1]) c.push(p[c[c.length - 1]]); return c; };
  for (const op of ops) {
    if (op.t === 'find') { const c = root(op.x); out.push({ t: 'find', x: op.x, r: c[c.length - 1] }); }
    else {
      const ca = root(op.a), cb = root(op.b);
      let big = ca[ca.length - 1], small = cb[cb.length - 1];
      if (s[big] < s[small]) { const t = big; big = small; small = t; }
      p[small] = big; s[big] += s[small];
      out.push({ t: 'union', a: op.a, b: op.b, big, small, same: big === small });
    }
  }
  return { parent: p, size: s, out };
}

function layout() {
  const pos = {};
  for (let i = 0; i < 8; i++) {
    const r = i < 4 ? 0 : 1;
    pos[i] = parent[i] === i ? { x: -225 + (i % 4) * 150, y: r === 0 ? 130 : 20, z: 0 } : null;
  }
  let moved = true;
  while (moved) {
    moved = false;
    for (let i = 0; i < 8; i++) {
      if (pos[i]) continue;
      const p = parent[i];
      if (pos[p]) {
        const sibs = [];
        for (let j = 0; j < 8; j++) if (parent[j] === p) sibs.push(j);
        pos[i] = { x: pos[p].x + (sibs.indexOf(i) - (sibs.length - 1) / 2) * 62, y: pos[p].y - 80, z: 0 };
        moved = true;
      }
    }
  }
  return pos;
}

function runFind() {
  engine.clear();
  clearAux();
  const x = Math.min(Math.max(parseInt(valueInput.value, 10) || 0, 0), 7);
  valueInput.value = String(x);
  const chain = findRoot(x);
  for (const n of chain) tree.highlight(String(n), C);
  findText = new VText(scene, { text: 'find(' + x + ') = ' + chain[chain.length - 1], x: 0, y: 220, z: 0, color: PALETTE.textGlow, scale: 0.9 });
  C(1, () => hint.setText('沿父链查找：' + chain.join(' → ')), () => {});
  C(500, () => {}, () => {});
  for (let i = chain.length - 2; i >= 0; i--) tree.unhighlight(String(chain[i]), C);
  C(1, () => {
    lastSel = x;
    hint.setText('find(' + x + ') = ' + chain[chain.length - 1] + '（已选中，可直接「联合」）');
  }, () => {});
}

function runUnion() {
  engine.clear();
  clearAux();
  const x = Math.min(Math.max(parseInt(valueInput.value, 10) || 0, 0), 7);
  valueInput.value = String(x);
  const a = lastSel;
  const ca = findRoot(a), cb = findRoot(x);
  const ra = ca[ca.length - 1], rb = cb[cb.length - 1];
  for (const n of ca) tree.highlight(String(n), C);
  for (const n of cb) tree.highlight(String(n), C);
  C(1, () => hint.setText('联合 ' + a + ' 与 ' + x + '：根 ' + ra + '(秩 ' + size[ra] + ')、根 ' + rb + '(秩 ' + size[rb] + ')'), () => {});
  C(500, () => {}, () => {});
  for (let i = ca.length - 2; i >= 0; i--) tree.unhighlight(String(ca[i]), C);
  for (let i = cb.length - 2; i >= 0; i--) tree.unhighlight(String(cb[i]), C);
  if (ra !== rb) {
    let big = ra, small = rb;
    if (size[big] < size[small]) { const t = big; big = small; small = t; }
    parent[small] = big;
    size[big] += size[small];
    C(1, () => hint.setText('按秩合并：' + small + ' 并入 ' + big + '，新秩 ' + size[big]), () => {});
    const pos = layout();
    for (let i = 0; i < 8; i++) {
      const cur = tree.nodes.get(String(i));
      if (cur && (cur.x !== pos[i].x || cur.y !== pos[i].y || cur.z !== pos[i].z)) {
        tree.moveNode(String(i), pos[i].x, pos[i].y, pos[i].z, C);
      }
    }
    for (let i = 0; i < 8; i++) { table.setCell(0, i, String(parent[i]), C); table.setCell(1, i, String(size[i]), C); }
    C(1, () => hint.setText('父指针与秩已更新'), () => {});
  } else {
    C(1, () => hint.setText(a + ' 与 ' + x + ' 已在同一集合（根 ' + ra + '），无需合并'), () => {});
  }
  lastSel = x;
  C(1, () => {
    status.textContent = 'parent = [' + parent.join(', ') + ']';
  }, () => {});
}

const valueInput = panel.addInput('值(0~7)', () => runFind(), 1);
valueInput.value = '0';
panel.addButton('查找', runFind);
panel.addButton('联合', runUnion);
panel.addLabel('（联合对象 = 上次查找的值；拖拽旋转视角，滚轮缩放）');

scene.start(engine);
