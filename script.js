// ==========================================================================
// SETUP
// ==========================================================================

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const hasGSAP = typeof window.gsap !== 'undefined';

if (hasGSAP && window.ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);
}

// ==========================================================================
// FLUID UNIT CALIBRATION
// --u is the layout's scale factor ("one Figma unit = this many pixels").
// Its CSS fallback is `100vw / 1920`, but 100vw INCLUDES the scrollbar while
// every section is `width: 100%`, which does not — so the ruler ran ~15px
// longer than the canvas it measured. A section came out 1884u wide instead
// of 1920u, and anything meant to sit 50u from the right edge landed at
// about 14u instead.
//
// Recomputing from documentElement.clientWidth (scrollbar excluded) makes a
// full-width section exactly 1920u, which is what every Figma coordinate in
// this stylesheet assumes. Nothing needs its own compensation afterwards.
// ==========================================================================

let lastCalibratedWidth = 0;

function calibrateFluidUnit() {
  const width = document.documentElement.clientWidth;
  if (!width || width === lastCalibratedWidth) return;

  lastCalibratedWidth = width;
  document.documentElement.style.setProperty('--u', `${width / 1920}px`);

  // the layout just rescaled under every trigger's feet
  if (hasGSAP && window.ScrollTrigger) ScrollTrigger.refresh();
}

calibrateFluidUnit();

// A ResizeObserver on <html>, not just a resize listener: when this script
// first runs the page is still only as tall as the preloader, so there is no
// vertical scrollbar yet and clientWidth momentarily equals the full window
// width. The scrollbar appears once the real content lands — which fires no
// resize event at all — and that is exactly the moment the calibration has
// to be redone. Guarded by lastCalibratedWidth so it is a no-op otherwise.
if (typeof ResizeObserver !== 'undefined') {
  new ResizeObserver(calibrateFluidUnit).observe(document.documentElement);
} else {
  window.addEventListener('load', calibrateFluidUnit);
}

window.addEventListener('resize', calibrateFluidUnit);

// The ResizeObserver above only re-triggers ScrollTrigger.refresh() when
// clientWidth changes — calibrateFluidUnit() explicitly skips a height-only
// change. But images without reserved dimensions (steps__art-img, the
// philosophy/gallery photos, etc.) keep growing the document's total
// height as they finish loading, well after the init-time refresh() at the
// bottom of this file already ran and cached every ScrollTrigger's
// position. Every trigger below the last image to load ends up measured
// against a page that's shorter than its final height — the exact same
// symptom as the gallery-pin timing bug, just from a different cause. One
// unconditional refresh once every asset has actually loaded corrects it.
window.addEventListener('load', reRefreshCtaTrigger);

// Same reasoning, different cause: the 16 custom Helvetica Neue weights
// swap in via @font-face after the fallback font has already laid text
// out, and that swap isn't guaranteed to happen before 'load' fires. Any
// metric difference between the fallback and the real face reflows text
// height further, again after ScrollTrigger has already cached positions.
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(reRefreshCtaTrigger);
}

// .cta used to be the last section, so it inherited the largest accumulated
// drift from every image/video that loads late above it — the global
// ScrollTrigger.refresh() calls above don't fully correct it: verified
// live that this specific trigger's .start stayed frozen ~740px short of
// its correct position even across repeated global refresh() calls (incl.
// refresh(true)) fired from 'load'/fonts.ready, while calling .refresh()
// on the TRIGGER INSTANCE directly, well after those, snapped it to the
// right value immediately. Also measured the page's real layout still
// settling for several SECONDS after 'load' (document.body kept growing —
// probed live: 13035 -> 12913 between the 2s and 4s marks with nothing
// else happening), so a one-shot re-refresh timed off 'load'/fonts.ready
// isn't late enough on its own either.
//
// Fix: a ResizeObserver on document.body (not documentElement/
// calibrateFluidUnit's — that one only reacts to WIDTH changes) catches
// this late growth whenever it actually finishes, however long it takes,
// and re-refreshes both the whole page and this one instance right after.
// .faq inherited this drift when it became the last section (her report:
// block 12 had "already appeared" by the time she scrolled to it, same
// symptom block 11 had before this function existed) — this function
// refreshes faqEntranceTrigger for exactly that. .social got the same
// treatment when IT was briefly the last section; .footer is now the
// actual last section, so it needs it too — see footerEntranceTrigger below.
function reRefreshCtaTrigger() {
  if (hasGSAP && window.ScrollTrigger) ScrollTrigger.refresh();
  if (typeof ctaEntranceTrigger !== 'undefined' && ctaEntranceTrigger) ctaEntranceTrigger.refresh();
  // guarded by progress < 1, unlike ctaEntranceTrigger above: .faq contains
  // the accordion, whose own open/close grows or shrinks document.body and
  // fires this SAME function via the ResizeObserver below, every time —
  // calling .refresh() on a scrollTrigger whose linked animation already
  // finished playing (invalidateOnRefresh:true + once:true) resets that
  // animation's progress back to 0, replaying the whole section's entrance
  // on every single click. Confirmed live: .animation.progress() flips
  // 1 -> 0 the instant .refresh() runs post-completion. The guard keeps the
  // original fix (correcting the trigger's position before it has fired)
  // while no-op'ing once it has, so accordion clicks stop retriggering it.
  if (
    typeof faqEntranceTrigger !== 'undefined' && faqEntranceTrigger
    && faqEntranceTrigger.animation && faqEntranceTrigger.animation.progress() < 1
  ) {
    faqEntranceTrigger.refresh();
  }
  // same guard, same reasoning — .social has no accordion, but the carousel
  // images/video finishing their own late load can still grow document.body
  // after the first refresh, same class of drift.
  if (
    typeof socialEntranceTrigger !== 'undefined' && socialEntranceTrigger
    && socialEntranceTrigger.animation && socialEntranceTrigger.animation.progress() < 1
  ) {
    socialEntranceTrigger.refresh();
  }
  // same guard, same reasoning — .footer is the new actual last section.
  if (
    typeof footerEntranceTrigger !== 'undefined' && footerEntranceTrigger
    && footerEntranceTrigger.animation && footerEntranceTrigger.animation.progress() < 1
  ) {
    footerEntranceTrigger.refresh();
  }
}

if (typeof ResizeObserver !== 'undefined') {
  new ResizeObserver(reRefreshCtaTrigger).observe(document.body);
}

// ==========================================================================
// SMOOTH SCROLL — Lenis, wired into the GSAP ticker + ScrollTrigger
// ==========================================================================

// module-scope so initScrollDownArrows() can hand its jumps to the same
// instance — a native window.scrollTo({behavior:'smooth'}) would run its
// own animation while Lenis keeps driving scroll from the GSAP ticker, and
// the two fight over the same scroll position
let lenis;

(function initLenis() {
  if (reducedMotion || typeof window.Lenis === 'undefined') return;

  lenis = new Lenis({
    // 1.2 -> 1.6: she asked for a slightly heavier, more viscous scroll —
    // "совсем чуток, но чтоб было заметно". Duration is what governs how
    // long the wheel impulse keeps gliding, so a ~33% longer glide reads
    // as weight without becoming sluggish.
    duration: 1.6,
    // exponent 10 -> 7: a softer exponential tail. The curve still settles
    // (it is the same expo.out family the rest of the site eases with),
    // but decelerates over a longer stretch instead of snapping to a stop,
    // which is the "тягучий" part rather than merely the slower part.
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -7 * t)),
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

// Recursive variant of splitWords(): descends INTO element children instead
// of treating each one as a single unit. .material__text wraps whole phrases
// in colour-tier spans, so the flat splitter would have made
// "вчить вас терпінню, відкриває" one indivisible "word" and the per-word
// reveal would have lit four words at once. This keeps the spans (and their
// colours) intact while still wrapping every individual word inside them.
function splitWordsDeep(el) {
  const words = [];

  function walk(node) {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const parts = child.textContent.split(/(\s+)/);
        const frag = document.createDocumentFragment();
        parts.forEach((part) => {
          if (part === '') return;
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(part));
            return;
          }
          const span = document.createElement('span');
          span.className = 'word';
          span.textContent = part;
          frag.appendChild(span);
          words.push(span);
        });
        node.replaceChild(frag, child);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        walk(child);
      }
    });
  }

  walk(el);
  return words;
}

// ==========================================================================
// GLASS CURSOR — Figma's Glass effect (node 978:1272) rebuilt as an SVG
// refraction filter for .cursor__media's backdrop.
//
// The maths is lifted from Figma's own refraction shader rather than
// eyeballed: a height field over the circle is differentiated into surface
// normals, and each colour channel is refracted through its own IOR before
// the backdrop is sampled at the offset. See the <filter> comment in
// index.html for the channel ratios.
//
// This only generates the normal map (once — it is a PNG stretched to
// whatever size the bubble currently is, so it never needs rebuilding) and
// keeps the three displacement `scale`s in sync with the bubble's real px
// size, since --u rescales it on every viewport change.
// ==========================================================================

// Figma's Refraction/Depth sliders are not CSS px and its Glass effect is
// not the library shader, so these two are the mockup values converted by
// factors calibrated against the Figma render (verified side by side in the
// browser). They are the only two knobs worth touching if the bubble ever
// needs to read stronger or weaker:
//   Figma Refraction 44 -> displacement scale = 10% of the bubble's diameter
//   Figma Depth 73      -> bevel reaches 23.4% of the radius inward
// Raising either exaggerates the rainbow fringe fast — at 44% of the
// diameter it stops reading as glass and starts reading as a soap bubble.
const GLASS_REFRACTION_SCALE = 0.10;
const GLASS_BEVEL = 0.234;

// Dispersion 35 needs no calibration — it falls straight out of the shader.
// (ior - 1) for iorR/iorG/iorB = 1.333 +/- (35/100 * 0.25), normalised to green.
const GLASS_CHANNEL_RATIOS = [1.2628, 1.0, 0.7372];

// Rendered at 150% of the bubble so it lines up with the filter region
// declared on #glass-refraction; the 25% margin stays neutral grey (no
// displacement) and exists so the rim can pull in real backdrop from
// outside the circle instead of transparent black.
function glassNormalMapDataURL(px) {
  const canvas = document.createElement('canvas');
  canvas.width = px;
  canvas.height = px;

  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(px, px);
  const data = image.data;

  const centre = px / 2;
  const radius = px / 3;               // the bubble itself, inside the 150% region
  const flatUntil = 1 - GLASS_BEVEL;   // normalised radius where the bevel starts

  for (let y = 0; y < px; y++) {
    for (let x = 0; x < px; x++) {
      const dx = x + 0.5 - centre;
      const dy = y + 0.5 - centre;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const t = dist / radius;

      let nx = 0;
      let ny = 0;

      // flat and perfectly clear inside flatUntil, falling away to the edge
      // on a cosine profile: zero slope where the bevel starts (so there is
      // no visible seam) rising to its steepest right at the rim
      if (t > flatUntil && t <= 1 && dist > 0) {
        const slope = Math.sin(((t - flatUntil) / GLASS_BEVEL) * (Math.PI / 2));
        nx = (dx / dist) * slope;
        ny = (dy / dist) * slope;
      }

      const i = (y * px + x) * 4;
      data[i] = Math.round(255 * (0.5 + nx * 0.5));       // R -> x offset
      data[i + 1] = Math.round(255 * (0.5 + ny * 0.5));   // G -> y offset
      data[i + 2] = 128;
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(image, 0, 0);
  return canvas.toDataURL('image/png');
}

function initGlassCursor() {
  const media = document.querySelector('.cursor__media');
  const normalMap = document.getElementById('glass-normal-map');
  if (!media || !normalMap) return;

  const href = glassNormalMapDataURL(384);
  normalMap.setAttribute('href', href);
  // Chrome resolves plain href on feImage, but the xlink form is what older
  // WebKit reads and it costs nothing to set both
  normalMap.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', href);

  const passes = [
    document.getElementById('glass-disp-r'),
    document.getElementById('glass-disp-g'),
    document.getElementById('glass-disp-b'),
  ];

  // feDisplacementMap's scale is in user units (CSS px), so it has to track
  // the bubble's --u-driven size or the refraction would drift out of
  // proportion on any viewport that isn't 1920 wide
  function syncScale() {
    const size = media.offsetWidth;
    if (!size) return;
    const base = GLASS_REFRACTION_SCALE * size;
    passes.forEach((pass, i) => {
      if (pass) pass.setAttribute('scale', (base * GLASS_CHANNEL_RATIOS[i]).toFixed(2));
    });
  }

  syncScale();
  window.addEventListener('resize', syncScale);
}

// ==========================================================================
// CUSTOM CURSOR — glassmorphic "далі" cursor for media elements
// Opted into per element with .js-cursor-media + data-cursor-label: the
// block-3 video toggle ("стоп"/"грати") and every gallery work ("далі").
// Deliberately nothing else — over plain backgrounds and non-clickable
// imagery the cursor stays the small dot.
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

    const themedEl = event.target.closest('[data-cursor-theme]');
    const isLight = themedEl && themedEl.dataset.cursorTheme === 'light';
    document.body.classList.toggle('cursor-on-light', !!isLight);
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
// SECTION SCROLL LAG
// The site-wide transition between blocks. As a section scrolls out at the
// top, its CONTENT drifts downward at half the page's speed, so it visibly
// lags behind its own background instead of leaving with it.
//
// Parameters are copied verbatim from rejouice.com's hero timeline (Nuxt
// chunk BdSAQIjB.js) — the reference she was pointing at:
//
//   .fromTo(logo, {y:0}, {y: () => hero.offsetHeight * 0.5, ease:"none"})
//   scrollTrigger: {trigger: hero, scrub:true, start:"top top",
//                   end:"bottom top", invalidateOnRefresh:true}
//
// No opacity: the fade-out every section used to have is gone at her
// request — the drift alone carries the transition now.
//
// Always targets a section's CHILDREN, never the section element itself.
// For .hero that is critical rather than stylistic: a transform on .hero
// gives it its own stacking context and re-breaks the preloader/curtain
// z-index trick (see runHeroEntrance()). .hero__bg is excluded so the
// backdrop keeps moving at full page speed — that difference in rate IS
// the effect. .clay__bg is likewise left outside its
// section's wrapper: it has its own ±50% drift in initClayVideoParallax().
//
// For every section except .hero the target is a single `.section-inner`
// wrapper rather than a list of children. Driving the children directly
// put this scrubbed tween and the section's entrance timeline on the same
// `y` of the same elements, and they overwrote each other — the visible
// symptom was block 2's images never settling into place. One transform
// per element, one owner per transform.
// ==========================================================================

function applySectionLag(sectionSelector, childrenSelector, options) {
  const section = document.querySelector(sectionSelector);
  if (!section || !document.querySelector(childrenSelector)) return;

  const clampToSection = !(options && options.clampToSection === false);

  // How far the content may drift. rejouice's flat 0.5 * section height
  // works there because the element they lag sits at the TOP of its
  // section (their logo bottom is ~200px into a 972px block, so it never
  // reaches the bottom edge). Every block here is bottom-anchored instead
  // — block 3's title rests just 62px above its section's edge — so the
  // same 0.5 pushed content straight through `overflow:hidden` and sliced
  // it in half, which is the "вёрстка сломалась" she saw. Capping at the
  // real slack below the lowest element keeps the drift as generous as the
  // layout allows without ever clipping.
  const driftDistance = () => {
    const full = section.offsetHeight * 0.5;
    if (!clampToSection) return full;

    const wrapper = section.querySelector('.section-inner');
    const measured = wrapper ? Array.from(wrapper.children) : [];
    if (!measured.length) return full;

    let lowest = 0;
    measured.forEach((el) => {
      const bottom = el.offsetTop + el.offsetHeight;
      if (bottom > lowest) lowest = bottom;
    });

    // 2px of slack kept in hand: offsetTop/offsetHeight round to integers
    // while the drift is sub-pixel, and without it block 3 still shaved a
    // single pixel off its lowest line.
    return Math.max(0, Math.min(full, section.offsetHeight - lowest - 2));
  };

  gsap.to(childrenSelector, {
    y: driftDistance,
    ease: 'none',
    scrollTrigger: {
      trigger: sectionSelector,
      start: 'top top',
      end: 'bottom top',
      scrub: true,
      invalidateOnRefresh: true,
    },
  });
}

// .hero is handled separately (and only from runHeroEntrance(), never
// eagerly at load) for the stacking-context reason above; the rest can be
// wired up at init.
function initHeroScrollLag() {
  if (reducedMotion || !hasGSAP || !window.ScrollTrigger) return;
  // clampToSection:false — .hero has no .section-inner to measure against
  // (its bg/vase must stay outside any wrapper), and this is the one block
  // whose motion she has already signed off on, so it keeps the full 0.5.
  //
  // .hero__vase-scene is IN the lag now. What makes the next section's beige
  // field appear to cover the Hero on scroll-out is not z-order — .hero is
  // overflow:hidden, nothing can escape it — it is the lag: the children
  // hang back while the section's own bottom edge rises past them, so they
  // are eaten by that edge. The vase and table were the one group excluded,
  // so they simply scrolled away at page speed and were never covered.
  // Only .hero__bg stays out; it is the backdrop the lag is measured against.
  //
  // Safe despite the stacking-context rule above: that rule is about .hero
  // itself and any ANCESTOR of .hero__bg. .hero__vase-scene is .hero__bg's
  // sibling, so a transform on it cannot come between .hero__bg and the
  // body-level preloader.
  applySectionLag('.hero', '.hero > *:not(.hero__bg)', { clampToSection: false });
}

function initSectionScrollLag() {
  if (reducedMotion || !hasGSAP || !window.ScrollTrigger) return;

  // each targets that section's single .section-inner wrapper, never the
  // individual children — see applySectionLag()'s header for why
  applySectionLag('.craft', '.craft > .section-inner');
  applySectionLag('.clay', '.clay > .section-inner');
  applySectionLag('.material', '.material > .section-inner');
  applySectionLag('.steps', '.steps > .section-inner');
  // .stories is deliberately NOT lagged, same reason .gallery isn't: both
  // are pinned for a scrubbed carousel, and a second scrub trying to drift
  // the same section's content on top of that pin fights it — visible as
  // the header/cards drifting vertically while the carousel is also
  // panning them horizontally. Added once when this was still a static
  // block, removed again the moment initStoriesCarousel() made it a
  // pinned one.
}

// ==========================================================================
// MASTER ENTRANCE TIMELINE
// hero__bg reveals via a clip-path curtain (top-to-bottom), concurrently
// with the preloader fading out over it; every other element is set to
// its own hidden state on load and reveals afterward in sequence.
// ==========================================================================

let heroBg, nav, menuBtn, menuLineOut, titleImg, titleMobileImgs, eyebrowWords,
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
  // mobile-only H1 (5 line images, .hero__title-mobile) — hidden/no-op on
  // desktop, animates alongside titleImg at the same 'h1Start' label
  titleMobileImgs = document.querySelectorAll('.hero__title-mobile img');
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
  // never clobber the translateX(-50%) that used to sit in CSS — desktop
  // only. Mobile's CTA is left-aligned at 20px (Figma metadata x:20,
  // matching the eyebrow/H1/description column), not centered; a GSAP
  // inline transform always beats a CSS one regardless of specificity, so
  // this must not run at mobile widths or it silently drags the button
  // back to center no matter what style.css says.
  if (!window.matchMedia('(max-width: 768px)').matches) {
    gsap.set(btn, { xPercent: -50 });
  }

  if (reducedMotion) {
    return;
  }

  // inset(top right bottom left): a 100% BOTTOM inset leaves a zero-height
  // strip at the element's top, so animating it to 0 grows the reveal
  // downward — the curtain descends. (The previous 100% TOP inset did the
  // opposite, climbing up from the bottom edge.) Same direction the menu
  // overlay already uses.
  gsap.set(heroBg, { clipPath: 'inset(0% 0% 100% 0%)' });
  // plain pixels, not yPercent — .hero__nav has no CSS rule of its own and
  // collapses to 0 height (its children are all position:absolute), so a
  // yPercent-based offset would resolve to 0 and never actually move.
  // menuBtn used to be excluded from this on mobile as a defensive
  // measure against it looking "stuck" mid-entrance — that was masking
  // the real bug (initPreloader() double-removing #preloader, see
  // runHeroEntrance()'s onComplete), which is now fixed at its source, so
  // menuBtn goes back to animating in with nav like every other element
  // instead of just sitting there un-animated (she noticed and flagged
  // the inconsistency).
  gsap.set([nav, menuBtn], { y: -40, opacity: 0 });
  gsap.set(menuLineOut, { scaleX: 0, transformOrigin: 'left' });
  gsap.set(eyebrowWords, { opacity: 0 });
  gsap.set(titleImg, { y: 30, opacity: 0 });
  gsap.set(titleMobileImgs, { y: 30, opacity: 0 });
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

// The preloader logo settles, then a 0.375s hold (LETTER_HOLD) elapses
// before this timeline is even built. The preloader itself never fades —
// it stays fully opaque and static. .hero__bg is temporarily bumped above
// it in z-index so the curtain's growing revealed region visually climbs
// up and covers it; once the 1.6s curtain tween completes, the preloader
// is removed instantly and .hero__bg's z-index is restored to its normal
// resting value (0) before anything else runs. Everything else is
// strictly sequential from there, each step starting only once the
// previous one has fully finished, plus its own explicit gap. The only
// intentional overlaps are H1+ghost (together at 'h1Start') and
// table+labels+vase (together, at vase's start via '<'):
//   -0.375s (hold)        preloader logo settled, waiting to start
//   0.0s                  curtain rises over the static preloader, 1.6s
//   +0.4s gap             header (nav + menu button drop + menu-line draw-in)
//   +0.11s gap            eyebrow words fade in
//   +0.11s gap, 'h1Start' H1 rises + fades in, ghost fade starts alongside it
//   h1Start+0.98s         vase + table settle in, decorative labels alongside
//   +0.225s gap           description words fade in
//   +0.225s gap           CTA fades/slides up
//   +0.3s gap             scroll arrow fades/slides up last
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
      // Matched to the dropdown menu's curtain (openMenu/closeMenu) rather
      // than rejouice's 1.6/expo.out — her call after comparing the two
      // side by side. Both curtains now share one mechanism AND one
      // setting: clip-path inset top-to-bottom, 1.2s, power3.out.
      duration: 1.2,
      ease: 'power3.out',
      onComplete: () => {
        document.body.classList.remove('is-preloading');
        // null on mobile: initPreloader()'s isMobile branch already
        // removed #preloader from the DOM before calling this function
        // (it skips the letter animation entirely), so re-querying it
        // here finds nothing — .remove() on null threw on every mobile
        // page load until this guard.
        if (preloader) preloader.remove();
        gsap.set(heroBg, { zIndex: 0 });
      },
    }, 0)
    // Everything from here down is 30% faster (all durations/stagger/offsets
    // × 0.7) per her explicit spec — the curtain reveal above is left alone,
    // it's shared infrastructure locked to the menu overlay's own curtain
    // timing (see [[project-artefact-block4-motion]]), not a per-element
    // appearance beat.
    .to([nav, menuBtn], { y: 0, opacity: 1, duration: 0.63, ease: 'power2.out' }, '+=0.28')
    .to(menuLineOut, {
      scaleX: 1,
      duration: 0.49,
      ease: 'power2.out',
      onComplete: () => gsap.set(menuLineOut, { clearProps: 'transform,transformOrigin' }),
    }, '-=0.21')
    .to(eyebrowWords, { opacity: 1, duration: 0.7, stagger: 0.056, ease: 'sine.out' }, '+=0.077')
    .addLabel('h1Start', '+=0.077')
    .to(titleImg, { y: 0, opacity: 1, duration: 0.7, ease: 'power2.out' }, 'h1Start')
    .to(titleMobileImgs, { y: 0, opacity: 1, duration: 0.7, stagger: 0.08, ease: 'power2.out' }, 'h1Start')
    .to(ghost, { opacity: 1, scale: 1, duration: 1.68, ease: 'sine.out' }, 'h1Start')
    .to(vase, {
      y: 0,
      scale: 1,
      opacity: 1,
      duration: 0.77,
      ease: 'power2.out',
      onComplete: startVaseBreathe,
    }, 'h1Start+=0.686')
    .to(table, { opacity: 1, y: 0, duration: 0.77, ease: 'power2.out' }, '<')
    .to(labels, { opacity: 1, scale: 1, duration: 0.7, stagger: 0.042, ease: 'sine.out' }, '<')
    .to(descWords, { opacity: 1, duration: 0.63, stagger: 0.056, ease: 'sine.out' }, '+=0.1575')
    .to(btn, { y: 0, opacity: 1, duration: 0.63, ease: 'power2.out' }, '+=0.1575')
    .to(scrollArrow, { y: 0, opacity: 1, duration: 0.49, ease: 'power2.out' }, '+=0.21')
    // parallax only starts once the entrance choreography has fully settled;
    // the scroll-lag ScrollTrigger is created here too (not eagerly at
    // load) — creating it any earlier puts an inline transform on .hero
    // from frame 1, which gives .hero its own stacking context and traps
    // heroBg's z-index:10000 boost inside it, so it can never actually
    // outrank the preloader (a body-level sibling) and the curtain never
    // visibly rises above the still-opaque preloader
    .call(initParallax)
    .call(initHeroScrollLag);
}

