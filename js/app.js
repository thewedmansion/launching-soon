/**
 * THE WED MANSION — Luxury Scroll-Driven Cinematic Experience Engine
 */

(function () {
  'use strict';

  // Constants & Config
  const TOTAL_FRAMES = 120;
  const FRAME_DIR = 'assets/hero_frames';
  const LERP_FACTOR = 0.10; // Silky smooth deceleration physics
  const MAX_TIMELINE = 1.35; // 0..1.0 for Hand Sequence, 1.0..1.35 for Launching Soon

  // DOM Elements
  const sectionCinema = document.getElementById('section-cinema');
  const sectionLaunching = document.getElementById('section-launching');

  const canvas = document.getElementById('hero-canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const s1Header = document.getElementById('s1-header');
  const scrollCue = document.getElementById('scroll-cue');

  const stageThe = document.getElementById('stage-the');
  const stageWed = document.getElementById('stage-wed');
  const stageMansion = document.getElementById('stage-mansion');
  const stagePhotography = document.getElementById('stage-photography');

  // State
  let targetTimeline = 0;
  let currentTimeline = 0;
  let lastDrawnIndex = -1;
  let isInitialFrameDrawn = false;

  const frames = new Array(TOTAL_FRAMES);
  let framesLoaded = 0;

  // Touch tracking
  let touchStartY = 0;
  let isTouching = false;

  // Helper: Frame path
  function getFramePath(index) {
    const padded = String(index).padStart(3, '0');
    return `${FRAME_DIR}/frame_${padded}.webp`;
  }

  // Preload all frames progressively
  function initFrameLoading() {
    // 1. First frame immediate load
    const firstImg = new Image();
    firstImg.src = getFramePath(0);
    firstImg.onload = function () {
      frames[0] = firstImg;
      framesLoaded++;
      if (!isInitialFrameDrawn) {
        drawFrame(0);
        isInitialFrameDrawn = true;
      }
      loadRemainingFrames();
    };
    firstImg.onerror = function () {
      loadRemainingFrames();
    };
  }

  function loadRemainingFrames() {
    // Priority milestones
    const milestones = [30, 60, 90, 119];
    milestones.forEach((idx) => {
      if (!frames[idx]) {
        const img = new Image();
        img.src = getFramePath(idx);
        img.onload = () => {
          frames[idx] = img;
          framesLoaded++;
        };
      }
    });

    // Full sequence
    for (let i = 1; i < TOTAL_FRAMES; i++) {
      if (!frames[i]) {
        const img = new Image();
        img.src = getFramePath(i);
        img.onload = () => {
          frames[i] = img;
          framesLoaded++;
        };
      }
    }
  }

  // Render frame on Canvas
  function drawFrame(index) {
    const img = frames[index];
    if (!img || !img.complete || img.naturalWidth === 0) {
      for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
        const prev = frames[index - offset];
        if (prev && prev.complete && prev.naturalWidth > 0) {
          renderImage(prev);
          lastDrawnIndex = index - offset;
          return;
        }
        const next = frames[index + offset];
        if (next && next.complete && next.naturalWidth > 0) {
          renderImage(next);
          lastDrawnIndex = index + offset;
          return;
        }
      }
      return;
    }

    renderImage(img);
    lastDrawnIndex = index;
  }

  function renderImage(img) {
    const cWidth = canvas.width;
    const cHeight = canvas.height;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, cWidth, cHeight);

    const imgRatio = img.naturalWidth / img.naturalHeight;
    const canvasRatio = cWidth / cHeight;

    let drawW, drawH, drawX, drawY;

    if (canvasRatio > imgRatio) {
      drawH = cHeight;
      drawW = drawH * imgRatio;
      drawX = (cWidth - drawW) / 2;
      drawY = 0;
    } else {
      drawW = cWidth;
      drawH = drawW / imgRatio;
      drawX = 0;
      drawY = (cHeight - drawH) / 2;
    }

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  }

  // Helper for opacity interpolation
  function getOpacity(val, start, fadeInEnd, fadeOutStart, end) {
    if (val < start || val > end) return 0;
    if (val >= fadeInEnd && val <= fadeOutStart) return 1;
    if (val < fadeInEnd) {
      return (val - start) / (fadeInEnd - start);
    }
    return (end - val) / (end - fadeOutStart);
  }

  function applyTextStyle(el, opacity, isBottom) {
    if (!el) return;
    const clamped = Math.max(0, Math.min(1, opacity));
    el.style.opacity = clamped.toFixed(3);
    el.style.visibility = clamped > 0.01 ? 'visible' : 'hidden';

    if (isBottom) {
      const translateY = (1 - clamped) * 10;
      el.style.transform = `translateX(-50%) translateY(${translateY.toFixed(1)}px)`;
    } else {
      const scale = 0.97 + clamped * 0.03;
      el.style.transform = `translate(-50%, -50%) scale(${scale.toFixed(3)})`;
    }
  }

  // Main visual state update on every frame
  function updateVisualState(timeline) {
    // -------------------------------------------------------------
    // PHASE 1: Cinematic Hands & Typography (timeline: 0.0 -> 1.0)
    // -------------------------------------------------------------
    const videoProgress = Math.min(1.0, Math.max(0.0, timeline));
    const frameIndex = Math.min(TOTAL_FRAMES - 1, Math.round(videoProgress * (TOTAL_FRAMES - 1)));

    if (frameIndex !== lastDrawnIndex || !isInitialFrameDrawn) {
      drawFrame(frameIndex);
      isInitialFrameDrawn = true;
    }

    // Typography overlays for Stage 1..4
    // State 1: THE (0% - 24%)
    const opThe = getOpacity(videoProgress, -0.05, 0.00, 0.16, 0.23);
    applyTextStyle(stageThe, opThe, false);

    // State 2: WED (24% - 49%)
    const opWed = getOpacity(videoProgress, 0.21, 0.26, 0.43, 0.49);
    applyTextStyle(stageWed, opWed, false);

    // State 3: MANSION (49% - 74%)
    const opMansion = getOpacity(videoProgress, 0.47, 0.52, 0.68, 0.74);
    applyTextStyle(stageMansion, opMansion, false);

    // State 4: WEDDING PHOTOGRAPHY (74% - 100%)
    const opPhoto = getOpacity(videoProgress, 0.72, 0.79, 1.00, 1.05);
    applyTextStyle(stagePhotography, opPhoto, true);

    // Hide scroll cue after initial interaction
    if (timeline > 0.05 && scrollCue) {
      scrollCue.classList.add('hidden');
    } else if (timeline <= 0.05 && scrollCue) {
      scrollCue.classList.remove('hidden');
    }

    // -------------------------------------------------------------
    // SECTION VISIBILITY & TRANSITIONS
    // -------------------------------------------------------------
    // Section 1 (Cinema): Full opacity 0..1.0, dissolves 1.0 -> 1.25
    let s1Opacity = 1.0;
    if (timeline > 1.0) {
      s1Opacity = Math.max(0, 1.0 - (timeline - 1.0) / 0.22);
    }
    sectionCinema.style.opacity = s1Opacity.toFixed(3);
    sectionCinema.style.transform = `scale(${(1.0 + (1.0 - s1Opacity) * 0.03).toFixed(3)})`;
    sectionCinema.style.visibility = s1Opacity > 0.01 ? 'visible' : 'hidden';

    // Section 2 (Launching Soon): Fades in 1.00 -> 1.25, fully active up to MAX_TIMELINE
    let s2Opacity = 0.0;
    let s2Translate = 25;
    if (timeline >= 1.00) {
      s2Opacity = Math.min(1.0, (timeline - 1.00) / 0.25);
      s2Translate = (1.0 - s2Opacity) * 25;
    }
    sectionLaunching.style.opacity = s2Opacity.toFixed(3);
    sectionLaunching.style.transform = `translateY(${s2Translate.toFixed(1)}px)`;
    sectionLaunching.style.visibility = s2Opacity > 0.01 ? 'visible' : 'hidden';
    sectionLaunching.style.pointerEvents = s2Opacity > 0.6 ? 'auto' : 'none';
  }

  // Animation render loop
  function renderLoop() {
    const diff = targetTimeline - currentTimeline;
    if (Math.abs(diff) > 0.0001) {
      currentTimeline += diff * LERP_FACTOR;
    } else {
      currentTimeline = targetTimeline;
    }

    updateVisualState(currentTimeline);
    requestAnimationFrame(renderLoop);
  }

  // Scroll / Wheel Event Handler
  function handleWheel(e) {
    e.preventDefault();

    let delta = e.deltaY;
    if (e.deltaMode === 1) delta *= 30;
    if (e.deltaMode === 2) delta *= 300;

    const scrollStep = delta * 0.00075;
    targetTimeline = Math.max(0.0, Math.min(MAX_TIMELINE, targetTimeline + scrollStep));
  }

  // Touch Gesture Handlers
  function handleTouchStart(e) {
    if (e.touches.length > 0) {
      touchStartY = e.touches[0].clientY;
      isTouching = true;
    }
  }

  function handleTouchMove(e) {
    if (!isTouching || e.touches.length === 0) return;
    e.preventDefault();

    const touchY = e.touches[0].clientY;
    const deltaY = touchStartY - touchY;
    touchStartY = touchY;

    const touchStep = deltaY * 0.0022;
    targetTimeline = Math.max(0.0, Math.min(MAX_TIMELINE, targetTimeline + touchStep));
  }

  function handleTouchEnd() {
    isTouching = false;
  }

  // Keyboard Navigation
  function handleKeyDown(e) {
    let step = 0;
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
      step = 0.08;
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      step = -0.08;
    } else if (e.key === 'Home') {
      targetTimeline = 0;
      return;
    } else if (e.key === 'End') {
      targetTimeline = MAX_TIMELINE;
      return;
    }

    if (step !== 0) {
      e.preventDefault();
      targetTimeline = Math.max(0.0, Math.min(MAX_TIMELINE, targetTimeline + step));
    }
  }

  // Resize Handler
  function handleResize() {
    canvas.width = 1920;
    canvas.height = 1080;
    if (lastDrawnIndex >= 0) {
      drawFrame(lastDrawnIndex);
    }
  }

  // Bind Listeners
  window.addEventListener('wheel', handleWheel, { passive: false });
  window.addEventListener('touchstart', handleTouchStart, { passive: true });
  window.addEventListener('touchmove', handleTouchMove, { passive: false });
  window.addEventListener('touchend', handleTouchEnd, { passive: true });
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('resize', handleResize);

  // Init
  window.addEventListener('DOMContentLoaded', () => {
    handleResize();
    initFrameLoading();
    requestAnimationFrame(renderLoop);
  });

})();
