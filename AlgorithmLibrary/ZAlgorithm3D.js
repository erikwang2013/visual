// AlgorithmLibrary/ZAlgorithm3D.js — Z 算法：Z[i] 立柱 + Z-box 半透明胶囊 + l/r 指针光球（function* 生成器驱动，解说入状态栏）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, VNode, VBar } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
applyTheme('ZAlgorithm3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, RED = 0xfb7185, GOLD = 0xfcd34d, GREEN = 0x4ade80, CYAN = 0x67e8f9, PINK = 0xf472b6;
const status = panel.addStatus('就绪');

const TXT = 'abacaba';
const Z = (() => { const n = TXT.length, z = Array(n).fill(0); let l = 0, r = 0;
  for (let i = 1; i < n; i++) { if (i <= r) z[i] = Math.min(r - i + 1, z[i - l]);
    while (i + z[i] < n && TXT[z[i]] === TXT[i + z[i]]) z[i]++;
    if (i + z[i] - 1 > r) { l = i; r = i + z[i] - 1; } } return z; })();
const SP = 52, BAR_BASE = 100;
const cx = k => (k - (TXT.length - 1) / 2) * SP + 320;
const lerp = (a, b, p) => a + (b - a) * p;
const chBox = [...TXT].map((ch, k) => new VBox(scene, { w: 40, h: 40, d: 40, x: cx(k), y: 280, label: ch, color: BLUE, emissive: BLUE }));
const bar = Z.map((v, k) => { const b = new VBar(scene, { w: 34, d: 34, x: cx(k), color: CYAN, emissive: CYAN }); b.mesh.scale.y = 0.5; b.mesh.position.y = BAR_BASE + 0.25; b.h = 1 + v * 46; b.val = v; return b; });
const valT = Z.map((v, k) => new VText(scene, { text: 'z[' + k + ']', x: cx(k), y: 410, z: 0, color: '#9db8d9', scale: 0.45 }));
const valN = Z.map((v, k) => new VText(scene, { text: String(v), x: cx(k), y: 480, z: 0, color: CYAN, scale: 0.55 }));
const lBall = new VNode(scene, { radius: 10, x: cx(0), y: 580, color: PINK, emissive: PINK });
const rBall = new VNode(scene, { radius: 10, x: cx(0), y: 580, color: GOLD, emissive: GOLD });
lBall.mesh.visible = false; rBall.mesh.visible = false;

// Z-box 半透明胶囊：模块级预建（圆柱 + 两端半球），运行期只改变换
const boxMat = new THREE.MeshBasicMaterial({ color: BLUE, transparent: true, opacity: 0.16 });
const boxCyl = new THREE.Mesh(new THREE.CylinderGeometry(34, 34, 1, 16), boxMat);
boxCyl.rotation.z = Math.PI / 2;
const boxCap = new THREE.Mesh(new THREE.SphereGeometry(34, 14, 10), boxMat);
const boxCap2 = new THREE.Mesh(new THREE.SphereGeometry(34, 14, 10), boxMat);
const boxGroup = new THREE.Group();
boxGroup.add(boxCyl, boxCap, boxCap2);
boxGroup.visible = false;
scene.add(boxGroup);
const clearFx = () => { boxGroup.visible = false; };

const growBar = (b, p) => { const h = Math.max(b.h * p, 0.5); b.mesh.scale.y = h; b.mesh.position.y = BAR_BASE + h / 2; };

function showBox(l, r) {
  if (r < l) { clearFx(); return; }
  const x0 = cx(l), x1 = cx(r), mid = (x0 + x1) / 2, len = Math.abs(x1 - x0) + 40;
  boxGroup.position.set(mid, 280, 0);
  boxCyl.scale.y = len;
  boxCap.position.x = len / 2 - 34;
  boxCap2.position.x = -(len / 2 - 34);
  boxGroup.visible = true;
  lBall.mesh.position.set(x0, 580, 0); lBall.mesh.visible = true;
  rBall.mesh.position.set(x1, 580, 0); rBall.mesh.visible = true;
}

const fly = (ball, x, ms = 300) => {
  const fx = ball.mesh.position.x;
  return A(ms, p => { const e = p * p * (3 - 2 * p); ball.mesh.position.x = lerp(fx, x, e); });
};

function resetAll() {
  clearFx();
  chBox.forEach(b => b.setColor(BLUE, BLUE));
  bar.forEach(b => { b.mesh.scale.y = 0.5; b.mesh.position.y = BAR_BASE + 0.25; });
  valN.forEach((t, k) => t.setText(String(Z[k]), { color: CYAN }));
  lBall.mesh.visible = false; rBall.mesh.visible = false;
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
  yield W(200);
  yield S(() => { status.textContent = 'Z 算法：z[i] = 子串 s[i..] 与整个串的最长公共前缀长度；青柱 = z[i]，半透明胶囊 = Z-box [l, r]，粉球 l / 金球 r 为盒两端'; });
  yield W(500);
  let l = 0, r = 0;
  for (let i = 1; i < TXT.length; i++) {
    yield S(() => { status.textContent = '计算 z[' + i + ']：当前位置 i=' + i + '，当前 Z-box [' + l + ', ' + r + ']' + (i <= r ? ' —— i 在盒内，查镜像 z[' + (i - l) + ']=' + Z[i - l] : ' —— i 在盒外，朴素比较'); });
    yield fly(lBall, cx(i), 0);
    yield W(260);
    if (i <= r) {
      const mirror = Z[i - l], rest = r - i + 1;
      if (mirror < rest) {
        yield S(() => { status.textContent = '镜像复制：z[' + i + '] = z[' + (i - l) + '] = ' + mirror + '（没碰到盒右端，直接复制）'; });
        yield W(500);
      } else {
        yield S(() => { status.textContent = '镜像超出盒右端（z[' + (i - l) + ']=' + mirror + ' ≥ 剩余 ' + rest + '）→ 从 r+1=' + (r + 1) + ' 继续朴素比较'; });
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
      status.textContent = z > 0 ? 'z[' + i + '] = ' + z + '：与前缀 "' + TXT.slice(0, z) + '" 相同 → 建立 Z-box [' + i + ', ' + (i + z - 1) + ']' : 'z[' + i + '] = 0：首字符就不匹配，无 Z-box';
    });
    yield W(480);
    if (z > 0) { l = i; r = i + z - 1; yield S(() => showBox(l, r)); yield W(700); }
    yield S(() => chBox.forEach(b => b.setColor(BLUE, BLUE)));
    yield W(200);
  }
  yield S(() => {
    lBall.mesh.visible = false; rBall.mesh.visible = false;
    status.textContent = '扫描完成：Z = [' + Z.join(', ') + '] —— 全串与前缀的匹配长度一览；复杂度 O(n)：每个字符最多被成功比较一次，Z-box 让镜像复制 O(1) 跳过整段';
  });
  yield W(800);
  yield S(() => { status.textContent = 'Z 算法演示完成：Z("abacaba") = [' + Z.join(', ') + ']，最长前缀匹配 Z[4]=3（"aba"）；6 次扫描全部完成，O(n) 线性'; });
  yield W(800);
}

engine.queue(() => runZ());
panel.addButton('清空', () => { engine.clear(); resetAll(); status.textContent = ''; });

scene.start(engine);
