// AlgorithmLibrary/ZAlgorithm3D.js — Z 算法：Z[i] 立柱 + Z-box 半透明胶囊 + l/r 指针光球（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, VNode, VBar } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('ZAlgorithm3D');

const scene = new Scene3D('scene', { cameraPos: [0, 400, 800], fov: 60 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, RED = 0xfb7185, GOLD = 0xfcd34d, GREEN = 0x4ade80, CYAN = 0x67e8f9, PINK = 0xf472b6;
const hint = new VText(scene, { text: '点击「运行演示」开始', x: 0, y: 640, z: 0, color: PALETTE.textGlow, scale: 0.8 });
const status = panel.addStatus('');

const TXT = 'abacaba';
const Z = (() => { const n = TXT.length, z = Array(n).fill(0); let l = 0, r = 0;
  for (let i = 1; i < n; i++) { if (i <= r) z[i] = Math.min(r - i + 1, z[i - l]);
    while (i + z[i] < n && TXT[z[i]] === TXT[i + z[i]]) z[i]++;
    if (i + z[i] - 1 > r) { l = i; r = i + z[i] - 1; } } return z; })();
const SP = 52;
const cx = k => (k - (TXT.length - 1) / 2) * SP;
const lerp = (a, b, p) => a + (b - a) * p;
const chBox = [...TXT].map((ch, k) => new VBox(scene, { w: 40, h: 40, d: 40, x: cx(k), y: 170, label: ch, color: BLUE, emissive: BLUE }));
const bar = Z.map((v, k) => { const b = new VBar(scene, { w: 34, d: 34, x: cx(k), color: CYAN, emissive: CYAN }); b.mesh.scale.y = 0.5; b.mesh.position.y = 0.25; b.h = 1 + v * 46; b.val = v; return b; });
const valT = Z.map((v, k) => new VText(scene, { text: `z[${k}]`, x: cx(k), y: 300, z: 0, color: PALETTE.textDim, scale: 0.45 }));
const valN = Z.map((v, k) => new VText(scene, { text: String(v), x: cx(k), y: 370, z: 0, color: CYAN, scale: 0.55 }));
const lBall = new VNode(scene, { radius: 10, x: cx(0), y: 470, color: PINK, emissive: PINK });
const rBall = new VNode(scene, { radius: 10, x: cx(0), y: 470, color: GOLD, emissive: GOLD });
lBall.mesh.visible = false; rBall.mesh.visible = false;
const outT = new VText(scene, { text: '', x: 0, y: 30, z: 0, color: PALETTE.textGlow, scale: 0.75 });
new VText(scene, { text: 'Z 数组（柱高 = 与前缀匹配长度）；蓝色胶囊 = Z-box [l, r]', x: 0, y: 560, z: 0, color: PALETTE.textDim, scale: 0.6 });

let fxGroup = new THREE.Group();
scene.add(fxGroup);
const clearFx = () => { scene.remove(fxGroup); fxGroup = new THREE.Group(); scene.add(fxGroup); };

const growBar = (b, p) => { const h = Math.max(b.h * p, 0.5); b.mesh.scale.y = h; b.mesh.position.y = h / 2; };

function showBox(l, r) {
  clearFx();
  if (r < l) return;
  const x0 = cx(l), x1 = cx(r), mid = (x0 + x1) / 2, len = Math.abs(x1 - x0) + 40;
  const mat = new THREE.MeshBasicMaterial({ color: BLUE, transparent: true, opacity: 0.16 });
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(34, 34, len, 16), mat);
  cyl.rotation.z = Math.PI / 2;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(34, 14, 10), mat);
  cap.position.x = -len / 2 + 34;
  const cap2 = cap.clone(); cap2.position.x = len / 2 - 34;
  cyl.add(cap, cap2);
  cyl.position.set(mid, 170, 0);
  fxGroup.add(cyl);
  lBall.mesh.position.set(x0, 470, 0); lBall.mesh.visible = true;
  rBall.mesh.position.set(x1, 470, 0); rBall.mesh.visible = true;
}

