import express from 'express'
import fs from 'fs'
import http from 'http'
import https from 'https'
import path from 'path'
import type {Express, Response} from 'express'

function startHttpServer(app: Express, port: number): void {
  const httpServer = new http.Server(app)
  httpServer.listen(port, () => console.log(`Listening on HTTP port *:${port}`))
}

function startHttpsServer(app: Express, port: number, sslKey: string, sslCert: string): void {
  const privateKey = fs.readFileSync(sslKey, 'utf8')
  const certificate = fs.readFileSync(sslCert, 'utf8')
  const httpsServer = new https.Server({key: privateKey, cert: certificate}, app)
  httpsServer.listen(port, () => console.log(`Listening on HTTPS port *:${port}`))
}

function jsonError(res: Response) {
  return (err: Error | undefined) => {
    if (err && 'status' in err && err.status && typeof err.status === 'number') {
      res.status(err.status).json({})
    }
  }
}

function bindRoutes(app: Express, rootFolder: string): void {
  const sendFileOptions = {root: path.resolve(rootFolder)}
  app.use((req, res) => {
    const filePath = req.url.split('%2f').join('/')
    if (filePath.endsWith('gz')) {
      res.sendFile(filePath, sendFileOptions, jsonError(res))
    } else {
      res.sendFile(`${filePath}/index.json`, sendFileOptions, jsonError(res))
    }
  })
}

interface ServerOptions {
  port: number
  root: string
  https?: {
    port: number
    sslKey: string
    sslCert: string
  }
}

export function startServer(options: ServerOptions): void {
  const app = express()
  bindRoutes(app, options.root)
  startHttpServer(app, options.port)
  if (options.https) {
    startHttpsServer(app, options.https.port, options.https.sslKey, options.https.sslCert)
  }
}
