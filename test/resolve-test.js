import {expect} from 'chai'
import fs from 'fs'
import {
  dependenciesFromPackageLock,
  dependenciesNotInCache,
  updateDependenciesCache
} from '../src/resolve'

const expectedPackages = require('./resolve-test.json')
const expectedPackagesWithDev = require('./resolve-test-with-dev.json')
const cacheFilePath = `${__dirname}/.cache.json`

describe('resolve', () => {
  it('Should resolve a linear list of packages from a package-lock.json file', async () => {
    const packages = await dependenciesFromPackageLock(`${__dirname}/manifests/package-lock.json`, false)
    expect(packages).to.deep.equal(expectedPackages)
  })

  it('Should resolve a linear list of packages from a package-lock.json file with devDependencies', async () => {
    const packages = await dependenciesFromPackageLock(`${__dirname}/manifests/package-lock.json`, true)
    expect(packages).to.deep.equal(expectedPackagesWithDev)
  })

  it('Should detect packages that are new (compared to cache)', async () => {
    const dependenciesV1 = [
      {id: "abbrev@1.1.1", name: "abbrev", version: "1.1.1"},
      {id: "ajv@4.11.8",name: "ajv",version: "4.11.8"}
    ]
    const dependenciesV2 = [
      {id: "abbrev@1.1.2", name: "abbrev", version: "1.1.2"},
      {id: "ajv@4.11.8",name: "ajv",version: "4.11.8"},
      {id: "aproba@1.2.0",name: "aproba",version: "1.2.0"}
    ]
    const expectedDependencies = [
      {id: "abbrev@1.1.2", name: "abbrev", version: "1.1.2"},
      {id: "aproba@1.2.0",name: "aproba",version: "1.2.0"}
    ]
    await updateDependenciesCache(dependenciesV1, cacheFilePath)
    const changedDependencies = await dependenciesNotInCache(dependenciesV2, cacheFilePath)
    expect(changedDependencies).to.deep.equal(expectedDependencies)
  })

  after(() => fs.unlinkSync(cacheFilePath))
})