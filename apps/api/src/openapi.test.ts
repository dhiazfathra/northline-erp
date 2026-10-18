import { expect, test } from 'bun:test'
import { Hono } from 'hono'
import { openApiSpec } from './openapi'

test('spec lists routes with path params and enums', () => {
  const app = new Hono().use('*', async (_, n) => n()).get('/reports/:side{sales|purchase}/x', c => c.text('')).post('/me', c => c.text(''))
  const s = openApiSpec(app, '/api')
  expect(Object.keys(s.paths).sort()).toEqual(['/api/me', '/api/reports/{side}/x'])
  expect((s.paths['/api/reports/{side}/x']!.get as any).parameters[0].schema.enum).toEqual(['sales', 'purchase'])
})