// ==========================================================================
// CRAFT SECTION — scroll-triggered entrance
// Mirrors the Hero's own load-entrance ordering (message first, then
// visuals, then supporting content, CTA last), but triggered by scroll
// position instead of page load, and plays once. Plain fade/rise only —
// no pin, no scrub, no clip-path curtain between sections.
// ==========================================================================

let craftSection, craftHeadingLines, craftArt1, craftArt2Frame, craftBody,
  craftSideText, craftSideTextWords, craftCta,
  craftHeadingMobile, craftArt1Mobile, craftArt2Mobile, craftSideTextMobile;

function cacheCraftRefs() {
  craftSection = document.querySelector('.craft');
  craftHeadingLines = document.querySelectorAll('.craft__heading-line');
  craftArt1 = document.querySelector('.craft__art-1');
  craftArt2Frame = document.querySelector('.craft__art-2-frame');
  craftBody = document.querySelector('.craft__body');
  craftSideText = document.querySelector('.craft__side-text');
  craftCta = document.querySelector('.craft__cta');

  craftSideTextWords = craftSideText ? splitWords(craftSideText) : [];

  // mobile-only equivalents (index.html) — combined into the SAME .to()
  // calls as their desktop counterparts below, not a separate timeline:
  // hidden-on-mobile desktop elements animate harmlessly off-screen,
  // hidden-on-desktop mobile elements pick up the same beat for free.
  // .craft__body/.craft__cta need no entry here, they're shared elements
  // already covered by craftBody/craftCta above.
  craftHeadingMobile = document.querySelector('.craft__heading-mobile');
  craftArt1Mobile = document.querySelector('.craft__art-1-mobile');
  craftArt2Mobile = document.querySelector('.craft__art-2-mobile');
  craftSideTextMobile = document.querySelector('.craft__side-text-mobile');
}

function setInitialCraftStates() {
  if (reducedMotion) return;

  gsap.set([craftHeadingLines, craftHeadingMobile], { opacity: 0, y: 30 });
  gsap.set([craftArt1, craftArt2Frame, craftArt1Mobile, craftArt2Mobile], { opacity: 0, y: 120 });
  gsap.set(craftBody, { opacity: 0, y: 12 });
  gsap.set(craftSideTextWords, { opacity: 0 });
  gsap.set(craftSideTextMobile, { opacity: 0, y: 12 });
  gsap.set(craftCta, { opacity: 0, y: 30 });
}

// Same beat structure as runHeroEntrance() (heading -> visuals ->
// supporting content -> CTA), just ScrollTrigger-driven and played once
// instead of on page load. `y` tweens on .craft__art-1/.craft__art-2-frame
// clear their inline transform on complete so no stray inline transform
// is left sitting on the frame afterward (frame itself never animates
// again post-entrance — initMediaImageHover() only ever touches the
// inner image elements, not these frames).
function runCraftEntrance() {
  if (reducedMotion || !hasGSAP || !window.ScrollTrigger || !craftSection) return;

  gsap.timeline({
    scrollTrigger: {
      trigger: craftSection,
      start: 'top 80%',
      once: true,
    },
  })
    .to([craftHeadingLines, craftHeadingMobile], { opacity: 1, y: 0, duration: 1.0, stagger: 0.1, ease: 'power2.out' })
    .to([craftArt1, craftArt2Frame, craftArt1Mobile, craftArt2Mobile], {
      opacity: 1,
      y: 0,
      duration: 1.4,
      stagger: 0.1,
      ease: 'power4.out',
      onComplete: () => gsap.set([craftArt1, craftArt2Frame, craftArt1Mobile, craftArt2Mobile], { clearProps: 'transform' }),
    }, '+=0.15')
    // Heading/images stay as-is (her call, "отличная скорость") — body,
    // side text and especially the CTA had too much dead wait before them.
    // Both were chained with '+=0.15' (start AFTER the previous beat's own
    // stagger-duration had fully finished playing), which compounds badly
    // when the previous beat has a multi-word stagger (craftSideTextWords):
    // the CTA wasn't just waiting 0.15s, it was waiting for every side-text
    // word's individual fade to finish first. Overlapping instead of
    // trailing removes that compounding wait.
    .to(craftBody, { opacity: 1, y: 0, duration: 0.6, ease: 'sine.out' }, '-=0.6')
    .to(craftSideTextWords, { opacity: 1, duration: 0.8, stagger: 0.06, ease: 'sine.out' }, '<')
    .to(craftSideTextMobile, { opacity: 1, y: 0, duration: 0.6, ease: 'sine.out' }, '<')
    .to(craftCta, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' }, '-=0.5');
}

// ==========================================================================
// CLAY SECTION — scroll-triggered entrance
// Beat order per her spec: video first, then the "ваші руки..." word row,
// then the title, then the left-side caption. Each beat reuses an
// already-established tween recipe verbatim from elsewhere in the site,
// not a new invention: video = scale-settle fade (her chosen option, no
// direct precedent elsewhere); words = same as .hero__eyebrow's
// splitWords() stagger (these are already separate elements, so no
// splitWords() call needed here); title = same as .hero__title-img;
// caption = same as .craft__body.
// ==========================================================================

let claySection, clayVideo, clayWords, clayTitle, clayCaption,
  clayVignetteMobile, clayBodyMobile, clayTitleMobileImgs;

function cacheClayRefs() {
  claySection = document.querySelector('.clay');
  clayVideo = document.querySelector('.clay__bg');
  clayWords = document.querySelectorAll('.clay__word');
  clayTitle = document.querySelector('.clay__title');
  clayCaption = document.querySelector('.clay__caption');

  // mobile-only (index.html) — .clay__caption above is already shared
  // with desktop and needs no separate entry.
  clayVignetteMobile = document.querySelector('.clay__vignette-mobile');
  clayBodyMobile = document.querySelector('.clay__body-mobile');
  clayTitleMobileImgs = document.querySelectorAll('.clay__title-mobile img');
}

function setInitialClayStates() {
  if (reducedMotion) return;

  // 1.25 (not the earlier 1.08): on a full-bleed cover video there are no
  // edges for the eye to reference, so a small scale change reads as
  // nothing at all — the amplitude has to be obvious to register
  gsap.set(clayVideo, { scale: 1.25, opacity: 0 });
  gsap.set(clayVignetteMobile, { opacity: 0 });
  gsap.set(clayWords, { opacity: 0 });
  gsap.set(clayBodyMobile, { opacity: 0, y: 12 });
  gsap.set(clayTitle, { y: 30, opacity: 0 });
  gsap.set(clayTitleMobileImgs, { y: 30, opacity: 0 });
  gsap.set(clayCaption, { opacity: 0, y: 12 });
}

function runClayEntrance() {
  if (reducedMotion || !hasGSAP || !window.ScrollTrigger || !claySection) return;

  // The video gets its own trigger at 'top bottom' — the instant the section
  // edges into the viewport. It used to be the first step of the timeline
  // below, which fires at 'top 40%', so the block spent the first 60% of a
  // viewport's worth of scrolling showing nothing but its flat background
  // colour before the footage appeared. The zoom-out itself is unchanged.
  gsap.to(clayVideo, {
    scale: 1,
    opacity: 1,
    duration: 1.6,
    ease: 'power2.out',
    scrollTrigger: { trigger: claySection, start: 'top bottom', once: true },
  });

  // vignette fades in alongside the video (same trigger/timing) rather
  // than scaling with it — it's a static full-bleed darken layer, not
  // footage, so only opacity is animated.
  gsap.to(clayVignetteMobile, {
    opacity: 1,
    duration: 1.6,
    ease: 'power2.out',
    scrollTrigger: { trigger: claySection, start: 'top bottom', once: true },
  });

  gsap.timeline({
    scrollTrigger: {
      trigger: claySection,
      // 'top 40%', not the 'top 80%' used elsewhere: at 80% the section has
      // only just crept in from the bottom (~a third of it visible, and the
      // TOP third — while the words/title sit at its bottom), so these beats
      // played off-screen and were never actually seen.
      start: 'top 40%',
      once: true,
    },
  })
    // .clay__body-mobile sits at the very top of the mobile layout (the
    // first content a scroller reaches), so it leads on mobile the same
    // way clayWords leads on desktop.
    .to(clayBodyMobile, { opacity: 1, y: 0, duration: 0.6, ease: 'sine.out' })
    // clayWords (center word row) untouched — only the title (heading) and
    // clayCaption (the right-side text) needed to come in a bit faster.
    .to(clayWords, { opacity: 1, duration: 1.0, stagger: 0.08, ease: 'sine.out' }, '<')
    .to([clayTitle, clayTitleMobileImgs], { y: 0, opacity: 1, duration: 0.8, stagger: 0.08, ease: 'power2.out' }, '+=0.05')
    .to(clayCaption, { opacity: 1, y: 0, duration: 0.5, ease: 'sine.out' }, '+=0.05');
}

// ==========================================================================
// MATERIAL SECTION — "4_глина це" motion
// Her choreography, in three beats:
//   1. "( глина )" appears first, reusing the Hero eyebrow's word stagger.
//   2. The blurred echo behind the paragraph assembles: its words start
//      pushed out to the left and right and converge into place on scroll.
//   3. The main paragraph fades in, then its words light up one by one as
//      you keep scrolling.
//
// Beat 3's reveal is copied verbatim from kasiasiwosz.com, which she
// pointed at — their inline Webflow script for [animate="word"]:
//
//   const split = new SplitText(el, {type:"words", wordsClass:"word"});
//   gsap.fromTo(split.words, {opacity:0.3},
//     {opacity:1, ease:"power2.out", stagger:0.1,
//      scrollTrigger:{trigger:el, start:"top 80%", end:"top 35%",
//                     scrub:true}});
//
// Same values here, with the range shifted later ('top 55%' -> 'top 20%')
// so it starts after the paragraph itself has arrived rather than while it
// is still fading in. SplitText is a paid GSAP plugin the project doesn't
// load, so splitWordsDeep() stands in for it.
//
// The paragraph's own fade uses the CONTAINER's opacity while the reveal
// uses each WORD's — the two multiply rather than overwrite, so they
// compose cleanly instead of fighting (the trap that broke block 2).
// ==========================================================================

let materialSection, materialLabel, materialLabelWords,
  materialEcho, materialEchoWords, materialText, materialTextWords;

function cacheMaterialRefs() {
  materialSection = document.querySelector('.material');
  materialLabel = document.querySelector('.material__label');
  materialEcho = document.querySelector('.material__echo');
  materialText = document.querySelector('.material__text');

  // the label's "(" / ")" are element children and stay whole units, same
  // as the Hero eyebrow's own parenthesis
  materialLabelWords = materialLabel ? splitWords(materialLabel) : [];
  materialEchoWords = materialEcho ? splitWordsDeep(materialEcho) : [];
  materialTextWords = materialText ? splitWordsDeep(materialText) : [];
}

// Each echo word starts displaced horizontally in proportion to how far it
// already sits from the paragraph's centre — so the line reads as having
// been pulled apart to both sides, and collapses back symmetrically.
// Proportional rather than random keeps it deterministic and makes the
// outer words travel furthest, which is what sells the "assembling" read.
const ECHO_SCATTER = 0.9;

function echoScatterFor(word) {
  if (!materialEcho) return 0;
  const centre = materialEcho.offsetWidth / 2;
  const wordCentre = word.offsetLeft + word.offsetWidth / 2;
  return (wordCentre - centre) * ECHO_SCATTER;
}

function setInitialMaterialStates() {
  if (reducedMotion) return;

  gsap.set(materialLabelWords, { opacity: 0 });
  gsap.set(materialEchoWords, { opacity: 0, x: (i, target) => echoScatterFor(target) });
  gsap.set(materialText, { opacity: 0, y: 12 });
  gsap.set(materialTextWords, { opacity: 0.3 });
}

function runMaterialEntrance() {
  if (reducedMotion || !hasGSAP || !window.ScrollTrigger || !materialSection) return;

  // Beat 1 — label, trigger-once (same recipe as .hero__eyebrow, slowed)
  gsap.to(materialLabelWords, {
    opacity: 1,
    duration: 1.4,
    stagger: 0.14,
    ease: 'sine.out',
    scrollTrigger: { trigger: materialSection, start: 'top 90%', once: true },
  });

  // Beat 2 — echo assembles, scrubbed so she controls it with the wheel.
  // Widened again 2026-08-04: 'top 95%'->'top 45%' (50% of viewport) read as
  // "assembles almost too fast to notice." On a scrubbed tween `duration` is
  // ignored entirely — the scroll DISTANCE between start and end is what
  // sets the pace, so slowing it down means more travel, not a bigger
  // duration. Doubled to 'top 95%'->'top -5%' (100% of viewport).
  gsap.to(materialEchoWords, {
    opacity: 1,
    x: 0,
    // 'power3.out', not 'none'. Under scrub the ease is applied across the
    // scroll range, so a linear one carried the words at a constant rate
    // and then simply stopped — they hit their final position hard. An
    // ease-out decelerates them into place instead.
    ease: 'power3.out',
    scrollTrigger: {
      trigger: materialSection,
      start: 'top 95%',
      end: 'top -5%',
      scrub: true,
      invalidateOnRefresh: true,
    },
  });

  // Beat 3a — the paragraph arrives (same fade+rise as .craft__body, slowed)
  gsap.to(materialText, {
    opacity: 1,
    y: 0,
    duration: 1.0,
    ease: 'sine.out',
    scrollTrigger: { trigger: materialSection, start: 'top 58%', once: true },
  });

  // Beat 3b — kasiasiwosz word-by-word emphasis, widened to 50% of the
  // viewport (from their 35%).
  //
  // What makes this read as languid rather than staccato is the RATIO of
  // `duration` to `stagger`, not either on its own. Under `scrub` the whole
  // timeline is mapped onto the scroll range, so the pair decides how much
  // each word's own fade overlaps its neighbours: 1.4 / 0.3 means a word is
  // still brightening while the next four have begun, blending the wave
  // instead of ticking through it. It was relying on GSAP's default 0.5
  // duration against 0.16 — a tighter ratio, and each word snapped on in
  // about 52px of scrolling where it now takes ~73px.
  //
  // The range runs past .material's own top edge into negative territory,
  // which doubles the travel (50% -> 100% of the viewport) and is exactly
  // the 2x slowdown she asked for. It was impossible while .material was
  // the last section — max scroll landed on its top edge, so anything past
  // 'top 0%' could never be reached. The gallery block below it is what
  // unlocked this; if .gallery is ever removed, this has to come back to
  // roughly 'top 8%' or the sentence will never finish lighting up.
  gsap.to(materialTextWords, {
    opacity: 1,
    ease: 'power2.out',
    duration: 1.4,
    stagger: 0.3,
    scrollTrigger: {
      trigger: materialSection,
      start: 'top 58%',
      end: 'top -45%',
      scrub: true,
    },
  });
}

// ==========================================================================
// CRAFT IMAGES — hover zoom + scroll-linked parallax drift
// Reference: olgaprudka.com's project-grid images — a plain hover scale
// (no cursor-tracking) plus a scroll-linked vertical drift of the image
// within its fixed frame. Rebuilt on GSAP ScrollTrigger (already in the
// project) rather than adding Locomotive Scroll. The frame
// (.craft__art-1/.craft__art-2-frame) itself never moves or scales — a
// fixed box that clips the inner image via its own overflow:hidden. The
// inner image is sized taller than its frame (style.css: height:150%/
// top:-25%) so the -15% yPercent drift below never exposes empty space
// at the frame's bottom edge (the only edge at risk, since the drift is
// one continuous upward shift, never reversing past its start). Hover's
// scale lives in JS/GSAP rather than CSS so it composes cleanly with the
// scroll-drift's own GSAP-driven yPercent on the same element — both are
// separate transform components (scale vs translateY) that GSAP
// composites into one transform automatically, so hovering mid-scroll
// shows the zoom layered on top of whatever drift position is current,
// neither one overriding the other.
// ==========================================================================

// The philosophy section (block 6) gets this same treatment rather than the
// glass cursor — its images are not clickable, so the hover reads as
// "alive" without promising a destination. It ran at a deliberately
// shallower -7 at first; she asked for block 2's effect exactly, so it is
// now the same -15, and .philosophy__img img was re-oversized to craft's
// 150%/-25% to pay for it: the frame's bottom edge stays covered as long as
// the drift in frame-% (yPercent * height/100) stays under the overhang
// below, and 15 * 1.5 = 22.5% against 25% is craft's own margin.
function mediaImageGroups() {
  const groups = [
    { frame: document.querySelector('.craft__art-1'), imgs: document.querySelectorAll('.craft__art-1-img'), drift: -15 },
    { frame: document.querySelector('.craft__art-2-frame'), imgs: document.querySelectorAll('.craft__art-2'), drift: -15 },
    { frame: document.querySelector('.steps__art'), imgs: document.querySelectorAll('.steps__art-img'), drift: -15 },
    { frame: document.querySelector('.free-lesson__media'), imgs: document.querySelectorAll('.free-lesson__media-img'), drift: -15 },
    { frame: document.querySelector('.social__hero-photo'), imgs: document.querySelectorAll('.social__hero-photo-img'), drift: -15 },
  ];

  document.querySelectorAll('.philosophy__img').forEach((frame) => {
    groups.push({ frame, imgs: frame.querySelectorAll('img'), drift: -15 });
  });

  return groups;
}

function initMediaImageHover() {
  if (!hasGSAP) return;

  const isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!isFinePointer) return;

  mediaImageGroups().forEach(({ frame, imgs }) => {
    if (!frame || !imgs.length) return;

    // overwrite:'auto' so a fast in/out cannot leave the enter tween running
    // past the leave tween and strand the image scaled up; 'auto' keeps it
    // off the scroll-parallax's yPercent on the same element
    frame.addEventListener('mouseenter', () => {
      gsap.to(imgs, { scale: 1.05, duration: 0.7, ease: 'power2.out', overwrite: 'auto' });
    });

    frame.addEventListener('mouseleave', () => {
      gsap.to(imgs, { scale: 1, duration: 0.7, ease: 'power2.out', overwrite: 'auto' });
    });
  });
}

