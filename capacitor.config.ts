import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'be.troqly.app',
  appName: 'Troqly.be',
  webDir: 'dist',
  server: {
    // Hybrid mode: the app ships with the bundled web assets (offline-capable
    // first launch). At runtime the app fetches https://troqly.be/version.json
    // and compares it with the embedded build version. If a newer version is
    // detected, the user is prompted to switch to the live site (which then
    // becomes the active WebView origin until the next app restart, OR until
    // we publish a new AAB that bundles the new local assets).
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: '#FFFFFF',
      showSpinner: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#FFFFFF',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
