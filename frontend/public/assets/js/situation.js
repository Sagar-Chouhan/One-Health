/* National Situation at a Glance: what community volunteers (COHV) report, by pillar, for the last 30 days.
   Indicators follow section T of the project manager's volunteer checklist (active COHVs, alerts by sector, zoonotic alerts, referrals,
   follow-up, visits). Volunteer numbers by sector are the pilot pool in the project manager's supervisor data (Health 52+20, Veterinary 12+25,
   Wildlife 32+1). The other figures are sample figures. */
(function () {
  'use strict';
  var root = document.getElementById('gl-cards'), fbar = document.getElementById('gl-filter');
  if (!root || !fbar) return;
  function fmt(n) { return Number(n).toLocaleString('en-IN'); }

  /* one row per pillar: volunteers, visits, alerts, % alerts followed up, referrals, pending follow-ups, zoonotic alerts */
  var P = {
    human:  { vol: 72, visits: 1284, alerts: 46, fup: 87, ref: 63, pend: 9, zoo: 12 },
    animal: { vol: 37, visits: 642, alerts: 31, fup: 81, ref: 28, pend: 7, zoo: 9 },
    env:    { vol: 21, visits: 398, alerts: 14, fup: 79, ref: 11, pend: 4, zoo: 3 },
    wild:   { vol: 33, visits: 517, alerts: 11, fup: 91, ref: 6, pend: 2, zoo: 5 }
  };
  var COL = { human: 'var(--human)', animal: 'var(--animal)', env: 'var(--env)', wild: '#5f2d91' };
  var HEAD = {
    human: ['heart', 'Human Health', 'मानव स्वास्थ्य'], animal: ['paw', 'Animal Health', 'पशु स्वास्थ्य'],
    env: ['leaf', 'Environmental Health', 'पर्यावरणीय स्वास्थ्य'], wild: ['wild', 'Wildlife', 'वन्यजीव']
  };
  var KIND = { human: 'human health', animal: 'animal health', env: 'environmental', wild: 'wildlife' };

  function card(key, d, colour, on) {
    var h = HEAD[key];
    var sub = '<b>' + d.zoo + '</b> of them zoonotic';
    return '<article class="gc' + (on ? ' on' : '') + '" data-p="' + key + '" style="--pc:' + colour + '" aria-label="' + h[1] + '">' +
      '<header class="gc-h"><span class="ico" aria-hidden="true"><svg class="i"><use href="#i-' + h[0] + '"/></svg></span><span class="t"><b>' + h[1] + '</b><small>' + h[2] + '</small></span></header>' +
      '<div class="gc-b">' +
        '<div class="gc-k"><b class="num">' + fmt(d.alerts) + '</b><span>alerts reported by volunteers</span></div>' +
        '<p class="gc-s">' + sub + '</p>' +
        '<div class="gc-p"><div><span>Alerts followed up</span><b>' + d.fup + '%</b></div><i style="--w:' + d.fup + '%"></i></div>' +
        '<dl class="gc-g">' +
          '<div><dt>Active volunteers</dt><dd>' + fmt(d.vol) + '</dd></div><div><dt>Field visits</dt><dd>' + fmt(d.visits) + '</dd></div>' +
          '<div><dt>Referrals made</dt><dd>' + fmt(d.ref) + '</dd></div><div><dt>Pending follow-ups</dt><dd>' + fmt(d.pend) + '</dd></div>' +
        '</dl>' +
      '</div></article>';
  }

  var f = 'all';
  var ORDER = [['human', P.human, COL.human], ['animal', P.animal, COL.animal], ['env', P.env, COL.env], ['wild', P.wild, COL.wild]];
  function draw() {   /* all four pillars shown as separate cards; the filter highlights one */
    root.innerHTML = ORDER.map(function (o) { return card(o[0], o[1], o[2], f === o[0]); }).join('');
    root.classList.toggle('focus', f !== 'all');
  }
  [].forEach.call(fbar.querySelectorAll('button'), function (b) {
    b.addEventListener('click', function () {
      f = b.dataset.f;
      [].forEach.call(fbar.querySelectorAll('button'), function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      draw();
    });
  });
  draw();
})();
