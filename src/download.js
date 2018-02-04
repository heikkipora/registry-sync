import {fetchUrl} from './client'
import mkdirp from 'mkdirp'
import path from 'path'
import Promise from 'bluebird'
import semver from 'semver'
import url from 'url'
import {downloadPrebuiltBinaries, hasPrebuiltBinaries} from './pregyp'
import {sha1, sha512, verifyIntegrity} from './integrity'

const fs = Promise.promisifyAll(require('fs'))

const concurrency = 5

export function downloadAll(packages, {localUrl, prebuiltBinaryProperties, registryUrl, rootFolder}) {
  const downloadFromRegistry = download.bind(null, registryUrl, localUrl, rootFolder, prebuiltBinaryProperties)
  return Promise.map(packages, downloadFromRegistry, {concurrency})
}

async function download(registryUrl, localUrl, rootFolder, prebuiltBinaryProperties, {name, version}) {
  const registryMetadata = await fetchMetadata(name, registryUrl)
  const versionMetadata = registryMetadata.versions[version]
  if (!versionMetadata) {
    throw new Error(`Unknown package version ${name}@${version}`)
  }

  const localFolder = await ensureLocalFolderExists(name, rootFolder)
  if (hasPrebuiltBinaries(versionMetadata)) {
    const localPregypFolder = await ensureLocalFolderExists(version, localFolder)
    await downloadPrebuiltBinaries(versionMetadata, localPregypFolder, prebuiltBinaryProperties)  
  }
  const data = await downloadTarball(versionMetadata, localFolder) 

  const localVersionMetadata = rewriteVersionMetadata(versionMetadata, data, localUrl)
  await updateMetadata(localVersionMetadata, registryMetadata, registryUrl, localFolder)
}

function rewriteVersionMetadata(versionMetadata, data, localUrl) {
  const dist = {
    integrity: sha512(data),
    shasum: sha1(data),
    tarball: tarballUrl(versionMetadata.name, versionMetadata.version, localUrl)
  }
  const binaryHostAndRemotePath = hasPrebuiltBinaries(versionMetadata) && {host: localUrl, remote_path: `/${versionMetadata.name}/${versionMetadata.version}/`}
  const binary = {
    ...versionMetadata.binary,
    ...binaryHostAndRemotePath
  }
  return {...versionMetadata, dist, binary}
}

async function downloadTarball({_id: id, name, version, dist}, localFolder) {
  const data = await fetchTarball(dist.tarball)
  verifyIntegrity(data, id, dist)
  await fs.writeFileAsync(tarballPath(name, version, localFolder), data)
  return data
}

async function updateMetadata(versionMetadata, defaultMetadata, registryUrl, localFolder) {
  const {name, version} = versionMetadata
  const localMetadataPath = metadataPath(name, localFolder)
  const localMetadata = await loadMetadata(localMetadataPath, defaultMetadata)
  localMetadata.versions[version] = versionMetadata
  localMetadata.time[version] = defaultMetadata.time[version]
  localMetadata['dist-tags'].latest = Object.keys(localMetadata.versions).sort(semver.compare).pop()
  await saveMetadata(localMetadataPath, localMetadata)
}

async function loadMetadata(path, defaultMetadata) {
  try {
    const json = await fs.readFileAsync(path, 'utf8')
    return JSON.parse(json)
  } catch (fileNotFound) {
    return {...defaultMetadata, 'dist-tags': {}, time: {}, versions: {}}
  }
}

async function saveMetadata(path, metadata) {
  const json = JSON.stringify(metadata, null, 2)
  await fs.writeFileAsync(path, json, 'utf8')
}


function metadataPath(name, localFolder) {
  return path.join(localFolder, 'index.json')
}

function tarballPath(name, version, localFolder) {
  return path.join(localFolder, tarballFilename(name, version))
}

function tarballUrl(name, version, localUrl) {
  return url.resolve(localUrl, `${name}/${tarballFilename(name, version)}`)
}

function tarballFilename(name, version) {
  const normalized = name.replace(/\//g, '-')
  return `${normalized}-${version}.tgz`
}

async function ensureLocalFolderExists(name, rootFolder) {
  const localFolder = path.resolve(rootFolder, name)
  await mkdirp(localFolder)
  return localFolder
}

function fetchTarball(tarballUrl) {
  return fetchUrl(tarballUrl, true)
}

function fetchMetadata(name, registryUrl) {
  const urlSafeName = name.replace(/\//g, '%2f')
  return fetchUrl(url.resolve(registryUrl, urlSafeName))
}
