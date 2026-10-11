#!/usr/bin/env bash
# Builds the plugin zip and checks what's inside it. Usage: bash tests/build-test.sh
set -euo pipefail
cd "$(dirname "$0")/.."
zipfile=$(bash scripts/build-plugin.sh)
version=$(grep -oE 'const VERSION = "[0-9.]+"' index.html | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')
[ "$zipfile" = "dist/kink-jars-$version.zip" ] || { echo "FAIL zip name $zipfile"; exit 1; }

list=$(unzip -Z1 "$zipfile")
for f in kink-jars/kink-jars.php kink-jars/README.md kink-jars/description.md kink-jars/app/index.html \
         kink-jars/app/fonts/oswald.woff2 kink-jars/app/fonts/nunito.woff2 kink-jars/app/fonts/permanent-marker.woff2 \
         kink-jars/app/fonts/atkinson-hyperlegible-400.woff2 kink-jars/app/fonts/atkinson-hyperlegible-700.woff2 \
         kink-jars/app/fonts/LICENCES.md kink-jars/app/fonts/licences/permanent-marker-Apache-2.0.txt; do
  grep -qx "$f" <<<"$list" || { echo "FAIL missing $f"; exit 1; }
done
echo "ok   zip has the plugin, app, fonts and licences"

out=$(mktemp -d); trap 'rm -rf "$out"' EXIT
unzip -q "$zipfile" -d "$out"
grep -q "Version:           $version" "$out/kink-jars/kink-jars.php" || { echo "FAIL header version"; exit 1; }
if grep -q "__KINK_JARS_VERSION__" "$out/kink-jars/kink-jars.php"; then echo "FAIL placeholder left in"; exit 1; fi
echo "ok   plugin version is $version"
cmp -s index.html "$out/kink-jars/app/index.html" || { echo "FAIL app copy differs"; exit 1; }
echo "ok   bundled app matches index.html"
php -l "$out/kink-jars/kink-jars.php" >/dev/null && echo "ok   built PHP parses"
php tests/plugin-test.php "$out/kink-jars/kink-jars.php" >/dev/null && echo "ok   shortcode tests pass on the built file"
