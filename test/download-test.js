import {expect} from 'chai'
import fs from 'fs'
import {downloadAll} from '../src/download'
import rimraf from 'rimraf'

const options = {
  registryUrl: 'https://registry.npmjs.org',
  localUrl: 'https://localhost:8443',
  rootFolder: `${__dirname}/.download`
}

describe('download', () => {
  before(done => rimraf(options.rootFolder, done))

  it('Should download all packages and create metadata files', async () => {
      const packages = [
        {id: "abbrev@1.1.0", name: "abbrev", version: "1.1.0"},
        {id: "abbrev@1.1.1", name: "abbrev", version: "1.1.1"},
        {id: "aproba@1.2.0",name: "aproba", version: "1.2.0"}
      ]
      await downloadAll(packages, options)
  })
})