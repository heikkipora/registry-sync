These files are for HTTPS testing only (node-pre-gyp requires a HTTPS host)

    bin/serve --root /tmp/mirror --sslCert test/ssl/localhost.crt --sslKey test/ssl/localhost.key

Point ```cafile```configuration property in ```~/.npmrc```to our test localhost CA

    npm config set cafile=<path to test/ssl/localhost-ca.pem>

Disable TLS certificate verification

    export NODE_TLS_REJECT_UNAUTHORIZED=0
