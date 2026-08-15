// AlgorithmLibrary/LZSS3D.js — LZSS：两行输入盒 + 字面/匹配双模式 + 青色匹配弧 + 金色粒子流（function* 生成器驱动，解说入状态栏）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VTorus } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('LZSS3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x67e8f9, CYAN = 0x67e8f9, GOLD = 0xfcd34d;
const status = panel.addStatus('就绪');

const INPUT = 'the cat sat on the mat';
const SP = 26, BOX = 24;
const pos = i => i < 11 ? { x: (i - 5) * SP + 320, y: 470 } : { x: (i - 16) * SP + 320, y: 395 };
const boxes = [];
for (let i = 0; i < INPUT.length; i++) {
  const p = pos(i);
  boxes.push(new VBox(scene, { w: BOX, h: BOX, d: BOX, x: p.x, y: p.y, z: 0, label: INPUT[i], color: PALETTE.node, emissive: PALETTE.nodeEmissive }));
}

const tokens = [
  { type: 'lit', n: 9 },
  { type: 'match', off: 4, len: 3, src: [5, 7], dst: [9, 11] },
  { type: 'lit', n: 3 },
  { type: 'match', off: 15, len: 4, src: [0, 3], dst: [15, 18] },
  { type: 'lit', n: 3 },
];
const LIT_STARTS = [0, 12, 19];

const ring = new VTorus(scene, { radius: 17, x: 0, y: 470, color: GOLD });
ring.mesh.visible = false;

// ---- 虚线匹配弧池 ×2 + 金色粒子池 ×6：模块级预建，fxGroup 统一显隐 ----
const fxGroup = new THREE.Group();
fxGroup.visible = false;
scene.add(fxGroup);
const mkArc = () => {
  const v0 = new THREE.Vector3(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
  const curve = new THREE.QuadraticBezierCurve3(v0, v1, v2);
  const geo = new THREE.BufferGeometry();
  const line = new THREE.Line(geo, new THREE.LineDashedMaterial({ color: CYAN, dashSize: 4, gapSize: 3, transparent: true, opacity: 0.9 }));
  return { v0, v1, v2, curve, geo, line };
};
const arcs = [mkArc(), mkArc()];
arcs.forEach(a => fxGroup.add(a.line));
const setArc = (a, srcI, dstI) => {
  const pA = pos(srcI), pB = pos(dstI);
  a.v0.set(pA.x, pA.y, 18);
  a.v1.set((pA.x + pB.x) / 2, (pA.y + pB.y) / 2, 42);
  a.v2.set(pB.x, pB.y, 18);
  a.geo.setFromPoints(a.curve.getPoints(16));
  a.line.computeLineDistances();
};
const parts = [0, 1, 2, 3, 4, 5].map(() => {
  const m = new THREE.Mesh(new THREE.SphereGeometry(3, 8, 8), new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.9 }));
  fxGroup.add(m);
  return m;
});
const flyParts = [0, 1, 2, 3, 4, 5].map(() => new THREE.Vector3());
const flyParticles = (arc, base, ms) => A(ms, p => {
  for (let j = 0; j < 3; j++) {
    parts[base + j].position.copy(arc.curve.getPoint((p + j * 0.18) % 1, flyParts[base + j]));
  }
});

function resetAll() {
  fxGroup.visible = false;
  for (const b of boxes) b.setColor(PALETTE.node, PALETTE.nodeEmissive);
  ring.mesh.visible = false;
}

function* runCompress() {
  yield S(() => {
    resetAll();
    status.textContent = 'LZSS 压缩：' + INPUT + '（22 字符）：窗口内找到重复 → 输出指针 M(偏移,长度)，否则输出字面量';
  });
  yield W(600);
  const partsOut = [];
  let outBytes = 0, litK = 0, arcK = 0;
  for (const t of tokens) {
    if (t.type === 'lit') {
      const startIdx = LIT_STARTS[litK++];
      const p0 = pos(startIdx);
      yield S(() => { ring.mesh.visible = true; });
      yield A(300, p => { ring.mesh.position.x = p0.x; ring.mesh.position.y = p0.y; });
      yield S(() => {
        for (let i = 0; i < t.n; i++) boxes[startIdx + i].setColor(BLUE, BLUE);
        status.textContent = '字面 ' + t.n + ' 个字符直接写入输出（' + INPUT.slice(startIdx, startIdx + t.n) + '）';
      });
      yield W(600);
      yield S(() => {
        for (let i = 0; i < t.n; i++) boxes[startIdx + i].setColor(GREEN, GREEN);
        partsOut.push(INPUT.slice(startIdx, startIdx + t.n));
        outBytes += t.n;
        status.textContent = '输出：' + partsOut.join(' ');
      });
      yield W(400);
    } else {
      const dstC = pos(Math.round((t.dst[0] + t.dst[1]) / 2));
      yield S(() => { ring.mesh.visible = true; });
      yield A(300, p => { ring.mesh.position.x = dstC.x; ring.mesh.position.y = dstC.y; });
      yield S(() => {
        for (let i = t.src[0]; i <= t.src[1]; i++) boxes[i].setColor(YELLOW, YELLOW);
        for (let i = t.dst[0]; i <= t.dst[1]; i++) boxes[i].setColor(GREEN, GREEN);
        setArc(arcs[arcK], t.dst[0], t.src[0]);
        fxGroup.visible = true;
        status.textContent = '窗口内找到重复：「' + INPUT.slice(t.dst[0], t.dst[1] + 1) + '」= 距 ' + t.off + ' 处，长 ' + t.len + ' → 指针 M(' + t.off + ',' + t.len + ')';
      });
      yield flyParticles(arcs[arcK], arcK * 3, 420);
      arcK++;
      yield W(700);
      yield S(() => {
        partsOut.push('M(' + t.off + ',' + t.len + ')');
        outBytes += 2;
        status.textContent = '输出：' + partsOut.join(' ');
      });
      yield W(400);
    }
  }
  const ratio = (INPUT.length / outBytes).toFixed(2);
  yield S(() => {
    fxGroup.visible = false;
    ring.mesh.visible = false;
    status.textContent = 'LZSS 演示完成：' + INPUT + '（22 字节）→ ' + outBytes + ' 字节（' + ratio + '× 压缩）：' + partsOut.join(' ');
  });
  yield W(500);
}

engine.queue(() => runCompress());
panel.addButton('清空', () => { engine.clear(); resetAll(); status.textContent = ''; });

scene.start(engine);
