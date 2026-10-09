# Firebase setup

1. Create a Firebase project and register a Web app.
2. Create a Realtime Database in the Singapore region when available.
3. Enable **Authentication → Sign-in method → Email/Password** for dashboard accounts and **Anonymous** for the ESP32.
4. Replace the placeholder values in `assets/js/firebase-config.js` with the Web app configuration.
5. In Realtime Database, open **Rules**, paste `firebase/database.rules.json`, and publish it.
6. Optionally import `firebase/sample-data.json` from the Realtime Database data screen.

The sample readings are historical. They appear in history but the device status remains offline until a fresh ESP32 report arrives.

The public Firebase web configuration is not a service-account credential. Never upload a service-account JSON file, private key, Wi-Fi password, Telegram bot token, or refresh token to InfinityFree.

Expected ESP32 reading structure:

```json
{
  "device_id": "esp32-water-01",
  "sensor_name": "YF-S201",
  "flow_rate": 4.25,
  "water_usage": 120.35,
  "monthly_litres": 48.20,
  "baseline_flow_rate": 4.10,
  "flow_drop_ratio": 0.35,
  "leakage_status": "Normal",
  "timestamp": 1787805145000
}
```

Push each reading beneath `/readings` using a unique Firebase key. The dashboard listens to the latest 20,000 readings in timestamp order for the 1, 6, and 24 hour flow views. Daily and weekly charts calculate observed usage from the first and last cumulative readings in each period. Monthly charts use the latest device monthly counter when available, with the same first/last calculation as a fallback. Missing periods stay empty instead of showing sample values.

The ESP32 device is marked online when its latest reading is no more than 90 seconds old. The sensor is marked reporting when that fresh reading includes a valid flow value. A zero flow value is valid and does not mean the sensor is disconnected; this status indicates a recent report, not a hardware self-test. The system health percentage is the count of available device, sensor report, and Firebase connection statuses divided by three.

Visitors create an account at `register.php` and sign in at `login.php`. The dashboard requires a signed-in Email/Password account. Publish the updated `database.rules.json` in Firebase Console so anonymous device sessions cannot read dashboard telemetry. Open registration means anyone who can reach the site can create a viewing account; limit account creation before using this for private facilities.

The firmware in `esp32/smart_water_monitor.ino` signs in anonymously, pushes readings to
`/readings`, and writes one record beneath `/alerts` when continuous flow crosses the
configured leakage duration. Anonymous auth is convenient for prototypes; use stricter writer
rules before production.
