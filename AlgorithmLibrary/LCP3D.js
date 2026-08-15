// AlgorithmLibrary/LCP3D.js — 相邻后缀 LCP：列式后缀图 + 底部 LCP 立柱 + 水平扫描线（function* 生成器驱动，解说入状态栏）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, VBar, VTorus } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('LCP3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GREEN = 0x4ade80, GOLD = 0xfcd34d, RED = 0xfb7185, CYAN = 0x67e8f9, SLATE = 0x64748b;
const status = panel.addStatus('就绪');

const TXT = 'banana';
const SA = (() => { const sa = [...TXT].map((_, i) => i).sort((a, b) => TXT.slice(a) < TXT.slice(b) ? -1 : 1); return sa; })();
const LCP = (() => { const l = [];
  for (let i = 0; i + 1 < SA.length; i++) { let k = 0;
    while (SA[i] + k < TXT.length && SA[i + 1] + k < TXT.length && TXT[SA[i] + k] === TXT[SA[i + 1] + k]) k++;
    l.push(k); } return l; })();
const COL_X = j => -250 + j * 100 + 320;
const CELL_Y = k => 560 - k * 27;
const BAR_BASE = 380;
const BAR_X = j => -200 + j * 100 + 320;

// 列式后缀图：每列 = 一个后缀（SA 顺序），从上到下逐字符
const cells = SA.map((start, j) => {
  const row = [];
  for (let k = 0; k < TXT.length - start; k++) {
    row.push(new VBox(scene, { w: 26, h: 26, d: 26, x: COL_X(j), y: CELL_Y(k), label: TXT[start + k], color: CYAN, emissive: CYAN }));
  }
  return row;
});
SA.map((start, j) => new VText(scene, { text: `SA[${j}]=${start}`, x: COL_X(j), y: 596, z: 0, color: PALETTE.textDim, scale: 0.42 }));
const bar = LCP.map((v, j) => { const b = new VBar(scene, { w: 30, d: 30, x: BAR_X(j), color: SLATE, emissive: SLATE }); b.mesh.scale.y = 0.5; b.mesh.position.y = BAR_BASE + 0.25; b.h = 1 + v * 34; return b; });
const barT = LCP.map((v, j) => new VText(scene, { text: '', x: BAR_X(j), y: BAR_BASE + 0.25, z: 0, color: GOLD, scale: 0.5 }));
const ring = new VTorus(scene, { radius: 24, x: 0, y: 0, color: GOLD });
ring.mesh.visible = false;

// 水平扫描线（模块级预建复用）：第 k 个字符行，横跨相邻两列
const scanMesh = (() => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(98, 5, 260), new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.35 }));
  m.visible = false;
  scene.add(m);
  return m;
})();
const scanLine = (j, k) => {
  scanMesh.position.set((COL_X(j) + COL_X(j + 1)) / 2, CELL_Y(k), -10);
  scanMesh.visible = true;
};
const hideScan = () => { scanMesh.visible = false; };

function resetAll() {
  hideScan();
  cells.forEach(row => row.forEach(c => c.setColor(CYAN, CYAN)));
  bar.forEach(b => { b.mesh.scale.y = 0.5; b.mesh.position.y = BAR_BASE + 0.25; b.setColor(SLATE, SLATE); });
  barT.forEach(t => t.setText(''));
  ring.mesh.visible = false;
}

const growBar = (b, p, color) => { const h = Math.max(b.h * p, 0.5); b.mesh.scale.y = h; b.mesh.position.y = BAR_BASE + h / 2; if (color) b.setColor(color, color); };

function* runLCP() {
  yield S(() => { resetAll(); status.textContent = '相邻后缀 LCP：比较 SA 中排相邻的两个后缀，逐字符下移，公共前缀长度即为 LCP[i]（金线 = 比较偏移，绿格 = 已匹配）'; });
  yield W(600);
  const maxIdx = LCP.indexOf(Math.max(...LCP));
  for (let j = 0; j < LCP.length; j++) {
    const a = SA[j], b = SA[j + 1], len = LCP[j];
    yield S(() => {
      status.textContent = `比较相邻后缀 #${j}：「${TXT.slice(a)}」 vs 「${TXT.slice(b)}」`;
      cells[j].forEach(c => c.setColor(GOLD, GOLD)); cells[j + 1].forEach(c => c.setColor(GOLD, GOLD));
    });
    yield W(600);
    for (let k = 0; k < len; k++) {
      yield S(() => { scanLine(j, k); status.textContent = `第 ${k} 位：'${TXT[a + k]}' == '${TXT[b + k]}' —— 匹配继续`; });
      yield W(420);
      yield S(() => { cells[j][k].setColor(GREEN, GREEN); cells[j + 1][k].setColor(GREEN, GREEN); });
      yield W(260);
    }
    if (a + len < TXT.length && b + len < TXT.length) {
      yield S(() => { scanLine(j, len); status.textContent = `第 ${len} 位失配：'${TXT[a + len]}' ≠ '${TXT[b + len]}' —— LCP 定格在 ${len}`; });
      yield W(520);
      yield S(() => { cells[j][len].setColor(RED, RED); cells[j + 1][len].setColor(RED, RED); });
      yield W(300);
    } else {
      yield S(() => status.textContent = `某个后缀已到末尾 —— LCP = 后缀长度 = ${len}`);
      yield W(520);
    }
    yield S(() => {
      growBar(bar[j], 1, len > 0 ? GREEN : SLATE);
      barT[j].setText(String(len), { color: len > 0 ? GOLD : PALETTE.textDim });
      barT[j].sprite.position.set(BAR_X(j), BAR_BASE + 1 + len * 34 + 16, 0);
      if (j === maxIdx) { ring.mesh.position.set(BAR_X(j), BAR_BASE, 0); ring.mesh.visible = true; }
      hideScan();
      cells.forEach(row => row.forEach(c => c.setColor(CYAN, CYAN)));
      status.textContent = `LCP[${j}] = ${len}：两后缀公共前缀「${TXT.slice(a, a + len)}」${len > 0 ? `（绿格 = 已匹配 ${len} 位）` : '（无公共前缀）'}`;
    });
    yield W(650);
  }
  yield S(() => {
    status.textContent = `LCP 演示完成：LCP("${TXT}") = [${LCP.join(', ')}]，最大值 ${Math.max(...LCP)} 出现在 LCP[${maxIdx}]，最长重复子串「${TXT.slice(SA[maxIdx], SA[maxIdx] + LCP[maxIdx])}」`;
  });
  yield W(500);
}

engine.queue(() => runLCP());
panel.addButton('清空', () => { engine.clear(); resetAll(); status.textContent = ''; });

scene.start(engine);
