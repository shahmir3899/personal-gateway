/**
 * Captain's Trophy Room — DOM rendering.
 * Phase 0: empty cabin background + 3-case skeleton shell.
 * Phase 1: render the current marathon's trophies into each case — layered
 * shadow/art/lighting/glass/lock, plus a real-HTML nameplate — driven
 * entirely by the CtrModel view-model.
 * Phase 2: click-to-zoom presentation overlay (wired from ctr-zoom.js,
 * which reuses buildTrophyMarkup below at a larger size).
 * Phase 3 (current): marathon switching — a nav bar above the cases lets a
 * member revisit completed marathons or peek at the next (locked) one,
 * which renders a teaser instead of real trophies (wired from
 * ctr-marathon-nav.js).
 */
(function (global) {
  'use strict';

  function renderShell(rootEl, options) {
    rootEl.classList.add('ctr-widget');
    rootEl.innerHTML =
      '<div class="ctr-marathon-nav">' +
        '<button type="button" class="ctr-marathon-btn ctr-marathon-prev" aria-label="Previous marathon">&#8249;</button>' +
        '<div class="ctr-marathon-label">' +
          '<span class="ctr-marathon-name"></span>' +
          '<span class="ctr-marathon-badge"></span>' +
        '</div>' +
        '<button type="button" class="ctr-marathon-btn ctr-marathon-next" aria-label="Next marathon">&#8250;</button>' +
      '</div>' +
      '<div class="ctr-room" style="background-image:url(\'' + escapeUrl(options.assetsBase + 'backgrounds/cabin.jpg') + '\')">' +
        '<div class="ctr-viewport">' +
          '<div class="ctr-track">' +
            renderCasePlaceholder(1) +
            renderCasePlaceholder(2) +
            renderCasePlaceholder(3) +
          '</div>' +
        '</div>' +
        '<div class="ctr-status"></div>' +
        '<div class="ctr-zoom-overlay" tabindex="-1" hidden>' +
          '<button type="button" class="ctr-zoom-close" aria-label="Close">&times;</button>' +
          '<div class="ctr-zoom-body"></div>' +
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
        '<span class="ctr-case-count">Case 1 of 3</span>' +
      '</div>';
  }

  function renderCasePlaceholder(caseNumber) {
    return (
      '<div class="ctr-case" data-case="' + caseNumber + '">' +
        '<div class="ctr-case-trophies" data-case-trophies="' + caseNumber + '"></div>' +
      '</div>'
    );
  }

  /**
   * Renders one marathon's trophies into the 3 case slots already present
   * in the shell, and updates the marathon nav label/buttons. Only the
   * marathon named by marathonId is drawn — the shell/carousel is shared
   * across marathons and reused as-is when switching between them.
   *
   * A marathon that isn't accessible yet (isAccessible: false) renders a
   * locked "teaser" in place of real trophies, since its art may not even
   * exist yet for an unannounced marathon.
   */
  function renderMarathon(rootEl, viewModel, marathonId, config) {
    var marathon = findMarathon(viewModel, marathonId);
    if (!marathon) return;

    updateMarathonNav(rootEl, viewModel, marathon);

    if (!marathon.isAccessible) {
      var teaserHtml = renderLockedMarathonTeaser(marathon, viewModel);
      [1, 2, 3].forEach(function (caseNumber) {
        var container = rootEl.querySelector('[data-case-trophies="' + caseNumber + '"]');
        if (container) container.innerHTML = caseNumber === 1 ? teaserHtml : '';
      });
      return;
    }

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
        return buildTrophyMarkup(t, viewModel, config, marathon.id);
      }).join('');
      positionTrophyElements(rootEl, container.querySelectorAll('.ctr-trophy'));
    });

    wireArtworkFallback(rootEl);
  }

  /**
   * Pins each in-case trophy to its photo-calibrated bay (see
   * ctr-layout.js) by setting left/bottom/width inline, computed against
   * the room's current rendered size. Call again on resize — the CSS
   * itself has no way to track a specific photo's geometry.
   */
  function positionTrophyElements(rootEl, trophyEls) {
    var roomEl = rootEl.querySelector('.ctr-room');
    if (!roomEl || !trophyEls.length) return;

    // Below 560px the CSS falls back to a generic centered flex row (see
    // ctr.css) instead of photo-calibrated positions — the cabin photo's
    // rightmost bay is cropped out of frame entirely at that aspect
    // ratio. Clear any inline positioning left over from a wider
    // viewport (e.g. after a resize) so that fallback CSS can apply —
    // an inline style would otherwise keep overriding it.
    if (window.matchMedia && window.matchMedia('(max-width: 560px)').matches) {
      trophyEls.forEach(function (el) {
        el.style.left = '';
        el.style.bottom = '';
        el.style.width = '';
      });
      return;
    }

    var count = trophyEls.length;
    trophyEls.forEach(function (el, i) {
      var slot = CtrLayout.getSlotStyle(roomEl, i, count);
      if (!slot) return;
      el.style.left = slot.leftPercent + '%';
      el.style.bottom = slot.bottomPercent + '%';
      el.style.width = slot.widthPercent + '%';
    });
  }

  /**
   * Re-runs positioning for whichever trophies are currently rendered in
   * all 3 cases — call on window resize (debounced) so the shelf-lock
   * survives a viewport change or the mobile aspect-ratio breakpoint.
   */
  function repositionTrophies(rootEl) {
    [1, 2, 3].forEach(function (caseNumber) {
      var container = rootEl.querySelector('[data-case-trophies="' + caseNumber + '"]');
      if (container) positionTrophyElements(rootEl, container.querySelectorAll('.ctr-trophy'));
    });
  }

  function renderLockedMarathonTeaser(marathon, viewModel) {
    var have = viewModel.totalVerifiedReferrals;
    var need = marathon.unlockRequiredReferrals || 0;
    var remaining = Math.max(0, need - have);
    return (
      '<div class="ctr-teaser">' +
        '<div class="ctr-teaser-lock" aria-hidden="true">&#128274;</div>' +
        '<div class="ctr-teaser-title">' + escapeHtml(marathon.name) + '</div>' +
        '<div class="ctr-teaser-sub">Complete the current marathon to set sail on this one.</div>' +
        '<div class="ctr-teaser-progress">' + have + ' / ' + need + ' referrals' +
          (remaining > 0 ? ' &middot; ' + remaining + ' to go' : '') +
        '</div>' +
      '</div>'
    );
  }

  function updateMarathonNav(rootEl, viewModel, marathon) {
    var nameEl = rootEl.querySelector('.ctr-marathon-name');
    var badgeEl = rootEl.querySelector('.ctr-marathon-badge');
    var prevBtn = rootEl.querySelector('.ctr-marathon-prev');
    var nextBtn = rootEl.querySelector('.ctr-marathon-next');
    if (!nameEl) return;

    nameEl.textContent = marathon.name;
    badgeEl.textContent = !marathon.isAccessible ? 'Locked' : marathon.isComplete ? 'Completed' : 'In progress';
    badgeEl.className = 'ctr-marathon-badge ' +
      (!marathon.isAccessible ? 'ctr-marathon-badge--locked' : marathon.isComplete ? 'ctr-marathon-badge--complete' : 'ctr-marathon-badge--active');

    var sorted = viewModel.marathons.slice().sort(function (a, b) { return a.sequenceOrder - b.sequenceOrder; });
    var index = -1;
    for (var i = 0; i < sorted.length; i++) {
      if (sorted[i].id === marathon.id) { index = i; break; }
    }
    if (prevBtn) prevBtn.disabled = index <= 0;
    if (nextBtn) nextBtn.disabled = index >= sorted.length - 1;
  }

  /**
   * Builds one trophy's full markup (layered visual + nameplate). Used both
   * for the in-case trophies and — at a larger size via sizeClass — for the
   * zoom presentation view, so the two never drift out of sync.
   */
  function buildTrophyMarkup(trophy, viewModel, config, marathonId, sizeClass) {
    var lockedClass = trophy.isUnlocked ? 'ctr-trophy--unlocked' : 'ctr-trophy--locked';
    var artFolder = 'marathon-' + String(marathonId || '').replace(/^m/, '');
    var artSrc = config.assetsBase + 'trophies/' + artFolder + '/' + trophy.imageKey + '.png';

    return (
      '<div class="ctr-trophy ' + lockedClass + (sizeClass ? ' ' + sizeClass : '') + '" data-trophy-id="' + trophy.id + '">' +
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
  // the text fallback instead of showing a broken-image icon. Scoped to a
  // container so it can be reapplied to freshly-inserted zoom markup too.
  function wireArtworkFallback(container) {
    container.querySelectorAll('.ctr-trophy-art').forEach(function (img) {
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

  function sortedMarathons(viewModel) {
    return viewModel.marathons.slice().sort(function (a, b) { return a.sequenceOrder - b.sequenceOrder; });
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
    renderStatus: renderStatus,
    buildTrophyMarkup: buildTrophyMarkup,
    wireArtworkFallback: wireArtworkFallback,
    findMarathon: findMarathon,
    sortedMarathons: sortedMarathons,
    repositionTrophies: repositionTrophies
  };
})(window);
