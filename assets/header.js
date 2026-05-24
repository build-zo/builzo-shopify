/**
 * ============================================================
 * QUICK COMMERCE — HEADER + GLOBAL PINCODE CONTEXT
 * File: assets/header.js
 *
 * Single file handles:
 * 1. Pincode modal (open/close/check)
 * 2. Delivery time on ALL pages (product, cart, collection etc.)
 * 3. Cart badge count
 * 4. localStorage pincode persistence
 * ============================================================
 */

/* ────────────────────────────────────────────────────────────
   DELIVERY MAP — set directly by header.liquid <script> tag.
   Falls back to empty if header not loaded.
──────────────────────────────────────────────────────────── */
if (typeof window.QCDeliveryMap === 'undefined') {
  window.QCDeliveryMap = {};
}
/* Only these pincodes are serviceable — matches Shopify local delivery zone */
window.QCDeliveryMapDefaults = {
  '151001': { area: 'Barnala, Punjab',      time: '10 min' },
  '151002': { area: 'Barnala, Punjab',      time: '10 min' },
  '151003': { area: 'Barnala, Punjab',      time: '12 min' },
  '151004': { area: 'Barnala, Punjab',      time: '12 min' },
  '151005': { area: 'Barnala, Punjab',      time: '15 min' }
};
/* Merge: theme editor blocks take priority, defaults fill the rest */
if (Object.keys(window.QCDeliveryMap).length === 0) {
  window.QCDeliveryMap = window.QCDeliveryMapDefaults;
}

/* ────────────────────────────────────────────────────────────
   GLOBAL PINCODE API  →  window.QCPincode
   Use anywhere: QCPincode.get() / .set() / .clear() / .lookup()
──────────────────────────────────────────────────────────── */
window.QCPincode = (function () {
  var KEY     = 'qc_pincode';
  var OLD_KEY = 'qc_pincode_data'; // legacy key migration

  /* Migrate old key format once */
  try {
    var old = localStorage.getItem(OLD_KEY);
    if (old && !localStorage.getItem(KEY)) {
      var o = JSON.parse(old);
      localStorage.setItem(KEY, JSON.stringify({
        pincode: o.pincode || '', area: o.area || '',
        time: o.time || '10 min', serviceable: true
      }));
      localStorage.removeItem(OLD_KEY);
    }
  } catch (e) {}

  function get() {
    try { return JSON.parse(localStorage.getItem(KEY)); }
    catch (e) { return null; }
  }

  function set(pincode, area, time, serviceable) {
    var data = {
      pincode: pincode, area: area,
      time: time, serviceable: serviceable !== false
    };
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
    /* Broadcast to any listeners on the same page */
    try {
      document.dispatchEvent(new CustomEvent('qc:pincode:changed', { detail: data }));
    } catch (e) {}
    return data;
  }

  function clear() { try { localStorage.removeItem(KEY); } catch (e) {} }

  function lookup(pin) {
    var info = (window.QCDeliveryMap || {})[pin];
    if (info) return { pincode: pin, area: info.area, time: info.time, serviceable: true };
    return null; /* not serviceable */
  }

  return { get: get, set: set, clear: clear, lookup: lookup };
})();

