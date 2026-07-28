// ==========================================================================
// SETUP
// ==========================================================================

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const hasGSAP = typeof window.gsap !== 'undefined';

if (hasGSAP && window.ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);
}

// ==========================================================================
// SMOOTH SCROLL — Lenis, wired into the GSAP ticker + ScrollTrigger
// ==========================================================================

(function initLenis() {
  if (reducedMotion || typeof window.Lenis === 'undefined') return;

  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });

  if (hasGSAP) {
    lenis.on('scroll', ScrollTrigger && ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  } else {
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }
})();

// ==========================================================================
// TEXT SPLITTING — wraps characters in <span class="char"> for stagger
// reveals, preserving any existing element children (e.g. the italic "(").
// ==========================================================================

function splitChars(el) {
  const nodes = Array.from(el.childNodes);
  const frag = document.createDocumentFragment();
  const chars = [];

  nodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      node.textContent.split('').forEach((ch) => {
        if (ch === ' ') {
          frag.appendChild(document.createTextNode(' '));
          return;
        }
        const span = document.createElement('span');
        span.className = 'char';
        span.textContent = ch;
        frag.appendChild(span);
        chars.push(span);
      });
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      node.classList.add('char');
      frag.appendChild(node);
      chars.push(node);
    }
  });

  el.innerHTML = '';
  el.appendChild(frag);
  return chars;
}

// ==========================================================================
// CUSTOM CURSOR — glassmorphic "далі" cursor for media elements
// (no element currently opts in via .js-cursor-media; the engine stays
// generic and ready for the gallery/video sections still to come)
// ==========================================================================

function initCustomCursor() {
  const cursor = document.getElementById('cursor');
  if (!cursor || !hasGSAP) return;

  const isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!isFinePointer) return;

  document.body.classList.add('has-custom-cursor');

  const label = cursor.querySelector('.cursor__media-label');
  const moveX = gsap.quickTo(cursor, 'x', { duration: 0.6, ease: 'power2' });
  const moveY = gsap.quickTo(cursor, 'y', { duration: 0.6, ease: 'power2' });

  gsap.set(cursor, { x: window.innerWidth / 2, y: window.innerHeight / 2 });

  window.addEventListener('mousemove', (event) => {
    moveX(event.clientX);
    moveY(event.clientY);
  });

  document.querySelectorAll('.js-cursor-media').forEach((el) => {
    el.addEventListener('mouseenter', () => {
      label.textContent = el.dataset.cursorLabel || 'далі';
      cursor.classList.add('is-media');
    });
    el.addEventListener('mouseleave', () => {
      cursor.classList.remove('is-media');
    });
  });
}

// ==========================================================================
// MOUSE PARALLAX
// Ghost text «ARTEFACT» drifts OPPOSITE the cursor (deep background plane);
// the small decorative labels drift WITH the cursor (near foreground
// plane). Ultra-subtle ratios + a long quickTo smoothing duration keep it
// buttery instead of twitchy. The hero's center is cached once (and on
// resize) rather than re-measured every mousemove, which was the main
// source of the jitter.
// ==========================================================================

const PARALLAX_MAX_PX = 10;

