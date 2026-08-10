// AlgorithmLibrary/FIFO3D.js — 先进先出页面置换
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Array3D } from '../3D/modes/Array3D.js';
import { VArrow, VText, easeInOut } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('FIFO3D');

const scene = new Scene3D('scene', { cameraPos: [0, 260, 700], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });
const status = panel.addStatus('');

const REF = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3];
const FRAMES = 4;
const ref = new Array3D(scene, { type: 'box', count: REF.length, spacing: 64, startY: 130, w: 48, h: 48 });
ref.create();
REF.forEach((v, i) => ref.setValue(i, v, C));
const frames = new Array3D(scene, { type: 'box', count: FRAMES, spacing: 80, startY: -60, w: 58, h: 58 });
frames.create();
new VText(scene, { text: '访问序列', x: -500, y: 178, z: 0, color: PALETTE.textDim, scale: 0.8 });
new VText(scene, { text: '内存页框', x: -300, y: 20, z: 0, color: PALETTE.textDim, scale: 0.8 });

const created = [];
function clearAll() {
  engine.clear();
  for (const o of created) o.remove();
  created.length = 0;
  for (const el of [...ref.elems, ...frames.elems]) {
    el.mesh.material.emissiveIntensity = 0.35;
    el.mesh.material.color.setHex(PALETTE.node);
  }
  for (let i = 0; i < FRAMES; i++) frames.setValue(i, '空', C);
  status.textContent = '已清空';
}

function runFIFO() {
  clearAll();
  let misses = 0, hits = 0, next = 0;
  const fifo = [-1, -1, -1, -1];
  const arrow = new VArrow(scene, { x: ref.xOf(0), y: 82, z: 0 });
  created.push(arrow);
  let ax = ref.xOf(0);
  REF.forEach((p, i) => {
    const nx = ref.xOf(i);
    C(340, (t) => { arrow.group.position.x = ax + (nx - ax) * easeInOut(t); }, () => { arrow.group.position.x = ax; });
    ax = nx;
    let lastFrame = 0;
    const fi = fifo.indexOf(p);
    if (fi >= 0) {
      ref.highlight(i, C, PALETTE.green);
      frames.highlight(fi, C, PALETTE.green);
      lastFrame = fi;
      hits++;
      status.textContent = '访问 ' + p + '：命中页框 ' + fi + '（缺页 ' + misses + ' 次）';
    } else {
      ref.highlight(i, C, PALETTE.red);
      const ri = next;
      next = (next + 1) % FRAMES;
      fifo[ri] = p;
      frames.setValue(ri, p, C);
      frames.highlight(ri, C, PALETTE.red);
      lastFrame = ri;
      misses++;
      status.textContent = '访问 ' + p + '：缺页！替换最早装入的页框 ' + ri + '（缺页 ' + misses + ' 次）';
    }
    ref.unhighlight(i, C);
    frames.unhighlight(lastFrame, C);
  });
  C(150, () => arrow.remove(), () => {});
  status.textContent = 'FIFO 完成：缺页 ' + misses + ' 次，命中 ' + hits + ' 次';
}

panel.addButton('运行 FIFO', runFIFO);
panel.addButton('清空', clearAll);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
