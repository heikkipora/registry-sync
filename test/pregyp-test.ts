import {describe, it} from 'node:test'
import assert from 'node:assert/strict'
import {hasPrebuiltBinaries} from '../src/pregyp.ts'
import type {VersionMetadata} from '../src/types.d.ts'

describe('pregyp', () => {
  describe('hasPrebuiltBinaries', () => {
    it('Should return true when all binary properties are present', () => {
      const metadata: VersionMetadata = {
        _id: 'test@1.0.0',
        name: 'test',
        version: '1.0.0',
        binary: {
          host: 'https://example.com',
          module_name: 'test',
          package_name: '{module_name}-v{version}-{node_abi}-{platform}-{arch}.tar.gz',
          remote_path: '/{name}/v{version}/',
          template: ''
        },
        dist: {tarball: 'https://registry.npmjs.org/test/-/test-1.0.0.tgz'}
      }
      assert.strictEqual(hasPrebuiltBinaries(metadata), true)
    })

    it('Should return false when binary is undefined', () => {
      const metadata: VersionMetadata = {
        _id: 'test@1.0.0',
        name: 'test',
        version: '1.0.0',
        dist: {tarball: 'https://registry.npmjs.org/test/-/test-1.0.0.tgz'}
      }
      assert.strictEqual(hasPrebuiltBinaries(metadata), false)
    })

    it('Should return false when host is missing', () => {
      const metadata: VersionMetadata = {
        _id: 'test@1.0.0',
        name: 'test',
        version: '1.0.0',
        binary: {
          host: '',
          module_name: 'test',
          package_name: 'pkg.tar.gz',
          remote_path: '/path/',
          template: ''
        },
        dist: {tarball: 'https://registry.npmjs.org/test/-/test-1.0.0.tgz'}
      }
      assert.strictEqual(hasPrebuiltBinaries(metadata), false)
    })

    it('Should return false when module_name is missing', () => {
      const metadata: VersionMetadata = {
        _id: 'test@1.0.0',
        name: 'test',
        version: '1.0.0',
        binary: {
          host: 'https://example.com',
          module_name: '',
          package_name: 'pkg.tar.gz',
          remote_path: '/path/',
          template: ''
        },
        dist: {tarball: 'https://registry.npmjs.org/test/-/test-1.0.0.tgz'}
      }
      assert.strictEqual(hasPrebuiltBinaries(metadata), false)
    })

    it('Should return false when package_name is missing', () => {
      const metadata: VersionMetadata = {
        _id: 'test@1.0.0',
        name: 'test',
        version: '1.0.0',
        binary: {
          host: 'https://example.com',
          module_name: 'test',
          package_name: '',
          remote_path: '/path/',
          template: ''
        },
        dist: {tarball: 'https://registry.npmjs.org/test/-/test-1.0.0.tgz'}
      }
      assert.strictEqual(hasPrebuiltBinaries(metadata), false)
    })

    it('Should return false when remote_path is missing', () => {
      const metadata: VersionMetadata = {
        _id: 'test@1.0.0',
        name: 'test',
        version: '1.0.0',
        binary: {
          host: 'https://example.com',
          module_name: 'test',
          package_name: 'pkg.tar.gz',
          remote_path: '',
          template: ''
        },
        dist: {tarball: 'https://registry.npmjs.org/test/-/test-1.0.0.tgz'}
      }
      assert.strictEqual(hasPrebuiltBinaries(metadata), false)
    })
  })
})
