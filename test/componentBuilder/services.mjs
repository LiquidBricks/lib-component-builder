import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { component } from '../../componentBuilder/index.js'
import { asRegistration, findNodeByName, sanitizeRegistration } from './helpers.js'

const thisTestFile = fileURLToPath(import.meta.url)

test('service registration', async (t) => {
  await t.test('throws when calling service() without a method', () => {
    const comp = component('svc')
    assert.throws(() => comp.service(), /service\.provide.*service\.require/i)
  })

  await t.test('rejects non-function inject', () => {
    const comp = component('svc')
    assert.throws(() => comp.service.provide('bad', { inject: [], fnc: () => true }), /inject must be a function/i)
  })

  await t.test('service.require takes only a name', () => {
    const comp = component('svc')
    assert.throws(() => comp.service.require('bad', {}), /only accepts a service name/i)
  })

  await t.test('registers provided and required services with deps and injects', () => {
    const depsForProvided = ({ data: { value } }) => value
    const injectForProvided = _ => [_.words.data.value]
    const provideFn = ({ deps: { data: { value } } }) => value + 1

    const comp = component('svc')
      .service.provide('adder', { deps: depsForProvided, inject: injectForProvided, fnc: provideFn })
      .service.require('job-consumer')

    const registration = asRegistration(comp)
    const provided = findNodeByName(registration, 'services', 'adder')
    const required = registration.services.require.includes('job-consumer')

    assert(provided, 'expected provided service "adder" to be registered')
    assert(required, 'expected required service "job-consumer" to be registered')
    assert.deepEqual(provided.deps, ['data.value'])
    assert.deepEqual(provided.inject, ['words.data.value'])
    assert.equal(provided.fnc, String(provideFn))

    for (const node of registration.services.provide) {
      assert.equal(path.resolve(node.codeRef.file), path.resolve(thisTestFile))
      assert.equal(typeof node.codeRef.line, 'number')
      assert.ok(node.codeRef.line > 0)
      assert.equal(typeof node.codeRef.column, 'number')
      assert.ok(node.codeRef.column > 0)
    }
  })

  await t.test('registration snapshot (services empty)', () => {
    const comp = component('services-empty')
    const registration = sanitizeRegistration(asRegistration(comp))
    const expected = {
      name: 'services-empty',
      hash: registration.hash,
      imports: [],
      data: [],
      tasks: [],
      services: { provide: [], require: [] },
    }
    assert.deepEqual(registration, expected)
  })

  await t.test('registration snapshot (services full)', () => {
    const depsProvide = ({ data: { value } }) => value
    const injectProvide = _ => [_.words.data.value]
    const provideFn = ({ deps: { data: { value } } }) => value + 2

    const comp = component('services-full')
      .service.provide('api', { deps: depsProvide, inject: injectProvide, fnc: provideFn })
      .service.require('logger')

    const registration = sanitizeRegistration(asRegistration(comp))
    const codeRefFor = (name) => registration.services.provide.find(s => s.name === name)?.codeRef
    const expected = {
      name: 'services-full',
      hash: registration.hash,
      imports: [],
      data: [],
      tasks: [],
      services: {
        provide: [
          {
            name: 'api',
            deps: ['data.value'],
            inject: ['words.data.value'],
            fnc: String(provideFn),
            codeRef: codeRefFor('api'),
          },
        ],
        require: ['logger'],
      },
    }
    assert.deepEqual(registration, expected)
  })
})
