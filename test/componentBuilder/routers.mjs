import test from 'node:test'
import assert from 'node:assert/strict'
import { component, deserializeRegistration } from '../../componentBuilder/index.js'
import { expandRouters, routerDoneKey, routerRouteKey } from '../../componentBuilder/router.js'

test('routers register private routes, round trip, and hash independently of ordering', () => {
  const target = component('target').data('configuration')
  const definitions = {
    create: { hash: target, deps: _ => [_.task.sensor], fnc: ({ deps }) => deps.task.sensor === 'missing',
      inject: _ => [_.create.data.configuration(_.data.config)] },
    running: { hash: target, fnc: () => false },
  }
  const make = order => component('parent').router('actuators', route => order.map(name => route(name, definitions[name])))
  const forward = make(['create', 'running']).toJSON()
  const reverse = make(['running', 'create']).toJSON()
  assert.equal(forward.hash, reverse.hash)
  assert.deepEqual(forward.gates, [])
  assert.equal(forward.routers[0].routes[0].hash, target.toJSON().hash)
  assert.deepEqual(deserializeRegistration(forward).routers, forward.routers)
  const expanded = expandRouters(forward)
  assert.equal(expanded.data.at(-1).name, routerDoneKey('actuators'))
  assert.deepEqual(expanded.gates[0].inject, { 'data.config': [`${routerRouteKey('actuators', 'create')}.data.configuration`] })
  assert.notEqual(make(['create']).toJSON().hash, forward.hash)
  target.task('new', {})
  assert.notEqual(make(['create', 'running']).toJSON().hash, forward.hash)
})

test('empty routers and repeated route names in separate routers are valid; duplicates within one scope are not', () => {
  const child = component('child')
  const parent = component().router('empty', () => [])
    .router('one', route => route('same', { hash: child }))
    .router('two', route => route('same', { hash: child }))
  assert.equal(parent.toJSON().routers.length, 3)
  assert.throws(() => parent.router('one', () => []), /already|existing/i)
  assert.throws(() => component().router('bad', route => {
    route('same', { hash: child }); route('same', { hash: child })
  }), /already|existing/i)
  const malformed = parent.toJSON()
  malformed.routers[1].routes.push(malformed.routers[1].routes[0])
  assert.throws(() => deserializeRegistration(malformed), /duplicate route/)
  assert.throws(() => component().router('bad', route => route('one', {
    hash: child, inject: _ => [_.two.data.x(_.data.y)],
  })), /local route/)
})
