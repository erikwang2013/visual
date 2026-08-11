// AlgorithmLibrary/LZSS3D.js — LZSS：两行输入 + 字面/匹配双模式 + 青色匹配弧 + 金色粒子流（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, VTorus } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('LZSS3D');

const scene = new Scene3D('scene', { cameraPos: [0, 360, 620], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x67e8f9, CYAN = 0x67e8f9, GOLD = 0xfcd34d;
const hint = new VText(scene, { text: '点击「运行压缩」开始', x: 0, y: 260, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const INPUT = 'the cat sat on the mat';
const SP = 26, BOX = 24;
const pos = i => i < 11 ? { x: (i - 5) * SP, y: 170 } : { x: (i - 16) * SP, y: 95 };
const boxes = [];
for (let i = 0; i < INPUT.length; i++) {
  const p = pos(i);
  boxes.push(new VBox(scene, { w: BOX, h: BOX, d: BOX, x: p.x, y: p.y, z: 0, label: INPUT[i], color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
}
new VText(scene, { text: '输入（22 字符）', x: -330, y: 210, z: 0, color: PALETTE.textDim, scale: 0.7 });
const outText = new VText(scene, { text: '', x: 0, y: -40, z: 0, color: PALETTE.textGlow, scale: 0.8 });
const ratioT = new VText(scene, { text: '', x: 0, y: -105, z: 0, color: PALETTE.textDim, scale: 0.7 });

const tokens = [
  { type: 'lit', n: 9 },
  { type: 'match', off: 4, len: 3, src: [5, 7], dst: [9, 11] },
  { type: 'lit', n: 3 },
  { type: 'match', off: 15, len: 4, src: [0, 3], dst: [15, 18] },
  { type: 'lit', n: 3 },
];
const LIT_STARTS = [0, 12, 19];

const ring = new VTorus(scene, { radius: 17, x: 0, y: 170, color: GOLD });
ring.mesh.visible = false;

let fxGroup = new THREE.Group();
scene.add(fxGroup);
const clearFx = () => { scene.remove(fxGroup); fxGroup = new THREE.Group(); scene.add(fxGroup); };

function flowLine(pA, pB, count = 3, ms = 380) {
  const parts = [];
  for (let i = 0; i < count; i++) {
    const v = new THREE.Mesh(new THREE.SphereGeometry(3, 8, 8),
      new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.9 }));
    parts.push(v); fxGroup.add(v);
  }
  return A(ms, p => parts.forEach((v, i) => v.position.copy(pA.clone().lerp(pB, (p + i * 0.18) % 1))));
}

function matchArc(srcI, dstI) {
  const pA = new THREE.Vector3(pos(srcI).x, pos(srcI).y, 18);
  const pB = new THREE.Vector3(pos(dstI).x, pos(dstI).y, 18);
  const mid = new THREE.Vector3((pA.x + pB.x) / 2, (pA.y + pB.y) / 2, 42);
  const curve = new THREE.QuadraticBezierCurve3(pA, mid, pB);
  const mat = new THREE.LineDashedMaterial({ color: CYAN, dashSize: 4, gapSize: 3, transparent: true, opacity: 0.9 });
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(16)), mat);
  line.computeLineDistances();
  fxGroup.add(line);
  return [pA, pB];
}

function resetAll() {
  clearFx();
  for (const b of boxes) b.setColor(PALETTE.node, PALETTE.nodeEmissive);
  ring.mesh.visible = false;
  outText.setText('');
  ratioT.setText('');
}

function* runCompress() {
  yield S(resetAll);
  yield S(() => { hint.setText('LZSS：遇到可匹配的历史内容输出指针，否则输出原文字节'); });
  yield W(400);
  const parts = [];
  let outBytes = 0, litK = 0;
  for (let idx = 0; idx < tokens.length; idx++) {
    const t = tokens[idx];
    if (t.type === 'lit') {
      const startIdx = LIT_STARTS[litK++];
      const p0 = pos(startIdx);
      yield S(() => { ring.mesh.visible = true; });
      yield A(300, p => { ring.mesh.position.x = p0.x; ring.mesh.position.y = p0.y; });
      yield S(() => {
        for (let i = 0; i < t.n; i++) boxes[startIdx + i].setColor(BLUE, BLUE);
        hint.setText('字面 ' + t.n + ' 个字符直接写入输出（' + INPUT.slice(startIdx, startIdx + t.n) + '）');
      });
      yield W(600);
      yield S(() => {
        for (let i = 0; i < t.n; i++) boxes[startIdx + i].setColor(GREEN, GREEN);
        parts.push(INPUT.slice(startIdx, startIdx + t.n));
        outText.setText('输出：' + parts.join(' '));
        outBytes += t.n;
      });
      yield W(400);
    } else {
      const dstC = pos(Math.round((t.dst[0] + t.dst[1]) / 2));
      yield S(() => { ring.mesh.visible = true; });
      yield A(300, p => { ring.mesh.position.x = dstC.x; ring.mesh.position.y = dstC.y; });
      yield S(() => {
        for (let i = t.src[0]; i <= t.src[1]; i++) boxes[i].setColor(YELLOW, YELLOW);
        for (let i = t.dst[0]; i <= t.dst[1]; i++) boxes[i].setColor(GREEN, GREEN);
        hint.setText('窗口内找到重复：「' + INPUT.slice(t.dst[0], t.dst[1] + 1) + '」= 距 ' + t.off + ' 处，长 ' + t.len + ' → 指针 M(' + t.off + ',' + t.len + ')');
      });
      const [pA, pB] = matchArc(t.dst[0], t.src[0]);
      yield* flowLine(pA, pB, 3, 420);
      yield W(700);
      yield S(() => {
        parts.push('M(' + t.off + ',' + t.len + ')');
        outText.setText('输出：' + parts.join(' '));
        outBytes += 2;
      });
      yield W(400);
    }
  }
  const ratio = (INPUT.length / outBytes).toFixed(2);
  yield S(() => {
    clearFx();
    ring.mesh.visible = false;
    outText.setText('输出：' + parts.join(' '));
    ratioT.setText('22 字节 → ' + outBytes + ' 字节（' + ratio + '× 压缩，指针 2 字节/个）');
    status.textContent = 'LZSS 压缩完成：' + INPUT + ' → ' + parts.join(' ');
    hint.setText('解压：字面直接输出，指针按 (距离,长度) 回读窗口内容即可还原');
  });
  yield W(500);
}

panel.addButton('运行压缩', () => engine.start(runCompress()));
panel.addButton('清空', () => { engine.clear(); resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；黄 = 源匹配，绿 = 目标，青虚线 = 匹配弧；LZSS 是 LZ77 的改进版）');

scene.start(engine);
