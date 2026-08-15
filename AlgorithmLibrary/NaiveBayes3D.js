// AlgorithmLibrary/NaiveBayes3D.js — 朴素贝叶斯分类：词频统计 + 拉普拉斯平滑 + 对数后验比较（垃圾邮件识别）（function* 生成器驱动，解说入状态栏）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('NaiveBayes3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GREEN = 0x4ade80, ROSE = 0xfb7185, BLUE = 0x67e8f9;
const status = panel.addStatus('就绪');

// 4 封训练邮件：绿=垃圾 2 封，红=正常 2 封
const MAILS = [
  { words: 'offer buy win money', spam: true },
  { words: 'win now offer', spam: true },
  { words: 'meeting report schedule', spam: false },
  { words: 'report meeting agenda', spam: false },
];
const mailBoxes = [];
MAILS.forEach((m, i) => {
  const x = 95 + i * 150;
  mailBoxes.push(new VBox(scene, { w: 128, h: 54, d: 62, x, y: 700, z: 0, label: '', color: m.spam ? GREEN : ROSE, emissive: m.spam ? GREEN : ROSE }));
  new VText(scene, { text: m.words, x, y: 700, z: 36, color: PALETTE.textDim, scale: 0.42 });
});
const lblS = new VText(scene, { text: '垃圾', x: 66, y: 742, z: 0, color: GREEN, scale: 0.5 });
const lblN = new VText(scene, { text: '正常', x: 66, y: 706, z: 0, color: ROSE, scale: 0.5 });

// 待测邮件「offer win now」3 个词条
const TEST = ['offer', 'win', 'now'];
const testBoxes = [];
for (let i = 0; i < 3; i++) {
  testBoxes.push(new VBox(scene, { w: 104, h: 40, d: 46, x: 210 + i * 130, y: 592, z: 0, label: TEST[i], color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
}

// 词频统计与平滑后条件概率（垃圾总词数 6 / 正常总词数 4，词表 9）
const FREQ = [
  { w: 'offer', sc: 2, hc: 0, pS: '3/15', pH: '1/13' },
  { w: 'win',   sc: 2, hc: 0, pS: '3/15', pH: '1/13' },
  { w: 'now',   sc: 1, hc: 0, pS: '2/15', pH: '1/13' },
];
const freqRows = FREQ.map((f, i) => new VText(scene, { text: '', x: 320, y: 490 - i * 36, z: 0, color: PALETTE.textGlow, scale: 0.45 }));

// 对数后验对比条（垃圾绿 / 正常红，宽度 ∝ 得分）
const barS = new VBox(scene, { w: 60, h: 16, d: 16, x: 170, y: 390, z: 0, label: '', color: GREEN, emissive: GREEN });
const barN = new VBox(scene, { w: 60, h: 16, d: 16, x: 170, y: 352, z: 0, label: '', color: ROSE, emissive: ROSE });
barS.mesh.visible = false; barN.mesh.visible = false;

function resetAll() {
  mailBoxes.forEach((b, i) => b.setColor(MAILS[i].spam ? GREEN : ROSE, MAILS[i].spam ? GREEN : ROSE));
  testBoxes.forEach(b => b.setColor(PALETTE.node, PALETTE.nodeEmissive));
  freqRows.forEach(t => t.setText(''));
  barS.mesh.visible = false; barN.mesh.visible = false;
}
function setBar(bar, score) {
  const sx = Math.max((score + 8.8173) / 9.6326, 0.04);
  bar.mesh.scale.x = sx;
  bar.mesh.position.x = 170 + 30 * sx;
  bar.mesh.visible = true;
}

function* runNB() {
  resetAll();
  yield S(() => { status.textContent = '朴素贝叶斯：P(类|邮件) ∝ P(类)·Π P(词|类)。训练集 4 封（绿=垃圾 2，红=正常 2），待测「offer win now」，先验 P(垃圾)=P(正常)=0.5'; });
  yield W(900);
  yield S(() => {
    testBoxes.forEach(b => b.setColor(BLUE, BLUE));
    status.textContent = '第 1 步 词频统计：offer 2/0、win 2/0、now 1/0（垃圾/正常）；垃圾邮件总词数 6、正常 4，词表 9 词';
  });
  yield W(900);
  yield S(() => {
    FREQ.forEach((f, i) => { freqRows[i].setText(f.w + '：垃圾 ' + f.sc + ' · 正常 ' + f.hc + ' → 平滑后 ' + f.pS + ' / ' + f.pH); });
    status.textContent = '第 2 步 拉普拉斯平滑：P(词|类) = (次数+1)/(该类总词数+词表)，未出现的词也有小概率 1/13';
  });
  yield W(1000);
  yield S(() => {
    setBar(barS, 0.8153); setBar(barN, -8.8173);
    status.textContent = '第 3 步 对数后验（越大越像该类）：垃圾 0.8153 ≫ 正常 −8.8173 → 判为垃圾邮件 ✓';
  });
  yield W(1100);
  yield S(() => { status.textContent = 'NaiveBayes 演示完成：「offer win now」→ 垃圾邮件（0.8153 > −8.8173），先验 0.5 × 平滑条件概率连乘；复杂度：训练与分类均 O(d)，d 为特征数'; });
  yield W(900);
}

engine.queue(() => runNB());
panel.addButton('清空', () => {
  engine.clear();
  resetAll();
  status.textContent = '';
});

scene.start(engine);
