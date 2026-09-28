// Internal graph names never form part of the public dependency namespace.
const encode = value => Buffer.from(value).toString('hex');
export const routerRouteKey = (router, route) => `@router:${encode(router)}:route:${encode(route)}`;
export const routerDoneKey = router => `@router:${encode(router)}:done`;
export const isRouterKey = value => String(value).startsWith('@router:');
export const routerReservedWords = new Set(['data', 'task', 'router', 'agentFn', 'deferred', 'lifecycle']);

export function validateRouteInjection(name, inject) {
  for (const [source, targets] of Object.entries(inject)) {
    for (const path of [source, ...targets]) {
      const root = path.split('.')[0];
      if (!routerReservedWords.has(root) && root !== name) {
        throw new TypeError(`route injection alias must match local route ${name}: ${path}`);
      }
    }
  }
}

export function routerDependencyPath(type, name) {
  if (type === 'data' && /^@router:[0-9a-f]+:done$/.test(name)) {
    return ['router', Buffer.from(name.split(':')[1], 'hex').toString(), 'lifecycleDone'];
  }
  return [type, name];
}

// Preserve routers in the public contract; reuse data/gate graph machinery internally.
export function expandRouters(component) {
  if (!component.routers?.length) return component;
  const gates = [...component.gates];
  const data = [...component.data];
  for (const router of component.routers) {
    data.push({ name: routerDoneKey(router.name), router: router.name,
      deps: ['deferred.deferred'], waitFor: [], inject: [], codeRef: router.codeRef });
    for (const route of router.routes) {
      const name = routerRouteKey(router.name, route.name);
      const rewrite = path => !routerReservedWords.has(route.name) && path.startsWith(`${route.name}.`)
        ? `${name}${path.slice(route.name.length)}` : path;
      gates.push({ ...route, name, router: router.name,
        inject: Object.fromEntries(Object.entries(route.inject).map(([source, targets]) =>
          [rewrite(source), targets.map(rewrite)])) });
    }
  }
  return { ...component, gates, data };
}
