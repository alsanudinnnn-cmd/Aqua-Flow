<?php
declare(strict_types=1);
date_default_timezone_set('Asia/Kuala_Lumpur');
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#f0f9ff">
    <meta name="color-scheme" content="light">
    <meta name="description" content="AquaSense real-time water observatory for consumption monitoring and leakage detection.">
    <title>AquaSense Water Observatory</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&amp;family=Outfit:wght@500;600;700&amp;family=Work+Sans:wght@400;500;600;700&amp;display=swap" rel="stylesheet">
    <link rel="stylesheet" href="assets/css/dashboard.css?v=<?= filemtime(__DIR__ . '/assets/css/dashboard.css') ?>">
</head>
<body>
<a class="skip-link" href="#main-content">Skip to dashboard content</a>
<div class="auth-gate" id="authGate" role="status" aria-live="polite"><span class="auth-gate-drop" aria-hidden="true"></span><strong>AquaSense</strong><p id="authGateMessage">Checking your session…</p><a href="login.php">Go to sign in</a></div>

<svg class="svg-sprite" aria-hidden="true">
  <symbol id="i-drop" viewBox="0 0 24 24"><path d="M12 2.5S5.5 9.4 5.5 14.2a6.5 6.5 0 0 0 13 0C18.5 9.4 12 2.5 12 2.5Z"/><path d="M9 15.2a3.2 3.2 0 0 0 3.1 2.4"/></symbol>
  <symbol id="i-grid" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></symbol>
  <symbol id="i-pulse" viewBox="0 0 24 24"><path d="M3 12h4l2.5-7 4 14 2.5-7h5"/></symbol>
  <symbol id="i-chart" viewBox="0 0 24 24"><path d="M4 20V10m6 10V4m6 16v-7m5 7H2"/></symbol>
  <symbol id="i-shield" viewBox="0 0 24 24"><path d="M12 3 4.5 6v5.4c0 4.8 3.2 8.1 7.5 9.6 4.3-1.5 7.5-4.8 7.5-9.6V6L12 3Z"/><path d="m9 12 2 2 4-4"/></symbol>
  <symbol id="i-table" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 4v16"/></symbol>
  <symbol id="i-bell" viewBox="0 0 24 24"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/></symbol>
  <symbol id="i-server" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="6" rx="2"/><rect x="3" y="14" width="18" height="6" rx="2"/><path d="M7 7h.01M7 17h.01"/></symbol>
  <symbol id="i-settings" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></symbol>
  <symbol id="i-menu" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></symbol>
  <symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></symbol>
  <symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></symbol>
  <symbol id="i-chevron" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></symbol>
  <symbol id="i-wifi" viewBox="0 0 24 24"><path d="M5 10a11 11 0 0 1 14 0M8 14a6 6 0 0 1 8 0M11 18a2 2 0 0 1 2 0"/></symbol>
  <symbol id="i-alert" viewBox="0 0 24 24"><path d="M12 3 2.8 20h18.4L12 3Z"/><path d="M12 9v5m0 3h.01"/></symbol>
  <symbol id="i-check" viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></symbol>
  <symbol id="i-pause" viewBox="0 0 24 24"><path d="M9 5v14M15 5v14"/></symbol>
  <symbol id="i-play" viewBox="0 0 24 24"><path d="m8 5 11 7-11 7V5Z"/></symbol>
  <symbol id="i-download" viewBox="0 0 24 24"><path d="M12 3v12m0 0 4-4m-4 4-4-4M4 19h16"/></symbol>
  <symbol id="i-refresh" viewBox="0 0 24 24"><path d="M20 11a8 8 0 0 0-14.7-4L4 9"/><path d="M4 4v5h5"/><path d="M4 13a8 8 0 0 0 14.7 4L20 15"/><path d="M20 20v-5h-5"/></symbol>
  <symbol id="i-close" viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></symbol>
  <symbol id="i-logout" viewBox="0 0 24 24"><path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4"/><path d="M13 7l5 5-5 5M18 12H9"/></symbol>
</svg>

