import * as fs from 'fs'
import {deepStrictEqual} from 'assert'
import type {CacheSchemaV1, CacheSchemaV2, CacheSchemaV3, Package, PackageLock, PackageLockDependency, PackageWithId, PlatformVariant} from './types'

export async function updateDependenciesCache(newDependencies: PackageWithId[], cacheFilePath: string, prebuiltBinaryProperties: PlatformVariant[]): Promise<void> {
  const {dependencies: cachedDependencies} = await loadCache(cacheFilePath)
  const dependencies = cachedDependencies
    .concat(newDependencies)
    .sort(sortById)
    .filter(uniqueById)

  const data: CacheSchemaV3 = {
    dependencies,
    prebuiltBinaryProperties,
    prebuiltBinaryNApiSupport: true,
    prebuiltBinaryNApiSupportWithoutBrokenVersions: true
  }
  return fs.promises.writeFile(cacheFilePath, JSON.stringify(data), 'utf8')
}

export async function dependenciesNotInCache(dependencies: PackageWithId[], cacheFilePath: string, prebuiltBinaryProperties: PlatformVariant[]): Promise<PackageWithId[]> {
  const {dependencies: cachedDependencies, prebuiltBinaryProperties: cachedPrebuiltBinaryProperties, prebuiltBinaryNApiSupport, prebuiltBinaryNApiSupportWithoutBrokenVersions} = await loadCache(cacheFilePath)
  if (cachedDependencies.length > 0 && (!isDeepEqual(prebuiltBinaryProperties, cachedPrebuiltBinaryProperties) || !prebuiltBinaryNApiSupport || !prebuiltBinaryNApiSupportWithoutBrokenVersions)) {
    console.log(`Pre-built binary properties changed, re-downloading all current packages`)
    return dependencies
  }
  const packageIdsInCache = cachedDependencies.map(pkg => pkg.id)
  return dependencies.filter(pkg => !packageIdsInCache.includes(pkg.id))
}

async function loadCache(cacheFilePath: string): Promise<CacheSchemaV3> {
  try {
    const data: CacheSchemaV1 | CacheSchemaV2 | CacheSchemaV3 = JSON.parse(await fs.promises.readFile(cacheFilePath, 'utf8'))
    // Migrate V1 legacy cache file schema to V3
    if (Array.isArray(data)) {
      return {
        dependencies: data,
        prebuiltBinaryProperties: [],
        prebuiltBinaryNApiSupport: false,
        prebuiltBinaryNApiSupportWithoutBrokenVersions: false
      }
    }
    // migrate V2 to V3
    if (!('prebuiltBinaryNApiSupportWithoutBrokenVersions' in data)) {
      return {
        ...data,
        prebuiltBinaryNApiSupportWithoutBrokenVersions: false
      }
    }
    return data
  } catch (fileNotFound) {
    // empty V3 cache
    return {
      dependencies: [],
      prebuiltBinaryProperties: [],
      prebuiltBinaryNApiSupport: true,
      prebuiltBinaryNApiSupportWithoutBrokenVersions: true
    }
  }
}

export async function dependenciesFromPackageLock(path: string, includeDevDependencies: boolean): Promise<PackageWithId[]> {
  const packageLock: PackageLock = JSON.parse(await fs.promises.readFile(path, 'utf8'))
  const dependencyTree = dependenciesRecursive(packageLock, includeDevDependencies)
  return dependencyTree
    .map(({name, version}) => ({id: `${name}@${version}`, name, version}))
    .sort(sortById)
    .filter(uniqueById)
}

function sortById(a: PackageWithId, b: PackageWithId): number {
  return a.id.localeCompare(b.id)
}

function uniqueById(value: PackageWithId, index: number, values: PackageWithId[]): boolean {
  return values.findIndex(v => v.id === value.id) === index
}

function dependenciesRecursive({dependencies}: PackageLock | PackageLockDependency, includeDevDependencies: boolean): Package[] {
  if (!dependencies) {
    return []
  }
  const includeFn = includeDevDependencies ? filterOutBundledDependencies : filterOutBundledAndDevDependencies
  return Object.entries(dependencies)
    .filter(includeFn)
    .map(([name, props]) => [{name, version: props.version}].concat(dependenciesRecursive(props, includeDevDependencies)))
    .flat()
}

function filterOutBundledDependencies([, props]: [string, PackageLockDependency]): boolean {
  return !props.bundled
}

function filterOutBundledAndDevDependencies([, props]: [string, PackageLockDependency]): boolean {
  return !(props.bundled || props.dev)
}

function isDeepEqual(a: PlatformVariant[], b: PlatformVariant[]): boolean {
  try {
    deepStrictEqual(a, b)
    return true
  } catch(ignored) {
    return false
  }
}
