import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { component } from '../../componentBuilder/index.js'
import { s, isAComponent } from '../../componentBuilder/help.js'
import { asRegistration, sanitizeRegistration } from './helpers.js'

const thisTestFile = fileURLToPath(import.meta.url)

test('task registration and dependency capture', async (t) => {
  await t.test('rejects non-function inject', () => {
    const comp = component('test123')
    assert.throws(() => comp.task('bad-inject', { inject: [], fnc: () => true }), /inject must be a function/i)
  })

  await t.test('registers data and tasks with their dependency paths', () => {
    const comp = component('test123')
      .data('book-type', {
        deps: ({ deferred: { ready } }) => ready,
      })
      .data('x', {
        deps: ({ deferred: { seed } }) => seed,
      })
      .data('y', {
        deps: ({ data: { x } }) => x,
        fnc: ({ deps: { data: { x } } }) => x + 3,
      })
      .task('sum', {
        deps: ({ data: { x, y } }) => { x; y },
        fnc: ({ deps: { data: { x, y } } }) => x + y,
      })
      .task('info', {
        deps: ({ data: { y }, task: { sum } }) => { sum; y },
        fnc: ({ deps: { data: { y }, task: { sum } } }) => ({ y, sum }),
      })

    assert.ok(isAComponent(comp))
    assert.equal(comp[s.IDENTITY.COMPONENT], true)

    const registration = asRegistration(comp)

    assert.equal(registration.name, 'test123')
    assert.equal(typeof registration.hash, 'string')
    assert.equal(registration.hash.length, 64)

    assert.deepEqual(registration.data.map(({ name, deps }) => ({ name, deps })), [
      { name: 'book-type', deps: ['deferred.ready'] },
      { name: 'x', deps: ['deferred.seed'] },
      { name: 'y', deps: ['data.x'] },
    ])

    assert.deepEqual(registration.tasks.map(({ name, deps }) => ({ name, deps })), [
      { name: 'sum', deps: ['data.x', 'data.y'] },
      { name: 'info', deps: ['data.y', 'task.sum'] },
    ])

    for (const node of [...registration.data, ...registration.tasks]) {
      assert.equal(path.resolve(node.codeRef.file), path.resolve(thisTestFile))
      assert.equal(typeof node.codeRef.line, 'number')
      assert.ok(node.codeRef.line > 0)
      assert.equal(typeof node.codeRef.column, 'number')
      assert.ok(node.codeRef.column > 0)
    }
  })

  await t.test('registration snapshot (tasks empty)', () => {
    const comp = component('tasks-empty')
    const registration = sanitizeRegistration(asRegistration(comp))
    const expected = {
      name: 'tasks-empty',
      hash: registration.hash,
      imports: [],
      data: [],
      tasks: [],
      services: { provide: [], require: [] },
    }
    assert.deepEqual(registration, expected)
  })

  await t.test('registration snapshot (tasks full)', () => {
    const seedFn = () => 2
    const depsDouble = ({ data: { seed } }) => seed
    const injectDouble = _ => [_.words.data.seed]
    const doubleFn = ({ deps: { data: { seed } } }) => seed * 2
    const depsSummary = ({ task: { double } }) => double
    const injectSummary = _ => [_.words.task.double]
    const summaryFn = ({ deps: { task: { double } } }) => ({ double })

    const comp = component('tasks-full')
      .data('seed', { fnc: seedFn })
      .task('double', { deps: depsDouble, inject: injectDouble, fnc: doubleFn })
      .task('summary', { deps: depsSummary, inject: injectSummary, fnc: summaryFn })

    const registration = sanitizeRegistration(asRegistration(comp))
    const codeRefFor = (name) => registration.tasks.find(t => t.name === name)?.codeRef
    const dataCodeRef = registration.data.find(d => d.name === 'seed')?.codeRef
    const expected = {
      name: 'tasks-full',
      hash: registration.hash,
      imports: [],
      data: [
        {
          name: 'seed',
          deps: [],
          inject: [],
          fnc: String(seedFn),
          codeRef: dataCodeRef,
        },
      ],
      tasks: [
        {
          name: 'double',
          deps: ['data.seed'],
          inject: ['words.data.seed'],
          fnc: String(doubleFn),
          codeRef: codeRefFor('double'),
        },
        {
          name: 'summary',
          deps: ['task.double'],
          inject: ['words.task.double'],
          fnc: String(summaryFn),
          codeRef: codeRefFor('summary'),
        },
      ],
      services: { provide: [], require: [] },
    }
    assert.deepEqual(registration, expected)
  })
})
