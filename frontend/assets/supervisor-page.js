/* COHV Supervisor dashboard — content engine.
   Indicators = the SAME set as the PM supervisor dashboard; everything is drawn in the portal's own
   design. The Data Map is the portal's own Bharat (India) map — the same component as the Early-Warning
   map (india-geo.js states + india-rivers.js), in our map card: the supervisor's state is highlighted,
   their block is marked, with rivers, state names, zoom and the Rivers / State-lines toggles; the team's
   volunteers and villages are in the side ranked list. Roster (real names) from window.COHV, geometry
   from window.OH_SUP_GEO + window.OH_INDIA_GEO + window.OH_INDIA_RIVERS. One supervisor = own team only.
   Activity counts are sample figures (as the PM), never labelled on screen. No red. */
(function () {
  'use strict';
  if (!window.COHV) return;
  var $ = function (s) { return document.querySelector(s); };
  var fmt = function (n) { return Number(n).toLocaleString('en-IN'); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); };

  var sess = {}; try { sess = JSON.parse(sessionStorage.getItem('oh_session') || '{}') || {}; } catch (e) {}
  var supId = sess.supId || new URLSearchParams(location.search).get('sup') || 'SUP-034';
  var sup = (window.COHV.supervisors || []).filter(function (s) { return s.id === supId; })[0] || (window.COHV.supervisors || [])[0];
  if (!sup) return;
  var team = (window.COHV.volunteers || []).filter(function (v) { return v.supervisorId === sup.id; });

  var PILL = { human: '#a04d68', animal: '#c2410c', wildlife: '#5f2d91', environment: '#15803d' };
  var pc = PILL[sup.pillar] || '#a04d68';
  var METRICS = [
    { k: 'events', name: 'Events', c: '#4f95e0' },
    { k: 'referrals', name: 'Referrals', c: '#b85c78' },
    { k: 'samples', name: 'Sample support', c: '#12876f' },
    { k: 'awareness', name: 'Awareness', c: '#c2410c' },
    { k: 'imparted', name: 'Trainings imparted', c: '#7a2fa8' },
    { k: 'attended', name: 'Trainings attended', c: '#a16207' }
  ];
  function sumK(k) { return team.reduce(function (a, v) { return a + (v.activity[k] || 0); }, 0); }
  function recTotal(a) { return METRICS.reduce(function (s, m) { return s + (a[m.k] || 0); }, 0); }
  var events = sumK('events'), referrals = sumK('referrals');

  $('#sup-showing').innerHTML = 'Showing <b>' + esc(sup.title) + '</b> · <b>' + esc(sup.pillarLabel) + ' · ' + team.length + ' volunteer' + (team.length === 1 ? '' : 's') + '</b> · <b>' + esc(sup.block) + ', ' + esc(sup.district) + ', Telangana</b>';

  function tile(k, i) {
    var word = /^[A-Za-z]/.test(String(k.v));
    var body = '<div class="txt"><span class="l"><svg class="i" aria-hidden="true"><use href="#i-' + k.icon + '"/></svg>' + k.label + '</span>' +
      '<b class="v num' + (word ? ' word' : '') + '">' + k.v + '</b>' +
      '<div class="delta">' + (k.sub || '') + '</div></div>';
    var tip = k.tip ? '<span class="kinfo" tabindex="0" role="button" aria-label="About this figure: ' + esc(k.label) + '"><svg class="i"><use href="#i-info"/></svg></span>' +
      '<span class="ktip" role="tooltip">' + k.tip + (k.src ? '<em>Source: ' + k.src + '</em>' : '') + '</span>' : '';
    if (k.href) return '<a class="card kpi kpi-link' + (i === 0 ? ' main' : '') + '" href="' + k.href + '">' + body + tip +
      '<span class="golnk">Open <svg class="i"><use href="#i-arrow"/></svg></span></a>';
    return '<div class="card kpi' + (i === 0 ? ' main' : '') + '">' + body + tip + '</div>';
  }
  var SRC = 'COHV Reporting app · checked by the supervisor';
  $('#sup-glance').innerHTML = [
    { icon: 'users', label: 'COHVs supervised', v: fmt(team.length), sub: 'In your team', tip: 'Active community volunteers reporting to you across ' + esc(sup.block) + '.', src: 'COHV roster' },
    { icon: 'shield-check', label: 'Awaiting verification', v: fmt(Math.round(events * 0.15)), sub: 'Records to verify', href: 'supervisor-approvals.html?seg=verify', tip: 'Field records your team submitted that are still Submitted or Under Review. Opens Report verification.', src: SRC },
    { icon: 'siren', label: 'Open alerts', v: fmt(Math.round(events * 0.06)), sub: 'Need escalation', tip: 'Alerts raised by your volunteers not yet sent to the relevant department.', src: SRC },
    { icon: 'check', label: 'Pending COHV approvals', v: fmt(Math.round(team.length * 0.12)), sub: 'New volunteers', href: 'supervisor-approvals.html?seg=regs', tip: 'Volunteer registrations awaiting your approval and activation. Opens Volunteer registrations.', src: SRC },
    { icon: 'share', label: 'Referrals to follow up', v: fmt(Math.round(referrals * 0.35)), sub: 'Awaiting follow-up', tip: 'Referrals your team made that are not yet closed.', src: SRC }
  ].map(tile).join('');
  $('#sup-kpis').innerHTML = [
    { icon: 'mappin', label: 'Total visits', v: fmt(events) },
    { icon: 'siren', label: 'Alerts generated', v: fmt(Math.round(events * 0.08)) },
    { icon: 'share', label: 'Referrals', v: fmt(referrals) },
    { icon: 'timer', label: 'Pending follow-ups', v: fmt(Math.round(referrals * 0.35)) },
    { icon: 'megaphone', label: 'Awareness activities', v: fmt(sumK('awareness')) },
    { icon: 'grad', label: 'Trainings imparted', v: fmt(sumK('imparted')) },
    { icon: 'book', label: 'Trainings attended', v: fmt(sumK('attended')) },
    { icon: 'sync', label: 'Data pending for synchronization', v: fmt(Math.round(events * 0.03)) }
  ].map(function (k) { return tile(k, 1); }).join('');

  /* ---------------- team totals (for the side list) ---------------- */
  var GEO = window.OH_SUP_GEO;
  var byVillage = {};
  team.forEach(function (v) {
    var key = v.district + '|' + v.village;
    var g = byVillage[key] || (byVillage[key] = { name: v.village, district: v.district, block: v.block, vols: 0, rec: 0, br: {} });
    g.vols++; g.rec += recTotal(v.activity);
    METRICS.forEach(function (m) { g.br[m.k] = (g.br[m.k] || 0) + (v.activity[m.k] || 0); });
  });
  var villages = Object.keys(byVillage).map(function (key) { return byVillage[key]; });
  var totalRec = villages.reduce(function (a, g) { return a + g.rec; }, 0);
  /* the supervisor's area on the national map: the block centre (else a village) */
  var bp = GEO && (GEO.blocks[sup.district + '|' + sup.block]);
  if (!bp) { var vk = Object.keys(byVillage).map(function (k) { return GEO && GEO.villages[k]; }).filter(Boolean)[0]; bp = vk; }
  var areaPos = bp ? [bp.lng, bp.lat] : null;
  /* the team's villages as points, for sized circles on the map (size = records added) */
  var VGEO = (window.OH_SUP_GEO && window.OH_SUP_GEO.villages) || {};
  var vilPts = villages.map(function (g) { var p = VGEO[g.district + '|' + g.name]; return p ? { name: g.name, lng: p.lng, lat: p.lat, rec: g.rec, vols: g.vols } : null; }).filter(Boolean);
  function vrad(rec) { return Math.max(5, Math.min(18, 5 + Math.sqrt(rec) * 0.92)); }

  /* ---------------- the Bharat (India) map — the portal's own map (india-geo + india-rivers), in our
     map card. Only the supervisor's own state is coloured; the rest of India is neutral context.
     Click the state to open its districts, then a district on its own — the same drill as Diseases. ---- */
  var IRIVERS = window.OH_INDIA_RIVERS || [];
  var MYSTATE = sup.state || 'Telangana', RIVER = '#2c7fc9', INK = '#1f2a44', FONT = 'Inter, system-ui, sans-serif';
  /* India states, normalised to name/code/xy — the shape ECharts matches region names on */
  var SGEO = (window.OH_INDIA_GEO ? window.OH_INDIA_GEO.features : []).map(function (f) { return { type: 'Feature', properties: { name: f.properties.n, code: f.properties.c, xy: f.properties.xy }, geometry: f.geometry }; });
  var BYCODE = {}, CODE = {};
  SGEO.forEach(function (f) { BYCODE[f.properties.code] = f; CODE[f.properties.name] = f.properties.code; });
  var MYCODE = CODE[MYSTATE] || 'TG', MYDIST = sup.district;
  /* districts of the two pilot states (Tamil Nadu + Telangana) — the only states with boundaries */
  var RENAME = { 'Ranga Reddy': 'Rangareddy', 'Warangal Rural': 'Warangal', 'Warangal Urban': 'Hanamkonda', 'Medchal Malkajgiri': 'Medchal-Malkajgiri', 'Thoothukkudi': 'Thoothukudi', 'Thiruvallur': 'Tiruvallur', 'Thiruvarur': 'Tiruvarur' };
  var DGEO = {};
  (window.OH_DISTRICTS_GEO ? window.OH_DISTRICTS_GEO.features : []).forEach(function (f) { var code = f.properties.s; (DGEO[code] = DGEO[code] || []).push({ type: 'Feature', properties: { name: RENAME[f.properties.n] || f.properties.n }, geometry: f.geometry }); });
  Object.keys(DGEO).forEach(function (c) { DGEO[c].sort(function (a, b) { return a.properties.name < b.properties.name ? -1 : 1; }); });
  function hasDistricts(code) { return !!(DGEO[code] && DGEO[code].length); }
  var FILL = '#b85c78', FILL_L = '#e7cdd5', GREY = '#e6e9ee';

  function ringsOf(g) { return g.type === 'Polygon' ? [g.coordinates[0]] : g.coordinates.map(function (p) { return p[0]; }); }
  function inside(geom, pt) { var x = pt[0], y = pt[1], ins = false; ringsOf(geom).forEach(function (ring) { for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) { var xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1]; if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) ins = !ins; } }); return ins; }
  function clipRivers(geom) { var out = []; IRIVERS.forEach(function (r) { var run = []; r.coords.forEach(function (c) { if (inside(geom, c)) run.push(c); else { if (run.length > 1) out.push({ name: r.name, coords: run }); run = []; } }); if (run.length > 1) out.push({ name: r.name, coords: run }); }); return out; }
  function centre(geom) { var minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9; ringsOf(geom).forEach(function (r) { r.forEach(function (p) { if (p[0] < minx) minx = p[0]; if (p[0] > maxx) maxx = p[0]; if (p[1] < miny) miny = p[1]; if (p[1] > maxy) maxy = p[1]; }); }); return [(minx + maxx) / 2, (miny + maxy) / 2]; }

  $('#map-scope').textContent = sup.block + ' · ' + sup.district + ' · ' + MYSTATE;
  function vdot(px) { return '<span style="display:inline-block;width:' + px + 'px;height:' + px + 'px;border-radius:50%;background:' + pc + ';opacity:.82;border:1px solid #fff;vertical-align:middle"></span>'; }
  $('#map-area').innerHTML = vdot(9) + '&nbsp;fewer&nbsp;&nbsp;' + vdot(19) + '&nbsp;more records';
  $('#side-keys').innerHTML = METRICS.map(function (m) { return '<li><i style="background:' + m.c + '"></i>' + m.name + '</li>'; }).join('');

  var S = { rivers: true, lines: true, zoom: 1, level: 'india', code: null, dist: null }, chart;
  var backBtn = $('#m-back'), backT = $('#m-back-t');
  function feats() { if (S.level === 'india') return SGEO; if (S.level === 'state') return DGEO[S.code] || []; return (DGEO[S.code] || []).filter(function (f) { return f.properties.name === S.dist; }); }
  function fillFor(f) { if (S.level === 'india') return f.properties.code === MYCODE ? FILL : GREY; if (S.code === MYCODE) return f.properties.name === MYDIST ? FILL : FILL_L; return FILL_L; }
  function legend() {
    if (S.level === 'india') return '<li><i style="--c:' + FILL + '"></i>Your state (' + esc(MYSTATE) + ')</li><li><i style="--c:' + GREY + '"></i>Other states</li>';
    if (S.code === MYCODE) return '<li><i style="--c:' + FILL + '"></i>Your district (' + esc(MYDIST) + ')</li><li><i style="--c:' + FILL_L + '"></i>Other districts</li>';
    return '<li><i style="--c:' + FILL_L + '"></i>Districts of ' + esc(BYCODE[S.code].properties.name) + '</li>';
  }
  function countLine() {
    if (S.level === 'india') return '<b>' + villages.length + '</b> villages · <b>' + fmt(totalRec) + '</b> records';
    if (S.level === 'state') return '<b>' + (DGEO[S.code] || []).length + '</b> districts in ' + esc(BYCODE[S.code].properties.name);
    return esc(S.dist) + ' district';
  }
  function heading() { if (S.level === 'india') return 'Where your team works'; if (S.level === 'state') return esc(BYCODE[S.code].properties.name) + ' — districts'; return esc(S.dist) + ' district'; }

  function drawMap() {
    var el = $('#sup-map'); if (!el || !window.echarts || !SGEO.length) return;
    if (!chart) {
      chart = echarts.init(el);
      chart.on('click', function (p) {
        if (p.componentType !== 'geo') return;
        if (S.level === 'india') { var code = CODE[p.name]; if (code && hasDistricts(code)) { S.level = 'state'; S.code = code; S.zoom = 1; drawMap(); } }
        else if (S.level === 'state') { S.level = 'dist'; S.dist = p.name; S.zoom = 1; drawMap(); }
      });
    }
    var fs = feats(), deep = S.level !== 'india';
    echarts.registerMap('india-sup', { type: 'FeatureCollection', features: fs });
    backBtn.hidden = S.level === 'india';
    if (backT) backT.textContent = S.level === 'dist' ? 'Back to ' + BYCODE[S.code].properties.name : 'Back to India';
    var h3 = $('#sup-mapcard .mtitle h3'); if (h3) h3.textContent = heading();
    $('#map-count').innerHTML = countLine();
    $('#map-colour').innerHTML = legend();
    var riv = !S.rivers ? [] : (S.level === 'india' ? IRIVERS : clipRivers(S.level === 'state' ? BYCODE[S.code].geometry : (fs[0] ? fs[0].geometry : BYCODE[S.code].geometry)));
    var labels = !S.lines ? [] : fs.map(function (f) { return { name: f.properties.name, value: f.properties.xy || centre(f.geometry) }; });
    var showVil = vilPts.length && (S.level === 'india' || S.code === MYCODE);
    var vrow = $('#map-vil-row'); if (vrow) vrow.hidden = !showVil;
    chart.setOption({
      animation: false,
      tooltip: { trigger: 'item', confine: true, backgroundColor: '#fff', borderColor: '#e2dad5', borderWidth: 1, padding: [8, 11], textStyle: { color: INK, fontSize: 13 } },
      geo: {
        map: 'india-sup', roam: S.zoom > 1.01 ? 'move' : false, zoom: S.zoom, scaleLimit: { min: 1, max: 9 }, aspectScale: Math.cos((deep ? BYCODE[S.code].properties.xy[1] : 22) * Math.PI / 180),
        layoutCenter: ['50%', '50%'], layoutSize: S.level === 'india' ? '98%' : S.level === 'state' ? '90%' : '78%', selectedMode: false,
        itemStyle: { borderColor: '#fff', borderWidth: S.lines ? 0.8 : 0.3 }, label: { show: false }, emphasis: { label: { show: false } },
        regions: fs.map(function (f) { var c = fillFor(f); return { name: f.properties.name, itemStyle: { areaColor: c }, emphasis: { itemStyle: { areaColor: c } } }; }),
        tooltip: { formatter: function (p) {
          if (S.level === 'india') { var mine = CODE[p.name] === MYCODE; return '<b>' + esc(p.name) + '</b>' + (mine ? '<br><span style="color:#8a3f57">your state · click to open districts</span>' : hasDistricts(CODE[p.name]) ? '<br><span style="color:#8a8f99;font-size:12px">pilot state · click to open districts</span>' : ''); }
          var md = S.code === MYCODE && p.name === MYDIST; return '<b>' + esc(p.name) + ' district</b>' + (md ? '<br><span style="color:#8a3f57">your district</span>' : S.level === 'state' ? '<br><span style="color:#8a8f99;font-size:12px">click to open</span>' : ''); } }
      },
      series: [
        { id: 'riv', type: 'lines', coordinateSystem: 'geo', polyline: true, z: 3, silent: true, data: riv, lineStyle: { color: RIVER, width: 1.3, opacity: 0.9, cap: 'round', join: 'round' } },
        { id: 'nam', type: 'scatter', coordinateSystem: 'geo', z: 4, silent: true, symbolSize: 1, itemStyle: { color: 'transparent' },
          data: labels,
          label: { show: true, formatter: '{b}', fontFamily: FONT, fontSize: S.level === 'india' ? 9.5 : S.level === 'state' ? 11 : 15, fontWeight: deep ? 600 : 500, color: deep ? INK : '#475569', textBorderColor: '#fff', textBorderWidth: 2.5 }, labelLayout: { hideOverlap: S.level !== 'india' } },
        { id: 'vil', type: 'scatter', coordinateSystem: 'geo', z: 6, silent: S.level === 'india',
          data: showVil ? vilPts.map(function (v) { return { name: v.name, value: [v.lng, v.lat], rec: v.rec, vols: v.vols, symbolSize: vrad(v.rec) * 2 }; }) : [],
          itemStyle: { color: pc, opacity: 0.82, borderColor: '#fff', borderWidth: 1.2 }, emphasis: { scale: 1.12, itemStyle: { opacity: 1, borderColor: INK } },
          tooltip: { formatter: function (p) { return '<b>' + esc(p.data.name) + '</b><br><span style="color:#475569">' + p.data.vols + ' volunteer' + (p.data.vols === 1 ? '' : 's') + ' · ' + fmt(p.data.rec) + ' records</span>'; } } },
        { id: 'blk', type: 'scatter', coordinateSystem: 'geo', z: 7, silent: true, symbolSize: 1, itemStyle: { color: 'transparent' },
          data: (showVil && areaPos && S.level !== 'dist') ? [{ name: sup.block, value: areaPos }] : [],
          label: { show: true, formatter: esc(sup.block), position: 'top', distance: 9, color: INK, fontFamily: FONT, fontSize: 11.5, fontWeight: 700, textBorderColor: '#fff', textBorderWidth: 3 } }
      ]
    });
  }
  drawMap();
  function setZoom(z) { S.zoom = Math.max(1, Math.min(9, z)); chart.setOption({ geo: { zoom: S.zoom, roam: S.zoom > 1.01 ? 'move' : false } }); }
  $('#m-zin') && $('#m-zin').addEventListener('click', function () { setZoom(S.zoom * 1.4); });
  $('#m-zout') && $('#m-zout').addEventListener('click', function () { setZoom(S.zoom / 1.4); });
  $('#m-zfit') && $('#m-zfit').addEventListener('click', function () { S.zoom = 1; drawMap(); });
  backBtn && backBtn.addEventListener('click', function () { if (S.level === 'dist') { S.level = 'state'; S.dist = null; } else { S.level = 'india'; S.code = null; } S.zoom = 1; drawMap(); });
  $('#m-rivers') && $('#m-rivers').addEventListener('change', function () { S.rivers = this.checked; drawMap(); });
  $('#m-lines') && $('#m-lines').addEventListener('change', function () { S.lines = this.checked; drawMap(); });

  /* ---------------- side ranked list — stacked activity bars ---------------- */
  var view = 'vol', expanded = false;
  function renderSide() {
    var items;
    if (view === 'vol') { items = team.map(function (v) { return { name: v.name, total: recTotal(v.activity), br: v.activity }; }); $('#tot-a').textContent = team.length; $('#tot-al').textContent = 'volunteers'; }
    else { items = villages.map(function (g) { return { name: g.name, total: g.rec, br: g.br }; }); $('#tot-a').textContent = villages.length; $('#tot-al').textContent = 'villages'; }
    items.sort(function (a, b) { return b.total - a.total; });
    var tot = items.reduce(function (s, i) { return s + i.total; }, 0), maxT = Math.max(1, items[0] ? items[0].total : 1);
    $('#tot-b').textContent = fmt(tot); $('#tot-bl').textContent = 'records';
    var shown = expanded ? items : items.slice(0, 10);
    $('#side-rank').innerHTML = shown.map(function (it, i) {
      var segs = METRICS.map(function (m) { var val = it.br[m.k] || 0; return val ? '<i style="width:' + (val / maxT * 100).toFixed(2) + '%;background:' + m.c + '" title="' + m.name + ': ' + val + '"></i>' : ''; }).join('');
      return '<li><button type="button"><span class="no">' + (i + 1) + '</span><span class="nm">' + esc(it.name) + '</span><span class="bar">' + segs + '</span><b>' + fmt(it.total) + '</b></button></li>';
    }).join('');
    var mb = $('#side-more'); mb.hidden = items.length <= 10; mb.textContent = expanded ? 'Show top 10' : 'Show all ' + items.length;
  }
  renderSide();
  [].forEach.call(document.querySelectorAll('#side-view button'), function (b) {
    b.addEventListener('click', function () { [].forEach.call(document.querySelectorAll('#side-view button'), function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); view = b.dataset.view; expanded = false; renderSide(); });
  });
  $('#side-more') && $('#side-more').addEventListener('click', function () { expanded = !expanded; renderSide(); });

  window.addEventListener('resize', function () { if (chart) chart.resize(); });
  function dl(url, name) { var a = document.createElement('a'); a.href = url; a.download = name; a.click(); }
  $('#map-img') && $('#map-img').addEventListener('click', function () { if (chart) dl(chart.getDataURL({ pixelRatio: 2, backgroundColor: '#fff' }), 'supervisor-map-' + sup.id + '.png'); });
  $('#map-xls') && $('#map-xls').addEventListener('click', function () {
    var head = ['Village', 'Volunteers', 'Records'].concat(METRICS.map(function (m) { return m.name; }));
    var lines = [head.join(',')].concat(villages.map(function (g) { return [g.name, g.vols, g.rec].concat(METRICS.map(function (m) { return g.br[m.k] || 0; })).join(','); }));
    dl('data:text/csv;charset=utf-8,' + encodeURIComponent(lines.join('\n')), 'supervisor-villages-' + sup.id + '.csv');
  });
})();
