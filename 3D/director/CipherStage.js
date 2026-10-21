// 3D/director/CipherStage.js — 密码页共用舞台：AES 4×4 状态方阵 + 轮密钥晶体 + 扩散热图；RSA 锁/钥匙 + 模幂齿轮。
// 只依赖 VisualObject3D / Glow；布局与节拍仍由页面生成器驱动。
import * as THREE from 'three';
import { VBox, VText } from '../VisualObject3D.js';
import { glowMaterial } from '../Glow.js';

const h2 = (b) => b.toString(16).padStart(2, '0').toUpperCase();

// ---- AES 4×4 状态方阵：列主序 i = c*4+r，行移位可直接对盒子做位移动画 ----
export class StateMatrix {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.cx = opts.x ?? 320;
    this.cy = opts.y ?? 420;
    this.cz = opts.z ?? 0;
    this.sx = opts.sx ?? 120;
    this.sy = opts.sy ?? 78;
    const size = opts.size ?? 62;
    this.boxes = [];
    this.base = [];
    for (let c = 0; c < 4; c++) {
      for (let r = 0; r < 4; r++) {
        const x = this.cx + (c - 1.5) * this.sx;
        const y = this.cy - (r - 1.5) * this.sy;
        const box = new VBox(scene, {
          w: size, h: size, d: size, x, y, z: this.cz,
          label: '00', color: 0x334155, emissive: 0x1e293b,
        });
        this.boxes[c * 4 + r] = box;
        this.base[c * 4 + r] = new THREE.Vector3(x, y, this.cz);
      }
    }
    this.caption = new VText(scene, {
      text: '状态方阵 4×4', x: this.cx, y: this.cy + 166, z: this.cz,
      color: '#c4b5fd', scale: 0.66, wrapChars: 24,
    });
  }

  setValues(bytes) {
    for (let i = 0; i < 16; i++) this.boxes[i].setText(h2(bytes[i]));
  }

  setColor(i, color, emissive = color) {
    this.boxes[i].setColor(color, emissive);
  }

  setAll(color, emissive = color) {
    for (const b of this.boxes) b.setColor(color, emissive);
  }

  setRow(r, color, emissive = color) {
    for (let c = 0; c < 4; c++) this.setColor(c * 4 + r, color, emissive);
  }

  setCol(c, color, emissive = color) {
    for (let r = 0; r < 4; r++) this.setColor(c * 4 + r, color, emissive);
  }

  // 扩散热图：diff[i] 为 true 的字节染 hot，其余压暗
  setHeat(diff, hot = 0xfb7185, cold = 0x334155) {
    for (let i = 0; i < 16; i++) this.setColor(i, diff[i] ? hot : cold, diff[i] ? hot : 0x1e293b);
  }

  // ShiftRows 的位移动画：第 r 行的盒子平移到左移 r 格后的位置
  slideRows(ms = 520) {
    for (let r = 1; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const target = this.base[((c - r + 4) % 4) * 4 + r];
        this.boxes[c * 4 + r].moveTo(target.x, target.y, target.z, ms);
      }
    }
  }

  resetPositions() {
    for (let i = 0; i < 16; i++) {
      this.boxes[i].tweenPos = null; // 取消未完成的位移动画，否则会把盒子又拉回移位后的位置
      this.boxes[i].mesh.position.copy(this.base[i]);
    }
  }

  setCaption(text) { this.caption.setText(text); }

  remove() {
    this.boxes.forEach((b) => b.remove());
    this.caption.remove();
  }
}

