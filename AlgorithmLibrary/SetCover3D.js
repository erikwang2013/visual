// AlgorithmLibrary/SetCover3D.js — 集合覆盖（贪心）：每次选「覆盖最多未覆盖元素」的集合，NP-难问题求近似解
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VBox, VText, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('SetCover3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, ROSE = 0xfb7185, CYAN = 0x67e8f9, WHITE = 0xe2e8f0;
const hint = new VText(scene, { text: '点击「运行集合覆盖」开始', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const SETS = [
  { id: 'S1', elems: [1, 2, 3, 4], y: 100 },
  { id: 'S2', elems: [4, 5], y: 0 },
  { id: 'S3', elems: [5, 6], y: -100 }
];
const U = [1, 2, 3, 4, 5, 6];

function setCover() {
  const covered = new Set();
  const steps = [];
  let round = 1;
  while (covered.size < U.length) {
    const gains = [];
    let best = null, bestGain = -1;
    for (const s of SETS) {
      if (s.chosen) continue;
      const gain = s.elems.filter(e => !covered.has(e)).length;
      gains.push({ id: s.id, gain });
      if (gain > bestGain) { bestGain = gain; best = s; }
    }
    steps.push({ type: 'round', round, gains, best, covered: new Set(covered) });
    best.chosen = true;
    best.elems.forEach(e => covered.add(e));
    steps.push({ type: 'apply', set: best, covered: new Set(covered) });
    round++;
  }
  steps.push({ type: 'final', total: SETS.filter(s => s.chosen).map(s => s.id) });
  return steps;
}
const scSteps = setCover();

const ELEM_X = [-150, -90, -30, 30, 90, 150];
const elems = U.map(i =>
  new VNode(scene, { radius: 22, x: ELEM_X[i - 1], y: 170, z: 0, label: String(i), color: DIM, emissive: DIM }));
const elemT = U.map(i =>
  new VText(scene, { text: '元素' + i, x: ELEM_X[i - 1], y: 206, z: 0, color: PALETTE.textDim, scale: 0.45 }));
const cards = SETS.map(s => ({
  box: new VBox(scene, { w: 110, h: 46, d: 46, x: -350, y: s.y, z: 0, label: s.id, color: DIM, emissive: DIM }),
  info: new VText(scene, { text: '{' + s.elems.join(',') + '}', x: -350, y: s.y + 40, z: 0, color: PALETTE.textDim, scale: 0.5 }),
  gain: new VText(scene, { text: '', x: -350, y: s.y - 40, z: 0, color: CYAN, scale: 0.55 })
}));
const tubes = {};
SETS.forEach(s => s.elems.forEach(e => {
  const t = tubeBetween(scene,
    { x: -350, y: s.y, z: 0 }, { x: ELEM_X[e - 1], y: 170, z: 0 },
    { color: PALETTE.edge, opacity: 0.12, radius: 1.5 });
  tubes[s.id + '-' + e] = t;
}));
function setTube(sid, e, color, op) { const t = tubes[sid + '-' + e]; t.material.color.setHex(color); t.material.opacity = op; }
new VText(scene, { text: '全集 U = {1,2,3,4,5,6}，三个候选集合 —— 选最少的集合覆盖全部元素（NP-难）', x: 0, y: 248, z: 0, color: PALETTE.textDim, scale: 0.68 });
new VText(scene, { text: '贪心策略：每轮选「能覆盖最多未覆盖元素」的集合 —— 局部最大覆盖，希望全局集合数最少', x: 0, y: -205, z: 0, color: PALETTE.textDim, scale: 0.62 });
const coverT = new VText(scene, { text: '', x: 0, y: -130, z: 0, color: GOLD, scale: 0.8 });
const stageT = new VText(scene, { text: '', x: 0, y: 265, z: 0, color: GOLD, scale: 0.72 });
const outT = new VText(scene, { text: '', x: 0, y: -245, z: 0, color: PALETTE.textGlow, scale: 0.62 });

function resetAll() {
  engine.clear();
  elems.forEach(n => n.setColor(DIM, DIM));
  cards.forEach(c => { c.box.setColor(DIM, DIM); c.gain.setText(''); });
  SETS.forEach(s => s.elems.forEach(e => setTube(s.id, e, PALETTE.edge, 0.12)));
  coverT.setText(''); stageT.setText(''); outT.setText('');
}

function runSetCover() {
  resetAll();
  hint.setText('集合覆盖是经典 NP-难问题：最优解要靠暴力尝试所有组合 —— 贪心是 ln n 近似比的工业标准');
  C(700, () => {
    stageT.setText('未覆盖 = {1,2,3,4,5,6} 共 6 个；每轮数一数每个候选集合还能「新覆盖」几个');
    hint.setText('只算新覆盖：S2 的 4 号元素即使已被别的集合盖住也不算它的功劳 —— 避免重复计功');
  });
  for (const s of scSteps) {
    if (s.type === 'final') break;
    if (s.type === 'round') {
      C(650, () => {
        s.gains.forEach(g => {
          const card = cards.find(c => c.box.text === g.id);
          card.gain.setText('新覆盖 +' + g.gain);
          card.box.setColor(CYAN, CYAN);
          const set = SETS.find(x => x.id === g.id);
          set.elems.forEach(e => setTube(g.id, e, CYAN, 0.55));
        });
        stageT.setText(`第 ${s.round} 轮：统计各集合新覆盖数 → S1=4，S2=2，S3=2 → 选覆盖最多的 ${s.best.id}`);
        hint.setText('S1 一出手就吃掉 4 个元素 —— 每轮都「花一份钱买到最大面积」');
      });
      C(600, () => {
        s.gains.forEach(g => {
          if (g.id !== s.best.id) {
            const card = cards.find(c => c.box.text === g.id);
            card.box.setColor(DIM, DIM);
            card.gain.setText('');
            SETS.find(x => x.id === g.id).elems.forEach(e => setTube(g.id, e, PALETTE.edge, 0.12));
          }
        });
      });
    } else {
      const set = s.set, card = cards.find(c => c.box.text === set.id);
      C(700, () => {
        card.box.setColor(GOLD, GOLD);
        card.gain.setText('✓ 选中');
        set.elems.forEach(e => {
          setTube(set.id, e, GOLD, 0.9);
          elems[e - 1].setColor(GOLD, GOLD);
        });
        coverT.setText('已覆盖 ' + s.covered.size + '/6 个元素' + (s.covered.size === U.length ? ' —— 全部覆盖！' : ''));
        stageT.setText(`${set.id} 选中！新覆盖 {${set.elems.join(',')}} → 已覆盖 ${s.covered.size}/6`);
        hint.setText(`当前集合数 = ${SETS.filter(x => x.chosen).length}；若只差 1-2 个元素，也要整组购买 —— 覆盖是「非此即彼」`);
      });
    }
  }
  const fin = scSteps[scSteps.length - 1];
  C(1000, () => {
    coverT.setText('最终覆盖：' + fin.total.join(' + ') + ' = 2 个集合覆盖全部 6 个元素');
    stageT.setText('贪心结束：' + fin.total.join('、') + ' 覆盖全部元素 —— 本例恰好也是最优解');
    hint.setText('贪心顺序：S1（盖 4 个）→ S3（补 2 个）→ 完成。S2 只盖到 5 号，始终不划算');
  });
  C(1100, () => {
    outT.setText('最少集合数 = ' + fin.total.length + '（' + fin.total.join('+') + '）—— 暴力验证：2 个集合只有 S1+S3 能全覆盖，最优确为 2');
    status.textContent = '集合覆盖最少 ' + fin.total.length + ' 个（' + fin.total.join('+') + '）';
    hint.setText('但贪心不是永远最优：某些输入下它会选 ln n 倍的集合 —— 这正是 NP-难问题的宿命');
  });
  C(1300, () => {
    outT.setText('复杂度 O(m·n) 每轮扫描 + 至多 n 轮；应用：广告投放选点位、病毒溯源、传感器布点、快递站点选址');
    hint.setText('变体：加权集合覆盖（集合带成本）→ 按「单位成本覆盖数」排序；精确解用分支定界/整数规划');
  });
}

panel.addButton('运行集合覆盖', runSetCover);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；上方 6 个元素，左侧 3 张集合卡，连线 = 集合与元素的覆盖关系）');

scene.start(engine);
