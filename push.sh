#!/bin/zsh
# Выкладка сайта: поднимает номер версии, чтобы у всех обновился кэш, и пушит.
set -e
cd "$(dirname "$0")"
V=$(( $(cat version.txt) + 1 ))
echo $V > version.txt
sed -i '' -E "s/\?v=[0-9]+/?v=$V/g" *.html
git add -A
git commit -qm "${1:-Обновление сайта}

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push -q
echo "выложена версия $V"