// ---- 轮密钥晶体：中心晶体 + 环上 16 个字节小方块，可飞向方阵位置再返回 ----
export class KeyCrystal {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.cx = opts.x ?? 760;
    this.cy = opts.y ?? 430;
    this.cz = opts.z ?? -40;
    this.radius = opts.radius ?? 135;
    const group = new THREE.Group();
    const shell = new THREE.Mesh(
      new THREE.IcosahedronGeometry(46, 0),
      glowMaterial(0xfcd34d, { emissive: 0xb45309, emissiveIntensity: 0.6, transparent: true, opacity: 0.82 }),
    );
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(22, 0),
      new THREE.MeshBasicMaterial({ color: 0xfde68a, transparent: true, opacity: 0.45 }),
    );
    group.add(shell, core);
    group.position.set(this.cx, this.cy, this.cz);
    scene.add(group);
    this.group = group;
    scene.onFrame((dt) => {
      group.rotation.y += dt * 0.7;
      group.rotation.x += dt * 0.2;
    });
    this.bytes = [];
    for (let i = 0; i < 16; i++) {
      // 环放在面向镜头的 XY 平面，避免 XZ 环在透视下压成一团、标签互相遮挡
      const a = (i / 16) * Math.PI * 2;
      const x = this.cx + Math.cos(a) * this.radius;
      const y = this.cy + Math.sin(a) * this.radius * 0.62;
      const z = this.cz;
      const cube = new VBox(scene, {
        w: 30, h: 30, d: 30, x, y, z,
        label: '00', color: 0xfcd34d, emissive: 0x92400e,
      });
      cube.home = new THREE.Vector3(x, y, z);
      this.bytes.push(cube);
    }
    this.label = new VText(scene, {
      text: '轮密钥 r0', x: this.cx, y: this.cy + 138, z: this.cz,
      color: '#fde68a', scale: 0.66,
    });
    this.hex = [0, 1].map((line) => new VText(scene, {
      text: '', x: this.cx, y: this.cy - 150 - line * 26, z: this.cz,
      color: '#fcd34d', scale: 0.55, wrapChars: 16,
    }));
  }

  setRound(round, keyBytes) {
    this.label.setText('轮密钥 r' + round);
    this.hex[0].setText(keyBytes.slice(0, 8).map(h2).join(''));
    this.hex[1].setText(keyBytes.slice(8).map(h2).join(''));
    this.bytes.forEach((b, i) => b.setText(h2(keyBytes[i])));
  }

  emitTo(matrix, ms = 500) {
    this.bytes.forEach((b, i) => {
      const p = matrix.boxes[i].mesh.position;
      b.moveTo(p.x, p.y, p.z + 74, ms);
    });
  }

  returnHome(ms = 420) {
    this.bytes.forEach((b) => b.moveTo(b.home.x, b.home.y, b.home.z, ms));
  }

  resetHome() {
    this.bytes.forEach((b) => { b.tweenPos = null; b.mesh.position.copy(b.home); });
  }

  remove() {
    this.scene.remove(this.group);
    this.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    this.bytes.forEach((b) => b.remove());
    this.label.remove();
    this.hex.forEach((h) => h.remove());
  }
}

// ---- RSA 锁/钥匙：锁扣升降 + 钥匙插入旋转，全部由 onFrame 缓动 ----
export class LockKey {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.cx = opts.x ?? 800;
    this.cy = opts.y ?? 640;
    this.cz = opts.z ?? 0;
    const group = new THREE.Group();
    group.position.set(this.cx, this.cy, this.cz);
    const gold = glowMaterial(0xf59e0b, { emissive: 0x78350f, emissiveIntensity: 0.55 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(96, 76, 34), gold);
    this.shackle = new THREE.Mesh(new THREE.TorusGeometry(34, 8, 10, 28, Math.PI), gold);
    this.shackle.position.y = 52;
    const hole = new THREE.Mesh(
      new THREE.CylinderGeometry(8, 8, 4, 14),
      new THREE.MeshBasicMaterial({ color: 0x0b0f1e }),
    );
    hole.rotation.x = Math.PI / 2;
    hole.position.set(0, -6, 18);
    this.key = new THREE.Group();
    this.keyMat = glowMaterial(0xfb7185, { emissive: 0x9f1239, emissiveIntensity: 0.6 });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 76, 10), this.keyMat);
    shaft.rotation.z = Math.PI / 2;
    const bow = new THREE.Mesh(new THREE.TorusGeometry(15, 5, 8, 20), this.keyMat);
    bow.position.x = -48;
    const tooth1 = new THREE.Mesh(new THREE.BoxGeometry(12, 14, 8), this.keyMat);
    tooth1.position.set(30, -10, 0);
    const tooth2 = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 8), this.keyMat);
    tooth2.position.set(14, -8, 0);
    this.key.add(shaft, bow, tooth1, tooth2);
    this.key.position.set(-152, -14, 42);
    group.add(body, this.shackle, hole, this.key);
    scene.add(group);
    this.group = group;
    this.lockLabel = new VText(scene, {
      text: '公钥锁', x: this.cx, y: this.cy + 116, z: this.cz,
      color: '#fde68a', scale: 0.62,
    });
    this.keyLabel = new VText(scene, {
      text: '私钥钥匙', x: this.cx - 152, y: this.cy - 88, z: this.cz,
      color: '#fda4af', scale: 0.55,
    });
    this.open = true;
    this.t = 1;
    scene.onFrame((dt) => {
      const target = this.open ? 1 : 0;
      this.t += (target - this.t) * Math.min(dt * 7, 1);
      this.shackle.position.y = 52 + this.t * 22;
      this.shackle.rotation.x = this.t * -0.45;
      this.key.position.x = -152 + this.t * 96;
      this.key.rotation.z = this.t * 0.85;
    });
  }

  setOpen(open) {
    this.open = !!open;
    this.keyMat.color.setHex(this.open ? 0x4ade80 : 0xfb7185);
    this.keyMat.emissive.setHex(this.open ? 0x166534 : 0x9f1239);
  }

  setLockLabel(text) { this.lockLabel.setText(text); }
  setKeyLabel(text) { this.keyLabel.setText(text); }

  remove() {
    this.scene.remove(this.group);
    this.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    this.lockLabel.remove();
    this.keyLabel.remove();
  }
}

