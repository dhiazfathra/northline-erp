import { expect, test } from 'bun:test'
import { coverageCounts } from '../scripts/coverage'

// Update these as parity phases close rows (docs/goals/full-parity-v2.md).
test('_coverage.md status counts', () => {
  expect(coverageCounts()).toEqual({ total: 291, done: 274, outOfScope: 17, blocked: 0 })
})
