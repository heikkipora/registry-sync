import {expect} from 'chai'
import Promise from 'bluebird'
import rimraf from 'rimraf'
import {synchronize} from '../src/sync'

const rimrafAsync = Promise.promisify(rimraf)
const rootFolder = `${__dirname}/.download`

const options = {
  localUrl: 'https://localhost:8443',
  manifest: `${__dirname}/package-lock.json`,
  registryUrl: 'https://registry.npmjs.org',
  rootFolder
}

describe.only('synchronize', () => {
  before(async () => {
    await rimrafAsync(rootFolder)
  })

  it('Should download a bunch of packages', async () => {
    const downloaded = await synchronize(options)
    expect(downloaded).to.have.lengthOf(141)
  })

  it('Should already have all of the packages', async () => {
    const downloaded = await synchronize(options)
    expect(downloaded).to.have.lengthOf(0)
  })

})

/*
    const prebuiltBinaryProperties = [
      {abi: 46, arch: 'x64', platform: 'darwin'},
      {abi: 46, arch: 'x64', platform: 'linux'},
      {abi: 47, arch: 'x64', platform: 'darwin'},
      {abi: 47, arch: 'x64', platform: 'linux'},
      {abi: 48, arch: 'x64', platform: 'darwin'},
      {abi: 48, arch: 'x64', platform: 'linux'}
    ]
*/