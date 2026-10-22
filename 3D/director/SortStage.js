// 3D/director/SortStage.js — 排序页共用舞台：柱阵/比较光束/交换弧线/分区墙/0-9 桶/元素球/堆树。
// 只负责视觉与位姿补间，算法状态仍由页面生成器维护。
import * as THREE from 'three';
import { makeTextSprite, setSpriteText, glowMaterial, PALETTE } from '../Glow.js';

const EASE = (p) => p * p * (3 - 2 * p);
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const labelOpts = (scale, color = '#ffffff') => ({ scale, color });

// 单位圆柱压到两点之间：mesh.scale.y 直接当长度用，避免每次重建几何。
function placeBetween(mesh, a, b, radius = 1) {
  const dir = b.clone().sub(a);
  const len = dir.length();
  if (len < 1e-4) { mesh.visible = false; return; }
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(V3(0, 1, 0), dir.normalize());
  mesh.scale.set(radius, len, radius);
  mesh.visible = true;
}

export class SortStage {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.n = opts.n ?? 14;
    this.cx = opts.cx ?? 320;
    this.baseY = opts.baseY ?? 140;
    this.spacing = opts.spacing ?? 46;
    this.scaleY = opts.scaleY ?? 16;
    this.barW = opts.barW ?? 28;
    this.barD = opts.barD ?? 28;
    this.labelScale = opts.labelScale ?? 0.46;
    this.root = new THREE.Group();
    scene.add(this.root);
    this.bars = [];
    this.walls = [];
    this.tree = [];
    this.treeEdges = [];
    this.balls = [];
    this.buckets = [];
    this.links = [];
    this.bucketCount = 0;
    this.bucketCfg = null;

