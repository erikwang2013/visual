// AlgorithmLibrary/DecisionTree3D.js — 决策树（ID3）：按信息增益选特征递归分裂，直到子集纯化
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('DecisionTree3D');

const scene = new Scene3D('scene', { cameraPos: [0, 380, 720], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GREEN = 0x4ade80, RED = 0xf87171, YELLOW = 0xfacc15, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「运行建树」开始', x: 0, y: 330, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

// 8 个样本：天气/温度/湿度/风 → 是否打球
const DATA = [
  { w: '晴', t: '热', h: '高', wnd: '无', play: '否' },
  { w: '晴', t: '温', h: '高', wnd: '有', play: '否' },
  { w: '晴', t: '凉', h: '中', wnd: '无', play: '是' },
  { w: '阴', t: '热', h: '高', wnd: '无', play: '是' },
  { w: '阴', t: '凉', h: '中', wnd: '有', play: '是' },
  { w: '雨', t: '温', h: '高', wnd: '有', play: '否' },
  { w: '雨', t: '凉', h: '中', wnd: '无', play: '是' },
  { w: '雨', t: '温', h: '中', wnd: '无', play: '是' },
];
const FEATS = [['w', '天气'], ['t', '温度'], ['h', '湿度'], ['wnd', '风']];

const SP = 70, X0 = -3.5 * SP;
const sboxes = DATA.map((d, i) => new VBox(scene, { w: 40, h: 40, d: 40, x: X0 + i * SP, y: 235, z: 0, label: 'S' + (i + 1), color: d.play === '是' ? GREEN : RED, emissive: d.play === '是' ? GREEN : RED }));
const sfeat = DATA.map((d, i) => new VText(scene, { text: d.w + d.t + d.h + d.wnd, x: X0 + i * SP, y: 200, z: 0, color: PALETTE.textDim, scale: 0.55 }));
new VText(scene, { text: '样本（绿=打球 红=不打）', x: 0, y: 288, z: 0, color: PALETTE.textDim, scale: 0.7 });
const calcT = new VText(scene, { text: '', x: 0, y: 150, z: 0, color: PALETTE.textGlow, scale: 0.72 });

const nodeObjs = [];
const edgeObjs = [];

const ent = a => {
  const n = a.length;
  if (!n) return 0;
  const m = {};
  a.forEach(v => m[v] = (m[v] || 0) + 1);
  return -Object.values(m).reduce((s, c) => s + (c / n) * Math.log2(c / n), 0);
};

// 真实 ID3：递归计算，同时记录动画步骤
const steps = [];
function id3(rows, depth, px, py, label) {
  const ys = rows.map(r => r.play);
  if (new Set(ys).size === 1) {
    const n = { kind: 'leaf', label: ys[0], x: px, y: py, rows };
    steps.push(n);
    return;
  }
  const H = ent(ys);
  let best = null, bestGain = -1;
  const gains = [];
  for (const [key, name] of FEATS) {
    const groups = {};
    rows.forEach(r => (groups[r[key]] = groups[r[key]] || []).push(r));
    const Hc = Object.values(groups).reduce((s, g) => s + (g.length / rows.length) * ent(g.map(r => r.play)), 0);
    const g = H - Hc;
    gains.push({ name, g });
    if (g > bestGain) { bestGain = g; best = { key, name, groups }; }
  }
  const n = { kind: 'node', label: best.name, x: px, y: py, rows };
  steps.push({ kind: 'calc', label, H, gains, best: best.name, rows });
  steps.push(n);
  let c = 0;
  const vals = Object.keys(best.groups);
  for (const val of vals) {
    const cx = px + (c - (vals.length - 1) / 2) * 130;
    steps.push({ kind: 'edge', from: [px, py], to: [cx, py - 90], label: val });
    id3(best.groups[val], depth + 1, cx, py - 90, val + '=' + val);
    c++;
  }
}
id3(DATA, 0, 0, 120, '根');

function resetAll() {
  engine.clear();
  for (const o of nodeObjs) o.remove();
  nodeObjs.length = 0;
  for (const o of edgeObjs) o.remove();
  edgeObjs.length = 0;
  sboxes.forEach((b, i) => { b.setColor(DATA[i].play === '是' ? GREEN : RED, DATA[i].play === '是' ? GREEN : RED); b.setHighlight(false); });
  calcT.setText('');
}

function runTree() {
  resetAll();
  hint.setText('ID3：每个节点计算各特征的信息增益，选增益最大的特征分裂，子集纯则成为叶节点');
  let done = 0;
  const next = () => {
    if (done >= steps.length) {
      const root = steps.find(s => s.kind === 'node');
      status.textContent = '决策树构建完成：根节点选「' + root.label + '」，叶节点全部纯化';
      hint.setText('新样本沿树逐层判断即可分类；信息增益 = H(子集) - H(特征划分后的加权熵)');
      return;
    }
    const s = steps[done]; done++;
    if (s.kind === 'calc') {
      const gl = s.gains.map(g => g.name + ':' + g.g.toFixed(3)).join('  ');
      calcT.setText('H(' + (s.label || '全体') + ') = ' + s.H.toFixed(3) + '；增益 ' + gl);
      hint.setText('当前子集熵 H = ' + s.H.toFixed(3) + '，特征信息增益：' + gl + ' → 选 ' + s.best + ' 分裂');
      C(1200, () => {});
    } else if (s.kind === 'node') {
      C(200, () => {
        const b = new VBox(scene, { w: 78, h: 46, d: 30, x: s.x, y: s.y, z: 0, label: s.label, color: PALETTE.node, emissive: PALETTE.nodeEmissive });
        nodeObjs.push(b);
        sboxes.forEach((box, i) => box.setHighlight(s.rows.includes(DATA[i])));
      });
      hint.setText('以「' + s.label + '」为划分特征，该分支覆盖的样本高亮');
      C(800, () => {});
    } else if (s.kind === 'edge') {
      C(300, () => {
        edgeObjs.push(tubeBetween(scene, s.from, [s.to[0], s.to[1], 0], { color: PALETTE.edge, opacity: 0.5, radius: 2 }));
      });
      C(200, () => {});
    } else {
      C(300, () => {
        const b = new VBox(scene, { w: 60, h: 46, d: 30, x: s.x, y: s.y, z: 0, label: s.label, color: s.label === '是' ? GREEN : RED, emissive: s.label === '是' ? GREEN : RED });
        nodeObjs.push(b);
      });
      hint.setText('子集已纯化（全为「' + s.label + '」）→ 叶节点，停止分裂');
      C(800, () => {});
    }
    C(400, next);
  };
  next();
}

panel.addButton('运行建树', runTree);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；C4.5 用增益率、CART 用基尼系数，同为贪心选特征）');

scene.start(engine);
