#!/bin/sh
# Generiert die Tailscale Serve-Konfiguration dynamisch mit dem richtigen Hostnamen.
# TS_CERT_DOMAIN wird in .env gesetzt (z.B. "mein-tailnet.ts.net")

HOSTNAME="remote-team"
DOMAIN="${TS_CERT_DOMAIN:-tailnet.ts.net}"

cat > /config/serve.json <<EOF
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

echo "Tailscale Serve-Config generiert für ${HOSTNAME}.${DOMAIN}"

# Tailscale starten
exec /usr/local/bin/containerboot
