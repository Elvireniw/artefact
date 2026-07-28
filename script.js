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

// Same pattern as splitChars(), but splits on spaces into <span
// class="word"> instead of per character, preserving existing element
// children (e.g. the italic "(") as their own whole unit.
function splitWords(el) {
  const nodes = Array.from(el.childNodes);
  const frag = document.createDocumentFragment();
  const words = [];

  nodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      node.textContent.split(' ').forEach((word, i) => {
        if (i > 0) frag.appendChild(document.createTextNode(' '));
        if (word === '') return;
        const span = document.createElement('span');
        span.className = 'word';
        span.textContent = word;
        frag.appendChild(span);
        words.push(span);
      });
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      node.classList.add('word');
      frag.appendChild(node);
      words.push(node);
    }
  });

  el.innerHTML = '';
  el.appendChild(frag);
  return words;
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
// hero__bg reveals via a clip-path curtain (bottom-to-top), concurrently
// with the preloader fading out over it; every other element is set to
// its own hidden state on load and reveals afterward in sequence.
// ==========================================================================

let heroBg, nav, menuBtn, menuLineOut, titleImg, eyebrowWords,
  ghost, vase, table, labels, desc, descWords, btn, scrollArrow;

function cacheHeroRefs() {
  heroBg = document.querySelector('.hero__bg');
  nav = document.querySelector('.hero__nav');
  // .hero__menu-btn lives as a body-level sibling of .hero (moved there
  // for a z-index/stacking-context fix — see index.html), so it isn't a
  // descendant of .hero__nav anymore and needs to be tweened alongside
  // it explicitly, or it never drops in with the rest of the header
  menuBtn = document.querySelector('.hero__menu-btn');
  menuLineOut = document.querySelector('.hero__menu-line--out');
  titleImg = document.querySelector('.hero__title-img');
  ghost = document.querySelector('.hero__ghost-img');
  vase = document.querySelector('.hero__vase-intro');
  table = document.querySelector('.hero__table');
  labels = document.querySelectorAll('.hero__label');
  desc = document.querySelector('.hero__description');
  btn = document.querySelector('.hero__btn');
  scrollArrow = document.querySelector('.hero__scroll');

  const eyebrow = document.querySelector('.hero__eyebrow');
  eyebrowWords = eyebrow ? splitWords(eyebrow) : [];
  descWords = desc ? splitWords(desc) : [];
}

function setInitialHeroStates() {
  // centering for .hero__btn now lives in xPercent so later `y` tweens
  // never clobber the translateX(-50%) that used to sit in CSS
  gsap.set(btn, { xPercent: -50 });

  if (reducedMotion) {
    return;
  }

  gsap.set(heroBg, { clipPath: 'inset(100% 0% 0% 0%)' });
  // plain pixels, not yPercent — .hero__nav has no CSS rule of its own and
  // collapses to 0 height (its children are all position:absolute), so a
  // yPercent-based offset would resolve to 0 and never actually move
  gsap.set([nav, menuBtn], { y: -40, opacity: 0 });
  gsap.set(menuLineOut, { scaleX: 0, transformOrigin: 'left' });
  gsap.set(eyebrowWords, { opacity: 0 });
  gsap.set(titleImg, { y: 30, opacity: 0 });
  gsap.set(vase, { y: 30, scale: 0.96, opacity: 0 });
  gsap.set(table, { opacity: 0, y: 20 });
  gsap.set(ghost, { opacity: 0, scale: 0.96 });
  gsap.set(labels, { opacity: 0, scale: 0.96 });
  gsap.set(descWords, { opacity: 0 });
  gsap.set([btn, scrollArrow], { opacity: 0, y: 30 });
}

// Strictly vertical float — no rotation, no sway, no hover trigger.
function startVaseBreathe() {
  if (reducedMotion) return;
  gsap.to(vase, { y: -8, duration: 2.5, yoyo: true, repeat: -1, ease: 'sine.inOut' });
}

