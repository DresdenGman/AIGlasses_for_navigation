"""Render all views from the actual v0.4 Blender scene; no generated product imagery."""
import bpy,bmesh,json,math,os
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
OUT=Path(os.environ.get('AIGLASSES_OUT',str(Path(bpy.data.filepath).parent)))
scene=bpy.context.scene;cam=scene.camera;studio=bpy.data.collections['03_STUDIO'];design=bpy.data.collections.get('01_DESIGN_V04') or bpy.data.collections['01_DESIGN_V03'];body=bpy.data.objects['Housing_v04 / unified hollow envelope'];cover=bpy.data.objects['Housing_v04 / removable upper cover'];reference=bpy.data.objects['SOURCE_original_complete_assembly']
design.name="01_DESIGN_V04";scene["version"]="0.4.0"
scene.cycles.samples=48;scene.render.resolution_x=1800;scene.render.resolution_y=1300;scene.render.resolution_percentage=100
# Validate evaluated meshes, including micro-bevel modifiers.
def tree(ob,eval=False):
 obj=ob.evaluated_get(bpy.context.evaluated_depsgraph_get()) if eval else ob
 me=obj.to_mesh() if eval else obj.data
 t=BVHTree.FromPolygons([v.co for v in me.vertices],[p.vertices for p in me.polygons],epsilon=0)
 if eval:obj.to_mesh_clear()
 return t
labels=[x.value for x in reference.data.attributes['source_component_id'].data]
protected=[i for i,c in enumerate(labels) if c not in {1,4,5,7,10,11}]
r=BVHTree.FromPolygons([v.co for v in reference.data.vertices],[p.vertices for p in reference.data.polygons if labels[p.vertices[0]] not in {1,4,5,7,10,11}],epsilon=0)
report=json.loads((OUT/'validation.json').read_text());checks={}
for ob in [body,cover]:
 t=tree(ob,True);hits=t.overlap(r);inside=0;minimum=float('inf')
 for vi in protected:
  v=reference.data.vertices[vi]
  nearest,normal,index,distance=t.find_nearest(v.co)
  minimum=min(minimum,distance)
  # Nearest-face sign is ambiguous near concave corners; confirm via ray parity.
  direction=Vector((1,.137,.311)).normalized();pos=v.co.copy();count=0
  for _ in range(100):
   q,nn,ii,dd=t.ray_cast(pos,direction)
   if q is None:break
   count+=1;pos=q+direction*.0001
  if count%2:
   votes=1
   for direction in [Vector((.171,1,.233)).normalized(),Vector((.131,.157,1)).normalized()]:
    pos=v.co.copy();count=0
    for _ in range(100):
     q,nn,ii,dd=t.ray_cast(pos,direction)
     if q is None:break
     count+=1;pos=q+direction*.0001
    votes+=count%2
   if votes>=2:inside+=1
 checks[ob.name]={'evaluated_surface_intersection_pairs':len(hits),'reference_vertices_inside_shell_material':inside,'minimum_source_vertex_to_surface_distance_source_units':minimum}
report['version']='0.4.0';report['design']='Approved lightweight Continuous Facets';report['point_inside_method']='Ray parity for every protected source vertex, excluding replaced exterior patches 1/4/5/7/10/11, non-axis-aligned direction (1, .137, .311), epsilon .0001 source units; odd hits confirmed by majority of three independent ray directions';report['evaluated_mesh_checks']=checks;(OUT/'validation.json').write_text(json.dumps(report,indent=2))
print('EVALUATED_CHECKS',checks,flush=True)
assert all(c['evaluated_surface_intersection_pairs']==0 and c['reference_vertices_inside_shell_material']==0 for c in checks.values()),'Clearance regression'
# Export all model-only geometry; keep studio and protected reference out of exports.
bpy.ops.object.select_all(action='DESELECT')
for ob in design.objects:
 ob.hide_set(False);ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'AI_Glasses_Continuous_Facets_v0.4.glb'),export_format='GLB',use_selection=True,export_apply=True,export_cameras=False,export_lights=False)
for ob,filename in [(body,'housing_lower.stl'),(cover,'housing_upper.stl')]:
 bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);bpy.context.view_layer.objects.active=ob
 bpy.ops.wm.stl_export(filepath=str(OUT/filename),export_selected_objects=True,apply_modifiers=True,ascii_format=False)
