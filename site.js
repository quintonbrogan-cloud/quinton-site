// Shared helpers for the dark redesign. Reads PORTFOLIO from /data.js.
var SECTIONS = [
  { key: 'commercial', label: 'Commercial', href: '/commercial' },
  { key: 'foodBev', label: 'Food / Bev', href: '/food-bev' },
  { key: 'musicVideo', label: 'Music Video', href: '/music-video' },
  { key: 'doc', label: 'Doc', href: '/docu' }
];

function sectionItems(key) {
  if (key === 'foodBev') return PORTFOLIO.commercial.filter(function (p) { return p.foodBev; });
  return PORTFOLIO[key] || [];
}

// "Brand - Spot" -> ["Brand", "Spot"]
function splitTitle(t) {
  var s = t.split(/\s+[-–]\s*/);
  return s.length > 1 && s[0] ? [s[0], s.slice(1).join(' - ')] : [t, ''];
}

function stillFor(p) {
  if (p.coverImage) return p.coverImage;
  var m = (p.video || '').match(/\/video\/(\d+)/);
  if (m) return 'https://vumbnail.com/' + m[1] + '.jpg';
  m = (p.video || '').match(/youtube\.com\/embed\/([^?]+)/);
  if (m) return 'https://i.ytimg.com/vi/' + m[1] + '/hqdefault.jpg';
  return '';
}

function coverVideo(src, eager) {
  var v = document.createElement('video');
  v.muted = true; v.loop = true; v.playsInline = true; v.autoplay = true;
  v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
  v.preload = 'none';
  if (eager) v.src = src; else v.dataset.src = src;
  return v;
}

function coverMedia(p, eager) {
  if (p.cover) return coverVideo(p.cover, eager);
  var img = document.createElement('img');
  img.loading = 'lazy'; img.alt = p.title; img.src = stillFor(p);
  return img;
}

function safePlay(v) { var r = v.play(); if (r && r.catch) r.catch(function () {}); }

// Load and play cover videos only while they are on screen.
function observeVideos(root) {
  if (!('IntersectionObserver' in window)) {
    root.querySelectorAll('video').forEach(function (v) { if (!v.src && v.dataset.src) v.src = v.dataset.src; safePlay(v); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var v = e.target;
      if (e.isIntersecting) { if (!v.src && v.dataset.src) v.src = v.dataset.src; safePlay(v); }
      else v.pause();
    });
  }, { rootMargin: '200px' });
  root.querySelectorAll('video').forEach(function (v) { io.observe(v); });
}

function makeTile(p, label) {
  var a = document.createElement('a');
  a.className = 'tile'; a.href = '/portfolio/' + p.slug;
  a.appendChild(coverMedia(p));
  var s = splitTitle(p.title);
  a.insertAdjacentHTML('beforeend', '<div class="t"><b>' + s[0] + '</b><span>' + (s[1] || label || '') + '</span></div>');
  return a;
}

// Credits-list page for one section.
function renderCredits(key) {
  var items = sectionItems(key);
  var sec = SECTIONS.filter(function (s) { return s.key === key; })[0];
  document.getElementById('h').textContent = sec.label;
  document.getElementById('cnt').textContent = items.length + (items.length === 1 ? ' project' : ' projects');
  var list = document.getElementById('list'), bg = document.getElementById('bg'), shown = {};
  var mobile = matchMedia('(max-width: 860px)').matches;
  // Clients that appear more than once in this list get their spot name in the big title.
  var seen = {};
  items.forEach(function (p) { var c = splitTitle(p.title)[0].toLowerCase(); seen[c] = (seen[c] || 0) + 1; });
  items.forEach(function (p, k) {
    var s = splitTitle(p.title), li = document.createElement('li');
    var repeat = s[1] && seen[s[0].toLowerCase()] > 1;
    var big = repeat ? s[0] + ' <em>' + s[1] + '</em>' : s[0];
    li.innerHTML = '<a href="/portfolio/' + p.slug + '"><span class="n">' + String(k + 1).padStart(2, '0') + '</span><span class="c">' + big + '</span><span class="s">' + (repeat ? '' : s[1]) + '</span></a>';
    var a = li.firstChild;
    if (mobile) {
      var t = document.createElement('div'); t.className = 'thumb'; t.appendChild(coverMedia(p)); a.appendChild(t);
    } else {
      a.addEventListener('mouseenter', function () {
        if (!shown[p.slug]) { shown[p.slug] = coverMedia(p, true); bg.appendChild(shown[p.slug]); }
        Object.keys(shown).forEach(function (k2) { shown[k2].classList.toggle('on', k2 === p.slug); });
        if (shown[p.slug].play) safePlay(shown[p.slug]);
      });
    }
    list.appendChild(li);
  });
  list.addEventListener('mouseleave', function () {
    Object.keys(shown).forEach(function (k2) { shown[k2].classList.remove('on'); });
  });
  if (mobile) observeVideos(list);
}

