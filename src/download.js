import _ from 'lodash'
import {fetchUrl} from './client'
import mkdirp from 'mkdirp'
import path from 'path'
import Promise from 'bluebird'
import semver from 'semver'
import url from 'url'
import {verifyIntegrity} from './integrity'
import {downloadPrebuiltBinaries, hasPrebuiltBinaries} from './pregyp'
import {rewriteMetadataInTarball, rewriteVersionMetadata, tarballFilename} from './metadata'

const fs = Promise.promisifyAll(require('fs'))
const mkdirpAsync = Promise.promisify(mkdirp)

const concurrency = 5

export function downloadAll(packages, {localUrl, prebuiltBinaryProperties, registryUrl, rootFolder}) {
  const downloadFromRegistry = download.bind(null, registryUrl, localUrl, rootFolder, prebuiltBinaryProperties)
  return Promise.map(packages, downloadFromRegistry, {concurrency})
}

async function download(registryUrl, localUrl, rootFolder, prebuiltBinaryProperties, {name, version}) {
  const registryMetadata = await fetchMetadata(name, registryUrl)
  const versionMetadata = _.cloneDeep(registryMetadata.versions[version])
  if (!versionMetadata) {
    throw new Error(`Unknown package version ${name}@${version}`)
  }

  const localFolder = await ensureLocalFolderExists(name, rootFolder)
  let data = await downloadTarball(versionMetadata)
  if (hasPrebuiltBinaries(versionMetadata)) {
    const localPregypFolder = await ensureLocalFolderExists(version, localFolder)
    await downloadPrebuiltBinaries(versionMetadata, localPregypFolder, prebuiltBinaryProperties)
    data = await rewriteMetadataInTarball(data, versionMetadata, localUrl, localFolder)
  }
  await saveTarball(versionMetadata, data, localFolder)

  rewriteVersionMetadata(versionMetadata, data, localUrl)
  await updateMetadata(versionMetadata, registryMetadata, registryUrl, localFolder)
}

async function downloadTarball({_id: id, dist}) {
  const data = await fetchTarball(dist.tarball)
  verifyIntegrity(data, id, dist)
  return data
}

function saveTarball({name, version}, data, localFolder) {
  return fs.writeFileAsync(tarballPath(name, version, localFolder), data)
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

async function ensureLocalFolderExists(name, rootFolder) {
  const localFolder = path.resolve(rootFolder, name)
  await mkdirpAsync(localFolder)
  return localFolder
}

function fetchTarball(tarballUrl) {
  return fetchUrl(tarballUrl, true)
}

function fetchMetadata(name, registryUrl) {
  const urlSafeName = name.replace(/\//g, '%2f')
  return fetchUrl(url.resolve(registryUrl, urlSafeName))
}