/* ────────────────────────────────────────────────────────────
   PAGE-WIDE DELIVERY TIME UPDATER
   Updates every element with data-qc-* attributes on ANY page.
   Called on load AND whenever pincode changes.
──────────────────────────────────────────────────────────── */
function QCUpdateDeliveryOnPage(data) {
  var d = data || window.QCPincode.get();
  if (!d) return;

  var ok   = d.serviceable !== false;
  var pin  = d.pincode || '';
  var area = d.area    || pin;
  var time = d.time    || '';

  /* ── Individual attribute targets ─────────────────────── */
  document.querySelectorAll('[data-qc-delivery-time]').forEach(function (el) {
    el.textContent = ok ? time : 'Not serviceable';
  });

  document.querySelectorAll('[data-qc-delivery-area]').forEach(function (el) {
    el.textContent = ok ? area : 'Not serviceable';
  });

  document.querySelectorAll('[data-qc-pincode]').forEach(function (el) {
    el.textContent = pin;
  });

  /* ── Full promise pill — update children, not innerHTML ── */
  document.querySelectorAll('[data-qc-delivery-promise]').forEach(function (el) {
    var tEl = el.querySelector('[data-qc-delivery-time]');
    var aEl = el.querySelector('[data-qc-delivery-area]');
    if (tEl) tEl.textContent = ok ? time : 'Not serviceable';
    if (aEl) aEl.textContent = ok ? area : 'Not serviceable';
    el.style.background = ok ? '#dcfce7' : '#fee2e2';
    el.style.color      = ok ? '#166534' : '#dc2626';
  });

  /* ── Header badge + display ───────────────────────────── */
  var display = document.getElementById('qcPincodeDisplay');
  var badge   = document.getElementById('qcDeliveryBadge');

  if (display) {
    var short = area.indexOf(',') !== -1 ? area.split(',').pop().trim() : area;
    display.textContent = pin + (short ? ', ' + short : '');
  }
  if (badge) {
    if (ok) {
      badge.textContent      = '\u26A1 ' + time;
      badge.style.background = '';
      badge.style.color      = '';
    } else {
      badge.textContent      = '\u2717 Not serviceable';
      badge.style.background = '#fee2e2';
      badge.style.color      = '#dc2626';
    }
  }
}

/* ────────────────────────────────────────────────────────────
   BOOT on DOM ready
──────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {

  /* Auto-set default pincode on first visit (no saved pincode yet) */
  if (!window.QCPincode.get()) {
    var display = document.getElementById('qcPincodeDisplay');
    var badge   = document.getElementById('qcDeliveryBadge');
    var dPin  = display ? (display.dataset.defaultPin  || '151001')    : '151001';
    var dArea = display ? (display.dataset.defaultArea || 'Barnala')   : 'Barnala';
    var dTime = badge   ? (badge.dataset.defaultTime   || '60-90 min') : '60-90 min';
    window.QCPincode.set(dPin, dArea, dTime, true);
  }

  /* Apply saved pincode to every element on this page */
  QCUpdateDeliveryOnPage();

  /* Re-apply when pincode changes in same tab */
  document.addEventListener('qc:pincode:changed', function (e) {
    QCUpdateDeliveryOnPage(e.detail);
  });

  /* Init modules */
  initPincodeModal();
  initCartBadge();

});

