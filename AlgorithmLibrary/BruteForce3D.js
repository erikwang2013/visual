// AlgorithmLibrary/BruteForce3D.js — BF 朴素匹配：逐位对齐 + 逐字符比较，O(nm) 最坏
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, VArrow } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('BruteForce3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, ROSE = 0xfb7185, CYAN = 0x67e8f9;
const hint = new VText(scene, { text: '点击「运行 BF 匹配」开始', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const TEXT = 'ABABABAB', PAT = 'ABAB';

function bruteForce(text, pat) {
  const steps = [];
  let cmpCount = 0;
  for (let i = 0; i + pat.length <= text.length; i++) {
    steps.push({ type: 'shift', i });
    let j = 0;
    while (j < pat.length && text[i + j] === pat[j]) { cmpCount++; steps.push({ type: 'cmp', i, j, ok: true }); j++; }
    if (j < pat.length) { cmpCount++; steps.push({ type: 'cmp', i, j, ok: false }); }
    else steps.push({ type: 'hit', i });
  }
  return { steps, cmpCount };
}
const bf = bruteForce(TEXT, PAT);
const hits = bf.steps.filter(s => s.type === 'hit').map(s => s.i);

const TX = k => -210 + k * 60;
const PX = j => -90 + j * 60;
const textBoxes = TEXT.split('').map((ch, k) =>
  new VBox(scene, { w: 50, h: 50, d: 50, x: TX(k), y: 150, z: 0, label: ch, color: DIM, emissive: DIM }));
const patBoxes = PAT.split('').map((ch, j) =>
  new VBox(scene, { w: 50, h: 50, d: 50, x: PX(j), y: 10, z: 0, label: ch, color: DIM, emissive: DIM }));
const tArrow = new VArrow(scene, { x: TX(0), y: 230, z: 0, down: true });
const pArrow = new VArrow(scene, { x: PX(0), y: -55, z: 0 });
const cmpT = new VText(scene, { text: '比较次数：0', x: -320, y: 150, z: 0, color: PALETTE.textDim, scale: 0.5 });
new VText(scene, { text: 'BF 朴素匹配：文本每个位置都把模式「整个比一遍」—— 错了就右移一格重来，最坏 O(nm)', x: 0, y: 225, z: 0, color: PALETTE.textDim, scale: 0.68 });
new VText(scene, { text: '上面的 i 指针 = 对齐位置（模式窗口起点），下面的 j 指针 = 模式内部比较位', x: 0, y: -130, z: 0, color: PALETTE.textDim, scale: 0.62 });
const stageT = new VText(scene, { text: '', x: 0, y: 255, z: 0, color: GOLD, scale: 0.72 });
const outT = new VText(scene, { text: '', x: 0, y: -185, z: 0, color: PALETTE.textGlow, scale: 0.62 });

function resetAll() {
  engine.clear();
  textBoxes.forEach(b => { b.setColor(DIM, DIM); b.setText(b.text); });
  patBoxes.forEach(b => { b.setColor(DIM, DIM); b.setText(b.text); });
  tArrow.moveTo(TX(0), 230, 0, 1); pArrow.moveTo(PX(0), -55, 0, 1);
  cmpT.setText('比较次数：0'); stageT.setText(''); outT.setText('');
}
let cmpShown = 0;

function runBF() {
  resetAll();
  cmpShown = 0;
  hint.setText('思路：i 把模式窗口钉在文本上，j 从 0 比到失配为止 —— 每个位置都试，绝不错过任何一个命中');
  for (const s of bf.steps) {
    if (s.type === 'shift') {
      C(400, () => {
        tArrow.moveTo(TX(s.i), 230, 0, 350);
        stageT.setText(`i = ${s.i}：窗口对齐文本第 ${s.i} 位，j 从 0 重新开始`);
        hint.setText(`对齐位置共 ${TEXT.length - PAT.length + 1} 个（i = 0..${TEXT.length - PAT.length}）—— 这就是朴素做法要逐个尝试的「起点」`);
      });
    } else if (s.type === 'cmp') {
      C(430, () => {
        pArrow.moveTo(PX(s.j), -55, 0, 300);
        textBoxes[s.i + s.j].setColor(CYAN, CYAN); patBoxes[s.j].setColor(CYAN, CYAN);
        stageT.setText(`比较 text[${s.i + s.j}] = '${TEXT[s.i + s.j]}' 与 pat[${s.j}] = '${PAT[s.j]}' → ${s.ok ? '相同' : '不同！'}`);
        cmpT.setText(`比较次数：${++cmpShown}`);
      });
      if (!s.ok) {
        C(430, () => {
          textBoxes[s.i + s.j].setColor(ROSE, ROSE); patBoxes[s.j].setColor(ROSE, ROSE);
          textBoxes[s.i + s.j].pulse(0.3); patBoxes[s.j].pulse(0.3);
          stageT.setText(`失配！j = ${s.j} 停下来 —— 整个窗口作废，i 右移 1 位重来`);
          hint.setText(`i 每次只敢挪 1 格：虽然前面比过的字符白费了，但朴素做法就是这样「保守」`);
        });
      }
    } else {
      C(650, () => {
        for (let k = 0; k < PAT.length; k++) { textBoxes[s.i + k].setColor(GOLD, GOLD); patBoxes[k].setColor(GOLD, GOLD); textBoxes[s.i + k].pulse(0.35); }
        stageT.setText(`完整命中！模式出现在文本位置 ${s.i}（第 ${hits.indexOf(s.i) + 1} 次）`);
        hint.setText('j 一直比到模式末尾都没失配 → 记录命中；然后继续向右试下一个位置');
      });
    }
  }
  C(1000, () => {
    outT.setText(`命中 ${hits.length} 处（位置 ${hits.join('、')}），共比较 ${bf.cmpCount} 次 —— KMP 只需 O(n+m) 就能完成同样任务`);
    status.textContent = `BF 匹配命中 ${hits.length} 处（${hits.join('、')}），比较 ${bf.cmpCount} 次`;
    hint.setText('对比：KMP/Boyer-Moore 失败后跳过一大段；BF 每次只进 1 格，但代码最简单、最不易错 —— 短模式场景的默认选择');
  });
  C(1200, () => {
    outT.setText('复杂度 O(n·m)：最坏「AAAA…A」配「AAA…AB」—— 每次都试到底才失败；最好 O(n)（第一个字符就失配）');
    hint.setText('应用：文本编辑器的小型查找、后缀自动机的对拍基准、GPU 上的并行字符匹配（每线程负责一个 i）');
  });
}

panel.addButton('运行 BF 匹配', runBF);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；金色 = 命中窗口，红色 = 本次失配的字符对）');

scene.start(engine);
