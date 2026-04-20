---
name: mobile-release
description: Prepares and ships a mobile app build to the App Store, Play Store, TestFlight, or internal testing tracks. Handles versioning, signing, metadata, privacy labels, and the pre-submission checklist. Use when the user says "ship the app", "submit to the store", "cut a mobile release", "prepare a TestFlight build", or "upload to Play Console".
---

# Skill: mobile-release

## When to use this skill
Load this skill when the task involves getting a build into users' hands through a platform's release channel:
- App Store / TestFlight (iOS)
- Play Store / internal testing / closed beta (Android)
- Internal distribution (Firebase App Distribution, Microsoft App Center)

Do **not** use this skill for routine dev builds on a simulator or debug APKs — those are the normal build command in `context.md`.

## What "released" means
A release is only done when:
1. The build is signed with the production cert / upload key
2. Version + build number are bumped and tagged in git
3. Metadata (release notes, screenshots if changed, privacy labels if changed) is up to date
4. The submission has passed internal review on at least one real device
5. The build is either live or queued in the store's review pipeline
6. `state.json` reflects the submitted version

## Pre-submission checklist

### Versioning
- [ ] iOS: `CFBundleShortVersionString` is the user-facing version (semver), `CFBundleVersion` is the build number (monotonic)
- [ ] Android: `versionName` is the user-facing version, `versionCode` is the monotonic integer
- [ ] Build number **strictly greater** than any prior submission — store rejects duplicates
- [ ] Git tag: `v{versionName}+{build}` after submission

### Signing
- [ ] iOS: production provisioning profile + distribution cert — not development
- [ ] Android: upload key in CI secret store; never in the repo
- [ ] Check the keystore alias and password are correct before invoking the release build

### Permissions & privacy
- [ ] Every iOS permission used has a `UsageDescription` string that explains *why* in user terms ("so you can attach photos to your message")
- [ ] Every Android permission is declared in `AndroidManifest.xml` and justified in the Play Console Data Safety form
- [ ] App Store Connect "App Privacy" labels match what the code actually collects — if analytics / crash SDKs changed, this changes
- [ ] Child-directed or health/financial data triggers extra questionnaires — fill them honestly

### Content
- [ ] Release notes written in plain user language — not the commit log
- [ ] Screenshots updated if any user-visible UI changed that's in the store listing
- [ ] Support URL and privacy-policy URL live and correct

### Build quality
- [ ] Last dev-cycle tests green
- [ ] No debug flags, mock endpoints, or `console.log` / `print` of sensitive data in the release build
- [ ] App opens, core flow works, and exit-resume works on a real device (not just sim)
- [ ] Crash reporting SDK initialised and reporting to the **production** project, not staging

## Workflow

### iOS → TestFlight / App Store
1. Check current version in Xcode target → General → Identity. Bump build number (CI or manually)
2. Clean build: `xcodebuild clean -workspace App.xcworkspace -scheme App`
3. Archive with the distribution profile: `xcodebuild archive -workspace ... -scheme App -archivePath build/App.xcarchive`
4. Export IPA using `exportOptions.plist` (AppStore method)
5. Upload with `xcrun altool --upload-app -f App.ipa --apiKey ... --apiIssuer ...` or Transporter
6. Wait for Apple's processing (5–30 minutes)
7. Add the build to the TestFlight test group *or* submit for App Store review
8. Tag git: `git tag v{version}+{build} && git push --tags`

### Android → Play Console (internal / closed / production track)
1. Bump `versionCode` and `versionName` in `app/build.gradle.kts`
2. Clean build: `./gradlew clean`
3. Bundle: `./gradlew bundleRelease` (AAB is required; APK is legacy)
4. Sign (Play App Signing handles production; upload key still required)
5. Upload via `fastlane supply` or the Play Console UI to the chosen track
6. Roll out — start at 10–20% for production, then ramp
7. Tag git

### React Native / Expo
- `expo build:ios`, `expo build:android`, or `eas build --platform all --profile production` depending on the project
- Same checklist above still applies — Expo doesn't relax the store's rules

### Flutter
- `flutter build ipa --release` (iOS), `flutter build appbundle --release` (Android)
- Same checklist

## Rollback
- **iOS:** no true rollback once live. Submit an expedited review with the previous build + bumped build number
- **Android:** halt the staged rollout immediately (Play Console → Production track → Halt rollout). The previous version stays on devices that didn't update
- Communicate with support & ops before rolling back — users who already have the new build keep it

## Handoffs
- Before submission: hand off to **QA agent** for a full release-candidate test pass on real devices
- After submission: notify the user with the store review ticket / TestFlight link and hand back to the **product-owner** for release-note publishing

## What you never do
- Never upload a build signed with a debug or development cert
- Never ship without bumping the build number
- Never change the app's bundle ID / application ID once live — it breaks the upgrade path
- Never add a new permission without updating the store's privacy metadata
- Never commit a signing key, p12, provisioning profile, or Play service account JSON
