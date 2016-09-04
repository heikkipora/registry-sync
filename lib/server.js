const express = require('express')
const fs = require('fs')
const http = require('http')
const https = require('https')
const path = require('path')

function startHttpServer(app, port) {
  const httpServer = http.Server(app)
  httpServer.listen(port, () => console.log(`Listening on HTTP port *:${port}`))
}

function startHttpsServer(app, port, sslKey, sslCert) {
  const privateKey = fs.readFileSync(sslKey, 'utf8')
  const certificate = fs.readFileSync(sslCert, 'utf8')
  const httpsServer = https.Server({key: privateKey, cert: certificate}, app)
  httpsServer.listen(port, () => console.log(`Listening on HTTPS port *:${port}`))
}

function bindRoutes(app, rootFolder) {
  const sendFileOptions = {root: path.resolve(rootFolder)}
  app.get('/:name/', (req, res) => res.sendFile(`${req.params.name}/index.json`, sendFileOptions))
  app.get('/:name/:file', (req, res) => res.sendFile(`${req.params.name}/${req.params.file}`, sendFileOptions))
}

function init(options) {
  const app = express()
  bindRoutes(app, options.root)
  startHttpServer(app, options.port)
  if (options.https) {
    startHttpsServer(app, options.https.port, options.https.sslKey, options.https.sslCert)
  }
}

module.exports = init