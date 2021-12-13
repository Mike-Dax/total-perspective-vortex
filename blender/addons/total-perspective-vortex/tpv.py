import random

import os
import json
import bpy
import bmesh
import mathutils
import re

from bpy.types import Operator


class TPVExportLayout(bpy.types.Panel):
    bl_label = "Total Perspective Vortex"
    bl_idname = "SCENE_PT_tpvexportlayout"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "TPV Export"

    def draw(self, context):
        layout = self.layout

        row = layout.row(align=True)
        row.prop(context.scene, 'export_pathStatic', icon="MESH_CUBE")
        row = layout.row(align=True)
        row.label(text='Unity:')
        row = layout.row(align=True)
        row.operator("object.gptounityanimated", icon="EXPORT")


# Given a frame number and object, calculate the output filepath
def get_output_filepath(context, frame_number: int, obj_name: str):
    base_path = os.path.abspath(context.scene.export_pathStatic)
    folder_path = os.path.join(base_path, str(frame_number))
    file_path = os.path.join(folder_path, "obj_{name}.json".format(name=slugify(obj_name)))

    if not os.path.exists(folder_path):
        os.mkdir(folder_path)

    return file_path


# Given a filepath and struct to save, save a json file
def save_file(file_path: str, contents: dict):
    with open(file_path, "w") as outfile:
        json.dump(contents, outfile)


def serialise_color(color: mathutils.Color):
    return [color.r, color.g, color.b]


def serialise_vector(vec: list[float]):
    return [serialise_float(p) for p in vec]


# Up to 6 decimals of precision
def serialise_float(f: float):
    return round(f, 6)


def slugify(name: str):
    return re.sub(r'[\W_]+', '_', name.lower())

def grease_pencil_export(self, context):
    gp_obj = bpy.context.view_layer.objects.active
    gp_layers = gp_obj.data.layers

    print("grease pencil gp_obj", gp_obj)

    for layer in gp_layers:
        layer: bpy.types.GPencilLayer

        col: mathutils.Color = layer.color

        for frame in layer.frames:
            frame: bpy.types.GPencilFrame

            save_struct = dict({
                "type": "gpencil",
                "strokes": [],
                "color": serialise_color(col)
            })

            for stroke in frame.strokes:
                # A stroke is a collection of points, between which lines may be drawn
                stroke: bpy.types.GPencilStroke

                # stroke_col = get_random_color()

                stroke_struct = dict({
                    "useCyclic": stroke.use_cyclic,
                    "points": []
                })
                save_struct["strokes"].append(stroke_struct)

                points: bpy.types.GPencilStrokePoints = stroke.points

                for point in points:
                    point: bpy.types.GPencilStrokePoint

                    print(point.co, point.vertex_color)

                    point_struct = dict({
                        "co": serialise_vector(point.co),
                        "pressure": serialise_float(point.pressure),
                        "strength": serialise_float(point.strength),
                        "vertexColor": serialise_vector(point.vertex_color),
                    })
                    stroke_struct["points"].append(point_struct)

                    # point.vertex_color = stroke_col

            # Save the frame
            save_file(get_output_filepath(context, frame.frame_number, gp_obj.name), save_struct)

        print("Selected grease pencil layer", layer, col)

def get_random_color():
    ''' generate rgb using a list comprehension '''
    r, g, b = [random.random() for i in range(3)]
    return r, g, b, 1



class OBJECT_OT_TPVExport(Operator):
    bl_idname = "object.gptounityanimated"
    bl_label = "Export Selected Objects for TPV"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        # get object in selection, for each, set active and selection
        selObjs = bpy.context.selected_objects

        # Create the base folder
        base_folder = os.path.abspath(context.scene.export_pathStatic)

        if not os.path.exists(base_folder):
            os.mkdir(base_folder)

        # Remember what frame we're on
        saveFrame = bpy.context.scene.frame_current

        # Deselect everything
        for selObj in selObjs:
            selObj.select_set(False)

        # Run through every object, run the corresponding command
        for selObj in selObjs:
            if selObj.type == "GPENCIL":
                bpy.ops.object.select_all(action='DESELECT')
                selObj.select_set(True)
                bpy.context.view_layer.objects.active = selObj

                grease_pencil_export(self, bpy.context)

        return {'FINISHED'}