// AlgorithmLibrary/Graham3D.js — Graham 扫描凸包：找最低点 → 极角排序 → 单调栈「左转判定」（cross≤0 弹栈）→ 凸包闭环（function* 生成器驱动，解说入状态栏）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Graham3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, WHITE = 0xffffff;
const status = panel.addStatus('就绪');

const PTS = [[140, 340], [440, 390], [540, 270], [380, 180], [260, 140], [120, 210], [60, 300], [480, 450], [340, 470], [200, 420], [320, 260], [280, 360]];
const nodes = PTS.map((p, i) => new VNode(scene, { radius: 13, x: p[0], y: p[1], z: 0, label: String(i), color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
const cross = (i, j, k) => (PTS[j][0] - PTS[i][0]) * (PTS[k][1] - PTS[i][1]) - (PTS[j][1] - PTS[i][1]) * (PTS[k][0] - PTS[i][0]);
const setCol = (i, c) => nodes[i].setColor(c, c);
function resetColors() { nodes.forEach((n, i) => setCol(i, PALETTE.node)); }

// ---- 边池：模块级预建（峰值 12 条，池 14），运行期仅改曲线/颜色/显隐 ----
const edgePool = [], edgeFree = [];
for (let i = 0; i < 14; i++) {
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0)]);
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, 3, 6, false), new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.9 }));
  tube.visible = false; scene.add(tube);
  edgePool.push({ tube, curve });
}
const edgeMeshes = new Map();
function clearEdges() {
  edgeMeshes.forEach(s => { s.tube.visible = false; });
  edgeMeshes.clear();
  edgeFree.length = 0; edgeFree.push(...edgePool);
}
function addEdge(i, j, color, opacity, radius) {
  const s = edgeFree.pop(); if (!s) return;
  s.curve.points[0].set(PTS[i][0], PTS[i][1], 0);
  s.curve.points[1].set(PTS[j][0], PTS[j][1], 0);
  s.tube.geometry.dispose();
  s.tube.geometry = new THREE.TubeGeometry(s.curve, 10, radius || 3, 6, false);
  s.tube.material.color.setHex(color); s.tube.material.opacity = opacity;
  s.tube.visible = true;
  edgeMeshes.set(i + '-' + j, s);
}

function* grahamGen() {
  let p0 = 0;
  for (let i = 1; i < PTS.length; i++) {
    if (PTS[i][1] < PTS[p0][1] || (PTS[i][1] === PTS[p0][1] && PTS[i][0] < PTS[p0][0])) p0 = i;
  }
  setCol(p0, RED);
  yield S(() => { status.textContent = '第一步：找最低点 p0 = 点 ' + p0 + '（红，y 最小，平局取最左）：(' + PTS[p0][0] + ', ' + PTS[p0][1] + ')'; });
  yield W(700);
  const ang = v => Math.atan2(v[1] - PTS[p0][1], v[0] - PTS[p0][0]);
  const rest = [];
  for (let i = 0; i < PTS.length; i++) if (i !== p0) rest.push(i);
  rest.sort((a, b) => ang(PTS[a]) - ang(PTS[b]));
  rest.forEach((i, k) => {
    setCol(i, ORANGE);
    if (k > 0) addEdge(rest[k - 1], i, ORANGE, 0.25, 1.5);
  });
  yield S(() => { status.textContent = '第二步：其余点按极角排序（相对 p0 的辐角，逆时针）：' + rest.join(' → '); });
  yield W(1000);
  const stack = [p0];
  setCol(rest[0], GREEN);
  stack.push(rest[0]);
  yield S(() => { status.textContent = '第三步：单调栈 —— 压入 p0 与极角最小点（绿）：栈 = ' + stack.join(' → '); });
  yield W(600);
  for (let k = 1; k < rest.length; k++) {
    const p = rest[k];
    setCol(p, CYAN);
    yield S(() => { status.textContent = '考察点 ' + p + '（青）：检查栈顶两点相对它的转向'; });
    yield W(450);
    while (stack.length >= 2 && cross(stack[stack.length - 2], stack[stack.length - 1], p) <= 0) {
      const a = stack[stack.length - 2], pop = stack.pop();
      const c = cross(a, pop, p);
      setCol(pop, RED);
      yield S(() => { status.textContent = 'cross(' + a + ', ' + pop + ', ' + p + ') = ' + c.toFixed(0) + ' ≤ 0 → 右转/共线：弹出 ' + pop + '（红），它不可能是凸包顶点'; });
      yield W(550);
    }
    stack.push(p);
    setCol(p, GREEN);
    clearEdges();
    for (let i = 0; i + 1 < stack.length; i++) addEdge(stack[i], stack[i + 1], GREEN, 0.7, 3);
    const c = cross(stack[stack.length - 2], stack[stack.length - 3], p);
    yield S(() => { status.textContent = 'cross(' + stack[stack.length - 3] + ', ' + stack[stack.length - 2] + ', ' + p + ') = ' + c.toFixed(0) + ' > 0 → 左转：压入 ' + p + '（绿），栈 = ' + stack.join(' → '); });
    yield W(600);
  }
  clearEdges();
  for (let i = 0; i + 1 < stack.length; i++) addEdge(stack[i], stack[i + 1], GOLD, 0.9, 4);
  addEdge(stack[stack.length - 1], stack[0], GOLD, 0.9, 4);
  stack.forEach(i => setCol(i, GOLD));
  yield S(() => { status.textContent = '凸包完成（闭环）：' + stack.join(' → ') + ' → ' + stack[0] + ' —— 12 点中只有 ' + stack.length + ' 个在凸包上'; });
  yield W(1100);
  yield S(() => { status.textContent = '复杂度：排序 O(n log n) + 扫描 O(n)（每点至多进/出栈各一次）；应用：碰撞检测、最远点对、旋转卡壳、地理围栏'; });
  yield W(1100);
  yield S(() => { status.textContent = 'Graham 扫描演示完成：凸包 = ' + stack.join(' → ') + ' → ' + stack[0] + ' 闭环（12 点中 ' + stack.length + ' 个在凸包上）；复杂度：排序 O(n log n) + 扫描 O(n)'; resetColors(); });
  yield W(900);
}

function* runGraham() {
  clearEdges(); resetColors();
  yield S(() => { status.textContent = 'Graham 扫描：找最低点 → 极角排序 → 单调栈左转判定，求 12 点凸包'; });
  yield W(400);
  yield* grahamGen();
}

engine.queue(() => runGraham());
panel.addButton('清空', () => { engine.clear(); clearEdges(); resetColors(); status.textContent = ''; });

scene.start(engine);
