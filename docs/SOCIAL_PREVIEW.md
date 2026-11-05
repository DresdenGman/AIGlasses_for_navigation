# Social preview

The share image for this repository is [`assets/social-preview.png`](../assets/social-preview.png).

GitHub does not read that file from the tree. After it is on the default branch, upload the same PNG under **Settings → General → Social preview**. The repository API does not reliably set this, so the upload stays a manual step. Replace the setting whenever the file in git changes, so the two copies do not drift.

## File

- Path: `assets/social-preview.png`
- Size: 1280×640 pixels
- PNG, RGB, solid background, no transparency
- 413 KB

## How it was made

The enclosure is the published Continuous Facets v0.4 hero, [`assets/renders/01_hero.png`](../assets/renders/01_hero.png). That file is a Blender Cycles render of the digital enclosure. It is not a photograph of a manufactured product, and the card says so.

The card places that render on the right and extends the render's own studio tone to the left, so the frame is 1280×640 without cropping the enclosure or inventing a new product shape. The words were drawn in Inter on top of that image. No separate product picture was generated.

## Wording

The lines are the ones already on the README's first screen, shortened only so they stay readable when a share card is shown around 600 pixels wide:

- AI Glasses for Navigation
- Lower-cost visual assistance. Shared making knowledge. Community participation.
- Under $35 to build
- Research prototype · Open source
- Not a certified navigation aid
- Digital enclosure render. Not a manufactured product.

"Under $35 to build" is the existing phrase for the creator's US hardware estimate. It does not add a supplier quotation or a cost for fabricating v0.4. Scope stays as written in [Hardware cost](COMMUNITY_AND_COST.md#hardware-cost).

The card is in English so those lines can stay large. The Chinese introduction is the [Chinese README](README.zh-CN.md).