function initMediaImageParallax() {
  if (reducedMotion || !hasGSAP || !window.ScrollTrigger) return;

  mediaImageGroups().forEach(({ frame, imgs, drift }) => {
    if (!frame || !imgs.length) return;

    gsap.to(imgs, {
      yPercent: drift,
      ease: 'none',
      scrollTrigger: {
        trigger: frame,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    });
  });
}

// ==========================================================================
// GALLERY + PHILOSOPHY — scroll-triggered entrances (blocks 5 and 6)
//
// Every beat here is an existing recipe reused verbatim, per her spec:
//   eyebrows ("роботи студентів" / "наша філософія" / "наш підхід")
//     -> .hero__eyebrow's splitWords opacity stagger
//   headings (both blocks)              -> .craft__heading-line's fade + rise
//   .gallery__lead, the filter items,
//   and the hover-revealed captions     -> .craft__body's fade + rise
//   .gallery__note                      -> .craft__side-text's word stagger
//
// The philosophy paragraphs (.philosophy__note / .philosophy__lead) were not
// specified; they take the .craft__body recipe as the closest match for body
// copy. Say if they should be word-staggered like the gallery note instead.
//
// Two triggers per block rather than one: .gallery is 1153u tall, so a
// single 'top 80%' trigger would fire the card row while it is still a full
// viewport below the fold — the same mistake the clay section made. The
// heading group gets .gallery, the row group gets .gallery__track.
// ==========================================================================

// how far the gallery images counter-move against the cursor, in u. Must
// stay under the headroom the hover scale creates (2.5% of a 448u card =
// 11.2u) or the image would pull its own edge into the frame
const GALLERY_HOVER_SHIFT = 6;

let gallerySection, galleryEyebrowWords, galleryTitle, galleryLead,
  galleryFilterItems, galleryTrack, galleryPhotos, galleryCaptions,
  galleryNoteWords;
let philTopGroup, philBottomGroup, philEyebrowTopWords, philEyebrowBottomWords,
  philTitleTop, philTitleBottom, philNote, philLead,
  philImgMain, philImgP1, philImgP2, philImgP3;

// Set once initGalleryCarousel() creates the pinned carousel's own
// ScrollTrigger. Every entrance trigger from philosophy onward reads its
// `.end` (see startAfterFloor() below) so none of them can fire while the
// gallery is still pinned — a plain 'top 80%' on those sections fires at
// whatever raw scroll position their own layout implies, with no awareness
// that the gallery's pin holds the viewport still for a long stretch of
// that same scroll distance. Without this, her scroll wheel keeps
// advancing window.scrollY while she's still visually parked on the pinned
// gallery, the entrance timelines fire and finish off-screen, and the
// section shows up already-revealed the moment the pin releases.
let galleryPinTrigger;

// A PREVIOUS, hardcoded `--u`-offset version of this (chaining fixed
// "philosophy's top is roughly pin.end + 1118u, steps is philosophy's
// height further, free-lesson is steps' height further still" constants)
// was tried and is what shipped right before this fix — it's what broke:
// every one of those offset formulas skipped the `- viewportHeight * 0.8`
// term a real "top 80%" trigger needs, so each trigger fired only once the
// element's top reached the very TOP of the viewport (0%) instead of 80%
// down it — visually indistinguishable from "doesn't animate until you've
// scrolled almost past the whole section", which is exactly what she saw
// on blocks 7 and 8. The hardcoded offsets were also a maintenance trap:
// they silently go stale the moment any upstream block's height changes
// (which is exactly how block 8 broke them for block 7 — its own offset
// needed a manual "+1118u correction" nobody could derive without
// re-measuring live).
//
// This version goes back to a LIVE getBoundingClientRect() measurement for
// the "top 80%" part (self-correcting — never needs updating when a
// block's layout changes) and fixes the one real bug an earlier all-live
// attempt in this file's history actually had: a single shared
// `galleryPinTrigger.end` floor applied to every downstream trigger
// collapses them onto the same point whenever more than one of them
// naturally falls inside the gallery's pinned range (which philosophy's
// two groups both do) — so blocks 6 and 7 revealed together instead of in
// sequence. The fix is to chain the floor: each trigger's floor is the
// PREVIOUS trigger's own resolved `.start` (plus a small gap), not a flat
// shared constant — so elements whose natural position already clears the
// previous one just use their own natural "top 80%" position untouched,
// and only the ones that would otherwise fire too early (or out of order)
// get pushed just past whatever comes before them.
function startAfterFloor(el, floorFn) {
  return () => {
    const rect = el.getBoundingClientRect();
    const natural = rect.top + window.scrollY - window.innerHeight * 0.8;
    const floor = floorFn ? floorFn() : 0;
    return Math.max(natural, floor);
  };
}

function afterGalleryPin() {
  return galleryPinTrigger ? galleryPinTrigger.end + 60 : 0;
}

function cacheGalleryRefs() {
  gallerySection = document.querySelector('.gallery');
  const eyebrow = document.querySelector('.gallery__eyebrow');
  galleryEyebrowWords = eyebrow ? splitWords(eyebrow) : [];
  galleryTitle = document.querySelector('.gallery__title');
  galleryLead = document.querySelector('.gallery__lead');
  galleryFilterItems = document.querySelectorAll('.gallery__filter-item');
  galleryTrack = document.querySelector('.gallery__track');
  galleryPhotos = document.querySelectorAll('.gallery__photo');
  galleryCaptions = document.querySelectorAll('.gallery__caption');

  const note = document.querySelector('.gallery__note p');
  galleryNoteWords = note ? splitWords(note) : [];
}

function cachePhilosophyRefs() {
  philTopGroup = document.querySelector('.philosophy__group--top');
  philBottomGroup = document.querySelector('.philosophy__group--bottom');

  const eTop = document.querySelector('.philosophy__eyebrow--light');
  const eBottom = document.querySelector('.philosophy__eyebrow--dark');
  philEyebrowTopWords = eTop ? splitWords(eTop) : [];
  philEyebrowBottomWords = eBottom ? splitWords(eBottom) : [];

  philTitleTop = document.querySelector('.philosophy__title--dark');
  philTitleBottom = document.querySelector('.philosophy__title--light');
  philNote = document.querySelector('.philosophy__note');
  philLead = document.querySelector('.philosophy__lead');

  philImgMain = document.querySelector('.philosophy__img--main');
  philImgP1 = document.querySelector('.philosophy__img--p1');
  philImgP2 = document.querySelector('.philosophy__img--p2');
  philImgP3 = document.querySelector('.philosophy__img--p3');
}

function setInitialGalleryStates() {
  if (reducedMotion) return;

  gsap.set(galleryEyebrowWords, { opacity: 0 });
  gsap.set(galleryTitle, { opacity: 0, y: 30 });
  gsap.set([galleryLead, galleryFilterItems], { opacity: 0, y: 12 });
  // 90, not the 40 this started at: at 40 the rise finished before the eye
  // found it and the row just seemed to be there already
  gsap.set(galleryPhotos, { opacity: 0, y: 90 });
  gsap.set(galleryNoteWords, { opacity: 0 });
  // captions are hover-only from here on; left visible in CSS so a
  // reduced-motion or no-GSAP visit still reads them
  gsap.set(galleryCaptions, { opacity: 0, y: 12 });
}

function setInitialPhilosophyStates() {
  if (reducedMotion) return;

  gsap.set([philEyebrowTopWords, philEyebrowBottomWords], { opacity: 0 });
  gsap.set([philTitleTop, philTitleBottom], { opacity: 0, y: 30 });
  gsap.set([philNote, philLead], { opacity: 0, y: 12 });
  // the craft images' own starting state, per her spec — set on the FRAMES,
  // never the inner <img>, which already carries the hover scale and the
  // scroll-drift's yPercent
  gsap.set([philImgMain, philImgP1, philImgP2, philImgP3], { opacity: 0, y: 120 });
}

function runGalleryEntrance() {
  if (reducedMotion || !hasGSAP || !window.ScrollTrigger || !gallerySection) return;

  gsap.timeline({ scrollTrigger: { trigger: gallerySection, start: 'top 80%', once: true } })
    .to(galleryEyebrowWords, { opacity: 1, duration: 1.0, stagger: 0.08, ease: 'sine.out' })
    .to(galleryTitle, { opacity: 1, y: 0, duration: 1.0, ease: 'power2.out' }, '-=0.8')
    // starts only once the 96u heading beside it has landed. It used to
    // overlap by 0.5s and was simply not seen — a 24u paragraph rising 12px
    // cannot compete with that heading still moving next to it. It also
    // animates to the 0.8 opacity the CSS gives it, not to 1, then hands the
    // property back so the stylesheet stays the source of truth.
    .to(galleryLead, {
      opacity: 0.8,
      y: 0,
      duration: 0.8,
      ease: 'sine.out',
      onComplete: () => gsap.set(galleryLead, { clearProps: 'opacity,transform' }),
    }, '+=0.05');

  gsap.timeline({ scrollTrigger: { trigger: galleryTrack, start: 'top 85%', once: true } })
    // per-item target opacity: the selected filter is dimmed to 0.6 by
    // .is-active, so a flat `opacity: 1` here would light it up and then
    // pop back down on clearProps
    .to(galleryFilterItems, {
      opacity: (i, el) => (el.classList.contains('is-active') ? 0.6 : 1),
      y: 0,
      duration: 0.6,
      stagger: 0.08,
      ease: 'sine.out',
      onComplete: () => gsap.set(galleryFilterItems, { clearProps: 'opacity,transform' }),
    })
    .to(galleryPhotos, {
      opacity: 1,
      y: 0,
      duration: 1.2,
      stagger: 0.1,
      ease: 'power2.out',
      onComplete: () => gsap.set(galleryPhotos, { clearProps: 'transform' }),
    }, '-=0.35')
    .to(galleryNoteWords, { opacity: 1, duration: 0.8, stagger: 0.06, ease: 'sine.out' }, '-=0.85');
}

// Beats run strictly top-to-bottom and barely overlap: her note was that
// everything should arrive in turn and be *noticeable*, which the earlier
// heavy '-=0.8' overlaps defeated — the eye only registers one thing at a
// time. Images use the craft recipe verbatim (y 120, 1.4s, power4.out) and
// clear their transform afterwards so nothing is left sitting on a frame
// that the hover and scroll-drift also touch.
function philImageBeat(target) {
  return {
    opacity: 1,
    y: 0,
    duration: 1.4,
    ease: 'power4.out',
    onComplete: () => gsap.set(target, { clearProps: 'transform' }),
  };
}

// Exposed so runStepsEntrance() can chain its own first trigger's floor to
// wherever philosophy's bottom group actually ended up firing — see
// startAfterFloor()'s header comment for why chaining beats a shared floor.
let philTopTrigger, philBottomTrigger;

function runPhilosophyEntrance() {
  if (reducedMotion || !hasGSAP || !window.ScrollTrigger) return;

  if (philTopGroup) {
    const tl = gsap.timeline({
      scrollTrigger: { trigger: philTopGroup, start: startAfterFloor(philTopGroup, afterGalleryPin), once: true },
    })
      .to(philEyebrowTopWords, { opacity: 1, duration: 0.9, stagger: 0.08, ease: 'sine.out' })
      .to(philTitleTop, { opacity: 1, y: 0, duration: 0.9, ease: 'power2.out' }, '-=0.35')
      .to(philImgMain, philImageBeat(philImgMain), '-=0.35')
      .to(philNote, { opacity: 1, y: 0, duration: 0.6, ease: 'sine.out' }, '-=0.8')
      .to(philImgP1, philImageBeat(philImgP1), '-=0.3');
    philTopTrigger = tl.scrollTrigger;
  }

  if (philBottomGroup) {
    const floor = () => Math.max(afterGalleryPin(), philTopTrigger ? philTopTrigger.start + 80 : 0);
    const tl = gsap.timeline({
      scrollTrigger: { trigger: philBottomGroup, start: startAfterFloor(philBottomGroup, floor), once: true },
    })
      .to(philEyebrowBottomWords, { opacity: 1, duration: 0.9, stagger: 0.08, ease: 'sine.out' })
      .to(philTitleBottom, { opacity: 1, y: 0, duration: 0.9, ease: 'power2.out' }, '-=0.35')
      .to(philLead, { opacity: 1, y: 0, duration: 0.6, ease: 'sine.out' }, '-=0.35')
      .to(philImgP2, philImageBeat(philImgP2), '-=0.25')
      .to(philImgP3, philImageBeat(philImgP3), '-=1.05');
    philBottomTrigger = tl.scrollTrigger;
  }
}

// ==========================================================================
// STEPS SECTION — "7_кроки" scroll-triggered entrance
// Two triggers, same reason the gallery needed two: at 1623u this section
// is tall enough that a single 'top 80%' trigger on the section root would
// fire the card row while it is still most of a viewport below the fold.
// Every beat reuses an existing recipe verbatim, per her spec:
//   heading images (h-step-1/2)   -> .hero__title-img (y30 fade+rise)
//   subheading + each card's "(N)" -> .hero__eyebrow's word stagger
//     (the label's own DIRECT children — the paren+number group, the
//     spacer, the closing paren — are what splitWords() staggers here,
//     same as it does with .material__label's "(" / word / ")")
//   the photo                     -> .craft__art-1's fade+rise (its
//     hover-scale + scroll-drift come from mediaImageGroups() already)
//   card caption + body copy      -> .craft__body's fade+rise
// ==========================================================================

let stepsHeadingImgs, stepsSubheadingWords, stepsList, stepsArtImgs, stepsCards;

function cacheStepsRefs() {
  stepsHeadingImgs = document.querySelectorAll('.steps__heading-img');

  const subheading = document.querySelector('.steps__subheading');
  stepsSubheadingWords = subheading ? splitWords(subheading) : [];

  stepsList = document.querySelector('.steps__list');
  stepsArtImgs = document.querySelectorAll('.steps__art-img');

  stepsCards = Array.from(document.querySelectorAll('.step')).map((step) => {
    const label = step.querySelector('.step__label');
    return {
      step,
      labelWords: label ? splitWords(label) : [],
      caption: step.querySelector('.step__caption'),
      text: step.querySelector('.step__text'),
    };
  });
}

function setInitialStepsStates() {
  if (reducedMotion) return;

  gsap.set(stepsHeadingImgs, { y: 30, opacity: 0 });
  gsap.set(stepsSubheadingWords, { opacity: 0 });
  gsap.set(stepsArtImgs, { opacity: 0, y: 120 });

  stepsCards.forEach(({ labelWords, caption, text }) => {
    gsap.set(labelWords, { opacity: 0 });
    gsap.set([caption, text], { opacity: 0, y: 12 });
  });
}

// Exposed so runFreeLessonEntrance() can chain its own trigger's floor to
// wherever steps' card list actually ended up firing.
let stepsHeaderTrigger, stepsListTrigger;

function runStepsEntrance() {
  if (reducedMotion || !hasGSAP || !window.ScrollTrigger) return;

  const header = document.querySelector('.steps__heading');
  if (header) {
    const floor = () => Math.max(afterGalleryPin(), philBottomTrigger ? philBottomTrigger.start + 80 : 0);
    const headerTl = gsap.timeline({
      scrollTrigger: { trigger: header, start: startAfterFloor(header, floor), once: true },
    })
      .to(stepsHeadingImgs, { y: 0, opacity: 1, duration: 1.0, stagger: 0.12, ease: 'power2.out' })
      .to(stepsSubheadingWords, { opacity: 1, duration: 1.0, stagger: 0.08, ease: 'sine.out' }, '+=0.15');
    stepsHeaderTrigger = headerTl.scrollTrigger;
  }

  if (!stepsList) return;

  // Back to a plain once-triggered timeline, NOT scroll-scrubbed. Scrub was
  // tried specifically to stop a fixed-duration timeline from being outrun
  // by a fast scroll — but confirmed directly with her (she scrolls SLOWLY,
  // reading each card): a scrub ties progress 1:1 to scroll DISTANCE, so it
  // sits frozen every time she pauses to read, and only advances while she's
  // actively moving the wheel. That reads as "still stuck", just for the
  // opposite reason. A once-triggered timeline plays on its own clock
  // regardless of whether she keeps scrolling, which is what a slow/reading
  // scroll pattern actually needs.
  //
  // The ordering bug from the scrub attempt is real regardless of mechanism
  // and stays fixed here: `start` is clamped to never fire before the
  // heading trigger's own start (confirmed live from her recording — card 1
  // was fading in while "ЯК НАРОДЖУЄТЬСЯ КЕРАМІКА" hadn't rendered at all
  // yet), via the same startAfterFloor() chaining every other trigger here
  // uses now.
  const listFloor = () => Math.max(afterGalleryPin(), stepsHeaderTrigger ? stepsHeaderTrigger.start + 80 : 0);
  const listTl = gsap.timeline({
    scrollTrigger: { trigger: stepsList, start: startAfterFloor(stepsList, listFloor), once: true },
  });
  stepsListTrigger = listTl.scrollTrigger;

  listTl.to(stepsArtImgs, {
    opacity: 1,
    y: 0,
    duration: 0.8,
    ease: 'power4.out',
    // clearProps: 'transform' (NOT included, unlike a normal entrance beat)
    // — stepsArtImgs also carries the ongoing scroll-scrubbed yPercent
    // parallax from mediaImageGroups(), still running long after this
    // entrance finishes. Clearing the inline transform out from under a
    // still-active scrub tween is exactly the "дергається" bug already
    // found and fixed on .social__hero-photo (see runSocialEntrance()) —
    // this was the same bug, just never ported over here. Only opacity
    // needs clearing; the parallax already owns `transform` afterward and
    // keeps it correct on its own next tick regardless.
    onComplete: () => gsap.set(stepsArtImgs, { clearProps: 'opacity' }),
  });

  // Each card enters fully on its own, one after another — card2/card3 used
  // to enter as a combined pair (their labels staggered together, then their
  // bodies staggered together), which read as neither "each card arrives
  // separately" nor "everything appears at once", just an ambiguous partial
  // overlap. All three cards now share the exact same two-beat shape
  // (label, then caption+text) her spec. Total is ~3.2s (art + 3 cards),
  // well inside the starter kit's ~2-3s guidance for a section entrance —
  // plays out on its own regardless of scroll speed, so it can't be outrun
  // by a fast scroll and can't stall for a slow/reading one either.
  stepsCards.forEach((card) => {
    if (!card) return;
    listTl
      .to(card.labelWords, { opacity: 1, duration: 0.35, stagger: 0.03, ease: 'sine.out' }, '+=0.06')
      .to([card.caption, card.text], { opacity: 1, y: 0, duration: 0.25, stagger: 0.04, ease: 'sine.out' }, '+=0.06');
  });
}

// Blocks .step's :hover from engaging while a scroll is in flight — see the
// CSS comment on .is-scrolling .step for why this is needed at all. Plain
// window 'scroll', not lenis.on('scroll'): Lenis here drives real native
// scroll (script.js reads window.scrollY directly elsewhere), so the native
// event fires regardless of whether Lenis or the browser is the one moving
// it, and this needs no `lenis` reference or reduced-motion guard.
function initStepHoverGuard() {
  if (!document.querySelector('.step')) return;
  let idleTimer;
  window.addEventListener('scroll', () => {
    document.body.classList.add('is-scrolling');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => document.body.classList.remove('is-scrolling'), 120);
  }, { passive: true });
}

// ==========================================================================
// GALLERY PHOTO HOVER
// olgaprudka.com's project-grid behaviour as she described it: the same
// 1.05 scale the craft/philosophy images use, PLUS a micro drift away from
// the cursor. The drift moves the image INSIDE its frame — the frame (the
// <button>) never moves, so nothing shifts in the page's layout; the extra
// image the scale creates is what the drift travels through.
//
// Note this contradicts what was concluded about this same reference last
// time (that the DASHA image had no cursor tracking at all) — going with
// her reading of it, since it is her design call either way.
//
// The caption ("створено на 8 тижні") rides the same hover, on .craft__body's
// fade+rise, per her spec.
// ==========================================================================

function initGalleryPhotoHover() {
  if (!hasGSAP) return;

  const isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!isFinePointer) return;

  document.querySelectorAll('.gallery__photo').forEach((frame) => {
    const img = frame.querySelector('img');
    const card = frame.closest('.gallery__card');
    const caption = card && card.querySelector('.gallery__caption');
    if (!img) return;

    // quickTo, not a fresh tween per mousemove: it retargets a single running
    // tween, which is what keeps the drift smooth instead of steppy
    const driftX = gsap.quickTo(img, 'x', { duration: 0.9, ease: 'power3' });
    const driftY = gsap.quickTo(img, 'y', { duration: 0.9, ease: 'power3' });

    // overwrite:'auto' matters here — a fast in/out leaves the enter and
    // leave tweens running concurrently, and without it the longer one (in)
    // finishes last and strands the caption visible. 'auto' rather than
    // true so it only kills the conflicting properties and leaves the
    // drift's own x/y tweens on this same image alone.
    frame.addEventListener('mouseenter', () => {
      gsap.to(img, { scale: 1.05, duration: 0.7, ease: 'power2.out', overwrite: 'auto' });
      if (caption) gsap.to(caption, { opacity: 1, y: 0, duration: 0.6, ease: 'sine.out', overwrite: 'auto' });
    });

    frame.addEventListener('mousemove', (event) => {
      const rect = frame.getBoundingClientRect();
      const u = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--u')) || 1;
      const shift = GALLERY_HOVER_SHIFT * u;
      // negated: the image pulls AWAY from the cursor
      driftX(-(((event.clientX - rect.left) / rect.width) * 2 - 1) * shift);
      driftY(-(((event.clientY - rect.top) / rect.height) * 2 - 1) * shift);
    });

    // 1.0s on the way out, longer than the drift's own 0.9s: at 0.7s the
    // scale reached 1 while the drift was still 0.2s from centre, so for
    // those 0.2s the image sat un-oversized but off-centre and showed a
    // hairline of page along one edge. Outlasting the drift means the image
    // is always still oversized whenever it is still off-centre.
    frame.addEventListener('mouseleave', () => {
      gsap.to(img, { scale: 1, duration: 1.0, ease: 'power2.out', overwrite: 'auto' });
      driftX(0);
      driftY(0);
      if (caption) gsap.to(caption, { opacity: 0, y: 12, duration: 0.4, ease: 'sine.out', overwrite: 'auto' });
    });
  });
}

// ==========================================================================
// OLIVE GRAIN — the film grain the mockup has over block 6's olive field
//
// Measured off Figma's render of node 978:1287 rather than eyeballed: a bare
// patch of background there has a per-channel standard deviation of about
// 3.4 levels at full resolution against the flat #9A9671. Generated as a
// tile here rather than as an feTurbulence so that number can be set
// directly. Mid-grey is the neutral point of the `overlay` blend the CSS
// applies, so a tile centred on 128 leaves the base colour alone and only
// contributes its deviations.
// ==========================================================================

const GRAIN_SD = 3;        // overlay roughly multiplies this by 2*base/255 (~1.2 here)
const GRAIN_TILE = 160;

function initOliveGrain() {
  const canvas = document.createElement('canvas');
  canvas.width = GRAIN_TILE;
  canvas.height = GRAIN_TILE;

  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(GRAIN_TILE, GRAIN_TILE);
  const data = image.data;

  for (let i = 0; i < data.length; i += 4) {
    // Box-Muller, so the grain is gaussian like real film rather than the
    // flat distribution Math.random() alone would give
    const u1 = Math.random() || 1e-6;
    const u2 = Math.random();
    const gauss = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const v = Math.max(0, Math.min(255, Math.round(128 + gauss * GRAIN_SD)));
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
    data[i + 3] = 255;
  }

  ctx.putImageData(image, 0, 0);
  // set on the root, not on .philosophy: the same tile is now also used by
  // .gallery__bar (block 5's olive caption strip). Both are --olive-100, and
  // a grained olive meeting a flat one reads as a seam along the block 5/6
  // boundary, which is exactly the hairline she was seeing.
  document.documentElement.style.setProperty(
    '--grain',
    `url(${canvas.toDataURL('image/png')})`
  );
}

// ==========================================================================
// GALLERY CAROUSEL — variant A, scroll-scrubbed
//
// The row drifts sideways across the whole time the section is on screen,
// on the same scrub recipe the craft images and the clay video already use.
// No control to click: the site is scroll-driven throughout, and the one
// button the mockup had became the glass cursor.
//
// .gallery__note is NOT in here — it was lifted out of the track so it can
// stay put while the cards pass behind its beige panel.
//
// SNAP GRID. The note panel occupies exactly one card slot: its left edge
// sits on the same 965u the 4th card lands on in the mockup framing. So the
// only track positions where the panel does not cut a card in half are the
// ones a whole number of card pitches away from that framing — there every
// card is either entirely behind the panel or entirely clear of it, and the
// two cards flanking the panel land flush against its edges. Any other
// position leaves a card straddling an edge. That makes the card pitch the
// snap grid, with the mockup framing (x = 0) one of its stops.
//
// TRAVEL. One pitch either side of the mockup = 3 defined stops. The track's
// own overhang is only 818u (2738u of cards in a 1920u viewport), 49u short
// of the 916u this needs, so each end stop leaves a 49u strip of the page's
// beige at the outer edge. That reads as the end of the row, which is what
// it is — the alternative (staying inside 818u) has no clean stop but the
// middle one.
//
// PACING. The section is pinned for the run instead of being scrubbed by its
// own passage through the viewport. It decouples how long the paging takes
// from how tall the section happens to be, and it is what lets the row hold
// still on a stop instead of drifting off it.
//
// SETTLING IS DONE THROUGH LENIS, NOT ScrollTrigger's `snap` — do not swap it
// back. This page's scroll belongs to Lenis, driven from the GSAP ticker
// (initLenis). ScrollTrigger's `snap` settles by animating the NATIVE scroll
// position, so it and Lenis write the same value every frame and fight over
// it — the exact conflict the initLenis comment warns about for
// window.scrollTo. It was tried, and the stutter it caused showed up on every
// scrubbed tween on the page, not just this one. So the tween below keeps a
// plain scrub, and the settle is a separate idle-detector that hands the move
// to lenis.scrollTo(), leaving one library in charge of the scroll position.
// ==========================================================================

