import { defineConfig } from 'vitest/config'

// Slot maths runs on the phone's local time. Pin the residence's timezone so
// the tests behave the same on every computer, including across DST changes.
process.env.TZ = 'Europe/Rome'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
})