def view(loc,target=(0,23,-3),scale=275):
 cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale

def shot(name,loc,target=(0,23,-3),scale=275):
 view(loc,target,scale);scene.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True);print('SHOT',name,flush=True)
minimum_z=min(v.co.z for v in body.data.vertices);floor_delta=(minimum_z-.05)-(-27.5)
bpy.data.objects['Studio surface'].location.z+=floor_delta
# Model/source shown in the editable viewport, with studio hidden only from the viewport.
view((-240,-285,210));bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'AI_Glasses_Continuous_Facets_v0.4.blend'),compress=True)
shot('01_hero',(-240,-285,210),scale=275)
shot('02_front',(0,-2000,152),(0,12,-4),240)
shot('03_side',(-2000,25,196),(0,25,-4),230)
shot('04_top',(0,25,420),(0,25,0),320)
shot('05_rear',(220,285,155),scale=265)
shot('06_detail',(-175,-250,75),(-56,-39,3),90)
cover.location.z=48
shot('07_open_housing',(-235,-280,240),(0,20,17),290)
cover.location.z=0
# Staged contexts use the SAME model, without changing product geometry.
props=bpy.data.collections.new('04_CONTEXT / staged environment');scene.collection.children.link(props)
def mat(name,c,rough=.5,metal=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True;bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*c,1);bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal;return m
def relink(ob):
 for c in list(ob.users_collection):c.objects.unlink(ob)
 props.objects.link(ob)
def cube(name,loc,dims,m,bevel=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=dims;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m);relink(o)
 if bevel:b=o.modifiers.new('Rounded edges','BEVEL');b.width=bevel;b.segments=4;o.modifiers.new('Normals','WEIGHTED_NORMAL')
 return o
def cyl(name,loc,radius,depth,m,rot=(0,0,0)):
 bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=radius,depth=depth,location=loc,rotation=rot);o=bpy.context.object;o.name=name;o.data.materials.append(m);relink(o)
 for p in o.data.polygons:p.use_smooth=True
 b=o.modifiers.new('Edge finish','BEVEL');b.width=.6;b.segments=3;return o
