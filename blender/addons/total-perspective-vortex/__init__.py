import importlib
import bpy
from . import tpv

# Reload modules when reloading add-ons in Blender with F8.

bl_info = {
    "name": "Total Perspective Vortex",
    "author": "Electric UI",
    "version": (1, 0),
    "blender": (3, 0, 0),
    "location": "View3D >",
    "description": "Exports a scene for the Zaphod Delta Robot",
    "warning": "",
    "doc_url": "",
    "category": "",
}

# Registration

def register():
    importlib.reload(tpv)
    print("tpv register")
    bpy.utils.register_class(tpv.TPVExportLayout)
    bpy.utils.register_class(tpv.OBJECT_OT_TPVExport)
    bpy.types.Scene.export_pathStatic = bpy.props.StringProperty(
        name="Folder",
        default="",
        description="Define the path of the project folder you want to export in",
        subtype='DIR_PATH')


def unregister():
    print("tpv unregister")
    bpy.utils.unregister_class(tpv.OBJECT_OT_TPVExport)
    bpy.utils.unregister_class(tpv.TPVExportLayout)
    del bpy.types.Scene.export_pathStatic


if __name__ == "__main__":
    register()
