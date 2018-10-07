import _ from 'lodash'
import Promise from 'bluebird'

const fs = Promise.promisifyAll(require('fs'))

export async function updateDependenciesCache(newDependencies, cacheFilePath, prebuiltBinaryProperties) {
  const {dependencies: cachedDependencies} = await loadCache(cacheFilePath)
  const dependencies = _(cachedDependencies)
    .concat(newDependencies)
    .sortBy('id')
    .sortedUniqBy('id')
    .value()

  const data = {
    dependencies,
    prebuiltBinaryProperties
  }
  return fs.writeFileAsync(cacheFilePath, JSON.stringify(data), 'utf8')
}

export async function dependenciesNotInCache(dependencies, cacheFilePath, prebuiltBinaryProperties) {
  const {dependencies: cachedDependencies, prebuiltBinaryProperties: cachedPrebuiltBinaryProperties} = await loadCache(cacheFilePath)
  if (cachedDependencies.length > 0 && !_.isEqual(prebuiltBinaryProperties, cachedPrebuiltBinaryProperties)) {
    console.log(`Pre-built binary properties changed, re-downloading all current packages`)
    return dependencies
  }
  return _.differenceBy(dependencies, cachedDependencies, 'id')
}

async function loadCache(cacheFilePath) {
  try {
    const json = await fs.readFileAsync(cacheFilePath, 'utf8')
    const data = JSON.parse(json)
    if (Array.isArray(data)) {
      return {
        dependencies: data,
        prebuiltBinaryProperties: []
      }
    }
    return data
  } catch (fileNotFound) {
    return {
      dependencies: [],
      prebuiltBinaryProperties: []
    }
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
    .omitBy(({bundled, dev}) => bundled || dev)
    .mapValues((props, name) => [{name, version: props.version}].concat(dependenciesRecursive(props)))
    .values()
    .value()
}

