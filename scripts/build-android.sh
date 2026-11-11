#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -s "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]; then
  source "${NVM_DIR:-$HOME/.nvm}/nvm.sh"
  nvm use >/dev/null
fi
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
if [ -z "${JAVA_HOME:-}" ] && [ -d '/Applications/Android Studio.app/Contents/jbr/Contents/Home' ]; then
  export JAVA_HOME='/Applications/Android Studio.app/Contents/jbr/Contents/Home'
fi
export PATH="$ANDROID_HOME/platform-tools:${JAVA_HOME:+$JAVA_HOME/bin:}$PATH"
# ExFAT creates AppleDouble ._*.class files that Gradle's ASM scanner reads as
# bytecode. Keep compiled classes and Gradle caches on the Mac's native volume.
export GRADLE_USER_HOME="${WORD_ATLAS_GRADLE_HOME:-$HOME/Library/Caches/word-atlas/gradle}"
export WORD_ATLAS_BUILD_ROOT="${WORD_ATLAS_BUILD_ROOT:-$HOME/Library/Caches/word-atlas/android-build}"
clean_metadata() { if command -v dot_clean >/dev/null; then dot_clean ./; fi; }
trap clean_metadata EXIT

pnpm build
clean_metadata
pnpm exec cap sync android
clean_metadata
(cd android && ./gradlew assembleDebug --no-daemon --project-cache-dir "$WORD_ATLAS_BUILD_ROOT/project-cache")
mkdir -p android/app/build/outputs/apk/debug
clean_metadata
cp "$WORD_ATLAS_BUILD_ROOT/app/outputs/apk/debug/app-debug.apk" android/app/build/outputs/apk/debug/app-debug.apk
clean_metadata
printf '\nAPK: %s/android/app/build/outputs/apk/debug/app-debug.apk\n' "$PWD"
