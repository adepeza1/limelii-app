import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.limelii.app',
  appName: 'Limelii',
  webDir: 'public',
  server: {
    // Point to your deployed Vercel URL so API routes and auth work.
    // Replace with your actual production URL before submitting to App Store.
    url: 'https://limelii-app.vercel.app',
    cleartext: false,
  },
};

export default config;
