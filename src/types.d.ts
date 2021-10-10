import type {URL} from 'url'

export interface CommandLineOptions {
  localUrl: URL
  manifest: string
  prebuiltBinaryProperties: PlatformVariant[]
  registryUrl: string
  registryToken: string
  rootFolder: string
  enforceTarballsOverHttps: boolean
  includeDevDependencies: boolean
  dryRun: boolean
}

export interface PackageLock {
  name: string
  version: string
  lockfileVersion?: number
  packages: unknown
  dependencies: {
    [name: string]: PackageLockDependency
  }
}

export interface PackageLockDependency {
  version: string
  resolved: string
  integrity: string
  requires?: {
    [name: string]: string
  }
  dependencies?: {
    [name: string]: PackageLockDependency
  }
  dev?: true
  bundled?: true
}

export interface YarnLockDependency {
  packagePattern: string
  version: string
}

export interface PackageWithId extends Package {
  id: string
}

export interface Package {
  name: string
  version: string
}

export interface CacheSchemaV2 {
  dependencies: PackageWithId[]
  prebuiltBinaryProperties: PlatformVariant[]
  prebuiltBinaryNApiSupport: boolean
}

export type CacheSchemaV1 = PackageWithId[]

export interface PlatformVariant {
  abi: number
  arch: string
  platform: string
}

export interface RegistryMetadata {
  _id: string
  versions: {
    [name: string]: VersionMetadata
  }
  time: {
    modified?: string
    created?: string
    [version: string]: string
  }
  'dist-tags': {
    latest?: string
  }
}

export interface VersionMetadata {
  _id: string
  name: string
  version: string
  binary?: {
    module_name?: string
    module_path?: string
    remote_path?: string
    host?: string
    package_name?: string
    remote_uri?: string
    template: string
    napi_versions?: number[]
  }
  dist: {
    shasum?: string
    integrity?: string
    tarball: string
  }
}
