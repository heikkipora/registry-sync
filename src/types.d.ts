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
  packages: {
    [path: string]: {
      version: string
      // only aliased packages have the name property
      name?: string
      dev?: true
    }
  }
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
    [tag: string]: string
  }
}

export interface VersionMetadata {
  _id: string
  name: string
  version: string
  binary?: PrebuiltBinaryMetadata
  dist: {
    shasum?: string
    integrity?: string
    tarball: string
  }
}

// The following properties may be present but are ignored by registry-sync
// module_path?: string
// remote_uri?: string
export interface PrebuiltBinaryMetadata {
  host: string
  module_name: string
  napi_versions?: number[]
  package_name: string
  remote_path: string
  template: string
}

export interface VersionMetadataWithBinary extends VersionMetadata {
  binary: PrebuiltBinaryMetadata
}
