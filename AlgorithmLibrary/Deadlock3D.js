// AlgorithmLibrary/Deadlock3D.js — 死锁检测：资源分配图逐边画入，蓝色 = 持有、红色 = 请求 —— 发现环 P0→R1→P1→R2→P2→R0→P0 即死锁（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, VBox, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Deadlock3D');

const scene = new Scene3D('scene', { cameraPos: [320, 500, 900], lookAt: [320, 500, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：死锁 —— 资源分配图逐边画出，找环', x: 700, y: 560, z: 0, color: PALETTE.textGlow, scale: 0.7, wrapChars: 7 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 700, y: 440, z: 0, color: GOLD, scale: 0.5, wrapChars: 8 });
const eqT = new VText(scene, { text: '', x: 700, y: 345, z: 0, color: PALETTE.textGlow, scale: 0.45, wrapChars: 8 });
const outT = new VText(scene, { text: '', x: 700, y: 345, z: 0, color: PALETTE.textGlow, scale: 0.45, wrapChars: 8 });

// 布局：3 资源方框（上排）+ 3 进程球（下排）
const RPOS = [[-200, 400], [0, 445], [200, 400]].map(([x, y]) => [x + 320, y]);
const PPOS = [[-200, 265], [0, 235], [200, 265]].map(([x, y]) => [x + 320, y]);
const resBoxes = RPOS.map(([x, y], i) => new VBox(scene, { w: 90, h: 60, d: 60, x, y, z: 0, label: 'R' + i, color: DIM, emissive: DIM }));
const procNodes = PPOS.map(([x, y], i) => new VNode(scene, { x, y, z: 0, radius: 30, label: 'P' + i, color: BLUE, emissive: BLUE }));
const edges = new Map();
const P = (x, y) => ({ x, y, z: 0 });
function addEdge(key, a, b, color, radius) { edges.set(key, tubeBetween(scene, P(a[0], a[1]), P(b[0], b[1]), { color, opacity: 0.8, radius })); }
function clearEdges() { edges.forEach(m => scene.remove(m)); edges.clear(); }

function* deadlockGen() {
  yield S(() => { hint.setText('死锁：互相等待对方持有的资源 —— 图里成环'); stageT.setText('三进程三资源：先画持有边（蓝 P→R），再画请求边（红 R→P）'); });
  yield W(800);
  for (let i = 0; i < 3; i++) {
    addEdge('hold' + i, PPOS[i], RPOS[i], BLUE, 4);
    yield S(() => { stageT.setText('P' + i + ' 持有 R' + i + '（蓝边）—— 不共享、不放手'); });
    yield W(650);
  }
  yield S(() => { stageT.setText('持有就绪：三进程各持一资源，还各缺一个'); eqT.setText('死锁条件①②：互斥 + 持有并等待'); });
  yield W(700);
  for (let i = 0; i < 3; i++) {
    const req = (i + 1) % 3;
    addEdge('req' + i, RPOS[req], PPOS[i], RED, 3.5);
    yield S(() => { stageT.setText('P' + i + ' 请求 R' + req + '（红边）—— 被 P' + req + ' 持有'); eqT.setText('死锁条件③④：不可剥夺 + 循环等待'); });
    yield W(650);
  }
  yield S(() => { stageT.setText('从 P0 → R1 → P1 → R2 → P2 → R0 → P0 —— 完整环！'); eqT.setText('环：P0 → R1 → P1 → R2 → P2 → R0 → P0'); });
  yield W(800);
  [0, 1, 2].forEach(i => { procNodes[i].setColor(GOLD, GOLD); resBoxes[i].setColor(GOLD, GOLD); });
  yield S(() => { eqT.setText(''); outT.setText('检测到死锁：环上进程互等，谁都不让路'); status.textContent = '死锁：环 P0→R1→P1→R2→P2→R0→P0'; hint.setText('四条件缺一不可：互斥/持有并等待/不可剥夺/循环等待，破任一即预防'); });
  yield W(1100);
  yield S(() => { hint.setText('解除：杀进程收回资源或回滚；DB 常用超时+回滚'); outT.setText('找环 O(V+E)；分布式用等待图 + 中心检测'); });
  yield W(1100);
  yield S(() => { hint.setText('死锁完成：资源图成环 → 死锁成立'); outT.setText(''); });
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
