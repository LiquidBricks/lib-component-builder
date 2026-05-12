import { getCodeLocation, s } from "../help.js";
import { checkComponentAgentFnDefinition, ensureNew, normalizeNames } from "../validation.js";

export function makeAgentFnRegistrar(monad) {
  return function registerAgentFn(name, definition) {
    const { portAddr, hash } = checkComponentAgentFnDefinition(definition);
    const [n] = normalizeNames(name, 'agentFn');
    ensureNew([n], monad[s.INTERNALS].nodes.agentFns, 'agentFn');

    monad[s.INTERNALS].nodes.agentFns.set(n, {
      portAddr,
      hash,
      codeRef: getCodeLocation(3),
    });
    return monad;
  }
}
