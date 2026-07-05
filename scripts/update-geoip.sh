#!/usr/bin/env bash
# Refresh the bundled DB-IP Lite country database (CC BY 4.0).
# Run periodically to keep peer-flag geolocation current, then commit the .mmdb.
set -euo pipefail
cd "$(dirname "$0")/.."
M=$(date +%Y-%m)
url="https://download.db-ip.com/free/dbip-country-lite-$M.mmdb.gz"
echo "▸ fetching $url"
mkdir -p build/geoip
curl -fsSL "$url" -o build/geoip/dbip.mmdb.gz
gunzip -f build/geoip/dbip.mmdb.gz
mv build/geoip/dbip.mmdb build/geoip/dbip-country-lite.mmdb
echo "✓ build/geoip/dbip-country-lite.mmdb updated ($(du -h build/geoip/dbip-country-lite.mmdb | cut -f1))"
