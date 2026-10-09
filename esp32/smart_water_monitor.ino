#define ENABLE_USER_AUTH
#define ENABLE_DATABASE

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <RTClib.h>
#include <Preferences.h>
#include <ArduinoJson.h>
#include <FirebaseClient.h>
#include <UniversalTelegramBot.h>
// Inline deployment configuration. Keep this sketch private when it contains credentials.
#define WIFI_SSID "AyamPanasMuiz"
#define WIFI_PASSWORD "AyamGoreng"
#define FIREBASE_API_KEY "AIzaSyBPO4W58RCT0WnepLugSCl6iG3uU_qXCDs"
#define FIREBASE_DATABASE_URL "https://aquasensewatermonitor-default-rtdb.asia-southeast1.firebasedatabase.app"
#define TELEGRAM_BOT_TOKEN "8834337745:AAE3jfAYaYFjOhviESD6x8i-nSZ3idiL1Y8"
#define TELEGRAM_CHAT_ID "1869140441"

// -------------------------------
// Perkakasan dan rangkaian
// -------------------------------
constexpr uint8_t FLOW_SENSOR_PIN = 14;
constexpr uint8_t SDA_PIN = 21;
constexpr uint8_t SCL_PIN = 22;
constexpr char DEVICE_ID[] = "esp32-water-01";

// YF-S201 lazimnya sekitar 450 denyutan/liter. Kalibrasi semula untuk sensor sebenar.
constexpr float PULSES_PER_LITRE = 450.0F;
// Kebocoran ditentukan melalui penurunan mendadak berbanding baseline aliran,
// bukan semata-mata kerana aliran melebihi satu nilai tetap.
constexpr float LEAK_REFERENCE_FLOOR_LPM = 1.0F;
constexpr float FLOW_DROP_RATIO = 0.35F; // 65% lebih rendah daripada baseline
constexpr uint32_t LEAK_DURATION_MS = 10UL * 60UL * 1000UL;
constexpr uint32_t SAMPLE_INTERVAL_MS = 1000;
constexpr uint32_t CLOUD_INTERVAL_MS = 5000;
constexpr uint32_t SAVE_INTERVAL_MS = 60000;
constexpr uint32_t WIFI_RETRY_MS = 10000;
constexpr uint32_t TELEGRAM_COOLDOWN_MS = 30UL * 60UL * 1000UL;

WiFiClientSecure firebaseSsl;
WiFiClientSecure telegramSsl;
AsyncClientClass firebaseClient(firebaseSsl);
UserAccount firebaseGuest(FIREBASE_API_KEY);
FirebaseApp firebaseApp;
RealtimeDatabase database;
UniversalTelegramBot telegram(TELEGRAM_BOT_TOKEN, telegramSsl);
RTC_DS3231 rtc;
LiquidCrystal_I2C lcd(0x27, 20, 4);
Preferences preferences;

portMUX_TYPE pulseMux = portMUX_INITIALIZER_UNLOCKED;
volatile uint32_t pulseCount = 0;

double totalLitres = 0.0;
double monthlyLitres = 0.0;
float flowRate = 0.0F;
double abnormalLitres = 0.0;
uint8_t storedMonth = 0;
uint16_t storedYear = 0;
uint32_t flowDropSince = 0;
float baselineFlowRate = 0.0F;
uint32_t lastTelegramAlert = 0;
uint32_t lastTelegramAttempt = 0;
bool leakAlertActive = false;
bool firebaseAlertQueued = false;
bool telegramAlertDelivered = false;
bool storageDirty = false;

uint32_t lastSample = 0;
uint32_t lastCloudSend = 0;
uint32_t lastSave = 0;
uint32_t lastWiFiAttempt = 0;

void processFirebaseResult(AsyncResult &result);

void IRAM_ATTR pulseCounter() {
  portENTER_CRITICAL_ISR(&pulseMux);
  pulseCount++;
  portEXIT_CRITICAL_ISR(&pulseMux);
}

