// 3D/site-widgets.js — 全站悬浮打赏入口 + 二维码放大弹框。
// 所有内容页以 defer 引入：首屏不建弹框，空闲时预热二维码；点击只做 class 切换。
(function () {
  'use strict';
  if (document.getElementById('donateBtn')) return;

  var modal = null;
  var lastFocus = null;
  var scrollLocked = false;
  var prevOverflow = '';
  var HINT_DEFAULT = '点击二维码可放大';

  var btn = document.createElement('button');
  btn.id = 'donateBtn';
  btn.type = 'button';
  btn.setAttribute('aria-label', '赞赏支持');
  btn.setAttribute('title', '赞赏支持');
  btn.innerHTML =
    '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" ' +
    'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M4 9h12v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9Z"/>' +
    '<path d="M16 10h2.5a2.5 2.5 0 0 1 0 5H16"/>' +
    '<path d="M7 4c0 1.2 1 1.3 1 2.5M11 4c0 1.2 1 1.3 1 2.5"/>' +
    '</svg>';
  document.body.appendChild(btn);

  function buildModal() {
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'donateModal';
    modal.className = 'donate-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'donateTitle');
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML =
      '<div class="donate-dialog" role="document">' +
        '<button type="button" class="donate-close" aria-label="关闭打赏弹框">×</button>' +
        '<h2 id="donateTitle">赞赏支持</h2>' +
        '<p class="donate-sub">微信 / 支付宝扫一扫，感谢你的支持</p>' +
        '<div class="donate-grid">' +
          '<button type="button" class="donate-card" data-kind="wechat" aria-label="放大微信收款码">' +
            '<img src="images/weixinpay.png" alt="微信打赏收款码" width="386" height="423" decoding="async">' +
            '<span class="donate-name">微信</span>' +
          '</button>' +
          '<button type="button" class="donate-card" data-kind="alipay" aria-label="放大支付宝收款码">' +
            '<img src="images/alipay.png" alt="支付宝打赏收款码" width="412" height="450" decoding="async">' +
            '<span class="donate-name">支付宝</span>' +
          '</button>' +
        '</div>' +
        '<p class="donate-hint" id="donateHint">' + HINT_DEFAULT + '</p>' +
      '</div>';
    document.body.appendChild(modal);

    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeModal();
    });
    modal.querySelector('.donate-close').addEventListener('click', closeModal);
    modal.querySelectorAll('.donate-card').forEach(function (card) {
      card.addEventListener('click', function () {
        var zoomed = modal.classList.toggle('is-zoomed');
        modal.querySelectorAll('.donate-card').forEach(function (c) {
          c.classList.toggle('is-active', zoomed && c === card);
        });
        document.getElementById('donateHint').textContent = zoomed ? '点击二维码恢复' : HINT_DEFAULT;
      });
    });
    modal.addEventListener('keydown', onModalKeydown);
    return modal;
  }

  function onModalKeydown(e) {
    if (e.key === 'Escape') {
      if (modal.classList.contains('is-zoomed')) unzoom();
      else closeModal();
      e.preventDefault();
      return;
    }
    if (e.key !== 'Tab') return;
    var focusables = Array.prototype.filter.call(
      modal.querySelectorAll('button'),
      function (el) { return el.offsetParent !== null; }
    );
    if (!focusables.length) return;
    var first = focusables[0];
    var last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function unzoom() {
    if (!modal) return;
    modal.classList.remove('is-zoomed');
    modal.querySelectorAll('.donate-card').forEach(function (c) { c.classList.remove('is-active'); });
    document.getElementById('donateHint').textContent = HINT_DEFAULT;
  }

  function openModal() {
    buildModal();
    if (modal.classList.contains('is-open')) return;
    lastFocus = document.activeElement && document.activeElement !== document.body ? document.activeElement : btn;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('donate-open');
    window.dispatchEvent(new Event('donate:open'));
    if (!scrollLocked) {
      prevOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';
      scrollLocked = true;
    }
    // 下一帧再聚焦，确保 visibility:visible 已生效，避免被浏览器拒绝
    requestAnimationFrame(function () {
      var closeBtn = modal.querySelector('.donate-close');
      if (closeBtn) closeBtn.focus({ preventScroll: true });
    });
    warmImages();
  }

  function closeModal() {
    if (!modal || !modal.classList.contains('is-open')) return;
    unzoom();
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('donate-open');
    window.dispatchEvent(new Event('donate:close'));
    if (scrollLocked) {
      document.documentElement.style.overflow = prevOverflow;
      scrollLocked = false;
    }
    var focusTarget = lastFocus;
    requestAnimationFrame(function () {
      if (focusTarget && typeof focusTarget.focus === 'function') focusTarget.focus({ preventScroll: true });
    });
  }

  function warmImages() {
    if (!modal) return;
    modal.querySelectorAll('img').forEach(function (img) {
      if (img.dataset.warm) return;
      img.dataset.warm = '1';
      if (img.decode) img.decode().catch(function () {});
    });
  }

  function prewarm() {
    buildModal();
    warmImages();
  }

  btn.addEventListener('click', openModal);
  btn.addEventListener('pointerenter', prewarm, { passive: true });
  btn.addEventListener('pointerdown', prewarm, { passive: true });
  btn.addEventListener('focus', prewarm);
  if (window.requestIdleCallback) window.requestIdleCallback(prewarm, { timeout: 2500 });
  setTimeout(prewarm, 1800);
})();
