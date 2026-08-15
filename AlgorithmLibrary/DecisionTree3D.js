// AlgorithmLibrary/DecisionTree3D.js — 决策树（ID3）：按信息增益最大特征递归分裂，子集纯化即叶节点（function* 生成器驱动，模块级预建对象池）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VBox, VText, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('DecisionTree3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GREEN = 0x4ade80, RED = 0xf87171, GOLD = 0xfcd34d;
const status = panel.addStatus('就绪');
const ease = p => p * p * (3 - 2 * p);

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

// ---- 样本区（模块级预建，绿=打球 红=不打）----
const SP = 72, X0 = 320 - 3.5 * SP;
const sboxes = DATA.map((d, i) => new VBox(scene, { w: 40, h: 40, d: 40, x: X0 + i * SP, y: 235, z: 0, label: 'S' + (i + 1), color: d.play === '是' ? GREEN : RED, emissive: d.play === '是' ? GREEN : RED }));
const sfeat = DATA.map((d, i) => new VText(scene, { text: d.w + d.t + d.h + d.wnd, x: X0 + i * SP, y: 272, z: 0, color: PALETTE.textDim, scale: 0.5 }));

// ---- 真实 ID3 递归建树（纯数据 + 固定布局坐标，模块级一次算好生成步骤）----
const ent = a => {
  const n = a.length;
  if (!n) return 0;
  const m = {};
  a.forEach(v => m[v] = (m[v] || 0) + 1);
  return -Object.values(m).reduce((s, c) => s + (c / n) * Math.log2(c / n), 0);
};
const cov = rows => rows.map(r => DATA.indexOf(r) + 1).join('/');
const steps = [];
let nodeIdx = 0, edgeIdx = 0;
function buildTree(rows, px, py, dx, branch) {
  const ys = rows.map(r => r.play);
  if (new Set(ys).size === 1) {
    steps.push({ kind: 'leaf', idx: nodeIdx++, branch, label: ys[0], x: px, y: py, rows });
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
  steps.push({ kind: 'calc', branch, H, gains, best: best.name, rows });
  steps.push({ kind: 'node', idx: nodeIdx++, label: best.name, x: px, y: py, rows,
    groups: Object.keys(best.groups).map(v => v + '(' + cov(best.groups[v]) + ')') });
  const vals = Object.keys(best.groups);
  vals.forEach((val, i) => {
    const cx = px + (i - (vals.length - 1) / 2) * dx * 2;
    steps.push({ kind: 'edge', eidx: edgeIdx++, label: val, from: [px, py], to: [cx, py - 130] });
    buildTree(best.groups[val], cx, py - 130, dx / 2, val);
  });
}
buildTree(DATA, 320, 830, 110, null);

// ---- 对象池：全部节点球 / 连线管 / 分支标签，模块级按最终位置预建，运行期只改显隐/颜色/缩放 ----
const treePool = steps.filter(s => s.kind === 'node' || s.kind === 'leaf').map(s => {
  const base = s.kind === 'leaf' ? (s.label === '是' ? GREEN : RED) : PALETTE.node;
  const vn = new VNode(scene, { radius: s.kind === 'leaf' ? 20 : 23, x: s.x, y: s.y, z: 0, label: s.label, color: base, emissive: base });
  vn.mesh.visible = false;
  return vn;
});
const tubes = steps.filter(s => s.kind === 'edge').map(s => {
  const t = tubeBetween(scene, [s.from[0], s.from[1], 0], [s.to[0], s.to[1], 0], { color: PALETTE.edge, opacity: 0.55, radius: 2.2 });
  t.visible = false;
  return t;
});
const edgeLbls = steps.filter(s => s.kind === 'edge').map(s => {
  const mx = (s.from[0] + s.to[0]) / 2, my = (s.from[1] + s.to[1]) / 2;
  const t = new VText(scene, { text: s.label, x: s.from[0] === s.to[0] ? mx + 30 : mx, y: my + 8, z: 0, color: GOLD, scale: 0.5 });
  t.sprite.visible = false;
  return t;
});

function resetAll() {
  for (const vn of treePool) { vn.mesh.visible = false; vn.mesh.scale.setScalar(1); }
  for (const t of tubes) { t.visible = false; t.material.opacity = 0.55; }
  for (const l of edgeLbls) { l.sprite.visible = false; l.sprite.scale.setScalar(1); }
  sboxes.forEach((b, i) => { b.setHighlight(false); b.setColor(DATA[i].play === '是' ? GREEN : RED, DATA[i].play === '是' ? GREEN : RED); });
}
function setSamples(rows) {
  sboxes.forEach((b, i) => {
    if (rows.includes(DATA[i])) b.setHighlight(true);
    else b.setColor(DATA[i].play === '是' ? GREEN : RED, DATA[i].play === '是' ? GREEN : RED);
  });
}
function* dropNode(s) {
  const vn = treePool[s.idx];
  vn.mesh.visible = true;
  vn.mesh.position.set(s.x, 960, 0);
  vn.mesh.scale.setScalar(0.4);
  yield A(420, p => {
    const e = ease(p);
    vn.mesh.position.y = 960 + (s.y - 960) * e;
    vn.mesh.scale.setScalar(0.4 + 0.6 * e);
  });
  vn.mesh.scale.setScalar(1);
}
function* showEdge(s) {
  const t = tubes[s.eidx], lbl = edgeLbls[s.eidx];
  t.visible = true;
  t.material.opacity = 0;
  lbl.sprite.visible = true;
  lbl.sprite.scale.setScalar(0.01);
  yield A(320, p => {
    t.material.opacity = 0.55 * ease(p);
    lbl.sprite.scale.setScalar(0.01 + 0.99 * ease(p));
  });
}

function* runDecisionTree() {
  resetAll();
  yield S(() => { status.textContent = '决策树（ID3）：8 个样本按 天气/温度/湿度/风 判断是否打球；递归选择信息增益最大的特征分裂，子集纯化即叶节点'; });
  yield W(800);
  for (const s of steps) {
    if (s.kind === 'calc') {
      yield S(() => {
        const cnt = s.rows.reduce((m, r) => (m[r.play] = (m[r.play] || 0) + 1, m), {});
        const gl = s.gains.map(g => g.name + ' ' + g.g.toFixed(3)).join('  ');
        const head = s.branch ? '「' + s.branch + '」分支子集（样本 ' + cov(s.rows) + '）' : '根子集（是 ' + (cnt.是 || 0) + ' / 否 ' + (cnt.否 || 0) + '）';
        status.textContent = head + '：熵 H=' + s.H.toFixed(3) + '，信息增益 ' + gl + ' → 选「' + s.best + '」';
      });
      yield W(950);
    } else if (s.kind === 'node') {
      yield* dropNode(s);
      setSamples(s.rows);
      yield S(() => {
        status.textContent = (s.idx === 0 ? '根节点' : '子节点') + '：以「' + s.label + '」分裂，分支 ' + s.groups.join('、') + '；当前子集样本高亮';
      });
      yield W(650);
    } else if (s.kind === 'edge') {
      yield* showEdge(s);
      yield S(() => { status.textContent = '沿分支「' + s.label + '」生长连线，子集进入下一层'; });
      yield W(350);
    } else {
      yield* dropNode(s);
      setSamples(s.rows);
      yield S(() => {
        status.textContent = '分支「' + s.branch + '」样本 ' + cov(s.rows) + ' 全为「' + s.label + '」→ 子集已纯化，生成叶节点「' + s.label + '」';
      });
      yield W(650);
    }
  }
  yield S(() => { status.textContent = 'DecisionTree 演示完成：8 样本（5 是 3 否）按信息增益分裂 2 层（湿度 → 天气）、4 片叶全部纯化，规则 湿度=中→是、湿度=高 再按 晴/雨→否 阴→是；复杂度 建树 O(m·n·log n)、预测 O(树深)'; });
  yield W(800);
}

engine.queue(() => runDecisionTree());
panel.addButton('清空', () => { engine.clear(); resetAll(); status.textContent = ''; });

scene.start(engine);