bool isConfigured(const char *value) {
  return value != nullptr && value[0] != '\0' && strstr(value, "REPLACE_WITH") == nullptr;
}

bool firebaseConfigured() {
  return isConfigured(FIREBASE_API_KEY) && isConfigured(FIREBASE_DATABASE_URL);
}

bool telegramConfigured() {
  return isConfigured(TELEGRAM_BOT_TOKEN) && isConfigured(TELEGRAM_CHAT_ID);
}

void printLcdLine(uint8_t row, String text) {
  if (text.length() > 20) text.remove(20);
  while (text.length() < 20) text += ' ';
  lcd.setCursor(0, row);
  lcd.print(text);
}

void connectWiFi(uint32_t nowMs, bool force = false) {
  if (WiFi.status() == WL_CONNECTED) return;
  if (!force && nowMs - lastWiFiAttempt < WIFI_RETRY_MS) return;

  lastWiFiAttempt = nowMs;
  Serial.printf("Connecting to Wi-Fi %s...\n", WIFI_SSID);
  WiFi.disconnect();
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

void saveData() {
  preferences.begin("water", false);
  // Kekalkan jenis float yang digunakan firmware lama supaya data NVS sedia ada boleh dibaca.
  preferences.putFloat("total", static_cast<float>(totalLitres));
  preferences.putFloat("monthly", static_cast<float>(monthlyLitres));
  preferences.putUChar("month", storedMonth);
  preferences.putUShort("year", storedYear);
  preferences.end();
  storageDirty = false;
}

void loadData() {
  preferences.begin("water", true);
  totalLitres = preferences.getFloat("total", 0.0F);
  monthlyLitres = preferences.getFloat("monthly", 0.0F);
  storedMonth = preferences.getUChar("month", 0);
  storedYear = preferences.getUShort("year", 0);
  preferences.end();
}

void checkNewMonth(const DateTime &now) {
  if (storedMonth == now.month() && storedYear == now.year()) return;

  monthlyLitres = 0.0;
  storedMonth = now.month();
  storedYear = now.year();
  storageDirty = true;
  saveData();
  Serial.println("New month detected; monthly usage reset.");
}

uint64_t currentTimestampMs(const DateTime &fallback) {
  time_t epoch = time(nullptr);
  if (epoch > 1700000000) return static_cast<uint64_t>(epoch) * 1000ULL;
  return static_cast<uint64_t>(fallback.unixtime()) * 1000ULL;
}

const char *leakageStatus(uint32_t nowMs) {
  if (flowDropSince == 0) return "Normal";
  const uint32_t duration = nowMs - flowDropSince;
  if (duration >= LEAK_DURATION_MS) return "Possible Leakage";
  if (duration >= (LEAK_DURATION_MS * 8UL) / 10UL) return "Warning";
  return "Normal";
}

String makeReadingJson(const DateTime &date, uint32_t nowMs) {
  StaticJsonDocument<512> doc;
  doc["device_id"] = DEVICE_ID;
  doc["sensor_name"] = "YF-S201";
  doc["flow_rate"] = round(flowRate * 1000.0) / 1000.0;
  doc["flowRate"] = round(flowRate * 1000.0) / 1000.0;
  doc["water_usage"] = round(totalLitres * 1000.0) / 1000.0;
  doc["total_litres"] = round(totalLitres * 1000.0) / 1000.0;
  doc["monthly_litres"] = round(monthlyLitres * 1000.0) / 1000.0;
  doc["baseline_flow_rate"] = round(baselineFlowRate * 1000.0) / 1000.0;
  doc["flow_drop_ratio"] = FLOW_DROP_RATIO;
  doc["day"] = date.day();
  doc["month"] = date.month();
  doc["year"] = date.year();
  doc["leakage_status"] = leakageStatus(nowMs);
  doc["timestamp"] = currentTimestampMs(date);

  String json;
  serializeJson(doc, json);
  return json;
}

void pushFirebaseReading(const String &json) {
  if (!firebaseConfigured() || !firebaseApp.ready()) return;
  database.push<object_t>(firebaseClient, "/readings", object_t(json),
                          processFirebaseResult, "pushReading");
}

bool pushFirebaseAlert(const DateTime &date, uint32_t nowMs) {
  if (!firebaseConfigured()) return true;
  if (!firebaseApp.ready()) return false;

  StaticJsonDocument<384> doc;
  doc["device_id"] = DEVICE_ID;
  doc["started_at"] = currentTimestampMs(date) - (nowMs - flowDropSince);
  doc["duration_seconds"] = (nowMs - flowDropSince) / 1000UL;
  doc["estimated_water_loss"] = round(abnormalLitres * 1000.0) / 1000.0;
  doc["status"] = "Active";

  String json;
  serializeJson(doc, json);
  database.push<object_t>(firebaseClient, "/alerts", object_t(json),
                          processFirebaseResult, "pushAlert");
  return true;
}

bool sendTelegramAlert(const DateTime &date, uint32_t nowMs) {
  if (!telegramConfigured()) return true;
  if (WiFi.status() != WL_CONNECTED) return false;
  if (lastTelegramAlert != 0 && nowMs - lastTelegramAlert < TELEGRAM_COOLDOWN_MS) return true;

  lastTelegramAttempt = nowMs;

  String message = "AMARAN KEBOCORAN AIR!\n\n";
  message += "Peranti: " + String(DEVICE_ID) + "\n";
  message += "Aliran: " + String(flowRate, 2) + " L/min\n";
  message += "Penurunan aliran: " + String((nowMs - flowDropSince) / 60000UL) + " minit\n";
  message += "Anggaran air: " + String(abnormalLitres, 2) + " L\n";
  message += "Tarikh: " + String(date.day()) + "/" + String(date.month()) + "/" + String(date.year());

  if (telegram.sendMessage(TELEGRAM_CHAT_ID, message, "")) {
    lastTelegramAlert = nowMs;
    Serial.println("Telegram leakage alert sent.");
    return true;
  } else {
    Serial.println("Telegram alert failed.");
    return false;
  }
}

void updateLeakDetection(const DateTime &date, uint32_t nowMs, double litresUsed) {
  // Belajar baseline hanya ketika aliran berada pada paras normal.
  if (flowRate >= LEAK_REFERENCE_FLOOR_LPM) {
    baselineFlowRate = baselineFlowRate <= 0.0F
      ? flowRate
      : (baselineFlowRate * 0.95F) + (flowRate * 0.05F);
  }

  const bool drasticDrop = baselineFlowRate >= LEAK_REFERENCE_FLOOR_LPM &&
                           flowRate <= (baselineFlowRate * FLOW_DROP_RATIO);
  if (drasticDrop) {
    if (flowDropSince == 0) {
      flowDropSince = nowMs;
      abnormalLitres = 0.0;
    }
    abnormalLitres += litresUsed;
  } else {
    flowDropSince = 0;
    abnormalLitres = 0.0;
    leakAlertActive = false;
    firebaseAlertQueued = false;
    telegramAlertDelivered = false;
  }

  if (flowDropSince != 0 && nowMs - flowDropSince >= LEAK_DURATION_MS) {
    leakAlertActive = true;
    if (!firebaseAlertQueued) firebaseAlertQueued = pushFirebaseAlert(date, nowMs);
    if (!telegramAlertDelivered &&
        (lastTelegramAttempt == 0 || nowMs - lastTelegramAttempt >= 30000UL)) {
      telegramAlertDelivered = sendTelegramAlert(date, nowMs);
    }
  }
}

void updateLcd(const DateTime &date, uint32_t nowMs) {
  printLcdLine(0, "WATER USAGE");
  printLcdLine(1, "Flow: " + String(flowRate, 2) + " L/min");
  printLcdLine(2, "Month: " + String(monthlyLitres, 2) + " L");

  char line[21];
  snprintf(line, sizeof(line), "%02d/%02d/%04d %-7s", date.day(), date.month(), date.year(),
           strcmp(leakageStatus(nowMs), "Normal") == 0 ? "OK" : "ALERT");
  printLcdLine(3, line);
}

void sampleSensor(uint32_t nowMs) {
  const uint32_t elapsedMs = nowMs - lastSample;
  lastSample = nowMs;

  portENTER_CRITICAL(&pulseMux);
  const uint32_t pulses = pulseCount;
  pulseCount = 0;
  portEXIT_CRITICAL(&pulseMux);

  const double litresUsed = static_cast<double>(pulses) / PULSES_PER_LITRE;
  flowRate = elapsedMs > 0 ? litresUsed * 60000.0 / elapsedMs : 0.0F;

  DateTime date = rtc.now();
  checkNewMonth(date);
  totalLitres += litresUsed;
  monthlyLitres += litresUsed;
  if (pulses > 0) storageDirty = true;

  updateLeakDetection(date, nowMs, litresUsed);
  updateLcd(date, nowMs);

  Serial.printf("%02u/%02u/%04u | Flow %.2f L/min | Baseline %.2f L/min | Total %.3f L | Month %.3f L | %s\n",
                date.day(), date.month(), date.year(), flowRate, baselineFlowRate, totalLitres, monthlyLitres,
                leakageStatus(nowMs));

  if (nowMs - lastCloudSend >= CLOUD_INTERVAL_MS) {
    lastCloudSend = nowMs;
    String json = makeReadingJson(date, nowMs);
    pushFirebaseReading(json);
    Serial.println(json);
  }
}

void processFirebaseResult(AsyncResult &result) {
  if (!result.isResult()) return;
  if (result.isError()) {
    Serial.printf("Firebase error [%s]: %s (%d)\n", result.uid().c_str(),
                  result.error().message().c_str(), result.error().code());
    if (result.uid() == "pushAlert") firebaseAlertQueued = false;
  } else if (result.available()) {
    Serial.printf("Firebase OK [%s]\n", result.uid().c_str());
  }
}

void setup() {
  Serial.begin(115200);
  Wire.begin(SDA_PIN, SCL_PIN);
  lcd.init();
  lcd.backlight();
  printLcdLine(0, "Water Monitoring");
  printLcdLine(1, "Starting system...");

  if (!rtc.begin()) {
    printLcdLine(0, "RTC ERROR");
    Serial.println("DS3231 not found.");
    while (true) delay(1000);
  }
  if (rtc.lostPower()) rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));

  loadData();
  checkNewMonth(rtc.now());
  pinMode(FLOW_SENSOR_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_PIN), pulseCounter, FALLING);

  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  connectWiFi(millis(), true);

  // UTC digunakan untuk timestamp Firebase; RTC masih digunakan untuk paparan dan pertukaran bulan.
  configTime(0, 0, "pool.ntp.org", "time.google.com");
  firebaseSsl.setInsecure();
  firebaseSsl.setConnectionTimeout(1000);
  firebaseSsl.setHandshakeTimeout(5);
  telegramSsl.setCACert(TELEGRAM_CERTIFICATE_ROOT);

  if (firebaseConfigured()) {
    signup(firebaseClient, firebaseApp, getAuth(firebaseGuest), processFirebaseResult, "anonymousAuth");
    firebaseApp.getApp<RealtimeDatabase>(database);
    database.url(FIREBASE_DATABASE_URL);
  } else {
    Serial.println("Firebase disabled: fill the inline Firebase configuration above.");
  }

  if (!telegramConfigured()) Serial.println("Telegram disabled: fill the inline Telegram configuration above.");
  lastSample = millis();
  printLcdLine(0, "System ready");
}

void loop() {
  const uint32_t nowMs = millis();
  connectWiFi(nowMs);
  if (firebaseConfigured()) firebaseApp.loop();

  if (nowMs - lastSample >= SAMPLE_INTERVAL_MS) sampleSensor(nowMs);

  if (storageDirty && nowMs - lastSave >= SAVE_INTERVAL_MS) {
    lastSave = nowMs;
    saveData();
  }

  delay(2);
}
