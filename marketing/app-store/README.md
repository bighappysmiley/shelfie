# App Store screenshots

Apple Books layout at **device aspect** (1290×2796):

- Full-bleed light gray panel (not a wide card on white)
- Large iPhone with Dynamic Island in a status band (does not cover UI)
- Phone anchored to the bottom and clipped (no empty gray strip under the device)
- Headline accent in brand forest green `#3d5248` (not orange)
- Live Pine screenshots inside

```bash
node scripts/appstore-screenshots.mjs
FORCE_RECAPTURE=1 node scripts/appstore-screenshots.mjs
```
