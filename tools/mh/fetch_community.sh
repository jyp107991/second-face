#!/usr/bin/env bash
# Fetch MakeHuman community asset packs used by the game (CC0 and CC-BY; CC-BY authors are credited in docs/CREDITS.md)
# and extract each into <dir>/<pack>_<licence>/. Usage: tools/mh/fetch_community.sh <dir>
set -euo pipefail
OUT="${1:-.mh_community}"
mkdir -p "$OUT"
for spec in bodyparts05:cc0 bodyparts06:cc-by skins02:cc0 hair01:cc0 eyebrows01:cc0 eyelashes01:cc0 \
    shirts01:cc0 shirts02:ccby shirts03:ccby pants01:cc0 pants02:ccby skirts01:cc0 dress01:cc0 shoes01:cc0 shoes02:ccby shoes03:ccby \
    hats01:cc0 hats02:cc0 hats03:cc-by gloves01:cc0 glasses01:cc0 glasses02:ccby masks01:cc0 masks02:ccby suits02:cc0 suits03:cc-by \
    equipment03:cc-by; do
  p="${spec%%:*}"; lic="${spec##*:}"
  z="$OUT/${p}_${lic}.zip"
  [ -f "$z" ] || curl -sSL -o "$z" "https://files.makehumancommunity.org/asset_packs/$p/${p}_${lic}.zip"
  # Some CC-BY packs are published as *_ccby.zip; they are extracted to *_cc-by/ either way.
  python3 -I -c "import zipfile,sys; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])" "$z" "$OUT/${p}_${lic/ccby/cc-by}"
done
echo "extracted to $OUT"
