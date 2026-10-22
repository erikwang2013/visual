// 3D/director/OSStage.js — OS 页共用舞台：CPU/就绪队列/甘特图、内存页框/引用串/最近栈、磁盘盘面/磁道/磁头。
// 只依赖 VisualObject3D / Glow；算法状态和节拍仍由页面生成器驱动。
import * as THREE from 'three';
import { VBox, VText, VNode, tubeBetween } from '../VisualObject3D.js';
import { glowMaterial } from '../Glow.js';

const BLUE = 0x3b82f6, BLUE_EM = 0x1d4ed8, GOLD = 0xfcd34d, GOLD_EM = 0x92400e;
const GREEN = 0x4ade80, GREEN_EM = 0x166534, RED = 0xfb7185, RED_EM = 0x9f1239;
const CYAN = 0x22d3ee, CYAN_EM = 0x0e7490, DIM = 0x334155, DIM_EM = 0x1e293b;

function kill(o) {
  if (!o) return;
  const root = o.mesh || o.sprite;
  o.remove();
  if (root && !root.isSprite) {
    root.traverse((n) => {
      if (n.isSprite) return; // 文字精灵的纹理走全局缓存，不在这里释放
      if (n.geometry) n.geometry.dispose();
      if (n.material) n.material.dispose();
    });
  }
}
function killMesh(scene, mesh) {
  if (!mesh) return;
  scene.remove(mesh);
  if (mesh.geometry) mesh.geometry.dispose();
  if (mesh.material) mesh.material.dispose();
}
function disposeGroup(scene, group) {
  scene.remove(group);
  group.traverse((n) => {
    if (!n.isMesh) return;
    if (n.geometry) n.geometry.dispose();
    if (n.material) n.material.dispose();
  });
}
// ---- 调度页：CPU 核心 + 就绪队列 + 甘特时间轴 ----
export class CpuStage {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.cx = opts.x ?? 470;
    this.cy = opts.y ?? 620;
    this.qy = opts.queueY ?? 295;
    this.gy = opts.ganttY ?? 455;
    this.qn = opts.queueSlots ?? 6;
    this.qx0 = opts.queueX0 ?? 70;
    this.qstep = opts.queueStep ?? 92;
    this.gx0 = opts.ganttX0 ?? 70;
    this.gw = opts.ganttWidth ?? 540;
    this.total = 1;
    this.segments = [];
    this.ticks = [];
    this.group = new THREE.Group();
    scene.add(this.group);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(84, 96, 16, 36),
      glowMaterial(0x1e3a8a, { emissive: 0x0f172a, emissiveIntensity: 0.35, transparent: true, opacity: 0.8 }),
    );
    base.rotation.x = Math.PI / 2;
    base.position.set(this.cx, this.cy - 62, -34);
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(104, 2.6, 8, 48),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.42 }),
    );
    halo.position.set(this.cx, this.cy - 2, -28);
    this.group.add(base, halo);
    this.cpu = new VBox(scene, {
      w: 156, h: 92, d: 54, x: this.cx, y: this.cy, z: 0,
      label: '空闲', color: 0x1e293b, emissive: 0x0f172a,
    });
    this.cpuTitle = new VText(scene, { text: 'CPU 核心 · 单核', x: this.cx, y: this.cy + 92, z: 0, color: '#93c5fd', scale: 0.58 });
    this.cpuSub = new VText(scene, { text: '等待调度', x: this.cx, y: this.cy - 78, z: 0, color: '#9db8d9', scale: 0.48, wrapChars: 18 });

    this.queue = [];
    for (let i = 0; i < this.qn; i++) {
      const box = new VBox(scene, {
        w: 80, h: 50, d: 34, x: this.qx0 + i * this.qstep, y: this.qy, z: 0,
        label: '', color: BLUE, emissive: BLUE_EM,
      });
      box.mesh.visible = false;
      this.queue.push(box);
    }
    this.qTitle = new VText(scene, {
      text: '就绪队列 · 队首 → 队尾',
      x: this.qx0 + ((this.qn - 1) * this.qstep) / 2, y: this.qy + 58, z: 0,
      color: '#fde68a', scale: 0.5,
    });
    this.gTitle = new VText(scene, { text: '甘特图 · 时间 →', x: this.gx0, y: this.gy + 54, z: 0, color: '#a5f3fc', scale: 0.5 });
    this.axis = tubeBetween(scene,
      { x: this.gx0 - 8, y: this.gy, z: -22 },
      { x: this.gx0 + this.gw + 8, y: this.gy, z: -22 },
      { color: DIM, opacity: 0.6, radius: 2 });
    this.ganttAnchor = new THREE.Vector3(this.gx0 + this.gw / 2, this.gy, 0);
  }

  setQueue(items = []) {
    for (let i = 0; i < this.qn; i++) {
      const box = this.queue[i];
      const it = items[i];
      if (it === undefined || it === null) { box.mesh.visible = false; continue; }
      const text = typeof it === 'object' ? it.text : it;
      const kind = typeof it === 'object' ? (it.cls || '') : '';
      box.mesh.visible = true;
      box.tweenPos = null;
      box.mesh.position.set(this.qx0 + i * this.qstep, this.qy, 0);
      box.setText(text);
      if (kind.includes('done')) box.setColor(GREEN, GREEN_EM);
      else if (i === 0) box.setColor(GOLD, GOLD_EM);
      else box.setColor(BLUE, BLUE_EM);
    }
  }

  setCpu(name = '空闲', sub = '', color) {
    this.cpu.setText(name);
    this.cpuSub.setText(sub || '等待调度');
    if (color !== undefined) this.cpu.setColor(color, color);
    else if (name === '空闲') this.cpu.setColor(0x1e293b, 0x0f172a);
    else this.cpu.setColor(GOLD, GOLD_EM);
  }

  setGanttTitle(text) { this.gTitle.setText(text); }

  clearTimeline() {
    this.segments.forEach(kill);
    this.ticks.forEach(kill);
    this.segments = [];
    this.ticks = [];
  }

  beginTimeline(total) {
    this.clearTimeline();
    this.total = Math.max(1, total);
    const vals = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(this.total * f));
    const seen = new Set();
    vals.forEach((v) => {
      if (seen.has(v)) return;
      seen.add(v);
      this.ticks.push(new VText(this.scene, {
        text: 't=' + v, x: this.gx0 + (v / this.total) * this.gw, y: this.gy - 36, z: 0,
        color: '#64748b', scale: 0.38,
      }));
    });
  }

  addSegment(name, start, end, color = GOLD, emissive = GOLD_EM) {
    const w = Math.max(((end - start) / this.total) * this.gw - 3, 8);
    const box = new VBox(this.scene, {
      w, h: 40, d: 28, x: this.gx0 + ((start + end) / 2 / this.total) * this.gw, y: this.gy, z: 0,
      label: w >= 46 ? name : '', color, emissive,
    });
    this.segments.push(box);
    return this.segments.length - 1;
  }

  settleSegment(i, color = GREEN, emissive = GREEN_EM) {
    const box = this.segments[i];
    if (box) box.setColor(color, emissive);
  }

  cpuPos() { return this.cpu.mesh.position; }
  queuePos(i = 0) { return (this.queue[i] || this.queue[0]).mesh.position; }
  segmentPos(i = 0) { return (this.segments[i] || this.cpu).mesh.position; }
  ganttPos() { return this.ganttAnchor; }

  reset() {
    this.setCpu('空闲', '等待调度');
    this.setQueue([]);
    this.clearTimeline();
  }

  remove() {
    this.queue.forEach(kill);
    kill(this.cpu); kill(this.cpuTitle); kill(this.cpuSub); kill(this.qTitle); kill(this.gTitle);
    this.clearTimeline();
    killMesh(this.scene, this.axis);
    disposeGroup(this.scene, this.group);
  }
}

