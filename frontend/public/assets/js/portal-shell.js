/* One Health portal — shared page shell (Govt of India strip, masthead, main menu, partners, footer).
   Usage: <div id="shell-top" data-active="home"></div> ... <div id="shell-bottom"></div>
   data-mode="login" = sign-in page (no menu).  data-mode="public" = public page (public menu + Sign in button). */
(function () {
  var ICONS = {
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    logout: '<path d="m16 17 5-5-5-5"/><path d="M21 12H9"/><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>',
    menu: '<path d="M4 12h16"/><path d="M4 6h16"/><path d="M4 18h16"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    back: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    chev: '<path d="m9 18 6-6-6-6"/>',
    home: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .71-1.53l7-6a2 2 0 0 1 2.58 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    landmark: '<path d="M10 18v-7"/><path d="M11.12 2.198a2 2 0 0 1 1.76.006l7.866 3.847c.476.233.31.949-.22.949H3.474c-.53 0-.695-.716-.22-.949z"/><path d="M14 18v-7"/><path d="M18 18v-7"/><path d="M3 22h18"/><path d="M6 18v-7"/>',
    database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>',
    radio: '<path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/>',
    hourglass: '<path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/>',
    heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/>',
    paw: '<circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"/>',
    leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
    wild: '<path d="M16 7h.01"/><path d="M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20"/><path d="m20 7 2 .5-2 .5"/><path d="M10 18v3"/><path d="M14 17.75V21"/><path d="M7 18a6 6 0 0 0 3.84-10.61"/>',
    handshake: '<path d="m11 17 2 2a1 1 0 1 0 3-3"/><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"/><path d="m21 3 1 11h-2"/><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3"/><path d="M3 4h8"/>',
    check: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
    minus: '<circle cx="12" cy="12" r="10"/><path d="M8 12h8"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    pin: '<path d="M20 10c0 4.99-5.54 10.19-7.4 11.8a1 1 0 0 1-1.2 0C9.54 20.19 4 14.99 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
    mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    login: '<path d="m10 17 5-5-5-5"/><path d="M15 12H3"/><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>'
  };
  var sprite = '<svg width="0" height="0" style="position:absolute" aria-hidden="true">' +
    Object.keys(ICONS).map(function (k) { return '<symbol id="i-' + k + '" viewBox="0 0 24 24">' + ICONS[k] + '</symbol>'; }).join('') + '</svg>';

  var TABS = [
    ['home', 'Home', 'dashboard.html'], ['surveillance', 'Surveillance', 'surveillance.html'], ['riskmap', 'Risk Map'], ['diseases', 'Diseases', 'diseases.html'],
    ['early', 'Early Warning', 'early-warning.html', 4], ['initiative', 'One Health Initiative'], ['resources', 'Resources'],
    ['log', 'Log'], ['audit', 'Audit'], ['datasource', 'Data Sources']
  ];
  /* The parts of Surveillance: shown as a drop-down list under the Surveillance tab */
  var SURV = [['human', 'Human', 'surveillance.html'], ['animal', 'Animal', 'surveillance.html?view=animal'], ['environment', 'Environment', 'surveillance.html?view=environment'],
    ['wildlife', 'Wildlife', 'surveillance.html?view=wildlife'], ['labs', 'Referral labs network', 'surveillance.html?view=labs']];
  var SURV_PART = { vaccinations: 'animal', livestock: 'animal' };
  /* Public page menu: links to the sections of that page */
  var PUBLIC_TABS = [['top', 'Home'], ['about', 'About One Health'], ['advisories', 'Disease Advisories'], ['stories', 'Stories &amp; Information'], ['partners', 'Partners'], ['helplines', 'Helplines']];

  /* Who is signed in (set by the sign-in page). A department login sees only its own department page. */
  var U = {};
  try { U = JSON.parse(sessionStorage.getItem('oh_session') || '{}') || {}; } catch (e) {}
  var DEPT = { mohfw: 'Health & Family Welfare', dahd: 'Animal Husbandry & Dairying', forest: 'Environment, Forest & Climate Change', imd: 'India Meteorological Dept.',
    icar: 'ICAR', municipal: 'Municipal Corporation', fssai: 'FSSAI', pcb: 'Pollution Control Board' };
  var dept = U.role === 'ministry' && DEPT[U.ministry] ? U.ministry : '';
  var sup = U.role === 'supervisor' && U.supId ? U : null;   /* a COHV supervisor: own team only, trimmed menu */
  var HOME = sup ? 'supervisor-dashboard.html' : (dept ? 'ministry.html?id=' + dept : 'dashboard.html');
  window.OH_USER = { dept: dept, home: HOME, sup: sup };
  /* the four tabs a COHV supervisor sees */
  var SUP_TABS = [['sup-dashboard', 'Dashboard', 'supervisor-dashboard.html'], ['sup-approvals', 'Approvals', 'supervisor-approvals.html'], ['sup-reports', 'Reports'], ['resources', 'Resources']];

  var top = document.getElementById('shell-top');
  var active = top ? top.getAttribute('data-active') : '';
  var view = new URLSearchParams(location.search).get('view') || 'human', part = SURV_PART[view] || view;   /* which part of Surveillance is open */
  var mode = top ? top.getAttribute('data-mode') : '';
  var login = mode === 'login', pub = mode === 'public';
  if (login) document.body.classList.add('login-page');
  if (pub) document.body.classList.add('public-page');
  if (top) {
    top.outerHTML = sprite +
      '<a class="skip" href="#main">Skip to main content</a>' +
      '<div class="gov"><div class="wrap">' +
        '<div class="gov-l"><img src="assets/img/emblem-white.png" alt=""><span class="hi">भारत सरकार</span><span class="sep" aria-hidden="true"></span><b class="en">Government of India</b></div>' +
        '<div class="gov-r"><a class="hide-sm" href="#main">Skip to main content</a><span class="div hide-sm" aria-hidden="true"></span>' +
          '<span class="fs" role="group" aria-label="Text size"><button data-fs="sm" aria-pressed="false" aria-label="Smaller text">A-</button><button data-fs="" aria-pressed="true" aria-label="Normal text">A</button><button data-fs="lg" aria-pressed="false" aria-label="Larger text">A+</button></span>' +
          '<span class="div fs-div" aria-hidden="true"></span>' +
          '<span class="lang" role="group" aria-label="Language"><button aria-pressed="true">English</button><button class="hi" aria-pressed="false" data-toast="हिन्दी संस्करण — preview only">हिन्दी</button></span>' +
        '</div></div></div>' +
      '<header class="mast"><div class="wrap">' +
        (login ? '' : '<button class="ibtn menu-btn" id="menu" aria-label="Open menu" aria-expanded="false" aria-controls="tabs"><svg class="i"><use href="#i-menu"/></svg></button>') +
        '<div class="mast-logos">' +
          '<a class="oh" href="' + (login || pub ? 'index.html' : HOME) + '" aria-label="One Health — Home"><svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="22" cy="24" r="14" fill="#b85c78" opacity="0.85"/><circle cx="42" cy="24" r="14" fill="#f97316" opacity="0.85"/><circle cx="32" cy="42" r="14" fill="#22c55e" opacity="0.85"/></svg>' +
          '<span><b>ONE HEALTH</b><small>Integrated Surveillance Portal · India</small></span></a></div>' +
        '<div class="mast-r"><div class="partners-top"><img src="assets/img/nohm.png" alt="National One Health Mission"><img class="ncdc" src="assets/img/ncdc.png" alt="National Centre for Disease Control"></div>' +
          (login
            ? '<a class="mast-link" href="index.html"><svg class="i"><use href="#i-back"/></svg>Public portal</a></div>'
            : pub ? '<a class="btn mast-signin" href="login-web.html"><svg class="i"><use href="#i-login"/></svg>Sign in</a></div>'
            : '<div class="user"><span class="avatar" aria-hidden="true">' + (sup ? 'SV' : dept ? 'NO' : 'NA') + '</span><div class="who"><b>' + (sup ? 'COHV Supervisor' : dept ? 'Nodal Officer' : 'National Administrator') + '</b><small>' + (sup ? String(U.title || 'Supervisor').replace(/&/g, '&amp;') : dept ? DEPT[dept].replace(/&/g, '&amp;') : 'NOHM / NCDC') + '</small></div>' +
              '<a class="ibtn" href="login-web.html" id="logout" aria-label="Sign out" title="Sign out"><svg class="i"><use href="#i-logout"/></svg></a></div></div>') +
      '</div></header>' +
      (login ? '<div class="nav-line" aria-hidden="true"></div>' :
       pub ? '<nav class="nav" id="nav" aria-label="Main"><div class="wrap"><div class="tabs" id="tabs">' +
        PUBLIC_TABS.map(function (t, i) { return '<a href="#' + t[0] + '" data-sec="' + t[0] + '"' + (i ? '' : ' aria-current="page"') + '>' + t[1] + '</a>'; }).join('') +
      '</div></div></nav>' :
       sup ? '<nav class="nav" id="nav" aria-label="Main"><div class="wrap"><div class="tabs" id="tabs">' +
        SUP_TABS.map(function (t) { var cur = t[0] === active ? ' aria-current="page"' : ''; var link = t[2] || ''; var toast = link ? '' : ' data-toast="' + t[1] + ' — next screen"'; return '<a href="' + (link || '#') + '"' + cur + toast + '>' + t[1] + '</a>'; }).join('') +
        '<a class="m-only" href="login-web.html">Sign out</a></div></div></nav>' :
      '<nav class="nav" id="nav" aria-label="Main"><div class="wrap"><div class="tabs" id="tabs">' +
        TABS.map(function (t) {
          var cur = t[0] === active ? ' aria-current="page"' : '';
          var link = t[0] === 'home' ? HOME : (t[2] && !dept ? t[2] : '');   /* pages other than Home are built for NOHM / NCDC only */
          var href = link || '#';
          var toast = link ? '' : ' data-toast="' + t[1] + ' — next screen"';
          if (t[0] === 'surveillance' && link) {   /* desktop: a button that opens the list; phone menu: the five links, listed under the label */
            return '<button type="button" class="dd" id="dd-surv" aria-haspopup="true" aria-expanded="false" aria-controls="dd-surv-menu"' + (cur ? ' data-current' : '') + '>' + t[1] + '<svg class="i" aria-hidden="true"><use href="#i-chev"/></svg></button>' +
              SURV.map(function (s) { return '<a class="m-sub" href="' + s[2] + '"' + (cur && s[0] === part ? ' aria-current="page"' : '') + '>' + s[1] + '</a>'; }).join('');
          }
          return '<a href="' + href + '"' + cur + toast + '>' + t[1] + (t[3] ? '<span class="count">' + t[3] + '</span>' : '') + '</a>';
        }).join('') +
        '<a class="m-only" href="login-web.html">Sign out</a>' +
      '</div><button class="nav-search" data-toast="Search — preview only"><svg class="i"><use href="#i-search"/></svg>Search</button>' +
      (dept ? '' : '<ul class="ddmenu" id="dd-surv-menu" hidden>' + SURV.map(function (s) { return '<li><a href="' + s[2] + '"' + (active === 'surveillance' && s[0] === part ? ' aria-current="page"' : '') + '>' + s[1] + '</a></li>'; }).join('') + '</ul>') +
      '</div></nav>');
  }

  var bottom = document.getElementById('shell-bottom');
  if (bottom) {
    bottom.outerHTML =
      (login || pub ? '' : '<section class="partners" aria-label="In coordination with"><div class="wrap"><span>In coordination with</span>' +
        '<img src="assets/img/nohm.png" alt="National One Health Mission">' +
        '<img class="sm" src="assets/img/ncdc.png" alt="National Centre for Disease Control"></div></section>') +
      '<footer class="foot"><div class="wrap foot-main">' +
        '<div class="foot-brand"><svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="22" cy="24" r="14" fill="#b85c78" opacity="0.9"/><circle cx="42" cy="24" r="14" fill="#f97316" opacity="0.9"/><circle cx="32" cy="42" r="14" fill="#22c55e" opacity="0.9"/></svg>' +
        '<b>ONE HEALTH</b><small>Integrated Surveillance Portal · India</small></div>' +
        '<nav aria-label="Footer">' +
        ['Website Policies', 'Accessibility Statement', 'Help', 'Contact Us', 'Feedback'].map(function (x) { return '<a href="#" data-toast="' + x + ' — preview only">' + x + '</a>'; }).join('') +
        '</nav></div>' +
        '<div class="foot-base"><div class="wrap"><p>Content owned by National Centre for Disease Control, Ministry of Health and Family Welfare, Government of India.</p>' +
        (login ? '<p>For authorised government users only.</p>' : '') + '</div></div></footer>' +
      '<div class="toast" id="toast" role="status" aria-live="polite"></div>';
  }

  /* Text size */
  try { var saved = localStorage.getItem('oh_fs'); if (saved) document.documentElement.classList.add('fs-' + saved); } catch (e) {}
  document.querySelectorAll('[data-fs]').forEach(function (b) {
    var cur = document.documentElement.classList.contains('fs-sm') ? 'sm' : document.documentElement.classList.contains('fs-lg') ? 'lg' : '';
    b.setAttribute('aria-pressed', b.dataset.fs === cur ? 'true' : 'false');
    b.addEventListener('click', function () {
      document.documentElement.classList.remove('fs-sm', 'fs-lg');
      if (b.dataset.fs) document.documentElement.classList.add('fs-' + b.dataset.fs);
      try { localStorage.setItem('oh_fs', b.dataset.fs); } catch (e) {}
      document.querySelectorAll('[data-fs]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
    });
  });

  /* Menu (tablet / phone) */
  var menu = document.getElementById('menu'), nav = document.getElementById('nav');
  if (menu) menu.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    menu.setAttribute('aria-expanded', open ? 'true' : 'false');
    menu.innerHTML = '<svg class="i"><use href="#i-' + (open ? 'x' : 'menu') + '"/></svg>';
  });
  /* Surveillance drop-down list: opens on click or when the pointer is on it; closes on Esc, on a click elsewhere, or when the pointer leaves */
  var dd = document.getElementById('dd-surv'), ddm = document.getElementById('dd-surv-menu'), ddt;
  if (dd && ddm) {
    var place = function () { ddm.style.left = Math.max(0, Math.round(dd.getBoundingClientRect().left - ddm.parentNode.getBoundingClientRect().left)) + 'px'; };
    var show = function (on) { clearTimeout(ddt); if (on) place(); ddm.hidden = !on; dd.setAttribute('aria-expanded', on ? 'true' : 'false'); };
    var later = function () { clearTimeout(ddt); ddt = setTimeout(function () { show(false); }, 180); };
    dd.addEventListener('click', function () { if (matchMedia('(max-width:1023px)').matches) return; show(ddm.hidden); });
    [dd, ddm].forEach(function (x) {
      x.addEventListener('mouseenter', function () { if (matchMedia('(hover:hover) and (min-width:1024px)').matches) show(true); });
      x.addEventListener('mouseleave', later);
    });
    dd.addEventListener('keydown', function (e) { if (e.key === 'ArrowDown') { e.preventDefault(); show(true); ddm.querySelector('a').focus(); } });
    ddm.addEventListener('keydown', function (e) {
      var links = Array.prototype.slice.call(ddm.querySelectorAll('a')), i = links.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); links[(i + 1) % links.length].focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); links[(i - 1 + links.length) % links.length].focus(); }
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !ddm.hidden) { show(false); dd.focus(); } });
    document.addEventListener('click', function (e) { if (!ddm.hidden && !e.target.closest('#dd-surv, #dd-surv-menu')) show(false); });
    document.getElementById('tabs').addEventListener('scroll', function () { show(false); });
    window.addEventListener('resize', function () { show(false); });
  }

  /* phone menu closes after a section link is chosen */
  document.querySelectorAll('.tabs a[data-sec]').forEach(function (a) { a.addEventListener('click', function () { if (nav && nav.classList.contains('open') && menu) menu.click(); }); });

  /* Opening the sign-in page, or pressing Sign out, ends the session */
  function signOut() { try { sessionStorage.removeItem('oh_session'); sessionStorage.removeItem('oh_role'); sessionStorage.removeItem('oh_user'); } catch (e) {} }
  if (login) signOut();
  document.querySelectorAll('#logout, .tabs .m-only').forEach(function (a) { a.addEventListener('click', signOut); });

  /* Preview-only links */
  var toast = document.getElementById('toast'), tt;
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-toast]');
    if (!a || !toast) return;
    e.preventDefault();
    toast.textContent = a.getAttribute('data-toast'); toast.classList.add('show');
    clearTimeout(tt); tt = setTimeout(function () { toast.classList.remove('show'); }, 2200);
    if (nav) nav.classList.remove('open');
  });
})();
