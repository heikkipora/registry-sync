import * as fs from 'fs'
import * as path from 'path'
import * as semver from 'semver'
import * as url from 'url'
import {fetchBinaryData} from './client'
import type {PlatformVariant, VersionMetadata} from './types'

export function hasPrebuiltBinaries({binary}: VersionMetadata): boolean {
  return Boolean(binary && binary.module_name)
}

export async function downloadPrebuiltBinaries(
  versionMetadata: VersionMetadata,
  localFolder: string,
  prebuiltBinaryProperties: PlatformVariant[]
): Promise<void> {
  const {binary, name, version} = versionMetadata

  if (!binary.napi_versions) {
    for (const {abi, arch, platform} of prebuiltBinaryProperties) {
      await downloadPrebuiltBinary(localFolder, name, version, binary, abi, platform, arch)
    }
    return
  }

  for (const napiVersion of binary.napi_versions) {
    for (const {abi, arch, platform} of prebuiltBinaryProperties) {
      await downloadPrebuiltBinary(localFolder, name, version, binary, abi, platform, arch, napiVersion)
    }
  }
}

async function downloadPrebuiltBinary(
  localFolder: string,
  name: string,
  version: string,
  binary: VersionMetadata['binary'],
  abi: number,
  platform: string,
  arch: string,
  napiVersion?: number
): Promise<void> {
  try {
    const data = await fetchPrebuiltBinary(name, version, binary, abi, platform, arch, napiVersion)
    await fs.promises.writeFile(
      prebuiltBinaryFilePath(localFolder, name, version, binary, abi, platform, arch, napiVersion),
      data
    )
  } catch (err) {
    // pre-built binaries are commonly not available on all platforms (and S3 will commonly respond with 403 for a non-existent file)
    const fileNotFoundError = err.response && (err.response.status == 403 || err.response.status == 404)
    if (!fileNotFoundError) {
      console.error(
        `Unexpected error fetching prebuilt binary for ${name} and ABI v${abi} on ${arch}-${platform} (n-api version ${napiVersion})`
      )
      throw err
    }
  }
}

function fetchPrebuiltBinary(
  name: string,
  version: string,
  binary: VersionMetadata['binary'],
  abi: number,
  platform: string,
  arch: string,
  napiVersion?: number
): Promise<Buffer> {
  return fetchBinaryData(prebuiltBinaryUrl(name, version, binary, abi, platform, arch, napiVersion))
}

function prebuiltBinaryFilePath(
  localFolder: string,
  name: string,
  version: string,
  binary: VersionMetadata['binary'],
  abi: number,
  platform: string,
  arch: string,
  napiVersion?: number
): string {
  return path.join(localFolder, prebuiltBinaryFileName(name, version, binary, abi, platform, arch, napiVersion))
}

function prebuiltBinaryUrl(
  name: string,
  version: string,
  binary: VersionMetadata['binary'],
  abi: number,
  platform: string,
  arch: string,
  napiVersion?: number
): string {
  const remotePath = prebuiltBinaryRemotePath(name, version, binary, abi, platform, arch, napiVersion).replace(
    /\/$/,
    ''
  )
  const fileName = prebuiltBinaryFileName(name, version, binary, abi, platform, arch, napiVersion)
  return url.resolve(binary.host, `${remotePath}/${fileName}`)
}

function prebuiltBinaryRemotePath(
  name: string,
  version: string,
  binary: VersionMetadata['binary'],
  abi: number,
  platform: string,
  arch: string,
  napiVersion?: number
): string {
  return formatPrebuilt(binary.remote_path, name, version, binary.module_name, abi, platform, arch, napiVersion)
}

function prebuiltBinaryFileName(
  name: string,
  version: string,
  binary: VersionMetadata['binary'],
  abi: number,
  platform: string,
  arch: string,
  napiVersion?: number
): string {
  return formatPrebuilt(binary.package_name, name, version, binary.module_name, abi, platform, arch, napiVersion)
}

// see node-pre-gyp: /lib/util/versioning.js for documentation of possible values
function formatPrebuilt(
  formatString: string,
  name: string,
  version: string,
  moduleName: string,
  abi: number,
  platform: string,
  arch: string,
  napiVersion?: number
): string {
  const moduleVersion = semver.parse(version)
  const prerelease = (moduleVersion.prerelease || []).join('.')
  const build = (moduleVersion.build || []).join('.')

  const formatted = formatString
    .replace('{name}', name)
    .replace('{version}', version)
    .replace('{major}', moduleVersion.major.toString())
    .replace('{minor}', moduleVersion.minor.toString())
    .replace('{patch}', moduleVersion.patch.toString())
    .replace('{prerelease}', prerelease)
    .replace('{build}', build)
    .replace('{module_name}', moduleName)
    .replace('{node_abi}', `node-v${abi}`)
    .replace('{platform}', platform)
    .replace('{arch}', arch)
    .replace('{libc}', libc(platform))
    .replace('{configuration}', 'Release')
    .replace('{toolset}', '')
    .replace(/[/]+/g, '/')

  return napiVersion ? formatted.replace('{napi_build_version}', napiVersion.toString()) : formatted
}

function libc(platform: string): string {
  return platform === 'linux' ? 'glibc' : 'unknown'
}