// ---- 页面置换页：页框架 + 引用串 + 最近使用栈 ----
export class MemoryStage {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.cx = opts.x ?? 320;
    this.fy = opts.y ?? 520;
    this.maxFrames = opts.maxFrames ?? 4;
    this.maxRefs = opts.maxRefs ?? 20;
    this.group = new THREE.Group();
    scene.add(this.group);
    const back = new THREE.Mesh(
      new THREE.BoxGeometry(600, 210, 10),
      new THREE.MeshBasicMaterial({ color: 0x0b1224, transparent: true, opacity: 0.46 }),
    );
    back.position.set(this.cx, this.fy - 10, -70);
    const shelf = new THREE.Mesh(
      new THREE.BoxGeometry(600, 8, 26),
      glowMaterial(0x1e3a8a, { emissive: 0x0f172a, emissiveIntensity: 0.3, transparent: true, opacity: 0.75 }),
    );
    shelf.position.set(this.cx, this.fy - 50, -18);
    this.group.add(back, shelf);
    this.title = new VText(scene, { text: '物理内存 · 页框', x: this.cx, y: this.fy + 136, z: 0, color: '#93c5fd', scale: 0.58 });

    this.frames = [];
    this.frameNotes = [];
    this.frameX = [];
    for (let i = 0; i < this.maxFrames; i++) {
      const box = new VBox(scene, {
        w: 118, h: 82, d: 46, x: this.cx, y: this.fy, z: 0,
        label: '空', color: 0x1e293b, emissive: 0x0f172a,
      });
      box.mesh.visible = false;
      this.frames.push(box);
      this.frameNotes.push(new VText(scene, { text: '', x: this.cx, y: this.fy - 78, z: 0, color: '#64748b', scale: 0.42 }));
    }

