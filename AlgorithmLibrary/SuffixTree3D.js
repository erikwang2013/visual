// AlgorithmLibrary/SuffixTree3D.js — 后缀树：逐个插入后缀，边冲突时「拆边」，共享前缀自动合并
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('SuffixTree3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, ROSE = 0xfb7185, CYAN = 0x67e8f9, VIOLET = 0xa78bfa;
const hint = new VText(scene, { text: '点击「运行后缀树」开始', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const STR = 'banana';

function buildSuffixTree(str) {
  const T = str + '$';
  const nodes = [{ id: 0, parent: -1, start: -1, end: -1, label: '', children: [], suf: null }];
  const steps = [];
  for (let i = 0; i < str.length; i++) {
    steps.push({ type: 'insert', i });
    let node = 0, pos = 0;
    while (true) {
      let child = null;
      for (const c of nodes[node].children) { if (nodes[c].label[0] === T[i + pos]) { child = c; break; } }
      if (child === null) {
        const leaf = nodes.length;
        nodes.push({ id: leaf, parent: node, start: i + pos, end: T.length, label: T.slice(i + pos), children: [], suf: i });
        nodes[node].children.push(leaf);
        steps.push({ type: 'leaf', parent: node, leaf, label: T.slice(i + pos), suf: i });
        break;
      }
      const cl = nodes[child];
      const L = cl.label.length;
      let k = 0;
      while (k < L && i + pos + k < T.length && T[i + pos + k] === cl.label[k]) k++;
      if (k < L) {
        const mid = nodes.length;
        nodes.push({ id: mid, parent: node, start: cl.start, end: cl.start + k, label: cl.label.slice(0, k), children: [], suf: null });
        cl.parent = mid; cl.start += k; cl.label = cl.label.slice(k);
        nodes[node].children[nodes[node].children.indexOf(child)] = mid;
        nodes[mid].children.push(child);
        const rem = T.slice(i + pos + k);
        const leaf = nodes.length;
        nodes.push({ id: leaf, parent: mid, start: i + pos + k, end: T.length, label: rem, children: [], suf: i });
        nodes[mid].children.push(leaf);
        steps.push({ type: 'split', parent: node, old: child, mid, rest: cl.label, leaf, leafLabel: rem, suf: i });
        break;
      }
      node = child; pos += k;
      if (i + pos >= T.length) { nodes[node].suf = i; steps.push({ type: 'exist', node, suf: i }); break; }
    }
  }
  return { nodes, steps };
}
const st = buildSuffixTree(STR);
const N = st.nodes;

// ---- 布局：叶子均匀铺开，内部节点取子节点中点，根强制居中 ----
const xs = new Array(N.length), ys = new Array(N.length), depth = new Array(N.length);
let slot = 0;
function dfsLayout(u, d) {
  depth[u] = d;
  if (N[u].children.length === 0) { xs[u] = -230 + slot * 92; slot++; return; }
  N[u].children.forEach(c => dfsLayout(c, d + 1));
  xs[u] = (xs[N[u].children[0]] + xs[N[u].children[N[u].children.length - 1]]) / 2;
}
dfsLayout(0, 0);
const cx = xs[0];
xs.forEach((x, i) => { xs[i] = x - cx; ys[i] = 225 - depth[i] * 62; });

const nodeObjs = N.map((n, i) =>
  new VNode(scene, { radius: 17, x: xs[i], y: ys[i], z: 0, label: n.suf !== null ? 'S' + n.suf : (i === 0 ? '根' : ''), color: DIM, emissive: DIM }));
const edgeOf = {};
N.forEach((n, i) => {
  if (i === 0) return;
  const p = n.parent;
  const t = tubeBetween(scene, [xs[p], ys[p], 0], [xs[i], ys[i], 0], { color: PALETTE.edge, opacity: 0.12, radius: 2.2 });
  edgeOf[i] = { parent: p, child: i, tube: t, label: n.label };
});
const edgeLabelObjs = N.map((n, i) => {
  if (i === 0) return null;
  const p = n.parent;
  return new VText(scene, { text: n.label, x: (xs[p] + xs[i]) / 2, y: (ys[p] + ys[i]) / 2, z: 0, color: PALETTE.textDim, scale: 0.42 });
});
const suffT = STR.split('').map((ch, i) =>
  new VText(scene, { text: i + ': ' + STR.slice(i) + '$', x: -330, y: -150 + i * 30, z: 0, color: PALETTE.textDim, scale: 0.48 }));
new VText(scene, { text: '后缀树：把「banana」的 6 个后缀全部存进一棵树，共享的前缀自动合并 —— 空间换查找速度', x: 0, y: 225, z: 0, color: PALETTE.textDim, scale: 0.68 });
new VText(scene, { text: '紫色 = 内部节点（有分叉），金色 = 叶子（标记后缀编号 S i）；边上的字 = 路径串；红色幽灵线 = 被拆开的旧边', x: 0, y: -225, z: 0, color: PALETTE.textDim, scale: 0.6 });
const stageT = new VText(scene, { text: '', x: 0, y: 255, z: 0, color: GOLD, scale: 0.72 });
const outT = new VText(scene, { text: '', x: 0, y: -195, z: 0, color: PALETTE.textGlow, scale: 0.62 });

const extras = [];
function addTemp(makeFn) { const o = makeFn(); extras.push(o); return o; }
function clearExtras() { extras.forEach(o => { try { o.remove(); } catch (e) {} }); extras.length = 0; }

function resetAll() {
  engine.clear();
  clearExtras();
  N.forEach((n, i) => {
    nodeObjs[i].setColor(DIM, DIM);
    nodeObjs[i].setText(n.suf !== null ? 'S' + n.suf : (i === 0 ? '根' : ''));
  });
  tubeObjs.forEach(t => { t.tube.material.color.setHex(PALETTE.edge); t.tube.material.opacity = 0.12; });
  suffT.forEach(t => t.setText(t.text, { color: PALETTE.textDim }));
  stageT.setText(''); outT.setText('');
}
const tubeObjs = Object.values(edgeOf).map(e => e);

function runST() {
  resetAll();
  hint.setText('核心思想：所有后缀共用一个根 —— 公共前缀只存一份。插入新后缀 = 沿已有路径走，走到岔路就挂新叶子');
  for (const s of st.steps) {
    if (s.type === 'insert') {
      C(450, () => {
        suffT[s.i].setText(suffT[s.i].text, { color: GOLD });
        stageT.setText(`插入第 ${s.i} 个后缀「${STR.slice(s.i)}」：从根出发，按字符往下找`);
        hint.setText(`后缀 ${s.i} = '${STR.slice(s.i)}$'：先看看前几个字符能不能沿着已有边走`);
      });
    } else if (s.type === 'leaf') {
      C(620, () => {
        clearExtras();
        nodeObjs[s.parent].setColor(VIOLET, VIOLET);
        nodeObjs[s.leaf].setColor(GOLD, GOLD);
        nodeObjs[s.leaf].pulse(0.4);
        const e = edgeOf[s.leaf];
        e.tube.material.color.setHex(GREEN);
        e.tube.material.opacity = 0.95;
        edgeLabelObjs[s.leaf].setText(e.label, { color: GREEN });
        stageT.setText(`没有以「${s.label[0]}」开头的边 → 直接从该节点挂出叶子，标记 S ${s.suf}`);
        hint.setText(`叶子 = 一个完整后缀的终点；从根走到叶子的路径拼起来正好是 '${STR.slice(s.suf)}$'`);
      });
    } else {
      C(950, () => {
        clearExtras();
        nodeObjs[s.parent].setColor(VIOLET, VIOLET);
        nodeObjs[s.mid].setColor(VIOLET, VIOLET);
        nodeObjs[s.mid].pulse(0.4);
        nodeObjs[s.leaf].setColor(GOLD, GOLD);
        addTemp(() => tubeBetween(scene, [xs[s.parent], ys[s.parent], 0], [xs[s.old], ys[s.old], 0], { color: ROSE, opacity: 0.55, radius: 3.2 }));
        const oldLabel = edgeOf[s.old].label;
        edgeLabelObjs[s.old].setText(oldLabel, { color: ROSE });
        [s.mid, s.leaf].forEach(id => { const e = edgeOf[id]; e.tube.material.color.setHex(CYAN); e.tube.material.opacity = 0.9; });
        stageT.setText(`冲突！边「${oldLabel}」只匹配到一半 → 拆出中间节点，剩余部分和新后缀各挂一枝`);
        hint.setText(`旧边 ${s.old} 被拆成两段：${edgeOf[s.mid].label} + ${edgeOf[s.old].label} —— 后缀 ${s.suf} 的叶子挂在中间节点下`);
      });
    }
  }
  C(1000, () => {
    clearExtras();
    let best = { len: 0, lab: '' };
    N.forEach(n => {
      if (n.suf !== null || n.id === 0) return;
      let p = n, lab = '';
      while (p.id !== 0) { lab = p.label + lab; p = N[p.parent]; }
      if (lab.length > best.len) best = { len: lab.length, lab };
    });
    outT.setText(`后缀树完成：${N.length} 节点 / ${STR.length} 叶子 —— 根到叶路径 = 每个后缀；最深分叉 = 「${best.lab}」→ 最长重复子串`);
    status.textContent = `后缀树：${N.length} 节点，${STR.length} 个后缀全部挂载`;
    hint.setText('后缀树的价值：任意模式串匹配 O(m) + 结果数；最长重复子串、DNA 比对、压缩（LZ 的兄弟）全靠它');
  });
  C(1200, () => {
    outT.setText('教学用朴素构建 O(n²)；Ukkonen 算法 O(n) 在线构建 —— 「拆边」正是它的核心操作，这里演示的就是拆边本身');
    hint.setText('应用：基因序列重复检测、字符串搜索索引（后缀数组的树形态）、生物信息学比对工具的核心索引');
  });
}

panel.addButton('运行后缀树', runST);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；6 个后缀依次插入，3 次「拆边」是动画的高潮）');

scene.start(engine);
