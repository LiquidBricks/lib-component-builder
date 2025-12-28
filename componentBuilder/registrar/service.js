import assert from "node:assert";
import { getCodeLocation, s } from "../help.js";
import { captureDepsAccesses } from "./helper.js";
import { checkServiceDefinition, ensureNew, normalizeNames } from "../validation.js";
import { ERRORS } from "../errors.js";

export function makeServiceRegistrar(monad) {
  const registerProvide = (name, definition) => {
    const { deps, fnc, inject } = checkServiceDefinition(definition);
    const [n] = normalizeNames(name, 'service');
    ensureNew([n], monad[s.INTERNALS].nodes.services.provide, 'service');

    monad[s.INTERNALS].nodes.services.provide.set(n, {
      deps: captureDepsAccesses(deps),
      inject: captureDepsAccesses(inject),
      fnc,
      codeRef: getCodeLocation(3),
    });
    return monad;
  };

  const registerRequire = (name, definition) => {
    assert(definition === undefined, ERRORS.serviceRequireNameOnly);
    const [n] = normalizeNames(name, 'service');
    ensureNew([n], monad[s.INTERNALS].nodes.services.require, 'service');
    monad[s.INTERNALS].nodes.services.require.add(n);
    return monad;
  };

  const facade = () => {
    assert(false, ERRORS.serviceFacadeMustSpecifyMethod);
  };

  facade.provide = registerProvide;
  facade.require = registerRequire;

  return facade;
}
