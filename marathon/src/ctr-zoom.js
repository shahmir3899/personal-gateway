/**
 * Captain's Trophy Room — click-to-zoom presentation view.
 * Clicking any trophy (locked or unlocked) opens a larger overlay rendering
 * the same layered visual + nameplate at presentation size, reusing
 * CtrView.buildTrophyMarkup so the zoomed view can never drift out of sync
 * with the in-case trophy.
 */
(function (global) {
  'use strict';

  /**
   * Sets up the overlay's own controls (close button, backdrop click,
   * Escape key). Call this ONCE per widget instance — the overlay element
   * itself is part of the static shell and is never recreated.
   */
  function attachOverlay(rootEl) {
    var overlay = rootEl.querySelector('.ctr-zoom-overlay');
    var body = overlay.querySelector('.ctr-zoom-body');
    var closeBtn = overlay.querySelector('.ctr-zoom-close');

    function open(trophy, viewModel, config, marathonId) {
      body.innerHTML = CtrView.buildTrophyMarkup(trophy, viewModel, config, marathonId, 'ctr-trophy--zoomed');
      CtrView.wireArtworkFallback(body);
      overlay.hidden = false;
      overlay.focus();
    }

    function close() {
      overlay.hidden = true;
      body.innerHTML = '';
    }

    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });
    overlay.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });

    return { open: open, close: close };
  }

  /**
   * (Re-)wires click/keyboard activation on the currently-rendered trophy
   * elements for one marathon. Call this after every CtrView.renderMarathon,
   * since that replaces the trophy DOM nodes each time.
   */
  function wireTrophyClicks(rootEl, viewModel, marathonId, config, zoomController) {
    var marathon = viewModel.marathons.filter(function (m) { return m.id === marathonId; })[0];
    if (!marathon) return;

    var trophyMap = {};
    marathon.trophies.forEach(function (t) { trophyMap[t.id] = t; });

    rootEl.querySelectorAll('.ctr-trophy').forEach(function (el) {
      var trophy = trophyMap[el.getAttribute('data-trophy-id')];
      if (!trophy) return;

      el.setAttribute('tabindex', '0');
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', 'View ' + trophy.name + ' trophy');

      el.addEventListener('click', function () {
        zoomController.open(trophy, viewModel, config, marathonId);
      });
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          zoomController.open(trophy, viewModel, config, marathonId);
        }
      });
    });
  }

  global.CtrZoom = {
    attachOverlay: attachOverlay,
    wireTrophyClicks: wireTrophyClicks
  };
})(window);
