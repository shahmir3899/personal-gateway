/**
 * Captain's Trophy Room — photo-calibrated trophy positions.
 *
 * The case background (assets/backgrounds/cabin.jpg) has 5 real display
 * bays, each with THREE brass plates: a title plate in the crown
 * molding above the arch, a main plaque below the shelf (name/date/day
 * stats), and a smaller status plate under that (unlock status). A
 * marathon always shows exactly 5 trophies (no case carousel), one per
 * bay, left to right.
 *
 * All measurements below came from sampling the image's pixels directly
 * at native resolution (arch dividers found by zooming into gridded
 * crops and confirming each pilaster/plaque edge visually, not
 * statistically guessed) — if the background photo is ever replaced,
 * these need re-measuring. This is the 3rd-generation photo (added the
 * title plate row); the divider/main-plaque/status-plaque positions
 * carried over unchanged from the 2nd generation — verified by
 * overlaying the old rects on the new photo before reusing them — only
 * TOP_RECTS is newly measured.
 *
 * Each trophy's own bounding box (TROPHY_RECTS) is hand-tunable the
 * same way as every plate here — see the Trophy Slot Tuner artifact —
 * rather than computed from a shared width-ratio formula, since this
 * photo's 5 bays aren't uniform width or height to begin with.
 */
