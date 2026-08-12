// AlgorithmLibrary/KMP3D.js — KMP：PMT 前缀表（金色悬浮柱）+ 失配 j 按 PMT 跳转、i 永不回溯（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, VNode, VTorus } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('KMP3D');

const scene = new Scene3D('scene', { cameraPos: [0, 430, 780], fov: 60 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, RED = 0xfb7185, GOLD = 0xfcd34d, GREEN = 0x4ade80, CYAN = 0x67e8f9;
const hint = new VText(scene, { text: '点击「运行演示」开始', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.8 });
const status = panel.addStatus('');

const TXT = 'ABABABACABAB', P = 'BABAC';
const pmt = (() => { const n = P.length, t = Array(n).fill(0); let k = 0; for (let j = 1; j < n; j++) { while (k > 0 && P[j] !== P[k]) k = t[k - 1]; if (P[j] === P[k]) k++; t[j] = k; } return t; })();
const SP = 46;
const lerp = (a, b, p) => a + (b - a) * p;
const mx = k => (k - (TXT.length - 1) / 2) * SP;
const px = k => (k - (P.length - 1) / 2) * SP;
const BAR_BASE = 560;
const sBox = [...TXT].map((ch, k) => new VBox(scene, { w: 40, h: 40, d: 40, x: mx(k), y: 150, label: ch, color: BLUE, emissive: BLUE }));
const pBox = [...P].map((ch, k) => new VBox(scene, { w: 40, h: 40, d: 40, x: px(k), y: 430, label: ch, color: RED, emissive: RED }));
const iBall = new VNode(scene, { radius: 11, x: mx(0), y: 70, color: CYAN, emissive: CYAN });
const jBall = new VNode(scene, { radius: 11, x: px(0), y: 520, color: GOLD, emissive: GOLD });
const ring = new VTorus(scene, { radius: 36, x: 0, y: 150, color: GREEN });
ring.mesh.visible = false;
const bars = pmt.map((v, k) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(30, 1, 30), new THREE.MeshBasicMaterial({ color: GOLD }));
  const h = (v + 0.6) * 26;
  m.scale.y = h; m.position.set(px(k), BAR_BASE + h / 2, 0);
  scene.add(m);
  return m;
});
const barVals = pmt.map((v, k) => new VText(scene, { text: String(v), x: px(k), y: BAR_BASE + (v + 0.6) * 26 + 22, z: 0, color: GOLD, scale: 0.5 }));
new VText(scene, { text: 'PMT 前缀表（柱高 = 最长相同前后缀长度）', x: 0, y: 250, z: 0, color: PALETTE.textDim, scale: 0.6 });
const outT = new VText(scene, { text: '', x: 0, y: 30, z: 0, color: PALETTE.textGlow, scale: 0.75 });

let fxGroup = new THREE.Group();
scene.add(fxGroup);
const clearFx = () => { scene.remove(fxGroup); fxGroup = new THREE.Group(); scene.add(fxGroup); };

const fly = (ball, x, y, ms = 340) => {
  const fx = ball.mesh.position.x, fy = ball.mesh.position.y;
  return A(ms, p => {
    const e = p * p * (3 - 2 * p);
    ball.mesh.position.x = lerp(fx, x, e);
    ball.mesh.position.y = lerp(fy, y, e);
  });
};

function resetAll() {
  clearFx();
  sBox.forEach(b => b.setColor(BLUE, BLUE));
  pBox.forEach(b => b.setColor(RED, RED));
  bars.forEach((m, k) => { const h = (pmt[k] + 0.6) * 26; m.scale.y = h; m.position.y = BAR_BASE + h / 2; });
  barVals.forEach((t, k) => t.setText(String(pmt[k]), { color: GOLD }));
  iBall.mesh.position.set(mx(0), 70, 0);
  jBall.mesh.position.set(px(0), 520, 0);
  ring.mesh.visible = false;
  outT.setText('');
}

function* drawJump(fromJ, toJ) {
  clearFx();
  const a = new THREE.Vector3(px(fromJ), 485, 60);
  const b = new THREE.Vector3(px(toJ), 485, 60);
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([a, b]),
    new THREE.LineDashedMaterial({ color: CYAN, dashSize: 9, gapSize: 5, transparent: true, opacity: 0.95 }));
  line.computeLineDistances();
  fxGroup.add(line);
  const head = new THREE.Mesh(new THREE.ConeGeometry(7, 15, 10), new THREE.MeshBasicMaterial({ color: CYAN }));
  head.rotation.z = -Math.PI / 2;
  head.position.copy(b).add(new THREE.Vector3(10, 0, 0));
  fxGroup.add(head);
  yield W(780);
  clearFx();
}

