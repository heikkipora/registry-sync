import * as fs from 'fs'
import {expect} from 'chai'
import {synchronize} from '../src/sync.ts'
import {URL} from 'url'

const rootFolder = `${import.meta.dirname}/.download`

const prebuiltBinaryProperties = [
  {abi: 93, arch: 'x64', platform: 'darwin'},
  {abi: 93, arch: 'x64', platform: 'linux'},
  {abi: 108, arch: 'x64', platform: 'darwin'},
  {abi: 108, arch: 'x64', platform: 'linux'}
]

const options = {
  localUrl: new URL('https://localhost:8443'),
  manifest: `${import.meta.dirname}/manifests/package-lock.json`,
  registryUrl: 'https://registry.npmjs.org',
  registryToken: '',
  rootFolder,
  prebuiltBinaryProperties,
  enforceTarballsOverHttps: true,
  includeDevDependencies: false,
  dryRun: false
}

describe('synchronize', () => {
  it('Should download a bunch of packages', async () => {
    const downloaded = await synchronize(options)
    expect(downloaded).to.have.lengthOf(13)
  })

  it('Should already have all of the packages', async () => {
    const downloaded = await synchronize(options)
    expect(downloaded).to.have.lengthOf(0)
  })

  it('Should detect a change to pre-built binary properties and re-trigger download', async () => {
    const downloaded = await synchronize({
      ...options,
      prebuiltBinaryProperties: prebuiltBinaryProperties.concat({abi: 111, arch: 'x64', platform: 'darwin'})
    })
    expect(downloaded).to.have.lengthOf(13)
  })

  after(() => fs.promises.rm(rootFolder, {recursive: true}))
})
