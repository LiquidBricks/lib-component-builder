import { createHash } from 'node:crypto'
import { isAComponent, s } from './help.js'

export function computeComponentHash(name, nodes = {}) {
  const data = normalizeNodeDefinitions(nodes.data);
  const tasks = normalizeNodeDefinitions(nodes.tasks);
  const imports = normalizeImportDefinitions(nodes.imports);
  const gates = normalizeGateDefinitions(nodes.gates);

  const descriptor = {
    name,
    imports,
    gates,
    data,
    tasks,
  };
  const json = JSON.stringify(descriptor);
  return createHash('sha256').update(json).digest('hex');
}

function normalizeGateDefinitions(gateMap = new Map()) {
  return Array.from(gateMap.entries())
    .map(([name, { hash, inject, waitFor, deps, fnc }]) => ({
      name,
      hash: normalizeImportHash(hash),
      inject: normalizeImportInject(inject),
      waitFor: normalizeWaitFor(waitFor),
      deps: normalizeWaitFor(deps),
      fnc: String(fnc ?? '').trim(),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function normalizeImportDefinitions(importMap = new Map()) {
  return Array.from(importMap.entries())
    .map(([name, { hash, inject, waitFor }]) => ({
      name,
      hash: normalizeImportHash(hash),
      inject: normalizeImportInject(inject),
      waitFor: normalizeWaitFor(waitFor),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function normalizeNodeDefinitions(nodeMap = new Map()) {
  return Array.from(nodeMap.entries())
    .map(([nodeName, { deps, waitFor, inject, fnc }]) => ({
      name: nodeName,
      deps: [...(deps ?? [])].sort(),
      waitFor: [...(waitFor ?? [])].sort(),
      inject: [...(inject ?? [])].sort(),
      fnc: String(fnc).trim(),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function normalizeImportInject(inject) {
  if (!(inject instanceof Map) && (typeof inject !== 'object' || inject === null)) return [];

  const entries = inject instanceof Map ? Array.from(inject.entries()) : Object.entries(inject);
  return entries
    .map(([target, sources]) => ({
      target,
      sources: normalizeSources(sources),
    }))
    .sort((a, b) => a.target.localeCompare(b.target));
}

function normalizeSources(sources) {
  const list = Array.isArray(sources)
    ? sources
    : sources instanceof Set
      ? Array.from(sources)
      : sources === undefined || sources === null
        ? []
        : [sources];

  return Array.from(new Set(list.map(String))).sort();
}

function normalizeImportHash(hash) {
  if (typeof hash === 'string') return hash.trim();
  if (isAComponent(hash)) {
    const componentHash = hash?.[s.INTERNALS]?.hash?.();
    return typeof componentHash === 'string' ? componentHash.trim() : '';
  }
  return String(hash).trim();
}

function normalizeWaitFor(waitFor) {
  if (waitFor === undefined || waitFor === null) return [];
  if (Array.isArray(waitFor) || waitFor instanceof Set) {
    return Array.from(new Set(Array.from(waitFor).map(String))).sort();
  }
  return [String(waitFor)].sort();
}
