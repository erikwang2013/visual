// AlgorithmLibrary/LCP3D.js — LCP 数组（Kasai 算法）：按文本顺序扫后缀，h 借位最多减 1 —— 线性时间算全部相邻后缀的最长公共前缀
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('LCP3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, ROSE = 0xfb7185, CYAN = 0x67e8f9, VIOLET = 0xa78bfa, AMBER = 0xfbbf24;
const hint = new VText(scene, { text: '点击「运行 LCP 数组」开始', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const STR = 'banana';
const N = STR.length;
const SA = [5, 3, 1, 0, 4, 2];
const rank = new Array(N); SA.forEach((x, r) => { rank[x] = r; });

function kasaiSteps(T, SAarr, rankArr) {
  const n = T.length;
  const out = [];
  let h = 0;
  for (let i = 0; i < n; i++) {
    const r = rankArr[i];
    if (r === 0) { out.push({ i, r, skip: true }); continue; }
    const j = SAarr[r - 1];
    const start = Math.max(0, h - 1);
    const walk = [];
    let cur = start;
    while (i + cur < n && j + cur < n && T[i + cur] === T[j + cur]) { walk.push(cur); cur++; }
    out.push({ i, r, j, start, walk, lcp: cur, stopIdx: cur < Math.min(n - i, n - j) ? cur : -1 });
    h = cur;
  }
  return out;
}
const ks = kasaiSteps(STR, SA, rank);
const LCP = new Array(N).fill(0); ks.forEach(s => { if (!s.skip) LCP[s.r] = s.lcp; });
const maxLcp = Math.max(...LCP);
const maxR = LCP.indexOf(maxLcp);

const SX = t => -150 + t * 60;
const cards = SA.map((idx, t) => ({
  idx,
  box: new VBox(scene, { w: 54, h: 46, d: 46, x: SX(t), y: 150, z: 0, label: 'S' + idx, color: DIM, emissive: DIM }),
  sufT: new VText(scene, { text: STR.slice(idx), x: SX(t), y: 185, z: 0, color: PALETTE.textDim, scale: 0.5 })
}));
const lcpSlots = [];
for (let r = 1; r < N; r++) {
  lcpSlots.push({
    r,
    box: new VBox(scene, { w: 40, h: 30, d: 30, x: SX(r) - 30, y: 105, z: 0, label: '', color: DIM, emissive: DIM }),
    lab: new VText(scene, { text: 'LCP' + r, x: SX(r) - 30, y: 82, z: 0, color: PALETTE.textDim, scale: 0.34 })
  });
}
new VText(scene, { text: 'LCP 数组 = 相邻后缀的「最长公共前缀」长度：SA 排序后相邻的串最像，LCP 就是它们的相似度 —— Kasai 用「借位」在线性时间内算完', x: 0, y: 225, z: 0, color: PALETTE.textDim, scale: 0.68 });
new VText(scene, { text: '上方卡片 = 按字典序排列的后缀（S i = 起点 i）；中间插槽 = LCP 值；下方 = 两两比对区（借位段 = 橙色，新比段 = 青色）', x: 0, y: -155, z: 0, color: PALETTE.textDim, scale: 0.6 });
const stageT = new VText(scene, { text: '', x: 0, y: 255, z: 0, color: GOLD, scale: 0.72 });
const outT = new VText(scene, { text: '', x: 0, y: -200, z: 0, color: PALETTE.textGlow, scale: 0.62 });
const hT = new VText(scene, { text: '', x: 0, y: -125, z: 0, color: PALETTE.textGlow, scale: 0.6 });

const extras = [];
function addTemp(makeFn) { const o = makeFn(); extras.push(o); return o; }
function clearExtras() { extras.forEach(o => { try { o.remove(); } catch (e) {} }); extras.length = 0; }

function resetAll() {
  engine.clear();
  clearExtras();
  cards.forEach((c, t) => {
    c.box.setColor(DIM, DIM); c.box.setText('S' + c.idx);
    c.box.moveTo(SX(t), 150, 0, 1);
    c.sufT.setText(STR.slice(c.idx), { color: PALETTE.textDim });
    c.sufT.moveTo(SX(t), 185, 0, 1);
  });
  lcpSlots.forEach(s => { s.box.setColor(DIM, DIM); s.box.setText(''); });
  stageT.setText(''); outT.setText(''); hT.setText('');
}
function cmpBoxes(rowChars, y) {
  return rowChars.split('').map((ch, k) =>
    addTemp(() => new VBox(scene, { w: 30, h: 30, d: 30, x: -150 + k * 60, y, z: 0, label: ch, color: DIM, emissive: DIM })));
}

function runLCP() {
  resetAll();
  hint.setText('Kasai 的钥匙：相邻后缀 i 和 i+1 的 LCP 至少比上一对少 1 —— 所以 h 只减 1 不归零，均摊下来每个字符最多比一次');
  ks.forEach((s, si) => {
    if (s.skip) {
      C(520, () => {
        cards[s.i].box.setColor(ROSE, ROSE);
        stageT.setText(`后缀 ${s.i}「${STR.slice(s.i)}」的 rank = 0：它是字典序第一名，没有前驱，LCP 无从谈起`);
        hint.setText('rank = 0 意味着它是 SA 的第一个 —— 只此一家，跳过它，去比下一对');
      });
      return;
    }
    C(560, () => {
      clearExtras();
      const cI = cards[s.i], cJ = cards[SA.indexOf(s.j)];
      cI.box.setColor(VIOLET, VIOLET); cJ.box.setColor(GOLD, GOLD);
      stageT.setText(`轮到后缀 ${s.i}（rank ${s.r}）：它的前驱 = SA[${s.r - 1}] = ${s.j}，把这对拉下来比`);
      hint.setText(`前驱 = 字典序恰好排在它前一位的后缀 —— 只有相邻的后缀才需要算 LCP，这是 SA 排序的恩赐`);
    });
    C(620, () => {
      s._bi = cmpBoxes(STR.slice(s.i), -30);
      s._bj = cmpBoxes(STR.slice(s.j), -85);
      hT.setText(`h 从上一轮 ${si > 0 ? ks[si - 1].lcp : 0} 借位：max(0, h−1) = ${s.start}`, { color: AMBER });
      if (s.start > 0) {
        for (let k = 0; k < s.start; k++) { s._bi[k].setColor(AMBER, AMBER); s._bj[k].setColor(AMBER, AMBER); }
        stageT.setText(`借位：前 ${s.start} 个字符从上一轮继承，无需重比 —— 这正是 Kasai O(n) 的秘密`);
        hint.setText('为什么只减 1？后缀 i 比后缀 i+1 少开头一个字符 —— 之前匹配的 h 个字符，至少有 h−1 个仍匹配');
      } else {
        stageT.setText(`h = 0：无借位，从头比 —— 但注意 h 很少归零，大部分轮次都能吃上一轮的余粮`);
      }
    });
    s.walk.forEach((k, w) => {
      C(430, () => {
        s._bi[k].setColor(CYAN, CYAN); s._bj[k].setColor(CYAN, CYAN);
        hT.setText(`比对第 ${k + 1} 位：「${STR[s.i + k]}」=「${STR[s.j + k]}」→ 相同，h = ${k + 1}`, { color: CYAN });
      });
    });
    C(560, () => {
      const stop = s.stopIdx;
      if (stop >= 0) { s._bi[stop].setColor(ROSE, ROSE); s._bj[stop].setColor(ROSE, ROSE); }
      lcpSlots[s.r - 1].box.setColor(GOLD, GOLD);
      lcpSlots[s.r - 1].box.setText(String(s.lcp));
      stageT.setText(`停在第 ${s.lcp} 位${stop >= 0 ? `（「${STR[s.i + stop]}」≠「${STR[s.j + stop]}」）` : '（一方已到末尾）'} → LCP${s.r} = ${s.lcp}`);
      hint.setText(stop >= 0
        ? `失配即止：LCP${s.r} = ${s.lcp} 记入插槽 —— 下一轮 h 就从 ${s.lcp} 借位减 1 接着用`
        : `一方见底：整个后缀都是对方的前缀，LCP${s.r} = ${s.lcp} —— 例如「nana」与「na」，短的先走完`);
      hT.setText(`LCP${s.r} = ${s.lcp}（h = ${s.lcp}）`, { color: GOLD });
    });
  });
  C(1000, () => {
    outT.setText(`LCP = [${LCP.join(', ')}] —— 最大 = ${maxLcp}，来自 LCP${maxR}（「${STR.slice(SA[maxR - 1])}」与「${STR.slice(SA[maxR])}」）→ 最长重复子串「${STR.slice(SA[maxR - 1], SA[maxR - 1] + maxLcp)}」`);
    status.textContent = `LCP 数组 = [${LCP.join(', ')}]（Kasai，最大 ${maxLcp}）`;
    hint.setText('SA + LCP 是文本索引双子星：任意两后缀的 LCP = 区间最小值（RMQ）—— 模式匹配 O(m + log n)');
  });
  C(1200, () => {
    outT.setText('Kasai 复杂度 O(n)：每个字符进入 h 的次数有限 —— 朴素两两比对要 O(n²)，借位把均摊压到常数');
    hint.setText('应用：最长重复子串、字符串去重统计、生物信息学 read 比对、搜索引擎词项索引 —— 几乎一切字符串难题的起点');
  });
}

panel.addButton('运行 LCP 数组', runLCP);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；紫色 = 当前后缀，金色 = 前驱，橙色 = 借位段，青色 = 新比段，红色 = 失配处）');

scene.start(engine);