const GALLERY_PITCH = 448 + 10;       // card + gap; the snap grid
const GALLERY_TRAVEL = GALLERY_PITCH; // one pitch each way -> 3 stops
const GALLERY_PAGES = 2;              // gaps between those stops
const GALLERY_PAGE_SCROLL = 1100;     // scroll per page, in u
// Lenis keeps emitting scroll while its own glide decays, so this only has to
// outlast the frame gap, not the glide — the settle lands when the page has
// actually come to rest. Raised from 120 to 450 (2026-08-09, her call) — 120ms
// was short enough that an ordinary micro-pause mid-scroll (especially while
// screen-recording for a Behance case video, where her mouse movement is more
// careful/deliberate) could trip the idle timer before she'd actually meant
// to stop, firing a settle that visibly tugged the cards backward toward the
// nearest stop. 450ms only fires for a genuine pause, not a recording-induced
// hiccup — same settle mechanism, just less trigger-happy.
const GALLERY_SETTLE_IDLE = 450;      // ms of stillness before settling
const GALLERY_SETTLE_DURATION = 0.5;  // s, the settle itself

function initGalleryCarousel() {
  if (reducedMotion || !hasGSAP || !window.ScrollTrigger) return;
  // desktop-only pin+scrub carousel. On mobile .gallery__track is
  // display:none (replaced by .gallery-mobile's plain native horizontal
  // scroll) — but this ScrollTrigger doesn't know that, and `pin:true`
  // still wraps .gallery in a GSAP pin-spacer sized for the DESKTOP
  // scrub distance regardless. That spacer doesn't care that the mobile
  // content inside it is a different height, so it forced a large dead
  // gap (~428px in her real screenshot) between .gallery and whatever
  // comes after it — read as a stray block of empty background. Skipping
  // pin setup entirely on mobile avoids the pin-spacer existing at all.
  if (window.matchMedia('(max-width: 768px)').matches) return;

  const track = document.querySelector('.gallery__track');
  const section = document.querySelector('.gallery');
  if (!track || !section) return;

  // read through --u each time so a resize re-solves it; invalidateOnRefresh
  // is what makes ScrollTrigger re-run these on refresh rather than caching
  // the pixel values it computed at load
  const u = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--u')) || 1;

  const tween = gsap.fromTo(track,
    { x: () => GALLERY_TRAVEL * u() },
    {
      x: () => -GALLERY_TRAVEL * u(),
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        // pinned from the moment the section's bottom reaches the viewport
        // bottom — that framing has the whole card row and the olive caption
        // strip on screen, which 'top top' would cut off.
        start: 'bottom bottom',
        end: () => `+=${GALLERY_PAGES * GALLERY_PAGE_SCROLL * u()}`,
        pin: true,
        anticipatePin: 1,
        scrub: 1,
        invalidateOnRefresh: true,
      },
    });

  galleryPinTrigger = tween.scrollTrigger;
  initGallerySettle(tween.scrollTrigger);
}

// The settle. Runs only while the pin is active, so it can never tug at the
// scroll on the way into or out of the section — outside that range this does
// nothing at all and the page scrolls exactly as it does everywhere else.
function initGallerySettle(st) {
  if (!st || !lenis) return;

  const stops = [];
  for (let i = 0; i <= GALLERY_PAGES; i += 1) stops.push(i / GALLERY_PAGES);

  let idleTimer;

  // No "am I settling" flag and no Lenis `lock`, deliberately. Both were
  // tried: a flag has to be cleared by an onComplete that never fires if the
  // settle gets interrupted, and `lock` then leaves Lenis locked, which stops
  // it emitting scroll — at which point every scrubbed tween on the page
  // freezes. This version needs neither, because it is self-terminating: the
  // settle's own motion re-arms the idle timer, and when it fires again the
  // page is already on a stop, so the tolerance check below returns. The user
  // can interrupt with the wheel at any point, which is the behaviour we want
  // anyway.
  const settle = () => {
    if (!st.isActive) return;

    const progress = st.progress;
    const nearest = stops.reduce((best, s) => (
      Math.abs(s - progress) < Math.abs(best - progress) ? s : best
    ), stops[0]);

    const target = st.start + (st.end - st.start) * nearest;
    if (Math.abs(target - window.scrollY) < 2) return;

    lenis.scrollTo(target, {
      duration: GALLERY_SETTLE_DURATION,
      // the site's signature curve, as an easing function
      easing: (t) => 1 - Math.pow(1 - t, 3),
    });
  };

  lenis.on('scroll', () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(settle, GALLERY_SETTLE_IDLE);
  });
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
  menuTl = gsap.timeline();
  menuTl
    .to(menuOverlay, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, ease: 'power3.out' })
    .to(menuStaggerItems, { opacity: 1, y: 0, duration: 0.5, stagger: 0.06, ease: 'sine.out' }, '+=0.15');
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

  // Whatever state the hover morph was in (mid-hover, mid-unhover,
  // interrupted), force the bars straight to the clean, fully-formed X —
  // clicking close always means "closing from the X", so there's no
  // ambiguity about which end state is correct here.
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
    const bar1 = closeIcon.querySelector('.menu-overlay__close-icon-bar--1');
    const bar2 = closeIcon.querySelector('.menu-overlay__close-icon-bar--2');
    let morphTween;

    // Hover plays the hamburger -> X morph forward; moving away plays it
    // back. Deliberately NOT GSAP's rotate shorthand and NOT a CSS
    // transition — both failed to reliably respect this icon's custom
    // transform-origin during the actual animated tween. Instead: tween a
    // plain numeric proxy and write the full `transform` string directly
    // on every frame, so the browser applies transform-origin the same
    // way it would for any static rotate()/translateX() string.
    const morph = { p: 0 };
    function applyMorph() {
      if (bar1) bar1.style.transform = `rotate(${45 * morph.p}deg) translateX(${10.2163 * morph.p}px)`;
      if (bar2) bar2.style.transform = `rotate(${-45 * morph.p}deg) translateX(${-10.2163 * morph.p}px)`;
    }

    if (bar1 && bar2 && !reducedMotion) {
      closeIcon.addEventListener('mouseenter', () => {
        if (morphTween) morphTween.kill();
        morphTween = gsap.to(morph, { p: 1, duration: 0.4, ease: 'power2.out', onUpdate: applyMorph });
      });
      closeIcon.addEventListener('mouseleave', () => {
        if (morphTween) morphTween.kill();
        morphTween = gsap.to(morph, { p: 0, duration: 0.4, ease: 'power2.out', onUpdate: applyMorph });
      });
    }

    closeIcon.addEventListener('click', () => {
      trigger.setAttribute('aria-expanded', 'false');
      closeMenu();
    });
  }
}

// ==========================================================================
// POP-UPS — generic open/close, one instance so far (.popup-free-lesson,
// Figma node 1386:1135, "free lesson" lead magnet — see
// project_artefact_popup_modals_scope.md for the other two groups still to
// build). Same clip-path curtain mechanism as openMenu()/closeMenu(), just
// keyed by id so more popups can reuse this without new open/close
// functions each time: any trigger gets `data-popup-open="<popup id>"`,
// any close control inside a popup gets `.js-popup-close`.
// ==========================================================================

const popupTweens = {}; // one GSAP timeline per open popup id, so a rapid
                         // re-click cleanly kills the in-progress one
                         // instead of stacking (same reasoning as menuTl)

function setInitialPopupState(popup) {
  const staggerItems = popup.querySelectorAll('.js-popup-stagger');
  gsap.set(popup, { clipPath: 'inset(0% 0% 100% 0%)' });
  gsap.set(staggerItems, { opacity: 0, y: 12 });
}

function openPopup(popup) {
  if (!popup) return;
  const id = popup.id;
  if (popupTweens[id]) popupTweens[id].kill();
  document.body.classList.add('popup-is-open');
  popup.setAttribute('aria-hidden', 'false');

  const staggerItems = popup.querySelectorAll('.js-popup-stagger');

  if (reducedMotion) {
    gsap.set(popup, { clipPath: 'inset(0% 0% 0% 0%)' });
    gsap.set(staggerItems, { opacity: 1, y: 0 });
    return;
  }

  gsap.set(staggerItems, { opacity: 0, y: 12 });
  popupTweens[id] = gsap.timeline()
    .to(popup, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, ease: 'power3.out' })
    .to(staggerItems, { opacity: 1, y: 0, duration: 0.5, stagger: 0.06, ease: 'sine.out' }, '+=0.15');
}

function closePopup(popup) {
  if (!popup) return;
  const id = popup.id;
  if (popupTweens[id]) popupTweens[id].kill();
  document.body.classList.remove('popup-is-open');
  popup.setAttribute('aria-hidden', 'true');

  const staggerItems = popup.querySelectorAll('.js-popup-stagger');

  if (reducedMotion) {
    gsap.set(popup, { clipPath: 'inset(0% 0% 100% 0%)' });
    gsap.set(staggerItems, { opacity: 0, y: 12 });
    return;
  }

  popupTweens[id] = gsap.timeline()
    .to(staggerItems, { opacity: 0, y: 12, duration: 0.2, ease: 'sine.out' }, 0)
    .to(popup, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.2, ease: 'power3.out' }, 0);
}

// Swaps directly from one open popup to another (tariff form -> shared
// "Дякуємо" screen) — CONTENT crossfades, the popup shells themselves
// never do. First version faded the whole .popup-X container's opacity on
// both sides at once, which for that brief overlap meant NEITHER
// container was fully opaque — the real page (pricing block) showed
// through both of them for about a second. Her catch 2026-08-08: fixed by
// never touching either container's own opacity at all (each stays a
// solid, fully opaque background permanently) and instead only crossfading
// the .js-popup-content wrapper's opacity — fromPopup's content fades out
// first, THEN toPopup's solid background is swapped in with a single
// instant (duration:0) gsap.set — a plain color swap, not a transparent
// blend — and its content fades in on top of that. The site is never once
// visible through either layer.
function crossfadeToPopup(fromPopup, toPopup) {
  if (!fromPopup || !toPopup) return;
  const fromId = fromPopup.id;
  const toId = toPopup.id;
  if (popupTweens[fromId]) popupTweens[fromId].kill();
  if (popupTweens[toId]) popupTweens[toId].kill();

  document.body.classList.add('popup-is-open');
  toPopup.setAttribute('aria-hidden', 'false');
  fromPopup.setAttribute('aria-hidden', 'true');

  const fromContent = fromPopup.querySelector('.js-popup-content');
  const toContent = toPopup.querySelector('.js-popup-content');
  const toStagger = toPopup.querySelectorAll('.js-popup-stagger');

  if (reducedMotion) {
    gsap.set(fromPopup, { clipPath: 'inset(0% 0% 100% 0%)' });
    gsap.set(fromContent, { opacity: 1 });
    gsap.set(toPopup, { clipPath: 'inset(0% 0% 0% 0%)' });
    gsap.set(toContent, { opacity: 1 });
    gsap.set(toStagger, { opacity: 1, y: 0 });
    return;
  }

  // toPopup starts CLOSED (curtain-clipped), same as any normal popup at
  // rest — NOT opened yet. toPopup is later in the DOM than every tariff
  // popup, so equal z-index means it paints ON TOP of fromPopup the
  // instant it's unclipped; opening it here already would cover fromPopup
  // completely before fromContent's fade-out ever became visible. It only
  // opens inside the .call() below, at the exact swap instant.
  gsap.set(toPopup, { clipPath: 'inset(0% 0% 100% 0%)' });
  gsap.set(toContent, { opacity: 0 });
  gsap.set(toStagger, { opacity: 0, y: 12 });

  popupTweens[toId] = gsap.timeline()
    .to(fromContent, { opacity: 0, duration: 0.4, ease: 'sine.inOut' }, 0)
    .call(() => {
      // both instant, same tick — a flat color swap (beige<->olive
      // depending which tariff), never a semi-transparent blend of the
      // two, so the real page underneath is never exposed for even one
      // frame
      gsap.set(fromPopup, { clipPath: 'inset(0% 0% 100% 0%)' });
      gsap.set(fromContent, { opacity: 1 });
      gsap.set(toPopup, { clipPath: 'inset(0% 0% 0% 0%)' });
    })
    .to(toContent, { opacity: 1, duration: 0.4, ease: 'sine.inOut' })
    .to(toStagger, { opacity: 1, y: 0, duration: 0.5, stagger: 0.06, ease: 'sine.out' }, '-=0.1');
}

