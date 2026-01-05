import * as fs from 'fs'
import {Command} from 'commander'
import {startServer} from './server.ts'

const packageJson = JSON.parse(fs.readFileSync(`${import.meta.dirname}/../../../package.json`, 'utf-8'))

const program = new Command()
program
  .version(packageJson.version)
  .requiredOption('--root <path>', 'Path to serve NPM packages from')
  .option('--httpPort [number]', 'Local HTTP port to bind the server to (defaults to 8000)', '8000')
  .option('--httpsPort [number]', 'Local HTTPS port to bind the server to (defaults to 8443)', '8443')
  .option('--sslCert [path]', 'Optional path to SSL certificate file (defaults to listening only to HTTP)')
  .option('--sslKey [path]', 'Optional path to SSL private key file (defaults to listening only to HTTP)')
  .parse(process.argv)

const opts = program.opts()

const sslEnabled = opts.sslCert && opts.sslKey
const httpsOptions = sslEnabled
  ? {
      port: Number(opts.httpsPort),
      sslCert: opts.sslCert,
      sslKey: opts.sslKey
    }
  : undefined

const options = {
  port: Number(opts.httpPort),
  root: opts.root,
  https: httpsOptions
}

startServer(options)
