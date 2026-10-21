// 3D/director/StateInspector.js — 实时状态面板。
// 两种输入：BFS 旧字段（queue/visited/dist）或通用 blocks（chips/kv/text/dist）。
export class StateInspector {
  constructor(sideEl) {
    this.el = document.createElement('div');
    this.el.id = 'state-panel';
    if (sideEl) {
      const hints = sideEl.querySelector('#side-hints');
      sideEl.insertBefore(this.el, hints || null);
    }
    this.resetEl();
  }

  resetEl() {
    this.el.innerHTML = `
      <div class="state-title">实时状态</div>
      <div class="state-block">
        <div class="state-label">队列 FIFO <span class="state-hint">队首 → 队尾</span></div>
        <div class="state-queue"></div>
      </div>
      <div class="state-block">
        <div class="state-label">已访问</div>
        <div class="state-visited"></div>
      </div>
      <div class="state-block">
        <div class="state-label">dist[]</div>
        <div class="state-dist"></div>
      </div>
      <div class="state-layer"></div>`;
    this.queueEl = this.el.querySelector('.state-queue');
    this.visitedEl = this.el.querySelector('.state-visited');
    this.distEl = this.el.querySelector('.state-dist');
    this.layerEl = this.el.querySelector('.state-layer');
  }

  clear() {
    this.resetEl();
  }

  esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  chips(items, empty = '—') {
    if (!items || !items.length) return `<span class="state-empty">${empty}</span>`;
    return items.map((it) => {
      const o = typeof it === 'object' && it !== null ? it : { text: it };
      return `<span class="state-chip ${o.cls || ''}">${this.esc(o.text)}</span>`;
    }).join('');
  }

  distCells(values, current) {
    return (values || []).map((d, i) => {
      const isInf = !Number.isFinite(d);
      return `<span class="state-dist-cell${i === current ? ' current' : ''}${isInf ? ' inf' : ''}"><b>${i}</b>:${isInf ? '∞' : d}</span>`;
    }).join('');
  }

  renderBlocks(blocks, footer) {
    const html = blocks.map((b) => {
      let body = '';
      if (b.type === 'chips') body = this.chips(b.items, b.empty);
      else if (b.type === 'kv') {
        const items = b.items || [];
        body = items.length
          ? items.map((it) => `<span class="state-kv-item"><b>${this.esc(it.k)}</b><span>${this.esc(it.v)}</span></span>`).join('')
          : `<span class="state-empty">${this.esc(b.empty || '—')}</span>`;
      } else if (b.type === 'text') {
        body = `<span class="state-text">${this.esc(b.value ?? '')}</span>`;
      } else if (b.type === 'dist') {
        body = this.distCells(b.values, b.current);
      }
      const label = b.label
        ? `<div class="state-label">${this.esc(b.label)}${b.hint ? `<span class="state-hint">${this.esc(b.hint)}</span>` : ''}</div>`
        : '';
      return `<div class="state-block">${label}<div class="state-${b.type}">${body}</div></div>`;
    }).join('');
    this.el.innerHTML = '<div class="state-title">实时状态</div>' + html +
      (footer ? `<div class="state-layer">${footer}</div>` : '');
  }

  update(state = {}) {
    if (Array.isArray(state.blocks)) {
      this.renderBlocks(state.blocks, state.footer || '');
      return;
    }
    const queue = state.queue || [];
    const visited = state.visited || [];
    const dist = state.dist || [];
    const current = state.current;
    const layer = state.layer;
    if (queue.length) {
      this.queueEl.innerHTML = queue.map((id, i) =>
        `<span class="state-chip queue${i === 0 ? ' head' : ''}${id === current ? ' current' : ''}">${id}${i === 0 ? '<i>头</i>' : ''}</span>`
      ).join('');
    } else {
      this.queueEl.innerHTML = '<span class="state-empty">空</span>';
    }
    if (visited.length) {
      this.visitedEl.innerHTML = visited.map((id) =>
        `<span class="state-chip visited${id === current ? ' current' : ''}">${id}</span>`
      ).join('');
    } else {
      this.visitedEl.innerHTML = '<span class="state-empty">—</span>';
    }
    if (dist.length) {
      this.distEl.innerHTML = dist.map((d, i) => {
        const isInf = !Number.isFinite(d);
        return `<span class="state-dist-cell${i === current ? ' current' : ''}${isInf ? ' inf' : ''}"><b>${i}</b>:${isInf ? '∞' : d}</span>`;
      }).join('');
    }
    const bits = [];
    if (layer !== undefined && layer !== null) bits.push('当前层 <b>' + layer + '</b>');
    if (state.tree && state.tree.length) bits.push('BFS 树 <b>' + state.tree.length + '</b> 条边');
    if (state.order && state.order.length) bits.push('访问顺序 <b>' + state.order.join(' → ') + '</b>');
    this.layerEl.innerHTML = bits.join(' · ');
  }
}
