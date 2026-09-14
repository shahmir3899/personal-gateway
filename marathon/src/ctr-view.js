/**
 * Captain's Trophy Room — DOM rendering.
 * Phase 0: empty cabin background + 3-case skeleton shell.
 * Phase 1 (current): render the current marathon's trophies into each case —
 * layered shadow/art/lighting/glass/lock, plus a real-HTML nameplate — driven
 * entirely by the CtrModel view-model. Zoom/presentation view and marathon
 * switching (revisiting past marathons) land in later phases.
 */
(function (global) {
  'use strict';

  function renderShell(rootEl, options) {
    rootEl.classList.add('ctr-widget');
    rootEl.innerHTML =
      '<div class="ctr-room" style="background-image:url(\'' + escapeUrl(options.assetsBase + 'backgrounds/cabin.jpg') + '\')">' +
        '<div class="ctr-viewport">' +
          '<div class="ctr-track">' +
            renderCasePlaceholder(1) +
            renderCasePlaceholder(2) +
            renderCasePlaceholder(3) +
          '</div>' +
        '</div>' +
        '<div class="ctr-nav">' +
          '<button type="button" class="ctr-nav-btn ctr-nav-prev" aria-label="Previous case">&#8249;</button>' +
          '<div class="ctr-nav-dots">' +
            '<span class="ctr-dot ctr-dot--active" data-case="1"></span>' +
            '<span class="ctr-dot" data-case="2"></span>' +
            '<span class="ctr-dot" data-case="3"></span>' +
          '</div>' +
          '<button type="button" class="ctr-nav-btn ctr-nav-next" aria-label="Next case">&#8250;</button>' +
        '</div>' +
        '<div class="ctr-status"></div>' +
      '</div>';
  }

  function renderCasePlaceholder(caseNumber) {
    return (
      '<div class="ctr-case" data-case="' + caseNumber + '">' +
        '<div class="ctr-case-label">Case ' + caseNumber + '</div>' +
        '<div class="ctr-case-trophies" data-case-trophies="' + caseNumber + '"></div>' +
      '</div>'
    );
  }

  /**
   * Renders one marathon's trophies into the 3 case slots already present
   * in the shell. Only the marathon named by marathonId is drawn — the
   * shell/carousel is reused as-is for marathon-switching in a later phase.
   */
  function renderMarathon(rootEl, viewModel, marathonId, config) {
    var marathon = findMarathon(viewModel, marathonId);
    if (!marathon) return;

    var trophiesByCase = { 1: [], 2: [], 3: [] };
    marathon.trophies.forEach(function (t) {
      (trophiesByCase[t.caseNumber] || (trophiesByCase[t.caseNumber] = [])).push(t);
    });

    [1, 2, 3].forEach(function (caseNumber) {
      var container = rootEl.querySelector('[data-case-trophies="' + caseNumber + '"]');
      if (!container) return;
      var trophies = (trophiesByCase[caseNumber] || []).slice().sort(function (a, b) {
        return a.tierOrder - b.tierOrder;
      });
      container.innerHTML = trophies.map(function (t) {
        return renderTrophy(t, viewModel, config, marathon.id);
      }).join('');
    });

    wireArtworkFallback(rootEl);
  }

  function renderTrophy(trophy, viewModel, config, marathonId) {
    var lockedClass = trophy.isUnlocked ? 'ctr-trophy--unlocked' : 'ctr-trophy--locked';
    var artFolder = 'marathon-' + String(marathonId || '').replace(/^m/, '');
    var artSrc = config.assetsBase + 'trophies/' + artFolder + '/' + trophy.imageKey + '.png';

    return (
      '<div class="ctr-trophy ' + lockedClass + '" data-trophy-id="' + trophy.id + '">' +
        '<div class="ctr-trophy-case-visual">' +
          '<div class="ctr-trophy-shadow"></div>' +
          '<img class="ctr-trophy-art" src="' + escapeUrl(artSrc) + '" alt="' + escapeHtml(trophy.name) + '" data-fallback-name="' + escapeHtml(trophy.name) + '" />' +
          '<div class="ctr-trophy-art-fallback" hidden>' + escapeHtml(trophy.name) + '</div>' +
          '<div class="ctr-trophy-light"></div>' +
          (trophy.isUnlocked ? '' : '<div class="ctr-trophy-glass"></div><div class="ctr-trophy-lock" aria-hidden="true">&#128274;</div>') +
        '</div>' +
        renderNameplate(trophy, viewModel) +
      '</div>'
    );
  }

  function renderNameplate(trophy, viewModel) {
    if (!trophy.isUnlocked) {
      return (
        '<div class="ctr-nameplate ctr-nameplate--locked">' +
          '<div class="ctr-nameplate-title">' + escapeHtml(trophy.name) + '</div>' +
          '<div class="ctr-nameplate-sub">' + trophy.requiredReferrals + ' referrals</div>' +
        '</div>'
      );
    }
    return (
      '<div class="ctr-nameplate">' +
        '<div class="ctr-nameplate-title">' + escapeHtml(trophy.name) + '</div>' +
        '<div class="ctr-nameplate-name">' + escapeHtml(viewModel.displayName || '') + '</div>' +
        '<div class="ctr-nameplate-sub">' + formatDate(trophy.unlockedAt) + '</div>' +
        '<div class="ctr-nameplate-sub">Day ' + trophy.daysSinceFirstTrophy + ' &middot; Split ' + trophy.splitDaysSincePrevious + '</div>' +
      '</div>'
    );
  }

  // Real trophy art may 404 (not supplied yet, or wrong imageKey) — swap to
  // the text fallback instead of showing a broken-image icon.
  function wireArtworkFallback(rootEl) {
    rootEl.querySelectorAll('.ctr-trophy-art').forEach(function (img) {
      img.addEventListener('error', function () {
        img.hidden = true;
        var fallback = img.nextElementSibling;
        if (fallback && fallback.classList.contains('ctr-trophy-art-fallback')) fallback.hidden = false;
      });
    });
  }

  function findMarathon(viewModel, marathonId) {
    return viewModel.marathons.filter(function (m) { return m.id === marathonId; })[0] || null;
  }

  function renderStatus(rootEl, message) {
    var el = rootEl.querySelector('.ctr-status');
    if (el) el.textContent = message || '';
  }

  function formatDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function escapeUrl(str) {
    return String(str).replace(/['"\\]/g, '');
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  global.CtrView = {
    renderShell: renderShell,
    renderMarathon: renderMarathon,
    renderStatus: renderStatus
  };
})(window);