const fly = (ball, x, ms = 300) => {
  const fx = ball.mesh.position.x;
  return A(ms, p => { const e = p * p * (3 - 2 * p); ball.mesh.position.x = lerp(fx, x, e); });
};

function resetAll() {
  clearFx();
  chBox.forEach(b => b.setColor(BLUE, BLUE));
  bar.forEach(b => { b.mesh.scale.y = 0.5; b.mesh.position.y = 0.25; });
  valN.forEach((t, k) => t.setText(String(Z[k]), { color: CYAN }));
  lBall.mesh.visible = false; rBall.mesh.visible = false;
  outT.setText('');
}

function* comparePair(i, k, ms = 380) {
  yield S(() => { chBox[i + k].setColor(GOLD, GOLD); chBox[k].setColor(GOLD, GOLD); });
  yield W(ms);
  if (TXT[i + k] === TXT[k]) yield S(() => { chBox[i + k].setColor(GREEN, GREEN); chBox[k].setColor(GREEN, GREEN); });
  else yield S(() => { chBox[i + k].setColor(RED, RED); chBox[k].setColor(RED, RED); });
  yield W(220);
}

function* runZ() {
  yield S(resetAll);
  yield S(() => { hint.setText('Z 算法：z[i] = 子串 s[i..] 与整个串的最长公共前缀长度。维护 [l, r] Z-box：i 在盒内直接复制镜像，否则朴素比较'); });
  let l = 0, r = 0;
  for (let i = 1; i < TXT.length; i++) {
    yield S(() => outT.setText(`计算 z[${i}]：当前位置 i=${i}，当前 Z-box [${l}, ${r}]${i <= r ? ` —— i 在盒内，查镜像 z[${i - l}]=${Z[i - l]}` : ' —— i 在盒外，朴素比较'}`));
    yield fly(lBall, cx(i), 0);
    yield W(260);
    if (i <= r) {
      const mirror = Z[i - l], rest = r - i + 1;
      if (mirror < rest) {
        yield S(() => outT.setText(`镜像复制：z[${i}] = z[${i - l}] = ${mirror}（没碰到盒右端，直接复制）`));
        yield W(500);
      } else {
        yield S(() => outT.setText(`镜像超出盒右端（z[${i - l}]=${mirror} ≥ 剩余 ${rest}）→ 从 r+1=${r + 1} 继续朴素比较`));
        yield W(500);
        let k = rest;
        while (i + k < TXT.length && TXT[k] === TXT[i + k]) { yield* comparePair(i, k, 300); k++; }
      }
    } else {
      let k = 0;
      while (i + k < TXT.length && TXT[k] === TXT[i + k]) { yield* comparePair(i, k, 300); k++; }
      if (i + k < TXT.length) yield* comparePair(i, k, 300);
    }
    const z = Z[i];
    yield S(() => {
      growBar(bar[i], 1);
      valN[i].setText(String(z), { color: z > 0 ? GOLD : CYAN });
      outT.setText(z > 0 ? `z[${i}] = ${z}：与前缀 "${TXT.slice(0, z)}" 相同 → 建立 Z-box [${i}, ${i + z - 1}]` : `z[${i}] = 0：首字符就不匹配，无 Z-box`);
    });
    yield W(480);
    if (z > 0) { l = i; r = i + z - 1; yield S(() => showBox(l, r)); yield W(700); }
    yield S(() => chBox.forEach(b => b.setColor(BLUE, BLUE)));
    yield W(200);
  }
  yield S(() => {
    lBall.mesh.visible = false; rBall.mesh.visible = false;
    outT.setText(`扫描完成：Z = [${Z.join(', ')}] —— 全串与前缀的匹配长度一览`);
    status.textContent = `Z("${TXT}") = [${Z.join(', ')}]（最长前缀匹配：Z[4]=3，即 "aba"）`;
    hint.setText('复杂度 O(n)：每个字符最多被成功比较一次；Z-box 让镜像复制 O(1) 跳过整段');
  });
}

panel.addButton('运行演示', () => engine.start(runZ()));
panel.addButton('清空', () => { engine.clear(); resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；青柱 = z[i]，粉球 l / 金球 r 为 Z-box 两端）');

scene.start(engine);
