import {downloadAll} from '../src/download'
import rimraf from 'rimraf'

const rootFolder = `${__dirname}/.download`
const options = {
  registryUrl: 'https://registry.npmjs.org',
  localUrl: 'https://localhost:8443',
  rootFolder
}

describe('download', () => {
  it('Should download all packages and create metadata files', async () => {
      const packages = [
        {id: "abbrev@1.1.0", name: "abbrev", version: "1.1.0"},
        {id: "abbrev@1.1.1", name: "abbrev", version: "1.1.1"},
        {id: "aproba@1.2.0",name: "aproba", version: "1.2.0"},
        {id: "@csstools/normalize.css@9.0.1", name: "@csstools/normalize.css", version: "9.0.1"}
      ]
      await downloadAll(packages, options)
  })

  after(done => rimraf(rootFolder, done))
})