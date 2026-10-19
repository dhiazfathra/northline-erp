import { expect, test } from 'bun:test'
import { fifoCost, layers } from '../src/inventory/fifo'

// NL-TP-B1 on Trade Portal Demo (ADR-0029 finding 6): 10 @ 100.000 + 10 @ 120.000, sell 15. Cents.
const buys = [{ date: '2045-03-05', quantity: 10, value: 100_000_000 }, { date: '2045-03-12', quantity: 10, value: 120_000_000 }]

test('FIFO (default) costs 15 at 1.600.000', () => expect(fifoCost(layers(buys), 15)).toBe(160_000_000))
test('AVERAGE costs 15 at 1.650.000 and keeps the rest at 110.000', () => {
  expect(fifoCost(layers(buys, 'AVERAGE'), 15)).toBe(165_000_000)
  const rest = layers([...buys, { date: '2045-03-20', quantity: -15, value: -165_000_000 }, { date: '2045-03-25', quantity: 5, value: 65_000_000 }], 'AVERAGE')
  expect(rest).toEqual([{ date: '2045-03-25', qty: 10, unitCost: 12_000_000 }]) // (550.000 + 650.000) / 10
})
test('AVERAGE refuses to oversell', () => expect(() => fifoCost(layers(buys, 'AVERAGE'), 21)).toThrow('Stok tidak cukup'))
