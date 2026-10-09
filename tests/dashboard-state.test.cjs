const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const nodes = new Map();
const listeners = new Map();

function node(key) {
  if (!nodes.has(key)) {
    const isCanvas = /^#(?:flowChart|flowChartLarge|dailyChart|monthlyChart|analyticsMainChart)$/.test(key);
    const context = new Proxy({ createLinearGradient() { return { addColorStop() {} }; } }, {
      get(target, property) { return property in target ? target[property] : () => {}; }
    });
    nodes.set(key, {
      key,
      style: { setProperty(name, value) { this[name] = value; } },
      classList: { add() {}, remove() {}, toggle() {} },
      dataset: { period: 'daily' },
      value: key === '#statusFilter' ? 'all' : '',
      hidden: false,
      offsetParent: isCanvas ? {} : null,
      getBoundingClientRect() { return { width: 600, height: 250, left: 0, top: 0 }; },
      getContext() { return context; },
      addEventListener() {},
      setAttribute() {},
      removeAttribute() {},
      focus() {},
      querySelector(selector) { return node(`${key} ${selector}`); },
      querySelectorAll() { return []; }
    });
  }
  return nodes.get(key);
}

const document = {
  querySelector(selector) { return selector === '[data-page=""]' ? null : node(selector); },
  querySelectorAll() { return []; },
  addEventListener() {},
  body: node('body'),
  title: ''
};
const window = {
  addEventListener(name, callback) {
    if (!listeners.has(name)) listeners.set(name, []);
    listeners.get(name).push(callback);
  },
  scrollTo() {},
  devicePixelRatio: 1,
  SMART_WATER_FIREBASE_CONFIG: { apiKey: 'a', authDomain: 'b', databaseURL: 'c', projectId: 'd', appId: 'e' }
};
const context = {
  window, document, location: { hash: '' }, history: { replaceState() {} },
  localStorage: { getItem() { return null; }, setItem() {} },
  setInterval() {}, setTimeout() {}, clearTimeout() {}, requestAnimationFrame() {},
  Intl, Date, Math, Number, String, Array, Object, JSON, console, URL, Blob
};

vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/dashboard.js'), 'utf8'), context);
const emit = (name, detail) => (listeners.get(name) || []).forEach(callback => callback({ detail }));

assert.equal(node('#healthPercent').textContent, '0');
emit('smartwater:firebase-status', { configured: true, connected: true, message: 'Firebase synchronized' });
assert.equal(node('#healthPercent').textContent, '33');

const stamp = Date.now();
emit('smartwater:firebase-readings', { records: [
  { id: 'r1', device_id: 'esp32-water-01', sensor_name: 'YF-S201', flow_rate: 2.5, total_litres: 100, monthly_litres: 10, leakage_status: 'Normal', timestamp: stamp - 5000 },
  { id: 'r2', device_id: 'esp32-water-01', sensor_name: 'YF-S201', flow_rate: 3.2, total_litres: 101, monthly_litres: 11, leakage_status: 'Normal', timestamp: stamp }
] });
assert.equal(node('#healthPercent').textContent, '100');
assert.equal(node('#systemDeviceStatus').textContent, 'Online');
assert.equal(node('#systemDeviceId').textContent, 'esp32-water-01');
assert.equal(node('#currentFlow').textContent, '3.20');

emit('smartwater:firebase-aggregates', {
  daily: [{ label: 'Today', value: 2, baseline: 99, start: stamp - 86400000, end: stamp + 86400000 }],
  weekly: [],
  monthly: [{ label: 'Sep', value: 11, baseline: 90, start: stamp - 86400000, end: stamp + 86400000 }]
});
assert.match(node('#dailyInsightTitle').textContent, /^2(?:\.0)? L observed/);

emit('smartwater:firebase-readings', { records: [
  { id: 'r3', device_id: 'esp32-water-01', sensor_name: 'YF-S201', flow_rate: 'invalid', total_litres: 102, monthly_litres: 12, leakage_status: 'Unknown', timestamp: stamp }
] });
assert.equal(node('#healthPercent').textContent, '67');
assert.equal(node('#systemSensorStatus').textContent, 'Offline');

emit('smartwater:firebase-readings', { records: [] });
assert.equal(node('#systemDeviceStatus').textContent, 'Offline');
assert.equal(node('#healthPercent').textContent, '33');
console.log('Dashboard status and aggregate checks passed.');
