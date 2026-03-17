#!/bin/sh
# Generiert die Tailscale Serve-Konfiguration und startet containerboot.
# Tailscale Serve terminiert TLS und setzt automatisch Identity-Header.

HOSTNAME="${TS_HOSTNAME:-vcg-remote}"
DOMAIN="${TS_CERT_DOMAIN:-tailnet.ts.net}"

cat > /tmp/serve.json <<EOF
{
  "TCP": {
    "443": {
      "HTTPS": true
    }
  },
  "Web": {
    "${HOSTNAME}.${DOMAIN}:443": {
      "Handlers": {
        "/": {
          "Proxy": "http://127.0.0.1:3000"
        }
      }
    }
  }
}
EOF

echo "Tailscale Serve-Config generiert fuer ${HOSTNAME}.${DOMAIN}"
export TS_SERVE_CONFIG=/tmp/serve.json
exec /usr/local/bin/containerboot
