"""AI Glasses continuous-facet v0.4. Blender 5.1; source units intentionally uncalibrated."""
import bpy,bmesh,math,json,sys,os
import numpy as np
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
HERE=Path(__file__).resolve().parent
OUT=Path(os.environ.get('AIGLASSES_OUT',str(HERE)));OUT.mkdir(parents=True,exist_ok=True)
# The reference library stores the original complete assembly in translated source coordinates.
with bpy.data.libraries.load(str(HERE/'reference_assembly.blend'),link=False) as (available,loaded):
 loaded.objects=['SOURCE_original_complete_assembly']
source=loaded.objects[0]
refco=np.array([tuple(v.co) for v in source.data.vertices])
reflabel=np.array([a.value for a in source.data.attributes['source_component_id'].data])
fs=[tuple(p.vertices) for p in source.data.polygons]
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene
base=bpy.data.collections.new('01_DESIGN_V04');scene.collection.children.link(base)
refcol=bpy.data.collections.new('00_REFERENCE_original_assembly');scene.collection.children.link(refcol)
cutcol=bpy.data.collections.new('02_KEEP_OUT_envelope');scene.collection.children.link(cutcol)
studio=bpy.data.collections.new('03_STUDIO');scene.collection.children.link(studio)
def mesh(name,verts,faces,col=base):
 m=bpy.data.meshes.new(name);m.from_pydata(verts,[],faces);m.update();ob=bpy.data.objects.new(name,m);col.objects.link(ob)
 bm=bmesh.new();bm.from_mesh(m);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(m);bm.free();return ob
def material(name,color,metal=0,rough=.4):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Metallic'].default_value=metal;bs.inputs['Roughness'].default_value=rough;return m
bodymat=material('Graphite / satin polymer',(.025,.031,.038),.12,.39)
rubber=material('Soft-contact pads',(.018,.023,.028),0,.63)
metal=material('Camera bezel / anodized',(.016,.021,.027),.35,.3)
glass=material('Lens / optical blue',(.006,.017,.03),.15,.12)
reference=mesh('SOURCE_original_complete_assembly',refco.tolist(),fs,refcol);reference.hide_render=True;reference.hide_set(True);reference.hide_select=True;reference['coordinate_system']='Original world coordinates, translated X +151.02978515625; unit unverified.'
attr=reference.data.attributes.new('source_component_id','INT','POINT')
for item,cid in zip(attr.data,reflabel):item.value=int(cid)
# Export standalone complete source reference; preserved for repeatable checks.
bpy.data.libraries.write(str(OUT/'reference_assembly.blend'),{reference},fake_user=True,compress=True)
# Clip-corner cross sections. Expansion of the corner diagonal is accounted for in the profile padding.
def sweep(name,stations,profiles,axis,col=base):
 vs=[]
 for a,(lo,hi,bot,top,ch) in zip(stations,profiles):
  ch=min(ch,(hi-lo)/3,(top-bot)/3)
  ring=[(lo+ch,bot),(hi-ch,bot),(hi,bot+ch),(hi,top-ch),(hi-ch,top),(lo+ch,top),(lo,top-ch),(lo,bot+ch)]
  vs += [(a,u,z) if axis==0 else (u,a,z) for u,z in ring]
 faces=[tuple(reversed(range(8))),tuple(range((len(stations)-1)*8,len(stations)*8))]
 for i in range(len(stations)-1):
  for j in range(8):faces.append((i*8+j,i*8+(j+1)%8,(i+1)*8+(j+1)%8,(i+1)*8+j))
 return mesh(name,vs,faces,col)
def boolop(ob,cutter,operation):
 bpy.context.view_layer.objects.active=ob;mod=ob.modifiers.new(operation,'BOOLEAN');mod.operation=operation;mod.solver='EXACT';mod.object=cutter;bpy.ops.object.modifier_apply(modifier=mod.name)
