// AlgorithmLibrary/LRU3D.js — 最近最久未用页面置换
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Array3D } from '../3D/modes/Array3D.js';
import { VArrow, VText, easeInOut } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('LRU3D');

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
new VText(scene, { text: '内存页框（下方数字 = 上次访问时刻）', x: -130, y: 20, z: 0, color: PALETTE.textDim, scale: 0.8 });

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

function runLRU() {
  clearAll();
  let misses = 0, hits = 0;
  const pages = [-1, -1, -1, -1];
  const lastUse = [-1, -1, -1, -1];
  const meta = [];
  for (let f = 0; f < FRAMES; f++) {
    const t = new VText(scene, { text: '-', x: frames.xOf(f), y: -140, z: 0, color: PALETTE.textDim, scale: 0.72 });
    meta.push(t);
  }
  created.push(...meta);
  const arrow = new VArrow(scene, { x: ref.xOf(0), y: 82, z: 0 });
  created.push(arrow);
  let ax = ref.xOf(0);
  REF.forEach((p, i) => {
    const nx = ref.xOf(i);
    C(340, (t) => { arrow.group.position.x = ax + (nx - ax) * easeInOut(t); }, () => { arrow.group.position.x = ax; });
    ax = nx;
    let lastFrame = 0;
    const fi = pages.indexOf(p);
    if (fi >= 0) {
      ref.highlight(i, C, PALETTE.green);
      frames.highlight(fi, C, PALETTE.green);
      lastFrame = fi;
      hits++;
      status.textContent = '访问 ' + p + '：命中页框 ' + fi + '（缺页 ' + misses + ' 次）';
    } else {
      ref.highlight(i, C, PALETTE.red);
      let ri = 0;
      for (let f = 1; f < FRAMES; f++) if (lastUse[f] < lastUse[ri]) ri = f;
      pages[ri] = p;
      frames.setValue(ri, p, C);
      frames.highlight(ri, C, PALETTE.red);
      lastFrame = ri;
      misses++;
      status.textContent = '访问 ' + p + '：缺页！替换最久未用的页框 ' + ri + '（上次访问 t=' + lastUse[ri] + '）';
    }
    if (fi >= 0) lastUse[fi] = i; else lastUse[lastFrame] = i;
    meta.forEach((t, f) => C(120, () => t.setText(String(lastUse[f])), () => {}));
    ref.unhighlight(i, C);
    frames.unhighlight(lastFrame, C);
  });
  C(150, () => arrow.remove(), () => {});
  status.textContent = 'LRU 完成：缺页 ' + misses + ' 次，命中 ' + hits + ' 次';
}

panel.addButton('运行LRU', runLRU);
panel.addButton('清空', clearAll);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
