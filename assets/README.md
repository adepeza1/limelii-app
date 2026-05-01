# App icon & splash assets

Source images consumed by `@capacitor/assets` to generate Android (and iOS)
launcher icons + splash screens.

## What to drop in this folder

At minimum, one file:

- `icon.png` — 1024×1024 PNG, opaque. Used to derive everything else.

For a properly-padded Android adaptive icon (recommended — fixes the white-square
launcher bug caused by missing safe-zone padding), provide all three:

- `icon-foreground.png` — 1024×1024, **transparent background**, with the icon
  artwork sized to roughly the **center 66%** of the canvas. The outer ~17% on
  every side must be empty — the launcher mask crops it.
- `icon-background.png` — 1024×1024, solid `#FCE5D8` (matches
  `values/ic_launcher_background.xml`). A flat color PNG is fine.
- `icon.png` — 1024×1024 opaque fallback for legacy (pre-API 26) launchers.

## Regenerate

```bash
npx capacitor-assets generate --android
```

This overwrites every `mipmap-*/ic_launcher*.{webp,xml}` and the
`drawable/ic_launcher_*.xml` files with a consistent, correctly-padded set.

After regenerating, rebuild the APK in Android Studio (Build → Clean Project,
then Build → Rebuild Project) and reinstall on the device. Uninstall the old
app first if the icon still looks cached.
