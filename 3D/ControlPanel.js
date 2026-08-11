// 3D/ControlPanel.js
// 原生 DOM 控件，替代旧 jQuery 控件体系。
// 页面 HTML 结构：
//   <div id="controls"></div>  算法控件区（按钮/输入）
//   <div id="playbar"></div>   播放控制条

export class ControlPanel {
  constructor({ controlsId = 'controls', playbarId = 'playbar', engine } = {}) {
    this.controlsEl = document.getElementById(controlsId);
    this.playbarEl = document.getElementById(playbarId);
    this.engine = engine;
    if (engine) this.buildPlaybar();
  }

  addButton(label, onClick) {
    const btn = document.createElement('button');
    btn.className = 'algo-btn';
    btn.textContent = label;
    btn.addEventListener('click', onClick);
    this.controlsEl.appendChild(btn);
    return btn;
  }

  addInput(placeholder, onEnter, maxLen = 10) {
    const input = document.createElement('input');
    input.className = 'algo-input';
    input.placeholder = placeholder;
    input.maxLength = maxLen;
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && onEnter) onEnter(input.value);
    });
    this.controlsEl.appendChild(input);
    return input;
  }

  addSelect(label, options, value) {
    const wrap = document.createElement('span');
    wrap.className = 'algo-select';
    if (label) {
      const lbl = document.createElement('span');
      lbl.textContent = label;
      wrap.appendChild(lbl);
    }
    const sel = document.createElement('select');
    sel.className = 'algo-select-input';
    for (const opt of options) {
      const o = document.createElement('option');
      o.value = opt; o.textContent = opt;
      sel.appendChild(o);
    }
    sel.value = value || options[0];
    wrap.appendChild(sel);
    this.controlsEl.appendChild(wrap);
    return sel;
  }

  addLabel(text) {
    const span = document.createElement('span');
    span.className = 'algo-label';
    span.textContent = text;
    // 长提示（操作说明）进右侧说明栏，控件行只留按钮/输入，避免挤在一起
    const hints = document.getElementById('side-hints');
    const target = text.length > 12 && hints ? hints : this.controlsEl;
    target.appendChild(span);
    return span;
  }

  addStatus(text) {
    const el = document.createElement('div');
    el.className = 'algo-status';
    el.textContent = text;
    // 结果状态进右侧说明栏「结果」区，不遮挡 3D 演示
    const note = document.getElementById('algo-note');
    (note || this.controlsEl).appendChild(el);
    return el;
  }

  addSlider(label, min, max, step, value, onInput) {
    const wrap = document.createElement('span');
    wrap.className = 'algo-slider';
    const lbl = document.createElement('span');
    lbl.textContent = label;
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = min; slider.max = max; slider.step = step; slider.value = value;
    const out = document.createElement('b');
    out.textContent = value;
    slider.addEventListener('input', () => { out.textContent = slider.value; if (onInput) onInput(parseFloat(slider.value)); });
    wrap.append(lbl, slider, out);
    this.controlsEl.appendChild(wrap);
    return slider;
  }

  buildPlaybar() {
    this.playbarEl.innerHTML = '';
    const mkBtn = (label, fn) => {
      const b = document.createElement('button');
      b.className = 'play-btn';
      b.textContent = label;
      b.addEventListener('click', fn);
      this.playbarEl.appendChild(b);
      return b;
    };
    this.playBtn = mkBtn('▶ 播放', () => this.engine.toggle());
    mkBtn('⏭ 单步', () => this.engine.step());
    mkBtn('↩ 撤销', () => this.engine.undo());
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = 0.25; slider.max = 3; slider.step = 0.25; slider.value = 1;
    slider.className = 'speed-slider';
    slider.title = '动画速度';
    slider.addEventListener('input', () => { this.engine.speed = parseFloat(slider.value); });
    this.playbarEl.appendChild(slider);
    this.engine.onStateChange(() => {
      if (!this.playBtn) return;
      this.playBtn.textContent = this.engine.playing ? '⏸ 暂停' : '▶ 播放';
      this.playBtn.disabled = false;
    });
  }
}