def profile_for(points,stations,axis,margin=.45):
 uv=[1,2] if axis==0 else [0,2]; pp=[]
 for i,s in enumerate(stations):
  low=stations[max(i-1,0)]; high=stations[min(i+1,len(stations)-1)]
  p=points[(points[:,axis]>=low-.001)&(points[:,axis]<=high+.001)]
  if not len(p):p=points[np.argsort(abs(points[:,axis]-s))[:100]]
  lo,bot=p[:,uv].min(0)-margin;hi,top=p[:,uv].max(0)+margin;pp.append([float(lo),float(hi),float(bot),float(top),.4])
 return pp
# Identified original outer skin patches are replaced, not treated as internal hardware.
replaced_skin=[1,4,5,7,10,11]
protected_mask=~np.isin(reflabel,replaced_skin)
nose_patches=[64,69,70,72,363,364,370,371,418,419,533,534,588,589]
front=refco[(refco[:,1]<=-25.5)&protected_mask&~np.isin(reflabel,nose_patches)].copy()
front_st=np.linspace(-86,86,44);front_prof=profile_for(front,front_st,0)
# New shell: a continuous broad brow, broad temple faces and clipped corners.
outer=[]
for x,p in zip(front_st,front_prof):
 lo,hi,bot,top,ch=p
 lead=min(lo-1.15,-54.7) if abs(x)<45 else lo-1.15
 outer.append([lead,hi+1.15,bot-1.15,max(top+1.15,12.2),1.2])
front_ext=front_st.copy();front_ext[0]-=1.3;front_ext[-1]+=1.3
front_outer=sweep('Brow / continuous faceted shell',front_ext,outer,0)
front_cav=sweep('KEEP_OUT / front',front_st,front_prof,0,cutcol)
parts=[front_outer];cavities=[front_cav];profiles={'front':{'stations':front_st.tolist(),'inner':front_prof,'outer':outer}}
for sign,label in [(1,'Right'),(-1,'Left')]:
 pts=refco[(refco[:,1]>=-28)&(refco[:,0]*sign>45)&protected_mask].copy();pts[:,0]*=sign
 st=np.arange(-29,112,4.);p=profile_for(pts,st,1)
 op=[]
 for y,(lo,hi,bot,top,ch) in zip(st,p):
  op.append([lo-1.15,hi+1.15,bot-1.15,max(top+1.15,12.2 if y<=-17 else 12.2-(y+17)*.125),1.2])
 # Merge later with front to obtain one continuous exterior, without applied decorative frames.
 cavity=sweep('KEEP_OUT / '+label,st,p,1,cutcol)
 ext=st.copy();ext[0]-=1.3;ext[-1]+=1.3
 obj=sweep(label+' / faceted temple',ext,op,1)
 if sign<0:
  for ob in (cavity,obj):
   for v in ob.data.vertices:v.co.x*=-1
   bm=bmesh.new();bm.from_mesh(ob.data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(ob.data);bm.free()
 parts.append(obj);cavities.append(cavity);profiles[label]={'stations':st.tolist(),'inner':p,'outer':op}
body=parts[0]
for o in parts[1:]:boolop(body,o,'UNION');bpy.data.objects.remove(o,do_unlink=True)
for c in cavities:boolop(body,c,'DIFFERENCE');c.hide_render=True;c.hide_set(True);c.hide_select=True
# Clear the original nose-support travel through the brow wall.
for nx in [-11,11]:
 bpy.ops.mesh.primitive_cube_add(size=1,location=(nx,-38,-4)); cut=bpy.context.object;cut.dimensions=(13,22,32);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);boolop(body,cut,'DIFFERENCE');bpy.data.objects.remove(cut,do_unlink=True)
body.name='Housing_v04 / unified hollow envelope';body.data.materials.append(bodymat)
# Boolean an unobstructed aperture aligned with the original camera axis.
def cylinder(name,r,depth,loc,mat=None,rot=(math.pi/2,0,0)):
 bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=r,depth=depth,location=loc,rotation=rot);o=bpy.context.object;o.name=name
 if mat:o.data.materials.append(mat)
 return o
