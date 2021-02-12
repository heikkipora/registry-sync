import * as fs from 'fs'
import * as path from 'path'
import * as semver from 'semver'
import * as url from 'url'
import {verifyIntegrity} from './integrity'
import type {CommandLineOptions, PackageWithId, PlatformVariant, RegistryMetadata, VersionMetadata} from './types'
import {downloadPrebuiltBinaries, hasPrebuiltBinaries} from './pregyp'
import {fetchBinaryData, fetchJsonWithCacheCloned} from './client'
import {rewriteMetadataInTarball, rewriteVersionMetadata, tarballFilename} from './metadata'

export async function downloadAll(
  packages: PackageWithId[],
  {
    localUrl,
    prebuiltBinaryProperties,
    registryUrl,
    rootFolder,
    enforceTarballsOverHttps
  }: Omit<CommandLineOptions, 'manifest' | 'includeDevDependencies'>
): Promise<void> {
  const downloadFromRegistry = download.bind(
    null,
    registryUrl,
    localUrl,
    rootFolder,
    prebuiltBinaryProperties,
    enforceTarballsOverHttps
  )
  for (const pkg of packages) {
    await downloadFromRegistry(pkg)
  }
}

async function download(
  registryUrl: string,
  localUrl: url.URL,
  rootFolder: string,
  prebuiltBinaryProperties: PlatformVariant[],
  enforceTarballsOverHttps: boolean,
  {name, version}: PackageWithId
): Promise<void> {
  const registryMetadata = await fetchMetadataCloned(name, registryUrl)
  const versionMetadata: VersionMetadata | undefined = registryMetadata.versions[version]
  if (!versionMetadata) {
    throw new Error(`Unknown package version ${name}@${version}`)
  }

  const localFolder = await ensureLocalFolderExists(name, rootFolder)
  let data = await downloadTarball(versionMetadata, enforceTarballsOverHttps)
  if (hasPrebuiltBinaries(versionMetadata)) {
    const localPregypFolder = await ensureLocalFolderExists(version, localFolder)
    await downloadPrebuiltBinaries(versionMetadata, localPregypFolder, prebuiltBinaryProperties)
    data = await rewriteMetadataInTarball(data, versionMetadata, localUrl, localFolder)
  }
  await saveTarball(versionMetadata, data, localFolder)

  rewriteVersionMetadata(versionMetadata, data, localUrl)
  await updateMetadata(versionMetadata, registryMetadata, registryUrl, localFolder)
}

async function downloadTarball({_id: id, dist}: VersionMetadata, enforceTarballsOverHttps: boolean): Promise<Buffer> {
  const tarballUrl = enforceTarballsOverHttps ? dist.tarball.replace('http://', 'https://') : dist.tarball
  const data = await fetchBinaryData(tarballUrl)
  verifyIntegrity(data, id, dist)
  return data
}

function saveTarball({name, version}: VersionMetadata, data: Buffer, localFolder: string) {
  return fs.promises.writeFile(tarballPath(name, version, localFolder), data)
}

async function updateMetadata(
  versionMetadata: VersionMetadata,
  defaultMetadata: RegistryMetadata,
  registryUrl: string,
  localFolder: string
) {
  const {version} = versionMetadata
  const localMetadataPath = path.join(localFolder, 'index.json')
  const localMetadata = await loadMetadata(localMetadataPath, defaultMetadata)
  localMetadata.versions[version] = versionMetadata
  localMetadata.time[version] = defaultMetadata.time[version]
  localMetadata['dist-tags'].latest = Object.keys(localMetadata.versions).sort(semver.compare).pop()
  await saveMetadata(localMetadataPath, localMetadata)
}

async function loadMetadata(path: string, defaultMetadata: RegistryMetadata): Promise<RegistryMetadata> {
  try {
    const json = await fs.promises.readFile(path, 'utf8')
    return JSON.parse(json)
  } catch (fileNotFound) {
    return {...defaultMetadata, 'dist-tags': {}, time: {}, versions: {}}
  }
}

function saveMetadata(path: string, metadata: RegistryMetadata): Promise<void> {
  const json = JSON.stringify(metadata, null, 2)
  return fs.promises.writeFile(path, json, 'utf8')
}

function tarballPath(name: string, version: string, localFolder: string) {
  return path.join(localFolder, tarballFilename(name, version))
}

async function ensureLocalFolderExists(name: string, rootFolder: string): Promise<string> {
  const localFolder = path.resolve(rootFolder, name)
  await fs.promises.mkdir(localFolder, {recursive: true})
  return localFolder
}

function fetchMetadataCloned(name: string, registryUrl: string): Promise<RegistryMetadata> {
  const urlSafeName = name.replace(/\//g, '%2f')
  return fetchJsonWithCacheCloned(url.resolve(registryUrl, urlSafeName))
}