// The preloader logo settles, then a 0.75s hold (LETTER_HOLD) elapses
// before this timeline is even built. The preloader itself never fades —
// it stays fully opaque and static. .hero__bg is temporarily bumped above
// it in z-index so the curtain's growing revealed region visually climbs
// up and covers it; once the 2.2s curtain tween completes, the preloader
// is removed instantly and .hero__bg's z-index is restored to its normal
// resting value (0) before anything else runs. Everything else is
// strictly sequential from there, each step starting only once the
// previous one has fully finished, plus its own explicit gap. The only
// intentional overlaps are H1+ghost (together at 'h1Start') and
// table+labels+vase (together, at vase's start via '<'):
//   -0.75s (hold)         preloader logo settled, waiting to start
//   0.0s                  curtain rises over the static preloader, 2.2s
//   +0.4s gap             header (nav + menu button drop + menu-line draw-in)
//   +0.15s gap            eyebrow words fade in
//   +0.15s gap, 'h1Start' H1 rises + fades in, ghost fade starts alongside it
//   h1Start+1.3s          vase + table settle in, decorative labels alongside
//   +0.3s gap             description words fade in
//   +0.3s gap             CTA fades/slides up
//   +0.4s gap             scroll arrow fades/slides up last
function runHeroEntrance() {
  if (reducedMotion) return;

  const preloader = document.getElementById('preloader');
  // outrank the preloader (z-index 9999) so the curtain's growing revealed
  // region visually climbs up and covers it, rather than the not-yet-
  // revealed area falling through to .hero's own background-color
  gsap.set(heroBg, { zIndex: 10000 });

  const tl = gsap.timeline();

  tl.to(heroBg, {
      clipPath: 'inset(0% 0% 0% 0%)',
      duration: 2.2,
      ease: 'sine.inOut',
      onComplete: () => {
        document.body.classList.remove('is-preloading');
        preloader.remove();
        gsap.set(heroBg, { zIndex: 0 });
      },
    }, 0)
    .to([nav, menuBtn], { y: 0, opacity: 1, duration: 0.9, ease: 'power2.out' }, '+=0.4')
    .to(menuLineOut, {
      scaleX: 1,
      duration: 0.7,
      ease: 'power2.out',
      onComplete: () => gsap.set(menuLineOut, { clearProps: 'transform,transformOrigin' }),
    }, '-=0.3')
    .to(eyebrowWords, { opacity: 1, duration: 1.0, stagger: 0.08, ease: 'sine.out' }, '+=0.15')
    .addLabel('h1Start', '+=0.15')
    .to(titleImg, { y: 0, opacity: 1, duration: 1.0, ease: 'power2.out' }, 'h1Start')
    .to(ghost, { opacity: 1, scale: 1, duration: 2.4, ease: 'sine.out' }, 'h1Start')
    .to(vase, {
      y: 0,
      scale: 1,
      opacity: 1,
      duration: 1.1,
      ease: 'power2.out',
      onComplete: startVaseBreathe,
    }, 'h1Start+=1.3')
    .to(table, { opacity: 1, y: 0, duration: 1.1, ease: 'power2.out' }, '<')
    .to(labels, { opacity: 1, scale: 1, duration: 1, stagger: 0.06, ease: 'sine.out' }, '<')
    .to(descWords, { opacity: 1, duration: 0.9, stagger: 0.08, ease: 'sine.out' }, '+=0.3')
    .to(btn, { y: 0, opacity: 1, duration: 0.9, ease: 'power2.out' }, '+=0.3')
    .to(scrollArrow, { y: 0, opacity: 1, duration: 0.7, ease: 'power2.out' }, '+=0.4')
    // parallax only starts once the entrance choreography has fully settled
    .call(initParallax);
}

// ==========================================================================
// MENU OVERLAY — full-screen curtain reveal
// Reuses the Hero's clip-path curtain technique, but with its own snappier
// ease and as reusable open/close functions (not a one-shot timeline) since
// the trigger can be clicked repeatedly. menuTl is tracked so a click mid-
// animation cleanly kills the in-progress tween instead of stacking.
// ==========================================================================

let menuOverlay, menuStaggerItems, menuTl;

function cacheMenuRefs() {
  menuOverlay = document.getElementById('menu-overlay');
  menuStaggerItems = document.querySelectorAll('.js-menu-stagger');
}

function setInitialMenuState() {
  if (!menuOverlay) return;
  gsap.set(menuOverlay, { clipPath: 'inset(0% 0% 100% 0%)' });
  gsap.set(menuStaggerItems, { opacity: 0, y: 12 });
}

function openMenu() {
  if (!menuOverlay) return;
  if (menuTl) menuTl.kill();
  document.body.classList.add('menu-is-open');

  if (reducedMotion) {
    gsap.set(menuOverlay, { clipPath: 'inset(0% 0% 0% 0%)' });
    gsap.set(menuStaggerItems, { opacity: 1, y: 0 });
    return;
  }

  gsap.set(menuStaggerItems, { opacity: 0, y: 12 });
  // reset the close icon's bars to the resting hamburger so the hamburger
  // -> X morph below can replay cleanly on every open
  const closeIconBar1 = document.querySelector('.menu-overlay__close-icon-bar--1');
  const closeIconBar2 = document.querySelector('.menu-overlay__close-icon-bar--2');
  if (closeIconBar1) closeIconBar1.style.transform = '';
  if (closeIconBar2) closeIconBar2.style.transform = '';
  menuTl = gsap.timeline();
  menuTl
    .to(menuOverlay, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, ease: 'power3.out' })
    .to(menuStaggerItems, { opacity: 1, y: 0, duration: 0.5, stagger: 0.06, ease: 'sine.out' }, '+=0.15');

  // The hamburger -> X morph plays once automatically here, no hover
  // involved. Driven as a plain numeric progress value (not GSAP's rotate/
  // x shorthand) because GSAP computes its own SVG transform-origin for
  // those, ignoring the CSS transform-box: view-box / transform-origin:
  // 18px 18px setup and landing the pivot in the wrong place. Writing the
  // exact same transform string that already works correctly via pure CSS
  // sidesteps that entirely.
  if (closeIconBar1 && closeIconBar2) {
    const morph = { p: 0 };
    menuTl.to(morph, {
      p: 1,
      duration: 0.5,
      ease: 'expo.out',
      onUpdate: () => {
        closeIconBar1.style.transform = `rotate(${45 * morph.p}deg) translateX(${10.2163 * morph.p}px)`;
        closeIconBar2.style.transform = `rotate(${-45 * morph.p}deg) translateX(${-10.2163 * morph.p}px)`;
      },
    }, '<');
  }
}

