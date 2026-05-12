import assert from "node:assert";
import { getCodeLocation, s } from "./help.js";
import { buildRegistration, deserializeRegistration } from "./registration.js";
import { computeAgentFnHash, computeComponentHash } from "./hash.js";
import { ERRORS } from "./errors.js";
import { checkAgentFnDefinition } from "./validation.js";
import { makeAgentFnRegistrar } from "./registrar/agentFn.js";
import { makeDataRegistrar } from "./registrar/data.js";
import { makeImportRegistrar } from "./registrar/import.js";
import { makeGateRegistrar } from "./registrar/gate.js";
import { makeTaskRegistrar } from "./registrar/task.js";
import { makeExplain } from "./explain.js";

export function component(name = 'component') {
  assert(typeof name === 'string', ERRORS.labelsMustBeStrings('component'));
  const componentName = name.trim();
  assert(componentName !== '', ERRORS.labelsMustBeNonEmpty('component'));

  const monad = {
    [s.IDENTITY.COMPONENT]: true,
    [s.INTERNALS]: {
      name: componentName,
      nodes: {
        agentFns: new Map(),
        data: new Map(),
        tasks: new Map(),
        imports: new Map(),
        gates: new Map(),
      },
      debugInfo: (({
        file, line, column, functionName
      }) => ({ file, line, column, functionName }))(getCodeLocation(3)),
      init() {
        const { file, line, column } = monad[s.INTERNALS].debugInfo
        const url = `vscode://file/${file.slice(7)}:${line}:${column}`;
      },
      registration() {
        return buildRegistration({
          name: monad[s.INTERNALS].name,
          nodes: monad[s.INTERNALS].nodes,
          hash: monad[s.INTERNALS].hash(),
        })
      },


      hash() {
        return computeComponentHash(monad[s.INTERNALS].name, monad[s.INTERNALS].nodes)
      }
    },
  }

  monad.agentFn = makeAgentFnRegistrar(monad);
  monad.data = makeDataRegistrar(monad);
  monad.task = makeTaskRegistrar(monad);
  monad.import = makeImportRegistrar(monad);
  monad.gate = makeGateRegistrar(monad);
  monad.explain = makeExplain(monad);
  monad.toJSON = () => monad[s.INTERNALS].registration();

  monad[s.INTERNALS].init()
  return monad
}

export function agentFn(definition) {
  const { portAddr, fn } = checkAgentFnDefinition(definition);
  const debugInfo = (({
    file, line, column, functionName
  }) => ({ file, line, column, functionName }))(getCodeLocation(3));

  const monad = {
    [s.IDENTITY.AGENT_FN]: true,
    [s.INTERNALS]: {
      portAddr,
      fn,
      debugInfo,
      hash() {
        return computeAgentFnHash(portAddr, fn);
      },
      registration() {
        return {
          portAddr,
          hash: monad[s.INTERNALS].hash(),
          codeRef: debugInfo,
        };
      },
    },
    portAddr,
    fn,
    toJSON() {
      return monad[s.INTERNALS].registration();
    },
  };

  Object.defineProperty(monad, 'hash', {
    enumerable: true,
    get() {
      return monad[s.INTERNALS].hash();
    },
  });

  return monad;
}

component.fromJSON = deserializeRegistration;
export { deserializeRegistration };
