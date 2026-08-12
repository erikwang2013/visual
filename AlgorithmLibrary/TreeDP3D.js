// AlgorithmLibrary/TreeDP3D.js — 树形DP（没有上司的舞会）：f1[u]=h[u]+Σf0[v]，f0[u]=Σmax(f0[v],f1[v]) 后序遍历，出席父→孩子强制缺席，最终出席者金色高亮（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('TreeDP3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：树形DP（没有上司的舞会）', x: 0, y: 305, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 0, y: 265, z: 0, color: GOLD, scale: 0.72 });
const outT = new VText(scene, { text: '', x: 0, y: -245, z: 0, color: PALETTE.textGlow, scale: 0.62 });
const totalT = new VText(scene, { text: '', x: 0, y: -130, z: 0, color: GOLD, scale: 0.8 });

const NODES = [
  { key: 0, h: 5, kids: [1, 2], pos: [0, 170] },
  { key: 1, h: 3, kids: [3, 4], pos: [-150, 80] },
  { key: 2, h: 7, kids: [5], pos: [150, 80] },
  { key: 3, h: 2, kids: [], pos: [-210, -10] },
  { key: 4, h: 4, kids: [], pos: [-90, -10] },
  { key: 5, h: 6, kids: [], pos: [210, -10] }
];
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
(function collect(u, forcedAbsent) {
  if (!forcedAbsent && pick[u]) { att.push(u); NODES[u].kids.forEach(v => collect(v, true)); }
  else NODES[u].kids.forEach(v => collect(v, false));
})(0, false);
const total = att.reduce((s, u) => s + NODES[u].h, 0);

const nodes = NODES.map(n => new VNode(scene, { radius: 26, x: n.pos[0], y: n.pos[1], z: 0, label: String(n.h), color: BLUE, emissive: BLUE }));
const nameT = NODES.map(n => new VText(scene, { text: '员工' + n.key, x: n.pos[0], y: n.pos[1] + 42, z: 0, color: WHITE, scale: 0.5 }));
const f1T = NODES.map(n => new VText(scene, { text: '', x: n.pos[0] - 40, y: n.pos[1] - 32, z: 0, color: WHITE, scale: 0.45 }));
const f0T = NODES.map(n => new VText(scene, { text: '', x: n.pos[0] + 40, y: n.pos[1] - 32, z: 0, color: WHITE, scale: 0.45 }));
NODES.forEach(n => n.kids.forEach(k => {
  tubeBetween(scene, { x: n.pos[0], y: n.pos[1] - 20, z: 0 }, { x: NODES[k].pos[0], y: NODES[k].pos[1] + 20, z: 0 }, { color: PALETTE.edge, opacity: 0.3, radius: 2 });
}));
new VText(scene, { text: '公司年会：员工与上司不能同时出席，求最大快乐值', x: 0, y: 248, z: 0, color: WHITE, scale: 0.68 });
new VText(scene, { text: '树上两种状态：f1[u] = 出席 = h[u] + Σ f0[v]；f0[u] = 缺席 = Σ max(f0[v], f1[v]) —— 后序遍历自底向上', x: 0, y: -205, z: 0, color: WHITE, scale: 0.62 });

function clearView() {
  nodes.forEach(n => n.setColor(BLUE, BLUE));
  f1T.forEach(t => t.setText('')); f0T.forEach(t => t.setText(''));
  totalT.setText(''); stageT.setText(''); outT.setText('');
}

function* tdGen() {
  yield S(() => outT.setText('后序遍历：孩子算完才能算父亲 —— 树上依赖顺序天然是「先子树，后自己」；每个员工两个状态：f1=出席、f0=缺席'));
  yield W(650);
  yield S(() => stageT.setText('关键洞察：出席的收益不只 h[u]，还搭上「孩子都不能来」的机会成本 —— 所以两种状态都要算'));
  yield W(550);
  for (const s of steps) {
    nodes[s.u].setColor(RED, RED);
    yield S(() => stageT.setText('后序遍历到 员工' + s.u + '（快乐 ' + s.h + '）—— 孩子的 f0/f1 都已就绪'));
    yield W(450);
    nodes[s.u].setColor(s.pick ? GOLD : CYAN, s.pick ? GOLD : CYAN);
    f1T[s.u].setText('出席 ' + s.f1, { color: s.pick ? GOLD : WHITE });
    f0T[s.u].setText('缺席 ' + s.f0, { color: s.pick ? WHITE : CYAN });
    yield S(() => stageT.setText('员工' + s.u + '：出席 = ' + s.f1 + '（' + s.h + ' + Σf0[孩子]），缺席 = ' + s.f0 + '（Σmax(f0[孩子],f1[孩子])）→ ' + (s.pick ? '选择出席（金）' : '选择缺席（青）')));
    yield W(600);
    nodes[s.u].setColor(BLUE, BLUE);
  }
  yield S(() => totalT.setText('总快乐 = ' + total + '：员工 ' + att.join('、') + ' 出席'));
  yield W(650);
  for (const u of att) nodes[u].setColor(GOLD, GOLD);
  yield S(() => stageT.setText('最优方案：e0、e3、e4、e5 出席 → 5 + 2 + 4 + 6 = ' + total + '（出席父 → 孩子强制缺席：e1 缺席则 e3/e4 自由，均出席）'));
  yield W(800);
  yield S(() => outT.setText('关键取舍：e1 的孩子们（2+4=6）比 e1 本人（3）更值钱 → e1 缺席；e2（7）强过孩子 e5（6）→ e2 出席——但 e2 的父 e0 出席，e2 被强制缺席'));
  yield W(750);
  yield S(() => { status.textContent = '树形DP最大快乐 = ' + total + '（e0,e3,e4,e5）'; outT.setText('复杂度 O(n)：一次后序遍历，每节点 O(子节点数) 状态转移；树形 DP 是树上背包的基础'); });
  yield W(600);
}

function* runTD() {
  clearView();
  hint.setText('树形DP：f1[u]=h[u]+Σf0[v]，f0[u]=Σmax(f0[v],f1[v])，后序自底向上');
  yield W(400);
  yield* tdGen();
  yield S(() => { outT.setText(''); hint.setText('树形DP完成：最大快乐 ' + total + '（e0,e3,e4,e5），O(n)'); });
}

engine.queue(() => runTD());
panel.addButton('清空', () => { engine.clear(); clearView(); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；红 = 计算中，青 = 选缺席，金 = 选出席/最终出席者；每个员工旁两个标签：出席 f1 / 缺席 f0）');

scene.start(engine);
