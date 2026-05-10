import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || env.VITE_API_URL || 'http://laravel-api:80'

  return {
    plugins: [
      figmaAssetResolver(),
      // The React and Tailwind plugins are both required for Make, even if
      // Tailwind is not being actively used – do not remove them
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        // Alias @ to the src directory
        '@': path.resolve(__dirname, './src'),
        /** Mysten v2 aligned with Cetus aggregator-sdk (nested dep); use only for Sui swap PTB. */
        '@cetus-mysten/transactions': path.resolve(
          __dirname,
          'node_modules/@cetusprotocol/aggregator-sdk/node_modules/@mysten/sui/dist/transactions/index.mjs',
        ),
        '@cetus-mysten/json-rpc': path.resolve(
          __dirname,
          'node_modules/@cetusprotocol/aggregator-sdk/node_modules/@mysten/sui/dist/jsonRpc/index.mjs',
        ),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3003,
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
        '/sanctum': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
    build: {
      rollupOptions: {
        onwarn(warning, warn) {
          if (
            warning.message.includes('contains an annotation that Rollup cannot interpret due to the position of the comment')
            && warning.message.includes('node_modules/')
          ) {
            return
          }

          warn(warning)
        },
      },
      chunkSizeWarningLimit: 1300,
    },

    // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
    assetsInclude: ['**/*.svg', '**/*.csv'],
  }
})
