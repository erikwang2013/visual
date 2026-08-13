// AlgorithmLibrary/SSTF3D.js — 最短寻道时间优先：每次都挑离磁头最近的请求 —— 单步贪心，总寻道最短，但边缘请求可能饿死（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('SSTF3D');

const scene = new Scene3D('scene', { cameraPos: [320, 500, 900], lookAt: [320, 500, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：SSTF —— 磁头总挑离自己最近的请求', x: 700, y: 560, z: 0, color: PALETTE.textGlow, scale: 0.7, wrapChars: 7 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 0, y: 562, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: 380, z: 0, color: PALETTE.textGlow, scale: 0.56 });
const outT = new VText(scene, { text: '', x: 0, y: 70, z: 0, color: PALETTE.textGlow, scale: 0.62 });

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
const reqNodes = REQ.map(c => new VNode(scene, { x: xOf(c), y: AXIS_Y, z: 0, radius: 11, label: String(c), color: CYAN, emissive: CYAN }));
const head = new VNode(scene, { x: xOf(START), y: AXIS_Y, z: 0, radius: 17, label: '头 53', color: GOLD, emissive: GOLD });
const selT = new VText(scene, { text: '', x: 0, y: 440, z: 0, color: PUR, scale: 0.5 });
let visited = new Set();

function* sstfGen() {
  yield S(() => { hint.setText('SSTF（最短寻道优先）：在磁盘请求队列里，永远选「离磁头最近」的那一个 —— 单步最省，总程未必最省'); stageT.setText('请求：' + REQ.join(', ') + '；磁头在 53 —— 第一次挑谁？'); });
  yield W(800);
  let total = 0, prev = START;
  for (let i = 0; i < ORDER.length; i++) {
    const to = ORDER[i];
    const d = Math.abs(to - prev);
    total += d;
    const remaining = REQ.filter(r => !visited.has(r)).map(r => r + '(' + Math.abs(r - prev) + ')').join('  ');
    yield S(() => { selT.setText('剩余请求及距离：' + remaining + ' —— 最近的是 ' + to + '（距离 ' + d + '）'); });
    yield W(500);
    head.moveTo(xOf(to), AXIS_Y, 0, 620);
    yield W(620);
    visited.add(to);
    reqNodes[REQ.indexOf(to)].setColor(GOLD, GOLD);
    yield S(() => { stageT.setText('服务柱面 ' + to + '（金色点亮）—— 单步贪心：距离 ' + d); eqT.setText('累计移动 ' + total + ' 柱面'); });
    yield W(600);
    prev = to;
  }
  yield S(() => { outT.setText('总移动 = ' + total + ' 柱面 —— 比 SCAN(345)、C-SCAN(382) 都短！'); status.textContent = 'SSTF 总移动 ' + total; hint.setText('贪心有代价：边缘请求（如 183）一直不被选，可能饿死 —— 公平性最差'); });
  yield W(1100);
  yield S(() => { hint.setText('复杂度 O(n²)（每步扫剩余队列）。应用：小型磁盘控制器 —— 大数据量下用 SCAN 保公平'); outT.setText('思考：如果请求 183 是最后才来的，它要等前面全部清空 —— SSTF 饿死边缘请求'); });
  yield W(1100);
  yield S(() => { hint.setText('SSTF 演示完成：贪心最近优先，总移动 ' + total + ' 柱面'); outT.setText(''); });
  yield W(400);
}

function* runSSTF() {
  hint.setText('SSTF：总挑最近的');
  yield W(400);
  yield* sstfGen();
}

engine.queue(() => runSSTF());
panel.addButton('清空', () => { engine.clear(); stageT.setText(''); eqT.setText(''); outT.setText(''); selT.setText(''); visited = new Set(); reqNodes.forEach(n => n.setColor(CYAN, CYAN)); head.moveTo(xOf(START), AXIS_Y, 0, 300); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；金球 = 磁头，青球 = 待服务请求，金 = 已服务；紫色文字实时标出最近请求）');

scene.start(engine);
