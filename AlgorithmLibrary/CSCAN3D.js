// AlgorithmLibrary/CSCAN3D.js — 循环扫描：磁头单向向右扫，到顶 199 后瞬移回绕 0 再继续扫，回程不服务（function* 生成器驱动，解说入状态栏）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('CSCAN3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const status = panel.addStatus('就绪');

const REQ = [98, 183, 37, 122, 14, 124, 65, 67];
const START = 53;
const AXIS_Y = 330;
const K = 3;
const xOf = c => 30 + c * K;
// 单向向右：服务 65,67,98,122,124,183 → 顶 199 → 回绕 0 → 服务 14,37
const SEQ = [53, 65, 67, 98, 122, 124, 183, 199, 0, 14, 37];

tubeBetween(scene, { x: 30, y: AXIS_Y, z: 0 }, { x: 630, y: AXIS_Y, z: 0 }, { color: DIM, opacity: 0.5, radius: 3 });
for (let c = 0; c <= 200; c += 50) {
  new VText(scene, { text: String(c), x: xOf(c), y: AXIS_Y - 26, z: 0, color: PALETTE.textDim, scale: 0.34 });
}
const reqNodes = REQ.map(c => new VNode(scene, { x: xOf(c), y: AXIS_Y, z: 0, radius: 11, label: String(c), color: CYAN, emissive: CYAN }));
const head = new VNode(scene, { x: xOf(START), y: AXIS_Y, z: 0, radius: 17, label: '头 53', color: GOLD, emissive: GOLD });
let visited = new Set();

function* cscanGen() {
  yield S(() => { status.textContent = 'C-SCAN（循环扫描）：磁头 53 向右单向扫，请求 ' + REQ.join(', ') + '；顶 199 到底 0，回程不服务任何请求'; });
  yield W(800);
  let total = 0;
  for (let i = 1; i < SEQ.length; i++) {
    const from = SEQ[i - 1], to = SEQ[i];
    const d = Math.abs(to - from);
    total += d;
    const warp = from === 199 && to === 0;
    head.moveTo(xOf(to), AXIS_Y, 0, warp ? 250 : 620);
    yield W(warp ? 250 : 620);
    if (warp) {
      yield S(() => { head.setText('头 ' + to); status.textContent = '199 → 0：瞬移回绕（不服务）—— C-SCAN 与 SCAN 的本质区别；回绕路程 ' + d + '，累计 ' + total; });
    } else if (REQ.includes(to) && !visited.has(to)) {
      visited.add(to);
      yield S(() => { head.setText('头 ' + to); reqNodes[REQ.indexOf(to)].setColor(GOLD, GOLD); status.textContent = '服务柱面 ' + to + '（金色点亮）：移动 ' + from + ' → ' + to + '，|Δ| = ' + d + '，累计 ' + total; });
    } else {
      yield S(() => { head.setText('头 ' + to); status.textContent = (to === 199 ? '到达顶 199，准备回绕' : '经过 ' + to + '（不服务，继续向右）') + '：移动 ' + from + ' → ' + to + '，|Δ| = ' + d + '，累计 ' + total; });
    }
    yield W(600);
  }
  yield S(() => { status.textContent = '总移动 = ' + total + ' 柱面 —— 每个请求等待时间 ≈ 一个扫描周期，边缘柱面不被歧视'; });
  yield W(1000);
  yield S(() => { status.textContent = '复杂度 O(n log n)（请求排序）；C-LOOK 变体只扫到最远请求再回绕到最近请求，省去空扫'; });
  yield W(1000);
  yield S(() => { status.textContent = 'C-SCAN 演示完成：单向扫至顶 199 后回绕 0，服务 8 个请求，总移动 ' + total + ' 柱面，复杂度 O(n log n)'; });
  yield W(400);
}

function* runCSCAN() {
  yield* cscanGen();
}

engine.queue(() => runCSCAN());
panel.addButton('清空', () => { engine.clear(); visited = new Set(); reqNodes.forEach(n => n.setColor(CYAN, CYAN)); head.setText('头 53'); head.moveTo(xOf(START), AXIS_Y, 0, 300); status.textContent = ''; });

scene.start(engine);
