# Word Atlas · Offline Android Edition

An independent Android adaptation of [designfuchen/word-atlas](https://github.com/designfuchen/word-atlas), based on upstream commit [`c70d57d2`](https://github.com/designfuchen/word-atlas/commit/c70d57d2b697f4de6ad512c62ba9495c4e5dc61c).

The original application, vocabulary, illustrations, recordings and learning model are by **designfuchen and Word Atlas contributors**. This repository is maintained by [shawncai](https://github.com/shawncai) for Android packaging, mobile layouts and foldable window support. It is not an official Android release from the upstream author.

[中文说明](README.md) · [Android build guide](docs/android.md) · [Dependency review](docs/android-dependencies.md)

## Features and changes

- 7,298 illustrated vocabulary entries, UK/US pronunciation, examples and FSRS review.
- Daily learning, four quiz types, search, bookmarks, an interactive word galaxy, typing practice and statistics.
- A Capacitor Android app with the existing dataset and media bundled for offline use.
- Android back navigation, lifecycle handling, keyboard/safe-area support, backup export/import and system sharing.
- Responsive cover-screen and unfolded layouts that retain learning and input state when the window changes size.

No account, backend or API key is required to use or build the existing offline application. Progress stays on the device. Missing recordings may use device speech when available.

## Development

Use Node.js **22.22.3** through nvm and pnpm **8.15.8**.

```bash
git clone https://github.com/shawncai/words.git
cd words
source "$HOME/.nvm/nvm.sh"
nvm install
nvm use
pnpm install --frozen-lockfile
pnpm dev
```

Open <http://localhost:5188>. The repository includes several hundred MB of media. Android builds require JDK 21 and Android SDK 36; run `pnpm android:build` and follow [the build/install guide](docs/android.md). Download the approximately 670 MB APK and SHA-256 checksum from [GitHub Releases](https://github.com/shawncai/words/releases/latest). APKs are release assets, not tracked in Git.

`pnpm android:release` produces `android/app/build/outputs/apk/release/app-release.apk` with debugging disabled (version 1.0.0, build 2). It reuses the existing local debug signing key to support updates from earlier personal installs, and stops if that key is missing. This is a sideload release, not an app-store distribution. Signing keys, local SDK settings and personal learning data are never uploaded.

Run `pnpm test`, `pnpm check:atlas`, `pnpm check:splash` and `pnpm build`. With the dev server running and Chrome installed, run `pnpm check:mobile`, `pnpm check:interface`, `pnpm check:foldable` and `pnpm check:motion`.

Android behavior has been tested on SM-N9760 / Android 12. Foldable layouts have browser emulation coverage; Galaxy Z Fold8 Ultra hardware testing is still pending. Keep the same package name and signing key for updates, use `adb install -r`, and export backups before moving devices.

## Attribution and licensing

- Code and interface: [MIT](LICENSE), preserving the Word Atlas contributors copyright notice.
- Vocabulary, illustrations and word recordings: **Word Atlas contributors**, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); see [CONTENT_LICENSE.md](CONTENT_LICENSE.md).
- This adaptation changes application packaging, interface and runtime behavior. The upstream learning content is unchanged.
- Third-party libraries and fonts retain their own licenses, including SIL OFL 1.1 for Fraunces.

The upstream content was created with generative AI and synthesized speech and has not been individually proofread. It may contain errors and is not an official IELTS word list.

Report adaptation issues at [shawncai/words](https://github.com/shawncai/words/issues). Never attach credentials, signing keys or private learning backups.