<div class="app-shell">
  <aside class="sidebar" id="sidebar" aria-label="Primary navigation">
    <div class="brand">
      <span class="brand-mark"><svg><use href="#i-drop"/></svg></span>
      <span class="brand-copy"><strong>AQUASENSE</strong><small>Water observatory</small></span>
    </div>
    <nav class="nav-list">
      <span class="nav-section-label">Observe</span>
      <button class="nav-item active" data-view="dashboard"><svg><use href="#i-grid"/></svg><span>Dashboard</span></button>
      <button class="nav-item" data-view="realtime"><svg><use href="#i-pulse"/></svg><span>Real-Time Monitoring</span></button>
      <button class="nav-item" data-view="consumption"><svg><use href="#i-chart"/></svg><span>Water Consumption</span></button>
      <button class="nav-item" data-view="leakage"><svg><use href="#i-shield"/></svg><span>Leakage Detection</span><span class="nav-count" id="navAlertCount" hidden>0</span></button>
      <button class="nav-item" data-view="history"><svg><use href="#i-table"/></svg><span>Historical Data</span></button>
      <span class="nav-section-label">Manage</span>
      <button class="nav-item" data-view="alerts"><svg><use href="#i-bell"/></svg><span>Alerts</span></button>
      <button class="nav-item" data-view="system"><svg><use href="#i-server"/></svg><span>System Status</span></button>
      <button class="nav-item" data-view="settings"><svg><use href="#i-settings"/></svg><span>Settings</span></button>
    </nav>
    <div class="sidebar-health">
      <div class="sidebar-health-head"><span>System health</span><span class="status-dot" id="sidebarHealthDot"></span></div>
      <strong id="sidebarHealthText">Checking services</strong>
      <div class="health-meter"><span id="sidebarHealthMeter" style="width:0%"></span></div>
      <small id="sidebarHealthMeta">0 of 3 services available</small>
    </div>
    <div class="sidebar-footer"><span>AquaSense dashboard</span><span>ESP32 · YF-S201</span></div>
  </aside>

  <div class="main-shell">
    <header class="topbar">
      <div class="topbar-left">
        <button class="icon-button menu-button" id="menuButton" aria-label="Open navigation" aria-expanded="false"><svg><use href="#i-menu"/></svg></button>
      <div><p class="eyebrow">AquaSense workspace</p><h1 id="pageTitle">Water observatory</h1></div>
      </div>
      <div class="topbar-actions">
        <div class="update-block"><svg><use href="#i-clock"/></svg><span><small>Last data received</small><strong id="lastUpdatedHeader">No readings yet</strong></span></div>
        <button class="icon-button notification-button" aria-label="View alerts" data-view-link="alerts"><svg><use href="#i-bell"/></svg><span class="notification-dot" hidden></span></button>
        <div class="profile-menu">
          <button class="profile-button" id="profileButton" type="button" aria-label="Open account menu" aria-expanded="false" aria-controls="profilePopover"><img id="profileAvatar" src="assets/images/default-profile.jpg" width="40" height="40" alt=""><span class="profile-copy"><strong id="profileDisplayName">Account</strong><small>View account</small></span><svg class="profile-chevron"><use href="#i-chevron"/></svg></button>
          <div class="profile-popover" id="profilePopover" hidden><div class="profile-popover-header"><img id="profilePopoverAvatar" src="assets/images/default-profile.jpg" width="48" height="48" alt=""><span><strong id="accountName">Account</strong><small id="accountEmail">Signed in</small></span></div><button class="profile-signout" type="button" data-logout><svg><use href="#i-logout"/></svg>Sign out</button></div>
        </div>
      </div>
    </header>

    <main id="main-content" tabindex="-1">
      <section class="view active" data-page="dashboard">
        <div class="page-heading">
          <div><p class="eyebrow" id="dashboardDate">Today</p><h2>Water network overview</h2><p>Telemetry from your flow sensor.</p></div>
          <div class="heading-actions"><span class="stream-badge" id="dashboardStreamBadge"><span class="status-dot"></span><span>Waiting for readings</span></span><button class="secondary-button" id="exportButton"><svg><use href="#i-download"/></svg>Export report</button></div>
        </div>

        <article class="water-story" aria-labelledby="waterStoryTitle">
          <div class="water-story-copy">
            <p class="section-kicker">Every litre, understood</p>
            <h3 id="waterStoryTitle">See the whole water journey.</h3>
            <p>AquaSense connects inlet flow, daily consumption, and leak signals into one calm, continuous view.</p>
            <div class="story-points" aria-label="Monitoring capabilities">
              <span><svg aria-hidden="true"><use href="#i-pulse"/></svg>Live flow tracking</span>
              <span><svg aria-hidden="true"><use href="#i-shield"/></svg>Early leak signals</span>
            </div>
          </div>
          <div class="water-story-visual">
            <img src="assets/images/water-system-story.webp" width="2172" height="724" alt="Connected home water system showing monitored pipes, a flow sensor, storage tank, and water-saving greenery">
          </div>
        </article>

        <div class="kpi-grid">
          <article class="kpi-card accent-cyan">
            <div class="kpi-head"><span class="kpi-icon"><svg><use href="#i-pulse"/></svg></span><span class="trend neutral" id="flowLiveBadge">Waiting</span></div>
            <span class="kpi-label">Current flow rate</span><div class="kpi-value"><strong id="currentFlow">—</strong><span>L/min</span></div>
            <div class="kpi-foot"><span class="flow-indicator" id="flowIndicator">Waiting for sensor data</span><span id="flowDelta">—</span></div>
          </article>
          <article class="kpi-card accent-blue">
            <div class="kpi-head"><span class="kpi-icon"><svg><use href="#i-drop"/></svg></span><span class="trend neutral">Today</span></div>
            <span class="kpi-label">Today's water usage</span><div class="kpi-value"><strong id="todayUsage">—</strong><span>L</span></div>
            <div class="kpi-foot"><span id="todayCoverage">Waiting for readings</span></div>
            <div class="kpi-actions"><small id="todayUsageMeta">Since midnight</small><button type="button" class="usage-reset-button" data-reset-target="today"><svg aria-hidden="true"><use href="#i-refresh"/></svg><span>Reset today</span></button></div>
          </article>
          <article class="kpi-card accent-violet">
            <div class="kpi-head"><span class="kpi-icon"><svg><use href="#i-chart"/></svg></span><span class="trend neutral">This month</span></div>
            <span class="kpi-label">Monthly water usage</span><div class="kpi-value"><strong id="monthUsage">—</strong><span>L</span></div>
            <div class="kpi-foot"><span id="monthCoverage">Waiting for readings</span></div>
            <div class="kpi-actions"><small id="monthUsageMeta">This month</small><button type="button" class="usage-reset-button" data-reset-target="month"><svg aria-hidden="true"><use href="#i-refresh"/></svg><span>Reset month</span></button></div>
          </article>
          <article class="kpi-card accent-green" id="leakKpi">
            <div class="kpi-head"><span class="kpi-icon"><svg><use href="#i-shield"/></svg></span><span class="status-badge normal" id="systemBadge">Normal</span></div>
            <span class="kpi-label">Leakage status</span><div class="kpi-status"><strong id="leakageLabel">NO DATA</strong><span id="leakageMessage">Waiting for sensor data</span></div>
            <div class="kpi-foot"><span id="leakDetectionFoot">Based on latest reading</span></div>
          </article>
        </div>

        <div class="dashboard-grid primary-grid">
          <article class="panel chart-panel span-2">
            <div class="panel-head"><div><span class="section-kicker">Live telemetry</span><h3>Real-time flow rate</h3></div><div class="range-control" role="group" aria-label="Chart time range"><button class="active" data-range="1h">1H</button><button data-range="6h">6H</button><button data-range="24h">24H</button></div></div>
            <div class="chart-summary"><div><span id="flowSummaryLabel">Current</span><strong><b id="chartCurrent">—</b> L/min</strong></div><div><span>Average</span><strong><b id="chartAverage">—</b> L/min</strong></div><div><span>Peak</span><strong><b id="chartPeak">—</b> L/min</strong></div></div>
            <div class="chart-wrap live-chart"><canvas id="flowChart" role="img" aria-label="Line chart of real-time water flow rate"></canvas><div class="chart-tooltip" id="flowTooltip" hidden></div></div>
            <div class="chart-legend"><span><i class="legend-line cyan"></i>Flow rate</span><span><i class="legend-line threshold"></i>Reference floor</span><small id="flowChartCoverage">Waiting for readings</small></div>
          </article>
          <article class="panel status-panel">
            <div class="panel-head"><div><span class="section-kicker">Infrastructure</span><h3>System & sensor status</h3></div><span class="status-badge warning" id="dashboardHealthBadge">Checking</span></div>
            <div class="system-score"><div class="score-ring" id="healthRing"><strong id="healthPercent">0</strong><span>%</span></div><div><strong>System health</strong><span id="healthDescription">0 of 3 services available</span></div></div>
            <div class="status-list">
              <div class="status-row"><span class="device-icon"><svg><use href="#i-wifi"/></svg></span><span><strong>ESP32 device</strong><small id="deviceDetail">Waiting for telemetry</small></span><span class="status-text warning" id="deviceStatusBadge"><i></i>Offline</span></div>
              <div class="status-row"><span class="device-icon"><svg><use href="#i-pulse"/></svg></span><span><strong>YF-S201 Sensor</strong><small id="sensorDetail">Waiting for a valid reading</small></span><span class="status-text warning" id="sensorStatusBadge"><i></i>Offline</span></div>
              <div class="status-row"><span class="device-icon"><svg><use href="#i-server"/></svg></span><span><strong>Firebase Cloud</strong><small id="databaseDetail">Checking configuration</small></span><span class="status-text warning" id="firebaseStatusBadge"><i></i>Setup required</span></div>
            </div>
            <div class="received-card"><span><svg><use href="#i-clock"/></svg>Last data received</span><strong id="lastReceived">No readings yet</strong><small id="lastTimestamp">—</small></div>
          </article>
        </div>

        <div class="dashboard-grid analytics-grid">
          <article class="panel chart-panel"><div class="panel-head"><div><span class="section-kicker">Last 7 days</span><h3>Daily consumption</h3></div><button class="text-button" data-view-link="consumption">View analytics <svg><use href="#i-chevron"/></svg></button></div><div class="chart-wrap compact"><canvas id="dailyChart" role="img" aria-label="Bar chart of daily water consumption"></canvas></div><div class="panel-insight"><span class="insight-icon"><svg><use href="#i-drop"/></svg></span><span><strong id="dailyInsightTitle">Waiting for usage data</strong><small id="dailyInsightDetail">Charts use recorded readings only.</small></span></div></article>
          <article class="panel chart-panel"><div class="panel-head"><div><span class="section-kicker">Recorded history</span><h3>Monthly consumption</h3></div><button class="text-button" data-view-link="consumption">View analytics <svg><use href="#i-chevron"/></svg></button></div><div class="chart-wrap compact"><canvas id="monthlyChart" role="img" aria-label="Bar chart of monthly water consumption"></canvas></div><div class="panel-insight violet"><span class="insight-icon"><svg><use href="#i-chart"/></svg></span><span><strong id="monthlyInsightTitle">Waiting for usage data</strong><small id="monthlyInsightDetail">Only available history is shown.</small></span></div></article>
        </div>

        <div class="dashboard-grid activity-grid">
          <article class="panel alerts-panel"><div class="panel-head"><div><span class="section-kicker">Detection history</span><h3>Recent leakage alerts</h3></div><button class="text-button" data-view-link="alerts">View all <svg><use href="#i-chevron"/></svg></button></div><div id="recentAlerts" class="alert-list"></div></article>
          <article class="panel readings-panel"><div class="panel-head"><div><span class="section-kicker">Sensor feed</span><h3>Recent readings</h3></div><button class="text-button" data-view-link="history">View history <svg><use href="#i-chevron"/></svg></button></div><div class="table-scroll"><table><thead><tr><th>Time</th><th>Flow rate</th><th>Usage</th><th>Status</th></tr></thead><tbody id="recentReadings"></tbody></table></div></article>
        </div>
      </section>

      <section class="view" data-page="realtime">
        <div class="page-heading"><div><p class="eyebrow">Live sensor feed</p><h2>Real-time monitoring</h2><p>Incoming readings from the ESP32 and YF-S201 flow sensor.</p></div><span class="stream-badge" id="realtimeStreamBadge"><span class="status-dot"></span><span>Waiting for readings</span></span></div>
        <div class="realtime-strip"><div><span>Flow rate</span><strong id="rtFlow">—</strong></div><div><span>Observed usage</span><strong id="rtUsage">—</strong></div><div><span>Leakage status</span><strong id="rtLeakStatus">Unknown</strong></div><div><span>Sensor status</span><strong id="rtSensorStatus">Offline</strong></div><div><span>Timestamp</span><strong id="rtTimestamp">—</strong></div></div>
        <article class="panel chart-panel full-panel"><div class="panel-head"><div><span class="section-kicker">Live telemetry</span><h3>Water flow stream</h3></div><div class="chart-actions"><button class="stream-control" id="streamToggle" type="button" aria-pressed="false"><svg><use href="#i-pause"/></svg><span>Pause display</span></button><div class="range-control" role="group" aria-label="Chart time range"><button class="active" data-range="1h">1H</button><button data-range="6h">6H</button><button data-range="24h">24H</button></div></div></div><div class="chart-wrap extra-tall"><canvas id="flowChartLarge" role="img" aria-label="Expanded real-time flow chart"></canvas></div></article>
      </section>

      <section class="view" data-page="consumption">
        <div class="page-heading"><div><p class="eyebrow">Usage intelligence</p><h2>Water consumption analytics</h2><p>Compare consumption patterns and identify unusual demand.</p></div><div class="segmented-control" id="analyticsPeriod"><button class="active" data-period="daily">Daily</button><button data-period="weekly">Weekly</button><button data-period="monthly">Monthly</button></div></div>
        <div class="analytics-summary"><article><span>Average observed day</span><strong id="analyticsAverage">—</strong><small id="analyticsAverageMeta">Waiting for readings</small></article><article><span>Peak observed day</span><strong id="analyticsPeak">—</strong><small id="analyticsPeakMeta">Waiting for readings</small></article><article><span>Observed this month</span><strong id="analyticsMonth">—</strong><small id="analyticsMonthMeta">Waiting for readings</small></article></div>
        <div class="dashboard-grid analytics-grid"><article class="panel chart-panel"><div class="panel-head"><div><span class="section-kicker" id="analyticsKicker">Last 7 days</span><h3 id="analyticsTitle">Daily consumption</h3></div></div><div class="chart-wrap extra-tall"><canvas id="analyticsMainChart" role="img" aria-label="Water consumption analytics chart"></canvas></div></article><article class="panel"><div class="panel-head"><div><span class="section-kicker">Data coverage</span><h3>Usage insights</h3></div></div><div class="insight-list"><div><span class="insight-icon"><svg><use href="#i-clock"/></svg></span><span><strong>Oldest loaded reading</strong><small id="insightFirstReading">Waiting for readings</small></span></div><div><span class="insight-icon"><svg><use href="#i-chart"/></svg></span><span><strong>Readings loaded</strong><small id="insightReadingCount">0 readings</small></span></div><div><span class="insight-icon"><svg><use href="#i-shield"/></svg></span><span><strong>Latest device report</strong><small id="insightLatestReading">Waiting for readings</small></span></div></div></article></div>
      </section>

      <section class="view" data-page="leakage">
        <div class="page-heading"><div><p class="eyebrow">Anomaly engine</p><h2>Leakage detection</h2><p>Device-reported status from the latest flow reading.</p></div><span class="status-badge warning" id="leakPageBadge">Waiting for device</span></div>
        <article class="leak-hero warning" id="leakHero"><div class="leak-symbol"><svg><use href="#i-shield"/></svg></div><div><span class="section-kicker">Latest device report</span><h3 id="leakHeroTitle">NO LIVE DATA</h3><p id="leakHeroText">Waiting for a fresh sensor report.</p></div><div class="leak-metrics"><div><span>Latest report</span><strong id="continuousDuration">No readings yet</strong></div><div><span>Current flow</span><strong id="leakFlow">—</strong></div><div><span>Baseline flow</span><strong id="baselineFlow">Not reported</strong></div></div></article>
        <div class="dashboard-grid"><article class="panel"><div class="panel-head"><div><span class="section-kicker">Latest telemetry</span><h3>Device report</h3></div></div><div class="parameter-list"><div><span>Device ID</span><strong id="leakDeviceId">—</strong></div><div><span>Reported status</span><strong id="leakReportedStatus">Unknown</strong></div><div><span>Baseline flow</span><strong id="leakReportedBaseline">—</strong></div><div><span>Last report</span><strong id="leakReportedAt">No readings yet</strong></div></div></article><article class="panel"><div class="panel-head"><div><span class="section-kicker">How it works</span><h3>Detection pipeline</h3></div></div><div class="pipeline"><span>YF-S201 pulses</span><i></i><span>Normal baseline</span><i></i><span>Drop comparison</span><i></i><span>Alert decision</span></div></article></div>
      </section>

      <section class="view" data-page="history">
        <div class="page-heading"><div><p class="eyebrow">Telemetry archive</p><h2>Historical sensor data</h2><p>Search, filter, sort, and export recorded measurements.</p></div><button class="secondary-button" id="historyExport"><svg><use href="#i-download"/></svg>Export CSV</button></div>
        <article class="panel data-panel"><div class="filter-bar"><label class="search-field"><svg><use href="#i-search"/></svg><span class="sr-only">Search readings</span><input id="tableSearch" type="search" placeholder="Search date or status"></label><label><span>Date</span><input id="dateFilter" type="date"></label><label><span>Status</span><select id="statusFilter"><option value="all">All statuses</option><option value="Normal">Normal</option><option value="Warning">Warning</option><option value="Possible Leakage">Possible leakage</option></select></label><button class="secondary-button" id="clearFilters">Clear filters</button></div><div class="table-scroll"><table class="data-table"><thead><tr><th><button data-sort="timestamp">Date & time <span>↕</span></button></th><th>Sensor</th><th>Flow rate</th><th>Water usage</th><th>Leakage status</th></tr></thead><tbody id="historyBody"></tbody></table></div><div class="pagination"><span id="paginationSummary"></span><div><button id="prevPage">Previous</button><span id="pageButtons"></span><button id="nextPage">Next</button></div></div></article>
      </section>

      <section class="view" data-page="alerts">
        <div class="page-heading"><div><p class="eyebrow">Event centre</p><h2>Leakage alert history</h2><p>Investigate previous anomalies and their estimated water impact.</p></div><span class="status-badge warning" id="alertsNeedsReview">0 needs review</span></div>
        <article class="panel data-panel"><div class="table-scroll"><table class="data-table"><thead><tr><th>Date</th><th>Start time</th><th>End time</th><th>Duration</th><th>Estimated water loss</th><th>Status</th></tr></thead><tbody id="alertHistoryBody"></tbody></table></div></article>
      </section>

      <section class="view" data-page="system">
        <div class="page-heading"><div><p class="eyebrow">Infrastructure</p><h2>System status</h2><p>Device, sensor report, and Firebase connection health.</p></div><span class="status-badge warning" id="systemOverallBadge">Checking</span></div>
        <div class="system-grid"><article class="system-card"><span class="device-icon large"><svg><use href="#i-wifi"/></svg></span><span class="status-text warning" id="systemDeviceBadge"><i></i>Offline</span><h3>ESP32 device</h3><p>Wi-Fi telemetry source</p><dl><div><dt>Device status</dt><dd id="systemDeviceStatus">Offline</dd></div><div><dt>Device ID</dt><dd id="systemDeviceId">—</dd></div><div><dt>Last heartbeat</dt><dd id="systemHeartbeat">No readings yet</dd></div></dl></article><article class="system-card"><span class="device-icon large"><svg><use href="#i-pulse"/></svg></span><span class="status-text warning" id="systemSensorBadge"><i></i>Offline</span><h3>YF-S201 Flow Sensor</h3><p>Latest telemetry report</p><dl><div><dt>Sensor status</dt><dd id="systemSensorStatus">Offline</dd></div><div><dt>Last valid reading</dt><dd id="systemSensorReading">No readings yet</dd></div><div><dt>Current rate</dt><dd id="systemFlow">—</dd></div></dl></article><article class="system-card"><span class="device-icon large"><svg><use href="#i-server"/></svg></span><span class="status-text warning" id="firebaseSystemBadge"><i></i>Checking</span><h3>Firebase Realtime Database</h3><p>Cloud telemetry store</p><dl><div><dt>Mode</dt><dd id="systemDbMode">Checking</dd></div><div><dt>Synchronization</dt><dd>Real-time listener</dd></div><div><dt>Connection</dt><dd id="firebaseConnection">Checking</dd></div></dl></article></div>
      </section>

      <section class="view" data-page="settings">
        <div class="page-heading"><div><p class="eyebrow">Preferences</p><h2>Chart settings</h2><p>Choose a reference line for your flow charts.</p></div></div>
        <form class="settings-layout" id="settingsForm"><article class="panel settings-panel"><div class="panel-head"><div><span class="section-kicker">Chart display</span><h3>Reference line</h3></div></div><label class="form-field"><span>Reference flow</span><small>Show this comparison line on both flow charts.</small><div class="input-unit"><input id="flowThreshold" type="number" min="0.1" max="20" step="0.1" value="1.0" required><span>L/min</span></div></label><div class="form-actions"><button type="button" class="secondary-button" id="resetSettings">Reset default</button><button type="submit" class="primary-button">Save preference</button></div></article><aside class="panel settings-aside"><span class="device-icon large"><svg><use href="#i-shield"/></svg></span><h3>Device detection</h3><p>The ESP32 reports its leakage status and baseline with each reading. This display preference only changes the chart line; it does not reconfigure the device firmware.</p><div class="notice"><svg><use href="#i-alert"/></svg><span><strong>Want to change detection?</strong><small>Update and upload the ESP32 firmware settings.</small></span></div></aside></form>
      </section>
    </main>
  </div>
