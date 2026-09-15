/**
 * Captain's Trophy Room — entry point.
 * Usage:
 *   CaptainsTrophyRoom.init({
 *     mountEl: '#trophy-room-widget',
 *     memberId: 123,                 // optional — falls back to ?member_id= in URL
 *     dataSource: 'mock',            // 'mock' (default) | 'api'
 *     apiBase: null,                 // required when dataSource:'api'
 *     assetsBase: 'assets/'
 *   });
 */
(function (global) {
  'use strict';

  function init(userConfig) {
    var config = resolveConfig(userConfig || {});
    var rootEl = resolveMountEl(config.mountEl);

    if (!rootEl) {
      console.error('[CaptainsTrophyRoom] mountEl not found:', config.mountEl);
      return null;
    }

    CtrView.renderShell(rootEl, config);
    var zoom = CtrZoom.attachOverlay(rootEl);

    if (!config.memberId) {
      CtrView.renderStatus(rootEl, 'No member context provided — pass memberId or ?member_id= in the URL.');
      return { rootEl: rootEl, config: config, zoom: zoom };
    }

    CtrView.renderStatus(rootEl, 'Loading trophy room for member ' + config.memberId + '…');

    loadData(config).then(function (data) {
      var viewModel = CtrModel.computeProgress(data.marathons, data.memberProgress);
      CtrView.renderStatus(rootEl, 'Loaded: ' + (viewModel.displayName || config.memberId) +
        ' — ' + viewModel.totalVerifiedReferrals + ' referrals');
      var marathonNav = CtrMarathonNav.attach(rootEl, viewModel, config, { zoom: zoom });
      console.log('[CaptainsTrophyRoom] view-model', viewModel);
      widgetInstance.marathonNav = marathonNav;
    }).catch(function (err) {
      console.error('[CaptainsTrophyRoom] failed to load data', err);
      CtrView.renderStatus(rootEl, 'Failed to load trophy data.');
    });

    var widgetInstance = { rootEl: rootEl, config: config, zoom: zoom };
    return widgetInstance;
  }

  function resolveConfig(userConfig) {
    var memberId = userConfig.memberId || getQueryParam('member_id') || null;
    return {
      mountEl: userConfig.mountEl || '[data-ctr-widget]',
      memberId: memberId,
      dataSource: userConfig.dataSource || 'mock',
      apiBase: userConfig.apiBase || null,
      assetsBase: userConfig.assetsBase || 'assets/',
      dataBase: userConfig.dataBase || 'data/'
    };
  }

  function resolveMountEl(mountEl) {
    if (typeof mountEl === 'string') return document.querySelector(mountEl);
    if (mountEl instanceof Element) return mountEl;
    return null;
  }

  function getQueryParam(name) {
    try {
      return new URLSearchParams(window.location.search).get(name);
    } catch (e) {
      return null;
    }
  }

  function loadData(config) {
    if (config.dataSource === 'api') {
      if (!config.apiBase) return Promise.reject(new Error('apiBase required when dataSource is "api"'));
      return Promise.all([
        fetch(config.apiBase + '/marathons').then(toJson),
        fetch(config.apiBase + '/members/' + encodeURIComponent(config.memberId) + '/progress').then(toJson)
      ]).then(function (results) {
        return { marathons: results[0].marathons, memberProgress: results[1] };
      });
    }

    // Mock mode: fetch the static JSON fixtures shipped alongside the widget.
    return Promise.all([
      fetch(config.dataBase + 'marathons.json').then(toJson),
      fetch(config.dataBase + 'member-progress.sample.json').then(toJson)
    ]).then(function (results) {
      var memberProgress = results[1].members[String(config.memberId)] || null;
      if (!memberProgress) {
        throw new Error('No mock progress found for member_id=' + config.memberId);
      }
      return { marathons: results[0].marathons, memberProgress: memberProgress };
    });
  }

  function toJson(res) {
    if (!res.ok) throw new Error('Request failed: ' + res.status + ' ' + res.url);
    return res.json();
  }

  global.CaptainsTrophyRoom = { init: init };
})(window);
