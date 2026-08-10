// AlgorithmLibrary/SSTF3D.js — 最短寻道时间优先磁盘调度
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VArrow, VText, easeInOut } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('SSTF3D');

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

function runSSTF() {
  clearAll();
  let total = 0, head = HEAD, served = 0;
  const doneFlag = [];
  const markers = [];
  for (const c of CYL) {
    const m = new VBoxMark(scene, xOf(c));
    markers.push(m);
    if (REQS.includes(c)) {
      const r = new VText(scene, { text: String(c), x: xOf(c), y: 26, z: 0, color: PALETTE.textDim, scale: 0.62 });
      created.push(r);
    }
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
  while (served < REQS.length) {
    let best = -1, bestD = Infinity;
    for (let i = 0; i < REQS.length; i++) {
      if (doneFlag[i]) continue;
      const d = Math.abs(REQS[i] - head);
      if (d < bestD) { bestD = d; best = i; }
    }
    const target = REQS[best];
    const d = Math.abs(target - head);
    total += d;
    status.textContent = '磁头 ' + head + ' → 最近请求 ' + target + '（距离 ' + d + '，累计 ' + total + '）';
    moveTo(xOf(target), '磁头 ' + target);
    markers[CYL.indexOf(target)].serve(C);
    doneFlag[best] = true;
    head = target;
    served++;
  }
  C(150, () => { headArrow.remove(); headLabel.remove(); for (const m of markers) m.remove(); }, () => {});
  status.textContent = 'SSTF 完成：总寻道距离 ' + total;
}

function VBoxMark(scene, x) {
  const mark = new VText(scene, { text: '▮', x, y: 0, z: 0, color: PALETTE.edge, scale: 0.5 });
  created.push(mark);
  return {
    remove: () => mark.remove(),
    serve(cmd) {
      cmd(300, () => { mark.sprite.material.color.setHex(PALETTE.green); mark.setText('✓'); }, () => {});
    },
  };
}

panel.addButton('运行 SSTF', runSSTF);
panel.addButton('清空', clearAll);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
