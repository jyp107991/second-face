#!/usr/bin/env bash
# End-to-end Act 1: every story smoke in order against one server (the dev server, or a frozen build via SF_URL).
#   npm run build && npx vite preview --port 4173 --host 127.0.0.1 &   (optional: a frozen build)
#   SF_URL=http://127.0.0.1:4173 tools/qa/act1.sh docs/evidence/act1
set -u
OUT="${1:-docs/evidence/act1}"
mkdir -p "$OUT"
SMOKES="ch1 tollhouse signalhill month drywells wilds wheel surgery act1_sides"
pass=0; fail=0; failed=""
for s in $SMOKES; do
  echo "=== $s"
  if node "tools/qa/$s.cjs" "$OUT" > "$OUT/$s.log" 2>&1 && grep -q "ALL PASS" "$OUT/$s.log"; then
    echo "    ALL PASS ($(grep -c '^PASS' "$OUT/$s.log") checks)"; pass=$((pass+1))
  else
    echo "    FAILED — see $OUT/$s.log"; grep -E "^FAIL|PAGEERROR|Error" "$OUT/$s.log" | head -5; fail=$((fail+1)); failed="$failed $s"
  fi
done
rm -f [0-9][0-9]_*.png
echo "=== Act 1: $pass passed, $fail failed${failed:+ ($failed )}"
[ "$fail" -eq 0 ]
