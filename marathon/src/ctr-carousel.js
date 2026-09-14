/**
 * Captain's Trophy Room — case-to-case carousel controller.
 * Wires nav buttons/dots/case-count text, keyboard arrows on the viewport,
 * and touch swipe (for mobile/tablet) to slide the track between cases.
 */
(function (global) {
  'use strict';

  var SWIPE_THRESHOLD_PX = 40;

  function attach(rootEl) {
    var viewport = rootEl.querySelector('.ctr-viewport');
    var track = rootEl.querySelector('.ctr-track');
    var dots = rootEl.querySelectorAll('.ctr-dot');
    var prevBtn = rootEl.querySelector('.ctr-nav-prev');
    var nextBtn = rootEl.querySelector('.ctr-nav-next');
    var countEl = rootEl.querySelector('.ctr-case-count');
    var caseCount = rootEl.querySelectorAll('.ctr-case').length;
    var activeIndex = 0;

    function goTo(index) {
      activeIndex = Math.max(0, Math.min(caseCount - 1, index));
      // translateX(%) is relative to the TRACK's own width (caseCount * 100%),
      // not one case's width — so the shift per step is 100/caseCount percent,
      // not 100 percent.
      track.style.transform = 'translateX(-' + (activeIndex * (100 / caseCount)) + '%)';
      dots.forEach(function (dot, i) {
        dot.classList.toggle('ctr-dot--active', i === activeIndex);
      });
      if (countEl) countEl.textContent = 'Case ' + (activeIndex + 1) + ' of ' + caseCount;
      if (prevBtn) prevBtn.disabled = activeIndex === 0;
      if (nextBtn) nextBtn.disabled = activeIndex === caseCount - 1;
    }

    if (prevBtn) prevBtn.addEventListener('click', function () { goTo(activeIndex - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { goTo(activeIndex + 1); });
    dots.forEach(function (dot, i) {
      dot.addEventListener('click', function () { goTo(i); });
    });

    // Touch swipe on the viewport (mobile/tablet). Vertical scrolling still
    // works normally — only a clearly horizontal drag past the threshold
    // triggers a case change.
    if (viewport) {
      var touchStartX = null;
      var touchStartY = null;

      viewport.addEventListener('touchstart', function (e) {
        var t = e.changedTouches[0];
        touchStartX = t.clientX;
        touchStartY = t.clientY;
      }, { passive: true });

      viewport.addEventListener('touchend', function (e) {
        if (touchStartX === null) return;
        var t = e.changedTouches[0];
        var dx = t.clientX - touchStartX;
        var dy = t.clientY - touchStartY;
        touchStartX = null;
        touchStartY = null;
        if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) < Math.abs(dy)) return;
        goTo(activeIndex + (dx < 0 ? 1 : -1));
      }, { passive: true });
    }

    goTo(0);

    return { goTo: goTo };
  }

  global.CtrCarousel = { attach: attach };
})(window);
