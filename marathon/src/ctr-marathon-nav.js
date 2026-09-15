/**
 * Captain's Trophy Room — marathon switcher.
 * Lets a member step between marathons: revisit a completed one, or peek
 * at the next one (which renders as a locked teaser via
 * CtrView.renderMarathon until it's actually accessible). This is the
 * only navigation the widget has — there is no case carousel.
 */
(function (global) {
  'use strict';

  /**
   * @param {Element} rootEl
   * @param {Object} viewModel - from CtrModel.computeProgress
   * @param {Object} config
   * @param {Object} deps - { zoom } controller to re-sync on switch
   */
  function attach(rootEl, viewModel, config, deps) {
    var sorted = CtrView.sortedMarathons(viewModel);
    var currentIndex = 0;
    for (var i = 0; i < sorted.length; i++) {
      if (sorted[i].id === viewModel.currentMarathonId) { currentIndex = i; break; }
    }

    var prevBtn = rootEl.querySelector('.ctr-marathon-prev');
    var nextBtn = rootEl.querySelector('.ctr-marathon-next');

    function show(index) {
      index = Math.max(0, Math.min(sorted.length - 1, index));
      currentIndex = index;
      var marathon = sorted[index];

      CtrView.renderMarathon(rootEl, viewModel, marathon.id, config);
      CtrZoom.wireTrophyClicks(rootEl, viewModel, marathon.id, config, deps.zoom);
    }

    if (prevBtn) prevBtn.addEventListener('click', function () { show(currentIndex - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { show(currentIndex + 1); });

    // Trophies/bay-lights are pinned to the photo's bay coordinates as a
    // percentage of the room's rendered size — recompute on resize,
    // since that mapping depends on the room's current aspect ratio.
    var resizeTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        CtrView.repositionTrophies(rootEl, viewModel, sorted[currentIndex].id);
      }, 100);
    });

    show(currentIndex);

    return { show: show };
  }

  global.CtrMarathonNav = { attach: attach };
})(window);
