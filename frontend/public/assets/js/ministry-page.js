/* One Health portal — department page.
   One page serves every department: ministry.html?id=mohfw | dahd | forest | imd | icar | municipal | fssai | pcb
   What each department shows is described in ministry-config.js. Graphs are drawn with Apache ECharts. */
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var sum = function (a) { return a.reduce(function (x, y) { return x + y; }, 0); };
  var esc = function (s) { return String(s).replace(/"/g, '&quot;'); };
  function fmt(n, dp) { return Number(n).toLocaleString('en-IN', { minimumFractionDigits: dp || 0, maximumFractionDigits: dp || 0 }); }
  function count(a, f) { var n = 0; for (var i = 0; i < a.length; i++) if (f(a[i])) n++; return n; }

  var id = new URLSearchParams(location.search).get('id');
  /* A department login always gets its own department, whatever the link says, and has no list of other departments */
  var ME = window.OH_USER || {};
  if (ME.dept) {
    if (id !== ME.dept) { id = ME.dept; try { history.replaceState(null, '', ME.home); } catch (e) {} }
    $$('[data-all]').forEach(function (x) { x.hidden = true; });
    $('.crumb a').setAttribute('href', ME.home);
  }
  var M = (window.OH_MIN || {})[id] || window.OH_MIN.mohfw;
  document.title = M.short + ' — One Health Portal';
  $('#m-crumb').textContent = M.short;
  $('#m-title').innerHTML = M.en + ' <span class="hi">' + M.hi + '</span>';

  /* A department that has not started sharing data */
  if (M.empty) {
    $('#fform').hidden = true;
    $('#body').innerHTML = '<div class="card nodata"><svg class="i"><use href="#i-database"/></svg><h2>Data not yet available</h2>' +
      '<p>This department has not started sharing data with the One Health portal.</p><a class="b sec" href="dashboard.html"><svg class="i"><use href="#i-back"/></svg>Back to all departments</a></div>';
    return;
  }

  /* =====================================================================
     Demo records. One record per report / person / sample, built from the
     counts in ministry-config.js with a fixed seed. Every KPI and graph is
     counted from these records, so they always agree with the filters.
     ===================================================================== */
  var NW = 24, MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], WEEKS = [];
  for (var wi = NW - 1; wi >= 0; wi--) { var dt = new Date(2026, 8, 28 - wi * 7); WEEKS.push(dt.getDate() + ' ' + MON[dt.getMonth()]); }
  var DIS = { kfd: 'KFD', avian: 'Avian Influenza', bruc: 'Brucellosis' };
  var HEX = { kfd: '#12876f', avian: '#4f95e0', bruc: '#7a2fa8' };
  var ORDER = ['kfd', 'avian', 'bruc'], ST = ['TN', 'TG'], STATES = { TN: 'Tamil Nadu', TG: 'Telangana' }, AGES = ['0–14', '15–29', '30–44', '45–59', '60+'];

  var seed = 20261001;
  function R() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
  function wpick(ws) { var x = R() * sum(ws); for (var i = 0; i < ws.length; i++) { x -= ws[i]; if (x < 0) return i; } return ws.length - 1; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(R() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function pickAttr(def) { return Array.isArray(def) ? def[wpick(def.map(function (x) { return x[1]; }))][0] : def; }
  function spread(total) { var a = [], ws = [], i; for (i = 0; i < 12; i++) { a.push(0); ws.push(1 + i / 14); } for (i = 0; i < total; i++) a[wpick(ws)]++; return a; }

  var BYT = {};
  function push(r) { (BYT[r.t] = BYT[r.t] || []).push(r); }
  (M.streams || []).forEach(function (st) {
    ST.forEach(function (s) {
      var c = st[s]; if (!c) return;
      var dl = M.dists[s], dw = c.dw || dl.map(function () { return 1; });
      var w = c.w || spread(c.n[0]).concat(spread(c.n[1]));
      var cur = sum(w.slice(12)), exact = [];
      if (c.dw && cur === sum(dw) && cur <= 400) { dw.forEach(function (n, i) { for (var k = 0; k < n; k++) exact.push(i); }); shuffle(exact); }
      w.forEach(function (n, wk) {
        for (var k = 0; k < n; k++) {
          var di = (wk >= 12 && exact.length) ? exact.pop() : wpick(dw), a;
          var r = { t: st.t, d: st.d || '', s: s, dist: dl[di][0], w: wk, area: R() < dl[di][1] ? 'rural' : 'urban' };
          if (st.attrs) for (a in st.attrs) r[a] = pickAttr(st.attrs[a]);
          if (st.set) for (a in st.set) r[a] = st.set[a];
          push(r);
          (st.also || []).forEach(function (x) { var c2 = {}, p; for (p in r) c2[p] = r[p]; c2.t = x.t; for (p in x.set) c2[p] = x.set[p]; push(c2); });
        }
      });
    });
  });
  /* weekly readings per district (weather, soil, satellite) */
  var MEAS = {};
  Object.keys(M.meas || {}).forEach(function (k) {
    var c = M.meas[k]; MEAS[k] = {};
    ST.forEach(function (s) {
      M.dists[s].forEach(function (d, i) {
        var rg = c[s][i], arr = [];
        for (var w = 0; w < NW; w++) { var v = rg[0] + R() * (rg[1] - rg[0]); if (c.peak) v = Math.min(v, c.peak.v - 1); arr.push(+v.toFixed(c.dp || 0)); }
        MEAS[k][d[0]] = arr;
      });
    });
    if (c.peak) MEAS[k][c.peak.dist][c.peak.w] = c.peak.v;
  });

  /* ===================== Filters ===================== */
  var HAS = {}; M.filters.forEach(function (f) { HAS[f] = 1; });
  $$('[data-f]').forEach(function (l) { l.hidden = !HAS[l.dataset.f]; });
  $('#fgrid').style.setProperty('--fc', M.filters.length);
  var DEF = { state: 'all', dist: 'all', dis: 'all', area: 'all', weeks: 12 };
  var F = { state: 'all', dist: 'all', dis: 'all', area: 'all', weeks: 12 };
  var EL = { state: $('#f-state'), dist: $('#f-dist'), dis: $('#f-dis'), area: $('#f-area'), weeks: $('#f-weeks') };
  var PLACE = M.place === 'city' ? 'city' : 'district';
  $('#l-dist').textContent = PLACE === 'city' ? 'City' : 'District';

  function districtsOf(s) { return M.dists[s].map(function (d) { return d[0]; }).sort(); }
  function fillDistricts(state, keep) {
    var h = '<option value="all">All ' + (PLACE === 'city' ? 'cities' : 'districts') + '</option>';
    (state === 'all' ? ST : [state]).forEach(function (s) {
      var o = districtsOf(s).map(function (n) { return '<option value="' + n + '">' + n + '</option>'; }).join('');
      h += state === 'all' ? '<optgroup label="' + STATES[s] + '">' + o + '</optgroup>' : o;
    });
    EL.dist.innerHTML = h;
    EL.dist.value = keep && EL.dist.querySelector('option[value="' + keep + '"]') ? keep : 'all';
  }
  function readForm() { return { state: EL.state.value, dist: EL.dist.value, dis: EL.dis.value, area: EL.area.value, weeks: +EL.weeks.value }; }
  function writeForm(v) { EL.state.value = v.state; fillDistricts(v.state, v.dist); EL.dis.value = v.dis; EL.area.value = v.area; EL.weeks.value = v.weeks; }
  function markDirty() { var v = readForm(); Object.keys(EL).forEach(function (k) { EL[k].classList.toggle('changed', String(v[k]) !== String(F[k])); }); }
  EL.state.addEventListener('change', function () { fillDistricts(EL.state.value, EL.dist.value); });
  Object.keys(EL).forEach(function (k) { EL[k].addEventListener('change', markDirty); });
  $('#fform').addEventListener('submit', function (e) { e.preventDefault(); F = readForm(); markDirty(); draw(); });
  $('#reset').addEventListener('click', function () { writeForm(DEF); F = readForm(); markDirty(); draw(); });

  function match(r) {
    return (F.state === 'all' || r.s === F.state) && (F.dist === 'all' || r.dist === F.dist) &&
           (F.dis === 'all' || !r.d || r.d === F.dis) && (F.area === 'all' || r.area === F.area);
  }
  function inCur(r) { return r.w >= NW - F.weeks; }
  function inPrev(r) { return r.w >= NW - 2 * F.weeks && r.w < NW - F.weeks; }
  function recs(t, where) {
    var out = [];
    (Array.isArray(t) ? t : [t]).forEach(function (x) { (BYT[x] || []).forEach(function (r) { if (!match(r)) return; if (where) for (var k in where) if (r[k] !== where[k]) return; out.push(r); }); });
    return out;
  }
  function diseases() { return F.dis === 'all' ? ORDER : [F.dis]; }
  function states() { return F.state === 'all' ? ST : [F.state]; }
  function weekIdx() { var a = []; for (var i = NW - F.weeks; i < NW; i++) a.push(i); return a; }
  function prevIdx() { var a = []; for (var i = NW - 2 * F.weeks; i < NW - F.weeks; i++) a.push(i); return a; }
  function selDists() {
    var out = [];
    states().forEach(function (s) { M.dists[s].forEach(function (d) { if (F.dist === 'all' || d[0] === F.dist) out.push({ name: d[0], st: s }); }); });
    return out;
  }
  function measWeekly(k, idx) { var ds = selDists(); return idx.map(function (w) { return ds.length ? sum(ds.map(function (d) { return MEAS[k][d.name][w]; })) / ds.length : 0; }); }
  function agg(arr, how) { return !arr.length ? 0 : how === 'sum' ? sum(arr) : how === 'max' ? Math.max.apply(null, arr) : sum(arr) / arr.length; }
  function measAgg(k, how, idx) {
    if (how !== 'max') return agg(measWeekly(k, idx), how);
    var all = []; selDists().forEach(function (d) { idx.forEach(function (w) { all.push(MEAS[k][d.name][w]); }); });
    return agg(all, 'max');
  }

  /* ===================== Graph helpers (Apache ECharts) ===================== */
  var INK = '#1f2a44', MUTE = '#5b6678', GRIDC = '#ece7e3', AXIS = '#b9b0aa', NEUTRAL = '#8a3f57', FONT = "Inter, 'Segoe UI', Roboto, sans-serif";
  var MEN = '#2a66a8', WOMEN = '#b85c78';
  var PARTS = [['pos', 'Positive', '#8a3f57'], ['inc', 'Inconclusive', '#c9a7b2'], ['neg', 'Negative', '#e3e6ec']];
  var CH = {}, TMP = {}, SEL = {};
  function ec(cid, el, height) { el.style.height = height + 'px'; if (CH[cid]) CH[cid].resize(); else CH[cid] = echarts.init(el); return CH[cid]; }
  function tmpClear(cid) { (TMP[cid] || []).forEach(function (c) { c.dispose(); }); TMP[cid] = []; }
  function tipHtml(title, rows) {
    return '<div style="font-weight:700;margin-bottom:4px">' + title + '</div>' + rows.map(function (r) {
      return '<div style="display:flex;justify-content:space-between;gap:20px;line-height:1.5"><span>' +
        (r[2] ? '<i style="display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:7px;background:' + r[2] + '"></i>' : '') + r[0] + '</span><b>' + r[1] + '</b></div>';
    }).join('');
  }
  var TIP = { backgroundColor: INK, borderWidth: 0, padding: [9, 12], textStyle: { color: '#fff', fontSize: 13, fontFamily: FONT }, extraCssText: 'border-radius:6px;box-shadow:0 6px 16px rgba(15,23,42,.22);' };
  function tip(extra) { var o = {}, k; for (k in TIP) o[k] = TIP[k]; for (k in extra) o[k] = extra[k]; return o; }
  var LEG = { top: 0, left: 0, icon: 'roundRect', itemWidth: 11, itemHeight: 11, itemGap: 16, textStyle: { color: '#334155', fontSize: 13, fontFamily: FONT }, inactiveColor: '#b6bcc6' };
  function leg(extra) { var o = {}, k; for (k in LEG) o[k] = LEG[k]; for (k in extra) o[k] = extra[k]; return o; }
  var SHADOW = { type: 'shadow', shadowStyle: { color: 'rgba(31,42,68,.05)' } };
  function niceMax(v) { var step = v <= 4 ? 1 : v <= 8 ? 2 : v <= 20 ? 5 : v <= 50 ? 10 : v <= 100 ? 20 : 50; return Math.ceil(Math.max(v, 4) / step) * step; }
  /* in a two-graph row, the left graph takes the height of the ranked list beside it */
  function rowHeight(card, cid, wide) {
    if (!wide) return 250;
    var sib = card.parentNode.classList.contains('wide') ? $('.chart:not(#' + cid + ') [data-plot]', card.parentNode) : null;
    return Math.max(280, sib && !sib.hidden ? sib.offsetHeight : 0);
  }
  function setEmpty(card, el, empty) { $('[data-empty]', card).hidden = !empty || el.hidden; el.classList.toggle('is-empty', empty); }
  function setTable(card, head, rows) {
    $('[data-tview]', card).innerHTML = '<table><thead><tr>' + head.map(function (x) { return '<th>' + x + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>';
  }
  /* measures a graph can show under the current disease filter, and the one that is selected */
  function pickMeasure(card, cfg, cid) {
    var av = cfg.measures.filter(function (m) { return m.split || !m.d || F.dis === 'all' || m.d === F.dis; });
    var m = cfg.measures[SEL[cid] || 0]; if (av.indexOf(m) < 0) m = av[0];
    var seg = $('.seg', card);
    if (seg) {
      $$('button', seg).forEach(function (b, i) { b.hidden = av.indexOf(cfg.measures[i]) < 0; b.setAttribute('aria-pressed', cfg.measures[i] === m ? 'true' : 'false'); });
      seg.hidden = av.length < 2;
    }
    var cap = $('[data-cap]', card); if (cap && m && m.cap) cap.textContent = m.cap;
    return m;
  }
  function seriesFor(m, a, key) {
    if (m.split) return diseases().map(function (d) { return { name: DIS[d], color: HEX[d], f: function (r) { return r.d === d; } }; });
    return [{ name: m.label, color: m.d ? HEX[m.d] : NEUTRAL, f: function () { return true; } }];
  }

  /* ---------- line: reports per week ---------- */
  function drawTrend(card, cfg, cid) {
    var el = $('[data-plot]', card), m = pickMeasure(card, cfg, cid), idx = weekIdx();
    setEmpty(card, el, !m); if (!m) return;
    var a = recs(m.t, m.where).filter(inCur);
    var series = seriesFor(m).map(function (s) { s.data = idx.map(function (w) { return count(a, function (r) { return r.w === w && s.f(r); }); }); return s; });
    setTable(card, ['Week of'].concat(series.map(function (s) { return s.name; })), idx.map(function (w, i) { return [WEEKS[w]].concat(series.map(function (s) { return s.data[i]; })); }));
    if (el.hidden) return;
    var multi = series.length > 1, wide = card.clientWidth >= 560;
    var top = Math.max.apply(null, series.map(function (s) { return Math.max.apply(null, s.data); }));
    ec(cid, el, rowHeight(card, cid, wide)).setOption({
      textStyle: { fontFamily: FONT, color: INK }, animationDuration: 500,
      grid: { left: 6, right: multi && wide ? 128 : 40, top: multi ? 44 : 30, bottom: 4, containLabel: true },
      legend: leg({ show: multi, data: series.map(function (s) { return s.name; }) }),
      tooltip: tip({ trigger: 'axis', axisPointer: { type: 'line', lineStyle: { color: '#94a3b8', type: 'dashed' } },
        formatter: function (ps) { return tipHtml('Week of ' + ps[0].axisValue, ps.map(function (p) { return [p.seriesName, p.value, p.color]; })); } }),
      xAxis: { type: 'category', boundaryGap: false, data: idx.map(function (w) { return WEEKS[w]; }), axisLine: { lineStyle: { color: AXIS } }, axisTick: { show: false }, axisLabel: { color: MUTE, fontSize: 12, margin: 12, hideOverlap: true } },
      yAxis: { type: 'value', min: 0, max: niceMax(top), minInterval: 1, axisLabel: { color: MUTE, fontSize: 12 }, splitLine: { lineStyle: { color: GRIDC } } },
      series: series.map(function (s) {
        return { name: s.name, type: 'line', data: s.data, smooth: 0.3, smoothMonotone: 'x', symbol: 'circle', symbolSize: 7, showSymbol: true,
          lineStyle: { width: 2.5, color: s.color }, itemStyle: { color: s.color, borderColor: '#fff', borderWidth: 2 },
          areaStyle: { color: s.color, opacity: multi ? 0.06 : 0.14 }, emphasis: { focus: 'series' },
          endLabel: { show: multi && wide, formatter: '{a}  {c}', color: INK, fontWeight: 600, fontSize: 12, distance: 10 }, labelLayout: { moveOverlap: 'shiftY' },
          markPoint: multi ? undefined : { symbol: 'circle', symbolSize: 1, label: { show: true, position: 'top', color: INK, fontWeight: 700, fontSize: 12, formatter: 'Highest: {c}' }, data: [{ type: 'max' }] } };
      })
    }, true);
  }

  /* ---------- ranked bars: by district ---------- */
  function rankOption(rows, series, total, labelFn, LW) {
    var multi = series.length > 1;
    return {
      textStyle: { fontFamily: FONT, color: INK }, animationDuration: 500,
      grid: { left: LW, right: 84, top: multi ? 36 : 6, bottom: 0 },
      legend: leg({ show: multi, data: series.map(function (s) { return s.name; }) }),
      xAxis: { type: 'value', show: false, max: rows[0].total },
      yAxis: { type: 'category', inverse: true, data: rows.map(function (r, i) { return String(i); }), axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { align: 'left', margin: LW, formatter: function (v) { var r = rows[+v]; return '{k|' + (+v + 1) + '}{n|' + r.name + '}\n{g|}{s|' + STATES[r.st] + '}'; },
          rich: { k: { color: '#64748b', fontSize: 12, fontWeight: 700, width: 22, lineHeight: 17 }, g: { width: 22 }, n: { color: INK, fontSize: 13, fontWeight: 500, lineHeight: 17 }, s: { color: '#64748b', fontSize: 12, lineHeight: 14 } } } },
      series: series.map(function (s) {
        return { name: s.name, type: 'bar', stack: 't', barWidth: 16, data: s.data, itemStyle: { color: s.color, borderColor: '#fff', borderWidth: 1 }, emphasis: { focus: 'series' } };
      }).concat([{ name: 'Total', type: 'bar', barGap: '-100%', barWidth: 16, silent: true, z: 1, data: rows.map(function (r) { return r.total; }), itemStyle: { color: 'transparent' }, tooltip: { show: false },
        label: { show: true, position: 'right', distance: 8, formatter: function (p) { return labelFn(rows[p.dataIndex]); }, rich: { v: { color: INK, fontWeight: 700, fontSize: 13 }, p: { color: MUTE, fontSize: 12, padding: [0, 0, 0, 5] } } } }])
    };
  }
  function drawRank(card, cfg, cid) {
    var el = $('[data-plot]', card), m = pickMeasure(card, cfg, cid);
    if (!m) { setEmpty(card, el, true); return; }
    var a = recs(m.t, m.where).filter(inCur), sdef = seriesFor(m), map = {};
    a.forEach(function (r) { (map[r.dist] = map[r.dist] || { name: r.dist, st: r.s, total: 0, list: [] }).total++; map[r.dist].list.push(r); });
    var all = Object.keys(map).map(function (k) { return map[k]; }).sort(function (p, q) { return q.total - p.total || p.name.localeCompare(q.name); });
    var rows = all.slice(0, 8);
    var series = sdef.map(function (s) { s.data = rows.map(function (r) { return count(r.list, s.f); }); return s; }).filter(function (s) { return sdef.length === 1 || sum(s.data); });
    setTable(card, [PLACE === 'city' ? 'City' : 'District', 'State'].concat(series.map(function (s) { return s.name; })).concat(series.length > 1 ? ['Total', 'Share'] : ['Share']),
      all.map(function (r) { return [r.name, STATES[r.st]].concat(series.length > 1 ? sdef.filter(function (s) { return series.indexOf(s) >= 0; }).map(function (s) { return count(r.list, s.f); }).concat([r.total]) : [r.total]).concat([Math.round(r.total * 100 / a.length) + '%']); }));
    setEmpty(card, el, !rows.length);
    if (!rows.length || el.hidden) return;
    var opt = rankOption(rows, series, a.length, function (r) { return '{v|' + fmt(r.total) + '}{p|' + Math.round(r.total * 100 / a.length) + '%}'; }, card.clientWidth < 460 ? 132 : 168);
    opt.tooltip = tip({ trigger: 'axis', axisPointer: SHADOW, formatter: function (ps) {
      var r = rows[ps[0].dataIndex];
      return tipHtml(r.name + ', ' + STATES[r.st], (series.length > 1 ? series.filter(function (s) { return s.data[ps[0].dataIndex]; }).map(function (s) { return [s.name, s.data[ps[0].dataIndex], s.color]; }) : []).concat([[series.length > 1 ? 'Total' : series[0].name, r.total, series.length > 1 ? null : series[0].color]]));
    } });
    ec(cid, el, Math.max(rows.length, 3) * 40 + (series.length > 1 ? 44 : 14)).setOption(opt, true);
  }

  /* ---------- pyramid: age and sex, with rural / urban ---------- */
  function drawPyramid(card, cfg, cid) {
    var el = $('[data-plot]', card), a = recs(cfg.t).filter(inCur), area = $('[data-area]', card);
    var data = AGES.map(function (_, g) { return [count(a, function (r) { return r.age === g && r.sex === 'M'; }), count(a, function (r) { return r.age === g && r.sex === 'F'; })]; });
    setTable(card, ['Age group', 'Men', 'Women', 'Total'], AGES.map(function (g, i) { return [g + ' years', data[i][0], data[i][1], data[i][0] + data[i][1]]; }));
    var rural = count(a, function (r) { return r.area === 'rural'; }), urban = a.length - rural;
    area.hidden = !a.length;
    area.innerHTML = !a.length ? '' : '<h4>Rural and urban</h4><div class="stack">' + (rural ? '<i style="--c:var(--ink);width:' + (rural / a.length * 100) + '%"></i>' : '') + (urban ? '<i style="--c:#aab4c3;width:' + (urban / a.length * 100) + '%"></i>' : '') + '</div>' +
      '<ul class="nums"><li style="--c:var(--ink)"><i></i><b>' + rural + '</b> rural (' + Math.round(rural * 100 / a.length) + '%)</li><li style="--c:#aab4c3"><i></i><b>' + urban + '</b> urban (' + Math.round(urban * 100 / a.length) + '%)</li></ul>';
    setEmpty(card, el, !a.length);
    if (!a.length || el.hidden) return;
    var mx = niceMax(Math.max.apply(null, data.map(function (d) { return Math.max(d[0], d[1]); })));
    var men = sum(data.map(function (d) { return d[0]; })), women = a.length - men;
    function side(name, color, sign, radius, pos) {
      return { name: name, type: 'bar', stack: 'p', barWidth: 22, data: data.map(function (d) { return sign * d[sign < 0 ? 0 : 1]; }), itemStyle: { color: color, borderRadius: radius }, emphasis: { focus: 'series' },
        label: { show: true, position: pos, distance: 6, color: INK, fontWeight: 700, fontSize: 12, formatter: function (p) { return Math.abs(p.value) || ''; } } };
    }
    var s1 = side('Men', MEN, -1, [4, 0, 0, 4], 'left'), s2 = side('Women', WOMEN, 1, [0, 4, 4, 0], 'right');
    s1.markLine = { silent: true, symbol: 'none', label: { show: false }, lineStyle: { color: AXIS, type: 'solid', width: 1 }, data: [{ xAxis: 0 }] };
    ec(cid, el, 262).setOption({
      textStyle: { fontFamily: FONT, color: INK }, animationDuration: 500,
      grid: { left: 4, right: 30, top: 38, bottom: 22, containLabel: true },
      legend: leg({ data: ['Men', 'Women'], formatter: function (n) { return n + '  ' + (n === 'Men' ? men : women); } }),
      tooltip: tip({ trigger: 'axis', axisPointer: SHADOW, formatter: function (ps) { var i = ps[0].dataIndex; return tipHtml(AGES[i] + ' years', [['Men', data[i][0], MEN], ['Women', data[i][1], WOMEN], ['Total', data[i][0] + data[i][1]]]); } }),
      xAxis: { type: 'value', min: -mx, max: mx, minInterval: 1, name: 'Number of people', nameLocation: 'middle', nameGap: 26, nameTextStyle: { color: MUTE, fontSize: 12, fontWeight: 600 },
        axisLabel: { color: MUTE, fontSize: 12, formatter: function (v) { return Math.abs(v); } }, splitLine: { lineStyle: { color: GRIDC } } },
      yAxis: { type: 'category', data: AGES.map(function (g) { return g + ' yrs'; }), axisLine: { show: false, onZero: false }, axisTick: { show: false }, axisLabel: { color: INK, fontSize: 13, margin: 12 } },
      series: [s1, s2]
    }, true);
  }

  /* ---------- donuts: share of results ---------- */
  function drawDonuts(card, cfg, cid) {
    var el = $('[data-cols]', card), items = cfg.items.filter(function (x) { return !x.d || F.dis === 'all' || x.d === F.dis; }), info = [];
    tmpClear(cid);
    el.style.setProperty('--n', Math.max(items.length, 1));
    el.classList.toggle('multi', items.length > 1 && card.clientWidth < 900);
    el.innerHTML = items.map(function (x) {
      var parts = x.parts || PARTS, t = recs(x.t, x.where).filter(inCur).filter(function (r) { return !x.d || r.d === x.d; }), tot = t.length;
      var vals = parts.map(function (p) { return count(t, function (r) { return r.res === p[0]; }); });
      var pct = tot ? Math.round(vals[0] * 100 / tot) : 0, word = (x.centre || parts[0][1]).toLowerCase();
      info.push({ x: x, parts: parts, vals: vals, tot: tot, pct: pct, word: word });
      return '<div class="col"><h4 style="--c:' + (x.d ? HEX[x.d] : NEUTRAL) + '"><i></i>' + x.title + '</h4>' +
        '<div class="ring"><div class="donut" role="img" aria-label="' + pct + ' percent ' + word + '"></div>' +
        '<div class="meta"><b class="big num">' + fmt(tot) + '</b><span class="s">' + (x.unit || cfg.unit || 'samples tested') + '</span>' +
        '<ul class="nums">' + parts.map(function (p, i) { return '<li style="--c:' + p[2] + '"><i></i><b>' + fmt(vals[i]) + '</b> ' + p[1].toLowerCase() + '</li>'; }).join('') + '</ul></div></div>' +
        (x.note ? '<p class="how">' + x.note + '</p>' : '') + '</div>';
    }).join('') || '<p class="empty">Nothing to show for these filters.</p>';
    $$('.donut', el).forEach(function (node, i) {
      var o = info[i], c = echarts.init(node); TMP[cid].push(c);
      c.setOption({
        animationDuration: 500, textStyle: { fontFamily: FONT },
        title: { text: o.pct + '%', subtext: o.word, left: 'center', top: 34, itemGap: 1, textStyle: { color: INK, fontSize: 20, fontWeight: 800, fontFamily: FONT }, subtextStyle: { color: MUTE, fontSize: 11, fontFamily: FONT } },
        tooltip: tip({ show: !!o.tot, trigger: 'item', formatter: function (p) { return tipHtml(o.x.title, [[p.name, fmt(p.value) + ' (' + Math.round(p.percent) + '%)', p.color]]); } }),
        series: [{ type: 'pie', radius: ['68%', '94%'], startAngle: 90, label: { show: false }, labelLine: { show: false }, emphasis: { scale: false }, itemStyle: { borderColor: '#fff', borderWidth: 2 },
          data: o.tot ? o.parts.map(function (p, k) { return { name: p[1], value: o.vals[k], itemStyle: { color: p[2] } }; }) : [{ name: 'None', value: 1, itemStyle: { color: '#e3e6ec' } }] }]
      });
    });
  }

  /* ---------- bars: counts for a list of indicators ---------- */
  function drawBars(card, cfg, cid) {
    var el = $('[data-cols]', card), max = 1;
    tmpClear(cid);
    var groups = cfg.groups.filter(function (g) { return !g.d || F.dis === 'all' || g.d === F.dis; }).map(function (g) { return { d: g.d, title: g.title, rows: g.rows, f: function () { return true; } }; });
    if (groups.length === 1 && cfg.splitState && states().length > 1 && F.dist === 'all') {
      var g0 = groups[0];
      groups = ST.map(function (s) { return { d: g0.d, title: g0.title + ' in ' + STATES[s], rows: g0.rows, f: function (r) { return r.s === s; } }; });
    }
    groups.forEach(function (g) {
      g.data = g.rows.map(function (row) { var v = count(recs(row[1], row[2]).filter(inCur), g.f); max = Math.max(max, v); return [row[0], v]; });
    });
    el.style.setProperty('--n', Math.max(groups.length, 1));
    el.classList.toggle('narrow', groups.length === 1);
    el.innerHTML = groups.map(function (g) { return '<div class="col"><h4 style="--c:' + (g.d ? HEX[g.d] : NEUTRAL) + '"><i></i>' + g.title + '</h4><div class="sbars"></div></div>'; }).join('') || '<p class="empty">Nothing to show for these filters.</p>';
    $$('.sbars', el).forEach(function (node, i) {
      var g = groups[i], color = g.d ? HEX[g.d] : NEUTRAL;
      node.style.height = (g.data.length * 42 + 6) + 'px';
      var labW = Math.max(110, Math.min(210, Math.round(node.clientWidth * 0.44)));
      var c = echarts.init(node); TMP[cid].push(c);
      c.setOption({
        textStyle: { fontFamily: FONT, color: INK }, animationDuration: 500,
        grid: { left: labW + 14, right: 48, top: 0, bottom: 0 },
        tooltip: tip({ trigger: 'axis', axisPointer: SHADOW, formatter: function (ps) { return tipHtml(ps[0].name, [[g.title, fmt(ps[0].value) + ' ' + (cfg.unit || ''), color]]); } }),
        xAxis: { type: 'value', show: false, max: max },
        yAxis: { type: 'category', inverse: true, data: g.data.map(function (r) { return r[0]; }), axisLine: { show: false }, axisTick: { show: false },
          axisLabel: { color: INK, fontSize: 13, lineHeight: 16, width: labW - 14, overflow: 'break', align: 'left', margin: labW + 14 } },
        series: [{ type: 'bar', barWidth: 16, data: g.data.map(function (r) { return r[1]; }), itemStyle: { color: color, borderRadius: [0, 4, 4, 0] },
          label: { show: true, position: 'right', distance: 8, color: INK, fontWeight: 700, fontSize: 13, formatter: function (p) { return fmt(p.value); } } }]
      });
    });
  }

  /* ---------- weekly readings (weather, soil, satellite) ---------- */
  function drawMeas(card, cfg, cid) {
    var el = $('[data-plot]', card), idx = weekIdx(), dp = (M.meas[cfg.series[0].m].dp || 0), unit = cfg.unit ? ' ' + cfg.unit : '';
    var series = cfg.series.map(function (s) { return { name: s.name, color: s.color, type: s.type, data: measWeekly(s.m, idx).map(function (v) { return +v.toFixed(dp); }) }; });
    setTable(card, ['Week of'].concat(series.map(function (s) { return s.name + (cfg.unit ? ' (' + cfg.unit + ')' : ''); })), idx.map(function (w, i) { return [WEEKS[w]].concat(series.map(function (s) { return fmt(s.data[i], dp); })); }));
    if (el.hidden) return;
    var multi = series.length > 1, bar = series[0].type === 'bar', wide = card.clientWidth >= 560;
    /* readings below 5 (such as carbon monoxide) need one decimal on the axis, or the labels repeat */
    var fine = dp === 1 && Math.max.apply(null, series.map(function (s) { return Math.max.apply(null, s.data); })) < 5;
    ec(cid, el, card.closest('.charts.wide') ? rowHeight(card, cid, wide) : 270).setOption({
      textStyle: { fontFamily: FONT, color: INK }, animationDuration: 500,
      grid: { left: 6, right: multi && wide ? 150 : 22, top: multi ? 44 : 30, bottom: 4, containLabel: true },
      legend: leg({ show: multi, data: series.map(function (s) { return s.name; }) }),
      tooltip: tip({ trigger: 'axis', axisPointer: bar ? SHADOW : { type: 'line', lineStyle: { color: '#94a3b8', type: 'dashed' } },
        formatter: function (ps) { return tipHtml('Week of ' + ps[0].axisValue, ps.map(function (p) { return [p.seriesName, fmt(p.value, dp) + unit, p.color]; })); } }),
      xAxis: { type: 'category', boundaryGap: bar, data: idx.map(function (w) { return WEEKS[w]; }), axisLine: { lineStyle: { color: AXIS } }, axisTick: { show: false }, axisLabel: { color: MUTE, fontSize: 12, margin: 12, hideOverlap: true } },
      yAxis: { type: 'value', scale: !bar, minInterval: dp > 1 ? 0.01 : fine ? 0.1 : 1, axisLabel: { color: MUTE, fontSize: 12, formatter: function (v) { return fmt(v, dp > 1 || fine ? dp : 0) + (cfg.unit === '%' ? '%' : ''); } }, splitLine: { lineStyle: { color: GRIDC } } },
      series: series.map(function (s) {
        return bar ? { name: s.name, type: 'bar', data: s.data, barMaxWidth: 30, itemStyle: { color: s.color, borderRadius: [4, 4, 0, 0] },
            label: { show: idx.length <= 12, position: 'top', color: INK, fontWeight: 700, fontSize: 12, formatter: function (p) { return fmt(p.value, dp); } } }
          : { name: s.name, type: 'line', data: s.data, smooth: 0.3, smoothMonotone: 'x', symbol: 'circle', symbolSize: 7, lineStyle: { width: 2.5, color: s.color }, itemStyle: { color: s.color, borderColor: '#fff', borderWidth: 2 },
            areaStyle: multi ? undefined : { color: s.color, opacity: 0.1 }, emphasis: { focus: 'series' },
            endLabel: { show: multi && wide, formatter: function (p) { return p.seriesName + '  ' + fmt(p.value, dp); }, color: INK, fontWeight: 600, fontSize: 12, distance: 10 }, labelLayout: { moveOverlap: 'shiftY' } };
      })
    }, true);
  }
  function drawMrank(card, cfg, cid) {
    var el = $('[data-plot]', card), idx = weekIdx(), c = M.meas[cfg.m], dp = c.dp || 0, unit = c.unit ? ' ' + c.unit : '';
    var rows = selDists().map(function (d) { return { name: d.name, st: d.st, total: +agg(idx.map(function (w) { return MEAS[cfg.m][d.name][w]; }), cfg.agg).toFixed(dp) }; })
      .sort(function (p, q) { return q.total - p.total; }).slice(0, 8);
    setTable(card, ['District', 'State', (cfg.agg === 'sum' ? 'Total' : 'Average') + (c.unit ? ' (' + c.unit + ')' : '')], rows.map(function (r) { return [r.name, STATES[r.st], fmt(r.total, dp)]; }));
    setEmpty(card, el, !rows.length);
    if (!rows.length || el.hidden) return;
    var opt = rankOption(rows, [{ name: cfg.title, color: cfg.color || NEUTRAL, data: rows.map(function (r) { return r.total; }) }], 0, function (r) { return '{v|' + fmt(r.total, dp) + '}{p|' + (c.unit || '') + '}'; }, card.clientWidth < 460 ? 132 : 168);
    opt.series[0].itemStyle.borderRadius = [0, 4, 4, 0];
    opt.tooltip = tip({ trigger: 'axis', axisPointer: SHADOW, formatter: function (ps) { var r = rows[ps[0].dataIndex]; return tipHtml(r.name + ', ' + STATES[r.st], [[cfg.agg === 'sum' ? 'Total' : 'Average', fmt(r.total, dp) + unit, cfg.color || NEUTRAL]]); } });
    ec(cid, el, Math.max(rows.length, 3) * 40 + 14).setOption(opt, true);
  }

  /* ===================== Page sections ===================== */
  var DRAW = { trend: drawTrend, rank: drawRank, pyramid: drawPyramid, donuts: drawDonuts, bars: drawBars, meas: drawMeas, mrank: drawMrank };
  var HAS_TABLE = { trend: 1, rank: 1, pyramid: 1, meas: 1, mrank: 1 };
  var CHARTS = [];
  var TBL = '<button class="tbtn" type="button" data-table aria-pressed="false"><svg class="i"><use href="#i-table"/></svg>Table</button>';
  var PNG = '<button class="tbtn ico" type="button" data-png aria-label="Download this graph as an image" title="Download image"><svg class="i"><use href="#i-download"/></svg></button>';
  $('#sections').innerHTML = M.sections.map(function (sec, si) {
    return '<div class="sec-h"><h2>' + sec.title + '</h2>' + (sec.sub ? '<span>' + sec.sub + '</span>' : '') + '</div>' +
      '<section class="charts ' + (sec.layout || 'full') + '">' + sec.charts.map(function (cfg, ci) {
        var cid = 'c' + si + '_' + ci, tools = '';
        CHARTS.push({ cid: cid, cfg: cfg });
        if (cfg.measures && cfg.measures.length > 1) tools += '<div class="seg" role="group" aria-label="What to show">' + cfg.measures.map(function (m, i) { return '<button type="button" data-measure="' + i + '" aria-pressed="' + (i ? 'false' : 'true') + '">' + m.label + '</button>'; }).join('') + '</div>';
        if (HAS_TABLE[cfg.kind]) tools += TBL + PNG;
        var cap = cfg.cap || (cfg.measures && cfg.measures[0].cap) || '';
        var head = cfg.title ? '<div class="ch-head"><div><h3>' + cfg.title + '</h3>' + (cap ? '<p data-cap>' + cap + '</p>' : '') + '</div>' + (tools ? '<div class="tools">' + tools + '</div>' : '') + '</div>' : '';
        var body = HAS_TABLE[cfg.kind]
          ? '<div class="plot" data-plot></div><p class="empty" data-empty hidden>' + (cfg.empty || 'Nothing to show for these filters.') + '</p><div class="tview" data-tview hidden></div>' + (cfg.kind === 'pyramid' ? '<div class="area" data-area></div>' : '')
          : '<div class="cols" data-cols></div>';
        return '<div class="card chart" id="' + cid + '">' + head + '<div class="ch-body">' + body + '</div>' +
          '<div class="ch-foot"><svg class="i"><use href="#i-database"/></svg>Source: ' + cfg.source + '</div></div>';
      }).join('') + '</section>';
  }).join('');
  function drawChart(x) { DRAW[x.cfg.kind]($('#' + x.cid), x.cfg, x.cid); }
  function drawGraphs() {
    var first = { rank: 1, mrank: 1 };   /* ranked lists first, so the graph beside them can match their height */
    CHARTS.filter(function (x) { return first[x.cfg.kind]; }).forEach(drawChart);
    CHARTS.filter(function (x) { return !first[x.cfg.kind]; }).forEach(drawChart);
  }
  CHARTS.forEach(function (x) {
    var card = $('#' + x.cid);
    $$('[data-measure]', card).forEach(function (b) { b.addEventListener('click', function () { SEL[x.cid] = +b.dataset.measure; drawChart(x); }); });
    var tb = $('[data-table]', card);
    if (tb) tb.addEventListener('click', function () {
      var on = tb.getAttribute('aria-pressed') !== 'true';
      tb.setAttribute('aria-pressed', on ? 'true' : 'false'); tb.lastChild.textContent = on ? 'Graph' : 'Table';
      $('[data-plot]', card).hidden = on; $('[data-tview]', card).hidden = !on;
      drawChart(x);
    });
    var pb = $('[data-png]', card);
    if (pb) pb.addEventListener('click', function () {
      var c = CH[x.cid]; if (!c) return;
      var a = document.createElement('a');
      a.href = c.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' });
      a.download = 'one-health-' + M.id + '-' + (x.cfg.title || 'graph').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.png';
      document.body.appendChild(a); a.click(); a.remove();
    });
  });

  /* ===================== KPIs ===================== */
  function delta(d, dp, unit, reading) {
    if (!+d.toFixed(dp || 0)) return '<svg class="i"><use href="#i-equal"/></svg>Same as last period';
    var word = reading ? (d > 0 ? ' higher' : ' lower') : (d > 0 ? ' more' : ' fewer');
    return '<svg class="i"><use href="#i-' + (d > 0 ? 'up' : 'down') + '"/></svg>' + fmt(Math.abs(d), dp) + (unit ? (unit === '%' ? '' : ' ') + unit : '') + word + ' than last period';
  }
  function drawKpis() {
    var list = M.kpis.filter(function (k) { return F.dis === 'all' || !HAS.dis ? !k.x : (!k.d || k.d === F.dis); }).slice(0, 5);
    $('#kpis').innerHTML = list.map(function (k, i) {
      var val, small = '', sub;
      if (k.value != null) {
        val = typeof k.value === 'object' ? sum(states().map(function (s) { return k.value[s] || 0; })) : k.value;
        val = fmt(val); sub = k.note || '';
      } else if (k.m) {
        var c = M.meas[k.m], dp = k.agg === 'sum' ? 0 : (c.dp || 0), cur = measAgg(k.m, k.agg, weekIdx()), prev = measAgg(k.m, k.agg, prevIdx());
        val = fmt(cur, dp); small = c.unit; sub = delta(cur - prev, dp, c.unit, true);
      } else {
        var a = recs(k.t, k.where);
        if (k.all) { val = fmt(a.length); sub = k.note || ''; }
        else {
          var n = count(a, inCur);
          val = fmt(n); sub = delta(n - count(a, inPrev));
          if (k.pct && n) small = Math.round(count(a, function (r) { if (!inCur(r)) return false; for (var p in k.pct.where) if (r[p] !== k.pct.where[p]) return false; return true; }) * 100 / n) + '% ' + k.pct.label;
        }
      }
      return '<div class="card kpi' + (i ? '' : ' main') + '"><span class="kico"><svg class="i"><use href="#i-' + k.icon + '"/></svg></span>' +
        '<div class="txt"><span class="l">' + k.label + '</span><b class="v num">' + val + (small ? '<small>' + small + '</small>' : '') + '</b><div class="delta">' + sub + '</div></div></div>';
    }).join('');
  }

  /* ===================== Parameter list (from the two workbooks) ===================== */
  var HOW = { api: ['Automatic (API)', '#15803d'], file: ['File shared', '#b45309'], manual: ['By hand', '#64748b'], event: ['On event or report', '#7a2fa8'], na: ['Not stated', '#cbd5e1'] };
  var DKEY = { kfd: 'KFD', avian: 'AI', bruc: 'Brucellosis' }, DNAME = { KFD: 'KFD', AI: 'Avian Influenza', Brucellosis: 'Brucellosis' };
  var ALL = (window.OH_PARAMS || []).filter(function (p) { return p.m === M.id; });
  var showAll = false, LIMIT = 10;
  if (!ALL.length) $('#plist').hidden = true;
  /* where most rows carry a long source name (a full ministry name), the Source column is given room for it */
  if (ALL.filter(function (p) { return (p.src || '').length > 44; }).length * 2 > ALL.length) $('#rows').parentNode.classList.add('src-wide');
  function drawList() {
    if (!ALL.length) return;
    var q = $('#q').value.trim().toLowerCase();
    var list = ALL.filter(function (p) {
      if (F.state !== 'all' && p.st !== F.state) return false;
      if (HAS.dis && F.dis !== 'all' && p.d.indexOf(DKEY[F.dis]) < 0) return false;
      return !q || (p.n + ' ' + p.src).toLowerCase().indexOf(q) >= 0;
    });
    var shown = showAll || q ? list : list.slice(0, LIMIT);
    $('#rows').innerHTML = shown.map(function (p) {
      var dis = p.d.length === 3 ? 'All three' : p.d.map(function (x) { return DNAME[x]; }).join(', '), h = HOW[p.how] || HOW.na;
      return '<tr><td>' + p.n + '</td><td>' + dis + '</td><td>' + (p.src || '—') + '</td><td><span class="how-d" style="--h:' + h[1] + '" title="' + esc(p.howRaw || '') + '">' + h[0] + '</span></td><td>' + (p.u || '—') + '</td><td>' + STATES[p.st] + '</td></tr>';
    }).join('') || '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--ink-600)">No parameter matches this search or these filters.</td></tr>';
    $('#count').textContent = 'Showing ' + shown.length + ' of ' + list.length + ' parameters';
    var b = $('#more'); b.hidden = !!q || list.length <= LIMIT; b.textContent = showAll ? 'Show fewer' : 'Show all ' + list.length;
  }
  $('#more').addEventListener('click', function () { showAll = !showAll; drawList(); });
  $('#q').addEventListener('input', drawList);

  /* ===================== Draw ===================== */
  function showing() {
    var idx = weekIdx(), parts = [];
    if (HAS.dis) parts.push(F.dis === 'all' ? 'all three diseases' : DIS[F.dis]);
    parts.push(F.dist !== 'all' ? F.dist + (PLACE === 'city' ? '' : ' district') : (F.state === 'all' ? 'Tamil Nadu and Telangana' : STATES[F.state]));
    if (HAS.area) parts.push(F.area === 'all' ? 'rural and urban areas' : F.area + ' areas only');
    parts.push('weeks of ' + WEEKS[idx[0]] + ' to ' + WEEKS[idx[idx.length - 1]] + ' 2026');
    $('#showing').innerHTML = 'Showing <b>' + parts.join('</b> · <b>') + '</b>';
  }
  function draw() { showing(); drawKpis(); drawGraphs(); drawList(); }
  writeForm(DEF);
  draw();
  var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(drawGraphs, 150); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawGraphs);
})();
