import {expect} from 'chai'
import Promise from 'bluebird'
import rimraf from 'rimraf'
import {synchronize} from '../src/sync'

const rimrafAsync = Promise.promisify(rimraf)
const rootFolder = `${__dirname}/download`

describe('registry-sync', () => {
  beforeEach(async () => {
    await rimrafAsync(rootFolder)
  })

  it('Should download a single package', async () => {
    const manifest = {
      dependencies: {
        bluebird: '3.4.0'
      }
    }

    const options = {
      localUrl: 'https://localhost:8443',
      registryUrl: 'https://registry.npmjs.org',
      rootFolder
    }

    const {downloaded, skipped} = await synchronize(manifest, options)
    expect(downloaded).to.deep.equal(['bluebird@3.4.0'])
    expect(skipped).to.deep.equal()
  })

  it.skip('Should download the dependency tree of given packages', async () => {
    const manifest = {
      dependencies: {
        bluebird: [
          '3.4.0',
          '3.3.4',
          '2.9.26'
        ],
        fsevents: '1.0.14',
        sqlite3: '3.1.5',
        '@marsaud/smb2': '0.7.2'
      }
    }
    
    const prebuiltBinaryProperties = [
      {abi: 46, arch: 'x64', platform: 'darwin'},
      {abi: 46, arch: 'x64', platform: 'linux'},
      {abi: 47, arch: 'x64', platform: 'darwin'},
      {abi: 47, arch: 'x64', platform: 'linux'},
      {abi: 48, arch: 'x64', platform: 'darwin'},
      {abi: 48, arch: 'x64', platform: 'linux'}
    ]
    
    const options = {
      localUrl: 'https://localhost:8443',
      prebuiltBinaryProperties,
      pretty: true,
      registryUrl: 'https://registry.npmjs.org',
      rootFolder: `${__dirname}/download`
    }

    await synchronize(manifest, options)
  })
})