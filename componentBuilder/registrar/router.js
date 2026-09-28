import assert from 'node:assert';
import { getCodeLocation, s } from '../help.js';
import { checkGateDefinition, ensureNew, normalizeNames } from '../validation.js';
import { captureDepsAccesses, captureInjectAccesses } from './helper.js';
import { validateRouteInjection } from '../router.js';

export function makeRouterRegistrar(monad) {
  return function router(name, define) {
    const [routerName] = normalizeNames(name, 'router');
    ensureNew([routerName], monad[s.INTERNALS].nodes.routers, 'router');
    assert(typeof define === 'function', 'router definition must be a function');
    const routes = new Map();
    define((name, definition) => {
      const [routeName] = normalizeNames(name, 'route');
      ensureNew([routeName], routes, 'route');
      const { hash, deps, waitFor, fnc, inject } = checkGateDefinition(definition);
      const route = {
        hash, fnc,
        deps: captureDepsAccesses(deps),
        waitFor: captureDepsAccesses(waitFor),
        inject: captureInjectAccesses(inject),
        codeRef: getCodeLocation(3),
      };
      validateRouteInjection(routeName, route.inject);
      routes.set(routeName, route);
      return route;
    });
    monad[s.INTERNALS].nodes.routers.set(routerName, { routes, codeRef: getCodeLocation(3) });
    return monad;
  };
}
