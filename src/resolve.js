import _ from 'lodash'
import Promise from 'bluebird'

const fs = Promise.promisifyAll(require('fs'))

export async function updateDependenciesCache(newDependencies, cacheFilePath) {
  const cachedDependencies = await loadCache(cacheFilePath)
  const allDependencies = _(cachedDependencies)
    .concat(newDependencies)
    .sortBy('id')
    .sortedUniqBy('id')
    .value()
  return fs.writeFileAsync(cacheFilePath, JSON.stringify(allDependencies), 'utf8')
}

export async function dependenciesNotInCache(dependencies, cacheFilePath) {
  const cachedDependencies = await loadCache(cacheFilePath)
  return _.differenceBy(dependencies, cachedDependencies, 'id')
}

export async function loadCache(cacheFilePath) {
  try {
    const json = await fs.readFileAsync(cacheFilePath, 'utf8')
    return JSON.parse(json)  
  } catch (fileNotFound) {
    return []
  }
}

export async function dependenciesFromPackageLock(path) {
  const json = await fs.readFileAsync(path, 'utf8')
  const dependencyTree = dependenciesRecursive(JSON.parse(json))
  return _(dependencyTree)
    .flattenDeep()
    .map(({name, version}) => ({id: `${name}@${version}`, name, version}))
    .sortBy('id')
    .sortedUniqBy('id')
    .value()
}

function dependenciesRecursive({dependencies}) {
  return _(dependencies)
    .mapValues((props, name) => [{name, version: props.version}].concat(dependenciesRecursive(props)))
    .values()
    .value()
}