function initPopups() {
  // .js-popup, not [id^="popup-"] — an id-prefix match also caught
  // #popup-free-lesson-submit (the CTA link inside the popup, id shares
  // the same "popup-" prefix by coincidence) and clipped it to invisible
  // via setInitialPopupState(), a real bug she caught 2026-08-07. A
  // dedicated class only matches the actual popup container.
  const popups = document.querySelectorAll('.js-popup');
  if (!popups.length) return;

  popups.forEach((popup) => {
    setInitialPopupState(popup);

    // preventDefault matters here: .popup-subscription__close is a real
    // <a href="#"> (matching every other CTA on the site), and without
    // this the browser's own default "jump to top" navigation fires
    // ALONGSIDE closePopup() — she'd land back on the hero instead of
    // wherever she opened the popup from. Real bug, caught 2026-08-07.
    popup.querySelectorAll('.js-popup-close').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        closePopup(popup);
      });
    });
  });

  document.querySelectorAll('[data-popup-open]').forEach((trigger) => {
    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      const popup = document.getElementById(trigger.dataset.popupOpen);
      openPopup(popup);
    });
  });

  // All 3 tariff forms converge on the same .popup-confirm success screen
  // (Group A's shared final screen) once their required fields validate —
  // no backend yet, so "submit" here just means client-side validation
  // passes, then swap the tariff popup for the confirm one.
  const confirmPopup = document.getElementById('popup-confirm');

  // Pricing card 2 ("мова глини") -> .popup-tariff-2 (Group A, second of 3
  // course-booking variants). Same 3-field pattern as tariff-1's own
  // wiring, just its own ids.
  const tariff2Submit = document.getElementById('tariff-2-submit');
  const tariff2Name = document.getElementById('tariff-2-name');
  const tariff2Phone = document.getElementById('tariff-2-phone');
  const tariff2Email = document.getElementById('tariff-2-email');
  if (tariff2Submit && tariff2Name && tariff2Phone && tariff2Email) {
    tariff2Submit.addEventListener('click', (event) => {
      event.preventDefault();
      if (!tariff2Name.reportValidity()) return;
      if (!tariff2Phone.reportValidity()) return;
      if (!tariff2Email.reportValidity()) return;
      crossfadeToPopup(document.getElementById('popup-tariff-2'), confirmPopup);
    });
  }

  // Pricing card 1 ("перший дотик") -> .popup-tariff-1 (Group A, first of 3
  // course-booking variants). Trigger itself is wired generically via
  // [data-popup-open] above; this validates the 3 fields on submit, then
  // hands off to .popup-confirm. Ids deliberately do NOT start with
  // "popup-" (see the id-prefix bug this file's own comment above warns
  // about for .js-popup selection).
  const tariff1Submit = document.getElementById('tariff-1-submit');
  const tariff1Name = document.getElementById('tariff-1-name');
  const tariff1Phone = document.getElementById('tariff-1-phone');
  const tariff1Email = document.getElementById('tariff-1-email');
  if (tariff1Submit && tariff1Name && tariff1Phone && tariff1Email) {
    tariff1Submit.addEventListener('click', (event) => {
      event.preventDefault();
      if (!tariff1Name.reportValidity()) return;
      if (!tariff1Phone.reportValidity()) return;
      if (!tariff1Email.reportValidity()) return;
      crossfadeToPopup(document.getElementById('popup-tariff-1'), confirmPopup);
    });
  }

  // Pricing card 3 ("професійний рівень") -> .popup-tariff-3 (Group A,
  // third of 3 course-booking variants). Same pattern as tariff-1's own
  // wiring above, just 4 fields — the 4th ("коротко про ваш досвід/ідею")
  // is optional (no `required` in the HTML), so it's intentionally not
  // checked here.
  const tariff3Submit = document.getElementById('tariff-3-submit');
  const tariff3Name = document.getElementById('tariff-3-name');
  const tariff3Phone = document.getElementById('tariff-3-phone');
  const tariff3Email = document.getElementById('tariff-3-email');
  if (tariff3Submit && tariff3Name && tariff3Phone && tariff3Email) {
    tariff3Submit.addEventListener('click', (event) => {
      event.preventDefault();
      if (!tariff3Name.reportValidity()) return;
      if (!tariff3Phone.reportValidity()) return;
      if (!tariff3Email.reportValidity()) return;
      crossfadeToPopup(document.getElementById('popup-tariff-3'), confirmPopup);
    });
  }

  // No backend yet, and the design's success screen (a separate Figma
  // frame) isn't built — this just validates the email field and stops
  // there. reportValidity() shows the browser's own native "enter a valid
  // email" bubble, same as any other required input. On a valid email,
  // hands off to .popup-free-lesson-confirm (Group B's success screen,
  // built 2026-08-08) — crossfadeToPopup(), same content-only crossfade
  // the 3 tariff forms use (her catch 2026-08-09: this one was still on
  // the old closePopup()+openPopup() double-curtain, missed when the
  // crossfade fix was first done).
  const freeLessonSubmit = document.getElementById('popup-free-lesson-submit');
  const freeLessonEmail = document.getElementById('popup-free-lesson-email');
  const freeLessonConfirmPopup = document.getElementById('popup-free-lesson-confirm');
  if (freeLessonSubmit && freeLessonEmail) {
    freeLessonSubmit.addEventListener('click', (event) => {
      event.preventDefault();
      if (!freeLessonEmail.reportValidity()) return;
      crossfadeToPopup(document.getElementById('popup-free-lesson'), freeLessonConfirmPopup);
    });
  }

  // Footer newsletter — opens .popup-subscription (Group C, confirmation-
  // only) once a valid email is entered in the EXISTING footer form
  // (.footer__subscribe-form, built with block 14). No backend, so this
  // just validates + opens the confirmation screen; nothing is actually
  // sent anywhere yet.
  const footerSubscribeBtn = document.querySelector('.footer__subscribe-btn');
  const footerEmail = document.getElementById('footer-email');
  const subscriptionPopup = document.getElementById('popup-subscription');
  if (footerSubscribeBtn && footerEmail && subscriptionPopup) {
    footerSubscribeBtn.addEventListener('click', () => {
      if (!footerEmail.reportValidity()) return;
      openPopup(subscriptionPopup);
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
const LETTER_HOLD = 0.375; // pause after the 3rd blur pass, before the curtain starts — half of the original 0.75s, her explicit "2x shorter" request 2026-08-08

function initPreloader() {
  const preloader = document.getElementById('preloader');
  if (!preloader) return;

  const letters = preloader.querySelectorAll('.preloader__logo span');
  // no letter-logo loading screen on mobile — the full 3-pass animation +
  // hold is ~7.3s (LETTER_STAGGER*8 + LETTER_ANIM_DURATION*3 + HOLD),
  // which read as a broken/frozen page on a phone. Drop straight into
  // runHeroEntrance() instead — the curtain reveal + entrance chain still
  // run, just without the multi-second wait in front of them.
  const isMobile = window.matchMedia('(max-width: 768px)').matches;

  if (reducedMotion || !hasGSAP || !letters.length || isMobile) {
    document.body.classList.remove('is-preloading');
    preloader.remove();
    if (hasGSAP && !reducedMotion) runHeroEntrance();
    return;
  }

  const totalSeconds = LETTER_STAGGER * letters.length + LETTER_ANIM_DURATION * LETTER_ANIM_PASSES + LETTER_HOLD;

  gsap.delayedCall(totalSeconds, runHeroEntrance);
}

// ==========================================================================
// CLAY VIDEO — half-speed scroll parallax
// Reference: rejouice.com's hero reel. Measured mechanic there (not
// guessed): the reel container tracks scroll 1:1 while the video inside it
// translates at exactly HALF the scroll rate — 150px of drift per 300px
// scrolled — so the footage visibly lags the page and lingers on screen.
// Verified there are no sticky/fixed sections on that page and no parallax
// at all on its second video block, so this drift is the whole of the
// effect, not part of some larger stacking mechanism.
//
// Values are copied verbatim from their source (Nuxt chunk BdSAQIjB.js),
// not inferred from measurements:
//
//   gsap.timeline({scrollTrigger:{trigger: reel, scrub:true,
//     start:"top bottom", end:"bottom top"}})
//     .fromTo(video, {yPercent:-50}, {yPercent:50, ease:"none", duration:1})
//
// with the video element sized to 100% of its container. An earlier pass
// here used a 200%-tall box with ±25% instead, reasoning that spare height
// was needed to avoid bare edges — it isn't, and it halved the drift,
// which is why the effect looked like it wasn't there at all.
// ==========================================================================

function initClayVideoParallax() {
  if (reducedMotion || !hasGSAP || !window.ScrollTrigger || !clayVideo) return;

  gsap.fromTo(clayVideo,
    { yPercent: -50 },
    {
      yPercent: 50,
      ease: 'none',
      scrollTrigger: {
        trigger: claySection,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    });
}

// ==========================================================================
// GALLERY FILTER — selected-state toggle
// Visual state only: clicking moves the 60%-opacity "selected" mark. It does
// NOT yet filter which works are shown — that needs her spec for which
// pieces belong to Ліплення / Гончарне коло / Декор, and the gallery is
// still a single flat track.
// ==========================================================================

// ==========================================================================
// MOBILE CAROUSELS — drag-to-scroll for a native horizontal card row
// The row already scrolls via native touch swipe (overflow-x:auto), which
// is enough on a real phone. She reported "the carousel doesn't work" for
// the gallery — most likely tested by resizing a desktop browser to mobile
// width, where there's no swipe gesture at all, only a mouse (native
// overflow-x scroll isn't drag-able with a plain mouse, unlike touch). This
// adds click-drag support so it works either way, without needing a real
// touchscreen. Generic (takes a row selector) — reused for every mobile
// carousel row (gallery, steps, ...) rather than one copy per block, since
// none of this logic is gallery-specific.
// ==========================================================================

function initDragScrollRow(rowSelector) {
  const row = document.querySelector(rowSelector);
  if (!row) return;

  let isDown = false;
  let startX = 0;
  let startScroll = 0;
  let moved = false;

  row.addEventListener('mousedown', (event) => {
    isDown = true;
    moved = false;
    row.classList.add('is-dragging');
    startX = event.clientX;
    startScroll = row.scrollLeft;
  });

  window.addEventListener('mousemove', (event) => {
    if (!isDown) return;
    const dx = event.clientX - startX;
    if (Math.abs(dx) > 3) moved = true;
    row.scrollLeft = startScroll - dx;
  });

  window.addEventListener('mouseup', () => {
    if (!isDown) return;
    isDown = false;
    row.classList.remove('is-dragging');
  });

  // a drag that actually moved the row shouldn't also fire the card's own
  // click-through (opening a work) once pointer-up lands back on it
  row.addEventListener(
    'click',
    (event) => {
      if (moved) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    true
  );
}

// ==========================================================================
// GALLERY MOBILE — scroll-triggered entrance
// Same beat shape as every other section's entrance (once:true, top 80%,
// heading -> visuals -> supporting content, small overlaps) — had none at
// all until now, since the block was built layout-only and never got its
// motion pass.
// ==========================================================================

let galleryMobileSection, galleryMobileEyebrow, galleryMobileTitle,
  galleryMobileLead, galleryMobileFilterItems, galleryMobileCards, galleryMobileBar;

function cacheGalleryMobileRefs() {
  galleryMobileSection = document.querySelector('.gallery-mobile');
  galleryMobileEyebrow = document.querySelector('.gallery-mobile__eyebrow');
  galleryMobileTitle = document.querySelector('.gallery-mobile__title');
  galleryMobileLead = document.querySelector('.gallery-mobile__lead');
  galleryMobileFilterItems = document.querySelectorAll('.gallery-mobile__filter-item');
  galleryMobileCards = document.querySelectorAll('.gallery-mobile__card');
  galleryMobileBar = document.querySelector('.gallery-mobile__bar');
}

function setInitialGalleryMobileStates() {
  if (reducedMotion || !galleryMobileSection) return;

  gsap.set(galleryMobileEyebrow, { opacity: 0, y: 12 });
  gsap.set(galleryMobileTitle, { opacity: 0, y: 30 });
  gsap.set(galleryMobileLead, { opacity: 0, y: 12 });
  gsap.set(galleryMobileFilterItems, { opacity: 0 });
  gsap.set(galleryMobileCards, { opacity: 0, y: 60 });
  // the bar sits statically behind every card (z-index 0) — if it stayed
  // fully opaque while the cards above it fade in from opacity:0 and slide
  // up from y:60, its solid olive shows straight through the still-
  // transparent, still-offset photo for the whole transition, reading as
  // the photo's bottom being "cut off". Fading it in on the same beat as
  // the cards (below) keeps it invisible until they're opaque too.
  gsap.set(galleryMobileBar, { opacity: 0 });
}

function runGalleryMobileEntrance() {
  if (reducedMotion || !hasGSAP || !window.ScrollTrigger || !galleryMobileSection) return;

  gsap.timeline({
    scrollTrigger: { trigger: galleryMobileSection, start: 'top 80%', once: true },
  })
    .to(galleryMobileEyebrow, { opacity: 1, y: 0, duration: 0.6, ease: 'sine.out' })
    .to(galleryMobileTitle, { opacity: 1, y: 0, duration: 0.9, ease: 'power2.out' }, '-=0.35')
    .to(galleryMobileLead, { opacity: 1, y: 0, duration: 0.6, ease: 'sine.out' }, '-=0.5')
    .to(galleryMobileFilterItems, { opacity: 1, duration: 0.5, stagger: 0.06, ease: 'sine.out' }, '-=0.3')
    // duration matches the LAST card's own finish (1.0 + 4 * 0.1 stagger =
    // 1.4s), starting alongside the first — so the bar's opacity ramps
    // across the whole card cascade instead of finishing early and sitting
    // fully opaque behind still-fading later cards.
    .to(galleryMobileBar, { opacity: 1, duration: 1.4, ease: 'sine.out' }, '-=0.25')
    .to(galleryMobileCards, {
      opacity: 1,
      y: 0,
      duration: 1.0,
      stagger: 0.1,
      ease: 'power2.out',
      onComplete: () => gsap.set(galleryMobileCards, { clearProps: 'transform' }),
    }, '<');
}

// ==========================================================================
// STEPS MOBILE — scroll-triggered entrance
// Same beat shape as gallery-mobile's (heading -> art -> cards), reused
// verbatim rather than invented fresh — the two blocks are siblings in the
// same mobile build pass and there's no reason for the timing language to
// differ between them.
// ==========================================================================

let stepsMobileSection, stepsMobileTitle, stepsMobileSubheading,
  stepsMobileArt, stepsMobileCards;

function cacheStepsMobileRefs() {
  stepsMobileSection = document.querySelector('.steps-mobile');
  stepsMobileTitle = document.querySelector('.steps-mobile__title');
  stepsMobileSubheading = document.querySelector('.steps-mobile__subheading');
  stepsMobileArt = document.querySelector('.steps-mobile__art');
  stepsMobileCards = document.querySelectorAll('.steps-mobile__card');
}

function setInitialStepsMobileStates() {
  if (reducedMotion || !stepsMobileSection) return;

  gsap.set(stepsMobileTitle, { opacity: 0, y: 30 });
  gsap.set(stepsMobileSubheading, { opacity: 0, y: 12 });
  gsap.set(stepsMobileArt, { opacity: 0, y: 30 });
  gsap.set(stepsMobileCards, { opacity: 0, y: 60 });
}

function runStepsMobileEntrance() {
  if (reducedMotion || !hasGSAP || !window.ScrollTrigger || !stepsMobileSection) return;

  gsap.timeline({
    scrollTrigger: { trigger: stepsMobileSection, start: 'top 80%', once: true },
  })
    .to(stepsMobileTitle, { opacity: 1, y: 0, duration: 0.9, ease: 'power2.out' })
    .to(stepsMobileSubheading, { opacity: 1, y: 0, duration: 0.6, ease: 'sine.out' }, '-=0.5')
    .to(stepsMobileArt, { opacity: 1, y: 0, duration: 0.9, ease: 'power2.out' }, '-=0.3')
    .to(stepsMobileCards, {
      opacity: 1,
      y: 0,
      duration: 1.0,
      stagger: 0.1,
      ease: 'power2.out',
      onComplete: () => gsap.set(stepsMobileCards, { clearProps: 'transform' }),
    }, '-=0.4');
}

// ==========================================================================
// PHILOSOPHY MOBILE — scroll-triggered entrance
// Two independent triggers, one per block (block--1 and block--2 sit far
// enough apart on mobile that block--2 is usually still off-screen when
// block--1 first enters — a single shared trigger would fire both at once
// while block--2 is still below the fold).
// ==========================================================================

let philosophyMobileBlock1, philosophyMobileBlock2,
  philosophyMobileEyebrow1, philosophyMobileTitle1, philosophyMobileImg1, philosophyMobileNote,
  philosophyMobileEyebrow2, philosophyMobileTitle2, philosophyMobileLead2, philosophyMobileImg2;

function cachePhilosophyMobileRefs() {
  philosophyMobileBlock1 = document.querySelector('.philosophy-mobile__block--1');
  philosophyMobileBlock2 = document.querySelector('.philosophy-mobile__block--2');
  if (!philosophyMobileBlock1 || !philosophyMobileBlock2) return;

  philosophyMobileEyebrow1 = philosophyMobileBlock1.querySelector('.philosophy-mobile__eyebrow');
  philosophyMobileTitle1 = philosophyMobileBlock1.querySelector('.philosophy-mobile__title');
  philosophyMobileImg1 = philosophyMobileBlock1.querySelector('.philosophy-mobile__img');
  philosophyMobileNote = philosophyMobileBlock1.querySelector('.philosophy-mobile__note');

  philosophyMobileEyebrow2 = philosophyMobileBlock2.querySelector('.philosophy-mobile__eyebrow');
  philosophyMobileTitle2 = philosophyMobileBlock2.querySelector('.philosophy-mobile__title');
  philosophyMobileLead2 = philosophyMobileBlock2.querySelector('.philosophy-mobile__lead');
  philosophyMobileImg2 = philosophyMobileBlock2.querySelector('.philosophy-mobile__img');
}

function setInitialPhilosophyMobileStates() {
  if (reducedMotion || !philosophyMobileBlock1 || !philosophyMobileBlock2) return;

  gsap.set([philosophyMobileEyebrow1, philosophyMobileEyebrow2], { opacity: 0, y: 12 });
  gsap.set([philosophyMobileTitle1, philosophyMobileTitle2], { opacity: 0, y: 30 });
  gsap.set([philosophyMobileImg1, philosophyMobileImg2], { opacity: 0, y: 60 });
  gsap.set(philosophyMobileNote, { opacity: 0, y: 12 });
  gsap.set(philosophyMobileLead2, { opacity: 0, y: 12 });
}

function runPhilosophyMobileEntrance() {
  if (reducedMotion || !hasGSAP || !window.ScrollTrigger || !philosophyMobileBlock1 || !philosophyMobileBlock2) return;

  gsap.timeline({
    scrollTrigger: { trigger: philosophyMobileBlock1, start: 'top 80%', once: true },
  })
    .to(philosophyMobileEyebrow1, { opacity: 1, y: 0, duration: 0.6, ease: 'sine.out' })
    .to(philosophyMobileTitle1, { opacity: 1, y: 0, duration: 0.9, ease: 'power2.out' }, '-=0.35')
    .to(philosophyMobileImg1, {
      opacity: 1,
      y: 0,
      duration: 1.2,
      ease: 'power4.out',
      onComplete: () => gsap.set(philosophyMobileImg1, { clearProps: 'transform' }),
    }, '-=0.4')
    .to(philosophyMobileNote, { opacity: 1, y: 0, duration: 0.6, ease: 'sine.out' }, '-=0.5');

  gsap.timeline({
    scrollTrigger: { trigger: philosophyMobileBlock2, start: 'top 80%', once: true },
  })
    .to(philosophyMobileEyebrow2, { opacity: 1, y: 0, duration: 0.6, ease: 'sine.out' })
    .to(philosophyMobileTitle2, { opacity: 1, y: 0, duration: 0.9, ease: 'power2.out' }, '-=0.35')
    .to(philosophyMobileLead2, { opacity: 1, y: 0, duration: 0.6, ease: 'sine.out' }, '-=0.5')
    .to(philosophyMobileImg2, {
      opacity: 1,
      y: 0,
      duration: 1.2,
      ease: 'power4.out',
      onComplete: () => gsap.set(philosophyMobileImg2, { clearProps: 'transform' }),
    }, '-=0.6');
}

function initGalleryFilter() {
  const items = document.querySelectorAll('.js-gallery-filter');
  if (!items.length) return;

  items.forEach((item) => {
    item.addEventListener('click', () => {
      items.forEach((other) => {
        other.classList.remove('is-active');
        other.removeAttribute('aria-pressed');
      });
      item.classList.add('is-active');
      item.setAttribute('aria-pressed', 'true');
    });
  });
}

// ==========================================================================
// SCROLL-DOWN ARROWS
// Every section except the footer carries one; clicking it jumps to the
// next section with no wheel/trackpad input. The target is resolved as
// "next section in document order" rather than from each link's href, so
// adding a block later needs no rewiring (and the last section's arrow is
// simply inert until something follows it).
// ==========================================================================

function initScrollDownArrows() {
  const links = document.querySelectorAll('.js-scroll-down');
  if (!links.length) return;

  const sections = Array.from(document.querySelectorAll('.hero, .craft, .clay'));

  links.forEach((link) => {
    link.addEventListener('click', (event) => {
      const current = link.closest('.hero, .craft, .clay');
      const next = sections[sections.indexOf(current) + 1];
      if (!next) {
        // nothing below yet — swallow the click so the href doesn't jump
        event.preventDefault();
        return;
      }

      event.preventDefault();

      // Plain document offset — no sections are pinned any more (the holds
      // were removed after they introduced a visible jolt on arrival), so
      // there is no pin-spacer to measure around and no held framing to
      // land on.
      const target = window.scrollY + next.getBoundingClientRect().top;

      if (lenis) {
        lenis.scrollTo(target, { duration: 1.4 });
      } else {
        window.scrollTo({ top: target, behavior: reducedMotion ? 'auto' : 'smooth' });
      }
    });
  });
}

// ==========================================================================
// SCROLL-UP BUTTONS — .js-scroll-up, one in every section her anchor nav
// links point to (.gallery/.steps/.stories/.pricing/.social) plus .footer.
// Always targets the very top of the page (position 0) — unlike the
// scroll-down arrows' "next section" logic, there's no pinned-section jerk
// risk to route around here: 0 is always well outside any pin's range.
// ==========================================================================

function initScrollUpArrows() {
  const links = document.querySelectorAll('.js-scroll-up');
  if (!links.length) return;

  links.forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();

      if (lenis) {
        lenis.scrollTo(0, { duration: 1.4 });
      } else {
        window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
      }
    });
  });
}

// ==========================================================================
// NAV ANCHOR LINKS — .hero__link / .footer__menu-link /
// .menu-overlay__mobile-link / .hero__btn / .craft__cta all point to real
// in-section ids now (see the mapping comment above .hero__links in
// index.html, and above .hero__btn / .craft__cta for their own targets:
// .hero__btn -> #pricing, .craft__cta -> #free-lesson). A plain browser
// hash-jump is a native, instant scroll — it fights Lenis exactly the way
// every other scrollTo() on this page already routes around (see
// initGallerySettle()'s own comment on why raw window.scrollTo/ScrollTrigger
// snap both got rejected for the same reason), so these go through
// lenis.scrollTo() instead, same recipe as .js-scroll-down just above.
// Clicking one from inside the OPEN mobile menu also closes the menu first
// — without that the overlay just sits on top of whatever it "scrolled" to
// underneath it, and the click reads as doing nothing.
//
// PIN JERK, her catch: three of the mapped targets (#gallery, #stories,
// #social) are ScrollTrigger pin+scrub carousels. Landing a lenis.scrollTo()
// exactly on a pinned section's own `getBoundingClientRect().top` can land
// RIGHT AT the pin's engage boundary (worst case #social, whose pin start
// is literally 'top top' — the same y as the naive target) rather than
// safely inside its already-pinned, settled state, which reads as a visible
// jerk on arrival as the pin snaps in in the same moment the destination is
// supposedly reached. `initScrollDownArrows()` above sidesteps this
// entirely by only ever targeting hero/craft/clay, none of which are
// pinned — see its own comment ("no sections are pinned any more... no
// pin-spacer to measure around"). Anchor nav can't avoid pinned targets the
// same way (she wants exactly those blocks reachable), so instead: for a
// pinned target, land on that pin's own already-resolved `.start` (+40px
// buffer, comfortably past the engage threshold) instead of the section's
// naive top. Non-pinned targets (#steps, #philosophy, #pricing) keep the
// plain rect-based calc, same as the scroll-down arrows use.
// ==========================================================================

function initAnchorNav() {
  const links = document.querySelectorAll(
    '.hero__link[href^="#"], .footer__menu-link[href^="#"], .menu-overlay__mobile-link[href^="#"], .hero__btn[href^="#"], .craft__cta[href^="#"]'
  );

  // read lazily (function, not a snapshot) — these trigger vars are only
  // assigned once initGalleryCarousel()/initStoriesCarousel()/
  // initSocialCarousel() run, which may be before or after this call in the
  // init sequence, but always well before a real click can happen
  const PINNED_TARGETS = {
    gallery: () => galleryPinTrigger,
    stories: () => storiesPinTrigger,
    social: () => socialPinTrigger,
  };

  links.forEach((link) => {
    const id = link.getAttribute('href').slice(1);
    const target = id ? document.getElementById(id) : null;
    if (!target) return;

    link.addEventListener('click', (event) => {
      event.preventDefault();

      if (document.body.classList.contains('menu-is-open')) {
        closeMenu();
        const trigger = document.querySelector('.hero__menu-btn');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
      }

      const pinGetter = PINNED_TARGETS[id];
      const pinTrigger = pinGetter ? pinGetter() : null;
      const dest = pinTrigger
        ? pinTrigger.start + 40
        : window.scrollY + target.getBoundingClientRect().top;

      if (lenis) {
        lenis.scrollTo(dest, { duration: 1.4 });
      } else {
        window.scrollTo({ top: dest, behavior: reducedMotion ? 'auto' : 'smooth' });
      }
    });
  });
}

// ==========================================================================
// CLAY SECTION — video play/pause toggle
// ==========================================================================

function initClayVideoToggle() {
  const toggle = document.querySelector('.clay__video-toggle');
  const video = document.querySelector('.clay__bg');
  if (!toggle || !video) return;

  const cursor = document.getElementById('cursor');
  const cursorLabel = cursor && cursor.querySelector('.cursor__media-label');

  function setState(isPlaying) {
    const label = isPlaying ? 'стоп' : 'грати';
    toggle.dataset.cursorLabel = label;
    toggle.setAttribute('aria-label', isPlaying ? 'Зупинити відео' : 'Відтворити відео');
    // mouseenter (initCustomCursor) only reads dataset.cursorLabel at the
    // moment the pointer ENTERS — clicking without leaving the element
    // needs the already-visible bubble text updated live too
    if (cursorLabel && cursor.classList.contains('is-media')) {
      cursorLabel.textContent = label;
    }
  }

  toggle.addEventListener('click', () => {
    if (video.paused) {
      video.play();
      setState(true);
    } else {
      video.pause();
      setState(false);
    }
  });
}

// ==========================================================================
// FREE LESSON SECTION — "8_free lesson" scroll-triggered entrance
// Every beat reuses an existing recipe verbatim, per her spec:
//   heading lines (.free-lesson__line, incl. the "?" mark)
//                                 -> .craft__heading-line's fade+rise
//   "почніть з.." eyebrow         -> .steps__subheading's splitWords() stagger
//   "( отримайте.." txt           -> .craft__side-text's splitWords() stagger
//   media                        -> .craft__art-1's fade+rise (its hover-scale
//     + scroll-drift come from mediaImageGroups() already)
//   CTA                          -> .craft__cta's fade+rise (plus-swap hover
//     is pure CSS via .js-line-hover, no JS needed beyond the class)
// ==========================================================================

let freeLessonSection, freeLessonLines, freeLessonEyebrowWords,
  freeLessonMedia, freeLessonTxtWords, freeLessonCta;
// resolved ScrollTrigger of runFreeLessonEntrance()'s own timeline, set the
// moment that timeline is created — stories' entrance floors against this,
// continuing the same startAfterFloor() chain philosophy/steps/free-lesson
// already use (see runStoriesEntrance() below).
let freeLessonEntranceTrigger;

function cacheFreeLessonRefs() {
  freeLessonSection = document.querySelector('.free-lesson');
  freeLessonLines = document.querySelectorAll('.free-lesson__line');
  freeLessonMedia = document.querySelector('.free-lesson__media');
  freeLessonCta = document.querySelector('.free-lesson__cta');

  const eyebrow = document.querySelector('.free-lesson__eyebrow');
  freeLessonEyebrowWords = eyebrow ? splitWords(eyebrow) : [];

  const txt = document.querySelector('.free-lesson__txt');
  freeLessonTxtWords = txt ? splitWords(txt) : [];
}

function setInitialFreeLessonStates() {
  if (reducedMotion) return;

  gsap.set(freeLessonLines, { opacity: 0, y: 30 });
  gsap.set(freeLessonEyebrowWords, { opacity: 0 });
  gsap.set(freeLessonMedia, { opacity: 0, y: 120 });
  gsap.set(freeLessonTxtWords, { opacity: 0 });
  gsap.set(freeLessonCta, { opacity: 0, y: 30 });
}

// Beats run mostly in SEQUENCE now, each one starting just before the
// previous finishes ('-=' overlaps) — matching the same recipe
// runPhilosophyEntrance()/runStepsEntrance() use. An earlier version fired
// media and the body text at the exact same absolute offset (both at 0.5s)
// to keep the whole sequence under ~2s per the starter kit's own rule (a
// slower 6s+ version could still be running when a normal scroll carried
// the user past the section) — but bunching beats together to hit that
// budget defeated the point of a staggered reveal: she saw the heading and
// eyebrow, then everything else (photo, body text, CTA) landed together
// too fast to register as separate beats. Total is now ~2.7s, still well
// inside the "don't get outrun by scroll" budget, but each beat gets its
// own moment.
//
// start: the same startAfterFloor() chain steps/philosophy use — natural
// "top 80%" via a live getBoundingClientRect() read, floored to fire no
// earlier than steps' own card list. See startAfterFloor()'s header
// comment (near galleryPinTrigger, above runPhilosophyEntrance()) for why
// this replaced an earlier hardcoded-offset version.
function runFreeLessonEntrance() {
  if (reducedMotion || !hasGSAP || !window.ScrollTrigger || !freeLessonSection) return;

  const floor = () => Math.max(afterGalleryPin(), stepsListTrigger ? stepsListTrigger.start + 80 : 0);
  const tl = gsap.timeline({
    scrollTrigger: { trigger: freeLessonSection, start: startAfterFloor(freeLessonSection, floor), once: true },
  })
    .to(freeLessonLines, { opacity: 1, y: 0, duration: 0.9, stagger: 0.08, ease: 'power2.out' })
    .to(freeLessonEyebrowWords, { opacity: 1, duration: 0.6, stagger: 0.05, ease: 'sine.out' }, '-=0.5')
    .to(freeLessonMedia, {
      opacity: 1,
      y: 0,
      duration: 1.0,
      ease: 'power4.out',
      onComplete: () => gsap.set(freeLessonMedia, { clearProps: 'transform' }),
    }, '-=0.2')
    .to(freeLessonTxtWords, { opacity: 1, duration: 0.6, stagger: 0.05, ease: 'sine.out' }, '-=0.5')
    .to(freeLessonCta, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, '-=0.1');

  freeLessonEntranceTrigger = tl.scrollTrigger;
}

// ==========================================================================
// FREE LESSON MOBILE — scroll-triggered entrance
// Same beat shape as steps-mobile/gallery-mobile (heading -> visuals ->
// supporting content -> CTA last, once:true, top 80%) — independent
// trigger, no startAfterFloor() chaining needed like the desktop version
// above: mobile has no pinned gallery carousel ahead of it to fire early
// against.
// ==========================================================================

let freeLessonMobileSection, freeLessonMobileLines, freeLessonMobileMedia,
  freeLessonMobileTxtLines, freeLessonMobileCta;

function cacheFreeLessonMobileRefs() {
  freeLessonMobileSection = document.querySelector('.free-lesson-mobile');
  freeLessonMobileLines = document.querySelectorAll('.free-lesson-mobile__line');
  freeLessonMobileMedia = document.querySelector('.free-lesson-mobile__media');
  freeLessonMobileTxtLines = document.querySelectorAll('.free-lesson-mobile__txt-line');
  freeLessonMobileCta = document.querySelector('.free-lesson-mobile__cta');
}

function setInitialFreeLessonMobileStates() {
  if (reducedMotion || !freeLessonMobileSection) return;

  gsap.set(freeLessonMobileLines, { opacity: 0, y: 30 });
  gsap.set(freeLessonMobileMedia, { opacity: 0, y: 30 });
  gsap.set(freeLessonMobileTxtLines, { opacity: 0, y: 12 });
  gsap.set(freeLessonMobileCta, { opacity: 0, y: 12 });
}

function runFreeLessonMobileEntrance() {
  if (reducedMotion || !hasGSAP || !window.ScrollTrigger || !freeLessonMobileSection) return;

  gsap.timeline({
    scrollTrigger: { trigger: freeLessonMobileSection, start: 'top 80%', once: true },
  })
    .to(freeLessonMobileLines, {
      opacity: 1,
      y: 0,
      duration: 0.9,
      stagger: 0.08,
      ease: 'power2.out',
      onComplete: () => gsap.set(freeLessonMobileLines, { clearProps: 'transform' }),
    })
    .to(freeLessonMobileMedia, { opacity: 1, y: 0, duration: 0.9, ease: 'power2.out' }, '-=0.4')
    .to(freeLessonMobileTxtLines, {
      opacity: 1,
      y: 0,
      duration: 0.6,
      stagger: 0.08,
      ease: 'sine.out',
      onComplete: () => gsap.set(freeLessonMobileTxtLines, { clearProps: 'transform' }),
    }, '-=0.3')
    .to(freeLessonMobileCta, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, '-=0.2');
}

// ==========================================================================
// STORIES SECTION — "9_історії учнів"
// ==========================================================================

let storiesSection, storiesEyebrowWords, storiesTitle, storiesLead, storiesCards;
// exposed for .pricing to chain its own startAfterFloor() off, same as
// freeLessonEntranceTrigger — see runPricingEntrance() below
let storiesEntranceTrigger;

function cacheStoriesRefs() {
  storiesSection = document.querySelector('.stories');
  storiesTitle = document.querySelector('.stories__title');
  storiesLead = document.querySelector('.stories__lead');
  // page 1 only — page 2 sits off-screen behind the carousel pan and
  // doesn't need its own scroll-into-view entrance, see runStoriesEntrance()
  storiesCards = document.querySelectorAll('.stories__page:first-child .stories__card');

  const eyebrow = document.querySelector('.stories__eyebrow');
  storiesEyebrowWords = eyebrow ? splitWords(eyebrow) : [];
}

function setInitialStoriesStates() {
  if (reducedMotion) return;
  gsap.set(storiesEyebrowWords, { opacity: 0 });
  gsap.set(storiesTitle, { opacity: 0, y: 30 });
  gsap.set(storiesLead, { opacity: 0, y: 12 });
  gsap.set(storiesCards, { opacity: 0, y: 48 });
}

// Same startAfterFloor() chain philosophy/steps/free-lesson use: a live
// "top 80%" read of this section's own position, floored to fire no
// earlier than free-lesson's own resolved entrance start (+80), never a
// hardcoded offset — see BLOCK_STARTER_KIT.md's "Entrance-timing-after-a-
// pinned-section gotcha" for why that's the one approach that survives an
// upstream block's height changing later.
function runStoriesEntrance() {
  if (reducedMotion || !hasGSAP || !window.ScrollTrigger || !storiesSection) return;

  const floor = () => (freeLessonEntranceTrigger ? freeLessonEntranceTrigger.start + 80 : 0);
  const tl = gsap.timeline({
    scrollTrigger: { trigger: storiesSection, start: startAfterFloor(storiesSection, floor), once: true },
  })
    .to(storiesEyebrowWords, { opacity: 1, duration: 0.6, stagger: 0.05, ease: 'sine.out' })
    .to(storiesTitle, {
      opacity: 1,
      y: 0,
      duration: 1.0,
      ease: 'power2.out',
      onComplete: () => gsap.set(storiesTitle, { clearProps: 'opacity,transform' }),
    }, '-=0.4')
    // .stories__lead is styled at opacity:0.8 at rest — animate TO that
    // value, not blindly to 1 (project hard rule: a lazy to(1) destroys
    // designed sub-1 opacity).
    .to(storiesLead, {
      opacity: 0.8,
      y: 0,
      duration: 0.6,
      ease: 'sine.out',
      onComplete: () => gsap.set(storiesLead, { clearProps: 'opacity,transform' }),
    }, '-=0.5')
    .to(storiesCards, {
      opacity: 1,
      y: 0,
      duration: 0.8,
      stagger: 0.08,
      ease: 'power2.out',
      onComplete: () => gsap.set(storiesCards, { clearProps: 'opacity,transform' }),
    }, '-=0.15');

  storiesEntranceTrigger = tl.scrollTrigger;
}

// ==========================================================================
// STORIES MOBILE — scroll-triggered entrance
// Same beat shape as every other mobile block (eyebrow -> heading -> lead
// -> cards, once:true, top 80%) — independent trigger, no startAfterFloor()
// chaining like the desktop version above needs (no pinned carousel ahead
// of it on mobile).
// ==========================================================================

let storiesMobileSection, storiesMobileEyebrow, storiesMobileHeading,
  storiesMobileLead, storiesMobileCards;

function cacheStoriesMobileRefs() {
  storiesMobileSection = document.querySelector('.stories-mobile');
  storiesMobileEyebrow = document.querySelector('.stories-mobile__eyebrow');
  storiesMobileHeading = document.querySelector('.stories-mobile__heading');
  storiesMobileLead = document.querySelector('.stories-mobile__lead');
  storiesMobileCards = document.querySelectorAll('.stories-mobile__card');
}

function setInitialStoriesMobileStates() {
  if (reducedMotion || !storiesMobileSection) return;

  gsap.set(storiesMobileEyebrow, { opacity: 0, y: 12 });
  gsap.set(storiesMobileHeading, { opacity: 0, y: 30 });
  gsap.set(storiesMobileLead, { opacity: 0, y: 12 });
  gsap.set(storiesMobileCards, { opacity: 0, y: 60 });
}

function runStoriesMobileEntrance() {
  if (reducedMotion || !hasGSAP || !window.ScrollTrigger || !storiesMobileSection) return;

  gsap.timeline({
    scrollTrigger: { trigger: storiesMobileSection, start: 'top 80%', once: true },
  })
    .to(storiesMobileEyebrow, { opacity: 1, y: 0, duration: 0.6, ease: 'sine.out' })
    .to(storiesMobileHeading, { opacity: 1, y: 0, duration: 0.9, ease: 'power2.out' }, '-=0.35')
    // .stories-mobile__lead is styled at opacity:0.8 at rest — animate TO
    // that value, not blindly to 1 (project hard rule).
    .to(storiesMobileLead, { opacity: 0.8, y: 0, duration: 0.6, ease: 'sine.out' }, '-=0.5')
    .to(storiesMobileCards, {
      opacity: 1,
      y: 0,
      duration: 1.0,
      stagger: 0.1,
      ease: 'power2.out',
      onComplete: () => gsap.set(storiesMobileCards, { clearProps: 'transform' }),
    }, '-=0.3');
}

// Photo hover: verbatim the same recipe as initGalleryPhotoHover() (scale
// 1.05 + cursor-tracking parallax drift via gsap.quickTo), per her
// instruction that stories' card photos hover exactly like block 5's. No
// caption to fade here (stories cards have no .gallery__caption
// equivalent), otherwise identical, including reusing GALLERY_HOVER_SHIFT
// so the drift feels like the same effect, not a lookalike.
function initStoriesPhotoHover() {
  if (!hasGSAP) return;

  const isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!isFinePointer) return;

  document.querySelectorAll('.stories__photo').forEach((frame) => {
    const img = frame.querySelector('img');
    if (!img) return;

    const driftX = gsap.quickTo(img, 'x', { duration: 0.9, ease: 'power3' });
    const driftY = gsap.quickTo(img, 'y', { duration: 0.9, ease: 'power3' });

    frame.addEventListener('mouseenter', () => {
      gsap.to(img, { scale: 1.05, duration: 0.7, ease: 'power2.out', overwrite: 'auto' });
    });

    frame.addEventListener('mousemove', (event) => {
      const rect = frame.getBoundingClientRect();
      const u = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--u')) || 1;
      const shift = GALLERY_HOVER_SHIFT * u;
      driftX(-(((event.clientX - rect.left) / rect.width) * 2 - 1) * shift);
      driftY(-(((event.clientY - rect.top) / rect.height) * 2 - 1) * shift);
    });

    frame.addEventListener('mouseleave', () => {
      gsap.to(img, { scale: 1, duration: 1.0, ease: 'power2.out', overwrite: 'auto' });
      driftX(0);
      driftY(0);
    });
  });
}