wood=mat('Oiled oak / procedural',(.3,.17,.08),.53)
n=wood.node_tree.nodes;l=wood.node_tree.links;tc=n.new('ShaderNodeTexCoord');mapping=n.new('ShaderNodeVectorMath');mapping.operation='MULTIPLY';mapping.inputs[1].default_value=(.8,60.0,3.0);l.new(tc.outputs['Generated'],mapping.inputs[0]);noise=n.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=22;noise.inputs['Detail'].default_value=3;l.new(mapping.outputs[0],noise.inputs['Vector']);ramp=n.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].position=.18;ramp.color_ramp.elements[0].color=(.20,.095,.035,1);ramp.color_ramp.elements[1].position=.82;ramp.color_ramp.elements[1].color=(.53,.32,.15,1);l.new(noise.outputs['Fac'],ramp.inputs[0]);l.new(ramp.outputs[0],n.get('Principled BSDF').inputs['Base Color']);bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.1;bump.inputs['Distance'].default_value=.2;l.new(noise.outputs['Fac'],bump.inputs['Height']);l.new(bump.outputs['Normal'],n.get('Principled BSDF').inputs['Normal'])
floor=bpy.data.objects['Studio surface'];floor.data.materials[0]=wood
paper=mat('Warm paper',(.8,.77,.66),.8);ink=mat('Notebook / deep olive cloth',(.06,.085,.065),.9);black=mat('Phone / graphite',(.012,.016,.02),.3);screen=mat('Inactive glass',(.009,.014,.018),.14,.15);ceramic=mat('Ceramic stoneware',(.65,.57,.44),.28);coffee=mat('Coffee',(.035,.012,.004),.2)
# Product base rests near z=-27; surrounding objects rest on the same table.
book=cube('Notebook cover',(166,104,-23),(112,155,8),ink,3);cube('Notebook paper',(166,104,-18),(106,147,5),paper,1)
phone=cube('Phone body',(-165,85,-23),(71,143,8),black,7);cube('Phone dark screen',(-165,85,-18.8),(65,133,.5),screen,6)
# Mug is open with an inset coffee surface.
mug=cyl('Stoneware mug',(117,-136,0),28,53,ceramic)
hole=cyl('Cup interior cutter',(117,-136,5),24,54,ceramic);bpy.context.view_layer.objects.active=mug;bo=mug.modifiers.new('Open cup','BOOLEAN');bo.object=hole;bo.operation='DIFFERENCE';bpy.ops.object.modifier_apply(modifier=bo.name);bpy.data.objects.remove(hole,do_unlink=True);cyl('Coffee surface',(117,-136,23),23.7,.7,coffee)
bpy.ops.mesh.primitive_torus_add(major_radius=17,minor_radius=4,major_segments=48,minor_segments=12,location=(147,-136,0),rotation=(math.pi/2,0,0));handle=bpy.context.object;handle.name='Mug handle';handle.data.materials.append(ceramic);relink(handle)
# A simple pencil on the notebook.
pencil=cyl('Graphite pencil',(196,108,-12),3,128,ink,(0,math.pi/2,math.pi/2))
scene.render.resolution_x=2100;scene.render.resolution_y=1400
for obj in props.objects:obj.location.z+=floor_delta
shot('08_everyday_desk',(-370,-400,430),(0,17,-10),460)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'AI_Glasses_Desk_Scene_v0.4.blend'),compress=True)
# Reuse original model for a maker setting; remove only set dressing.
for o in list(props.objects):bpy.data.objects.remove(o,do_unlink=True)
green=mat('Cutting mat',(.022,.095,.082),.85);grid=mat('Mat markings',(.17,.29,.23),.85);steel=mat('Tool steel',(.33,.36,.38),.27,.85);orange=mat('Tool grip',(.5,.16,.035),.6)
# Surface plane kept at exactly the same product-contact height.
matob=cube('Workshop cutting mat',(0,20,-28),(430,320,1),green,3)
for x in range(-200,201,20):cube('Grid',(x,20,-27.48),(.3,300,.015),grid)
for y in range(-120,161,20):cube('Grid',(0,y,-27.48),(410,.3,.015),grid)
# Neutral generic measuring tools; no invented functional electronics.
cube('Caliper beam',(156,38,-24),(8,155,4),steel,1)
cube('Caliper fixed jaw',(140,-34,-22),(38,6,8),steel,1)
cube('Caliper sliding jaw',(140,17,-22),(38,6,8),steel,1)
cube('Caliper slider',(156,17,-20),(21,23,9),black,2)
cube('Caliper display',(156,17,-15.4),(15,12,.3),screen,1)
cyl('Screwdriver shaft',(-155,52,-21),2,65,steel,(math.pi/2,0,0));cyl('Screwdriver grip',(-155,108,-21),7,55,orange,(math.pi/2,0,0))
tray=cube('Small parts tray',(-142,-81,-20),(70,58,14),steel,5)
traycut=cube('Tray interior',(-142,-81,-14),(63,51,17),steel,4);bpy.context.view_layer.objects.active=tray;bo=tray.modifiers.new('Open tray','BOOLEAN');bo.operation='DIFFERENCE';bo.object=traycut;bpy.ops.object.modifier_apply(modifier=bo.name);bpy.data.objects.remove(traycut,do_unlink=True)
for x,y in [(-159,-83),(-146,-78),(-131,-88),(-140,-94)]:cyl('Generic loose screw',(x,y,-13.5),2.3,6,steel)
for obj in props.objects:obj.location.z+=floor_delta
shot('09_maker_workbench',(-340,-380,450),(0,20,-8),455)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'AI_Glasses_Maker_Scene_v0.4.blend'),compress=True)
# Save metadata identifying staged imagery explicitly.
(OUT/'render_manifest.json').write_text(json.dumps({'model_version':'0.4.0','renderer':'Blender Cycles','samples':48,'images':{n+'.png':desc for n,desc in [('01_hero','Three-quarter studio'),('02_front','Front studio'),('03_side','Side studio'),('04_top','Top studio'),('05_rear','Rear studio'),('06_detail','Camera detail'),('07_open_housing','Upper cover raised 48 source units; not an assembly instruction'),('08_everyday_desk','Synthetic desk set with generic props'),('09_maker_workbench','Synthetic maker set with generic tools')]},'provenance':'All images rendered directly from the included 3D model. Not physical-product or community-event photographs.'},indent=2))
