#!/usr/bin/env bash
# The real Unity editor in a Claude Code cloud session (or any Linux machine): install, licence, tests, captures.
# Replaces the CI round trip for everything except the APK. Needs the owner's Unity account in the cloud environment's
# variables: UNITY_EMAIL and UNITY_PASSWORD. A Personal licence file (Unity_lic.ulf) is bound to the machine that made
# it and is refused anywhere else ("Machine bindings don't match", verified here and in CI on 2026-10-28); CI falls
# back to the account, and so does this script, through Unity's Licensing Client (--activate-all --include-personal).
# A session reads new variable values when its VM next restores after idling, or at once in a new session.
# Start `install` in the background at the beginning of a session that will need the editor (about 10 minutes).
#
#   tools/unity/editor.sh install                 editor 6000.3.27f1 into $UNITY_HOME (about 10 min, 8.4 GB)
#   tools/unity/editor.sh licence                 activate from $UNITY_LICENSE
#   tools/unity/editor.sh test [editmode|playmode|all]   results + logs in unity/test-results, captures in unity/Screenshots
#   tools/unity/editor.sh run <Namespace.Class.Method>   -executeMethod, then quit (log in unity/test-results/run.log)
set -euo pipefail
VERSION=6000.3.27f1
CHANGESET=672d562a42a7
UNITY_HOME=${UNITY_HOME:-/opt/unity/$VERSION}
UNITY="$UNITY_HOME/Editor/Unity"
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
OUT="$ROOT/unity/test-results"
ULF_DIR="$HOME/.local/share/unity3d/Unity"

install() {
  # One installer at a time; unpack beside the target and move it into place at the end, so a half-unpacked editor
  # is never mistaken for an installed one.
  exec 9>/tmp/second-face-unity-install.lock
  flock 9
  if [ -x "$UNITY" ]; then echo "editor present: $UNITY"; return; fi
  local part="$UNITY_HOME.partial"
  rm -rf -- "$part"; mkdir -p "$part"
  echo "downloading and unpacking Unity $VERSION (about 10 min) ..."
  if [ -n "${UNITY_ARCHIVE:-}" ] && [ -f "$UNITY_ARCHIVE" ]; then tar -xJf "$UNITY_ARCHIVE" -C "$part"   # an archive already on disk
  else curl -fsSL "https://download.unity3d.com/download_unity/$CHANGESET/LinuxEditorInstaller/Unity-$VERSION.tar.xz" | tar -xJ -C "$part"; fi
  [ -x "$part/Editor/Unity" ] || { echo "install failed: Editor/Unity missing after unpacking"; exit 1; }
  mkdir -p "$(dirname "$UNITY_HOME")"; mv -- "$part" "$UNITY_HOME"
  echo "editor installed: $UNITY"
}

licence_text() {   # the .ulf contents from either variable; never echoed to the terminal
  if [ -n "${UNITY_LICENSE_B64:-}" ]; then printf '%s' "$UNITY_LICENSE_B64" | tr -d ' \r\n' | base64 -d
  else printf '%s' "${UNITY_LICENSE:-}"; fi
}

have_account() { [ -n "${UNITY_EMAIL:-}" ] && [ -n "${UNITY_PASSWORD:-}" ]; }

need_licence() {   # checked before any download: no point fetching 4.6 GB without a licence to run it
  [ -f "$OUT/.licensed" ] && return
  if ! have_account && [ -z "${UNITY_LICENSE_B64:-}${UNITY_LICENSE:-}" ]; then
    echo "No Unity licence: set UNITY_EMAIL and UNITY_PASSWORD in the cloud environment's variables; a session reads"
    echo "them when its VM next restores after idling, or start a new session."; exit 2
  fi
}

editor_licensed() {   # a short editor start: does it find a licence?
  "$UNITY" -batchmode -nographics -quit -logFile "$OUT/licence.log" || true
  grep -q -i "Successfully resolved entitlement\|License activation succeeded\|Successfully updated license" "$OUT/licence.log" \
    && ! grep -q -i "No valid Unity Editor license\|Machine bindings don't match" "$OUT/licence.log"
}

