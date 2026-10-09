import { firebaseConfigured, getFirebaseClient } from './firebase-client.js';

const configured = firebaseConfigured();

window.smartWaterFirebaseState = { configured, connected: false, source: 'firebase' };

function emit(name, detail) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

const gate = document.getElementById('authGate');
const gateMessage = document.getElementById('authGateMessage');

function gateError(message) {
  gateMessage.textContent = message;
  gate.classList.add('has-error');
}

if (!configured) {
  gateError('Firebase is not configured. Add your web app settings, then reload.');
} else {
  start().catch(error => gateError(error?.message || 'Unable to check your session. Please reload.'));
}

async function start() {
  const client = await getFirebaseClient();
  const { auth, authSdk } = client;
  authSdk.onAuthStateChanged(auth, user => {
    if (!user || user.isAnonymous) {
      document.documentElement.classList.remove('auth-ready');
      gate.hidden = false;
      window.location.replace('login.php');
      return;
    }
    const name = user.displayName || user.email?.split('@')[0] || 'Account';
    const avatar = user.photoURL && /^https:\/\//i.test(user.photoURL) ? user.photoURL : 'assets/images/default-profile.jpg';
    for (const id of ['profileAvatar', 'profilePopoverAvatar']) {
      const image = document.getElementById(id);
      image.onerror = () => { if (!image.src.endsWith('/assets/images/default-profile.jpg')) image.src = 'assets/images/default-profile.jpg'; };
      image.src = avatar;
    }
    document.getElementById('profileDisplayName').textContent = name;
    document.getElementById('accountName').textContent = name;
    document.getElementById('accountEmail').textContent = user.email || '';
    document.documentElement.classList.add('auth-ready');
    gate.hidden = true;
    if (!window.smartWaterFirebaseState.started) {
      window.smartWaterFirebaseState.started = true;
      connectFirebase(client).catch(error => emit('smartwater:firebase-status', {
        configured: true,
        connected: false,
        message: error?.message || 'Unable to connect to Firebase'
      }));
    }
  }, error => gateError(error?.message || 'Unable to check your session. Please reload.'));

  document.querySelectorAll('[data-logout]').forEach(button => {
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        await authSdk.signOut(auth);
        window.location.replace('login.php');
      } catch (error) {
        button.disabled = false;
        const toast = document.getElementById('toast');
        toast.querySelector('span').textContent = 'Unable to sign out. Please try again.';
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3500);
      }
    });
  });

  const profileButton = document.getElementById('profileButton');
  const profilePopover = document.getElementById('profilePopover');
  const closeProfile = () => {
    profilePopover.hidden = true;
    profileButton.setAttribute('aria-expanded', 'false');
  };
  profileButton.addEventListener('click', () => {
    const opening = profilePopover.hidden;
    profilePopover.hidden = !opening;
    profileButton.setAttribute('aria-expanded', String(opening));
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.profile-menu')) closeProfile();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !profilePopover.hidden) {
      closeProfile();
      profileButton.focus();
    }
  });
}

