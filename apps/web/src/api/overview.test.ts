import { expect, test } from 'bun:test'
import { periodRange } from './overview'

test('overview periods are inclusive windows ending today', () => {
  const today = new Date('2026-11-20T08:00:00Z')
  expect(periodRange('Today', today)).toEqual({ from: '2026-11-20', to: '2026-11-20' })
  expect(periodRange('Past 7 days', today)).toEqual({ from: '2026-11-14', to: '2026-11-20' })
  expect(periodRange('Past 30 days', today)).toEqual({ from: '2026-10-22', to: '2026-11-20' })
  expect(periodRange('This quarter', today)).toEqual({ from: '2026-10-01', to: '2026-11-20' })
})