function* buildPMT() {
  let k = 0;
  yield S(() => { hint.setText('① 构建 PMT：P[j] 与已匹配前缀比较 —— 柱高逐渐涨起'); });
  for (let j = 1; j < P.length; j++) {
    yield S(() => { pBox[j].setColor(CYAN, CYAN); outT.setText(`构建 pmt[${j}]：前缀指针 k=${k}，比较 P[${j}]='${P[j]}' 与 P[${k}]='${P[k]}'`); });
    yield W(480);
    while (k > 0 && P[j] !== P[k]) {
      yield S(() => outT.setText(`P[${j}]='${P[j]}' ≠ P[${k}]='${P[k]}' → k 回退到 pmt[${k - 1}] = ${pmt[k - 1]}`));
      yield W(500);
      k = pmt[k - 1];
    }
    const hit = P[j] === P[k];
    if (hit) k++;
    pmt[j] = k;
    yield S(() => {
      pBox[j].setColor(hit ? GOLD : RED, hit ? GOLD : RED);
      const h = (k + 0.6) * 26;
      bars[j].scale.y = h; bars[j].position.y = BAR_BASE + h / 2;
      barVals[j].setText(String(k), { color: GOLD });
      outT.setText(hit ? `P[${j}]='${P[j]}' == P[${k - 1}] → pmt[${j}] = ${k}（柱高 ${k}）` : `失配 → pmt[${j}] = ${k}（柱高 0）`);
    });
    yield W(600);
    yield S(() => pBox[j].setColor(RED, RED));
  }
  yield S(() => hint.setText('① 完成：每根柱 = 该前缀的最长相同前后缀。② 匹配阶段：i 永不回溯'));
}

function* runKMP() {
  yield S(resetAll);
  yield* buildPMT();
  yield W(500);
  let i = 0, j = 0, jumps = 0;
  while (i < TXT.length) {
    if (j === 0) {
      yield fly(iBall, mx(i), 70);
      yield fly(jBall, px(0), 520);
      yield W(200);
    }
    yield fly(jBall, px(j), 520);
    yield S(() => { sBox[i].setColor(GOLD, GOLD); pBox[j].setColor(GOLD, GOLD); });
    yield W(280);
    if (TXT[i] === P[j]) {
      yield S(() => {
        sBox[i].setColor(GREEN, GREEN); pBox[j].setColor(GREEN, GREEN);
        outT.setText(`匹配：S[${i}]='${TXT[i]}' == P[${j}]='${P[j]}' —— i、j 同时前进`);
      });
      yield W(240);
      i++; j++;
    } else if (j > 0) {
      const nj = pmt[j - 1];
      jumps++;
      yield S(() => {
        sBox[i].setColor(BLUE, BLUE); pBox[j].setColor(RED, RED);
        hint.setText(`失配 → j 按 PMT 跳转：pmt[${j - 1}] = ${nj}，i=${i} 纹丝不动（青虚线箭头 = 跳转路径）`);
        outT.setText(`失配：S[${i}]='${TXT[i]}' ≠ P[${j}]='${P[j]}' —— j 不回退，跳到前缀表中位置 ${nj}`);
      });
      yield* drawJump(j, nj);
      yield W(240);
      j = nj;
    } else {
      yield S(() => {
        sBox[i].setColor(BLUE, BLUE); pBox[j].setColor(RED, RED);
        hint.setText('j=0 失配：i 前进 1 位，窗口右移，从头比较');
        outT.setText(`失配：S[${i}]='${TXT[i]}' ≠ P[0]='${P[0]}' —— 窗口右移 1 格`);
      });
      yield W(400);
      i++;
    }
    if (j === P.length) {
      const at = i - P.length;
      yield S(() => {
        for (let k = 0; k < P.length; k++) sBox[at + k].setColor(GREEN, GREEN);
        ring.mesh.position.set(mx(at), 150, 0);
        ring.mesh.visible = true;
        outT.setText(`匹配成功：S[${at}..${at + P.length - 1}] == P —— i 全程未回溯`);
        status.textContent = `KMP 结果：主串 "${TXT}" 中 "${P}" 出现在位置 ${at}（PMT 跳转 ${jumps} 次，i 移动 ${i} 次）`;
        hint.setText('对比 BF：同样失配，BF 的 i 回溯、重比已确认的字符；KMP 借助 PMT 直接跳过');
      });
      yield W(1500);
      return;
    }
    yield W(150);
  }
  yield S(() => { outT.setText('匹配失败'); status.textContent = `KMP 结果：主串 "${TXT}" 中未找到 "${P}"`; });
}

panel.addButton('运行演示', () => engine.start(runKMP()));
panel.addButton('清空', () => { engine.clear(); resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；金色柱 = PMT 值，青色虚线 = j 的跳转路径）');

scene.start(engine);
