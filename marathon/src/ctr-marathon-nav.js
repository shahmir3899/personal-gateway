/**
 * Captain's Trophy Room — marathon switcher.
 * Lets a member step between marathons: revisit a completed one, or peek at
 * the next one (which renders as a locked teaser via CtrView.renderMarathon
 * until it's actually accessible). Independent of the case carousel — each
 * marathon switch resets the case carousel back to Case 1.
 */
(function (global) {
  'use strict';

  /**
   * @param {Element} rootEl
   * @param {Object} viewModel - from CtrModel.computeProgress
   * @param {Object} config
   * @param {Object} deps - { carousel, zoom } controllers to re-sync on switch
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
      if (deps.carousel) deps.carousel.goTo(0);
    }

    if (prevBtn) prevBtn.addEventListener('click', function () { show(currentIndex - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { show(currentIndex + 1); });

    show(currentIndex);

    return { show: show };
  }

  global.CtrMarathonNav = { attach: attach };
})(window);
