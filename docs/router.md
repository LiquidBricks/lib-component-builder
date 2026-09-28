# Routers

A router groups independently evaluated conditional components and exposes one completion dependency.

```js
component('podController')
  .data('podConfiguration')
  .import('sensor', { hash: sensor })
  .router('actuators', route => [
    route('create', {
      hash: createPod,
      deps: _ => [_.sensor.task.done],
      fnc: ({ deps: { sensor: { task: { done } } } } }) => done === 'missing',
      inject: _ => [_.create.data.configuration(_.data.podConfiguration)],
    }),
    route('recreate', {
      hash: destroyAndCreatePod,
      deps: _ => [_.sensor.task.done],
      fnc: ({ deps: { sensor: { task: { done } } } } }) => done === 'stopped',
    }),
    route('running', {
      hash: alreadyRunning,
      deps: _ => [_.sensor.task.done],
      fnc: ({ deps: { sensor: { task: { done } } } } }) => done === 'running',
    }),
  ])
  .task('done', {
    deps: _ => [_.router.actuators.lifecycleDone],
    fnc: ({ deps: { router: { actuators: { lifecycleDone } } } }) => lifecycleDone,
  })
```

- Each route evaluates when its own `deps` and optional `waitFor` are ready. It uses the same function context and strict boolean return contract as a gate, including async functions. An omitted `fnc` defaults to false, like a gate.
- Zero, one, or any number of routes may execute. There is no priority or first-match behavior.
- Names are unique within a router; separate routers may reuse route names. The callback registers each `route()` call; its return value is not used.
- All route definitions, dependencies, and injections are registered as metadata. A child component subtree is instantiated only after its predicate returns true. The runtime then binds its injections, supplies already available values, and starts it. Future values follow the bound injections.
- Inside `inject`, reserved roots retain their existing meaning; another root must match the local route name. Injection mappings defined on a route are inactive until that route is selected.
- Route internals have no public dependency path. `router.<name>.lifecycleDone` is the sole router output and supplies `true`.
- Completion requires every predicate to return a boolean and every selected component subtree to finish successfully. All-false and empty routers complete successfully. Pending predicates and predicate/subtree errors block completion. Other independent routes may continue.
- Route order does not affect the component hash. Changes to route definitions, dependencies, injections, or referenced component hashes do.

Router execution uses the existing gate computation and error events. Retry semantics are unchanged and no additional retry policy is introduced.

## Workspace verification

This feature spans `lib-component-builder`, `agent-component`, `spec-domain`, and `svc-component-orchestrator`. To test their local versions together without changing installed packages or lockfiles, use the orchestrator's optional workspace resolver (Node with `module.registerHooks`):

```sh
# From svc-component-orchestrator:
NODE_OPTIONS="--import=$(pwd)/test/util/workspaceImports.mjs" npm test
```

The same absolute `--import` path can be used when running tests in the other three repositories. Releases must include the updated builder and domain dependencies alongside the agent and orchestrator changes.
