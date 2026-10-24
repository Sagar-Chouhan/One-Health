/* One Health portal — Early Warning & Prediction Alerts.
   A map of India, state by state, built the same way as the Diseases map: layers that colour the states, a pointer (circle) for each disease
   in each state, rivers, zoom, full screen, hover box with the scale, legends, a count line, and a side panel (States | Alerts).
   Choosing a state draws that state alone. Figures are the predicted risk, 0 to 100, for the next 30, 60 or 90 days.
   Boundaries: assets/js/india-geo.js (census-based). Rivers: assets/js/india-rivers.js (Natural Earth), used when the file is present. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  function fmt(n) { return Number(n).toLocaleString('en-IN'); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }
  function opt(list) { return list.map(function (o) { return '<option value="' + esc(o[0]) + '">' + o[1] + '</option>'; }).join(''); }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return (h % 1000) / 1000; }
  function clamp(v) { return Math.max(0, Math.min(100, Math.round(v))); }
  var INK = '#1f2a44', FONT = "Inter, -apple-system, 'Segoe UI', Roboto, sans-serif";

  /* ---------------------------------------------------------------- Diseases */
  var ORDER = ['avian', 'kfd', 'bruc'];
  var DIS = {
    avian: { name: 'Avian Influenza', color: '#4f95e0', driver: 'Poultry deaths and wild-bird stopovers' },
    kfd: { name: 'Kyasanur Forest Disease', short: 'KFD', color: '#12876f', driver: 'Monkey deaths, humidity and tick season' },
    bruc: { name: 'Brucellosis', color: '#7a2fa8', driver: 'Herd test results and raw-milk use' }
  };
  var LETTER = { avian: 'A', kfd: 'K', bruc: 'B' };

  /* ---------------------------------------------------------------- Boundaries */
  var GEO = (window.OH_INDIA_GEO ? window.OH_INDIA_GEO.features : []).map(function (f) {
    return { type: 'Feature', properties: { name: f.properties.n, code: f.properties.c, xy: f.properties.xy }, geometry: f.geometry };
  });
  var BYCODE = {}, CODE = {};
  GEO.forEach(function (f) { BYCODE[f.properties.code] = f; CODE[f.properties.name] = f.properties.code; });
  function nameOf(c) { return BYCODE[c].properties.name; }
  var NAMES = GEO.map(function (f) { return [f.properties.code, f.properties.name]; }).sort(function (a, b) { return a[1] < b[1] ? -1 : 1; });

  /* ---------------------------------------------------------------- Risk today, 0 to 100: [Avian Influenza, KFD, Brucellosis]. null = the disease is not reported in that state. */
  var RISK = {
    KL: [82, 61, 38], MH: [70, 34, 45], HR: [76, null, 58], PB: [58, null, 66], RJ: [48, null, 60], GJ: [44, null, 57], UP: [52, null, 55], BR: [60, null, 36], JH: [72, null, 30],
    OD: [64, null, 34], WB: [56, null, 32], AS: [68, null, 28], AP: [66, 18, 47], TG: [78, 36, 64], TN: [74, 69, 70], KA: [52, 84, 48], GA: [22, 46, 14], MP: [42, null, 44],
    CG: [40, null, 30], DL: [50, null, 22], HP: [26, null, 32], UK: [28, null, 30], JK: [30, null, 34]
  };
  GEO.forEach(function (f) {
    var c = f.properties.code;
    if (!RISK[c]) RISK[c] = [Math.round(8 + hash(c + 'a') * 22), null, Math.round(8 + hash(c + 'b') * 24)];
  });
  var NOLABEL = 'DD,CH,DL,PY,LD,GA,SK,TR,MZ,MN,NL,ML,AN'.split(',');   /* too small to carry a name; the hover box names them */
  var HOT = 'RJ,GJ,MP,UP,BR,MH,TG,AP,TN,CG,OD,DL,HR,PB,KA,JH'.split(','), COLD = 'JK,LA,HP,UK,SK,AR'.split(',');
  var WET = 'KL,GA,KA,ML,AS,AR,SK,TR,MN,MZ,NL,WB,OD,UK,AN'.split(','), DRY = 'RJ,GJ,LA,JK,DL,HR,PB'.split(',');
  var GREEN = 'KA,KL,UK,HP,AR,AS,ML,MN,MZ,NL,SK,TR,GA,CG,OD,JH'.split(',');
  function inList(l, c) { return l.indexOf(c) >= 0; }
  var TEMP = {}, RAIN = {}, ENVV = {};
  GEO.forEach(function (f) {
    var c = f.properties.code, h = hash(c + 't'), h2 = hash(c + 'r'), h3 = hash(c + 'e');
    TEMP[c] = clamp(inList(HOT, c) ? 55 + h * 30 : inList(COLD, c) ? 5 + h * 20 : 35 + h * 25);
    RAIN[c] = clamp(inList(WET, c) ? 60 + h2 * 30 : inList(DRY, c) ? 10 + h2 * 25 : 30 + h2 * 30);
    ENVV[c] = clamp(inList(GREEN, c) ? 55 + h3 * 25 : 25 + h3 * 30);
  });

  var PERIODS = [['30', 'Next 30 days'], ['60', 'Next 60 days'], ['90', 'Next 90 days']];
  function risk(c, k, p) {   /* risk of one disease in one state for the chosen period */
    var b = RISK[c][ORDER.indexOf(k)]; if (b == null) return null;
    return clamp(b + (p / 30 - 1) * (hash(c + k) * 16 - 5));
  }
  function overall(c, p) {
    var v = ORDER.map(function (k) { return risk(c, k, p); }).filter(function (x) { return x != null; });
    return clamp(0.65 * Math.max.apply(null, v) + 0.35 * v.reduce(function (a, b) { return a + b; }, 0) / 3);
  }
  var SCALE = { avian: 140, kfd: 70, bruc: 100 };
  function expected(c, k, p) {   /* cases expected in the period */
    var r = risk(c, k, p); if (r == null) return null;
    return Math.max(r >= 25 ? 1 : 0, Math.round(Math.pow(r / 100, 1.7) * SCALE[k] * (0.7 + hash(c + k + 'x') * 0.6) * (p / 30)));
  }

  /* ---------------------------------------------------------------- Alerts (newest first): [state, disease, text, when] */
  var ALERTS = [
    ['KL', 'avian', 'Duck deaths are rising in Alappuzha. Bird flu is likely in nearby poultry farms within 10 days.', '2 hours ago'],
    ['KA', 'kfd', 'Monkey deaths found near the Shivamogga forest edge. KFD cases in people are likely within 2 weeks.', '3 hours ago'],
    ['TG', 'avian', 'Poultry cluster confirmed in Sangareddy. A 10 km watch zone is active and nearby districts are at risk.', '5 hours ago'],
    ['HR', 'avian', 'Sick poultry reported in Panchkula and Karnal. Spread to nearby farms is likely within 7 days.', '8 hours ago'],
    ['TN', 'kfd', 'Humidity is 86% in the Nilgiris, which helps ticks multiply. KFD risk is rising for forest-edge villages.', '10 hours ago'],
    ['TN', 'bruc', 'Herd test positivity is 5.2% in the Erode dairy belt. Dairy workers are at risk over the next month.', '1 day ago'],
    ['JH', 'avian', 'Poultry deaths reported near Ranchi. Spread to neighbouring districts is possible within 2 weeks.', '1 day ago'],
    ['MH', 'avian', 'Crows found dead in Latur and Beed. Poultry farms nearby are on watch.', '1 day ago'],
    ['AS', 'avian', 'Migratory birds are stopping at wetlands near Kaziranga. Risk to backyard poultry is rising.', '2 days ago'],
    ['PB', 'bruc', 'More cattle are testing positive in Ludhiana and Patiala dairy herds. People who handle milk are at risk.', '2 days ago'],
    ['GA', 'kfd', 'Tick season has started in Sattari. Forest-edge villages are on watch.', '3 days ago']
  ];

  /* ---------------------------------------------------------------- Layers and colours */
  var LAYERS = [
    { k: 'risk', name: 'Overall risk', dot: '#e38a33', title: 'Predicted outbreak risk',
      explain: 'How likely an outbreak is in each state in the chosen period, from 0 to 100. It is worked out from animal, weather and forest signals. A darker state has a higher risk.' },
    { k: 'human', name: 'Human', dot: '#b38160', title: 'Risk of human cases',
      explain: 'How likely it is that people will fall ill, from 0 to 100. A darker state has a higher risk of human cases.' },
    { k: 'animal', name: 'Animal', dot: '#3f82cf', title: 'Risk in animals',
      explain: 'How likely outbreaks in livestock and poultry are, from 0 to 100. A darker state has a higher risk in animals.' },
    { k: 'wild', name: 'Wildlife', dot: '#9261c4', title: 'Warning signs in wildlife',
      explain: 'Risk worked out from monkeys, wild birds and wild boar found dead. They warn of KFD, Avian Influenza and Brucellosis before people or livestock fall ill.' },
    { k: 'env', name: 'Environment', dot: '#3f9c86', title: 'Environment signal',
      explain: 'How well forest, wetland and land conditions suit the ticks, birds and animals that carry these diseases, from 0 to 100.' },
    { k: 'temp', name: 'Temperature', dot: '#d2554a', title: 'Land-surface temperature',
      explain: 'How hot the land surface is expected to be, from satellite (MODIS), from 0 to 100. A darker state is hotter.' },
    { k: 'rain', name: 'Rain', dot: '#35adb5', title: 'Expected rainfall',
      explain: 'Rainfall level expected by IMD, from 0 to 100. A darker state gets more rain. More rain brings more ticks and mosquitoes.' }
  ];
  var LAYER = {}; LAYERS.forEach(function (l) { LAYER[l.k] = l; });
  /* amber to burnt orange for risk (never red); the other layers follow the project manager's colour rule */
  var RAMP = {
    risk: ['#fbe9b7', '#f3c36a', '#e38a33', '#a8470f'], nude: ['#ecd2bd', '#d6ab8b', '#b38160', '#80553a'], blue: ['#bcd6f2', '#86b3e6', '#3f82cf', '#1b579c'],
    purple: ['#e4d8f2', '#c2a5e2', '#9261c4', '#5f2d91'], green: ['#d3e8e0', '#94c9b8', '#3f9c86', '#0e6b58'], red: ['#f6cfc8', '#ea9a8c', '#d2554a', '#9c2a22'], aqua: ['#c9ecec', '#8ad3d6', '#35adb5', '#137a83']
  };
  var RAMP_OF = { risk: 'risk', human: 'nude', animal: 'blue', wild: 'purple', env: 'green', temp: 'red', rain: 'aqua' };
  var STEPS = [[0, 24, '0 to 24', 'Low'], [25, 49, '25 to 49', 'Moderate'], [50, 74, '50 to 74', 'High'], [75, 100, '75 to 100', 'Very high']];
  var TAG = [['#e6eaf0', '#334155'], ['#fbe3a6', '#5f3b06'], ['#f7c98b', '#5f3b06'], ['#9a3412', '#fff']];   /* level tags: Low, Moderate, High, Very high */
  var NONE = '#e6e9ee', RIVER = '#2c7fc9';
  function stepIndex(v) { if (v == null) return -1; for (var i = 0; i < 4; i++) if (v >= STEPS[i][0] && v <= STEPS[i][1]) return i; return -1; }

  var DEF = { dis: 'all', level: 'all', period: '30' };
  var S = { state: 'all', layer: 'risk', view: 'list', all: false, rivers: true, lines: true, zoom: 1, center: null, fs: false };
  Object.keys(DEF).forEach(function (k) { S[k] = DEF[k]; });
  var q = new URLSearchParams(location.search);
  if (BYCODE[q.get('state')]) S.state = q.get('state');
  if (DIS[q.get('disease')]) S.dis = q.get('disease');
  if (LAYER[q.get('layer')]) S.layer = q.get('layer');
  if (['30', '60', '90'].indexOf(q.get('period')) >= 0) S.period = q.get('period');
  if (['0', '1', '2', '3'].indexOf(q.get('level')) >= 0) S.level = q.get('level');
  if (q.get('view') === 'alerts') S.view = 'alerts';

  function P() { return +S.period; }
  function keys() { return S.dis === 'all' ? ORDER : [S.dis]; }
  function ramp() { return RAMP[RAMP_OF[S.layer]]; }
  /* value of the chosen layer in one state, 0 to 100; null where the chosen disease is not reported */
  function raw(c) {
    var p = P(), L = S.layer;
    if (L === 'temp') return TEMP[c];
    if (L === 'rain') return RAIN[c];
    if (L === 'env') return ENVV[c];
    var base;
    if (S.dis === 'all') {
      var v = ORDER.map(function (k) { return risk(c, k, p); }).filter(function (x) { return x != null; });
      base = L === 'risk' ? overall(c, p) : L === 'wild' ? Math.max(risk(c, 'avian', p) || 0, risk(c, 'kfd', p) || 0) : Math.max.apply(null, v);
    } else {
      base = risk(c, S.dis, p); if (base == null) return null;
      if (L === 'wild' && S.dis === 'bruc') base *= 0.5;
    }
    if (L === 'risk') return base;
    if (L === 'human') return clamp(base * 0.8 + hash(c + 'human') * 20);
    if (L === 'animal') return clamp(base * 0.9 + hash(c + 'animal') * 10);
    return clamp(base * 0.75 + hash(c + 'wild') * 20);
  }
  function passes(c) {   /* the Alert level filter */
    var v = raw(c);
    return S.level === 'all' ? true : v != null && stepIndex(v) === +S.level;
  }
  function value(c) { return passes(c) ? raw(c) : null; }
  function fill(c) { var i = stepIndex(value(c)); return i < 0 ? NONE : ramp()[i]; }
  function layerTitle() { return LAYER[S.layer].title; }
  function periodWords() { return PERIODS[+S.period / 30 - 1][1].toLowerCase(); }
  function disWords() { return S.dis === 'all' ? 'all three diseases' : DIS[S.dis].name; }
  function alertLevel(a) { return stepIndex(RISK[a[0]][ORDER.indexOf(a[1])]); }

  /* ---------------------------------------------------------------- Shapes */
  function polys(f) { return f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates; }
  function inside(f, pt) {
    return polys(f).some(function (p) {
      var r = p[0], hit = false;
      for (var i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > pt[1]) !== (r[j][1] > pt[1]) && pt[0] < (r[j][0] - r[i][0]) * (pt[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) hit = !hit;
      return hit;
    });
  }
  var RIVERS = window.OH_INDIA_RIVERS || [];
  function rivers() {
    if (S.state === 'all') return RIVERS;
    var f = BYCODE[S.state], out = [];
    RIVERS.forEach(function (r) {
      var run = [];
      r.coords.forEach(function (c) { if (inside(f, c)) run.push(c); else { if (run.length > 1) out.push({ name: r.name, coords: run }); run = []; } });
      if (run.length > 1) out.push({ name: r.name, coords: run });
    });
    return out;
  }

  /* ---------------------------------------------------------------- Controls */
  var EL = { state: $('#m-state'), dis: $('#m-dis'), level: $('#m-level'), period: $('#m-period'), back: $('#m-back'), count: $('#m-count'), side: $('#side'), map: $('#map'),
    card: $('#mapcard'), lsel: $('#m-lsel'), top: $('#m-top') };
  EL.state.innerHTML = opt([['all', 'All states and union territories']].concat(NAMES));
  EL.dis.innerHTML = opt([['all', 'All three diseases']].concat(ORDER.map(function (k) { return [k, DIS[k].name]; })));
  EL.level.innerHTML = opt([['all', 'All levels']].concat(STEPS.map(function (s, i) { return [String(i), s[3] + ' (' + s[2] + ')']; })));
  EL.period.innerHTML = opt(PERIODS);
  $('#m-layers').innerHTML = '<span class="lt" id="lay-lbl">Map shows</span>' + LAYERS.map(function (l) { return '<label class="lrow"><input class="sr" type="radio" name="m-layer" value="' + l.k + '"><i style="--c:' + l.dot + '"></i>' + l.name + '</label>'; }).join('');
  EL.lsel.innerHTML = opt(LAYERS.map(function (l) { return [l.k, 'Map shows: ' + l.name]; }));
  $('#rv-wrap').hidden = !RIVERS.length;

  function fit() { S.zoom = 1; S.center = null; }
  function setState(c) { S.state = c; S.all = false; S.view = 'list'; fit(); EL.state.value = c; draw(); }
  [].forEach.call(document.querySelectorAll('#m-layers input'), function (b) { b.addEventListener('change', function () { S.layer = b.value; S.all = false; draw(); }); });
  EL.lsel.addEventListener('change', function () { S.layer = EL.lsel.value; S.all = false; draw(); });
  EL.state.addEventListener('change', function () { setState(EL.state.value); });
  ['dis', 'level', 'period'].forEach(function (k) { EL[k].addEventListener('change', function () { S[k] = EL[k].value; S.all = false; draw(); }); });
  EL.back.addEventListener('click', function () { setState('all'); EL.state.focus(); });
  $('#m-reset').addEventListener('click', function () { Object.keys(DEF).forEach(function (k) { S[k] = DEF[k]; }); S.state = 'all'; S.all = false; S.view = 'list'; fit(); draw(); });
  $('#m-rivers').addEventListener('change', function () { S.rivers = this.checked; drawMap(); });
  $('#m-lines').addEventListener('change', function () { S.lines = this.checked; drawMap(); });
  $('#m-ftoggle').addEventListener('click', function () {
    var off = !$('#m-filters').hidden; $('#m-filters').hidden = off;
    this.setAttribute('aria-expanded', off ? 'false' : 'true'); this.lastChild.textContent = off ? 'Show filters' : 'Hide filters';
    sizeMap(); chart.resize(); drawMap();
  });
  function sizeMap() { EL.map.style.height = S.fs ? Math.max(360, window.innerHeight - EL.map.getBoundingClientRect().top - 140) + 'px' : ''; }
  function setFs(on) {
    S.fs = on; EL.card.classList.toggle('fs', on); document.documentElement.classList.toggle('mapfs', on);
    var b = $('#m-fs'); b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.lastChild.textContent = on ? 'Exit full screen' : 'Full screen';
    $('use', b).setAttribute('href', on ? '#i-shrink' : '#i-expand');
    EL.card.scrollTop = 0; sizeMap(); chart.resize(); drawMap();
  }
  $('#m-fs').addEventListener('click', function () { setFs(!S.fs); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && S.fs) setFs(false); });
  $('#m-zin').addEventListener('click', function () { S.zoom = Math.min(8, S.zoom * 1.5); drawMap(); });
  $('#m-zout').addEventListener('click', function () { S.zoom = Math.max(1, S.zoom / 1.5); if (S.zoom < 1.05) fit(); drawMap(); });
  $('#m-zfit').addEventListener('click', function () { fit(); drawMap(); });
  [].forEach.call(document.querySelectorAll('#m-view button'), function (b) { b.addEventListener('click', function () { S.view = b.dataset.view; drawSide(); }); });

  /* ---------------------------------------------------------------- Pointers: one circle for each disease in each state (national view: where the risk is Moderate or higher) */
  function pointers(feats) {
    var out = [], one = S.state !== 'all';
    feats.forEach(function (f) {
      var c = f.properties.code; if (!passes(c)) return;
      var here = keys().filter(function (k) { var r = risk(c, k, P()); return r != null && (one || r >= 50); });
      var off = here.length === 1 ? [[0, 0]] : here.length === 2 ? [[-6, 0], [6, 0]] : [[-7, 3], [7, 3], [0, -7]];
      here.forEach(function (k, i) { out.push({ c: c, k: k, r: risk(c, k, P()), n: expected(c, k, P()), xy: f.properties.xy, off: off[i], group: here.length }); });
    });
    return out;
  }
  function radius(n) { return Math.min(10, 5 + Math.sqrt(n) * 0.62); }

  /* ---------------------------------------------------------------- Map (Apache ECharts) */
  var chart = echarts.init(EL.map);
  var TIP = { backgroundColor: INK, borderWidth: 0, padding: [10, 12], textStyle: { color: '#fff', fontSize: 13, fontFamily: FONT }, extraCssText: 'border-radius:6px;box-shadow:0 6px 16px rgba(15,23,42,.22);max-width:290px;white-space:normal;' };
  function tipRow(color, a, b, round) {
    return '<div style="display:flex;justify-content:space-between;gap:20px;line-height:1.55"><span><i style="display:inline-block;width:9px;height:9px;border-radius:' + (round ? '50%' : '2px') + ';margin-right:7px;background:' + color + '"></i>' + a + '</span><b>' + b + '</b></div>';
  }
  function tipRegion(name) {
    var c = CODE[name]; if (!c) return '';
    var r = raw(c), i = stepIndex(r);
    var big = r == null ? '<span style="font-size:13px;font-weight:600">Not applicable: ' + (S.dis !== 'all' ? (DIS[S.dis].short || DIS[S.dis].name) + ' is not reported here' : 'no data') + '</span>' : r + ' <span style="font-size:12px;font-weight:500;color:#cbd5e1">of 100 · ' + STEPS[i][3] + '</span>';
    var scale = STEPS.map(function (s, j) {
      var here = j === i;
      return '<div style="display:flex;align-items:center;gap:8px;line-height:1.5;font-size:12px' + (here ? ';font-weight:700' : ';color:#cbd5e1') + '"><i style="width:14px;height:10px;border-radius:2px;background:' + ramp()[j] + ';flex:none"></i>' +
        '<span style="min-width:86px">' + s[2] + '</span><span>' + s[3] + '</span>' + (here ? '<span style="color:#fbe3a6">← here</span>' : '') + '</div>';
    }).join('');
    var dz = keys().filter(function (k) { return risk(c, k, P()) != null; }).map(function (k) { return tipRow(DIS[k].color, LETTER[k] + ' · ' + DIS[k].name, risk(c, k, P()) + ' · ' + STEPS[stepIndex(risk(c, k, P()))][3], 1); }).join('');
    return '<div style="font-weight:700">' + name + ' <span style="font-weight:500;color:#cbd5e1">· ' + periodWords() + '</span></div>' +
      '<div style="margin-top:2px;font-size:12px;color:#cbd5e1">' + layerTitle() + '</div><div style="margin:4px 0 6px;font-size:18px;font-weight:800">' + big + '</div>' + scale +
      (dz ? '<div style="margin-top:7px;padding-top:7px;border-top:1px solid rgba(255,255,255,.18)">' + dz + '</div>' : '') +
      (S.state === 'all' ? '<div style="margin-top:6px;font-size:12px;color:#cbd5e1">Select to see this state alone</div>' : '');
  }
  function tipPointer(p) {
    return '<div style="font-weight:700">' + nameOf(p.c) + '</div>' + tipRow(DIS[p.k].color, DIS[p.k].name, p.r + ' · ' + STEPS[stepIndex(p.r)][3], 1) +
      '<div style="margin-top:3px;font-size:12px;color:#cbd5e1">About ' + fmt(p.n) + ' cases expected in the ' + periodWords().replace('next ', 'next ') + '</div>';
  }
  function drawMap() {
    var one = S.state !== 'all', feats = one ? [BYCODE[S.state]] : GEO, id = 'oh-in-' + S.state;
    echarts.registerMap(id, { type: 'FeatureCollection', features: feats });
    var roomy = chart.getWidth() >= 520, pts = pointers(feats), big = one ? 1.5 : 1;
    var panel = $('#m-layers').offsetParent !== null;
    var lat = one ? BYCODE[S.state].properties.xy[1] : 23;
    var named = {}; pts.forEach(function (p) { named[p.c] = Math.max(named[p.c] || 0, radius(p.n) * big + (p.group > 2 ? 11 : p.group > 1 ? 3 : 0)); });
    var labels = one ? [S.state] : (S.lines && roomy ? GEO.filter(function (f) { return passes(f.properties.code) && NOLABEL.indexOf(f.properties.code) < 0; }).map(function (f) { return f.properties.code; }) : []);
    var geo = {
      map: id, roam: S.fs ? true : S.zoom > 1.01 ? 'move' : false, zoom: S.zoom, scaleLimit: { min: 1, max: 8 }, aspectScale: Math.cos(lat * Math.PI / 180),
      layoutCenter: [panel && !one ? '58%' : '50%', '50%'], layoutSize: one ? '76%' : panel ? '96%' : '98%', selectedMode: false, tooltip: { show: true, formatter: function (p) { return tipRegion(p.name); } },
      itemStyle: { borderColor: '#fff', borderWidth: S.lines && !one ? 1 : 0 }, label: { show: false },
      emphasis: { label: { show: false }, itemStyle: { borderColor: INK, borderWidth: one ? 0 : 1.6 } },
      regions: feats.map(function (f) { var c = fill(f.properties.code); return { name: f.properties.name, itemStyle: { areaColor: c }, emphasis: { itemStyle: { areaColor: c } } }; })
    };
    if (S.center) geo.center = S.center;
    chart.setOption({
      animation: false,
      tooltip: Object.assign({ trigger: 'item', confine: true }, TIP),
      geo: geo,
      series: [
        { id: 'riv', type: 'lines', coordinateSystem: 'geo', polyline: true, z: 3, data: S.rivers ? rivers() : [], tooltip: { formatter: function (p) { return '<b>' + p.name + '</b> <span style="color:#cbd5e1">river</span>'; } }, lineStyle: { color: RIVER, width: 1.5, opacity: 0.9, cap: 'round', join: 'round' }, emphasis: { lineStyle: { width: 3 } } },
        { id: 'nam', type: 'scatter', coordinateSystem: 'geo', z: 4, silent: true, symbolSize: 1, itemStyle: { color: 'transparent' },
          data: labels.map(function (c) { return { name: nameOf(c), value: BYCODE[c].properties.xy, label: { distance: (named[c] || 0) + 3 } }; }),
          label: { show: true, position: 'bottom', formatter: '{b}', fontFamily: FONT, fontSize: one ? 15 : 10.5, fontWeight: one ? 600 : 500, color: one ? INK : '#334155', textBorderColor: '#fff', textBorderWidth: 2.5 }, labelLayout: { hideOverlap: true } },
        { id: 'pts', type: 'scatter', coordinateSystem: 'geo', z: 5, cursor: one ? 'default' : 'pointer', tooltip: { formatter: function (p) { return tipPointer(p.data.p); } },
          data: pts.map(function (p) { var r = radius(p.n) * big; return { name: nameOf(p.c), value: p.xy, p: p, symbolSize: r * 2, symbolOffset: [p.off[0] * big, p.off[1] * big], itemStyle: { color: DIS[p.k].color, borderColor: '#fff', borderWidth: 1.6 } }; }),
          label: { show: true, formatter: function (x) { return LETTER[x.data.p.k]; }, color: '#fff', fontFamily: FONT, fontSize: one ? 13 : 9.5, fontWeight: 700 },
          emphasis: { scale: 1.12, itemStyle: { borderColor: INK } } }
      ]
    }, true);
    EL.map.setAttribute('aria-label', (one ? 'Map of ' + nameOf(S.state) + ' drawn alone, ' : 'Map of India by state, ') + 'coloured by ' + layerTitle().toLowerCase() + ' for the ' + periodWords() + ', with a circle for each disease where the risk is High or above. The same figures are in the list beside the map.');
    $('#m-zout').disabled = S.zoom <= 1.01; $('#m-zin').disabled = S.zoom >= 7.9; $('#m-zfit').disabled = S.zoom <= 1.01 && !S.center;
  }
  chart.on('click', function (p) { var name = p.componentType === 'geo' ? p.name : p.seriesId === 'pts' ? nameOf(p.data.p.c) : ''; if (S.state === 'all' && CODE[name]) setState(CODE[name]); });
  chart.on('georoam', function () {
    var g = chart.getOption().geo[0], was = S.zoom > 1.01;
    S.zoom = g.zoom || 1; S.center = g.center || null;
    if (!S.fs && was !== (S.zoom > 1.01)) chart.setOption({ geo: { roam: S.zoom > 1.01 ? 'move' : false } });
    $('#m-zout').disabled = S.zoom <= 1.01; $('#m-zin').disabled = S.zoom >= 7.9; $('#m-zfit').disabled = false;
  });
  var timer; window.addEventListener('resize', function () { clearTimeout(timer); timer = setTimeout(function () { syncTop(); sizeMap(); chart.resize(); drawMap(); }, 120); });
  if (window.ResizeObserver) new ResizeObserver(function () { if (Math.abs(chart.getWidth() - EL.map.clientWidth) > 1 || Math.abs(chart.getHeight() - EL.map.clientHeight) > 1) { chart.resize(); drawMap(); } }).observe(EL.map);

  /* ---------------------------------------------------------------- Legend */
  function drawLegend() {
    var gap = S.dis !== 'all' && GEO.some(function (f) { return raw(f.properties.code) == null; }) && S.layer !== 'temp' && S.layer !== 'rain' && S.layer !== 'env';
    $('#lg-colour').innerHTML = (gap ? '<li><i style="--c:' + NONE + '"></i>Not applicable</li>' : '') + STEPS.map(function (s, i) { return '<li><i style="--c:' + ramp()[i] + '"></i>' + s[3] + ' <span>' + s[2] + '</span></li>'; }).join('');
    $('#lg-circles').innerHTML = ORDER.map(function (k) { return '<li' + (keys().indexOf(k) < 0 ? ' class="off"' : '') + '><span class="pt" style="--c:' + DIS[k].color + '">' + LETTER[k] + '</span>' + (DIS[k].short || DIS[k].name) + '</li>'; }).join('') +
      '<li class="sz">Bigger circle, more cases expected' + (S.state === 'all' ? '. Shown where risk is High or above' : '') + '</li>';
  }

  /* ---------------------------------------------------------------- Panel beside the map */
  var LIMIT = 10;
  function scope() { return [layerTitle(), S.dis === 'all' ? 'All three diseases' : DIS[S.dis].name, PERIODS[+S.period / 30 - 1][1]]; }
  function head(title, extra) { return '<h3>' + title + '</h3><p class="scope">' + (extra ? [extra] : []).concat(scope()).join(' · ') + '</p>'; }
  function tag(i) { return '<em class="st lv" style="--bg:' + TAG[i][0] + ';--fg:' + TAG[i][1] + '">' + STEPS[i][3] + '</em>'; }
  function rows() {
    return GEO.map(function (f) { var c = f.properties.code; return { c: c, name: f.properties.name, n: value(c) }; }).filter(function (r) { return r.n != null; }).sort(function (a, b) { return b.n - a.n || (a.name < b.name ? -1 : 1); });
  }
  function stateList() {
    var list = rows(), shown = S.all ? list : list.slice(0, LIMIT), hi = list.filter(function (r) { return r.n >= 50; }).length;
    EL.side.innerHTML = head('India') +
      '<div class="tot"><div><b>' + hi + '</b><span>' + (hi === 1 ? 'state' : 'states') + ' at High or above</span></div><div><b>' + list.length + '</b><span>' + (list.length === 1 ? 'state' : 'states and union territories') + ' shown</span></div></div>' +
      (list.length ? '<ol class="rank">' + shown.map(function (r, i) {
        return '<li><button type="button" style="--lc:' + ramp()[stepIndex(r.n)] + '" data-s="' + r.c + '" title="Show ' + esc(r.name) + ' alone"><span class="no">' + (i + 1) + '</span><span class="nm">' + r.name + '</span><span class="bar"><i style="--c:' + ramp()[stepIndex(r.n)] + ';width:' + r.n + '%"></i></span><b>' + r.n + '</b></button></li>';
      }).join('') + '</ol>' + (list.length > LIMIT ? '<button class="tbtn" type="button" id="m-more">' + (S.all ? 'Show fewer' : 'Show all ' + list.length + ' states') + '</button>' : '')
        : '<p class="empty">No state matches these filters.</p>');
    wire(stateList);
  }
  function alertList(list) {
    return '<ul class="events">' + list.map(function (a) {
      var i = alertLevel(a);
      return '<li style="--c:' + DIS[a[1]].color + '"><span class="tag"><i style="--c:' + DIS[a[1]].color + '"></i>' + STEPS[i][3] + ' · ' + DIS[a[1]].name + '</span><time>' + a[3] + '</time><p>' + a[2] + '</p>' +
        (S.state === 'all' ? '<button class="lk" type="button" data-s="' + a[0] + '">' + nameOf(a[0]) + '</button>' : '') + '</li>';
    }).join('') + '</ul>';
  }
  function alertsView() {
    var list = ALERTS.filter(function (a) { return (S.dis === 'all' || a[1] === S.dis) && (S.state === 'all' || a[0] === S.state); });
    EL.side.innerHTML = '<h3>Prediction alerts</h3><p class="scope">' + (S.state === 'all' ? 'All of India' : nameOf(S.state)) + ' · ' + (S.dis === 'all' ? 'All three diseases' : DIS[S.dis].name) + ' · newest first</p>' +
      (list.length ? alertList(list) : '<p class="empty">No alert for these filters.</p>');
    wire(alertsView);
  }
  function stateDetail() {
    var c = S.state, r = raw(c), i = stepIndex(r), ks = ORDER.filter(function (k) { return risk(c, k, P()) != null; });
    var mine = ALERTS.filter(function (a) { return a[0] === c && (S.dis === 'all' || a[1] === S.dis); });
    EL.side.innerHTML = head(nameOf(c)) +
      (r == null ? '<div class="tot"><div><b>—</b><span>' + (S.dis !== 'all' ? (DIS[S.dis].short || DIS[S.dis].name) + ' is not reported in this state' : 'no data') + '</span></div></div>'
        : '<div class="tot"><div><b>' + r + '</b><span>out of 100</span></div><div><b style="font-size:1.125rem;line-height:1.7">' + STEPS[i][3] + '</b><span>alert level</span></div></div>') +
      '<ul class="dlist">' + ks.filter(function (k) { return S.dis === 'all' || k === S.dis; }).map(function (k) {
        var v = risk(c, k, P()), n = expected(c, k, P());
        return '<li style="--c:' + DIS[k].color + '"><span class="pt" style="--c:' + DIS[k].color + '">' + LETTER[k] + '</span><div><b>' + DIS[k].name + '</b><span>' + tag(stepIndex(v)) + 'About ' + fmt(n) + ' cases expected</span><span>' + DIS[k].driver + '</span></div><strong>' + v + '</strong></li>';
      }).join('') + '</ul>' +
      '<h4 class="sub-h">Alerts for ' + nameOf(c) + '</h4>' + (mine.length ? alertList(mine) : '<p class="empty" style="padding:6px 0">No alert for this state now.</p>');
  }
  function wire(redraw) {
    [].forEach.call(EL.side.querySelectorAll('[data-s]'), function (b) { b.addEventListener('click', function () { setState(b.dataset.s); }); });
    var more = $('#m-more'); if (more) more.addEventListener('click', function () { S.all = !S.all; redraw(); $('#m-more').focus(); });
  }
  function drawSide() {
    var one = S.state !== 'all';
    $('#m-view').hidden = one;
    [].forEach.call(document.querySelectorAll('#m-view button'), function (b) { b.setAttribute('aria-pressed', b.dataset.view === S.view ? 'true' : 'false'); });
    if (one) { stateDetail(); wire(function () {}); return; }
    if (S.view === 'alerts') return alertsView();
    stateList();
  }

  /* the row above the map is there only when it has something in it: the Back button, or on a phone the layer select */
  function syncTop() { EL.top.hidden = S.state === 'all' && !window.matchMedia('(max-width:767px)').matches; }

  function draw() {
    var one = S.state !== 'all';
    [].forEach.call(document.querySelectorAll('#m-layers input'), function (b) { b.checked = b.value === S.layer; b.parentNode.classList.toggle('on', b.checked); });
    EL.lsel.value = S.layer; EL.state.value = S.state;
    ['dis', 'level', 'period'].forEach(function (k) { EL[k].value = S[k]; });
    $('#m-title').textContent = layerTitle(); $('#m-cap').textContent = LAYER[S.layer].explain;
    EL.back.hidden = !one;
    $('#m-scope').innerHTML = one ? '<span>India <span aria-hidden="true">›</span> <b>' + nameOf(S.state) + '</b></span>' : '<span><b>India</b> · state by state</span>';
    syncTop();
    var list = rows(), hi = list.filter(function (r) { return r.n >= 50; }).length;
    EL.count.innerHTML = one ? '<b>' + nameOf(S.state) + '</b> · ' + (raw(S.state) == null ? 'not applicable' : 'risk <b>' + raw(S.state) + '</b> (' + STEPS[stepIndex(raw(S.state))][3] + ')') + ' · ' + disWords() + ' · ' + periodWords()
      : '<b>' + list.length + '</b> ' + (list.length === 1 ? 'state' : 'states and union territories') + ' · <b>' + hi + '</b> at High or above · ' + disWords() + ' · ' + periodWords();
    drawMap(); drawLegend(); drawSide();
  }
  draw();
})();
