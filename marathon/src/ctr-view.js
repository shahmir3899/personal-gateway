/**
 * Captain's Trophy Room — DOM rendering.
 * Phase 0: render the empty cabin background and a 3-case skeleton shell only.
 * Trophy/nameplate rendering and carousel wiring land in later phases.
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

  function renderStatus(rootEl, message) {
    var el = rootEl.querySelector('.ctr-status');
    if (el) el.textContent = message || '';
  }

  function escapeUrl(str) {
    return String(str).replace(/['"\\]/g, '');
  }

  global.CtrView = {
    renderShell: renderShell,
    renderStatus: renderStatus
  };
})(window);