camx=-64.1903;camz=3.6455
aperture=cylinder('Camera optical clearance',5.0,45,(camx,-49,camz));boolop(body,aperture,'DIFFERENCE');bpy.data.objects.remove(aperture,do_unlink=True)
bezel=cylinder('Camera / concept front bezel',4.9,6.0,(camx,-50.4,camz),metal)
lens=cylinder('Camera / front optical surface',3.6,.4,(camx,-53.6,camz),glass)
lens.data.materials[0]=glass
for poly in bezel.data.polygons:poly.use_smooth=True
bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=16,radius=1,location=(camx,-53.8,camz));optic=bpy.context.object;optic.name='Camera / curved optic';optic.scale=(2.6,.65,2.6);optic.data.materials.append(glass)
for poly in optic.data.polygons:poly.use_smooth=True
# Removable top cover formed from the same housing, with a small continuous split line.
def cube(name,loc,scale,mat=None,col=base,bevel=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 for c in list(o.users_collection):c.objects.unlink(o)
 col.objects.link(o)
 if mat:o.data.materials.append(mat)
 if bevel:
  m=o.modifiers.new('Soft edges','BEVEL');m.width=bevel;m.segments=3
  m=o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
 return o
cover=body.copy();cover.data=body.data.copy();base.objects.link(cover);cover.name='Housing_v04 / removable upper cover'
clip=cube('Upper cover cut volume',(0,25,58.2),(250,250,100))
boolop(cover,clip,'INTERSECT');clip.location.z-=.16;boolop(body,clip,'DIFFERENCE');bpy.data.objects.remove(clip,do_unlink=True)
for layer in scene.view_layers:layer.material_override=None
for ob in [body,cover]:
 ob.data.materials.clear();ob.data.materials.append(bodymat)
 for poly in ob.data.polygons:poly.material_index=0;poly.use_smooth=True
 bm=bmesh.new();bm.from_mesh(ob.data)
 for e in bm.edges:
  if e.is_manifold:e.smooth=e.calc_face_angle()<math.radians(25)
 bm.to_mesh(ob.data);bm.free()
 bevel=ob.modifiers.new('Edge micro-radius / visual finish','BEVEL');bevel.width=.18;bevel.segments=3
 bevel=ob.modifiers.new('Face normals','WEIGHTED_NORMAL');bevel.keep_sharp=True
 ob['status']='Envelope prototype; no validated fasteners, physical scale or print tolerances.'
# Preserve actual source nose-support geometry, rather than invent internal electronics.
noseids=np.where(np.isin(reflabel,[64,69,70,72,363,364,370,371,418,419,533,534,588,589]))[0];nmap={int(v):j for j,v in enumerate(noseids)};nfaces=[tuple(nmap[v] for v in f) for f in fs if f[0] in nmap]
nose=mesh('SOURCE / original nose supports',refco[noseids].tolist(),nfaces);nose.data.materials.append(rubber)
for p in nose.data.polygons:p.use_smooth=True
# Keep-out validation: intersect new housing triangles with the actual original source triangles.
# This is geometry clearance only, not a real-world assembly/thermal/wiring certification.
def bv(ob):return BVHTree.FromPolygons([tuple(v.co) for v in ob.data.vertices],[tuple(p.vertices) for p in ob.data.polygons],all_triangles=False,epsilon=0)
protected_faces=[f for f in fs if protected_mask[f[0]]]
ref_tree=BVHTree.FromPolygons(refco.tolist(),protected_faces,epsilon=0);collision={}
for ob in [body,cover]:collision[ob.name]=len(bv(ob).overlap(ref_tree))
def topology(ob):
 bm=bmesh.new();bm.from_mesh(ob.data);r={'vertices':len(bm.verts),'faces':len(bm.faces),'boundary_edges':sum(e.is_boundary for e in bm.edges),'nonmanifold_edges':sum(not e.is_manifold for e in bm.edges),'signed_volume':bm.calc_volume(signed=True)};bm.free();return r
report={'version':'0.4.0','design':'Approved lightweight Continuous Facets','source_units':'unverified; preserved without asserting mm','reference_vertices':len(refco),'reference_faces':len(fs),'coordinate_translation':[151.02978515625,0,0],'source_geometry_preserved':True,'replaced_source_skin_patches':replaced_skin,'protected_reference_vertices':int(protected_mask.sum()),'nominal_envelope_margin_source_units':.45,'nominal_shell_expansion_source_units':1.15,'base_mesh_source_intersection_pairs':collision,'topology':{o.name:topology(o) for o in [body,cover]},'limitations':['Source scale is not calibrated.','Internal parts are not reliably identified.','No measured battery/PCB/cable assembly verification.','Envelope test is not manufacturing clearance certification.','Cover fastening and assembly path need mechanical design.','Bezel is a visual concept; optics require physical alignment validation.']}
(OUT/'validation.json').write_text(json.dumps(report,indent=2));(OUT/'profiles.json').write_text(json.dumps(profiles,indent=2));print('REPORT',json.dumps(report),flush=True)
# Editable scene, scale preserved to retain original geometry alignment.
floor_mat=material('Warm mineral studio',(.54,.51,.45),0,.73)
floor=cube('Studio surface',(0,0,-28.5),(20000,20000,2),floor_mat,studio)
world=bpy.data.worlds.new('Soft neutral studio');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.42,.46,.5,1);world.node_tree.nodes['Background'].inputs[1].default_value=.4;scene.world=world
for name,loc,power,size in [('Large softbox',(-150,-170,240),2100000,185),('Front fill',(190,-60,130),1400000,140),('Long rim',(40,180,170),2400000,160)]:
 d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;o=bpy.data.objects.new(name,d);studio.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,20,0))-o.location).to_track_quat('-Z','Y').to_euler()
