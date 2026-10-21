// 3D/director/StateInspector.js — 实时状态面板。
// 默认空状态中性；页面用 blocks（chips/kv/text/dist/table）或 BFS 旧字段。
export class StateInspector {
  constructor(sideEl) {
    this.el = document.createElement('div');
    this.el.id = 'state-panel';
    this.el.setAttribute('role', 'status');
    this.el.setAttribute('aria-live', 'polite');
    if (sideEl) {
      const hints = sideEl.querySelector('#side-hints');
      sideEl.insertBefore(this.el, hints || null);
    }
    this.renderEmpty();
  }

  esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  renderEmpty() {
    this.el.innerHTML = '<div class="state-title">实时状态</div><div class="state-empty">—</div>';
    this.queueEl = null;
    this.visitedEl = null;
    this.distEl = null;
    this.layerEl = null;
  }

  legacyEnsure() {
    if (this.queueEl && this.queueEl.isConnected) return;
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

  clear() { this.renderEmpty(); }

  safeCls(cls) {
    return String(cls || '').replace(/[^a-zA-Z0-9 _-]/g, '');
  }

  chips(items, empty = '—') {
    if (!items || !items.length) return `<span class="state-empty">${this.esc(empty)}</span>`;
    return items.map((it) => {
      const o = typeof it === 'object' && it !== null ? it : { text: it };
      return `<span class="state-chip ${this.safeCls(o.cls)}">${this.esc(o.text)}</span>`;
    }).join('');
  }

  distCells(values, current) {
    return (values || []).map((d, i) => {
      const isInf = !Number.isFinite(d);
      return `<span class="state-dist-cell${i === current ? ' current' : ''}${isInf ? ' inf' : ''}"><b>${i}</b>:${isInf ? '∞' : this.esc(d)}</span>`;
    }).join('');
  }

  table(rows, current) {
    if (!rows || !rows.length) return '<span class="state-empty">—</span>';
    const curR = Array.isArray(current) ? current[0] : -1;
    const curC = Array.isArray(current) ? current[1] : -1;
    return `<div class="state-table">${rows.map((row, r) =>
      `<div class="state-table-row">${(row || []).map((v, c) =>
        `<span class="state-table-cell${r === curR && c === curC ? ' current' : ''}">${this.esc(v)}</span>`
      ).join('')}</div>`
    ).join('')}</div>`;
  }

  renderBlocks(blocks, footer, footerText) {
    const html = blocks.map((b) => {
      let body = '';
      if (b.type === 'chips') body = this.chips(b.items, b.empty);
      else if (b.type === 'kv') {
        const items = b.items || [];
        body = items.length
          ? items.map((it) => `<span class="state-kv-item"><b>${this.esc(it.k)}</b><span>${this.esc(it.v)}</span></span>`).join('')
          : `<span class="state-empty">${this.esc(b.empty || '—')}</span>`;
      } else if (b.type === 'text') {
        body = `<span class="state-text">${this.esc(b.value)}</span>`;
      } else if (b.type === 'dist') {
        body = this.distCells(b.values, b.current);
      } else if (b.type === 'table') {
        body = this.table(b.rows, b.current);
      }
      const label = b.label
        ? `<div class="state-label">${this.esc(b.label)}${b.hint ? `<span class="state-hint">${this.esc(b.hint)}</span>` : ''}</div>`
        : '';
      const type = ['chips', 'kv', 'text', 'dist', 'table'].includes(b.type) ? b.type : 'text';
      return `<div class="state-block">${label}<div class="state-${type}">${body}</div></div>`;
    }).join('');
    const foot = footerText ? this.esc(footerText) : (footer || '');
    this.el.innerHTML = '<div class="state-title">实时状态</div>' + html +
      (foot ? `<div class="state-layer">${foot}</div>` : '');
  }

  update(state = {}) {
    if (Array.isArray(state.blocks)) {
      this.renderBlocks(state.blocks, state.footer || '', state.footerText || '');
      return;
    }
    this.legacyEnsure();
    const queue = state.queue || [];
    const visited = state.visited || [];
    const dist = state.dist || [];
    const current = state.current;
    const layer = state.layer;
    if (queue.length) {
      this.queueEl.innerHTML = queue.map((id, i) =>
        `<span class="state-chip queue${i === 0 ? ' head' : ''}${id === current ? ' current' : ''}">${this.esc(id)}${i === 0 ? '<i>头</i>' : ''}</span>`
      ).join('');
    } else {
      this.queueEl.innerHTML = '<span class="state-empty">空</span>';
    }
    if (visited.length) {
      this.visitedEl.innerHTML = visited.map((id) =>
        `<span class="state-chip visited${id === current ? ' current' : ''}">${this.esc(id)}</span>`
      ).join('');
    } else {
      this.visitedEl.innerHTML = '<span class="state-empty">—</span>';
    }
    if (dist.length) {
      this.distEl.innerHTML = this.distCells(dist, current);
    }
    const bits = [];
    if (layer !== undefined && layer !== null) bits.push('当前层 <b>' + this.esc(layer) + '</b>');
    if (state.tree && state.tree.length) bits.push('BFS 树 <b>' + this.esc(state.tree.length) + '</b> 条边');
    if (state.order && state.order.length) bits.push('访问顺序 <b>' + this.esc(state.order.join(' → ')) + '</b>');
    this.layerEl.innerHTML = bits.join(' · ');
  }
}
