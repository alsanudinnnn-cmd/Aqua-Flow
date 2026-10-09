const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../assets/js/firebase-backend.js'), 'utf8');
const functionSource = source.slice(source.indexOf('async function loadUsageAggregates'));
let emitted;
const context = { Date, Number, Object, Promise, Intl, emit(name, detail) { emitted = { name, detail }; } };
vm.runInNewContext(`${functionSource}\nthis.loadUsageAggregates = loadUsageAggregates;`, context);

const today = new Date();
const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
const records = [
  { timestamp: start + 60000, total_litres: 100, monthly_litres: 10 },
  { timestamp: start + 120000, total_litres: 105, monthly_litres: 15 }
];
const sdk = {
  ref(database, name) { return name; },
  orderByChild(name) { return { kind: 'order', name }; },
  startAt(value) { return { kind: 'start', value }; },
  endAt(value) { return { kind: 'end', value }; },
  limitToFirst(value) { return { kind: 'first', value }; },
  limitToLast(value) { return { kind: 'last', value }; },
  query(reference, ...constraints) { return { reference, constraints }; },
  async get(query) {
    const first = query.constraints.some(item => item.kind === 'first');
    const from = query.constraints.find(item => item.kind === 'start').value;
    const to = query.constraints.find(item => item.kind === 'end').value;
    const matching = records.filter(item => item.timestamp >= from && item.timestamp <= to);
    const chosen = first ? matching[0] : matching.at(-1);
    return { exists() { return Boolean(chosen); }, val() { return chosen ? { reading: chosen } : null; } };
  }
};

(async () => {
  await context.loadUsageAggregates({}, sdk);
  assert.equal(emitted.name, 'smartwater:firebase-aggregates');
  assert.equal(emitted.detail.daily.at(-1).value, 5);
  assert.equal(emitted.detail.weekly.at(-1).value, 5);
  assert.equal(emitted.detail.monthly.at(-1).value, 15);
  assert.equal(emitted.detail.daily[0].value, null);
  console.log('Firebase usage boundary checks passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
