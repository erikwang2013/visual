// AlgorithmLibrary/RecQueens3D.js
// N 皇后（回溯）：Table3D 棋盘，皇后=VNode 球 "Q" 飞入格，
// 尝试格红=冲突、青=安全，回溯时皇后下落移除，找到解后皇后 pulse + VText 提示。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Table3D } from '../3D/modes/Table3D.js';
import { VNode, VText, easeInOut } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('RecQueens3D');

const scene = new Scene3D('scene', { cameraPos: [0, 220, 640], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const MAXQ = 8;
const status = panel.addStatus('');
let board = null;
let queens = [];
let resultText = null;

function clearAll() {
  if (board) {
    for (let r = 0; r < board.rows; r++) {
      for (let c = 0; c < board.cols; c++) {
        const box = board.cells[r][c];
        if (box) box.remove();
      }
    }
    for (const l of board.rowLabels) l.remove();
    for (const l of board.colLabels) l.remove();
    board = null;
  }
  for (const q of queens) q.remove();
  queens = [];
  if (resultText) { resultText.remove(); resultText = null; }
  status.textContent = '';
}

function cellPos(r, c) {
  const halfR = (board.rows - 1) / 2, halfC = (board.cols - 1) / 2;
  return { x: board.startX + (c - halfC) * board.cw, y: board.startY, z: (halfR - r) * board.ch * 0.85 };
}

function flashCell(r, c) {
  const box = board.cells[r][c];
  if (!box) return;
  const baseY = box.mesh.position.y;
  C(250, (p) => {
    box.mesh.material.color.lerpColors(new THREE.Color(PALETTE.node), new THREE.Color(PALETTE.red), easeInOut(p));
    box.mesh.material.emissive.setHex(PALETTE.redEmissive);
    box.mesh.position.y = baseY + Math.sin(p * Math.PI) * 6;
  }, () => { box.mesh.material.color.setHex(PALETTE.node); box.mesh.material.emissive.setHex(PALETTE.nodeEmissive); box.mesh.position.y = baseY; });
  C(300, (p) => {
    box.mesh.material.color.lerpColors(new THREE.Color(PALETTE.red), new THREE.Color(PALETTE.node), easeInOut(p));
    box.mesh.material.emissive.setHex(PALETTE.nodeEmissive);
    box.mesh.position.y = baseY + Math.sin(p * Math.PI) * 6;
  }, () => { box.mesh.material.color.setHex(PALETTE.node); box.mesh.material.emissive.setHex(PALETTE.nodeEmissive); box.mesh.position.y = baseY; });
}

function solve() {
  clearAll();
  let n = parseInt(qInput.value, 10);
  if (isNaN(n) || n < 1) n = 4;
  if (n > MAXQ) n = MAXQ;
  board = new Table3D(scene, { rows: n, cols: n, cellW: 64, cellH: 48, startY: 90 });
  board.create();
  resultText = new VText(scene, { text: '', x: 0, y: -230, z: 0, color: PALETTE.textGlow, scale: 1.2 });
  const qcol = new Array(n).fill(-1);
  let solutions = 0;

  const canPlace = (r, c) => {
    for (let i = 0; i < r; i++) {
      if (qcol[i] === c || Math.abs(qcol[i] - c) === Math.abs(i - r)) return false;
    }
    return true;
  };

  const dropQueen = (q) => {
    const from = q.mesh.position.y;
    C(350, (p) => { q.mesh.position.y = from + (-330 - from) * easeInOut(p); }, () => { q.mesh.position.y = from; });
    C(1, () => q.remove(), () => {});
  };

  const pulseQueens = () => {
    C(700, (p) => {
      queens.forEach((q, qi) => {
        const s = 1 + 0.25 * Math.sin(p * Math.PI * 3 + (qi / queens.length) * Math.PI * 2);
        q.mesh.scale.setScalar(s);
      });
    }, () => queens.forEach(q => q.mesh.scale.setScalar(1)));
  };

  function place(r) {
    for (let c = 0; c < n; c++) {
      status.textContent = '尝试第 ' + (r + 1) + ' 行第 ' + (c + 1) + ' 列';
      if (!canPlace(r, c)) {
        flashCell(r, c);
        C(150, () => {}, () => {});
        continue;
      }
      board.highlightCell(r, c, C);
      const p = cellPos(r, c);
      const q = new VNode(scene, { label: 'Q', x: p.x, y: 280, z: p.z, radius: 19, color: PALETTE.purple, emissive: PALETTE.purpleEmissive });
      q.mesh.scale.setScalar(0.01);
      queens.push(q);
      C(400, (pp) => {
        const e = easeInOut(pp);
        q.mesh.position.y = 280 + (p.y - 280) * e;
        q.mesh.scale.setScalar(0.01 + 0.99 * e);
      }, () => { q.remove(); });
      qcol[r] = c;
      if (r === n - 1) {
        solutions++;
        pulseQueens();
        C(1, () => resultText.setText('找到一个解（第 ' + solutions + ' 个）'), () => {});
        C(500, () => {}, () => {});
      } else {
        place(r + 1);
      }
      qcol[r] = -1;
      dropQueen(q);
      board.unhighlightCell(r, c, C);
    }
  }

  place(0);
  C(1, () => resultText.setText('共找到 ' + solutions + ' 个解'), () => {});
  status.textContent = '共找到 ' + solutions + ' 个解（皇后数 ' + n + '）';
}

let qInput = panel.addInput('皇后数 (4-8)', (v) => { if (v) solve(); }, 2);
qInput.value = '4';
panel.addButton('皇后区', () => { if (qInput.value) solve(); });
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
