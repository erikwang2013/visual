// AlgorithmLibrary/SuffixAutomaton3D.js — 后缀自动机 SAM：在线逐个加字符，转移 + 后缀链接 + 克隆，O(n) 状态 ≤ 2n−1
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('SuffixAutomaton3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, ROSE = 0xfb7185, CYAN = 0x67e8f9, VIOLET = 0xa78bfa, AMBER = 0xfbbf24;
const hint = new VText(scene, { text: '点击「运行后缀自动机」开始', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const STR = 'banana';

function buildSAM(text) {
  const states = [{ len: 0, link: -1, next: {} }];
  let last = 0;
  const steps = [];
  for (const ch of text) {
    const cur = states.length;
    states.push({ len: states[last].len + 1, link: -1, next: {} });
    const op = { char: ch, cur, trans1: [], trans2: [], clones: [], linkChg: [] };
    let p = last;
    while (p !== -1 && !(ch in states[p].next)) { states[p].next[ch] = cur; op.trans1.push(p); p = states[p].link; }
    if (p === -1) { states[cur].link = 0; op.linkChg.push([cur, 0]); }
    else {
      const q = states[p].next[ch];
      if (states[p].len + 1 === states[q].len) { states[cur].link = q; op.linkChg.push([cur, q]); }
      else {
        const clone = states.length;
        states.push({ len: states[p].len + 1, link: states[q].link, next: { ...states[q].next } });
        op.clones.push(clone);
        while (p !== -1 && states[p].next[ch] === q) { states[p].next[ch] = clone; op.trans2.push(p); p = states[p].link; }
        states[q].link = clone; states[cur].link = clone;
        op.linkChg.push([q, clone], [cur, clone]);
      }
    }
    last = cur;
    steps.push(op);
  }
  return { states, steps };
}
const sam = buildSAM(STR);
const NS = sam.states.length;

// ---- 布局：按 len 分层 ----
const levels = {};
sam.states.forEach((s, id) => { (levels[s.len] = levels[s.len] || []).push(id); });
const posX = new Array(NS), posY = new Array(NS);
for (const L of Object.keys(levels).map(Number).sort((a, b) => a - b)) {
  const ids = levels[L];
  ids.forEach((id, t) => {
    posX[id] = ids.length === 1 ? 0 : -100 + t * (200 / (ids.length - 1));
    posY[id] = 225 - L * 40;
  });
}
const nodeObjs = sam.states.map((s, id) =>
  new VNode(scene, { radius: 16, x: posX[id], y: posY[id], z: 0, label: String(id), color: DIM, emissive: DIM }));
const lenT = sam.states.map((s, id) =>
  new VText(scene, { text: 'len ' + s.len, x: posX[id], y: posY[id] - 30, z: 0, color: PALETTE.textDim, scale: 0.4 }));
new VText(scene, { text: '后缀自动机：接受「banana」的所有子串。边 = 转移（读一个字符跳向另一个状态），玫瑰斜线 = 后缀链接', x: 0, y: 225, z: 0, color: PALETTE.textDim, scale: 0.68 });
new VText(scene, { text: '构建 = 每次加一个字符：新状态 + 一串新转移；必要时「克隆」旧状态（金色）保存不变量 —— 状态数 ≤ 2n−1', x: 0, y: -225, z: 0, color: PALETTE.textDim, scale: 0.6 });
const stageT = new VText(scene, { text: '', x: 0, y: 255, z: 0, color: GOLD, scale: 0.72 });
const outT = new VText(scene, { text: '', x: 0, y: -195, z: 0, color: PALETTE.textGlow, scale: 0.62 });

const extras = [];
function clearExtras() { extras.forEach(o => { try { o.remove(); } catch (e) {} }); extras.length = 0; }
function addEdge(a, b, color, opacity, zOff, label) {
  const t = tubeBetween(scene, [posX[a], posY[a], zOff], [posX[b], posY[b], zOff], { color, opacity, radius: 2 });
  extras.push(t);
  if (label !== undefined) {
    const mid = [(posX[a] + posX[b]) / 2, (posY[a] + posY[b]) / 2];
    const txt = new VText(scene, { text: label, x: mid[0], y: mid[1] + (zOff ? 8 : 4), z: zOff, color: GREEN, scale: 0.42 });
    extras.push(txt);
  }
}

function resetAll() {
  engine.clear();
  clearExtras();
  nodeObjs.forEach((n, id) => {
    n.setColor(id === 0 ? CYAN : DIM, id === 0 ? CYAN : DIM);
    n.setText(String(id));
  });
  lenT.forEach(t => t.setText(t.text, { color: PALETTE.textDim }));
  stageT.setText(''); outT.setText('');
}

function runSAM() {
  resetAll();
  hint.setText('自动机 = 状态 + 转移的图：从根出发读一个子串，跟着字符走，能走通就说明它是子串 —— 现在把图建出来');
  sam.steps.forEach((op, si) => {
    C(600, () => {
      nodeObjs[op.cur].setColor(VIOLET, VIOLET);
      nodeObjs[op.cur].pulse(0.4);
      stageT.setText(`第 ${si + 1} 个字符「${op.char}」：新状态 ${op.cur}（len = ${sam.states[op.cur].len}）诞生`);
      hint.setText('新状态 cur 的 len = 原 last 的 len + 1 —— 它是「读到最长后缀」的终点');
    });
    op.trans1.forEach((p, t1) => {
      C(420, () => {
        addEdge(p, op.cur, CYAN, 0.85, 0, op.char);
        if (p !== op.cur) nodeObjs[p].pulse(0.25);
        stageT.setText(`沿后缀链接上溯：状态 ${p} 补上转移「${op.char}」→ ${op.cur}`);
        hint.setText('凡是缺少该字符转移的 suffix 祖先，都补一条到 cur 的边 —— 保证「读任意前缀都能往下走」');
      });
    });
    op.clones.forEach((cl, ci) => {
      C(750, () => {
        nodeObjs[cl].setColor(AMBER, AMBER);
        nodeObjs[cl].pulse(0.45);
        stageT.setText(`克隆！状态 ${cl} 复制其引用的转移表，len = 祖先的 len + 1`);
        hint.setText('克隆条件：maxlen[p]+1 ≠ maxlen[q] → 直接指 q 会丢长度信息，必须造一个「长度中间态」clone');
      });
    });
    op.trans2.forEach((p, t2) => {
      C(420, () => {
        addEdge(p, op.clones[0], GREEN, 0.8, 0, op.char);
        stageT.setText(`重定向：状态 ${p} 的「${op.char}」转移改指克隆 ${op.clones[0]}`);
      });
    });
    op.linkChg.forEach(([from, to]) => {
      C(420, () => {
        addEdge(from, to, ROSE, 0.5, 8, undefined);
        stageT.setText(`后缀链接：${from} → ${to}（读最长真后缀后应处的状态）`);
      });
    });
    C(350, () => {
      stageT.setText(`字符「${op.char}」处理完毕 —— 继续`);
      hint.setText('后缀链接 = 失败指针：子串匹配失配时沿着它回退，这就是 SAM 能做「所有子串索引」的秘密');
    });
  });
  const transCount = sam.states.reduce((s, st) => s + Object.keys(st.next).length, 0);
  const cloneCount = sam.steps.reduce((s, op) => s + op.clones.length, 0);
  C(1000, () => {
    outT.setText(`SAM 完成：${NS} 状态 / ${transCount} 转移 / ${cloneCount} 个克隆 —— 状态数 ≤ 2n−1 = ${2 * STR.length - 1}，转移数 ≤ 3n−4`);
    status.textContent = `后缀自动机：${NS} 状态，${transCount} 转移（${cloneCount} 克隆）`;
    hint.setText('它同时是：所有子串的 DFA、后缀树的对偶、回文算法（Eertree 前身）的基础 —— 一个结构三种用途');
  });
  C(1200, () => {
    outT.setText('构建 O(n) 在线：每个字符均摊 O(1) 次转移补边。应用：多模式匹配、字典序第 k 小子串、最长公共子串');
    hint.setText('对比后缀树：SAM 是「最小 DFA」更省状态；对比 AC 自动机：SAM 一次构建支持任意模式串查询');
  });
}

panel.addButton('运行后缀自动机', runSAM);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；青色边 = 转移，玫瑰色斜线 = 后缀链接，金色 = 克隆状态，绿色 = 重定向边）');

scene.start(engine);