</div>
<div class="mobile-scrim" id="mobileScrim"></div>
<div class="toast" id="toast" role="status" aria-live="polite"><svg><use href="#i-check"/></svg><span>Settings saved successfully.</span></div>
<div class="usage-modal" id="usageResetModal" hidden>
  <div class="usage-modal-backdrop" data-usage-modal-close></div>
  <section class="usage-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="usageModalTitle" aria-describedby="usageModalDescription">
    <button type="button" class="usage-modal-close" id="usageModalClose" aria-label="Close reset dialog"><svg><use href="#i-close"/></svg></button>
    <span class="section-kicker">Usage counter</span>
    <h2 id="usageModalTitle">Reset today's total?</h2>
    <p id="usageModalDescription">This sets a new starting point for the dashboard. Your Firebase sensor history will stay intact.</p>
    <div class="usage-modal-value"><span>Current dashboard total</span><strong id="usageModalValue">0.0 L</strong></div>
    <div class="usage-modal-actions"><button type="button" class="secondary-button" id="usageModalCancel">Cancel</button><button type="button" class="danger-button" id="usageModalConfirm"><svg><use href="#i-refresh"/></svg>Reset counter</button></div>
  </section>
</div>
<script src="assets/js/firebase-config.js"></script>
<script type="module" src="assets/js/firebase-backend.js?v=<?= filemtime(__DIR__ . '/assets/js/firebase-backend.js') ?>"></script>
<script src="assets/js/dashboard.js?v=<?= filemtime(__DIR__ . '/assets/js/dashboard.js') ?>" defer></script>
</body>
</html>
