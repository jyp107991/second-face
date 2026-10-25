#!/usr/bin/env bash
# Fetch MakeHuman community asset packs used by the game (CC0, plus one CC-BY pack credited in docs/CREDITS.md)
# and extract each into <dir>/<pack>_<licence>/. Usage: tools/mh/fetch_community.sh <dir>
set -euo pipefail
OUT="${1:-.mh_community}"
mkdir -p "$OUT"
for spec in bodyparts05:cc0 bodyparts06:cc-by skins02:cc0 hair01:cc0 eyebrows01:cc0 eyelashes01:cc0; do
  p="${spec%%:*}"; lic="${spec##*:}"
  z="$OUT/${p}_${lic}.zip"
  [ -f "$z" ] || curl -sSL -o "$z" "https://files.makehumancommunity.org/asset_packs/$p/${p}_${lic}.zip"
  python3 -I -c "import zipfile,sys; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])" "$z" "$OUT/${p}_${lic}"
done
echo "extracted to $OUT"
