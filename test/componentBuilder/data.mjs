import test from 'node:test'
import assert from 'node:assert/strict'

import { component } from '../../componentBuilder/index.js'
import { asRegistration, findNodeByName, sanitizeRegistration } from './helpers.js'

test('data registration', async (t) => {
  await t.test('requires a name', () => {
    const comp = component('my-comp')
    assert.throws(() => comp.data(), /requires a data or list of datas/i)
  })

  await t.test('rejects non-function inject', () => {
    const comp = component('my-comp')
    assert.throws(() => comp.data('bad-inject', { inject: [] }), /inject must be a function/i)
  })

  await t.test('captures default deferred dependency when no definition is provided', () => {
    const comp = component('my-comp').data('defaults')
    const registration = asRegistration(comp)
    const node = findNodeByName(registration, 'data', 'defaults')
    assert(node, 'expected data node "defaults" to be registered')
    assert.deepEqual(node.deps, ['deferred.deferred'])
    assert.equal(node.fnc, undefined)
  })

  await t.test('captures default deferred dependency when definition is an empty object', () => {
    const comp = component('my-comp').data('defaults', {})
    const registration = asRegistration(comp)
    const node = findNodeByName(registration, 'data', 'defaults')
    assert(node, 'expected data node "defaults" to be registered')
    assert.deepEqual(node.deps, ['deferred.deferred'])
    assert.equal(node.fnc, undefined)
  })

  await t.test('defaults fnc to noop when omitted', () => {
    const comp = component('my-comp').data('with-default-fnc', { deps: ({ data: { seed } }) => seed })
    const registration = asRegistration(comp)
    const node = findNodeByName(registration, 'data', 'with-default-fnc')
    assert(node, 'expected data node "with-default-fnc" to be registered')
    assert.equal(node.fnc, '() => { }')
  })

  await t.test('rejects additional deps when using deferred dependency', () => {
    const comp = component('my-comp')
    assert.throws(
      () => comp.data('bad-deps', {
        deps: ({ deferred: { ready }, data: { other } }) => { ready; other },
      }),
      /deferred.*may not declare other dependencies/i
    )
  })

  await t.test('rejects fnc when using deferred dependency', () => {
    const comp = component('my-comp')
    assert.throws(
      () => comp.data('bad-fnc', {
        deps: ({ deferred: { ready } }) => ready,
        fnc: () => true,
      }),
      /deferred.*may not provide a fnc/i
    )
  })

  await t.test('defaults deps to empty when only fnc is provided', () => {
    const comp = component('my-comp').data('with-fnc', { fnc: () => 42 })
    const registration = asRegistration(comp)
    const node = findNodeByName(registration, 'data', 'with-fnc')
    assert(node, 'expected data node "with-fnc" to be registered')
    assert.deepEqual(node.deps, [])
  })

  await t.test('registration snapshot (data empty)', () => {
    const comp = component('data-empty')
    const registration = sanitizeRegistration(asRegistration(comp))
    const expected = {
      name: 'data-empty',
      hash: registration.hash,
      imports: [],
      data: [],
      tasks: [],
      services: { provide: [], require: [] },
    }
    assert.deepEqual(registration, expected)
  })

  await t.test('registration snapshot (data full)', () => {
    const depsSeed = ({ deferred: { ready } }) => ready
    const injectSeed = _ => [_.words.deferred.ready]
    const depsValue = ({ data: { seed } }) => seed
    const injectValue = _ => [_.words.data.seed]
    const valueFn = ({ deps: { data: { seed } } }) => seed * 3

    const comp = component('data-full')
      .data('seed', { deps: depsSeed, inject: injectSeed })
      .data('value', { deps: depsValue, inject: injectValue, fnc: valueFn })

    const registration = sanitizeRegistration(asRegistration(comp))
    const codeRefFor = (name) => registration.data.find(d => d.name === name)?.codeRef
    const expected = {
      name: 'data-full',
      hash: registration.hash,
      imports: [],
      data: [
        {
          name: 'seed',
          deps: ['deferred.ready'],
          inject: ['words.deferred.ready'],
          fnc: undefined,
          codeRef: codeRefFor('seed'),
        },
        {
          name: 'value',
          deps: ['data.seed'],
          inject: ['words.data.seed'],
          fnc: String(valueFn),
          codeRef: codeRefFor('value'),
        },
      ],
      tasks: [],
      services: { provide: [], require: [] },
    }
    assert.deepEqual(registration, expected)
  })
})
