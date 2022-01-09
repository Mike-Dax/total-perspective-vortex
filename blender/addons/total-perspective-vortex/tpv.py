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
        row.label(text='Export:')
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
    return [color.r, color.g, color.b, 1]

# Don't transform from Blender coordinate system, the Delta shares the same coordinate system, three is different
def serialise_vector(vec: list[float]):
    return [serialise_float(p) for p in vec]


def serialise_quaternion(quat: mathutils.Quaternion):
    return [serialise_float(quat.x), serialise_float(quat.y), serialise_float(quat.z), serialise_float(quat.w)]


SCALE_DIVISOR = 0.01

def serialise_position(vec: list[float], context, obj):
    world_coordinate = obj.matrix_world @ vec  # Multiply by the world matrix

    # This scale is manually defined
    scale_length = SCALE_DIVISOR # context.scene.unit_settings.scale_length  # Grab the scene scale, output will be in millimeters

    return [
        serialise_float(world_coordinate.x / scale_length),
        serialise_float(world_coordinate.y / scale_length),
        serialise_float(world_coordinate.z / scale_length),
    ]

# Up to 6 decimals of precision
def serialise_float(f: float):
    return round(f, 6)


def slugify(name: str):
    return re.sub(r'[\W_]+', '_', name.lower())


def grease_pencil_export(self, context, frame_number: int, gp_obj: bpy.types.bpy_struct):
    gp_layers = gp_obj.data.layers

    save_struct = dict({
        "type": "gpencil",
        "frame": frame_number,
        "name": gp_obj.name,
        "layers": [],
    })

    obj_name = slugify(gp_obj.name)

    for layer in gp_layers:
        layer: bpy.types.GPencilLayer

        col: mathutils.Color = layer.color

        layer_struct = dict({
            "info": layer.info,
            "material": serialise_material_simple_emission(col),
            "strokes": [],
        })
        save_struct["layers"].append(layer_struct)

        layer_name = slugify(layer.info)

        for frame in layer.frames:
            frame: bpy.types.GPencilFrame

            # Only do this frame
            if frame.frame_number != frame_number:
                continue

            stroke_counter = 0

            for stroke in frame.strokes:
                stroke_counter += 1

                # A stroke is a collection of points, between which lines may be drawn
                stroke: bpy.types.GPencilStroke

                # stroke_col = get_random_color()

                stroke_struct = dict({
                    "useCyclic": stroke.use_cyclic,
                    "points": []
                })
                layer_struct["strokes"].append(stroke_struct)

                points: bpy.types.GPencilStrokePoints = stroke.points

                point_counter = 0

                for point in points:
                    point_counter += 1

                    point: bpy.types.GPencilStrokePoint

                    point_struct = dict({
                        "id": "{obj_name}-{layer_name}-{stroke_counter}-{point_counter}".format(obj_name=obj_name, layer_name=layer_name, stroke_counter=stroke_counter, point_counter=point_counter),
                        "co": serialise_position(point.co, context, gp_obj),
                        "pressure": serialise_float(point.pressure),
                        "strength": serialise_float(point.strength),
                        "vertexColor": serialise_vector(point.vertex_color),
                    })
                    stroke_struct["points"].append(point_struct)

    # Save the frame
    save_file(get_output_filepath(context, frame_number, gp_obj.name), save_struct)


def serialise_material_simple_emission(color: mathutils.Color):
    try:
        return dict({
            "type": "color",
            "color": serialise_color(color)
        })
    except:
        pass

    return dict({
        "type": "color",
        "color": serialise_vector(color)
    })


def serialise_material(material_slot: str):
    # Right now, assume it's a simple Emission material with a default colour
    try:
        # Fetch the material from the graph
        mat = bpy.data.materials[material_slot]
        # get the nodes
        nodes = mat.node_tree.nodes
        # get some specific node:
        # returns None if the node does not exist
        emission: bpy.types.Emission = nodes.get("Emission")

        if emission is None:
            print("Material {slot} has no Emission nodes".format(slot=material_slot))
            return None

        return dict({
            "type": "color",
            "color": serialise_vector(emission.inputs[0].default_value)
        })
    except:
        return None


