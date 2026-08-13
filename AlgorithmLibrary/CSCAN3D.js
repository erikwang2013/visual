// AlgorithmLibrary/CSCAN3D.js — 循环扫描：磁头单向扫到顶，然后瞬间回绕到 0 再扫 —— 回程不服务，两端等待时间更均匀（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('CSCAN3D');

const scene = new Scene3D('scene', { cameraPos: [320, 500, 900], lookAt: [320, 500, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：C-SCAN —— 只往一个方向扫，回程走「传送带」', x: 700, y: 560, z: 0, color: PALETTE.textGlow, scale: 0.7, wrapChars: 7 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 320, y: 555, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 320, y: 240, z: 0, color: PALETTE.textGlow, scale: 0.56 });
const outT = new VText(scene, { text: '', x: 700, y: 420, z: 0, color: PALETTE.textGlow, scale: 0.55, wrapChars: 8 });

const REQ = [98, 183, 37, 122, 14, 124, 65, 67];
const START = 53;
const AXIS_Y = 330;
const K = 3.2;
const xOf = c => 40 + c * K;
// 单向向右：服务 65,67,98,122,124,183 → 顶 199 → 回绕 0 → 服务 14,37
const SEQ = [53, 65, 67, 98, 122, 124, 183, 199, 0, 14, 37];
tubeBetween(scene, { x: 40, y: AXIS_Y, z: 0 }, { x: 680, y: AXIS_Y, z: 0 }, { color: DIM, opacity: 0.5, radius: 3 });
for (let c = 0; c <= 200; c += 50) {
  new VText(scene, { text: String(c), x: xOf(c), y: AXIS_Y - 26, z: 0, color: PALETTE.textDim, scale: 0.34 });
}
const reqNodes = REQ.map(c => new VNode(scene, { x: xOf(c), y: AXIS_Y, z: 0, radius: 11, label: String(c), color: CYAN, emissive: CYAN }));
const head = new VNode(scene, { x: xOf(START), y: AXIS_Y, z: 0, radius: 17, label: '头 53', color: GOLD, emissive: GOLD });
let visited = new Set();

function* cscanGen() {
  yield S(() => { hint.setText('C-SCAN（循环扫描）：只向右扫 —— 到顶 199 后不折返，直接「传送」回 0，回程不处理任何请求'); stageT.setText('请求：' + REQ.join(', ') + '；磁头 53 向右，顶 = 199，底 = 0'); });
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
      yield S(() => { stageT.setText('199 → 0：瞬移回绕（不服务）—— 这就是 C-SCAN 与 SCAN 的本质区别'); eqT.setText('回绕距离 ' + d + '，累计 ' + total + '（回程白白走，换均匀等待）'); });
    } else if (REQ.includes(to) && !visited.has(to)) {
      visited.add(to);
      reqNodes[REQ.indexOf(to)].setColor(GOLD, GOLD);
      yield S(() => { stageT.setText('服务柱面 ' + to + '（金色点亮）—— 只做单向扫描'); eqT.setText('移动 ' + from + ' → ' + to + '：|Δ| = ' + d + '，累计 ' + total); });
    } else {
      yield S(() => { stageT.setText(to === 199 ? '到达顶 199 —— 准备回绕' : '经过 ' + to + '（继续向右）'); eqT.setText('移动 ' + from + ' → ' + to + '：|Δ| = ' + d + '，累计 ' + total); });
    }
    yield W(600);
  }
  yield S(() => { outT.setText('总移动 = ' + total + ' 柱面 —— 每个请求等待时间 ≈ 一个扫描周期，两端均匀'); status.textContent = 'C-SCAN 总移动 ' + total; hint.setText('对比 SCAN（345）：C-SCAN 多花回绕路程，但换来了边缘柱面不被歧视 —— 短请求分布更公平'); });
  yield W(1100);
  yield S(() => { hint.setText('复杂度 O(n log n)。应用：磁盘调度 —— C-LOOK 变体只扫到最远请求，回绕到最近请求'); outT.setText('思考：回绕 199→0 的 199 柱面是纯开销 —— 磁盘真正的寻道被「传送」替代'); });
  yield W(1100);
  yield S(() => { hint.setText('C-SCAN 演示完成：单向扫顶回绕，总移动 ' + total + ' 柱面'); outT.setText(''); });
  yield W(400);
}

function* runCSCAN() {
  hint.setText('C-SCAN：单向传送带');
  yield W(400);
  yield* cscanGen();
}

engine.queue(() => runCSCAN());
panel.addButton('清空', () => { engine.clear(); stageT.setText(''); eqT.setText(''); outT.setText(''); visited = new Set(); reqNodes.forEach(n => n.setColor(CYAN, CYAN)); head.moveTo(xOf(START), AXIS_Y, 0, 300); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；金球 = 磁头，青球 = 待服务请求，金 = 已服务；199→0 是瞬移回绕，途中不服务）');

scene.start(engine);
