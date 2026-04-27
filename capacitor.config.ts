import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.limelii.app',
  appName: 'Limelii',
  webDir: 'out',
  server: {
    // Point to your deployed Vercel URL so API routes and auth work.
    // Replace with your actual production URL before submitting to App Store.
    url: 'https://limelii.com',
    cleartext: false,
  },
};

export default config;