/* ────────────────────────────────────────────────────────────
   PINCODE MODAL
──────────────────────────────────────────────────────────── */
function initPincodeModal() {
  var btn       = document.getElementById('qcPincodeBtn');
  var modal     = document.getElementById('qcPincodeModal');
  var closeBtn  = document.getElementById('qcModalClose');
  var input     = document.getElementById('qcPincodeInput');
  var checkBtn  = document.getElementById('qcPincodeCheck');
  var resultBox = document.getElementById('qcDeliveryResult');
  var resultTxt = document.getElementById('qcDeliveryText');
  var errorMsg  = document.getElementById('qcPincodeError');

  if (!btn || !modal) return;

  function open() {
    modal.removeAttribute('hidden');
    btn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    /* Pre-fill with current pincode */
    var saved = window.QCPincode.get();
    if (saved && input) input.value = saved.pincode;
    if (resultBox) resultBox.hidden = true;
    if (errorMsg)  errorMsg.hidden  = true;
    setTimeout(function () { if (input) input.focus(); }, 60);
  }

  function close() {
    modal.setAttribute('hidden', '');
    btn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  btn.addEventListener('click', open);
  btn.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
  });
  if (closeBtn) closeBtn.addEventListener('click', close);
  modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modal.hasAttribute('hidden')) close();
  });

  if (input) {
    input.addEventListener('input', function () {
      this.value = this.value.replace(/\D/g, '');
      if (errorMsg)  errorMsg.hidden  = true;
      if (resultBox) resultBox.hidden = true;
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') check();
    });
  }
  if (checkBtn) checkBtn.addEventListener('click', check);

  function check() {
    if (!input) return;
    var pin = input.value.trim();

    if (pin.length !== 6) {
      if (errorMsg) { errorMsg.textContent = 'Please enter a valid 6-digit pincode.'; errorMsg.hidden = false; }
      return;
    }
    if (errorMsg) errorMsg.hidden = true;

    var info = window.QCPincode.lookup(pin);

    if (info) {
      /* ✅ Serviceable */
      var data = window.QCPincode.set(info.pincode, info.area, info.time, true);
      QCUpdateDeliveryOnPage(data);
      showResult(true,
        '\u26A1 Delivering to <strong>' + esc(info.area) + '</strong> in <strong>' + esc(info.time) + '</strong>'
      );
      setTimeout(close, 1800);

    } else {
      /* ✗ Not serviceable */
      var nsData = window.QCPincode.set(pin, pin, null, false);
      QCUpdateDeliveryOnPage(nsData);
      showResult(false,
        '\u274C <strong>' + esc(pin) + '</strong> is not serviceable yet. ' +
        '<a href="#" id="qcResetPin" style="color:inherit;font-weight:600;">Use default pincode</a>'
      );
      setTimeout(function () {
        var rl = document.getElementById('qcResetPin');
        if (rl) rl.addEventListener('click', function (e) {
          e.preventDefault();
          resetDefault();
          close();
        });
      }, 50);
    }
  }

  function showResult(ok, html) {
    if (!resultBox || !resultTxt) return;
    resultBox.hidden        = false;
    resultBox.style.background = ok ? '#dcfce7' : '#fee2e2';
    resultTxt.innerHTML     = html;
  }

  function resetDefault() {
    var el   = document.getElementById('qcPincodeDisplay');
    var bdg  = document.getElementById('qcDeliveryBadge');
    var dPin  = el  ? (el.dataset.defaultPin  || '151001')   : '151001';
    var dArea = el  ? (el.dataset.defaultArea || 'Your Area') : 'Your Area';
    var dTime = bdg ? (bdg.dataset.defaultTime || '10 min')   : '10 min';
    var data  = window.QCPincode.set(dPin, dArea, dTime, true);
    QCUpdateDeliveryOnPage(data);
  }
}

/* ────────────────────────────────────────────────────────────
   CART BADGE
──────────────────────────────────────────────────────────── */
function initCartBadge() {
  refreshCartBadge();
  document.addEventListener('cart:update', refreshCartBadge);
}

function refreshCartBadge() {
  fetch('/cart.js')
    .then(function (r) { return r.json(); })
    .then(function (cart) {
      var badge   = document.querySelector('.qc-cart-badge');
      var cartBtn = document.querySelector('.qc-cart-btn');
      if (!cartBtn) return;
      if (cart.item_count > 0) {
        if (badge) {
          badge.textContent = cart.item_count;
        } else {
          var b         = document.createElement('span');
          b.className   = 'qc-cart-badge';
          b.setAttribute('aria-hidden', 'true');
          b.textContent = cart.item_count;
          b.style.background = getComputedStyle(document.documentElement)
            .getPropertyValue('--qc-accent').trim() || '#0f6e56';
          cartBtn.appendChild(b);
        }
        cartBtn.setAttribute('aria-label', 'Cart (' + cart.item_count + ' items)');
      } else if (badge) {
        badge.remove();
        cartBtn.setAttribute('aria-label', 'Cart');
      }
    })
    .catch(function () {});
}

/* ── Utility ─────────────────────────────────────────────── */
function esc(s) {
  return String(s || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}