// ---- 齿轮：模幂的“转起来”视觉 ----
export class Gear {
  constructor(scene, opts = {}) {
    this.scene = scene;
    const r = opts.radius ?? 38;
    const mat = glowMaterial(opts.color ?? 0x22d3ee, {
      emissive: opts.emissive ?? 0x0e7490, emissiveIntensity: 0.55,
    });
    const group = new THREE.Group();
    const rim = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.14, 8, 28), mat);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.22, r * 0.22, 8, 12), mat);
    hub.rotation.x = Math.PI / 2;
    group.add(rim, hub);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      // 齿中心放在轮缘外，齿高跨过轮缘，远看才像齿轮而不是圆环
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(r * 0.26, r * 0.34, 12), mat);
      tooth.position.set(Math.cos(a) * r * 1.16, Math.sin(a) * r * 1.16, 0);
      tooth.rotation.z = a - Math.PI / 2;
      group.add(tooth);
    }
    group.position.set(opts.x ?? 0, opts.y ?? 0, opts.z ?? 0);
    scene.add(group);
    this.group = group;
    this.speed = 0;
    scene.onFrame((dt) => { group.rotation.z += dt * this.speed; });
  }

  setSpeed(s) { this.speed = s; }

  remove() {
    this.scene.remove(this.group);
    this.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  }
}

// ---- 模幂二进制行：指数位方块 + 齿轮 + 步骤字幕 ----
export class ModExpRow {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.x = opts.x ?? 100;
    this.y = opts.y ?? 290;
    this.z = opts.z ?? 0;
    this.step = opts.step ?? 44;
    this.max = opts.bits ?? 14;
    this.chips = [];
    for (let i = 0; i < this.max; i++) {
      const chip = new VBox(scene, {
        w: 38, h: 38, d: 32, x: this.x + i * this.step, y: this.y, z: this.z,
        label: '0', color: 0x334155, emissive: 0x1e293b,
      });
      chip.mesh.visible = false;
      this.chips.push(chip);
    }
    this.gear = new Gear(scene, { x: this.x + 240, y: this.y, z: this.z, radius: 34, color: opts.color ?? 0x22d3ee });
    this.caption = new VText(scene, {
      text: '', x: this.x + 140, y: this.y + 62, z: this.z,
      color: '#9db8d9', scale: 0.48, wrapChars: 22,
    });
    this.bits = [];
  }

  setExponent(exp) {
    this.bits = exp.toString(2).split('').map(Number);
    this.chips.forEach((c, i) => {
      const on = i < this.bits.length;
      c.mesh.visible = on;
      if (on) {
        c.setText(String(this.bits[i]));
        c.setColor(this.bits[i] ? 0xfcd34d : 0x334155, this.bits[i] ? 0x78350f : 0x1e293b);
      }
    });
    const span = Math.max(this.bits.length, 1) * this.step;
    this.gear.group.position.x = this.x + span + 46;
    this.caption.sprite.position.x = this.x + span / 2 - this.step / 2;
  }

  mark(i) {
    const c = this.chips[i];
    if (c) c.setColor(0xffffff, 0xffffff);
    this.gear.setSpeed(3.4);
  }

  done(i) {
    const c = this.chips[i];
    if (c) c.setColor(this.bits[i] ? 0xfcd34d : 0x334155, this.bits[i] ? 0x78350f : 0x1e293b);
  }

  setCaption(text) { this.caption.setText(text); }
  finish(text) { this.gear.setSpeed(0.3); if (text) this.caption.setText(text); }

  reset() {
    this.bits = [];
    this.chips.forEach((c) => { c.mesh.visible = false; c.setColor(0x334155, 0x1e293b); });
    this.gear.setSpeed(0);
    this.caption.setText('');
  }

  remove() {
    this.chips.forEach((c) => c.remove());
    this.gear.remove();
    this.caption.remove();
  }
}