// CLICK-TO-REVEAL REVIEWS — her spec. Every .stories__photo that carries
// data-review-target toggles the matching .stories__review's `is-open`
// class (the opacity transition itself is plain CSS, see .stories__review
// in style.css). Which button maps to which panel — and why cards 2/3's
// panels live inside each OTHER's .stories__card rather than their own —
// is documented in index.html right above .stories__grid; nothing here
// needs to know about that layout, it just follows the id each button
// already carries.
//
// A second click on the SAME button (her answer for how to close) always
// closes its own panel. Two different conflicts are handled beyond that:
//
// - cards 2/3 physically can't both be open at once (each one's own
//   trigger stays visible/clickable throughout, since it's the SIBLING's
//   photo that gets covered, never its own) — no code needed for that one,
//   it falls out of the layout.
// - row2's col3 is a genuinely SHARED slot — card 4's and card 5's review
//   panels are both siblings inside the same .stories__slot (see the
//   comment above .stories__grid for why). Those two are NOT mutually
//   exclusive by layout, so opening one here explicitly closes any other
//   .stories__review sharing its parent first.
//
// When a panel's host IS a .stories__card (the 2/3 pair, whose reviews
// live inside each other's card rather than an empty .stories__slot), that
// host's own "+ курс / ..." label hides for as long as the review is open
// — per her note that a leftover label naming a different course than the
// review now showing under it read wrong. .closest() returns null for the
// .stories__slot-hosted panels (1/4/5), so this is a no-op there — those
// never had a label to hide in the first place.
function initStoriesReviews() {
  document.querySelectorAll('.stories__photo[data-review-target]').forEach((btn) => {
    const panel = document.getElementById(btn.dataset.reviewTarget);
    if (!panel) return;

    const hostCard = panel.closest('.stories__card');
    const hostLabel = hostCard ? hostCard.querySelector('.stories__label') : null;
    const siblingPanels = Array.from(panel.parentElement.querySelectorAll(':scope > .stories__review'))
      .filter((sibling) => sibling !== panel);

    btn.addEventListener('click', () => {
      const willOpen = !panel.classList.contains('is-open');

      if (willOpen) {
        siblingPanels.forEach((sibling) => {
          sibling.classList.remove('is-open');
          sibling.setAttribute('aria-hidden', 'true');
          const siblingBtn = document.querySelector(`[data-review-target="${sibling.id}"]`);
          if (siblingBtn) siblingBtn.setAttribute('aria-expanded', 'false');
        });
      }

      panel.classList.toggle('is-open', willOpen);
      btn.setAttribute('aria-expanded', String(willOpen));
      panel.setAttribute('aria-hidden', String(!willOpen));
      if (hostLabel) hostLabel.classList.toggle('is-hidden', willOpen);
    });
  });
}

// ==========================================================================
// STORIES CAROUSEL — her "variant A" pick: same mechanism as
// initGalleryCarousel()/initGallerySettle() (pinned section, scrubbed x,
// idle-triggered Lenis settle — never ScrollTrigger's `snap`, it fights
// Lenis, project hard rule). Much simpler than gallery's version: only 2
// pages, so the "snap grid" is just the 2 page boundaries, not a whole
// card-pitch system.
//
// Pins/centres on the CARD GRID (.stories__grid, ~978u: the two rows,
// header excluded), not the whole 1620u .stories section. Tried centring
// the full section first ('center center' on storiesSection) — works on a
// narrow/tall test viewport, but on any normal widescreen monitor the
// section is TALLER than the viewport (1620u at a 1920-wide reference
// against a ~1080-tall 16:9 viewport is already close, and this reference
// assumes a much taller-than-wide test window), so centring the whole
// thing crops real content off both ends — confirmed live, ~100px of row
// 2 was clipped. The header (eyebrow/title/lead) doesn't need to still be
// on screen once paging starts; only the cards do. Triggering off the
// grid element instead — a much shorter box — actually fits inside a
// normal viewport with room to spare, so 'center center' on IT gives the
// symmetric top/bottom margins she asked for without cropping anything.
// `pin` is still the whole section (so the header pins along with the
// cards, just already scrolled past by the time this fires), only the
// START/END position math is measured off the grid.
// ==========================================================================

const STORIES_PAGE_WIDTH = 1820;    // u, matches .stories__page's flex-basis
const STORIES_PAGE_GAP = 50;        // u, matches .stories__grid's gap
const STORIES_PAGE_SCROLL = 900;    // u of scroll consumed paging to page 2
// u of EXTRA scroll held after the cards finish moving, before the pin
// releases into block 10 — her report 2026-08-08: page 2 finishes and the
// section scrolls away before she can click a card. Scroll-distance, not
// literal seconds (this is a scrub carousel, not a timer) — a rough first
// pass, tune by feel like every other timing value on this site.
const STORIES_PAGE_HOLD = 350;
const STORIES_SETTLE_IDLE = 120;    // ms of stillness before settling
const STORIES_SETTLE_DURATION = 0.5; // s, the settle itself

let storiesPinTrigger;

function initStoriesCarousel() {
  if (reducedMotion || !hasGSAP || !window.ScrollTrigger) return;
  // desktop-only pin+scrub carousel — same reasoning as
  // initGalleryCarousel()'s own mobile guard above: on mobile
  // .stories__grid is display:none (replaced by .stories-mobile's plain
  // native horizontal scroll), but pin:storiesSection doesn't know that
  // and still wraps the whole section in a GSAP pin-spacer sized for the
  // desktop scrub distance (STORIES_PAGE_SCROLL), holding the page in
  // place for that entire distance regardless — read as scrolling being
  // "stuck"/blocked right at this section on mobile. Skipping pin setup
  // entirely on mobile avoids the pin-spacer existing at all.
  if (window.matchMedia('(max-width: 768px)').matches) return;

  const track = document.querySelector('.stories__grid');
  if (!track || !storiesSection) return;

  const u = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--u')) || 1;
  const travel = () => (STORIES_PAGE_WIDTH + STORIES_PAGE_GAP) * u();
  const totalScroll = STORIES_PAGE_SCROLL + STORIES_PAGE_HOLD;
  // fraction of the pin's total scroll actually spent moving the cards —
  // the remainder is a static hold at page 2. initStoriesSettle() uses
  // this same fraction so "page 2 reached" still means "cards finished
  // moving", not "scrolled all the way through the hold too".
  const travelFraction = STORIES_PAGE_SCROLL / totalScroll;

  // a timeline, not a bare tween — scrub maps ScrollTrigger's progress
  // (0-1 over the pin's full scroll distance) onto the TIMELINE's own
  // totalDuration, not onto any one tween's duration. Giving the x-tween
  // duration:travelFraction and padding the rest with an empty tween
  // (duration: 1-travelFraction) makes the cards finish moving at
  // travelFraction of the scroll, then sit frozen for the remainder —
  // the hold. A single gsap.to() has no such split; everything about it
  // scales to fill the whole scroll range, hold included.
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: track,
      pin: storiesSection,
      start: 'center center',
      end: () => `+=${totalScroll * u()}`,
      anticipatePin: 1,
      scrub: 1,
      invalidateOnRefresh: true,
    },
  });

  tl.to(track, { x: () => -travel(), ease: 'none', duration: travelFraction }, 0)
    .to({}, { duration: 1 - travelFraction });

  storiesPinTrigger = tl.scrollTrigger;
  initStoriesSettle(tl.scrollTrigger, travelFraction);
}

// Only 2 stops (page 1 / page 2), unlike gallery's card-pitch grid — see
// initGallerySettle()'s own header comment for why this settles through
// lenis.scrollTo() rather than ScrollTrigger's `snap`. travelFraction (not
// a flat 1) is where "page 2" actually sits now that STORIES_PAGE_HOLD
// exists — past that point she's in the hold, where track.x is already
// frozen and there's nothing meaningful to snap her TO, so settle() just
// leaves her alone rather than yanking her back to travelFraction every
// time she pauses mid-hold.
function initStoriesSettle(st, travelFraction) {
  if (!st || !lenis) return;

  let idleTimer;

  const settle = () => {
    if (!st.isActive) return;

    const progress = st.progress;
    if (progress > travelFraction) return;

    const nearest = Math.abs(travelFraction - progress) < progress ? travelFraction : 0;
    const target = st.start + (st.end - st.start) * nearest;
    if (Math.abs(target - window.scrollY) < 2) return;

    lenis.scrollTo(target, {
      duration: STORIES_SETTLE_DURATION,
      easing: (t) => 1 - Math.pow(1 - t, 3),
    });
  };

  lenis.on('scroll', () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(settle, STORIES_SETTLE_IDLE);
  });
}

// ==========================================================================
// PRICING SECTION — "10_тарифи"
// ==========================================================================

let pricingSection, pricingEyebrowWords, pricingHeadingWords, pricingLeadWords,
  pricingCards, pricingCardTitles, pricingCardSubtitles, pricingCardMeta, pricingCardCtas,
  pricingEntranceTrigger;

function cachePricingRefs() {
  pricingSection = document.querySelector('.pricing');
  pricingCards = document.querySelectorAll('.pricing__card');
  pricingCardTitles = document.querySelectorAll('.pricing__card-title');
  pricingCardSubtitles = document.querySelectorAll('.pricing__card-subtitle');
  // price + duration + result read as one "body copy" tier, fading in
  // together rather than 3 more separate staggered beats — her ask was a
  // calm, minimal cascade, not a line-by-line reveal for every string
  pricingCardMeta = document.querySelectorAll('.pricing__card-price, .pricing__card-format, .pricing__card-result');
  pricingCardCtas = document.querySelectorAll('.pricing__card-cta');

  const eyebrow = document.querySelector('.pricing__eyebrow');
  pricingEyebrowWords = eyebrow ? splitWords(eyebrow) : [];

  // the heading itself is 3 pre-rendered images (blur, see index.html's
  // block comment) — animate them as one group via the images directly,
  // no splitWords possible on an <img>
  pricingHeadingWords = document.querySelectorAll('.pricing__heading-word');

  pricingLeadWords = Array.from(document.querySelectorAll('.pricing__lead-line'))
    .flatMap((line) => splitWords(line));
}

function setInitialPricingStates() {
  if (reducedMotion) return;
  gsap.set(pricingEyebrowWords, { opacity: 0 });
  gsap.set(pricingHeadingWords, { opacity: 0, y: 30 });
  gsap.set(pricingLeadWords, { opacity: 0 });
  gsap.set(pricingCards, { opacity: 0, y: 48 });
  gsap.set(pricingCardTitles, { opacity: 0, y: 20 });
  gsap.set(pricingCardSubtitles, { opacity: 0, y: 12 });
  gsap.set(pricingCardMeta, { opacity: 0, y: 12 });
  gsap.set(pricingCardCtas, { opacity: 0, y: 12 });
}

// Every beat below reuses an existing site recipe verbatim, per her
// instruction — nothing new invented:
//   heading images  -> .hero__title-img's H1 beat (y30, 1.0s, power2.out)
//   eyebrow + lead   -> splitWords() stagger (.hero__eyebrow /
//                       .steps__subheading: opacity, 1.0s, stagger .08, sine.out)
//   card titles      -> .craft__heading-line's fade+rise (y30->y20 here,
//                       since these are small in-card titles not full
//                       section headings; same 1.0s/power2.out)
//   card body copy   -> the standard "fade + rise" recipe (y12, 0.6s, sine.out)
//   cards themselves -> bottom-up fade+rise (y48->0, power2.out), same as
//                       .stories__card
// Same startAfterFloor() chain philosophy/steps/free-lesson/stories use —
// see BLOCK_STARTER_KIT.md's "Entrance-timing-after-a-pinned-section
// gotcha". Floored against storiesPinTrigger.end (the CAROUSEL's pin,
// which holds the screen for STORIES_PAGE_SCROLL=900u), not
// storiesEntranceTrigger.start — that trigger only fires stories' own
// fade-in, which happens BEFORE its pin even engages, so flooring against
// it left pricing's floor ~900u too early: the whole entrance timeline
// played out while stories' pinned carousel was still visually holding
// the screen, so by the time she actually scrolled to block 10 everything
// had already settled — her catch. storiesPinTrigger is assigned later in
// the init sequence (inside initStoriesCarousel()), but that's fine: this
// floor function is only ever CALLED lazily on ScrollTrigger refresh, by
// which point every init call below has already run.
function runPricingEntrance() {
  if (reducedMotion || !hasGSAP || !window.ScrollTrigger || !pricingSection) return;

  const floor = () => (storiesPinTrigger ? storiesPinTrigger.end + 80 : 0);
  const tl = gsap.timeline({
    scrollTrigger: { trigger: pricingSection, start: startAfterFloor(pricingSection, floor), once: true },
  })
    .to(pricingEyebrowWords, { opacity: 1, duration: 0.6, stagger: 0.05, ease: 'sine.out' })
    .to(pricingHeadingWords, {
      opacity: 1,
      y: 0,
      duration: 1.0,
      stagger: 0.08,
      ease: 'power2.out',
      onComplete: () => gsap.set(pricingHeadingWords, { clearProps: 'opacity,transform' }),
    }, '-=0.4')
    .to(pricingLeadWords, { opacity: 1, duration: 1.0, stagger: 0.08, ease: 'sine.out' }, '-=0.5')
    .to(pricingCards, {
      opacity: 1,
      y: 0,
      duration: 0.8,
      stagger: 0.1,
      ease: 'power2.out',
      onComplete: () => gsap.set(pricingCards, { clearProps: 'opacity,transform' }),
    }, '-=0.4')
    .to(pricingCardTitles, {
      opacity: 1,
      y: 0,
      duration: 1.0,
      stagger: 0.1,
      ease: 'power2.out',
      onComplete: () => gsap.set(pricingCardTitles, { clearProps: 'opacity,transform' }),
    }, '-=0.5')
    .to(pricingCardSubtitles, {
      opacity: 1,
      y: 0,
      duration: 0.6,
      stagger: 0.08,
      ease: 'sine.out',
      onComplete: () => gsap.set(pricingCardSubtitles, { clearProps: 'opacity,transform' }),
    }, '-=0.6')
    .to(pricingCardMeta, {
      opacity: 1,
      y: 0,
      duration: 0.6,
      stagger: 0.04,
      ease: 'sine.out',
      onComplete: () => gsap.set(pricingCardMeta, { clearProps: 'opacity,transform' }),
    }, '-=0.4')
    .to(pricingCardCtas, {
      opacity: 1,
      y: 0,
      duration: 0.6,
      stagger: 0.08,
      ease: 'sine.out',
      onComplete: () => gsap.set(pricingCardCtas, { clearProps: 'opacity,transform' }),
    }, '-=0.3');

  // exposed for .cta's own floor — same "chain to whatever comes
  // immediately before" pattern every block after a pin already uses
  pricingEntranceTrigger = tl.scrollTrigger;
}

