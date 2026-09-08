# VERIFY - Android Studio Testing Guide

This project includes a complete, pre-configured **Android Studio project** located in the `/android` directory. It packages the application into an Android app with native hardware integration (Camera, Geolocation, Audio Microphone) and Android 14/15 compatibility.

---

## 🚀 Quick Start in Android Studio

### 1. Open in Android Studio
1. Launch **Android Studio**.
2. Click **Open** (or `File` > `Open...`).
3. Navigate to and select the **`android`** folder inside this project repository.
4. Click **OK**.

### 2. Gradle Sync
Android Studio will automatically detect `settings.gradle` and `app/build.gradle`:
- Click **Sync Project with Gradle Files** (the elephant icon in the top toolbar) if prompted.
- Required Android SDK: **API 34 (Android 14)** or above (minSdk 24 - Android 7.0+).

### 3. Run on Device / Emulator
1. Select an **Android Virtual Device (AVD)** (e.g., Pixel 8 with API 34) or connect a physical Android device with USB debugging enabled.
2. Click the green **Run** button (`Shift + F10`).
3. The app will launch with the **VERIFY** launcher icon and native status bar styling.

---

## 📱 What You Can Test in Android Studio

### A. First-Time Setup
- **Record House Video**: Tests camera hardware access (`CameraX` / HTML5 MediaDevices via WebView). Allows recording walkthrough video with automatic frame sampling as you walk around rooms (stove, door, AC, windows).
- **Verify Default Checklist (Manual Only)**: Directly loads the home safety items without needing video/photo proofs.

### B. Manual Verification (Routine Departure)
- **One-Tap Verification**: Tap on any item (Gas Stove, Main Entrance Door, Air Conditioner, Balcony Windows) to verify its safety state manually.
- **Verify All Safe**: One-tap action to quickly mark all home safety items as secured before walking out.
- **Voice Assistant**: Tap the speaker icon to hear audio confirmation of your home security readiness.

### C. Geofence & Departure Detection
- Test real GPS or simulated departure:
  - Inside the app, tap the **Departure Simulation** toggle or change geofence distance.
  - When stepping outside the geofence, the heads-up **Departure Notification Banner** appears immediately prompting you to verify any unchecked items.

---

## 🛠️ Testing Options in `MainActivity.java`

Inside `android/app/src/main/java/com/verify/app/MainActivity.java`:
- **Offline / Local Bundled Build**: Loads `file:///android_asset/dist/index.html` (pre-bundled into the APK assets).
- **Android Emulator Live Dev**: Set URL to `http://10.0.2.2:3000` to connect to your local dev server running on your host computer.
- **Live Cloud Dev URL**: `https://ais-dev-7ohgcvluj2m7ekkvq2nxtu-547734793567.asia-southeast1.run.app`.

---

## 🔄 Updating Web Assets for Android
Whenever you modify web components and run `npm run build`, the production bundle is automatically mirrored into `android/app/src/main/assets/dist/`.
