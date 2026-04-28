import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.limelii.app',
  appName: 'Limelii',
  webDir: 'public',
  server: {
    url: 'https://limelii-app.vercel.app',
    cleartext: false,
    allowNavigation: ['*.kinde.com', 'limelii-app.vercel.app'],
  },
};

export default config;
