import { downloadAll } from "../src/download"
import { expect } from "chai"
import { extractTgz } from "../src/metadata"
import mkdirp from "mkdirp"
import path from "path"
import Promise from "bluebird"
import rimraf from "rimraf"

const fs = Promise.promisifyAll(require('fs'))
const rimrafAsync = Promise.promisify(rimraf)

const rootFolder = `${__dirname}/.download`
const tmpFolder = path.join(__dirname, ".tmp")
const options = {
  registryUrl: "https://registry.npmjs.org",
  localUrl: new URL("https://localhost:8443"),
  rootFolder
}

const prebuiltBinaryProperties = [
  {abi: 57, arch: 'x64', platform: 'darwin'},
  {abi: 57, arch: 'x64', platform: 'linux'},
  {abi: 64, arch: 'x64', platform: 'darwin'},
  {abi: 64, arch: 'x64', platform: 'linux'}
]

describe("download", () => {
  it("Should download all packages and create metadata files", async () => {
    const packages = [
      { id: "abbrev@1.1.0", name: "abbrev", version: "1.1.0" },
      { id: "abbrev@1.1.1", name: "abbrev", version: "1.1.1" },
      { id: "aproba@1.2.0", name: "aproba", version: "1.2.0" }
    ]
    await downloadAll(packages, options)
  })

  it("Should download a package with correct metadata", async () => {
    const packages = [{ id: "aproba@1.2.0", name: "aproba", version: "1.2.0" }]
    await downloadAll(packages, options)
    const aprobaMetadata = await readMetadataFile("aproba")
    expect(aprobaMetadata.versions["1.2.0"].dist.tarball).equal(
      "https://localhost:8443/aproba/aproba-1.2.0.tgz"
    )
  })

  it("Should download a package with correct metadata when localUrl contains a path", async () => {
    const packages = [{ id: "aproba@1.2.0", name: "aproba", version: "1.2.0" }]
    await downloadAll(packages, {
      ...options,
      localUrl: new URL("https://localhost:8443/registry")
    })
    const aprobaMetadata = await readMetadataFile("aproba")
    expect(aprobaMetadata.versions["1.2.0"].dist.tarball).equal(
      "https://localhost:8443/registry/aproba/aproba-1.2.0.tgz"
    )
  })

  it("Should download a package with correct metadata when localUrl contains a path with ending slash", async () => {
    const packages = [{ id: "aproba@1.2.0", name: "aproba", version: "1.2.0" }]
    await downloadAll(packages, {
      ...options,
      localUrl: new URL("https://localhost:8443/registry/")
    })
    const aprobaMetadata = await readMetadataFile("aproba")
    expect(aprobaMetadata.versions["1.2.0"].dist.tarball).equal(
      "https://localhost:8443/registry/aproba/aproba-1.2.0.tgz"
    )
  })

  it("Should download a node-pre-gyp package and correctly rewrite metadata", async () => {
    const packages = [{ id: "node-gtk@0.4.0", name: "node-gtk", version: "0.4.0" }]
    await downloadAll(packages, { ...options, prebuiltBinaryProperties })
    await mkdirp(tmpFolder)
    const data = await readTarball("node-gtk", "0.4.0")
    await extractTgz(data, tmpFolder)
    const fileStr = await fs.readFileAsync(path.join(tmpFolder, "package", "package.json"))
    const fileContents = JSON.parse(fileStr)
    expect(fileContents.binary.host).equal("https://localhost:8443")
    expect(fileContents.binary.remote_path).equal("/node-gtk/0.4.0/")
  })

  it("Should download a node-pre-gyp package and correctly rewrite metadata when localUrl contains a path", async () => {
    const packages = [{ id: "node-gtk@0.4.0", name: "node-gtk", version: "0.4.0" }]
    await downloadAll(packages, { ...options, prebuiltBinaryProperties, localUrl: new URL("https://localhost:8443/registry") })
    await mkdirp(tmpFolder)
    const data = await readTarball("node-gtk", "0.4.0")
    await extractTgz(data, tmpFolder)
    const fileStr = await fs.readFileAsync(path.join(tmpFolder, "package", "package.json"))
    const fileContents = JSON.parse(fileStr)
    expect(fileContents.binary.host).equal("https://localhost:8443")
    expect(fileContents.binary.remote_path).equal("/registry/node-gtk/0.4.0/")
  })

  it("Should download a node-pre-gyp package and correctly rewrite metadata when localUrl contains a path with ending slash", async () => {
    const packages = [{ id: "node-gtk@0.4.0", name: "node-gtk", version: "0.4.0" }]
    await downloadAll(packages, { ...options, prebuiltBinaryProperties, localUrl: new URL("https://localhost:8443/registry/") })
    await mkdirp(tmpFolder)
    const data = await readTarball("node-gtk", "0.4.0")
    await extractTgz(data, tmpFolder)
    const fileStr = await fs.readFileAsync(path.join(tmpFolder, "package", "package.json"))
    const fileContents = JSON.parse(fileStr)
    expect(fileContents.binary.host).equal("https://localhost:8443")
    expect(fileContents.binary.remote_path).equal("/registry/node-gtk/0.4.0/")
  })

  after(async () => {
    await rimrafAsync(rootFolder)
    await rimrafAsync(tmpFolder)
  })
})

function readTarball(name, version) {
  return fs.readFileAsync(path.join(rootFolder, name, `${name}-${version}.tgz`))
}

async function readMetadataFile(moduleName) {
  const f = await fs.readFileAsync(
    path.join(rootFolder, moduleName, "index.json"), { encoding: "utf-8" }
  )

  return JSON.parse(f)
}
