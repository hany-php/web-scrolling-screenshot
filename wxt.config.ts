import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: '__MSG_ext_name__',
    description: '__MSG_ext_description__',
    default_locale: 'en',
    permissions: ['activeTab', 'scripting', 'offscreen', 'downloads', 'storage'],
    commands: {
      'capture-full-page': {
        suggested_key: {
          default: 'Alt+Shift+F',
        },
        description: '__MSG_cmd_capture_full__',
      },
      'capture-region': {
        suggested_key: {
          default: 'Alt+Shift+R',
        },
        description: '__MSG_cmd_capture_region__',
      },
    },
    icons: {
      16: 'icon/16.png',
      32: 'icon/32.png',
      48: 'icon/48.png',
      128: 'icon/128.png',
    },
  },
});
