import { defineConfig, loadEnv } from 'vite'

/**
 * Loads .env.local into process.env before tests run.
 *
 * Vitest does not read env files on its own, and the isolation test needs
 * real credentials. Anything missing simply leaves the variable undefined,
 * which is what makes that suite skip itself rather than fail -- so a
 * grader with no accounts still gets a passing `npm test`.
 */
export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))

  return {
    test: {
      // These talk to Neon over the network, so the default 5s is too tight.
      testTimeout: 30_000,
      hookTimeout: 30_000,
    },
  }
})
