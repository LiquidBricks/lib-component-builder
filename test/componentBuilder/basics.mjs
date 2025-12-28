import test from 'node:test'
import assert from 'node:assert/strict'

import { component } from '../../componentBuilder/index.js'
import { s, isAComponent } from '../../componentBuilder/help.js'
import { asRegistration } from './helpers.js'

test('component basics', async (t) => {
  await t.test('uses "component" as default name when missing', () => {
    const comp = component()
    assert.ok(isAComponent(comp))

    const registration = asRegistration(comp)
    assert.equal(registration.name, 'component')
    assert.equal(typeof registration.hash, 'string')
  })

  await t.test('throws when component name is empty', () => {
    assert.throws(() => component(''), /components must be non-empty/i)
  })

  await t.test('serializes registration through toJSON and JSON.stringify', () => {
    const comp = component('json-comp')
      .data('value', { fnc: () => 1 })
      .task('double', {
        deps: ({ data: { value } }) => value,
        fnc: ({ deps: { data: { value } } }) => value * 2,
      })

    const registration = comp[s.INTERNALS].registration()
    const json = comp.toJSON()

    assert.deepEqual(json, registration)
    assert.deepEqual(asRegistration(comp), registration)
  })
})
