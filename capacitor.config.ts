import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.zhangcuncai.wordatlas',
  appName: '词光',
  webDir: 'dist',
  backgroundColor: '#090d1b',
  loggingBehavior: 'debug',
  server: { hostname: 'localhost', androidScheme: 'https' },
  android: { allowMixedContent: false },
  plugins: {
    SystemBars: {
      insetsHandling: 'native',
      initialViewportFitValueHint: 'cover',
      style: 'DARK',
    },
  },
};

export default config;
