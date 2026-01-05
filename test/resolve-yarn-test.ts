import * as fs from 'fs'
import {dependenciesFromPackageLock} from '../src/resolve.ts'
import {expect} from 'chai'

const cacheFilePath = `${import.meta.dirname}/.cache.json`

describe('resolve yarn', () => {
  it('Should resolve a list of packages from a version 1 yarn.lock file', async () => {
    const packages = await dependenciesFromPackageLock(`${import.meta.dirname}/manifests/yarn.lock`, false)
    const expectedPackages = JSON.parse(await fs.promises.readFile(`${import.meta.dirname}/resolve-yarn-test.json`, 'utf-8'))
    expect(packages).to.deep.equal(expectedPackages)
  })

  after(() => fs.promises.unlink(cacheFilePath).catch(() => {}))
})
