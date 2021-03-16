import * as fs from 'fs'
import {expect} from 'chai'
import {synchronize} from '../src/sync'
import {URL} from 'url'

const rootFolder = `${__dirname}/.download`

const prebuiltBinaryProperties = [
  {abi: 57, arch: 'x64', platform: 'darwin'},
  {abi: 57, arch: 'x64', platform: 'linux'},
  {abi: 64, arch: 'x64', platform: 'darwin'},
  {abi: 64, arch: 'x64', platform: 'linux'}
]

const options = {
  localUrl: new URL('https://localhost:8443'),
  manifest: `${__dirname}/manifests/package-lock.json`,
  registryUrl: 'https://registry.npmjs.org',
  registryToken: null,
  rootFolder,
  prebuiltBinaryProperties,
  enforceTarballsOverHttps: true,
  includeDevDependencies: false,
  dryRun: false
}

describe('synchronize', () => {
  it('Should download a bunch of packages', async () => {
    const downloaded = await synchronize(options)
    expect(downloaded).to.have.lengthOf(79)
  })

  it('Should already have all of the packages', async () => {
    const downloaded = await synchronize(options)
    expect(downloaded).to.have.lengthOf(0)
  })

  it('Should detect a change to pre-built binary properties and re-trigger download', async () => {
    const downloaded = await synchronize({
      ...options,
      prebuiltBinaryProperties: prebuiltBinaryProperties.concat({abi: 72, arch: 'x64', platform: 'darwin'})
    })
    expect(downloaded).to.have.lengthOf(79)
  })

  after(() => fs.promises.rmdir(rootFolder, {recursive: true}))
})
