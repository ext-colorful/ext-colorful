import { defineConfig } from 'wxt';

export default defineConfig({
  // Use `src` as the source directory to align with this repository's structure
  srcDir: 'src',
  manifest: {
    manifest_version: 3,
    name: 'Colorful Background Extension',
    description: 'Recolor website backgrounds per-site with preset and custom colors.',
    version: '0.1.0',
    action: {
      default_title: 'Colorful Background',
      default_popup: 'popup/index.html',
    },
    options_ui: {
      page: 'options/index.html',
      open_in_tab: true,
    },
    background: {
      service_worker: 'background.ts',
      type: 'module',
    },
    content_scripts: [
      {
        matches: ['<all_urls>'],
        js: ['content/colorizer.ts'],
        run_at: 'document_idle',
      },
    ],
    permissions: ['storage', 'tabs', 'scripting'],
    host_permissions: ['<all_urls>'],
    icons: {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
      48: 'icons/icon-48.png',
      128: 'icons/icon-128.png',
    },
  },
});
