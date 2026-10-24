/* One Health portal — shared demo data.
   Departments, data sources and indicator values follow the PM prototype
   (data/config.js and home.html). Figures are illustrative for the pilot demo. */
window.OH = (function () {
  var PILLARS = [
    { key: 'human',  en: 'Human Health',  hi: 'मानव स्वास्थ्य', ico: 'heart',     about: 'Ministries reporting on people: cases, hospitals, labs and urban and rural health.' },
    { key: 'animal', en: 'Animal Health', hi: 'पशु स्वास्थ्य',  ico: 'paw',       about: 'Ministries reporting on livestock and poultry: outbreaks, testing and vaccination.' },
    { key: 'env',    en: 'Environmental Health', hi: 'पर्यावरणीय स्वास्थ्य',      ico: 'leaf',      about: 'Departments reporting on forests, wildlife, weather and pollution.' }
  ];

  /* status: live = arriving on schedule, late = later than expected */
  var SOURCES = [
    { code: 'IDSP-IHIP',             m: 'mohfw',  freq: 'Real-time', st: 'live', at: '01 Oct, 10:18', role: 'Disease surveillance: case investigation, event alerts and lab-confirmed cases' },
    { code: 'HMIS',                  m: 'mohfw',  freq: 'Real-time', st: 'live', at: '01 Oct, 10:05', role: 'Health facility indicators and drug stocks' },
    { code: 'e-Sushruth',            m: 'mohfw',  freq: 'Real-time', st: 'live', at: '01 Oct, 10:11', role: 'Telangana hospital records: patients, vitals and clinical notes' },
    { code: 'Telangana Diagnostics', m: 'mohfw',  freq: 'Daily',     st: 'live', at: '01 Oct, 06:00', role: 'State diagnostics network: blood counts for KFD work-up' },
    { code: 'IPM Hyderabad',         m: 'mohfw',  freq: 'Daily',     st: 'live', at: '01 Oct, 06:00', role: 'Institute of Preventive Medicine: pathology for KFD' },
    { code: 'ICMR-VRDL',             m: 'mohfw',  freq: 'Daily',     st: 'live', at: '01 Oct, 07:30', role: 'Virus research labs: IgM ELISA, RT-PCR and culture confirmation' },
    { code: 'RCH',                   m: 'mohfw',  freq: 'Weekly',    st: 'live', at: '29 Sep, 18:00', role: 'Reproductive and child health data used for Brucellosis' },
    { code: 'Municipal Corporation', m: 'municipal',  freq: 'Weekly',    st: 'late', at: '23 Sep, 17:00', role: 'Wet markets, slaughterhouses and animal waste disposal' },
    { code: 'GHMC Veterinary Wing',  m: 'municipal',  freq: 'Weekly',    st: 'late', at: '22 Sep, 16:30', role: 'Hyderabad food testing and urban veterinary screening' },
    { code: 'Bharat Pashudhan',      m: 'dahd', freq: 'Daily',     st: 'live', at: '01 Oct, 09:50', role: 'Livestock registry, vaccination and disease reporting' },
    { code: '1962 Helpline App',     m: 'dahd', freq: 'Real-time', st: 'live', at: '01 Oct, 10:02', role: 'Animal helpline: tick infestation and dead-bird reports' },
    { code: 'State DAH',             m: 'dahd', freq: 'Weekly',    st: 'live', at: '28 Sep, 15:00', role: 'State Animal Husbandry department field data' },
    { code: 'Livestock Census',      m: 'dahd', freq: '5-yearly',  st: 'live', at: '2024 census', role: 'Poultry, cattle and buffalo population' },
    { code: 'ICAR-NIHSAD',           m: 'dahd', freq: 'Daily',     st: 'live', at: '01 Oct, 08:40', role: 'High-security animal disease lab, Bhopal: bird flu confirmation' },
    { code: 'Animal Disease Lab',    m: 'dahd', freq: 'Daily',     st: 'live', at: '01 Oct, 07:15', role: 'State and district labs: RBPT, ELISA and PCR tests' },
    { code: 'SADH',                  m: 'dahd', freq: 'Weekly',    st: 'late', at: '19 Sep, 12:00', role: 'State Animal Disease Hospital: milk and meat testing' },
    { code: 'PVNRTVU',               m: 'dahd', freq: 'Weekly',    st: 'live', at: '27 Sep, 14:00', role: 'Veterinary university, Telangana: milk and meat quality tests' },
    { code: 'NADRES',                m: 'icar',  freq: 'Monthly',   st: 'live', at: '28 Sep, 11:00', role: 'Animal disease forewarning system (ICAR-NIVEDI)' },
    { code: 'Ministry of Environment, Forest and Climate Change', m: 'forest', freq: 'Weekly',    st: 'late', at: '22 Sep, 10:00', role: 'Monkey deaths, wildlife testing and migratory birds' },
    { code: 'Food Analysis Laboratory', m: 'fssai', freq: 'Weekly', st: 'live', at: '29 Sep, 16:00', role: 'Milk and meat samples tested for food safety' },
    { code: 'SPCB Monitoring Stations', m: 'pcb', freq: 'Daily', st: 'live', at: '01 Oct, 06:00', role: 'Air and water quality readings from State Pollution Control Board stations' },
    { code: 'Mausam (IMD)',          m: 'imd',   freq: '3-hourly',  st: 'live', at: '01 Oct, 08:30', role: 'Temperature, rainfall, wind and humidity' },
  ];

  /* The eight departments shown on the dashboard, in this order. level: crit / elev / watch / ok */
  var MINISTRIES = [
    { id: 'mohfw', p: 'human', short: 'MoHFW', en: 'Ministry of Health and Family Welfare', hi: 'स्वास्थ्य एवं परिवार कल्याण मंत्रालय',
      kpi: '27', unit: 'KFD lab-confirmed human cases',
      ind: [
        { n: 'Lab-confirmed KFD cases', v: '27', u: 'cases', l: 'crit', w: 'The Nilgiris forest fringe, season to date', s: 'IDSP-IHIP, ICMR-VRDL' },
        { n: 'Brucellosis cases among dairy workers', v: '40', u: 'cases', l: 'elev', w: 'Erode and Salem dairy belt; Medak', s: 'HMIS, IDSP-IHIP' },
        { n: 'People with flu-like illness after poultry exposure', v: '11', u: 'under watch', l: 'elev', w: 'Coimbatore and Sangareddy', s: 'IDSP-IHIP' },
        { n: 'Fever with confusion (KFD warning sign)', v: '20', u: 'cases', l: 'watch', w: 'Nilgiris and Kotagiri PHCs; Nagarkurnool', s: 'IDSP-IHIP' },
        { n: 'Monkey bite cases', v: '34', u: 'cases', l: 'watch', w: 'Nilgiris and Gudalur ranges; Nallamala forest', s: 'IDSP-IHIP' },
        { n: 'People bitten by ticks', v: '58', u: 'people', l: 'watch', w: 'Nilgiris forest-fringe PHCs; Amrabad PHC', s: 'HMIS, e-Sushruth' },
        { n: 'Oseltamivir (flu medicine) in stock', v: '21,100', u: 'doses', l: 'ok', w: 'Namakkal, Coimbatore, Sangareddy, Medak', s: 'HMIS' }
      ] },
    { id: 'dahd', p: 'animal', short: 'DAHD', en: 'Department of Animal Husbandry & Dairying', hi: 'पशुपालन और डेयरी विभाग',
      kpi: '18', unit: 'poultry farms with confirmed bird flu',
      ind: [
        { n: 'Poultry farms with confirmed bird flu', v: '18', u: 'farms', l: 'crit', w: 'Patancheru block, Sangareddy', s: 'State DAH, ICAR-NIHSAD' },
        { n: 'Herds testing positive for Brucellosis', v: '5.2%', u: 'of samples', l: 'elev', w: 'Erode dairy belt; Medak', s: 'Animal Disease Lab' },
        { n: 'Poultry farms registered', v: '8,420', u: 'farms', l: 'elev', w: 'Namakkal (TN); Sangareddy and Medchal (TG)', s: 'State DAH' },
        { n: 'Late-pregnancy abortions in livestock', v: '73', u: 'cases', l: 'watch', w: 'Erode and Salem; Medak and Ranga Reddy', s: 'Bharat Pashudhan' },
        { n: 'Cattle with tick infestation', v: '112', u: 'animals', l: 'watch', w: 'Nilgiris and Sathyamangalam; Amrabad', s: 'Bharat Pashudhan' },
        { n: 'Sick monkeys reported near grazing areas', v: '6', u: 'reports', l: 'watch', w: 'Kotagiri, Gudalur, Amrabad', s: 'State DAH' },
        { n: 'Calves vaccinated against Brucellosis (S19)', v: '1,240', u: 'calves', l: 'ok', w: 'Erode, Salem, Namakkal, Medak', s: 'Bharat Pashudhan' }
      ] },
    { id: 'forest', p: 'env', short: 'MoEFCC', en: 'Ministry of Environment, Forest and Climate Change', hi: 'पर्यावरण, वन और जलवायु परिवर्तन मंत्रालय',
      kpi: '6', unit: 'monkey deaths reported by forest officers',
      ind: [
        { n: 'Monkey deaths reported', v: '6', u: 'events', l: 'elev', w: 'Kotagiri, Gudalur (TN); Mannanur, Amrabad (TG)', s: 'Ministry of Environment, Forest and Climate Change' },
        { n: 'Migratory bird sites with activity', v: '3', u: 'sites', l: 'watch', w: 'Point Calimere, Vedanthangal, Kolleru fringe', s: 'Ministry of Environment, Forest and Climate Change' },
        { n: 'Wildlife samples awaiting test results', v: '24', u: 'samples', l: 'watch', w: 'Nilgiris and Nallamala ranges', s: 'Ministry of Environment, Forest and Climate Change' }
      ] },
    { id: 'imd', p: 'env', short: 'IMD', en: 'India Meteorological Department', hi: 'भारत मौसम विज्ञान विभाग',
      kpi: '42 mm', unit: 'highest rainfall in 24 hours (The Nilgiris)',
      ind: [
        { n: 'Highest rainfall in 24 hours', v: '42 mm', u: '32% above normal', l: 'watch', w: 'The Nilgiris', s: 'Mausam (IMD)' },
        { n: 'Relative humidity', v: '86%', u: 'favours ticks', l: 'watch', w: 'The Nilgiris', s: 'Mausam (IMD)' },
        { n: 'Highest temperature', v: '29 °C', u: 'within normal', l: 'ok', w: 'The Nilgiris', s: 'Mausam (IMD)' }
      ] },
    { id: 'icar', p: 'animal', short: 'ICAR', en: 'Indian Council of Agricultural Research', hi: 'भारतीय कृषि अनुसंधान परिषद',
      kpi: '3', unit: 'disease forewarnings issued (NADRES)',
      ind: [
        { n: 'Disease forewarnings issued this month', v: '3', u: 'forewarnings', l: 'elev', w: 'Bird flu: Namakkal, Sangareddy; Brucellosis: Erode', s: 'NADRES' },
        { n: 'Districts on the SMS alert list', v: '5', u: 'districts', l: 'watch', w: 'Tamil Nadu 3, Telangana 2', s: 'NADRES' }
      ] },
    { id: 'municipal', p: 'human', short: 'Municipal', en: 'Municipal Corporation', hi: 'नगर निगम',
      kpi: '14', unit: 'wet markets under watch',
      ind: [
        { n: 'Wet markets under watch', v: '14', u: 'markets', l: 'watch', w: 'Hyderabad, Chennai and Coimbatore', s: 'Municipal Corporation' },
        { n: 'Slaughterhouses inspected (30 days)', v: '22', u: 'inspections', l: 'ok', w: 'GHMC and Greater Chennai', s: 'Municipal Corporation' },
        { n: 'Food samples tested', v: '180', u: 'samples', l: 'ok', w: 'Hyderabad', s: 'GHMC Veterinary Wing' }
      ] },
    { id: 'fssai', p: 'human', short: 'FSSAI', en: 'Food Safety and Standards Authority of India', hi: 'भारतीय खाद्य सुरक्षा और मानक प्राधिकरण',
      kpi: '15', unit: 'food samples failed safety tests',
      ind: [
        { n: 'Food samples that failed safety tests', v: '15', u: 'samples', l: 'elev', w: 'Chennai, Coimbatore, Hyderabad', s: 'Food Analysis Laboratory' },
        { n: 'Milk and meat samples tested', v: '396', u: 'samples', l: 'ok', w: 'Both pilot states', s: 'Food Analysis Laboratory' },
        { n: 'Cases of meat from dead animals sold', v: '3', u: 'cases', l: 'watch', w: 'Chennai, Coimbatore, Hyderabad', s: 'Food Analysis Laboratory' }
      ] },
    { id: 'pcb', p: 'env', short: 'PCB', en: 'Pollution Control Board', hi: 'प्रदूषण नियंत्रण बोर्ड',
      kpi: '9', unit: 'water samples failed quality tests',
      ind: [
        { n: 'Water samples that failed quality tests', v: '9', u: 'samples', l: 'elev', w: 'Chennai, Coimbatore, Hyderabad, Sangareddy', s: 'SPCB Monitoring Stations' },
        { n: 'Industrial pollution reports', v: '10', u: 'reports', l: 'watch', w: 'Sangareddy, Hyderabad, Chennai', s: 'SPCB Monitoring Stations' },
        { n: 'Environmental contamination reports', v: '7', u: 'reports', l: 'watch', w: 'Both pilot states', s: 'SPCB Monitoring Stations' }
      ] }
  ];

  MINISTRIES.forEach(function (m) {
    m.sources = SOURCES.filter(function (s) { return s.m === m.id; });
    m.live = m.sources.filter(function (s) { return s.st === 'live'; }).length;
    m.late = m.sources.length - m.live;
    m.status = !m.sources.length ? 'off' : (!m.live ? 'late' : 'live');
    var last = m.sources.filter(function (s) { return s.st === 'live'; })[0] || m.sources[0];
    m.lastAt = last ? last.at : '';
  });

  return {
    PILLARS: PILLARS, SOURCES: SOURCES, MINISTRIES: MINISTRIES,
    LEVEL: { crit: 'Critical', elev: 'Elevated', watch: 'Watch', ok: 'Normal' },
    STATUS: { live: 'Live', late: 'Delayed', off: 'Not linked' },
    STATUS_HELP: { live: 'Data is arriving on schedule', late: 'Last update is later than expected', off: 'No data feed connected yet' },
    ministry: function (id) { return MINISTRIES.filter(function (m) { return m.id === id; })[0]; },
    pillar: function (k) { return PILLARS.filter(function (p) { return p.key === k; })[0]; }
  };
})();
