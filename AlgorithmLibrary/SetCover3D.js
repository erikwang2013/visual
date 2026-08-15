// AlgorithmLibrary/SetCover3D.js — 集合覆盖（贪心）：每轮选「新覆盖最多未覆盖元素」的集合 —— 本例 S1+S3 两个集合覆盖全部 6 个元素（function* 生成器驱动，解说入状态栏）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VBox, VText, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('SetCover3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GOLD = 0xfcd34d, DIM = 0x334155, CYAN = 0x67e8f9;
const status = panel.addStatus('就绪');

const SETS = [
  { id: 'S1', elems: [1, 2, 3, 4], y: 400 },
  { id: 'S2', elems: [4, 5], y: 300 },
  { id: 'S3', elems: [5, 6], y: 200 }
];
const U = [1, 2, 3, 4, 5, 6];

const scSteps = (() => {
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
})();
const FIN = scSteps[scSteps.length - 1];

// ---- 预建对象（模块级，运行期仅改颜色/文字/连线透明度）----
const ELEM_X = [170, 230, 290, 350, 410, 470];
const elems = U.map(i =>
  new VNode(scene, { radius: 22, x: ELEM_X[i - 1], y: 470, z: 0, label: String(i), color: DIM, emissive: DIM }));
const cards = SETS.map(s => ({
  box: new VBox(scene, { w: 110, h: 46, d: 46, x: -30, y: s.y, z: 0, label: s.id, color: DIM, emissive: DIM }),
  info: new VText(scene, { text: '{' + s.elems.join(',') + '}', x: -30, y: s.y + 40, z: 0, color: PALETTE.textDim, scale: 0.5 }),
  gain: new VText(scene, { text: '', x: -30, y: s.y - 40, z: 0, color: CYAN, scale: 0.55 })
}));
const cardOf = id => cards[SETS.findIndex(s => s.id === id)];
const tubes = {};
SETS.forEach(s => s.elems.forEach(e => {
  const t = tubeBetween(scene,
    { x: -30, y: s.y, z: 0 }, { x: ELEM_X[e - 1], y: 470, z: 0 },
    { color: PALETTE.edge, opacity: 0.12, radius: 1.5 });
  tubes[s.id + '-' + e] = t;
}));
const setTube = (sid, e, color, op) => { const t = tubes[sid + '-' + e]; t.material.color.setHex(color); t.material.opacity = op; };

function resetAll() {
  elems.forEach(n => n.setColor(DIM, DIM));
  cards.forEach(c => { c.box.setColor(DIM, DIM); c.gain.setText(''); });
  SETS.forEach(s => s.elems.forEach(e => setTube(s.id, e, PALETTE.edge, 0.12)));
}

function* scGen() {
  resetAll();
  yield S(() => { status.textContent = '集合覆盖（贪心）：每轮选「新覆盖最多未覆盖元素」的集合，直到 6 个元素全部被盖住。候选集合：S1={1,2,3,4}、S2={4,5}、S3={5,6}'; });
  yield W(900);
  for (const st of scSteps) {
    if (st.type === 'final') break;
    if (st.type === 'round') {
      yield S(() => {
        st.gains.forEach(g => {
          const c = cardOf(g.id);
          c.box.setColor(CYAN, CYAN);
          c.gain.setText('+' + g.gain);
          SETS.find(x => x.id === g.id).elems.forEach(e => setTube(g.id, e, CYAN, 0.55));
        });
        status.textContent = '第 ' + st.round + ' 轮：只数「新覆盖」—— ' + st.gains.map(g => g.id + '=+' + g.gain).join('、') + ' → 选最多者 ' + st.best.id;
      });
      yield W(700);
      yield S(() => {
        st.gains.forEach(g => {
          if (g.id !== st.best.id) {
            const c = cardOf(g.id);
            c.box.setColor(DIM, DIM);
            c.gain.setText('');
            SETS.find(x => x.id === g.id).elems.forEach(e => setTube(g.id, e, PALETTE.edge, 0.12));
          }
        });
        status.textContent = '其余集合本回合落选（新覆盖数已计入对比，下一轮重新统计）';
      });
      yield W(500);
    } else {
      const set = st.set, c = cardOf(set.id);
      yield S(() => {
        c.box.setColor(GOLD, GOLD);
        set.elems.forEach(e => {
          setTube(set.id, e, GOLD, 0.9);
          elems[e - 1].setColor(GOLD, GOLD);
        });
        status.textContent = set.id + ' 选中：新覆盖 {' + set.elems.join(',') + '} → 已覆盖 ' + st.covered.size + '/6';
      });
      yield W(800);
    }
  }
  yield S(() => { status.textContent = '贪心结束：' + FIN.total.join(' + ') + ' 共 2 个集合覆盖全部 6 个元素 —— 暴力验证 2 个集合的组合中仅 S1+S3 能全覆盖，本例贪心恰为最优解'; });
  yield W(1100);
  yield S(() => { status.textContent = 'SetCover 演示完成：贪心依次选中 S1（新覆盖 4 个）→ S3（补 2 个），2 个集合覆盖全部 6 个元素；复杂度：每轮 O(m·n) 扫描 + 至多 n 轮，贪心为 ln n 近似比（NP-难）'; });
  yield W(900);
}

engine.queue(() => scGen());
panel.addButton('清空', () => { engine.clear(); resetAll(); status.textContent = ''; });

scene.start(engine);
