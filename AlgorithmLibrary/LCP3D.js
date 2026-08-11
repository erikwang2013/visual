// AlgorithmLibrary/LCP3D.js — 相邻后缀 LCP：列式后缀图 + 底部 LCP 立柱 + 水平扫描线（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, VBar, VTorus } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('LCP3D');

const scene = new Scene3D('scene', { cameraPos: [0, 360, 820], fov: 60 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GREEN = 0x4ade80, GOLD = 0xfcd34d, RED = 0xfb7185, CYAN = 0x67e8f9, SLATE = 0x64748b;
const hint = new VText(scene, { text: '点击「运行演示」开始', x: 0, y: 700, z: 0, color: PALETTE.textGlow, scale: 0.8 });
const status = panel.addStatus('');

const TXT = 'banana';
const SA = (() => { const sa = [...TXT].map((_, i) => i).sort((a, b) => TXT.slice(a) < TXT.slice(b) ? -1 : 1); return sa; })();
const LCP = (() => { const l = [];
  for (let i = 0; i + 1 < SA.length; i++) { let k = 0;
    while (SA[i] + k < TXT.length && SA[i + 1] + k < TXT.length && TXT[SA[i] + k] === TXT[SA[i + 1] + k]) k++;
    l.push(k); } return l; })();
const COL_X = j => -250 + j * 100;
const CELL_Y = k => 560 - k * 27;
const BAR_BASE = 380;
const BAR_X = j => -200 + j * 100;
const lerp = (a, b, p) => a + (b - a) * p;

// 列式后缀图：每列 = 一个后缀（SA 顺序），从上到下逐字符
const cells = SA.map((start, j) => {
  const row = [];
  for (let k = 0; k < TXT.length - start; k++) {
    row.push(new VBox(scene, { w: 26, h: 26, d: 26, x: COL_X(j), y: CELL_Y(k), label: TXT[start + k], color: CYAN, emissive: CYAN }));
  }
  return row;
});
SA.map((start, j) => new VText(scene, { text: `SA[${j}]=${start}`, x: COL_X(j), y: 596, z: 0, color: PALETTE.textDim, scale: 0.42 }));
const bar = LCP.map((v, j) => { const b = new VBar(scene, { w: 30, d: 30, x: BAR_X(j), color: SLATE, emissive: SLATE }); b.mesh.scale.y = 0.5; b.mesh.position.y = 0.25; b.h = 1 + v * 34; return b; });
const barT = LCP.map((v, j) => new VText(scene, { text: '', x: BAR_X(j), y: 0, z: 0, color: GOLD, scale: 0.5 }));
new VText(scene, { text: 'LCP 立柱（高 = 公共前缀长度）', x: 0, y: 320, z: 0, color: PALETTE.textDim, scale: 0.55 });
const ring = new VTorus(scene, { radius: 24, x: 0, y: 0, color: GOLD });
ring.mesh.visible = false;
const outT = new VText(scene, { text: '', x: 0, y: 40, z: 0, color: PALETTE.textGlow, scale: 0.75 });

let fxGroup = new THREE.Group();
scene.add(fxGroup);
const clearFx = () => { scene.remove(fxGroup); fxGroup = new THREE.Group(); scene.add(fxGroup); };

function resetAll() {
  clearFx();
  cells.forEach(row => row.forEach(c => c.setColor(CYAN, CYAN)));
  bar.forEach(b => { b.mesh.scale.y = 0.5; b.mesh.position.y = 0.25; b.setColor(SLATE, SLATE); });
  barT.forEach(t => t.setText(''));
  ring.mesh.visible = false;
  outT.setText('');
}

// 水平扫描线：第 k 个字符行，横跨相邻两列
function scanLine(j, k) {
  clearFx();
  const y = CELL_Y(k);
  const m = new THREE.Mesh(new THREE.BoxGeometry(98, 5, 260),
    new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.35 }));
  m.position.set((COL_X(j) + COL_X(j + 1)) / 2, y, -10);
  fxGroup.add(m);
}

const growBar = (b, p, color) => { const h = Math.max(b.h * p, 0.5); b.mesh.scale.y = h; b.mesh.position.y = h / 2; if (color) b.setColor(color, color); };

function* runLCP() {
  yield S(resetAll);
  yield S(() => { hint.setText('LCP[i] = 相邻两个后缀（SA 中排相邻）的最长公共前缀长度。水平金线 = 当前比较偏移，逐字符下移'); });
  yield W(600);
  const maxIdx = LCP.indexOf(Math.max(...LCP));
  for (let j = 0; j < LCP.length; j++) {
    const a = SA[j], b = SA[j + 1], len = LCP[j];
    yield S(() => {
      outT.setText(`比较相邻后缀 #${j}：「${TXT.slice(a)}」 vs 「${TXT.slice(b)}」`);
      cells[j].forEach(c => c.setColor(GOLD, GOLD)); cells[j + 1].forEach(c => c.setColor(GOLD, GOLD));
    });
    yield W(600);
    for (let k = 0; k < len; k++) {
      yield S(() => { scanLine(j, k); outT.setText(`第 ${k} 位：'${TXT[a + k]}' == '${TXT[b + k]}' —— 匹配继续`); });
      yield W(420);
      yield S(() => { cells[j][k].setColor(GREEN, GREEN); cells[j + 1][k].setColor(GREEN, GREEN); });
      yield W(260);
    }
    if (a + len < TXT.length && b + len < TXT.length) {
      yield S(() => { scanLine(j, len); outT.setText(`第 ${len} 位失配：'${TXT[a + len]}' ≠ '${TXT[b + len]}' —— LCP 定格在 ${len}`); });
      yield W(520);
      yield S(() => { cells[j][len].setColor(RED, RED); cells[j + 1][len].setColor(RED, RED); });
      yield W(300);
    } else {
      yield S(() => outT.setText(`某个后缀已到末尾 —— LCP = 后缀长度 = ${len}`));
      yield W(520);
    }
    yield S(() => {
      growBar(bar[j], 1, len > 0 ? GREEN : SLATE);
      barT[j].setText(String(len), { color: len > 0 ? GOLD : PALETTE.textDim });
      barT[j].sprite.position.set(BAR_X(j), BAR_BASE + 1 + len * 34 + 16, 0);
      if (j === maxIdx) { ring.mesh.position.set(BAR_X(j), BAR_BASE, 0); ring.mesh.visible = true; }
      clearFx();
      cells.forEach(row => row.forEach(c => c.setColor(CYAN, CYAN)));
      outT.setText(`LCP[${j}] = ${len}：两后缀公共前缀「${TXT.slice(a, a + len)}」${len > 0 ? `（绿格 = 已匹配 ${len} 位）` : '（无公共前缀）'}`);
    });
    yield W(650);
  }
  yield S(() => {
    outT.setText(`完成：LCP = [${LCP.join(', ')}]，最大值 ${Math.max(...LCP)} 出现在 LCP[${maxIdx}] —— 最长重复子串「${TXT.slice(SA[maxIdx], SA[maxIdx] + LCP[maxIdx])}」`);
    status.textContent = `LCP("${TXT}") = [${LCP.join(', ')}]，最长公共前缀 "ana"（长度 3）`;
    hint.setText('Kasai 算法 O(n)：按文本顺序扫描，h 至少不减 1 —— 所有相邻后缀的 LCP 一次算完');
  });
}

panel.addButton('运行演示', () => engine.start(runLCP()));
panel.addButton('清空', () => { engine.clear(); resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；金色横线 = 扫描偏移，绿格 = 已匹配字符，柱 = LCP 长度）');

scene.start(engine);
