# apk

Frida-gadget repack of BSD Brawl v67.264 for Android arm64.

## Files

- `index.js` — agent
- `build-arm64.bat` — repack
- `config.arm64.txt` — gadget config
- `package.json`

## Build

Requires Python 3.10+ and Java (JRE 8+).

```
pip install frida-gadget --upgrade
build-arm64.bat
```

Drop `bsd_brawl_v67.264.apk` in this folder first (not included).

## Buttons

Coords are in `createAllButtons()` inside `index.js`. Change the `(x, y)` passed to each `createButton(...)`.

To change the button **look** (which MovieClip is borrowed, which frame is shown), open `sc-ui/ui.sc` in `sc-ui/sc-editor.jar`:

```
java -jar sc-ui/sc-editor.jar
```

File → Open → `sc-ui/ui.sc`. Browse exports, pick a clip name, plug it into the `StringTable_getMovieClip("sc/ui.sc", "<name>", true)` call inside `createButton()`. The frame index is the last arg of `createButton`.

## Offsets

arm64, v67.264 only.
