// 3D/VisualObject3D.js
import * as THREE from 'three';
import { glowMaterial, makeTextSprite, setSpriteText, PALETTE } from './Glow.js';

// ---- 通用补间辅助 ----
export function tween(obj, key, from, to, t, easing = easeInOut) {
  obj[key] = from + (to - from) * easing(t);
}
export function easeInOut(t) { return t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2; }

// ---- 发光球体节点 ----
export class VNode {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.radius = opts.radius || 22;
    const mat = glowMaterial(opts.color || PALETTE.node, { emissive: opts.emissive, emissiveIntensity: 0.5 });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(this.radius, 24, 18), mat);
    this.mesh.position.set(opts.x ?? 0, opts.y ?? 0, opts.z ?? 0);
    this.label = null;
    if (opts.label !== undefined && opts.label !== null && opts.label !== '') {
      this.label = makeTextSprite(opts.label, { scale: 1.1 });
      this.label.position.set(0, this.radius + 18, 0);
      this.mesh.add(this.label);
    }
    scene.add(this.mesh);
  }
  setText(text) { if (this.label) setSpriteText(this.label, text, { scale: 1.1 }); }
  setColor(color, emissive) {
    const m = this.mesh.material;
    m.color.setHex(color);
    m.emissive.setHex(emissive ?? color);
  }
  setHighlight(on) {
    if (on) this.setColor(PALETTE.highlight, PALETTE.highlightEmissive);
    else this.setColor(PALETTE.node, PALETTE.nodeEmissive);
  }
  moveTo(x, y, z, duration = 500) { this.tweenPos = { from: this.mesh.position.clone(), to: new THREE.Vector3(x, y, z), t: 0, d: duration, done: false }; }
  pulse(strength = 0.25) { this.pulseVal = { t: 0, d: 600, strength, done: false }; }
  update(dt) {
    if (this.tweenPos) {
      this.tweenPos.t += dt * 1000;
      const p = Math.min(this.tweenPos.t / this.tweenPos.d, 1);
      const e = easeInOut(p);
      this.mesh.position.lerpVectors(this.tweenPos.from, this.tweenPos.to, e);
      if (p >= 1) this.tweenPos = null;
    }
    if (this.pulseVal) {
      this.pulseVal.t += dt * 1000;
      const p = this.pulseVal.t / this.pulseVal.d;
      if (p >= 1) { this.mesh.scale.set(1, 1, 1); this.pulseVal = null; }
      else this.mesh.scale.setScalar(1 + this.pulseVal.strength * Math.sin(p * Math.PI));
    }
  }
  remove() { this.scene.remove(this.mesh); }
}

// ---- 盒子（数组元素/表格单元等） ----
export class VBox {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.w = opts.w || 50; this.h = opts.h || 50; this.d = opts.d || 50;
    const mat = glowMaterial(opts.color || PALETTE.node, { emissive: opts.emissive, emissiveIntensity: 0.35 });
    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(this.w, this.h, this.d), mat);
    this.mesh.position.set(opts.x ?? 0, opts.y ?? 0, opts.z ?? 0);
    this.label = null;
    this.text = opts.label || '';
    if (opts.label !== undefined && opts.label !== null && opts.label !== '') {
      this.label = makeTextSprite(opts.label, { scale: 1 });
      this.label.position.set(0, 0, this.d / 2 + 14);
      this.mesh.add(this.label);
    }
    scene.add(this.mesh);
  }
  setText(text) { this.text = text; if (this.label) setSpriteText(this.label, text, { scale: 1 }); }
  setColor(color, emissive) {
    const m = this.mesh.material;
    m.color.setHex(color);
    m.emissive.setHex(emissive ?? color);
  }
  setHighlight(on) {
    if (on) this.setColor(PALETTE.highlight, PALETTE.highlightEmissive);
    else this.setColor(PALETTE.node, PALETTE.nodeEmissive);
  }
  moveTo(x, y, z, duration = 500) { this.tweenPos = { from: this.mesh.position.clone(), to: new THREE.Vector3(x, y, z), t: 0, d: duration, done: false }; }
  update(dt) {
    if (this.tweenPos) {
      this.tweenPos.t += dt * 1000;
      const p = Math.min(this.tweenPos.t / this.tweenPos.d, 1);
      this.mesh.position.lerpVectors(this.tweenPos.from, this.tweenPos.to, easeInOut(p));
      if (p >= 1) this.tweenPos = null;
    }
  }
  remove() { this.scene.remove(this.mesh); }
}