    this.refLabel = new VText(scene, { text: '引用串 · 当前页', x: 100, y: 322, z: 0, color: '#a5f3fc', scale: 0.46 });
    this.refChips = [];
    for (let i = 0; i < this.maxRefs; i++) {
      const chip = new VBox(scene, {
        w: 22, h: 22, d: 16, x: 70 + i * 24, y: 280, z: 0,
        label: '', color: DIM, emissive: DIM_EM,
      });
      chip.mesh.visible = false;
      this.refChips.push(chip);
    }

    this.stackLabel = new VText(scene, { text: '最近 → 最旧', x: 85, y: this.fy - 140, z: 0, color: '#c4b5fd', scale: 0.44 });
    this.stackLabel.sprite.visible = false;
    this.stack = [];
    for (let i = 0; i < 4; i++) {
      const box = new VBox(scene, {
        w: 76, h: 34, d: 24, x: 220 + i * 92, y: this.fy - 140, z: 0,
        label: '', color: BLUE, emissive: BLUE_EM,
      });
      box.mesh.visible = false;
      this.stack.push(box);
    }
  }

  setFrames(slots = [], notes = []) {
    const n = Math.min(slots.length, this.maxFrames);
    const step = n >= 4 ? 150 : 170;
    for (let i = 0; i < this.maxFrames; i++) {
      const box = this.frames[i];
      const note = this.frameNotes[i];
      if (i >= n) {
        box.mesh.visible = false;
        note.sprite.visible = false;
        continue;
      }
      const x = this.cx + (i - (n - 1) / 2) * step;
      this.frameX[i] = x;
      box.mesh.visible = true;
      box.tweenPos = null;
      box.mesh.position.set(x, this.fy, 0);
      const v = slots[i];
      box.setText(v === null || v === undefined ? '空' : String(v));
      box.setColor(v === null || v === undefined ? 0x1e293b : BLUE, v === null || v === undefined ? 0x0f172a : BLUE_EM);
      note.sprite.visible = true;
      note.sprite.position.set(x, this.fy - 80, 0);
      note.setText(notes[i] || (v === null || v === undefined ? '空' : '帧 ' + i));
    }
  }

  flashFrame(i, color, emissive = color) {
    if (this.frames[i]) this.frames[i].setColor(color, emissive);
  }

  sinkFrame(i) {
    const box = this.frames[i];
    if (!box) return;
    box.moveTo(this.frameX[i] ?? box.mesh.position.x, this.fy - 52, 0, 240);
  }

  setReference(ref = []) {
    for (let i = 0; i < this.maxRefs; i++) {
      const chip = this.refChips[i];
      if (i >= ref.length) { chip.mesh.visible = false; continue; }
      chip.mesh.visible = true;
      const text = String(ref[i]);
      chip.setText(text);
      if (chip.label) chip.label.scale.multiplyScalar(0.42);
      chip.setColor(DIM, DIM_EM);
    }
  }

  markRef(i, kind = 'dim') {
    const chip = this.refChips[i];
    if (!chip) return;
    if (kind === 'current') chip.setColor(GOLD, GOLD_EM);
    else if (kind === 'hit') chip.setColor(GREEN, GREEN_EM);
    else if (kind === 'fault') chip.setColor(RED, RED_EM);
    else chip.setColor(DIM, DIM_EM);
  }

  setStack(order = []) {
    const show = order.length > 0;
    this.stackLabel.sprite.visible = show;
    for (let i = 0; i < this.stack.length; i++) {
      const box = this.stack[i];
      if (i >= order.length) { box.mesh.visible = false; continue; }
      box.mesh.visible = true;
      box.setText(String(order[i]));
      if (i === 0) box.setColor(GOLD, GOLD_EM);
      else if (i === order.length - 1) box.setColor(RED, RED_EM);
      else box.setColor(BLUE, BLUE_EM);
    }
  }

  framePos(i = 0) { return (this.frames[i] || this.frames[0]).mesh.position; }
  refPos(i = 0) { return (this.refChips[i] || this.refChips[0]).mesh.position; }
  stackPos() { return (this.stack[0] || this.frames[0]).mesh.position; }
  stackLabelPos() { return this.stackLabel.sprite.position; }

  reset(n = 3) {
    this.setFrames(Array(n).fill(null), Array(n).fill('空'));
    this.setReference([]);
    this.setStack([]);
  }

  remove() {
    this.frames.forEach(kill);
    this.frameNotes.forEach(kill);
    this.refChips.forEach(kill);
    this.stack.forEach(kill);
    kill(this.title); kill(this.refLabel); kill(this.stackLabel);
    disposeGroup(this.scene, this.group);
  }
}

