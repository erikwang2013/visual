// AlgorithmLibrary/Huffman3D.js — Huffman 编码：频率球自底向上合并 + 0/1 曲线边 + 金色粒子流 + 码表揭示（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText, VNode } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Huffman3D');

const scene = new Scene3D('scene', { cameraPos: [0, 260, 700], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GREEN = 0x4ade80, GOLD = 0xfcd34d, BLUE = 0x60a5fa, YELLOW = 0xfacc15;
const hint = new VText(scene, { text: '点击「运行 Huffman」开始：构造最优前缀编码', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const FREQ = [['a', 5], ['b', 9], ['c', 12], ['d', 13], ['e', 16], ['f', 45]];

// ---- 纯数据：自底向上建树（每次取频率最小的两个合并） ----
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
(function mark(n, d) { if (!n) return; n.depth = d; mark(n.l, d + 1); mark(n.r, d + 1); })(root, 0);
let leafIdx = 0;
(function inx(n) { if (!n) return; inx(n.l); if (n.ch) { n.x = -260 + leafIdx * 104; leafIdx++; } inx(n.r); })(root);
(function parx(n) { if (!n) return; parx(n.l); parx(n.r); if (!n.ch) n.x = (n.l.x + n.r.x) / 2; n.y = 190 - n.depth * 78; })(root);
const codeMap = {};
const revealOrder = [];
(function collect(n, code) { if (!n) return; n.code = code; if (n.ch) { codeMap[n.ch] = code; revealOrder.push(n); } collect(n.l, code + '0'); collect(n.r, code + '1'); })(root, '');

// ---- 视觉：节点预建隐藏，合并时逐个生长 ----
const nodeView = new Map();
(function draw(n) {
  const vn = new VNode(scene, { radius: n === root ? 27 : 22, x: n.x, y: n.y, z: 0, label: n.ch ? n.ch + '(' + n.w + ')' : String(n.w), color: n.ch ? PALETTE.node : YELLOW, emissive: n.ch ? PALETTE.nodeEmissive : YELLOW });
  vn.mesh.scale.setScalar(0.01);
  vn.mesh.visible = false;
  nodeView.set(n, vn);
  if (n.l) draw(n.l);
  if (n.r) draw(n.r);
})(root);

const edgeView = new Map();
function makeEdge(n, parent) {
  const A = new THREE.Vector3(parent.x, parent.y, 0);
  const B = new THREE.Vector3(n.x, n.y, 0);
  const mid = new THREE.Vector3((parent.x + n.x) / 2, (parent.y + n.y) / 2, 26);
  const curve = new THREE.QuadraticBezierCurve3(A, mid, B);
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 14, 2.4, 6),
    new THREE.MeshBasicMaterial({ color: BLUE, transparent: true, opacity: 0 }));
  scene.add(mesh);
  const lbl = new VText(scene, { text: n === parent.l ? '0' : '1', x: (parent.x + n.x) / 2, y: (parent.y + n.y) / 2 + 26, z: 8, color: PALETTE.textDim, scale: 0.55 });
  lbl.sprite.visible = false;
  edgeView.set(n, { mesh, curve, lbl });
}

const codeTexts = revealOrder.map((n, k) => {
  const t = new VText(scene, { text: n.ch + ' = ' + n.code, x: 345, y: 255 - k * 46, z: 0, color: GREEN, scale: 0.75 });
  t.sprite.visible = false;
  return t;
});
const sample = new VText(scene, { text: 'cafe → ' + 'cafe'.split('').map(ch => codeMap[ch]).join(' '), x: 345, y: -30, z: 0, color: PALETTE.textGlow, scale: 0.85 });
sample.sprite.visible = false;

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
    vn.mesh.visible = false;
    vn.mesh.scale.setScalar(0.01);
    vn.setColor(n.ch ? PALETTE.node : YELLOW, n.ch ? PALETTE.nodeEmissive : YELLOW);
  });
  edgeView.forEach(e => { e.mesh.material.opacity = 0; e.lbl.sprite.visible = false; });
  edgeView.clear();
  codeTexts.forEach(t => t.sprite.visible = false);
  sample.sprite.visible = false;
}

