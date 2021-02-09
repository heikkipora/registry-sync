import * as fs from 'fs'
import {expect} from 'chai'
import {
  dependenciesFromPackageLock
} from '../src/resolve'

const cacheFilePath = `${__dirname}/.cache.json`

describe('resolve yarn', () => {
  it('Should resolve a list of packages from a version 1 yarn.lock file', async () => {
    const packages = await dependenciesFromPackageLock(`${__dirname}/manifests/yarn.lock`, false)
    const expectedPackages = JSON.parse(await fs.promises.readFile(`${__dirname}/resolve-yarn-test.json`, 'utf-8'))
    expect(packages).to.deep.equal(expectedPackages)
  })

  after(() => fs.promises.unlink(cacheFilePath).catch(() => {}))
})
