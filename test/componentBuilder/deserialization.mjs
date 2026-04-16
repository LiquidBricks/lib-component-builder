import test from 'node:test'
import assert from 'node:assert/strict'

import { deserializeRegistration } from '../../componentBuilder/registration.js'

const codeRef = { file: '/tmp/file.js', line: 1, column: 2 }

test('deserializeRegistration', async (t) => {
  await t.test('normalizes and trims registration fields', () => {
    const parsed = deserializeRegistration({
      name: ' my-comp ',
      hash: ' hash-123 ',
      imports: [
        {
          name: ' shared ',
          hash: ' import-hash ',
          inject: { ' src.a ': [' tgt.b '] },
          codeRef,
        },
      ],
      gates: [
        {
          name: ' setup ',
          hash: ' gate-hash ',
          inject: { ' src.b ': [' tgt.c '] },
          deps: [' task.work '],
          waitFor: [' data.value '],
          fnc: '() => 2',
          codeRef,
        },
      ],
      data: [
        {
          name: ' value ',
          deps: [' task.result '],
          inject: [' data.other '],
          fnc: '() => 1',
          codeRef,
        },
      ],
      tasks: [
        {
          name: ' work ',
          deps: [' data.value '],
          inject: [' data.other '],
          fnc: '() => true',
          codeRef,
        },
      ],
    })

    assert.equal(parsed.name, 'my-comp')
    assert.equal(parsed.hash, 'hash-123')
    assert.deepEqual(parsed.imports[0], {
      name: 'shared',
      hash: 'import-hash',
      inject: { 'src.a': ['tgt.b'] },
      waitFor: [],
      codeRef,
    })
    assert.deepEqual(parsed.gates[0], {
      name: 'setup',
      hash: 'gate-hash',
      inject: { 'src.b': ['tgt.c'] },
      waitFor: ['data.value'],
      deps: ['task.work'],
      fnc: '() => 2',
      codeRef,
    })
    assert.deepEqual(parsed.data[0].deps, ['task.result'])
    assert.deepEqual(parsed.data[0].waitFor, [])
    assert.deepEqual(parsed.tasks[0].inject, ['data.other'])
    assert.deepEqual(parsed.tasks[0].waitFor, [])
  })

  await t.test('applies defaults when optional sections are missing', () => {
    const parsed = deserializeRegistration({ name: 'simple', hash: 'h1' })
    assert.deepEqual(parsed.imports, [])
    assert.deepEqual(parsed.gates, [])
    assert.deepEqual(parsed.data, [])
    assert.deepEqual(parsed.tasks, [])
  })

  await t.test('rejects invalid shapes', () => {
    assert.throws(() => deserializeRegistration(), /Component registration must be an object/i)
    assert.throws(
      () => deserializeRegistration({ name: 'x', hash: 'y', data: {} }),
      /data must be an array/i
    )
  })
})
