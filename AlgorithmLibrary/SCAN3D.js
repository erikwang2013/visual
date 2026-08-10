// AlgorithmLibrary/SCAN3D.js — 电梯算法磁盘调度（SCAN，向大号方向扫描）
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VArrow, VText, easeInOut } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('SCAN3D');

const scene = new Scene3D('scene', { cameraPos: [0, 260, 700], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });
const status = panel.addStatus('');

const CYL = [0, 14, 37, 53, 65, 67, 98, 122, 124, 183, 199];
const REQS = [98, 183, 37, 122, 14, 124, 65, 67];
const HEAD = 53;
const xOf = (c) => -500 + (c / 199) * 1000;

const created = [];
function clearAll() {
  engine.clear();
  for (const o of created) o.remove();
  created.length = 0;
  status.textContent = '已清空';
}

function runSCAN() {
  clearAll();
  let total = 0, head = HEAD;
  const up = CYL.filter(c => c >= HEAD).sort((a, b) => a - b);
  const down = CYL.filter(c => c < HEAD).sort((a, b) => b - a);
  const stops = [...up, ...down];
  for (const c of CYL) {
    new VText(scene, { text: '▮', x: xOf(c), y: 0, z: 0, color: c === HEAD ? PALETTE.green : PALETTE.edge, scale: 0.5 });
  }
  for (const c of REQS) {
    new VText(scene, { text: String(c), x: xOf(c), y: 26, z: 0, color: PALETTE.textDim, scale: 0.62 });
  }
  const headArrow = new VArrow(scene, { x: xOf(HEAD), y: 44, z: 0 });
  const headLabel = new VText(scene, { text: '磁头 ' + HEAD, x: xOf(HEAD), y: 78, z: 0, color: PALETTE.textGlow, scale: 0.62 });
  created.push(headArrow, headLabel);
  let hx = xOf(HEAD);
  const moveTo = (nx, txt) => {
    C(700, (t) => { headArrow.group.position.x = hx + (nx - hx) * easeInOut(t); }, () => { headArrow.group.position.x = hx; });
    C(700, (t) => { headLabel.sprite.position.x = hx + (nx - hx) * easeInOut(t); }, () => { headLabel.sprite.position.x = hx; });
    hx = nx;
    headLabel.setText(txt);
  };
  for (const c of stops) {
    if (c === HEAD) continue;
    const d = Math.abs(c - head);
    total += d;
    if (c === 199) {
      status.textContent = '磁头 ' + head + ' → 最外端 199（折返点，累计 ' + total + '）';
    } else if (c === 0 && head > 199 * 0.5) {
      status.textContent = '磁头 ' + head + ' → 最内端 0（折返点，累计 ' + total + '）';
    } else {
      status.textContent = '磁头 ' + head + ' → 请求 ' + c + '（距离 ' + d + '，累计 ' + total + '）';
    }
    moveTo(xOf(c), '磁头 ' + c);
    head = c;
  }
  C(150, () => { headArrow.remove(); headLabel.remove(); }, () => {});
  status.textContent = 'SCAN 完成：总寻道距离 ' + total;
}

panel.addButton('运行 SCAN', runSCAN);
panel.addButton('清空', clearAll);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
