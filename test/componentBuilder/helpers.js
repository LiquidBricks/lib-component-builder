import path from 'node:path'

export const asRegistration = (componentInstance) => JSON.parse(JSON.stringify(componentInstance))

export const findNodeByName = (registration, collection, nodeName) =>
  (collection === 'services'
    ? registration?.services?.provide
    : registration?.[collection]
  )?.find?.(({ name }) => name === nodeName)

const relFromTestRoot = (file) => path.relative(path.resolve(import.meta.dirname, '..', '..'), file)
const stripCodeRef = (codeRef) => codeRef
  ? { file: relFromTestRoot(codeRef.file), line: codeRef.line, column: codeRef.column }
  : codeRef

export const sanitizeRegistration = (reg = {}) => {
  const services = reg.services ?? {}
  return {
    name: reg.name,
    hash: reg.hash,
    imports: (reg.imports ?? []).map(({ name, hash, inject, codeRef }) => ({
      name,
      hash,
      inject,
      codeRef: stripCodeRef(codeRef),
    })),
    data: (reg.data ?? []).map(({ name, deps, inject, fnc, codeRef }) => ({
      name,
      deps,
      inject,
      fnc,
      codeRef: stripCodeRef(codeRef),
    })),
    tasks: (reg.tasks ?? []).map(({ name, deps, inject, fnc, codeRef }) => ({
      name,
      deps,
      inject,
      fnc,
      codeRef: stripCodeRef(codeRef),
    })),
    services: {
      provide: (services.provide ?? []).map(({ name, deps, inject, fnc, codeRef }) => ({
        name,
        deps,
        inject,
        fnc,
        codeRef: stripCodeRef(codeRef),
      })),
      require: Array.from(services.require ?? []),
    },
  }
}
