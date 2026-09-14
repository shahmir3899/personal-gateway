/**
 * Captain's Trophy Room — pure model logic.
 * No DOM access here. Everything takes plain data in, returns plain data out,
 * so this file can later be fed real API data with zero changes.
 *
 * Referral counts are CUMULATIVE across marathons (confirmed): Marathon 2's
 * trophies require MORE total referrals than Marathon 1's, not a reset count.
 */
(function (global) {
  'use strict';

  /**
   * @param {Array} marathons - marathons.json "marathons" array (sequenceOrder ascending)
   * @param {Object} memberProgress - { memberId, displayName, totalVerifiedReferrals, unlocks: [{trophyId, unlockedAt}] }
   * @returns {Object} computed view-model, see shape below
   */
  function computeProgress(marathons, memberProgress) {
    var totalReferrals = (memberProgress && memberProgress.totalVerifiedReferrals) || 0;
    var unlockMap = buildUnlockMap(memberProgress);

    var sortedMarathons = marathons.slice().sort(function (a, b) {
      return a.sequenceOrder - b.sequenceOrder;
    });

    var allUnlockedTimestamps = [];
    Object.keys(unlockMap).forEach(function (trophyId) {
      allUnlockedTimestamps.push(unlockMap[trophyId]);
    });
    allUnlockedTimestamps.sort(); // ISO strings sort chronologically
    var firstUnlockAt = allUnlockedTimestamps.length ? allUnlockedTimestamps[0] : null;

    var marathonResults = [];
    var previousMarathonFullyUnlocked = true; // marathon[0] is always accessible

    sortedMarathons.forEach(function (marathon, idx) {
      var isAccessible = idx === 0 || previousMarathonFullyUnlocked;

      var trophies = marathon.trophies
        .slice()
        .sort(function (a, b) { return a.tierOrder - b.tierOrder; })
        .map(function (trophy) {
          var unlockedAt = unlockMap[trophy.id] || null;
          var isUnlocked = !!unlockedAt && totalReferrals >= trophy.requiredReferrals;
          return {
            id: trophy.id,
            name: trophy.name,
            tierOrder: trophy.tierOrder,
            caseNumber: trophy.caseNumber,
            requiredReferrals: trophy.requiredReferrals,
            imageKey: trophy.imageKey,
            isUnlocked: isUnlocked,
            unlockedAt: unlockedAt,
            daysSinceFirstTrophy: isUnlocked ? daysBetween(firstUnlockAt, unlockedAt) : null,
            splitDaysSincePrevious: null // filled in below once we know unlock order
          };
        });

      var marathonComplete = trophies.length > 0 && trophies.every(function (t) { return t.isUnlocked; });

      marathonResults.push({
        id: marathon.id,
        name: marathon.name,
        sequenceOrder: marathon.sequenceOrder,
        requiredReferrals: marathon.requiredReferrals,
        isAccessible: isAccessible,
        isComplete: marathonComplete,
        trophies: trophies
      });

      previousMarathonFullyUnlocked = isAccessible && marathonComplete;
    });

    // Split days: resets per trophy, measured against the PREVIOUS unlock
    // chronologically across the member's whole history (not per-marathon).
    var allTrophiesFlat = [];
    marathonResults.forEach(function (m) {
      m.trophies.forEach(function (t) {
        if (t.isUnlocked) allTrophiesFlat.push(t);
      });
    });
    allTrophiesFlat.sort(function (a, b) {
      return a.unlockedAt < b.unlockedAt ? -1 : a.unlockedAt > b.unlockedAt ? 1 : 0;
    });
    allTrophiesFlat.forEach(function (trophy, i) {
      trophy.splitDaysSincePrevious = i === 0 ? 0 : daysBetween(allTrophiesFlat[i - 1].unlockedAt, trophy.unlockedAt);
    });

    var currentMarathon = null;
    for (var i = marathonResults.length - 1; i >= 0; i--) {
      if (marathonResults[i].isAccessible) { currentMarathon = marathonResults[i]; break; }
    }

    return {
      memberId: memberProgress ? memberProgress.memberId : null,
      displayName: memberProgress ? memberProgress.displayName : null,
      totalVerifiedReferrals: totalReferrals,
      firstUnlockAt: firstUnlockAt,
      currentMarathonId: currentMarathon ? currentMarathon.id : null,
      marathons: marathonResults
    };
  }

  function buildUnlockMap(memberProgress) {
    var map = {};
    if (memberProgress && Array.isArray(memberProgress.unlocks)) {
      memberProgress.unlocks.forEach(function (u) {
        map[u.trophyId] = u.unlockedAt;
      });
    }
    return map;
  }

  function daysBetween(isoStart, isoEnd) {
    if (!isoStart || !isoEnd) return null;
    var msPerDay = 24 * 60 * 60 * 1000;
    var start = Date.UTC.apply(null, dateParts(isoStart));
    var end = Date.UTC.apply(null, dateParts(isoEnd));
    return Math.round((end - start) / msPerDay);
  }

  function dateParts(iso) {
    var d = new Date(iso);
    return [d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()];
  }

  global.CtrModel = {
    computeProgress: computeProgress
  };
})(window);
