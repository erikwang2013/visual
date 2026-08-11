// AlgorithmLibrary/TreeDP3D.js — 树形DP（没有上司的舞会）：f1[u]=h[u]+Σf0[v]，f0[u]=Σmax(f0[v],f1[v])，后序遍历
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('TreeDP3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, ROSE = 0xfb7185, CYAN = 0x67e8f9, WHITE = 0xe2e8f0;
const hint = new VText(scene, { text: '点击「运行树形DP」开始', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const NODES = [
  { key: 0, h: 5, kids: [1, 2], pos: [0, 170] },
  { key: 1, h: 3, kids: [3, 4], pos: [-150, 80] },
  { key: 2, h: 7, kids: [5], pos: [150, 80] },
  { key: 3, h: 2, kids: [], pos: [-210, -10] },
  { key: 4, h: 4, kids: [], pos: [-90, -10] },
  { key: 5, h: 6, kids: [], pos: [210, -10] }
];

function treeDP() {
  const f0 = {}, f1 = {}, pick = {};
  const steps = [];
  const post = [];
  (function dfs(u, vis) {
    vis[u] = 1;
    NODES[u].kids.forEach(v => { if (!vis[v]) dfs(v, vis); });
    post.push(u);
  })(0, {});
  for (const u of post) {
    let a = NODES[u].h, b = 0;
    NODES[u].kids.forEach(v => { a += f0[v]; b += Math.max(f0[v], f1[v]); });
    f1[u] = a; f0[u] = b; pick[u] = a >= b;
    steps.push({ u, f1: a, f0: b, pick: pick[u], h: NODES[u].h });
  }
  const att = [];
  (function collect(u) {
    if (pick[u]) att.push(u);
    else NODES[u].kids.forEach(v => collect(v));
  })(0);
  steps.push({ type: 'final', att, total: att.reduce((s, u) => s + NODES[u].h, 0) });
  return steps;
}
const tpSteps = treeDP();

const nodes = NODES.map(n =>
  new VNode(scene, { radius: 26, x: n.pos[0], y: n.pos[1], z: 0, label: String(n.h), color: DIM, emissive: DIM }));
const nameT = NODES.map(n =>
  new VText(scene, { text: '员工' + n.key, x: n.pos[0], y: n.pos[1] + 42, z: 0, color: PALETTE.textDim, scale: 0.5 }));
const f1T = NODES.map(n =>
  new VText(scene, { text: '', x: n.pos[0] - 40, y: n.pos[1] - 32, z: 0, color: PALETTE.textDim, scale: 0.45 }));
const f0T = NODES.map(n =>
  new VText(scene, { text: '', x: n.pos[0] + 40, y: n.pos[1] - 32, z: 0, color: PALETTE.textDim, scale: 0.45 }));
NODES.forEach(n => n.kids.forEach(k => {
  tubeBetween(scene,
    { x: n.pos[0], y: n.pos[1] - 20, z: 0 }, { x: NODES[k].pos[0], y: NODES[k].pos[1] + 20, z: 0 },
    { color: PALETTE.edge, opacity: 0.3, radius: 2 });
}));
const totalT = new VText(scene, { text: '', x: 0, y: -130, z: 0, color: GOLD, scale: 0.8 });
new VText(scene, { text: '公司开年会：员工与直属上司不能同时出席，每人有快乐值 h —— 求最大总快乐值（父子互斥）', x: 0, y: 248, z: 0, color: PALETTE.textDim, scale: 0.68 });
new VText(scene, { text: '树上两种状态：f1[u] = 出席 = h[u] + Σ f0[v]；f0[u] = 缺席 = Σ max(f0[v], f1[v]) —— 后序遍历自底向上', x: 0, y: -205, z: 0, color: PALETTE.textDim, scale: 0.62 });
const stageT = new VText(scene, { text: '', x: 0, y: 265, z: 0, color: GOLD, scale: 0.72 });
const outT = new VText(scene, { text: '', x: 0, y: -245, z: 0, color: PALETTE.textGlow, scale: 0.62 });

function resetAll() {
  engine.clear();
  nodes.forEach(n => n.setColor(DIM, DIM));
  f1T.forEach(t => t.setText('')); f0T.forEach(t => t.setText(''));
  totalT.setText(''); stageT.setText(''); outT.setText('');
}

function runTreeDP() {
  resetAll();
  hint.setText('后序遍历：孩子算完才能算父亲 —— 树上依赖顺序天然是「先子树，后自己」');
  C(700, () => {
    stageT.setText('每个员工两个状态：f1 = 出席（孩子全部缺席），f0 = 缺席（孩子随意取最大）');
    hint.setText('关键洞察：出席的收益不只 h[u]，还搭上「孩子都不能来」的机会成本 —— 所以两种状态都要算');
  });
  for (const s of tpSteps) {
    if (s.type === 'final') break;
    C(600, () => {
      nodes[s.u].setColor(ROSE, ROSE);
      stageT.setText(`后序遍历到 员工${s.u}（快乐 ${s.h}）—— 孩子的 f0/f1 都已就绪`);
      hint.setText(s.u === 0 ? '根节点：全局答案就在它的两个状态里' : `f1[${s.u}] = ${s.h} + Σ f0[孩子]；f0[${s.u}] = Σ max(f0[孩子], f1[孩子])`);
    });
    C(700, () => {
      nodes[s.u].setColor(s.pick ? GOLD : CYAN, s.pick ? GOLD : CYAN);
      f1T[s.u].setText('出席 ' + s.f1, { color: s.pick ? GOLD : PALETTE.textDim });
      f0T[s.u].setText('缺席 ' + s.f0, { color: s.pick ? PALETTE.textDim : CYAN });
      stageT.setText(`员工${s.u}：出席 = ${s.f1}，缺席 = ${s.f0} → ${s.pick ? '选择出席（金色）' : '选择缺席（青色）'}`);
      hint.setText(s.pick ? `出席 ${s.f1} ≥ 缺席 ${s.f0} —— 他本人加上孩子们都不来更划算` : `缺席 ${s.f0} > 出席 ${s.f1} —— 孩子们的价值加起来超过他本人`);
    });
  }
  C(1000, () => {
    const att = tpSteps[tpSteps.length - 1].att;
    nodes.forEach((n, i) => { n.setColor(att.includes(i) ? GREEN : DIM, att.includes(i) ? GREEN : DIM); });
    totalT.setText('总快乐 = ' + tpSteps[tpSteps.length - 1].total + '：员工 ' + att.join('、') + ' 出席');
    stageT.setText('最优方案：e0、e3、e4、e5 出席 → 5 + 2 + 4 + 6 = 17（金色=出席，灰色=缺席）');
    hint.setText('关键取舍：e1 的孩子们（2+4=6）比 e1 本人（3）更值钱 → e1 缺席；e2（7）强过孩子 e5（6）→ e2 出席');
  });
  C(1100, () => {
    outT.setText('最优总快乐 = 17 —— 对比「贪心选最大 h」：e2(7) 和 e5(6) 不能同台，贪心会踩坑，DP 全局最优');
    status.textContent = '树形DP最大快乐 = 17（e0,e3,e4,e5）';
    hint.setText('若先让 e2、e5 一起算：e2 出席 = 7，e5 出席 = 6，但 e0 出席（5）+孙辈（12）= 17 才是全局最优');
  });
  C(1300, () => {
    outT.setText('复杂度 O(n)：一次后序遍历，每节点 O(子节点数) 状态转移；树形 DP 是树上背包的基础');
    hint.setText('应用：公司年会排座、树上最大独立集、树形背包 —— 状态 = 与父节点的关系约束');
  });
}

panel.addButton('运行树形DP', runTreeDP);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；每个员工旁两个标签：出席 f1 / 缺席 f0，金色 = 最终选择）');

scene.start(engine);
