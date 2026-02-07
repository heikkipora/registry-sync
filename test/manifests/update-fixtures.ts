import fs from 'fs'
import {dependenciesFromPackageLock} from '../../src/resolve.ts'

const packages = await dependenciesFromPackageLock('./package-lock.json', false)
await fs.promises.writeFile('../resolve-test.json', JSON.stringify(packages, null, 2))

const packagesWithDev = await dependenciesFromPackageLock('./package-lock.json', true)
await fs.promises.writeFile('../resolve-test-with-dev.json', JSON.stringify(packagesWithDev, null, 2))

const yarnPackages = await dependenciesFromPackageLock('./yarn.lock', false)
await fs.promises.writeFile('../resolve-yarn-test.json', JSON.stringify(yarnPackages, null, 2))