function* runHuffman() {
  yield S(resetAll);
  yield S(() => { hint.setText('频率：a5 b9 c12 d13 e16 f45；每次取频率最小的两个合并，新节点频率 = 二者之和'); });
  yield W(400);
  // 1) 叶子逐个生长
  for (const [ch] of FREQ) {
    const n = [...nodeView.keys()].find(k => k.ch === ch);
    yield S(() => {
      nodeView.get(n).mesh.visible = true;
      hint.setText('字符「' + ch + '」频率 ' + n.w + ' 入队');
    });
    yield A(350, p => nodeView.get(n).mesh.scale.setScalar(0.01 + 0.99 * p));
    yield A(400, p => nodeView.get(n).mesh.scale.setScalar(1 + 0.12 * Math.sin(p * Math.PI * 2)));
    yield W(120);
  }
  // 2) 逐组合并
  for (const m of merges) {
    yield S(() => {
      nodeView.get(m.x).setColor(GOLD, GOLD);
      nodeView.get(m.y).setColor(GOLD, GOLD);
      hint.setText('取出最小两个 ' + (m.x.ch ? m.x.ch + '(' + m.x.w + ')' : m.x.w) + '、' + (m.y.ch ? m.y.ch + '(' + m.y.w + ')' : m.y.w) + '，合并为 ' + m.p.w);
    });
    yield W(450);
    const vn = nodeView.get(m.p);
    yield S(() => vn.mesh.visible = true);
    yield A(380, p => vn.mesh.scale.setScalar(0.01 + 0.99 * p));
    yield A(400, p => vn.mesh.scale.setScalar(1 + 0.14 * Math.sin(p * Math.PI * 2)));
    makeEdge(m.x, m.p); makeEdge(m.y, m.p);
    const ex = edgeView.get(m.x), ey = edgeView.get(m.y);
    yield* flowAlong(ex.curve);
    yield* flowAlong(ey.curve);
    yield A(350, p => { ex.mesh.material.opacity = 0.85 * p; ey.mesh.material.opacity = 0.85 * p; });
    yield S(() => { ex.lbl.sprite.visible = true; ey.lbl.sprite.visible = true; });
    yield S(() => {
      nodeView.get(m.x).setColor(m.x.ch ? PALETTE.node : YELLOW, m.x.ch ? PALETTE.nodeEmissive : YELLOW);
      nodeView.get(m.y).setColor(m.y.ch ? PALETTE.node : YELLOW, m.y.ch ? PALETTE.nodeEmissive : YELLOW);
    });
    yield W(200);
  }
  // 3) 编码揭示
  yield S(() => { hint.setText('树构建完成。按路径揭示编码：左分支 0、右分支 1'); });
  yield W(400);
  for (let k = 0; k < revealOrder.length; k++) {
    const n = revealOrder[k];
    yield S(() => {
      codeTexts[k].sprite.visible = true;
      nodeView.get(n).setColor(GREEN, GREEN);
      hint.setText(n.ch + ' 的码：' + n.code);
    });
    yield A(500, p => nodeView.get(n).mesh.scale.setScalar(1 + 0.22 * Math.sin(p * Math.PI * 2)));
    yield W(300);
  }
  // 4) 示例与总结
  const total = FREQ.reduce((s, f) => s + f[1], 0);
  let wpl = 0;
  revealOrder.forEach(n => { wpl += n.w * n.code.length; });
  yield S(() => {
    clearFx();
    sample.sprite.visible = true;
    hint.setText('码表：' + revealOrder.map(n => n.ch + ':' + n.code).join(' '));
    status.textContent = 'Huffman 完成：WPL = ' + wpl + '，平均 ' + (wpl / total).toFixed(2) + ' 位/字符';
  });
  yield W(600);
}

panel.addButton('运行 Huffman', () => engine.start(runHuffman()));
panel.addButton('清空', () => { engine.clear(); resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；蓝曲线 = 0/1 分支，金粒子 = 合并流动）');

scene.start(engine);
