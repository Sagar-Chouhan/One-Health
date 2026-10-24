/* One Health portal — Diseases page.
   1. Overall status: one card for each of the three priority diseases (figures and text as in the project manager's Home page).
   2. Disease map: one tab for each pilot state, drawn at district level. It works like the Bhutan One Health map:
      layers that colour the districts, a pointer (circle) for each disease in each district, rivers, zoom, full screen,
      a hover box with the scale, legends, a count line and the latest events. Choosing a district draws that district alone.
   District cases: the project manager's data/diseases.js. Environment levels and filter lists: his surveillance.html.
   Boundaries: assets/districts-geo.js. Rivers: assets/rivers-geo.js (Natural Earth). */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  function fmt(n) { return Number(n).toLocaleString('en-IN'); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }
  function opt(list) { return list.map(function (o) { return '<option value="' + esc(o[0]) + '">' + o[1] + '</option>'; }).join(''); }
  function L(s) { return s.split(','); }
  var INK = '#1f2a44', FONT = "Inter, -apple-system, 'Segoe UI', Roboto, sans-serif";

  /* ---------------------------------------------------------------- Diseases */
  var ORDER = ['avian', 'kfd', 'bruc'];
  var DIS = {
    avian: { name: 'Avian Influenza', color: '#4f95e0', icon: 'bird' },
    kfd: { name: 'Kyasanur Forest Disease', short: 'KFD', color: '#12876f', icon: 'bug' },
    bruc: { name: 'Brucellosis', color: '#7a2fa8', icon: 'milk' }
  };
  var CARDS = {
    avian: { title: 'Avian Influenza · H5N1', sub: 'H5N1 · confirmatory at ICAR-NIHSAD Bhopal', n: '18', unit: 'confirmed farms', level: 'crit',
      why: '<b>Sangareddy cluster</b> · Patancheru block · 10 km surveillance zone active · TN backyard swabs pending' },
    kfd: { title: 'Kyasanur Forest Disease', sub: 'KFDV · confirmatory at ICMR-VRDL · NIV-Bangalore', n: '27', unit: 'human cases · season', level: 'crit',
      why: '<b>Nilgiris forest fringe</b> · Nov–May transmission window · 6 villages under surveillance' },
    bruc: { title: 'Brucellosis', sub: 'Occupational + herd surveillance', n: '40', unit: 'occupational cases', level: 'elev',
      why: '<b>Erode dairy belt</b> · RBPT positivity 5.2 % pilot avg. · same-day PHC drive' }
  };
  /* levels run from amber to deep orange; red is not used */
  var LEVEL = { crit: ['Critical', '#9a3412', '#fff'], elev: ['Elevated', '#f7c98b', '#5f3b06'], watch: ['Watch', '#fbe3a6', '#5f3b06'], ok: ['Ready', '#e6eaf0', '#334155'] };

  $('#dcards').innerHTML = ORDER.map(function (k) {
    var c = CARDS[k], l = LEVEL[c.level];
    return '<a class="card dcard" href="disease.html?id=' + k + '" style="--c:' + DIS[k].color + '" aria-label="' + c.title + ': ' + c.n + ' ' + c.unit + ', ' + l[0] + '. Open the disease page">' +
      '<div class="dhead"><span class="dico"><svg class="i"><use href="#i-' + DIS[k].icon + '"/></svg></span>' +
      '<div><h3>' + c.title + '</h3><p class="sub">' + c.sub + '</p></div>' +
      '<span class="lvl" style="--bg:' + l[1] + ';--fg:' + l[2] + '"><svg class="i"><use href="#i-alert"/></svg>' + l[0] + '</span></div>' +
      '<p class="dnum"><b>' + c.n + '</b><span>' + c.unit + '</span></p>' +
      '<p class="why">' + c.why + '</p><span class="go">View details<svg class="i" aria-hidden="true"><use href="#i-arrow"/></svg></span></a>';
  }).join('');

  /* ---------------------------------------------------------------- District reports: [district, cases, C = confirmed / S = suspected, day of last report in Sep 2026] */
  var REPORTS = {
    avian: [['Namakkal', 22, 'C', 28], ['Krishnagiri', 15, 'C', 27], ['Tiruppur', 11, 'C', 26], ['Coimbatore', 12, 'C', 26], ['Erode', 8, 'C', 26], ['Salem', 6, 'S', 24], ['Nilgiris', 3, 'S', 23], ['Madurai', 5, 'C', 20],
      ['Tiruchirappalli', 6, 'C', 19], ['Rangareddy', 16, 'C', 27], ['Siddipet', 13, 'C', 26], ['Yadadri Bhuvanagiri', 12, 'C', 25], ['Sangareddy', 18, 'C', 27], ['Nizamabad', 14, 'C', 24], ['Karimnagar', 6, 'S', 22],
      ['Hyderabad', 4, 'S', 27], ['Warangal', 7, 'C', 21]],
    kfd: [['Nilgiris', 11, 'C', 27], ['Coimbatore', 4, 'S', 23], ['Nagarkurnool', 8, 'C', 26], ['Mulugu', 5, 'C', 25], ['Bhadradri Kothagudem', 3, 'S', 24], ['Komaram Bheem', 2, 'S', 22], ['Jayashankar Bhupalapally', 4, 'C', 26],
      ['Tenkasi', 3, 'S', 21], ['Dindigul', 2, 'S', 20]],
    bruc: [['Erode', 28, 'C', 28], ['Namakkal', 22, 'C', 27], ['Salem', 18, 'C', 26], ['Krishnagiri', 9, 'C', 25], ['Dindigul', 7, 'S', 24], ['Coimbatore', 5, 'C', 25], ['Theni', 3, 'S', 22], ['Madurai', 2, 'S', 20],
      ['Medak', 25, 'C', 28], ['Rangareddy', 20, 'C', 27], ['Nizamabad', 14, 'C', 26], ['Khammam', 12, 'C', 26], ['Vikarabad', 8, 'S', 24], ['Karimnagar', 6, 'C', 23], ['Mahabubnagar', 4, 'S', 22], ['Sangareddy', 3, 'S', 22],
      ['Nalgonda', 2, 'S', 21], ['Adilabad', 2, 'S', 20]]
  };
  var STATUS = { C: 'Confirmed', S: 'Suspected' };
  var BY = {};   /* reports of one district: { avian: [cases, status, day], ... } */
  ORDER.forEach(function (k) { REPORTS[k].forEach(function (r) { (BY[r[0]] = BY[r[0]] || {})[k] = [r[1], r[2], r[3]]; }); });
  /* Wildlife pillar: wild animals found dead, counted under the disease they warn of (monkeys: KFD, wild birds: Avian Influenza, wild boar: Brucellosis).
     Same districts and totals as the Wildlife screen of Surveillance: 26 monkeys, 46 wild birds, 6 wild boar. */
  var WILD = {
    kfd: [['Nilgiris', 12, 'C', 27], ['Coimbatore', 8, 'C', 25], ['Nagarkurnool', 4, 'S', 24], ['Adilabad', 2, 'S', 22]],
    avian: [['Nilgiris', 5, 'S', 26], ['Coimbatore', 4, 'S', 24], ['Nagarkurnool', 5, 'C', 27], ['Erode', 7, 'C', 26], ['Adilabad', 3, 'S', 23], ['Khammam', 6, 'C', 25], ['Sangareddy', 5, 'C', 27], ['Salem', 3, 'S', 22],
      ['Warangal', 3, 'S', 21], ['Vellore', 2, 'S', 20], ['Karimnagar', 2, 'S', 22], ['Sivaganga', 1, 'S', 19]],
    bruc: [['Nilgiris', 1, 'S', 23], ['Erode', 2, 'C', 25], ['Khammam', 1, 'S', 22], ['Sangareddy', 1, 'S', 24], ['Salem', 1, 'S', 21]]
  };
  var SPECIES = { kfd: 'Monkeys', avian: 'Wild birds', bruc: 'Wild boar' }, WBY = {};
  ORDER.forEach(function (k) { WILD[k].forEach(function (r) { (WBY[r[0]] = WBY[r[0]] || {})[k] = [r[1], r[2], r[3]]; }); });

  /* ---------------------------------------------------------------- Filter lists */
  var PILLARS = [['all', 'All pillars'], ['human', 'Human'], ['animal', 'Animal'], ['env', 'Environmental'], ['wild', 'Wildlife']];
  var PILLAR_SHARE = { human: 0.45 };   /* the rest of the cases are animal cases */
  var CAUSES_ALL = [['outbreak', 'Confirmed outbreak'], ['suspected', 'Suspected / presumptive'], ['sero', 'Sero-monitoring positive'], ['env_trigger', 'Environmental trigger']];
  var CAUSES = {
    'human|kfd': [['tick', 'Tick exposure (H. spinigera)'], ['forest_worker', 'Forest-worker contact']],
    'human|bruc': [['raw_milk', 'Raw-milk consumption'], ['occupational', 'Occupational (vet / dairy)']],
    'human|avian': [['poultry_contact', 'Poultry-worker contact'], ['lbpm', 'Live-bird market exposure']],
    'animal|bruc': [['herd_positive', 'Herd sero-positive'], ['abortion_cluster', 'Abortion cluster']],
    'animal|avian': [['poultry_mort', 'Poultry mortality spike'], ['migratory_bird', 'Migratory-bird interface']],
    'animal|kfd': [['primate_death', 'Primate mortality sentinel'], ['cattle_tick', 'Tick infestation in cattle']],
    'wild|kfd': [['monkey_sentinel', 'Monkey mortality sentinel'], ['wild_tick', 'Tick load on wild animals']],
    'wild|avian': [['wetland', 'Wetland stopover activity'], ['bird_dieoff', 'Migratory-bird die-off']],
    'wild|bruc': [['boar_carcass', 'Wild boar carcass at forest edge'], ['grazing_contact', 'Contact with grazing cattle']]
  };
  /* what a cause keeps: reports of one status, or a share of the cases of one disease (the two causes of a pair add up to all cases) */
  var RULE = {
    outbreak: { status: 'C' }, suspected: { status: 'S' }, sero: { dis: 'bruc', share: 0.35 }, env_trigger: { share: 0.20 },
    tick: { dis: 'kfd', share: 0.70 }, forest_worker: { dis: 'kfd', share: 0.30 }, raw_milk: { dis: 'bruc', share: 0.55 }, occupational: { dis: 'bruc', share: 0.45 },
    poultry_contact: { dis: 'avian', share: 0.65 }, lbpm: { dis: 'avian', share: 0.35 }, herd_positive: { dis: 'bruc', share: 0.70 }, abortion_cluster: { dis: 'bruc', share: 0.30 },
    poultry_mort: { dis: 'avian', share: 0.75 }, migratory_bird: { dis: 'avian', share: 0.25 }, primate_death: { dis: 'kfd', share: 0.60 }, cattle_tick: { dis: 'kfd', share: 0.40 },
    monkey_sentinel: { dis: 'kfd', share: 0.65 }, wild_tick: { dis: 'kfd', share: 0.35 }, wetland: { dis: 'avian', share: 0.60 }, bird_dieoff: { dis: 'avian', share: 0.40 },
    boar_carcass: { dis: 'bruc', share: 0.55 }, grazing_contact: { dis: 'bruc', share: 0.45 }
  };
  var LAYERS = [['all', 'All environment signals'], ['rainfall', 'Rainfall and Temperature (IMD)'], ['wind_humidity', 'Wind and Humidity (IMD)'], ['ndvi', 'NDVI: Vegetation (BHUVAN)'], ['lst', 'Land-Surface Temperature (MODIS)'],
    ['soil_moisture', 'Soil Moisture (MOSDAC)'], ['wetlands', 'Wetlands (BHUVAN)'], ['forest', 'Forest fringe / Land use (BHUVAN)'], ['wildlife_corr', 'Wildlife Corridors'], ['monkey_mortality', 'Monkey Mortality (Forest)'],
    ['dead_wild_birds', 'Dead Wild Birds (Forest)'], ['migratory_birds', 'Migratory Bird Events (Forest)'], ['water_air', 'Air Quality (SPCB)'], ['industrial', 'Industrial Pollution (SPCB)'], ['panchayat_san', 'Village Sanitation (Panchayat)']];
  var LAYER_NAME = {}; LAYERS.forEach(function (l) { LAYER_NAME[l[0]] = l[1]; });
  /* blocks (Tamil Nadu) and mandals (Telangana) of the districts that have a list */
  var BLOCKS = {
    'Nilgiris': L('Udhagamandalam,Coonoor,Kotagiri,Gudalur'), 'Coimbatore': L('Coimbatore North,Coimbatore South,Pollachi,Mettupalayam'), 'Chennai': L('Ambattur,Perambur,Guindy,Sholinganallur'),
    'Madurai': L('Madurai South,Madurai North,Thirumangalam,Melur'), 'Salem': L('Salem,Attur,Sankari,Mettur'), 'Erode': L('Erode,Bhavani,Sathyamangalam,Gobichettipalayam'), 'Vellore': L('Vellore,Katpadi,Gudiyattam,Anaicut'),
    'Sivaganga': L('Sivagangai,Karaikudi,Manamadurai,Devakottai'), 'Krishnagiri': L('Denkanikottai,Hosur,Krishnagiri,Pochampalli,Uthangarai'), 'Namakkal': L('Namakkal,Rasipuram,Tiruchengode'),
    'Tiruppur': L('Avanashi,Dharapuram,Kangeyam,Udumalaipettai'), 'Tiruchirappalli': L('Srirangam,Lalgudi,Manapparai,Musiri,Thuraiyur'), 'Dindigul': L('Dindigul,Palani,Kodaikanal,Oddanchatram,Natham'),
    'Theni': L('Theni,Periyakulam,Bodinayakanur,Uthamapalayam,Andipatti'), 'Tenkasi': L('Tenkasi,Sankarankovil,Kadayanallur,Shenkottai,Alangulam'),
    'Sangareddy': L('Sangareddy,Zaheerabad,Narayankhed,Andole'), 'Nagarkurnool': L('Nagarkurnool,Kollapur,Achampet,Kalwakurthy'), 'Hyderabad': L('Secunderabad,Charminar,Serilingampally,LB Nagar'),
    'Warangal': L('Warangal,Hanamkonda,Parkal,Wardhannapet'), 'Karimnagar': L('Karimnagar,Huzurabad,Manakondur,Choppadandi'), 'Adilabad': L('Adilabad,Boath,Nirmal,Utnoor'), 'Khammam': L('Khammam,Kothagudem,Palvancha,Sathupalli'),
    'Rangareddy': L('Abdullapurmet,Farooqnagar,Ibrahimpatnam,Jilled Chowdergudem,Kandukur,Kondurg,Kothur,Maheswaram,Shabad'), 'Siddipet': L('Chinnakodur,Doultabad,Dubbak,Gajwel,Koheda,Kondapak,Mirdoddi,Siddipet,Thoguta'),
    'Yadadri Bhuvanagiri': L('Alair,Atmakur (M),Bhongir,Bibinagar,Bommalaramaram,Mothkur,Narayanapur,Rajapet,Yadagirigutta'), 'Nizamabad': L('Nizamabad,Armoor,Bodhan,Balkonda,Dichpally'),
    'Medak': L('Medak,Narsapur,Toopran,Ramayampet,Chegunta'), 'Vikarabad': L('Vikarabad,Tandur,Parigi,Kodangal,Mominpet'), 'Mahabubnagar': L('Mahabubnagar,Jadcherla,Devarkadra,Bhoothpur,Hanwada'),
    'Nalgonda': L('Nalgonda,Miryalaguda,Devarakonda,Nakrekal,Chandur'), 'Mulugu': L('Mulugu,Eturnagaram,Tadvai,Govindaraopet,Venkatapur'), 'Bhadradri Kothagudem': L('Bhadrachalam,Yellandu,Manuguru,Aswaraopeta,Burgampahad'),
    'Komaram Bheem': L('Asifabad,Kagaznagar,Sirpur,Wankidi,Jainoor'), 'Jayashankar Bhupalapally': L('Bhupalpally,Kataram,Mahadevpur,Chityal,Regonda')
  };

  /* ---------------------------------------------------------------- Environment levels (0 to 1) of the districts that have readings: [rainfall, ndvi, lst, wetlands, forest, water_air, kfd base, avian base] */
  var ENV = {
    'Nilgiris': [0.90, 0.95, 0.20, 0.30, 0.95, 0.15, 320, 12], 'Coimbatore': [0.30, 0.55, 0.60, 0.25, 0.60, 0.55, 180, 85], 'Chennai': [0.55, 0.15, 0.90, 0.75, 0.05, 0.90, 5, 145], 'Madurai': [0.35, 0.35, 0.85, 0.20, 0.15, 0.55, 8, 42],
    'Salem': [0.40, 0.45, 0.65, 0.25, 0.30, 0.45, 18, 38], 'Erode': [0.30, 0.40, 0.70, 0.20, 0.55, 0.45, 90, 175], 'Vellore': [0.40, 0.35, 0.65, 0.50, 0.25, 0.60, 10, 55], 'Sivaganga': [0.40, 0.30, 0.75, 0.65, 0.15, 0.40, 4, 68],
    'Sangareddy': [0.38, 0.35, 0.70, 0.30, 0.30, 0.60, 8, 62], 'Nagarkurnool': [0.35, 0.65, 0.55, 0.55, 0.85, 0.30, 45, 48], 'Hyderabad': [0.40, 0.15, 0.85, 0.35, 0.05, 0.95, 3, 115], 'Warangal': [0.42, 0.45, 0.65, 0.35, 0.35, 0.55, 6, 95],
    'Karimnagar': [0.45, 0.40, 0.60, 0.35, 0.25, 0.55, 4, 55], 'Adilabad': [0.55, 0.70, 0.50, 0.35, 0.80, 0.40, 28, 32], 'Khammam': [0.50, 0.60, 0.55, 0.45, 0.65, 0.45, 15, 72]
  };
  var BASE = ['rainfall', 'ndvi', 'lst', 'wetlands', 'forest', 'water_air'];
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return (h % 1000) / 1000; }
  /* level of one signal in one district, 0 to 100. Districts without readings get a middle value of their own. */
  function env(name, layer) {
    var d = ENV[name], v;
    if (!d) v = 0.28 + hash(name + '|' + layer) * 0.20;
    else {
      var x = {}; BASE.forEach(function (k, i) { x[k] = d[i]; });
      if (layer === 'all') v = BASE.reduce(function (a, k) { return a + x[k]; }, 0) / BASE.length;
      else if (x[layer] != null) v = x[layer];
      else if (layer === 'wind_humidity') v = x.rainfall * 0.7 + 0.15;
      else if (layer === 'soil_moisture') v = x.rainfall * 0.6 + x.ndvi * 0.3;
      else if (layer === 'wildlife_corr') v = x.forest * 0.9 + 0.05;
      else if (layer === 'monkey_mortality') v = d[6] / 320 * 0.9 + x.forest * 0.05;
      else if (layer === 'dead_wild_birds') v = d[7] / 175 * 0.7 + x.wetlands * 0.2;
      else if (layer === 'migratory_birds') v = x.wetlands * 0.65 + d[7] / 175 * 0.25;
      else if (layer === 'industrial') v = x.water_air * 0.85;
      else if (layer === 'panchayat_san') v = 0.4 + (1 - x.water_air) * 0.4;
      else v = 0.5;
    }
    return Math.round(Math.max(0, Math.min(1, v)) * 100);
  }

  /* ---------------------------------------------------------------- Boundaries: the districts of each state, under today's official names */
  var RENAME = { 'Ranga Reddy': 'Rangareddy', 'Warangal Rural': 'Warangal', 'Warangal Urban': 'Hanamkonda', 'Medchal Malkajgiri': 'Medchal-Malkajgiri', 'Thoothukkudi': 'Thoothukudi', 'Thiruvallur': 'Tiruvallur', 'Thiruvarur': 'Tiruvarur' };
  var STATES = { tn: { name: 'Tamil Nadu', lat: 10.8 }, tg: { name: 'Telangana', lat: 17.9 } };
  var GEO = { tn: [], tg: [] }, STATE_OF = {};
  (window.OH_DISTRICTS_GEO ? window.OH_DISTRICTS_GEO.features : []).forEach(function (f) {
    var name = RENAME[f.properties.n] || f.properties.n, st = f.properties.s === 'TN' ? 'tn' : 'tg';
    GEO[st].push({ type: 'Feature', properties: { name: name }, geometry: f.geometry });
    STATE_OF[name] = st;
  });
  Object.keys(STATES).forEach(function (s) { GEO[s].sort(function (a, b) { return a.properties.name < b.properties.name ? -1 : 1; }); });

  /* ---------------------------------------------------------------- What is on screen
     The map shows two things at once, as on the Bhutan One Health map, at district level:
       1. a LAYER that colours every district (cases of a pillar, or an environment signal);
       2. POINTERS: one circle for each disease in each district, sized by the number of cases.
     Disease, Cause, Block and the dates change the pointers (and the case layers). The layer buttons change the colours. */
  var LAYERS_MAP = [
    { k: 'all', name: 'All cases', dot: '#b85c78', title: 'Cases reported', sub: 'Human and animal cases together',
      explain: 'Confirmed and suspected cases of the three diseases reported from each district, in people and animals together. A darker district has more cases.' },
    { k: 'human', name: 'Human', dot: '#b38160', title: 'Human cases', sub: 'Nude shades',
      explain: 'Cases in people. A darker district has more human cases.' },
    { k: 'animal', name: 'Animal', dot: '#3f82cf', title: 'Animal cases', sub: 'Blue shades',
      explain: 'Cases in livestock and poultry. A darker district has more animal cases.' },
    { k: 'wild', name: 'Wildlife', dot: '#9261c4', title: 'Wild animals found dead', sub: 'Purple shades',
      explain: 'Monkeys, wild birds and wild boar found dead. They warn of KFD, Avian Influenza and Brucellosis before people or livestock fall ill.' },
    { k: 'env', name: 'Environment', dot: '#3f9c86', title: 'Environment signal', sub: 'Green shades',
      explain: 'Level of the chosen environment signal in each district, from 0 to 100. Forest, wetlands and land use decide where ticks, birds and animals that carry these diseases live.' },
    { k: 'temp', name: 'Temperature', dot: '#d2554a', title: 'Land-surface temperature', sub: 'Red shades',
      explain: 'How hot the land surface is, measured from satellite (MODIS), from 0 to 100. A darker district is hotter.' },
    { k: 'rain', name: 'Rain', dot: '#35adb5', title: 'Rainfall', sub: 'Aqua shades',
      explain: 'Rainfall level from IMD, from 0 to 100. A darker district has more rain. More rain brings more ticks and mosquitoes.' }
  ];
  var LAYER_OF = {}; LAYERS_MAP.forEach(function (l) { LAYER_OF[l.k] = l; });
  var SIGNALS = LAYERS.filter(function (l) { return l[0] !== 'rainfall' && l[0] !== 'lst'; });   /* rain and temperature have their own layer */
  var LETTER = { avian: 'A', kfd: 'K', bruc: 'B' };
  var TODAY = '2026-10-01';
  var PERIODS = [['all', 'All dates'], ['7', 'Last 7 days'], ['30', 'Last 30 days'], ['90', 'Last 90 days'], ['ytd', 'Year to date'], ['custom', 'Chosen dates']];
  /* latest events (the project manager's updates feed): [state, pillar, tag, text, when] */
  var EVENTS = [
    ['tg', 'animal', 'Animal Health Alert', 'Avian Influenza H5N1 confirmed in Sangareddy poultry cluster', '2 hours ago'],
    ['tn', 'animal', 'Animal Health Alert', 'Brucellosis sero-positivity rising in Erode dairy cooperatives', '4 hours ago'],
    ['tn', 'human', 'Human Health Alert', 'Undulant-fever cluster among Namakkal dairy workers: IDSP probe', '6 hours ago'],
    ['tn', 'env', 'Environmental Alert', 'KFD season advisory: Nilgiris forest fringe villages', '10 hours ago'],
    ['tg', 'animal', 'Animal Health Alert', 'Brucellosis confirmed in Medak dairy buffalo herd', '1 day ago'],
    ['both', 'other', 'Program Update', 'NIVEDI Phase-V Brucellosis sero-monitoring kicks off in Tamil Nadu and Telangana', '1 day ago'],
    ['both', 'other', 'AMR Alert', 'AMR surveillance: rising resistance in Brucella isolates', '2 days ago']
  ];
  var EDOT = { human: '#b38160', animal: '#3f82cf', env: '#3f9c86', other: '#5b6678' };

  var DEF = { dis: 'all', dist: 'all', block: 'all', layer: 'all', sig: 'all', cause: 'all', period: 'all', from: '', to: '' };
  var S = { state: 'tn', all: false, rivers: true, lines: true, zoom: 1, center: null, fs: false, view: 'list' }; Object.keys(DEF).forEach(function (k) { S[k] = DEF[k]; });
  var q = new URLSearchParams(location.search);
  if (STATES[q.get('state')]) S.state = q.get('state');
  if (DIS[q.get('disease')]) S.dis = q.get('disease');
  if (STATE_OF[q.get('district')]) { S.dist = q.get('district'); S.state = STATE_OF[S.dist]; }
  if (LAYER_OF[q.get('layer')]) S.layer = q.get('layer');
  if (LAYER_NAME[q.get('signal')]) S.sig = q.get('signal');
  if (S.dist !== 'all' && (BLOCKS[S.dist] || []).indexOf(q.get('block')) >= 0) S.block = q.get('block');
  if (q.get('view') === 'events') S.view = 'events';

  function isEnv() { return S.layer === 'env' || S.layer === 'temp' || S.layer === 'rain'; }
  function sigKey() { return S.layer === 'temp' ? 'lst' : S.layer === 'rain' ? 'rainfall' : S.sig; }
  function pillar() { return S.layer === 'human' || S.layer === 'animal' || S.layer === 'wild' ? S.layer : 'all'; }   /* whose cases the pointers count */
  function isWild() { return S.layer === 'wild'; }
  function src() { return isWild() ? WBY : BY; }   /* the reports now counted */
  function unit() { return isWild() ? 'animals found dead' : 'cases'; }
  function keys() { return S.dis === 'all' ? ORDER : [S.dis]; }
  function causeList() {
    var p = pillar();
    if (p === 'all') return CAUSES_ALL;
    if (S.dis !== 'all') return CAUSES[p + '|' + S.dis];
    return ORDER.reduce(function (a, k) { return a.concat(CAUSES[p + '|' + k]); }, []);
  }
  function iso(day) { return '2026-09-' + (day < 10 ? '0' : '') + day; }
  function blockShare() {   /* part of the district's cases that falls in the chosen block; the blocks of a district add up to the district */
    var list = BLOCKS[S.dist] || [], w = list.map(function (b, i) { return 1 / (i + 1.5); }), t = w.reduce(function (a, b) { return a + b; }, 0);
    return w[list.indexOf(S.block)] / t;
  }
  /* cases of one disease in one district under the filters now chosen; null when nothing is reported */
  function val(name, k) {
    var r = (src()[name] || {})[k]; if (!r) return null;
    var day = iso(r[2]); if ((S.from && day < S.from) || (S.to && day > S.to)) return null;
    var rule = S.cause === 'all' ? null : RULE[S.cause];
    if (rule && ((rule.status && r[1] !== rule.status) || (rule.dis && rule.dis !== k))) return null;
    var n = r[0], human = Math.round(n * PILLAR_SHARE.human);
    if (S.layer === 'human') n = human; else if (S.layer === 'animal') n = n - human;
    if (rule && rule.share) n = Math.round(n * rule.share);
    if (S.block !== 'all' && name === S.dist) n = Math.round(n * blockShare());
    return n > 0 ? n : null;
  }
  function cases(name) { return keys().reduce(function (a, k) { return a + (val(name, k) || 0); }, 0); }
  function signal(name, layer) {
    var key = layer || sigKey(), v = env(name, key);
    if (S.block !== 'all' && name === S.dist) v = Math.max(0, Math.min(100, v + Math.round((hash(S.block + '|' + key) - 0.5) * 16)));
    return v;
  }
  function value(name) { return isEnv() ? signal(name) : cases(name); }

  /* Layer colours, one colour from light to dark (project manager's rule): nude shades for Human, blue for Animal,
     green for Environment, red for temperature, aqua for rain. All cases keep the portal's rose; Wildlife is purple. */
  var RAMP = {
    rose: ['#ecc4cf', '#d28ea4', '#b85c78', '#8a3f57'], nude: ['#ecd2bd', '#d6ab8b', '#b38160', '#80553a'], blue: ['#bcd6f2', '#86b3e6', '#3f82cf', '#1b579c'],
    purple: ['#e4d8f2', '#c2a5e2', '#9261c4', '#5f2d91'], green: ['#d3e8e0', '#94c9b8', '#3f9c86', '#0e6b58'], red: ['#f6cfc8', '#ea9a8c', '#d2554a', '#9c2a22'], aqua: ['#c9ecec', '#8ad3d6', '#35adb5', '#137a83']
  };
  var NONE = '#e6e9ee', RIVER = '#2c7fc9';
  function layerRamp(key) { return key === 'lst' ? RAMP.red : key === 'rainfall' ? RAMP.aqua : RAMP.green; }
  function ramp() { return isEnv() ? layerRamp(sigKey()) : ({ human: RAMP.nude, animal: RAMP.blue, wild: RAMP.purple })[S.layer] || RAMP.rose; }
  var STEPS = [[1, 5, '1 to 5', 'Few'], [6, 15, '6 to 15', 'Some'], [16, 30, '16 to 30', 'Many'], [31, Infinity, 'More than 30', 'Very many']];
  var ESTEPS = [[0, 24, '0 to 24', 'Low'], [25, 49, '25 to 49', 'Moderate'], [50, 74, '50 to 74', 'High'], [75, 100, '75 to 100', 'Very high']];
  function steps() { return isEnv() ? ESTEPS : STEPS; }
  function stepIndex(n) { var list = steps(); for (var i = 0; i < list.length; i++) if (n >= list[i][0] && n <= list[i][1]) return i; return -1; }
  function fill(n) { var i = stepIndex(n); return i < 0 ? NONE : ramp()[i]; }
  function layerTitle() { return S.layer === 'env' ? LAYER_NAME[S.sig] : LAYER_OF[S.layer].title; }

  /* ---------------------------------------------------------------- Shapes: centre of a district, and whether a point is inside it */
  function polys(f) { return f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates; }
  function centre(f) {
    var best = null, bestA = 0;
    polys(f).forEach(function (p) {
      var r = p[0], a = 0, x = 0, y = 0;
      for (var i = 0, n = r.length; i < n; i++) { var u = r[i], v = r[(i + 1) % n], c = u[0] * v[1] - v[0] * u[1]; a += c; x += (u[0] + v[0]) * c; y += (u[1] + v[1]) * c; }
      if (Math.abs(a) > bestA) { bestA = Math.abs(a); best = [x / (3 * a), y / (3 * a)]; }
    });
    return best;
  }
  function inside(f, pt) {
    return polys(f).some(function (p) {
      var r = p[0], hit = false;
      for (var i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > pt[1]) !== (r[j][1] > pt[1]) && pt[0] < (r[j][0] - r[i][0]) * (pt[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) hit = !hit;
      return hit;
    });
  }
  var CENTRE = {}, FEAT = {};
  Object.keys(GEO).forEach(function (s) { GEO[s].forEach(function (f) { CENTRE[f.properties.name] = centre(f); FEAT[f.properties.name] = f; }); });
  /* rivers of the state; for one district, only the stretches that run inside it */
  function rivers() {
    var all = (window.OH_RIVERS || {})[S.state] || [];
    if (S.dist === 'all') return all;
    var f = FEAT[S.dist], out = [];
    all.forEach(function (r) {
      var run = [];
      r.coords.forEach(function (c) { if (inside(f, c)) run.push(c); else { if (run.length > 1) out.push({ name: r.name, coords: run }); run = []; } });
      if (run.length > 1) out.push({ name: r.name, coords: run });
    });
    return out;
  }

  /* ---------------------------------------------------------------- Controls */
  var EL = { dis: $('#m-dis'), dist: $('#m-dist'), block: $('#m-block'), cause: $('#m-cause'), sig: $('#m-sig'), period: $('#m-period'), from: $('#m-from'), to: $('#m-to'),
    back: $('#m-back'), note: $('#m-note'), count: $('#m-count'), side: $('#side'), map: $('#map'), card: $('#mapcard'), top: $('#m-top'), lsel: $('#m-lsel') };
  EL.dis.innerHTML = opt([['all', 'All three diseases']].concat(ORDER.map(function (k) { return [k, DIS[k].name]; })));
  EL.sig.innerHTML = opt(SIGNALS);
  EL.period.innerHTML = opt(PERIODS);
  $('#m-layers').innerHTML = '<span class="lt" id="lay-lbl">Map shows</span>' + LAYERS_MAP.map(function (l) { return '<label class="lrow"><input class="sr" type="radio" name="m-layer" value="' + l.k + '"><i style="--c:' + l.dot + '"></i>' + l.name + '</label>'; }).join('');
  EL.lsel.innerHTML = opt(LAYERS_MAP.map(function (l) { return [l.k, 'Map shows: ' + l.name]; }));
  function fillDistricts() { EL.dist.innerHTML = opt([['all', 'All districts']].concat(GEO[S.state].map(function (f) { return [f.properties.name, f.properties.name]; }))); EL.dist.value = S.dist; }
  function fillBlocks() {
    var list = S.dist === 'all' ? [] : BLOCKS[S.dist] || [], tg = S.state === 'tg';
    if (list.indexOf(S.block) < 0) S.block = 'all';
    EL.block.innerHTML = opt([['all', S.dist === 'all' ? 'All blocks / mandals' : tg ? 'All mandals' : 'All blocks']].concat(list.map(function (b) { return [b, b]; })));
    EL.block.value = S.block; EL.block.disabled = !list.length;
    EL.block.title = S.dist === 'all' ? 'Choose a district first' : list.length ? '' : 'No ' + (tg ? 'mandal' : 'block') + ' list for this district';
  }
  function fillCauses() {
    var list = causeList();
    if (!list.some(function (c) { return c[0] === S.cause; })) S.cause = 'all';
    EL.cause.innerHTML = opt([['all', 'All causes']].concat(list)); EL.cause.value = S.cause;
  }
  function fit() { S.zoom = 1; S.center = null; }
  var tabs = [].slice.call(document.querySelectorAll('.stabs [role="tab"]'));
  function setState(s, focus) { S.state = s; S.dist = 'all'; S.block = 'all'; S.all = false; fit(); fillDistricts(); draw(); if (focus) $('#tab-' + s).focus(); }
  function setDistrict(d) { S.dist = d; S.block = 'all'; S.all = false; S.view = 'list'; fit(); EL.dist.value = d; draw(); }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { if (S.state !== t.dataset.state) setState(t.dataset.state); });
    t.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); setState(tabs[(i + 1) % tabs.length].dataset.state, true); }
    });
  });
  [].forEach.call(document.querySelectorAll('#m-layers input'), function (b) { b.addEventListener('change', function () { S.layer = b.value; S.all = false; draw(); }); });
  EL.lsel.addEventListener('change', function () { S.layer = EL.lsel.value; S.all = false; draw(); });
  EL.dist.addEventListener('change', function () { setDistrict(EL.dist.value); });
  function back(days) { var d = new Date(TODAY + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() - days + 1); return d.toISOString().slice(0, 10); }
  ['dis', 'block', 'cause', 'sig', 'period', 'from', 'to'].forEach(function (k) {
    EL[k].addEventListener('change', function () {
      S[k] = EL[k].value; S.all = false;
      if (k === 'period' && S.period !== 'custom') {   /* a period fills the two dates */
        S.to = S.period === 'all' ? '' : TODAY;
        S.from = S.period === 'all' ? '' : S.period === 'ytd' ? '2026-01-01' : back(+S.period);
      }
      if (k === 'from' || k === 'to') S.period = S.from || S.to ? 'custom' : 'all';
      draw();
    });
  });
  EL.back.addEventListener('click', function () { setDistrict('all'); EL.dist.focus(); });
  $('#m-reset').addEventListener('click', function () { Object.keys(DEF).forEach(function (k) { if (k !== 'layer' && k !== 'sig') S[k] = DEF[k]; }); S.all = false; fit(); fillDistricts(); draw(); });
  $('#m-rivers').addEventListener('change', function () { S.rivers = this.checked; drawMap(); });
  $('#m-lines').addEventListener('change', function () { S.lines = this.checked; drawMap(); });
  $('#m-ftoggle').addEventListener('click', function () {
    var off = !$('#m-filters').hidden; $('#m-filters').hidden = off;
    this.setAttribute('aria-expanded', off ? 'false' : 'true'); this.lastChild.textContent = off ? 'Show filters' : 'Hide filters';
    sizeMap(); chart.resize(); drawMap();
  });
  /* in full screen the map takes the rest of the window; the legend is one scroll below */
  function sizeMap() { EL.map.style.height = S.fs ? Math.max(360, window.innerHeight - EL.map.getBoundingClientRect().top - 140) + 'px' : ''; }
  function setFs(on) {
    S.fs = on; EL.card.classList.toggle('fs', on); document.documentElement.classList.toggle('mapfs', on);
    var b = $('#m-fs'); b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.lastChild.textContent = on ? 'Exit full screen' : 'Full screen';
    $('use', b).setAttribute('href', on ? '#i-shrink' : '#i-expand');
    EL.card.scrollTop = 0;
    sizeMap(); chart.resize(); drawMap();
  }
  $('#m-fs').addEventListener('click', function () { setFs(!S.fs); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && S.fs) setFs(false); });
  $('#m-zin').addEventListener('click', function () { S.zoom = Math.min(8, S.zoom * 1.5); drawMap(); });
  $('#m-zout').addEventListener('click', function () { S.zoom = Math.max(1, S.zoom / 1.5); if (S.zoom < 1.05) fit(); drawMap(); });
  $('#m-zfit').addEventListener('click', function () { fit(); drawMap(); });
  [].forEach.call(document.querySelectorAll('#m-view button'), function (b) { b.addEventListener('click', function () { S.view = b.dataset.view; drawSide(); }); });

  /* ---------------------------------------------------------------- Words for what is shown */
  function date(d) { var p = d.split('-'); return +p[2] + ' ' + L('Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec')[p[1] - 1] + ' ' + p[0]; }
  function when() {
    if (S.period !== 'custom') return S.period === 'all' ? '' : EL.period.options[EL.period.selectedIndex].text.toLowerCase();
    return S.from && S.to ? date(S.from) + ' to ' + date(S.to) : S.from ? 'from ' + date(S.from) : 'up to ' + date(S.to);
  }
  function caseWords() {
    return [({ human: 'Human cases', animal: 'Animal cases', wild: 'Wildlife' })[S.layer] || '', S.dis === 'all' ? 'All three diseases' : DIS[S.dis].name,
      S.cause === 'all' ? '' : EL.cause.options[EL.cause.selectedIndex].text, when()].filter(Boolean);
  }
  function scope() { return isEnv() ? [LAYER_OF[S.layer].name, layerTitle()] : caseWords(); }
  function place() { return S.block !== 'all' ? S.block + (S.state === 'tg' ? ' mandal' : ' block') : S.dist; }
  function disName(k) { return isWild() ? SPECIES[k] + ' (' + (DIS[k].short || DIS[k].name) + ')' : DIS[k].name; }

  /* ---------------------------------------------------------------- Pointers: one circle for each disease in each district */
  function pointers(feats) {
    var out = [];
    feats.forEach(function (f) {
      var name = f.properties.name, here = keys().filter(function (k) { return val(name, k); });
      var off = here.length === 1 ? [[0, 0]] : here.length === 2 ? [[-7, 0], [7, 0]] : [[-8, 4], [8, 4], [0, -8]];
      here.forEach(function (k, i) { var r = src()[name][k]; out.push({ d: name, k: k, n: val(name, k), st: r[1], day: r[2], xy: CENTRE[name], off: off[i], group: here.length }); });
    });
    return out;
  }
  function radius(n) { return Math.min(11.5, 6.5 + Math.sqrt(n)); }

  /* ---------------------------------------------------------------- Map (Apache ECharts) */
  var chart = echarts.init(EL.map);
  var TIP = { backgroundColor: INK, borderWidth: 0, padding: [10, 12], textStyle: { color: '#fff', fontSize: 13, fontFamily: FONT }, extraCssText: 'border-radius:6px;box-shadow:0 6px 16px rgba(15,23,42,.22);max-width:290px;white-space:normal;' };
  function tipRow(color, a, b, round) {
    return '<div style="display:flex;justify-content:space-between;gap:20px;line-height:1.55"><span><i style="display:inline-block;width:9px;height:9px;border-radius:' + (round ? '50%' : '2px') + ';margin-right:7px;background:' + color + '"></i>' + a + '</span><b>' + b + '</b></div>';
  }
  /* hover on a district: its value on the active layer, the whole scale with "here" on its class, and the diseases reported there */
  function tipRegion(name) {
    var v = value(name), i = stepIndex(v), list = steps(), e = isEnv();
    var big = e ? v + ' <span style="font-size:12px;font-weight:500;color:#cbd5e1">of 100</span>' : v ? fmt(v) + ' <span style="font-size:12px;font-weight:500;color:#cbd5e1">' + unit() + '</span>' : '<span style="font-size:13px;font-weight:600">None reported</span>';
    var scale = (e ? [] : [['', NONE, 'None', -1]]).concat(list.map(function (s, j) { return [s[2], ramp()[j], s[3], j]; })).map(function (s) {
      var here = s[3] === i;
      return '<div style="display:flex;align-items:center;gap:8px;line-height:1.5;font-size:12px' + (here ? ';font-weight:700' : ';color:#cbd5e1') + '"><i style="width:14px;height:10px;border-radius:2px;background:' + s[1] + ';flex:none"></i>' +
        (s[0] ? '<span style="min-width:86px">' + s[0] + '</span>' : '') + '<span>' + s[2] + '</span>' + (here ? '<span style="color:#fbe3a6">← here</span>' : '') + '</div>';
    }).join('');
    var dz = keys().filter(function (k) { return val(name, k); }).map(function (k) { return tipRow(DIS[k].color, LETTER[k] + ' · ' + disName(k), val(name, k) + ' · ' + STATUS[src()[name][k][1]], 1); }).join('');
    return '<div style="font-weight:700">' + (S.block !== 'all' && name === S.dist ? S.block + ', ' : '') + name + ' <span style="font-weight:500;color:#cbd5e1">· district</span></div>' +
      '<div style="margin-top:2px;font-size:12px;color:#cbd5e1">' + layerTitle() + '</div><div style="margin:4px 0 6px;font-size:18px;font-weight:800">' + big + '</div>' + scale +
      (dz ? '<div style="margin-top:7px;padding-top:7px;border-top:1px solid rgba(255,255,255,.18)">' + dz + '</div>' : '') +
      (S.dist === 'all' ? '<div style="margin-top:6px;font-size:12px;color:#cbd5e1">Select to see this district alone</div>' : '');
  }
  function tipPointer(p) {
    return '<div style="font-weight:700">' + p.d + '</div>' + tipRow(DIS[p.k].color, disName(p.k), fmt(p.n) + ' ' + unit(), 1) +
      '<div style="margin-top:3px;font-size:12px;color:#cbd5e1">' + STATUS[p.st] + ' · last report ' + date(iso(p.day)) + '</div>';
  }
  function drawMap() {
    var one = S.dist !== 'all', feats = one ? [FEAT[S.dist]] : GEO[S.state], id = 'oh-' + S.state + (one ? '-' + S.dist : '');
    echarts.registerMap(id, { type: 'FeatureCollection', features: feats });
    var roomy = chart.getWidth() >= 520, pts = pointers(feats), big = one ? 1.4 : 1;
    var panel = $('#m-layers').offsetParent !== null;   /* the layer list covers the top left corner: the map moves a little to the right */
    var named = {}; pts.forEach(function (p) { named[p.d] = Math.max(named[p.d] || 0, radius(p.n) * big + (p.group > 2 ? 8 : 0)); });
    var geo = {
      map: id, roam: S.fs ? true : S.zoom > 1.01 ? 'move' : false, zoom: S.zoom, scaleLimit: { min: 1, max: 8 }, aspectScale: Math.cos(STATES[S.state].lat * Math.PI / 180),
      layoutCenter: [panel ? '58%' : '50%', '50%'], layoutSize: one ? '76%' : panel ? '94%' : '96%', selectedMode: false, tooltip: { show: true, formatter: function (p) { return tipRegion(p.name); } },
      itemStyle: { borderColor: '#fff', borderWidth: S.lines && !one ? 1 : 0 }, label: { show: false },
      emphasis: { label: { show: false }, itemStyle: { borderColor: INK, borderWidth: one ? 0 : 1.6 } },
      regions: feats.map(function (f) { var c = fill(value(f.properties.name)); return { name: f.properties.name, itemStyle: { areaColor: c }, emphasis: { itemStyle: { areaColor: c } } }; })
    };
    if (S.center) geo.center = S.center;
    chart.setOption({
      animation: false,   /* circles and rivers must never be seen away from their districts, even for a moment */
      tooltip: Object.assign({ trigger: 'item', confine: true }, TIP),
      geo: geo,
      series: [
        { id: 'riv', type: 'lines', coordinateSystem: 'geo', polyline: true, z: 3, data: S.rivers ? rivers() : [], tooltip: { formatter: function (p) { return '<b>' + p.name + '</b> <span style="color:#cbd5e1">river</span>'; } }, lineStyle: { color: RIVER, width: 1.8, opacity: 0.95, cap: 'round', join: 'round' }, emphasis: { lineStyle: { width: 3.2 } } },
        /* the name of a district sits under its pointers */
        { id: 'nam', type: 'scatter', coordinateSystem: 'geo', z: 4, silent: true, symbolSize: 1, itemStyle: { color: 'transparent' },
          data: (one || (S.lines && roomy) ? Object.keys(named) : []).map(function (d) { return { name: d, value: CENTRE[d], label: { distance: named[d] + 3 } }; }),
          label: { show: true, position: 'bottom', formatter: '{b}', fontFamily: FONT, fontSize: one ? 15 : 12, fontWeight: one ? 600 : 500, color: one ? INK : '#334155', textBorderColor: '#fff', textBorderWidth: 2.5 }, labelLayout: { hideOverlap: true } },
        { id: 'pts', type: 'scatter', coordinateSystem: 'geo', z: 5, cursor: one ? 'default' : 'pointer', tooltip: { formatter: function (p) { return tipPointer(p.data.p); } },
          data: pts.map(function (p) { var r = radius(p.n) * big; return { name: p.d, value: p.xy, p: p, symbolSize: r * 2, symbolOffset: [p.off[0] * big, p.off[1] * big], itemStyle: { color: DIS[p.k].color, borderColor: '#fff', borderWidth: 2 } }; }),
          label: { show: true, formatter: function (x) { return LETTER[x.data.p.k]; }, color: '#fff', fontFamily: FONT, fontSize: one ? 13 : 10, fontWeight: 700 },
          emphasis: { scale: 1.12, itemStyle: { borderColor: INK } } }
      ]
    }, true);
    var what = isEnv() ? 'the level of ' + layerTitle() : 'the number of ' + unit();
    EL.map.setAttribute('aria-label', (one ? 'Map of ' + S.dist + ' district, ' + STATES[S.state].name + ', drawn alone, ' : 'Map of ' + STATES[S.state].name + ' by district, ') + 'coloured by ' + what +
      ', with a circle for each disease reported. The same figures are in the list beside the map.');
    $('#m-zout').disabled = S.zoom <= 1.01; $('#m-zin').disabled = S.zoom >= 7.9; $('#m-zfit').disabled = S.zoom <= 1.01 && !S.center;
  }
  chart.on('click', function (p) { var name = p.componentType === 'geo' ? p.name : p.seriesId === 'pts' ? p.data.p.d : ''; if (S.dist === 'all' && STATE_OF[name]) setDistrict(name); });
  chart.on('georoam', function () {
    var g = chart.getOption().geo[0], was = S.zoom > 1.01;
    S.zoom = g.zoom || 1; S.center = g.center || null;
    if (!S.fs && was !== (S.zoom > 1.01)) chart.setOption({ geo: { roam: S.zoom > 1.01 ? 'move' : false } });
    $('#m-zout').disabled = S.zoom <= 1.01; $('#m-zin').disabled = S.zoom >= 7.9; $('#m-zfit').disabled = false;
  });
  var timer; window.addEventListener('resize', function () { clearTimeout(timer); timer = setTimeout(function () { sizeMap(); chart.resize(); drawMap(); }, 120); });
  /* the map follows its box whenever the box changes size (side panel, full screen, late layout) */
  if (window.ResizeObserver) new ResizeObserver(function () { if (Math.abs(chart.getWidth() - EL.map.clientWidth) > 1 || Math.abs(chart.getHeight() - EL.map.clientHeight) > 1) { chart.resize(); drawMap(); } }).observe(EL.map);

  /* ---------------------------------------------------------------- Legend under the map: what the colour means, what the circles mean */
  function drawLegend() {
    var e = isEnv();
    $('#lg-colour').innerHTML = (e ? '' : '<li><i style="--c:' + NONE + '"></i>None</li>') + steps().map(function (s, i) { return '<li><i style="--c:' + ramp()[i] + '"></i>' + (e ? s[3] + ' <span>' + s[2] + '</span>' : s[2]) + '</li>'; }).join('');
    $('#lg-circles').innerHTML = ORDER.map(function (k) { return '<li' + (keys().indexOf(k) < 0 ? ' class="off"' : '') + '><span class="pt" style="--c:' + DIS[k].color + '">' + LETTER[k] + '</span>' + (isWild() ? SPECIES[k] : DIS[k].short || DIS[k].name) + '</li>'; }).join('') +
      '<li class="sz">Bigger circle, more ' + (isWild() ? 'animals' : 'cases') + '</li>';
  }

  /* ---------------------------------------------------------------- Panel beside the map */
  var LIMIT = 10;
  function head(title, extra) { return '<h3>' + title + '</h3><p class="scope">' + (extra ? [extra] : []).concat(scope()).join(' · ') + '</p>'; }
  function rankList(rows, bars, max) {
    var shown = S.all ? rows : rows.slice(0, LIMIT);
    return '<ol class="rank">' + shown.map(function (r, i) {
      return '<li><button type="button" data-d="' + esc(r.name) + '" title="Show ' + esc(r.name) + ' alone"><span class="no">' + (i + 1) + '</span><span class="nm">' + r.name + '</span><span class="bar">' +
        bars(r).map(function (b) { return '<i style="--c:' + b[0] + ';width:' + (b[1] / max * 100).toFixed(1) + '%"></i>'; }).join('') + '</span><b>' + fmt(r.n) + '</b></button></li>';
    }).join('') + '</ol>' + (rows.length > LIMIT ? '<button class="tbtn" type="button" id="m-more">' + (S.all ? 'Show fewer' : 'Show all ' + rows.length + ' districts') + '</button>' : '');
  }
  function wire(redraw) {
    [].forEach.call(EL.side.querySelectorAll('[data-d]'), function (b) { b.addEventListener('click', function () { setDistrict(b.dataset.d); }); });
    var more = $('#m-more'); if (more) more.addEventListener('click', function () { S.all = !S.all; redraw(); $('#m-more').focus(); });
  }
  function caseRows() { return GEO[S.state].map(function (f) { return { name: f.properties.name, n: cases(f.properties.name) }; }).filter(function (r) { return r.n > 0; }).sort(function (a, b) { return b.n - a.n; }); }
  function stateCases() {
    var rows = caseRows(), total = rows.reduce(function (a, r) { return a + r.n; }, 0);
    EL.side.innerHTML = head(STATES[S.state].name) +
      '<div class="tot"><div><b>' + (rows.length ? fmt(total) : '—') + '</b><span>' + (rows.length ? unit() + (isWild() ? '' : ' reported') : 'none reported') + '</span></div>' +
      (rows.length ? '<div><b>' + rows.length + '</b><span>' + (rows.length === 1 ? 'district' : 'districts') + ' with reports</span></div>' : '') + '</div>' +
      (rows.length ? (keys().length > 1 ? '<ul class="mkeys">' + ORDER.map(function (k) { return '<li><i style="--c:' + DIS[k].color + '"></i>' + (isWild() ? SPECIES[k] + ' (' + (DIS[k].short || DIS[k].name) + ')' : DIS[k].short || DIS[k].name) + '</li>'; }).join('') + '</ul>' : '') +
        rankList(rows, function (r) { return keys().filter(function (k) { return val(r.name, k); }).map(function (k) { return [DIS[k].color, val(r.name, k)]; }); }, rows[0].n)
        : '<p class="empty">Nothing in ' + STATES[S.state].name + ' matches these filters.</p>');
    wire(stateCases);
  }
  function stateEnv() {
    var rows = GEO[S.state].map(function (f) { return { name: f.properties.name, n: signal(f.properties.name) }; }).sort(function (a, b) { return b.n - a.n; });
    var avg = Math.round(rows.reduce(function (a, r) { return a + r.n; }, 0) / rows.length), high = rows.filter(function (r) { return r.n >= 50; }).length;
    EL.side.innerHTML = head(STATES[S.state].name) +
      '<div class="tot"><div><b>' + avg + '</b><span>average level, 0 to 100</span></div><div><b>' + high + '</b><span>' + (high === 1 ? 'district' : 'districts') + ' at High or above</span></div></div>' +
      rankList(rows, function (r) { return [[layerRamp(sigKey())[2], r.n]]; }, 100);
    wire(stateEnv);
  }
  function diseaseList() {
    return '<ul class="dlist">' + keys().map(function (k) {
      var v = val(S.dist, k), x = (src()[S.dist] || {})[k], w = isWild();
      return '<li' + (v ? '' : ' class="none"') + '><span class="pt" style="--c:' + DIS[k].color + '">' + LETTER[k] + '</span><div><b>' + DIS[k].name + (w ? ' · ' + SPECIES[k].toLowerCase() : '') + '</b>' +
        (v ? '<span><em class="st ' + x[1] + '">' + STATUS[x[1]] + '</em>Last report ' + date(iso(x[2])) + '</span>' : '<span>' + (w ? 'None reported dead' : 'No cases reported') + '</span>') + '</div><strong>' + (v ? fmt(v) : '—') + '</strong></li>';
    }).join('') + '</ul>';
  }
  function districtCases() {
    var n = cases(S.dist), any = n > 0;
    EL.side.innerHTML = head(place(), S.block !== 'all' ? S.dist + ', ' + STATES[S.state].name : STATES[S.state].name) +
      '<div class="tot"><div><b>' + (any ? fmt(n) : '—') + '</b><span>' + (any ? unit() + (isWild() ? '' : ' reported') : 'none reported') + '</span></div></div>' + diseaseList();
  }
  function districtEnv() {
    var v = signal(S.dist), key = sigKey(), list = S.layer === 'env' && key === 'all' ? SIGNALS.slice(1) : [[key, LAYER_NAME[key]]];
    EL.side.innerHTML = head(place(), S.block !== 'all' ? S.dist + ', ' + STATES[S.state].name : STATES[S.state].name) +
      '<div class="tot"><div><b>' + v + '</b><span>' + (key === 'all' ? 'average level' : 'level') + ', 0 to 100 · ' + ESTEPS[stepIndex(v)][3] + '</span></div></div>' +
      '<ul class="elist">' + list.map(function (l) { var x = signal(S.dist, l[0]); return '<li><span>' + l[1] + '</span><span class="bar"><i style="--c:' + layerRamp(l[0])[2] + ';width:' + x + '%"></i></span><b>' + x + '</b></li>'; }).join('') + '</ul>' +
      '<h4 class="sub-h">Diseases reported here</h4>' + diseaseList();
  }
  function drawEvents() {
    var list = EVENTS.filter(function (e) { return e[0] === 'both' || e[0] === S.state; });
    EL.side.innerHTML = '<h3>Latest events</h3><p class="scope">' + STATES[S.state].name + ' and both pilot states</p><ul class="events">' + list.map(function (e) {
      return '<li><span class="tag"><i style="--c:' + EDOT[e[1]] + '"></i>' + e[2] + '</span><time>' + e[4] + '</time><p>' + e[3] + '</p></li>';
    }).join('') + '</ul>';
  }
  function drawSide() {
    [].forEach.call(document.querySelectorAll('#m-view button'), function (b) { b.setAttribute('aria-pressed', b.dataset.view === S.view ? 'true' : 'false'); });
    if (S.view === 'events') return drawEvents();
    if (S.dist !== 'all') (isEnv() ? districtEnv : districtCases)(); else (isEnv() ? stateEnv : stateCases)();
  }

  function draw() {
    var one = S.dist !== 'all';
    tabs.forEach(function (t) { var on = t.dataset.state === S.state; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; });
    $('#mpanel').setAttribute('aria-labelledby', 'tab-' + S.state);
    [].forEach.call(document.querySelectorAll('#m-layers input'), function (b) { b.checked = b.value === S.layer; b.parentNode.classList.toggle('on', b.checked); });
    EL.lsel.value = S.layer;
    $('#m-title').textContent = layerTitle(); $('#m-cap').textContent = LAYER_OF[S.layer].explain;
    $('#m-sig-wrap').hidden = S.layer !== 'env';   /* the list of environment signals belongs to the Environment layer */
    fillBlocks(); fillCauses();
    ['dis', 'sig', 'period', 'from', 'to'].forEach(function (k) { EL[k].value = S[k]; });
    EL.to.min = S.from;
    EL.back.hidden = !one;
    $('#m-from-wrap').hidden = $('#m-to-wrap').hidden = S.period !== 'custom';   /* the two dates appear when "Chosen dates" is picked */
    $('#m-back-name').textContent = STATES[S.state].name;
    EL.note.hidden = S.block === 'all';
    EL.note.textContent = 'Figures are for ' + place() + '. The map shows ' + S.dist + ' district.';
    /* the row above the map is there only when it has something in it */
    EL.top.hidden = !one && S.layer !== 'env' && $('#m-lsel-wrap').offsetParent === null && window.matchMedia('(min-width:768px)').matches;
    /* the count line, as on the Bhutan map: places, cases, disease, period */
    var rows = one ? (cases(S.dist) ? [1] : []) : caseRows(), total = one ? cases(S.dist) : rows.reduce(function (a, r) { return a + r.n; }, 0);
    EL.count.innerHTML = '<b>' + (one ? place() : rows.length + (rows.length === 1 ? ' district' : ' districts')) + '</b> · <b>' + fmt(total) + '</b> ' + unit() + ' · ' + (S.dis === 'all' ? 'all three diseases' : DIS[S.dis].name) + ' · ' + (when() || 'all dates');
    drawMap(); drawLegend(); drawSide();
  }
  fillDistricts();
  draw();
})();
