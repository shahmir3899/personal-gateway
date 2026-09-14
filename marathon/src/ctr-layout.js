/**
 * Captain's Trophy Room — photo-calibrated trophy positions.
 *
 * The case background (assets/backgrounds/cabin.jpg) has 5 real display
 * bays with their own shelf ledge and spotlight. Rather than laying
 * trophies out generically (flex/percentage padding), we pin each one to
 * the bay it should visually sit in, measured directly from the photo's
 * pixels (see scripts/ — measurements below came from sampling the image
 * for the brightest point of the brass shelf ledge, and the divider
 * pilasters between bays, at native resolution 1536x1024).
 *
 * If the background photo is ever replaced, these fractions need
 * re-measuring against the new image — they are NOT generic layout
 * values.
 */
(function (global) {
  'use strict';

  var IMAGE_NATURAL = { width: 1536, height: 1024 };

  // Center-x of each of the 5 bays, and the shelf ledge's y — both as a
  // fraction of the ORIGINAL image, not the rendered room. The shelf
  // slopes very slightly rightward (camera perspective), so each bay
  // gets its own y instead of one shared constant.
  var BAYS = [
    { xFrac: 554 / 1536, shelfFrac: 609 / 1024 },
    { xFrac: 750 / 1536, shelfFrac: 613 / 1024 },
    { xFrac: 956 / 1536, shelfFrac: 618 / 1024 },
    { xFrac: 1176 / 1536, shelfFrac: 623 / 1024 },
    { xFrac: 1400 / 1536, shelfFrac: 623 / 1024 }
  ];

  // Trophy width as a fraction of the image width — sized to sit
  // comfortably inside a bay (~0.135 wide) without crowding its neighbor.
  var TROPHY_WIDTH_FRAC = 0.10;

  /**
   * Which bay a trophy should use, given its position within the
   * currently-displayed case (0-based) and how many trophies that case
   * has. A single trophy (Case 3 / Full Marathon) gets the center bay
   * for a grander presentation instead of bay 1.
   */
  function slotIndexFor(positionInCase, countInCase) {
    if (countInCase <= 1) return 2; // center bay
    return Math.min(positionInCase, BAYS.length - 1);
  }

  /**
   * Mimics CSS `background-size: cover; background-position: center;`
   * to map a fraction of the ORIGINAL image into a percentage of the
   * rendered room box — accounting for whichever axis gets cropped at
   * the room's current aspect ratio (vertical crop on wide/desktop,
   * horizontal crop on the taller phone layout).
   */
  function coverMapper(roomWidthPx, roomHeightPx) {
    var scale = Math.max(roomWidthPx / IMAGE_NATURAL.width, roomHeightPx / IMAGE_NATURAL.height);
    var scaledW = IMAGE_NATURAL.width * scale;
    var scaledH = IMAGE_NATURAL.height * scale;
    var offsetX = (scaledW - roomWidthPx) / 2;
    var offsetY = (scaledH - roomHeightPx) / 2;

    return {
      xToRoomPercent: function (xFrac) {
        return ((xFrac * scaledW - offsetX) / roomWidthPx) * 100;
      },
      yToRoomPercent: function (yFrac) {
        return ((yFrac * scaledH - offsetY) / roomHeightPx) * 100;
      },
      widthFracToRoomPercent: function (wFrac) {
        return (wFrac * scaledW / roomWidthPx) * 100;
      }
    };
  }

  /**
   * Computes {leftPercent, bottomPercent, widthPercent} for a trophy at
   * the given case-position, against the room element's CURRENT rendered
   * size. Call fresh on every render and on resize — the result is a
   * plain percentage, but the mapping that produces it depends on the
   * room's current aspect ratio.
   */
  function getSlotStyle(roomEl, positionInCase, countInCase) {
    var rect = roomEl.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;

    var bay = BAYS[slotIndexFor(positionInCase, countInCase)];
    var mapper = coverMapper(rect.width, rect.height);

    return {
      leftPercent: mapper.xToRoomPercent(bay.xFrac),
      bottomPercent: 100 - mapper.yToRoomPercent(bay.shelfFrac),
      widthPercent: mapper.widthFracToRoomPercent(TROPHY_WIDTH_FRAC)
    };
  }

  global.CtrLayout = {
    getSlotStyle: getSlotStyle
  };
})(window);
