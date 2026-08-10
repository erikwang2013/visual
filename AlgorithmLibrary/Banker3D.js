// AlgorithmLibrary/Banker3D.js — 银行家算法（死锁避免，安全序列检测）
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Banker3D');

const scene = new Scene3D('scene', { cameraPos: [0, 260, 700], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });
const status = panel.addStatus('');

const Alloc = [[0, 1, 0], [2, 0, 0], [3, 0, 2], [2, 1, 1], [0, 0, 2]];
const Max = [[7, 5, 3], [3, 2, 2], [9, 0, 2], [2, 2, 2], [4, 3, 3]];
const Need = Max.map((m, i) => m.map((v, j) => v - Alloc[i][j]));
const N = Alloc.length;
const ROW_Y = [55, -5, -65, -125, -185];
const DONE_X = 430;

const created = [];
function clearAll() {
  engine.clear();
  for (const o of created) o.remove();
  created.length = 0;
  status.textContent = '已清空';
}

function runBanker() {
  clearAll();
  const A = [3, 3, 2];
  new VText(scene, { text: '银行家算法 — 安全序列检测（资源 A B C）', x: -580, y: 205, z: 0, color: PALETTE.textGlow, scale: 0.85 });
  new VText(scene, { text: '可用 Available', x: -560, y: 145, z: 0, color: PALETTE.textDim, scale: 0.7 });
  const availBoxes = A.map((v, j) => new VBox(scene, { w: 48, h: 40, x: -430 + j * 70, y: 145, z: 0, label: String(v), color: PALETTE.highlight }));
  created.push(...availBoxes);
  new VText(scene, { text: '分配 Alloc', x: -440, y: 96, z: 0, color: PALETTE.textDim, scale: 0.7 });
  new VText(scene, { text: '尚需 Need', x: -190, y: 96, z: 0, color: PALETTE.textDim, scale: 0.7 });
  new VText(scene, { text: '安全序列', x: 430, y: 190, z: 0, color: PALETTE.textDim, scale: 0.7 });
  const rows = [];
  for (let i = 0; i < N; i++) {
    const y = ROW_Y[i];
    const box = new VBox(scene, { w: 64, h: 44, x: -540, y, z: 0, label: 'P' + i, color: PALETTE.node });
    created.push(box);
    for (let j = 0; j < 3; j++) {
      const at = new VText(scene, { text: String(Alloc[i][j]), x: -405 + j * 50, y, z: 0, color: PALETTE.orange, scale: 0.62 });
      const nt = new VText(scene, { text: String(Need[i][j]), x: -155 + j * 50, y, z: 0, color: PALETTE.textDim, scale: 0.62 });
      created.push(at, nt);
    }
    rows.push({ box, y });
  }
  const done = new Array(N).fill(false);
  const seq = [];
  let unsafe = false;
  while (seq.length < N) {
    let found = -1;
    for (let i = 0; i < N; i++) {
      if (done[i]) continue;
      const ok = Need[i].every((v, j) => v <= A[j]);
      C(120, () => rows[i].box.setColor(ok ? PALETTE.green : PALETTE.red), () => rows[i].box.setColor(PALETTE.node));
      C(350, () => {}, () => {});
      C(120, () => { if (!ok) rows[i].box.setColor(PALETTE.node); }, () => rows[i].box.setColor(PALETTE.node));
      if (ok) {
        status.textContent = 'P' + i + '：Need ' + Need[i].join(',') + ' ≤ 可用 ' + A.join(',') + '，可运行';
        found = i;
        break;
      }
      status.textContent = 'P' + i + '：Need ' + Need[i].join(',') + ' > 可用 ' + A.join(',') + '，暂不可运行';
    }
    if (found < 0) { unsafe = true; break; }
    done[found] = true;
    seq.push(found);
    const fy = 140 - seq.length * 46;
    C(450, (t) => {
      rows[found].box.mesh.position.set(-540 + (DONE_X + 540) * t * (2 - t), rows[found].y + (fy - rows[found].y) * t * (2 - t), 0);
    }, () => { rows[found].box.mesh.position.set(-540, rows[found].y, 0); });
    for (let j = 0; j < 3; j++) A[j] += Alloc[found][j];
    C(300, () => availBoxes.forEach((b, j) => b.setText(String(A[j]))), () => {});
    status.textContent = 'P' + found + ' 运行完毕，释放 ' + Alloc[found].join(',') + '，可用变为 ' + A.join(',');
  }
  C(200, () => {
    if (unsafe) status.textContent = '银行家算法结束：找不到安全序列，系统处于不安全状态！';
    else status.textContent = '安全序列：' + seq.join(' → ') + '，全部进程可顺利执行';
  }, () => {});
}

panel.addButton('运行银行家', runBanker);
panel.addButton('清空', clearAll);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
