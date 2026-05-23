/**
 * pincode-context.js
 * Thin wrapper — delivery updates are now handled by header.js
 * via QCUpdateDeliveryOnPage(). This file exists for compatibility.
 *
 * If header.js is loaded, this does nothing extra.
 * If for any reason header.js didn't run, this provides a fallback.
 */
document.addEventListener('DOMContentLoaded', function () {
  if (typeof QCUpdateDeliveryOnPage === 'function') {
    /* header.js already handled this — do nothing */
    return;
  }
  /* Fallback: read localStorage and update elements directly */
  try {
    var raw = localStorage.getItem('qc_pincode');
    if (!raw) return;
    var d = JSON.parse(raw);
    if (!d || !d.pincode) return;
    var ok   = d.serviceable !== false;
    var time = d.time || '';
    var area = d.area || d.pincode;
    document.querySelectorAll('[data-qc-delivery-time]').forEach(function (el) {
      el.textContent = ok ? time : 'Not serviceable';
    });
    document.querySelectorAll('[data-qc-delivery-area]').forEach(function (el) {
      el.textContent = ok ? area : 'Not serviceable';
    });
    document.querySelectorAll('[data-qc-pincode]').forEach(function (el) {
      el.textContent = d.pincode;
    });
  } catch (e) {}
});