licence() {
  need_licence
  mkdir -p "$OUT"
  local client="$UNITY_HOME/Editor/Data/Resources/Licensing/Client/Unity.Licensing.Client"
  if have_account; then
    # The account path, as CI's fallback does it. Output goes to a file and is checked, never shown (it names the account).
    "$client" --activate-all --include-personal --username "$UNITY_EMAIL" --password "$UNITY_PASSWORD" > "$OUT/licence-client.log" 2>&1 || true
    if grep -q -i "Activation processed successfully\|Successfully updated" "$OUT/licence-client.log" && editor_licensed; then
      touch "$OUT/.licensed"; echo "licence active (Unity account)"; return
    fi
    echo "account activation not confirmed:"
    grep -i "error\|fail\|invalid\|denied\|two-factor\|2fa\|activat" "$OUT/licence-client.log" | grep -v -i "password" | head -5
  fi
  if [ -n "${UNITY_LICENSE_B64:-}${UNITY_LICENSE:-}" ]; then
    # Only works on the machine the file was made on; kept for running the script on the owner's own computer.
    mkdir -p "$ULF_DIR"
    ( umask 077; licence_text > "$ULF_DIR/Unity_lic.ulf" )
    "$UNITY" -batchmode -nographics -quit -manualLicenseFile "$ULF_DIR/Unity_lic.ulf" -logFile "$OUT/licence.log" || true
    if editor_licensed; then touch "$OUT/.licensed"; echo "licence active (licence file)"; return; fi
    rm -f "$ULF_DIR/Unity_lic.ulf"
    grep -q "Machine bindings don't match" "$OUT/licence.log" && echo "the licence file is bound to another machine (expected outside the owner's computer)"
  fi
  echo "no working licence; see unity/test-results/licence*.log"; exit 3
}

editor() {   # software OpenGL under a virtual display, as in CI
  xvfb-run -a -s "-screen 0 1920x1080x24" "$UNITY" -batchmode -projectPath "$ROOT/unity" "$@"
}

summary() {
  python3 - "$1" <<'PY'
import sys, xml.etree.ElementTree as ET
t = ET.parse(sys.argv[1]).getroot()
print({k: t.get(k) for k in ('total', 'passed', 'failed', 'skipped', 'result')})
for tc in t.iter('test-case'):
    if tc.get('result') != 'Passed':
        m = tc.find('.//message')
        print(' ', tc.get('result'), tc.get('name'), '::', ((m.text or '') if m is not None else '')[:300].replace('\n', ' | '))
PY
}

test_mode() {
  local mode=$1; mkdir -p "$OUT"
  editor -runTests -testPlatform "$mode" -testResults "$OUT/$mode-results.xml" -logFile "$OUT/$mode.log" || true
  if [ -f "$OUT/$mode-results.xml" ]; then echo "== $mode"; summary "$OUT/$mode-results.xml"
  else echo "== $mode: no results; last lines of $OUT/$mode.log:"; tail -30 "$OUT/$mode.log"; fi
}

case "${1:-}" in
  install) install ;;
  licence) need_licence; install; licence ;;
  test)
    need_licence; install; [ -f "$OUT/.licensed" ] || licence
    case "${2:-all}" in
      editmode|playmode) test_mode "$2" ;;
      all) test_mode editmode; test_mode playmode ;;
      *) echo "test mode: editmode | playmode | all"; exit 1 ;;
    esac
    ls "$ROOT/unity/Screenshots" 2>/dev/null | sed 's/^/capture: /' || true ;;
  run)
    need_licence; install; [ -f "$OUT/.licensed" ] || licence
    mkdir -p "$OUT"; editor -executeMethod "${2:?method}" -quit -logFile "$OUT/run.log" || true
    grep -n -i "error\|exception" "$OUT/run.log" | grep -v -i "licensing" | head -20 || true ;;
  *) sed -n '2,10p' "$0"; exit 1 ;;
esac
