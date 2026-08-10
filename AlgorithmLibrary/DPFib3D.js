// AlgorithmLibrary/DPFib3D.js
// 动态规划计算斐波那契：3D 表格面板，F[0]=0、F[1]=1 预填，
// 计算时两个操作数单元格高亮发光，结果单元格留光迹。
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Table3D } from '../3D/modes/Table3D.js';
import { VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('DPFib3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const MAXN = 15;
const table = new Table3D(scene, { rows: 1, cols: MAXN + 1, startY: 40, cellW: 64, cellH: 48 });
table.create();
table.setRowLabel(0, 'F');

const hint = new VText(scene, { text: '', x: 0, y: 210, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const F = new Array(MAXN + 1).fill(null);
F[0] = 0;
F[1] = 1;
table.setCell(0, 0, '0', C);
table.setCell(0, 1, '1', C);

let n = 6;

function compute() {
  for (let i = 2; i <= n; i++) {
    const a = F[i - 1], b = F[i - 2];
    table.highlightCell(0, i - 1, C);
    table.highlightCell(0, i - 2, C);
    hint.setText('F[' + i + '] = F[' + (i - 1) + '] + F[' + (i - 2) + '] = ' + a + ' + ' + b + ' = ' + (a + b));
    F[i] = a + b;
    table.setCell(0, i, String(F[i]), C);
    table.unhighlightCell(0, i - 1, C);
    table.unhighlightCell(0, i - 2, C);
    table.highlightCell(0, i, C); // 结果留光迹
  }
  hint.setText('完成: F[' + n + '] = ' + F[n]);
  status.textContent = 'F[' + n + '] = ' + F[n];
}

function clearAll() {
  for (let i = 2; i <= MAXN; i++) {
    F[i] = null;
    table.setCell(0, i, '', C);
    table.unhighlightCell(0, i, C);
  }
  hint.setText('');
  status.textContent = '';
}

// 控件
let nInput = panel.addInput('n (1-15)', (v) => { const x = parseInt(v, 10); if (x >= 1 && x <= MAXN) n = x; }, 3);
panel.addButton('计算', compute);
panel.addButton('清空', clearAll);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
