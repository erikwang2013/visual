// AlgorithmLibrary/SSTF3D.js — 最短寻道时间优先：每次都挑离磁头最近的请求 —— 单步贪心，总寻道最短，但边缘请求可能饿死（解说入状态栏）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('SSTF3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const DIM = 0x334155, CYAN = 0x22d3ee, GOLD = 0xfcd34d;
const status = panel.addStatus('就绪');

const REQ = [98, 183, 37, 122, 14, 124, 65, 67];
const START = 53;
const AXIS_Y = 260;
const K = 3.2;
const xOf = c => c * K;
// 贪心顺序：每次选最近 → 65,67,37,14,98,122,124,183；总移动 236（比 SCAN 345 / C-SCAN 382 都短）
const ORDER = [65, 67, 37, 14, 98, 122, 124, 183];
tubeBetween(scene, { x: 0, y: AXIS_Y, z: 0 }, { x: 640, y: AXIS_Y, z: 0 }, { color: DIM, opacity: 0.5, radius: 3 });
for (let c = 0; c <= 200; c += 50) {
  new VText(scene, { text: String(c), x: xOf(c), y: AXIS_Y - 26, z: 0, color: PALETTE.textDim, scale: 0.34 });
}
// 请求标签按柱面值奇偶分上下两带：相邻请求 65/67、122/124 只隔 ~6 单位，同带必互相压盖
const sortedUp = new Set(REQ.slice().sort((a, b) => a - b).filter((_, i) => i % 2 === 0));
const reqNodes = REQ.map(c => new VNode(scene, { x: xOf(c), y: AXIS_Y, z: 0, radius: 11, color: CYAN, emissive: CYAN }));
reqNodes.forEach((vn, i) => {
  const up = sortedUp.has(REQ[i]);
  const lb = new VText(scene, { text: String(REQ[i]), x: 0, y: up ? 28 : -50, z: 0, scale: 0.5 });
  vn.mesh.add(lb.sprite);
});
// 磁头标签提到刻度带与请求标签之上（+75），避免停在请求柱面时压住请求数字
const head = new VNode(scene, { x: xOf(START), y: AXIS_Y, z: 0, radius: 17, color: GOLD, emissive: GOLD });
const headLbl = new VText(scene, { text: '头 53', x: 0, y: 75, z: 0, scale: 0.6 });
head.mesh.add(headLbl.sprite);
let visited = new Set();

function* sstfGen() {
  yield S(() => { status.textContent = 'SSTF（最短寻道优先）：在磁盘请求队列里，永远选「离磁头最近」的那一个 —— 单步最省，总程未必最省'; });
  yield W(800);
  let total = 0, prev = START;
  for (let i = 0; i < ORDER.length; i++) {
    const to = ORDER[i];
    const d = Math.abs(to - prev);
    total += d;
    const remaining = REQ.filter(r => !visited.has(r)).map(r => r + '(' + Math.abs(r - prev) + ')').join('  ');
    yield S(() => { status.textContent = '剩余请求及距离：' + remaining + ' → 最近的是 ' + to + '（距离 ' + d + '）'; });
    yield W(500);
    head.moveTo(xOf(to), AXIS_Y, 0, 620);
    yield W(620);
    visited.add(to);
    reqNodes[REQ.indexOf(to)].setColor(GOLD, GOLD);
    yield S(() => { status.textContent = '服务柱面 ' + to + '（金色点亮）：单步贪心，累计移动 ' + total + ' 柱面'; });
    yield W(600);
    prev = to;
  }
  yield S(() => { status.textContent = '总移动 = ' + total + ' 柱面，比 SCAN(345)、C-SCAN(382) 都短 —— 但边缘请求（如 183）可能饿死'; });
  yield W(1100);
  yield S(() => { status.textContent = '复杂度 O(n²)（每步扫剩余队列）；应用：小型磁盘控制器，大数据量下用 SCAN 保公平'; });
  yield W(1100);
  yield S(() => { status.textContent = 'SSTF 演示完成：贪心最近优先，顺序 65→67→37→14→98→122→124→183，总移动 ' + total + ' 柱面'; });
  yield W(400);
}

function* runSSTF() {
  yield S(() => { status.textContent = 'SSTF：总挑离磁头最近的请求'; });
  yield W(400);
  yield* sstfGen();
}

engine.queue(() => runSSTF());
panel.addButton('清空', () => { engine.clear(); visited = new Set(); reqNodes.forEach(n => n.setColor(CYAN, CYAN)); head.moveTo(xOf(START), AXIS_Y, 0, 300); status.textContent = ''; });

scene.start(engine);
