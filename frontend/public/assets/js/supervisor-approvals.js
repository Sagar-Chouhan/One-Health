/* COHV Supervisor — Approvals engine.
   Concept and content follow the project manager's supervisor-approvals screen: three queues a
   supervisor clears — Volunteer registrations, Alert escalations, Report verification — with the
   same columns, statuses, severity levels, alert stages and departments. The design is the portal's
   own (band, segmented control, .tbl tables, our tags and buttons, our colours). One supervisor =
   own team only, from window.COHV. Registration status, alerts and reports are sample figures built
   deterministically from the roster (the workbooks carry no case data yet); severity is amber→orange,
   never red. */
(function () {
  'use strict';
  if (!window.COHV) return;
  var $ = function (s) { return document.querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); };

  var sess = {}; try { sess = JSON.parse(sessionStorage.getItem('oh_session') || '{}') || {}; } catch (e) {}
  var supId = sess.supId || new URLSearchParams(location.search).get('sup') || 'SUP-034';
  var sup = (window.COHV.supervisors || []).filter(function (s) { return s.id === supId; })[0] || (window.COHV.supervisors || [])[0];
  if (!sup) return;
  var team = (window.COHV.volunteers || []).filter(function (v) { return v.supervisorId === sup.id; });

  $('#sup-showing').innerHTML = 'Showing <b>' + esc(sup.title) + '</b> · <b>' + esc(sup.pillarLabel) + ' · ' + team.length + ' volunteer' + (team.length === 1 ? '' : 's') + '</b> · <b>' + esc(sup.block) + ', ' + esc(sup.district) + ', Telangana</b>';

  /* deterministic helper so the same supervisor always sees the same queues */
  function h(s) { var n = 0; for (var i = 0; i < String(s).length; i++) n = (n * 31 + String(s).charCodeAt(i)) >>> 0; return n; }
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function niceDate(dmy) { var m = String(dmy || '').split('.'); return m.length === 3 ? (+m[0]) + ' ' + (MON[(+m[1]) - 1] || '') + ' ' + m[2] : (dmy || '—'); }
  function initials(name) { return name.split(/\s+/).map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase(); }

  /* tag: a compact square-cornered label in our palette (never a pill chip) */
  var TAGS = {
    'Active': ['#e7f1eb', '#15803d'], 'Awaiting approval': ['#fdeedd', '#b4530c'], 'Suspended': ['#eceff3', '#475569'], 'Rejected': ['#eceff3', '#475569'], 'Inactive': ['#eceff3', '#475569'],
    'Low': ['#fef6e6', '#b45309'], 'Moderate': ['#fde4c3', '#92400e'], 'High': ['#fdd3a5', '#9a3412'], 'Critical': ['#f7b878', '#7c2d12'],
    'Submitted': ['#efe9f3', '#5b4b7a'], 'Under review': ['#e4edf7', '#1e40af'], 'Verified': ['#e7f1eb', '#15803d'], 'Returned for correction': ['#fdeedd', '#b4530c'], 'Escalated': ['#fdd3a5', '#9a3412'], 'Closed': ['#eceff3', '#475569']
  };
  function tag(label) { var c = TAGS[label] || ['#eceff3', '#475569']; return '<span class="atag" style="--bg:' + c[0] + ';--fg:' + c[1] + '">' + esc(label) + '</span>'; }

  /* ---------------- 1. Volunteer registrations — approve / activate / account status ---------------- */
  var regs = team.map(function (v) {
    var r = h(v.id) % 100, st = r < 18 ? 'Awaiting approval' : r < 90 ? 'Active' : 'Suspended';
    return { id: v.id, name: v.name, village: v.village, registered: niceDate(v.joinDate), status: st };
  });
  function regButtons(a) {
    if (a.status === 'Awaiting approval') return '<button class="abtn pri" data-act="activate">Approve &amp; activate</button><button class="abtn" data-act="reject">Reject</button>';
    if (a.status === 'Active') return '<button class="abtn" data-act="deactivate">Deactivate</button><button class="abtn" data-act="suspend">Suspend</button>';
    return '<button class="abtn" data-act="reinstate">Reinstate</button>';
  }
  function renderRegs() {
    var body = $('#regs-body');
    body.innerHTML = regs.length ? regs.map(function (a) {
      return '<tr data-id="' + a.id + '">' +
        '<td><span class="who"><span class="who-i">' + esc(initials(a.name)) + '</span><span><b>' + esc(a.name) + '</b><small class="rid">' + esc(a.id) + '</small></span></span></td>' +
        '<td>' + esc(a.village) + '</td><td>' + esc(a.registered) + '</td>' +
        '<td>' + tag(a.status) + '</td>' +
        '<td><span class="acts">' + regButtons(a) + '</span></td></tr>';
    }).join('') : '<tr><td colspan="5" class="empty">No volunteers in your team yet.</td></tr>';
    $('#cnt-regs').textContent = regs.filter(function (a) { return a.status === 'Awaiting approval'; }).length;
  }
  function regAct(id, act) {
    var a = regs.filter(function (x) { return x.id === id; })[0]; if (!a) return;
    a.status = act === 'activate' ? 'Active' : act === 'reject' ? 'Rejected' : act === 'deactivate' ? 'Inactive' : act === 'suspend' ? 'Suspended' : 'Active';
    renderRegs();
  }

  /* ---------------- 2. Alert escalations — alerts raised by your COHVs ---------------- */
  var STAGES = ['COHV', 'Supervisor', 'Relevant department', 'District One Health', 'Response', 'Follow-up', 'Closure'];
  var DEPTS = ['Health Dept (BMO)', 'Animal Husbandry Dept (BVO)', 'Forest Dept (DFO)', 'District One Health Cell', 'Panchayati Raj', 'IMD Health-Met', 'SPCB'];
  var CATS = {
    human: ['Cluster of fever cases', 'Suspected food poisoning', 'Rise in jaundice cases'],
    animal: ['Unusual cattle deaths', 'Poultry die-off', 'Goats with mouth sores'],
    wildlife: ['Dead wild birds found', 'Monkey deaths near forest', 'Wild boar carcass reported'],
    environment: ['Water source contamination', 'Mosquito surge after rain', 'Dead fish in village tank']
  };
  var SEVS = ['Low', 'Moderate', 'High', 'Critical'];
  var alerts = team.filter(function (v, i) { return h(v.id + 'a') % 5 === 0; }).slice(0, 8).map(function (v, i) {
    var seed = h(v.id + 'alert'), list = CATS[v.pillar] || CATS.human;
    var stageIdx = [1, 1, 1, 2, 4][seed % 5]; /* most sit at Supervisor (your action) */
    return {
      id: 'ALT-' + String(1207 + (seed % 700)), cat: list[seed % list.length], vol: v.name, volId: v.id,
      sev: SEVS[seed % 4], village: v.village, stageIdx: stageIdx, dept: stageIdx >= 2 ? DEPTS[seed % DEPTS.length] : ''
    };
  });
  function renderAlerts() {
    var body = $('#alerts-body');
    body.innerHTML = alerts.length ? alerts.map(function (a) {
      var atYou = a.stageIdx === 1;
      var escTo = a.dept ? '<small class="rid">Sent to</small><br>' + esc(a.dept)
        : '<select class="asel" data-dept="' + a.id + '"><option value="">Select department…</option>' + DEPTS.map(function (d) { return '<option>' + esc(d) + '</option>'; }).join('') + '</select>';
      var act = a.dept ? '<button class="abtn" data-act="advance" data-id="' + a.id + '">Advance stage</button>'
        : '<button class="abtn pri" data-act="notify" data-id="' + a.id + '">Notify department</button>';
      return '<tr data-id="' + a.id + '">' +
        '<td><b>' + esc(a.cat) + '</b><br><small class="rid">' + esc(a.id) + '</small></td>' +
        '<td><b>' + esc(a.vol) + '</b><br><small class="rid">' + esc(a.volId) + '</small></td>' +
        '<td>' + tag(a.sev) + '</td><td>' + esc(a.village) + '</td>' +
        '<td><small class="rid">Stage ' + (a.stageIdx + 1) + ' of ' + STAGES.length + '</small><br><b>' + esc(STAGES[a.stageIdx]) + '</b>' + (atYou ? ' · you' : '') + '</td>' +
        '<td>' + escTo + '</td>' +
        '<td><span class="acts">' + act + '<button class="abtn" data-act="details" data-id="' + a.id + '">Details</button></span></td></tr>';
    }).join('') : '<tr><td colspan="7" class="empty">No open alerts from your team.</td></tr>';
    $('#cnt-alerts').textContent = alerts.filter(function (a) { return a.stageIdx === 1; }).length;
  }
  function alertAct(id, act) {
    var a = alerts.filter(function (x) { return x.id === id; })[0]; if (!a) return;
    if (act === 'notify') { var sel = $('.asel[data-dept="' + id + '"]'); var d = sel && sel.value; if (!d) { sel && sel.focus(); return; } a.dept = d; a.stageIdx = 2; }
    else if (act === 'advance') { a.stageIdx = Math.min(STAGES.length - 1, a.stageIdx + 1); }
    renderAlerts();
  }

  /* ---------------- 3. Report verification — records your COHVs submitted ---------------- */
  var RSTATES = ['Submitted', 'Under review', 'Verified', 'Returned for correction', 'Escalated', 'Closed'];
  var RTYPES = { human: 'Weekly health surveillance', animal: 'Animal health check', wildlife: 'Wildlife sighting log', environment: 'Water quality sample' };
  var reports = team.filter(function (v) { return h(v.id + 'r') % 3 === 0; }).slice(0, 12).map(function (v) {
    var seed = h(v.id + 'rep');
    return { id: 'REC-' + String(48210 + (seed % 9000)), vol: v.name, type: RTYPES[v.pillar] || RTYPES.human, village: v.village, cap: (1 + seed % 15) + ' Oct 2026', state: RSTATES[seed % RSTATES.length] };
  });
  function renderReports() {
    var body = $('#verify-body');
    body.innerHTML = reports.length ? reports.map(function (r) {
      var opts = '<option value="">Change to…</option>' + RSTATES.filter(function (s) { return s !== r.state; }).map(function (s) { return '<option>' + esc(s) + '</option>'; }).join('');
      return '<tr data-id="' + r.id + '">' +
        '<td><small class="rid">' + esc(r.id) + '</small></td><td><b>' + esc(r.vol) + '</b></td><td>' + esc(r.type) + '</td>' +
        '<td>' + esc(r.village) + '</td><td>' + esc(r.cap) + '</td>' +
        '<td>' + tag(r.state) + '</td>' +
        '<td><select class="asel" data-rep="' + r.id + '">' + opts + '</select></td></tr>';
    }).join('') : '<tr><td colspan="7" class="empty">No reports from your team this period.</td></tr>';
    $('#cnt-verify').textContent = reports.filter(function (r) { return r.state === 'Submitted' || r.state === 'Under review'; }).length;
  }
  function reportSet(id, val) { var r = reports.filter(function (x) { return x.id === id; })[0]; if (r && val) { r.state = val; renderReports(); } }

  renderRegs(); renderAlerts(); renderReports();

  /* one delegated click + change handler for the whole page */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-act]'); if (!b) return;
    var act = b.getAttribute('data-act');
    if (act === 'details') return;
    var row = b.closest('tr'), id = b.getAttribute('data-id') || (row && row.getAttribute('data-id'));
    if (['activate', 'reject', 'deactivate', 'suspend', 'reinstate'].indexOf(act) >= 0) regAct(id, act);
    else alertAct(id, act);
  });
  document.addEventListener('change', function (e) {
    var sel = e.target;
    if (sel.hasAttribute && sel.hasAttribute('data-rep')) reportSet(sel.getAttribute('data-rep'), sel.value);
  });

  /* segmented control — switch queues; honour ?seg= from the dashboard tiles */
  function activate(name) {
    var btn = document.querySelector('.seg button[data-seg="' + name + '"]'); if (!btn) return;
    [].forEach.call(document.querySelectorAll('.seg button'), function (x) { x.setAttribute('aria-pressed', x === btn ? 'true' : 'false'); });
    [].forEach.call(document.querySelectorAll('.appr-pane'), function (p) { p.hidden = p.id !== 'pane-' + name; });
  }
  [].forEach.call(document.querySelectorAll('.seg button'), function (b) { b.addEventListener('click', function () { activate(b.dataset.seg); }); });
  var initial = new URLSearchParams(location.search).get('seg');
  activate(initial && document.querySelector('.seg button[data-seg="' + initial + '"]') ? initial : 'regs');
})();
