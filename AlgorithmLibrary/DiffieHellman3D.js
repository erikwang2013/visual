// AlgorithmLibrary/DiffieHellman3D.js — Diffie-Hellman 密钥交换：双方各藏私密数，公开交换 g^a/g^b，殊途同归算出共享密钥 g^ab（function* 生成器驱动，modpow 全部运行时计算）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('DiffieHellman3D');

const scene = new Scene3D('scene', { cameraPos: [0, 300, 720], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「运行演示」开始：Diffie-Hellman —— 公开信道交换，双方算出同一个只有彼此知道的密钥', x: 0, y: 300, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');
const stageT = new VText(scene, { text: '', x: 0, y: 262, z: 0, color: GOLD, scale: 0.72 });
const eqT = new VText(scene, { text: '', x: 0, y: 148, z: 0, color: PALETTE.textGlow, scale: 0.44 });
const outT = new VText(scene, { text: '', x: 0, y: -235, z: 0, color: PALETTE.textGlow, scale: 0.62 });

const P = 23, G = 5;
const modpow = (b, e, m) => { let r = 1; b %= m; while (e) { if (e & 1) r = r * b % m; b = b * b % m; e >>= 1; } return r; };
const SA = 6, SB = 15;
const pubA = modpow(G, SA, P), pubB = modpow(G, SB, P);
const shared = modpow(pubB, SA, P);

new VText(scene, { text: '公开参数：素数 p = ' + P + '，原根 g = ' + G + '（全信道公开，谁都能听）', x: 0, y: 230, z: 0, color: PALETTE.textDim, scale: 0.7 });
const alice = new VNode(scene, { x: -300, y: 20, z: 0, radius: 30, label: 'Alice', color: 0xa78bfa, emissive: 0xa78bfa });
const bob = new VNode(scene, { x: 300, y: 20, z: 0, radius: 30, label: 'Bob', color: 0x38bdf8, emissive: 0x38bdf8 });
const lineTube = tubeBetween(scene, alice.mesh.position, bob.mesh.position, { color: PALETTE.edge, opacity: 0.25 });

const aT = new VText(scene, { text: '', x: -300, y: 170, z: 0, color: RED, scale: 0.7 });
const bT = new VText(scene, { text: '', x: 300, y: 170, z: 0, color: RED, scale: 0.7 });
const AT = new VText(scene, { text: '', x: -300, y: 105, z: 0, color: BLUE, scale: 0.75 });
const BT = new VText(scene, { text: '', x: 300, y: 105, z: 0, color: BLUE, scale: 0.75 });
const sA = new VText(scene, { text: '', x: -300, y: -70, z: 0, color: GREEN, scale: 0.75 });
const sB = new VText(scene, { text: '', x: 300, y: -70, z: 0, color: GREEN, scale: 0.75 });
const sharedNode = new VNode(scene, { x: 0, y: -155, z: 0, radius: 30, label: '共享密钥', color: DIM, emissive: DIM });

function* dhGen() {
  yield S(() => { hint.setText('思路：密钥不在信道上传输 —— 双方各自把秘密数混进公开值里，再互相用对方的公开值算出同一个秘密'); stageT.setText('公开参数 p = ' + P + '、g = ' + G + ' 全世界共享；接下来每一步都有人监听'); });
  yield W(900);
  aT.setText('秘密 a = ' + SA);
  alice.setColor(GOLD, GOLD);
  yield S(() => { stageT.setText('Alice 掷出私密数 a = ' + SA + '（金）—— 只存在于她的脑子里，永不发送'); eqT.setText('公开值 A = g^a mod p = ' + modpow(G, SA, P) + ' ← 只有 a 不知道，谁都算得出来'); });
  yield W(850);
  AT.setText('A = ' + pubA);
  yield S(() => { stageT.setText('Alice 计算公开值 A = ' + G + '^' + SA + ' mod ' + P + ' = ' + pubA + ' 并发送'); });
  yield W(850);
  bT.setText('秘密 b = ' + SB);
  bob.setColor(GOLD, GOLD);
  yield S(() => { stageT.setText('Bob 掷出私密数 b = ' + SB + '；计算公开值 B = ' + G + '^' + SB + ' mod ' + P + ' = ' + pubB); eqT.setText('g^' + SA + ' mod ' + P + ' = ' + pubA + '，g^' + SB + ' mod ' + P + ' = ' + pubB + ' —— 窃听者现在手握 p, g, A, B'); });
  yield W(850);
  BT.setText('B = ' + pubB);
  bob.setColor(0x38bdf8, 0x38bdf8);
  yield W(850);
  yield A(750, () => { AT.moveTo(300, 105, 0, 700); BT.moveTo(-300, 105, 0, 700); });
  yield S(() => { stageT.setText('交换公开值：A 飞到 Bob、B 飞到 Alice —— 信道公开，被完整监听也无妨'); hint.setText('关键观察：窃听者知道 A = g^a 和 B = g^b，但模算术单向 —— 反求 a 或 b 是离散对数难题'); });
  yield W(900);
  sA.setText('s = B^a mod p = ' + modpow(pubB, SA, P));
  alice.setColor(0xa78bfa, 0xa78bfa);
  yield S(() => { stageT.setText('Alice 本地计算：s = B^a = ' + pubB + '^' + SA + ' mod ' + P + ' = ' + shared + '（只有她知道 a）'); eqT.setText('B^a = (g^b)^a = g^(ab) —— 指数交换律是协议的心脏'); });
  yield W(850);
  sB.setText('s = A^b mod p = ' + modpow(pubA, SB, P));
  yield S(() => { stageT.setText('Bob 本地计算：s = A^b = ' + pubA + '^' + SB + ' mod ' + P + ' = ' + shared + ' —— 两边殊途同归！'); });
  yield W(850);
  sharedNode.setColor(GREEN, GREEN);
  sharedNode.setText('共享密钥 = ' + shared);
  sharedNode.pulse(0.4);
  status.textContent = 'DH: g^ab = ' + shared + '；窃听者只有 p,g,A,B 算不出 s';
  outT.setText('s = ' + shared + ' ✓ 双方一致 —— 之后用它当对称加密的密钥');
  yield S(() => { stageT.setText('共享密钥 s = g^(ab) mod p = ' + shared + ' 诞生 —— 全程没在信道上传输过密钥'); hint.setText('数学保证：s = (g^a)^b = (g^b)^a = g^(ab)。1976 年 Diffie-Hellman 首次解决「公开信道协商密钥」'); });
  yield W(1000);
  yield S(() => { hint.setText('演示完成：秘密 a/b → 公开 A/B → 各自算 s = ' + shared + '。椭圆曲线版叫 ECDH，TLS 1.3 在用它'); outT.setText(''); });
  yield W(400);
}

function* runDH() {
  hint.setText('DH：公开协商共享密钥');
  yield W(400);
  yield* dhGen();
}

panel.addButton('运行演示', () => engine.start(runDH()));
panel.addButton('清空', () => {
  engine.clear();
  aT.setText(''); bT.setText(''); AT.setText(''); BT.setText(''); sA.setText(''); sB.setText('');
  AT.moveTo(-300, 105, 0, 1); BT.moveTo(300, 105, 0, 1);
  alice.setColor(0xa78bfa, 0xa78bfa); bob.setColor(0x38bdf8, 0x38bdf8);
  sharedNode.setColor(DIM, DIM); sharedNode.setText('共享密钥');
  stageT.setText(''); eqT.setText(''); outT.setText('');
  hint.setText('已清空，可重新运行'); status.textContent = '';
});
panel.addLabel('（拖拽旋转视角，滚轮缩放；紫/蓝球 = Alice/Bob，金 = 掷私密数，蓝字 = 公开值交换，绿 = 共享密钥；窃听者全程可见 p,g,A,B）');

scene.start(engine);
