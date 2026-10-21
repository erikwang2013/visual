// 3D/director/StringStage.js — 字符串舞台：主串纸带 + 模式纸带 + next 表 + i/j 指针 + 失配跳转弧。
// 页面只改字符颜色/next 值/指针位置；build() 负责整台重建。
import * as THREE from 'three';
import { VBox, VText } from '../VisualObject3D.js';
import { PALETTE, makeTextSprite } from '../Glow.js';

const UP = new THREE.Vector3(0, 1, 0);

// 文字纹理走 Glow 缓存、Sprite 几何由 three.js 全站共享：只释放格子的私有几何和材质。
function release(scene, obj) {
  if (!obj) return;
  const root = obj.mesh || obj.sprite || obj.group || obj;
  obj.remove?.();
  scene.remove(root);
  root.traverse?.((o) => {
    if (o.geometry && !o.isSprite) o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
  });
}

export class StringStage {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.scale = opts.scale ?? 1;
    this.cw = (opts.cellW ?? 34) * this.scale;
    this.ch = (opts.cellH ?? 34) * this.scale;
    this.cd = 12 * this.scale;
    this.gap = (opts.gap ?? 5) * this.scale;
    this.step = this.cw + this.gap;
    this.cx = opts.center?.[0] ?? 320;
    this.tapeY = opts.tapeY ?? 330;
    this.patY = opts.patY ?? 470;
    this.nextY = opts.nextY ?? 620;
    this.textBase = 0x60a5fa;
    this.patBase = 0xfb7185;
    this.nextBase = 0x475569;
    this.os = [];      // 所有需销毁的对象（VBox / VText / Group / Mesh）
    this.tape = [];
    this.pat = [];
    this.next = [];
    this.text = '';
    this.pattern = '';
    this.iPtr = this.makePointer('i', 0x22d3ee);
    this.jPtr = this.makePointer('j', 0xfde047);
    this.jumpCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(),
    );
    this.jumpGeo = new THREE.BufferGeometry();
    this.jumpLine = new THREE.Line(this.jumpGeo, new THREE.LineDashedMaterial({
      color: 0x22d3ee, dashSize: 7, gapSize: 5, transparent: true, opacity: 0.95, depthWrite: false,
    }));
    this.jumpLine.visible = false;
    this.jumpLine.frustumCulled = false;
    this.jumpHead = new THREE.Mesh(
      new THREE.ConeGeometry(6, 14, 8),
      new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.95, depthWrite: false }),
    );
    this.jumpHead.visible = false;
    scene.add(this.jumpLine, this.jumpHead);
    this.matchBar = new THREE.Mesh(
      new THREE.BoxGeometry(1, 4, 4),
      new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0.95, depthWrite: false }),
    );
    this.matchBar.visible = false;
    scene.add(this.matchBar);
  }

  makePointer(label, color) {
    const g = new THREE.Group();
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(7 * this.scale, 14 * this.scale, 10),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, depthWrite: false }),
    );
    g.add(cone);
    const spr = makeTextSprite(label, { color: '#' + color.toString(16).padStart(6, '0'), scale: 0.42 * this.scale });
    spr.position.set(0, -22 * this.scale, 0);
    g.add(spr);
    this.scene.add(g);
    return g;
  }

  xAt(k, n) { return this.cx - ((n - 1) * this.step) / 2 + k * this.step; }
  xText(i) { return this.xAt(i, this.text.length); }
  xPat(j) { return this.xAt(j, this.pattern.length); }

  build(text, pattern) {
    this.clearCells();
    this.text = text;
    this.pattern = pattern;
    const z = 0;
    [...text].forEach((ch, i) => {
      const b = new VBox(this.scene, {
        w: this.cw, h: this.ch, d: this.cd, x: this.xText(i), y: this.tapeY, z,
        label: ch, color: this.textBase, emissive: this.textBase,
      });
      b.label.scale.multiplyScalar(0.46 * this.scale);
      this.tape.push(b);
      const idx = new VText(this.scene, {
        text: String(i), x: this.xText(i), y: this.tapeY + this.ch / 2 + 13,
        z: 4, color: PALETTE.textDim, scale: 0.3 * this.scale,
      });
      this.os.push(idx);
    });
    [...pattern].forEach((ch, j) => {
      const b = new VBox(this.scene, {
        w: this.cw, h: this.ch, d: this.cd, x: this.xPat(j), y: this.patY, z,
        label: ch, color: this.patBase, emissive: this.patBase,
      });
      b.label.scale.multiplyScalar(0.46 * this.scale);
      this.pat.push(b);
      const idx = new VText(this.scene, {
        text: String(j), x: this.xPat(j), y: this.patY + this.ch / 2 + 13,
        z: 4, color: PALETTE.textDim, scale: 0.3 * this.scale,
      });
      this.os.push(idx);
      const n = new VBox(this.scene, {
        w: this.cw, h: 22 * this.scale, d: 8 * this.scale, x: this.xPat(j), y: this.nextY, z,
        label: '·', color: this.nextBase, emissive: this.nextBase,
      });
      n.label.scale.multiplyScalar(0.4 * this.scale);
      this.next.push(n);
    });
    const head = new VText(this.scene, {
      text: 'next', x: this.xPat(0) - this.step - 24, y: this.nextY,
      z: 4, color: PALETTE.text, scale: 0.42 * this.scale,
    });
    this.os.push(head);
    this.os.push(...this.tape, ...this.pat, ...this.next);
    this.setPointer('i', 0);
    this.setPointer('j', 0);
  }

  setPointer(name, idx) {
    const g = name === 'i' ? this.iPtr : this.jPtr;
    const y = name === 'i' ? this.tapeY - this.ch / 2 - 26 * this.scale : this.patY - this.ch / 2 - 26 * this.scale;
    g.position.set(name === 'i' ? this.xText(idx) : this.xPat(idx), y, 10);
    g.visible = true;
  }

  hidePointer(name) { (name === 'i' ? this.iPtr : this.jPtr).visible = false; }

  setTextColor(i, color) { const b = this.tape[i]; if (b) b.setColor(color, color); }
  setPatColor(j, color) { const b = this.pat[j]; if (b) b.setColor(color, color); }

  resetColors() {
    for (const b of this.tape) b.setColor(this.textBase, this.textBase);
    for (const b of this.pat) b.setColor(this.patBase, this.patBase);
  }

  setNext(j, value, color = 0x475569) {
    const b = this.next[j];
    if (!b) return;
    b.setText(String(value));
    b.label.scale.multiplyScalar(0.4 * this.scale);
    b.setColor(color, color);
  }

  resetNext() {
    for (const b of this.next) {
      b.setText('·');
      b.label.scale.multiplyScalar(0.4 * this.scale);
      b.setColor(this.nextBase, this.nextBase);
    }
  }

  // 失配跳转弧：从模式第 from 格跳到第 to 格（向下一状态）。
  jump(from, to) {
    const y = this.patY + this.ch / 2 + 42 * this.scale;
    const x1 = this.xPat(from), x2 = this.xPat(to);
    const v0 = this.jumpCurve.v0.set(x1, y, 10);
    const v2 = this.jumpCurve.v2.set(x2, y, 10);
    this.jumpCurve.v1.set((v0.x + v2.x) / 2, y + 34 * this.scale, 10);
    this.jumpCurve.needsUpdate = true;
    this.jumpGeo.setFromPoints(this.jumpCurve.getPoints(18));
    this.jumpLine.computeLineDistances();
    const tan = this.jumpCurve.getTangent(1).normalize();
    this.jumpHead.position.copy(v2).addScaledVector(tan, -7);
    this.jumpHead.quaternion.setFromUnitVectors(UP, tan);
    this.jumpLine.visible = true;
    this.jumpHead.visible = true;
  }

  clearJump() {
    this.jumpLine.visible = false;
    this.jumpHead.visible = false;
  }

  markMatch(start, len) {
    for (let q = start; q < start + len; q++) this.setTextColor(q, 0x4ade80);
    const w = len * this.step - this.gap;
    const x = this.xAt(start, this.text.length) + ((len - 1) * this.step) / 2;
    this.matchBar.scale.x = w;
    this.matchBar.position.set(x, this.tapeY - this.ch / 2 - 9, 10);
    this.matchBar.visible = true;
  }

  clearMatch() { this.matchBar.visible = false; }

  textAnchor(i) { return new THREE.Vector3(this.xText(i), this.tapeY + this.ch / 2 + 22, 18); }
  patAnchor(j) { return new THREE.Vector3(this.xPat(j), this.patY + this.ch / 2 + 22, 18); }
  nextAnchor(j) { return new THREE.Vector3(this.xPat(j), this.nextY + 20, 18); }

  reset() {
    this.resetColors();
    this.resetNext();
    this.clearJump();
    this.clearMatch();
    this.setPointer('i', 0);
    this.setPointer('j', 0);
  }

  clearCells() {
    for (const o of this.os) release(this.scene, o);
    this.os = [];
    this.tape = [];
    this.pat = [];
    this.next = [];
  }

  dispose() {
    if (!this.jumpLine) return;
    this.clearCells();
    release(this.scene, this.iPtr);
    release(this.scene, this.jPtr);
    this.scene.remove(this.jumpLine, this.jumpHead, this.matchBar);
    this.jumpGeo.dispose();
    this.jumpLine.material.dispose();
    this.jumpHead.geometry.dispose();
    this.jumpHead.material.dispose();
    this.matchBar.geometry.dispose();
    this.matchBar.material.dispose();
    this.jumpLine = null;
    this.jumpHead = null;
    this.matchBar = null;
    this.iPtr = null;
    this.jPtr = null;
  }
}
