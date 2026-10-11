#!/usr/bin/env bash
# Builds dist/kink-jars-<version>.zip: the plugin folder plus a copy of the app.
# The app isn't duplicated in git; it's copied in here so the two can't drift apart.
set -euo pipefail
cd "$(dirname "$0")/.."

version=$(grep -oE 'const VERSION = "[0-9]+\.[0-9]+\.[0-9]+"' index.html | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')
[ -n "$version" ] || { echo "Couldn't read VERSION from index.html" >&2; exit 1; }

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
dest="$work/kink-jars"
mkdir -p "$dest/app"
cp wordpress/kink-jars/README.md wordpress/kink-jars/description.md "$dest/"
sed "s/__KINK_JARS_VERSION__/$version/g" wordpress/kink-jars/kink-jars.php > "$dest/kink-jars.php"
cp index.html "$dest/app/"
cp -R fonts "$dest/app/fonts"

mkdir -p dist
rm -f "dist/kink-jars-$version.zip"
(cd "$work" && zip -qr - kink-jars) > "dist/kink-jars-$version.zip"
echo "dist/kink-jars-$version.zip"