(function (global) {
  'use strict';

  var IMAGE_NATURAL = { width: 1376, height: 768 };

  // 6 dividers bound the 5 arched bays.
  var DIVIDERS_X = [420, 600, 790, 910, 1085, 1275];

  // Arch apex (topmost point of the recess curve) and the shelf/floor
  // line where the recess ends and the lower molding + plaques begin.
  // Trophies are hand-positioned within this range (see TROPHY_RECTS);
  // BAY_TOP_Y/SHELF_Y are also used directly to size the unlock glow to
  // the recess's own bounds (see getGlowRect).
  var BAY_TOP_Y = 170;
  var SHELF_Y = 452;

  var BAY_COUNT = 5;

  // Each trophy's own bounding box, hand-tunable exactly like the
  // plaques below — {left, top, width, height} as a percent of the full
  // image, independent per bay (no more per-bay-width-ratio formula).
  // Defaults here were computed from the old formula (bay width * 0.82,
  // height = width * 4/3, bottom-anchored at SHELF_Y) as a starting
  // point; re-tune with the Trophy Slot Tuner artifact and paste the
  // result back in here.
  var TROPHY_RECTS = [
    { left: 31.70, top: 33.23, width: 10.73, height: 25.63 },
    { left: 44.85, top: 31.81, width: 11.32, height: 27.05 },
    { left: 58.20, top: 41.77, width: 7.15, height: 17.08 },
    { left: 67.28, top: 33.95, width: 10.43, height: 24.91 },
    { left: 80.10, top: 31.81, width: 11.32, height: 27.05 }
  ];

  function clampIndex(index) {
    return Math.max(0, Math.min(BAY_COUNT - 1, index));
  }

  // The main (title/name) plaque — the larger brass rectangle under each
  // bay. Hand-verified against the photo the same way every previous
  // background's nameplate rectangles were: measured in image-pixel
  // percent, not derived from the trophy's own layout.
  var NAMEPLATE_RECTS = [
    { left: 33.37, top: 62.03, width: 7.19, height: 14.71 },
    { left: 45.65, top: 62.66, width: 6.93, height: 14.29 },
    { left: 58.10, top: 62.66, width: 7.28, height: 14.30 },
    { left: 71.08, top: 62.24, width: 7.29, height: 15.34 },
    { left: 83.70, top: 62.66, width: 7.72, height: 15.54 }
  ];

  // The smaller status plaque directly below the main one — this photo
  // (unlike the previous background) actually renders it as a separate
  // physical plate, so unlock status gets its own panel instead of a
  // footer line jammed into the main plaque.
  var STATUS_RECTS = [
    { left: 33.25, top: 77.73, width: 7.07, height: 3.65 },
    { left: 45.42, top: 77.73, width: 7.63, height: 3.65 },
    { left: 57.99, top: 77.73, width: 7.63, height: 3.65 },
    { left: 70.84, top: 78.77, width: 7.17, height: 3.65 },
    { left: 84.05, top: 78.98, width: 7.49, height: 3.65 }
  ];

  // The title plate above each arch, in the crown molding — new in this
  // photo generation. Client-measured with the Nameplate Tuner artifact
  // (superseding Claude's own initial pixel estimate, which was off by
  // a few percent given the plates' slight perspective tilt).
  var TOP_RECTS = [
    { left: 31.51, top: 10.73, width: 10.30, height: 3.96 },
    { left: 43.97, top: 10.42, width: 10.32, height: 4.17 },
    { left: 56.23, top: 9.48, width: 10.11, height: 3.81 },
    { left: 69.12, top: 8.23, width: 10.39, height: 4.59 },
    { left: 81.86, top: 7.81, width: 11.63, height: 3.91 }
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
      yToRoomPercent: function (yFrac) { return ((yFrac * scaledH - offsetY) / roomHeightPx) * 100; }
    };
  }

  /**
   * {leftPercent, topPercent, widthPercent, heightPercent} for trophy i's
   * hand-tuned bounding box (see TROPHY_RECTS), as a percentage of the
   * ROOM — same shape/mapping as getNameplateRect etc. below. Trophy i
   * is positioned/sized in pixels from this exactly like every plate
   * (see positionTrophyElements in ctr-view.js) instead of the old
   * left/bottom/width-only CSS-percent + aspect-ratio approach, since
   * height is now independently tunable too.
   */
  function getSlotStyle(roomEl, index) {
    return rectForBay(TROPHY_RECTS, roomEl, index);
  }

  /**
   * {leftPercent, topPercent, widthPercent, heightPercent} for plaque i's
   * hand-measured panel rectangle, as a percentage of the ROOM — same
   * cover-crop mapping as everything else here. ctr-view.js converts
   * this to pixels relative to the trophy element itself (not used as a
   * CSS percentage directly) because the panel is nested inside
   * .ctr-trophy, whose own height is 0 — percentage sizing against a
   * zero-height ancestor doesn't work, but pixel values anchored to the
   * trophy's own measured position do.
   */
  function rectForBay(rects, roomEl, index) {
    var rect = roomEl.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    var i = clampIndex(index);
    var mapper = coverMapper(rect.width, rect.height);
    var r = rects[i];

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

  function getNameplateRect(roomEl, index) {
    return rectForBay(NAMEPLATE_RECTS, roomEl, index);
  }

  function getStatusRect(roomEl, index) {
    return rectForBay(STATUS_RECTS, roomEl, index);
  }

  function getTopRect(roomEl, index) {
    return rectForBay(TOP_RECTS, roomEl, index);
  }

  /**
   * {leftPercent, topPercent, widthPercent, heightPercent} for the FULL
   * arched recess of bay i (its own divider span, full BAY_TOP_Y to
   * SHELF_Y height) — used to place the unlock "spotlight" glow so it
   * lines up with the real downlight fixture at the top of the recess,
   * not just the smaller trophy box inside it (which would leave the
   * glow floating with no visible source).
   */
  function getGlowRect(roomEl, index) {
    var rect = roomEl.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    var i = clampIndex(index);
    var mapper = coverMapper(rect.width, rect.height);

    var leftPercent = mapper.xToRoomPercent(DIVIDERS_X[i] / IMAGE_NATURAL.width);
    var topPercent = mapper.yToRoomPercent(BAY_TOP_Y / IMAGE_NATURAL.height);

    return {
      leftPercent: leftPercent,
      topPercent: topPercent,
      widthPercent: mapper.xToRoomPercent(DIVIDERS_X[i + 1] / IMAGE_NATURAL.width) - leftPercent,
      heightPercent: mapper.yToRoomPercent(SHELF_Y / IMAGE_NATURAL.height) - topPercent
    };
  }

  global.CtrLayout = {
    BAY_COUNT: BAY_COUNT,
    getSlotStyle: getSlotStyle,
    getNameplateRect: getNameplateRect,
    getStatusRect: getStatusRect,
    getTopRect: getTopRect,
    getGlowRect: getGlowRect
  };
})(window);
