// AlgorithmLibrary/DiffieHellman3D.js — Diffie-Hellman 密钥交换
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('DiffieHellman3D');

const scene = new Scene3D('scene', { cameraPos: [0, 380, 720], fov: 52 });
const engine = new AnimationEngine({ speed: 1.3 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });

const GREEN = 0x4ade80, BLUE = 0x60a5fa, RED = 0xf87171, DIM = 0x334155, YELLOW = 0xfacc15;
const hint = new VText(scene, { text: '点击「运行演示」开始', x: 0, y: 330, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const P = 23, G = 5, A = 6, B = 15;
const GA = 8, GB = 19, SHARED = 2;
const modpow = (b, e, m) => { let r = 1; b %= m; while (e) { if (e & 1) r = r * b % m; b = b * b % m; e >>= 1; } return r; };

new VText(scene, { text: '公开参数：素数 p = ' + P + '，原根 g = ' + G, x: 0, y: 285, z: 0, color: PALETTE.textDim, scale: 0.8 });
const alice = new VNode(scene, { x: -300, y: 20, z: 0, radius: 30, label: 'Alice', color: 0xa78bfa, emissive: 0xa78bfa });
const bob = new VNode(scene, { x: 300, y: 20, z: 0, radius: 30, label: 'Bob', color: 0x38bdf8, emissive: 0x38bdf8 });
const lineTube = tubeBetween(scene, alice.mesh.position, bob.mesh.position, { color: PALETTE.edge, opacity: 0.25 });

const aT = new VText(scene, { text: '', x: -300, y: 170, z: 0, color: RED, scale: 0.75 });
const bT = new VText(scene, { text: '', x: 300, y: 170, z: 0, color: RED, scale: 0.75 });
const AT = new VText(scene, { text: '', x: -300, y: 110, z: 0, color: BLUE, scale: 0.8 });
const BT = new VText(scene, { text: '', x: 300, y: 110, z: 0, color: BLUE, scale: 0.8 });
const sA = new VText(scene, { text: '', x: -300, y: -80, z: 0, color: GREEN, scale: 0.8 });
const sB = new VText(scene, { text: '', x: 300, y: -80, z: 0, color: GREEN, scale: 0.8 });
const shared = new VNode(scene, { x: 0, y: -160, z: 0, radius: 30, label: '共享密钥', color: DIM, emissive: DIM });

function resetAll() {
  engine.clear();
  aT.setText(''); bT.setText(''); AT.setText(''); BT.setText(''); sA.setText(''); sB.setText('');
  shared.setColor(DIM, DIM); shared.setText('共享密钥');
  AT.moveTo(-300, 110, 0, 1); BT.moveTo(300, 110, 0, 1);
}

function runDemo() {
  resetAll();
  hint.setText('Diffie-Hellman：双方各自生成秘密数，公开交换中间值，算出相同共享密钥');
  C(500, () => {
    aT.setText('秘密：a = ' + A);
    alice.setColor(YELLOW, YELLOW);
  });
  hint.setText('Alice 随机选取秘密数 a = ' + A + '（绝不公开）');
  C(800, () => {
    AT.setText('A = g^a mod p = ' + modpow(G, A, P));
  });
  hint.setText('Alice 计算公开值 A = g^a mod p = ' + modpow(G, A, P) + '，通过公开信道发送');
  C(800, () => {
    bT.setText('秘密：b = ' + B);
    bob.setColor(YELLOW, YELLOW);
  });
  hint.setText('Bob 随机选取秘密数 b = ' + B + '（绝不公开）');
  C(800, () => {
    BT.setText('B = g^b mod p = ' + modpow(G, B, P));
  });
  hint.setText('Bob 计算公开值 B = g^b mod p = ' + modpow(G, B, P) + ' 并发送');
  C(900, () => {
    AT.moveTo(300, 110, 0, 700);
    BT.moveTo(-300, 110, 0, 700);
  });
  hint.setText('交换：A 发给 Bob，B 发给 Alice（窃听者只能看到 p, g, A, B）');
  C(950, () => {
    alice.setColor(0xa78bfa, 0xa78bfa);
    bob.setColor(0x38bdf8, 0x38bdf8);
    sA.setText('s = B^a mod p = ' + modpow(GB, A, P));
  });
  hint.setText('Alice 计算共享密钥：s = B^a mod p = ' + modpow(GB, A, P));
  C(800, () => {
    sB.setText('s = A^b mod p = ' + modpow(GA, B, P));
  });
  hint.setText('Bob 计算共享密钥：s = A^b mod p = ' + modpow(GA, B, P));
  C(900, () => {
    shared.setColor(GREEN, GREEN);
    shared.setText('共享密钥 = ' + SHARED);
    shared.pulse(0.4);
    status.textContent = '双方得到相同密钥 s = ' + SHARED + '；窃听者无法从公开值 p, g, A, B 算出 s';
    hint.setText('s = g^(ab) mod p，双方殊途同归 = ' + SHARED);
  });
}

panel.addButton('运行演示', runDemo);
panel.addButton('清空', () => { resetAll(); hint.setText('已清空画布'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
