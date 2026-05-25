import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const srcPath = fileURLToPath(new URL('./src', import.meta.url))
const serverOnlyStubPath = fileURLToPath(new URL('./src/test/server-only.ts', import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@': srcPath,
      'server-only': serverOnlyStubPath,
    },
  },
  test: {
    environment: 'node',
    exclude: [
      '**/node_modules/**',
      '**/.git/**',
      '**/.claude/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'src/app/api/**/*.ts',
        'src/proxy.ts',
        'src/lib/**/*.ts',
      ],
      exclude: [
        'src/**/*.test.ts',
        'src/**/__tests__/**',
        'src/lib/supabase/**/*.ts',
        'src/lib/tributario/cnae.ts',
        'src/lib/tributario/cnaeDetalhe.ts',
      ],
      thresholds: {
        'src/lib/tributario/index.ts': {
          lines: 80,
          functions: 80,
          statements: 80,
          branches: 70,
        },
        'src/lib/tributario/alertas.ts': {
          lines: 80,
          functions: 80,
          statements: 80,
          branches: 70,
        },
        'src/lib/tributario/fatorR.ts': {
          lines: 80,
          functions: 80,
          statements: 80,
          branches: 70,
        },
        'src/lib/tributario/simples.ts': {
          lines: 80,
          functions: 80,
          statements: 80,
          branches: 70,
        },
        'src/lib/tributario/presumido.ts': {
          lines: 80,
          functions: 80,
          statements: 80,
          branches: 70,
        },
        'src/lib/tributario/real.ts': {
          lines: 80,
          functions: 80,
          statements: 80,
          branches: 70,
        },
      },
    },
  },
})
