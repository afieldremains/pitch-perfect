# PRIO

PRIO is a meeting notebook for any business, made by **Prio Connect** (formerly Prime Digital Connect). The app used to be called PRIME: Pitch Perfect. **Seek. Find. Grow.**

Set up your company once: what you sell, your prices, your real results, your colors and your logo. Then give it a prospect's name and website. It researches them and builds:

- a deck you can click through
- a talk track
- a cheat sheet
- a leave-behind

It also makes complete ad campaigns and brand kits, and it keeps your clients, follow-ups and notes on your own computer.

## Download

| Your computer | Download |
|---|---|
| Windows 10 or 11 | **[PRIO-Setup.exe](https://github.com/afieldremains/pitch-perfect/raw/main/PRIO-Setup.exe)** (about 100 MB) |
| Mac (Apple silicon or Intel) | **[Releases](https://github.com/afieldremains/pitch-perfect/releases/latest)**: choose the `arm64` file for Apple silicon (M1 and newer) or `x64` for Intel |

The current version is 0.37.0.

The older Windows links (`PRIME-Pitch-Perfect-Setup.exe` and `Vereza-Setup.exe`) still work and download this same installer.

**iPhone, iPad, Android, Chromebook or any browser:** open **[the web app](https://afieldremains.github.io/pitch-perfect/app/)**.
- On iPhone or iPad, tap Share, then **Add to Home Screen**.
- On Android, tap the menu, then **Install app**.

Your work stays on that device. The web app makes the same any-company decks, ads and brand kits. Prio Connect's own deck design, PowerPoint copies and video exports are in the desktop app.

Not sure which Mac you have? Open the Apple menu and choose **About This Mac**. If it says "Chip: Apple M…", download Apple silicon. If it says "Processor: Intel", download Intel.

## Install

**Windows:** Open the file. Windows may say "Windows protected your PC", because the app isn't code-signed yet. Click **More info**, then **Run anyway**. Installing over an earlier version keeps all your work.

**Mac:** Open the disk image and drag the app to Applications. The first time you open it, right-click the app, choose **Open**, then choose **Open** again. The app isn't signed by Apple yet. If the Mac says the app "is damaged", open Terminal and run `xattr -cr /Applications/PRIO.app`, then open it again.

## Before your first kit

Research needs an Anthropic API key, the kind that starts with `sk-ant-api03-`. Create one at console.anthropic.com, then paste it into the app under **Settings → Research key**. The key is stored encrypted on your computer and is only used to run your research.

## Where your work lives

New installs save everything in `Documents/PRIO`. If you used an earlier version, the app keeps using its folder (`Documents/PRIME Pitch Perfect` or `Documents/Vereza`), so nothing moves. Nothing is uploaded anywhere else.

The first time PRIO opens, it rebuilds every kit that has its research so the kit says Prio Connect. The original research is kept beside each kit as `research.prime.json`.

## Questions

Jake Satterfield: jake@prioconnect.com, (941) 473-6690
Greg Satterfield: greg@prioconnect.com, (317) 888-9900

Windows installer SHA-256: `34905976268bccf45e0cb7c80fd471bf6af0486485156b7cea68aa3ced4d0488`