def particle_system_export(self, context, frame_number: int, pt_obj: bpy.types.bpy_struct):
    # Grab the evaluated dependency graph
    deps_graph = context.evaluated_depsgraph_get()
    particle_systems = pt_obj.evaluated_get(deps_graph).particle_systems

    save_struct = dict({
        "type": "particles",
        "frame": frame_number,
        "name": pt_obj.name,
        "systems": [],
    })

    has_content = False

    obj_name = slugify(pt_obj.name)

    material_slots = pt_obj.evaluated_get(deps_graph).material_slots

    for index, _ in enumerate(particle_systems):
        ps: bpy.types.ParticleSystem = particle_systems[index]
        settings: bpy.types.ParticleSettings = ps.settings

        if ps.settings.type != "EMITTER":
            print("Hair not supported yet")
            return

        system_struct = dict({
            "name": ps.name,
            "material": serialise_material(settings.material_slot),
            "particles": [],
        })
        save_struct["systems"].append(system_struct)

        system_name = slugify(ps.name)

        counter = 0

        for particle in ps.particles:
            counter += 1

            if particle.alive_state != "ALIVE": # enum in [‘DEAD’, ‘UNBORN’, ‘ALIVE’, ‘DYING’], default ‘DEAD’
                continue

            particle_struct = dict({
                "id": "{obj_name}-{system_name}-{counter}".format(obj_name=obj_name, system_name=system_name, counter=counter),
                "location": serialise_position(particle.location - pt_obj.location, context, pt_obj),
                "quaternion": serialise_quaternion(particle.rotation),
                "velocity": serialise_vector(particle.velocity)
            })
            system_struct["particles"].append(particle_struct)

            has_content = True


    if has_content:
        save_file(get_output_filepath(context, frame_number, pt_obj.name), save_struct)


def camera_export(self, context, frame_number: int, cm_obj: bpy.types.Camera):
    sensor_height = cm_obj.data.sensor_height
    sensor_width = cm_obj.data.sensor_width

    save_struct = dict({
        "type": "camera",
        "frame": frame_number,
        "name": cm_obj.name,
        "focal_length": cm_obj.data.lens,
        "sensor_height": sensor_height,
        "sensor_width": sensor_width,
        "position": serialise_position(cm_obj.location, context, cm_obj),
        "rotation": serialise_vector(cm_obj.rotation_euler),
        "near": serialise_float(cm_obj.data.clip_start / SCALE_DIVISOR),
        "far": serialise_float(cm_obj.data.clip_end / SCALE_DIVISOR),
    })

    save_file(get_output_filepath(context, frame_number, cm_obj.name), save_struct)


def light_export(self, context, frame_number: int, li_obj: bpy.types.Light):
    # Grab the evaluated dependency graph
    deps_graph = context.evaluated_depsgraph_get()
    evaluated_light = li_obj.evaluated_get(deps_graph)

    save_struct = dict({
        "type": "light",
        "frame": frame_number,
        "name": evaluated_light.name,
        "material": dict({
            "type": "color",
            "color": serialise_vector(evaluated_light.data.color)
        }),
        "position": serialise_position(evaluated_light.location, context, evaluated_light),
    })

    save_file(get_output_filepath(context, frame_number, li_obj.name), save_struct)


def get_random_color():
    ''' generate rgb using a list comprehension '''
    r, g, b = [random.random() for i in range(3)]
    return r, g, b, 1



class OBJECT_OT_TPVExport(Operator):
    bl_idname = "object.gptounityanimated"
    bl_label = "Export Selected Objects"
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

        # For every frame, save every object
        start_frame = bpy.context.scene.frame_start
        end_frame = bpy.context.scene.frame_end

        for frame_number in range(start_frame, end_frame):
            # Update the progress bar
            print("Processing frame {frame_number} in range ({start_frame}-{end_frame})".format(frame_number=frame_number,start_frame=start_frame,end_frame=end_frame))

            # Set the frame in the editor
            bpy.context.scene.frame_set(frame_number)

            # Run through every object, run the corresponding command
            for selObj in selObjs:
                bpy.ops.object.select_all(action='DESELECT')
                selObj.select_set(True)
                bpy.context.view_layer.objects.active = selObj

                if selObj.type == "GPENCIL":
                    grease_pencil_export(self, bpy.context, frame_number, selObj)
                    continue

                if selObj.type == "PARTICLES" or selObj.type == "MESH":
                    particle_system_export(self, bpy.context, frame_number, selObj)
                    continue

                if selObj.type == "LIGHT":
                    light_export(self, bpy.context, frame_number, selObj)
                    continue

                print("Unknown object type selected:", selObj.type)

            # Export the active camera regardless of which ones are selected
            camera_export(self, bpy.context, frame_number, bpy.context.scene.camera)



        # Reset the frame that was selected
        bpy.context.scene.frame_set(saveFrame)

        return {'FINISHED'}