// 3D/modes/Table3D.js
// 竖直 3D 网格面板：行沿 x，列沿 z，单元格为凸起的扁平盒子。
import * as THREE from 'three';
import { VBox, VText } from '../VisualObject3D.js';
import { PALETTE } from '../Glow.js';
import { ripple, pop } from '../effects/Fx.js';

export class Table3D {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.rows = opts.rows || 2;
    this.cols = opts.cols || 10;
    this.cw = opts.cellW || 64;
    this.ch = opts.cellH || 48;
    this.startX = opts.startX ?? 0;
    this.startY = opts.startY ?? 120;
    this.cells = [];     // [r][c] -> VBox
    this.rowLabels = [];
    this.colLabels = [];
  }

  create() {
    const halfR = (this.rows - 1) / 2, halfC = (this.cols - 1) / 2;
    for (let r = 0; r < this.rows; r++) {
      this.cells[r] = [];
      for (let c = 0; c < this.cols; c++) {
        const x = this.startX + (c - halfC) * this.cw;
        const z = (halfR - r) * this.ch * 0.85;
        const box = new VBox(this.scene, { w: this.cw - 8, h: this.ch - 8, d: 26, x, y: this.startY, z, label: '', color: PALETTE.node, emissive: PALETTE.nodeEmissive });
        this.cells[r][c] = box;
      }
      const lbl = new VText(this.scene, { text: '行' + r, x: this.startX - halfC * this.cw - 50, y: this.startY, z: (halfR - r) * this.ch * 0.85, color: PALETTE.textDim, scale: 0.7 });
      this.rowLabels.push(lbl);
    }
    for (let c = 0; c < this.cols; c++) {
      const x = this.startX + (c - halfC) * this.cw;
      const lbl = new VText(this.scene, { text: String(c), x, y: this.startY - 50, z: (halfR + 1) * this.ch * 0.85, color: PALETTE.textDim, scale: 0.7 });
      this.colLabels.push(lbl);
    }
  }

  setCell(r, c, value, cmd) {
    const box = this.cells[r][c];
    if (!box) return;
    const prev = box.text;
    let fxDone = false;
    cmd({ duration: 250, fn: () => { if (!fxDone) { fxDone = true; pop(this.scene, box.mesh); } box.setText(String(value)); }, undo: () => box.setText(prev) });
  }

  setRowLabel(r, text) {
    const l = this.rowLabels[r];
    if (l) l.setText(text);
  }

  highlightCell(r, c, cmd) {
    const box = this.cells[r][c];
    if (!box) return;
    const baseY = box.mesh.position.y;
    let fxDone = false;
    cmd({ duration: 300, fn: (p) => { if (!fxDone) { fxDone = true; ripple(this.scene, box.mesh.position.x, box.mesh.position.y, box.mesh.position.z, PALETTE.highlight, 52); } box.mesh.material.color.lerpColors(new THREE.Color(PALETTE.node), new THREE.Color(PALETTE.highlight), p); box.mesh.material.emissive.setHex(PALETTE.highlightEmissive); box.mesh.position.y = baseY + Math.sin(p * Math.PI) * 8; }, undo: () => { box.mesh.material.color.setHex(PALETTE.node); box.mesh.material.emissive.setHex(PALETTE.nodeEmissive); box.mesh.position.y = baseY; } });
  }

  unhighlightCell(r, c, cmd) {
    const box = this.cells[r][c];
    if (!box) return;
    cmd({ duration: 300, fn: (p) => { box.mesh.material.color.lerpColors(new THREE.Color(PALETTE.highlight), new THREE.Color(PALETTE.node), p); box.mesh.material.emissive.setHex(PALETTE.nodeEmissive); }, undo: () => {} });
  }
}
