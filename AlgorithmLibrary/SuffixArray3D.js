// AlgorithmLibrary/SuffixArray3D.js — 后缀数组（倍增法）：每轮按 (rank, rank+2^k) 双关键字排序，直到 rank 全唯一
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('SuffixArray3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, ROSE = 0xfb7185, CYAN = 0x67e8f9;
const hint = new VText(scene, { text: '点击「运行后缀数组」开始', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const STR = 'banana';
const N6 = STR.length;

function doublingSA(text) {
  const n = text.length;
  let rank = text.split('').map(ch => ch.charCodeAt(0));
  const steps = [];
  let k = 1;
  while (true) {
    const pairOf = i => [rank[i], i + k < n ? rank[i + k] : -1];
    const sa = [...Array(n).keys()].sort((a, b) => (rank[a] - rank[b]) || ((rank[a + k] ?? -1) - (rank[b + k] ?? -1)));
    const newRank = new Array(n);
    let r = 0;
    for (let t = 0; t < n; t++) {
      if (t > 0 && (pairOf(sa[t])[0] !== pairOf(sa[t - 1])[0] || pairOf(sa[t])[1] !== pairOf(sa[t - 1])[1])) r++;
      newRank[sa[t]] = r;
    }
    steps.push({ k, sa, pairs: [...Array(n).keys()].map(pairOf), ranks: [...newRank], done: r === n - 1 });
    rank = newRank;
    if (r === n - 1) break;
    k *= 2;
  }
  return steps;
}
const daSteps = doublingSA(STR);
const finalSA = daSteps[daSteps.length - 1].sa;

const SX = t => -150 + t * 60;
const cards = [];
for (let t = 0; t < N6; t++) {
  const idx = t;
  cards.push({
    idx,
    box: new VBox(scene, { w: 54, h: 46, d: 46, x: SX(t), y: 100, z: 0, label: 'S' + idx, color: DIM, emissive: DIM }),
    sufT: new VText(scene, { text: STR.slice(idx), x: SX(t), y: 140, z: 0, color: PALETTE.textDim, scale: 0.55 }),
    pairT: new VText(scene, { text: '', x: SX(t), y: 55, z: 0, color: PALETTE.textDim, scale: 0.5 })
  });
}
const rankT = STR.split('').map((ch, i) =>
  new VText(scene, { text: '', x: SX(i), y: -30, z: 0, color: PALETTE.textDim, scale: 0.5 }));
new VText(scene, { text: '后缀数组 = 把「banana」的 6 个后缀按字典序排成一列 —— 倍增法每轮只做一次排序就能把比较长度翻倍', x: 0, y: 225, z: 0, color: PALETTE.textDim, scale: 0.68 });
new VText(scene, { text: '每张牌 = 一个后缀（上方），牌上数字 S i = 后缀起点；卡片下方显示本轮排序用的关键字对 (k1, k2)', x: 0, y: -95, z: 0, color: PALETTE.textDim, scale: 0.62 });
const stageT = new VText(scene, { text: '', x: 0, y: 255, z: 0, color: GOLD, scale: 0.72 });
const outT = new VText(scene, { text: '', x: 0, y: -150, z: 0, color: PALETTE.textGlow, scale: 0.62 });

function resetAll() {
  engine.clear();
  cards.forEach((c, t) => {
    c.box.setColor(DIM, DIM); c.box.setText('S' + c.idx);
    c.box.moveTo(SX(t), 100, 0, 1);
    c.sufT.setText(STR.slice(c.idx), { color: PALETTE.textDim });
    c.sufT.moveTo(SX(t), 140, 0, 1);
    c.pairT.setText('', { color: PALETTE.textDim });
    c.pairT.moveTo(SX(t), 55, 0, 1);
  });
  rankT.forEach(t => t.setText(''));
  stageT.setText(''); outT.setText('');
}

function runSA() {
  resetAll();
  hint.setText('倍增思想：先按 1 个字符排（字符码当 rank），下一轮按 (rank, rank+1) 排 → 等价于比较 2 个字符；长度每轮翻倍');
  daSteps.forEach((s, ri) => {
    C(600, () => {
      stageT.setText(`第 ${ri + 1} 轮：比较长度 = 2^${Math.log2(s.k) | 0} = ${s.k} 个字符 —— 按 (rank[i], rank[i+${s.k}]) 双关键字排序`);
      hint.setText(s.k === 1
        ? '第 1 轮先给每个字符一个「字母表序号」（a=97, b=98, n=110），再带上下一个字符的序号组成关键字对'
        : `第 2 轮的关键字 = (第 1 轮 rank[i], 第 1 轮 rank[i+${s.k}]) —— 每个关键字对已经代表了 2 个字符的比较结果`);
      s.sa.forEach((idx, t) => {
        const c = cards[idx];
        c.box.moveTo(SX(t), 100, 0, 550);
        c.sufT.moveTo(SX(t), 140, 0, 550);
        c.pairT.moveTo(SX(t), 55, 0, 550);
      });
    });
    C(700, () => {
      s.sa.forEach((idx, t) => {
        const c = cards[idx];
        const [k1, k2] = s.pairs[idx];
        c.pairT.setText(`(${k1}, ${k2})`, { color: PALETTE.textDim });
        c.box.setText('S' + idx);
      });
      s.sa.forEach((idx, t) => {
        const tied = t > 0 && s.pairs[s.sa[t]][0] === s.pairs[s.sa[t - 1]][0] && s.pairs[s.sa[t]][1] === s.pairs[s.sa[t - 1]][1];
        if (tied) { cards[idx].box.setColor(ROSE, ROSE); cards[idx].pairT.setText(`(${s.pairs[idx][0]}, ${s.pairs[idx][1]})`, { color: ROSE }); }
        else { cards[idx].box.setColor(CYAN, CYAN); cards[idx].pairT.setText(`(${s.pairs[idx][0]}, ${s.pairs[idx][1]})`, { color: CYAN }); }
      });
      rankT.forEach((t, i) => t.setText(`r[${i}] = ${s.ranks[i]}`, { color: PALETTE.textDim }));
      stageT.setText(`排序完成 → SA = [${s.sa.join(', ')}]，新 rank = [${s.ranks.join(', ')}]`);
      hint.setText(s.done
        ? '所有 rank 各不相同 → 字典序已经定死，排序结束！（共 ' + s.sa.length + ' 个后缀）'
        : '存在并列的 rank（红色 = 并列）→ 长度翻倍，再来一轮，直到没有并列');
    });
  });
  C(1000, () => {
    finalSA.forEach((idx, t) => { cards[idx].box.setColor(GOLD, GOLD); });
    outT.setText(`SA = [${finalSA.join(', ')}]：后缀按字典序 = a, ana, anana, banana, na, nana —— 朴素排序 O(n² log n)，倍增只需 O(n log n)`);
    status.textContent = `后缀数组 = [${finalSA.join(', ')}]（倍增法 ${daSteps.length} 轮）`;
    hint.setText('后缀数组配合 LCP 数组（下一页面）：O(m + log n) 模式匹配、最长公共子串、回文检测的利器');
  });
  C(1200, () => {
    outT.setText('倍增 + 基数排序可做到 O(n log n)；配合 DC3/SA-IS 线性算法 —— 大数据文本索引的标准结构（如全基因组比对）');
    hint.setText('应用：搜索引擎后缀索引、全文检索、生物信息学（BWT 变换就是后缀数组的兄弟）');
  });
}

panel.addButton('运行后缀数组', runSA);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；每轮卡片物理重排，红色 = 本轮并列的关键字对，金色 = 最终排序）');

scene.start(engine);
