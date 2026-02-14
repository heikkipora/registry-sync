import * as fs from 'fs'
import * as path from 'path'
import {after, describe, it} from 'node:test'
import assert from 'node:assert/strict'
import {downloadAll} from '../src/download.ts'
import {extractTgz} from '../src/metadata.ts'
import {URL} from 'url'
import type {PlatformVariant, RegistryMetadata} from '../src/types.d.ts'

const rootFolder = `${import.meta.dirname}/.download`
const tmpFolder = path.join(import.meta.dirname, '.tmp')
const options = {
  registryUrl: 'https://registry.npmjs.org',
  localUrl: new URL('https://localhost:8443'),
  registryToken: '',
  rootFolder,
  prebuiltBinaryProperties: [] as PlatformVariant[],
  enforceTarballsOverHttps: true,
  dryRun: false
}

const prebuiltBinaryProperties = [
  {abi: 57, arch: 'x64', platform: 'darwin'},
  {abi: 57, arch: 'x64', platform: 'linux'},
  {abi: 64, arch: 'x64', platform: 'darwin'},
  {abi: 64, arch: 'x64', platform: 'linux'}
]

describe('download', () => {
  it('Should download all packages and create metadata files', async () => {
    const packages = [
      {id: 'abbrev@1.1.0', name: 'abbrev', version: '1.1.0'},
      {id: 'abbrev@1.1.1', name: 'abbrev', version: '1.1.1'},
      {id: 'aproba@2.1.0', name: 'aproba', version: '2.1.0'}
    ]
    await downloadAll(packages, options)
  })

  it('Should download a package with correct metadata', async () => {
    const packages = [{id: 'aproba@2.1.0', name: 'aproba', version: '2.1.0'}]
    await downloadAll(packages, options)
    const aprobaMetadata = await readMetadataFile('aproba')
    assert.strictEqual(aprobaMetadata.versions['2.1.0'].dist.tarball, 'https://localhost:8443/aproba/aproba-2.1.0.tgz')
  })

  it('Should download a package with correct metadata when localUrl contains a path', async () => {
    const packages = [{id: 'aproba@2.1.0', name: 'aproba', version: '2.1.0'}]
    await downloadAll(packages, {
      ...options,
      localUrl: new URL('https://localhost:8443/registry')
    })
    const aprobaMetadata = await readMetadataFile('aproba')
    assert.strictEqual(
      aprobaMetadata.versions['2.1.0'].dist.tarball,
      'https://localhost:8443/registry/aproba/aproba-2.1.0.tgz'
    )
  })

  it('Should download a package with correct metadata when localUrl contains a path with ending slash', async () => {
    const packages = [{id: 'aproba@2.1.0', name: 'aproba', version: '2.1.0'}]
    await downloadAll(packages, {
      ...options,
      localUrl: new URL('https://localhost:8443/registry/')
    })
    const aprobaMetadata = await readMetadataFile('aproba')
    assert.strictEqual(
      aprobaMetadata.versions['2.1.0'].dist.tarball,
      'https://localhost:8443/registry/aproba/aproba-2.1.0.tgz'
    )
  })

  it('Should download a node-pre-gyp package and correctly rewrite metadata', async () => {
    const packages = [{id: 'node-gtk@1.0.0', name: 'node-gtk', version: '1.0.0'}]
    await downloadAll(packages, {...options, prebuiltBinaryProperties})
    await fs.promises.mkdir(tmpFolder, {recursive: true})
    const data = await readTarball('node-gtk', '1.0.0')
    await extractTgz(data, tmpFolder)
    const fileStr = await fs.promises.readFile(path.join(tmpFolder, 'package', 'package.json'), 'utf-8')
    const fileContents = JSON.parse(fileStr)
    assert.strictEqual(fileContents.binary.host, 'https://localhost:8443')
    assert.strictEqual(fileContents.binary.remote_path, '/node-gtk/1.0.0/')
  })

  it('Should download a node-pre-gyp package and correctly rewrite metadata when localUrl contains a path', async () => {
    const packages = [{id: 'node-gtk@1.0.0', name: 'node-gtk', version: '1.0.0'}]
    await downloadAll(packages, {
      ...options,
      prebuiltBinaryProperties,
      localUrl: new URL('https://localhost:8443/registry')
    })
    await fs.promises.mkdir(tmpFolder, {recursive: true})
    const data = await readTarball('node-gtk', '1.0.0')
    await extractTgz(data, tmpFolder)
    const fileStr = await fs.promises.readFile(path.join(tmpFolder, 'package', 'package.json'), 'utf-8')
    const fileContents = JSON.parse(fileStr)
    assert.strictEqual(fileContents.binary.host, 'https://localhost:8443')
    assert.strictEqual(fileContents.binary.remote_path, '/registry/node-gtk/1.0.0/')
  })

  it('Should download a node-pre-gyp package and correctly rewrite metadata when localUrl contains a path with ending slash', async () => {
    const packages = [{id: 'node-gtk@1.0.0', name: 'node-gtk', version: '1.0.0'}]
    await downloadAll(packages, {
      ...options,
      prebuiltBinaryProperties,
      localUrl: new URL('https://localhost:8443/registry/')
    })
    await fs.promises.mkdir(tmpFolder, {recursive: true})
    const data = await readTarball('node-gtk', '1.0.0')
    await extractTgz(data, tmpFolder)
    const fileStr = await fs.promises.readFile(path.join(tmpFolder, 'package', 'package.json'), 'utf-8')
    const fileContents = JSON.parse(fileStr)
    assert.strictEqual(fileContents.binary.host, 'https://localhost:8443')
    assert.strictEqual(fileContents.binary.remote_path, '/registry/node-gtk/1.0.0/')
  })

  it('Should retain custom dist-tags that point to available versions', async () => {
    const packages = [
      {id: 'node-fetch@3.3.1', name: 'node-fetch', version: '3.3.1'},
      {id: 'node-fetch@2.7.0', name: 'node-fetch', version: '2.7.0'},
      {id: 'node-fetch@2.6.7', name: 'node-fetch', version: '2.6.7'}
    ]
    await downloadAll(packages, options)
    const nodeFetchMetadata = await readMetadataFile('node-fetch')
    assert.deepStrictEqual(nodeFetchMetadata['dist-tags'], {
      cjs: '2.6.7',
      latest: '3.3.1',
      'release-2.x': '2.7.0'
    })
  })

  after(async () => {
    await fs.promises.rm(rootFolder, {recursive: true, force: true})
    await fs.promises.rm(tmpFolder, {recursive: true, force: true})
  })
})

function readTarball(name: string, version: string): Promise<Buffer> {
  return fs.promises.readFile(path.join(rootFolder, name, `${name}-${version}.tgz`))
}

async function readMetadataFile(moduleName: string): Promise<RegistryMetadata> {
  const f = await fs.promises.readFile(path.join(rootFolder, moduleName, 'index.json'), {encoding: 'utf-8'})

  return JSON.parse(f)
}
