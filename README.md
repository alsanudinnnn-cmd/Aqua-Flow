# Smart Water Monitoring

A responsive IoT dashboard for an ESP32 and YF-S201 water-flow sensor. Firebase Realtime Database is the primary backend, allowing the website to be deployed on InfinityFree without Node-RED, MQTT, PHP APIs, or a remotely accessible MySQL server.

## Architecture

```text
YF-S201 → ESP32 → Firebase Realtime Database → InfinityFree dashboard
                 ↘ Telegram leakage alert
```

The dashboard listens to Firebase changes in real time. A Firebase Email/Password account is required to enter it. When readings are unavailable, charts and status panels show an empty or offline state rather than sample telemetry.

The 1, 6, and 24 hour flow charts use recent Firebase readings. Daily, weekly, and monthly usage charts query actual reading boundaries for each displayed period. The chart reference line is a local display preference; device leakage detection remains configured in the ESP32 firmware.

## Firebase setup

1. Create a Firebase project and register a Web app.
2. Create a Realtime Database, preferably in the Singapore region.
3. Enable **Authentication → Sign-in method → Email/Password** for dashboard accounts and **Anonymous** for the ESP32.
4. Copy the Firebase Web configuration into `assets/js/firebase-config.js`.
5. Paste and publish `firebase/database.rules.json` through the Realtime Database Rules screen.
6. Open `register.php` to create a dashboard account, then sign in at `login.php`.
7. Optionally import `firebase/sample-data.json` for initial test readings.

Detailed instructions and the expected ESP32 payload are in `firebase/README.md`.
Firmware, library requirements, and secret configuration are in `esp32/README.md`.

## Run locally

Start Apache in Laragon, then open:

```text
http://localhost/IOT%20Based%20Smart%20water%20Consumption%20and%20leakage%20detection/
```

The Firebase SDK is loaded as an official modular browser module from Google's CDN. No npm build step is required.

## Deploy to InfinityFree

Upload these items into the InfinityFree `htdocs` directory:

```text
index.php
login.php
register.php
includes/
assets/
```

Firebase communicates directly from the visitor's browser, so the old PHP API and MySQL schema are not required on InfinityFree. Keep `firebase/database.rules.json` locally as deployment documentation; publish those rules in Firebase Console rather than uploading them as a public website file.

## Security

- The Firebase Web configuration is a public project identifier, not a private server key.
- Never upload a Firebase service-account JSON file, Wi-Fi password, or Telegram bot token to InfinityFree.
- Do not leave Realtime Database in test mode.
- Dashboard reads require an Email/Password account. The ESP32 continues to sign in anonymously to write telemetry.
- Registration is open to anyone with the site URL. Limit account creation before using this for private facilities. Anonymous device writes also need a dedicated writer identity or device UID rule for production.

## Legacy prototype files

The `api/`, `config/`, and `database/` folders are retained only as reference for the earlier PHP/MySQL prototype. The dashboard and firmware no longer call them at runtime.
