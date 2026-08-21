/* ═══════════════════════════════════════════════════════
   main.js — курсор, языки, меню, анимации
   ═══════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var lerp = function (a, b, t) { return a + (b - a) * t; };

  /* ─── 1. Разбивка заголовков на строки ───────────────── */
  /* Каждая строка едет из-под маски. Пересобирается после
     смены языка, потому что там переписывается innerHTML.   */
  function splitLines(el, lang) {
    // запоминаем исходник, иначе при повторном вызове спаны вложатся друг в друга
    if (el._orig === undefined) el._orig = el.innerHTML;

    var html = el.getAttribute('data-' + lang);
    if (html === null) html = el._orig;

    var parts = html.split(/<br\s*\/?>/i);
    var out = '';
    for (var i = 0; i < parts.length; i++) {
      out += '<span class="line"><span class="line__inner" style="--i:' + i + '">'
           + parts[i] + '</span></span>';
    }
    el.innerHTML = out;
  }

  function applySplits(lang) {
    document.querySelectorAll('[data-split]').forEach(function (el) {
      splitLines(el, lang);
    });
  }

  /* ─── 2. Переключение языка ──────────────────────────── */
  var langButtons = document.querySelectorAll('.lang__btn');

  function setLang(lang) {
    if (lang !== 'ru' && lang !== 'en') lang = 'ru';
    document.documentElement.lang = lang;

    document.querySelectorAll('[data-' + lang + ']').forEach(function (el) {
      el.innerHTML = el.getAttribute('data-' + lang);
    });

    applySplits(lang);

    langButtons.forEach(function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-lang') === lang);
    });

    try { localStorage.setItem('lang', lang); } catch (e) {}
  }

  langButtons.forEach(function (b) {
    b.addEventListener('click', function () {
      setLang(b.getAttribute('data-lang'));
      closeNav();
    });
  });

  var saved = null;
  try { saved = localStorage.getItem('lang'); } catch (e) {}
  if (!saved) saved = (navigator.language || 'ru').toLowerCase().indexOf('ru') === 0 ? 'ru' : 'en';
  setLang(saved);

  /* ─── 3. Интро при загрузке ──────────────────────────── */
  function markLoaded() { document.documentElement.classList.add('is-loaded'); }

  // два кадра — чтобы браузер успел применить стартовые стили и анимация пошла
  requestAnimationFrame(function () { requestAnimationFrame(markLoaded); });
  // подстраховка: в фоновой вкладке кадров нет, а таймеры идут —
  // иначе шапка так и осталась бы уехавшей за верхний край
  setTimeout(markLoaded, 400);
  window.addEventListener('load', markLoaded);

  /* ─── 4. Кастомный курсор ────────────────────────────── */
  var ring = document.getElementById('cursorRing');
  var dot  = document.getElementById('cursorDot');
  var finePointer = window.matchMedia('(pointer: fine)').matches;
  var cursorOn = finePointer && ring && dot;

  var mx = window.innerWidth / 2, my = window.innerHeight / 2;
  var rx = mx, ry = my;

  if (cursorOn) {
    document.documentElement.classList.add('has-cursor');

    document.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)';
    });

    document.addEventListener('mouseover', function (e) {
      var t = e.target.closest('[data-cursor], a, button');
      ring.classList.remove('is-link', 'is-card');
      if (!t) return;
      ring.classList.add(t.getAttribute('data-cursor') === 'card' ? 'is-card' : 'is-link');
    });

    document.addEventListener('mousedown', function () {
      ring.classList.add('is-down'); dot.classList.add('is-down');
    });
    document.addEventListener('mouseup', function () {
      ring.classList.remove('is-down'); dot.classList.remove('is-down');
    });
    document.addEventListener('mouseleave', function () {
      ring.style.opacity = '0'; dot.style.opacity = '0';
    });
    document.addEventListener('mouseenter', function () {
      ring.style.opacity = '1'; dot.style.opacity = '1';
    });
  }

  /* ─── 5. Магнитные кнопки ────────────────────────────── */
  /* Кнопка слегка тянется к курсору в радиусе своего блока. */
  if (finePointer && !reduced) {
    document.querySelectorAll('.btn, .logo').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2);
        var dy = e.clientY - (r.top + r.height / 2);
        el.style.transition = 'transform .25s cubic-bezier(.16,1,.3,1)';
        el.style.transform = 'translate3d(' + dx * 0.22 + 'px,' + dy * 0.28 + 'px,0)';
      });
      el.addEventListener('mouseleave', function () {
        el.style.transition = 'transform .7s cubic-bezier(.16,1,.3,1)';
        el.style.transform = '';
      });
    });
  }

  /* ─── 6. Свечение под курсором на карточках ──────────── */
  if (finePointer && !reduced) {
    document.querySelectorAll('.card').forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }

  /* ─── 7. Общий цикл анимации ─────────────────────────── */
  /* Один requestAnimationFrame на курсор и полосу прогресса.
     Фон намеренно неподвижен — не параллаксится и не наезжает. */
  var progressBar = document.getElementById('progressBar');
  var smoothY = window.scrollY;

  function frame() {
    if (cursorOn) {
      rx = lerp(rx, mx, 0.16);
      ry = lerp(ry, my, 0.16);
      ring.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0)';
    }

    smoothY = lerp(smoothY, window.scrollY, 0.09);

    var max = document.documentElement.scrollHeight - window.innerHeight;
    var progress = max > 0 ? Math.min(smoothY / max, 1) : 0;

    if (progressBar) {
      progressBar.style.transform = 'scaleX(' + progress + ')';
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ─── 8. Мобильное меню ──────────────────────────────── */
  var burger = document.getElementById('burger');

  function closeNav() {
    document.body.classList.remove('nav-open');
    if (burger) burger.setAttribute('aria-expanded', 'false');
  }

  if (burger) {
    burger.addEventListener('click', function () {
      var open = document.body.classList.toggle('nav-open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }
  document.querySelectorAll('.nav a').forEach(function (a) {
    a.addEventListener('click', closeNav);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeNav();
  });

  /* ─── 9. Шапка при скролле ───────────────────────────── */
  var header = document.getElementById('header');
  function onScroll() {
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 40);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ─── 10. Появление блоков ───────────────────────────── */
  var reveals = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ─── 11. Активный пункт меню ────────────────────────── */
  var sections = document.querySelectorAll('main section[id]');
  var navLinks = document.querySelectorAll('.nav a');

  if ('IntersectionObserver' in window && sections.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var id = en.target.id;
        navLinks.forEach(function (l) {
          l.classList.toggle('is-active', l.getAttribute('href') === '#' + id);
        });
      });
    }, { threshold: 0.4 });

    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ─── 12. Год в подвале ──────────────────────────────── */
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

})();