function initParallax() {
  const hero = document.getElementById('hero');
  if (!hero || reducedMotion || !hasGSAP) return;

  const ghost = hero.querySelector('.hero__ghost-img');
  const labelEls = hero.querySelectorAll('.hero__label');

  const layers = [];
  if (ghost) layers.push({ el: ghost, ratio: -0.006 });
  labelEls.forEach((el) => layers.push({ el, ratio: 0.008 }));
  if (!layers.length) return;

  layers.forEach((layer) => {
    layer.moveX = gsap.quickTo(layer.el, 'x', { duration: 0.8, ease: 'power3.out' });
    layer.moveY = gsap.quickTo(layer.el, 'y', { duration: 0.8, ease: 'power3.out' });
  });

  let centerX = 0;
  let centerY = 0;

  function measure() {
    const rect = hero.getBoundingClientRect();
    centerX = rect.left + rect.width / 2;
    centerY = rect.top + rect.height / 2;
  }

  measure();
  window.addEventListener('resize', measure);

  function handleMove(event) {
    const dx = event.clientX - centerX;
    const dy = event.clientY - centerY;

    layers.forEach((layer) => {
      layer.moveX(gsap.utils.clamp(-PARALLAX_MAX_PX, PARALLAX_MAX_PX, dx * layer.ratio));
      layer.moveY(gsap.utils.clamp(-PARALLAX_MAX_PX, PARALLAX_MAX_PX, dy * layer.ratio));
    });
  }

  hero.addEventListener('mousemove', handleMove);
  hero.addEventListener('mouseleave', () => {
    layers.forEach((layer) => {
      layer.moveX(0);
      layer.moveY(0);
    });
  });
}

// ==========================================================================
// MASTER ENTRANCE TIMELINE
// No curtain overlay — every element is set to its own hidden state on
// load (invisible behind the opaque preloader regardless) and reveals
// directly once the preloader is gone.
// ==========================================================================

let heroBg, nav, menuLineOut, titleImg, eyebrowChars,
  ghost, vase, labels, desc, btn, scrollArrow;

function cacheHeroRefs() {
  heroBg = document.querySelector('.hero__bg');
  nav = document.querySelector('.hero__nav');
  menuLineOut = document.querySelector('.hero__menu-line--out');
  titleImg = document.querySelector('.hero__title-img');
  ghost = document.querySelector('.hero__ghost-img');
  vase = document.querySelector('.hero__vase-intro');
  labels = document.querySelectorAll('.hero__label');
  desc = document.querySelector('.hero__description');
  btn = document.querySelector('.hero__btn');
  scrollArrow = document.querySelector('.hero__scroll');

  const eyebrow = document.querySelector('.hero__eyebrow');
  eyebrowChars = eyebrow ? splitChars(eyebrow) : [];
}

function setInitialHeroStates() {
  // centering for .hero__btn now lives in xPercent so later `y` tweens
  // never clobber the translateX(-50%) that used to sit in CSS
  gsap.set(btn, { xPercent: -50 });

  if (reducedMotion) {
    return;
  }

  gsap.set(heroBg, { opacity: 0 });
  gsap.set(nav, { yPercent: -100 });
  gsap.set(menuLineOut, { scaleX: 0, transformOrigin: 'left' });
  gsap.set(eyebrowChars, { opacity: 0, filter: 'blur(10px)' });
  gsap.set(titleImg, { y: 30, opacity: 0 });
  gsap.set(vase, { y: 30, scale: 0.96, opacity: 0 });
  gsap.set(ghost, { opacity: 0, scale: 0.96 });
  gsap.set(labels, { opacity: 0, scale: 0.96 });
  gsap.set(desc, { opacity: 0 });
  gsap.set([btn, scrollArrow], { opacity: 0, y: 30 });
}

// Strictly vertical float — no rotation, no sway, no hover trigger.
function startVaseBreathe() {
  if (reducedMotion) return;
  gsap.to(vase, { y: -8, duration: 2.5, yoyo: true, repeat: -1, ease: 'sine.inOut' });
}

