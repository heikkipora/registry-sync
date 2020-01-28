import {hasPrebuiltBinaries} from './pregyp'
import mkdirp from 'mkdirp'
import path from 'path'
import Promise from 'bluebird'
import rimraf from 'rimraf'
import streamifier from 'streamifier'
import tar from 'tar-fs'
import url from 'url'
import zlib from 'zlib'
import {sha1, sha512} from './integrity'

const fs = Promise.promisifyAll(require('fs'))
const rimrafAsync = Promise.promisify(rimraf)

export function rewriteVersionMetadata(versionMetadata, data, localUrl) {
  versionMetadata.dist.tarball = localTarballUrl(versionMetadata, localUrl)

  if (hasPrebuiltBinaries(versionMetadata)) {
    versionMetadata.binary.host = localUrl
    versionMetadata.binary.remote_path = `/${versionMetadata.name}/${versionMetadata.version}/`
    versionMetadata.dist.integrity = sha512(data)
    versionMetadata.dist.shasum = sha1(data)
  }
}

export async function rewriteMetadataInTarball(data, versionMetadata, localUrl, localFolder) {
  const tmpFolder = path.join(localFolder, '.tmp')
  await mkdirp(tmpFolder)
  await extractTgz(data, tmpFolder)

  const manifestPath = path.join(tmpFolder, 'package', 'package.json')
  const json = await fs.readFileAsync(manifestPath, 'utf8')
  const metadata = JSON.parse(json)
  metadata.binary.host = localUrl
  metadata.binary.remote_path = `/${versionMetadata.name}/${versionMetadata.version}/`
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

function localTarballUrl({name, version}, localUrl) {
  return url.resolve(localUrl, `${name}/${tarballFilename(name, version)}`)
}

export function tarballFilename(name, version) {
  const normalized = name.replace(/\//g, '-')
  return `${normalized}-${version}.tgz`
}
