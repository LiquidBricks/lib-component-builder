import assert from "node:assert";
import { normalizeImportHash } from "./validation.js";

export function buildRegistration({ name, nodes, hash }) {
  const importNodes = serializeImports(nodes.imports);
  const gateNodes = serializeGates(nodes.gates);
  const dataNodes = serializeNodes(nodes.data);
  const taskNodes = serializeNodes(nodes.tasks);

  return {
    name,
    hash,
    imports: importNodes,
    gates: gateNodes,
    data: dataNodes,
    tasks: taskNodes,
  }
}

function serializeImports(map = new Map()) {
  return Array.from(map.entries())
    .map(([n, { hash, inject = {}, waitFor = [], codeRef }]) => ({
      name: n,
      hash: normalizeImportHash(hash),
      inject,
      waitFor: Array.from(waitFor ?? []),
      codeRef,
    }));
}

function serializeGates(map = new Map()) {
  return Array.from(map.entries())
    .map(([n, { hash, inject = {}, waitFor = [], deps = [], fnc, codeRef }]) => ({
      name: n,
      hash: normalizeImportHash(hash),
      inject,
      waitFor: Array.from(waitFor ?? []),
      deps: Array.from(deps ?? []),
      fnc: fnc === undefined ? undefined : String(fnc),
      codeRef,
    }));
}

function serializeNodes(map = new Map()) {
  return Array.from(map.entries())
    .map(([n, { deps = [], waitFor = [], inject = [], fnc, codeRef }]) => ({
      name: n,
      deps: Array.from(deps),
      waitFor: Array.from(waitFor ?? []),
      inject: Array.from(inject),
      fnc: fnc === undefined ? undefined : String(fnc),
      codeRef
    }));
}

export function deserializeRegistration(registration) {
  assert(registration && typeof registration === 'object', 'Component registration must be an object');

  const name = requireString(registration.name, 'Component name');
  const hash = requireString(registration.hash, 'Component hash');
  const imports = normalizeImports(registration.imports);
  const gates = normalizeGates(registration.gates);
  const data = normalizeNodes(registration.data, 'data');
  const tasks = normalizeNodes(registration.tasks, 'task');

  return { name, hash, imports, gates, data, tasks };
}

function normalizeImports(imports = []) {
  const list = imports ?? [];
  assert(Array.isArray(list), 'imports must be an array');
  return list.map((importItem, idx) => {
    assert(importItem && typeof importItem === 'object', `imports[${idx}] must be an object`);
    const name = requireString(importItem.name, `imports[${idx}].name`);
    const hash = requireString(importItem.hash, `imports[${idx}].hash`);
    const inject = normalizeImportInject(importItem.inject, idx);
    const waitFor = normalizeStringArray(importItem.waitFor, `imports[${idx}].waitFor`);
    const codeRef = normalizeCodeRef(importItem.codeRef);
    return { name, hash, inject, waitFor, codeRef };
  });
}

function normalizeGates(gates = []) {
  const list = gates ?? [];
  assert(Array.isArray(list), 'gates must be an array');
  return list.map((gateItem, idx) => {
    assert(gateItem && typeof gateItem === 'object', `gates[${idx}] must be an object`);
    const name = requireString(gateItem.name, `gates[${idx}].name`);
    const hash = requireString(gateItem.hash, `gates[${idx}].hash`);
    const inject = normalizeImportInject(gateItem.inject, idx, 'gates');
    const waitFor = normalizeStringArray(gateItem.waitFor, `gates[${idx}].waitFor`);
    const deps = normalizeStringArray(gateItem.deps, `gates[${idx}].deps`);
    if (gateItem.fnc !== undefined) {
      assert(typeof gateItem.fnc === 'string', `gates[${idx}].fnc must be a string`);
    }
    const codeRef = normalizeCodeRef(gateItem.codeRef);
    return { name, hash, inject, waitFor, deps, fnc: gateItem.fnc, codeRef };
  });
}

function normalizeImportInject(inject, idx, label = 'imports') {
  if (inject === undefined) return {};
  assert(inject && typeof inject === 'object' && !Array.isArray(inject), `${label}[${idx}].inject must be an object`);
  const normalized = {};
  for (const [source, targets] of Object.entries(inject)) {
    const normalizedSource = requireString(source, `${label}[${idx}].inject source`);
    assert(Array.isArray(targets), `${label}[${idx}].inject targets for "${normalizedSource}" must be an array`);
    normalized[normalizedSource] = targets.map((target, targetIdx) =>
      requireString(target, `${label}[${idx}].inject["${normalizedSource}"][${targetIdx}]`)
    );
  }
  return normalized;
}

function normalizeNodes(nodes = [], label) {
  const list = nodes ?? [];
  assert(Array.isArray(list), `${label} must be an array`);
  return list.map((node, idx) => {
    assert(node && typeof node === 'object', `${label}[${idx}] must be an object`);
    const name = requireString(node.name, `${label}[${idx}].name`);
    const deps = normalizeStringArray(node.deps, `${label}[${idx}].deps`);
    const waitFor = normalizeStringArray(node.waitFor, `${label}[${idx}].waitFor`);
    const inject = normalizeStringArray(node.inject, `${label}[${idx}].inject`);
    if (node.fnc !== undefined) {
      assert(typeof node.fnc === 'string', `${label}[${idx}].fnc must be a string`);
    }
    const codeRef = normalizeCodeRef(node.codeRef);

    return { name, deps, waitFor, inject, fnc: node.fnc, codeRef };
  });
}

function normalizeStringArray(value, label) {
  if (value === undefined) return [];
  assert(Array.isArray(value), `${label} must be an array`);
  return value.map((entry, idx) => requireString(entry, `${label}[${idx}]`));
}

function normalizeCodeRef(codeRef) {
  if (codeRef === undefined) return undefined;
  assert(codeRef && typeof codeRef === 'object', 'codeRef must be an object');
  const { file, line, column, functionName, stack } = codeRef;
  const normalized = { file, line, column };
  if (functionName !== undefined) normalized.functionName = functionName;
  if (stack !== undefined) normalized.stack = stack;
  return normalized;
}

function requireString(value, label) {
  assert(typeof value === 'string', `${label} must be a string`);
  const trimmed = value.trim();
  assert(trimmed !== '', `${label} is required`);
  return trimmed;
}
