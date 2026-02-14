import * as fs from 'fs'
import {after, describe, it} from 'node:test'
import assert from 'node:assert/strict'
import {dependenciesFromPackageLock, dependenciesNotInCache, updateDependenciesCache} from '../src/resolve.ts'

const cacheFilePath = `${import.meta.dirname}/.cache.json`

describe('resolve', () => {
  it('Should resolve a linear list of packages from a package-lock.json file', async () => {
    const expectedPackages = JSON.parse(await fs.promises.readFile(`${import.meta.dirname}/resolve-test.json`, 'utf-8'))
    const packages = await dependenciesFromPackageLock(`${import.meta.dirname}/manifests/package-lock.json`, false)
    assert.deepStrictEqual(packages, expectedPackages)
  })

  it('Should resolve a package with an aliased version value from a package-lock.json file', async () => {
    const packages = await dependenciesFromPackageLock(
      `${import.meta.dirname}/manifests/package-lock-with-aliased-vue-loader.json`,
      false
    )
    const vueLoaders = packages.filter(p => p.name.startsWith('vue-loader'))
    assert.deepStrictEqual(vueLoaders, [
      {
        id: 'vue-loader@15.9.6',
        name: 'vue-loader',
        version: '15.9.6'
      },
      {
        id: 'vue-loader@16.2.0',
        name: 'vue-loader',
        version: '16.2.0'
      }
    ])
  })

  it('Should resolve a linear list of packages from a package-lock.json file with devDependencies', async () => {
    const expectedPackagesWithDev = JSON.parse(
      await fs.promises.readFile(`${import.meta.dirname}/resolve-test-with-dev.json`, 'utf-8')
    )
    const packages = await dependenciesFromPackageLock(`${import.meta.dirname}/manifests/package-lock.json`, true)
    assert.deepStrictEqual(packages, expectedPackagesWithDev)
  })

  it('Should detect packages that are new (compared to cache)', async () => {
    const dependenciesV1 = [
      {id: 'abbrev@1.1.1', name: 'abbrev', version: '1.1.1'},
      {id: 'ajv@4.11.8', name: 'ajv', version: '4.11.8'}
    ]
    const dependenciesV2 = [
      {id: 'abbrev@1.1.2', name: 'abbrev', version: '1.1.2'},
      {id: 'ajv@4.11.8', name: 'ajv', version: '4.11.8'},
      {id: 'aproba@1.2.0', name: 'aproba', version: '1.2.0'}
    ]
    const expectedDependencies = [
      {id: 'abbrev@1.1.2', name: 'abbrev', version: '1.1.2'},
      {id: 'aproba@1.2.0', name: 'aproba', version: '1.2.0'}
    ]
    await updateDependenciesCache(dependenciesV1, cacheFilePath, [])
    const changedDependencies = await dependenciesNotInCache(dependenciesV2, cacheFilePath, [])
    assert.deepStrictEqual(changedDependencies, expectedDependencies)
  })

  after(() => fs.promises.unlink(cacheFilePath).catch(() => {}))
})