async function connectFirebase({ database, databaseSdk }) {

  const connectedRef = databaseSdk.ref(database, '.info/connected');
  databaseSdk.onValue(connectedRef, snapshot => {
    const connected = snapshot.val() === true;
    window.smartWaterFirebaseState.connected = connected;
    emit('smartwater:firebase-status', {
      configured: true,
      connected,
      message: connected ? 'Firebase synchronized' : 'Firebase reconnecting'
    });
  });

  const readingsRef = databaseSdk.query(
    databaseSdk.ref(database, 'readings'),
    databaseSdk.orderByChild('timestamp'),
    databaseSdk.limitToLast(20000)
  );

  databaseSdk.onValue(readingsRef, snapshot => {
    const raw = snapshot.val() || {};
    const records = Object.entries(raw).map(([id, value]) => ({ id, ...value }));
    emit('smartwater:firebase-readings', { records });
  }, error => emit('smartwater:firebase-status', {
    configured: true,
    connected: false,
    message: `Read denied: ${error.message}`
  }));

  const alertsRef = databaseSdk.query(
    databaseSdk.ref(database, 'alerts'),
    databaseSdk.orderByChild('started_at'),
    databaseSdk.limitToLast(50)
  );

  databaseSdk.onValue(alertsRef, snapshot => {
    const raw = snapshot.val() || {};
    const records = Object.entries(raw).map(([id, value]) => ({ id, ...value }));
    emit('smartwater:firebase-alerts', { records });
  }, error => emit('smartwater:firebase-status', {
    configured: true,
    connected: false,
    message: `Alert read denied: ${error.message}`
  }));

  loadUsageAggregates(database, databaseSdk).catch(error => emit('smartwater:firebase-aggregate-error', {
    message: error?.message || 'Historical usage is temporarily unavailable.'
  }));
}

async function loadUsageAggregates(database, sdk) {
  const dayStart = date => new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const monthStart = date => new Date(date.getFullYear(), date.getMonth(), 1);
  const weekStart = date => {
    const start = dayStart(date);
    start.setDate(start.getDate() - (start.getDay() + 6) % 7);
    return start;
  };
  const periods = {
    daily: Array.from({ length: 7 }, (_, index) => {
      const start = dayStart(new Date()); start.setDate(start.getDate() - (6 - index));
      const end = new Date(start); end.setDate(end.getDate() + 1);
      return { start, end, label: start.toLocaleDateString('en-MY', { weekday: 'short' }) };
    }),
    weekly: Array.from({ length: 8 }, (_, index) => {
      const start = weekStart(new Date()); start.setDate(start.getDate() - 7 * (7 - index));
      const end = new Date(start); end.setDate(end.getDate() + 7);
      return { start, end, label: `${start.getDate()} ${start.toLocaleDateString('en-MY', { month: 'short' })}` };
    }),
    monthly: Array.from({ length: 8 }, (_, index) => {
      const start = monthStart(new Date()); start.setMonth(start.getMonth() - (7 - index));
      const end = new Date(start); end.setMonth(end.getMonth() + 1);
      return { start, end, label: start.toLocaleDateString('en-MY', { month: 'short' }) };
    })
  };

  const readingRef = sdk.ref(database, 'readings');
  async function readBucket(bucket, period) {
    const start = bucket.start.getTime();
    const end = bucket.end.getTime() - 1;
    const bounds = [sdk.orderByChild('timestamp'), sdk.startAt(start), sdk.endAt(end)];
    const [firstSnapshot, lastSnapshot] = await Promise.all([
      sdk.get(sdk.query(readingRef, ...bounds, sdk.limitToFirst(1))),
      sdk.get(sdk.query(readingRef, ...bounds, sdk.limitToLast(1)))
    ]);
    if (!lastSnapshot.exists()) return { label: bucket.label, value: null, baseline: null, start, end };
    const first = Object.values(firstSnapshot.val())[0];
    const last = Object.values(lastSnapshot.val())[0];
    const firstTotal = Number(first.total_litres ?? first.water_usage);
    const lastTotal = Number(last.total_litres ?? last.water_usage);
    const monthly = Number(last.monthly_litres);
    const value = period === 'monthly' && Number.isFinite(monthly)
      ? monthly
      : Number.isFinite(firstTotal) && Number.isFinite(lastTotal) ? Math.max(0, lastTotal - firstTotal) : null;
    return { label: bucket.label, value, baseline: Number.isFinite(firstTotal) ? firstTotal : null, start, end };
  }

  const result = {};
  for (const [period, buckets] of Object.entries(periods)) {
    result[period] = await Promise.all(buckets.map(bucket => readBucket(bucket, period)));
  }
  emit('smartwater:firebase-aggregates', result);
}
