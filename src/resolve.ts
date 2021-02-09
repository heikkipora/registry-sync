import * as fs from 'fs'
import * as pathLib from 'path'
import * as readline from 'readline'
import * as url from 'url'
import {deepStrictEqual} from 'assert'
import * as yarnLockfile from '@yarnpkg/lockfile'
import type {
  CacheSchemaV1,
  CacheSchemaV2,
  CacheSchemaV3,
  Package,
  PackageLock,
  PackageLockDependency,
  PackageWithId,
  PlatformVariant,
  YarnLockDependency
} from './types'
import {normalizeYarnPackagePattern} from "./normalize-yarn-pattern";

const YARN_LOCK_FILENAME = 'yarn.lock'

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

function isNonRegistryYarnPackagePattern(packagePattern: string): boolean {
  if (// See https://github.com/yarnpkg/yarn/blob/953c8b6a20e360b097625d64189e6e56ed813e0f/src/resolvers/exotics/link-resolver.js#L14
      packagePattern.startsWith('link:') ||
      // See https://github.com/yarnpkg/yarn/blob/953c8b6a20e360b097625d64189e6e56ed813e0f/src/resolvers/exotics/file-resolver.js#L18
      packagePattern.startsWith('file:') ||
      /^\.{1,2}\//.test(packagePattern) ||
      pathLib.isAbsolute(packagePattern) ||
      // See https://github.com/yarnpkg/yarn/blob/953c8b6a20e360b097625d64189e6e56ed813e0f/src/resolvers/exotics/tarball-resolver.js#L15
      packagePattern.startsWith('http://') ||
      packagePattern.startsWith('https://') ||
      (packagePattern.indexOf('@') < 0 && (packagePattern.endsWith('.tgz') || packagePattern.endsWith('.tar.gz'))) ||
      // See https://github.com/yarnpkg/yarn/blob/953c8b6a20e360b097625d64189e6e56ed813e0f/src/resolvers/exotics/github-resolver.js#L6
      packagePattern.startsWith('github:') ||
      /^[^:@%/\s.-][^:@%/\s]*[/][^:@\s/%]+(?:#.*)?$/.test(packagePattern) ||
      // See https://github.com/yarnpkg/yarn/blob/953c8b6a20e360b097625d64189e6e56ed813e0f/src/resolvers/exotics/gitlab-resolver.js#L6
      packagePattern.startsWith('gitlab:') ||
      // See https://github.com/yarnpkg/yarn/blob/953c8b6a20e360b097625d64189e6e56ed813e0f/src/resolvers/exotics/bitbucket-resolver.js#L6
      packagePattern.startsWith('bitbucket:') ||
      // See https://github.com/yarnpkg/yarn/blob/953c8b6a20e360b097625d64189e6e56ed813e0f/src/resolvers/exotics/gist-resolver.js#L26
      packagePattern.startsWith('gist:') ||
      // See https://github.com/yarnpkg/yarn/blob/953c8b6a20e360b097625d64189e6e56ed813e0f/src/resolvers/exotics/git-resolver.js#L19
      /^git:|^git\+.+:|^ssh:|^https?:.+\.git$|^https?:.+\.git#.+/.test(packagePattern)) {
    return true
  } else {
    // See https://github.com/yarnpkg/yarn/blob/953c8b6a20e360b097625d64189e6e56ed813e0f/src/resolvers/exotics/git-resolver.js#L19
    const {hostname, path} = url.parse(packagePattern);
    if (hostname && path && ['github.com', 'gitlab.com', 'bitbucket.com', 'bitbucket.org'].indexOf(hostname) >= 0) {
      return path.split('/').filter((p): boolean => !!p).length === 2;
    }
  }
}

function resolvePackageNameFromRegistryYarnPackagePattern(packagePattern: string): string {
  // See https://github.com/yarnpkg/yarn/blob/953c8b6a20e360b097625d64189e6e56ed813e0f/src/resolvers/exotics/registry-resolver.js#L12
  const match = packagePattern.match(/^(\S+):(@?.*?)(@(.*?)|)$/);
  if (match) {
    return match[2];
  } else {
    throw new Error(`Failed to resolve yarn package pattern ${packagePattern}, unrecognized format`)
  }
}

function resolveNpmPackagesFromYarnLockDependencies(yarnLockDependencies: YarnLockDependency[]): PackageWithId[] {
  const packages: PackageWithId[] = yarnLockDependencies
    .reduce(function(filterMappedDependencies: PackageWithId[], {packagePattern, version}) {
      if (isNonRegistryYarnPackagePattern(packagePattern)) {
        return filterMappedDependencies;
      }

      let packageName

      if (packagePattern.startsWith('npm:') || packagePattern.startsWith('yarn:')) {
        packageName = resolvePackageNameFromRegistryYarnPackagePattern(packagePattern)
      } else {
        // Package pattern not yet recognized, continue with parsing logic from
        // https://github.com/yarnpkg/yarn/blob/953c8b6a20e360b097625d64189e6e56ed813e0f/src/package-request.js#L99
        const {name: namePart, range: rangePart} = normalizeYarnPackagePattern(packagePattern)

        if (isNonRegistryYarnPackagePattern(rangePart)) {
          return filterMappedDependencies;
        }

        if (rangePart.startsWith('npm:') || rangePart.startsWith('yarn:')) {
          packageName = resolvePackageNameFromRegistryYarnPackagePattern(rangePart)
        } else {
          // Finally, we just assume that the pattern is a registry pattern,
          // see https://github.com/yarnpkg/yarn/blob/953c8b6a20e360b097625d64189e6e56ed813e0f/src/package-request.js#L119
          packageName = namePart
        }
      }

      filterMappedDependencies.push({ id: `${packageName}@${version}`, name: packageName, version })

      return filterMappedDependencies;
    }, []);

  return packages
}

async function parseDependenciesFromNpmLockFile(lockFilepath: string, includeDevDependencies: boolean): Promise<PackageWithId[]> {
  const packageLock: PackageLock = JSON.parse(await fs.promises.readFile(lockFilepath, 'utf8'))
  const dependencies = recurseNpmLockfileDependencies(packageLock, includeDevDependencies)

  return dependencies.map(({name, version}) => ({id: `${name}@${version}`, name, version}))
}

async function parseDependenciesFromYarnLockFile(lockFilepath: string): Promise<PackageWithId[]> {
  const lockFileStream = fs.createReadStream(lockFilepath)
  const lockFileReadlineInterface = readline.createInterface({
    input: lockFileStream,
    crlfDelay: Infinity
  });

  for await (const line of lockFileReadlineInterface) {
    // https://github.com/yarnpkg/yarn/blob/953c8b6a20e360b097625d64189e6e56ed813e0f/src/lockfile/stringify.js#L111
    if (/# yarn lockfile v1\s*$/.test(line)) {
      // lockfile version 1 recognized
      break
    }

    if (/^\s*$/.test(line) || /^\s*#/.test(line)) {
      // skip empty or comment lines
      continue
    }

    throw new Error(`Failed to parse file ${lockFilepath} as yarn lockfile, unrecognized format, only version 1 is supported`)
  }
  lockFileStream.destroy()

  const lockfileContents = await fs.promises.readFile(lockFilepath, 'utf8')
  const {
    type: lockfileParseStatus,
    object: packagePatternToLockedVersion
  }: {
    type: 'success' | 'merge' | 'conflict',
    object: { [packagePattern: string]: { version: string } }
  } = yarnLockfile.parse(lockfileContents);

  if (lockfileParseStatus !== 'success') {
    throw new Error(`Failed to parse file ${lockFilepath} as yarn lockfile, parse status ${lockfileParseStatus}`)
  }

  const yarnLockDependencies: YarnLockDependency[] = Object.entries(packagePatternToLockedVersion)
    .map(([packagePattern, {version}]) => ({ packagePattern, version }))

  return resolveNpmPackagesFromYarnLockDependencies(yarnLockDependencies)
}

export async function dependenciesFromPackageLock(path: string, includeDevDependencies: boolean): Promise<PackageWithId[]> {
  const filename = pathLib.basename(path)
  const dependencies = (filename === YARN_LOCK_FILENAME) ?
    await parseDependenciesFromYarnLockFile(path) :
    await parseDependenciesFromNpmLockFile(path, includeDevDependencies)

  return dependencies
    .sort(sortById)
    .filter(uniqueById)
}

function sortById(a: PackageWithId, b: PackageWithId): number {
  return a.id.localeCompare(b.id)
}

function uniqueById(value: PackageWithId, index: number, values: PackageWithId[]): boolean {
  return values.findIndex(v => v.id === value.id) === index
}

function recurseNpmLockfileDependencies({dependencies}: PackageLock | PackageLockDependency, includeDevDependencies: boolean): Package[] {
  if (!dependencies) {
    return []
  }
  const includeFn = includeDevDependencies ? filterOutBundledDependencies : filterOutBundledAndDevDependencies
  return Object.entries(dependencies)
    .filter(includeFn)
    .map(([name, props]) => [{name, version: props.version}].concat(recurseNpmLockfileDependencies(props, includeDevDependencies)))
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
