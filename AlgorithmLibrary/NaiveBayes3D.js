// AlgorithmLibrary/NaiveBayes3D.js — 朴素贝叶斯：词频计数 + 条件概率分类（垃圾邮件识别）（function* 生成器驱动）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('NaiveBayes3D');

const scene = new Scene3D('scene', { cameraPos: [320, 500, 900], lookAt: [320, 500, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x67e8f9, ROSE = 0xfb7185, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：朴素贝叶斯', x: 700, y: 560, z: 0, color: PALETTE.textGlow, scale: 0.7, wrapChars: 7 });
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
  const x = 125 + i * 130;
  mailBoxes.push(new VBox(scene, { w: 110, h: 58, d: 60, x, y: 408, z: 0, label: '', color: m.spam ? GREEN : ROSE, emissive: m.spam ? GREEN : ROSE }));
  new VText(scene, { text: m.words, x, y: 408, z: 33, color: PALETTE.textDim, scale: 0.42 });
});
new VText(scene, { text: '训练集：4 封（绿=垃圾 · 红=正常）', x: 700, y: 515, z: 0, color: PALETTE.textDim, scale: 0.4, wrapChars: 10 });

const TEST = ['offer', 'win', 'now'];
const testBoxes = [];
for (let i = 0; i < 3; i++) {
  testBoxes.push(new VBox(scene, { w: 110, h: 46, d: 50, x: 180 + i * 140, y: 341, z: 0, label: TEST[i], color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
}
new VText(scene, { text: '待测邮件：「offer win now」', x: 700, y: 475, z: 0, color: PALETTE.textDim, scale: 0.4, wrapChars: 10 });

// 词频与平滑后条件概率（垃圾词数 6 / 正常词数 4，词表 9）
const FREQ = [
  { w: 'offer', sc: 2, hc: 0, pS: '3/15', pH: '1/13' },
  { w: 'win',   sc: 2, hc: 0, pS: '3/15', pH: '1/13' },
  { w: 'now',   sc: 1, hc: 0, pS: '2/15', pH: '1/13' },
];
new VText(scene, { text: '词频统计（垃圾/正常）→ 拉普拉斯平滑', x: 700, y: 445, z: 0, color: PALETTE.textDim, scale: 0.4, wrapChars: 10 });
const freqRows = FREQ.map((f, i) => new VText(scene, { text: '', x: 320, y: 293 - i * 22, z: 0, color: PALETTE.textGlow, scale: 0.45 }));

const stepT = new VText(scene, { text: '', x: 700, y: 375, z: 0, color: PALETTE.textGlow, scale: 0.5, wrapChars: 10 });
const barL = new VBox(scene, { w: 90, h: 18, d: 18, x: 415, y: 219, z: 0, label: '', color: GREEN, emissive: GREEN });
const barR = new VBox(scene, { w: 340, h: 18, d: 18, x: 170, y: 219, z: 0, label: '', color: ROSE, emissive: ROSE });
barL.mesh.visible = false; barR.mesh.visible = false;
const lpT = new VText(scene, { text: '', x: 700, y: 320, z: 0, color: GREEN, scale: 0.5, wrapChars: 10 });
const hpT = new VText(scene, { text: '', x: 700, y: 288, z: 0, color: ROSE, scale: 0.5, wrapChars: 10 });

function resetAll() {
  for (let i = 0; i < MAILS.length; i++) mailBoxes[i].setColor(MAILS[i].spam ? GREEN : ROSE, MAILS[i].spam ? GREEN : ROSE);
  for (const b of testBoxes) b.setColor(PALETTE.node, PALETTE.nodeEmissive);
  for (const t of freqRows) t.setText('');
  barL.mesh.visible = false; barR.mesh.visible = false;
  lpT.setText(''); hpT.setText('');
  stepT.setText('');
}

function* nbGen() {
  resetAll();
  yield S(() => hint.setText('朴素贝叶斯：P(类|邮件) ∝ P(类)·ΠP(词|类) — 垃圾过滤经典'));
  yield S(() => {
    for (let i = 0; i < MAILS.length; i++) mailBoxes[i].setColor(MAILS[i].spam ? GREEN : ROSE, MAILS[i].spam ? GREEN : ROSE);
    stepT.setText('训练：统计各词出现次数（词表 9 词）');
  });
  yield W(700);
  yield S(() => {
    for (const b of testBoxes) b.setColor(BLUE, BLUE);
    stepT.setText('求两个类别的后验概率，谁大判谁');
  });
  yield W(800);
  yield S(() => {
    FREQ.forEach((f, i) => { freqRows[i].setText(f.w + '：垃圾 ' + f.sc + ' 次 · 正常 ' + f.hc + ' 次   →   平滑后 ' + f.pS + ' / ' + f.pH); });
    stepT.setText('先验 0.5；P(词|类) = (次数+1)/(总词数+词表)');
  });
  yield W(900);
  yield S(() => {
    barL.mesh.visible = true; barR.mesh.visible = true;
    lpT.setText('垃圾 = 0.8153'); hpT.setText('正常 = −8.8173');
    stepT.setText('对数后验（越大越像该类）：垃圾 0.8153 ≫ 正常 −8.8173 → 判垃圾 ✓');
  });
  yield W(900);
  yield S(() => {
    status.textContent = '朴素贝叶斯完成：测试「offer win now」→ 垃圾邮件（0.8153 > −8.8173）';
    hint.setText('朴素贝叶斯：词独立假设，计算快、可增量训练 — 文本分类经典');
  });
  yield W(600);
}

engine.queue(() => nbGen());
panel.addButton('清空', () => { engine.clear(); resetAll(); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；条件概率用词频 + 拉普拉斯平滑计算，取对数避免下溢）');

scene.start(engine);
