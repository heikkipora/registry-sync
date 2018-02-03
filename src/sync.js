import {downloadAll} from '../src/download'
import {
  dependenciesFromPackageLock,
  dependenciesNotInCache,
  updateDependenciesCache
} from '../src/resolve'

export async function synchronize(options) {
  const cacheFilePath = `${options.rootFolder}/.registry-sync-cache.json`

  const packages = await dependenciesFromPackageLock(options.manifest)
  const newPackages = await dependenciesNotInCache(packages, cacheFilePath)
  await downloadAll(newPackages, options)
  await updateDependenciesCache(newPackages, cacheFilePath)
  return newPackages
}
