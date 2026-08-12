// AlgorithmLibrary/Graham3D.js — Graham 扫描凸包：找最低点 → 极角排序 → 单调栈「左转判定」（cross≤0 弹栈）→ 凸包闭环（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Graham3D');

const scene = new Scene3D('scene', { cameraPos: [0, 300, 620], fov: 50 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：Graham 扫描求 12 点凸包', x: 0, y: 260, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 0, y: 222, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: -70, z: 0, color: PALETTE.textGlow, scale: 0.56 });
const outT = new VText(scene, { text: '', x: 0, y: -150, z: 0, color: PALETTE.textGlow, scale: 0.62 });

const PTS = [[-180, 40], [120, 90], [220, -30], [60, -120], [-60, -160], [-200, -90], [-260, 0], [160, 150], [20, 170], [-120, 120], [0, -40], [-40, 60]];
const nodes = PTS.map((p, i) => new VNode(scene, { radius: 13, x: p[0], y: p[1], z: 0, label: String(i), color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
let edgeMeshes = new Map();
const P = i => ({ x: PTS[i][0], y: PTS[i][1], z: 0 });
const cross = (i, j, k) => (PTS[j][0] - PTS[i][0]) * (PTS[k][1] - PTS[i][1]) - (PTS[j][1] - PTS[i][1]) * (PTS[k][0] - PTS[i][0]);
const setCol = (i, c) => nodes[i].setColor(c, c);
function clearEdges() { edgeMeshes.forEach(m => scene.remove(m)); edgeMeshes = new Map(); }
function addEdge(i, j, color, opacity, radius) {
  edgeMeshes.set(i + '-' + j, tubeBetween(scene, P(i), P(j), { color, opacity, radius }));
}
function resetColors() { nodes.forEach((n, i) => setCol(i, PALETTE.node)); }

function* grahamGen() {
  let p0 = 0;
  for (let i = 1; i < PTS.length; i++) {
    if (PTS[i][1] < PTS[p0][1] || (PTS[i][1] === PTS[p0][1] && PTS[i][0] < PTS[p0][0])) p0 = i;
  }
  setCol(p0, RED);
  yield S(() => { stageT.setText('第一步：找最低点 p0 = 点 ' + p0 + '（红，y 最小，平局取最左）'); eqT.setText('p0 = (' + PTS[p0][0] + ', ' + PTS[p0][1] + ')'); });
  yield W(700);
  const ang = v => Math.atan2(v[1] - PTS[p0][1], v[0] - PTS[p0][0]);
  const rest = [];
  for (let i = 0; i < PTS.length; i++) if (i !== p0) rest.push(i);
  rest.sort((a, b) => ang(PTS[a]) - ang(PTS[b]));
  yield S(() => { stageT.setText('第二步：其余点按极角排序（相对 p0 的辐角，逆时针）'); eqT.setText('排序后：' + rest.join(' → ')); });
  rest.forEach((i, k) => {
    setCol(i, ORANGE);
    if (k > 0) addEdge(rest[k - 1], i, ORANGE, 0.25, 1.5);
  });
  yield W(1000);
  const stack = [p0];
  setCol(rest[0], GREEN);
  stack.push(rest[0]);
  yield S(() => { stageT.setText('第三步：单调栈 —— 压入 p0 与第一个点（绿）'); eqT.setText('栈：' + stack.join(' → ')); });
  yield W(600);
  for (let k = 1; k < rest.length; k++) {
    const p = rest[k];
    setCol(p, CYAN);
    yield S(() => stageT.setText('考察点 ' + p + '（青）—— 检查栈顶两点相对它的转向'));
    yield W(450);
    while (stack.length >= 2 && cross(stack[stack.length - 2], stack[stack.length - 1], p) <= 0) {
      const pop = stack.pop();
      setCol(pop, RED);
      yield S(() => { stageT.setText('cross ≤ 0 → 右转/共线：弹出 ' + pop + '（红）—— 它不可能是凸包顶点'); eqT.setText('cross(' + stack[stack.length - 2] + ', ' + pop + ', ' + p + ') = ' + cross(stack[stack.length - 2], pop, p).toFixed(0)); });
      yield W(550);
    }
    stack.push(p);
    setCol(p, GREEN);
    clearEdges();
    for (let i = 0; i + 1 < stack.length; i++) addEdge(stack[i], stack[i + 1], GREEN, 0.7, 3);
    const c = cross(stack[stack.length - 2], stack[stack.length - 3], p);
    yield S(() => { stageT.setText('cross > 0 → 左转：压入 ' + p + '（绿）'); eqT.setText('cross(' + stack[stack.length - 3] + ', ' + stack[stack.length - 2] + ', ' + p + ') = ' + c.toFixed(0) + ' > 0 → 栈 = ' + stack.join(' → ')); });
    yield W(600);
  }
  clearEdges();
  for (let i = 0; i + 1 < stack.length; i++) addEdge(stack[i], stack[i + 1], GOLD, 0.9, 4);
  addEdge(stack[stack.length - 1], stack[0], GOLD, 0.9, 4);
  stack.forEach(i => setCol(i, GOLD));
  yield S(() => { outT.setText('凸包完成：' + stack.join(' → ') + ' → ' + stack[0] + '（闭环）—— 12 点中只有 ' + stack.length + ' 个在凸包上'); status.textContent = '凸包顶点：' + stack.join(', '); });
  yield W(1100);
  yield S(() => { hint.setText('复杂度：排序 O(n log n) + 扫描 O(n)（每点至多进/出栈各一次）—— 凸包是碰撞检测、最远点对、旋转卡壳的地基'); outT.setText('应用：多边形简化、地理围栏、最小包围盒 —— 叉积符号 = 转向判定：>0 左转 / <0 右转 / =0 共线'); });
  yield W(1100);
  yield S(() => { hint.setText('Graham 扫描演示完成：凸包 = ' + stack.join(' → ') + ' → 闭环'); outT.setText(''); resetColors(); });
  yield W(400);
}

function* runGraham() {
  hint.setText('Graham 扫描：找最低点 → 排序 → 左转栈');
  yield W(400);
  yield* grahamGen();
}

engine.queue(() => runGraham());
panel.addButton('清空', () => { engine.clear(); clearEdges(); resetColors(); stageT.setText(''); eqT.setText(''); outT.setText(''); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；红 = 最低点 p0，橙 = 极角排序链，青 = 当前考察，绿 = 栈内顶点，红 = 被弹出，金 = 最终凸包）');

scene.start(engine);
