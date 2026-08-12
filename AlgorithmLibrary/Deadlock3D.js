// AlgorithmLibrary/Deadlock3D.js — 死锁检测：资源分配图逐边画入，蓝色 = 持有、红色 = 请求 —— 发现环 P0→R1→P1→R2→P2→R0→P0 即死锁（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, VBox, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Deadlock3D');

const scene = new Scene3D('scene', { cameraPos: [0, 330, 640], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：死锁 —— 资源分配图逐边画出，找环', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 0, y: 262, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: -140, z: 0, color: PALETTE.textGlow, scale: 0.56 });
const outT = new VText(scene, { text: '', x: 0, y: -235, z: 0, color: PALETTE.textGlow, scale: 0.62 });

// 布局：3 资源方框（上排）+ 3 进程球（下排）
const RPOS = [[-200, 70], [0, 130], [200, 70]];
const PPOS = [[-200, -70], [0, -130], [200, -70]];
const resBoxes = RPOS.map(([x, y], i) => new VBox(scene, { w: 90, h: 60, d: 60, x, y, z: 0, label: 'R' + i, color: DIM, emissive: DIM }));
const procNodes = PPOS.map(([x, y], i) => new VNode(scene, { x, y, z: 0, radius: 30, label: 'P' + i, color: BLUE, emissive: BLUE }));
const edges = new Map();
const P = (x, y) => ({ x, y, z: 0 });
function addEdge(key, a, b, color, radius) { edges.set(key, tubeBetween(scene, P(a[0], a[1]), P(b[0], b[1]), { color, opacity: 0.8, radius })); }
function clearEdges() { edges.forEach(m => scene.remove(m)); edges.clear(); }

function* deadlockGen() {
  yield S(() => { hint.setText('死锁 = 一组进程互相等待对方持有的资源 —— 资源分配图里出现环'); stageT.setText('三进程三资源：先画「持有」边（蓝，P→R），再画「请求」边（红，R→P）'); });
  yield W(800);
  for (let i = 0; i < 3; i++) {
    addEdge('hold' + i, PPOS[i], RPOS[i], BLUE, 4);
    yield S(() => { stageT.setText('P' + i + ' 持有 R' + i + '（蓝边 P' + i + '→R' + i + '）—— 资源不共享，拿了不放手'); });
    yield W(650);
  }
  yield S(() => { stageT.setText('持有关系就绪：P0→R0、P1→R1、P2→R2 —— 现在每个进程都还缺一个资源'); eqT.setText('死锁条件①②：互斥 + 持有并等待'); });
  yield W(700);
  for (let i = 0; i < 3; i++) {
    const req = (i + 1) % 3;
    addEdge('req' + i, RPOS[req], PPOS[i], RED, 3.5);
    yield S(() => { stageT.setText('P' + i + ' 请求 R' + req + '（红边）—— 但 R' + req + ' 正被 P' + req + ' 持有'); eqT.setText('死锁条件③④：不可剥夺 + 循环等待'); });
    yield W(650);
  }
  yield S(() => { stageT.setText('看这张图：从 P0 出发 → R1 → P1 → R2 → P2 → R0 → 回到 P0 —— 一个完整的环！'); eqT.setText('环：P0 → R1 → P1 → R2 → P2 → R0 → P0'); });
  yield W(800);
  [0, 1, 2].forEach(i => { procNodes[i].setColor(GOLD, GOLD); resBoxes[i].setColor(GOLD, GOLD); });
  yield S(() => { outT.setText('检测到死锁：环上每个进程都等下一个进程手里的资源 —— 谁也不会让路'); status.textContent = '死锁：环 P0→R1→P1→R2→P2→R0→P0'; hint.setText('死锁四条件（缺一不可）：①互斥 ②持有并等待 ③不可剥夺 ④循环等待 —— 破坏任一即可预防'); });
  yield W(1100);
  yield S(() => { hint.setText('解除：杀一个进程（P2）收回资源，或回滚事务 —— 数据库常用「超时 + 回滚」'); outT.setText('检测手段：资源分配图找环 O(V+E)；分布式用等待图 + 中心化检测（如 2PC/锁超时）'); });
  yield W(1100);
  yield S(() => { hint.setText('死锁演示完成：资源分配图成环 → 死锁判定成立，四条条件可逐条拆解'); outT.setText(''); });
  yield W(400);
}

function* runDeadlock() {
  hint.setText('死锁：资源图找环');
  yield W(400);
  yield* deadlockGen();
}

engine.queue(() => runDeadlock());
panel.addButton('清空', () => { engine.clear(); clearEdges(); stageT.setText(''); eqT.setText(''); outT.setText(''); [0, 1, 2].forEach(i => { procNodes[i].setColor(BLUE, BLUE); resBoxes[i].setColor(DIM, DIM); }); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；方框 = 资源，球 = 进程，蓝边 = 持有，红边 = 请求，金 = 环上节点；成环即死锁）');

scene.start(engine);