// Background/header revealed first as a short prelude, then the Framer
// timeline reference drives the rest as a cumulative cascade:
//   step1 (0.0s)  eyebrow fades in
//   step2 (+0.5s) H1 image slides up + fades in
//   step3 (+0.6s) vase rises
//   step4 (+0.6s) ghost text + decorative labels fade in
//   step5 (+0.6s) description fades in
//   step6 (+0.7s) CTA + scroll arrow slide up last
// Offsets are cumulative from step1's own start, per the Framer spec.
function runHeroEntrance() {
  if (reducedMotion) return;

  const tl = gsap.timeline();

  tl.addLabel('bg')
    .to(heroBg, { opacity: 1, duration: 1.2, ease: 'power2.out' }, 'bg')
    .to(nav, { yPercent: 0, duration: 1, ease: 'power3.out' }, 'bg+=0.1')
    .to(menuLineOut, {
      scaleX: 1,
      duration: 0.7,
      ease: 'power2.out',
      onComplete: () => gsap.set(menuLineOut, { clearProps: 'transform,transformOrigin' }),
    }, '>-0.3')
    .addLabel('step1', 'bg+=0.3')
    .to(eyebrowChars, { opacity: 1, filter: 'blur(0px)', duration: 0.7, stagger: 0.03, ease: 'power2.out' }, 'step1')
    .addLabel('step2', 'step1+=0.5')
    .to(titleImg, { y: 0, opacity: 1, duration: 0.9, ease: 'power4.out' }, 'step2')
    .addLabel('step3', 'step2+=0.6')
    .to(vase, {
      y: 0,
      scale: 1,
      opacity: 1,
      duration: 1,
      ease: 'power4.out',
      onComplete: startVaseBreathe,
    }, 'step3')
    .addLabel('step4', 'step3+=0.6')
    .to(ghost, { opacity: 1, scale: 1, duration: 1, ease: 'power3.out' }, 'step4')
    .to(labels, { opacity: 1, scale: 1, duration: 1, stagger: 0.06, ease: 'power3.out' }, 'step4')
    .addLabel('step5', 'step4+=0.6')
    .to(desc, { opacity: 1, duration: 0.9, ease: 'power2.out' }, 'step5')
    .addLabel('step6', 'step5+=0.7')
    .to([btn, scrollArrow], { y: 0, opacity: 1, duration: 0.9, stagger: 0.15, ease: 'power3.out' }, 'step6')
    // parallax only starts once the entrance choreography has fully settled
    .call(initParallax);
}

// ==========================================================================
// PRELOADER — "The Focusing Logo"
// The 8 letters (img/logo-letter-1.svg..8.svg) animate purely through the
// CSS `@keyframes animateBlur` (exactly 3 passes, animation-fill-mode:
// forwards) + per-letter `animation-delay` (style.css) — GSAP never sets
// opacity/filter on them, so nothing fights the keyframe animation. This
// just times a delayed call off the same durations (last letter's stagger
// + its 3-pass animation length + the requested 2s hold), then fades the
// whole overlay out.
// ==========================================================================

const LETTER_STAGGER = 0.12; // must match `calc(0.12s * var(--i))` in CSS
const LETTER_ANIM_DURATION = 2.0; // must match `animateBlur 2.0s` in CSS
const LETTER_ANIM_PASSES = 3; // must match the `3` iteration-count in CSS
const LETTER_HOLD = 2; // requested 2s pause after the 3rd pass

function initPreloader() {
  const preloader = document.getElementById('preloader');
  if (!preloader) return;

  const letters = preloader.querySelectorAll('.preloader__logo span');

  function finishAndReveal() {
    document.body.classList.remove('is-preloading');
    preloader.remove();
    runHeroEntrance();
  }

  if (reducedMotion || !hasGSAP || !letters.length) {
    document.body.classList.remove('is-preloading');
    preloader.remove();
    return;
  }

  const totalSeconds = LETTER_STAGGER * letters.length + LETTER_ANIM_DURATION * LETTER_ANIM_PASSES + LETTER_HOLD;

  gsap.delayedCall(totalSeconds, () => {
    gsap.to(preloader, {
      opacity: 0,
      duration: 1,
      ease: 'power2.inOut',
      onComplete: () => {
        gsap.set(preloader, { display: 'none' });
        finishAndReveal();
      },
    });
  });
}

// ==========================================================================
// INIT
// ==========================================================================

cacheHeroRefs();
if (hasGSAP) {
  setInitialHeroStates();
}
initPreloader();
initCustomCursor();
// initParallax() is triggered by runHeroEntrance() once the master
// entrance timeline finishes, not eagerly here.