// ==========================================================================
// PRICING MOBILE — scroll-triggered entrance
// No pin ahead of it on mobile (gallery/steps/stories all skip pin setup on
// mobile, see their own comments), so unlike desktop's runPricingEntrance()
// this needs no startAfterFloor() — plain 'top 80%' is enough, same as
// every other -mobile block. Beat shape and durations are desktop's own
// (eyebrow: sine.out fade+rise; heading: power2.out fade+rise, reused
// verbatim from .hero__title-mobile/.clay__title-mobile's own "3 blurred
// image lines" recipe since pricing-mobile's heading is the same shape;
// cards: gallery-mobile/steps-mobile's single-beat card reveal — mobile
// cards don't get desktop's further title/subtitle/meta/cta breakdown,
// same simplification already applied to every other mobile card block).
// ==========================================================================

let pricingMobileSection, pricingMobileEyebrow, pricingMobileHeadingLines, pricingMobileCards;

function cachePricingMobileRefs() {
  pricingMobileSection = document.querySelector('.pricing-mobile');
  pricingMobileEyebrow = document.querySelector('.pricing-mobile__eyebrow');
  pricingMobileHeadingLines = document.querySelectorAll('.pricing-mobile__heading-line');
  pricingMobileCards = document.querySelectorAll('.pricing-mobile__card');
}

function setInitialPricingMobileStates() {
  if (reducedMotion || !pricingMobileSection) return;

  gsap.set(pricingMobileEyebrow, { opacity: 0, y: 12 });
  gsap.set(pricingMobileHeadingLines, { opacity: 0, y: 30 });
  gsap.set(pricingMobileCards, { opacity: 0, y: 60 });
}

function runPricingMobileEntrance() {
  if (reducedMotion || !hasGSAP || !window.ScrollTrigger || !pricingMobileSection) return;

  gsap.timeline({
    scrollTrigger: { trigger: pricingMobileSection, start: 'top 80%', once: true },
  })
    .to(pricingMobileEyebrow, { opacity: 1, y: 0, duration: 0.6, ease: 'sine.out' })
    .to(pricingMobileHeadingLines, {
      opacity: 1,
      y: 0,
      duration: 0.8,
      stagger: 0.08,
      ease: 'power2.out',
      onComplete: () => gsap.set(pricingMobileHeadingLines, { clearProps: 'transform' }),
    }, '-=0.35')
    .to(pricingMobileCards, {
      opacity: 1,
      y: 0,
      duration: 1.0,
      stagger: 0.1,
      ease: 'power2.out',
      onComplete: () => gsap.set(pricingMobileCards, { clearProps: 'transform' }),
    }, '-=0.3');
}

// ==========================================================================
// CTA SECTION — "11_СТА"
// ==========================================================================

let ctaSection, ctaTop, ctaHeadingRowInners, ctaLead, ctaLeadWords, ctaMedia,
  ctaStatValues, ctaStatSymbols, ctaStatLabels, ctaEntranceTrigger;

function cacheCtaRefs() {
  ctaSection = document.querySelector('.cta');
  ctaTop = document.querySelector('.cta__top');
  ctaHeadingRowInners = document.querySelectorAll('.cta__heading-row-inner');
  ctaLead = document.querySelector('.cta__lead');
  // splitWordsDeep, not splitWords: .cta__lead-strong/-dim are colour tiers
  // that must stay intact around their own words, same reason
  // .material__text uses the deep variant — see BLOCK_STARTER_KIT.md
  ctaLeadWords = ctaLead ? splitWordsDeep(ctaLead) : [];
  ctaMedia = document.querySelector('.cta__media');
  ctaStatValues = document.querySelectorAll('.cta__stat-value');
  ctaStatSymbols = document.querySelectorAll('.cta__stat-symbol');
  ctaStatLabels = document.querySelectorAll('.cta__stat-label');
}

function setInitialCtaStates() {
  if (reducedMotion) return;
  gsap.set(ctaHeadingRowInners, { opacity: 0, yPercent: 100 });
  gsap.set(ctaLead, { opacity: 0, y: 12 });
  gsap.set(ctaLeadWords, { opacity: 0.3 });
  gsap.set(ctaMedia, { opacity: 0, y: 120 });
  gsap.set(ctaStatSymbols, { opacity: 0 });
  gsap.set(ctaStatLabels, { opacity: 0, y: 12 });
  // lock each value's box to its FINAL rendered width before zeroing the
  // text — otherwise "200" collapsing to "0" narrows the item, which
  // (space-between, hug-width items) shifts every stat's x position
  // during the count and leaves alignCtaLead()'s measurement stale by the
  // time it matters
  ctaStatValues.forEach((el) => {
    el.style.minWidth = `${el.getBoundingClientRect().width}px`;
    el.textContent = '0';
  });
}

// Her ask: the lead paragraph's left edge should line up with the second
// stat's ("94%") left edge, one line below. .cta__stats is a flex
// justify-content:space-between row of intrinsically-sized (hug-content)
// items, so that x position isn't a fixed --u value the way the rest of
// this block's geometry is — it shifts with the actual rendered glyph
// widths. Measured live off the real DOM instead, same reasoning
// calibrateFluidUnit() measures --u live rather than hand-computing it,
// and re-run on resize/font-swap for the same reason.
function alignCtaLead() {
  if (!ctaLead || !ctaTop) return;
  const stat2 = document.querySelector('.cta__stats .cta__stat:nth-child(2)');
  if (!stat2) return;
  const topRect = ctaTop.getBoundingClientRect();
  const statRect = stat2.getBoundingClientRect();
  if (!topRect.width || !statRect.width) return;
  ctaLead.style.left = `${statRect.left - topRect.left}px`;
}

// resize itself is handled from inside calibrateFluidUnit() (its
// ResizeObserver catches viewport changes a plain 'resize' listener
// misses); these two cover the remaining cases — late-loading assets and
// the @font-face swap, same as the ScrollTrigger.refresh() calls above
window.addEventListener('load', alignCtaLead);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(alignCtaLead);

// 0 -> target count-up, one independent tween per stat (not a single
// staggered .to() on a shared proxy — each needs its own target value and
// its own element to write into). Runs once, called from the main
// timeline below so it's still gated behind the same ScrollTrigger.
function runCtaCounters() {
  ctaStatValues.forEach((el, i) => {
    const target = parseInt(el.dataset.count, 10) || 0;
    const counter = { val: 0 };
    gsap.to(counter, {
      val: target,
      duration: 1.4,
      delay: i * 0.1,
      ease: 'power1.out',
      onUpdate: () => { el.textContent = Math.round(counter.val); },
    });
  });
}

// Same startAfterFloor() chain philosophy/steps/free-lesson/stories/pricing
// use — see BLOCK_STARTER_KIT.md's "Entrance-timing-after-a-pinned-section
// gotcha". Floored against pricingEntranceTrigger.start (the block
// immediately before this one, same as every other link in the chain),
// with the old storiesPinTrigger floor kept as a fallback for the brief
// window before pricing's own trigger has fired at least once.
function runCtaEntrance() {
  if (reducedMotion || !hasGSAP || !window.ScrollTrigger || !ctaSection) return;

  const floor = () => (pricingEntranceTrigger
    ? pricingEntranceTrigger.start + 80
    : (storiesPinTrigger ? storiesPinTrigger.end + 80 : 0));

  // Beat 1 — heading: kasiasiwosz.com "line" reveal (see
  // ref-kasiasiwosz-text-reveals: mask-slide-fade per line), exact values —
  // y:100%->0%, opacity 0->1, power2.out, duration 0.5, stagger 0.1.
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: ctaSection,
      start: startAfterFloor(ctaSection, floor),
      once: true,
      invalidateOnRefresh: true,
    },
  })
    .to(ctaHeadingRowInners, { opacity: 1, yPercent: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out' })
    .to(ctaLead, { opacity: 1, y: 0, duration: 0.6, ease: 'sine.out' }, '-=0.2')
    .to(ctaMedia, {
      opacity: 1,
      y: 0,
      duration: 1.0,
      ease: 'power4.out',
      onComplete: () => gsap.set(ctaMedia, { clearProps: 'transform' }),
    }, '-=0.3')
    .to(ctaStatSymbols, { opacity: 1, duration: 0.5, stagger: 0.1, ease: 'sine.out' }, '-=0.3')
    .to(ctaStatLabels, { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'sine.out' }, '<')
    .call(runCtaCounters, null, '<');

  ctaEntranceTrigger = tl.scrollTrigger;

  // Beat 2 — lead paragraph: kasiasiwosz.com "word" scroll-scrubbed
  // emphasis (see ref-kasiasiwosz-text-reveals), same tuned values already
  // shipped on .material__text (project-artefact-block4-motion) rather
  // than the raw external ones — dim (0.3) words light up (1) as the
  // scroll passes them. Runs off its own scrub, independent of the
  // once-only timeline above (same split as material's beat 3a/3b).
  gsap.to(ctaLeadWords, {
    opacity: 1,
    ease: 'power2.out',
    duration: 1.4,
    stagger: 0.3,
    scrollTrigger: {
      trigger: ctaLead,
      start: 'top 80%',
      end: 'top 20%',
      scrub: true,
    },
  });
}

// ==========================================================================
// CTA MOBILE — scroll-triggered entrance
// No pin ahead of it on mobile, same reasoning as every other -mobile
// block's plain 'top 80%' (see runPricingMobileEntrance()) — desktop's
// startAfterFloor() chain isn't needed here. Beat shape/values are
// desktop's own runCtaEntrance(): heading -> media -> lead -> stats,
// video and lead reuse desktop's exact recipes verbatim (y:120/power4.out
// for the media, y:12/sine.out for the lead); stats collapse to ONE beat
// per card (opacity+y, no separate symbol/label breakdown) — same
// simplification already applied to every other mobile card row
// (gallery-mobile/steps-mobile/pricing-mobile). Counter still runs
// per-stat off the same data-count attributes as desktop.
// ==========================================================================

let ctaMobileSection, ctaMobileHeading, ctaMobileArt, ctaMobileLead, ctaMobileStats, ctaMobileStatValues;

function cacheCtaMobileRefs() {
  ctaMobileSection = document.querySelector('.cta-mobile');
  ctaMobileHeading = document.querySelector('.cta-mobile__heading');
  ctaMobileArt = document.querySelector('.cta-mobile__art');
  ctaMobileLead = document.querySelector('.cta-mobile__lead');
  ctaMobileStats = document.querySelectorAll('.cta-mobile__stat');
  ctaMobileStatValues = document.querySelectorAll('.cta-mobile__stat-value');
}

function setInitialCtaMobileStates() {
  if (reducedMotion || !ctaMobileSection) return;

  gsap.set(ctaMobileHeading, { opacity: 0, y: 30 });
  gsap.set(ctaMobileArt, { opacity: 0, y: 120 });
  gsap.set(ctaMobileLead, { opacity: 0, y: 12 });
  gsap.set(ctaMobileStats, { opacity: 0, y: 60 });
  // same width-lock as desktop's setInitialCtaStates — stop the digits
  // collapsing to "0" from narrowing the value box and shifting the
  // stat row mid-count
  ctaMobileStatValues.forEach((el) => {
    el.style.minWidth = `${el.getBoundingClientRect().width}px`;
    el.textContent = '0';
  });
}

// same shape as desktop's runCtaCounters(), against the mobile value refs
function runCtaMobileCounters() {
  ctaMobileStatValues.forEach((el, i) => {
    const target = parseInt(el.dataset.count, 10) || 0;
    const counter = { val: 0 };
    gsap.to(counter, {
      val: target,
      duration: 1.4,
      delay: i * 0.1,
      ease: 'power1.out',
      onUpdate: () => { el.textContent = Math.round(counter.val); },
    });
  });
}

function runCtaMobileEntrance() {
  if (reducedMotion || !hasGSAP || !window.ScrollTrigger || !ctaMobileSection) return;

  gsap.timeline({
    scrollTrigger: { trigger: ctaMobileSection, start: 'top 80%', once: true },
  })
    .to(ctaMobileHeading, { opacity: 1, y: 0, duration: 0.9, ease: 'power2.out' })
    .to(ctaMobileArt, {
      opacity: 1,
      y: 0,
      duration: 1.0,
      ease: 'power4.out',
      onComplete: () => gsap.set(ctaMobileArt, { clearProps: 'transform' }),
    }, '-=0.4')
    .to(ctaMobileLead, { opacity: 1, y: 0, duration: 0.6, ease: 'sine.out' }, '-=0.5')
    .to(ctaMobileStats, {
      opacity: 1,
      y: 0,
      duration: 1.0,
      stagger: 0.1,
      ease: 'power2.out',
      onComplete: () => gsap.set(ctaMobileStats, { clearProps: 'transform' }),
    }, '-=0.3')
    .call(runCtaMobileCounters, null, '<');
}

// ==========================================================================
// CTA VIDEO TOGGLE — same play/pause + cursor-label swap as
// .clay__video-toggle (initClayVideoToggle), verbatim, just against the
// button-framed video instead of the full-bleed one.
// ==========================================================================

function initCtaVideoToggle() {
  const toggle = document.querySelector('.cta__media');
  const video = document.querySelector('.cta__media-video');
  if (!toggle || !video) return;

  const cursor = document.getElementById('cursor');
  const cursorLabel = cursor && cursor.querySelector('.cursor__media-label');

  function setState(isPlaying) {
    const label = isPlaying ? 'стоп' : 'грати';
    toggle.dataset.cursorLabel = label;
    toggle.setAttribute('aria-label', isPlaying ? 'Зупинити відео' : 'Відтворити відео');
    if (cursorLabel && cursor.classList.contains('is-media')) {
      cursorLabel.textContent = label;
    }
  }

  toggle.addEventListener('click', () => {
    if (video.paused) {
      video.play();
      setState(true);
    } else {
      video.pause();
      setState(false);
    }
  });
}

// Same play/pause + cursor-label swap as .clay__video-toggle/.cta__media,
// verbatim, plus one addition neither of those needs: this video does NOT
// autoplay (it's a real lesson clip, not a decorative loop), so the play
// glyph (.popup-free-lesson-confirm__play) has to actually reflect
// paused/playing state — toggled via .is-playing on the button itself.
function initFreeLessonConfirmVideoToggle() {
  const toggle = document.querySelector('.popup-free-lesson-confirm__video');
  const video = document.querySelector('.popup-free-lesson-confirm__video-el');
  if (!toggle || !video) return;

  const cursor = document.getElementById('cursor');
  const cursorLabel = cursor && cursor.querySelector('.cursor__media-label');

  function setState(isPlaying) {
    toggle.classList.toggle('is-playing', isPlaying);
    const label = isPlaying ? 'стоп' : 'грати';
    toggle.dataset.cursorLabel = label;
    toggle.setAttribute('aria-label', isPlaying ? 'Зупинити відео' : 'Відтворити відео');
    if (cursorLabel && cursor.classList.contains('is-media')) {
      cursorLabel.textContent = label;
    }
  }

  toggle.addEventListener('click', () => {
    if (video.paused) {
      video.play();
      setState(true);
    } else {
      video.pause();
      setState(false);
    }
  });

  // pause on close — unlike .clay__bg/.cta__media (silent decorative
  // loops), this video plays with real audio, so leaving it running
  // behind a closed curtain would keep audibly playing with nothing on
  // screen. Its own close button only, not every .js-popup-close on the
  // page.
  const closeBtn = document.querySelector('#popup-free-lesson-confirm .js-popup-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      video.pause();
      setState(false);
    });
  }
}

// ==========================================================================
// FAQ SECTION — "12_FAQ"
// ==========================================================================

let faqSection, faqEyebrowWords, faqHeadingA, faqHeadingB, faqLead, faqItems,
  faqAnswerParagraphs, faqEntranceTrigger;

function cacheFaqRefs() {
  faqSection = document.querySelector('.faq');
  const eyebrow = document.querySelector('.faq__eyebrow');
  faqEyebrowWords = eyebrow ? splitWords(eyebrow) : [];
  faqHeadingA = document.querySelector('.faq__heading-a');
  faqHeadingB = document.querySelector('.faq__heading-b');
  faqLead = document.querySelector('.faq__lead');
  faqItems = document.querySelectorAll('.faq__item');
  faqAnswerParagraphs = document.querySelectorAll('.faq__answer-body p');
}

function setInitialFaqStates() {
  if (reducedMotion) return;
  gsap.set(faqEyebrowWords, { opacity: 0 });
  gsap.set([faqHeadingA, faqHeadingB], { opacity: 0, y: 30 });
  gsap.set(faqLead, { opacity: 0, y: 12 });
  gsap.set(faqItems, { opacity: 0, y: 30 });
  // standard "fade + rise" recipe (BLOCK_STARTER_KIT.md) — reused here for
  // the answer copy's own reveal on open, not just the section entrance
  gsap.set(faqAnswerParagraphs, { opacity: 0, y: 12 });
}

// Same startAfterFloor() chain philosophy/steps/free-lesson/stories/pricing/
// cta use — see BLOCK_STARTER_KIT.md's "Entrance-timing-after-a-pinned-
// section gotcha". Floored against ctaEntranceTrigger.start, the block
// immediately before this one.
function runFaqEntrance() {
  if (reducedMotion || !hasGSAP || !window.ScrollTrigger || !faqSection) return;

  const floor = () => (ctaEntranceTrigger ? ctaEntranceTrigger.start + 80 : 0);
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: faqSection,
      start: startAfterFloor(faqSection, floor),
      once: true,
      invalidateOnRefresh: true,
    },
  })
    .to(faqEyebrowWords, { opacity: 1, duration: 0.6, stagger: 0.05, ease: 'sine.out' })
    .to([faqHeadingA, faqHeadingB], {
      opacity: 1,
      y: 0,
      duration: 1.0,
      stagger: 0.08,
      ease: 'power2.out',
      onComplete: () => gsap.set([faqHeadingA, faqHeadingB], { clearProps: 'opacity,transform' }),
    }, '-=0.4')
    .to(faqLead, { opacity: 1, y: 0, duration: 0.6, ease: 'sine.out' }, '-=0.5')
    .to(faqItems, {
      opacity: 1,
      y: 0,
      duration: 0.8,
      stagger: 0.1,
      ease: 'power2.out',
      onComplete: () => gsap.set(faqItems, { clearProps: 'opacity,transform' }),
    }, '-=0.3');

  faqEntranceTrigger = tl.scrollTrigger;
}

// Accordion: each item toggles independently (her call, not single-open).
// The height reveal itself is pure CSS (grid-template-rows on
// .faq__answer-wrap, see style.css); the question no longer changes size
// on open (tried first as font-size, then as a transform to fix the
// resulting jitter, then dropped outright per her ask) — the answer copy's
// own "fade + rise" is the only per-open motion now, same recipe/values as
// every other body-copy reveal on the site (BLOCK_STARTER_KIT.md), just
// fired from a click instead of a ScrollTrigger. No explicit
// ScrollTrigger.refresh() here: opening/closing an item changes
// document.body's height, which the existing ResizeObserver in
// reRefreshCtaTrigger() already reacts to on its own — a second explicit
// refresh from here was redundant, and briefly caused the whole section's
// entrance to replay on every click (see the guard added to
// reRefreshCtaTrigger()).
function initFaqAccordion() {
  document.querySelectorAll('.faq__item').forEach((item) => {
    const btn = item.querySelector('.faq__row');
    const wrap = item.querySelector('.faq__answer-wrap');
    if (!btn || !wrap) return;

    const paragraphs = item.querySelectorAll('.faq__answer-body p');

    btn.addEventListener('click', () => {
      const isOpen = item.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(isOpen));

      if (reducedMotion || !hasGSAP) return;
      if (isOpen) {
        gsap.to(paragraphs, {
          opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'sine.out', overwrite: 'auto',
        });
      } else {
        // instant, not animated — hidden behind the collapsing container
        // anyway, this just re-arms it for the next time it opens
        gsap.set(paragraphs, { opacity: 0, y: 12 });
      }
    });
  });
}

// Mirrors initFaqAccordion() 1:1 against the mobile markup's own
// faq-mobile__* classes (see index.html's block comment on why this isn't
// a shared-class reuse with desktop). No GSAP paragraph fade yet — verstka
// only, same as every other mobile block's first pass; the CSS
// grid-template-rows reveal on .faq-mobile__answer-wrap already carries
// the open/close motion on its own.
function initFaqMobileAccordion() {
  document.querySelectorAll('.faq-mobile__item').forEach((item) => {
    const btn = item.querySelector('.faq-mobile__row');
    const wrap = item.querySelector('.faq-mobile__answer-wrap');
    if (!btn || !wrap) return;

    btn.addEventListener('click', () => {
      const isOpen = item.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(isOpen));
    });
  });
}

// ==========================================================================
// SOCIAL SECTION — "13_соц мережі" (Figma node 978:1536)
//
// Heading -> the word-reveal recipe every heading on the page uses.
// .social__text -> .gallery__note's word-stagger, per her spec ("текст як
//   у 5 блоці між картками").
// .social__hero-photo -> the standard mediaImageGroups() hover-scale +
//   scroll-parallax (registered above, non-interactive photo, not
//   clickable) — entrance below still animates the IMG itself (not the
//   frame), same split steps__art-img/free-lesson__media-img already use,
//   so GSAP's own transform cache composes the entrance y with the
//   hover/parallax's scale/yPercent on the same element instead of two
//   tweens fighting over one CSS `transform`.
// .social__photo cards -> initGalleryPhotoHover()/initStoriesPhotoHover()'s
//   cursor-tracking drift + js-cursor-media "далі", per her instruction
//   that these hover exactly like block 5's ("ховер на картинках як у 5
//   блоці"). Covers the video card too — same button, a <video> in place
//   of the <img>.
//
// Carousel: deliberately NOT the .gallery/.stories page-pin — see the
// index.html comment above .social for why. initSocialCarousel() is a
// self-contained native-scroll carousel (wheel-redirect + pointer drag),
// entirely scoped to .social__carousel; it never reads or writes the
// page's own scroll position.
// ==========================================================================

let socialSection, socialHeadingWords, socialHeroImg, socialTextWords, socialCards;
// Same startAfterFloor() chain philosophy/steps/free-lesson/stories/pricing/
// cta/faq use — see BLOCK_STARTER_KIT.md's "Entrance-timing-after-a-pinned-
// section gotcha". THIS WAS MISSING in the first pass: a plain 'top 80%'
// resolves against the raw document scroll position, but .gallery and
// .stories both pin the viewport for a long stretch earlier on the page —
// the trigger fired (and finished) while gallery/stories were still
// visually holding the screen, long before she ever scrolled far enough to
// actually see .social. Floored against faqEntranceTrigger.start, the block
// immediately before this one — same reasoning faq itself uses against cta.
let socialEntranceTrigger;

