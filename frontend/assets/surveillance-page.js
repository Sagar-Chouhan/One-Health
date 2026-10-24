/* One Health portal — Surveillance (NOHM / NCDC).
   One page, seven screens:  surveillance.html?view=human | animal | vaccinations | livestock | environment | wildlife | labs
   (the Surveillance tab in the main menu lists Human, Animal, Environment, Wildlife and Referral labs network)
   The figures, the filter lists and the way filters change the figures are the same as in the project
   manager's prototype (admin-cases.html, admin-vaccinations.html, admin-livestock.html, admin-labs.html).
   Bharat Pashudhan totals come from the same data file (bp-data.js). Graphs are drawn with Apache ECharts. */
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var sum = function (a) { return a.reduce(function (x, y) { return x + y; }, 0); };
  function fmt(n, dp) { return Number(n).toLocaleString('en-IN', { minimumFractionDigits: dp || 0, maximumFractionDigits: dp || 0 }); }
  function opt(list) { return list.map(function (o) { return '<option value="' + o[0] + '">' + o[1] + '</option>'; }).join(''); }
  function L(s) { return s.split(','); }
  /* large Indian numbers: 9.89 crore, 54.5 lakh */
  function big(n) {
    if (n == null || isNaN(n)) return { v: '—' };
    if (n >= 1e7) return { v: (n / 1e7).toFixed(2).replace(/\.00$/, ''), small: 'crore' };
    if (n >= 1e5) return { v: (n / 1e5).toFixed(2).replace(/\.00$/, ''), small: 'lakh' };
    return { v: fmt(Math.round(n)) };
  }
  var BP = window.BP;

  /* =====================================================================
     Places (each screen has its own district list, as in the prototype)
     ===================================================================== */
  var STATES = [['all', 'All states'], ['tn', 'Tamil Nadu'], ['tg', 'Telangana']], STNAME = { tn: 'Tamil Nadu', tg: 'Telangana' }, STSHORT = { tn: 'TN', tg: 'TG' };
  var GEO = {
    human: {
      tn: L('Nilgiris,Coimbatore,Chennai,Madurai,Salem,Erode,Vellore,Sivagangai,Namakkal'), tg: L('Sangareddy,Nagarkurnool,Hyderabad,Warangal,Karimnagar,Adilabad,Khammam'),
      blocks: {
        Nilgiris: 'Udhagamandalam,Coonoor,Kotagiri,Gudalur', Coimbatore: 'Coimbatore North,Coimbatore South,Pollachi,Mettupalayam', Chennai: 'Ambattur,Perambur,Guindy,Sholinganallur',
        Madurai: 'Madurai South,Madurai North,Thirumangalam,Melur', Salem: 'Salem,Attur,Sankari,Mettur', Erode: 'Erode,Bhavani,Sathyamangalam,Gobichettipalayam',
        Vellore: 'Vellore,Katpadi,Gudiyattam,Anaicut', Sivagangai: 'Sivagangai,Karaikudi,Manamadurai,Devakottai', Namakkal: 'Namakkal,Rasipuram,Tiruchengode,Paramathi Velur',
        Sangareddy: 'Sangareddy,Zaheerabad,Narayankhed,Andole', Nagarkurnool: 'Nagarkurnool,Kollapur,Achampet,Kalwakurthy', Hyderabad: 'Secunderabad,Charminar,Serilingampally,LB Nagar',
        Warangal: 'Warangal,Hanamkonda,Parkal,Wardhannapet', Karimnagar: 'Karimnagar,Huzurabad,Manakondur,Choppadandi', Adilabad: 'Adilabad,Boath,Nirmal,Utnoor', Khammam: 'Khammam,Kothagudem,Palvancha,Sathupalli'
      }
    },
    animal: {
      tn: L('Namakkal,Erode,Coimbatore,Salem,Dharmapuri,Krishnagiri,Dindigul,Tiruppur,Vellore,Madurai,Nilgiris'), tg: L('Sangareddy,Rangareddy,Medak,Nagarkurnool,Vikarabad,Mahabubnagar,Warangal,Karimnagar,Khammam,Nizamabad,Adilabad'),
      blocks: {
        Namakkal: 'Namakkal,Rasipuram,Tiruchengode,Paramathi Velur', Erode: 'Erode,Bhavani,Sathyamangalam,Gobichettipalayam', Coimbatore: 'Coimbatore North,Coimbatore South,Pollachi,Mettupalayam',
        Salem: 'Salem,Attur,Sankari,Mettur', Dharmapuri: 'Dharmapuri,Harur,Palacode,Pennagaram', Krishnagiri: 'Krishnagiri,Hosur,Pochampalli,Uthangarai', Dindigul: 'Dindigul,Kodaikanal,Palani,Nilakottai',
        Tiruppur: 'Tiruppur North,Tiruppur South,Palladam,Udumalpet', Vellore: 'Vellore,Katpadi,Gudiyattam,Anaicut', Madurai: 'Madurai South,Madurai North,Thirumangalam,Melur', Nilgiris: 'Udhagamandalam,Coonoor,Kotagiri,Gudalur',
        Sangareddy: 'Sangareddy,Zaheerabad,Narayankhed,Andole', Rangareddy: 'Rangareddy,Shamshabad,Chevella,Maheshwaram', Medak: 'Medak,Toopran,Gajwel,Papannapet', Nagarkurnool: 'Nagarkurnool,Kollapur,Achampet,Kalwakurthy',
        Vikarabad: 'Vikarabad,Tandur,Parigi,Kodangal', Mahabubnagar: 'Mahabubnagar,Jadcherla,Bhoothpur,Koilkonda', Warangal: 'Warangal,Hanamkonda,Parkal,Wardhannapet', Karimnagar: 'Karimnagar,Huzurabad,Manakondur,Choppadandi',
        Khammam: 'Khammam,Kothagudem,Palvancha,Sathupalli', Nizamabad: 'Nizamabad,Bodhan,Armoor,Balkonda', Adilabad: 'Adilabad,Boath,Nirmal,Utnoor'
      }
    },
    env: {
      tn: L('Nilgiris,Coimbatore,Erode,Salem,Madurai,Chennai,Vellore,Sivagangai'), tg: L('Nagarkurnool,Adilabad,Sangareddy,Warangal,Karimnagar,Hyderabad,Khammam'),
      blocks: {
        Nilgiris: 'Udhagamandalam,Coonoor,Kotagiri,Gudalur', Coimbatore: 'Coimbatore North,Pollachi,Mettupalayam', Erode: 'Sathyamangalam,Bhavani,Gobichettipalayam', Salem: 'Salem,Attur,Mettur',
        Madurai: 'Madurai South,Melur', Chennai: 'Ambattur,Perambur', Vellore: 'Vellore,Katpadi', Sivagangai: 'Sivagangai,Karaikudi', Nagarkurnool: 'Achampet,Amrabad,Kollapur,Kalwakurthy',
        Adilabad: 'Utnoor,Boath,Nirmal', Sangareddy: 'Sangareddy,Zaheerabad', Warangal: 'Warangal,Parkal', Karimnagar: 'Karimnagar,Huzurabad', Hyderabad: 'Charminar,Secunderabad', Khammam: 'Khammam,Kothagudem,Palvancha'
      }
    },
    labs: {
      tn: L('Chennai,Coimbatore,Madurai,Salem,Erode,Namakkal,Nilgiris,Vellore,Tirunelveli'), tg: L('Hyderabad,Rangareddy,Sangareddy,Medak,Nagarkurnool,Warangal,Karimnagar,Khammam,Nizamabad'),
      blocks: {
        Chennai: 'Ambattur,Perambur,Guindy', Coimbatore: 'Coimbatore North,Pollachi,Mettupalayam', Madurai: 'Madurai South,Thirumangalam,Melur', Salem: 'Salem,Attur,Mettur', Erode: 'Erode,Bhavani,Sathyamangalam',
        Namakkal: 'Namakkal,Rasipuram,Tiruchengode', Nilgiris: 'Udhagamandalam,Coonoor,Kotagiri', Vellore: 'Vellore,Katpadi,Gudiyattam', Tirunelveli: 'Tirunelveli,Palayamkottai,Cheranmahadevi',
        Hyderabad: 'Secunderabad,Charminar,Serilingampally', Rangareddy: 'Shamshabad,Chevella,Maheshwaram', Sangareddy: 'Sangareddy,Zaheerabad,Narayankhed', Medak: 'Medak,Toopran,Gajwel',
        Nagarkurnool: 'Nagarkurnool,Kollapur,Achampet', Warangal: 'Warangal,Hanamkonda,Parkal', Karimnagar: 'Karimnagar,Huzurabad,Manakondur', Khammam: 'Khammam,Kothagudem,Palvancha', Nizamabad: 'Nizamabad,Bodhan,Armoor'
      }
    }
  };
  var SPECIES = [['all', 'All species'], ['cattle', 'Cattle'], ['buffalo', 'Buffalo'], ['goat', 'Goat'], ['sheep', 'Sheep'], ['poultry', 'Poultry'], ['pig', 'Pig']];
  var SPECIES2 = [['all', 'All species'], ['cattle', 'Cattle'], ['buffalo', 'Buffalo'], ['goat', 'Goat'], ['sheep', 'Sheep'], ['pig', 'Pig'], ['poultry', 'Poultry']];
  var M_STATE = { all: 1, tn: 0.62, tg: 0.38 }, M_SPECIES = { all: 1, cattle: 0.32, buffalo: 0.18, goat: 0.22, sheep: 0.12, poultry: 0.12, pig: 0.04 };
  var REG_SHARE = { all: 1, cattle: 0.577, buffalo: 0.310, goat: 0.055, sheep: 0.052, pig: 0.005, poultry: 0 };   /* species mix of the animal register */

  /* colours (checked with the dataviz palette validator; every graph also writes names or numbers beside the marks) */
  var INK = '#1f2a44', MUTE = '#5b6678', GRIDC = '#ece7e3', AXIS = '#b9b0aa', ROSE = '#8a3f57', GREY = '#9aa3b2', FONT = "Inter, 'Segoe UI', Roboto, sans-serif";
  var MEN = '#2a66a8', WOMEN = '#b85c78', OTHERS = '#a8862a';
  var SIX = ['#c2410c', '#4f95e0', '#12876f', '#8a3f57', '#a8862a', '#7a2fa8'];
  var SPECIES_SHARE = [['Cattle', 32], ['Goat', 22], ['Buffalo', 18], ['Poultry', 12], ['Sheep', 12], ['Pig', 4]];
  var W12 = []; for (var wi = 29; wi <= 40; wi++) W12.push('W' + wi);
  var M12 = L('Aug 25,Sep 25,Oct 25,Nov 25,Dec 25,Jan 26,Feb 26,Mar 26,Apr 26,May 26,Jun 26,Jul 26');
  var M8 = L('Dec 25,Jan 26,Feb 26,Mar 26,Apr 26,May 26,Jun 26,Jul 26');

  /* =====================================================================
     DISEASE PAGES  (disease.html?id=avian | kfd | bruc, opened from the cards on the Diseases page)
     Figures as in the project manager's disease page (js/disease-data.js): Bharat Pashudhan counts are read from bp-data.js,
     the others are published figures. Parameter and Source portal show only the cards and graphs that belong to the choice.
     ===================================================================== */
  var DGEO = {
    tn: L('Nilgiris,Coimbatore,Namakkal,Erode,Salem,Dharmapuri,Krishnagiri,Vellore,Madurai,Chennai'), tg: L('Sangareddy,Nagarkurnool,Medak,Rangareddy,Vikarabad,Warangal,Karimnagar,Khammam,Adilabad,Hyderabad'),
    blocks: {
      Nilgiris: 'Udhagamandalam,Coonoor,Kotagiri,Gudalur', Coimbatore: 'Anaikatti,Pollachi,Mettupalayam', Namakkal: 'Namakkal,Rasipuram,Tiruchengode,Paramathi Velur', Erode: 'Erode,Bhavani,Sathyamangalam,Perundurai',
      Salem: 'Salem,Attur,Mettur', Dharmapuri: 'Dharmapuri,Harur,Palacode', Krishnagiri: 'Krishnagiri,Hosur', Vellore: 'Vellore,Katpadi', Madurai: 'Madurai South,Melur', Chennai: 'Ambattur,Guindy',
      Sangareddy: 'Patancheru,Zaheerabad,Narayankhed', Nagarkurnool: 'Amrabad,Achampet,Kollapur', Medak: 'Ramayampet,Toopran,Gajwel', Rangareddy: 'Maheswaram,Shamshabad,Chevella', Vikarabad: 'Vikarabad,Tandur',
      Warangal: 'Warangal,Parkal', Karimnagar: 'Karimnagar,Huzurabad', Khammam: 'Khammam,Kothagudem', Adilabad: 'Utnoor,Boath', Hyderabad: 'Charminar,Secunderabad'
    }
  };
  GEO.disease = DGEO;
  var LIGHT = '#c9a7b2';   /* lighter rose: the second of two groups */
  function blockPart() { return F.block !== 'all' ? 0.25 : 1; }
  function dgeo() { return F.dist !== 'all' ? F.dist : F.state === 'all' ? 'India' : STNAME[F.state]; }
  function slug(d) { return d.toLowerCase().replace(/[^a-z]+/g, '-'); }
  function nice(n) { n = n.toLowerCase().replace(/(^|[\s-])([a-z])/g, function (m, a, b) { return a + b.toUpperCase(); }); return n === 'The Nilgiris' ? 'Nilgiris' : n; }
  function bpNow(key) { return BP.lookup({ state: F.state, district: F.dist === 'all' ? 'all' : slug(F.dist) }, key) || {}; }
  function asOn() { return ' · as on ' + BP.dataAsOn; }
  /* districts ranked by a Bharat Pashudhan count. No state chosen: both pilot states in one list, Tamil Nadu dark and Telangana light. */
  function bpRows(list, field, only) {
    var both = F.state === 'all', rows = [];
    (both ? ['tn', 'tg'] : [F.state]).forEach(function (st) {
      ((BP.states[st] || {})[list] || []).forEach(function (d) {
        var n = nice(d.name), v = (d[field] || 0) * (F.dist !== 'all' ? blockPart() : 1);
        if (v > 0 && (!only || only[st].indexOf(slug(n)) >= 0) && (F.dist === 'all' || n === F.dist)) rows.push({ name: n + (both ? ' (' + STSHORT[st] + ')' : ''), plain: n, st: STNAME[st], v: Math.round(v), color: both && st === 'tg' ? LIGHT : ROSE });
      });
    });
    return rows.sort(function (a, b) { return b.v - a.v; }).slice(0, 10);
  }
  function drawBp(card, cid, list, field, what, only) {
    var rows = bpRows(list, field, only);
    $('[data-empty]', card).textContent = F.dist !== 'all' ? 'Bharat Pashudhan has no figure for ' + F.dist + ' here.' : 'Nothing to show for these filters.';
    var ks = $('.keys', card); if (ks) ks.hidden = F.state !== 'all' || !rows.length || $('[data-plot]', card).hidden;
    setTable(card, ['District', 'State', what], rows.map(function (r) { return [r.plain, r.st, fmt(r.v)]; }));
    drawBarList(cid, card, rows, { row: 30, lab: 168, rank: true, right: 84, tipRows: function (r) { return [[what, fmt(r.v), r.color], ['State', r.st]]; } });
  }
  var STKEYS = function () { return keys([['Tamil Nadu', ROSE], ['Telangana', LIGHT]]); };
  /* a graph that has nothing for this choice of place says so */
  function gate(card, empty, msg) { $('[data-empty]', card).textContent = msg; setEmpty(card, $('[data-plot]', card), empty); return empty; }
  /* relative weight of the districts for a disease; the chosen state or district keeps its own part */
  function risk(table) {
    var w = 0, list = [];
    (F.state === 'all' ? ['tn', 'tg'] : [F.state]).forEach(function (st) {
      Object.keys(table[st]).forEach(function (s) { if (F.dist !== 'all' && s !== slug(F.dist)) return; w += table[st][s]; list.push({ s: s, st: st, w: table[st][s] }); });
    });
    return { w: w * blockPart(), list: list.sort(function (a, b) { return b.w - a.w; }) };
  }
  /* Date range on the disease pages: a graph over time keeps the years, months or weeks that touch the chosen dates.
     Totals so far and yearly published figures do not change with the dates. */
  function within(a, b) { return (!F.to || a <= F.to) && (!F.from || b >= F.from); }
  function month(y, m) { var mm = (m < 10 ? '0' : '') + m; return [y + '-' + mm + '-01', y + '-' + mm + '-' + new Date(y, m, 0).getDate()]; }
  var NODATE = 'No part of this graph falls inside the chosen dates.';
  function hash01(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; } return (h % 1000) / 1000; }
  function pick(rows, sel) { return rows.map(function (r) { r.color = F.state === 'all' || r.st === F.state || !r.st ? ROSE : GREY; return r; }); }

  /* ------------------------------------------------------------------ Avian Influenza */
  function dAvian() {
    var OUT = [['2022', 24, 109000, '2022-01-01', '2022-12-31'], ['2023', 15, 24000, '2023-01-01', '2023-12-31'], ['2024', 49, 276000, '2024-01-01', '2024-12-31'], ['2025*', 41, null, '2025-01-01', '2025-07-31']];
    var POULTRY = { all: 851809931, tn: 120781100, tg: 79999404 }, RANK = { all: 'India', tn: '1st in India', tg: '3rd in India' };
    var SAMPLES = [['Poultry, 2024', 245978, 486, '2024-01-01', '2024-12-31'], ['Wild birds, 2024', 3090, 23, '2024-01-01', '2024-12-31'], ['Poultry, 2025*', 146042, 423, '2025-01-01', '2025-06-30'], ['Wild birds, 2025*', 1677, 7, '2025-01-01', '2025-06-30']];
    var FLYWAY = { tn: { ramanathapuram: 1.00, chengalpattu: 0.70, kanchipuram: 0.55, nagapattinam: 0.50, thanjavur: 0.35, namakkal: 0.30, coimbatore: 0.20, erode: 0.15 }, tg: { khammam: 0.45, warangal: 0.35, nizamabad: 0.30, nalgonda: 0.25, adilabad: 0.20, medak: 0.15 } };
    var MONTHS = L('Sep 25,Oct 25,Nov 25,Dec 25,Jan 26,Feb 26,Mar 26,Apr 26,May 26'), MSPAN = [9, 10, 11, 12, 1, 2, 3, 4, 5].map(function (m) { return month(m >= 9 ? 2025 : 2026, m); }), ARRIVE = [0.10, 0.42, 0.85, 1.00, 0.92, 0.70, 0.38, 0.14, 0.03], DEAD = [0.02, 0.10, 0.35, 0.72, 1.00, 0.86, 0.48, 0.18, 0.05];
    return {
      part: 'disease', name: 'Avian Influenza', crumb: 'Avian Influenza', geo: 'disease', all: 'all parameters', nodept: 1, allPlace: 'India and the two pilot states',
      title: 'Avian Influenza (H5N1 / H9N2)', hi: 'एवियन इन्फ्लूएंजा', sub: 'HPAI · stamping-out policy (no poultry vaccination) · confirmatory at ICAR-NIHSAD Bhopal',
      level: ['Critical', '#9a3412', '#fff'], facts: ['Animal → Human', 'No vaccination: stamping out'],
      fields: [
        { k: 'param', label: 'Parameter', opts: [['all', 'All parameters'], ['outbreak', 'Poultry outbreaks and culling'], ['surv', 'Surveillance sampling'], ['human', 'Human exposure and cases'], ['wild', 'Wild birds and flyway']] },
        { k: 'src', label: 'Source portal', opts: [['all', 'All source portals'], ['dahd', 'DAHD · NADRES'], ['nihsad', 'ICAR-NIHSAD Bhopal'], ['ihip', 'IHIP / IDSP'], ['forest', 'Environment, Forest & Climate Change'], ['bp', 'Bharat Pashudhan']] }],
      sources: ['DAHD Annual Reports 2022-23, 2023-24 and 2024-25: outbreak and culling tables', 'WOAH self-declaration of freedom from HPAI (DAHD, August 2025): surveillance sample counts',
        'WHO Disease Outbreak Notices: human H5N1 and H9N2 cases', '20th Livestock Census 2019 · BAHS-2023 Table 47: poultry population', 'National Avian Influenza Action Plan 2021: sampling method',
        'Bharat Pashudhan: livestock owners and registered animals'],
      kpis: function () {
        var own = bpNow('owners').total, o = big(own == null ? null : own * blockPart()), pp = F.dist === 'all' ? POULTRY[F.state] : null, p = big(pp), c = big(276000), s = big(245978);
        return [
          { icon: 'alert', label: 'Confirmed outbreaks', v: '49', sub: 'In poultry, 2024', p: 'outbreak', s: ['dahd', 'nihsad'], tip: 'Bird flu outbreaks in poultry recorded by DAHD in 2024, across 5 states. ICAR-NIHSAD Bhopal confirms the type of virus.', src: 'DAHD Annual Reports 2022-23 to 2024-25 · official document' },
          { icon: 'bird', label: 'Poultry culled', v: c.v, small: c.small, sub: 'Stamping out, 2024', p: 'outbreak', s: 'dahd', tip: 'Birds culled within 1 km of an outbreak, with compensation paid to owners. Vaccinating poultry against bird flu is not allowed in India, so culling is the only control.', src: 'DAHD Annual Report 2024-25 · official document' },
          { icon: 'users', label: 'Human cases, India', v: '2', sub: 'H5N1 so far · plus 2 H9N2', p: 'human', s: 'ihip', tip: 'People confirmed with H5N1 in India so far: Haryana (2021) and Andhra Pradesh (2024), both fatal. Two H9N2 cases were also reported. Infection is rare and comes from direct contact with sick poultry.', src: 'WHO Disease Outbreak Notices · official document' },
          { icon: 'flask', label: 'Samples screened', v: s.v, small: s.small, sub: '486 positive, 2024', p: 'surv', s: ['dahd', 'nihsad'], tip: 'Samples from domestic poultry tested in 2024, with 486 positive. Another 3,090 samples from wild and migratory birds were tested, 23 positive.', src: 'WOAH self-declaration (DAHD, Aug 2025) · official document' },
          { icon: 'grid', label: 'Poultry population', v: p.v, small: p.small, sub: pp == null ? 'Not published for a district' : RANK[F.state], p: 'outbreak', s: 'dahd', tip: 'All poultry counted in the 20th Livestock Census (2019). Tamil Nadu is 1st in India and Telangana 3rd. District figures are not published.', src: '20th Livestock Census 2019 · BAHS-2023 · official document' },
          { icon: 'tag', label: 'Livestock owners', v: o.v, small: o.small, sub: dgeo(), p: 'surv', s: 'bp', tip: 'Registered livestock owners in the selected area. These are the people to reach for surveillance, culling notices and compensation when an outbreak is declared.', src: 'Bharat Pashudhan · Livestock Owners' + asOn() }];
      },
      sections: [
        { title: 'Outbreaks and testing', sub: 'Outbreaks recorded each year, the birds at risk, and samples tested', layout: 'lead', charts: [
          { id: 'series', p: 'outbreak', s: 'dahd', title: 'Bird flu outbreaks and birds culled, by year', cap: '2025* is up to 31 July', tools: 1, body: PLOT(), source: 'DAHD Annual Reports 2022-23, 2023-24, 2024-25', draw: function (card, cid) {
            var out = OUT.filter(function (o) { return within(o[3], o[4]); });
            if (gate(card, !out.length, NODATE)) return;
            drawPanels(cid, card, { cats: out.map(function (o) { return o[0]; }), xName: 'Year', ph: 158, panels: [{ name: 'Outbreaks in poultry', type: 'bar', color: ROSE, data: out.map(function (o) { return o[1]; }) },
              { name: 'Birds culled', unit: 'lakh', dp: 2, type: 'line', color: SIX[0], data: out.map(function (o) { return o[2] == null ? null : o[2] / 1e5; }) }] }); } },
          { id: 'poultry', p: 'outbreak', s: 'dahd', title: 'Poultry population', cap: 'The two pilot states and India, in crore birds', tools: 1, body: PLOT(), source: '20th Livestock Census 2019 · BAHS-2023 Table 47', draw: function (card, cid) {
            var rows = pick([{ name: 'India', v: POULTRY.all / 1e7 }, { name: 'Tamil Nadu (1st in India)', st: 'tn', v: POULTRY.tn / 1e7 }, { name: 'Telangana (3rd in India)', st: 'tg', v: POULTRY.tg / 1e7 }]);
            setTable(card, ['Area', 'Poultry (crore)'], rows.map(function (r) { return [r.name, fmt(r.v, 2)]; }));
            drawBarList(cid, card, rows, { row: 40, bar: 16, lab: 196, right: 96, dp: 2, unit: ' crore', what: 'Poultry' }); } },
          { id: 'samples', p: 'surv', s: ['dahd', 'nihsad'], title: 'Samples screened and found positive', cap: 'Positive share of the samples tested. 2025* is up to 30 June', tools: 1, body: PLOT(), source: 'WOAH self-declaration (DAHD, Aug 2025)', draw: function (card, cid) {
            $('[data-empty]', card).textContent = NODATE;
            var rows = SAMPLES.filter(function (s) { return within(s[3], s[4]); }).map(function (s) { return { name: s[0], n: s[1], pos: s[2], v: Math.round(s[2] / s[1] * 10000) / 100, note: '\u00a0' + fmt(s[2]) + ' of ' + fmt(s[1]), color: ROSE }; });
            setTable(card, ['Birds and year', 'Screened', 'Positive', 'Positive share'], rows.map(function (r) { return [r.name, fmt(r.n), fmt(r.pos), r.v.toFixed(2) + '%']; }));
            drawBarList(cid, card, rows, { row: 40, bar: 16, lab: 134, right: 158, dp: 2, unit: '%', tipRows: function (r) { return [['Positive share', r.v.toFixed(2) + '%', r.color], ['Samples', fmt(r.pos) + ' positive of ' + fmt(r.n)]]; } }); } }] },
        { title: 'Reach in an outbreak', sub: 'Owners and animals on Bharat Pashudhan, to be reached when an outbreak is declared', layout: 'two', charts: [
          { id: 'owners', p: 'surv', s: 'bp', title: 'Districts with most livestock owners', cap: 'Owners to be informed when an outbreak is declared', tools: 1, body: STKEYS() + PLOT(), source: 'Bharat Pashudhan · Livestock Owners', draw: function (card, cid) { drawBp(card, cid, 'ownersDistricts', 'total', 'Registered owners'); } },
          { id: 'animals', p: 'surv', s: 'bp', title: 'Districts with most registered animals', cap: 'Ear-tagged cattle, buffalo, goat, sheep and pig. Poultry is not tagged', tools: 1, body: STKEYS() + PLOT(), source: 'Bharat Pashudhan · Pashu Aadhaar', draw: function (card, cid) { drawBp(card, cid, 'animalsDistricts', 'total', 'Registered animals'); } }] },
        { title: 'Wild birds and flyway', sub: 'Migratory birds arriving, and wild birds found dead', layout: 'full', charts: [
          { id: 'wild', p: 'wild', s: 'forest', title: 'Migratory birds present and dead wild birds reported', cap: 'September 2025 to May 2026. Dead birds are the earliest warning', tools: 1, body: PLOT(), source: 'Ministry of Environment, Forest and Climate Change event log', draw: function (card, cid) {
            var r = risk(FLYWAY);
            if (gate(card, r.w <= 0, F.dist + ' is not on a migratory bird route that is tracked.')) return;
            var w = r.w / 4.9, a = Math.round(48000 * w), d = Math.max(1, Math.round(26 * w)), on = MONTHS.map(function (m, i) { return i; }).filter(function (i) { return within(MSPAN[i][0], MSPAN[i][1]); });
            if (gate(card, !on.length, NODATE)) return;
            drawPanels(cid, card, { cats: on.map(function (i) { return MONTHS[i]; }), xName: 'Month', ph: 118, panels: [{ name: 'Migratory waterfowl present', type: 'bar', color: SIX[1], data: on.map(function (i) { return Math.round(a * ARRIVE[i]); }) },
              { name: 'Dead wild birds reported', type: 'line', color: ROSE, data: on.map(function (i) { return Math.round(d * DEAD[i]); }) }] }); } }] }]
    };
  }

  /* ------------------------------------------------------------------ Kyasanur Forest Disease */
  function dKfd() {
    var KRISK = { tn: { nilgiris: 1.00, coimbatore: 0.35, erode: 0.25, dharmapuri: 0.12, krishnagiri: 0.10, salem: 0.08 }, tg: { nagarkurnool: 0.30, adilabad: 0.22, khammam: 0.15, warangal: 0.10, vikarabad: 0.08 } };
    var BELT = { tn: L('nilgiris,coimbatore,erode,dharmapuri,krishnagiri,salem'), tg: L('nagarkurnool,adilabad,khammam,warangal,vikarabad') };
    var MON = L('Oct 25,Nov 25,Dec 25,Jan 26,Feb 26,Mar 26,Apr 26,May 26,Jun 26,Jul 26,Aug 26,Sep 26'), SHAPE = [0.01, 0.08, 0.13, 0.18, 0.22, 0.20, 0.11, 0.06, 0.01, 0, 0, 0];
    var MSPAN = [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (m) { return month(m >= 10 ? 2025 : 2026, m); });
    var WEEKS = L('W44,W46,W48,W50,W52,W2,W4,W6,W8,W10'), WDAY = L('2025-10-27,2025-11-10,2025-11-24,2025-12-08,2025-12-22,2026-01-05,2026-01-19,2026-02-02,2026-02-16,2026-03-02'), LEAD = [0.15, 0.28, 0.45, 0.68, 0.85, 0.96, 1.00, 0.82, 0.55, 0.30], LCOL = [ROSE, SIX[1], SIX[2], SIX[4], SIX[5]];
    var none = function () { return F.dist + ' is outside the forest belt where KFD is tracked.'; };
    return {
      part: 'disease', name: 'Kyasanur Forest Disease', crumb: 'Kyasanur Forest Disease', geo: 'disease', all: 'all parameters', nodept: 1, allPlace: 'India and the two pilot states',
      title: 'Kyasanur Forest Disease', hi: 'क्यासानूर वन रोग', sub: 'KFDV · tick-borne (Haemaphysalis spinigera) · forest-fringe seasonal transmission Nov–May',
      level: ['Critical', '#9a3412', '#fff'], facts: ['Wildlife → Human', 'Seasonal: November to May'],
      fields: [
        { k: 'param', label: 'Parameter', opts: [['all', 'All parameters'], ['cases', 'Human cases and deaths'], ['vaccine', 'Vaccination coverage'], ['sentinel', 'Monkey mortality (sentinel)'], ['vector', 'Tick surveillance']] },
        { k: 'src', label: 'Source portal', opts: [['all', 'All source portals'], ['ihip', 'IHIP / IDSP'], ['vrdl', 'ICMR-VRDL · NIV'], ['forest', 'Environment, Forest & Climate Change'], ['state', 'State Health Department'], ['bhuvan', 'BHUVAN · Forest cover']] }],
      sources: ['Karnataka Health Department, reported in The Week (April 2025): 2024 and 2025 season counts', 'CDC Emerging Infectious Diseases 2021;27(7): monkey deaths 1957 to 2020',
        'PLoS NTD 2013 (Kasabi et al.): earlier vaccine coverage and effect', 'Viruses 2025 review: case fatality rate and yearly burden', 'Karnataka tick survey 2018-22: KFD virus in tick pools',
        'Bharat Pashudhan: registered animals in forest-fringe districts', 'There is no official national series of KFD cases'],
      kpis: function () {
        return [
          { icon: 'users', label: 'Human cases, 2024', v: '303', sub: 'Karnataka · 14 deaths', p: 'cases', s: ['state', 'ihip'], tip: 'Laboratory-confirmed KFD cases in Karnataka in the 2024 season, from 17,441 samples tested. There is no official national count of KFD cases, so this state figure is the best available.', src: 'Karnataka Health Department, reported in The Week (Apr 2025) · reported in the press' },
          { icon: 'percent', label: 'Case fatality rate', v: '3–5', small: '%', sub: 'Measured: 2.8%', p: 'cases', s: 'vrdl', tip: 'Share of patients who die. The published range is 3 to 5%. In Shivamogga, 2018 to 2022, it was 2.8%: 17 deaths among 609 cases.', src: 'Viruses 2025 review · Shivamogga series · journal' },
          { icon: 'syringe', label: 'Vaccine status', v: 'Suspended', sub: 'Since October 2022', p: 'vaccine', s: 'state', tip: 'The KFD vaccine made in Shimoga was suspended in Karnataka in October 2022 and is not in use. A new vaccine from ICMR is in its first trial. So vaccine coverage is not applicable; it is not zero.', src: 'PLoS NTD 2013 · Down To Earth 2024 · reported in the press' },
          { icon: 'paw', label: 'Monkey deaths', v: '3,314', sub: '334 confirmed as KFD', p: 'sentinel', s: 'forest', tip: 'Monkey deaths reported in India from 1957 to 2020. Of these, 760 were examined and 334 confirmed as KFD. A monkey death near a forest village usually comes 2 to 3 weeks before human cases.', src: 'CDC Emerging Infectious Diseases 2021;27(7) · journal' },
          { icon: 'bug', label: 'Tick positivity', v: '4.5', small: '%', sub: '31 of 696 tick pools', p: 'vector', s: 'vrdl', tip: 'Tick pools in which the KFD virus was found, Karnataka 2018 to 2022. Most positive pools were young ticks (nymphs), which are active in the dry season.', src: 'Karnataka tick survey 2018-22 · journal' },
          { icon: 'mappin', label: 'States with spread', v: '5', sub: 'Western Ghats belt', p: 'cases', s: 'state', tip: 'KFD began in Shivamogga, Karnataka, in 1957. It has since been reported from Kerala, Goa, Maharashtra and Tamil Nadu (Nilgiris, 2012).', src: 'Published studies · State Health Departments · journal' }];
      },
      sections: [
        { title: 'Human cases', sub: 'When cases occur, and the last two seasons in Karnataka', layout: 'wide', charts: [
          { id: 'season', p: 'cases', s: 'ihip', title: 'Cases by month', cap: 'October 2025 to September 2026. Cases rise from November and peak January to March', tools: 1, body: PLOT(), source: 'IHIP / IDSP', draw: function (card, cid) {
            var r = risk(KRISK);
            if (gate(card, r.w <= 0, none())) return;
            var total = 96 * r.w / 2.65, on = MON.map(function (m, i) { return i; }).filter(function (i) { return within(MSPAN[i][0], MSPAN[i][1]); });
            if (gate(card, !on.length, NODATE)) return;
            drawColumns(cid, card, { cats: on.map(function (i) { return MON[i]; }), xName: 'Month', yName: 'Cases', h: 290, labels: 1, data: on.map(function (i) { var v = Math.round(total * SHAPE[i]); return { v: v, color: v ? ROSE : GREY }; }) }); } },
          { id: 'seasons', p: 'cases', s: 'state', title: 'KFD seasons in Karnataka', cap: 'Samples tested, confirmed cases and deaths', source: 'Karnataka Health Department, reported in The Week (Apr 2025)',
            body: '<div class="cmp"><table><thead><tr><th></th><th scope="col">2024 season</th><th scope="col">2025 season</th></tr></thead><tbody>' +
              '<tr><th scope="row">Samples tested</th><td>17,441</td><td class="na">— <small>Not published</small></td></tr><tr><th scope="row">Confirmed cases</th><td>303</td><td>150</td></tr><tr><th scope="row">Deaths</th><td>14</td><td>2</td></tr></tbody></table></div>' +
              '<p class="note">2024 was a peak year. The disease peaks every 4 to 5 years.</p>', draw: function () {} }] },
        { title: 'Monkey deaths: the early warning', sub: 'Monkeys die 2 to 3 weeks before people fall ill', layout: 'wide', charts: [
          { id: 'sentinel', p: 'sentinel', s: 'forest', title: 'Monkey carcasses reported each week', cap: 'By district, late October 2025 to early March 2026', tools: 1, body: PLOT(), source: 'Ministry of Environment, Forest and Climate Change (DFO / PCCF)', draw: function (card, cid) {
            var r = risk(KRISK), both = F.state === 'all';
            if (gate(card, !r.list.length, none())) return;
            var on = WEEKS.map(function (x, i) { return i; }).filter(function (i) { var e = new Date(WDAY[i]); e.setDate(e.getDate() + 13); return within(WDAY[i], e.toISOString().slice(0, 10)); });
            if (gate(card, !on.length, NODATE)) return;
            drawLines(cid, card, { cats: on.map(function (i) { return WEEKS[i]; }), xName: 'Week', min0: true, h: 250, noEnd: 1, series: r.list.slice(0, 5).map(function (d, i) {
              var peak = Math.max(1, Math.round((d.w * 9 + hash01(d.s) * 2) * blockPart()));
              return { name: nice(d.s) + (both ? ' (' + STSHORT[d.st] + ')' : ''), color: LCOL[i], data: on.map(function (k) { return Math.round(peak * LEAD[k]); }) }; }) }); } },
          { id: 'primates', p: 'sentinel', s: 'forest', title: 'Monkey deaths in India, 1957 to 2020', cap: 'Most carcasses are never examined', tools: 1, body: PLOT(), source: 'CDC Emerging Infectious Diseases 2021;27(7)', draw: function (card, cid) {
            var rows = [{ name: 'Deaths reported', v: 3314, color: ROSE }, { name: 'Examined (necropsy)', v: 760, color: ROSE, note: '23%' }, { name: 'Confirmed as KFD', v: 334, color: ROSE, note: '10%' }];
            setTable(card, ['Step', 'Monkeys', 'Share of deaths reported'], rows.map(function (r) { return [r.name, fmt(r.v), r.note || '100%']; }));
            drawBarList(cid, card, rows, { row: 44, bar: 16, lab: 156, right: 96, what: 'Monkeys' }); } }] },
        { title: 'Where the risk is', sub: 'How the disease has spread, and animals that graze near forests', layout: 'two', charts: [
          { id: 'spread', p: 'cases', s: 'state', title: 'States where KFD has been reported', cap: 'It began in one district of Karnataka', source: 'Published studies · State Health Departments',
            body: '<ul class="splist"><li><b>Karnataka</b><span>Where it began: Shivamogga, 1957</span></li><li><b>Kerala</b><span>Reported since 2012</span></li><li><b>Goa</b><span>Reported since 2012</span></li>' +
              '<li><b>Maharashtra</b><span>Reported since 2012</span></li><li><b>Tamil Nadu</b><span>Nilgiris, first reported in 2012. The pilot\'s KFD district</span></li></ul>', draw: function () {} },
          { id: 'forest', p: 'vector', s: 'bhuvan', title: 'Registered animals in forest-fringe districts', cap: 'Cattle grazing at the forest edge carry ticks back to villages', tools: 1, body: STKEYS() + PLOT(), source: 'Bharat Pashudhan · Pashu Aadhaar', draw: function (card, cid) {
            drawBp(card, cid, 'animalsDistricts', 'total', 'Registered animals', BELT);
            if (F.dist !== 'all' && BELT[F.state].indexOf(slug(F.dist)) < 0) $('[data-empty]', card).textContent = none(); } }] }]
    };
  }

  /* ------------------------------------------------------------------ Brucellosis */
  function dBruc() {
    var SPEC = { tn: [2257219, 59585], tg: [284775, 465074] }, FARMERS = { all: 18630062, tn: 1170663, tg: 353616 }, NDIST = { all: 757, tn: 38, tg: 33 };
    /* abortions late in pregnancy: 73 in all (the figure on the project manager's Home page), by district */
    var ABORT = [['Erode', 'tn', 24], ['Salem', 'tn', 17], ['Medak', 'tg', 14], ['Rangareddy', 'tg', 11], ['Namakkal', 'tn', 4], ['Sangareddy', 'tg', 3]];
    function abortRows() {
      var both = F.state === 'all';
      return ABORT.filter(function (a) { return (both || a[1] === F.state) && (F.dist === 'all' || a[0] === F.dist); })
        .map(function (a) { return { name: a[0] + (both ? ' (' + STSHORT[a[1]] + ')' : ''), plain: a[0], st: STNAME[a[1]], v: Math.round(a[2] * blockPart()), color: both && a[1] === 'tg' ? LIGHT : ROSE }; }).filter(function (r) { return r.v > 0; });
    }
    var SERO = [['Abattoir workers', 18.75, 'People'], ['Cattle', 8.3, 'Animals'], ['Veterinarians', 7.14, 'People'], ['All occupational groups', 7.04, 'People'], ['Livestock owners', 5.71, 'People'], ['Buffalo', 3.6, 'Animals']];
    return {
      part: 'disease', name: 'Brucellosis', crumb: 'Brucellosis', geo: 'disease', all: 'all parameters', nodept: 1, allPlace: 'India and the two pilot states',
      title: 'Brucellosis', hi: 'ब्रुसेलोसिस', sub: 'Brucella abortus / melitensis · occupational zoonosis · NADCP Brucellosis Control Programme',
      level: ['Elevated', '#f7c98b', '#5f3b06'], facts: ['Animal → Human', 'Vaccine available (S19)'],
      fields: [
        { k: 'param', label: 'Parameter', opts: [['all', 'All parameters'], ['vacc', 'S19 vaccination'], ['sero', 'Sero-surveillance'], ['human', 'Human occupational cases'], ['repro', 'Reproductive loss (abortions)']] },
        { k: 'src', label: 'Source portal', opts: [['all', 'All source portals'], ['bp', 'Bharat Pashudhan'], ['nivedi', 'ICAR-NIVEDI'], ['ihip', 'IHIP / IDSP'], ['nadcp', 'NADCP · DAHD']] }],
      sources: ['Bharat Pashudhan (DAHD): S19 doses, farmers benefited, species', 'ICAR-NIVEDI · Prev Vet Med 2019: sero-positive cattle and buffalo (12,054 samples, 15 states)',
        'ICAR-NIVEDI · Vet Res Commun 2025: change between 2011-14 and 2015-18', 'One Health 2021: sero-positive people in occupational groups (1,050 samples)',
        'DAHD Annual Report 2024-25, Annexure XI: reported outbreaks in cattle and buffalo', 'DAHD NADCP: S19 coverage targets', 'Bharat Pashudhan · State Animal Husbandry: abortions late in pregnancy', 'Human brucellosis is not a notifiable disease under IDSP, so there is no national count of cases'],
      kpis: function () {
        var ab = sum(abortRows().map(function (r) { return r.v; }));
        var d = bpNow('vacc').bruc, doses = big(d == null ? null : d * blockPart()), fb = F.dist === 'all' ? FARMERS[F.state] : null, f = big(fb), sp = SPEC[F.state], main = sp ? (sp[0] >= sp[1] ? ['Cattle', sp[0]] : ['Buffalo', sp[1]]) : null;
        return [
          { icon: 'syringe', label: 'S19 doses given', v: doses.v, small: doses.small, sub: dgeo(), p: 'vacc', s: ['bp', 'nadcp'], tip: 'Brucellosis (S19) vaccine doses recorded on Bharat Pashudhan for the selected area.', src: 'Bharat Pashudhan · NADCP' + asOn() },
          { icon: 'users', label: 'Farmers benefited', v: f.v, small: f.small, sub: fb == null ? 'State and India only' : 'Under the programme', p: 'vacc', s: ['bp', 'nadcp'], tip: 'Livestock owners whose animals received the S19 vaccine under the Brucellosis Control Programme. It is published for a state and for India, not for a district.', src: 'Bharat Pashudhan · NADCP Brucellosis' },
          { icon: 'mappin', label: 'Districts covered', v: F.dist === 'all' ? fmt(NDIST[F.state]) : '1', sub: F.state === 'all' ? 'Of 769 reporting' : 'In ' + dgeo(), p: 'vacc', s: ['bp', 'nadcp'], tip: 'Districts that have recorded at least one S19 dose in the current round.', src: 'Bharat Pashudhan · NADCP' },
          { icon: 'tag', label: 'Main species', v: main ? main[0] : 'Mixed', sub: main ? Math.round(main[1] / (sp[0] + sp[1]) * 100) + '% of doses' : 'Cattle and buffalo', p: 'vacc', s: 'bp', tip: 'The species that gets most S19 doses in the state. In Tamil Nadu it is almost all cattle. In Telangana it is mostly buffalo.', src: 'Bharat Pashudhan · species split' },
          { icon: 'flask', label: 'Positive in animals', v: '8.3', small: '%', sub: 'Cattle · buffalo 3.6%', p: 'sero', s: 'nivedi', tip: 'Cattle and buffalo with signs of Brucella infection in their blood, from the national survey of ICAR-NIVEDI: 12,054 samples in 15 states. Tamil Nadu is one of 8 states above 5% in cattle.', src: 'ICAR-NIVEDI · Prev Vet Med 2019 · journal' },
          { icon: 'pulse', label: 'Positive in people', v: '7.04', small: '%', sub: 'Occupational groups', p: 'human', s: 'ihip', tip: 'People with signs of Brucella infection among 1,050 vets, para-vets, animal handlers and AI workers. Abattoir workers are highest at 18.75%. Human brucellosis is not a notifiable disease, so there is no national count of cases.', src: 'One Health 2021 · journal' },
          { icon: 'alert', label: 'Abortions reported', v: ab ? fmt(ab) : '—', sub: ab ? 'Last 3 months of pregnancy' : 'None reported here', p: 'repro', only: 1, s: 'bp', tip: 'Cattle and buffalo that lost a calf in the last three months of pregnancy. This is the main sign of Brucellosis in animals, so many abortions in one area is an early warning.', src: 'Bharat Pashudhan · State Animal Husbandry' },
          { icon: 'file', label: 'Outbreaks reported', v: '3', sub: 'India, Jan to Jun 2024', p: 'repro', only: 1, s: 'nadcp', tip: 'Brucellosis outbreaks in cattle and buffalo reported in India from January to June 2024. This is far below what the blood surveys show, because most cases are never reported.', src: 'DAHD Annual Report 2024-25, Annexure XI · official document' },
          { icon: 'tag', label: 'Animals affected', v: '49', sub: 'In those 3 outbreaks', p: 'repro', only: 1, s: 'nadcp', tip: 'Animals that fell ill in the 3 outbreaks reported from January to June 2024.', src: 'DAHD Annual Report 2024-25, Annexure XI · official document' }];
      },
      sections: [
        { title: 'S19 vaccination', sub: 'Doses and farmers recorded on Bharat Pashudhan', layout: 'lead', charts: [
          { id: 'districts', p: 'vacc', s: ['bp', 'nadcp'], title: 'Districts with most S19 doses', cap: 'Doses recorded so far, highest first', tools: 1, body: STKEYS() + PLOT(), source: 'Bharat Pashudhan · NADCP', draw: function (card, cid) { drawBp(card, cid, 'vaccDistricts', 'bruc', 'S19 doses'); } },
          { id: 'states', p: 'vacc', s: ['bp', 'nadcp'], title: 'S19 doses: the pilot states and India', cap: 'In lakh doses', tools: 1, body: PLOT(), source: 'Bharat Pashudhan · NADCP Brucellosis', draw: function (card, cid) {
            var rows = pick([{ name: 'India', v: BP.india.vacc.bruc / 1e5 }, { name: 'Tamil Nadu', st: 'tn', v: BP.states.tn.vacc.bruc / 1e5 }, { name: 'Telangana', st: 'tg', v: BP.states.tg.vacc.bruc / 1e5 }]);
            setTable(card, ['Area', 'S19 doses (lakh)'], rows.map(function (r) { return [r.name, fmt(r.v, 2)]; }));
            drawBarList(cid, card, rows, { row: 40, bar: 16, lab: 104, right: 104, dp: 2, unit: ' lakh', what: 'S19 doses' }); } },
          { id: 'farmers', p: 'vacc', s: ['bp', 'nadcp'], title: 'Farmers benefited: the pilot states and India', cap: 'In lakh farmers', tools: 1, body: PLOT(), source: 'Bharat Pashudhan · NADCP Brucellosis', draw: function (card, cid) {
            var rows = pick([{ name: 'India', v: FARMERS.all / 1e5 }, { name: 'Tamil Nadu', st: 'tn', v: FARMERS.tn / 1e5 }, { name: 'Telangana', st: 'tg', v: FARMERS.tg / 1e5 }]);
            setTable(card, ['Area', 'Farmers (lakh)'], rows.map(function (r) { return [r.name, fmt(r.v, 2)]; }));
            drawBarList(cid, card, rows, { row: 40, bar: 16, lab: 104, right: 104, dp: 2, unit: ' lakh', what: 'Farmers benefited' }); } }] },
        { title: 'Species and infection', sub: 'Which animals get the vaccine, and how common the infection is', layout: 'three', charts: [
          { id: 'species', p: 'vacc', s: 'bp', title: 'Species receiving S19', cap: 'In lakh doses. Tamil Nadu is cattle, Telangana is mostly buffalo', tools: 1, body: PLOT(), source: 'Bharat Pashudhan · species split', draw: function (card, cid) {
            var sts = F.state === 'all' ? ['tn', 'tg'] : [F.state], lakh = function (i) { return sts.map(function (s) { return Math.round(SPEC[s][i] / 1000) / 100; }); };
            drawStack(cid, card, { cats: sts.map(function (s) { return STNAME[s]; }), xName: 'State', dp: 2, series: [{ name: 'Cattle', color: ROSE, data: lakh(0) }, { name: 'Buffalo', color: SIX[4], data: lakh(1) }] }); } },
          { id: 'sero', p: ['sero', 'human'], s: ['nivedi', 'ihip'], title: 'Sero-positive share by group', cap: 'Animals and people who work with animals', tools: 1, body: keys([['Animals', ROSE], ['People', SIX[1]]]) + PLOT(), source: 'ICAR-NIVEDI 2019 · One Health 2021 · Himachal Pradesh study', draw: function (card, cid) {
            var rows = SERO.map(function (s) { return { name: s[0], grp: s[2], v: s[1], color: s[2] === 'Animals' ? ROSE : SIX[1] }; });
            setTable(card, ['Group', 'Animals or people', 'Sero-positive'], rows.map(function (r) { return [r.name, r.grp, r.v + '%']; }));
            drawBarList(cid, card, rows, { row: 34, lab: 168, right: 64, dp: 2, unit: '%', max: 22, tipRows: function (r) { return [['Sero-positive', r.v + '%', r.color], ['Group', r.grp]]; } }); } },
          { id: 'trend', p: 'sero', s: 'nivedi', title: 'Sero-positive cattle and buffalo, two survey rounds', cap: 'Per cent positive. The share fell as vaccination grew', tools: 1, body: PLOT(), source: 'ICAR-NIVEDI · Vet Res Commun 2025', draw: function (card, cid) {
            drawLines(cid, card, { cats: ['2011–14', '2015–18'], xName: 'Survey round', dp: 2, unit: '%', min0: true, h: 250, endW: 104, series: [{ name: 'Cattle', color: ROSE, data: [9.60, 1.76] }, { name: 'Buffalo', color: SIX[4], data: [5.35, 2.67] }] }); } }] },
        { title: 'Reproductive loss', sub: 'An abortion late in pregnancy is the main sign of Brucellosis in animals', layout: 'two', charts: [
          { id: 'abort', p: 'repro', s: 'bp', title: 'Abortions late in pregnancy, by district', cap: 'Cattle and buffalo that lost a calf in the last 3 months of pregnancy', tools: 1, body: STKEYS() + PLOT(), source: 'Bharat Pashudhan · State Animal Husbandry', draw: function (card, cid) {
            var rows = abortRows();
            $('[data-empty]', card).textContent = F.dist !== 'all' ? 'No abortion was reported from ' + F.dist + '.' : 'Nothing to show for these filters.';
            var ks = $('.keys', card); if (ks) ks.hidden = F.state !== 'all' || !rows.length || $('[data-plot]', card).hidden;
            setTable(card, ['District', 'State', 'Abortions'], rows.map(function (r) { return [r.plain, r.st, fmt(r.v)]; }));
            drawBarList(cid, card, rows, { row: 34, lab: 168, rank: true, right: 56, tipRows: function (r) { return [['Abortions reported', fmt(r.v), r.color], ['State', r.st]]; } }); } },
          { id: 'outb', p: 'repro', s: 'nadcp', title: 'Brucellosis outbreaks reported in cattle and buffalo', cap: 'India, January to June 2024', source: 'DAHD Annual Report 2024-25, Annexure XI',
            body: '<div class="cmp"><table><tbody><tr><th scope="row">Outbreaks reported</th><td>3</td></tr><tr><th scope="row">Animals affected</th><td>49</td></tr></tbody></table></div>' +
              '<p class="note">This is far below what the blood surveys show. Most cases are never reported.</p>', draw: function () {} }] }]
    };
  }

  /* =====================================================================
     Which screen
     ===================================================================== */
  var QS = new URLSearchParams(location.search), DPAGE = document.body.getAttribute('data-page') === 'disease';   /* disease.html uses the same engine */
  var key = DPAGE ? 'd-' + (QS.get('id') || 'avian') : QS.get('view') || 'human';
  var MAKE = { human: human, animal: animal, vaccinations: vaccinations, livestock: livestock, environment: environment, wildlife: wildlife, labs: labs, 'd-avian': dAvian, 'd-kfd': dKfd, 'd-bruc': dBruc };
  if (!MAKE[key] || DPAGE !== (key.indexOf('d-') === 0)) key = DPAGE ? 'd-avian' : 'human';
  var F = {};   /* the filters now applied (set below, read by the screen when it draws) */
  var V = MAKE[key](), G = GEO[V.geo];
  document.title = V.name + (DPAGE ? ' — Diseases' : ' — Surveillance') + ' · One Health Portal';
  var TITLE = { human: ['Human Surveillance', 'मानव निगरानी'], animal: ['Animal Surveillance', 'पशु निगरानी'], environment: ['Environment Surveillance', 'पर्यावरण निगरानी'],
    wildlife: ['Wildlife Surveillance', 'वन्यजीव निगरानी'], labs: ['Referral Labs Network', 'रेफरल प्रयोगशाला नेटवर्क'] };
  var HEAD = V.title ? [V.title, V.hi] : TITLE[V.part];
  $('#s-title').innerHTML = HEAD[0] + ' <span class="hi">' + HEAD[1] + '</span>';
  if (V.sub) {   /* a disease page: one line about the disease, its level and two facts */
    $('#d-sub').textContent = V.sub;
    $('#d-meta').innerHTML = '<li><span class="lvl" style="--bg:' + V.level[1] + ';--fg:' + V.level[2] + '"><svg class="i"><use href="#i-alert"/></svg>' + V.level[0] + '</span></li>' + V.facts.map(function (f) { return '<li>' + f + '</li>'; }).join('');
    $('#d-sources').innerHTML = '<div class="sec-h"><h2>Sources</h2><span>Where the figures on this page come from</span></div><div class="card srcs"><ul>' + V.sources.map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ul></div>';
  }
  if (V.part === 'animal') {
    $('#subtabs').hidden = false;
    $$('#subtabs a').forEach(function (a) { if (a.dataset.view === key) a.setAttribute('aria-current', 'page'); });
    $('#s-crumb-part').hidden = false; $('#s-crumb-sep').hidden = false;
    $('#s-crumb-part').innerHTML = '<a href="surveillance.html?view=animal">Animal</a>';
  }
  $('#s-crumb').textContent = V.crumb;

  /* =====================================================================
     Filters (applied when Search is pressed)
     ===================================================================== */
  /* Department filter: all eight departments are listed on every screen.
     SHARE = the part of a screen's reports that comes from each department (sample split; the prototype has none).
     Every department has a share on every screen. Human, Animal and Labs add up to 1. Environment and Wildlife count few events
     (90 animals in 30 days), so their shares are larger and overlap: several departments take part in the same event. */
  var DEPTS = [['mohfw', 'Health & Family Welfare'], ['dahd', 'Animal Husbandry & Dairying'], ['forest', 'Environment, Forest & Climate Change'], ['imd', 'India Meteorological Department'],
    ['icar', 'ICAR'], ['municipal', 'Municipal Corporation'], ['fssai', 'FSSAI (Food Safety)'], ['pcb', 'Pollution Control Board']];
  var SHARE = {
    human: { mohfw: 0.50, municipal: 0.12, fssai: 0.08, dahd: 0.08, icar: 0.06, forest: 0.06, pcb: 0.05, imd: 0.05 },
    animal: { dahd: 0.52, icar: 0.14, forest: 0.08, municipal: 0.07, mohfw: 0.06, fssai: 0.05, pcb: 0.04, imd: 0.04 },
    environment: { forest: 0.70, imd: 0.55, pcb: 0.50, icar: 0.40, dahd: 0.40, mohfw: 0.40, municipal: 0.35, fssai: 0.30 },
    wildlife: { forest: 0.70, dahd: 0.45, icar: 0.40, mohfw: 0.40, municipal: 0.35, pcb: 0.35, imd: 0.30, fssai: 0.30 },
    labs: { mohfw: 0.36, dahd: 0.30, icar: 0.10, fssai: 0.08, forest: 0.05, municipal: 0.04, pcb: 0.04, imd: 0.03 }
  };
  var SCREENS = [['human', 'Human', 'surveillance.html'], ['animal', 'Animal', 'surveillance.html?view=animal'], ['environment', 'Environment', 'surveillance.html?view=environment'],
    ['wildlife', 'Wildlife', 'surveillance.html?view=wildlife'], ['labs', 'Referral labs network', 'surveillance.html?view=labs']];
  var DEPT_FIELD = { k: 'dept', label: 'Department', opts: [['all', 'All departments']].concat(DEPTS) };
  var PICK = (V.nodept ? [] : [DEPT_FIELD]).concat(V.fields);   /* the fields named in the "Showing" line when something is chosen */
  var FIELDS = [{ k: 'state', label: 'State' }, { k: 'dist', label: 'District' }, { k: 'block', label: 'Block / Mandal' }].concat(PICK)
    .concat(V.nodates ? [] : [{ k: 'from', label: 'From date', date: 1 }, { k: 'to', label: 'To date', date: 1 }]);
  /* 8 or 9 fields sit in two rows of five; 10 fields need six in a row so that Search and Reset still fit in the second row */
  $('#fgrid').style.setProperty('--fcols', FIELDS.length === 10 ? 6 : 5);
  $('#fgrid').classList.toggle('c6', FIELDS.length === 10);
  if (FIELDS.length <= 5) { $('#fgrid').classList.remove('wide'); $('#fgrid').style.setProperty('--fc', FIELDS.length); }   /* five fields and the buttons fit one row */
  $('#fgrid').innerHTML = FIELDS.map(function (f) {
    return '<label class="fl"><span>' + f.label + '</span>' + (f.date ? '<input type="date" id="f-' + f.k + '" max="2026-10-01">' : '<select id="f-' + f.k + '"></select>') + '</label>';
  }).join('') + '<div class="fbtns"><button class="b pri" type="submit"><svg class="i"><use href="#i-search"/></svg>Search</button>' +
    '<button class="b sec" type="button" id="reset"><svg class="i"><use href="#i-reset"/></svg>Reset</button></div>';
  var EL = {}, DEF = {};
  FIELDS.forEach(function (f) { EL[f.k] = $('#f-' + f.k); DEF[f.k] = f.date ? '' : 'all'; F[f.k] = DEF[f.k]; if (f.opts) EL[f.k].innerHTML = opt(f.opts); });
  EL.state.innerHTML = opt(STATES);
  function fillDistricts(keep) {
    var s = EL.state.value;
    EL.dist.innerHTML = opt([['all', 'All districts']].concat((G[s] || []).map(function (d) { return [d, d]; })));
    EL.dist.disabled = s === 'all';
    EL.dist.value = keep && EL.dist.querySelector('option[value="' + keep + '"]') ? keep : 'all';
    fillBlocks();
  }
  function fillBlocks(keep) {
    var d = EL.dist.value, tg = EL.state.value === 'tg';
    EL.block.innerHTML = opt([['all', d === 'all' ? 'All blocks / mandals' : tg ? 'All mandals' : 'All blocks']].concat((G.blocks[d] ? L(G.blocks[d]) : []).map(function (b) { return [b, b]; })));
    EL.block.disabled = d === 'all';
    EL.block.value = keep && EL.block.querySelector('option[value="' + keep + '"]') ? keep : 'all';
  }
  function readForm() { var v = {}; Object.keys(EL).forEach(function (k) { v[k] = EL[k].value; }); return v; }
  function writeForm(v) { EL.state.value = v.state; fillDistricts(v.dist); fillBlocks(v.block); Object.keys(EL).forEach(function (k) { if (k !== 'state' && k !== 'dist' && k !== 'block') EL[k].value = v[k]; }); }
  function markDirty() { var v = readForm(); Object.keys(EL).forEach(function (k) { EL[k].classList.toggle('changed', String(v[k]) !== String(F[k])); }); }
  EL.state.addEventListener('change', function () { fillDistricts(); });
  EL.dist.addEventListener('change', function () { fillBlocks(); });
  if (EL.from) EL.from.addEventListener('change', function () { EL.to.min = EL.from.value; });
  Object.keys(EL).forEach(function (k) { EL[k].addEventListener('change', markDirty); });
  $('#fform').addEventListener('submit', function (e) { e.preventDefault(); F = readForm(); markDirty(); draw(); });
  $('#reset').addEventListener('click', function () { writeForm(DEF); if (EL.to) EL.to.min = ''; F = readForm(); markDirty(); draw(); });
  /* share of the reports that comes from the chosen department (1 when all departments are shown) */
  function dshare() { return V.nodept || F.dept === 'all' ? 1 : (SHARE[V.part][F.dept] || 0); }
  function noData() { return !V.nodept && F.dept !== 'all' && !SHARE[V.part][F.dept]; }   /* the chosen department sends nothing for this screen */
  /* how much the chosen district, block and department narrow the counts */
  function place(d, b) { return (F.dist !== 'all' ? d : 1) * (F.block !== 'all' ? b : 1) * dshare(); }
  function scope() { return { state: F.state, district: F.dist.toLowerCase() }; }
  function text(k) { return EL[k].options[EL[k].selectedIndex].text; }

  /* =====================================================================
     Graph helpers (Apache ECharts)
     ===================================================================== */
  var CH = {};
  function ec(cid, el, height) { el.style.height = height + 'px'; if (CH[cid]) CH[cid].resize(); else CH[cid] = echarts.init(el); return CH[cid]; }
  function tipHtml(title, rows) {
    return '<div style="font-weight:700;margin-bottom:4px">' + title + '</div>' + rows.map(function (r) {
      return '<div style="display:flex;justify-content:space-between;gap:20px;line-height:1.5"><span>' +
        (r[2] ? '<i style="display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:7px;background:' + r[2] + '"></i>' : '') + r[0] + '</span><b>' + r[1] + '</b></div>';
    }).join('');
  }
  var TIP = { backgroundColor: INK, borderWidth: 0, padding: [9, 12], textStyle: { color: '#fff', fontSize: 13, fontFamily: FONT }, extraCssText: 'border-radius:6px;box-shadow:0 6px 16px rgba(15,23,42,.22);' };
  function tip(extra) { var o = {}, k; for (k in TIP) o[k] = TIP[k]; for (k in extra) o[k] = extra[k]; return o; }
  var SHADOW = { type: 'shadow', shadowStyle: { color: 'rgba(31,42,68,.05)' } }, DASH = { type: 'line', lineStyle: { color: '#94a3b8', type: 'dashed' } };
  var LEG = { top: 0, left: 0, icon: 'roundRect', itemWidth: 11, itemHeight: 11, itemGap: 14, textStyle: { color: '#334155', fontSize: 13, fontFamily: FONT }, inactiveColor: '#b6bcc6' };
  function leg(extra) { var o = {}, k; for (k in LEG) o[k] = LEG[k]; for (k in extra) o[k] = extra[k]; return o; }
  function xcat(data, gap, show) { return { type: 'category', boundaryGap: gap, data: data, axisLine: { lineStyle: { color: AXIS } }, axisTick: { show: false }, axisLabel: { show: show !== false, color: MUTE, fontSize: 12, margin: 12, hideOverlap: true } }; }
  function yval(dp, extra) { var o = { type: 'value', axisLabel: { color: MUTE, fontSize: 12, formatter: function (v) { return fmt(v, dp || 0); } }, splitLine: { lineStyle: { color: GRIDC } } }; for (var k in extra) o[k] = extra[k]; return o; }
  function setTable(card, head, rows) {
    $('[data-tview]', card).innerHTML = '<table><thead><tr>' + head.map(function (x) { return '<th>' + x + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>';
  }
  function setEmpty(card, el, empty) { $('[data-empty]', card).hidden = !empty || el.hidden; el.classList.toggle('is-empty', empty); }
  function keys(list, box) { return '<ul class="keys' + (box ? ' box' : '') + '">' + list.map(function (x) { return '<li style="--c:' + x[1] + '"><i></i>' + x[0] + '</li>'; }).join('') + '</ul>'; }

  /* A ranked list of horizontal bars. rows: {name, v, color, note}. The value is always written beside the bar.
     o: row, lab, rank, right, unit, dp, max, mark {v, label}, tipRows(row).  On a narrow card (phone) the name sits above its bar. */
  function drawBarList(cid, card, rows, o) {
    var el = $('[data-plot]', card);
    setEmpty(card, el, !rows.length);
    if (!rows.length || el.hidden) return;
    var narrow = card.clientWidth < 460, LW = narrow ? 0 : o.lab, row = narrow ? 44 : o.row, dp = o.dp || 0, unit = o.unit || '';
    var max = o.max || Math.max.apply(null, rows.map(function (r) { return r.v; }));
    var name = function (v) { return (o.rank ? '{k|' + (+v + 1) + '}' : '') + '{n|' + rows[+v].name + '}'; };
    var rich = { k: { color: '#64748b', fontSize: 12, fontWeight: 700, width: 22 }, n: { color: INK, fontSize: 13, fontWeight: 500 } };
    var top = 2, plotW = Math.max(60, (el.clientWidth || card.clientWidth - 36) - LW - (o.right || 70));
    ec(cid, el, rows.length * row + top + 4).setOption({
      textStyle: { fontFamily: FONT, color: INK }, animationDuration: 500,
      grid: { left: LW, right: o.right || 70, top: top, bottom: 2 },
      tooltip: tip({ trigger: 'axis', axisPointer: SHADOW, formatter: function (ps) { var r = rows[(ps.filter(function (p) { return p.seriesType === 'bar'; })[0] || ps[0]).dataIndex]; return tipHtml(r.plain || r.name, o.tipRows ? o.tipRows(r) : [[o.what || 'Value', fmt(r.v, dp) + unit, r.color]]); } }),
      xAxis: { type: 'value', show: false, max: max },
      yAxis: { type: 'category', inverse: true, z: 3, data: rows.map(function (r, i) { return String(i); }), axisLine: { show: false }, axisTick: { show: false },
        axisLabel: narrow ? { inside: true, align: 'left', verticalAlign: 'bottom', margin: 0, padding: [0, 0, 10, 0], formatter: name, rich: rich }
                          : { align: 'left', margin: LW, width: LW - 10, overflow: 'truncate', formatter: name, rich: rich } },
      series: [{ type: 'bar', z: 3, barWidth: narrow ? 10 : (o.bar || 14), barMinHeight: 3, data: rows.map(function (r) {
          var item = { value: r.v, itemStyle: { color: r.color, borderRadius: [0, 3, 3, 0] } };
          /* a bar that stops just short of the target line: its number is written after the line, not across it */
          if (o.mark && r.v < o.mark.v) { var gap = (o.mark.v - r.v) / max * plotW; if (gap < 50) item.label = { distance: gap + 7 }; }
          return item; }),
        label: { show: true, position: 'right', distance: 8, formatter: function (p) { var r = rows[p.dataIndex]; return '{v|' + fmt(r.v, dp) + unit + '}' + (r.note ? '{p|' + r.note + '}' : ''); },
          rich: { v: { color: INK, fontWeight: 700, fontSize: 13 }, p: { color: MUTE, fontSize: 12, padding: [0, 0, 0, 6] } } }
      }].concat(o.mark ? [{ type: 'line', z: 1, silent: true, symbol: 'none', tooltip: { show: false }, lineStyle: { color: INK, type: 'dashed', width: 1.5 },
        data: [[o.mark.v, '0'], [o.mark.v, String(rows.length - 1)]] }] : [])
    }, true);
  }

  /* Lines over time. o: cats, xName, series [{name, color, data}], dp, unit, min0, h, endW */
  function drawLines(cid, card, o) {
    var el = $('[data-plot]', card), multi = o.series.length > 1, wide = card.clientWidth >= 560, dp = o.dp || 0, unit = o.unit ? ' ' + o.unit : '';
    setTable(card, [o.xName].concat(o.series.map(function (s) { return s.name + (o.unit ? ' (' + o.unit + ')' : ''); })), o.cats.map(function (c, i) { return [c].concat(o.series.map(function (s) { return fmt(s.data[i], dp); })); }));
    if (el.hidden) return;
    var legW = sum(o.series.map(function (s) { return 40 + s.name.length * 7.4; })), legRows = multi ? Math.max(1, Math.ceil(legW / Math.max(200, el.clientWidth || card.clientWidth - 36))) : 0;
    ec(cid, el, (o.h || 300) + Math.max(0, legRows - 1) * 24).setOption({
      textStyle: { fontFamily: FONT, color: INK }, animationDuration: 500,
      grid: { left: 6, right: multi && wide && !o.noEnd ? (o.endW || 132) : 24, top: multi ? 18 + legRows * 24 : 16, bottom: 4, containLabel: true },
      legend: leg({ show: multi, data: o.series.map(function (s) { return s.name; }) }),
      tooltip: tip({ trigger: 'axis', axisPointer: DASH, formatter: function (ps) { return tipHtml(ps[0].axisValue, ps.map(function (p) { return [p.seriesName, fmt(p.value, dp) + unit, p.color]; })); } }),
      xAxis: xcat(o.cats, false),
      yAxis: yval(dp, o.min0 ? { min: 0 } : { scale: true }),
      series: o.series.map(function (s) {
        return { name: s.name, type: 'line', data: s.data, smooth: 0.25, smoothMonotone: 'x', symbol: 'circle', symbolSize: 6, lineStyle: { width: 2.5, color: s.color }, itemStyle: { color: s.color, borderColor: '#fff', borderWidth: 2 },
          areaStyle: multi ? undefined : { color: s.color, opacity: 0.12 }, emphasis: { focus: 'series' },
          endLabel: { show: multi && wide && !o.noEnd, formatter: function (p) { return p.seriesName + '  ' + fmt(p.value, dp); }, color: INK, fontWeight: 600, fontSize: 12, distance: 8 }, labelLayout: { moveOverlap: 'shiftY' } };
      })
    }, true);
  }

  /* Two or three small graphs stacked on the same time line (used where the prototype put two scales on one graph).
     o: cats, xName, panels [{name, unit, type 'bar'|'line', color, data, dp}], ph */
  function drawPanels(cid, card, o) {
    var el = $('[data-plot]', card), n = o.panels.length, ph = o.ph || 118, gap = 46, top0 = 32;
    setTable(card, [o.xName].concat(o.panels.map(function (p) { return p.name + (p.unit ? ' (' + p.unit + ')' : ''); })), o.cats.map(function (c, i) { return [c].concat(o.panels.map(function (p) { return p.data[i] == null ? '—' : fmt(p.data[i], p.dp || 0); })); }));
    if (el.hidden) return;
    var grids = [], xs = [], ys = [], ss = [], titles = [];
    o.panels.forEach(function (p, i) {
      var t = top0 + i * (ph + gap), bar = p.type === 'bar', x = xcat(o.cats, bar, i === n - 1), y = yval(p.dp, bar ? { min: 0 } : { scale: true });
      x.gridIndex = i; y.gridIndex = i; y.splitNumber = 3;
      grids.push({ left: 56, right: 26, top: t, height: ph }); xs.push(x); ys.push(y);
      titles.push({ text: p.name + (p.unit ? ' (' + p.unit + ')' : ''), left: 0, top: t - 31, textStyle: { color: INK, fontSize: 12, fontWeight: 700, fontFamily: FONT } });
      ss.push(bar ? { name: p.name, type: 'bar', xAxisIndex: i, yAxisIndex: i, data: p.data, barMaxWidth: 26, itemStyle: { color: p.color, borderRadius: [3, 3, 0, 0] } }
        : { name: p.name, type: 'line', xAxisIndex: i, yAxisIndex: i, data: p.data, smooth: 0.25, symbol: 'circle', symbolSize: 6, lineStyle: { width: 2.5, color: p.color }, itemStyle: { color: p.color, borderColor: '#fff', borderWidth: 2 } });
    });
    ec(cid, el, top0 + n * ph + (n - 1) * gap + 30).setOption({
      textStyle: { fontFamily: FONT, color: INK }, animationDuration: 500, title: titles, grid: grids, xAxis: xs, yAxis: ys,
      axisPointer: { link: [{ xAxisIndex: 'all' }] },
      tooltip: tip({ trigger: 'axis', axisPointer: DASH, formatter: function (ps) { var i = ps[0].dataIndex; return tipHtml(o.cats[i], o.panels.map(function (p) { return [p.name, p.data[i] == null ? 'Not published' : fmt(p.data[i], p.dp || 0) + (p.unit ? ' ' + p.unit : ''), p.color]; })); } }),
      series: ss
    }, true);
  }

  /* Share ring with its list. rows: {name, v, color}; o.sel = name (lower case) to keep in colour when a filter picks one. */
  function drawShare(cid, card, rows, o) {
    var el = $('[data-share]', card);
    rows = rows.map(function (r) { var dim = !!o.sel && r.name.toLowerCase() !== o.sel; return { name: r.name, v: r.v, color: dim ? '#d9dde4' : r.color, dim: dim }; });
    el.innerHTML = '<div class="pie" role="img" aria-label="' + o.what + '"></div><ul>' + rows.map(function (r) { return '<li style="--c:' + r.color + (r.dim ? ';color:var(--ink-500)' : '') + '"><i></i><span>' + r.name + '</span><b>' + r.v + '%</b></li>'; }).join('') + '</ul>';
    if (CH[cid]) CH[cid].dispose();
    CH[cid] = echarts.init($('.pie', el));
    CH[cid].setOption({
      animationDuration: 500, textStyle: { fontFamily: FONT },
      tooltip: tip({ trigger: 'item', formatter: function (p) { return tipHtml(p.name, [[o.what, p.value + '%', p.color]]); } }),
      series: [{ type: 'pie', radius: ['58%', '94%'], startAngle: 90, label: { show: false }, labelLine: { show: false }, emphasis: { scale: false }, itemStyle: { borderColor: '#fff', borderWidth: 2 },
        data: rows.map(function (r) { return { name: r.name, value: r.v, itemStyle: { color: r.color } }; }) }]
    });
  }

  /* Upright bars. o: cats, xName, yName, data [{v, color}], bands [{from, to, label}], line {name, data, color}, extra {name, data}, labels, h, max, unit, tipTitle(i) */
  function drawColumns(cid, card, o) {
    var el = $('[data-plot]', card), unit = o.unit ? ' ' + o.unit : '';
    setTable(card, [o.xName, o.yName].concat(o.line ? [o.line.name] : []).concat(o.extra ? [o.extra.name] : []), o.cats.map(function (c, i) { return [c, fmt(o.data[i].v)].concat(o.line ? [fmt(o.line.data[i])] : []).concat(o.extra ? [o.extra.data[i] || '—'] : []); }));
    if (el.hidden) return;
    var series = [{ name: o.yName, type: 'bar', barMaxWidth: 34, data: o.data.map(function (d) { return { value: d.v, itemStyle: { color: d.color, borderRadius: [3, 3, 0, 0] } }; }),
      label: { show: !!o.labels, position: 'top', color: INK, fontWeight: 700, fontSize: 12, formatter: function (p) { return p.value ? fmt(p.value) : ''; } },
      markArea: o.bands ? { silent: true, data: o.bands.map(function (b, i) { return [{ xAxis: b.from, itemStyle: { color: i % 2 ? '#f6f1ec' : '#fbf3ee' }, label: { show: true, position: 'insideTop', distance: 6, color: INK, fontSize: 12, fontWeight: 600, fontFamily: FONT, formatter: b.label } }, { xAxis: b.to }]; }) } : undefined }];
    if (o.line) series.push({ name: o.line.name, type: 'line', data: o.line.data, symbol: 'none', lineStyle: { width: 2, type: 'dashed', color: o.line.color }, itemStyle: { color: o.line.color } });
    ec(cid, el, o.h || 290).setOption({
      textStyle: { fontFamily: FONT, color: INK }, animationDuration: 500,
      grid: { left: 6, right: 16, top: o.bands ? 30 : 18, bottom: 4, containLabel: true },
      tooltip: tip({ trigger: 'axis', axisPointer: SHADOW, formatter: function (ps) { var i = ps[0].dataIndex; return tipHtml(o.tipTitle ? o.tipTitle(i) : o.cats[i], ps.map(function (p) { return [p.seriesName, fmt(p.value) + unit, p.color]; }).concat(o.extra && o.extra.data[i] ? [[o.extra.name, o.extra.data[i]]] : [])); } }),
      xAxis: xcat(o.cats, true), yAxis: yval(0, { min: 0, max: o.max, minInterval: 1 }), series: series
    }, true);
  }

  /* Stacked horizontal bars. o: cats, xName, series [{name, color, data}] */
  function drawStack(cid, card, o) {
    var el = $('[data-plot]', card), dp = o.dp || 0, tot = o.cats.map(function (c, i) { return sum(o.series.map(function (s) { return s.data[i]; })); });
    setTable(card, [o.xName].concat(o.series.map(function (s) { return s.name; })).concat(['Total']), o.cats.map(function (c, i) { return [c].concat(o.series.map(function (s) { return fmt(s.data[i], dp); })).concat([fmt(tot[i], dp)]); }));
    if (el.hidden) return;
    var narrow = card.clientWidth < 460, LW = narrow ? 122 : 146;
    ec(cid, el, o.cats.length * 46 + (narrow ? 70 : 46)).setOption({
      textStyle: { fontFamily: FONT, color: INK }, animationDuration: 500,
      grid: { left: LW, right: 44, top: narrow ? 64 : 40, bottom: 2 },
      legend: leg({ data: o.series.map(function (s) { return s.name; }) }),
      tooltip: tip({ trigger: 'axis', axisPointer: SHADOW, formatter: function (ps) { var i = ps[0].dataIndex; return tipHtml(o.cats[i], o.series.map(function (s) { return [s.name, fmt(s.data[i], dp), s.color]; }).concat([['Total', fmt(tot[i], dp)]])); } }),
      xAxis: { type: 'value', show: false, max: Math.max(1, Math.max.apply(null, tot)) },
      yAxis: { type: 'category', inverse: true, data: o.cats, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { align: 'left', margin: LW, color: INK, fontSize: 13, width: LW - 10, overflow: 'truncate' } },
      series: o.series.map(function (s) { return { name: s.name, type: 'bar', stack: 't', barWidth: 18, data: s.data, itemStyle: { color: s.color, borderColor: '#fff', borderWidth: 1 }, emphasis: { focus: 'series' } }; })
        .concat([{ name: 'Total', type: 'bar', barGap: '-100%', barWidth: 18, silent: true, z: 1, data: tot, itemStyle: { color: 'transparent' }, tooltip: { show: false },
          label: { show: true, position: 'right', distance: 8, color: INK, fontWeight: 700, fontSize: 13, formatter: function (p) { return fmt(p.value, dp); } } }])
    }, true);
  }

  /* Table of numbers, each cell coloured by its level. o: rows, cols, m, level(v) -> index into o.levels [[label, background, text]] */
  function drawHeat(card, o) {
    $('[data-heat]', card).innerHTML = '<div class="heat"><table><thead><tr><th></th>' + o.cols.map(function (c) { return '<th scope="col">' + c + '</th>'; }).join('') + '</tr></thead><tbody>' +
      o.rows.map(function (r, y) { return '<tr><th scope="row">' + r + '</th>' + o.m[y].map(function (v) { var lv = o.levels[o.level(v)]; return '<td style="--bg:' + lv[1] + ';--fg:' + lv[2] + (lv[1] === '#fff' ? ';box-shadow:inset 0 0 0 1px var(--line)' : '') + '" title="' + lv[0] + '">' + v + '</td>'; }).join('') + '</tr>'; }).join('') +
      '</tbody></table></div>' + keys(o.levels.map(function (l) { return [l[0], l[1]]; }), true) + (o.note ? '<p class="note">' + o.note + '</p>' : '');
  }

  /* =====================================================================
     HUMAN
     ===================================================================== */
  function human() {
    var CAT = { vector: ['Vector-borne', SIX[0]], water: ['Water-borne', SIX[1]], respiratory: ['Respiratory', SIX[2]], zoonotic: ['Zoonotic (One Health)', SIX[3]], vpd: ['Vaccine-preventable', SIX[4]], other: ['Other', SIX[5]] };
    /* key: [name, group, cases this year, cases this week, case fatality %] */
    var DZ = {
      dengue: ['Dengue', 'vector', 22850, 640, 0.4], malaria: ['Malaria', 'vector', 11420, 320, 0.2], chikungunya: ['Chikungunya', 'vector', 3860, 108, 0.02], je: ['Japanese Encephalitis', 'vector', 184, 6, 20],
      scrub_typhus: ['Scrub Typhus', 'vector', 856, 22, 4.8], acute_diarrhoea: ['Acute Diarrhoeal Disease', 'water', 41200, 1250, 0.3], cholera: ['Cholera', 'water', 142, 4, 2.1], typhoid: ['Typhoid / Enteric', 'water', 8420, 240, 0.9],
      hep_a_e: ['Viral Hepatitis A / E', 'water', 2180, 62, 0.5], hep_b_c: ['Viral Hepatitis B / C', 'other', 1245, 35, 1.2], tb: ['Tuberculosis', 'respiratory', 33600, 940, 4.1], h1n1: ['Influenza H1N1', 'respiratory', 2140, 58, 1.8],
      measles: ['Measles / Rubella', 'vpd', 612, 18, 0.4], chickenpox: ['Chickenpox', 'vpd', 1840, 52, 0.1], leptospirosis: ['Leptospirosis', 'zoonotic', 680, 20, 5.6], rabies_pep: ['Animal-bite / Rabies PEP', 'zoonotic', 18400, 520, 0],
      anthrax: ['Anthrax', 'zoonotic', 28, 1, 24], kfd: ['Kyasanur Forest Disease', 'zoonotic', 132, 6, 3.4], bruc: ['Brucellosis', 'zoonotic', 1085, 32, 0.1], avian: ['Avian Influenza · H5N1', 'zoonotic', 56, 4, 48]
    };
    var DKEYS = Object.keys(DZ), YTD_ALL = sum(DKEYS.map(function (k) { return DZ[k][2]; })), WEEK_ALL = sum(DKEYS.map(function (k) { return DZ[k][3]; }));
    var CFR_ALL = sum(DKEYS.map(function (k) { return DZ[k][4] * DZ[k][2]; })) / YTD_ALL;
    var AGES = ['0–14', '15–29', '30–44', '45–59', '60+'], PYR = { women: [2850, 3980, 3620, 3040, 1980], men: [3120, 4520, 4180, 3480, 2240], others: [28, 45, 38, 30, 22] };
    var SHARE = [['vector', 28], ['water', 26], ['respiratory', 20], ['zoonotic', 12], ['vpd', 9], ['other', 5]];
    var CASCADE = [['Suspected', 4200], ['Presumptive', 1980], ['Lab-confirmed', 1284], ['Admitted', 685], ['Recovered', 620], ['Died', 45]];
    var TOP = [['Nilgiris', 'tn', 342], ['Namakkal', 'tn', 296], ['Sangareddy', 'tg', 154], ['Coimbatore', 'tn', 148], ['Erode', 'tn', 132], ['Nagarkurnool', 'tg', 124], ['Rangareddy', 'tg', 96], ['Medak', 'tg', 74],
      ['Chennai', 'tn', 68], ['Salem', 'tn', 52], ['Madurai', 'tn', 32], ['Warangal', 'tg', 18], ['Hyderabad', 'tg', 15], ['Karimnagar', 'tg', 14], ['Adilabad', 'tg', 9]];
    var ORDER = L('dengue,malaria,chikungunya,acute_diarrhoea,cholera,typhoid,hep_a_e,hep_b_c,tb,leptospirosis,scrub_typhus,je,measles,chickenpox,h1n1,rabies_pep,anthrax,kfd,bruc,avian');
    var LABEL = { typhoid: 'Typhoid / Enteric fever', anthrax: 'Anthrax (zoonotic)', kfd: 'Kyasanur Forest Disease (zoonotic)', bruc: 'Brucellosis (zoonotic)', avian: 'Avian Influenza · H5N1 (zoonotic)' };
    var M_AGE = { all: 1, '0-14': 0.19, '15-29': 0.24, '30-44': 0.24, '45-59': 0.20, '60+': 0.13 }, M_SEX = { all: 1, female: 0.48, male: 0.51, others: 0.01 }, M_STATUS = { all: 1, suspected: 2.5, presumptive: 1.4, confirmed: 1 };
    function share() { return F.dis === 'all' ? 1 : Math.max(0.01, DZ[F.dis][2] / YTD_ALL); }
    function people() { return M_AGE[F.age] * M_SEX[F.sex] * M_STATUS[F.status]; }
    function mult() { return M_STATE[F.state] * share() * people() * place(0.15, 0.25); }

    function drawDiseases(card, cid) {
      var k = M_STATE[F.state] * place(0.15, 0.25);
      var rows = DKEYS.filter(function (d) { return F.dis === 'all' || F.dis === d; }).map(function (d) {
        var z = DZ[d][1] === 'zoonotic';
        return { name: DZ[d][0], cat: CAT[DZ[d][1]][0], v: Math.max(1, Math.round(DZ[d][2] * k)), color: z ? ROSE : GREY };
      }).sort(function (a, b) { return b.v - a.v; });
      setTable(card, ['Disease', 'Group', 'Cases this year'], rows.map(function (r) { return [r.name, r.cat, fmt(r.v)]; }));
      drawBarList(cid, card, rows, { row: 28, lab: 212, rank: true, right: 70, tipRows: function (r) { return [['Cases this year', fmt(r.v), r.color], ['Group', r.cat]]; } });
    }
    function drawGroups(card, cid) { drawShare(cid, card, SHARE.map(function (s) { return { name: CAT[s[0]][0], v: s[1], color: CAT[s[0]][1] }; }), { what: 'Share of cases' }); }
    function drawCascade(card, cid) {
      var m = mult(), first = Math.round(CASCADE[0][1] * m);
      var rows = CASCADE.map(function (s, i) { var v = Math.round(s[1] * m); return { name: s[0], v: v, color: ROSE, note: i && first ? Math.round(v * 100 / first) + '%' : '' }; });
      setTable(card, ['Stage', 'Cases', 'Share of suspected'], rows.map(function (r, i) { return [r.name, fmt(r.v), i ? r.note || '0%' : '100%']; }));
      drawBarList(cid, card, rows, { row: 34, bar: 16, lab: 118, right: 96, tipRows: function (r) { return [['Cases', fmt(r.v), r.color]].concat(r.note ? [['Share of suspected', r.note]] : []); } });
    }
    function drawPyramid(card, cid) {
      var el = $('[data-plot]', card), m = mult();
      var W = PYR.women.map(function (v) { return Math.round(v * m); }), Mn = PYR.men.map(function (v) { return Math.round(v * m); }), O = PYR.others.map(function (v) { return Math.round(v * m); });
      setTable(card, ['Age group', 'Women', 'Men', 'Others', 'Total'], AGES.map(function (g, i) { return [g + ' years', fmt(W[i]), fmt(Mn[i]), fmt(O[i]), fmt(W[i] + Mn[i] + O[i])]; }));
      $('[data-keys]', card).innerHTML = [['Women', sum(W), WOMEN], ['Men', sum(Mn), MEN], ['Others', sum(O), OTHERS]].map(function (x) { return '<li style="--c:' + x[2] + '"><i></i>' + x[0] + ' <b>' + fmt(x[1]) + '</b></li>'; }).join('');
      var total = sum(W) + sum(Mn) + sum(O);
      setEmpty(card, el, !total);
      if (!total || el.hidden) return;
      /* the scale ends a little beyond the longest bar, so the numbers beside the bars never run into the age labels */
      var top = Math.max.apply(null, W.concat(Mn.map(function (v, i) { return v + O[i]; }))), unit = Math.max(1, Math.pow(10, Math.floor(Math.log(Math.max(top, 1)) / Math.LN10)) / 2);
      var mx = Math.ceil(top * 1.5 / unit) * unit;
      var sib = $('.chart:not(#' + cid + ') [data-plot]', card.parentNode), h = Math.max(270, sib && !sib.hidden && card.parentNode.clientWidth > 900 ? sib.offsetHeight - 34 : 0);
      function lab(pos, f) { return { show: true, position: pos, distance: 6, color: INK, fontWeight: 700, fontSize: 12, formatter: f }; }
      ec(cid, el, h).setOption({
        textStyle: { fontFamily: FONT, color: INK }, animationDuration: 500,
        grid: { left: 4, right: 34, top: 8, bottom: 24, containLabel: true },
        tooltip: tip({ trigger: 'axis', axisPointer: SHADOW, formatter: function (ps) { var i = ps[0].dataIndex; return tipHtml(AGES[i] + ' years', [['Women', fmt(W[i]), WOMEN], ['Men', fmt(Mn[i]), MEN], ['Others', fmt(O[i]), OTHERS], ['Total', fmt(W[i] + Mn[i] + O[i])]]); } }),
        xAxis: { type: 'value', min: -mx, max: mx, name: 'Number of cases', nameLocation: 'middle', nameGap: 28, nameTextStyle: { color: MUTE, fontSize: 12, fontWeight: 600 },
          axisLabel: { color: MUTE, fontSize: 12, showMinLabel: false, showMaxLabel: false, formatter: function (v) { return fmt(Math.abs(v)); } }, splitLine: { lineStyle: { color: GRIDC } } },
        yAxis: { type: 'category', data: AGES.map(function (g) { return g + ' yrs'; }), axisLine: { show: false, onZero: false }, axisTick: { show: false }, axisLabel: { color: INK, fontSize: 13, margin: 12 } },
        series: [
          { name: 'Women', type: 'bar', stack: 'p', barWidth: 26, data: W.map(function (v) { return -v; }), itemStyle: { color: WOMEN, borderRadius: [4, 0, 0, 4] }, label: lab('left', function (p) { return fmt(-p.value) || ''; }),
            markLine: { silent: true, symbol: 'none', label: { show: false }, lineStyle: { color: AXIS, type: 'solid', width: 1 }, data: [{ xAxis: 0 }] } },
          { name: 'Men', type: 'bar', stack: 'p', data: Mn, itemStyle: { color: MEN } },
          { name: 'Others', type: 'bar', stack: 'p', data: O, itemStyle: { color: OTHERS, borderRadius: [0, 4, 4, 0] }, label: lab('right', function (p) { return fmt(Mn[p.dataIndex]); }) }
        ]
      }, true);
    }
    function drawDistricts(card, cid) {
      var k = share() * people() * (F.block !== 'all' ? 0.25 : 1) * dshare();   /* state and district choose the rows, the other filters change the counts */
      var rows = TOP.filter(function (d) { return (F.state === 'all' || d[1] === F.state) && (F.dist === 'all' || d[0] === F.dist); })
        .map(function (d) { return { name: d[0] + ' (' + STSHORT[d[1]] + ')', st: STNAME[d[1]], v: Math.round(d[2] * k), color: ROSE }; });
      $('[data-empty]', card).textContent = F.dist !== 'all' ? F.dist + ' is not among the 15 districts with the most cases.' : 'Nothing to show for these filters.';
      setTable(card, ['District', 'State', 'Cases'], rows.map(function (r) { return [r.name.replace(/ \(.*/, ''), r.st, fmt(r.v)]; }));
      drawBarList(cid, card, rows, { row: 30, lab: 176, rank: true, right: 60, tipRows: function (r) { return [['Cases', fmt(r.v), r.color], ['State', r.st]]; } });
    }
    return {
      part: 'human', name: 'Human', crumb: 'Human', geo: 'human', all: 'all IHIP diseases',
      fields: [
        { k: 'dis', label: 'Disease', opts: [['all', 'All IHIP diseases']].concat(ORDER.map(function (k) { return [k, LABEL[k] || DZ[k][0]]; })) },
        { k: 'status', label: 'Case status', opts: [['all', 'All statuses'], ['suspected', 'Suspected'], ['presumptive', 'Presumptive'], ['confirmed', 'Lab-confirmed']] },
        { k: 'age', label: 'Age group', opts: [['all', 'All ages'], ['0-14', '0–14 years'], ['15-29', '15–29 years'], ['30-44', '30–44 years'], ['45-59', '45–59 years'], ['60+', '60 years and above']] },
        { k: 'sex', label: 'Sex', opts: [['all', 'All'], ['female', 'Female'], ['male', 'Male'], ['others', 'Others']] }],
      kpis: function () {
        var one = F.dis !== 'all' ? DZ[F.dis] : null, week = (one ? one[3] : WEEK_ALL) * M_STATE[F.state] * people() * place(0.15, 0.25);
        var reporting = Math.max(1, Math.round(15 * (F.state === 'all' ? 1 : 0.55))), districts = F.state === 'tg' ? 33 : F.state === 'tn' ? 38 : 71;
        var delay = F.status === 'confirmed' ? 1.8 : F.status === 'presumptive' ? 2.3 : 3.4;
        return [
          { icon: 'users', label: 'Cases this week', v: fmt(week), sub: '<svg class="i"><use href="#i-up"/></svg>7.5% from last week', tip: 'New human cases of any status recorded this week' + (one ? ' for ' + one[0] : ', for every disease tracked in IHIP') + '.', src: 'IHIP · IDSP' },
          { icon: 'pulse', label: 'Case fatality', v: (one ? one[4] : CFR_ALL).toFixed(1), small: '%', sub: one ? one[0] : 'Average of all diseases', tip: 'Deaths as a share of confirmed cases. For all diseases together it is weighted by the number of cases.', src: 'IHIP death-case module' },
          { icon: 'flask', label: 'Lab-confirmed', v: fmt(Math.round(week * 0.22)), sub: 'In the last 7 days', tip: 'Cases confirmed positive by a laboratory in the last 7 days.', src: 'VRDL · IDSP Laboratory Case form' },
          { icon: 'mappin', label: 'Districts reporting', v: fmt(reporting), small: 'of ' + districts, sub: 'This week', tip: 'Districts that filed at least one action update in the IHIP early warning system this week.', src: 'IHIP EWS action update' },
          { icon: 'timer', label: 'Time to report', v: delay.toFixed(1), small: 'days', sub: 'Median, alert to report', tip: 'Median number of days between the first alert of an event and its confirmed case list in IHIP.', src: 'IHIP EWS log' },
          { icon: 'bed', label: 'Admitted', v: fmt(Math.round(week * 0.07)), sub: fmt(Math.round(week * 0.015)) + ' in ICU · last 7 days', tip: 'People admitted to hospital in the last 7 days, and how many of them are in intensive care.', src: 'HMIS admission and ICU flags' }];
      },
      sections: [
        { title: 'Cases by disease', sub: 'Every disease tracked in IHIP', layout: 'lead', charts: [
          { id: 'dz', title: 'Cases by IHIP disease (this year)', cap: 'Highest first', tools: 1, body: keys([['Zoonotic (One Health) diseases', ROSE], ['Other diseases', GREY]]) + PLOT(), source: 'IHIP · IDSP · HMIS', draw: drawDiseases },
          { id: 'share', title: 'Cases by disease group', cap: 'Share of all cases', body: SHAREBOX(), source: 'IHIP disease taxonomy', draw: drawGroups },
          { id: 'casc', title: 'Case cascade', cap: 'From suspected to died', tools: 1, body: PLOT(), source: 'IHIP EWS · HMIS · VRDL', draw: drawCascade }] },
        { title: 'People and places', sub: 'Who is affected, and which districts report the most cases', layout: 'two', charts: [
          { id: 'pyr', title: 'Cases by age and sex', cap: 'Women on the left, men on the right', tools: 1, last: 1, body: '<ul class="keys" data-keys></ul>' + PLOT(), source: 'IHIP demographics', draw: drawPyramid },
          { id: 'top', title: 'Top 15 districts by number of cases', cap: 'Highest first', tools: 1, body: PLOT(), source: 'IHIP · IDSP · HMIS', draw: drawDistricts }] }]
    };
  }

  /* =====================================================================
     ANIMAL — cases
     ===================================================================== */
  function animal() {
    var FIR = { fmd: ['FMD', [380, 392, 388, 405, 412, 398, 420, 428, 415, 432, 428, 441]], bruc: ['Brucellosis', [220, 228, 235, 242, 238, 244, 251, 258, 262, 266, 272, 276]],
      ppr: ['PPR', [180, 178, 182, 185, 188, 192, 196, 198, 202, 205, 208, 212]], lsd: ['Lumpy Skin', [140, 148, 152, 158, 162, 168, 172, 176, 180, 184, 188, 192]],
      ai: ['Avian Influenza', [85, 78, 72, 82, 96, 112, 142, 178, 215, 268, 308, 342]], csf: ['CSF', [40, 42, 45, 48, 46, 44, 42, 45, 48, 46, 44, 42]] };
    var FIR_COLOR = { fmd: SIX[0], bruc: SIX[5], ppr: SIX[2], lsd: SIX[4], ai: SIX[1], csf: SIX[3] }, FKEYS = Object.keys(FIR);
    var FIR_MONTH = sum(FKEYS.map(function (k) { return sum(FIR[k][1].slice(-4)); }));
    var SAMPLING = [['Tamil Nadu', 92], ['Punjab', 88], ['Telangana', 88], ['Kerala', 82], ['Haryana', 82], ['Karnataka', 78], ['Rajasthan', 72], ['Maharashtra', 70], ['Andhra Pradesh', 68], ['Gujarat', 65],
      ['Madhya Pradesh', 55], ['West Bengal', 48], ['Uttar Pradesh', 45], ['Odisha', 42], ['Bihar', 38]];
    var SAMPLING_AVG = Math.round(sum(SAMPLING.map(function (s) { return s[1]; })) / SAMPLING.length);
    var MVU_CALLS = [15200, 15800, 16400, 17200, 17800, 18400, 18900, 19600, 20200, 20800, 21400, 22100], MVU_RESP = [62, 58, 55, 52, 50, 48, 46, 45, 47, 48, 50, 53];
    var DEATHS = [48000, 46500, 49200, 48800, 52400, 58600, 68200, 182000, 148000, 72400, 58200, 52800], BASE = [48500, 47500, 48200, 49500, 50600, 52400, 55200, 58800, 62400, 64200, 63200, 60800];
    var M_DIS = { all: 1, fmd: 0.36, bruc: 0.24, ppr: 0.16, lsd: 0.13, ai: 0.08, csf: 0.03 }, M_FIR = { all: 1, active: 0.55, closed: 0.45 };
    function mult() { return M_STATE[F.state] * M_DIS[F.dis] * M_SPECIES[F.species] * M_FIR[F.fir] * place(0.15, 0.25); }
    function scale(a) { var m = mult(); return a.map(function (v) { return Math.max(0, Math.round(v * m)); }); }
    return {
      part: 'animal', name: 'Animal cases', crumb: 'Cases', geo: 'animal', all: 'all animal diseases',
      fields: [
        { k: 'species', label: 'Species', opts: SPECIES },
        { k: 'dis', label: 'Disease', opts: [['all', 'All diseases'], ['fmd', 'Foot and Mouth Disease'], ['bruc', 'Brucellosis'], ['ppr', 'PPR'], ['lsd', 'Lumpy Skin Disease'], ['ai', 'Avian Influenza (H5N1)'], ['csf', 'Classical Swine Fever']] },
        { k: 'fir', label: 'FIR status', opts: [['all', 'All FIR statuses'], ['active', 'Active'], ['closed', 'Closed']] }],
      kpis: function () {
        var m = mult(), sc = scope(), on = ' · as on ' + BP.dataAsOn, bruc = F.dis === 'all' || F.dis === 'bruc';
        var ds = dshare();   /* the register counts also follow the chosen department */
        var owners = big(BP.lookup(sc, 'owners').total * ds), animals = big(BP.lookup(sc, 'animals').total * ds), vacc = big(BP.vaccTotal(BP.lookup(sc, 'vacc')) * ds);
        var days = F.dis === 'fmd' ? 12 : F.dis === 'lsd' ? 18 : F.dis === 'ai' ? 6 : 14;
        return [
          { icon: 'users', label: 'Livestock owners', v: owners.v, small: owners.small, sub: 'On Bharat Pashudhan', tip: 'Livestock owners registered on Bharat Pashudhan, total so far, for the selected state or district.', src: 'Bharat Pashudhan · Livestock Owners' + on },
          { icon: 'tag', label: 'Animals registered', v: animals.v, small: animals.small, sub: 'With Pashu Aadhaar tag', tip: 'Animals that have an ear tag with a Pashu Aadhaar number, for the selected state or district.', src: 'Bharat Pashudhan · Pashu Aadhaar' + on },
          { icon: 'syringe', label: 'Vaccinations', v: vacc.v, small: vacc.small, sub: 'FMD, Bruc, PPR, CSF, LSD', tip: 'Vaccine doses recorded on Bharat Pashudhan for FMD, Brucellosis, PPR, CSF and LSD together, total so far.', src: 'Bharat Pashudhan · NADCP' + on },
          { icon: 'file', label: 'FIRs this month', v: fmt(FIR_MONTH * m), sub: 'Filed by block vets', tip: 'First Information Reports filed by block veterinary officers this month, for the six animal diseases tracked.', src: 'Bharat Pashudhan' },
          { icon: 'alert', label: 'Open outbreaks', v: fmt(Math.max(1, Math.round(148 * m))), sub: 'Open ' + days + ' days on average', tip: 'Outbreaks that the block veterinary officer has not yet closed.', src: 'Bharat Pashudhan Outbreak Follow-up' },
          { icon: 'target', label: 'Brucellosis sampling', v: bruc ? String(SAMPLING_AVG) : '—', small: bruc ? '%' : '', sub: bruc ? 'Of planned villages' : 'Not applicable', tip: 'Villages sampled as a share of villages planned under NIVEDI Phase V. It shows progress of the plan, not test results.', src: 'NIVEDI Phase V · Bharat Pashudhan lab log' }];
      },
      sections: [
        { title: 'Disease reports', sub: 'First information reports from block veterinary officers', layout: 'wide', charts: [
          { id: 'fir', title: 'Livestock FIRs per week, by disease', cap: 'First information reports filed each week', tools: 1, body: PLOT(), source: 'Bharat Pashudhan', draw: function (card, cid) {
            drawLines(cid, card, { cats: W12, xName: 'Week', min0: true, h: 320, endW: 138, series: (F.dis === 'all' ? FKEYS : [F.dis]).map(function (k) { return { name: FIR[k][0], color: FIR_COLOR[k], data: scale(FIR[k][1]) }; }) }); } },
          { id: 'species', title: 'Animal cases by species', cap: 'Share of all animal cases', body: SHAREBOX(), source: 'Bharat Pashudhan register', draw: function (card, cid) {
            drawShare(cid, card, SPECIES_SHARE.map(function (s, i) { return { name: s[0], v: s[1], color: SIX[i] }; }), { what: 'Share of animal cases', sel: F.species === 'all' ? '' : F.species }); } }] },
        { title: 'Sampling, early warning and response', sub: 'Brucellosis sampling plan, poultry deaths and mobile veterinary units', layout: 'lead', charts: [
          { id: 'samp', title: 'Brucellosis sampling plan, progress by state', cap: 'Villages sampled as a share of villages planned', tools: 1, body: keys([['On track (80% or more)', ROSE], ['Below 80%', GREY], ['80% line', INK]]) + PLOT(), source: 'NIVEDI sero-monitoring Phase V · Bharat Pashudhan lab log', draw: function (card, cid) {
            var rows = SAMPLING.map(function (s) { return { name: s[0], v: s[1], color: s[1] >= 80 ? ROSE : GREY }; });
            setTable(card, ['State', 'Villages sampled of planned'], rows.map(function (r) { return [r.name, r.v + '%']; }));
            drawBarList(cid, card, rows, { row: 40, lab: 150, rank: true, right: 56, unit: '%', max: 100, mark: { v: 80 }, what: 'Villages sampled' }); } },
          { id: 'poultry', title: 'Poultry deaths per week', cap: 'Weeks far above normal warn of bird flu', tools: 1, body: keys([['Deaths', GREY], ['Far above normal', ROSE], ['Normal level (7-week average)', INK]]) + PLOT(), source: 'Bharat Pashudhan · NIHSAD', draw: function (card, cid) {
            var d = scale(DEATHS), b = scale(BASE);
            drawColumns(cid, card, { cats: W12, xName: 'Week', yName: 'Deaths', h: 210, data: d.map(function (v, i) { return { v: v, color: DEATHS[i] > BASE[i] * 1.5 ? ROSE : GREY }; }), line: { name: 'Normal level', data: b, color: INK } }); } },
          { id: 'mvu', title: 'Mobile veterinary units', cap: 'Calls received, and how fast a unit responded', tools: 1, body: PLOT(), source: 'Mobile Vet Unit Emergency System', draw: function (card, cid) {
            drawPanels(cid, card, { cats: W12, xName: 'Week', ph: 84, panels: [{ name: 'Calls per week', type: 'bar', color: GREY, data: scale(MVU_CALLS) }, { name: 'Median response time', unit: 'minutes', type: 'line', color: ROSE, data: MVU_RESP }] }); } }] }]
    };
  }

  /* =====================================================================
     ANIMAL — vaccinations
     ===================================================================== */
  function vaccinations() {
    var COVER = [['Uttar Pradesh', 91, '210 lakh'], ['Rajasthan', 88, '175 lakh'], ['Maharashtra', 86, '168 lakh'], ['Madhya Pradesh', 85, '152 lakh'], ['Haryana', 85, '120 lakh'], ['Punjab', 83, '114 lakh'], ['Gujarat', 82, '138 lakh'],
      ['Goa', 81, '22 lakh'], ['Tamil Nadu', 79, '112 lakh'], ['Karnataka', 78, '104 lakh'], ['Telangana', 76, '74 lakh'], ['Andhra Pradesh', 74, '92 lakh'], ['Bihar', 71, '88 lakh'], ['West Bengal', 68, '66 lakh'], ['Odisha', 65, '52 lakh']];
    var DOSES = [352, 704, 1058, 1420, 1798, 2185, 2582, 2988, 3402, 3826, 4258, 4695];
    var VCOLS = L('BCP,FMD,PPR,CSF,LSD,Rabies');
    var HEAT_ROWS = L('Uttar Pradesh,Rajasthan,Maharashtra,Madhya Pradesh,Tamil Nadu,Telangana'), HEAT = [[91, 88, 78, 62, 74, 68], [88, 86, 82, 58, 71, 65], [86, 90, 82, 74, 78, 70], [85, 88, 80, 68, 72, 65], [79, 88, 85, 72, 81, 84], [76, 84, 78, 70, 75, 71]];
    var STORES = L('TN State Vaccine Store,TG State Vaccine Store,Coimbatore District Store,Nilgiris District Store,Sangareddy District Store,Nagarkurnool District Store');
    var STOCK = [[78, 62, 84, 45, 90, 68], [82, 55, 72, 38, 76, 60], [42, 28, 34, 12, 48, 38], [18, 6, 22, 4, 32, 28], [45, 32, 40, 22, 52, 42], [22, 14, 18, 8, 30, 24]];
    var COLD = [['Punjab', 97], ['Haryana', 96], ['Uttar Pradesh', 94], ['Maharashtra', 95], ['Madhya Pradesh', 92], ['Rajasthan', 93], ['Gujarat', 96], ['Tamil Nadu', 97], ['Karnataka', 94], ['Telangana', 93], ['Andhra Pradesh', 91], ['Bihar', 88], ['West Bengal', 89], ['Odisha', 86]];
    var M_VAC = { all: 1, bcp: 0.24, fmd: 0.34, ppr: 0.14, csf: 0.06, lsd: 0.10, rabies: 0.12 };
    function mult() { return M_STATE[F.state] * M_VAC[F.vac] * M_SPECIES[F.species] * place(0.15, 0.25); }
    function mine(name) { return (F.state === 'tn' && name === 'Tamil Nadu') || (F.state === 'tg' && name === 'Telangana'); }
    return {
      part: 'animal', name: 'Animal vaccinations', crumb: 'Vaccinations', geo: 'animal', all: 'all vaccines',
      fields: [
        { k: 'vac', label: 'Vaccine', opts: [['all', 'All vaccines'], ['bcp', 'BCP-S19 (Brucellosis)'], ['fmd', 'FMD'], ['ppr', 'PPR (CADCP)'], ['csf', 'CSF (CADCP)'], ['lsd', 'LSD'], ['rabies', 'Rabies (ARV)']] },
        { k: 'species', label: 'Species', opts: SPECIES2 }],
      kpis: function () {
        var sc = scope(), vacc = BP.lookup(sc, 'vacc'), owners = BP.lookup(sc, 'owners'), on = ' · as on ' + BP.dataAsOn;
        var ds = dshare(), raw = BP.vaccPick(vacc, F.vac); if (raw != null) raw = raw * (F.species === 'all' ? 1 : REG_SHARE[F.species]) * ds;
        var month = big(raw == null ? null : raw / 24), bcpOn = F.vac === 'all' || F.vac === 'bcp', ringOn = F.vac === 'all' || F.vac === 'fmd' || F.vac === 'lsd';
        var base = (owners.total || 0) * 0.35, cover = base > 0 ? Math.min(99, Math.round((vacc.bruc || 0) / base * 100)) : 79;
        var farmers = big((vacc.farmers || 0) * ds), calves = big((vacc.bruc || 0) * ds);
        var alerts = Math.max(1, Math.round(42 * (raw != null && BP.vaccTotal(vacc) ? raw / Math.max(1, BP.vaccTotal(BP.india.vacc)) : 1)));
        return [
          { icon: 'syringe', label: 'Doses this month', v: month.v, small: month.small, sub: raw == null ? 'Not recorded for Rabies' : 'Estimated from the total', tip: 'About how many doses were given this month. It is worked out from the total doses recorded on Bharat Pashudhan (total divided by 24).', src: 'Bharat Pashudhan · NADCP' + on },
          { icon: 'target', label: 'Brucellosis coverage', v: bcpOn ? String(cover) : '—', small: bcpOn ? '%' : '', sub: bcpOn ? 'Target is 80%' : 'Select the BCP vaccine', tip: 'Brucellosis (S19) vaccinations recorded, as a share of the calves that should get the vaccine, for the selected state or district.', src: 'Bharat Pashudhan · Brucellosis' + on },
          { icon: 'users', label: 'Farmers benefitted', v: farmers.v, small: farmers.small, sub: 'Total so far', tip: 'Farmers whose animals have been vaccinated under the programme, total so far.', src: 'Bharat Pashudhan · NADCP' + on },
          { icon: 'check', label: 'Calves vaccinated', v: bcpOn ? calves.v : '—', small: bcpOn ? calves.small : '', sub: bcpOn ? 'Female, 4–8 months (S19)' : 'Select the BCP vaccine', tip: 'Brucellosis (S19) vaccine doses recorded for female calves aged 4 to 8 months.', src: 'Bharat Pashudhan · Brucellosis Phase V' },
          { icon: 'box', label: 'Vaccine stock alerts', v: fmt(alerts), sub: 'Low stock or near expiry', tip: 'Alerts now open at vaccine stores: stock running low, or stock close to its expiry date.', src: 'e-Aushadhi · DVDMS' },
          { icon: 'target', label: 'Ring vaccination', v: ringOn ? '78' : '—', small: ringOn ? '%' : '', sub: ringOn ? 'Around an outbreak' : 'Select FMD or LSD', tip: 'Livestock within 3 km of a confirmed outbreak that were vaccinated within 7 days.', src: 'Bharat Pashudhan · VETNET' }];
      },
      sections: [
        { title: 'Coverage and cold chain', sub: 'Compared with the targets, state by state', layout: 'two', charts: [
          { id: 'cover', title: 'Brucellosis (BCP) vaccine coverage by state', cap: 'Share of eligible female calves vaccinated', tools: 1, body: keys([['At or above the 80% target', ROSE], ['Below target', GREY], ['80% line', INK]]) + PLOT(), source: 'Bharat Pashudhan · NADCP · DAHD', draw: function (card, cid) {
            var rows = COVER.map(function (s) { return { name: s[0] + (mine(s[0]) ? '  ◄' : ''), plain: s[0], v: s[1], doses: s[2], color: s[1] >= 80 ? ROSE : GREY }; });
            setTable(card, ['State', 'Coverage', 'Doses so far'], rows.map(function (r) { return [r.plain, r.v + '%', r.doses]; }));
            drawBarList(cid, card, rows, { row: 30, lab: 150, rank: true, right: 56, unit: '%', max: 100, mark: { v: 80 }, tipRows: function (r) { return [['Coverage', r.v + '%', r.color], ['Doses so far', r.doses]]; } }); } },
          { id: 'cold', title: 'Cold-chain compliance by state', cap: 'Share of storage points kept at 2–8°C', tools: 1, body: keys([['At or above the 95% target', ROSE], ['Below target', GREY], ['95% line', INK]]) + PLOT(), source: 'e-Aushadhi · DVDMS · State Vaccine Store', draw: function (card, cid) {
            var rows = COLD.slice().sort(function (a, b) { return b[1] - a[1]; }).map(function (s) { return { name: s[0] + (mine(s[0]) ? '  ◄' : ''), plain: s[0], v: s[1], color: s[1] >= 95 ? ROSE : GREY }; });
            setTable(card, ['State', 'Storage points at 2–8°C'], rows.map(function (r) { return [r.plain, r.v + '%']; }));
            drawBarList(cid, card, rows, { row: 30, lab: 150, rank: true, right: 56, unit: '%', max: 100, mark: { v: 95 }, what: 'Storage points at 2–8°C' }); } }] },
        { title: 'Doses given', sub: 'Running total over the last 12 months', layout: 'full', charts: [
          { id: 'doses', title: 'Doses given, running total', cap: 'In lakh doses', tools: 1, body: PLOT(), source: 'Bharat Pashudhan · NADCP', draw: function (card, cid) {
            var m = mult(); drawLines(cid, card, { cats: M12, xName: 'Month', unit: 'lakh', min0: true, h: 270, series: [{ name: 'Doses so far', color: ROSE, data: DOSES.map(function (v) { return Math.round(v * m); }) }] }); } }] },
        { title: 'By vaccine', sub: 'Coverage in six states, and stock in six vaccine stores', layout: 'two', charts: [
          { id: 'heat', title: 'Vaccine coverage by state', cap: 'Per cent of animals covered, for each vaccine', body: '<div data-heat></div>', source: 'Bharat Pashudhan · NADCP · CADCP · DAHD', draw: function (card) {
            drawHeat(card, { rows: HEAT_ROWS, cols: VCOLS, m: HEAT, level: function (v) { return v >= 90 ? 3 : v >= 80 ? 2 : v >= 70 ? 1 : 0; },
              levels: [['Below 70%', '#f6e9ed', INK], ['70–79%', '#e3bcc8', INK], ['80–89%', '#b85c78', '#fff'], ['90% and above', '#8a3f57', '#fff']], note: 'BCP is the Brucellosis vaccine (S19).' }); } },
          { id: 'stock', title: 'Vaccine stock: days of cover', cap: 'How many days the stock in each store will last', body: '<div data-heat></div>', source: 'e-Aushadhi · DVDMS', draw: function (card) {
            drawHeat(card, { rows: STORES, cols: VCOLS, m: STOCK, level: function (v) { return v < 7 ? 0 : v < 30 ? 1 : v < 60 ? 2 : 3; },
              levels: [['Critical (under 7 days)', '#9a3412', '#fff'], ['Low (7–29 days)', '#f7c98b', INK], ['Adequate (30–59 days)', '#e6eaf0', INK], ['Comfortable (60 days or more)', '#fff', INK]] }); } }] }]
    };
  }

  /* =====================================================================
     ANIMAL — livestock
     ===================================================================== */
  function livestock() {
    var REG = [1820, 1885, 1955, 2028, 2108, 2196, 2288, 2385, 2488, 2596, 2712, 2836];
    var UNTAG = [['Adilabad', 'tg', 38], ['Nagarkurnool', 'tg', 32], ['Nilgiris', 'tn', 28], ['Khammam', 'tg', 24], ['Dharmapuri', 'tn', 22], ['Vikarabad', 'tg', 20], ['Krishnagiri', 'tn', 18], ['Mahabubnagar', 'tg', 16],
      ['Salem', 'tn', 14], ['Sangareddy', 'tg', 10], ['Coimbatore', 'tn', 8], ['Namakkal', 'tn', 6], ['Erode', 'tn', 5], ['Rangareddy', 'tg', 4], ['Hyderabad', 'tg', 3]];
    var CALF = [158, 172, 184, 196, 208, 218, 224, 230, 226, 218, 210, 202, 194, 186, 178, 170, 162, 154, 148, 142, 136, 130, 124, 118, 112];
    var DENS = [['Kerala', 325], ['West Bengal', 302], ['Bihar', 288], ['Uttar Pradesh', 225], ['Tamil Nadu', 210], ['Punjab', 186], ['Andhra Pradesh', 178], ['Telangana', 164], ['Haryana', 158], ['Karnataka', 145],
      ['Maharashtra', 132], ['Gujarat', 128], ['Madhya Pradesh', 112], ['Odisha', 98], ['Rajasthan', 82]];
    var AREA = { tn: 130058, tg: 112077, all: 3287263 }, NDIST = { tn: 38, tg: 33 }, M_REG = { all: 1, tagged: 0.86, untagged: 0.14 };
    function mult() { return M_STATE[F.state] * M_SPECIES[F.species] * M_REG[F.reg] * place(0.15, 0.25); }
    function mine(name) { return (F.state === 'tn' && name === 'Tamil Nadu') || (F.state === 'tg' && name === 'Telangana'); }
    return {
      part: 'animal', name: 'Livestock registry', crumb: 'Livestock', geo: 'animal', all: 'all species',
      fields: [
        { k: 'species', label: 'Species', opts: SPECIES2 },
        { k: 'reg', label: 'Registration', opts: [['all', 'All (tagged and untagged)'], ['tagged', 'Tagged (registered)'], ['untagged', 'Untagged (treated only)']] }],
      kpis: function () {
        var sc = scope(), animals = BP.lookup(sc, 'animals'), owners = BP.lookup(sc, 'owners'), vacc = BP.lookup(sc, 'vacc'), on = ' · as on ' + BP.dataAsOn;
        var ds = dshare(), un = F.reg === 'untagged', registered = (animals.total || 0) * (F.species === 'all' ? 1 : REG_SHARE[F.species]) * ds;
        var density = F.state === 'all' ? animals.total / AREA.all : F.dist === 'all' ? animals.total / AREA[F.state] : animals.total / (AREA[F.state] / NDIST[F.state]);
        var r = big(registered), nw = big(registered * 0.044), calves = big((vacc.bruc || 0) * ds), ow = big((owners.total || 0) * ds);
        return [
          { icon: 'tag', label: 'Registered animals', v: un ? '—' : r.v, small: un ? '' : r.small, sub: un ? 'Not applicable' : 'On Bharat Pashudhan', tip: 'Animals registered on Bharat Pashudhan with a Pashu Aadhaar number. Changes with the state, district and species you choose.', src: 'Bharat Pashudhan · Pashu Aadhaar' + on },
          { icon: 'plus', label: 'New registrations', v: un ? '—' : nw.v, small: un ? '' : nw.small, sub: un ? 'Not applicable' : 'About this many a month', tip: 'Estimated number of animals added this month, worked out from the total registered.', src: 'Bharat Pashudhan (derived)' },
          { icon: 'alert', label: 'Untagged, treated', v: fmt(Math.round(registered * 0.014)), sub: 'Animals with no ear tag', tip: 'Animals that were treated but have no ear tag. It shows how many animals are still outside the register.', src: 'Bharat Pashudhan · TN NCDC module (derived)' },
          { icon: 'check', label: 'Calves vaccinated', v: calves.v, small: calves.small, sub: 'Female, 4–8 months (S19)', tip: 'Brucellosis (S19) vaccine doses recorded for female calves aged 4 to 8 months.', src: 'Bharat Pashudhan · Brucellosis' + on },
          { icon: 'users', label: 'Owners registered', v: ow.v, small: ow.small, sub: 'Farmers with an ID', tip: 'Livestock owners registered on Bharat Pashudhan. Changes with the state or district you choose.', src: 'Bharat Pashudhan · Livestock Owners' + on },
          { icon: 'grid', label: 'Livestock density', v: fmt(Math.round(density) || 0), small: 'per km²', sub: 'Registered animals', tip: 'Registered animals per square kilometre, for the selected state or district.', src: 'Bharat Pashudhan ÷ area' }];
      },
      sections: [
        { title: 'Registration', sub: 'Animals on the Bharat Pashudhan register', layout: 'wide', charts: [
          { id: 'reg', title: 'Registered animals, running total', cap: 'In lakh animals, over the last 12 months', tools: 1, body: PLOT(), source: 'Bharat Pashudhan', draw: function (card, cid) {
            var m = mult(); drawLines(cid, card, { cats: M12, xName: 'Month', unit: 'lakh', min0: true, h: 300, series: [{ name: 'Registered so far', color: ROSE, data: REG.map(function (v) { return Math.round(v * m); }) }] }); } },
          { id: 'species', title: 'Registered livestock by species', cap: 'Share of all registered animals', body: SHAREBOX(), source: 'Bharat Pashudhan animal register', draw: function (card, cid) {
            drawShare(cid, card, SPECIES_SHARE.map(function (s, i) { return { name: s[0], v: s[1], color: SIX[i] }; }), { what: 'Share of registered animals', sel: F.species === 'all' ? '' : F.species }); } }] },
        { title: 'Density and gaps', sub: 'Where livestock is most crowded, and where animals are still untagged', layout: 'two', charts: [
          { id: 'dens', title: 'Livestock density by state', cap: 'Animals per square kilometre', tools: 1, body: PLOT(), source: '20th Livestock Census · Bharat Pashudhan', draw: function (card, cid) {
            var rows = DENS.map(function (s) { return { name: s[0], v: s[1], color: F.state !== 'all' && !mine(s[0]) ? GREY : ROSE }; });
            setTable(card, ['State', 'Animals per km²'], rows.map(function (r) { return [r.name, r.v]; }));
            drawBarList(cid, card, rows, { row: 30, lab: 150, rank: true, right: 52, what: 'Animals per km²' }); } },
          { id: 'untag', title: 'Untagged share by district', cap: 'Share of treated animals that had no ear tag', tools: 1, body: PLOT(), source: 'Bharat Pashudhan · TN NCDC untagged module', draw: function (card, cid) {
            var rows = UNTAG.filter(function (d) { return (F.state === 'all' || d[1] === F.state) && (F.dist === 'all' || d[0] === F.dist); }).map(function (d) { return { name: d[0] + ' (' + STSHORT[d[1]] + ')', st: STNAME[d[1]], v: d[2], color: ROSE }; });
            $('[data-empty]', card).textContent = F.dist !== 'all' ? F.dist + ' is not among the 15 districts listed.' : 'Nothing to show for these filters.';
            setTable(card, ['District', 'State', 'Untagged share'], rows.map(function (r) { return [r.name.replace(/ \(.*/, ''), r.st, r.v + '%']; }));
            drawBarList(cid, card, rows, { row: 30, lab: 176, rank: true, right: 52, unit: '%', max: 50, tipRows: function (r) { return [['Untagged share', r.v + '%', r.color], ['State', r.st]]; } }); } }] },
        { title: 'Female calves', sub: 'Calves of 4 to 8 months should get the Brucellosis vaccine', layout: 'full', charts: [
          { id: 'calf', title: 'Female calves by age in months', cap: 'In thousands of calves', tools: 1, body: keys([['4 to 8 months: should get the Brucellosis vaccine', ROSE], ['Other ages', GREY]]) + PLOT(), source: 'Bharat Pashudhan · Brucellosis Phase V', draw: function (card, cid) {
            var m = mult();
            drawColumns(cid, card, { cats: CALF.map(function (v, i) { return String(i); }), xName: 'Age (months)', yName: 'Female calves (thousands)', h: 280, unit: 'thousand',
              tipTitle: function (i) { return i + (i === 1 ? ' month' : ' months') + ' old'; }, data: CALF.map(function (v, i) { return { v: Math.round(v * m), color: i >= 4 && i <= 8 ? ROSE : GREY }; }) }); } }] }]
    };
  }

  /* =====================================================================
     ENVIRONMENT
     ===================================================================== */
  function environment() {
    var RAIN = [15, 18, 22, 45, 82, 105, 140, 180], TEMP = [22, 24, 27, 30, 32, 31, 29, 28], VECTOR = [340, 355, 380, 415, 460, 520, 580, 640];
    var ALERTS = [['Cyclone', 'Chennai / TN Coastal', 'Warning', '3 days ago', 'Cyclonic disturbance in the Bay of Bengal. Landfall expected on the Chennai coast.'],
      ['Rainfall', 'Nilgiris (Coonoor)', 'Watch', '5 days ago', 'Heavy rainfall (12 cm in 24 hours) forecast for the Nilgiris hill slopes.'],
      ['Flood', 'Khammam (Godavari basin)', 'Warning', '7 days ago', 'Godavari at Bhadrachalam is above the danger mark. Palvancha downstream is at risk.'],
      ['Landslide', 'Nilgiris (Coonoor)', 'Info', '12 days ago', 'Landslide risk is higher after 3 days of rain in the Nilgiris ghat.'],
      ['Thunderstorm', 'Telangana (multiple)', 'Watch', '15 days ago', 'Thunderstorms across Telangana with strong winds above 50 kmph.'],
      ['Wildfire', 'Nagarkurnool (Amrabad TR)', 'Warning', '18 days ago', 'Dry-forest fire in Amrabad Tiger Reserve. 4 km² affected.'],
      ['Rainfall', 'Adilabad', 'Info', '22 days ago', 'Above-normal rainfall in Adilabad district. Being watched for floods.'],
      ['Drought', 'Sivagangai / Ramanathapuram', 'Watch', '25 days ago', 'Rainfall more than 40% below normal since October. Kharif crops under stress.'],
      ['Cyclone', 'Coastal TN', 'Info', '28 days ago', 'Post-monsoon cyclone system has weakened. Some rain bands remain.']];
    var SEV = { Info: ['#e6eaf0', '#334155'], Watch: ['#fbe3a6', '#5f3b06'], Warning: ['#a8530a', '#fff'] };
    var W8 = W12.slice(0, 8), NDVI = [['Nilgiris (TN)', [62, 64, 66, 65, 67, 68, 67, 66]], ['Coimbatore (TN)', [42, 44, 45, 46, 47, 46, 45, 44]], ['Nagarkurnool (TG)', [38, 40, 41, 42, 43, 44, 43, 42]], ['Adilabad (TG)', [45, 46, 47, 48, 49, 49, 48, 47]]];
    var NDVI_COLOR = [SIX[2], SIX[1], SIX[0], SIX[5]];
    var WDIST = L('Nilgiris (TN),Coimbatore (TN),Nagarkurnool (TG),Adilabad (TG)'), WILD = [['Primates (KFD)', ROSE, [12, 8, 4, 2]], ['Elephants', SIX[1], [3, 2, 1, 2]], ['Leopards', SIX[4], [1, 0, 1, 0]], ['Tigers', SIX[5], [0, 0, 1, 1]]];
    var MIG = L('Sep,Oct,Nov,Dec,Jan,Feb,Mar,Apr,May'), AIV = [0, 0, 3, 6, 9, 4, 0, 0, 0], SUB = ['', '', 'H9N2', 'H9N2', 'H5N1', 'H5N1', '', '', ''];
    var STAGES = [['Arrival', 'Oct', 'Nov'], ['Peak wintering', 'Dec', 'Jan'], ['Departure', 'Feb', 'Mar'], ['After migration', 'Apr', 'May']];
    function mult() { return ({ all: 1, tn: 0.55, tg: 0.45 })[F.state] * place(0.20, 0.25); }
    function rowsOf(names) { return names.map(function (n, i) { return { n: n, i: i, st: n.indexOf('(TN)') > 0 ? 'tn' : 'tg' }; }).filter(function (d) { return (F.state === 'all' || d.st === F.state) && (F.dist === 'all' || d.n.indexOf(F.dist + ' ') === 0); }); }
    function none(card, on) { $('[data-empty]', card).textContent = F.dist + ' is not among the four districts tracked here.'; var el = $('[data-plot]', card); setEmpty(card, el, on); return on; }
    function feed() { return ALERTS.filter(function (a) { return F.hazard === 'all' || a[0].toLowerCase().indexOf(F.hazard) === 0; }); }
    return {
      part: 'environment', name: 'Environment', crumb: 'Environment', geo: 'env', all: 'all environment signals',
      fields: [
        { k: 'layer', label: 'Environment signal', opts: [['all', 'All environment signals'], ['rainfall', 'Rainfall and Temperature (IMD)'], ['wind_humidity', 'Wind and Humidity (IMD)'], ['ndvi', 'NDVI: Vegetation (BHUVAN)'], ['lst', 'Land-Surface Temperature (MODIS)'],
          ['soil_moisture', 'Soil Moisture (MOSDAC)'], ['wetlands', 'Wetlands (BHUVAN)'], ['forest', 'Forest fringe / Land use (BHUVAN)'], ['wildlife_corr', 'Wildlife Corridors'], ['monkey_mortality', 'Monkey Mortality (Forest)'],
          ['dead_wild_birds', 'Dead Wild Birds (Forest)'], ['migratory_birds', 'Migratory Bird Events (Forest)'], ['water_air', 'Air Quality (SPCB)'], ['industrial', 'Industrial Pollution (SPCB)'], ['panchayat_san', 'Village Sanitation (Panchayat)']] },
        { k: 'hazard', label: 'Disaster type', opts: [['all', 'All NDMA hazards'], ['cyclone', 'Cyclone'], ['rainfall', 'Rainfall'], ['flood', 'Flood'], ['landslide', 'Landslide / Avalanche'], ['drought', 'Drought'], ['thunderstorm', 'Thunderstorm'], ['wildfire', 'Wildfire']] }],
      kpis: function () {
        var s = F.state === 'tn' ? [96, 0.44, 21.4, 32, 68] : F.state === 'tg' ? [74, 0.38, 24.1, 24, 84] : [85, 0.41, 22.7, 28, 76];
        return [
          { icon: 'rain', label: 'Rainfall', v: fmt(s[0]), small: 'mm', sub: 'Total, last 30 days', tip: 'Total rainfall of the last 30 days for the selected area. More rain means more mosquitoes and ticks.', src: 'IMD Mausam · Open-Meteo mirror' },
          { icon: 'leaf', label: 'Vegetation (NDVI)', v: s[1].toFixed(2), sub: 'Pilot district average', tip: 'How green the land is, from satellite. Above 0.6 is dense forest, 0.3 to 0.5 is mixed vegetation or crops, below 0.2 is bare land or towns.', src: 'BHUVAN · MODIS NDVI 250 m' },
          { icon: 'trees', label: 'Forest cover', v: s[2].toFixed(1), small: '%', sub: 'Of the total land area', tip: 'Recorded forest area as a share of the total land area.', src: 'FSI State of Forest Report' },
          { icon: 'droplets', label: 'Soil moisture', v: String(s[3]), small: '%', sub: 'In the root zone', tip: 'Moisture in the soil at root depth. Below 20% is a drought watch, above 45% means a risk of flood run-off.', src: 'MOSDAC · SMAP' },
          { icon: 'wind', label: 'Air quality (AQI)', v: fmt(s[4]), sub: 'Average this week', tip: 'Average air quality index of the Pollution Control Board stations this week. Below 50 is good, 50 to 100 is satisfactory, 100 to 200 is moderate.', src: 'TNSPCB · TGSPCB' },
          { icon: 'siren', label: 'Disaster alerts', v: fmt(Math.max(1, Math.round(feed().length * mult()))), sub: 'Active this week (NDMA)', tip: 'Active alerts from the NDMA SACHET alerts hub: cyclone, rainfall, flood, landslide, drought, thunderstorm and wildfire.', src: 'NDMA SACHET Alerts Hub' }];
      },
      sections: [
        { title: 'Weather and alerts', sub: 'Rain and heat drive vector-borne disease', layout: 'wide', charts: [
          { id: 'climate', title: 'Rainfall, temperature and vector-borne cases', cap: 'Month by month, on the same time line', tools: 1, body: PLOT(), source: 'IMD Mausam · IHIP', draw: function (card, cid) {
            var m = mult();
            drawPanels(cid, card, { cats: M8, xName: 'Month', ph: 198, panels: [{ name: 'Rainfall', unit: 'mm', type: 'bar', color: SIX[1], data: RAIN }, { name: 'Average temperature', unit: '°C', type: 'line', color: SIX[0], data: TEMP },
              { name: 'Vector-borne cases (IHIP)', type: 'line', color: ROSE, data: VECTOR.map(function (v) { return Math.round(v * m); }) }] }); } },
          { id: 'alerts', title: 'Disaster alerts in the last 30 days', cap: 'From the NDMA SACHET alerts hub, newest first', body: '<div data-alerts></div>', source: 'NDMA SACHET Alerts Hub', draw: function (card) {
            var list = feed();
            $('[data-alerts]', card).innerHTML = list.length ? '<ul class="alerts">' + list.map(function (a) { return '<li><span class="sev" style="--bg:' + SEV[a[2]][0] + ';--fg:' + SEV[a[2]][1] + '">' + a[2] + '</span><div><b>' + a[0] + ' · ' + a[1] + '</b><p>' + a[4] + '</p><small>' + a[3] + '</small></div></li>'; }).join('') + '</ul>'
              : '<p class="empty">No alert of this type in the last 30 days.</p>'; } }] },
        { title: 'Forest and wildlife', sub: 'Vegetation near the forest edge, and animals found dead', layout: 'two', charts: [
          { id: 'ndvi', title: 'Vegetation (NDVI) in forest-fringe districts', cap: 'Weekly average. 0 is bare land, 1 is dense forest', tools: 1, body: PLOT(), source: 'BHUVAN · MODIS NDVI', draw: function (card, cid) {
            var pick = rowsOf(NDVI.map(function (d) { return d[0]; }));
            if (none(card, !pick.length)) return;
            drawLines(cid, card, { cats: W8, xName: 'Week', dp: 2, h: 300, endW: 150, series: pick.map(function (d) { return { name: d.n, color: NDVI_COLOR[d.i], data: NDVI[d.i][1].map(function (v) { return v / 100; }) }; }) }); } },
          { id: 'wild', title: 'Wild animals found dead, by species', cap: 'Carcass reports in the last 30 days', tools: 1, body: PLOT(), source: 'Ministry of Environment, Forest and Climate Change · ZOOKEPTO', draw: function (card, cid) {
            var pick = rowsOf(WDIST), k = (F.block !== 'all' ? 0.25 : 1) * dshare();
            if (none(card, !pick.length)) return;
            drawStack(cid, card, { cats: pick.map(function (d) { return d.n; }), xName: 'District', series: WILD.map(function (s) { return { name: s[0], color: s[1], data: pick.map(function (d) { return Math.round(s[2][d.i] * k); }) }; }) }); } }] },
        { title: 'Migratory birds', sub: 'Central Asian Flyway season, and bird flu virus found in birds', layout: 'full', charts: [
          { id: 'fly', title: 'Bird flu virus detections during the migration season', cap: 'Number of detections each month, with the stage of migration', tools: 1, body: keys([['H9N2', SIX[1]], ['H5N1', ROSE]]) + PLOT(), source: 'Ministry of Environment, Forest and Climate Change · BHUVAN · Wetland Atlas', draw: function (card, cid) {
            drawColumns(cid, card, { cats: MIG, xName: 'Month', yName: 'Detections', h: 280, max: 12, labels: 1, extra: { name: 'Virus type', data: SUB },
              data: AIV.map(function (v, i) { return { v: v, color: SUB[i] === 'H5N1' ? ROSE : SIX[1] }; }), bands: STAGES.map(function (s) { return { from: s[1], to: s[2], label: s[0] }; }) }); } }] }]
    };
  }

  /* =====================================================================
     WILDLIFE  (sample figures, in line with the Environment screen: 26 monkeys, 8 elephants, 2 leopards, 2 tigers in 30 days)
     ===================================================================== */
  function wildlife() {
    /* deaths reported in the last 30 days, by species: [name, count, key, group] */
    var SPEC = [['Wild birds', 46, 'bird', 'bird'], ['Monkeys', 26, 'monkey', 'monkey'], ['Elephants', 8, 'elephant', 'other'], ['Wild boar', 6, 'boar', 'other'], ['Leopards', 2, 'leopard', 'other'], ['Tigers', 2, 'tiger', 'other']];
    var TOTAL = sum(SPEC.map(function (s) { return s[1]; })), BASE = {}, GROUP = {}, GTOT = {};
    SPEC.forEach(function (s) { BASE[s[2]] = s[1]; GROUP[s[2]] = s[3]; GTOT[s[3]] = (GTOT[s[3]] || 0) + s[1]; });
    var WEEKLY = { monkey: ['Monkeys', ROSE, [3, 4, 4, 5, 5, 6, 7, 6, 7, 6, 7, 6]], bird: ['Wild birds', SIX[1], [5, 6, 6, 8, 9, 10, 12, 11, 12, 11, 12, 11]], other: ['Other mammals', SIX[4], [3, 3, 4, 3, 4, 4, 5, 4, 5, 4, 5, 4]] };
    var DIST = [['Nilgiris', 'tn', 22], ['Coimbatore', 'tn', 14], ['Nagarkurnool', 'tg', 12], ['Erode', 'tn', 9], ['Adilabad', 'tg', 8], ['Khammam', 'tg', 7], ['Sangareddy', 'tg', 6], ['Salem', 'tn', 4],
      ['Warangal', 'tg', 3], ['Vellore', 'tn', 2], ['Karimnagar', 'tg', 2], ['Sivagangai', 'tn', 1]];
    var FUNNEL = [['Reported', 90], ['Post-mortem done', 71], ['Sample sent to lab', 64], ['Result received', 52], ['Positive', 9]];
    var TESTS = [['KFD', 'monkeys and ticks', 28, 5, 'kfd'], ['Avian Influenza', 'wild birds', 24, 3, 'ai'], ['Brucellosis', 'wild boar and deer', 12, 1, 'bruc']];
    var M_DIS = { all: 1, kfd: 0.45, ai: 0.40, bruc: 0.15 };
    function where() {   /* share of all reports that falls in the chosen state, district or block, and comes from the chosen department */
      if (F.dist !== 'all') { var d = DIST.filter(function (x) { return x[0] === F.dist; })[0]; return (d ? d[2] : 0) / TOTAL * (F.block !== 'all' ? 0.25 : 1) * dshare(); }
      return (F.state === 'all' ? 1 : sum(DIST.filter(function (x) { return x[1] === F.state; }).map(function (x) { return x[2]; })) / TOTAL) * dshare();
    }
    function mult() { return where() * (F.species === 'all' ? 1 : BASE[F.species] / TOTAL) * M_DIS[F.dis]; }
    function of(key) { return F.species === 'all' || F.species === key ? fmt(Math.round(BASE[key] * where() * M_DIS[F.dis])) : null; }
    return {
      part: 'wildlife', name: 'Wildlife', crumb: 'Wildlife', geo: 'env', all: 'all wildlife',
      fields: [
        { k: 'species', label: 'Species', opts: [['all', 'All species'], ['monkey', 'Monkeys'], ['bird', 'Wild birds'], ['elephant', 'Elephants'], ['boar', 'Wild boar'], ['leopard', 'Leopards'], ['tiger', 'Tigers']] },
        { k: 'dis', label: 'Disease', opts: [['all', 'All diseases'], ['kfd', 'KFD'], ['ai', 'Avian Influenza'], ['bruc', 'Brucellosis']] }],
      kpis: function () {
        var m = mult(), monkeys = of('monkey'), birds = of('bird');
        return [
          { icon: 'paw', label: 'Animals found dead', v: fmt(Math.round(TOTAL * m)), sub: 'In the last 30 days', tip: 'Wild animals and birds reported dead by forest staff in the last 30 days.', src: 'Ministry of Environment, Forest and Climate Change event reports' },
          { icon: 'alert', label: 'Monkey deaths', v: monkeys == null ? '—' : monkeys, sub: monkeys == null ? 'Not applicable' : 'Early warning for KFD', tip: 'Monkeys found dead in or near the forest. Monkey deaths are an early warning for Kyasanur Forest Disease.', src: 'Ministry of Environment, Forest and Climate Change · KFD monkey mortality' },
          { icon: 'bird', label: 'Dead wild birds', v: birds == null ? '—' : birds, sub: birds == null ? 'Not applicable' : 'Early warning for bird flu', tip: 'Wild birds found dead, mostly at wetlands and lakes. Many dead birds in one place is an early warning for Avian Influenza.', src: 'Ministry of Environment, Forest and Climate Change · Wetland Atlas' },
          { icon: 'flask', label: 'Samples tested', v: fmt(Math.round(64 * m)), sub: Math.round(9 / 64 * 100) + '% were positive', tip: 'Samples from dead or sick wild animals sent to a laboratory and tested.', src: 'ICMR-NIV · ICAR-NIHSAD · NIVEDI' },
          { icon: 'file', label: 'Post-mortems done', v: fmt(Math.round(71 * m)), sub: Math.round(71 / TOTAL * 100) + '% of reports', tip: 'Dead animals examined by a forest veterinary officer to find the cause of death.', src: 'Forest Veterinary Officer reports' },
          { icon: 'check', label: 'Safely disposed', v: fmt(Math.round(84 * m)), sub: Math.round(84 / TOTAL * 100) + '% of carcasses', tip: 'Carcasses buried or burnt as per the safety rules, so that the disease does not spread.', src: 'Ministry of Environment, Forest and Climate Change event reports' }];
      },
      sections: [
        { title: 'Deaths reported', sub: 'Wild animals and birds found dead by forest staff', layout: 'wide', charts: [
          { id: 'wk', title: 'Wildlife deaths per week', cap: 'Reports filed each week, by kind of animal', tools: 1, body: PLOT(), source: 'Ministry of Environment, Forest and Climate Change event reports', draw: function (card, cid) {
            var k = where() * M_DIS[F.dis], g = F.species === 'all' ? null : GROUP[F.species], part = g ? BASE[F.species] / GTOT[g] : 1;
            drawLines(cid, card, { cats: W12, xName: 'Week', min0: true, h: 320, endW: 138, series: Object.keys(WEEKLY).filter(function (x) { return !g || x === g; }).map(function (x) {
              return { name: g && part < 1 ? text('species') : WEEKLY[x][0], color: WEEKLY[x][1], data: WEEKLY[x][2].map(function (v) { return Math.round(v * k * part); }) }; }) }); } },
          { id: 'spec', title: 'Deaths by species', cap: 'Share of all deaths in the last 30 days', body: SHAREBOX(), source: 'Ministry of Environment, Forest and Climate Change · ZOOKEPTO', draw: function (card, cid) {
            var pick = SPEC.filter(function (s) { return s[2] === F.species; })[0];
            drawShare(cid, card, SPEC.map(function (s, i) { return { name: s[0], v: Math.round(s[1] / TOTAL * 100), color: [SIX[1], ROSE, SIX[2], SIX[4], SIX[0], SIX[5]][i] }; }), { what: 'Share of deaths', sel: pick ? pick[0].toLowerCase() : '' }); } }] },
        { title: 'Places, response and test results', sub: 'Where the reports came from, and what was done', layout: 'three', charts: [
          { id: 'dist', title: 'Reports by district', cap: 'Last 30 days, highest first', tools: 1, body: PLOT(), source: 'Ministry of Environment, Forest and Climate Change event reports', draw: function (card, cid) {
            var k = (F.species === 'all' ? 1 : BASE[F.species] / TOTAL) * M_DIS[F.dis] * (F.block !== 'all' ? 0.25 : 1) * dshare();
            var rows = DIST.filter(function (d) { return (F.state === 'all' || d[1] === F.state) && (F.dist === 'all' || d[0] === F.dist); }).map(function (d) { return { name: d[0] + ' (' + STSHORT[d[1]] + ')', st: STNAME[d[1]], v: Math.round(d[2] * k), color: ROSE }; });
            $('[data-empty]', card).textContent = F.dist !== 'all' ? 'No wildlife death was reported from ' + F.dist + ' in the last 30 days.' : 'Nothing to show for these filters.';
            setTable(card, ['District', 'State', 'Reports'], rows.map(function (r) { return [r.name.replace(/ \(.*/, ''), r.st, fmt(r.v)]; }));
            drawBarList(cid, card, rows, { row: 30, lab: 150, rank: true, right: 44, tipRows: function (r) { return [['Reports', fmt(r.v), r.color], ['State', r.st]]; } }); } },
          { id: 'steps', title: 'What was done after a report', cap: 'From report to laboratory result', tools: 1, body: PLOT(), source: 'Forest Veterinary Officer reports', draw: function (card, cid) {
            var m = mult(), first = Math.round(FUNNEL[0][1] * m), rows = FUNNEL.map(function (s, i) { var v = Math.round(s[1] * m); return { name: s[0], v: v, color: ROSE, note: i && first ? Math.round(v * 100 / first) + '%' : '' }; });
            setTable(card, ['Step', 'Animals', 'Share of reports'], rows.map(function (r, i) { return [r.name, fmt(r.v), i ? r.note || '0%' : '100%']; }));
            drawBarList(cid, card, rows, { row: 40, bar: 16, lab: 140, right: 84, tipRows: function (r) { return [['Animals', fmt(r.v), r.color]].concat(r.note ? [['Share of reports', r.note]] : []); } }); } },
          { id: 'tests', title: 'Positive samples by disease', cap: 'Positive share of tested samples', tools: 1, body: PLOT(), source: 'ICMR-NIV · ICAR-NIHSAD · NIVEDI', draw: function (card, cid) {
            var rows = TESTS.map(function (t) { return { name: t[0], from: t[1], tested: t[2], pos: t[3], v: Math.round(t[3] / t[2] * 1000) / 10, note: t[3] + ' of ' + t[2], color: F.dis !== 'all' && F.dis !== t[4] ? GREY : ROSE }; });
            setTable(card, ['Disease', 'Samples from', 'Tested', 'Positive', 'Positive share'], rows.map(function (r) { return [r.name, r.from, r.tested, r.pos, r.v + '%']; }));
            drawBarList(cid, card, rows, { row: 44, bar: 16, lab: 118, right: 110, dp: 1, unit: '%', tipRows: function (r) { return [['Positive share', r.v + '%', r.color], ['Samples', r.pos + ' positive of ' + r.tested], ['Taken from', r.from]]; } }); } }] }]
    };
  }

  /* =====================================================================
     REFERRAL LABS NETWORK
     ===================================================================== */
  function labs() {
    var FUNNEL = [['Collected', 8420], ['Received', 7845], ['Tested', 7220], ['Positive', 1268]];
    var TAT = [['IPHL / T-Diagnostics', 0.5, 'iphl'], ['VRDL (human viral)', 1.2, 'vrdl'], ['ADIU (district vet)', 2.4, 'adiu'], ['TANUVAS (TN)', 2.8, 'tanuvas'], ['TGVBRI (TG)', 3.0, 'tgvbri'], ['RDDL (regional)', 4.5, 'rddl'], ['CDDL (central)', 5.8, 'cddl'], ['NIHSAD (Bhopal)', 7.2, 'nihsad']];
    var POS = [['KFD', 24.5, 'kfd'], ['Avian Influenza', 12.8, 'ai'], ['Brucellosis', 9.6, 'bruc'], ['FMD', 8.4, 'fmd'], ['LSD', 6.2, 'lsd'], ['PPR', 5.8, 'ppr'], ['Rabies', 4.5, 'rabies'], ['CSF', 3.2, 'csf']];
    var THRU = [['VRDL', [1980, 2050, 2160, 2280, 2420, 2560, 2680, 2820, 2960, 3100, 3220, 3380]], ['IPHL / T-Diag', [3450, 3580, 3720, 3860, 4020, 4180, 4340, 4520, 4680, 4860, 5020, 5200]],
      ['ADIU', [950, 1010, 1060, 1120, 1180, 1240, 1300, 1360, 1420, 1480, 1540, 1600]], ['RDDL / CDDL', [620, 650, 680, 720, 760, 800, 840, 880, 920, 960, 1000, 1040]], ['NIHSAD', [290, 310, 330, 360, 380, 410, 440, 470, 500, 530, 560, 590]]];
    var TYPES = [['RT-PCR', 42, 'rtpcr'], ['ELISA', 28, 'elisa'], ['Culture', 12, 'culture'], ['Rapid Antigen', 10, 'rapid'], ['Histopathology', 8, 'histo']];
    var M_DIS = { all: 1, kfd: 0.08, bruc: 0.28, ai: 0.14, fmd: 0.22, ppr: 0.10, lsd: 0.08, csf: 0.04, rabies: 0.06 }, M_TEST = { all: 1, rtpcr: 0.42, elisa: 0.28, culture: 0.12, histo: 0.08, rapid: 0.10 };
    var M_TIER = { all: 1, nihsad: 0.05, cddl: 0.05, rddl: 0.10, tanuvas: 0.08, tgvbri: 0.06, adiu: 0.15, vrdl: 0.28, iphl: 0.23 };
    function mult() { return M_STATE[F.state] * M_DIS[F.dis] * M_TEST[F.test] * M_TIER[F.tier] * place(0.15, 0.25); }
    return {
      part: 'labs', name: 'Referral labs network', crumb: 'Referral labs network', geo: 'labs', all: 'all laboratories',
      fields: [
        { k: 'tier', label: 'Laboratory', opts: [['all', 'All lab tiers'], ['nihsad', 'NIHSAD (Bhopal)'], ['cddl', 'CDDL: Central'], ['rddl', 'RDDL: Regional'], ['tanuvas', 'TANUVAS (TN)'], ['tgvbri', 'TGVBRI (TG)'], ['adiu', 'ADIU: District Vet'], ['vrdl', 'VRDL: Human viral'], ['iphl', 'IPHL / T-Diagnostics']] },
        { k: 'test', label: 'Test type', opts: [['all', 'All test types'], ['rtpcr', 'RT-PCR'], ['elisa', 'ELISA'], ['culture', 'Culture / Isolation'], ['histo', 'Histopathology'], ['rapid', 'Rapid Antigen']] },
        { k: 'dis', label: 'Disease', opts: [['all', 'All diseases'], ['kfd', 'KFD'], ['bruc', 'Brucellosis'], ['ai', 'Avian Influenza'], ['fmd', 'FMD'], ['ppr', 'PPR'], ['lsd', 'LSD'], ['csf', 'CSF'], ['rabies', 'Rabies']] }],
      kpis: function () {
        var m = mult();
        return [
          { icon: 'flask', label: 'Tests this month', v: fmt(FUNNEL[2][1] * 4 * m), sub: 'Across the lab network', tip: 'Tests done across the referral laboratory network this month. Changes with every filter.', src: 'VRDL · IPHL · ADIU · RDDL / CDDL · NIHSAD' },
          { icon: 'percent', label: 'Positivity', v: (FUNNEL[3][1] / FUNNEL[2][1] * 100).toFixed(1), small: '%', sub: 'Of samples tested', tip: 'Samples found positive as a share of all samples tested.', src: 'NIVEDI Phase V · Backend AI' },
          { icon: 'timer', label: 'Turnaround time', v: '2.4', small: 'days', sub: 'Median, receipt to result', tip: 'Median number of days from the day the lab receives a sample to the day it reports the result.', src: 'TG T-Diagnostics · Backend Common Core' },
          { icon: 'building', label: 'Lab types', v: '8', sub: 'In the referral network', tip: 'Types of laboratory in the network: ICAR-NIHSAD, CDDL, RDDL, PVNRTVU (TG), TANUVAS (TN), ADIU, ICMR-VRDL and IPHL.', src: 'TN NCDC referral table' },
          { icon: 'inbox', label: 'Backlog', v: fmt(Math.max(1, Math.round(342 * m))), sub: 'Samples past due date', tip: 'Samples still waiting after the target turnaround time has passed.', src: 'AI Sampling Plan · Backend Common Core' },
          { icon: 'snow', label: 'Sample cold chain', v: '93', small: '%', sub: 'Samples kept at 2–8°C', tip: 'Samples that stayed between 2 and 8°C on the way from the field to the laboratory.', src: 'e-Aushadhi · Backend Common Core' }];
      },
      sections: [
        { title: 'Tests done', sub: 'How many tests each kind of laboratory does, and by which method', layout: 'wide', charts: [
          { id: 'thru', title: 'Tests per month, by lab tier', cap: 'Over the last 12 months', tools: 1, body: PLOT(), source: 'VRDL · RDDL / CDDL · NIHSAD', draw: function (card, cid) {
            var m = mult(); drawLines(cid, card, { cats: M12, xName: 'Month', min0: true, h: 320, endW: 140, series: THRU.map(function (s, i) { return { name: s[0], color: SIX[i], data: s[1].map(function (v) { return Math.round(v * m); }) }; }) }); } },
          { id: 'types', title: 'Samples by test type', cap: 'Share of all samples', body: SHAREBOX(), source: 'VRDL requisition · Backend AI / Bruc methods', draw: function (card, cid) {
            var pick = TYPES.filter(function (t) { return t[2] === F.test; })[0];
            drawShare(cid, card, TYPES.map(function (s, i) { return { name: s[0], v: s[1], color: SIX[i] }; }), { what: 'Share of samples', sel: pick ? pick[0].toLowerCase() : '' }); } }] },
        { title: 'Samples, speed and results', sub: 'From collection to result', layout: 'three', charts: [
          { id: 'funnel', title: 'Sample funnel', cap: 'From collected to positive', tools: 1, body: PLOT(), source: 'TN referral table · VRDL · AI Sampling Plan (NIHSAD)', draw: function (card, cid) {
            var m = mult(), rows = FUNNEL.map(function (s) { return { name: s[0], v: Math.max(1, Math.round(s[1] * m)), color: ROSE }; });
            rows.forEach(function (r, i) { r.drop = i ? ((rows[i - 1].v - r.v) / rows[i - 1].v * 100).toFixed(1) + '%' : ''; r.note = i ? '−' + r.drop : ''; });
            setTable(card, ['Stage', 'Samples', 'Drop from the stage before'], rows.map(function (r) { return [r.name, fmt(r.v), r.drop || '—']; }));
            drawBarList(cid, card, rows, { row: 40, bar: 16, lab: 84, right: 104, tipRows: function (r) { return [['Samples', fmt(r.v), r.color]].concat(r.drop ? [['Drop from the stage before', r.drop]] : []); } }); } },
          { id: 'tat', title: 'Turnaround time by lab tier', cap: 'Median days, fastest first', tools: 1, body: PLOT(), source: 'TG T-Diagnostics · Backend Common Core', draw: function (card, cid) {
            var rows = TAT.map(function (t) { return { name: t[0], v: t[1], color: F.tier !== 'all' && F.tier !== t[2] ? GREY : ROSE }; });
            setTable(card, ['Lab tier', 'Median days'], rows.map(function (r) { return [r.name, r.v.toFixed(1)]; }));
            drawBarList(cid, card, rows, { row: 34, lab: 150, right: 58, dp: 1, unit: ' d', what: 'Median turnaround (days)' }); } },
          { id: 'pos', title: 'Positivity by disease', cap: 'Positive share of samples tested', tools: 1, body: PLOT(), source: 'NIVEDI Phase V · Backend AI · VRDL', draw: function (card, cid) {
            var rows = POS.map(function (p) { return { name: p[0], v: p[1], color: F.dis !== 'all' && F.dis !== p[2] ? GREY : ROSE }; });
            setTable(card, ['Disease', 'Positivity'], rows.map(function (r) { return [r.name, r.v + '%']; }));
            drawBarList(cid, card, rows, { row: 34, lab: 118, right: 58, dp: 1, unit: '%', what: 'Positivity' }); } }] }]
    };
  }

  /* =====================================================================
     Page sections
     ===================================================================== */
  function PLOT() { return '<div class="plot" data-plot></div><p class="empty" data-empty hidden>Nothing to show for these filters.</p><div class="tview" data-tview hidden></div>'; }
  function SHAREBOX() { return '<div class="share" data-share></div>'; }
  var TBL = '<button class="tbtn" type="button" data-table aria-pressed="false"><svg class="i"><use href="#i-table"/></svg>Table</button>';
  var PNG = '<button class="tbtn ico" type="button" data-png aria-label="Download this graph as an image" title="Download image"><svg class="i"><use href="#i-download"/></svg></button>';
  var CHARTS = [];
  $('#sections').innerHTML = V.sections.map(function (sec) {
    return '<div class="sec-h" data-sech><h2>' + sec.title + '</h2><span>' + sec.sub + '</span></div><section class="charts ' + sec.layout + '" data-sec>' + sec.charts.map(function (c) {
      CHARTS.push(c);
      return '<div class="card chart" id="c-' + c.id + '"><div class="ch-head"><div><h3>' + c.title + '</h3><p>' + c.cap + '</p></div>' + (c.tools ? '<div class="tools">' + TBL + PNG + '</div>' : '') + '</div>' +
        '<div class="ch-body">' + c.body + '</div><div class="ch-foot"><svg class="i"><use href="#i-database"/></svg>Source: ' + c.source + '</div></div>';
    }).join('') + '</section>';
  }).join('');
  /* Parameter and Source portal (disease pages): a card or graph is shown when it belongs to the choice */
  function match(x) {
    function ok(want, has) { return !want || want === 'all' || !has || [].concat(has).indexOf(want) >= 0; }
    return ok(F.param, x.p) && ok(F.src, x.s) && (!x.only || F.param === x.p);
  }
  function drawChart(c) { c.draw($('#c-' + c.id), 'c-' + c.id); }
  function drawGraphs() {
    CHARTS.forEach(function (c) { $('#c-' + c.id).hidden = !match(c); });
    $$('[data-sec]').forEach(function (sec) {
      var n = $$('.chart', sec).filter(function (x) { return !x.hidden; }).length;
      sec.hidden = !n; sec.previousElementSibling.hidden = !n; sec.classList.toggle('solo', n === 1);
    });
    CHARTS = ALLCHARTS.filter(match);
    CHARTS.filter(function (c) { return !c.last; }).forEach(drawChart);   /* a graph marked "last" takes its height from the one beside it */
    CHARTS.filter(function (c) { return c.last; }).forEach(drawChart);
    CHARTS = ALLCHARTS;
  }
  var ALLCHARTS = CHARTS;
  CHARTS.forEach(function (c) {
    var card = $('#c-' + c.id), tb = $('[data-table]', card), pb = $('[data-png]', card);
    if (tb) tb.addEventListener('click', function () {
      var on = tb.getAttribute('aria-pressed') !== 'true';
      tb.setAttribute('aria-pressed', on ? 'true' : 'false'); tb.lastChild.textContent = on ? 'Graph' : 'Table';
      $('[data-plot]', card).hidden = on; $('[data-tview]', card).hidden = !on;
      var ks = $('.keys', card); if (ks) ks.hidden = on;
      drawGraphs();
    });
    if (pb) pb.addEventListener('click', function () {
      var ch = CH['c-' + c.id]; if (!ch) return;
      var a = document.createElement('a');
      a.href = ch.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' });
      a.download = 'one-health-surveillance-' + c.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.png';
      document.body.appendChild(a); a.click(); a.remove();
    });
  });

  /* =====================================================================
     Key figures (six)
     ===================================================================== */
  function drawKpis() {
    var list = V.kpis().filter(match);
    $('#kpis').hidden = !list.length;
    $('#kpis').innerHTML = list.map(function (k, i) {
      return '<div class="card kpi' + (i ? '' : ' main') + '">' +
        '<div class="txt"><span class="l"><svg class="i" aria-hidden="true"><use href="#i-' + k.icon + '"/></svg>' + k.label + '</span><b class="v num' + (/^[A-Za-z]/.test(k.v) ? ' word' : '') + '">' + k.v + (k.small ? '<small>' + k.small + '</small>' : '') + '</b><div class="delta">' + k.sub + '</div></div>' +
        '<button class="kinfo" type="button" aria-label="About this figure: ' + k.label + '"><svg class="i"><use href="#i-info"/></svg></button>' +
        '<span class="ktip" role="tooltip">' + k.tip + '<em>Source: ' + k.src + '</em></span></div>';
    }).join('');
  }

  /* =====================================================================
     Draw
     ===================================================================== */
  function day(s) { var p = s.split('-'), MON = L('Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec'); return (+p[2]) + ' ' + MON[+p[1] - 1] + ' ' + p[0]; }
  function showing() {
    var picked = PICK.filter(function (f) { return F[f.k] !== 'all'; }).map(function (f) { return text(f.k); });
    var parts = (picked.length ? [] : [V.all]).concat([F.block !== 'all' ? F.block + ', ' + F.dist : F.dist !== 'all' ? F.dist + ' district' : F.state === 'all' ? V.allPlace || 'Tamil Nadu and Telangana' : STNAME[F.state]]).concat(picked);
    if (F.from || F.to) parts.push((F.from ? 'from ' + day(F.from) : '') + (F.from && F.to ? ' ' : '') + (F.to ? 'to ' + day(F.to) : ''));
    $('#showing').innerHTML = 'Showing <b>' + parts.join('</b> · <b>') + '</b>';
  }
  /* A department that sends no data for this screen: say so plainly, and point to the screens where it does have data */
  function drawNone() {
    var off = noData(), box = $('#nodept');
    $('#kpis').hidden = off; $('#sections').hidden = off; box.hidden = !off;
    if (!off) return false;
    var name = text('dept'), has = SCREENS.filter(function (s) { return SHARE[s[0]][F.dept]; });
    box.innerHTML = '<div class="card nodata"><svg class="i"><use href="#i-database"/></svg><h2>No data from ' + name + ' on this screen</h2>' +
      '<p>' + name + ' does not send data for ' + (V.part === 'labs' ? 'the Referral labs network' : SCREENS.filter(function (s) { return s[0] === V.part; })[0][1] + ' surveillance') + '.' +
      (has.length ? ' Its data is on: ' + has.map(function (s) { return '<a href="' + s[2] + '">' + s[1] + '</a>'; }).join(', ') + '.' : '') + '</p>' +
      '<button class="b sec" type="button" id="nodept-all">Show all departments</button></div>';
    $('#nodept-all').addEventListener('click', function () { EL.dept.value = 'all'; F = readForm(); markDirty(); draw(); });
    return true;
  }
  /* disease pages: the chosen parameter and source have nothing in common */
  function drawNoMatch() {
    var off = !!V.title && !V.kpis().some(match) && !ALLCHARTS.some(match), box = $('#nodept');
    box.hidden = !off; $('#sections').hidden = off;
    if (!off) return false;
    $('#kpis').hidden = true;
    box.innerHTML = '<div class="card nodata"><svg class="i"><use href="#i-database"/></svg><h2>No figure for this parameter from this source</h2>' +
      '<p>' + text('src') + ' does not give figures for ' + text('param').toLowerCase() + '. Choose another source portal, or see all of them.</p>' +
      '<button class="b sec" type="button" id="nomatch-all">Show all sources</button></div>';
    $('#nomatch-all').addEventListener('click', function () { EL.src.value = 'all'; F = readForm(); markDirty(); draw(); });
    return true;
  }
  function draw() { showing(); if (V.title ? drawNoMatch() : drawNone()) return; drawKpis(); drawGraphs(); }
  writeForm(DEF);
  draw();
  var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(drawGraphs, 150); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawGraphs);
})();
