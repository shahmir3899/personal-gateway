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
    // "Total days" on the main plaque (see renderNameplate) is this
    // marathon's own span, not a running lifetime total — the furthest
    // any of its trophies got from the member's very first trophy ever.
    // Same number on every plaque within one marathon; changes marathon
    // to marathon.
    var marathonTotalDays = trophies.reduce(function (max, t) {
      return t.isUnlocked ? Math.max(max, t.daysSinceFirstTrophy) : max;
    }, 0);
    container.innerHTML = trophies.map(function (t) {
      return buildTrophyMarkup(t, viewModel, config, marathon.id, null, marathonTotalDays);
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
        el.style.top = '';
        el.style.bottom = '';
        el.style.width = '';
        el.style.height = '';
        el.style.transform = '';
        ['.ctr-nameplate', '.ctr-status-plate', '.ctr-trophy-glow', '.ctr-top-plate'].forEach(function (sel) {
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
      // The trophy's own box is now a hand-tuned rect exactly like the
      // plates (see ctr-layout.js TROPHY_RECTS / the Trophy Slot Tuner
      // artifact) — left/top/width/height in pixels relative to the
      // room, not the old left/bottom/width-as-percent-of-room +
      // aspect-ratio-derived-height approach. That's what makes
      // independent per-trophy resizing possible.
      var slot = CtrLayout.getSlotStyle(roomEl, i);
      if (!slot) return;
      el.style.transform = 'none';
      el.style.left = (slot.leftPercent / 100 * roomRect.width) + 'px';
      el.style.top = (slot.topPercent / 100 * roomRect.height) + 'px';
      el.style.width = (slot.widthPercent / 100 * roomRect.width) + 'px';
      el.style.height = (slot.heightPercent / 100 * roomRect.height) + 'px';
      el.style.bottom = '';

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
      // The glow spans the bay's own FULL recess (fixture to shelf), not
      // just the trophy's own box, so it lines up with the real downlight
      // position above it — see ctr-layout.js getGlowRect.
      positionPanel(el, '.ctr-trophy-glow', CtrLayout.getGlowRect(roomEl, i), trophyRect, roomRect);
      // The title plate sits ABOVE the arch, well above the trophy's own
      // box — positionPanel doesn't care, it's just an absolute offset
      // from the trophy's own (unrelated) position.
      positionPanel(el, '.ctr-top-plate', CtrLayout.getTopRect(roomEl, i), trophyRect, roomRect);
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
  function buildTrophyMarkup(trophy, viewModel, config, marathonId, sizeClass, marathonTotalDays) {
    var lockedClass = trophy.isUnlocked ? 'ctr-trophy--unlocked' : 'ctr-trophy--locked';
    // All marathons currently share the one supplied art set — there's
    // only assets/trophies/marathon-2/ on disk. When a marathon gets its
    // own distinct art later, key this off marathonId again instead.
    var artSrc = config.assetsBase + 'trophies/marathon-2/' + trophy.imageKey + '.png';

    return (
      '<div class="ctr-trophy ' + lockedClass + (sizeClass ? ' ' + sizeClass : '') + '" data-trophy-id="' + trophy.id + '">' +
        // Spans the bay's own FULL recess (fixture to shelf) — sibling of
        // .ctr-trophy-case-visual, not nested inside it, because it's
        // wider/taller than the trophy's own box (see positionTrophyElements
        // / ctr-layout.js getGlowRect). Dark/invisible by default; fades
        // in on unlock via the outer --unlocked class.
        renderGlow(trophy.id) +
        renderTopPlate(trophy) +
        '<div class="ctr-trophy-case-visual">' +
          // Approximates the bay's own lit panel behind the trophy —
          // sized relative to the trophy's own box (bigger than it, not
          // a separate photo-coordinate rectangle), so it automatically
          // follows the trophy whether it's shelf-locked (desktop) or in
          // the generic flex fallback (mobile). Dark by default; faded
          // to invisible when unlocked via the outer --unlocked class.
          '<div class="ctr-trophy-backdrop"></div>' +
          '<div class="ctr-trophy-pedestal" aria-hidden="true"></div>' +
          '<div class="ctr-trophy-shadow"></div>' +
          '<img class="ctr-trophy-art" src="' + escapeUrl(artSrc) + '" alt="' + escapeHtml(trophy.name) + '" data-fallback-name="' + escapeHtml(trophy.name) + '" />' +
          '<div class="ctr-trophy-art-fallback" hidden>' + escapeHtml(trophy.name) + '</div>' +
          (trophy.isUnlocked ? '' : '<div class="ctr-trophy-glass"></div><div class="ctr-trophy-lock" aria-hidden="true">&#128274;</div>') +
        '</div>' +
        renderNameplate(trophy, viewModel, marathonTotalDays || 0) +
        renderStatusPlate(trophy, viewModel, sizeClass === 'ctr-trophy--zoomed') +
      '</div>'
    );
  }

  // The title plate in the crown molding above the arch — new in the
  // 3rd-generation photo (see ctr-layout.js TOP_RECTS). Always shows the
  // trophy's title, locked or not, matching the reference mockup.
  function renderTopPlate(trophy) {
    return '<div class="ctr-top-plate">' + escapeHtml(trophy.name) + ' Trophy</div>';
  }

  // The unlock "spotlight": a volumetric vector beam (SVG), not a
  // blurry CSS radial-gradient blob — a cone from the real ceiling
  // fixture down to a "floor contact" ellipse where the light actually
  // lands, blended with mix-blend-mode: screen so it lightens the wood
  // underneath instead of just painting a flat shape over it. Shape is
  // fixed (a real spotlight's taper doesn't change bay to bay); color/
  // blur/opacity/overall strength stay tunable via the --ctr-glow-* CSS
  // variables on .ctr-widget. gradientUnits/filter ids are suffixed
  // with the trophy's own id so multiple trophies on screen at once
  // (in-room + a zoomed one) never collide over the same <defs> id.
  function renderGlow(trophyId) {
    var uid = escapeHtml(trophyId);
    return (
      '<div class="ctr-trophy-glow" aria-hidden="true">' +
        '<svg class="ctr-glow-svg" viewBox="0 0 100 100" preserveAspectRatio="none">' +
          '<defs>' +
            '<filter id="ctr-glow-blur-' + uid + '" x="-60%" y="-60%" width="220%" height="220%">' +
              '<feGaussianBlur stdDeviation="2.2"/>' +
            '</filter>' +
            '<linearGradient id="ctr-glow-beam-' + uid + '" x1="0" y1="0" x2="0" y2="1">' +
              '<stop offset="0%" style="stop-color:#fff3d6; stop-opacity: var(--ctr-glow-hotspot-opacity)"/>' +
              '<stop offset="60%" style="stop-color:#ffbb66; stop-opacity: calc(var(--ctr-glow-wash-opacity) * 0.6)"/>' +
              '<stop offset="100%" style="stop-color:#ffbb66; stop-opacity: 0"/>' +
            '</linearGradient>' +
            '<radialGradient id="ctr-glow-core-' + uid + '" cx="50%" cy="0%" r="70%">' +
              '<stop offset="0%" style="stop-color:#fff8e6; stop-opacity: var(--ctr-glow-hotspot-opacity)"/>' +
              '<stop offset="100%" style="stop-color:#fff8e6; stop-opacity: 0"/>' +
            '</radialGradient>' +
            '<radialGradient id="ctr-glow-floor-' + uid + '" cx="50%" cy="50%" r="50%">' +
              '<stop offset="0%" style="stop-color:#ffbb66; stop-opacity: calc(var(--ctr-glow-wash-opacity) * 0.9)"/>' +
              '<stop offset="100%" style="stop-color:#ffbb66; stop-opacity: 0"/>' +
            '</radialGradient>' +
          '</defs>' +
          '<polygon class="ctr-glow-beam" points="50,2 25,88 75,88" fill="url(#ctr-glow-beam-' + uid + ')" filter="url(#ctr-glow-blur-' + uid + ')"/>' +
          '<ellipse class="ctr-glow-floor" cx="50" cy="86" rx="27" ry="7" fill="url(#ctr-glow-floor-' + uid + ')" filter="url(#ctr-glow-blur-' + uid + ')"/>' +
          '<ellipse cx="50" cy="4" rx="11" ry="6" fill="url(#ctr-glow-core-' + uid + ')"/>' +
        '</svg>' +
      '</div>'
    );
  }

  // The main plaque: member name, unlock date, and the two day-count
  // stats from the reference mockup ("# OF DAYS" since the member's
  // very first trophy, and this trophy's own split from the previous
  // one). A locked trophy has none of that yet — real dates/stats don't
  // exist until it actually unlocks — so it just shows what's needed to
  // get there instead of a placeholder.
  function renderNameplate(trophy, viewModel, marathonTotalDays) {
    if (!trophy.isUnlocked) {
      return (
        '<div class="ctr-nameplate ctr-nameplate--locked">' +
          '<div class="ctr-nameplate-name">' + escapeHtml(viewModel.displayName || '') + '</div>' +
          '<div class="ctr-nameplate-goal">' + trophy.requiredReferrals + ' referrals<br>to unlock</div>' +
        '</div>'
      );
    }
    // Ordered by priority, not by reading order — the plate's real
    // height varies a lot per bay/viewport width (as little as ~44px at
    // the narrowest desktop size), and CSS clips whatever doesn't fit
    // (align-items: flex-start + overflow: hidden) rather than shrinking
    // everything down to an illegible size. Name + day count survive
    // even the smallest plates; date and the split/total stats are the
    // first to go. Nothing here is EVER hidden, just possibly clipped —
    // the zoom view always shows all of it.
    return (
      '<div class="ctr-nameplate">' +
        '<div class="ctr-nameplate-name">' + escapeHtml(viewModel.displayName || '') + '</div>' +
        '<div class="ctr-nameplate-days">' +
          '<span class="ctr-nameplate-days-count">' + trophy.daysSinceFirstTrophy + '</span>' +
          '<span class="ctr-nameplate-days-label">days</span>' +
        '</div>' +
        '<div class="ctr-nameplate-date">' + formatDate(trophy.unlockedAt) + '</div>' +
        '<div class="ctr-nameplate-stats">' +
          '<span>Split ' + trophy.splitDaysSincePrevious + '</span>' +
          '<span>Total ' + marathonTotalDays + '</span>' +
        '</div>' +
      '</div>'
    );
  }

  // The in-room status plate is genuinely tiny in real pixels (the
  // client's own measured panel — see ctr-layout.js STATUS_RECTS — is
  // only ~20px tall at typical widget width). A full sentence there
  // doesn't get more legible by shrinking the font to fit; it just
  // renders as a blurry, illegible smudge that reads as "solid black".
  // So the in-room version is icon + the referral number only (the
  // tier's requiredReferrals — how many it took to earn, locked or not)
  // at a fixed, actually-legible size, with the rest of the sentence in
  // a title tooltip; the zoom view has real room, so it keeps the full text.
  function renderStatusPlate(trophy, viewModel, isZoomed) {
    if (!trophy.isUnlocked) {
      if (!isZoomed) {
        return (
          '<div class="ctr-status-plate ctr-status-plate--locked" title="' + trophy.requiredReferrals + ' referrals to unlock">' +
            '<span aria-hidden="true">&#128274;</span> ' + trophy.requiredReferrals +
          '</div>'
        );
      }
      return (
        '<div class="ctr-status-plate ctr-status-plate--locked">' +
          '<span aria-hidden="true">&#128274;</span> ' + trophy.requiredReferrals + ' referrals' +
        '</div>'
      );
    }
    if (!isZoomed) {
      return (
        '<div class="ctr-status-plate" title="Unlocked at ' + trophy.requiredReferrals + ' referrals, ' + formatDate(trophy.unlockedAt) + '">' +
          '<span class="ctr-nameplate-check" aria-hidden="true">&#10003;</span> ' + trophy.requiredReferrals +
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
