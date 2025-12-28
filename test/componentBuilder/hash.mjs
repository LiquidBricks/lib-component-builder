import test from 'node:test'
import assert from 'node:assert/strict'

import { component } from '../../componentBuilder/index.js'
import { computeComponentHash } from '../../componentBuilder/hash.js'
import { asRegistration } from './helpers.js'

test('hashing', async (t) => {
  await t.test('changes hash when imports differ', () => {
    const withA = component('consumer').import('shared', { hash: 'aaaa' })
    const withB = component('consumer').import('shared', { hash: 'bbbb' })

    const regA = asRegistration(withA)
    const regB = asRegistration(withB)

    assert.notEqual(regA.hash, regB.hash)
  })

  await t.test('changes hash when import inject mappings differ', () => {
    const withInjectA = component('consumer').import('shared', {
      hash: 'aaaa',
      inject: _ => [_.alpha.value(_.beta.path)]
    })
    const withInjectB = component('consumer').import('shared', {
      hash: 'aaaa',
      inject: _ => [_.alpha.other(_.beta.path)]
    })

    const regA = asRegistration(withInjectA)
    const regB = asRegistration(withInjectB)

    assert.notEqual(regA.hash, regB.hash)
  })

  await t.test('uses component hash when import hash is provided as a component instance', () => {
    const external = component('shared-lib').data('value', { fnc: () => 1 })
    const externalHash = asRegistration(external).hash

    const computedWithComponent = computeComponentHash('consumer', {
      data: new Map(),
      tasks: new Map(),
      imports: new Map([
        ['shared', { hash: external, inject: {} }]
      ]),
    })

    const computedWithString = computeComponentHash('consumer', {
      data: new Map(),
      tasks: new Map(),
      imports: new Map([
        ['shared', { hash: externalHash, inject: {} }]
      ]),
    })

    assert.equal(computedWithComponent, computedWithString)
  })

  await t.test('is deterministic for the same component shape', () => {
    const depsForSum = ({ data: { first, second } }) => { first; second }
    const sum = ({ deps: { data: { first, second } } }) => first + second
    const first = () => 1
    const second = ({ deps: { data: { first } } }) => first + 1
    const depsForSecond = ({ data: { first } }) => first

    const compA = component('calc')
      .data('first', { fnc: first })
      .data('second', { deps: depsForSecond, fnc: second })
      .task('sum', { deps: depsForSum, fnc: sum })

    const compB = component('calc')
      .task('sum', { deps: depsForSum, fnc: sum })
      .data('second', { deps: depsForSecond, fnc: second })
      .data('first', { fnc: first })

    const registrationA = asRegistration(compA)
    const registrationB = asRegistration(compB)

    assert.equal(registrationA.hash, registrationB.hash)
  })

  await t.test('changes hash when services differ', () => {
    const withOne = component('consumer')
      .service.provide('api', { fnc: () => 1 })
    const withTwo = component('consumer')
      .service.provide('api', { fnc: () => 2 })

    const regA = asRegistration(withOne)
    const regB = asRegistration(withTwo)

    assert.notEqual(regA.hash, regB.hash)
  })

  await t.test('changes hash when required services differ', () => {
    const withA = component('consumer').service.require('db')
    const withB = component('consumer').service.require('cache')

    const regA = asRegistration(withA)
    const regB = asRegistration(withB)

    assert.notEqual(regA.hash, regB.hash)
  })
})
