import * as fs from 'fs'
import * as path from 'path'
import * as tar from 'tar-fs'
import * as zlib from 'zlib'
import {after, describe, it} from 'node:test'
import assert from 'node:assert/strict'
import {extractTgz, rewriteMetadataInTarball, tarballFilename} from '../src/metadata.ts'
import {URL} from 'url'
import type {VersionMetadata} from '../src/types.d.ts'

const tmpFolder = path.join(import.meta.dirname, '.metadata-tmp')

describe('metadata', () => {
  describe('tarballFilename', () => {
    it('Should generate a tarball filename', () => {
      assert.strictEqual(tarballFilename('lodash', '4.17.21'), 'lodash-4.17.21.tgz')
    })

    it('Should replace slashes in scoped package names', () => {
      assert.strictEqual(tarballFilename('@babel/core', '7.0.0'), '@babel-core-7.0.0.tgz')
    })
  })

  describe('extractTgz and round-trip', () => {
    it('Should extract a tarball and preserve contents', async () => {
      await fs.promises.mkdir(path.join(tmpFolder, 'src'), {recursive: true})
      await fs.promises.writeFile(path.join(tmpFolder, 'src', 'test.txt'), 'hello')

      const tgzData = await new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = []
        const stream = tar.pack(tmpFolder).pipe(zlib.createGzip())
        stream.on('data', (chunk: Buffer) => chunks.push(chunk))
        stream.on('end', () => resolve(Buffer.concat(chunks)))
        stream.on('error', reject)
      })

      const extractFolder = path.join(tmpFolder, 'extracted')
      await fs.promises.mkdir(extractFolder, {recursive: true})
      await extractTgz(tgzData, extractFolder)

      const content = await fs.promises.readFile(path.join(extractFolder, 'src', 'test.txt'), 'utf-8')
      assert.strictEqual(content, 'hello')
    })
  })

  describe('rewriteMetadataInTarball', () => {
    it('Should rewrite binary host and remote_path in tarball package.json', async () => {
      const pkgDir = path.join(tmpFolder, 'rewrite-src', 'package')
      await fs.promises.mkdir(pkgDir, {recursive: true})
      await fs.promises.writeFile(
        path.join(pkgDir, 'package.json'),
        JSON.stringify({
          name: 'test-pkg',
          binary: {
            host: 'https://original-host.com',
            remote_path: '/original/',
            module_name: 'test',
            package_name: '{module_name}-v{version}-{node_abi}-{platform}-{arch}.tar.gz'
          }
        })
      )

      const tgzData = await new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = []
        const stream = tar.pack(path.join(tmpFolder, 'rewrite-src')).pipe(zlib.createGzip())
        stream.on('data', (chunk: Buffer) => chunks.push(chunk))
        stream.on('end', () => resolve(Buffer.concat(chunks)))
        stream.on('error', reject)
      })

      const versionMetadata: VersionMetadata = {
        _id: 'test-pkg@1.0.0',
        name: 'test-pkg',
        version: '1.0.0',
        binary: {
          host: 'https://original-host.com',
          remote_path: '/original/',
          module_name: 'test',
          package_name: '{module_name}-v{version}-{node_abi}-{platform}-{arch}.tar.gz',
          template: ''
        },
        dist: {
          tarball: 'https://original-host.com/test-pkg/test-pkg-1.0.0.tgz'
        }
      }

      const localUrl = new URL('https://my-registry.local:8443/npm')
      const rewrittenTgz = await rewriteMetadataInTarball(
        tgzData,
        versionMetadata,
        localUrl,
        path.join(tmpFolder, 'rewrite-work')
      )

      const verifyDir = path.join(tmpFolder, 'rewrite-verify')
      await fs.promises.mkdir(verifyDir, {recursive: true})
      await extractTgz(rewrittenTgz, verifyDir)

      const pkg = JSON.parse(
        await fs.promises.readFile(path.join(verifyDir, 'package', 'package.json'), 'utf-8')
      )
      assert.strictEqual(pkg.binary.host, 'https://my-registry.local:8443')
      assert.strictEqual(pkg.binary.remote_path, '/npm/test-pkg/1.0.0/')
    })
  })

  after(async () => {
    await fs.promises.rm(tmpFolder, {recursive: true, force: true})
  })
})
