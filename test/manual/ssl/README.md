These files are for HTTPS testing only (node-pre-gyp requires a HTTPS host)

    bin/serve --root /tmp/mirror --sslCert test/ssl/localhost.crt --sslKey test/ssl/localhost.key

Point ```cafile```configuration property in ```~/.npmrc```to our test localhost CA

    npm config set cafile=<path to test/ssl/localhost-ca.pem>

Disable TLS certificate verification

    export NODE_TLS_REJECT_UNAUTHORIZED=0

## Generating the ssl certificate (already in this folder)

```
openssl genrsa \
  -out localhost-ca.key \
  2048

openssl req \
  -x509 \
  -new \
  -nodes \
  -key localhost-ca.key \
  -days 1024 \
  -out localhost-ca.pem \
  -subj "/C=FI"

openssl genrsa \
  -out localhost.key \
  2048

openssl req -new \
  -key localhost.key \
  -out localhost.csr \
  -subj "/C=FI/CN=localhost"

openssl x509 \
  -req -in localhost.csr \
  -CA localhost-ca.pem \
  -CAkey localhost-ca.key \
  -CAcreateserial \
  -out localhost.crt \
  -days 1000

rm localhost-ca.key localhost-ca.srl localhost.csr
```
