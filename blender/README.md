# Installation

Set the blender scripts directory (Edit -> Preferences -> File Paths -> Scripts) to this folder, eg `~/total-perspective-vortex/blender/`.

---

The above doesn't work for me anymore on 3.1, now I symlink the total_perspective_vortex addon folder into `/Applications/Blender/Contents/Resources/3.1/scripts/addons/total_perspective_vortex`

Run the generator script from the `./defgen` folder from blender. On my system:

`/Applications/Blender.app/Contents/MacOS/Blender -b -P "/Users/michaelorenstein/Documents/Projects/total-perspective-vortex/blender/defgen/pypredef_gen.py"`

---

PyCharm defs, go PyCharm -> Preferences -> Project: Addons -> Project Structure -> Add Content Root (on the right).

Add the `./defgen/pypredef` folder.

---

To increase the max size of files that get code insight, go Help -> Edit Custom Properties, enter `idea.max.intellisense.filesize=999999`

---

Blender must be run from the command line in order to get console output.

---

For better scale, in edit mode, set the grid scale to 0.1, the unit scale to 0.1, the length to millimeters.

This makes a 10x sized cube 200mm across in each direction, roughly the render volume

![image-20211214151515847](./docs/blender-scale-settings.png)

---

LineArt Modifier is applied to a GPencil object, which then takes other objects as inputs.

Vertex Painting on LineArt requires the LineArt GPencil modifier to have been baked first. Then the vertex paint view can be used to paint.
