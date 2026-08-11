// AlgorithmLibrary/Sunday3D.js — Sunday 匹配：失配时看「窗口后一位」，跳跃距离 = 模式中该字符末次出现位置
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, VArrow } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Sunday3D');

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GOLD = 0xfcd34d, GREEN = 0x4ade80, DIM = 0x334155, ROSE = 0xfb7185, CYAN = 0x67e8f9, AMBER = 0xfbbf24;
const hint = new VText(scene, { text: '点击「运行 Sunday」开始', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const TEXT = 'WOWOWOW', PAT = 'WOW';

function sunday(text, pat) {
  const shift = {};
  for (let k = 0; k < pat.length; k++) shift[pat[k]] = pat.length - k;
  const steps = [];
  let cmpCount = 0, i = 0;
  while (i + pat.length <= text.length) {
    steps.push({ type: 'shift', i });
    let j = 0;
    while (j < pat.length && text[i + j] === pat[j]) { cmpCount++; steps.push({ type: 'cmp', i, j, ok: true }); j++; }
    if (j === pat.length) { steps.push({ type: 'hit', i }); }
    else { cmpCount++; steps.push({ type: 'cmp', i, j, ok: false }); }
    const nxt = text[i + pat.length];
    const d = nxt === undefined ? 1 : (shift[nxt] ?? pat.length + 1);
    steps.push({ type: 'jump', i, nxt, d, to: i + d });
    i += d;
  }
  return { steps, cmpCount };
}
const sd = sunday(TEXT, PAT);
const hits = sd.steps.filter(s => s.type === 'hit').map(s => s.i);
const maxShift = sd.steps.reduce((m, s) => Math.max(m, s.d), 0);

const TX = k => -180 + k * 60;
const PX = j => -60 + j * 60;
const textBoxes = TEXT.split('').map((ch, k) =>
  new VBox(scene, { w: 50, h: 50, d: 50, x: TX(k), y: 150, z: 0, label: ch, color: DIM, emissive: DIM }));
const patBoxes = PAT.split('').map((ch, j) =>
  new VBox(scene, { w: 50, h: 50, d: 50, x: PX(j), y: 10, z: 0, label: ch, color: DIM, emissive: DIM }));
const tArrow = new VArrow(scene, { x: TX(0), y: 230, z: 0, down: true });
const shiftT = [
  new VText(scene, { text: 'shift[W] = 1', x: -320, y: 100, z: 0, color: CYAN, scale: 0.55 }),
  new VText(scene, { text: 'shift[O] = 2', x: -320, y: 70, z: 0, color: CYAN, scale: 0.55 }),
  new VText(scene, { text: 'shift[其他] = 4', x: -320, y: 40, z: 0, color: PALETTE.textDim, scale: 0.5 })
];
new VText(scene, { text: 'Sunday：失配时不看窗口里，而看「窗口后一位」—— 它必须出现在下个窗口里，按模式中它的末次位置跳', x: 0, y: 225, z: 0, color: PALETTE.textDim, scale: 0.68 });
new VText(scene, { text: '左侧 shift 表：字符 → 跳跃格数（模式长度 − 末次出现位置；不在模式中 → 模式长 + 1，直接跳整窗）', x: 0, y: -130, z: 0, color: PALETTE.textDim, scale: 0.62 });
const stageT = new VText(scene, { text: '', x: 0, y: 255, z: 0, color: GOLD, scale: 0.72 });
const outT = new VText(scene, { text: '', x: 0, y: -185, z: 0, color: PALETTE.textGlow, scale: 0.62 });

function resetAll() {
  engine.clear();
  textBoxes.forEach(b => { b.setColor(DIM, DIM); b.setText(b.text); });
  patBoxes.forEach(b => { b.setColor(DIM, DIM); b.setText(b.text); });
  tArrow.moveTo(TX(0), 230, 0, 1);
  shiftT[0].setText('shift[W] = 1', { color: CYAN });
  shiftT[1].setText('shift[O] = 2', { color: CYAN });
  shiftT[2].setText('shift[其他] = 4', { color: PALETTE.textDim });
  stageT.setText(''); outT.setText('');
}

function runSunday() {
  resetAll();
  hint.setText('Sunday 的聪明处：比对窗口内的字符是「白费」的，真正决定跳多远的是窗口后一位 —— 先建表，后跳跃');
  for (const s of sd.steps) {
    if (s.type === 'shift') {
      C(380, () => {
        tArrow.moveTo(TX(s.i), 230, 0, 320);
        stageT.setText(`i = ${s.i}：窗口对齐第 ${s.i} 位`);
      });
    } else if (s.type === 'cmp') {
      C(400, () => {
        textBoxes[s.i + s.j].setColor(s.ok ? CYAN : ROSE, s.ok ? CYAN : ROSE);
        patBoxes[s.j].setColor(s.ok ? CYAN : ROSE, s.ok ? CYAN : ROSE);
        if (!s.ok) { textBoxes[s.i + s.j].pulse(0.3); patBoxes[s.j].pulse(0.3); }
        stageT.setText(s.ok
          ? `text[${s.i + s.j}] = '${TEXT[s.i + s.j]}' 与 pat[${s.j}] 相同，继续`
          : `失配！窗口内不看了 —— 直接看窗口后一位 text[${s.i + PAT.length}] 决定跳多远`);
      });
    } else if (s.type === 'hit') {
      C(550, () => {
        for (let k = 0; k < PAT.length; k++) { textBoxes[s.i + k].setColor(GOLD, GOLD); patBoxes[k].setColor(GOLD, GOLD); textBoxes[s.i + k].pulse(0.35); }
        stageT.setText(`命中！位置 ${s.i} —— 但还要看一眼窗口后一位才能跳`);
      });
    } else {
      C(620, () => {
        if (s.nxt === undefined) {
          stageT.setText('窗口已经顶到文本末尾，没有「后一位」了 → 结束');
          hint.setText(`共命中 ${hits.length} 处（${hits.join('、')}）：最后的窗口命中后直接收工`);
        } else {
          textBoxes[s.i + PAT.length].setColor(AMBER, AMBER);
          textBoxes[s.i + PAT.length].pulse(0.3);
          const rule = s.nxt === 'W' ? 0 : s.nxt === 'O' ? 1 : 2;
          shiftT[rule].setText(shiftT[rule].text, { color: AMBER });
          stageT.setText(`后一位 = '${s.nxt}' → shift = ${s.d} → i 从 ${s.i} 跳到 ${s.to}`);
          hint.setText(`为什么能跳 ${s.d} 格？后一位 '${s.nxt}' 若参与匹配，它在模式里最后一次出现在倒数第 ${s.d} 位 —— 跳少了会重比，跳多了会错过，${s.d} 是极限`);
        }
        tArrow.moveTo(TX(Math.min(s.to, TEXT.length - PAT.length)), 230, 0, 500);
      });
    }
  }
  C(1000, () => {
    outT.setText(`命中 ${hits.length} 处（${hits.join('、')}），共比较 ${sd.cmpCount} 次 —— 最大一次跳跃 ${maxShift} 格，BF 需要 5 次对齐，Sunday 只用 4 次`);
    status.textContent = `Sunday 匹配命中 ${hits.length} 处（${hits.join('、')}），比较 ${sd.cmpCount} 次`;
    hint.setText('最坏 O(nm)（反复跳 1 格），但平均接近 O(n)：字符集越大、模式越短，跳过越多 —— 现实中普遍快于 KMP');
  });
  C(1200, () => {
    outT.setText('经典地位：Sunday 比 Boyer-Moore 的坏字符规则更激进（B-M 看窗口内最后失配位，Sunday 看窗口后一位）');
    hint.setText('应用：GNU grep 类工具、RNA 序列比对、编辑器查找 —— 实现极简（一张 shift 表 + 一个循环）');
  });
}

panel.addButton('运行 Sunday', runSunday);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；橙色 = 决定跳跃的后一位，金色 = 命中，左侧为 shift 跳跃表）');

scene.start(engine);
