// 3D/director/AnnotationLayer.js — DOM 标注层：3D 锚点投影到屏幕，短标签 + 引导线。
// 标签用 DOM 而非文字精灵，保证清晰；锚点可以是 Vector3，也可以是返回 Vector3 的函数（跟随节点）。
import * as THREE from 'three';

export class AnnotationLayer {
  constructor(scene) {
    this.scene = scene;
    this.container = scene.renderer.domElement.parentElement;
    this.root = document.createElement('div');
    this.root.className = 'story-annotations';
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('class', 'story-anno-svg');
    this.root.appendChild(this.svg);
    this.container.appendChild(this.root);
    this.items = new Map();
    this._v = new THREE.Vector3();
    this.rect = { width: 1, height: 1 };
    this.resize = () => {
      const r = this.container.getBoundingClientRect();
      this.rect = { width: r.width, height: r.height };
      for (const it of this.items.values()) it.dirty = true;
    };
    window.addEventListener('resize', this.resize);
    if (typeof ResizeObserver !== 'undefined') {
      this.ro = new ResizeObserver(this.resize);
      this.ro.observe(this.container);
    }
    this.resize();
    scene.onFrame(() => this.update());
  }

  set(id, { text, anchor, offset = [0, -46], className = '' } = {}) {
    if (!this.items.has(id)) {
      const el = document.createElement('div');
      el.className = 'story-anno';
      el.innerHTML = '<span class="story-anno-text"></span>';
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('class', 'story-anno-line');
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('class', 'story-anno-dot');
      dot.setAttribute('r', '3.5');
      this.root.appendChild(el);
      this.svg.append(line, dot);
      this.items.set(id, { el, line, dot, textEl: el.querySelector('.story-anno-text') });
    }
    const it = this.items.get(id);
    it.anchor = anchor;
    it.offset = offset;
    it.textEl.textContent = text;
    it.el.className = 'story-anno ' + className;
    it.dirty = true;
  }

  remove(id) {
    const it = this.items.get(id);
    if (!it) return;
    it.el.remove();
    it.line.remove();
    it.dot.remove();
    this.items.delete(id);
  }

  clear() {
    for (const id of [...this.items.keys()]) this.remove(id);
  }

  update() {
    const w = this.rect.width;
    const h = this.rect.height;
    const cam = this.scene.camera;
    for (const it of this.items.values()) {
      const anchor = typeof it.anchor === 'function' ? it.anchor() : it.anchor;
      if (!anchor) {
        it.el.style.display = it.line.style.display = it.dot.style.display = 'none';
        continue;
      }
      const v = this._v.set(anchor.x, anchor.y, anchor.z).project(cam);
      const visible = v.z > -1 && v.z < 1 && Math.abs(v.x) < 1.25 && Math.abs(v.y) < 1.25;
      if (!visible) {
        it.el.style.display = it.line.style.display = it.dot.style.display = 'none';
        continue;
      }
      const x = (v.x * 0.5 + 0.5) * w;
      const y = (-v.y * 0.5 + 0.5) * h;
      it.el.style.display = 'block';
      it.line.style.display = 'block';
      it.dot.style.display = 'block';
      if (it.dirty || !it.w) {
        it.w = it.el.offsetWidth;
        it.h = it.el.offsetHeight;
        it.dirty = false;
      }
      const halfW = it.w / 2 + 4;
      const tx = Math.max(halfW, Math.min(w - halfW, x + it.offset[0]));
      const ty = Math.max(it.h + 6, Math.min(h - 10, y + it.offset[1]));
      it.el.style.transform = `translate(${tx}px, ${ty}px) translate(-50%, -100%)`;
      it.line.setAttribute('x1', x);
      it.line.setAttribute('y1', y);
      it.line.setAttribute('x2', tx);
      it.line.setAttribute('y2', ty);
      it.dot.setAttribute('cx', x);
      it.dot.setAttribute('cy', y);
    }
  }
}
