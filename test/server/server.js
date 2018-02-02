const express = require('express');
const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');

function startHttpServer(app, port) {
  const httpServer = http.Server(app);
  httpServer.listen(port, () => console.log(`Listening on HTTP port *:${port}`));
}

function startHttpsServer(app, port, sslKey, sslCert) {
  const privateKey = fs.readFileSync(sslKey, 'utf8');
  const certificate = fs.readFileSync(sslCert, 'utf8');
  const httpsServer = https.Server({key: privateKey, cert: certificate}, app);
  httpsServer.listen(port, () => console.log(`Listening on HTTPS port *:${port}`));
}

function jsonError(res) {
  return err => {
    if (err) {
      res.status(err.status).json({});
    }
  };
}

function bindRoutes(app, rootFolder) {
  const sendFileOptions = {root: path.resolve(rootFolder)};
  app.use((req, res) => {
    const filePath = req.url.split('%2f').join('/')
    if (filePath.endsWith('gz')) {
      res.sendFile(filePath, sendFileOptions, jsonError(res));
    } else {
      res.sendFile(`${filePath}/index.json`, sendFileOptions, jsonError(res));
    }
  });
}

function init(options) {
  const app = express();
  bindRoutes(app, options.root);
  startHttpServer(app, options.port);
  if (options.https) {
    startHttpsServer(app, options.https.port, options.https.sslKey, options.https.sslCert);
  }
}

module.exports = init;
