import * as fs from 'fs'
import {after, describe, it} from 'node:test'
import assert from 'node:assert/strict'
import {dependenciesFromPackageLock} from '../src/resolve.ts'

const cacheFilePath = `${import.meta.dirname}/.cache.json`

describe('resolve yarn', () => {
  it('Should resolve a list of packages from a version 1 yarn.lock file', async () => {
    const packages = await dependenciesFromPackageLock(`${import.meta.dirname}/manifests/yarn.lock`, false)
    const expectedPackages = JSON.parse(await fs.promises.readFile(`${import.meta.dirname}/resolve-yarn-test.json`, 'utf-8'))
    assert.deepStrictEqual(packages, expectedPackages)
  })

  after(() => fs.promises.unlink(cacheFilePath).catch(() => {}))
})
