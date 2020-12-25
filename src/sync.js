import {downloadAll} from './download'
import {
  dependenciesFromPackageLock,
  dependenciesNotInCache,
  updateDependenciesCache
} from './resolve'

export async function synchronize(options) {
  const cacheFilePath = `${options.rootFolder}/.registry-sync-cache.json`

  const packages = await dependenciesFromPackageLock(options.manifest, options.includeDevDependencies)
  const newPackages = await dependenciesNotInCache(packages, cacheFilePath, options.prebuiltBinaryProperties)
  await downloadAll(newPackages, options)
  await updateDependenciesCache(newPackages, cacheFilePath, options.prebuiltBinaryProperties)
  return newPackages
}
