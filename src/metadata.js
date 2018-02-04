import path from 'path'
import Promise from 'bluebird'
import mkdirp from 'mkdirp'
import rimraf from 'rimraf'
import streamifier from 'streamifier'
import tar from 'tar-fs'
import url from 'url'
import zlib from 'zlib'
import {sha1, sha512} from './integrity'
import {hasPrebuiltBinaries} from './pregyp'

const fs = Promise.promisifyAll(require('fs'))
const mkdirpAsync = Promise.promisify(mkdirp)
const rimrafAsync = Promise.promisify(rimraf)

export function rewriteVersionMetadata(versionMetadata, data, localUrl) {
  const dist = {
    integrity: sha512(data),
    shasum: sha1(data),
    tarball: localTarballUrl(versionMetadata, localUrl)
  }
  const binaryHostAndRemotePath = hasPrebuiltBinaries(versionMetadata) && hostAndRemotePath(versionMetadata, localUrl)
  const binary = {
    ...versionMetadata.binary,
    ...binaryHostAndRemotePath
  }
  return {...versionMetadata, dist, binary}
}

function hostAndRemotePath({name, version}, host) {
  return {
    host,
    remote_path: `/${name}/${version}/`
  }
}

function localTarballUrl({name, version}, localUrl) {
  return url.resolve(localUrl, `${name}/${tarballFilename(name, version)}`)
}

export function tarballFilename(name, version) {
  const normalized = name.replace(/\//g, '-')
  return `${normalized}-${version}.tgz`
}

export async function rewriteMetadataInTarball(data, versionMetadata, localUrl, localFolder) {
  const tmpFolder = path.join(localFolder, '.tmp')
  await mkdirpAsync(tmpFolder)
  await extractTgz(data, tmpFolder)

  const manifestPath = path.join(tmpFolder, 'package', 'package.json')
  const json = await fs.readFileAsync(manifestPath, 'utf8')
  const metadata = JSON.parse(json)
  const {host, remote_path} = hostAndRemotePath(versionMetadata, localUrl)
  metadata.binary.host = host
  metadata.binary.remote_path = remote_path
  await fs.writeFileAsync(manifestPath, JSON.stringify(metadata, null, 2))

  const updatedData = await compressTgz(tmpFolder)
  await rimrafAsync(tmpFolder)
  return updatedData
}

function extractTgz(data, folder) {
  return new Promise((resolve, reject) => {
    const tgz = streamifier
      .createReadStream(data)
      .pipe(zlib.createGunzip())
      .pipe(tar.extract(folder))

    tgz.on('finish', resolve)
    tgz.on('error', reject)
  })
}

function compressTgz(folder) {
  return new Promise((resolve, reject) => {
    const chunks = []
    const tgz = tar
      .pack(folder)
      .pipe(zlib.createGzip())
    tgz.on('data', chunk => chunks.push(chunk))
    tgz.on('end', () => resolve(Buffer.concat(chunks)))
    tgz.on('error', reject)
  })
}