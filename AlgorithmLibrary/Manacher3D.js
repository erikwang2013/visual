// AlgorithmLibrary/Manacher3D.js
// Manacher 最长回文子串：扩展串 T（字符与 '#' 分隔符交错），
// 逐中心向两侧扩张（中心 cyan、指针 red），d[] 标注回文半径，最后绿色高亮最长回文区间。
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, easeInOut } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('Manacher3D');

const scene = new Scene3D('scene', { cameraPos: [0, 300, 880], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const status = panel.addStatus('');
const hint = new VText(scene, { text: '输入字符串，点击「求解」', x: 0, y: 250, z: 0, color: PALETTE.textGlow, scale: 0.85 });

const SEP_COLOR = 0x64748b, SEP_EM = 0x1e293b;
let boxes = [], dLbls = [], aux = [];
const boxColor = (i) => (i % 2 === 0 ? SEP_COLOR : PALETTE.node);
const boxEm = (i) => (i % 2 === 0 ? SEP_EM : PALETTE.nodeEmissive);

function clearAll() {
  engine.clear();
  for (const o of boxes) o.remove();
  for (const o of dLbls) o.remove();
  for (const o of aux) o.remove();
  boxes = []; dLbls = []; aux = [];
  status.textContent = '已清空';
  hint.setText('输入字符串，点击「求解」');
}

// 中心扩展模型：返回扩展串、d[]、逐步事件
function buildModel(s) {
  const n = 2 * s.length + 1;
  const T = ['#'];
  for (const ch of s) T.push(ch, '#');
  const d = new Array(n).fill(1);
  const steps = [];
  for (let c = 0; c < n; c++) {
    steps.push({ t: 'center', c });
    let l = c - 1, r = c + 1;
    while (l >= 0 && r < n && T[l] === T[r]) {
      d[c]++;
      steps.push({ t: 'eq', c, l, r, v: d[c] });
      l--; r++;
    }
    if (l >= 0 && r < n) steps.push({ t: 'mis', c, l, r });
    steps.push({ t: 'done', c, v: d[c] });
  }
  let bc = 0, bv = 1;
  for (let c = 0; c < n; c++) if (d[c] > bv) { bv = d[c]; bc = c; }
  return { T, d, steps, n, best: { c: bc, v: bv } };
}

function solve() {
  clearAll();
  const s = input.value.trim().toUpperCase() || 'ABACABAD';
  input.value = s;
  const { T, steps, n, best } = buildModel(s);
  const spacing = n > 33 ? 38 : 46;
  const w = n > 33 ? 34 : 40;
  const y = 30;
  boxes = new Array(n); dLbls = new Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * spacing;
    const sep = i % 2 === 0;
    const box = new VBox(scene, { w: sep ? 20 : w, h: sep ? 20 : w, d: sep ? 20 : w * 0.6, x, y, label: T[i], color: boxColor(i), emissive: boxEm(i) });
    box.mesh.scale.setScalar(0.01);
    (function (b) {
      C(350, (p) => { const t = easeInOut(p); b.mesh.scale.setScalar(0.01 + 0.99 * t); }, () => b.mesh.scale.set(1, 1, 1));
    })(box);
    boxes[i] = box;
    const dl = new VText(scene, { text: '0', x, y: y - 52, z: 0, color: PALETTE.textDim, scale: 0.7 });
    dLbls[i] = dl;
  }
  const tLbl = new VText(scene, { text: '扩展串 T（# 为分隔符）', x: boxes[0].mesh.position.x - 46, y: y + 58, z: 0, color: PALETTE.textDim, scale: 0.7 });
  const dLbl = new VText(scene, { text: 'd[]', x: boxes[0].mesh.position.x - 40, y: y - 52, z: 0, color: PALETTE.textDim, scale: 0.7 });
  aux.push(tLbl, dLbl);

  C(1, () => hint.setText('① 扩展串 T = # 与字符交错，逐中心向两侧扩张，记录半径 d[]'), () => {});
  for (const st of steps) {
    if (st.t === 'center') {
      C(500, () => {
        hint.setText('② 中心 T[' + st.c + "]='" + T[st.c] + "'，向两侧扩张（指针红色）");
        boxes[st.c].setColor(PALETTE.highlight, PALETTE.highlightEmissive);
      }, () => {});
    } else if (st.t === 'eq') {
      C(450, () => {
        hint.setText('指针扩张：T[' + st.l + "]='" + T[st.l] + "' 与 T[" + st.r + "]='" + T[st.r] + "'");
        boxes[st.l].setColor(PALETTE.red, PALETTE.redEmissive);
        boxes[st.r].setColor(PALETTE.red, PALETTE.redEmissive);
      }, () => {});
      C(450, () => {
        hint.setText('相等，半径 +1 → d = ' + st.v);
        boxes[st.l].setColor(PALETTE.green, PALETTE.greenEmissive);
        boxes[st.r].setColor(PALETTE.green, PALETTE.greenEmissive);
      }, () => {});
      C(1, () => {
        boxes[st.l].setColor(boxColor(st.l), boxEm(st.l));
        boxes[st.r].setColor(boxColor(st.r), boxEm(st.r));
      }, () => {});
    } else if (st.t === 'mis') {
      C(650, () => {
        hint.setText('T[' + st.l + "]='" + T[st.l] + "' ≠ T[" + st.r + "]='" + T[st.r] + "'，扩展停止");
        boxes[st.l].setColor(PALETTE.red, PALETTE.redEmissive);
        boxes[st.r].setColor(PALETTE.red, PALETTE.redEmissive);
      }, () => {});
      C(1, () => {
        boxes[st.l].setColor(boxColor(st.l), boxEm(st.l));
        boxes[st.r].setColor(boxColor(st.r), boxEm(st.r));
      }, () => {});
    } else {
      C(600, () => {
        hint.setText('③ 半径确定：d[' + st.c + '] = ' + st.v);
        boxes[st.c].setColor(boxColor(st.c), boxEm(st.c));
        dLbls[st.c].setText(String(st.v));
      }, () => {});
    }
  }
  const startExp = best.c - (best.v - 1);
  const endExp = best.c + (best.v - 1);
  C(1, () => hint.setText('④ 所有中心处理完毕：最长半径 d[' + best.c + '] = ' + best.v + '，最长回文区间绿色高亮'), () => {});
  for (let i = startExp; i <= endExp; i++) {
    (function (ii) {
      C(150, () => boxes[ii].setColor(PALETTE.green, PALETTE.greenEmissive), () => {});
    })(i);
  }
  const os = startExp / 2;
  const sub = s.substring(os, os + best.v - 1);
  C(1, () => {
    status.textContent = '最长回文子串: ' + sub + '（长度 ' + (best.v - 1) + '）';
    hint.setText('✔ 最长回文子串 "' + sub + '"（原始区间 [' + os + ', ' + (os + best.v - 2) + ']）');
  }, () => {});
}

const input = panel.addInput('字符串', () => solve(), 20);
input.value = 'abacabad';
panel.addButton('求解', solve);
panel.addButton('清空', clearAll);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
