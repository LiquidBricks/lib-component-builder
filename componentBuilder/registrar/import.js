import { getCodeLocation, s } from "../help.js";
import { captureDepsAccesses, captureInjectAccesses } from "./helper.js";
import { checkImportDefinition, ensureNew, normalizeNames } from "../validation.js";

export function makeImportRegistrar(monad) {
  return function importComponent(name, definition) {
    const { hash, inject, waitFor } = checkImportDefinition(definition);
    const [n] = normalizeNames(name, 'import');
    ensureNew([n], monad[s.INTERNALS].nodes.imports, 'import');

    monad[s.INTERNALS].nodes.imports.set(n, {
      hash,
      inject: captureInjectAccesses(inject),
      waitFor: captureDepsAccesses(waitFor),
      codeRef: getCodeLocation(3)
    });
    return monad;
  }
}