// ---- 柱状体（排序/柱状图） ----
export class VBar {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.w = opts.w || 40; this.d = opts.d || 40;
    const mat = glowMaterial(opts.color || PALETTE.node, { emissive: opts.emissive, emissiveIntensity: 0.5 });
    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(this.w, 1, this.d), mat);
    this.baseX = opts.x ?? 0; this.baseZ = opts.z ?? 0;
    this.setHeight(opts.height ?? 1);
    scene.add(this.mesh);
  }
  setHeight(h) {
    this.height = h;
    this.mesh.scale.y = Math.max(h, 0.5);
    this.mesh.position.set(this.baseX, (this.mesh.scale.y) / 2, this.baseZ);
  }
  setColor(color, emissive) {
    const m = this.mesh.material;
    m.color.setHex(color);
    m.emissive.setHex(emissive ?? color);
  }
  setHighlight(on) {
    if (on) this.setColor(PALETTE.highlight, PALETTE.highlightEmissive);
    else this.setColor(PALETTE.node, PALETTE.nodeEmissive);
  }
  remove() { this.scene.remove(this.mesh); }
}

// ---- 两点间管状连线 ----
export function tubeBetween(scene, a, b, opts = {}) {
  const color = opts.color || PALETTE.edge;
  const points = [a, b];
  const curve = new THREE.CatmullRomCurve3(points);
  const geo = new THREE.TubeGeometry(curve, 2, opts.radius || 2.5, 6, false);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: opts.opacity ?? 0.55 });
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);
  return mesh;
}

// ---- 圆环（高亮环，绕节点旋转） ----
export class VTorus {
  constructor(scene, opts = {}) {
    this.scene = scene;
    const mat = glowMaterial(opts.color || PALETTE.highlight, { emissive: PALETTE.highlightEmissive, emissiveIntensity: 0.7, transparent: true, opacity: 0.85 });
    this.mesh = new THREE.Mesh(new THREE.TorusGeometry(opts.radius || 30, 3, 8, 32), mat);
    this.mesh.position.set(opts.x ?? 0, opts.y ?? 0, opts.z ?? 0);
    scene.add(this.mesh);
  }
  moveTo(x, y, z, duration = 500) { this.tweenPos = { from: this.mesh.position.clone(), to: new THREE.Vector3(x, y, z), t: 0, d: duration, done: false }; }
  update(dt) {
    this.mesh.rotation.x += dt * 1.5;
    this.mesh.rotation.z += dt * 0.8;
    if (this.tweenPos) {
      this.tweenPos.t += dt * 1000;
      const p = Math.min(this.tweenPos.t / this.tweenPos.d, 1);
      this.mesh.position.lerpVectors(this.tweenPos.from, this.tweenPos.to, easeInOut(p));
      if (p >= 1) this.tweenPos = null;
    }
  }
  remove() { this.scene.remove(this.mesh); }
}

// ---- 文字 Sprite ----
export class VText {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.sprite = makeTextSprite(opts.text || '', { color: opts.color, scale: opts.scale || 1 });
    this.sprite.position.set(opts.x ?? 0, opts.y ?? 0, opts.z ?? 0);
    scene.add(this.sprite);
  }
  setText(text, opts) { setSpriteText(this.sprite, text, opts); }
  moveTo(x, y, z, duration = 500) { this.tweenPos = { from: this.sprite.position.clone(), to: new THREE.Vector3(x, y, z), t: 0, d: duration, done: false }; }
  update(dt) {
    if (this.tweenPos) {
      this.tweenPos.t += dt * 1000;
      const p = Math.min(this.tweenPos.t / this.tweenPos.d, 1);
      this.sprite.position.lerpVectors(this.tweenPos.from, this.tweenPos.to, easeInOut(p));
      if (p >= 1) this.tweenPos = null;
    }
  }
  remove() { this.scene.remove(this.sprite); }
}

// ---- 3D 箭头（top 指示器等） ----
export class VArrow {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.group = new THREE.Group();
    const shaftMat = glowMaterial(opts.color || PALETTE.highlight, { emissive: PALETTE.highlightEmissive, emissiveIntensity: 0.7 });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 26, 8), shaftMat);
    shaft.position.y = 13;
    const head = new THREE.Mesh(new THREE.ConeGeometry(8, 16, 12), shaftMat);
    head.position.y = 34;
    this.group.add(shaft, head);
    this.group.position.set(opts.x ?? 0, opts.y ?? 0, opts.z ?? 0);
    if (opts.down) this.group.rotation.z = Math.PI;
    scene.add(this.group);
  }
  moveTo(x, y, z, duration = 500) { this.tweenPos = { from: this.group.position.clone(), to: new THREE.Vector3(x, y, z), t: 0, d: duration, done: false }; }
  update(dt) {
    if (this.tweenPos) {
      this.tweenPos.t += dt * 1000;
      const p = Math.min(this.tweenPos.t / this.tweenPos.d, 1);
      this.group.position.lerpVectors(this.tweenPos.from, this.tweenPos.to, easeInOut(p));
      if (p >= 1) this.tweenPos = null;
    }
  }
  remove() { this.scene.remove(this.group); }
}

// 引擎统一更新所有对象
export function updateAll(dt, list) {
  for (const o of list) if (o.update) o.update(dt);
}
