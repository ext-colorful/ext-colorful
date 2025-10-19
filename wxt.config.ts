import { defineConfig, defineManifest } from 'wxt';

export default defineConfig({
  manifest: defineManifest(({ mode }) => {
    const isDev = mode === 'development';

    return {
      manifest_version: 3,
      name: isDev ? '__MSG_extNameDev__' : '__MSG_extName__',
      description: '__MSG_extDescription__',
      default_locale: 'en',
      icons: {
        '16': 'icons/16.png',
        '32': 'icons/32.png',
        '48': 'icons/48.png',
        '128': 'icons/128.png',
      },
      action: {
        default_popup: 'popup.html',
        default_icon: {
          '16': 'icons/16.png',
          '32': 'icons/32.png',
          '48': 'icons/48.png',
          '128': 'icons/128.png',
        },
      },
      background: {
        service_worker: 'background.js',
        type: 'module',
      },
      options_ui: {
        page: 'options.html',
        open_in_tab: true,
      },
      content_scripts: [
        {
          matches: ['<all_urls>'],
          js: ['content-scripts/content.js'],
          run_at: 'document_end',
        },
      ],
      permissions: ['storage', 'scripting', 'activeTab', 'contextMenus'],
      host_permissions: ['<all_urls>'],
    } as const;
  }),
});
