// 3D/modes/Array3D.js
// 一维数组：盒子槽位 + 底部下标标签；bar 模式：柱体高度=值。
import * as THREE from 'three';
import { VBox, VBar, VText, tubeBetween } from '../VisualObject3D.js';
import { PALETTE } from '../Glow.js';
import { ripple, beam, pop } from '../effects/Fx.js';

export class Array3D {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.type = opts.type || 'box';
    this.count = opts.count || 15;
    this.w = opts.w || 50;
    this.h = opts.h || 50;
    this.spacing = opts.spacing || 62;
    this.startX = opts.startX ?? 0;
    this.startY = opts.startY ?? 0;
    this.z = opts.z ?? 0;
    this.elems = [];
    this.indexLabels = [];
    this.lines = [];
  }

  create() {
    const half = (this.count - 1) / 2;
    for (let i = 0; i < this.count; i++) {
      const x = this.startX + (i - half) * this.spacing;
      const y = this.startY;
      if (this.type === 'box') {
        const box = new VBox(this.scene, { w: this.w, h: this.h, d: this.h * 0.6, x, y, z: this.z, label: '', color: PALETTE.node, emissive: PALETTE.nodeEmissive });
        this.elems.push(box);
      } else {
        const bar = new VBar(this.scene, { x, z: this.z, height: 6, color: PALETTE.node, emissive: PALETTE.nodeEmissive });
        this.elems.push(bar);
      }
      const lbl = new VText(this.scene, { text: i, x, y: y - 42, z: this.z, color: PALETTE.textDim, scale: 0.7 });
      this.indexLabels.push(lbl);
    }
  }

  xOf(i) { const half = (this.count - 1) / 2; return this.startX + (i - half) * this.spacing; }

  setValue(i, value, cmd) {
    const el = this.elems[i];
    if (this.type === 'box') {
      const prev = el.text;
      let fxDone = false;
      cmd({ duration: 200, fn: () => { if (!fxDone) { fxDone = true; pop(this.scene, el.mesh); } el.setText(String(value)); }, undo: () => el.setText(prev) });
    } else {
      const v = parseInt(value) || 1;
      const prevH = el.height;
      cmd({ duration: 300, fn: () => el.setHeight(v * 6), undo: () => el.setHeight(prevH) });
    }
  }

  highlight(i, cmd, color) {
    const el = this.elems[i];
    const c = color || PALETTE.highlight;
    let fxDone = false;
    cmd({ duration: 250, fn: (p) => { if (!fxDone) { fxDone = true; ripple(this.scene, el.mesh.position.x, el.mesh.position.y, el.mesh.position.z, c); } el.mesh.material.emissiveIntensity = 0.35 + p * 0.55; el.mesh.material.color.setHex(c); }, undo: () => { el.mesh.material.emissiveIntensity = 0.35; el.mesh.material.color.setHex(PALETTE.node); } });
  }

  unhighlight(i, cmd) {
    const el = this.elems[i];
    cmd({ duration: 250, fn: (p) => { el.mesh.material.emissiveIntensity = 0.35 + (1-p) * 0.55; el.mesh.material.color.lerpColors(new THREE.Color(PALETTE.highlight), new THREE.Color(PALETTE.node), p); }, undo: () => {} });
  }

  swap(i, j, cmd) {
    const a = this.elems[i], b = this.elems[j];
    const ax = this.xOf(i), bx = this.xOf(j);
    const ay = a.mesh.position.y, by = b.mesh.position.y;
    let fxDone = false;
    cmd({ duration: 450, fn: (p) => {
      if (!fxDone) { fxDone = true; beam(this.scene, new THREE.Vector3(ax, ay, this.z), new THREE.Vector3(bx, by, this.z), PALETTE.highlight); }
      a.mesh.position.x = ax + (bx - ax) * p; b.mesh.position.x = bx + (ax - bx) * p; a.mesh.position.y = ay + 60 * Math.sin(p * Math.PI); b.mesh.position.y = by + 60 * Math.sin(p * Math.PI);
    }, undo: () => { a.mesh.position.set(ax, ay, this.z); b.mesh.position.set(bx, by, this.z); } });
  }

  addLine(from, to, cmd, opts) {
    const f = this.elems[from].mesh.position, t = this.elems[to].mesh.position;
    const mesh = tubeBetween(this.scene, f.clone(), t.clone(), opts);
    this.lines.push(mesh);
    return mesh;
  }

  clearLines() { for (const l of this.lines) { this.scene.remove(l); l.geometry.dispose(); l.material.dispose(); } this.lines = []; }
}
