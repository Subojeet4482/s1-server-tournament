// Servers & Control tab: everything the Telegram bot can do, from the panel.
// Browser -> /api/lb/* (this panel's server, owner login) -> load balancer /lb/admin/*  (the LB admin key never reaches the browser)
const $ = (id) => document.getElementById(id);
const esc = (s) => A.esc(s);
const ST = { data: null, timer: null, busy: false };
const NAMES = { s1: 'Account', s2: 'History', s3: 'Chat & Games', s4: 'Backup (all-in-one)', s5: 'Fraud check' };
const ago = (t) => { if (!t) return '—'; const s = Math.max(0, Math.round((Date.now() - t) / 1000)); return s < 60 ? s + 's ago' : s < 3600 ? Math.round(s / 60) + 'm ago' : s < 86400 ? Math.round(s / 3600) + 'h ago' : Math.round(s / 86400) + 'd ago'; };
const upt = (s) => { if (!s) return '—'; const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60); return d ? d + 'd ' + h + 'h' : h ? h + 'h ' + m + 'm' : m + 'm'; };
const host = (u) => String(u || '').replace(/^https?:\/\//, '');
const call = async (path, body) => { try { return await A.api(path, body === undefined ? {} : { body }); } catch (e) { A.toast(e.message || 'Error', 'err'); return null; } };

const sw = (id, on, fn) => `<label class="sw"><input type="checkbox" id="${id}" ${on ? 'checked' : ''} onchange="${fn}"><i></i></label>`;

function serverCard(id, s) {
  if (!s.url) {
    return `<div class="srv-card srv-empty"><div class="srv-top"><div><div class="srv-name">${id.toUpperCase()} <small>${NAMES[id]}</small></div><div class="srv-url">URL set nahi hai</div></div>
      <button class="btn btn-primary mini" onclick="A.srvEditUrl('${id}')"><i class="fa-solid fa-plus"></i> Add URL</button></div></div>`;
  }
  const state = s.mode === 'off' ? ['off', 'OFF'] : s.up === true ? ['ok', 'ONLINE'] : s.up === false ? ['bad', 'DOWN'] : ['wait', 'CHECKING'];
  const tr = s.traffic || {}, avg = tr.req ? Math.round(tr.ms / tr.req) : 0;
  const mode = (m, l) => `<button class="seg-btn ${s.mode === m ? 'on' : ''}" onclick="A.srvMode('${id}','${m}')">${l}</button>`;
  return `<div class="srv-card ${state[0]}">
    <div class="srv-top"><div><div class="srv-name">${id.toUpperCase()} <small>${NAMES[id]}</small> ${s.maintenance ? '<span class="pill warn">MAINTENANCE</span>' : ''}</div>
      <div class="srv-url" title="${esc(s.url)}">${esc(host(s.url))} <span class="srv-src">${s.urlSource === 'app' ? '· set from panel/bot' : '· env'}</span></div></div>
      <span class="srv-badge ${state[0]}"><i></i>${state[1]}</span></div>
    <div class="srv-stats"><div><b>${s.latencyMs != null ? s.latencyMs + ' ms' : '—'}</b><small>latency</small></div><div><b>${tr.req || 0}</b><small>requests</small></div>
      <div><b>${tr.err || 0}</b><small>errors</small></div><div><b>${avg ? avg + ' ms' : '—'}</b><small>avg</small></div><div><b>${upt(s.uptime)}</b><small>uptime</small></div></div>
    ${s.error ? `<div class="srv-err"><i class="fa-solid fa-triangle-exclamation"></i> ${esc(String(s.error).slice(0, 140))}</div>` : ''}
    <div class="seg srv-seg">${mode('auto', 'Auto')}${mode('on', 'Force ON')}${mode('off', 'OFF')}</div>
    <div class="srv-actions">
      <label class="srv-sw">${sw('mt-' + id, !!s.maintenance, `A.srvMaint('${id}',this.checked)`)}<span>Maintenance</span></label>
      <button class="btn btn-outline mini" onclick="A.srvEditUrl('${id}')"><i class="fa-solid fa-link"></i> URL</button>
      <button class="btn btn-outline mini" onclick="A.srvCheck()"><i class="fa-solid fa-rotate"></i></button>
    </div></div>`;
}

function featureRows(list) {
  return list.map((f) => `<div class="feat ${f.off ? 'off' : ''}">
      <div class="feat-l"><b>${esc(f.label)}</b><small>${f.off ? '⛔ OFF — players see: ' + esc(f.message || f.default) : '✅ working'}</small></div>
      <div class="feat-r"><button class="btn btn-outline mini" title="Message" onclick="A.srvFeatMsg('${f.key}')"><i class="fa-solid fa-pen"></i></button>${sw('ft-' + f.key, !f.off, `A.srvFeature('${f.key}',this.checked)`)}</div></div>`).join('');
}

function render() {
  const d = ST.data, root = $('srv-root');
  if (!d) return;
  const sv = d.servers, ids = Object.keys(sv), up = ids.filter((i) => sv[i].url && sv[i].up && sv[i].mode !== 'off').length, set = ids.filter((i) => sv[i].url).length;
  const S = d.settings;
  const hero = S.appMaintenance ? ['maint', '🚧', 'App is in MAINTENANCE', 'Players see the maintenance screen'] : S.readOnly ? ['ro', '🧊', 'Read-only mode', 'Deposits, withdrawals, joins and games are frozen'] :
    up === set && set ? ['ok', '🟢', 'All systems running', `${up} of ${set} servers online`] : set ? ['warn', '🟠', 'Some servers are down', `${up} of ${set} servers online`] : ['warn', '⚙️', 'Setup needed', 'Add your server URLs below'];
  const off = d.features.filter((f) => f.off).length;
  root.innerHTML = `
  <div class="srv-hero ${hero[0]}"><div class="srv-hero-ic">${hero[1]}</div><div><div class="srv-hero-t">${hero[2]}</div><div class="srv-hero-s">${hero[3]}${off ? ' · ' + off + ' feature(s) switched off' : ''}${S.ipBlock.length ? ' · ' + S.ipBlock.length + ' IP blocked' : ''}</div></div>
    <button class="btn btn-outline mini" onclick="A.srvLoad(true)"><i class="fa-solid fa-rotate"></i></button></div>

  <div class="sec-title">Servers</div>
  <div class="srv-grid">${ids.map((i) => serverCard(i, sv[i])).join('')}</div>
  <div class="card srv-add">
    <div class="card-h"><i class="fa-solid fa-circle-plus" style="color:var(--primary)"></i> Add servers by URL</div>
    <div class="muted" style="margin-bottom:10px">Render URLs paste karo — ek ya saare (har URL nayi line me). Har URL se poochta hoon <i>“tum kaun sa server ho?”</i> aur khud S1…S5 me sahi jagah save kar deta hoon.</div>
    <textarea class="inp" id="srv-urls" rows="3" placeholder="https://ff-s1.onrender.com&#10;https://ff-s2.onrender.com"></textarea>
    <button class="btn btn-primary btn-full" id="srv-add-btn" onclick="A.srvAddUrls()"><i class="fa-solid fa-wand-magic-sparkles"></i> Detect &amp; save</button>
    <div id="srv-add-out"></div>
    ${d.stateStoreFromEnv ? '' : '<div class="warn" style="margin-top:12px">⚠️ S4 ka URL load balancer ke Render env me bhi daalo (<b>S4_URL</b>). Saved settings S4 me rehti hain — restart ke baad LB ko S4 pehle se pata hona chahiye.</div>'}
  </div>

  <div class="sec-title">Control</div>
  <div class="card">
    <div class="ctl-row"><div><b>🚧 App maintenance</b><small>Poora app band — players ko message dikhta hai</small></div>${sw('ctl-maint', S.appMaintenance, 'A.srvSetting({appMaintenance:this.checked})')}</div>
    <input class="inp" id="ctl-msg" placeholder="Maintenance message (optional)" value="${esc(S.maintMsg)}" style="margin:10px 0 0" onchange="A.srvSetting({maintMsg:this.value})">
    <div class="ctl-row"><div><b>🧊 Read-only mode</b><small>Deposit / withdraw / join / games freeze, sirf padhna chalega</small></div>${sw('ctl-ro', S.readOnly, 'A.srvSetting({readOnly:this.checked})')}</div>
  </div>
  <div class="card"><div class="card-h">Feature switches <span class="muted">— turant, har player ke liye</span></div>${featureRows(d.features)}</div>

  <div class="sec-title">Security</div>
  <div class="card">
    <div class="ctl-row"><div><b>🔐 Domain check</b><small>Sirf registered https domains API use kar sakte hain</small></div>${sw('ctl-dc', S.domainCheck, 'A.srvSetting({domainCheck:this.checked})')}</div>
    <div class="ctl-row"><div><b>🔔 Telegram alerts</b><small>Server DOWN / UP par message</small></div>${sw('ctl-al', S.alerts, 'A.srvSetting({alerts:this.checked})')}</div>
    <div class="ctl-row"><div><b>⏱ Rate limit</b><small>requests / minute / IP</small></div><input class="inp" id="ctl-rl" type="number" min="20" max="100000" value="${S.rateLimit}" style="width:110px;margin:0;text-align:center" onchange="A.srvSetting({rateLimit:+this.value})"></div>
  </div>
  <div class="card"><div class="card-h">⛔ Blocked IPs <span class="muted">(${S.ipBlock.length})</span></div>
    ${S.ipBlock.map((ip) => `<div class="row"><div class="row-t">${esc(ip)}</div><button class="btn btn-outline mini" onclick="A.srvIp('unblock','${esc(ip)}')">Unblock</button></div>`).join('') || '<div class="muted">Koi IP block nahi hai.</div>'}
    <div class="srv-inline"><input class="inp" id="ip-new" placeholder="203.0.113.7" style="margin:0"><button class="btn btn-danger" onclick="A.srvIp('block')">Block</button></div>
    ${d.noisy.length ? `<div class="muted" style="margin:14px 0 6px">🔥 Most rate-limited IPs</div>${d.noisy.map(([ip, c]) => `<div class="row"><div><div class="row-t">${esc(ip)}</div><div class="row-s">${c}× rate limited</div></div>${S.ipBlock.includes(ip) ? '<span class="pill err">blocked</span>' : `<button class="btn btn-outline mini" onclick="A.srvIp('block','${esc(ip)}')">Block</button>`}</div>`).join('')}` : ''}
  </div>

  <div class="sec-title">Domains</div>
  <div class="card">
    ${d.domains.map((x) => `<div class="row"><div><div class="row-t">${esc(x.host)}</div><div class="row-s">${x.active ? '✅ active' : '⏸ disabled'} · added ${ago(x.addedAt)}</div></div>
      <div class="row-btns"><button class="btn btn-outline mini" onclick="A.srvDomain('toggle','${esc(x.host)}')">${x.active ? 'Disable' : 'Enable'}</button><button class="btn btn-outline mini" onclick="A.srvDomain('remove','${esc(x.host)}')"><i class="fa-solid fa-trash"></i></button></div></div>`).join('') || '<div class="muted">Koi domain add nahi hai.</div>'}
    <div class="srv-inline"><input class="inp" id="dom-new" placeholder="yourdomain.com" style="margin:0"><button class="btn btn-primary" onclick="A.srvDomain('add')">Add</button></div>
    <div class="muted" style="margin-top:8px">Koi site key nahi — domain registered + active + https ho to chalega.</div>
    ${d.rejected.length ? `<div class="muted" style="margin:14px 0 6px">🚫 Recently rejected</div>${d.rejected.map((r) => `<div class="kv"><span>${esc(r.origin || r.host || '')}</span><span>${esc(r.reason || '')} · ${r.count || 1}×</span></div>`).join('')}` : ''}
  </div>

  <div class="sec-title">Activity log</div>
  <div class="card">${d.events.map((e) => `<div class="log-row"><span class="log-ic">${({ down: '🔴', up: '🟢', ban: '🚫', unban: '✅', ip: '⛔', wallet: '💰', referral: '🤝', game: '🎮', control: '🎛', server: '🖥', render: '⏻', domain: '🌐' })[e.kind] || '•'}</span><div><div class="log-t">${esc(e.text)}</div><div class="log-s">${ago(e.t)}${e.who ? ' · ' + esc(e.who) : ''}</div></div></div>`).join('') || '<div class="muted">Abhi kuch record nahi hai.</div>'}</div>
  <div class="muted" style="text-align:center;padding:6px 0 18px">Load balancer uptime ${upt(d.stats.uptime)} · allowed ${d.stats.allowed || 0} · rate limited ${d.stats.rateLimited || 0}</div>`;
}

Object.assign(A, {
  async srvLoad(force) {
    if (ST.busy && !force) return;
    ST.busy = true;
    const root = $('srv-root');
    try {
      const r = await A.api('/api/lb/overview');
      ST.data = r; render();
    } catch (e) {
      if (!ST.data) root.innerHTML = `<div class="card"><div class="card-h"><i class="fa-solid fa-plug-circle-xmark" style="color:#ef4444"></i> Load balancer se connect nahi hua</div><div class="warn">${esc(e.message)}</div>
        <div class="muted">Is service ke Render <b>Environment</b> me ye 2 values daalo:<br><b>LB_URL</b> = tumhare load balancer ka URL<br><b>LB_ADMIN_KEY</b> = load balancer ki <b>LB_ADMIN_KEY</b> wali value (same)<br>Phir save karke redeploy.</div>
        <button class="btn btn-primary btn-full" style="margin-top:12px" onclick="A.srvLoad(true)">Retry</button></div>`;
      else A.toast(e.message, 'err');
    }
    ST.busy = false;
    clearTimeout(ST.timer);
    if ($('tab-servers').classList.contains('show')) ST.timer = setTimeout(() => A.srvLoad(), 15000);
  },
  srvOpen() { A.srvLoad(true); },
  async srvMode(id, mode) { const r = await call('/api/lb/server/' + id, { mode }); if (r) { A.toast(id.toUpperCase() + ' → ' + mode.toUpperCase()); A.srvLoad(true); } },
  async srvMaint(id, on) { const r = await call('/api/lb/server/' + id, { maintenance: on }); if (r) { A.toast(id.toUpperCase() + ' maintenance ' + (on ? 'ON' : 'OFF')); A.srvLoad(true); } },
  async srvCheck() { A.toast('Checking…'); await call('/api/lb/check', {}); A.srvLoad(true); },
  async srvSetting(patch) { const r = await call('/api/lb/settings', patch); if (r) { A.toast('Saved ✓'); A.srvLoad(true); } },
  async srvFeature(key, on) { const r = await call('/api/lb/settings', { features: { [key]: on } }); if (r) { A.toast(key + ' → ' + (on ? 'ON' : 'OFF')); A.srvLoad(true); } },
  async srvFeatMsg(key) {
    const f = ST.data.features.find((x) => x.key === key);
    const v = prompt('Message jab "' + f.label + '" OFF ho (khali = default):', f.message || '');
    if (v === null) return;
    const r = await call('/api/lb/settings', { featureMsg: { [key]: v } }); if (r) { A.toast('Message saved ✓'); A.srvLoad(true); }
  },
  async srvIp(action, ip) {
    ip = ip || ($('ip-new') && $('ip-new').value.trim());
    if (!ip) return A.toast('IP likho', 'err');
    const r = await call('/api/lb/ip', { action, ip }); if (r) { A.toast(action === 'block' ? 'IP blocked' : 'IP unblocked'); A.srvLoad(true); }
  },
  async srvDomain(action, h) {
    h = h || ($('dom-new') && $('dom-new').value.trim());
    if (!h) return A.toast('Domain likho', 'err');
    if (action === 'remove' && !confirm('Domain "' + h + '" hata dein? Is domain se app band ho jayega.')) return;
    const r = await call('/api/lb/domains', { action, host: h }); if (r) { A.toast('Done ✓'); A.srvLoad(true); }
  },
  async srvEditUrl(id) {
    const cur = (ST.data.servers[id].url || '');
    const v = prompt(id.toUpperCase() + ' (' + NAMES[id] + ') ka URL (khali chhodo = hata do):', cur);
    if (v === null) return;
    if (!v.trim()) { if (cur && confirm(id.toUpperCase() + ' ka URL hata dein?')) { await call('/api/lb/server-url', { sid: id, clear: true }); A.srvLoad(true); } return; }
    A.toast('URL check ho raha hai…');
    const det = await call('/api/lb/detect', { url: v });
    if (!det) return;
    if (det.ok && det.server !== id && !confirm('Ye URL ' + det.server.toUpperCase() + ' ka lag raha hai, ' + id.toUpperCase() + ' ka nahi. Phir bhi ' + id.toUpperCase() + ' me save karein?')) return;
    if (!det.ok && !confirm(det.error + '\n\nPhir bhi save karein?')) return;
    const r = await call('/api/lb/server-url', { sid: id, url: v }); if (r) { A.toast('Saved ✓'); A.srvLoad(true); }
  },
  async srvAddUrls() {
    const urls = [...new Set(($('srv-urls').value || '').split(/[\s,]+/).map((x) => x.trim()).filter(Boolean))].slice(0, 8);
    if (!urls.length) return A.toast('URL likho', 'err');
    const btn = $('srv-add-btn'); btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Checking…';
    const out = [];
    await Promise.all(urls.map(async (u) => {
      try { const r = await A.api('/api/lb/server-url', { body: { url: u } }); out.push(`<div class="add-ok">✅ <b>${esc((r.sid || '').toUpperCase())}</b> ← ${esc(host(u))}</div>`); }
      catch (e) { out.push(`<div class="add-bad">❌ ${esc(host(u))}<small>${esc(e.message)}</small></div>`); }
    }));
    btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Detect & save';
    $('srv-add-out').innerHTML = out.join(''); A.srvLoad(true);
  },
});

// dashboard strip: one line with the live status, filled quietly when the panel opens
A.srvStrip = async function () {
  const el = $('sys-strip'); if (!el) return;
  try {
    const d = await A.api('/api/lb/overview'), sv = d.servers, ids = Object.keys(sv), set = ids.filter((i) => sv[i].url), up = set.filter((i) => sv[i].up && sv[i].mode !== 'off').length;
    const st = d.settings.appMaintenance ? ['maint', 'Maintenance ON'] : d.settings.readOnly ? ['ro', 'Read-only'] : up === set.length && set.length ? ['ok', 'All systems running'] : ['warn', 'Check servers'];
    el.className = 'sys-strip ' + st[0];
    el.innerHTML = `<i class="sys-dot"></i><b>${st[1]}</b><span>${up}/${set.length || 0} servers online</span><em>Open <i class="fa-solid fa-chevron-right"></i></em>`;
    el.classList.remove('hidden');
  } catch (e) { el.classList.add('hidden'); }
};