    const beamGeo = new THREE.CylinderGeometry(1, 1, 1, 8);
    this.beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false }));
    this.beam.visible = false;
    this.root.add(this.beam);

    this.arc = new THREE.Line(
      new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(33 * 3), 3)),
      new THREE.LineBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.85, depthWrite: false }),
    );
    this.arc.visible = false;
    this.arc.frustumCulled = false;
    this.root.add(this.arc);
  }

  slotX(i) { return this.cx + (i - (this.n - 1) / 2) * this.spacing; }
  rowPos(i) { return V3(this.slotX(i), this.baseY, 0); }
  barTop(i) {
    const b = this.bars[i];
    return V3(this.slotX(i), this.baseY + (b ? b.h : 0) + 10, 0);
  }
  treePos(i) { return this.tree[i].pos.clone(); }
  bucketX(d) { return this.bucketCfg.cx + (d - (this.bucketCount - 1) / 2) * this.bucketCfg.gap; }

  // ---- 柱阵 ----
  buildBars(values) {
    values.forEach((v, i) => {
      const group = new THREE.Group();
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(this.barW, 1, this.barD), glowMaterial(0x60a5fa, { emissive: 0x60a5fa }));
      const label = makeTextSprite(String(v), labelOpts(this.labelScale));
      group.add(mesh, label);
      group.position.copy(this.rowPos(i));
      this.root.add(group);
      const bar = { group, mesh, label, value: v, h: 1 };
      this.bars.push(bar);
      this.applyBar(bar, v);
    });
  }

  applyBar(bar, v) {
    bar.value = v;
    bar.h = Math.max(6, v * this.scaleY);
    bar.mesh.scale.y = bar.h;
    bar.mesh.position.y = bar.h / 2;
    bar.label.position.y = bar.h + 20;
    setSpriteText(bar.label, String(v), labelOpts(this.labelScale));
  }

  setValue(i, v) { this.applyBar(this.bars[i], v); }
  setValues(values) { values.forEach((v, i) => this.setValue(i, v)); }
  value(i) { return this.bars[i].value; }
  setBarColor(i, c) {
    const m = this.bars[i].mesh.material;
    m.color.setHex(c);
    m.emissive.setHex(c);
  }
  setAllBarColor(c) { this.bars.forEach((b, i) => this.setBarColor(i, c)); }

  swapPose(i, j, p, lift = 90) {
    const a = this.bars[i].group;
    const b = this.bars[j].group;
    const ax = this.slotX(i);
    const bx = this.slotX(j);
    const q = EASE(p);
    const arc = Math.sin(Math.PI * q) * lift;
    a.position.set(ax + (bx - ax) * q, this.baseY + arc, 0);
    b.position.set(bx + (ax - bx) * q, this.baseY + arc, 0);
    a.rotation.y = Math.PI * q;
    b.rotation.y = Math.PI * q;
  }

  resetBarPose(i) {
    const g = this.bars[i].group;
    g.position.copy(this.rowPos(i));
    g.rotation.set(0, 0, 0);
  }

  // ---- 光束 / 交换弧线 ----
  setBeam(a, b, color, radius = 2.4) {
    this.beam.material.color.setHex(color);
    placeBetween(this.beam, a, b, radius);
  }
  showCompareBeam(i, j, color) {
    const hi = Math.max(this.bars[i].h, this.bars[j].h);
    const y = this.baseY + Math.max(24, hi * 0.62);
    this.setBeam(V3(this.slotX(i), y, 0), V3(this.slotX(j), y, 0), color, 2.2);
  }
  hideBeam() { this.beam.visible = false; }

  showArc(i, j, color, lift = 120) {
    const a = this.barTop(i);
    const b = this.barTop(j);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    mid.y = Math.max(a.y, b.y) + lift;
    mid.z = 46;
    const pts = new THREE.QuadraticBezierCurve3(a, mid, b).getPoints(32);
    const pos = this.arc.geometry.attributes.position;
    pts.forEach((p, k) => pos.setXYZ(k, p.x, p.y, p.z));
    pos.needsUpdate = true;
    this.arc.geometry.computeBoundingSphere();
    this.arc.material.color.setHex(color);
    this.arc.visible = true;
  }
  hideArc() { this.arc.visible = false; }

  // ---- 分区墙 / gap 平面 ----
  buildWalls(count, opts = {}) {
    const h = opts.height ?? 340;
    for (let k = 0; k < count; k++) {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(opts.width ?? 8, h),
        new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }),
      );
      mesh.position.set(this.cx, this.baseY + h / 2, -24);
      mesh.visible = false;
      this.root.add(mesh);
      this.walls.push(mesh);
    }
  }
  setWall(k, x, color, opacity) {
    const m = this.walls[k];
    if (!m) return;
    m.position.x = x;
    m.material.color.setHex(color);
    m.material.opacity = opacity;
    m.visible = opacity > 0;
  }
  hideWalls() { this.walls.forEach((m) => { m.visible = false; m.material.opacity = 0; }); }

  // ---- 堆树（完全二叉树，索引与堆数组一一对应） ----
  buildTree(n, opts = {}) {
    const cx = opts.cx ?? this.cx;
    const top = opts.top ?? 640;
    const dy = opts.dy ?? 90;
    const z0 = opts.z ?? -40;
    const dz = opts.dz ?? 24;
    const step = opts.step ?? [0, 190, 96, 52, 28];
    const radius = opts.radius ?? 15;
    const color = opts.color ?? PALETTE.node;
    for (let i = 0; i < n; i++) {
      const d = Math.floor(Math.log2(i + 1));
      const k = i - (2 ** d - 1);
      const x = cx + (k - (2 ** d - 1) / 2) * step[Math.min(d, step.length - 1)];
      const pos = V3(x, top - d * dy, z0 - d * dz);
      const group = new THREE.Group();
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 20, 16), glowMaterial(color, { emissive: color }));
      const label = makeTextSprite('', labelOpts(opts.labelScale ?? 0.5));
      group.add(mesh, label);
      group.position.copy(pos);
      this.root.add(group);
      this.tree.push({ group, mesh, label, value: null, color, pos });
    }
    for (let i = 1; i < n; i++) {
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(1, 1, 1, 6),
        new THREE.MeshBasicMaterial({ color: PALETTE.edge, transparent: true, opacity: 0.3, depthWrite: false }),
      );
      placeBetween(mesh, this.tree[(i - 1) >> 1].pos, this.tree[i].pos, opts.edgeRadius ?? 1.6);
      this.root.add(mesh);
      this.treeEdges.push(mesh);
    }
  }

  setTreeValue(i, v) {
    const node = this.tree[i];
    node.value = v;
    setSpriteText(node.label, String(v), labelOpts(0.5));
  }
  setTreeColor(i, c) {
    const node = this.tree[i];
    if (!node || !node.group.visible) return;
    node.color = c;
    if (node.dimmed) return;
    node.mesh.material.color.setHex(c);
    node.mesh.material.emissive.setHex(c);
  }
  setTreeDim(i, on) {
    const node = this.tree[i];
    node.dimmed = on;
    node.group.scale.setScalar(on ? 0.72 : 1);
    node.label.material.opacity = on ? 0.3 : 1;
    if (on) {
      node.mesh.material.color.setHex(0x334155);
      node.mesh.material.emissive.setHex(0x0f172a);
    } else {
      node.mesh.material.color.setHex(node.color);
      node.mesh.material.emissive.setHex(node.color);
    }
  }
  treeSwapPose(i, j, p, lift = 24) {
    const a = this.tree[i];
    const b = this.tree[j];
    const q = EASE(p);
    const arc = Math.sin(Math.PI * q) * lift;
    a.group.position.lerpVectors(a.pos, b.pos, q);
    b.group.position.lerpVectors(b.pos, a.pos, q);
    a.group.position.y += arc;
    b.group.position.y += arc;
  }
  resetTreePose(i) { this.tree[i].group.position.copy(this.tree[i].pos); }
  treeBeam(i, j, color) { this.setBeam(this.tree[i].pos, this.tree[j].pos, color, 2.8); }

  // ---- 元素球（基数排序） ----
  buildBalls(values, opts = {}) {
    const r = opts.radius ?? 16;
    values.forEach((v) => {
      const group = new THREE.Group();
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 16), glowMaterial(0x60a5fa, { emissive: 0x60a5fa }));
      const label = makeTextSprite(String(v), labelOpts(opts.labelScale ?? 0.38));
      label.position.y = r + 16;
      const digit = makeTextSprite('', labelOpts(0.34, '#fcd34d'));
      digit.position.y = -r - 16;
      digit.visible = false;
      group.add(mesh, label, digit);
      this.root.add(group);
      this.balls.push({ group, mesh, label, digit, value: v });
    });
  }
  setBallValue(ball, v) {
    ball.value = v;
    setSpriteText(ball.label, String(v), labelOpts(0.38));
  }
  setBallColor(ball, c) {
    ball.mesh.material.color.setHex(c);
    ball.mesh.material.emissive.setHex(c);
  }
  setBallDigit(ball, text) {
    if (!text) { ball.digit.visible = false; return; }
    ball.digit.visible = true;
    setSpriteText(ball.digit, text, labelOpts(0.34, '#fcd34d'));
  }
  // 返回动画元组，页面直接 yield
  flyBall(ball, to, opts = {}) {
    const from = ball.group.position.clone();
    const lift = opts.lift ?? 60;
    const ms = opts.ms ?? 380;
    return [ms, (p) => {
      const q = EASE(p);
      ball.group.position.set(
        from.x + (to.x - from.x) * q,
        from.y + (to.y - from.y) * q + Math.sin(Math.PI * q) * lift,
        from.z + (to.z - from.z) * q,
      );
    }];
  }
  linkChain(items, color, opacity = 0.4) {
    for (let i = 0; i < items.length - 1; i++) {
      let m = this.links[i];
      if (!m) {
        m = new THREE.Mesh(
          new THREE.CylinderGeometry(1, 1, 1, 6),
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false }),
        );
        this.root.add(m);
        this.links.push(m);
      }
      m.material.color.setHex(color);
      m.material.opacity = opacity;
      placeBetween(m, items[i].group.position, items[i + 1].group.position, 1.6);
    }
    for (let k = items.length - 1; k < this.links.length; k++) this.links[k].visible = false;
  }
  hideChain() { this.links.forEach((m) => { m.visible = false; }); }

  // ---- 0-9 桶 ----
  buildBuckets(count, opts = {}) {
    this.bucketCount = count;
    this.bucketCfg = {
      cx: opts.cx ?? this.cx,
      gap: opts.gap ?? 64,
      y: opts.y ?? 250,
      z: opts.z ?? -60,
      radius: opts.radius ?? 26,
      height: opts.height ?? 190,
    };
    const cfg = this.bucketCfg;
    for (let d = 0; d < count; d++) {
      const x = this.bucketX(d);
      const group = new THREE.Group();
      const cyl = new THREE.Mesh(
        new THREE.CylinderGeometry(cfg.radius, cfg.radius, cfg.height, 20),
        new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.11, depthWrite: false }),
      );
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(cfg.radius, 2, 8, 28),
        new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.55, depthWrite: false }),
      );
      rim.rotation.x = Math.PI / 2;
      rim.position.y = cfg.height / 2;
      const label = makeTextSprite(opts.labels ? opts.labels[d] : String(d), labelOpts(0.55, PALETTE.textDim));
      label.position.y = -cfg.height / 2 - 30;
      group.add(cyl, rim, label);
      group.position.set(x, cfg.y, cfg.z);
      this.root.add(group);
      this.buckets.push({ group, cyl, rim });
    }
  }
  bucketSlot(d, k) {
    const cfg = this.bucketCfg;
    return V3(this.bucketX(d), cfg.y - cfg.height / 2 + 24 + k * 24, cfg.z);
  }
  setBucketActive(d, on) {
    const b = this.buckets[d];
    if (!b) return;
    b.rim.material.opacity = on ? 0.95 : 0.55;
    b.cyl.material.opacity = on ? 0.22 : 0.11;
  }

  dispose() {
    this.root.traverse((o) => {
      if (o.geometry && !o.isSprite) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
    });
    this.scene.remove(this.root);
    this.bars = []; this.balls = []; this.buckets = []; this.tree = []; this.treeEdges = []; this.links = [];
  }
}
