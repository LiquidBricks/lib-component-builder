import assert from "node:assert";
import { ERRORS } from "./errors.js";
import { isAComponent, s } from "./help.js";

const defaultDataDeps = ({ deferred: { deferred } }) => { }

export function checkDataDefinition(definition) {
  const options = definition === undefined ? {} : definition;
  assert(options && typeof options === 'object', ERRORS.requiresOptionsObject);
  const isEmptyDefinition = definition !== undefined && Object.keys(options).length === 0;
  const deps = options.deps === undefined
    ? ((definition === undefined || isEmptyDefinition) ? defaultDataDeps : [])
    : options.deps;
  const fnc = options.fnc;
  if (fnc !== undefined) {
    assert(typeof fnc === 'function', ERRORS.fncMustBeFunction);
  }
  const inject = options.inject;
  if (inject !== undefined) {
    assert(typeof inject === 'function', ERRORS.injectMustBeFunction);
  }
  return { deps, fnc, inject };
}

export function checkTaskDefinition(definition) {
  assert(definition && typeof definition === 'object', ERRORS.requiresOptionsObject);
  const { deps = [], waitFor = [], fnc = () => { }, inject } = definition;
  assert(typeof fnc === 'function', ERRORS.fncMustBeFunction);
  if (inject !== undefined) {
    assert(typeof inject === 'function', ERRORS.injectMustBeFunction);
  }
  return { deps, waitFor, fnc, inject };
}

export function checkImportDefinition(definition) {
  assert(definition && typeof definition === 'object', ERRORS.requiresOptionsObject);
  const { hash, inject, waitFor = [] } = definition;
  const normalizedHash = normalizeImportHashSource(hash);
  if (inject !== undefined) {
    assert(typeof inject === 'function', ERRORS.injectMustBeFunction);
  }
  return { hash: normalizedHash, inject, waitFor };
}

export function checkGateDefinition(definition) {
  assert(definition && typeof definition === 'object', ERRORS.requiresOptionsObject);
  const { hash, inject, waitFor = [], deps = [], fnc = () => false } = definition;
  const normalizedHash = normalizeImportHashSource(hash);
  if (inject !== undefined) {
    assert(typeof inject === 'function', ERRORS.injectMustBeFunction);
  }
  assert(typeof fnc === 'function', ERRORS.fncMustBeFunction);
  return { hash: normalizedHash, inject, waitFor, deps, fnc };
}

function normalizeImportHashSource(hash) {
  if (typeof hash === 'string') {
    const trimmed = hash.trim();
    assert(trimmed !== '', ERRORS.importHashMustBeString);
    return trimmed;
  }

  if (isAComponent(hash)) {
    const internalHash = hash?.[s.INTERNALS]?.hash?.();
    const trimmed = typeof internalHash === 'string' ? internalHash.trim() : '';
    assert(trimmed !== '', ERRORS.importHashMustBeString);
    return hash;
  }

  assert(false, ERRORS.importHashMustBeString);
}

export function normalizeImportHash(hash) {
  if (typeof hash === 'string') {
    const trimmed = hash.trim();
    assert(trimmed !== '', ERRORS.importHashMustBeString);
    return trimmed;
  }

  if (isAComponent(hash)) {
    const internalHash = hash?.[s.INTERNALS]?.hash?.();
    const trimmed = typeof internalHash === 'string' ? internalHash.trim() : '';
    assert(trimmed !== '', ERRORS.importHashMustBeString);
    return trimmed;
  }

  assert(false, ERRORS.importHashMustBeString);
}

export function normalizeNames(nameOrNames, label = 'name') {
  assert(nameOrNames !== undefined, ERRORS.requiresLabelOrList(label));
  const list = Array.isArray(nameOrNames) ? nameOrNames : [nameOrNames];
  assert(list.length > 0, ERRORS.requiresAtLeastOne(label));
  const normalized = list.map(n => {
    assert(typeof n === 'string', ERRORS.labelsMustBeStrings(label));
    const t = n.trim();
    assert(t !== '', ERRORS.labelsMustBeNonEmpty(label));
    return t;
  });
  const seen = new Set();
  for (const n of normalized) {
    assert(!seen.has(n), ERRORS.duplicateLabel(label, n));
    seen.add(n);
  }
  return normalized;
}

export function ensureNew(names, existing, label = 'name') {
  for (const n of names) {
    if (typeof existing.has === 'function') {
      assert(!existing.has(n), ERRORS.existingLabel(label, n));
    } else {
      assert(!existing[n], ERRORS.existingLabel(label, n));
    }
  }
}
