/**
 * ============================================================
 * QUICK COMMERCE THEME — MAIN JS
 * File:  assets/theme.js
 * ============================================================
 */
(function () {
  'use strict';

  /* ── Hero Banner Slider ──────────────────────────────────── */
  function initHeroSlider() {
    const track = document.getElementById('heroTrack');
    if (!track) return;

    const slides = track.querySelectorAll('.qc-hero__slide');
    const dots   = document.querySelectorAll('.qc-hero__dot');
    if (slides.length < 2) return;

    let current = 0;
    let timer;
    const section = track.closest('[data-section-id]');
    // Read autoplay speed from section data attribute (set via Liquid below)
    const speed  = parseInt(track.dataset.speed || '4', 10) * 1000;

    function goTo(index) {
      current = (index + slides.length) % slides.length;
      track.style.transform = 'translateX(-' + (current * 100) + '%)';
      dots.forEach(function (d, i) {
        d.classList.toggle('active', i === current);
        d.setAttribute('aria-selected', i === current ? 'true' : 'false');
      });
    }

    function next() { goTo(current + 1); }

    function startTimer() { timer = setInterval(next, speed); }
    function stopTimer()  { clearInterval(timer); }

    dots.forEach(function (dot) {
      dot.addEventListener('click', function () {
        stopTimer();
        goTo(parseInt(this.dataset.index, 10));
        startTimer();
      });
    });

    // Pause on hover
    track.addEventListener('mouseenter', stopTimer);
    track.addEventListener('mouseleave', startTimer);

    // Touch swipe
    let touchStartX = 0;
    track.addEventListener('touchstart', function (e) {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });
    track.addEventListener('touchend', function (e) {
      const diff = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) {
        stopTimer();
        goTo(diff > 0 ? current + 1 : current - 1);
        startTimer();
      }
    }, { passive: true });

    startTimer();
  }

  /* ── Add to Cart ─────────────────────────────────────────── */
  function initAddToCart() {
    document.addEventListener('click', function (e) {
      const btn = e.target.closest('.qc-add-btn');
      if (!btn) return;

      const variantId    = btn.dataset.variantId;
      const productTitle = btn.dataset.productTitle || 'Item';
      if (!variantId) return;

      const idleSpan    = btn.querySelector('.qc-add-btn__idle');
      const loadingSpan = btn.querySelector('.qc-add-btn__loading');

      btn.classList.add('adding');
      if (idleSpan)    idleSpan.hidden = true;
      if (loadingSpan) loadingSpan.hidden = false;

      fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: variantId, quantity: 1 })
      })
      .then(function (r) { return r.json(); })
      .then(function () {
        btn.classList.remove('adding');
        btn.classList.add('added');
        if (idleSpan)    { idleSpan.hidden = false; idleSpan.textContent = '✓'; }
        if (loadingSpan) loadingSpan.hidden = true;

        showToast(productTitle + ' added to cart');
        updateCartCount();

        setTimeout(function () {
          btn.classList.remove('added');
          if (idleSpan) {
            idleSpan.innerHTML =
              '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> ADD';
          }
        }, 1500);
      })
      .catch(function (err) {
        btn.classList.remove('adding');
        if (idleSpan)    idleSpan.hidden = false;
        if (loadingSpan) loadingSpan.hidden = true;
        console.error('[QC] Cart error:', err);
        showToast('Could not add item. Please try again.');
      });
    });
  }

  /* ── Cart count sync ─────────────────────────────────────── */
  function updateCartCount() {
    fetch('/cart.js')
      .then(function (r) { return r.json(); })
      .then(function (cart) {
        const badge   = document.querySelector('.qc-cart-badge');
        const cartBtn = document.querySelector('.qc-cart-btn');
        if (!cartBtn) return;

        if (cart.item_count > 0) {
          if (badge) {
            badge.textContent = cart.item_count;
          } else {
            const b = document.createElement('span');
            b.className = 'qc-cart-badge';
            b.setAttribute('aria-hidden', 'true');
            b.textContent = cart.item_count;
            // Pick up accent color from CSS variable if set
            b.style.background = getComputedStyle(document.documentElement)
              .getPropertyValue('--qc-accent').trim() || '#0f6e56';
            cartBtn.appendChild(b);
          }
          cartBtn.setAttribute('aria-label', 'Cart (' + cart.item_count + ' items)');
        } else if (badge) {
          badge.remove();
          cartBtn.setAttribute('aria-label', 'Cart');
        }
        document.dispatchEvent(new CustomEvent('cart:update', { detail: cart }));
      })
      .catch(function () {});
  }

  /* ── Toast ───────────────────────────────────────────────── */
  let toastEl;
  let toastTimer;

  function showToast(message) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'qc-toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    clearTimeout(toastTimer);
    toastEl.textContent = message;
    toastEl.classList.add('show');
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2200);
  }

  /* ── Boot ────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    initHeroSlider();
    initAddToCart();
    updateCartCount();
  });

})();