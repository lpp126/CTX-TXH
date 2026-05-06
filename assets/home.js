(function () {
  'use strict';

  var SITE_FIELDS = {
    hero_kicker: 'heroKicker',
    hero_title: 'heroTitle',
    hero_desc: 'heroDesc',
    feature_title: 'featureTitle',
    feature_desc: 'featureDesc',
    claim_title: 'claimTitle',
    claim_desc: 'claimDesc',
    news_1: 'news1',
    news_2: 'news2',
    news_3: 'news3'
  };

  var menuBtn = document.getElementById('menuToggle');
  var nav = document.getElementById('topNav');
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', function () {
      nav.classList.toggle('is-open');
    });
    nav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        nav.classList.remove('is-open');
      });
    });
  }

  var slides = Array.prototype.slice.call(document.querySelectorAll('.slide'));
  var dotsWrap = document.getElementById('dots');
  if (!slides.length || !dotsWrap) return;

  if (window.YYRL_API && window.YYRL_API.fetchPublicSite) {
    window.YYRL_API.fetchPublicSite().then(function (data) {
      if (!data || data.error || !data.site) return;
      Object.keys(SITE_FIELDS).forEach(function (k) {
        if (data.site[k] == null || data.site[k] === '') return;
        var el = document.getElementById(SITE_FIELDS[k]);
        if (el) el.textContent = data.site[k];
      });
    }).catch(function () {
      // ignore
    });
  }

  slides.forEach(function (slide, idx) {
    var src = slide.getAttribute('data-src');
    if (src) {
      var img = new Image();
      img.onload = function () {
        slide.style.backgroundImage = "url('" + src + "')";
      };
      img.src = src;
    }
    var dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'dot' + (idx === 0 ? ' is-active' : '');
    dot.setAttribute('aria-label', '跳转到第' + (idx + 1) + '张');
    dot.addEventListener('click', function () {
      go(idx);
      restart();
    });
    dotsWrap.appendChild(dot);
  });

  var dots = Array.prototype.slice.call(dotsWrap.querySelectorAll('.dot'));
  var current = 0;
  var timer = null;

  function render() {
    slides.forEach(function (s, i) {
      s.classList.toggle('is-active', i === current);
    });
    dots.forEach(function (d, i) {
      d.classList.toggle('is-active', i === current);
    });
  }

  function go(i) {
    current = (i + slides.length) % slides.length;
    render();
  }

  function next() {
    go(current + 1);
  }

  function start() {
    timer = setInterval(next, 4800);
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  function restart() {
    stop();
    start();
  }

  var prevBtn = document.getElementById('prevSlide');
  var nextBtn = document.getElementById('nextSlide');
  if (prevBtn) prevBtn.addEventListener('click', function () { go(current - 1); restart(); });
  if (nextBtn) nextBtn.addEventListener('click', function () { go(current + 1); restart(); });

  var carousel = document.getElementById('carousel');
  if (carousel) {
    carousel.addEventListener('mouseenter', stop);
    carousel.addEventListener('mouseleave', start);
    carousel.addEventListener('touchstart', stop, { passive: true });
    carousel.addEventListener('touchend', start, { passive: true });
  }

  render();
  start();
})();
