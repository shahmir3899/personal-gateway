/**
 * Captain's Trophy Room — case-to-case carousel controller.
 * Phase 0: wires nav buttons/dots to slide the track; no swipe/keyboard yet
 * (added in Phase 4 along with real trophy content to test against).
 */
(function (global) {
  'use strict';

  function attach(rootEl) {
    var track = rootEl.querySelector('.ctr-track');
    var dots = rootEl.querySelectorAll('.ctr-dot');
    var prevBtn = rootEl.querySelector('.ctr-nav-prev');
    var nextBtn = rootEl.querySelector('.ctr-nav-next');
    var caseCount = rootEl.querySelectorAll('.ctr-case').length;
    var activeIndex = 0;

    function goTo(index) {
      activeIndex = Math.max(0, Math.min(caseCount - 1, index));
      track.style.transform = 'translateX(-' + (activeIndex * 100) + '%)';
      dots.forEach(function (dot, i) {
        dot.classList.toggle('ctr-dot--active', i === activeIndex);
      });
    }

    if (prevBtn) prevBtn.addEventListener('click', function () { goTo(activeIndex - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { goTo(activeIndex + 1); });
    dots.forEach(function (dot, i) {
      dot.addEventListener('click', function () { goTo(i); });
    });

    goTo(0);

    return { goTo: goTo };
  }

  global.CtrCarousel = { attach: attach };
})(window);
