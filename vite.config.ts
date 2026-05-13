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
      modulePreload: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('preload-helper')) {
              return 'preload-helper'
            }

            if (!id.includes('node_modules')) {
              return undefined
            }

            if (id.includes('/buffer/')) {
              return 'vendor-buffer'
            }

            if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/react-router/')) {
              return 'vendor-react'
            }

            if (id.includes('/@mysten/') || id.includes('/@pythnetwork/') || id.includes('/@cetusprotocol/')) {
              return 'vendor-sui'
            }

            if (id.includes('/@web3auth/')) {
              return 'vendor-web3auth'
            }

            if (id.includes('/recharts/') || id.includes('/d3-')) {
              return 'vendor-charts'
            }

            if (id.includes('/@radix-ui/') || id.includes('/lucide-react/') || id.includes('/motion/')) {
              return 'vendor-ui'
            }

            return undefined
          },
        },
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
