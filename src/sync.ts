import type {CommandLineOptions, PackageWithId} from './types'
import {downloadAll} from './download'
import {
  dependenciesFromPackageLock,
  dependenciesNotInCache,
  updateDependenciesCache
} from './resolve'

export async function synchronize(options: CommandLineOptions): Promise<PackageWithId[]> {
  const cacheFilePath = `${options.rootFolder}/.registry-sync-cache.json`

  const packages = await dependenciesFromPackageLock(options.manifest, options.includeDevDependencies)
  const newPackages = await dependenciesNotInCache(packages, cacheFilePath, options.prebuiltBinaryProperties)

  if (options.dryRun) {
    console.log(newPackages.map(({name, version}) => `${name}@${version}`).join('\n'))
    console.log(`\nWould download ${newPackages.length} packages.`)
  } else {
    await downloadAll(newPackages, options)
    await updateDependenciesCache(newPackages, cacheFilePath, options.prebuiltBinaryProperties)
    console.log(`Downloaded ${newPackages.length} packages`)
  }

  return newPackages
}
