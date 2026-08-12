// AlgorithmLibrary/BruteForce3D.js — BF 朴素匹配：i/j 双指针逐字符比对，失配 i 回溯、j 归零（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, VNode, VTorus } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('BruteForce3D');

const scene = new Scene3D('scene', { cameraPos: [0, 430, 780], fov: 60 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, RED = 0xfb7185, GOLD = 0xfcd34d, GREEN = 0x4ade80, CYAN = 0x67e8f9;
const hint = new VText(scene, { text: '点击「▶ 演示」开始', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.8 });
const status = panel.addStatus('');

const TXT = 'AACABAB', P = 'ABAB';
const SP = 46;
const lerp = (a, b, p) => a + (b - a) * p;
const mx = k => (k - (TXT.length - 1) / 2) * SP;
const px = k => (k - (P.length - 1) / 2) * SP;
const sBox = [...TXT].map((ch, k) => new VBox(scene, { w: 40, h: 40, d: 40, x: mx(k), y: 150, label: ch, color: BLUE, emissive: BLUE }));
const pBox = [...P].map((ch, k) => new VBox(scene, { w: 40, h: 40, d: 40, x: px(k), y: 430, label: ch, color: RED, emissive: RED }));
const iBall = new VNode(scene, { radius: 11, x: mx(0), y: 70, color: CYAN, emissive: CYAN });
const jBall = new VNode(scene, { radius: 11, x: px(0), y: 520, color: GOLD, emissive: GOLD });
const ring = new VTorus(scene, { radius: 36, x: 0, y: 150, color: GREEN });
ring.mesh.visible = false;
const outT = new VText(scene, { text: '', x: 0, y: 30, z: 0, color: PALETTE.textGlow, scale: 0.75 });
new VText(scene, { text: '主串 S', x: -330, y: 150, z: 0, color: PALETTE.textDim, scale: 0.6 });
new VText(scene, { text: '模式串 P', x: -330, y: 430, z: 0, color: PALETTE.textDim, scale: 0.6 });

const fly = (ball, x, y, ms = 340) => {
  const fx = ball.mesh.position.x, fy = ball.mesh.position.y;
  return A(ms, p => {
    const e = p * p * (3 - 2 * p);
    ball.mesh.position.x = lerp(fx, x, e);
    ball.mesh.position.y = lerp(fy, y, e);
  });
};

function resetAll() {
  sBox.forEach(b => b.setColor(BLUE, BLUE));
  pBox.forEach(b => b.setColor(RED, RED));
  iBall.mesh.position.set(mx(0), 70, 0);
  jBall.mesh.position.set(px(0), 520, 0);
  ring.mesh.visible = false;
  outT.setText('');
}

function* runBF() {
  yield S(resetAll);
  yield S(() => { hint.setText('BF：窗口从左往右试。失配 → i 回溯到窗口起点+1、j 归零重试 —— 已确认的字符全部重比，这就是 O(n×m) 的来源'); });
  let i = 0, j = 0, backtracks = 0;
  while (i <= TXT.length - P.length) {
    yield fly(iBall, mx(i), 70);
    yield fly(jBall, px(0), 520);
    while (j < P.length && i + j < TXT.length) {
      yield fly(jBall, px(j), 520);
      yield S(() => { sBox[i + j].setColor(GOLD, GOLD); pBox[j].setColor(GOLD, GOLD); });
      yield W(380);
      if (TXT[i + j] === P[j]) {
        yield S(() => {
          sBox[i + j].setColor(GREEN, GREEN); pBox[j].setColor(GREEN, GREEN);
          outT.setText(`第 ${j + 1} 位匹配：S[${i + j}]='${TXT[i + j]}' == P[${j}]='${P[j]}'`);
        });
        j++;
      } else {
        const back = i + 1;
        backtracks++;
        yield S(() => {
          sBox[i + j].setColor(RED, RED); pBox[j].setColor(RED, RED);
          outT.setText(`失配：S[${i + j}]='${TXT[i + j]}' ≠ P[${j}]='${P[j]}' —— i 回溯到 ${back}，j 归零重试`);
        });
        yield W(700);
        i = back;
        j = 0;
        break;
      }
    }
    if (j === P.length) {
      yield fly(jBall, px(P.length - 1), 520);
      yield S(() => {
        for (let k = 0; k < P.length; k++) sBox[i + k].setColor(GREEN, GREEN);
        ring.mesh.position.set(mx(i), 150, 0);
        ring.mesh.visible = true;
        outT.setText(`匹配成功：S[${i}..${i + P.length - 1}] == P —— 第 ${i + 1} 次对齐命中`);
        status.textContent = `BF 结果：主串 "${TXT}" 中 "${P}" 出现在位置 ${i}（回溯 ${backtracks} 次）`;
        hint.setText(`复杂度 O(n×m)：本例回溯 ${backtracks} 次，已确认的字符每次全部重比。改进：KMP 让 j 按前缀表跳转、i 永不回溯`);
      });
      yield W(1400);
      return;
    }
    yield S(() => { sBox.forEach(b => b.setColor(BLUE, BLUE)); pBox.forEach(b => b.setColor(RED, RED)); });
    yield W(250);
  }
  yield S(() => {
    outT.setText('匹配失败：主串中不存在模式串');
    status.textContent = `BF 结果：主串 "${TXT}" 中未找到 "${P}"`;
  });
}

engine.queue(() => runBF());
panel.addButton('清空', () => { engine.clear(); resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；青球 = 主串指针 i，金球 = 模式串指针 j）');

scene.start(engine);
