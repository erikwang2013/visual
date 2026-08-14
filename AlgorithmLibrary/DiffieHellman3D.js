// AlgorithmLibrary/DiffieHellman3D.js — Diffie-Hellman 密钥交换：双方各藏私密数，公开交换 g^a/g^b，殊途同归算出共享密钥 g^ab（function* 生成器驱动，modpow 全部运行时计算）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, tubeBetween } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('DiffieHellman3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff, DIM = 0x334155;
const status = panel.addStatus('就绪');

const P = 23, G = 5;
const modpow = (b, e, m) => { let r = 1; b %= m; while (e) { if (e & 1) r = r * b % m; b = b * b % m; e >>= 1; } return r; };
const SA = 6, SB = 15;
const pubA = modpow(G, SA, P), pubB = modpow(G, SB, P);
const shared = modpow(pubB, SA, P);

const alice = new VNode(scene, { x: 150, y: 470, z: 0, radius: 30, label: 'Alice', color: 0xa78bfa, emissive: 0xa78bfa });
const bob = new VNode(scene, { x: 490, y: 470, z: 0, radius: 30, label: 'Bob', color: 0x38bdf8, emissive: 0x38bdf8 });
const lineTube = tubeBetween(scene, alice.mesh.position, bob.mesh.position, { color: PALETTE.edge, opacity: 0.25 });

const aT = new VText(scene, { text: '', x: 150, y: 690, z: 0, color: RED, scale: 0.7 });
const bT = new VText(scene, { text: '', x: 490, y: 690, z: 0, color: RED, scale: 0.7 });
const AT = new VText(scene, { text: '', x: 150, y: 585, z: 0, color: BLUE, scale: 0.75 });
const BT = new VText(scene, { text: '', x: 490, y: 585, z: 0, color: BLUE, scale: 0.75 });
const sA = new VText(scene, { text: '', x: 150, y: 355, z: 0, color: GREEN, scale: 0.75 });
const sB = new VText(scene, { text: '', x: 490, y: 355, z: 0, color: GREEN, scale: 0.75 });
const sharedNode = new VNode(scene, { x: 320, y: 330, z: 0, radius: 30, label: '共享密钥', color: DIM, emissive: DIM });

function* dhGen() {
  yield S(() => { status.textContent = '思路：密钥不在信道上传输 —— 双方各自把秘密数混进公开值，再互相用对方的公开值算出同一个秘密。公开参数 p = ' + P + '、g = ' + G + ' 全世界共享，每一步都有人监听'; });
  yield W(900);
  aT.setText('秘密 a = ' + SA);
  alice.setColor(GOLD, GOLD);
  yield S(() => { status.textContent = 'Alice 掷出私密数 a = ' + SA + '（只存在于她的脑子里，永不发送）；公开值 A = g^a mod p = ' + modpow(G, SA, P) + ' ← 只有 a 不知道，谁都算得出来'; });
  yield W(850);
  AT.setText('A = ' + pubA);
  yield S(() => { status.textContent = 'Alice 计算公开值 A = ' + G + '^' + SA + ' mod ' + P + ' = ' + pubA + ' 并发送'; });
  yield W(850);
  bT.setText('秘密 b = ' + SB);
  bob.setColor(GOLD, GOLD);
  yield S(() => { status.textContent = 'Bob 掷出私密数 b = ' + SB + '；计算公开值 B = ' + G + '^' + SB + ' mod ' + P + ' = ' + pubB + '；窃听者现在手握 p, g, A, B'; });
  yield W(850);
  BT.setText('B = ' + pubB);
  bob.setColor(0x38bdf8, 0x38bdf8);
  yield W(850);
  yield A(750, () => { AT.moveTo(490, 585, 0, 700); BT.moveTo(150, 585, 0, 700); });
  yield S(() => { status.textContent = '交换公开值：A 飞到 Bob、B 飞到 Alice —— 信道公开，被完整监听也无妨；窃听者知道 A = g^a 和 B = g^b，但模算术单向，反求 a/b 是离散对数难题'; });
  yield W(900);
  sA.setText('s = B^a mod p = ' + modpow(pubB, SA, P));
  alice.setColor(0xa78bfa, 0xa78bfa);
  yield S(() => { status.textContent = 'Alice 本地计算：s = B^a = ' + pubB + '^' + SA + ' mod ' + P + ' = ' + shared + '（只有她知道 a）；B^a = (g^b)^a = g^(ab) —— 指数交换律是协议的心脏'; });
  yield W(850);
  sB.setText('s = A^b mod p = ' + modpow(pubA, SB, P));
  yield S(() => { status.textContent = 'Bob 本地计算：s = A^b = ' + pubA + '^' + SB + ' mod ' + P + ' = ' + shared + ' —— 两边殊途同归！'; });
  yield W(850);
  sharedNode.setColor(GREEN, GREEN);
  sharedNode.setText('共享密钥 = ' + shared);
  sharedNode.pulse(0.4);
  yield S(() => { status.textContent = '共享密钥 s = g^(ab) mod p = ' + shared + ' 诞生 —— 全程没在信道上传输过密钥；之后用它当对称加密的密钥；窃听者只有 p,g,A,B 算不出 s（DH: g^ab = ' + shared + '）'; });
  yield W(1000);
  yield S(() => { status.textContent = '数学保证：s = (g^a)^b = (g^b)^a = g^(ab)；1976 年 Diffie-Hellman 首次解决公开信道协商密钥；椭圆曲线版 ECDH 用于 TLS 1.3'; });
  yield W(1000);
  yield S(() => { status.textContent = 'DH 演示完成：秘密 a/b → 公开 A/B → 各自算 s = ' + shared; });
  yield W(400);
}

function* runDH() {
  yield W(400);
  yield* dhGen();
}

engine.queue(() => runDH());
panel.addButton('清空', () => {
  engine.clear();
  aT.setText(''); bT.setText(''); AT.setText(''); BT.setText(''); sA.setText(''); sB.setText('');
  AT.moveTo(150, 585, 0, 1); BT.moveTo(490, 585, 0, 1);
  alice.setColor(0xa78bfa, 0xa78bfa); bob.setColor(0x38bdf8, 0x38bdf8);
  sharedNode.setColor(DIM, DIM); sharedNode.setText('共享密钥');
  status.textContent = '';
});

scene.start(engine);
