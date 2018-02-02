import _ from 'lodash'
import Promise from 'bluebird'

const fs = Promise.promisifyAll(require('fs'))

export function updateDependenciesCache(dependencies, cacheFilePath) {
  return fs.writeFileAsync(cacheFilePath, JSON.stringify(dependencies), 'utf8')
}

export async function dependenciesNotInCache(dependencies, cacheFilePath) {
  try {
    const json = await fs.readFileAsync(cacheFilePath, 'utf8')
    const cachedDependencies = JSON.parse(json)
    return _.differenceBy(dependencies, cachedDependencies, 'id')
  } catch (fileNotFound) {
    return dependencies
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

