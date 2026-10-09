# ESP32 firmware

Firmware ini menggunakan:

1. Wi-Fi untuk sambungan internet.
2. Firebase Realtime Database `/readings` untuk dashboard.
3. Telegram untuk amaran kebocoran apabila aliran melebihi ambang secara berterusan.

## Library Arduino IDE

Pasang melalui **Library Manager**:

- RTClib
- LiquidCrystal I2C
- ArduinoJson
- FirebaseClient by Mobizt
- UniversalTelegramBot

`WiFi`, `Wire`, dan `Preferences` tersedia bersama ESP32 board package.

## Konfigurasi

Semua konfigurasi kini berada terus di bahagian **Inline deployment configuration** di atas
`smart_water_monitor.ino`. Fail `secrets.h` tidak lagi diperlukan untuk compile dan hanya
dibiarkan sebagai salinan lama/sandaran.

1. Buka `smart_water_monitor.ino` dan ubah nilai Wi-Fi, Firebase, serta Telegram pada blok konfigurasi di bahagian atas.
2. Di Firebase Authentication, hidupkan Anonymous sign-in.
3. Publish rules dalam `firebase/database.rules.json`.
4. Cipta bot melalui `@BotFather`, hantar sekurang-kurangnya satu mesej kepada bot, dan isi chat ID.
5. Buka `smart_water_monitor.ino`, pilih board ESP32 dan upload.

Nilai tersebut akan tertanam dalam firmware ESP32. Jangan commit sketch ke repository awam,
jangan muat naiknya ke InfinityFree, dan tukar Wi-Fi password serta Telegram bot token jika
pernah terdedah.

Ambang asal ialah lebih 1.0 L/min selama 10 minit. Ubah `LEAK_FLOW_THRESHOLD_LPM` dan
`LEAK_DURATION_MS` dalam sketch jika diperlukan. Telegram mempunyai cooldown 30 minit dan
hanya dihantar sekali bagi setiap episod kebocoran.
