// AlgorithmLibrary/Huffman3D.js — Huffman 编码：频率优先队列合并建树 + 0/1 编码 + 编码示例
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Huffman3D');

const scene = new Scene3D('scene', { cameraPos: [0, 260, 700], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const FREQ = [['a', 5], ['b', 9], ['c', 12], ['d', 13], ['e', 16], ['f', 45]];
const GREEN = 0x4ade80, YELLOW = 0xfacc15;
const hint = new VText(scene, { text: '点击「运行 Huffman」开始：构造最优前缀编码', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');
const dynamic = []; // 运行中创建的对象
const leaves = [];  // 叶子节点（供高亮）

function clearAll() {
  engine.clear();
  for (const d of dynamic) d.remove();
  for (const l of leaves) l.remove();
  dynamic.length = 0; leaves.length = 0;
}

function runHuffman() {
  clearAll();
  // 1) 自底向上建树（记录合并顺序）
  const items = FREQ.map(f => ({ ch: f[0], w: f[1], l: null, r: null, node: null, depth: 0, code: '' }));
  let seq = 0;
  const merges = [];
  while (items.length > 1) {
    items.sort((a, b) => a.w - b.w);
    const x = items.shift(), y = items.shift();
    const p = { ch: null, w: x.w + y.w, l: x, r: y, node: null, depth: 0, code: '', seq: seq++ };
    merges.push({ p, x, y });
    items.push(p);
  }
  const root = items[0];
  (function mark(n, d) { if (!n) return; n.depth = d; mark(n.l, d + 1); mark(n.r, d + 1); })(root, 0);
  let leafIdx = 0;
  (function inx(n) { if (!n) return; inx(n.l); if (n.ch) { n.x = -260 + leafIdx * 104; leafIdx++; } inx(n.r); })(root);
  (function parx(n) { if (!n) return; parx(n.l); parx(n.r); if (!n.ch) n.x = (n.l.x + n.r.x) / 2; n.y = 190 - n.depth * 78; })(root);

  // 2) 画叶子
  (function draw(n) {
    if (!n) return;
    if (n.ch) {
      const nd = new VNode(scene, { radius: 24, x: n.x, y: n.y, z: 0, label: n.ch + '(' + n.w + ')', color: PALETTE.node, emissive: PALETTE.nodeEmissive });
      n.node = nd; leaves.push(nd);
    }
    draw(n.l); draw(n.r);
  })(root);

  hint.setText('频率：a5 b9 c12 d13 e16 f45；每次取频率最小的两个合并，新节点频率 = 二者之和');

  // 3) 逐组合并动画
  let i = 0;
  const step = () => {
    if (i >= merges.length) { reveal(0); return; }
    const m = merges[i];
    hint.setText('取出最小两个 ' + (m.x.ch ? m.x.ch + '(' + m.x.w + ')' : m.x.w) + '、' + (m.y.ch ? m.y.ch + '(' + m.y.w + ')' : m.y.w) + '，合并为 ' + m.p.w);
    m.x.node.setColor(YELLOW, YELLOW); m.y.node.setColor(YELLOW, YELLOW);
    C(650, () => {
      m.x.node.setColor(PALETTE.node, PALETTE.nodeEmissive); m.y.node.setColor(PALETTE.node, PALETTE.nodeEmissive);
      const nd = new VNode(scene, { radius: 22, x: m.p.x, y: m.p.y, z: 0, label: String(m.p.w), color: YELLOW, emissive: YELLOW });
      nd.pulse(0.35);
      m.p.node = nd; dynamic.push(nd);
      const pc = [m.p.x, m.p.y, 0], lc = [m.x.x, m.x.y, 0], rc = [m.y.x, m.y.y, 0];
      dynamic.push(tubeBetween(scene, lc, pc, { color: PALETTE.edge, radius: 2.5, opacity: 0.5 }));
      dynamic.push(tubeBetween(scene, rc, pc, { color: PALETTE.edge, radius: 2.5, opacity: 0.5 }));
      dynamic.push(new VText(scene, { text: '0', x: (lc[0] + pc[0]) / 2, y: (lc[1] + pc[1]) / 2, z: 0, color: PALETTE.textDim, scale: 0.6 }));
      dynamic.push(new VText(scene, { text: '1', x: (rc[0] + pc[0]) / 2, y: (rc[1] + pc[1]) / 2, z: 0, color: PALETTE.textDim, scale: 0.6 }));
      step();
    });
  };
  step();

  // 4) 编码揭示
  const codeMap = {};
  const revealOrder = [];
  (function collect(n, code) {
    if (!n) return;
    n.code = code;
    if (n.ch) { codeMap[n.ch] = code; revealOrder.push(n); }
    collect(n.l, code + '0'); collect(n.r, code + '1');
  })(root, '');

  let ri = 0;
  const revealStep = () => {
    if (ri >= revealOrder.length) {
      const total = FREQ.reduce((s, f) => s + f[1], 0);
      let wpl = 0;
      revealOrder.forEach((n, k) => {
        wpl += n.w * n.code.length;
        dynamic.push(new VText(scene, { text: n.ch + ' = ' + n.code, x: 345, y: 255 - k * 46, z: 0, color: GREEN, scale: 0.75 }));
      });
      const sample = new VText(scene, { text: 'cafe → ' + 'cafe'.split('').map(ch => codeMap[ch]).join(' '), x: 345, y: -30, z: 0, color: PALETTE.textGlow, scale: 0.85 });
      dynamic.push(sample);
      status.textContent = 'Huffman 完成：WPL = ' + wpl + '，平均 ' + (wpl / total).toFixed(2) + ' 位/字符';
      hint.setText('码表：' + revealOrder.map(n => n.ch + ':' + n.code).join(' '));
      return;
    }
    const n = revealOrder[ri]; ri++;
    n.node.setColor(GREEN, GREEN); n.node.pulse(0.3);
    hint.setText(n.ch + ' 的码：' + n.code);
    C(450, revealStep);
  };
  revealStep();
}

panel.addButton('运行 Huffman', runHuffman);
panel.addButton('清空', () => { clearAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
