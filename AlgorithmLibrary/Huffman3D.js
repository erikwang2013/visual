// AlgorithmLibrary/Huffman3D.js — Huffman 编码：频率球自底向上合并 + 0/1 曲线边 + 金色粒子流 + 编码揭示（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText, VNode } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
applyTheme('Huffman3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x38bdf8, GOLD = 0xfde047, GREEN = 0x4ade80, YELLOW = 0xfacc15;
const status = panel.addStatus('就绪');

const FREQ = [['a', 5], ['b', 9], ['c', 12], ['d', 13], ['e', 16], ['f', 45]];

// ---- 纯数据：自底向上建树（每次取频率最小的两个合并），左 0 右 1 ----
const items = FREQ.map(f => ({ ch: f[0], w: f[1], l: null, r: null }));
const merges = [];
while (items.length > 1) {
  items.sort((a, b) => a.w - b.w);
  const x = items.shift(), y = items.shift();
  const p = { ch: null, w: x.w + y.w, l: x, r: y };
  merges.push({ p, x, y });
  items.push(p);
}
const root = items[0];
let leafIdx = 0;
(function inx(n) { if (!n) return; inx(n.l); if (n.ch) { n.x = 80 + leafIdx * 96; leafIdx++; } inx(n.r); })(root);
(function parx(n) { if (!n) return; parx(n.l); parx(n.r); if (!n.ch) n.x = (n.l.x + n.r.x) / 2; n.y = n.ch ? 535 : Math.max(n.l.y, n.r.y) + 72; })(root);
const revealOrder = [];
(function collect(n, code) { if (!n) return; n.code = code; if (n.ch) revealOrder.push(n); collect(n.l, code + '0'); collect(n.r, code + '1'); })(root, '');

// ---- 视觉：叶子初始可见（默认演示体），内部节点合并时生长 ----
const nodeView = new Map();
function buildTree(n = root) {
  const isLeaf = !!n.ch;
  const vn = new VNode(scene, { radius: n === root ? 27 : 22, x: n.x, y: n.y, z: 0, label: isLeaf ? n.ch + '(' + n.w + ')' : String(n.w), color: isLeaf ? BLUE : YELLOW, emissive: isLeaf ? BLUE : YELLOW });
  if (isLeaf) { vn.mesh.visible = true; }
  else { vn.mesh.scale.setScalar(0.01); vn.mesh.visible = false; }
  nodeView.set(n, vn);
  if (n.l) buildTree(n.l);
  if (n.r) buildTree(n.r);
}

const edgeView = new Map();
function makeEdge(n, parent) {
  const A = new THREE.Vector3(parent.x, parent.y, 0);
  const B = new THREE.Vector3(n.x, n.y, 0);
  const mid = new THREE.Vector3((parent.x + n.x) / 2, (parent.y + n.y) / 2, 26);
  const curve = new THREE.QuadraticBezierCurve3(A, mid, B);
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 14, 2.4, 6),
    new THREE.MeshBasicMaterial({ color: BLUE, transparent: true, opacity: 0 }));
  scene.add(mesh);
  const lbl = new VText(scene, { text: n === parent.l ? '0' : '1', x: (parent.x + n.x) / 2, y: (parent.y + n.y) / 2 + 26, z: 8, color: 0xffffff, scale: 0.55 });
  lbl.sprite.visible = false;
  edgeView.set(n, { mesh, curve, lbl });
}

let fxGroup = new THREE.Group();
scene.add(fxGroup);
const clearFx = () => { scene.remove(fxGroup); fxGroup = new THREE.Group(); scene.add(fxGroup); };

function flowAlong(curve, count = 3, ms = 420) {
  const parts = [];
  for (let i = 0; i < count; i++) {
    const v = new THREE.Mesh(new THREE.SphereGeometry(3.5, 8, 8),
      new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.9 }));
    parts.push(v); fxGroup.add(v);
  }
  return A(ms, p => parts.forEach((v, i) => v.position.copy(curve.getPoint((p + i * 0.18) % 1))));
}

function resetAll() {
  clearFx();
  nodeView.forEach((vn, n) => {
    const isLeaf = !!n.ch;
    vn.mesh.visible = isLeaf;
    vn.mesh.scale.setScalar(isLeaf ? 1 : 0.01);
    vn.setColor(isLeaf ? BLUE : YELLOW, isLeaf ? BLUE : YELLOW);
  });
  edgeView.forEach(e => {
    scene.remove(e.mesh);
    e.mesh.geometry.dispose();
    e.mesh.material.dispose();
    scene.remove(e.lbl.sprite);
  });
  edgeView.clear();
}

function* runHuffman() {
  yield S(resetAll);
  yield W(300);
  // 1) 叶子逐个强调（a,b,c,d,e,f）
  for (const [ch] of FREQ) {
    const n = [...nodeView.keys()].find(k => k.ch === ch);
    yield A(300, p => nodeView.get(n).mesh.scale.setScalar(1 + 0.14 * Math.sin(p * Math.PI * 2)));
    yield W(100);
  }
  // 2) 逐组合并：取最小两个 → 变金 → 父节点生长 → 0/1 曲线边 + 金色粒子流 → 恢复
  for (const m of merges) {
    yield S(() => { nodeView.get(m.x).setColor(GOLD, GOLD); nodeView.get(m.y).setColor(GOLD, GOLD); });
    yield W(400);
    const vn = nodeView.get(m.p);
    yield S(() => vn.mesh.visible = true);
    yield A(380, p => vn.mesh.scale.setScalar(0.01 + 0.99 * p));
    yield A(300, p => vn.mesh.scale.setScalar(1 + 0.12 * Math.sin(p * Math.PI * 2)));
    makeEdge(m.x, m.p); makeEdge(m.y, m.p);
    const ex = edgeView.get(m.x), ey = edgeView.get(m.y);
    yield flowAlong(ex.curve);
    yield flowAlong(ey.curve);
    yield A(300, p => { ex.mesh.material.opacity = 0.85 * p; ey.mesh.material.opacity = 0.85 * p; });
    yield S(() => { ex.lbl.sprite.visible = true; ey.lbl.sprite.visible = true; });
    yield S(() => {
      nodeView.get(m.x).setColor(m.x.ch ? BLUE : YELLOW, m.x.ch ? BLUE : YELLOW);
      nodeView.get(m.y).setColor(m.y.ch ? BLUE : YELLOW, m.y.ch ? BLUE : YELLOW);
    });
    yield W(150);
  }
  // 3) 编码揭示（中序：f c d a b e 逐个变绿）
  yield W(300);
  for (const n of revealOrder) {
    yield S(() => nodeView.get(n).setColor(GREEN, GREEN));
    yield A(420, p => nodeView.get(n).mesh.scale.setScalar(1 + 0.18 * Math.sin(p * Math.PI * 2)));
    yield W(150);
  }
  // 4) 完成：状态栏输出 WPL
  const total = FREQ.reduce((s, f) => s + f[1], 0);
  let wpl = 0;
  revealOrder.forEach(n => { wpl += n.w * n.code.length; });
  yield S(() => { clearFx(); status.textContent = 'Huffman 完成：WPL = ' + wpl + '，平均 ' + (wpl / total).toFixed(2) + ' 位/字符'; });
  yield W(800);
}

buildTree();  // 初始化默认演示体：6 个频率叶子行
engine.queue(() => runHuffman());
panel.addButton('清空', () => { engine.clear(); resetAll(); status.textContent = ''; });

scene.start(engine);