function cacheSocialRefs() {
  socialSection = document.querySelector('.social');
  socialHeadingWords = document.querySelectorAll('.social__heading-word');
  socialHeroImg = document.querySelector('.social__hero-photo-img');

  const text = document.querySelector('.social__text');
  socialTextWords = text ? splitWords(text) : [];

  socialCards = document.querySelectorAll('.social__card');
}

function setInitialSocialStates() {
  if (reducedMotion) return;
  gsap.set(socialHeadingWords, { opacity: 0 });
  gsap.set(socialHeroImg, { opacity: 0, y: 120 });
  gsap.set(socialTextWords, { opacity: 0 });
  gsap.set(socialCards, { opacity: 0, y: 90 });
}

function runSocialEntrance() {
  if (reducedMotion || !hasGSAP || !window.ScrollTrigger || !socialSection) return;

  const floor = () => (faqEntranceTrigger ? faqEntranceTrigger.start + 80 : 0);
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: socialSection,
      start: startAfterFloor(socialSection, floor),
      once: true,
      invalidateOnRefresh: true,
    },
  })
    .to(socialHeadingWords, { opacity: 1, duration: 0.9, stagger: 0.08, ease: 'sine.out' })
    .to(socialHeroImg, {
      opacity: 1,
      y: 0,
      duration: 1.2,
      ease: 'power4.out',
      // clearProps: 'transform' (NOT included here on purpose, unlike every
      // other entrance beat) — this image also carries a scroll-scrubbed
      // yPercent parallax (mediaImageGroups(), still running long after this
      // entrance completes). Clearing the inline transform out from under a
      // still-active scrub tween read as a one-frame snap: her report,
      // 2026-08-07, "дергається, ніби падає знизу вгору" right as the block
      // enters view. Only opacity needs clearing here; the parallax already
      // owns `transform` indefinitely afterward and keeps it correct on its
      // own next tick regardless of whether this clears it first.
      onComplete: () => gsap.set(socialHeroImg, { clearProps: 'opacity' }),
    }, '-=0.5')
    .to(socialTextWords, { opacity: 1, duration: 0.8, stagger: 0.05, ease: 'sine.out' }, '-=0.8')
    .to(socialCards, {
      opacity: 1,
      y: 0,
      duration: 0.8,
      stagger: 0.08,
      ease: 'power2.out',
      onComplete: () => gsap.set(socialCards, { clearProps: 'opacity,transform' }),
    }, '-=0.7');

  socialEntranceTrigger = tl.scrollTrigger;
}

let socialMobileSection, socialMobileHeadingRows, socialMobileText, socialMobileHeroImg, socialMobileCards;

function cacheSocialMobileRefs() {
  socialMobileSection = document.querySelector('.social-mobile');
  socialMobileHeadingRows = document.querySelectorAll('.social-mobile__heading-row');
  socialMobileText = document.querySelector('.social-mobile__text');
  socialMobileHeroImg = document.querySelector('.social-mobile__hero-photo');
  socialMobileCards = document.querySelectorAll('.social-mobile__card');
}

function setInitialSocialMobileStates() {
  if (reducedMotion || !socialMobileSection) return;
  gsap.set(socialMobileHeadingRows, { opacity: 0, y: 20 });
  gsap.set(socialMobileText, { opacity: 0, y: 12 });
  gsap.set(socialMobileHeroImg, { opacity: 0, y: 60 });
  gsap.set(socialMobileCards, { opacity: 0, y: 40 });
}

// No startAfterFloor chain needed here — unlike desktop's runSocialEntrance
// (floored against faqEntranceTrigger), initSocialCarousel()'s pin is
// skipped entirely on mobile (see its own matchMedia guard), so there's no
// upstream pinned section whose resolved geometry this needs to wait on.
// Same reasoning every other -mobile entrance (stories/pricing/cta) already
// relies on with a plain 'top 80%'.
function runSocialMobileEntrance() {
  if (reducedMotion || !hasGSAP || !window.ScrollTrigger || !socialMobileSection) return;

  gsap.timeline({
    scrollTrigger: { trigger: socialMobileSection, start: 'top 80%', once: true },
  })
    .to(socialMobileHeadingRows, {
      opacity: 1,
      y: 0,
      duration: 0.8,
      stagger: 0.08,
      ease: 'power2.out',
      onComplete: () => gsap.set(socialMobileHeadingRows, { clearProps: 'transform' }),
    })
    .to(socialMobileText, { opacity: 1, y: 0, duration: 0.6, ease: 'sine.out' }, '-=0.4')
    .to(socialMobileHeroImg, {
      opacity: 1,
      y: 0,
      duration: 1.0,
      ease: 'power4.out',
      onComplete: () => gsap.set(socialMobileHeroImg, { clearProps: 'opacity,transform' }),
    }, '-=0.3')
    .to(socialMobileCards, {
      opacity: 1,
      y: 0,
      duration: 0.8,
      stagger: 0.08,
      ease: 'power2.out',
      onComplete: () => gsap.set(socialMobileCards, { clearProps: 'opacity,transform' }),
    }, '-=0.5');
}

// Verbatim initStoriesPhotoHover()/initGalleryPhotoHover() recipe (scale
// 1.05 + cursor-tracking parallax drift via gsap.quickTo, GALLERY_HOVER_SHIFT
// reused so the drift feels like the same effect). No caption to fade, same
// as stories. `img, video` covers the one video card transparently.
function initSocialPhotoHover() {
  if (!hasGSAP) return;

  const isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!isFinePointer) return;

  document.querySelectorAll('.social__photo').forEach((frame) => {
    const media = frame.querySelector('img, video');
    if (!media) return;

    const driftX = gsap.quickTo(media, 'x', { duration: 0.9, ease: 'power3' });
    const driftY = gsap.quickTo(media, 'y', { duration: 0.9, ease: 'power3' });

    frame.addEventListener('mouseenter', () => {
      gsap.to(media, { scale: 1.05, duration: 0.7, ease: 'power2.out', overwrite: 'auto' });
    });

    frame.addEventListener('mousemove', (event) => {
      const rect = frame.getBoundingClientRect();
      const u = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--u')) || 1;
      const shift = GALLERY_HOVER_SHIFT * u;
      driftX(-(((event.clientX - rect.left) / rect.width) * 2 - 1) * shift);
      driftY(-(((event.clientY - rect.top) / rect.height) * 2 - 1) * shift);
    });

    frame.addEventListener('mouseleave', () => {
      gsap.to(media, { scale: 1, duration: 1.0, ease: 'power2.out', overwrite: 'auto' });
      driftX(0);
      driftY(0);
    });
  });
}

// ==========================================================================
// SOCIAL CAROUSEL — her explicit spec, verbatim: "як у 5 блоці". Same
// mechanism as initGalleryCarousel()/initGallerySettle()
// (pin + scrub-x + idle-triggered Lenis settle, never ScrollTrigger's
// `snap` — project hard rule, fights Lenis). The whole .social section
// pins (matching gallery, which pins its whole section too — unlike
// stories, this block has no "taller than viewport" problem that would
// force pinning off a narrower sub-element instead), .social__track is
// what scrubs, .social__carousel is just the overflow:hidden mask around
// it (== .gallery's own section boundary playing the same role).
//
// STOPS. 7 cards, 3 visible at once -> 4 possible shift positions (leftmost
// visible card index 0..4), i.e. 4 pitches of travel — finer-grained than
// gallery's 2-stop system since there's no note-panel obstruction here to
// design the grid around, just plain card-by-card paging.
// ==========================================================================

const SOCIAL_CARD_PITCH = 295 + 10;                         // card + gap, u
const SOCIAL_VISIBLE = 3;
const SOCIAL_CARD_COUNT = 7;
const SOCIAL_STOPS = SOCIAL_CARD_COUNT - SOCIAL_VISIBLE;     // 4
const SOCIAL_TRAVEL = SOCIAL_CARD_PITCH * SOCIAL_STOPS;      // 1220u
const SOCIAL_PAGE_SCROLL = 600;                              // u of scroll per stop
const SOCIAL_SETTLE_IDLE = 120;                              // ms of stillness before settling
const SOCIAL_SETTLE_DURATION = 0.5;                          // s, the settle itself

let socialPinTrigger;

function initSocialCarousel() {
  if (reducedMotion || !hasGSAP || !window.ScrollTrigger) return;
  // desktop-only pin+scrub carousel — same reasoning as initGalleryCarousel()/
  // initStoriesCarousel()'s own mobile guard: on mobile .social__track is
  // display:none (replaced by .social-mobile's plain native horizontal
  // scroll), but pin:socialSection doesn't know that and still wraps the
  // whole section in a GSAP pin-spacer sized for the desktop scrub distance,
  // holding the page in place for that entire distance regardless. Skipping
  // pin setup entirely on mobile avoids the pin-spacer existing at all.
  if (window.matchMedia('(max-width: 768px)').matches) return;

  const track = document.querySelector('.social__track');
  if (!track || !socialSection) return;

  const u = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--u')) || 1;

  const tween = gsap.fromTo(track,
    { x: 0 },
    {
      x: () => -SOCIAL_TRAVEL * u(),
      ease: 'none',
      scrollTrigger: {
        trigger: socialSection,
        // 'top top', NOT gallery's 'bottom bottom': gallery is 1153u tall —
        // taller than a typical viewport — so 'top top' would pin it before
        // the card row (near its bottom) had even scrolled into view.
        // .social is only 890u, comfortably SHORTER than the viewport in
        // every realistic case, so the opposite problem hits instead: with
        // 'bottom bottom', the pin engages once the section's BOTTOM is
        // flush with the viewport bottom — at that moment the section's TOP
        // is still well below the viewport's top edge, and fixing it there
        // for the whole pin left a gap above it showing bare (transparent/
        // white) <body> once .faq had scrolled out from under it. 'top top'
        // pins flush with no gap, and the whole short section (including
        // the card row) is already on screen by then regardless.
        start: 'top top',
        end: () => `+=${SOCIAL_STOPS * SOCIAL_PAGE_SCROLL * u()}`,
        pin: true,
        anticipatePin: 1,
        scrub: 1,
        invalidateOnRefresh: true,
      },
    });

  socialPinTrigger = tween.scrollTrigger;
  initSocialSettle(tween.scrollTrigger);
}

// Settle: identical shape to initGallerySettle()/initStoriesSettle() — see
// initGallerySettle()'s own header comment for why this goes through
// lenis.scrollTo() rather than ScrollTrigger's `snap`.
function initSocialSettle(st) {
  if (!st || !lenis) return;

  const stops = [];
  for (let i = 0; i <= SOCIAL_STOPS; i += 1) stops.push(i / SOCIAL_STOPS);

  let idleTimer;

  const settle = () => {
    if (!st.isActive) return;

    const progress = st.progress;
    const nearest = stops.reduce((best, s) => (
      Math.abs(s - progress) < Math.abs(best - progress) ? s : best
    ), stops[0]);

    const target = st.start + (st.end - st.start) * nearest;
    if (Math.abs(target - window.scrollY) < 2) return;

    lenis.scrollTo(target, {
      duration: SOCIAL_SETTLE_DURATION,
      easing: (t) => 1 - Math.pow(1 - t, 3),
    });
  };

  lenis.on('scroll', () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(settle, SOCIAL_SETTLE_IDLE);
  });
}

// ==========================================================================
// FOOTER — "14_футер" (Figma node 978:1556), the last block
//
// Beat order mirrors the section top-to-bottom, same as every other
// section's entrance: nav -> subscribe heading -> subscribe form -> social
// links -> contacts -> logo -> copyright.
//
// .social pins its whole section (see initSocialCarousel()'s own comment),
// so — same reasoning philosophy uses against galleryPinTrigger and pricing
// uses against storiesPinTrigger — a plain 'top 80%' here can fire while
// .social is still visually holding the screen. Floored against
// socialPinTrigger.end, the immediately-preceding pin, via the same
// startAfterFloor() chain every section since philosophy uses. See
// BLOCK_STARTER_KIT.md's "Entrance-timing-after-a-pinned-section gotcha".
// ==========================================================================

let footerSection, footerMenuLinks, footerHeading, footerSubscribeForm,
  footerSocialLinks, footerContactItems, footerLogo, footerCopyright;
let footerEntranceTrigger;

function cacheFooterRefs() {
  footerSection = document.querySelector('.footer');
  footerMenuLinks = document.querySelectorAll('.footer__menu-link');
  footerHeading = document.querySelector('.footer__subscribe-heading');
  footerSubscribeForm = document.querySelector('.footer__subscribe-form');
  footerSocialLinks = document.querySelectorAll('.footer__social-link');
  footerContactItems = document.querySelectorAll('.footer__contact-item');
  footerLogo = document.querySelector('.footer__logo');
  footerCopyright = document.querySelector('.footer__copyright');
}

function setInitialFooterStates() {
  if (reducedMotion) return;
  gsap.set(footerMenuLinks, { opacity: 0, y: 12 });
  gsap.set(footerHeading, { opacity: 0, y: 30 });
  gsap.set(footerSubscribeForm, { opacity: 0, y: 12 });
  gsap.set(footerSocialLinks, { opacity: 0, y: 12 });
  gsap.set(footerContactItems, { opacity: 0, y: 12 });
  gsap.set(footerLogo, { opacity: 0, y: 40 });
  gsap.set(footerCopyright, { opacity: 0, y: 12 });
}

function runFooterEntrance() {
  if (reducedMotion || !hasGSAP || !window.ScrollTrigger || !footerSection) return;

  const floor = () => (socialPinTrigger ? socialPinTrigger.end + 60 : 0);
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: footerSection,
      start: startAfterFloor(footerSection, floor),
      once: true,
      invalidateOnRefresh: true,
    },
  })
    .to(footerMenuLinks, { opacity: 1, y: 0, duration: 0.6, stagger: 0.05, ease: 'sine.out' })
    .to(footerHeading, {
      opacity: 1,
      y: 0,
      duration: 1.0,
      ease: 'power2.out',
      onComplete: () => gsap.set(footerHeading, { clearProps: 'opacity,transform' }),
    }, '-=0.3')
    .to(footerSubscribeForm, { opacity: 1, y: 0, duration: 0.6, ease: 'sine.out' }, '-=0.6')
    .to(footerSocialLinks, { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'sine.out' }, '-=0.4')
    .to(footerContactItems, { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'sine.out' }, '-=0.5')
    .to(footerLogo, {
      opacity: 1,
      y: 0,
      duration: 1.0,
      ease: 'power2.out',
      onComplete: () => gsap.set(footerLogo, { clearProps: 'opacity,transform' }),
    }, '-=0.5')
    .to(footerCopyright, { opacity: 1, y: 0, duration: 0.6, ease: 'sine.out' }, '-=0.5');

  footerEntranceTrigger = tl.scrollTrigger;
}

let footerMobileSection, footerMobileHeading, footerMobileForm, footerMobileSocialLinks,
  footerMobileContacts, footerMobileLogo, footerMobileCopyright;

function cacheFooterMobileRefs() {
  footerMobileSection = document.querySelector('.footer-mobile');
  footerMobileHeading = document.querySelector('.footer-mobile__subscribe-heading');
  footerMobileForm = document.querySelector('.footer-mobile__subscribe-form');
  footerMobileSocialLinks = document.querySelectorAll('.footer-mobile__social-link');
  footerMobileContacts = document.querySelector('.footer-mobile__contacts');
  footerMobileLogo = document.querySelector('.footer-mobile__logo');
  footerMobileCopyright = document.querySelector('.footer-mobile__copyright');
}

function setInitialFooterMobileStates() {
  if (reducedMotion || !footerMobileSection) return;
  gsap.set(footerMobileHeading, { opacity: 0, y: 20 });
  gsap.set(footerMobileForm, { opacity: 0, y: 12 });
  gsap.set(footerMobileSocialLinks, { opacity: 0, y: 12 });
  gsap.set(footerMobileContacts, { opacity: 0, y: 12 });
  gsap.set(footerMobileLogo, { opacity: 0, y: 30 });
  gsap.set(footerMobileCopyright, { opacity: 0, y: 12 });
}

// No menu beat (mobile footer has no nav) and no startAfterFloor chain
// (same reasoning as runSocialMobileEntrance — .footer's own pin-adjacent
// concerns are all desktop-only), otherwise the same beat order as
// runFooterEntrance: subscribe -> social links -> contacts -> logo -> copyright.
function runFooterMobileEntrance() {
  if (reducedMotion || !hasGSAP || !window.ScrollTrigger || !footerMobileSection) return;

  gsap.timeline({
    scrollTrigger: { trigger: footerMobileSection, start: 'top 80%', once: true },
  })
    .to(footerMobileHeading, {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: 'power2.out',
      onComplete: () => gsap.set(footerMobileHeading, { clearProps: 'transform' }),
    })
    .to(footerMobileForm, { opacity: 1, y: 0, duration: 0.6, ease: 'sine.out' }, '-=0.4')
    .to(footerMobileSocialLinks, { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'sine.out' }, '-=0.3')
    .to(footerMobileContacts, { opacity: 1, y: 0, duration: 0.6, ease: 'sine.out' }, '-=0.4')
    .to(footerMobileLogo, {
      opacity: 1,
      y: 0,
      duration: 0.9,
      ease: 'power2.out',
      onComplete: () => gsap.set(footerMobileLogo, { clearProps: 'transform' }),
    }, '-=0.4')
    .to(footerMobileCopyright, { opacity: 1, y: 0, duration: 0.6, ease: 'sine.out' }, '-=0.5');
}

// ==========================================================================
// INIT
// ==========================================================================

cacheHeroRefs();
cacheMenuRefs();
cacheCraftRefs();
cacheClayRefs();
cacheMaterialRefs();
cacheGalleryRefs();
cacheGalleryMobileRefs();
cachePhilosophyRefs();
cachePhilosophyMobileRefs();
cacheStepsRefs();
cacheStepsMobileRefs();
cacheFreeLessonRefs();
cacheFreeLessonMobileRefs();
cacheStoriesRefs();
cacheStoriesMobileRefs();
cachePricingRefs();
cachePricingMobileRefs();
cacheCtaRefs();
cacheCtaMobileRefs();
cacheFaqRefs();
cacheSocialRefs();
cacheSocialMobileRefs();
cacheFooterRefs();
cacheFooterMobileRefs();
alignCtaLead();
// Own ResizeObserver rather than hooking into calibrateFluidUnit(): that
// function runs once immediately at parse time (line ~39, long before
// ctaTop/ctaLead exist), and calling into alignCtaLead() from inside it
// hit those `let` bindings while still in their temporal dead zone —
// an uncaught ReferenceError on that very first synchronous call, which
// aborted the rest of this script (nothing after it, including every
// other block's init calls below, ever ran). Observing .cta__top directly
// here is set up only after cacheCtaRefs() has already run, so the TDZ has
// long closed by the time this fires.
if (typeof ResizeObserver !== 'undefined' && ctaTop) {
  new ResizeObserver(alignCtaLead).observe(ctaTop);
}
if (hasGSAP) {
  setInitialHeroStates();
  setInitialMenuState();
  setInitialCraftStates();
  setInitialClayStates();
  setInitialMaterialStates();
  setInitialGalleryStates();
  setInitialGalleryMobileStates();
  setInitialPhilosophyStates();
  setInitialPhilosophyMobileStates();
  setInitialStepsStates();
  setInitialStepsMobileStates();
  setInitialFreeLessonStates();
  setInitialFreeLessonMobileStates();
  setInitialStoriesStates();
  setInitialStoriesMobileStates();
  setInitialPricingStates();
  setInitialPricingMobileStates();
  setInitialCtaStates();
  setInitialCtaMobileStates();
  setInitialFaqStates();
  setInitialSocialStates();
  setInitialSocialMobileStates();
  setInitialFooterStates();
  setInitialFooterMobileStates();
}
initPreloader();
initGlassCursor();
initCustomCursor();
initMenuOverlay();
initPopups();
runCraftEntrance();
initMediaImageHover();
initMediaImageParallax();
runGalleryEntrance();
runGalleryMobileEntrance();
// Must run BEFORE runPhilosophyEntrance()/runStepsEntrance()/
// runFreeLessonEntrance() — all three read galleryPinTrigger (set inside
// this call) via afterGalleryPin()'s start functions. Those functions
// only get INVOKED on a ScrollTrigger refresh, and the unconditional
// refresh() at the bottom of this file happens after every init call here
// regardless of order, so this "worked" even with the old order — but it
// relied on that refresh papering over galleryPinTrigger being undefined
// at the moment philosophy's/steps'/free-lesson's triggers were first
// created, which is fragile or an implementation detail, not a documented
// guarantee. Ordering it correctly removes the dependency on that entirely.
initGalleryCarousel();
runPhilosophyEntrance();
runPhilosophyMobileEntrance();
runStepsEntrance();
runStepsMobileEntrance();
initStepHoverGuard();
runFreeLessonEntrance();
runFreeLessonMobileEntrance();
runStoriesEntrance();
runStoriesMobileEntrance();
runPricingEntrance();
runPricingMobileEntrance();
runCtaEntrance();
runCtaMobileEntrance();
runFaqEntrance();
initFaqAccordion();
initFaqMobileAccordion();
runSocialEntrance();
runSocialMobileEntrance();
initGalleryPhotoHover();
initStoriesPhotoHover();
initSocialPhotoHover();
initStoriesReviews();
initStoriesCarousel();
initSocialCarousel();
runFooterEntrance();
runFooterMobileEntrance();
initOliveGrain();
runClayEntrance();
runMaterialEntrance();
initClayVideoParallax();
initClayVideoToggle();
initCtaVideoToggle();
initFreeLessonConfirmVideoToggle();
initScrollDownArrows();
initAnchorNav();
initScrollUpArrows();
initGalleryFilter();
initDragScrollRow('.gallery-mobile__row');
initDragScrollRow('.steps-mobile__row');
initDragScrollRow('.stories-mobile__row');
initDragScrollRow('.pricing-mobile__row');
initDragScrollRow('.cta-mobile__stats-row');
initDragScrollRow('.social-mobile__row');
initSectionScrollLag();

// Settles the page's final layout, including the gallery's pin spacer —
// every entrance trigger from philosophy onward re-measures its own live
// position via startAfterFloor() on this and every later refresh, so no
// separate correction pass is needed here.
if (hasGSAP && window.ScrollTrigger) ScrollTrigger.refresh();
reRefreshCtaTrigger();

// initParallax() and initHeroScrollLag() are both triggered by
// runHeroEntrance() once the master entrance timeline finishes, not
// eagerly here — see runHeroEntrance()'s own comment for why
// initHeroScrollLag() specifically can't run any earlier.
