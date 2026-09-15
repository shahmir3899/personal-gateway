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
        ['.ctr-nameplate', '.ctr-status-plate'].forEach(function (sel) {
          var panel = el.querySelector(sel);
          if (panel) {
            panel.style.left = '';
            panel.style.top = '';
            panel.style.width = '';
            panel.style.height = '';
            panel.style.transform = '';
          }
        });
      });
      return;
    }

    var roomRect = roomEl.getBoundingClientRect();

    trophyEls.forEach(function (el, i) {
      var slot = CtrLayout.getSlotStyle(roomEl, i);
      if (!slot) return;
      el.style.left = slot.leftPercent + '%';
      el.style.bottom = slot.bottomPercent + '%';
      el.style.width = slot.widthPercent + '%';

      // Both plaques' rectangles were hand-measured against the actual
      // photo (see ctr-layout.js NAMEPLATE_RECTS/STATUS_RECTS / the
      // Nameplate Tuner artifact) rather than derived from the trophy's
      // own size. Each is positioned in PIXELS relative to the trophy
      // element's own top-left corner (measured fresh, after the
      // trophy's own position above takes effect) rather than as a CSS
      // percentage, because .ctr-trophy has no real height (0 — both its
      // children are position:absolute) and percentage sizing against a
      // zero-height ancestor doesn't resolve the way you'd expect.
      var trophyRect = el.getBoundingClientRect();
      positionPanel(el, '.ctr-nameplate', CtrLayout.getNameplateRect(roomEl, i), trophyRect, roomRect);
      positionPanel(el, '.ctr-status-plate', CtrLayout.getStatusRect(roomEl, i), trophyRect, roomRect);
    });
  }

  function positionPanel(trophyEl, selector, panelRect, trophyRect, roomRect) {
    var panelEl = trophyEl.querySelector(selector);
    if (!panelEl || !panelRect) return;
    var targetLeftPx = (panelRect.leftPercent / 100) * roomRect.width;
    var targetTopPx = (panelRect.topPercent / 100) * roomRect.height;
    panelEl.style.transform = 'none';
    panelEl.style.left = (targetLeftPx - (trophyRect.left - roomRect.left)) + 'px';
    panelEl.style.top = (targetTopPx - (trophyRect.top - roomRect.top)) + 'px';
    panelEl.style.width = (panelRect.widthPercent / 100 * roomRect.width) + 'px';
    panelEl.style.height = (panelRect.heightPercent / 100 * roomRect.height) + 'px';
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
          '<div class="ctr-trophy-glow" aria-hidden="true"></div>' +
          '<div class="ctr-trophy-shadow"></div>' +
          '<img class="ctr-trophy-art" src="' + escapeUrl(artSrc) + '" alt="' + escapeHtml(trophy.name) + '" data-fallback-name="' + escapeHtml(trophy.name) + '" />' +
          '<div class="ctr-trophy-art-fallback" hidden>' + escapeHtml(trophy.name) + '</div>' +
          (trophy.isUnlocked ? '' : '<div class="ctr-trophy-glass"></div><div class="ctr-trophy-lock" aria-hidden="true">&#128274;</div>') +
        '</div>' +
        renderNameplate(trophy, viewModel) +
        renderStatusPlate(trophy, viewModel) +
      '</div>'
    );
  }

  // The current background photo renders two SEPARATE physical brass
  // plaques per bay (a larger one, and a smaller one directly below it —
  // see ctr-layout.js NAMEPLATE_RECTS/STATUS_RECTS), so the trophy's name
  // and its unlock status each get their own panel now instead of being
  // crammed into one footer line. Both panels are still small in real
  // pixels — keep content to one short line per panel.
  function renderNameplate(trophy, viewModel) {
    if (!trophy.isUnlocked) {
      return (
        '<div class="ctr-nameplate ctr-nameplate--locked">' +
          '<div class="ctr-nameplate-title">' + escapeHtml(trophy.name) + '</div>' +
        '</div>'
      );
    }
    return (
      '<div class="ctr-nameplate">' +
        '<div class="ctr-nameplate-title">' + escapeHtml(trophy.name) + '</div>' +
        '<div class="ctr-nameplate-name">' + escapeHtml(viewModel.displayName || '') + '</div>' +
      '</div>'
    );
  }

  function renderStatusPlate(trophy, viewModel) {
    if (!trophy.isUnlocked) {
      return (
        '<div class="ctr-status-plate ctr-status-plate--locked">' +
          '<span aria-hidden="true">&#128274;</span> ' + trophy.requiredReferrals + ' referrals' +
        '</div>'
      );
    }
    return (
      '<div class="ctr-status-plate">' +
        formatDate(trophy.unlockedAt) +
        ' <span class="ctr-nameplate-check" aria-hidden="true">&#10003;</span>' +
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
