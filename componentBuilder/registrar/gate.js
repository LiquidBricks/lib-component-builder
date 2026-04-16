import { getCodeLocation, s } from "../help.js";
import { captureDepsAccesses, captureInjectAccesses } from "./helper.js";
import { checkGateDefinition, ensureNew, normalizeNames } from "../validation.js";

export function makeGateRegistrar(monad) {
  return function gate(name, definition) {
    const { hash, inject, waitFor, deps, fnc } = checkGateDefinition(definition);
    const [n] = normalizeNames(name, 'gate');
    ensureNew([n], monad[s.INTERNALS].nodes.gates, 'gate');

    monad[s.INTERNALS].nodes.gates.set(n, {
      hash,
      inject: captureInjectAccesses(inject),
      waitFor: captureDepsAccesses(waitFor),
      deps: captureDepsAccesses(deps),
      fnc,
      codeRef: getCodeLocation(3)
    });
    return monad;
  }
}
