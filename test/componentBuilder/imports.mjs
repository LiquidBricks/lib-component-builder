import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { component } from '../../componentBuilder/index.js'
import { asRegistration, findNodeByName, sanitizeRegistration } from './helpers.js'

const thisTestFile = fileURLToPath(import.meta.url)

test('import registration', async (t) => {
  await t.test('requires a name', () => {
    const comp = component('my-comp')
    assert.throws(() => comp.import('', { hash: 'abc' }), /imports must be non-empty/i)
  })

  await t.test('requires an options object with a hash string', () => {
    const comp = component('my-comp')
    assert.throws(() => comp.import('shared'), /requires an options object/i)
    assert.throws(() => comp.import('shared', {}), /hash must be a non-empty string/i)
  })

  await t.test('rejects non-function inject', () => {
    const comp = component('my-comp')
    assert.throws(() => comp.import('shared', { hash: 'abc', inject: [] }), /inject must be a function/i)
  })

  await t.test('accepts a component instance as the hash source', () => {
    const external = component('external-lib')
      .data('value', { fnc: () => 7 })
      .task('double', {
        deps: ({ data: { value } }) => value,
        fnc: ({ deps: { data: { value } } }) => value * 2,
      })

    const consumer = component('consumer').import('shared', { hash: external })

    const externalReg = asRegistration(external)
    const consumerReg = asRegistration(consumer)
    const imported = findNodeByName(consumerReg, 'imports', 'shared')

    assert(imported, 'expected import "shared" to be registered')
    assert.equal(imported.hash, externalReg.hash)
  })

  await t.test('stores hash and codeRef for imported component', () => {
    const comp = component('consumer').import('shared', { hash: 'abc123' })
    const registration = asRegistration(comp)
    const imported = findNodeByName(registration, 'imports', 'shared')

    assert(imported, 'expected import "shared" to be registered')
    assert.equal(imported.hash, 'abc123')
    assert.deepEqual(imported.inject, {})
    assert.equal(path.resolve(imported.codeRef.file), path.resolve(thisTestFile))
    assert.equal(typeof imported.codeRef.line, 'number')
    assert.equal(typeof imported.codeRef.column, 'number')
  })

  await t.test('captures inject mappings from callable dependency paths', () => {
    const comp = component('consumer').import('words', {
      hash: 'abc123',
      inject: _ => [
        _.words2.data.a(_.words.task.you),
        _.dbwork.task.a(_.words.sub1.data.a),
        _.data.a(_.words.task.you),
      ]
    })
    const registration = asRegistration(comp)
    const imported = findNodeByName(registration, 'imports', 'words')

    assert.deepEqual(imported.inject, {
      'words.task.you': ['words2.data.a', 'data.a'],
      'words.sub1.data.a': ['dbwork.task.a'],
    })
  })

  await t.test('registration snapshot (imports empty)', () => {
    const comp = component('imports-empty')
    const registration = sanitizeRegistration(asRegistration(comp))
    const expected = {
      name: 'imports-empty',
      hash: registration.hash,
      imports: [],
      data: [],
      tasks: [],
      services: { provide: [], require: [] },
    }
    assert.deepEqual(registration, expected)
  })

  await t.test('registration snapshot (imports full)', () => {
    const injectFn = _ => [_.alpha.data.a(_.beta.task.b)]
    const comp = component('imports-full')
      .import('shared', { hash: 'abc123', inject: injectFn })

    const registration = sanitizeRegistration(asRegistration(comp))
    const codeRefFor = (name) => registration.imports.find(i => i.name === name)?.codeRef
    const expected = {
      name: 'imports-full',
      hash: registration.hash,
      imports: [
        {
          name: 'shared',
          hash: 'abc123',
          inject: { 'beta.task.b': ['alpha.data.a'] },
          codeRef: codeRefFor('shared'),
        },
      ],
      data: [],
      tasks: [],
      services: { provide: [], require: [] },
    }
    assert.deepEqual(registration, expected)
  })
})
