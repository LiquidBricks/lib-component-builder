import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { agentFn, component } from '../../componentBuilder/index.js'
import { s } from '../../componentBuilder/help.js'
import { asRegistration, findNodeByName } from './helpers.js'

const thisTestFile = fileURLToPath(import.meta.url)

test('agentFn builder', async (t) => {
  await t.test('requires a portAddr and fn', () => {
    assert.throws(() => agentFn(), /requires an options object/i)
    assert.throws(() => agentFn({ fn: () => 1 }), /portAddr must be a non-empty string/i)
    assert.throws(() => agentFn({ portAddr: 'cmd.run' }), /fnc must be a function/i)
  })

  await t.test('hash changes when the function implementation changes', () => {
    const first = agentFn({ portAddr: 'cmd.run', fn: () => 1 })
    const second = agentFn({ portAddr: 'cmd.run', fn: () => 2 })

    assert.equal(first[s.IDENTITY.AGENT_FN], true)
    assert.notEqual(first.hash, second.hash)
  })
})

test('component agentFn registration', async (t) => {
  await t.test('stores alias, portAddr, hash and codeRef from an agentFn object', () => {
    const runCommand = agentFn({ portAddr: 'cmd.run', fn: (cmd, args) => [cmd, args] })
    const comp = component('consumer')
      .agentFn('runCommand', { portAddr: runCommand })
      .task('start', {
        deps: _ => [_.agentFn.runCommand],
        fnc: ({ agentFn: { runCommand } }) => runCommand('echo', ['ok']),
      })

    const registration = asRegistration(comp)
    const registered = findNodeByName(registration, 'agentFns', 'runCommand')

    assert(registered, 'expected agentFn "runCommand" to be registered')
    assert.equal(registered.portAddr, 'cmd.run')
    assert.equal(registered.hash, runCommand.hash)
    assert.equal(path.resolve(registered.codeRef.file), path.resolve(thisTestFile))
    assert.equal(typeof registered.codeRef.line, 'number')
    assert.deepEqual(registration.tasks[0].deps, ['agentFn.runCommand'])
  })

  await t.test('accepts a static portAddr string without an implementation hash', () => {
    const comp = component('consumer')
      .agentFn('runCommand', { portAddr: 'cmd.run' })

    const registered = findNodeByName(asRegistration(comp), 'agentFns', 'runCommand')
    assert.deepEqual(
      {
        name: registered.name,
        portAddr: registered.portAddr,
        hash: registered.hash,
      },
      { name: 'runCommand', portAddr: 'cmd.run', hash: undefined },
    )
  })

  await t.test('component hash ignores agentFn implementation hash', () => {
    const first = component('consumer')
      .agentFn('runCommand', { portAddr: agentFn({ portAddr: 'cmd.run', fn: () => 1 }) })
    const second = component('consumer')
      .agentFn('runCommand', { portAddr: agentFn({ portAddr: 'cmd.run', fn: () => 2 }) })

    assert.notEqual(asRegistration(first).agentFns[0].hash, asRegistration(second).agentFns[0].hash)
    assert.equal(asRegistration(first).hash, asRegistration(second).hash)
  })

  await t.test('component hash changes when agentFn alias or portAddr changes', () => {
    const base = component('consumer')
      .agentFn('runCommand', { portAddr: agentFn({ portAddr: 'cmd.run', fn: () => 1 }) })
    const differentAlias = component('consumer')
      .agentFn('executeCommand', { portAddr: agentFn({ portAddr: 'cmd.run', fn: () => 1 }) })
    const differentPortAddr = component('consumer')
      .agentFn('runCommand', { portAddr: agentFn({ portAddr: 'cmd.exec', fn: () => 1 }) })

    assert.notEqual(asRegistration(base).hash, asRegistration(differentAlias).hash)
    assert.notEqual(asRegistration(base).hash, asRegistration(differentPortAddr).hash)
  })
})
