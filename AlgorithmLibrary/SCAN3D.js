// AlgorithmLibrary/SCAN3D.js — 电梯算法：磁头沿一个方向扫到底再反向 —— 有界等待、无饥饿，像电梯一样来回（function* 生成器驱动）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('SCAN3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GOLD = 0xfcd34d, CYAN = 0x22d3ee, DIM = 0x334155;
const status = panel.addStatus('就绪');

const REQ = [98, 183, 37, 122, 14, 124, 65, 67];
const START = 53;
const AXIS_Y = 460;
const K = 2.9; // px / 柱面
const xOf = c => 20 + c * K;
const SEQ = [53, 65, 67, 98, 122, 124, 183, 199, 37, 14, 0];
tubeBetween(scene, { x: 20, y: AXIS_Y, z: 0 }, { x: xOf(200), y: AXIS_Y, z: 0 }, { color: DIM, opacity: 0.5, radius: 3 });
for (let c = 0; c <= 200; c += 50) {
  new VText(scene, { text: String(c), x: xOf(c), y: AXIS_Y - 26, z: 0, color: PALETTE.textDim, scale: 0.34 });
}
const reqNodes = REQ.map(c => new VNode(scene, { x: xOf(c), y: AXIS_Y, z: 0, radius: 11, label: String(c), color: CYAN, emissive: CYAN }));
const head = new VNode(scene, { x: xOf(START), y: AXIS_Y, z: 0, radius: 17, label: '头 53', color: GOLD, emissive: GOLD });
let visited = new Set();

function* scanGen() {
  yield S(() => { status.textContent = 'SCAN（电梯算法）：磁头保持方向扫到底（199），途中服务所有请求，到端后折返扫回（0）。请求：' + REQ.join(', ') + '；磁头起始 53，方向向右'; });
  yield W(800);
  let total = 0;
  for (let i = 1; i < SEQ.length; i++) {
    const from = SEQ[i - 1], to = SEQ[i];
    const d = Math.abs(to - from);
    total += d;
    head.moveTo(xOf(to), AXIS_Y, 0, 620);
    yield W(620);
    if (REQ.includes(to) && !visited.has(to)) {
      visited.add(to);
      reqNodes[REQ.indexOf(to)].setColor(GOLD, GOLD);
      yield S(() => { status.textContent = '服务柱面 ' + to + '（金色点亮）—— 顺路捎上；移动 ' + from + ' → ' + to + '：|Δ|=' + d + '，累计 ' + total; });
    } else {
      yield S(() => { status.textContent = (to === 199 ? '到达右端 199 —— 折返，开始向左扫' : to === 0 ? '回到左端 0 —— 折返，开始向右扫' : '经过 ' + to + '（无请求或已服务，继续）') + '；移动 ' + from + ' → ' + to + '：|Δ|=' + d + '，累计 ' + total; });
    }
    yield W(600);
  }
  yield S(() => { status.textContent = 'SCAN 总移动 ' + total + ' 柱面 —— 一路到底，等待有界（每个请求至多等一次折返），边缘柱面等待 ≤ 全程扫描；对比 SSTF 更公平'; });
  yield W(1100);
  yield S(() => { status.textContent = '复杂度 O(n log n)（排序）。应用：磁盘调度、电梯 —— LOOK 变体只扫到最远请求就折返，总移动 292；C-SCAN 单向扫描防两端饿死'; });
  yield W(1100);
  yield S(() => { status.textContent = 'SCAN 演示完成：磁头 53 向右扫到 199，折返扫到 0，共 ' + total + ' 柱面，服务 98,183,37,122,14,124,65,67；复杂度 O(n log n)，LOOK 变体 292'; });
  yield W(400);
}

function* runSCAN() {
  visited = new Set();
  reqNodes.forEach(n => n.setColor(CYAN, CYAN));
  head.moveTo(xOf(START), AXIS_Y, 0, 300);
  yield W(300);
  yield* scanGen();
}

engine.queue(() => runSCAN());
panel.addButton('清空', () => { engine.clear(); visited = new Set(); reqNodes.forEach(n => n.setColor(CYAN, CYAN)); head.moveTo(xOf(START), AXIS_Y, 0, 300); status.textContent = ''; });

scene.start(engine);
