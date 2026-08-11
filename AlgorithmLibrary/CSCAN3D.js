// AlgorithmLibrary/CSCAN3D.js — C-SCAN 磁盘调度：单向扫描到顶回 0 再扫，回程不处理请求（总行程 722）
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('CSCAN3D');

const scene = new Scene3D('scene', { cameraPos: [0, 330, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x67e8f9, ROSE = 0xfb7185, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「C-SCAN 调度」开始', x: 0, y: 265, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

// 磁道条：0..200
const trackBar = new VBox(scene, { w: 560, h: 7, d: 7, x: 0, y: 0, z: 0, label: '', color: PALETTE.node, emissive: PALETTE.nodeEmissive });
const toX = t => -280 + (t / 200) * 560;
new VText(scene, { text: '磁道 0', x: -280, y: 30, z: 0, color: PALETTE.textDim, scale: 0.5 });
new VText(scene, { text: '磁道 200', x: 280, y: 30, z: 0, color: PALETTE.textDim, scale: 0.5 });

// 请求队列（除磁头初始位置 53 外 9 个待处理）
const REQUESTS = [98, 183, 37, 122, 14, 124, 65, 67];
const reqMarks = REQUESTS.map((t, i) => new VBox(scene, { w: 14, h: 22, d: 22, x: toX(t), y: 55, z: 0, label: String(t), color: DIM, emissive: 0 }));

// 磁头
const head = new VBox(scene, { w: 18, h: 60, d: 18, x: toX(53), y: -48, z: 0, label: '磁头', color: YELLOW, emissive: YELLOW });

const totalT = new VText(scene, { text: '', x: 0, y: -110, z: 0, color: PALETTE.textGlow, scale: 0.75 });
const stepT = new VText(scene, { text: '', x: 0, y: -160, z: 0, color: PALETTE.textGlow, scale: 0.72 });

// 动画剧本（验证结果）：{to, dist, sweep}
const ORDER = [
  { to: 65, dist: 12 }, { to: 67, dist: 2 }, { to: 98, dist: 31 }, { to: 122, dist: 24 },
  { to: 124, dist: 2 }, { to: 183, dist: 59 },
  { to: 0, dist: 183, sweep: true }, { to: 200, dist: 200, sweep: true },
  { to: 14, dist: 186 }, { to: 37, dist: 23 },
];
let pos, total;

function resetAll() {
  engine.clear();
  pos = 53; total = 0;
  reqMarks.forEach(m => m.setColor(DIM, 0));
  head.mesh.position.x = toX(53);
  totalT.setText(''); stepT.setText('');
}

function runCSCAN() {
  resetAll();
  hint.setText('C-SCAN 循环扫描：磁头单向向上扫，处理一路上的请求；到顶直接跳回 0 再扫 — 回程不干活');
  C(400, () => {
    totalT.setText('初始：磁头在 53，方向 ↑（磁道越大越靠右）');
    stepT.setText('请求队列：98,183,37,122,14,124,65,67 — 谁在扫到的路上就先服务谁');
  });
  ORDER.forEach((o, i) => {
    if (o.sweep) {
      C(450, () => {
        stepT.setText(o.to === 0 ? '到顶 183 → 回扫：直接跳回磁道 0（C-SCAN 特色，回程不处理任何请求）' : '从 0 空扫到最大磁道 200（一路上无请求）');
        head.setColor(ROSE, ROSE);
        head.mesh.position.x = toX(o.to);
        total += o.dist;
        totalT.setText('累计行程 ' + total + '（含回扫 ' + o.dist + '）');
      });
    } else {
      C(300, () => {
        const m = reqMarks[i < 6 ? i : i - 2];
        m.setColor(YELLOW, YELLOW);
        head.setColor(YELLOW, YELLOW);
        stepT.setText('下一个请求：磁道 ' + o.to + ' → 磁头从 ' + pos + ' 移过去');
      });
      C(420, () => {
        const m = reqMarks[i < 6 ? i : i - 2];
        m.setColor(GREEN, GREEN);
        head.mesh.position.x = toX(o.to);
        total += o.dist;
        totalT.setText('累计行程 ' + total + '（本次 +' + o.dist + '）');
        stepT.setText('服务 ' + o.to + ' ✓  ' + pos + ' → ' + o.to + ' 移动 ' + o.dist);
        pos = o.to;
      });
    }
  });
  C(900, () => {
    stepT.setText('完成：总行程 ' + total + ' — C-SCAN 回扫不服务，等待时间更均匀（对比 SCAN 回扫还要顺路干活）');
    hint.setText('C-SCAN 回程「浪费」一段路换公平 — 与 SCAN 比，尾部磁道的等待时间更稳定');
  });
  C(600, () => {
    status.textContent = 'C-SCAN 完成：磁头 53 向上扫 65/67/98/122/124/183 → 回 0 → 空扫 200 → 14/37，总行程 722';
  });
}

panel.addButton('C-SCAN 调度', runCSCAN);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；黄=磁头/下一个请求，绿=已服务，红=回扫跳段，刻度=磁道号）');

scene.start(engine);
