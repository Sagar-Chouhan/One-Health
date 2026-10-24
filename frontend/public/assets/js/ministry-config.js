/* One Health portal — what each department page shows.
   The indicators follow the parameters listed in the two workbooks from the project manager
   (Tamil Nadu and Telangana). The workbooks hold no values, so the counts below are the
   settings the page uses to build its demo records; headline numbers match the dashboard cards.

   Stream  S(type, disease, TN, TG, districtWeightsTN, districtWeightsTG, extra)
           TN / TG = 24 weekly counts, or [previous 12 weeks, latest 12 weeks].
   Measure = a weekly reading per district (weather, soil, satellite), given as [low, high]. */
window.OH_MIN = (function () {
  function mk(v, dw) { return !v ? null : v.length === 24 ? { w: v, dw: dw } : { n: v, dw: dw }; }
  function S(t, d, tn, tg, dwTN, dwTG, x) { var o = { t: t, d: d, TN: mk(tn, dwTN), TG: mk(tg, dwTG) }; if (x) for (var k in x) o[k] = x[k]; return o; }
  function at(i) { var a = []; for (var k = 0; k < 24; k++) a.push(k === i ? 1 : 0); return a; }
  function person(men, age) { return { sex: [['M', men], ['F', 1 - men]], age: age.map(function (w, i) { return [i, w]; }) }; }
  var POS = { set: { res: 'pos' } }, NEG = { set: { res: 'neg' } }, INC = { set: { res: 'inc' } };
  var ALSO_TEST = [{ t: 'test', set: { res: 'pos' } }];
  var ALLF = ['state', 'dist', 'dis', 'area', 'weeks'], PLACE = ['state', 'dist', 'weeks'];
  var PN = [['pos', 'Positive', '#8a3f57'], ['neg', 'Negative', '#e3e6ec']];

  /* ------------------------------------------------------------------ Health & Family Welfare */
  var H_TN = [['The Nilgiris', .92], ['Coimbatore', .45], ['Erode', .72], ['Salem', .7], ['Namakkal', .8]];
  var H_TG = [['Nagarkurnool', .9], ['Mulugu', .95], ['Bhadradri Kothagudem', .85], ['Medak', .8], ['Sangareddy', .6], ['Siddipet', .8]];
  var K1 = [16, 2, 1, 0, 0], K2 = [6, 1, 1, 0, 0, 0], A1 = [0, 3, 0, 0, 1], A2 = [0, 0, 0, 2, 5, 0], B1 = [0, 0, 14, 7, 5], B2 = [0, 0, 0, 8, 4, 2];
  var mohfw = {
    id: 'mohfw', short: 'Health & Family Welfare', en: 'Ministry of Health and Family Welfare', hi: 'स्वास्थ्य एवं परिवार कल्याण मंत्रालय',
    filters: ALLF, dists: { TN: H_TN, TG: H_TG },
    streams: [
      S('conf', 'kfd', [0,0,0,1,0,0,1,0,0,0,1,0, 0,1,1,0,1,2,1,2,2,3,3,3], [0,0,0,0,0,1,0,0,0,0,0,0, 0,0,0,0,1,0,0,1,1,1,1,3], K1, K2, { attrs: person(.62, [.08, .22, .34, .26, .10]), also: ALSO_TEST }),
      S('conf', 'bruc', [2,2,3,2,2,3,2,2,2,3,2,2, 2,3,1,2,3,2,2,2,2,3,2,2], [1,1,1,2,1,1,1,1,1,1,1,1, 1,1,1,1,1,1,2,1,1,1,1,2], B1, B2, { attrs: person(.7, [.02, .2, .38, .3, .1]), also: ALSO_TEST }),
      S('watch', 'kfd', [0,0,1,0,0,1,0,1,0,0,1,0, 0,1,1,1,1,1,1,1,1,2,1,2], [0,0,0,0,1,0,0,0,0,1,0,0, 0,0,1,0,1,0,1,0,1,1,1,1], K1, K2),
      S('watch', 'avian', [0,0,0,0,0,0,0,0,1,0,0,0, 0,0,0,0,0,0,1,1,0,1,0,1], [0,0,0,0,0,0,1,0,0,0,1,0, 0,0,0,0,1,0,0,1,1,1,2,1], A1, A2),
      S('watch', 'bruc', [3,3,4,3,3,3,4,3,3,3,3,3, 3,4,3,3,4,3,4,3,3,4,3,4], [2,1,2,2,2,1,2,2,2,2,1,2, 2,2,1,2,2,2,2,2,2,2,2,2], B1, B2),
      S('test', 'kfd', [55, 74], [30, 42], K1, K2, NEG), S('test', 'kfd', [1, 3], [1, 2], K1, K2, INC),
      S('test', 'avian', [22, 30], [30, 43], A1, A2, NEG), S('test', 'avian', [0, 1], [1, 1], A1, A2, INC),
      S('test', 'bruc', [96, 112], [60, 71], B1, B2, NEG), S('test', 'bruc', [3, 4], [2, 3], B1, B2, INC),
      S('alert', 'kfd', [2, 3], [1, 2], K1, K2), S('alert', 'avian', [0, 1], [1, 2], A1, A2), S('alert', 'bruc', [1, 1], null, B1, null),
      S('death', 'kfd', at(21), at(23), [1, 0, 0, 0, 0], [1, 0, 0, 0, 0, 0]),
      S('k_tick', 'kfd', [26, 37], [15, 21], K1, K2), S('k_monkey', 'kfd', [15, 21], [9, 13], K1, K2), S('k_sens', 'kfd', [8, 13], [4, 7], K1, K2),
      S('k_rash', 'kfd', [3, 6], [2, 3], K1, K2), S('k_enc', 'kfd', [1, 2], [0, 1], K1, K2),
      S('a_sari', 'avian', [17, 23], [12, 17], A1, A2), S('a_poultry', 'avian', [2, 4], [4, 7], A1, A2),
      S('b_fever', 'bruc', [36, 41], [20, 23], B1, B2), S('b_joint', 'bruc', [16, 19], [10, 12], B1, B2), S('b_long', 'bruc', [13, 15], [8, 9], B1, B2)
    ],
    kpis: [
      { icon: 'confirmed', label: 'Confirmed cases', t: 'conf' },
      { icon: 'eye', label: 'People under watch', t: 'watch' },
      { icon: 'userminus', label: 'Deaths', t: 'death' },
      { icon: 'flask', label: 'Samples tested', t: 'test', pct: { where: { res: 'pos' }, label: 'positive' } },
      { icon: 'bell', label: 'Event alerts', t: 'alert' }
    ],
    sections: [
      { title: 'Trend and location', sub: 'How cases are moving, and where', layout: 'wide', charts: [
        { kind: 'trend', title: 'Cases per week', source: 'IDSP-IHIP, VRDL', measures: [
          { label: 'Confirmed', cap: 'New lab-confirmed human cases each week', t: 'conf', split: true },
          { label: 'Under watch', cap: 'New suspected people put under watch each week', t: 'watch', split: true }] },
        { kind: 'rank', title: 'Confirmed cases by district', cap: 'Highest first, with share of all cases', source: 'IDSP-IHIP patient details', empty: 'No confirmed human cases for these filters.',
          measures: [{ label: 'Confirmed', t: 'conf', split: true }] }] },
      { title: 'People and testing', sub: 'Who is affected, and what the laboratories found', layout: 'two', charts: [
        { kind: 'pyramid', title: 'Confirmed cases by age and sex', cap: 'Men on the left, women on the right', t: 'conf', source: 'IDSP-IHIP, HMIS patient details', empty: 'No confirmed human cases for these filters.' },
        { kind: 'donuts', title: 'Laboratory test results', cap: 'Share of tested samples that were positive', source: 'IDSP L form, VRDL, LIMS', unit: 'samples tested', items: [
          { d: 'kfd', title: 'KFD', t: 'test', note: 'Test: RT-PCR and IgM ELISA' },
          { d: 'avian', title: 'Avian Influenza', t: 'test', note: 'Test: Nasal swab RT-PCR' },
          { d: 'bruc', title: 'Brucellosis', t: 'test', note: 'Test: RT-PCR and ELISA' }] }] },
      { title: 'Signs and symptoms reported', sub: 'People reported with warning signs', layout: 'full', charts: [
        { kind: 'bars', source: 'IDSP S and P forms, HMIS', unit: 'people', splitState: true, groups: [
          { d: 'kfd', title: 'KFD', rows: [['Tick bite or infestation', 'k_tick'], ['Monkey bite', 'k_monkey'], ['Fever with altered sensorium', 'k_sens'], ['Fever with rash or bleeding', 'k_rash'], ['Acute encephalitis', 'k_enc']] },
          { d: 'avian', title: 'Avian Influenza', rows: [['Severe respiratory infection (SARI)', 'a_sari'], ['Respiratory illness after poultry exposure', 'a_poultry']] },
          { d: 'bruc', title: 'Brucellosis', rows: [['Fever for 7 days or more', 'b_fever'], ['Joint pain with fever that comes and goes', 'b_joint'], ['Long illness with animal-handling history', 'b_long']] }] }] }
    ]
  };

  /* ------------------------------------------------------------------ Department of Animal Husbandry & Dairying */
  var AH_TN = [['Namakkal', .8], ['Coimbatore', .45], ['Erode', .75], ['Salem', .7], ['The Nilgiris', .92]];
  var AH_TG = [['Sangareddy', .6], ['Medak', .8], ['Ranga Reddy', .5], ['Siddipet', .8], ['Nagarkurnool', .9]];
  var dahd = {
    id: 'dahd', short: 'Animal Husbandry & Dairying', en: 'Department of Animal Husbandry &amp; Dairying', hi: 'पशुपालन और डेयरी विभाग',
    filters: ALLF, dists: { TN: AH_TN, TG: AH_TG },
    streams: [
      S('ai_farm', 'avian', [1, 4], [2, 14], [3, 1, 0, 0, 0], [11, 2, 1, 0, 0], { also: ALSO_TEST }),
      S('ai_dead', 'avian', [9, 17], [14, 29], [6, 5, 2, 2, 2], [14, 6, 5, 2, 2]),
      S('ai_cull', 'avian', [0, 2], [1, 7], [2, 0, 0, 0, 0], [6, 1, 0, 0, 0]),
      S('test', 'avian', [40, 58], [70, 128], [6, 3, 1, 1, 1], [9, 3, 2, 1, 1], NEG), S('test', 'avian', [1, 2], [2, 6], [3, 1, 1, 1, 1], [5, 2, 1, 1, 1], INC),
      S('br_abort', 'bruc', [38, 44], [24, 29], [6, 3, 18, 12, 5], [5, 14, 4, 5, 1]),
      S('br_ret', 'bruc', [20, 24], [14, 17], [3, 2, 10, 7, 2], [3, 8, 2, 3, 1]),
      S('br_case', 'bruc', [14, 17], [9, 12], [3, 1, 8, 4, 1], [2, 6, 1, 2, 1], { also: ALSO_TEST }),
      S('test', 'bruc', [270, 310], [190, 214], [4, 2, 9, 6, 2], [3, 8, 2, 3, 1], NEG), S('test', 'bruc', [3, 4], [2, 3], [1, 1, 3, 2, 1], [1, 3, 1, 1, 1], INC),
      S('br_vac', 'bruc', [640, 720], [470, 520], [4, 2, 8, 6, 2], [3, 7, 2, 3, 1]),
      S('kfd_tick', 'kfd', [52, 68], [34, 44], [2, 6, 10, 4, 46], [2, 3, 1, 3, 35]),
      S('kfd_monkey', 'kfd', [1, 3], [1, 3], [0, 0, 0, 0, 3], [0, 0, 0, 0, 3]),
      S('kfd_pool', 'kfd', [0, 3], [0, 1], [0, 0, 0, 0, 3], [0, 0, 0, 0, 1], { also: ALSO_TEST }),
      S('test', 'kfd', [14, 20], [9, 14], [0, 1, 1, 0, 8], [0, 0, 0, 0, 1], NEG)
    ],
    kpis: [
      { icon: 'bird', label: 'Farms with bird flu', t: 'ai_farm', d: 'avian' },
      { icon: 'alert', label: 'Dead bird incidents', t: 'ai_dead', d: 'avian' },
      { icon: 'paw', label: 'Livestock abortions', t: 'br_abort', d: 'bruc' },
      { icon: 'confirmed', label: 'Brucellosis in cattle', t: 'br_case', d: 'bruc' },
      { icon: 'syringe', label: 'Calves vaccinated', t: 'br_vac', d: 'bruc' },
      { icon: 'minus', label: 'Farms culled', t: 'ai_cull', d: 'avian', x: true },
      { icon: 'flask', label: 'Samples tested', t: 'test', d: 'avian', x: true, pct: { where: { res: 'pos' }, label: 'positive' } },
      { icon: 'bug', label: 'Cattle with ticks', t: 'kfd_tick', d: 'kfd', x: true },
      { icon: 'alert', label: 'Diseased monkeys', t: 'kfd_monkey', d: 'kfd', x: true },
      { icon: 'flask', label: 'Tick pools tested', t: 'test', d: 'kfd', x: true, pct: { where: { res: 'pos' }, label: 'positive' } }
    ],
    sections: [
      { title: 'Trend and location', sub: 'How animal disease signals are moving, and where', layout: 'wide', charts: [
        { kind: 'trend', title: 'Reports per week', source: 'Bharat Pashudhan, VETNET, State Animal Husbandry', measures: [
          { label: 'Bird flu farms', cap: 'Poultry farms newly confirmed with bird flu each week', t: 'ai_farm', d: 'avian' },
          { label: 'Abortions', cap: 'Livestock abortions in the last trimester each week', t: 'br_abort', d: 'bruc' },
          { label: 'Cattle with ticks', cap: 'Cattle found with tick infestation each week', t: 'kfd_tick', d: 'kfd' }] },
        { kind: 'rank', title: 'Reports by district', cap: 'Highest first, with share of the total', source: 'VETNET, State Animal Husbandry', measures: [
          { label: 'Bird flu farms', t: 'ai_farm', d: 'avian' }, { label: 'Abortions', t: 'br_abort', d: 'bruc' }, { label: 'Cattle with ticks', t: 'kfd_tick', d: 'kfd' }] }] },
      { title: 'Laboratory test results', sub: 'Animal samples tested and how many were positive', layout: 'full', charts: [
        { kind: 'donuts', source: 'ICAR-NIHSAD, Animal Disease Laboratories, ADIU lab registers', unit: 'samples tested', items: [
          { d: 'avian', title: 'Avian Influenza', t: 'test', note: 'Test: RT-PCR at ICAR-NIHSAD, Bhopal' },
          { d: 'bruc', title: 'Brucellosis', t: 'test', note: 'Test: RBPT and ELISA' },
          { d: 'kfd', title: 'KFD', t: 'test', note: 'Test: RT-PCR on tick pools' }] }] },
      { title: 'Key indicators by disease', sub: 'Counts reported in this period', layout: 'full', charts: [
        { kind: 'bars', source: 'Bharat Pashudhan, VETNET, ADIU reports', unit: 'reports', groups: [
          { d: 'avian', title: 'Avian Influenza', rows: [['Dead bird incidents', 'ai_dead'], ['Farms with confirmed bird flu', 'ai_farm'], ['Farms where culling was done', 'ai_cull']] },
          { d: 'bruc', title: 'Brucellosis', rows: [['Abortions in the last trimester', 'br_abort'], ['Placental retention', 'br_ret'], ['Bovine brucellosis cases', 'br_case']] },
          { d: 'kfd', title: 'KFD', rows: [['Cattle with tick infestation', 'kfd_tick'], ['Diseased monkeys reported', 'kfd_monkey'], ['Tick pools positive', 'kfd_pool']] }] }] }
    ]
  };

  /* ------------------------------------------------------------------ Indian Council of Agricultural Research (ICAR-NIVEDI, ICAR-IISWC) */
  var AG_TN = [['Namakkal', .8], ['Erode', .75], ['Coimbatore', .45], ['Salem', .7]], AG_TG = [['Sangareddy', .6], ['Medak', .8], ['Siddipet', .8]];
  var icar = {
    id: 'icar', short: 'ICAR', en: 'Indian Council of Agricultural Research', hi: 'भारतीय कृषि अनुसंधान परिषद',
    filters: PLACE, dists: { TN: AG_TN, TG: AG_TG },
    streams: [
      S('fore', '', [1, 2], [1, 1], [1, 1, 0, 0], [1, 0, 0]),
      S('outb', '', [1, 2], [1, 2], [1, 2, 1, 1], [2, 1, 1]),
      S('sero', '', [9, 12], [7, 9], [2, 5, 1, 3], [3, 5, 2], { set: { sp: 'cattle', res: 'pos' } }),
      S('sero', '', [196, 228], [150, 171], [3, 5, 2, 3], [3, 4, 2], { set: { sp: 'cattle', res: 'neg' } }),
      S('sero', '', [3, 5], [3, 5], [1, 3, 1, 2], [2, 3, 1], { set: { sp: 'buffalo', res: 'pos' } }),
      S('sero', '', [78, 90], [64, 75], [2, 4, 1, 3], [3, 4, 2], { set: { sp: 'buffalo', res: 'neg' } })
    ],
    meas: {
      stemp: { unit: '°C', dp: 1, TN: [[27, 30], [26, 29], [25, 28], [27, 30]], TG: [[28, 31], [28, 31], [27, 30]] },
      smoist: { unit: '%', dp: 0, TN: [[22, 30], [24, 33], [26, 36], [21, 29]], TG: [[18, 26], [19, 27], [18, 25]] }
    },
    kpis: [
      { icon: 'megaphone', label: 'Disease forewarnings', t: 'fore' },
      { icon: 'flask', label: 'Calf samples tested', t: 'sero', pct: { where: { res: 'pos' }, label: 'positive' } },
      { icon: 'confirmed', label: 'Positive samples', t: 'sero', where: { res: 'pos' } },
      { icon: 'alert', label: 'Outbreak reports', t: 'outb' },
      { icon: 'pin', label: 'Districts on alert', value: { TN: 3, TG: 2 }, note: 'Receive SMS alerts' }
    ],
    sections: [
      { title: 'Trend and location', sub: 'Brucellosis sero-monitoring and outbreak reports', layout: 'wide', charts: [
        { kind: 'trend', title: 'Reports per week', source: 'NADRES 3.0, ICAR-NIVEDI', measures: [
          { label: 'Samples tested', cap: 'Calf samples tested for Brucellosis each week', t: 'sero' },
          { label: 'Positive', cap: 'Calf samples that tested positive each week', t: 'sero', where: { res: 'pos' } },
          { label: 'Outbreak reports', cap: 'Outbreak reports received at NIVEDI each week', t: 'outb' }] },
        { kind: 'rank', title: 'By district', cap: 'Highest first, with share of the total', source: 'NADRES 3.0', measures: [
          { label: 'Samples tested', t: 'sero' }, { label: 'Positive', t: 'sero', where: { res: 'pos' } }, { label: 'Outbreak reports', t: 'outb' }] }] },
      { title: 'Sero-monitoring results', sub: 'Brucellosis testing in calves under one year', layout: 'full', charts: [
        { kind: 'donuts', source: 'NADRES 3.0, NIVEDI national laboratory', unit: 'samples tested', items: [
          { title: 'Cattle calves', t: 'sero', where: { sp: 'cattle' }, note: 'Test: ELISA', parts: PN },
          { title: 'Buffalo calves', t: 'sero', where: { sp: 'buffalo' }, note: 'Test: ELISA', parts: PN }] }] },
      { title: 'Soil conditions', sub: 'Weekly readings from ICAR-IISWC', layout: 'two', charts: [
        { kind: 'meas', title: 'Soil temperature', cap: 'Average of the selected districts', unit: '°C', source: 'ICAR-IISWC', series: [{ m: 'stemp', name: 'Soil temperature', type: 'line', color: '#c2410c' }] },
        { kind: 'meas', title: 'Soil moisture', cap: 'Average of the selected districts', unit: '%', source: 'ICAR-IISWC', series: [{ m: 'smoist', name: 'Soil moisture', type: 'line', color: '#2a66a8' }] }] }
    ]
  };

  /* ------------------------------------------------------------------ Ministry of Environment, Forest and Climate Change */
  var F_TN = [['The Nilgiris', 1], ['Coimbatore', 1], ['Erode', 1]], F_TG = [['Nagarkurnool', 1], ['Mulugu', 1], ['Bhadradri Kothagudem', 1]];
  var forest = {
    id: 'forest', short: 'Environment, Forest & Climate Change', en: 'Ministry of Environment, Forest and Climate Change', hi: 'पर्यावरण, वन और जलवायु परिवर्तन मंत्रालय',
    filters: ['state', 'dist', 'dis', 'weeks'], dists: { TN: F_TN, TG: F_TG },
    streams: [
      S('mk_death', 'kfd', [1, 3], [0, 3], [3, 0, 0], [3, 0, 0]),
      S('mk_sick', 'kfd', [2, 5], [1, 4], [4, 1, 0], [3, 1, 0]),
      S('mk_pm', 'kfd', [1, 3], [0, 2], [3, 0, 0], [2, 0, 0]),
      S('mk_disp', 'kfd', [1, 3], [0, 3], [3, 0, 0], [3, 0, 0]),
      S('bird_dead', 'avian', [6, 13], [8, 18], [3, 6, 4], [4, 8, 6]),
      S('bird_mig', 'avian', [2, 4], [1, 3], [1, 2, 1], [1, 1, 1]),
      S('wl_sero', 'bruc', [0, 1], [1, 1], [1, 0, 0], [1, 0, 0]),
      S('wl_orch', 'bruc', [1, 2], [0, 1], [1, 1, 0], [0, 1, 0]),
      S('fire', '', [3, 5], [4, 7], [2, 1, 2], [3, 2, 2])
    ],
    kpis: [
      { icon: 'alert', label: 'Monkey deaths', t: 'mk_death', d: 'kfd' },
      { icon: 'eye', label: 'Sick monkeys', t: 'mk_sick', d: 'kfd' },
      { icon: 'bird', label: 'Dead wild birds', t: 'bird_dead', d: 'avian' },
      { icon: 'pin', label: 'Migratory bird checks', t: 'bird_mig', d: 'avian' },
      { icon: 'flame', label: 'Forest fires detected', t: 'fire' },
      { icon: 'confirmed', label: 'Monkey post-mortems', t: 'mk_pm', d: 'kfd', x: true },
      { icon: 'flask', label: 'Wildlife tested positive', t: 'wl_sero', d: 'bruc', x: true },
      { icon: 'paw', label: 'Orchitis in wild boar', t: 'wl_orch', d: 'bruc', x: true }
    ],
    sections: [
      { title: 'Trend and location', sub: 'Reports from forest officers, and where they came from', layout: 'wide', charts: [
        { kind: 'trend', title: 'Reports per week', source: 'Ministry of Environment, Forest and Climate Change (DFO, FVO, State PCCF)', measures: [
          { label: 'Monkey deaths', cap: 'Monkey deaths reported each week', t: 'mk_death', d: 'kfd' },
          { label: 'Dead wild birds', cap: 'Dead wild birds reported each week', t: 'bird_dead', d: 'avian' },
          { label: 'Forest fires', cap: 'Forest fires detected each week', t: 'fire' }] },
        { kind: 'rank', title: 'Reports by district', cap: 'Highest first, with share of the total', source: 'Ministry of Environment, Forest and Climate Change', measures: [
          { label: 'Monkey deaths', t: 'mk_death', d: 'kfd' }, { label: 'Dead wild birds', t: 'bird_dead', d: 'avian' }, { label: 'Forest fires', t: 'fire' }] }] },
      { title: 'Wildlife indicators by disease', sub: 'Counts reported in this period', layout: 'full', charts: [
        { kind: 'bars', source: 'Ministry of Environment, Forest and Climate Change event reports', unit: 'reports', groups: [
          { d: 'kfd', title: 'KFD', rows: [['Sick monkeys', 'mk_sick'], ['Monkey deaths', 'mk_death'], ['Monkey post-mortems done', 'mk_pm'], ['Carcasses safely disposed', 'mk_disp']] },
          { d: 'avian', title: 'Avian Influenza', rows: [['Dead wild birds', 'bird_dead'], ['Migratory bird sites sampled', 'bird_mig']] },
          { d: 'bruc', title: 'Brucellosis', rows: [['Orchitis cases in wild boar', 'wl_orch'], ['Wildlife positive at post-mortem', 'wl_sero']] }] }] }
    ]
  };

  /* ------------------------------------------------------------------ India Meteorological Department */
  var W_TN = [['The Nilgiris', 1], ['Coimbatore', 1], ['Erode', 1], ['Salem', 1], ['Namakkal', 1]], W_TG = [['Nagarkurnool', 1], ['Sangareddy', 1], ['Medak', 1], ['Mulugu', 1], ['Siddipet', 1]];
  var imd = {
    id: 'imd', short: 'India Meteorological Department', en: 'India Meteorological Department', hi: 'भारत मौसम विज्ञान विभाग',
    filters: PLACE, dists: { TN: W_TN, TG: W_TG }, streams: [],
    meas: {
      rain: { unit: 'mm', dp: 0, TN: [[38, 96], [10, 34], [8, 30], [9, 32], [7, 28]], TG: [[18, 52], [14, 46], [15, 48], [22, 60], [14, 44]] },
      rmax: { unit: 'mm', dp: 0, TN: [[14, 36], [4, 16], [3, 14], [4, 15], [3, 12]], TG: [[7, 24], [6, 20], [6, 21], [9, 27], [6, 19]], peak: { dist: 'The Nilgiris', w: 22, v: 42 } },
      tmax: { unit: '°C', dp: 1, TN: [[20, 24], [30, 34], [32, 36], [32, 36], [32, 35]], TG: [[30, 34], [29, 33], [30, 34], [30, 33], [30, 34]] },
      tmin: { unit: '°C', dp: 1, TN: [[11, 14], [21, 24], [22, 25], [22, 25], [22, 24]], TG: [[21, 24], [20, 23], [21, 24], [21, 23], [21, 24]] },
      hum: { unit: '%', dp: 0, TN: [[80, 90], [62, 74], [58, 70], [58, 70], [56, 68]], TG: [[64, 78], [62, 76], [62, 76], [68, 80], [62, 75]] },
      wind: { unit: 'km/h', dp: 0, TN: [[8, 16], [9, 18], [7, 14], [7, 14], [6, 13]], TG: [[8, 15], [9, 17], [8, 16], [7, 13], [8, 15]] }
    },
    kpis: [
      { icon: 'rain', label: 'Highest rain in a day', m: 'rmax', agg: 'max' },
      { icon: 'droplets', label: 'Total rainfall', m: 'rain', agg: 'sum' },
      { icon: 'thermometer', label: 'Day temperature', m: 'tmax', agg: 'avg' },
      { icon: 'droplets', label: 'Average humidity', m: 'hum', agg: 'avg' },
      { icon: 'wind', label: 'Average wind speed', m: 'wind', agg: 'avg' }
    ],
    sections: [
      { title: 'Rainfall', sub: 'Weekly rainfall, and which districts received the most', layout: 'wide', charts: [
        { kind: 'meas', title: 'Rainfall per week', cap: 'Average of the selected districts', unit: 'mm', source: 'Mausam, India Meteorological Department', series: [{ m: 'rain', name: 'Rainfall', type: 'bar', color: '#2a66a8' }] },
        { kind: 'mrank', title: 'Rainfall by district', cap: 'Total for this period, highest first', m: 'rain', agg: 'sum', color: '#2a66a8', source: 'Mausam, India Meteorological Department' }] },
      { title: 'Temperature and humidity', sub: 'Weekly averages for the selected districts', layout: 'two', charts: [
        { kind: 'meas', title: 'Temperature', cap: 'Highest and lowest of the day, weekly average', unit: '°C', source: 'Mausam, India Meteorological Department', series: [
          { m: 'tmax', name: 'Day (highest)', type: 'line', color: '#c2410c' }, { m: 'tmin', name: 'Night (lowest)', type: 'line', color: '#2a66a8' }] },
        { kind: 'meas', title: 'Relative humidity', cap: 'Weekly average', unit: '%', source: 'Mausam, India Meteorological Department', series: [{ m: 'hum', name: 'Humidity', type: 'line', color: '#12876f' }] }] }
    ]
  };

  /* ------------------------------------------------------------------ Municipal Corporation */
  var U_TN = [['Coimbatore', 0], ['Chennai', 0], ['Salem', 0]], U_TG = [['Hyderabad', 0], ['Sangareddy', 0]];
  var UP = [['pos', 'Failed', '#8a3f57'], ['neg', 'Passed', '#e3e6ec']];
  var municipal = {
    id: 'municipal', short: 'Municipal Corporation', en: 'Municipal Corporation', hi: 'नगर निगम', place: 'city',
    filters: PLACE, dists: { TN: U_TN, TG: U_TG },
    streams: [
      S('meat', '', [2, 3], [3, 4], [2, 1, 0], [3, 1], POS), S('meat', '', [24, 27], [27, 30], [5, 4, 2], [6, 2], NEG),
      S('milk', '', [1, 2], [0, 1], [1, 0, 1], [1, 0], POS), S('milk', '', [40, 46], [30, 35], [5, 4, 2], [5, 2], NEG),
      S('water', '', [3, 5], [2, 3], [3, 1, 1], [2, 1], POS), S('water', '', [44, 50], [34, 38], [6, 3, 2], [5, 2], NEG)
    ],
    kpis: [
      { icon: 'store', label: 'Wet markets watched', value: { TN: 8, TG: 6 }, note: 'Poultry and meat markets' },
      { icon: 'confirmed', label: 'Meat inspections', t: 'meat' },
      { icon: 'xcircle', label: 'Meat rejected', t: 'meat', where: { res: 'pos' } },
      { icon: 'flask', label: 'Milk tests positive', t: 'milk', where: { res: 'pos' } },
      { icon: 'droplets', label: 'Water samples tested', t: 'water', pct: { where: { res: 'pos' }, label: 'unsafe' } }
    ],
    sections: [
      { title: 'Trend and location', sub: 'Inspections and tests done by city corporations', layout: 'wide', charts: [
        { kind: 'trend', title: 'Checks per week', source: 'Municipal Corporation registers, GHMC Veterinary Wing', measures: [
          { label: 'Meat inspections', cap: 'Poultry and meat inspections at slaughterhouses each week', t: 'meat' },
          { label: 'Milk tests', cap: 'Brucellosis milk tests in commercial milk units each week', t: 'milk' },
          { label: 'Water samples', cap: 'Drinking-water samples examined each week', t: 'water' }] },
        { kind: 'rank', title: 'Checks by city', cap: 'Highest first, with share of the total', source: 'Municipal Corporation registers', measures: [
          { label: 'Meat inspections', t: 'meat' }, { label: 'Milk tests', t: 'milk' }, { label: 'Water samples', t: 'water' }] }] },
      { title: 'Results of checks', sub: 'How many failed in this period', layout: 'full', charts: [
        { kind: 'donuts', source: 'Corporation registers, Coimbatore Water Analysis Lab', centre: 'failed', items: [
          { title: 'Meat inspections', t: 'meat', unit: 'consignments inspected', parts: [['pos', 'Rejected', '#8a3f57'], ['neg', 'Passed', '#e3e6ec']], centre: 'rejected' },
          { title: 'Milk tests for Brucellosis', t: 'milk', unit: 'milk samples tested', parts: [['pos', 'Positive', '#8a3f57'], ['neg', 'Negative', '#e3e6ec']], centre: 'positive' },
          { title: 'Drinking-water samples', t: 'water', unit: 'samples examined', parts: [['pos', 'Unsafe', '#8a3f57'], ['neg', 'Safe', '#e3e6ec']], centre: 'unsafe' }] }] }
    ]
  };

  /* ------------------------------------------------------------------ Food Safety and Standards Authority of India */
  var FS_TN = [['Chennai', 0], ['Coimbatore', 0], ['Erode', 0], ['Salem', 0], ['Namakkal', 0]], FS_TG = [['Hyderabad', 0], ['Sangareddy', 0], ['Medak', 0], ['Ranga Reddy', 0]];
  var FAIL = [['pos', 'Failed', '#8a3f57'], ['neg', 'Passed', '#e3e6ec']];
  function failed(why) { return { set: { res: 'pos' }, attrs: { why: why } }; }
  var MILK_WHY = [['adult', .34], ['water', .28], ['bact', .24], ['drug', .14]], MEAT_WHY = [['path', .34], ['bact', .3], ['drug', .22], ['metal', .14]];
  var fssai = {
    id: 'fssai', short: 'Food Safety (FSSAI)', en: 'Food Safety and Standards Authority of India', hi: 'भारतीय खाद्य सुरक्षा और मानक प्राधिकरण',
    filters: PLACE, dists: { TN: FS_TN, TG: FS_TG },
    streams: [
      S('milk', '', [4, 5], [2, 3], [2, 1, 1, 1, 0], [2, 1, 0, 0], failed(MILK_WHY)), S('milk', '', [118, 131], [86, 97], [6, 5, 4, 3, 3], [8, 3, 2, 3], NEG),
      S('meat', '', [2, 3], [3, 4], [1, 1, 0, 0, 1], [2, 1, 0, 1], failed(MEAT_WHY)), S('meat', '', [64, 72], [70, 81], [6, 4, 2, 2, 3], [9, 3, 2, 3], NEG),
      S('dead', '', [1, 2], [1, 1], [1, 1, 0, 0, 0], [1, 0, 0, 0])
    ],
    kpis: [
      { icon: 'flask', label: 'Food samples tested', t: ['milk', 'meat'], pct: { where: { res: 'pos' }, label: 'failed' } },
      { icon: 'milk', label: 'Milk samples failed', t: 'milk', where: { res: 'pos' } },
      { icon: 'beef', label: 'Meat samples failed', t: 'meat', where: { res: 'pos' } },
      { icon: 'pill', label: 'Drug residues found', t: ['milk', 'meat'], where: { why: 'drug' } },
      { icon: 'alert', label: 'Dead-animal meat', t: 'dead' }
    ],
    sections: [
      { title: 'Trend and location', sub: 'Food samples tested, and where they were collected', layout: 'wide', charts: [
        { kind: 'trend', title: 'Samples tested per week', source: 'Food Analysis Laboratory, SADH, GHMC, PVNRTVU', measures: [
          { label: 'Milk samples', cap: 'Milk samples tested each week', t: 'milk' },
          { label: 'Meat samples', cap: 'Meat samples tested each week', t: 'meat' },
          { label: 'Failed', cap: 'Milk and meat samples that failed the safety tests each week', t: ['milk', 'meat'], where: { res: 'pos' } }] },
        { kind: 'rank', title: 'Samples by district', cap: 'Highest first, with share of the total', source: 'Food Analysis Laboratory, SADH, GHMC, PVNRTVU', measures: [
          { label: 'Milk samples', t: 'milk' }, { label: 'Meat samples', t: 'meat' }, { label: 'Failed', t: ['milk', 'meat'], where: { res: 'pos' } }] }] },
      { title: 'Test results', sub: 'How many samples failed the safety tests', layout: 'full', charts: [
        { kind: 'donuts', source: 'Food Analysis Laboratory, SADH, GHMC, PVNRTVU', items: [
          { title: 'Milk', t: 'milk', unit: 'milk samples tested', parts: FAIL, note: 'Tests: bacterial count, adulterants, added water, antibiotic residues' },
          { title: 'Meat', t: 'meat', unit: 'meat samples tested', parts: FAIL, note: 'Tests: pathogens, bacterial count, drug residues, heavy metals' }] }] },
      { title: 'Why samples failed', sub: 'Main reason recorded for each failed sample', layout: 'full', charts: [
        { kind: 'bars', source: 'Food Analysis Laboratory, SADH, GHMC, PVNRTVU', unit: 'samples', groups: [
          { title: 'Milk', rows: [['Adulterants found', 'milk', { why: 'adult' }], ['Added water', 'milk', { why: 'water' }], ['High bacterial count', 'milk', { why: 'bact' }], ['Antibiotic residues', 'milk', { why: 'drug' }]] },
          { title: 'Meat', rows: [['Pathogens found (such as Salmonella)', 'meat', { why: 'path' }], ['High bacterial count', 'meat', { why: 'bact' }], ['Veterinary drug residues', 'meat', { why: 'drug' }], ['Heavy metals', 'meat', { why: 'metal' }]] }] }] }
    ]
  };

  /* ------------------------------------------------------------------ Pollution Control Board */
  var P_TN = [['Chennai', 0], ['Coimbatore', 0], ['Erode', 0], ['Salem', 0], ['The Nilgiris', 1]], P_TG = [['Hyderabad', 0], ['Sangareddy', 0], ['Medak', 1], ['Ranga Reddy', 0], ['Nagarkurnool', 1]];
  var STD = [['pos', 'Failed', '#8a3f57'], ['neg', 'Passed', '#e3e6ec']];
  var pcb = {
    id: 'pcb', short: 'Pollution Control Board', en: 'Pollution Control Board', hi: 'प्रदूषण नियंत्रण बोर्ड',
    filters: PLACE, dists: { TN: P_TN, TG: P_TG },
    streams: [
      S('water', '', [2, 3], [1, 2], [1, 1, 1, 0, 0], [1, 1, 0, 0, 0], POS), S('water', '', [52, 58], [44, 49], [5, 4, 3, 3, 2], [6, 4, 2, 3, 2], NEG),
      S('surface', '', [1, 2], [2, 2], [1, 0, 1, 0, 0], [1, 1, 0, 0, 0], POS), S('surface', '', [30, 34], [26, 30], [4, 3, 3, 2, 2], [4, 3, 2, 2, 2], NEG),
      S('industry', '', [3, 4], [4, 6], [2, 1, 1, 0, 0], [2, 3, 0, 1, 0]),
      S('contam', '', [2, 3], [2, 4], [1, 1, 1, 0, 0], [1, 2, 0, 1, 0])
    ],
    meas: {
      pm25: { unit: 'µg/m³', dp: 0, TN: [[30, 48], [24, 40], [22, 36], [24, 38], [10, 18]], TG: [[34, 58], [36, 62], [22, 36], [30, 50], [18, 30]] },
      no2: { unit: 'µg/m³', dp: 0, TN: [[20, 32], [16, 26], [14, 22], [15, 24], [6, 11]], TG: [[24, 38], [22, 36], [13, 21], [19, 30], [10, 17]] },
      so2: { unit: 'µg/m³', dp: 0, TN: [[8, 14], [6, 11], [6, 10], [6, 11], [3, 6]], TG: [[8, 15], [10, 18], [5, 9], [7, 12], [4, 8]] },
      co: { unit: 'mg/m³', dp: 1, TN: [[.7, 1.3], [.6, 1.1], [.5, .9], [.5, 1], [.2, .5]], TG: [[.8, 1.5], [.8, 1.4], [.5, .9], [.7, 1.2], [.4, .7]] }
    },
    kpis: [
      { icon: 'wind', label: 'PM2.5 (fine dust)', m: 'pm25', agg: 'avg' },
      { icon: 'droplets', label: 'Water samples tested', t: ['water', 'surface'], pct: { where: { res: 'pos' }, label: 'failed' } },
      { icon: 'xcircle', label: 'Water samples failed', t: ['water', 'surface'], where: { res: 'pos' } },
      { icon: 'factory', label: 'Industrial pollution', t: 'industry' },
      { icon: 'alert', label: 'Contamination reports', t: 'contam' }
    ],
    sections: [
      { title: 'Air quality', sub: 'Fine dust (PM2.5) at the monitoring stations', layout: 'wide', charts: [
        { kind: 'meas', title: 'PM2.5 per week', cap: 'Average of the selected districts', unit: 'µg/m³', source: 'State Pollution Control Board monitoring stations', series: [{ m: 'pm25', name: 'PM2.5', type: 'bar', color: '#5b6678' }] },
        { kind: 'mrank', title: 'PM2.5 by district', cap: 'Average for this period, highest first', m: 'pm25', agg: 'avg', color: '#5b6678', source: 'State Pollution Control Board monitoring stations' }] },
      { title: 'Other gases in the air', sub: 'Weekly averages for the selected districts', layout: 'two', charts: [
        { kind: 'meas', title: 'Nitrogen dioxide and sulphur dioxide', cap: 'Weekly average', unit: 'µg/m³', source: 'State Pollution Control Board monitoring stations', series: [
          { m: 'no2', name: 'Nitrogen dioxide', type: 'line', color: '#c2410c' }, { m: 'so2', name: 'Sulphur dioxide', type: 'line', color: '#2a66a8' }] },
        { kind: 'meas', title: 'Carbon monoxide', cap: 'Weekly average', unit: 'mg/m³', source: 'State Pollution Control Board monitoring stations', series: [{ m: 'co', name: 'Carbon monoxide', type: 'line', color: '#7a2fa8' }] }] },
      { title: 'Water quality and pollution reports', sub: 'Water samples tested, and reports received by the Board', layout: 'wide', charts: [
        { kind: 'donuts', title: 'Water samples', cap: 'Share of samples that failed the quality test', source: 'State Pollution Control Board, Institute of Preventive Medicine', items: [
          { title: 'Water quality', t: 'water', unit: 'samples tested', parts: STD },
          { title: 'Surface water (rivers, lakes)', t: 'surface', unit: 'samples tested', parts: STD }] },
        { kind: 'rank', title: 'Pollution reports by district', cap: 'Highest first, with share of the total', source: 'State Pollution Control Board', measures: [
          { label: 'Industrial', t: 'industry' }, { label: 'Contamination', t: 'contam' }] }] }
    ]
  };

  return { mohfw: mohfw, dahd: dahd, forest: forest, imd: imd, icar: icar, municipal: municipal, fssai: fssai, pcb: pcb };
})();
