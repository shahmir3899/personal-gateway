/**
 * Captain's Trophy Room — photo-calibrated trophy positions.
 *
 * The case background (assets/backgrounds/cabin.jpg) has 5 real display
 * bays with their own shelf ledge and spotlight. A marathon always shows
 * exactly 5 trophies now (no case carousel), one per bay, left to right.
 *
 * All measurements below came from sampling the image's pixels directly
 * at native resolution (brightest point of the brass shelf ledge, and
 * the wood divider pilasters between bays) — if the background photo is
 * ever replaced, these need re-measuring.
 *
 * This regenerated photo (2nd generation, front-on with minimal camera
 * perspective) has noticeably shorter/wider bay openings than the first
 * one — bay height dropped from ~41% of the image height to ~26%, and
 * critically that height is now the SAME across all 5 bays (only their
 * widths still vary a bit). That means trophies can be sized off bay
 * HEIGHT alone (one shared size) instead of needing a different width
 * per bay — the previous photo needed per-bay width sizing specifically
 * because its bays varied in width but a trophy sized to fill that
 * width would have been far too short for the tall bay.
 */
(function (global) {
  'use strict';

  var IMAGE_NATURAL = { width: 1672, height: 941 };

  // 6 dividers bound the 5 bays (measured: pixel-luminance minima at the
  // wood pilasters, verified visually by overlaying the lines on the
  // photo). Bay top/shelf y measured at each bay's own center and
  // averaged — see docs in git history for the per-bay raw values.
  var DIVIDERS_X = [395, 670, 882, 1103, 1311, 1571];
  var BAY_TOP_Y = 200;
  var SHELF_Y = 443;

  var BAY_COUNT = 5;

  // Trophy height as a fraction of the bay's own (now-uniform) height,
  // and its aspect ratio — width follows from height, not the other way
  // around, since height is the dimension that's consistent across bays.
  var TROPHY_HEIGHT_RATIO = 0.9; // of the bay's height
  var TROPHY_ASPECT_WH = 3 / 4;  // width = height * 3/4 (matches .ctr-trophy-case-visual)

  function bayXFrac(i) {
    return ((DIVIDERS_X[i] + DIVIDERS_X[i + 1]) / 2) / IMAGE_NATURAL.width;
  }

  var BAY_HEIGHT_FRAC = (SHELF_Y - BAY_TOP_Y) / IMAGE_NATURAL.height;
  var TROPHY_HEIGHT_FRAC = BAY_HEIGHT_FRAC * TROPHY_HEIGHT_RATIO;

  // Nameplate rectangles — NOT derived/guessed like the values above.
  // These are the exact carved-wood-panel rectangles the client measured
  // by hand with the Nameplate Tuner artifact (drag/resize boxes over
  // this same photo), given back as {left, top, width, height} percent
  // of the full 1672x941 image. Re-run that tool and paste new numbers
  // here if the background photo ever changes.
  var NAMEPLATE_RECTS = [
    { left: 25.84, top: 54.91, width: 10.83, height: 13.97 },
    { left: 38.78, top: 54.50, width: 10.72, height: 14.17 },
    { left: 52.09, top: 55.53, width: 11.06, height: 13.76 },
    { left: 66.18, top: 55.94, width: 11.06, height: 13.76 },
    { left: 79.94, top: 55.53, width: 11.53, height: 14.59 }
  ];

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
      // For a SIZE (not a position) — no offset subtraction needed.
      heightFracToWidthPercent: function (hFrac) {
        var heightPx = hFrac * scaledH;
        var widthPx = heightPx * TROPHY_ASPECT_WH;
        return (widthPx / roomWidthPx) * 100;
      },
      widthFracToRoomPercent: function (wFrac) {
        return (wFrac * scaledW / roomWidthPx) * 100;
      }
    };
  }

  /**
   * {leftPercent, bottomPercent, widthPercent} for the trophy at bay
   * index i (0-4), against the room element's CURRENT rendered size.
   * widthPercent is derived from the shared trophy HEIGHT (see file
   * comment) via the aspect ratio, so it's the same for every bay.
   */
  function getSlotStyle(roomEl, index) {
    var rect = roomEl.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    var i = Math.max(0, Math.min(BAY_COUNT - 1, index));
    var mapper = coverMapper(rect.width, rect.height);

    return {
      leftPercent: mapper.xToRoomPercent(bayXFrac(i)),
      bottomPercent: 100 - mapper.yToRoomPercent(SHELF_Y / IMAGE_NATURAL.height),
      widthPercent: mapper.heightFracToWidthPercent(TROPHY_HEIGHT_FRAC)
    };
  }

  /**
   * {leftPercent, topPercent, widthPercent, heightPercent} for nameplate
   * i's hand-measured panel rectangle (see NAMEPLATE_RECTS), as a
   * percentage of the ROOM — same cover-crop mapping as everything else
   * here. ctr-view.js converts this to pixels relative to the trophy
   * element itself (not used as a CSS percentage directly) because the
   * nameplate is nested inside .ctr-trophy, whose own height is 0 —
   * percentage sizing against a zero-height ancestor doesn't work, but
   * pixel values anchored to the trophy's own measured position do.
   */
  function getNameplateRect(roomEl, index) {
    var rect = roomEl.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    var i = Math.max(0, Math.min(BAY_COUNT - 1, index));
    var mapper = coverMapper(rect.width, rect.height);
    var r = NAMEPLATE_RECTS[i];

    var leftFrac = r.left / 100;
    var topFrac = r.top / 100;
    var rightFrac = (r.left + r.width) / 100;
    var bottomFrac = (r.top + r.height) / 100;

    var leftPercent = mapper.xToRoomPercent(leftFrac);
    var topPercent = mapper.yToRoomPercent(topFrac);

    return {
      leftPercent: leftPercent,
      topPercent: topPercent,
      widthPercent: mapper.xToRoomPercent(rightFrac) - leftPercent,
      heightPercent: mapper.yToRoomPercent(bottomFrac) - topPercent
    };
  }

  global.CtrLayout = {
    BAY_COUNT: BAY_COUNT,
    getSlotStyle: getSlotStyle,
    getNameplateRect: getNameplateRect
  };
})(window);
