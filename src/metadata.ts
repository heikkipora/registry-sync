import * as fs from 'fs'
import * as path from 'path'
import * as tar from 'tar-fs'
import * as zlib from 'zlib'
import {hasPrebuiltBinaries} from './pregyp'
import {Readable} from 'stream'
import type {URL} from 'url'
import type {VersionMetadata} from './types'
import {sha1, sha512} from './integrity'

export function rewriteVersionMetadata(versionMetadata: VersionMetadata, data: Buffer, localUrl: URL, actualNapiVersions: number[]): void {
  versionMetadata.dist.tarball = localTarballUrl(versionMetadata, localUrl)

  if (hasPrebuiltBinaries(versionMetadata)) {
    versionMetadata.binary.host = localUrl.origin
    versionMetadata.binary.remote_path = createPrebuiltBinaryRemotePath(localUrl, versionMetadata)
    versionMetadata.binary.napi_versions = actualNapiVersions
    versionMetadata.dist.integrity = sha512(data)
    versionMetadata.dist.shasum = sha1(data)
  }
}

export async function rewriteMetadataInTarball(data: Buffer, versionMetadata: VersionMetadata, localUrl: URL, localFolder: string, actualNapiVersions: number[]): Promise<Buffer> {
  const tmpFolder = path.join(localFolder, '.tmp')
  await fs.promises.mkdir(tmpFolder, {recursive: true})
  await extractTgz(data, tmpFolder)

  const manifestPath = path.join(tmpFolder, 'package', 'package.json')
  const json = await fs.promises.readFile(manifestPath, 'utf8')
  const metadata = JSON.parse(json)
  metadata.binary.host = localUrl.origin
  metadata.binary.remote_path = createPrebuiltBinaryRemotePath(localUrl, versionMetadata)
  metadata.binary.napi_versions = actualNapiVersions
  await fs.promises.writeFile(manifestPath, JSON.stringify(metadata, null, 2))

  const updatedData = await compressTgz(tmpFolder)
  await fs.promises.rmdir(tmpFolder, {recursive: true})
  return updatedData
}

function createPrebuiltBinaryRemotePath(url: URL, versionMetadata: VersionMetadata): string {
  return `${removeTrailingSlash(url.pathname)}/${versionMetadata.name}/${versionMetadata.version}/`
}

export function extractTgz(data: Buffer, folder: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tgz = Readable.from(data)
      .pipe(zlib.createGunzip())
      .pipe(tar.extract(folder))

    tgz.on('finish', resolve)
    tgz.on('error', reject)
  })
}

function compressTgz(folder: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    const tgz = tar
      .pack(folder)
      .pipe(zlib.createGzip())
    tgz.on('data', (chunk: Buffer) => chunks.push(chunk))
    tgz.on('end', () => resolve(Buffer.concat(chunks)))
    tgz.on('error', reject)
  })
}

function localTarballUrl({name, version}: {name: string, version: string}, localUrl: URL) {
  return `${localUrl.origin}${removeTrailingSlash(localUrl.pathname)}/${name}/${tarballFilename(name, version)}`
}

export function tarballFilename(name: string, version: string): string {
  const normalized = name.replace(/\//g, '-')
  return `${normalized}-${version}.tgz`
}

function removeTrailingSlash(str: string): string {
  return str.replace(/\/$/, "")
}
