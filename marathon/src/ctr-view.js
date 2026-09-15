/**
 * Captain's Trophy Room — DOM rendering.
 * A marathon always shows exactly 5 trophies, one per real display bay
 * in the cabin photo (see ctr-layout.js) — no case carousel. Marathon
 * switching (prev/next between marathons) is the only navigation.
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
        '<div class="ctr-trophies" data-trophies></div>' +
        '<div class="ctr-status"></div>' +
        '<div class="ctr-zoom-overlay" tabindex="-1" hidden>' +
          '<button type="button" class="ctr-zoom-close" aria-label="Close">&times;</button>' +
          '<div class="ctr-zoom-body"></div>' +
        '</div>' +
      '</div>';
  }

  /**
   * Renders the current marathon's 5 trophies (or a locked teaser) and
   * updates the marathon nav label/buttons.
   */
  function renderMarathon(rootEl, viewModel, marathonId, config) {
    var marathon = findMarathon(viewModel, marathonId);
    if (!marathon) return;

    updateMarathonNav(rootEl, viewModel, marathon);

    var container = rootEl.querySelector('[data-trophies]');
    if (!container) return;

    if (!marathon.isAccessible) {
      container.innerHTML = renderLockedMarathonTeaser(marathon, viewModel);
      return;
    }

    var trophies = marathon.trophies.slice().sort(function (a, b) { return a.tierOrder - b.tierOrder; });
    container.innerHTML = trophies.map(function (t) {
      return buildTrophyMarkup(t, viewModel, config, marathon.id);
    }).join('');

    positionTrophyElements(rootEl, container.querySelectorAll('.ctr-trophy'));
    wireArtworkFallback(rootEl);
  }

  /**
   * Pins each trophy to its bay (see ctr-layout.js) as a percentage of
   * the room's current rendered size. Call again on resize.
   */
  function positionTrophyElements(rootEl, trophyEls) {
    var roomEl = rootEl.querySelector('.ctr-room');
    if (!roomEl || !trophyEls.length) return;

    // Below 560px the CSS falls back to a generic centered flex row (see
    // ctr.css) instead of photo-calibrated positions — the cabin photo's
    // rightmost bay is cropped out of frame entirely at that aspect
    // ratio. Clear any inline positioning left over from a wider
    // viewport so that fallback CSS can apply.
    if (window.matchMedia && window.matchMedia('(max-width: 560px)').matches) {
      trophyEls.forEach(function (el) {
        el.style.left = '';
        el.style.bottom = '';
        el.style.width = '';
      });
      return;
    }

    trophyEls.forEach(function (el, i) {
      var slot = CtrLayout.getSlotStyle(roomEl, i);
      if (!slot) return;
      el.style.left = slot.leftPercent + '%';
      el.style.bottom = slot.bottomPercent + '%';
      el.style.width = slot.widthPercent + '%';
    });
  }

  /**
   * Re-runs trophy positioning for whichever marathon is currently
   * rendered — call on window resize (debounced).
   */
  function repositionTrophies(rootEl) {
    var container = rootEl.querySelector('[data-trophies]');
    if (container) positionTrophyElements(rootEl, container.querySelectorAll('.ctr-trophy'));
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

    var sorted = sortedMarathons(viewModel);
    var index = -1;
    for (var i = 0; i < sorted.length; i++) {
      if (sorted[i].id === marathon.id) { index = i; break; }
    }
    if (prevBtn) prevBtn.disabled = index <= 0;
    if (nextBtn) nextBtn.disabled = index >= sorted.length - 1;
  }

  /**
   * Builds one trophy's full markup (layered visual + nameplate). Used
   * both for the in-room trophies and — at a larger size via sizeClass —
   * for the zoom presentation view, so the two never drift out of sync.
   */
  function buildTrophyMarkup(trophy, viewModel, config, marathonId, sizeClass) {
    var lockedClass = trophy.isUnlocked ? 'ctr-trophy--unlocked' : 'ctr-trophy--locked';
    // All marathons currently share the one supplied art set — there's
    // only assets/trophies/marathon-2/ on disk. When a marathon gets its
    // own distinct art later, key this off marathonId again instead.
    var artSrc = config.assetsBase + 'trophies/marathon-2/' + trophy.imageKey + '.png';

    return (
      '<div class="ctr-trophy ' + lockedClass + (sizeClass ? ' ' + sizeClass : '') + '" data-trophy-id="' + trophy.id + '">' +
        '<div class="ctr-trophy-case-visual">' +
          // Approximates the bay's own lit panel behind the trophy —
          // sized relative to the trophy's own box (bigger than it, not
          // a separate photo-coordinate rectangle), so it automatically
          // follows the trophy whether it's shelf-locked (desktop) or in
          // the generic flex fallback (mobile). Dark by default; faded
          // to invisible when unlocked via the outer --unlocked class.
          '<div class="ctr-trophy-backdrop"></div>' +
          '<div class="ctr-trophy-shadow"></div>' +
          '<img class="ctr-trophy-art" src="' + escapeUrl(artSrc) + '" alt="' + escapeHtml(trophy.name) + '" data-fallback-name="' + escapeHtml(trophy.name) + '" />' +
          '<div class="ctr-trophy-art-fallback" hidden>' + escapeHtml(trophy.name) + '</div>' +
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