// Home: hero that cycles the first spots, then the full grid.
function renderHome() {
  var items = PORTFOLIO.commercial.filter(function (p) { return !p.hideHome; }).map(function (p) { return Object.assign({ cat: 'Commercial' }, p); });
  [['musicVideo', 'Music Video'], ['doc', 'Doc']].forEach(function (c) {
    PORTFOLIO[c[0]].forEach(function (p) { if (p.showHome) items.push(Object.assign({ cat: c[1] }, p)); });
  });

  var hero = document.getElementById('hero'), heroItems = items.filter(function (p) { return p.cover; }).slice(0, 6), hv = [], cur = 0;
  heroItems.forEach(function (p, k) { var v = coverVideo(p.hero || p.cover, k === 0); if (k === 0) v.classList.add('on'); hero.prepend(v); hv.push(v); });
  function setNow() { var p = heroItems[cur]; document.getElementById('now').innerHTML = 'Now playing: <a href="/portfolio/' + p.slug + '">' + p.title + '</a>'; }
  if (hv.length) {
    setNow();
    setTimeout(function () { if (hv[1] && !hv[1].src) hv[1].src = heroItems[1].hero || heroItems[1].cover; }, 3000);
    setInterval(function () {
      if (document.hidden) return;
      var nxt = (cur + 1) % hv.length;
      if (!hv[nxt].src) hv[nxt].src = heroItems[nxt].hero || heroItems[nxt].cover;
      hv[nxt].currentTime = 0; safePlay(hv[nxt]);
      hv[nxt].classList.add('on'); hv[cur].classList.remove('on'); cur = nxt; setNow();
      var n2 = (cur + 1) % hv.length; if (!hv[n2].src) hv[n2].src = heroItems[n2].hero || heroItems[n2].cover;
    }, 7000);
  }

  var g = document.getElementById('grid');
  items.forEach(function (p) { g.appendChild(makeTile(p, p.cat)); });
  observeVideos(g);

  var hdr = document.querySelector('.hdr');
  addEventListener('scroll', function () { hdr.classList.toggle('solid', scrollY > innerHeight * 0.8); }, { passive: true });
}

// Project page.
function renderProject() {
  var slug = decodeURIComponent(location.pathname.split('/portfolio/')[1] || '').replace(/\/$/, '');
  var key = null, item = null;
  ['commercial', 'musicVideo', 'doc'].forEach(function (k) {
    PORTFOLIO[k].forEach(function (p) { if (p.slug === slug) { item = p; key = k; } });
  });
  if (!item) return;
  var sec = SECTIONS.filter(function (s) { return s.key === key; })[0];
  document.title = item.title + ' - Quinton Brogan';
  document.querySelectorAll('.nav a').forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === sec.href); });

  var url = item.video;
  if (item.type === 'youtube') url += '?autoplay=0&rel=0';
  if (item.type === 'vimeo') url += '?title=0&byline=0&portrait=0';
  if (item.type === 'wistia') url += '?autoPlay=false';
  var s = splitTitle(item.title);
  document.getElementById('detail').innerHTML =
    '<div class="player"><iframe src="' + url + '" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div>' +
    '<div class="dmeta"><h1>' + s[0] + (s[1] ? '<small>' + s[1] + '</small>' : '') + '</h1>' +
    '<a class="kicker" href="' + sec.href + '">More ' + sec.label + ' →</a></div>';

  // Three more from the same section, starting after this one.
  var pool = PORTFOLIO[key].filter(function (p) { return p.slug !== slug; });
  var start = PORTFOLIO[key].indexOf(item) % Math.max(pool.length, 1);
  var more = pool.slice(start).concat(pool.slice(0, start)).slice(0, 3);
  if (more.length) {
    var g = document.getElementById('moregrid');
    more.forEach(function (p) { g.appendChild(makeTile(p, sec.label)); });
    document.getElementById('more').hidden = false;
    observeVideos(g);
  }
}

// Phone menu: a button that opens the nav as a full-screen overlay.
(function () {
  var hdr = document.querySelector('.hdr'), nav = hdr && hdr.querySelector('.nav');
  if (!nav) return;
  var b = document.createElement('button');
  b.className = 'menu-btn'; b.type = 'button'; b.setAttribute('aria-label', 'Menu'); b.setAttribute('aria-expanded', 'false');
  b.innerHTML = '<span></span><span></span>';
  hdr.appendChild(b);
  function set(open) { document.body.classList.toggle('menu-open', open); b.setAttribute('aria-expanded', open ? 'true' : 'false'); }
  b.addEventListener('click', function () { set(!document.body.classList.contains('menu-open')); });
  nav.addEventListener('click', function (e) { if (e.target.tagName === 'A') set(false); });
  addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
})();
