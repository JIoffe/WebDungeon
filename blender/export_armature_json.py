import bpy
import math
import bmesh
import struct
import mathutils
import json

# ExportHelper is a helper class, defines filename and
# invoke() function which calls the file selector.
from bpy_extras.io_utils import ExportHelper
from bpy.props import StringProperty, BoolProperty, EnumProperty, IntProperty
from bpy.types import Operator
    
# CONVERT FROM BLENDER TO RH Y UP (like OpenGL)
axis_basis_change = mathutils.Matrix(((1.0, 0.0, 0.0, 0.0), (0.0, 0.0, 1.0, 0.0), (0.0, -1.0, 0.0, 0.0), (0.0, 0.0, 0.0, 1.0)))

def assemble_matrix(armature, bone, y_is_up):
    # compare the current pose to the bind pose to see the relative offset
    pose = armature.matrix_world @ bone.matrix.copy()
    bind_pose = armature.matrix_world @ bone.bone.matrix_local.copy()
        
    if y_is_up:
        pose = axis_basis_change @ pose
        bind_pose = axis_basis_change @ bind_pose
              
    return pose @ bind_pose.inverted_safe()

class ArmatureExport:
    def __init__(self, armature):
        self.name = armature.name
        self.bones = [bone.name for bone in armature.data.bones if bone.use_deform]
        self.type = 'ARMATURE'
        self.animations = []
        
        # Data is the complete transform data
        # PER ANIMATION
        #    PER FRAME
        #      PER BONE
        # flattened as a giant float array
        self.data = []
        return
    
    def toJson(self):
        return json.dumps(self, default=lambda o: o.__dict__)
    
class ArmatureAnimationExport:
    def __init__(self, name):
        self.name = name
        self.keyframes = []
        return
    
    def toJson(self):
        return json.dumps(self, default=lambda o: o.__dict__)
        
class ExportArmatureJSON(Operator, ExportHelper):
    """Exports Armature (with Animations) as JSON (.json) file."""
    bl_idname = "export_json_test.invoke"  # important since its how bpy.ops.import_test.some_data is constructed
    bl_label = "Export Custom Armature JSON (.json) file"

    # ExportHelper mixin class uses this
    filename_ext = ".json"

    filter_glob: StringProperty(
        default="*.json",
        options={'HIDDEN'},
        maxlen=255,  # Max internal buffer length, longer would be clamped.
    )

    # List of operator properties, the attributes will be assigned
    # to the class instance from the operator settings before calling.
    y_is_up: BoolProperty(
        name="Export Y as Up",
        description="Converts Blender's coordinate system to one where Y is vertical",
        default=True,
    )

    keyframe_resolution: IntProperty(
        name="Keyframe Resolution",
        description="Minimum number of frames between each saved keyframe",
        default=5
    )

    def execute(self, context):
        return self.write_json(context, self.filepath)

    # An exporter that writes mesh data in JSON format.
    # this is not ideal per se but it is intuitive. Binary is a bit of a PIA in Python
    def write_json(self, context, filepath):
        blenderFileName = bpy.path.basename(bpy.context.blend_data.filepath).split('.')[0]
        
        # Only export from the EXPORT collection
        # if it exists. Otherwise, use collection[0]
        try:
            exportCollection = bpy.data.collections['EXPORT']
        except:
            exportCollection = bpy.data.collections[0]
        
        try:
            armature = next(obj for obj in exportCollection.all_objects if obj.type=='ARMATURE')
        except:
            print('No armature found in export collection!')
            self.report({"ERROR"}, "No armature found in export collection!")
            return {'FINISHED'}
        
        armatureExport = ArmatureExport(armature)
        print('Exporting {}...'.format(armatureExport.name))
        
        # Keep track of the frame before beginning export
        originalObjectMode = bpy.context.object.mode
        originalFrame = bpy.context.scene.frame_current
        originalAction = armature.animation_data.action
        originalSelection = bpy.context.view_layer.objects.active
        
        bpy.context.view_layer.objects.active = armature
        bpy.ops.object.mode_set(mode='POSE')
        
        # Go through all individual actions and extract keyframes
        # this will later be joined into a single giant hex string
        #dataValueList = []
        for action in bpy.data.actions:
            animationExport = ArmatureAnimationExport(action.name)
            armature.animation_data.action = action
            
            print('Exporting {}...'.format(action.name))

            # Gather keyframe locations
            for fcurve in action.fcurves:
                # Determine the keyframes, insuring the save at the 
                # resolution requested. More keyframes means a taller texture
                # there may be duplicates for each object so only consider each frame once
                for key in fcurve.keyframe_points:
                    kf = math.floor(key.co.x)
                    if not any(animationExport.keyframes):
                        animationExport.keyframes.append(kf)

                    elif kf not in animationExport.keyframes:
                        last_kf = animationExport.keyframes[-1]
                        kf_delta = kf - last_kf
                        while kf_delta > self.keyframe_resolution:
                            animationExport.keyframes.append(animationExport.keyframes[-1] + self.keyframe_resolution)
                            kf_delta -= self.keyframe_resolution

                        animationExport.keyframes.append(kf) 
                        
            animationExport.keyframes.sort()

            # Gather data at each keyframe
            for frame in animationExport.keyframes:   
                # Set the frame a few times so that the IKs resolve    
                for _ in range(0, 10):
                    bpy.context.scene.frame_set(frame)
                
                # write each matrix in order
                # these matrices are stored as a very long HEX string per keyframe
                bones = [armature.pose.bones[bone] for bone in armatureExport.bones]
                for bone in bones:
                    bind_matrix = assemble_matrix(armature, bone, self.y_is_up)
        
                    for column in range(0, 4):
                        for row in range(0, 4):
                            armatureExport.data.append(bind_matrix[row][column])
                    
            armatureExport.animations.append(animationExport)
        
        
        # Reset frame and mode
        bpy.context.scene.frame_set(originalFrame)
        bpy.ops.object.mode_set(mode=originalObjectMode)
        armature.animation_data.action = originalAction
        bpy.context.view_layer.objects.active = originalSelection
        
        f = open(filepath, 'w')
        f.write(armatureExport.toJson())
        f.close()
        
        print('Finished writing to {}'.format(filepath))
        self.report({"INFO"}, 'Wrote {} to {}'.format(armatureExport.name, filepath))
        return {'FINISHED'}

# Only needed if you want to add into a dynamic menu
def menu_func_export(self, context):
    self.layout.operator(ExportArmatureJSON.bl_idname, text="Export JSON (Armature Animation)")


def register():
    bpy.utils.register_class(ExportArmatureJSON)
    bpy.types.TOPBAR_MT_file_export.append(menu_func_export)


def unregister():
    bpy.utils.unregister_class(ExportArmatureJSON)
    bpy.types.TOPBAR_MT_file_export.remove(menu_func_export)


if __name__ == "__main__":
    register()

    # test call
bpy.ops.export_json_test.invoke('INVOKE_DEFAULT')
