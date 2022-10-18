These files are for HTTPS testing only (node-pre-gyp requires a HTTPS host)

    bin/serve --root /tmp/mirror --sslCert test/ssl/localhost.crt --sslKey test/ssl/localhost.key

Point `cafile`configuration property in `~/.npmrc`to our test localhost CA

    npm config set cafile=<path to localhost-ca.pem>

Let node-pre-gyp (fetching native binaries) also know about the localhost CA

    export NODE_EXTRA_CA_CERTS=<absolute path to localhost-ca.pem>

## Generating the ssl certificate (already in this folder)

```
openssl genpkey \
  -algorithm RSA \
  -out localhost-ca.key

openssl req \
  -x509 \
  -new \
  -nodes \
  -key localhost-ca.key \
  -days 1000 \
  -out localhost-ca.pem \
  -subj "/C=FI" \
  -sha512

openssl genpkey \
  -algorithm RSA \
  -out localhost.key

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
  -days 1000 \
  -sha512

rm localhost-ca.key localhost-ca.srl localhost.csr
```
