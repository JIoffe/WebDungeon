import bpy
import bmesh
import struct
import json

# ExportHelper is a helper class, defines filename and
# invoke() function which calls the file selector.
from bpy_extras.io_utils import ExportHelper
from bpy.props import StringProperty, BoolProperty, EnumProperty
from bpy.types import Operator

class MeshExport:
    def __init__(self, name):
        self.name = name
        self.type = 'MESH'
        self.submeshes = []
        return
    
    def toJson(self):
        return json.dumps(self, default=lambda o: o.__dict__)
    
class SubmeshExport:
    def __init__(self, name):
        self.name = name
        self.verts = []
        self.uvs = []
        self.norms = []
        self.indices = []
        
        # weights are a list of values:
        # Bone, Weight, Bone, Weight, Bone, Weight, Bone, Weight...
        self.weights = []
        self.vertexGroups = []
        return
    
    def append(self, v1, uv1=None, norm1=None, weight1=None):
        index = -1
        
        # compare vertices by seeing if distance is within a very small number away
        # For most rendering APIs we will need redundant verts if positions are same
        # but UVs are different
        for i, (v0,uv0,norm0) in enumerate(zip(self.verts, self.uvs, self.norms)):
            v_match = abs(v0.x - v1.x) <= 1e-09 and abs(v0.y - v1.y) <= 1e-09 and abs(v0.z - v1.z) <= 1e-09
            if not uv1:
                uv_match = True
            else:
                uv_match = abs(uv0.x - uv1.x) <= 1e-09 and abs(uv0.y - uv1.y) <= 1e-09
                
            if v_match and uv_match:
                index = i
                break    
        
        # no match found, add new entry
        if(index == -1):
            index = len(self.verts)
            self.verts.append(v1)
            self.norms.append(norm1)
            
            if uv1:
                self.uvs.append(uv1.copy())
            else:
                self.uvs.append(None)
                
            self.weights.append(weight1)
            
        self.indices.append(index)
        return
                
    # Flatten the vertex data
    def build(self, y_is_up):
        flattened = [] 
        
        if(y_is_up):
            for v in self.verts:
                flattened.append(v[0])
                flattened.append(v[2])
                flattened.append(-v[1])            
        else:
            for v in self.verts:
                flattened.append(v[0])
                flattened.append(v[1])
                flattened.append(v[2])
            
        self.verts = flattened;
        
        flattened = []
        if any(self.uvs):
            for uv in self.uvs:
                if not uv:
                    uv = Vector([0,0])
                    
                #Round to 3 decimal places
                flattened.append(round(uv.x, 3))
                flattened.append(round(uv.y, 3))
            
        self.uvs = flattened


        flattened = []    
        if any(self.norms):
            if(y_is_up):
                for norm in self.norms:
                    if not norm:
                        norm = Vector([0,0,0])
                        
                    flattened.append(norm[0])
                    flattened.append(norm[2])
                    flattened.append(-norm[1])
            else:       
                for norm in self.norms:
                    if not norm:
                        norm = Vector([0,0,0])
                        
                    flattened.append(norm[0])
                    flattened.append(norm[1])
                    flattened.append(norm[2])
            
        self.norms = flattened
        
        return
    
    def toJson(self):
        return json.dumps(self, default=lambda o: o.__dict__)

