/**
 * Captain's Trophy Room — photo-calibrated trophy positions.
 *
 * The case background (assets/backgrounds/cabin.jpg) has 5 real display
 * bays with their own shelf ledge and spotlight. A marathon always shows
 * exactly 5 trophies now (no case carousel), one per bay, left to right.
 *
 * All measurements below came from sampling the image's pixels directly
 * at native resolution 1536x1024 (brightest point of the brass shelf
 * ledge, and the wood divider pilasters between bays) — if the
 * background photo is ever replaced, these need re-measuring.
 */
(function (global) {
  'use strict';

  var IMAGE_NATURAL = { width: 1536, height: 1024 };

  // Left/right divider x per bay (6 dividers bound 5 bays), and the
  // shared bay-interior top/shelf y. The shelf actually has a very
  // slight rightward slope in the photo (perspective), but the plaques
  // read as a cleaner, more "designed" row using one flat shelf line
  // instead of following it — so unlike an earlier version, only ONE
  // shelf y is used for every bay.
  var DIVIDERS_X = [456, 652, 848, 1064, 1288, 1512];
  var BAY_TOP_Y = 200;
  var SHELF_Y = 617;

  var BAY_COUNT = 5;

  function bayXFrac(i) {
    return ((DIVIDERS_X[i] + DIVIDERS_X[i + 1]) / 2) / IMAGE_NATURAL.width;
  }

  // Trophy width as a fraction of the image width — sized to fill most
  // of a bay's ~13.4% average width without touching its neighbor.
  var TROPHY_WIDTH_FRAC = 0.118;

  /**
   * Mimics CSS `background-size: cover; background-position: center;` to
   * map a fraction of the ORIGINAL image into a percentage of the
   * rendered room box, accounting for whichever axis gets cropped at the
   * room's current aspect ratio.
   */
  function coverMapper(roomWidthPx, roomHeightPx) {
    var scale = Math.max(roomWidthPx / IMAGE_NATURAL.width, roomHeightPx / IMAGE_NATURAL.height);
    var scaledW = IMAGE_NATURAL.width * scale;
    var scaledH = IMAGE_NATURAL.height * scale;
    var offsetX = (scaledW - roomWidthPx) / 2;
    var offsetY = (scaledH - roomHeightPx) / 2;

    return {
      xToRoomPercent: function (xFrac) { return ((xFrac * scaledW - offsetX) / roomWidthPx) * 100; },
      yToRoomPercent: function (yFrac) { return ((yFrac * scaledH - offsetY) / roomHeightPx) * 100; },
      widthFracToRoomPercent: function (wFrac) { return (wFrac * scaledW / roomWidthPx) * 100; }
    };
  }

  /**
   * {leftPercent, bottomPercent, widthPercent} for the trophy at bay
   * index i (0-4), against the room element's CURRENT rendered size.
   */
  function getSlotStyle(roomEl, index) {
    var rect = roomEl.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    var i = Math.max(0, Math.min(BAY_COUNT - 1, index));
    var mapper = coverMapper(rect.width, rect.height);

    return {
      leftPercent: mapper.xToRoomPercent(bayXFrac(i)),
      bottomPercent: 100 - mapper.yToRoomPercent(SHELF_Y / IMAGE_NATURAL.height),
      widthPercent: mapper.widthFracToRoomPercent(TROPHY_WIDTH_FRAC)
    };
  }

  /**
   * {left, top, width, height} (all percent) for bay i's lit interior —
   * used to dim/brighten that bay's spotlight depending on lock state.
   */
  function getBayRect(roomEl, index) {
    var rect = roomEl.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    var i = Math.max(0, Math.min(BAY_COUNT - 1, index));
    var mapper = coverMapper(rect.width, rect.height);

    var leftFrac = DIVIDERS_X[i] / IMAGE_NATURAL.width;
    var rightFrac = DIVIDERS_X[i + 1] / IMAGE_NATURAL.width;
    var leftPct = mapper.xToRoomPercent(leftFrac);
    var rightPct = mapper.xToRoomPercent(rightFrac);
    var topPct = mapper.yToRoomPercent(BAY_TOP_Y / IMAGE_NATURAL.height);
    var bottomPct = mapper.yToRoomPercent(SHELF_Y / IMAGE_NATURAL.height);

    return {
      leftPercent: leftPct,
      widthPercent: rightPct - leftPct,
      topPercent: topPct,
      heightPercent: bottomPct - topPct
    };
  }

  global.CtrLayout = {
    BAY_COUNT: BAY_COUNT,
    getSlotStyle: getSlotStyle,
    getBayRect: getBayRect
  };
})(window);
