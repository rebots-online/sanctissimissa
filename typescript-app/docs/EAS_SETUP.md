# EAS (Expo Application Services) Setup Guide

## What is EAS?
EAS is Expo's build service that helps compile your React Native app into native iOS and Android apps. It provides:
- Cloud builds
- Updates over the air
- Automated submissions to app stores

## Setup Steps

1. Install EAS CLI:
```bash
npm install -g eas-cli
```

2. Login to EAS:
```bash
eas login
```

3. Initialize EAS project:
```bash
eas build:configure
```

4. Generate a new keystore (if you don't have one):
```bash
eas build:configure --platform android
```

5. Configure build profiles in eas.json (already done)

6. Test development build for Z Fold 3:
```bash
eas build -p android --profile fold-test
```

## Quick Development Setup

For immediate testing on your connected Z Fold 3:

1. Install development client:
```bash
eas build:configure
eas build --profile development --platform android
```

2. Install build on device:
```bash
adb install your-app.apk
```

## Security Note
- Keystore and credentials will be managed by EAS
- No need to manage keystore files manually
- Secure cloud-based credential storage

## Next Steps
1. Run `eas login` to set up your account
2. Run `eas build:configure` to initialize the project
3. Use `npm run build:fold-test` to create a test build

## Configuration Files
All necessary configuration files are already set up in the project:
- eas.json - Build profiles
- app.json - Expo configuration
- package.json - Build scripts