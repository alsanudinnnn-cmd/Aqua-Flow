(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const fmt = new Intl.NumberFormat('en-MY', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  const pad = value => String(value).padStart(2, '0');
  let virtualNow = new Date();
  let currentFlow = 0;
  let todayUsage = 0;
  let monthUsage = 0;
  let currentPage = 1;
  let sortDirection = 'desc';
  let toastTimer;
  let dataSource = 'firebase';
  let firebaseConnected = false;
  let selectedRange = '1h';
  let pausedReadings = null;
  let pausedAt = null;
  let latestReading = null;
  let aggregateSeries = { daily: [], weekly: [], monthly: [] };
  const DEVICE_STALE_MS = 90000;
  let streamPaused = false;
  let pendingUsageReset = null;
  let usageModalTrigger = null;
  let latestFirebaseUsage = null;
  const pageSize = 8;

  const usageResetStorageKey = 'smartWaterUsageResets';
  let usageResetState = (() => {
    try {
      return Object.assign({ today: null, month: null }, JSON.parse(localStorage.getItem(usageResetStorageKey) || '{}'));
    } catch (error) {
      return { today: null, month: null };
    }
  })();

  const settings = (() => {
    try { return Object.assign({ threshold: 1 }, JSON.parse(localStorage.getItem('smartWaterSettings') || '{}')); }
    catch { return { threshold: 1 }; }
  })();
  const readings = [];
  const alerts = [];

  function svgIcon(id) {
    return `<svg aria-hidden="true"><use href="#${id}"/></svg>`;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  }

  function statusBadge(status) {
    const safeStatus = ['Normal', 'Warning', 'Possible Leakage', 'Resolved', 'Needs review', 'Active'].includes(status) ? status : 'Unknown';
    const cls = safeStatus === 'Normal' || safeStatus === 'Resolved' ? 'normal' : safeStatus === 'Warning' ? 'warning' : 'critical';
    return `<span class="status-badge ${cls}">${safeStatus}</span>`;
  }

  function updateNavAlertCount() {
    const badge = $('#navAlertCount');
    if (!badge) return;
    const activeCount = alerts.filter(alert => alert.status === 'Needs review' || alert.status === 'Active').length;
    badge.textContent = String(activeCount);
    badge.hidden = activeCount === 0;
    $('.notification-dot').hidden = activeCount === 0;
    const reviewBadge = $('#alertsNeedsReview');
    if (reviewBadge) {
      reviewBadge.textContent = activeCount ? `${activeCount} needs review` : 'No active alerts';
      reviewBadge.className = `status-badge ${activeCount ? 'warning' : 'normal'}`;
    }
  }

  function applyLeakageStatus(status) {
    const normalized = status === 'Possible Leakage' ? 'critical' : status === 'Warning' || status === 'Unknown' ? 'warning' : 'normal';
    const label = status === 'Unknown' ? 'STATUS UNKNOWN' : normalized === 'critical' ? 'FLOW DROP DETECTED' : normalized === 'warning' ? 'FLOW DROP WARNING' : 'SYSTEM NORMAL';
    const message = normalized === 'critical'
      ? 'Flow has dropped sharply from the learned baseline.'
      : status === 'Unknown' ? 'The device did not report a leakage status.'
      : normalized === 'warning'
        ? 'Flow is trending sharply below the learned baseline.'
        : 'No drastic flow drop detected.';
    $('#systemBadge').className = `status-badge ${normalized}`;
    $('#systemBadge').textContent = status === 'Unknown' ? 'Unknown' : normalized === 'critical' ? 'Possible drop' : normalized === 'warning' ? 'Watch' : 'Normal';
    $('#leakageLabel').textContent = label;
    $('#leakageMessage').textContent = message;
    $('#leakHero').className = `leak-hero ${normalized}`;
    $('#leakHeroTitle').textContent = label;
    $('#leakHeroText').textContent = message;
  }

  function showToast(message) {
    const toast = $('#toast');
    $('span', toast).textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
  }

  function persistUsageResets() {
    localStorage.setItem(usageResetStorageKey, JSON.stringify(usageResetState));
  }

  function usageTargetLabel(target) {
    return target === 'month' ? 'monthly' : 'today\'s';
  }

  function usageTargetValue(target) {
    return target === 'month' ? monthUsage : todayUsage;
  }

  function updateUsageMeta() {
    const todayMeta = $('#todayUsageMeta');
    const monthMeta = $('#monthUsageMeta');
    const isFirebaseData = dataSource === 'firebase';
    if (todayMeta) todayMeta.textContent = isFirebaseData && usageResetState.today?.manual ? 'Since last reset' : 'Since midnight';
    if (monthMeta) monthMeta.textContent = isFirebaseData && usageResetState.month?.manual ? 'Since last reset' : 'This month';
  }

  function updateUsageDisplay() {
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const monthKey = todayKey.slice(0, 7);
    const hasToday = latestReading?.isoDate === todayKey;
    const hasMonth = latestReading?.isoDate.startsWith(monthKey);
    $('#todayUsage').textContent = hasToday ? fmt.format(Math.max(0, todayUsage)) : '—';
    $('#monthUsage').textContent = hasMonth ? fmt.format(Math.max(0, monthUsage)) : '—';
    $('#todayCoverage').textContent = hasToday ? 'From device counter' : 'No readings today';
    $('#monthCoverage').textContent = hasMonth ? 'From device counter' : 'No readings this month';
    $$('[data-reset-target]').forEach(button => { button.disabled = !latestReading; });
    updateUsageMeta();
  }

  function openUsageResetModal(target, trigger) {
    if (!latestReading) return;
    pendingUsageReset = target;
    usageModalTrigger = trigger;
    const modal = $('#usageResetModal');
    $('#usageModalTitle').textContent = `Reset ${usageTargetLabel(target)} total?`;
    $('#usageModalDescription').textContent = target === 'month'
      ? 'This starts a new monthly baseline for the dashboard. Your Firebase sensor history will stay intact.'
      : 'This starts a new daily baseline for the dashboard. Your Firebase sensor history will stay intact.';
    $('#usageModalValue').textContent = `${fmt.format(usageTargetValue(target))} L`;
    modal.hidden = false;
    document.body.classList.add('modal-open');
    requestAnimationFrame(() => $('#usageModalConfirm').focus());
  }

  function closeUsageResetModal() {
    const modal = $('#usageResetModal');
    if (modal.hidden) return;
    modal.hidden = true;
    document.body.classList.remove('modal-open');
    pendingUsageReset = null;
    if (usageModalTrigger) usageModalTrigger.focus();
    usageModalTrigger = null;
  }

  function confirmUsageReset() {
    if (!pendingUsageReset) return;
    const target = pendingUsageReset;
    if (dataSource === 'firebase' && latestFirebaseUsage) {
      if (target === 'month') {
        usageResetState.month = { key: latestFirebaseUsage.monthKey, raw: latestFirebaseUsage.rawMonthly, manual: true };
        monthUsage = 0;
      } else {
        usageResetState.today = { date: latestFirebaseUsage.dayKey, raw: latestFirebaseUsage.rawTotal, manual: true };
        todayUsage = 0;
      }
    } else {
      if (target === 'month') monthUsage = 0;
      else todayUsage = 0;
    }
    persistUsageResets();
    updateUsageDisplay();
    closeUsageResetModal();
    showToast(`${target === 'month' ? 'Monthly' : 'Today\'s'} usage counter reset.`);
  }

  function setupUsageResets() {
    $$('[data-reset-target]').forEach(button => button.addEventListener('click', () => openUsageResetModal(button.dataset.resetTarget, button)));
    $('#usageModalConfirm').addEventListener('click', confirmUsageReset);
    $('#usageModalCancel').addEventListener('click', closeUsageResetModal);
    $('#usageModalClose').addEventListener('click', closeUsageResetModal);
    $$('[data-usage-modal-close]').forEach(item => item.addEventListener('click', closeUsageResetModal));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !$('#usageResetModal').hidden) closeUsageResetModal();
    });
  }

  function navigate(viewName, updateUrl = true) {
    const view = $(`[data-page="${viewName}"]`);
    if (!view) return;
    $$('.view').forEach(item => item.classList.toggle('active', item === view));
    $$('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.view === viewName));
    const title = $('.nav-item.active span:nth-child(2)')?.textContent || 'Smart Water Monitoring';
    $('#pageTitle').textContent = viewName === 'dashboard' ? 'Water observatory' : title;
    document.title = `${title} · AquaSense`;
    if (updateUrl) history.replaceState(null, '', `#${viewName}`);
    closeMenu();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      drawAllCharts();
      const heading = $('h2', view);
      if (heading) {
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      }
    }, 50);
  }

  function openMenu() {
    $('#sidebar').classList.add('open');
    $('#mobileScrim').classList.add('show');
    $('#menuButton').setAttribute('aria-expanded', 'true');
  }

  function closeMenu() {
    $('#sidebar').classList.remove('open');
    $('#mobileScrim').classList.remove('show');
    $('#menuButton').setAttribute('aria-expanded', 'false');
  }

  function setupNavigation() {
    $$('.nav-item').forEach(item => item.addEventListener('click', () => navigate(item.dataset.view)));
    $$('[data-view-link]').forEach(item => item.addEventListener('click', () => navigate(item.dataset.viewLink)));
    $('#menuButton').addEventListener('click', () => $('#sidebar').classList.contains('open') ? closeMenu() : openMenu());
    $('#mobileScrim').addEventListener('click', closeMenu);
    document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
    const initialView = location.hash.slice(1);
    if ($(`[data-page="${initialView}"]`)) navigate(initialView, false);
    window.addEventListener('hashchange', () => {
      const requestedView = location.hash.slice(1);
      if ($(`[data-page="${requestedView}"]`)) navigate(requestedView, false);
    });
  }

  function setupCanvas(canvas) {
    if (!canvas || canvas.offsetParent === null) return null;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(280, rect.width);
    const height = Math.max(180, rect.height);
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    const ctx = canvas.getContext('2d');
    ctx.scale(ratio, ratio);
    return { ctx, width, height };
  }

  function drawLineChart(canvas, values, labels, options = {}) {
    const setup = setupCanvas(canvas);
    if (!setup) return;
    const { ctx, width, height } = setup;
    if (!values.length) {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#607a84'; ctx.font = '13px "Work Sans", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('No readings in this range', width / 2, height / 2);
      canvas._chartPoints = []; canvas._chartValues = []; canvas._chartLabels = [];
      return;
    }
    const padArea = { left: 43, right: 16, top: 18, bottom: 31 };
    const plotW = width - padArea.left - padArea.right;
    const plotH = height - padArea.top - padArea.bottom;
    const max = options.max || Math.ceil(Math.max(...values, settings.threshold + 1) + .8);
    const min = 0;
    ctx.clearRect(0, 0, width, height);
    ctx.font = '10px "JetBrains Mono", "Cascadia Code", Consolas, monospace';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 4; i++) {
      const y = padArea.top + plotH * i / 4;
      ctx.strokeStyle = 'rgba(148,163,184,.3)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(padArea.left, y); ctx.lineTo(width - padArea.right, y); ctx.stroke();
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'right';
      ctx.fillText((max - (max - min) * i / 4).toFixed(1), padArea.left - 9, y);
    }
    if (options.threshold !== false) {
      const ty = padArea.top + plotH - (settings.threshold / max) * plotH;
      ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(181,107,21,.72)'; ctx.beginPath(); ctx.moveTo(padArea.left, ty); ctx.lineTo(width - padArea.right, ty); ctx.stroke(); ctx.setLineDash([]);
    }
    const points = values.map((value, i) => ({ x: padArea.left + plotW * i / Math.max(1, values.length - 1), y: padArea.top + plotH - ((value - min) / (max - min)) * plotH }));
    const gradient = ctx.createLinearGradient(0, padArea.top, 0, height - padArea.bottom);
    gradient.addColorStop(0, 'rgba(2,132,199,.18)'); gradient.addColorStop(1, 'rgba(2,132,199,0)');
    ctx.beginPath(); ctx.moveTo(points[0].x, height - padArea.bottom); points.forEach(p => ctx.lineTo(p.x, p.y)); ctx.lineTo(points.at(-1).x, height - padArea.bottom); ctx.closePath(); ctx.fillStyle = gradient; ctx.fill();
    ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.strokeStyle = options.color || '#0273a8'; ctx.lineWidth = 2.2; ctx.lineJoin = 'round'; ctx.stroke();
    const labelCount = Math.min(6, labels.length);
    ctx.fillStyle = '#64748b'; ctx.textAlign = 'center';
    for (let i = 0; i < labelCount; i++) {
      const index = Math.round(i * (labels.length - 1) / Math.max(1, labelCount - 1));
      ctx.fillText(labels[index], padArea.left + plotW * index / Math.max(1, labels.length - 1), height - 12);
    }
    canvas._chartPoints = points;
    canvas._chartValues = values;
    canvas._chartLabels = labels;
  }

  function drawBarChart(canvas, values, labels, options = {}) {
    const setup = setupCanvas(canvas);
    if (!setup) return;
    const { ctx, width, height } = setup;
    const area = { left: 43, right: 14, top: 16, bottom: 34 };
    const plotW = width - area.left - area.right;
    const plotH = height - area.top - area.bottom;
    const validValues = values.filter(value => Number.isFinite(value));
    if (!validValues.length) {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#607a84'; ctx.font = '13px "Work Sans", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('No recorded usage for this period', width / 2, height / 2);
      return;
    }
    const max = Math.max(1, Math.ceil(Math.max(...validValues) * 1.18 / 10) * 10);
    ctx.clearRect(0, 0, width, height);
    ctx.font = '10px "JetBrains Mono", "Cascadia Code", Consolas, monospace';
    for (let i = 0; i <= 4; i++) {
      const y = area.top + plotH * i / 4;
      ctx.strokeStyle = 'rgba(148,163,184,.3)'; ctx.beginPath(); ctx.moveTo(area.left, y); ctx.lineTo(width - area.right, y); ctx.stroke();
      ctx.fillStyle = '#64748b'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(Math.round(max - max * i / 4).toLocaleString(), area.left - 8, y);
    }
    const slot = plotW / values.length;
    const barW = Math.min(options.wide ? 46 : 28, slot * .54);
    values.forEach((value, i) => {
      if (!Number.isFinite(value)) {
        ctx.fillStyle = '#64748b'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(labels[i], area.left + slot * i + slot / 2, height - 13);
        return;
      }
      const x = area.left + slot * i + (slot - barW) / 2;
      const barH = value / max * plotH;
      const y = area.top + plotH - barH;
      const gradient = ctx.createLinearGradient(0, y, 0, area.top + plotH);
      gradient.addColorStop(0, options.color || '#0891b2'); gradient.addColorStop(1, options.colorEnd || 'rgba(8,145,178,.12)');
      roundedRect(ctx, x, y, barW, barH, 4); ctx.fillStyle = gradient; ctx.fill();
      ctx.fillStyle = '#64748b'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(labels[i], area.left + slot * i + slot / 2, height - 13);
    });
  }

  function roundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + width, y, x + width, y + height, r); ctx.arcTo(x + width, y + height, x, y + height, r); ctx.arcTo(x, y + height, x, y, r); ctx.arcTo(x, y, x + width, y, r); ctx.closePath();
  }

  function flowRowsInRange() {
    const hours = { '1h': 1, '6h': 6, '24h': 24 }[selectedRange] || 1;
    const cutoff = (pausedAt || Date.now()) - hours * 3600000;
    return (pausedReadings || readings).filter(row => row.sensorValid && row.timestamp.getTime() >= cutoff).reverse();
  }

  function drawAllCharts() {
    const rows = flowRowsInRange();
    const values = rows.map(row => row.flow);
    const labels = rows.map(row => `${pad(row.timestamp.getHours())}:${pad(row.timestamp.getMinutes())}`);
    drawLineChart($('#flowChart'), values, labels);
    drawLineChart($('#flowChartLarge'), values, labels);
    $('#flowSummaryLabel').textContent = streamPaused ? 'At pause' : 'Current';
    if (streamPaused) $('#chartCurrent').textContent = values.length ? values.at(-1).toFixed(2) : '—';
    $('#chartAverage').textContent = values.length ? (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2) : '—';
    $('#chartPeak').textContent = values.length ? Math.max(...values).toFixed(2) : '—';
    $('#flowChartCoverage').textContent = `${values.length} readings in ${selectedRange.toUpperCase()}${streamPaused ? ' · display paused' : ''}`;
    const daily = aggregateSeries.daily;
    const monthly = aggregateSeries.monthly;
    drawBarChart($('#dailyChart'), daily.map(bucket => bucket.value), daily.map(bucket => bucket.label));
    drawBarChart($('#monthlyChart'), monthly.map(bucket => bucket.value), monthly.map(bucket => bucket.label), { color: '#526bc0', colorEnd: 'rgba(82,107,192,.12)' });
    updateAnalyticsChart();
    updateAggregateSummaries();
  }

  function updateAggregateSummaries() {
    const days = aggregateSeries.daily;
    const observed = days.filter(bucket => Number.isFinite(bucket.value));
    const total = observed.reduce((sum, bucket) => sum + bucket.value, 0);
    const peak = observed.reduce((best, bucket) => !best || bucket.value > best.value ? bucket : best, null);
    $('#dailyInsightTitle').textContent = observed.length ? `${fmt.format(total)} L observed in 7 days` : 'No daily history yet';
    $('#dailyInsightDetail').textContent = `${observed.length} of 7 days have readings`;
    const months = aggregateSeries.monthly;
    const currentMonth = months.at(-1);
    $('#monthlyInsightTitle').textContent = currentMonth && Number.isFinite(currentMonth.value) ? `${fmt.format(currentMonth.value)} L this month` : 'No monthly history yet';
    $('#monthlyInsightDetail').textContent = `${months.filter(bucket => Number.isFinite(bucket.value)).length} months have readings`;
    $('#analyticsAverage').textContent = observed.length ? `${fmt.format(total / observed.length)} L` : '—';
    $('#analyticsAverageMeta').textContent = observed.length ? `Across ${observed.length} observed day${observed.length === 1 ? '' : 's'}` : 'Waiting for readings';
    $('#analyticsPeak').textContent = peak ? `${fmt.format(peak.value)} L` : '—';
    $('#analyticsPeakMeta').textContent = peak ? peak.label : 'Waiting for readings';
    $('#analyticsMonth').textContent = currentMonth && Number.isFinite(currentMonth.value) ? `${fmt.format(currentMonth.value)} L` : '—';
    $('#analyticsMonthMeta').textContent = currentMonth && Number.isFinite(currentMonth.value) ? 'From device monthly counter' : 'Waiting for readings';
  }

  function setupChartInteractions() {
    $('#flowChart').addEventListener('mousemove', event => {
      const canvas = event.currentTarget;
      const points = canvas._chartPoints || [];
      if (!points.length) return;
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const index = points.reduce((best, point, i) => Math.abs(point.x - x) < Math.abs(points[best].x - x) ? i : best, 0);
      const tooltip = $('#flowTooltip');
      tooltip.hidden = false;
      tooltip.style.left = `${points[index].x + 13}px`;
      tooltip.style.top = `${points[index].y + 8}px`;
      tooltip.innerHTML = `<strong>${canvas._chartValues[index].toFixed(2)} L/min</strong><br>${canvas._chartLabels[index]}`;
    });
    $('#flowChart').addEventListener('mouseleave', () => $('#flowTooltip').hidden = true);
    $$('.range-control button').forEach(button => button.addEventListener('click', () => {
      selectedRange = button.dataset.range;
      $$('.range-control').forEach(control => $$('button', control).forEach(item => item.classList.toggle('active', item.dataset.range === selectedRange)));
      drawAllCharts();
    }));
    $$('#analyticsPeriod button').forEach(button => button.addEventListener('click', () => {
      $$('#analyticsPeriod button').forEach(item => item.classList.toggle('active', item === button));
      updateAnalyticsChart();
    }));
    $('#streamToggle')?.addEventListener('click', event => {
      streamPaused = !streamPaused;
      pausedReadings = streamPaused ? [...readings] : null;
      pausedAt = streamPaused ? Date.now() : null;
      const button = event.currentTarget;
      button.setAttribute('aria-pressed', String(streamPaused));
      button.innerHTML = streamPaused
        ? `${svgIcon('i-play')}<span>Resume display</span>`
        : `${svgIcon('i-pause')}<span>Pause display</span>`;
      drawAllCharts();
      showToast(streamPaused ? 'Flow chart display paused. Statuses still update.' : 'Flow chart display resumed.');
    });
  }

  function updateAnalyticsChart() {
    const canvas = $('#analyticsMainChart');
    if (!canvas || canvas.offsetParent === null) return;
    const period = $('#analyticsPeriod .active')?.dataset.period || 'daily';
    const configs = {
      daily: { buckets: aggregateSeries.daily, kicker: 'Last 7 days', title: 'Daily consumption', color: '#0891b2' },
      weekly: { buckets: aggregateSeries.weekly, kicker: 'Last 8 weeks', title: 'Weekly consumption', color: '#0273a8' },
      monthly: { buckets: aggregateSeries.monthly, kicker: 'Last 8 months', title: 'Monthly consumption', color: '#526bc0' }
    };
    const config = configs[period];
    $('#analyticsKicker').textContent = config.kicker; $('#analyticsTitle').textContent = config.title;
    drawBarChart(canvas, config.buckets.map(bucket => bucket.value), config.buckets.map(bucket => bucket.label), { color: config.color, colorEnd: `${config.color}33`, wide: true });
  }

  function renderRecentReadings() {
    $('#recentReadings').innerHTML = readings.slice(0, 5).map(row => `<tr><td>${row.time}</td><td class="reading-flow">${Number.isFinite(row.flow) ? `${row.flow.toFixed(2)} L/min` : '—'}</td><td>${Number.isFinite(row.usage) ? `${row.usage.toFixed(1)} L` : '—'}</td><td>${statusBadge(row.status)}</td></tr>`).join('') || '<tr><td colspan="4">No sensor readings yet.</td></tr>';
  }

  function renderRecentAlerts() {
    $('#recentAlerts').innerHTML = alerts.slice(0, 3).map(alert => `<div class="alert-item"><span class="alert-icon ${alert.severity}">${svgIcon('i-alert')}</span><span><strong>${alert.severity === 'critical' ? 'Possible leakage detected' : 'Continuous flow warning'}</strong><small>${alert.date} · ${alert.duration} · ${alert.loss}</small></span><small>${escapeHtml(alert.status)}</small></div>`).join('') || '<p class="empty-list">No leakage alerts recorded.</p>';
    $('#alertHistoryBody').innerHTML = alerts.map(alert => `<tr><td>${alert.date}</td><td>${alert.start}</td><td>${alert.end}</td><td>${alert.duration}</td><td class="reading-flow">${alert.loss}</td><td>${statusBadge(alert.status)}</td></tr>`).join('') || '<tr><td colspan="6">No leakage alerts recorded.</td></tr>';
    updateNavAlertCount();
  }

  function filteredReadings() {
    const query = $('#tableSearch').value.trim().toLowerCase();
    const date = $('#dateFilter').value;
    const status = $('#statusFilter').value;
    return readings.filter(row => (!query || `${row.date} ${row.time} ${row.status} ${row.sensor}`.toLowerCase().includes(query)) && (!date || row.isoDate === date) && (status === 'all' || row.status === status)).sort((a, b) => sortDirection === 'desc' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp);
  }

  function renderHistory() {
    const filtered = filteredReadings();
    const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
    currentPage = Math.min(currentPage, pages);
    const start = (currentPage - 1) * pageSize;
    $('#historyBody').innerHTML = filtered.slice(start, start + pageSize).map(row => `<tr><td><strong>${row.date}</strong><br><small>${row.time}</small></td><td>${escapeHtml(row.sensor)}</td><td class="reading-flow">${Number.isFinite(row.flow) ? `${row.flow.toFixed(2)} L/min` : '—'}</td><td>${Number.isFinite(row.usage) ? `${row.usage.toFixed(1)} L` : '—'}</td><td>${statusBadge(row.status)}</td></tr>`).join('') || `<tr><td colspan="5">No sensor records match these filters.</td></tr>`;
    $('#paginationSummary').textContent = filtered.length ? `Showing ${start + 1}–${Math.min(start + pageSize, filtered.length)} of ${filtered.length} readings` : 'No readings found';
    $('#prevPage').disabled = currentPage === 1; $('#nextPage').disabled = currentPage === pages;
    $('#pageButtons').innerHTML = Array.from({ length: pages }, (_, i) => i + 1).slice(Math.max(0, currentPage - 3), currentPage + 2).map(page => `<button class="${page === currentPage ? 'active' : ''}" data-page-number="${page}" aria-label="Page ${page}">${page}</button>`).join('');
    $$('[data-page-number]').forEach(button => button.addEventListener('click', () => { currentPage = +button.dataset.pageNumber; renderHistory(); }));
  }

  function setupHistory() {
    ['tableSearch','dateFilter','statusFilter'].forEach(id => $(`#${id}`).addEventListener('input', () => { currentPage = 1; renderHistory(); }));
    $('#clearFilters').addEventListener('click', () => { $('#tableSearch').value = ''; $('#dateFilter').value = ''; $('#statusFilter').value = 'all'; currentPage = 1; renderHistory(); });
    $('#prevPage').addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderHistory(); } });
    $('#nextPage').addEventListener('click', () => { currentPage++; renderHistory(); });
    $('[data-sort="timestamp"]').addEventListener('click', () => { sortDirection = sortDirection === 'desc' ? 'asc' : 'desc'; renderHistory(); });
    $('#historyExport').addEventListener('click', exportCsv);
    $('#exportButton').addEventListener('click', exportCsv);
  }

  function exportCsv() {
    if (!readings.length) { showToast('No sensor readings to export yet.'); return; }
    const rows = [['Date','Time','Sensor','Flow Rate (L/min)','Water Usage (L)','Leakage Status'], ...filteredReadings().map(row => [row.date,row.time,row.sensor,row.flow,row.usage,row.status])];
    const csv = rows.map(row => row.map(value => `"${String(value ?? '').replaceAll('"','""')}"`).join(',')).join('\r\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = `smart-water-readings-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    showToast('Sensor data exported as CSV.');
  }

  function loadSettingsForm() {
    $('#flowThreshold').value = settings.threshold;
  }

  function setupSettings() {
    loadSettingsForm();
    $('#settingsForm').addEventListener('submit', event => {
      event.preventDefault();
      settings.threshold = +$('#flowThreshold').value;
      localStorage.setItem('smartWaterSettings', JSON.stringify(settings));
      drawAllCharts(); showToast('Chart reference saved.');
    });
    $('#resetSettings').addEventListener('click', () => {
      settings.threshold = 1;
      localStorage.setItem('smartWaterSettings', JSON.stringify(settings)); loadSettingsForm(); drawAllCharts(); showToast('Default chart reference restored.');
    });
  }

  function relativeTime(stamp) {
    if (!stamp) return 'No readings yet';
    const seconds = Math.max(0, Math.floor((Date.now() - stamp.getTime()) / 1000));
    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  function formatStamp(stamp) {
    return stamp ? new Intl.DateTimeFormat('en-MY', { dateStyle: 'medium', timeStyle: 'medium' }).format(stamp) : '—';
  }

  function setStatusBadge(id, online, onlineText, offlineText) {
    const badge = $(`#${id}`);
    badge.className = `status-text ${online ? 'online' : 'offline'}`;
    badge.innerHTML = `<i></i>${online ? onlineText : offlineText}`;
  }

  function updateSystemHealth() {
    const age = latestReading ? Date.now() - latestReading.timestamp.getTime() : Infinity;
    const deviceOnline = latestReading && age >= -30000 && age <= DEVICE_STALE_MS;
    const sensorOnline = Boolean(deviceOnline && latestReading.sensorValid);
    const available = Number(Boolean(deviceOnline)) + Number(sensorOnline) + Number(firebaseConnected);
    const percent = Math.round(available / 3 * 100);
    const summary = `${available} of 3 services available`;
    setStatusBadge('deviceStatusBadge', deviceOnline, 'Online', 'Offline');
    setStatusBadge('systemDeviceBadge', deviceOnline, 'Online', 'Offline');
    setStatusBadge('sensorStatusBadge', sensorOnline, 'Reporting', 'Offline');
    setStatusBadge('systemSensorBadge', sensorOnline, 'Reporting', 'Offline');
    $('#deviceDetail').textContent = deviceOnline ? `Latest report ${relativeTime(latestReading.timestamp)}` : latestReading ? `Last seen ${relativeTime(latestReading.timestamp)}` : 'Waiting for telemetry';
    $('#sensorDetail').textContent = sensorOnline ? 'Valid flow value in latest report' : 'No fresh valid flow report';
    $('#systemDeviceStatus').textContent = deviceOnline ? 'Online' : 'Offline';
    $('#systemDeviceId').textContent = latestReading?.deviceId || '—';
    $('#leakDeviceId').textContent = latestReading?.deviceId || '—';
    $('#systemHeartbeat').textContent = relativeTime(latestReading?.timestamp);
    $('#systemSensorStatus').textContent = sensorOnline ? 'Reporting' : 'Offline';
    $('#systemSensorReading').textContent = sensorOnline ? relativeTime(latestReading.timestamp) : 'No fresh valid reading';
    $('#systemFlow').textContent = sensorOnline ? `${latestReading.flow.toFixed(2)} L/min` : '—';
    $('#rtSensorStatus').textContent = sensorOnline ? 'Reporting' : 'Offline';
    $('#healthPercent').textContent = String(percent);
    $('#healthDescription').textContent = summary;
    $('#healthRing').style.setProperty('--health-percent', `${percent}%`);
    $('#healthRing').style.setProperty('--health-color', percent === 100 ? '#21835f' : percent === 0 ? '#c83f55' : '#b56b15');
    $('#sidebarHealthMeter').style.width = `${percent}%`;
    $('#sidebarHealthMeter').style.setProperty('--health-color', percent === 100 ? '#21835f' : percent === 0 ? '#c83f55' : '#b56b15');
    $('#sidebarHealthText').textContent = percent === 100 ? 'All systems operational' : percent === 0 ? 'Services unavailable' : 'Some services unavailable';
    $('#sidebarHealthMeta').textContent = summary;
    $('#sidebarHealthDot').className = `status-dot ${percent === 100 ? 'online' : 'offline'}`;
    for (const id of ['dashboardHealthBadge', 'systemOverallBadge']) {
      const badge = $(`#${id}`);
      badge.className = `status-badge ${percent === 100 ? 'normal' : 'warning'}`;
      badge.textContent = percent === 100 ? 'All operational' : `${available}/3 available`;
    }
    for (const id of ['dashboardStreamBadge', 'realtimeStreamBadge']) {
      const badge = $(`#${id}`);
      badge.classList.toggle('is-live', Boolean(sensorOnline && firebaseConnected));
      $('.status-dot', badge).className = `status-dot ${sensorOnline && firebaseConnected ? 'online pulse' : 'offline'}`;
      $('span:last-child', badge).textContent = sensorOnline && firebaseConnected ? 'Receiving telemetry' : 'Waiting for telemetry';
    }
    $('#flowLiveBadge').textContent = sensorOnline ? 'Live' : 'Offline';
    $('#flowIndicator').textContent = sensorOnline ? latestReading.flow > 0 ? 'Water is flowing' : 'No flow detected' : 'Waiting for sensor data';
    $('#lastUpdatedHeader').textContent = relativeTime(latestReading?.timestamp);
    $('#lastReceived').textContent = relativeTime(latestReading?.timestamp);
    $('#lastTimestamp').textContent = formatStamp(latestReading?.timestamp);
    $('#continuousDuration').textContent = relativeTime(latestReading?.timestamp);
    $('#leakReportedAt').textContent = formatStamp(latestReading?.timestamp);
    $('#leakReportedStatus').textContent = latestReading?.status || 'Unknown';
    $('#leakReportedBaseline').textContent = latestReading?.baselineFlow > 0 ? `${latestReading.baselineFlow.toFixed(2)} L/min` : 'Not reported';
    $('#rtLeakStatus').textContent = sensorOnline ? latestReading.status : 'Unknown';
    const leakTone = !sensorOnline ? 'warning' : latestReading.status === 'Normal' ? 'normal' : latestReading.status === 'Possible Leakage' ? 'critical' : 'warning';
    $('#leakPageBadge').className = `status-badge ${leakTone}`;
    $('#leakPageBadge').textContent = sensorOnline ? latestReading.status : 'Waiting for device';
    if (!sensorOnline) {
      $('#currentFlow').textContent = '—';
      $('#chartCurrent').textContent = '—';
      $('#flowDelta').textContent = '—';
      $('#rtFlow').textContent = '—';
      $('#leakFlow').textContent = '—';
      $('#systemBadge').className = 'status-badge warning';
      $('#systemBadge').textContent = 'Unknown';
      $('#leakageLabel').textContent = 'NO LIVE DATA';
      $('#leakageMessage').textContent = 'Waiting for a fresh sensor report.';
      $('#leakHeroTitle').textContent = 'NO LIVE DATA';
      $('#leakHeroText').textContent = 'Waiting for a fresh sensor report.';
      $('#leakHero').className = 'leak-hero warning';
    } else {
      applyLeakageStatus(latestReading.status);
    }
  }

  function updateTelemetryDom(previous) {
    const valid = Boolean(latestReading?.sensorValid);
    const flowText = valid ? latestReading.flow.toFixed(2) : '—';
    $('#currentFlow').textContent = flowText;
    $('#chartCurrent').textContent = flowText;
    $('#flowDelta').textContent = valid && Number.isFinite(previous) ? `${latestReading.flow - previous >= 0 ? '+' : ''}${(latestReading.flow - previous).toFixed(2)}` : '—';
    $('#rtFlow').textContent = valid ? `${flowText} L/min` : '—';
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    $('#rtUsage').textContent = latestReading?.isoDate === todayKey ? `${fmt.format(todayUsage)} L today` : '—';
    $('#rtTimestamp').textContent = latestReading ? latestReading.time : '—';
    $('#leakFlow').textContent = valid ? `${flowText} L/min` : '—';
    $('#baselineFlow').textContent = latestReading?.baselineFlow > 0 ? `${latestReading.baselineFlow.toFixed(2)} L/min` : 'Not reported';
    $('#insightFirstReading').textContent = readings.length ? formatStamp(readings.at(-1).timestamp) : 'Waiting for readings';
    $('#insightReadingCount').textContent = `${readings.length.toLocaleString()} readings loaded`;
    $('#insightLatestReading').textContent = latestReading ? formatStamp(latestReading.timestamp) : 'Waiting for readings';
    updateUsageDisplay();
  }

  function updateRelativeTime() {
    $('#dashboardDate').textContent = new Intl.DateTimeFormat('en-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
    updateSystemHealth();
  }

  function updateLiveAggregateBuckets() {
    if (!latestReading) return;
    const timestamp = latestReading.timestamp.getTime();
    for (const [period, buckets] of Object.entries(aggregateSeries)) {
      const bucket = buckets.find(item => timestamp >= item.start && timestamp <= item.end);
      if (!bucket) continue;
      if (period === 'monthly' && Number.isFinite(latestReading.rawMonthly)) bucket.value = latestReading.rawMonthly;
      else if (Number.isFinite(bucket.baseline) && Number.isFinite(latestReading.rawTotal)) bucket.value = Math.max(0, latestReading.rawTotal - bucket.baseline);
    }
  }

  function applyFirebasePayload(records) {
    const previous = latestReading?.sensorValid ? latestReading.flow : NaN;
    const mapped = (Array.isArray(records) ? records : []).map(item => {
      const rawTimestamp = item.timestamp ?? item.created_at;
      const stamp = typeof rawTimestamp === 'number' ? new Date(rawTimestamp) : new Date(String(rawTimestamp || '').replace(' ', 'T'));
      const flow = Number(item.flow_rate ?? item.flowRate);
      const sensor = String(item.sensor_name || item.sensorName || 'YF-S201');
      const rawTotal = Number(item.total_litres ?? item.totalLitres ?? item.water_usage ?? item.waterUsage);
      return {
        id: item.id, deviceId: String(item.device_id || 'ESP32'), sensor, timestamp: stamp,
        date: `${pad(stamp.getDate())}/${pad(stamp.getMonth() + 1)}/${stamp.getFullYear()}`,
        isoDate: `${stamp.getFullYear()}-${pad(stamp.getMonth() + 1)}-${pad(stamp.getDate())}`,
        time: `${pad(stamp.getHours())}:${pad(stamp.getMinutes())}:${pad(stamp.getSeconds())}`,
        flow: Number.isFinite(flow) && flow >= 0 ? flow : null,
        sensorValid: Boolean(sensor && Number.isFinite(flow) && flow >= 0),
        usage: null, rawTotal: Number.isFinite(rawTotal) ? rawTotal : null,
        rawMonthly: Number(item.monthly_litres ?? item.monthlyLitres),
        baselineFlow: Number(item.baseline_flow_rate ?? item.baselineFlowRate),
        status: ['Normal', 'Warning', 'Possible Leakage'].includes(item.leakage_status ?? item.leakageStatus) ? item.leakage_status ?? item.leakageStatus : 'Unknown'
      };
    }).filter(item => !Number.isNaN(item.timestamp.getTime())).sort((a, b) => a.timestamp - b.timestamp);
    for (let index = 1; index < mapped.length; index++) {
      const current = mapped[index], previousRow = mapped[index - 1];
      const gap = current.timestamp - previousRow.timestamp;
      if (current.deviceId === previousRow.deviceId && gap > 0 && gap <= 15 * 60000 && Number.isFinite(current.rawTotal) && Number.isFinite(previousRow.rawTotal)) {
        current.usage = Math.max(0, current.rawTotal - previousRow.rawTotal);
      }
    }
    readings.splice(0, readings.length, ...[...mapped].reverse());
    latestReading = readings[0] || null;
    latestFirebaseUsage = null;
    if (latestReading) {
      virtualNow = latestReading.timestamp;
      const todayKey = latestReading.isoDate;
      const monthKey = todayKey.slice(0, 7);
      const dayRecords = mapped.filter(item => item.isoDate === todayKey);
      const firstDayRecord = dayRecords[0] || latestReading;
      if (!usageResetState.today || usageResetState.today.date !== todayKey) usageResetState.today = { date: todayKey, raw: firstDayRecord.rawTotal || 0, manual: false };
      if (!usageResetState.month || usageResetState.month.key !== monthKey) usageResetState.month = { key: monthKey, raw: 0, manual: false };
      persistUsageResets();
      latestFirebaseUsage = { timestamp: latestReading.timestamp, dayKey: todayKey, monthKey, rawTotal: latestReading.rawTotal, rawMonthly: latestReading.rawMonthly };
      currentFlow = latestReading.sensorValid ? latestReading.flow : 0;
      todayUsage = Number.isFinite(latestReading.rawTotal) ? Math.max(0, latestReading.rawTotal - Number(usageResetState.today.raw || 0)) : 0;
      monthUsage = Number.isFinite(latestReading.rawMonthly) ? Math.max(0, latestReading.rawMonthly - Number(usageResetState.month.raw || 0)) : Math.max(0, (latestReading.rawTotal || 0) - Number(usageResetState.month.raw || 0));
    } else {
      currentFlow = 0; todayUsage = 0; monthUsage = 0;
    }
    updateLiveAggregateBuckets();
    updateTelemetryDom(previous);
    updateSystemHealth();
    renderRecentReadings(); renderHistory(); drawAllCharts();
  }

  function applyFirebaseAlerts(records) {
    const mapped = (Array.isArray(records) ? records : []).map(item => {
      const start = new Date(item.started_at ?? item.timestamp ?? Date.now());
      const end = item.ended_at ? new Date(item.ended_at) : null;
      const seconds = Number(item.duration_seconds ?? 0);
      return {
        date: `${pad(start.getDate())}/${pad(start.getMonth() + 1)}/${start.getFullYear()}`,
        start: `${pad(start.getHours())}:${pad(start.getMinutes())}:${pad(start.getSeconds())}`,
        end: end ? `${pad(end.getHours())}:${pad(end.getMinutes())}:${pad(end.getSeconds())}` : 'Active',
        duration: `${Math.floor(seconds / 60)} min ${seconds % 60} sec`,
        loss: `${Number(item.estimated_water_loss ?? 0).toFixed(1)} L`,
        status: item.status ?? 'Needs review',
        severity: item.status === 'Resolved' ? 'warning' : 'critical'
      };
    }).filter(item => !item.date.includes('NaN')).reverse();
    alerts.splice(0, alerts.length, ...mapped);
    renderRecentAlerts();
  }

  function setupFirebaseEvents() {
    const config = window.SMART_WATER_FIREBASE_CONFIG || {};
    const configured = ['apiKey', 'authDomain', 'databaseURL', 'projectId', 'appId']
      .every(key => config[key] && !String(config[key]).includes('REPLACE_WITH'));
    $('#databaseDetail').textContent = configured ? 'Connecting to Firebase' : 'Firebase setup required';
    $('#systemDbMode').textContent = configured ? 'Connecting' : 'Not configured';
    $('#firebaseConnection').textContent = configured ? 'Connecting' : 'Not configured';

    const setBadges = (state, label) => {
      ['firebaseStatusBadge', 'firebaseSystemBadge'].forEach(id => {
        const badge = $(`#${id}`);
        if (!badge) return;
        badge.className = `status-text ${state}`;
        badge.innerHTML = `<i></i>${label}`;
      });
    };
    setBadges('warning', configured ? 'Connecting' : 'Setup required');

    window.addEventListener('smartwater:firebase-status', event => {
      const state = event.detail || {};
      if (!state.configured) {
        firebaseConnected = false;
        $('#databaseDetail').textContent = 'Firebase setup required';
        $('#systemDbMode').textContent = 'Not configured';
        $('#firebaseConnection').textContent = 'Not configured';
        setBadges('warning', 'Setup required');
        updateSystemHealth();
        return;
      }
      firebaseConnected = Boolean(state.connected);
      $('#databaseDetail').textContent = state.message || 'Firebase Realtime Database';
      $('#systemDbMode').textContent = state.connected ? 'Firebase live' : 'Reconnecting';
      $('#firebaseConnection').textContent = state.connected ? 'Connected' : 'Reconnecting';
      setBadges(state.connected ? 'online' : 'warning', state.connected ? 'Connected' : 'Reconnecting');
      updateSystemHealth();
    });

    window.addEventListener('smartwater:firebase-readings', event => {
      applyFirebasePayload(event.detail?.records || []);
    });

    window.addEventListener('smartwater:firebase-alerts', event => {
      applyFirebaseAlerts(event.detail?.records || []);
    });

    window.addEventListener('smartwater:firebase-aggregates', event => {
      aggregateSeries = event.detail || { daily: [], weekly: [], monthly: [] };
      updateLiveAggregateBuckets();
      drawAllCharts();
    });
    window.addEventListener('smartwater:firebase-aggregate-error', event => {
      $('#dailyInsightDetail').textContent = event.detail?.message || 'Historical usage is unavailable.';
      $('#monthlyInsightDetail').textContent = event.detail?.message || 'Historical usage is unavailable.';
    });
  }

  let resizeTimer;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(drawAllCharts, 120); });

  setupFirebaseEvents();
  setupNavigation();
  setupChartInteractions();
  setupUsageResets();
  setupHistory();
  setupSettings();
  renderRecentReadings();
  renderRecentAlerts();
  renderHistory();
  updateUsageDisplay();
  updateRelativeTime();
  drawAllCharts();
  setInterval(updateRelativeTime, 1000);
  setInterval(drawAllCharts, 60000);
})();
