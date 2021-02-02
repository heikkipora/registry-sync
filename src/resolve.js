import _ from 'lodash'
import fs from 'fs'

export async function updateDependenciesCache(newDependencies, cacheFilePath, prebuiltBinaryProperties) {
  const {dependencies: cachedDependencies} = await loadCache(cacheFilePath)
  const dependencies = cachedDependencies
    .concat(newDependencies)
    .sort(sortById)
    .filter(uniqueById)

  const data = {
    dependencies,
    prebuiltBinaryProperties,
    prebuiltBinaryNApiSupport: true
  }
  return fs.promises.writeFile(cacheFilePath, JSON.stringify(data), 'utf8')
}

export async function dependenciesNotInCache(dependencies, cacheFilePath, prebuiltBinaryProperties) {
  const {dependencies: cachedDependencies, prebuiltBinaryProperties: cachedPrebuiltBinaryProperties, prebuiltBinaryNApiSupport} = await loadCache(cacheFilePath)
  if (cachedDependencies.length > 0 && (!_.isEqual(prebuiltBinaryProperties, cachedPrebuiltBinaryProperties) || !prebuiltBinaryNApiSupport)) {
    console.log(`Pre-built binary properties changed, re-downloading all current packages`)
    return dependencies
  }
  return _.differenceBy(dependencies, cachedDependencies, 'id')
}

async function loadCache(cacheFilePath) {
  try {
    const json = await fs.promises.readFile(cacheFilePath, 'utf8')
    const data = JSON.parse(json)
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

export async function dependenciesFromPackageLock(path, includeDevDependencies) {
  const json = await fs.promises.readFile(path, 'utf8')
  const dependencyTree = dependenciesRecursive(JSON.parse(json), includeDevDependencies)
  return dependencyTree
    .map(({name, version}) => ({id: `${name}@${version}`, name, version}))
    .sort(sortById)
    .filter(uniqueById)
}

function sortById(a, b) {
  return a.id.localeCompare(b.id)
}

function uniqueById(value, index, values) {
  return values.findIndex(v => v.id === value.id) === index
}

function dependenciesRecursive({dependencies}, includeDevDependencies) {
  if (!dependencies) {
    return []
  }
  const includeFn = includeDevDependencies ? filterOutBundledDependencies : filterOutBundledAndDevDependencies
  return Object.entries(dependencies)
    .filter(includeFn)
    .map(([name, props]) => [{name, version: props.version}].concat(dependenciesRecursive(props, includeDevDependencies)))
    .flat()
}

function filterOutBundledDependencies([, props]) {
  return !props.bundled
}

function filterOutBundledAndDevDependencies([, props]) {
  return !(props.bundled || props.dev)
}
