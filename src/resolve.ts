import * as _ from 'lodash'
import * as fs from 'fs'
import type {CacheSchema, OldCacheSchema, Package, PackageLock, PackageLockDependency, PackageWithId, PlatformVariant} from './types'

export async function updateDependenciesCache(newDependencies: PackageWithId[], cacheFilePath: string, prebuiltBinaryProperties: PlatformVariant[]): Promise<void> {
  const {dependencies: cachedDependencies} = await loadCache(cacheFilePath)
  const dependencies = cachedDependencies
    .concat(newDependencies)
    .sort(sortById)
    .filter(uniqueById)

  const data: CacheSchema = {
    dependencies,
    prebuiltBinaryProperties,
    prebuiltBinaryNApiSupport: true
  }
  return fs.promises.writeFile(cacheFilePath, JSON.stringify(data), 'utf8')
}

export async function dependenciesNotInCache(dependencies: PackageWithId[], cacheFilePath: string, prebuiltBinaryProperties: PlatformVariant[]): Promise<PackageWithId[]> {
  const {dependencies: cachedDependencies, prebuiltBinaryProperties: cachedPrebuiltBinaryProperties, prebuiltBinaryNApiSupport} = await loadCache(cacheFilePath)
  if (cachedDependencies.length > 0 && (!_.isEqual(prebuiltBinaryProperties, cachedPrebuiltBinaryProperties) || !prebuiltBinaryNApiSupport)) {
    console.log(`Pre-built binary properties changed, re-downloading all current packages`)
    return dependencies
  }
  return _.differenceBy(dependencies, cachedDependencies, 'id')
}

async function loadCache(cacheFilePath: string): Promise<CacheSchema> {
  try {
    const data: CacheSchema | OldCacheSchema = JSON.parse(await fs.promises.readFile(cacheFilePath, 'utf8'))
    // migrate legacy cache file schema
    if (Array.isArray(data)) {
      return {
        dependencies: data,
        prebuiltBinaryProperties: [],
        prebuiltBinaryNApiSupport: true
      }
    }
    return data
  } catch (fileNotFound) {
    return {
      dependencies: [],
      prebuiltBinaryProperties: [],
      prebuiltBinaryNApiSupport: true
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