function closeMenu() {
  if (!menuOverlay) return;
  if (menuTl) menuTl.kill();
  document.body.classList.remove('menu-is-open');

  if (reducedMotion) {
    gsap.set(menuOverlay, { clipPath: 'inset(0% 0% 100% 0%)' });
    gsap.set(menuStaggerItems, { opacity: 0, y: 12 });
    return;
  }

  // If closed before the open timeline's hamburger->X morph finished
  // playing, killing menuTl above leaves the bars frozen mid-rotation —
  // snap them straight to the clean, fully-formed X so closing never
  // shows a half-turned, asymmetric icon while it fades out.
  const closeIconBar1 = document.querySelector('.menu-overlay__close-icon-bar--1');
  const closeIconBar2 = document.querySelector('.menu-overlay__close-icon-bar--2');
  if (closeIconBar1) closeIconBar1.style.transform = 'rotate(45deg) translateX(10.2163px)';
  if (closeIconBar2) closeIconBar2.style.transform = 'rotate(-45deg) translateX(-10.2163px)';

  menuTl = gsap.timeline();
  menuTl
    .to(menuStaggerItems, { opacity: 0, y: 12, duration: 0.2, ease: 'sine.out' }, 0)
    .to(menuOverlay, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.2, ease: 'power3.out' }, 0);
}

function initMenuOverlay() {
  const trigger = document.querySelector('.hero__menu-btn');
  const closeIcon = document.querySelector('.menu-overlay__close-icon');
  if (!trigger || !menuOverlay) return;

  trigger.addEventListener('click', () => {
    const isOpen = document.body.classList.contains('menu-is-open');
    trigger.setAttribute('aria-expanded', String(!isOpen));
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  if (closeIcon) {
    // Static X, no hover morph — just closes the menu. Nothing else to
    // animate or lock here.
    closeIcon.addEventListener('click', () => {
      trigger.setAttribute('aria-expanded', 'false');
      closeMenu();
    });
  }
}

// ==========================================================================
// PRELOADER — "The Focusing Logo"
// The 8 letters (img/logo-letter-1.svg..8.svg) animate purely through the
// CSS `@keyframes animateBlur` (exactly 3 passes, animation-fill-mode:
// forwards) + per-letter `animation-delay` (style.css) — GSAP never sets
// opacity/filter on them, so nothing fights the keyframe animation. This
// just times a delayed call off the same durations (last letter's stagger
// + its 3-pass animation length + the requested 0.75s hold), then hands
// off to runHeroEntrance(), which removes the preloader once the curtain
// has visually climbed up and covered it.
// ==========================================================================

const LETTER_STAGGER = 0.12; // must match `calc(0.12s * var(--i))` in CSS
const LETTER_ANIM_DURATION = 2.0; // must match `animateBlur 2.0s` in CSS
const LETTER_ANIM_PASSES = 3; // must match the `3` iteration-count in CSS
const LETTER_HOLD = 0.75; // requested 0.75s pause after the 3rd pass

function initPreloader() {
  const preloader = document.getElementById('preloader');
  if (!preloader) return;

  const letters = preloader.querySelectorAll('.preloader__logo span');

  if (reducedMotion || !hasGSAP || !letters.length) {
    document.body.classList.remove('is-preloading');
    preloader.remove();
    return;
  }

  const totalSeconds = LETTER_STAGGER * letters.length + LETTER_ANIM_DURATION * LETTER_ANIM_PASSES + LETTER_HOLD;

  gsap.delayedCall(totalSeconds, runHeroEntrance);
}

// ==========================================================================
// INIT
// ==========================================================================

cacheHeroRefs();
cacheMenuRefs();
if (hasGSAP) {
  setInitialHeroStates();
  setInitialMenuState();
}
initPreloader();
initCustomCursor();
initMenuOverlay();
// initParallax() is triggered by runHeroEntrance() once the master
// entrance timeline finishes, not eagerly here.
