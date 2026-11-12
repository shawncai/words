#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

variant="${1:-debug}"
case "$variant" in
  debug) gradle_task=assembleDebug ;;
  release)
    # Preserve compatibility with existing personal installs. Never generate a
    # replacement key silently: that would prevent data-preserving updates.
    if [ ! -f "$HOME/.android/debug.keystore" ]; then
      printf 'Existing signing key missing: restore ~/.android/debug.keystore first.\n' >&2
      exit 1
    fi
    export WORD_ATLAS_USE_EXISTING_DEBUG_KEY=1
    gradle_task=assembleRelease
    ;;
  *) printf 'Usage: %s [debug|release]\n' "$0" >&2; exit 1 ;;
esac

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
(cd android && ./gradlew "$gradle_task" --no-daemon --project-cache-dir "$WORD_ATLAS_BUILD_ROOT/project-cache")
mkdir -p "android/app/build/outputs/apk/$variant"
clean_metadata
cp "$WORD_ATLAS_BUILD_ROOT/app/outputs/apk/$variant/app-$variant.apk" "android/app/build/outputs/apk/$variant/app-$variant.apk"
clean_metadata
printf '\nAPK: %s/android/app/build/outputs/apk/%s/app-%s.apk\n' "$PWD" "$variant" "$variant"