# An exporter that writes mesh data in JSON format.
# this is not ideal per se but it is intuitive. Binary is a bit of a PIA in Python
class ExportJSON(Operator, ExportHelper):
    """Exports mesh as JSON (.json) file."""
    bl_idname = "export_json_test.invoke"  # important since its how bpy.ops.import_test.some_data is constructed
    bl_label = "Export Custom Mesh JSON (.json) file"

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

    def write_json(self, context, filepath, y_is_up):
        blenderFileName = bpy.path.basename(bpy.context.blend_data.filepath).split('.')[0]
        
        # Keep track of the frame before beginning export
        if bpy.context.object:
            originalObjectMode = bpy.context.object.mode
        else:
            originalObjectMode = None
        
        originalFrame = bpy.context.scene.frame_current
        originalSelection = bpy.context.view_layer.objects.active
        
        # Set Frame to 0
        bpy.context.scene.frame_set(0)
            
        # Only export from the EXPORT collection
        # if it exists. Otherwise, use collection[0]
        try:
            exportCollection = bpy.data.collections['EXPORT']
        except:
            exportCollection = bpy.data.collections[0]
               
        
        # Filter collection and only write MESH OBJECTS
        # Armatures are exported in another script
        meshes      = list(filter(lambda m: m.type == 'MESH', exportCollection.all_objects))
        meshCount   = len(meshes)
        
        export = MeshExport(blenderFileName)
        
        #f.write('{}\n'.format(meshCount))
        
        for obj in meshes:
            bpy.context.view_layer.objects.active = obj
            bpy.ops.object.mode_set(mode='EDIT')
            print('Exporting: {}'.format(obj.name))
            submeshExport = SubmeshExport(obj.name)
            
            # see if an armature modifies this mesh
            hasDeforms = True in (m.type=='ARMATURE' for m in obj.modifiers)
            if(hasDeforms):
                print('{} is deformed by an armature. Weights will be included.'.format(obj.name))
                submeshExport.vertexGroups = [g.name for g in obj.vertex_groups]
            else:
                print('{} is not deformed by an armature. Weight data will be empty.'.format(obj.name))
                
            #next(obj for obj in exportCollection.all_objects if obj.type=='ARMATURE')
            
            # work with a scratch copy in memory
            depsgraph = context.evaluated_depsgraph_get()
            
            # Invoke to_mesh() for evaluated object and apply modifiers (eg. mirror)
            object_eval = obj.evaluated_get(depsgraph)
            m = object_eval.to_mesh()
            bm = bmesh.new()
            bm.from_mesh(m)
            
            # We need triangles! Not even optional.
            bmesh.ops.triangulate(bm, faces=bm.faces[:], quad_method='BEAUTY', ngon_method='BEAUTY')
            deform = bm.verts.layers.deform.active
            uv = bm.loops.layers.uv.active
            
            if not deform:
                hasDeforms = False

            # Go every face in the now-triangulated mesh and gather properties per vertex
            for face in bm.faces:
                for loop in face.loops:
                    # transform vertex to world transform for this object
                    vert_pos = (obj.matrix_world @ loop.vert.co)
                    
                    # Get bone deforms that actually influence this vertex, let engine decide what to keep
                    weight = []
                    
                    if(hasDeforms):
                        deforms = loop.vert[deform].items()
                        for g, w in deforms:
                            if(w > 1e-09):
                                weight.append(g)
                                weight.append(w)
                                
                    # UV is attached to the loop
                    if uv:
                        uv_coord = loop[uv].uv
                    else:
                        uv_coord = None
                        
                                    
                    submeshExport.append(vert_pos, uv1=uv_coord, weight1=weight)
                    
                        
            #f.write('{}\n'.format(len(coords)))
            #for coord in coords:
            #    f.write('{} {} {}\n'.format(coord.x, coord.y, coord.z))
            
            # release extra mesh data from memory
            bm.free()
            object_eval.to_mesh_clear()
            
            # Add compiled data to output
            submeshExport.build(y_is_up)
            export.submeshes.append(submeshExport)
            
        
        # actually write the mesh JSON to disc
        print('Writing Mesh as JSON to File {}...'.format(filepath))
        
        # Reset frame and mode
        bpy.context.scene.frame_set(originalFrame)
        bpy.context.view_layer.objects.active = originalSelection
        if originalObjectMode:
            bpy.ops.object.mode_set(mode=originalObjectMode)
            
        f = open(filepath, 'w')
        f.write(export.toJson())
        f.close()
        
        print('Finished writing to {}'.format(filepath))
        self.report({"INFO"}, 'Wrote to {}'.format(filepath))
        return {'FINISHED'}

    def execute(self, context):
        return self.write_json(context, self.filepath, self.y_is_up)


# Only needed if you want to add into a dynamic menu
def menu_func_export(self, context):
    self.layout.operator(ExportJSON.bl_idname, text="Export JSON")


def register():
    bpy.utils.register_class(ExportJSON)
    bpy.types.TOPBAR_MT_file_export.append(menu_func_export)


def unregister():
    bpy.utils.unregister_class(ExportJSON)
    bpy.types.TOPBAR_MT_file_export.remove(menu_func_export)


if __name__ == "__main__":
    register()

# test call
bpy.ops.export_json_test.invoke('INVOKE_DEFAULT')