/* National One Health Mission wheel — reproduced from psa.gov.in/oneHealthMission exactly:
   the Mission wheel (goals + emblem) in the centre with the partner organisations placed around it
   using the website's own angles and per-node offsets. The whole scene is scaled to fit the section
   width. Assets are the official SVGs in assets/nohm-wheel/. This section uses the Mission's own
   blue-green identity, as the client asked. */
(function () {
  'use strict';
  var host = document.getElementById('wheel-host');
  if (!host) return;
  var B = 'assets/nohm-wheel/';

  /* the 18 nodes, in the website's order; angle = -90deg at the top, then +20deg clockwise */
  var NODES = [
    { f: 'psa.svg', alt: 'Office of the Principal Scientific Adviser to the Government of India' },
    { f: 'image2.svg', alt: 'Indian Council of Medical Research (ICMR)' },
    { f: 'image3.svg', alt: 'Partner organisation' },
    { f: 'image4.svg', alt: 'Indian Space Research Organisation (ISRO)' },
    { f: 'image5.svg', alt: 'Ministry of Chemicals and Fertilizers' },
    { f: 'image6.svg', alt: 'Department of Biotechnology (DBT)' },
    { f: 'image7.svg', alt: 'National Centre for Disease Control (NCDC)' },
    { f: 'image8.svg', alt: 'State Government' },
    { f: 'image9.svg', alt: 'Ministry of Earth Sciences (MoES)' },
    { f: 'image10.svg', alt: 'Ministry of Health and Family Welfare' },
    { f: 'image11.svg', alt: 'Ministry of Science and Technology' },
    { f: 'image12.svg', alt: 'Department of Animal Husbandry and Dairying' },
    { f: 'image13.svg', alt: 'NITI Aayog' },
    { f: 'image14.svg', alt: 'Ministry of AYUSH' },
    { f: 'image15.svg', alt: 'Indian Council of Agricultural Research (ICAR)' },
    { f: 'image16.svg', alt: 'Council of Scientific and Industrial Research (CSIR)' },
    { f: 'image17.svg', alt: 'Partner organisation' },
    { f: 'image18.svg', alt: 'Ministry of Women and Child Development' }
  ];

  /* which wheel organisations are one of our eight departments (these open their detail page) */
  var DEPT = { 'image10.svg': 'mohfw', 'image12.svg': 'dahd', 'image15.svg': 'icar' };

  var nodeHtml = NODES.map(function (n, i) {
    var ang = -90 + i * 20;
    var a = n.alt.replace(/"/g, '&quot;');
    var dept = DEPT[n.f];
    var attrs = dept
      ? 'href="ministry.html?id=' + dept + '"'
      : 'href="#" data-toast="' + a + ' — page to be added soon"';
    return '<div class="oh-node-wrapper" style="--angle:' + ang + 'deg">' +
      '<a class="oh-label-bubble node-id-' + (i + 1) + (dept ? ' is-dept' : '') + '" ' + attrs +
        ' data-name="' + a + '" aria-label="' + a + (dept ? ', open department page' : ', page to be added soon') + '">' +
        '<img src="' + B + n.f + '" alt="" loading="lazy">' +
      '</a></div>';
  }).join('');

  host.innerHTML =
    '<div class="owh-stage"><div class="owh-scene" role="img" aria-label="National One Health Mission: the four goals, the One Health emblem, and the partner organisations around them">' +
      '<div class="oh-center-core"><img src="' + B + 'onehealthlatest.svg" alt="National One Health Mission: the four Mission goals and the One Health emblem"></div>' +
      nodeHtml +
    '</div></div>' +
    '<p class="owh-legend">The National One Health Mission brings human, animal and environmental health together under four goals, with partner ministries and organisations working as one system. Source: Office of the Principal Scientific Adviser, Government of India (psa.gov.in).</p>';

  /* scale the fixed 900px design to the section width (the stage is kept square by CSS aspect-ratio) */
  var DESIGN = 900;
  var stage = host.querySelector('.owh-stage');
  var scene = host.querySelector('.owh-scene');
  function fit() {
    var w = stage.clientWidth;
    if (!w) return;
    scene.style.transform = 'scale(' + (w / DESIGN) + ')';
  }
  fit();
  window.addEventListener('resize', fit);
  if (window.ResizeObserver) { new ResizeObserver(fit).observe(stage); }

  /* hover / focus tooltip showing the organisation name (crisp, outside the scaled scene) */
  var card = host.closest('.owh') || host;
  var tip = document.createElement('div');
  tip.className = 'owh-tip';
  card.appendChild(tip);
  function showTip(b) {
    var isDept = b.classList.contains('is-dept');
    tip.innerHTML = '<b>' + b.getAttribute('data-name') + '</b><span>' + (isDept ? 'View details →' : 'Page coming soon') + '</span>';
    var cr = card.getBoundingClientRect(), br = b.getBoundingClientRect();
    tip.style.left = (br.left + br.width / 2 - cr.left) + 'px';
    tip.style.top = (br.top - cr.top - 10) + 'px';
    tip.classList.add('show');
  }
  function hideTip() { tip.classList.remove('show'); }
  host.addEventListener('mouseover', function (e) { var b = e.target.closest('.oh-label-bubble'); if (b) showTip(b); });
  host.addEventListener('mouseout', function (e) { var b = e.target.closest('.oh-label-bubble'); if (b) hideTip(); });
  host.addEventListener('focusin', function (e) { var b = e.target.closest('.oh-label-bubble'); if (b) showTip(b); });
  host.addEventListener('focusout', hideTip);
})();
