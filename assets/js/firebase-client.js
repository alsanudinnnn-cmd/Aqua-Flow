const version = '12.18.0';
let clientPromise;

export function firebaseConfigured() {
  const config = window.SMART_WATER_FIREBASE_CONFIG || {};
  const required = ['apiKey', 'authDomain', 'databaseURL', 'projectId', 'appId'];
  return required.every(key => config[key] && !String(config[key]).includes('REPLACE_WITH'));
}

export function getFirebaseClient() {
  if (!clientPromise) {
    clientPromise = (async () => {
      if (!firebaseConfigured()) throw new Error('Firebase is not configured yet. Add your web app settings to assets/js/firebase-config.js.');
      const [appSdk, authSdk, databaseSdk] = await Promise.all([
        import(`https://www.gstatic.com/firebasejs/${version}/firebase-app.js`),
        import(`https://www.gstatic.com/firebasejs/${version}/firebase-auth.js`),
        import(`https://www.gstatic.com/firebasejs/${version}/firebase-database.js`)
      ]);
      const app = appSdk.getApps().length ? appSdk.getApp() : appSdk.initializeApp(window.SMART_WATER_FIREBASE_CONFIG);
      return { app, authSdk, databaseSdk, auth: authSdk.getAuth(app), database: databaseSdk.getDatabase(app) };
    })().catch(error => { clientPromise = null; throw error; });
  }
  return clientPromise;
}
