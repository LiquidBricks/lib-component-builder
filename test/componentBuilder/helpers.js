import path from 'node:path'

export const asRegistration = (componentInstance) => JSON.parse(JSON.stringify(componentInstance))

export const findNodeByName = (registration, collection, nodeName) =>
  registration?.[collection]?.find?.(({ name }) => name === nodeName)

const relFromTestRoot = (file) => path.relative(path.resolve(import.meta.dirname, '..', '..'), file)
const stripCodeRef = (codeRef) => codeRef
  ? { file: relFromTestRoot(codeRef.file), line: codeRef.line, column: codeRef.column }
  : codeRef

export const sanitizeRegistration = (reg = {}) => {
  return {
    name: reg.name,
    hash: reg.hash,
    imports: (reg.imports ?? []).map(({ name, hash, inject, waitFor, codeRef }) => ({
      name,
      hash,
      inject,
      waitFor,
      codeRef: stripCodeRef(codeRef),
    })),
    gates: (reg.gates ?? []).map(({ name, hash, inject, waitFor, deps, fnc, codeRef }) => ({
      name,
      hash,
      inject,
      waitFor,
      deps,
      fnc,
      codeRef: stripCodeRef(codeRef),
    })),
    data: (reg.data ?? []).map(({ name, deps, waitFor, inject, fnc, codeRef }) => ({
      name,
      deps,
      waitFor,
      inject,
      fnc,
      codeRef: stripCodeRef(codeRef),
    })),
    tasks: (reg.tasks ?? []).map(({ name, deps, waitFor, inject, fnc, codeRef }) => ({
      name,
      deps,
      waitFor,
      inject,
      fnc,
      codeRef: stripCodeRef(codeRef),
    })),
  }
}
