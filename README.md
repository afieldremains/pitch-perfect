# Vereza

Vereza is a meeting notebook for any business, made by Vereza (formerly Prime Digital Connect). The app used to be called PRIME: Pitch Perfect.

Set up your company once: what you sell, your prices, your real results, your colors and your logo. Then give it a prospect's name and website. It researches them and builds:

- a deck you can click through
- a talk track
- a cheat sheet
- a leave-behind

It also makes complete ad campaigns and brand kits, and it keeps your clients, follow-ups and notes on your own computer.

## Download

| Your computer | Download |
|---|---|
| Windows 10 or 11 | **[Vereza-Setup.exe](https://github.com/afieldremains/pitch-perfect/raw/main/Vereza-Setup.exe)** (about 100 MB) |
| Mac (Apple silicon or Intel) | **[Releases](https://github.com/afieldremains/pitch-perfect/releases/latest)**: choose the `arm64` file for Apple silicon (M1 and newer) or `x64` for Intel |

The current version is 0.34.0.

The old Windows link (`PRIME-Pitch-Perfect-Setup.exe`) still works and downloads the same installer.

**iPhone, iPad, Android, Chromebook or any browser:** open **[the web app](https://afieldremains.github.io/pitch-perfect/app/)**. On iPhone or iPad, tap Share, then **Add to Home Screen**. On Android, tap the menu, then **Install app**. Your work stays on that device. The web app makes the same any-company decks, ads and brand kits. Vereza's own deck design, PowerPoint copies and video exports are in the desktop app.

Not sure which Mac you have? Open the Apple menu and choose **About This Mac**. If it says "Chip: Apple M…", download Apple silicon. If it says "Processor: Intel", download Intel.

## Install

**Windows:** Open the file. Windows may say "Windows protected your PC", because the app isn't code-signed yet. Click **More info**, then **Run anyway**. Installing over PRIME: Pitch Perfect keeps all your work.

**Mac:** Open the disk image and drag the app to Applications. The first time you open it, right-click the app, choose **Open**, then choose **Open** again. The app isn't signed by Apple yet. If the Mac says the app "is damaged", open Terminal and run `xattr -cr /Applications/Vereza.app`, then open it again.

## Before your first kit

Research needs an Anthropic API key, the kind that starts with `sk-ant-api03-`. Create one at console.anthropic.com, then paste it into the app under **Settings → Research key**. The key is stored encrypted on your computer and is only used to run your research.

## Where your work lives

New installs save everything in `Documents/Vereza`. If you already used PRIME: Pitch Perfect, the app keeps using `Documents/PRIME Pitch Perfect`, so nothing moves. Nothing is uploaded anywhere else.

The first time Vereza opens, it rebuilds every kit that has its research under the new name. The old research is kept beside each kit as `research.prime.json`.

## Questions

Contact Vereza.

Windows installer SHA-256: `db2870e62ac6695fab3b0c11d9c02efda30fe22d78863117a0af46b67f0e7e36`
