import _ from 'lodash'
import {fetchUrl} from './client'
import fs from 'fs'
import path from 'path'
import semver from 'semver'
import url from 'url'
import {verifyIntegrity} from './integrity'
import {downloadPrebuiltBinaries, hasPrebuiltBinaries} from './pregyp'
import {rewriteMetadataInTarball, rewriteVersionMetadata, tarballFilename} from './metadata'

export async function downloadAll(packages, {localUrl, prebuiltBinaryProperties, registryUrl, rootFolder, enforceTarballsOverHttps = true}) {
  const downloadFromRegistry = download.bind(null, registryUrl, localUrl, rootFolder, prebuiltBinaryProperties, enforceTarballsOverHttps)
  for (const pkg of packages) {
    await downloadFromRegistry(pkg)
  }
}

async function download(registryUrl, localUrl, rootFolder, prebuiltBinaryProperties, enforceTarballsOverHttps, {name, version}) {
  const registryMetadata = await fetchMetadata(name, registryUrl)
  const versionMetadata = _.cloneDeep(registryMetadata.versions[version])
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

async function downloadTarball({_id: id, dist}, enforceTarballsOverHttps) {
  const tarballUrl = enforceTarballsOverHttps ? dist.tarball.replace('http://', 'https://') : dist.tarball
  const data = await fetchTarball(tarballUrl)
  verifyIntegrity(data, id, dist)
  return data
}

function saveTarball({name, version}, data, localFolder) {
  return fs.promises.writeFile(tarballPath(name, version, localFolder), data)
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
    const json = await fs.promises.readFile(path, 'utf8')
    return JSON.parse(json)
  } catch (fileNotFound) {
    return {...defaultMetadata, 'dist-tags': {}, time: {}, versions: {}}
  }
}

function saveMetadata(path, metadata) {
  const json = JSON.stringify(metadata, null, 2)
  return fs.promises.writeFile(path, json, 'utf8')
}


function metadataPath(name, localFolder) {
  return path.join(localFolder, 'index.json')
}

function tarballPath(name, version, localFolder) {
  return path.join(localFolder, tarballFilename(name, version))
}

async function ensureLocalFolderExists(name, rootFolder) {
  const localFolder = path.resolve(rootFolder, name)
  await fs.promises.mkdir(localFolder, {recursive: true})
  return localFolder
}

function fetchTarball(tarballUrl) {
  return fetchUrl(tarballUrl, true)
}

function fetchMetadata(name, registryUrl) {
  const urlSafeName = name.replace(/\//g, '%2f')
  return fetchUrl(url.resolve(registryUrl, urlSafeName))
}