cdata=bpy.data.cameras.new('Product camera');camera=bpy.data.objects.new('Product camera',cdata);studio.objects.link(camera);scene.camera=camera;cdata.type='ORTHO';cdata.ortho_scale=245;cdata.clip_end=50000
scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.use_denoising=True;scene.render.resolution_x=1800;scene.render.resolution_y=1300;scene.render.resolution_percentage=100;scene.view_settings.view_transform='AgX';scene.unit_settings.system='NONE'
scene['version']='0.4.0';scene['fit_status']='Source-envelope study only. See validation.json before engineering or printing.'
scene['asset_kind']='Actual editable mesh; renders are synthetic visualization, not documentary photos.'
def view(loc,target=(0,23,-3),scale=245):
 camera.location=loc;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler();cdata.ortho_scale=scale
view((-240,-285,210),scale=275)
for area in bpy.context.screen.areas:
 if area.type=='VIEW_3D':
  s=area.spaces.active;s.shading.type='MATERIAL' if False else 'SOLID';s.shading.color_type='MATERIAL';s.shading.show_cavity=True;s.overlay.show_overlays=False;s.region_3d.view_location=Vector((0,23,-3));s.region_3d.view_rotation=camera.rotation_euler.to_quaternion();s.region_3d.view_distance=260;s.region_3d.view_perspective='ORTHO'
for o in studio.objects:o.hide_set(True)
bpy.ops.object.select_all(action='DESELECT');body.select_set(True);bpy.context.view_layer.objects.active=body
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'AI_Glasses_Continuous_Facets_v0.4.blend'),compress=True)
if not os.environ.get('AIGLASSES_SKIP_PREVIEW'):
 scene.render.filepath=str(OUT/'01_hero.png');bpy.ops.render.render(write_still=True)
 view((0,-2000,152),(0,12,-4),240);scene.render.filepath=str(OUT/'02_front.png');bpy.ops.render.render(write_still=True)
 view((-2000,25,196),(0,25,-4),230);scene.render.filepath=str(OUT/'03_side.png');bpy.ops.render.render(write_still=True)
