// 3D/director/InputKit.js — 输入控件薄封装：复用 ControlPanel 的 DOM/CSS。
export class InputKit {
  constructor(panel) {
    this.panel = panel;
  }

  addSelect(label, options, value, onChange) {
    const sel = this.panel.addSelect(label, options.map(String), String(value));
    if (onChange) sel.addEventListener('change', () => onChange(sel.value));
    return sel;
  }

  addInput(placeholder, onEnter, maxLen = 10) {
    return this.panel.addInput(placeholder, onEnter, maxLen);
  }

  addButton(label, onClick) {
    const btn = this.panel.addButton(label, onClick);
    // 原生清空按钮出现后，立刻移除 autodemo 注入的「重载页面」兜底按钮。
    if (/清空|清除|重置/.test(label)) document.getElementById('clear-run-btn')?.remove();
    return btn;
  }
}