// ---- 磁盘调度页：盘面装饰 + 磁道尺 + 磁头/请求 ----
export class DiskStage {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.axisY = opts.y ?? 300;
    this.x0 = opts.x0 ?? 60;
    this.x1 = opts.x1 ?? 600;
    this.maxCyl = opts.maxCyl ?? 199;
    this.maxReq = opts.maxRequests ?? 10;
    this.headCyl = opts.start ?? 53;
    this.group = new THREE.Group();
    scene.add(this.group);
    const plate = new THREE.Mesh(
      new THREE.CylinderGeometry(180, 180, 12, 64),
      new THREE.MeshBasicMaterial({ color: 0x0b1730, transparent: true, opacity: 0.5 }),
    );
    plate.rotation.x = Math.PI / 2;
    plate.position.set(320, 610, -150);
    this.group.add(plate);
    [58, 98, 138, 178].forEach((r) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(r, 1.5, 6, 72),
        new THREE.MeshBasicMaterial({ color: 0x1d4ed8, transparent: true, opacity: 0.45 }),
      );
      ring.position.set(320, 610, -142);
      this.group.add(ring);
    });
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(22, 22, 18, 28),
      glowMaterial(0x22d3ee, { emissive: 0x0e7490, emissiveIntensity: 0.4 }),
    );
    hub.rotation.x = Math.PI / 2;
    hub.position.set(320, 610, -140);
    this.group.add(hub);

    this.axis = tubeBetween(scene,
      { x: this.x0, y: this.axisY, z: 0 },
      { x: this.x1, y: this.axisY, z: 0 },
      { color: DIM, opacity: 0.6, radius: 2.4 });
    this.axisAnchor = new THREE.Vector3((this.x0 + this.x1) / 2, this.axisY, 0);
    this.ticks = [];
    for (let c = 0; c <= 200; c += 50) {
      this.ticks.push(new VText(scene, { text: String(c), x: this.xOf(c), y: this.axisY - 74, z: 0, color: '#64748b', scale: 0.38 }));
    }
    this.reqNodes = [];
    for (let i = 0; i < this.maxReq; i++) {
      const node = new VNode(scene, {
        x: 0, y: this.axisY, z: 0, radius: 8, color: CYAN, emissive: CYAN_EM,
        label: ' ', labelScale: 0.55,
      });
      node.mesh.visible = false;
      if (node.label) node.label.position.y = 28;
      this.reqNodes.push(node);
    }
    this.head = new VNode(scene, {
      x: this.xOf(this.headCyl), y: this.axisY, z: 0, radius: 14,
      color: GOLD, emissive: GOLD_EM, label: '头 ' + this.headCyl, labelScale: 0.62,
    });
    if (this.head.label) this.head.label.position.y = 78;
    this.seekLabel = new VText(scene, {
      text: '', x: 320, y: this.axisY + 118, z: 0, color: '#fde68a', scale: 0.5,
    });
    this.seekMesh = null;
    this.reqs = [];
  }

  xOf(c) { return this.x0 + (Math.max(0, Math.min(this.maxCyl, c)) / this.maxCyl) * (this.x1 - this.x0); }

  setRequests(reqs = [], start = this.headCyl) {
    this.reqs = reqs.slice();
    const sorted = reqs.slice().sort((a, b) => a - b);
    const seen = new Map();
    for (let i = 0; i < this.maxReq; i++) {
      const node = this.reqNodes[i];
      if (i >= reqs.length) { node.mesh.visible = false; continue; }
      const c = reqs[i];
      const lane = seen.get(c) || 0;
      seen.set(c, lane + 1);
      node.mesh.visible = true;
      // 同柱面重复请求按出现序分层错开，避免球体和标签完全重合
      node.mesh.position.set(this.xOf(c), this.axisY + lane * 26, lane * 14);
      node.setText(String(c));
      node.setColor(CYAN, CYAN_EM);
      if (node.label) node.label.position.y = (sorted.indexOf(c) + lane) % 2 === 0 ? 30 : -40;
    }
    this.setHead(start);
    this.clearSeek();
  }

  markRequest(i, color = CYAN, emissive = CYAN_EM) {
    if (this.reqNodes[i]) this.reqNodes[i].setColor(color, emissive);
  }

  serveRequest(i) { this.markRequest(i, GREEN, GREEN_EM); }

  resetRequestColors() {
    for (let i = 0; i < this.reqs.length; i++) this.markRequest(i, CYAN, CYAN_EM);
  }

  clearSeek() {
    killMesh(this.scene, this.seekMesh);
    this.seekMesh = null;
    this.seekLabel.setText('');
  }

  setHead(cyl) {
    this.headCyl = cyl;
    this.head.tweenPos = null;
    this.head.mesh.position.set(this.xOf(cyl), this.axisY, 0);
    this.head.setText('头 ' + cyl);
    this.clearSeek();
  }

  moveHead(cyl, ms = 620) {
    const from = this.headCyl;
    this.headCyl = cyl;
    killMesh(this.scene, this.seekMesh);
    this.seekMesh = tubeBetween(this.scene,
      { x: this.xOf(from), y: this.axisY, z: 0 },
      { x: this.xOf(cyl), y: this.axisY, z: 0 },
      { color: GOLD, opacity: 0.75, radius: 2.4 });
    const d = Math.abs(cyl - from);
    this.seekLabel.setText('寻道 ' + d);
    this.seekLabel.sprite.position.set((this.xOf(from) + this.xOf(cyl)) / 2, this.axisY + 118, 0);
    this.head.setText('头 ' + cyl);
    this.head.moveTo(this.xOf(cyl), this.axisY, 0, ms);
  }

  headPos() { return this.head.mesh.position; }
  platterPos() { return new THREE.Vector3(320, 610, -150); }
  requestPos(i) { return (this.reqNodes[i] || this.head).mesh.position; }
  axisPos() { return this.axisAnchor; }

  reset() {
    this.reqNodes.forEach((n) => { n.mesh.visible = false; });
    this.reqs = [];
    this.setHead(this.headCyl);
  }

  remove() {
    this.reqNodes.forEach(kill);
    this.ticks.forEach(kill);
    kill(this.head);
    kill(this.seekLabel);
    killMesh(this.scene, this.seekMesh);
    killMesh(this.scene, this.axis);
    disposeGroup(this.scene, this.group);
  }
}
