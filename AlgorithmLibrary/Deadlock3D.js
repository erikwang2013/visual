// AlgorithmLibrary/Deadlock3D.js — 死锁检测：资源分配图逐边画入，蓝色 = 持有、红色 = 请求 —— 发现环 P0→R1→P1→R2→P2→R0→P0 即死锁（function* 生成器驱动，解说入状态栏）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VBox } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
applyTheme('Deadlock3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const status = panel.addStatus('就绪');

// 布局：3 资源方框（上排）+ 3 进程球（下排）
const RPOS = [[-200, 690], [0, 730], [200, 690]].map(([x, y]) => [x + 320, y]);
const PPOS = [[-200, 470], [0, 440], [200, 470]].map(([x, y]) => [x + 320, y]);
const resBoxes = RPOS.map(([x, y], i) => new VBox(scene, { w: 90, h: 60, d: 60, x, y, z: 0, label: 'R' + i, color: DIM, emissive: DIM }));
const procNodes = PPOS.map(([x, y], i) => new VNode(scene, { x, y, z: 0, radius: 30, label: 'P' + i, color: BLUE, emissive: BLUE }));
const P = (x, y) => ({ x, y, z: 0 });
const ease = p => p * p * (3 - 2 * p);
// 边 = 管 + 箭头组成 Group，以中点为组原点：整体 0→1 缩放模拟「画线过程」，箭头始终指向目标端
function edgeGroup(a, b, color, radius) {
  const va = new THREE.Vector3(a.x, a.y, a.z), vb = new THREE.Vector3(b.x, b.y, b.z);
  const mid = new THREE.Vector3().addVectors(va, vb).multiplyScalar(0.5);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 });
  const g = new THREE.Group();
  const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([va, vb]), 4, radius, 6), mat);
  tube.position.copy(mid).negate();
  g.add(tube);
  const d = new THREE.Vector3().subVectors(vb, va).normalize();
  const cone = new THREE.Mesh(new THREE.ConeGeometry(9, 20, 10), mat);
  cone.position.copy(vb).sub(mid).addScaledVector(d, -30);
  cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
  g.add(cone);
  g.position.copy(mid);
  g.scale.setScalar(0.01);
  g.visible = false;
  scene.add(g);
  return g;
}
// 6 条边模块级预建（3 持有蓝 P→R + 3 请求红 R→P），运行时生长动画揭示，generator 内不 new
const edges = new Map();
for (let i = 0; i < 3; i++) {
  edges.set('hold' + i, edgeGroup(P(PPOS[i][0], PPOS[i][1]), P(RPOS[i][0], RPOS[i][1]), BLUE, 4));
  edges.set('req' + i, edgeGroup(P(RPOS[(i + 1) % 3][0], RPOS[(i + 1) % 3][1]), P(PPOS[i][0], PPOS[i][1]), RED, 3.5));
}
function clearEdges() { edges.forEach(m => { m.visible = false; }); }
function* revealEdge(key) {
  const g = edges.get(key);
  g.visible = true;
  g.scale.setScalar(0.01);
  yield A(480, p => { const e = ease(p); g.scale.setScalar(0.01 + 0.99 * e); });
}

function* deadlockGen() {
  yield S(() => { status.textContent = '死锁：互相等待对方持有的资源 —— 图里成环。资源分配图：先画持有边（蓝 P→R），再画请求边（红 R→P）'; });
  yield W(800);
  for (let i = 0; i < 3; i++) {
    yield* revealEdge('hold' + i);
    yield S(() => { status.textContent = 'P' + i + ' 持有 R' + i + '（蓝边）—— 资源不共享、进程不放手'; });
    yield W(650);
  }
  yield S(() => { status.textContent = '持有就绪：三进程各持一资源，又各缺一个 —— 死锁条件①②：互斥 + 持有并等待'; });
  yield W(700);
  for (let i = 0; i < 3; i++) {
    const req = (i + 1) % 3;
    yield* revealEdge('req' + i);
    yield S(() => { status.textContent = 'P' + i + ' 请求 R' + req + '（红边）—— 被 P' + req + ' 持有；条件③④：不可剥夺 + 循环等待'; });
    yield W(650);
  }
  yield S(() => { status.textContent = '环：P0 → R1 → P1 → R2 → P2 → R0 → P0 —— 完整循环等待！'; });
  yield W(800);
  yield S(() => {
    [0, 1, 2].forEach(i => { procNodes[i].setColor(GOLD, GOLD); resBoxes[i].setColor(GOLD, GOLD); });
    status.textContent = '检测到死锁：环上进程互等，谁都不让路 —— 四条件缺一不可，破任一即预防';
  });
  yield W(1100);
  yield S(() => { status.textContent = '解除：杀进程收回资源或回滚；分布式系统用等待图 + 中心检测'; });
  yield W(1000);
  yield S(() => { status.textContent = '死锁演示完成：资源分配图 3 持有边 + 3 请求边成环 P0→R1→P1→R2→P2→R0→P0，死锁成立；找环复杂度 O(V+E)'; });
  yield W(400);
}

function* runDeadlock() {
  yield* deadlockGen();
}

engine.queue(() => runDeadlock());
panel.addButton('清空', () => { engine.clear(); clearEdges(); [0, 1, 2].forEach(i => { procNodes[i].setColor(BLUE, BLUE); resBoxes[i].setColor(DIM, DIM); }); status.textContent = ''; });

scene.start(engine);
