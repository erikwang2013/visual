// AlgorithmLibrary/KMP3D.js
// KMP 字符串匹配：文本/模式双排盒子 + next[] 前缀表。
// 构建 next 用橙色比较；匹配成功绿色脉冲，失配红色闪烁后 j=next[j-1]（i 不回退）。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Array3D } from '../3D/modes/Array3D.js';
import { VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('KMP3D');

const scene = new Scene3D('scene', { cameraPos: [0, 310, 720], fov: 58 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const status = panel.addStatus('');
const hint = new VText(scene, { text: '输入文本与模式串，点击「匹配」开始', x: 0, y: 268, z: 0, color: PALETTE.textGlow, scale: 0.85 });

let textArr = null, patArr = null, nextArr = null;
const aux = [];

function clearAll() {
  engine.clear();
  for (const o of aux) o.remove();
  aux.length = 0;
  for (const arr of [textArr, patArr, nextArr]) {
    if (!arr) continue;
    for (const el of arr.elems) el.remove();
    for (const l of arr.indexLabels) l.remove();
  }
  textArr = patArr = nextArr = null;
  hint.setText('输入文本与模式串，点击「匹配」开始');
  status.textContent = '已清空';
}

// ---- 模型 ----
function prefixModel(p) {
  const n = p.length, next = Array(n).fill(0);
  const events = [];   // {j, k, match, back, set}
  let k = 0;
  for (let j = 1; j < n; j++) {
    while (k > 0 && p[j] !== p[k]) {
      events.push({ j, k, match: false, back: true, set: null });
      k = next[k - 1];
    }
    const hit = p[j] === p[k];
    if (hit) k++;
    next[j] = k;
    events.push({ j, k, match: hit, back: false, set: k });
  }
  return { next, events };
}

function searchModel(t, p, next) {
  const events = [];   // {type, i, j, pos}
  let i = 0, j = 0;
  const n = t.length, m = p.length;
  while (i < n) {
    if (t[i] === p[j]) {
      events.push({ type: 'match', i, j });
      i++; j++;
      if (j === m) {
        events.push({ type: 'found', i, j, pos: i - m });
        j = next[j - 1];
      }
    } else {
      events.push({ type: 'mismatch', i, j });
      if (j > 0) j = next[j - 1];
      else i++;
    }
  }
  return events;
}

function flashCells(arr, idxs, color, cmd) {
  for (const k of idxs) {
    const el = arr.elems[k];
    if (!el) continue;
    cmd({ duration: 300, fn: (p) => {
      el.mesh.material.color.lerpColors(new THREE.Color(PALETTE.node), new THREE.Color(color), Math.min(1, p * 3));
      el.mesh.scale.setScalar(1 + 0.14 * Math.sin(p * Math.PI));
    }, undo: () => { el.setColor(PALETTE.node, PALETTE.nodeEmissive); el.mesh.scale.set(1, 1, 1); } });
  }
}

function run() {
  engine.clear();
  clearAll();
  const text = textInput.value.trim().toUpperCase() || 'ABABABCABAB';
  const pat = patInput.value.trim().toUpperCase() || 'ABABC';
  if (!pat || text.length < pat.length) {
    status.textContent = '模式串不能为空，且不能长于文本';
    return;
  }
  const T = text.length, P = pat.length;
  textInput.value = text; patInput.value = pat;
  textArr = new Array3D(scene, { type: 'box', count: T, w: 44, h: 44, spacing: 54, startY: 132 });
  patArr = new Array3D(scene, { type: 'box', count: P, w: 44, h: 44, spacing: 54, startY: 22 });
  nextArr = new Array3D(scene, { type: 'box', count: P, w: 44, h: 44, spacing: 54, startY: -112 });
  textArr.create(); patArr.create(); nextArr.create();
  for (let i = 0; i < T; i++) textArr.setValue(i, text[i], C);
  for (let i = 0; i < P; i++) patArr.setValue(i, pat[i], C);
  const tLbl = new VText(scene, { text: '文本', x: textArr.xOf(0) - 66, y: 132, z: 0, color: PALETTE.textDim, scale: 0.75 });
  const pLbl = new VText(scene, { text: '模式', x: patArr.xOf(0) - 66, y: 22, z: 0, color: PALETTE.textDim, scale: 0.75 });
  const nLbl = new VText(scene, { text: 'next[]', x: nextArr.xOf(0) - 82, y: -112, z: 0, color: PALETTE.textDim, scale: 0.75 });
  aux.push(tLbl, pLbl, nLbl);

  const { next, events } = prefixModel(pat);
  C(1, () => hint.setText('① 构建前缀表 next[]：每个前缀的最长相等前后缀长度'), () => {});
  for (const e of events) {
    if (e.back) {
      patArr.highlight(e.j, C, PALETTE.orange);
      patArr.highlight(e.k, C, PALETTE.red);
      C(1, () => hint.setText('next 构建：P[' + e.j + ']=' + pat[e.j] + ' ≠ P[' + e.k + ']=' + pat[e.k] + '，k 回退到 next[' + (e.k - 1) + ']=' + next[e.k - 1]), () => {});
      patArr.unhighlight(e.j, C);
      patArr.unhighlight(e.k, C);
    } else {
      patArr.highlight(e.j, C, PALETTE.orange);
      patArr.highlight(e.k, C, e.match ? PALETTE.green : PALETTE.red);
      nextArr.setValue(e.j, e.set, C);
      C(1, () => {
        hint.setText('P[' + e.j + ']=' + pat[e.j] + (e.match ? ' = ' : ' ≠ ') + 'P[' + e.k + ']=' + pat[e.k] + '，next[' + e.j + ']=' + e.set);
        nextArr.elems[e.j].setColor(e.match ? PALETTE.green : PALETTE.node, e.match ? PALETTE.greenEmissive : PALETTE.nodeEmissive);
      }, () => {});
      patArr.unhighlight(e.j, C);
      patArr.unhighlight(e.k, C);
    }
  }

  C(1, () => hint.setText('② 匹配阶段：i 不回退，失配时 j = next[j-1]'), () => {});
  const se = searchModel(text, pat, next);
  const found = [];
  for (const e of se) {
    if (e.type === 'match') {
      textArr.highlight(e.i, C, PALETTE.green);
      patArr.highlight(e.j, C, PALETTE.green);
      C(1, () => hint.setText('T[' + e.i + ']=' + text[e.i] + ' = P[' + e.j + ']，继续：i→' + (e.i + 1) + '，j→' + (e.j + 1)), () => {});
    } else if (e.type === 'found') {
      found.push(e.pos);
      flashCells(textArr, Array.from({ length: P }, (_, k) => e.pos + k), PALETTE.green, C);
      C(1, () => hint.setText('✔ 在位置 ' + e.pos + ' 找到模式串！继续向后查找'), () => {});
    } else {
      textArr.highlight(e.i, C, PALETTE.red);
      patArr.highlight(e.j, C, PALETTE.red);
      if (e.j > 0) {
        C(1, () => hint.setText('失配：T[' + e.i + ']=' + text[e.i] + ' ≠ P[' + e.j + ']=' + pat[e.j] + '，j 回退为 next[' + (e.j - 1) + ']=' + next[e.j - 1] + '，i 不动'), () => {});
        patArr.unhighlight(e.j, C);
        textArr.unhighlight(e.i, C);
        patArr.highlight(next[e.j - 1], C, PALETTE.highlight);
      } else {
        C(1, () => hint.setText('失配且 j=0：i 前进 1，重新从 P[0] 比较'), () => {});
        patArr.unhighlight(e.j, C);
        textArr.unhighlight(e.i, C);
      }
    }
  }
  C(1, () => {
    status.textContent = found.length ? '匹配位置: ' + found.join(', ') : '未找到模式串';
    hint.setText(found.length ? 'KMP 完成：共 ' + found.length + ' 处匹配，i 全程不回退' : 'KMP 完成：未找到匹配，i 全程不回退');
  }, () => {});
}

const textInput = panel.addInput('文本串', run, 16);
textInput.value = 'ABABABCABAB';
const patInput = panel.addInput('模式串', run, 8);
patInput.value = 'ABABC';
panel.addButton('匹配', run);
panel.addButton('清空', clearAll);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
