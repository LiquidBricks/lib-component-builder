import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { component } from '../../componentBuilder/index.js'
import { asRegistration, findNodeByName, sanitizeRegistration } from './helpers.js'

const thisTestFile = fileURLToPath(import.meta.url)

test('gate registration', async (t) => {
  await t.test('requires a name', () => {
    const comp = component('my-comp')
    assert.throws(() => comp.gate('', { hash: 'abc', fnc: () => 1 }), /gates must be non-empty/i)
  })

  await t.test('requires an options object with a hash string', () => {
    const comp = component('my-comp')
    assert.throws(() => comp.gate('setup'), /requires an options object/i)
    assert.throws(() => comp.gate('setup', {}), /hash must be a non-empty string/i)
  })

  await t.test('rejects non-function inject', () => {
    const comp = component('my-comp')
    assert.throws(() => comp.gate('setup', { hash: 'abc', fnc: () => 1, inject: [] }), /inject must be a function/i)
  })

  await t.test('rejects non-function fnc', () => {
    const comp = component('my-comp')
    assert.throws(() => comp.gate('setup', { hash: 'abc', fnc: 'nope' }), /fnc must be a function/i)
  })

  await t.test('accepts a component instance as the hash source', () => {
    const target = component('target-comp')
    const consumer = component('consumer').gate('setup', { hash: target, fnc: () => 1 })

    const targetReg = asRegistration(target)
    const consumerReg = asRegistration(consumer)
    const gate = findNodeByName(consumerReg, 'gates', 'setup')

    assert(gate, 'expected gate "setup" to be registered')
    assert.equal(gate.hash, targetReg.hash)
  })

  await t.test('stores hash, fnc, deps, waitFor, inject and codeRef for gate', () => {
    const comp = component('consumer').gate('setup', { hash: 'abc123', fnc: () => true, deps: _ => [_.task.check], waitFor: _ => [_.data.ready], inject: _ => [_.setup.data.path(_.data.src)] })
    const registration = asRegistration(comp)
    const gate = findNodeByName(registration, 'gates', 'setup')

    assert(gate, 'expected gate "setup" to be registered')
    assert.equal(gate.hash, 'abc123')
    assert.deepEqual(gate.inject, { 'data.src': ['setup.data.path'] })
    assert.deepEqual(gate.waitFor.sort(), ['data.ready'])
    assert.deepEqual(gate.deps.sort(), ['task.check'])
    assert.equal(typeof gate.fnc, 'string')
    assert.equal(path.resolve(gate.codeRef.file), path.resolve(thisTestFile))
    assert.equal(typeof gate.codeRef.line, 'number')
    assert.equal(typeof gate.codeRef.column, 'number')
  })

  await t.test('registration snapshot (gates full)', () => {
    const injectFn = _ => [_.setup.data.filePath(_.data.fp)]
    const comp = component('gates-full')
      .gate('setup', { hash: 'abc123', fnc: () => true, inject: injectFn, deps: _ => [_.task.check], waitFor: _ => [_.data.ready] })

    const registration = sanitizeRegistration(asRegistration(comp))
    const codeRefFor = (name) => registration.gates.find(i => i.name === name)?.codeRef
    const expected = {
      name: 'gates-full',
      hash: registration.hash,
      imports: [],
      gates: [
        {
          name: 'setup',
          hash: 'abc123',
          inject: { 'data.fp': ['setup.data.filePath'] },
          waitFor: ['data.ready'],
          deps: ['task.check'],
          fnc: String(() => true),
          codeRef: codeRefFor('setup'),
        },
      ],
      data: [],
      tasks: [],
    }
    assert.deepEqual(registration, expected)
  })
})
