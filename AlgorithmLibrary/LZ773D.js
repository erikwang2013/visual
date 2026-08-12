// AlgorithmLibrary/LZ773D.js — LZ77：滑动窗口半透明框 + 金环扫描 + 匹配虚线弧 + 金色粒子流（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, VTorus } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('LZ773D');

const scene = new Scene3D('scene', { cameraPos: [0, 380, 640], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GREEN = 0x4ade80, GOLD = 0xfcd34d, YELLOW = 0xfacc15, BLUE = 0x60a5fa, CYAN = 0x67e8f9;
const hint = new VText(scene, { text: '点击「运行演示」开始', x: 0, y: 260, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const TXT = 'ABABABABC', WIN = 5;
const SP = 50, X0 = -TXT.length * SP / 2 + SP / 2;
const boxes = [];
for (let i = 0; i < TXT.length; i++) {
  boxes.push(new VBox(scene, { w: 40, h: 40, d: 40, x: X0 + i * SP, y: 60, z: 0, label: TXT[i], color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
}
const frame = new VBox(scene, { w: WIN * SP + 30, h: 66, d: 56, x: X0, y: 60, z: 0, color: PALETTE.edge, emissive: PALETTE.edgeEmissive });
frame.mesh.material.transparent = true;
frame.mesh.material.opacity = 0.12;
new VText(scene, { text: '输入序列（窗口大小 = ' + WIN + '）', x: X0 - 250, y: 60, z: 0, color: PALETTE.textDim, scale: 0.7 });
const outText = new VText(scene, { text: '', x: 0, y: -70, z: 0, color: PALETTE.textGlow, scale: 0.8 });
const winText = new VText(scene, { text: '', x: 0, y: -120, z: 0, color: PALETTE.textDim, scale: 0.7 });

// 预计算 tokens：(偏移, 长度, 下一字符) — 长度 0 表示字面量
const tokens = [];
for (let i = 0; i < TXT.length; ) {
  const start = Math.max(0, i - WIN);
  let bestOff = 0, bestLen = 0;
  for (let o = 1; o <= i - start; o++) {
    let l = 0;
    while (l < WIN && i + l < TXT.length && TXT[i + l] === TXT[i - o + l]) l++;
    if (l > bestLen) { bestLen = l; bestOff = o; }
  }
  if (bestLen === 0) { tokens.push({ off: 0, len: 0, next: TXT[i], pos: i }); i++; }
  else { tokens.push({ off: bestOff, len: bestLen, next: TXT[i + bestLen], pos: i }); i += bestLen + 1; }
}

const ring = new VTorus(scene, { radius: 30, x: X0, y: 60, color: GOLD });
ring.mesh.visible = false;
const tokenText = new VText(scene, { text: '', x: 0, y: 185, z: 0, color: PALETTE.textGlow, scale: 0.75 });

let fxGroup = new THREE.Group();
scene.add(fxGroup);
const clearFx = () => { scene.remove(fxGroup); fxGroup = new THREE.Group(); scene.add(fxGroup); };

function flowLine(pA, pB, count = 3, ms = 380) {
  const parts = [];
  for (let i = 0; i < count; i++) {
    const v = new THREE.Mesh(new THREE.SphereGeometry(3.5, 8, 8),
      new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.9 }));
    parts.push(v); fxGroup.add(v);
  }
  return A(ms, p => parts.forEach((v, i) => v.position.copy(pA.clone().lerp(pB, (p + i * 0.18) % 1))));
}

function matchArc(srcI, dstI) {
  const pA = new THREE.Vector3(X0 + srcI * SP, 60, 30);
  const pB = new THREE.Vector3(X0 + dstI * SP, 60, 30);
  const mid = new THREE.Vector3((pA.x + pB.x) / 2, (pA.y + pB.y) / 2, 52);
  const curve = new THREE.QuadraticBezierCurve3(pA, mid, pB);
  const mat = new THREE.LineDashedMaterial({ color: CYAN, dashSize: 5, gapSize: 3, transparent: true, opacity: 0.9 });
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(18)), mat);
  line.computeLineDistances();
  fxGroup.add(line);
  return curve;
}

function resetAll() {
  clearFx();
  for (const b of boxes) b.setColor(PALETTE.node, PALETTE.nodeEmissive);
  ring.mesh.visible = false;
  tokenText.setText('');
  outText.setText('');
  winText.setText('');
}

function* runCompress() {
  yield S(resetAll);
  yield S(() => { hint.setText('LZ77：在滑动窗口中寻找最长匹配，输出 (偏移, 长度, 下一字符) 三元组'); });
  yield W(400);
  for (let d = 0; d < tokens.length; d++) {
    const t = tokens[d];
    const winEnd = Math.min(t.pos + WIN, TXT.length);
    const winStart = Math.max(0, t.pos - WIN);
    const frameX = X0 + ((winStart + winEnd - 1) / 2 - (TXT.length - 1) / 2) * SP;
    yield A(400, p => { frame.mesh.position.x = frameX; });
    yield S(() => {
      ring.mesh.visible = true;
      ring.mesh.position.x = X0 + (t.pos - (TXT.length - 1) / 2) * SP;
      winText.setText('窗口 [' + winStart + ', ' + winEnd + ')');
    });
    yield W(200);
    if (t.len === 0) {
      yield S(() => {
        boxes[t.pos].setColor(BLUE, BLUE);
        tokenText.setText('字符「' + t.next + '」在窗口中无匹配 → 字面量输出 ' + t.next);
        hint.setText('字面量：' + t.next);
      });
      yield* flowLine(new THREE.Vector3(X0 + (t.pos - (TXT.length - 1) / 2) * SP, 60, 20), new THREE.Vector3(X0 + (t.pos - (TXT.length - 1) / 2) * SP, 60, 20), 2, 300);
      yield W(500);
    } else {
      yield S(() => {
        for (let i = t.pos; i < t.pos + t.len; i++) boxes[i].setColor(YELLOW, YELLOW);
        boxes[t.pos + t.len].setColor(BLUE, BLUE);
        tokenText.setText('窗口前 ' + t.off + ' 位起有 ' + t.len + ' 个字符与当前相同 → (' + t.off + ', ' + t.len + ', ' + t.next + ')');
        hint.setText('窗口 [' + winStart + ', ' + winEnd + ')：向前 ' + t.off + ' 位匹配 ' + t.len + ' 个字符');
      });
      matchArc(t.pos - t.off, t.pos);
      yield* flowLine(new THREE.Vector3(X0 + (t.pos - t.off) * SP, 60, 30), new THREE.Vector3(X0 + t.pos * SP, 60, 30), 3, 450);
      yield W(550);
    }
    yield S(() => {
      for (let i = t.pos; i < t.pos + t.len + (t.next ? 1 : 0); i++) boxes[i].setColor(GREEN, GREEN);
      outText.setText('输出：' + tokens.slice(0, d + 1).map(x => x.len === 0 ? x.next : '(' + x.off + ',' + x.len + ',' + x.next + ')').join(' '));
      hint.setText('已输出 ' + (d + 1) + '/' + tokens.length + ' 个 token');
    });
    yield W(450);
  }
  const out = tokens.map(t => t.len === 0 ? t.next : '(' + t.off + ',' + t.len + ',' + t.next + ')').join(' ');
  yield S(() => {
    clearFx();
    ring.mesh.visible = false;
    tokenText.setText('');
    hint.setText('解压时按窗口内偏移复制即可还原原始数据');
    status.textContent = '压缩完成：' + TXT + ' → ' + out + '（9 字符 → ' + out.replace(/ /g, '').length + '）';
  });
  yield W(500);
}

panel.addButton('运行演示', () => engine.start(runCompress()));
panel.addButton('清空', () => { engine.clear(); resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；半透明框 = 滑动窗口，青虚线 = 匹配弧，金环 = 当前字符）');

scene.start(engine);
