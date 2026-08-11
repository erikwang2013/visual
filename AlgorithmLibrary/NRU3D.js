// AlgorithmLibrary/NRU3D.js — NRU 页面置换：引用位 R+修改位 M 分四类，缺页淘汰最低类（操作系统内存管理）
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('NRU3D');

const scene = new Scene3D('scene', { cameraPos: [0, 330, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x67e8f9, ROSE = 0xfb7185, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「NRU 置换」开始', x: 0, y: 265, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

// 访问序列（11 次）
const SEQ = [3, 1, 4, 2, 3, 1, 5, 2, 3, 1, 6];
const seqChips = SEQ.map((p, i) => new VBox(scene, { w: 42, h: 32, d: 32, x: -250 + i * 50, y: 195, z: 0, label: String(p), color: DIM, emissive: 0 }));

// 4 个页帧 + 每帧的 R/M 位文本
const frames = [null, null, null, null].map((_, i) => ({
  box: new VBox(scene, { w: 130, h: 104, d: 70, x: -225 + i * 150, y: -40, z: 0, label: 'F' + i, color: PALETTE.node, emissive: PALETTE.nodeEmissive }),
  rm: new VText(scene, { text: '', x: -225 + i * 150, y: 42, z: 0, color: PALETTE.textDim, scale: 0.55 }),
}));
new VText(scene, { text: '每帧记录：R 引用位（近期访问过？）+ M 修改位（被写过？）→ 组合成 4 个淘汰优先级', x: 0, y: 100, z: 0, color: PALETTE.textDim, scale: 0.62 });

const countT = new VText(scene, { text: '', x: 0, y: -125, z: 0, color: PALETTE.textGlow, scale: 0.7 });
const stepT = new VText(scene, { text: '', x: 0, y: -175, z: 0, color: PALETTE.textGlow, scale: 0.75 });

// 动画剧本（由真实模拟得出）：{p, hit|empty|evict, clearR}
const STEPS = [
  { p: 3, empty: 0 }, { p: 1, empty: 1 }, { p: 4, empty: 2 }, { p: 2, empty: 3 },
  { p: 3, hit: 0 }, { p: 1, hit: 1 },
  { p: 5, clearR: true }, { p: 5, evict: 0 },
  { p: 2, hit: 3 }, { p: 3, evict: 1 }, { p: 1, evict: 2 }, { p: 6, evict: 0 },
];

let pages, bits, faults, hits;

function resetAll() {
  engine.clear();
  pages = [null, null, null, null]; bits = [0, 0, 0, 0]; faults = 0; hits = 0;
  seqChips.forEach(c => c.setColor(DIM, 0));
  frames.forEach((f, i) => {
    f.box.setColor(PALETTE.node, PALETTE.nodeEmissive); f.box.setText('F' + i);
    f.rm.setText('');
  });
  countT.setText(''); stepT.setText('');
}

function flashFrame(i, color) {
  const f = frames[i];
  if (color) { f.box.setColor(color, color); return; }
  f.box.setColor(pages[i] === null ? PALETTE.node : GREEN, pages[i] === null ? PALETTE.nodeEmissive : GREEN);
}

function updateRM() {
  frames.forEach((f, i) => { f.rm.setText(pages[i] === null ? '' : 'R=' + bits[i] + ' · M=0'); });
}

function runNRU() {
  resetAll();
  hint.setText('NRU（Not Recently Used）：R/M 位分 4 类，缺页先淘汰 0 类(未读未写)，周期清零 R — 粗粒度 LRU');
  C(400, () => { countT.setText('缺页 0 · 命中 0'); stepT.setText('CPU 依次访问页面：3,1,4,2,3,1,5,2,3,1,6（物理内存只有 4 帧）'); });
  STEPS.forEach((s, i) => {
    C(320, () => {
      seqChips.forEach((c, j) => c.setColor(j === i ? YELLOW : DIM, j === i ? YELLOW : 0));
      if (s.clearR) {
        bits = [0, 0, 0, 0]; updateRM();
        frames.forEach(f => f.box.setColor(DIM, 0));
        stepT.setText('访问 ' + s.p + ' 前：所有帧 R 全为 1 → 时钟周期到达，R 位全部清零（给旧页第二次机会）');
      }
    });
    if (s.clearR) { C(300, () => { frames.forEach(f => f.box.setColor(PALETTE.node, PALETTE.nodeEmissive)); stepT.setText('清零完成：现在优先淘汰最旧且 R=0 的帧'); }); }
    C(380, () => {
      if (s.hit !== undefined) {
        hits++; flashFrame(s.hit, GREEN);
        bits[s.hit] = 1; updateRM();
        countT.setText('缺页 ' + faults + ' · 命中 ' + hits);
        stepT.setText('访问 ' + s.p + '：命中帧 F' + s.hit + ' ✓ → R 置 1（最近被引用过）');
      } else {
        const fi = s.empty !== undefined ? s.empty : s.evict;
        flashFrame(fi, ROSE);
        if (s.evict !== undefined) stepT.setText('访问 ' + s.p + '：缺页！帧 F' + fi + '（R=0，0 类）被选中淘汰');
        else stepT.setText('访问 ' + s.p + '：缺页 → 装入空帧 F' + fi);
      }
    });
    C(380, () => {
      if (s.hit === undefined) {
        const fi = s.empty !== undefined ? s.empty : s.evict;
        faults++;
        pages[fi] = s.p; bits[fi] = 1;
        flashFrame(fi, YELLOW); frames[fi].box.setText(String(s.p));
        updateRM();
        countT.setText('缺页 ' + faults + ' · 命中 ' + hits);
        stepT.setText('页 ' + s.p + ' 装入帧 F' + fi + '（R=1）— 缺页 ' + faults + ' 次');
      }
    });
    if (s.hit !== undefined) { C(240, () => { flashFrame(s.hit); }); }
    else { C(240, () => { flashFrame(s.empty !== undefined ? s.empty : s.evict, GREEN); }); }
  });
  C(900, () => {
    stepT.setText('结果：11 次访问，8 次缺页、2 次命中（18%）— R/M 四位组合让「又读又写的页」最难被淘汰');
    hint.setText('NRU 用 2 个 bit 近似 LRU：0 类(00)先走，3 类(11)留到最后 — Linux clock 算法是它的进阶版');
  });
  C(600, () => {
    status.textContent = 'NRU 完成：4 帧 + R/M 位分 4 类，序列 11 次访问 8 缺页 2 命中，周期清零 R 给旧页机会';
  });
}

panel.addButton('NRU 置换', runNRU);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；黄=当前访问/新装入，绿=命中，红=被淘汰，F=物理帧）');

scene.start(engine);
