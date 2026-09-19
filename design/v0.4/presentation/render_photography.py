"""Native Blender photography study. Product geometry is unchanged from v0.4.
Run against design/v0.4/AI_Glasses_Continuous_Facets_v0.4.blend.
Tool prop is generic, informed by Wera's public precision-driver photography.
"""
import bpy, math, json, hashlib, struct
from pathlib import Path
from mathutils import Vector
OUT=Path(__file__).resolve().parent
scene=bpy.context.scene;cam=scene.camera
product=bpy.data.collections['01_DESIGN_V04']
def signature():
 h=hashlib.sha256()
 for o in sorted(product.objects,key=lambda x:x.name):
  if o.type=='MESH':
   h.update(o.name.encode())
   for v in o.data.vertices:h.update(struct.pack('3d',*v.co))
   for p in o.data.polygons:h.update(str(tuple(p.vertices)).encode())
 return h.hexdigest()
before=signature()
props=bpy.data.collections.new('Photography set / generic props');scene.collection.children.link(props)
def relink(o):
 for c in list(o.users_collection):c.objects.unlink(o)
 props.objects.link(o);return o
def mat(name,c,rough=.5,metal=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*c,1);b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=(*c,1);b.inputs['Roughness'].default_value=rough;b.inputs['Metallic'].default_value=metal;return m
def texture(m,scale,strength,dist,roughlo,roughhi):
 n=m.node_tree.nodes;l=m.node_tree.links;b=n.get('Principled BSDF');tc=n.new('ShaderNodeTexCoord');no=n.new('ShaderNodeTexNoise');no.inputs['Scale'].default_value=scale;no.inputs['Detail'].default_value=2;l.new(tc.outputs['Generated'],no.inputs['Vector']);bu=n.new('ShaderNodeBump');bu.inputs['Strength'].default_value=strength;bu.inputs['Distance'].default_value=dist;l.new(no.outputs['Fac'],bu.inputs['Height']);l.new(bu.outputs['Normal'],b.inputs['Normal']);ra=n.new('ShaderNodeMapRange');ra.inputs['From Min'].default_value=0;ra.inputs['From Max'].default_value=1;ra.inputs['To Min'].default_value=roughlo;ra.inputs['To Max'].default_value=roughhi;l.new(no.outputs['Fac'],ra.inputs['Value']);l.new(ra.outputs[0],b.inputs['Roughness'])
def cube(name,loc,dims,m,bevel=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=relink(bpy.context.object);o.name=name;o.dimensions=dims;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m)
 if bevel:b=o.modifiers.new('Machined edge','BEVEL');b.width=bevel;b.segments=4;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
 return o
def cyl(name,loc,r,depth,m):
 bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=r,depth=depth,location=loc);o=relink(bpy.context.object);o.name=name;o.data.materials.append(m)
 for p in o.data.polygons:p.use_smooth=True
 b=o.modifiers.new('Edge micro radius','BEVEL');b.width=min(.18,r*.08);b.segments=3;return o
def text(name,body,loc,size,m,angle=0):
 c=bpy.data.curves.new(name,'FONT');c.body=body;c.size=size;c.extrude=0;c.align_x='LEFT';o=bpy.data.objects.new(name,c);props.objects.link(o);o.location=loc;o.rotation_euler.z=angle;o.data.materials.append(m);return o
# A fine molded-polymer finish, not the overly uniform metallic grey of the earlier study.
poly=mat('Satin graphite polymer',(0.034,.041,.046),.43,.02);texture(poly,280,.13,.035,.39,.48)
for o in product.objects:
 if o.name.startswith('Housing_v04'):o.data.materials[0]=poly
body=bpy.data.objects['Housing_v04 / unified hollow envelope'];z=min(v.co.z for v in body.data.vertices)-.08
floor=bpy.data.objects['Studio surface'];floor.location.z=z-1
stone=mat('Warm matte work surface',(.33,.31,.28),.73);texture(stone,190,.15,.055,.68,.78);floor.data.materials[0]=stone
# Intentional window-like key, broad low fill and slender rim; real area-light shadows.
for o in list(bpy.data.objects):
 if o.type=='LIGHT':bpy.data.objects.remove(o,do_unlink=True)
def light(name,loc,target,power,size,sy,color):
 d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='RECTANGLE';d.size=size;d.size_y=sy;d.color=color;o=bpy.data.objects.new(name,d);props.objects.link(o);o.location=loc;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
light('Window key',(-210,-170,310),(0,20,-5),2100000,210,300,(1,.92,.82))
light('Cool reflected fill',(180,-35,180),(0,20,-5),360000,220,260,(.82,.9,1))
light('Long edge reflection',(60,250,220),(0,30,0),1100000,90,270,(1,.96,.9))
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.7,.76,.85,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.18
scene.render.engine='CYCLES';scene.cycles.samples=128;scene.cycles.use_denoising=True;scene.render.resolution_x=2400;scene.render.resolution_y=1600;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX';scene.view_settings.exposure=.45
cam.data.type='PERSP';cam.data.lens=65;cam.data.clip_end=10000
focus=bpy.data.objects.new('Focus at product',None);props.objects.link(focus);focus.location=(0,25,-4);cam.data.dof.use_dof=True;cam.data.dof.focus_object=focus;cam.data.dof.aperture_fstop=8
# Scene uses preserved source coordinates: lens aperture scaled for photographic depth of field only.
cam.data.dof.aperture_fstop=.045
paper=mat('Uncoated paper',(.78,.76,.7),.84);texture(paper,220,.1,.025,.78,.89)
ink=mat('Charcoal printing',(.045,.055,.06),.82)
matgreen=mat('Desaturated green cutting mat',(.075,.135,.124),.82);texture(matgreen,150,.13,.025,.75,.86)
mark=mat('Muted screenprinted grid',(.23,.33,.29),.9)
steel=mat('Tool brushed stainless',(.48,.52,.55),.26,.92);texture(steel,300,.06,.008,.21,.32)
rubber=mat('Tool elastomer',(.023,.028,.032),.63);texture(rubber,180,.1,.02,.58,.69)
accent=mat('Tool muted teal grip',(.048,.24,.19),.59)
# Mat is placed beside the product, not through its support plane.
board=cube('A5 service mat',(161,35,z+.9),(125,230,1.8),matgreen,2)
for i in range(12):cube('Printed mat grid',(106+i*10,35,z+1.82),(.16,215,.018),mark)
for i in range(22):cube('Printed mat grid',(161,-70+i*10,z+1.82),(110,.16,.018),mark)
for i in range(0,11,2):text('Grid numbers',str(i*10),(107+i*10,-76,z+1.84),2.6,mark)
# Realistic lathed screwdriver profile: fine tip, steel shaft, precision neck,
# flared anti-roll grip, narrow fast-turn neck and separated rotating cap.
origin=Vector((143,-60,z+9.1));q=Vector((.11,1,0)).normalized().to_track_quat('Z','Y')
def lathe(name,profile,m,lobes=0):
 vs=[];fs=[];N=64
 for h,r in profile:
  for j in range(N):
   a=2*math.pi*j/N;rr=r*(1+.045*math.cos(6*a)) if lobes else r;vs.append(tuple(origin+q@Vector((rr*math.cos(a),rr*math.sin(a),h))))
 for i in range(len(profile)-1):
  for j in range(N):a=i*N+j;b=i*N+(j+1)%N;fs.append((a,b,b+N,a+N))
 fs.append(tuple(reversed(range(N))));fs.append(tuple((len(profile)-1)*N+j for j in range(N)))
 me=bpy.data.meshes.new(name);me.from_pydata(vs,[],fs);me.update();o=bpy.data.objects.new(name,me);props.objects.link(o);o.data.materials.append(m)
 for p in me.polygons:p.use_smooth=True
 return o
lathe('Driver metal shaft',[(0,1.3),(54,1.3),(55,2.0)],steel)
lathe('Dark precision tip',[(-7,.28),(-4,1.1),(0,1.3)],rubber)
lathe('Contoured driver grip',[(55,2.8),(58,4.4),(62,5.3),(68,4.8),(77,4.3),(89,5.3),(95,4.2),(104,3.1),(127,3.1),(129,4.4)],rubber,6)
for a,b,r in [(63,66,5.15),(80,84,4.8),(91,94,4.9)]:lathe('Soft grip band',[(a,r-.2),(a+.6,r),(b-.6,r),(b,r-.2)],accent,6)
lathe('Rotating cap separation',[(129.2,3.8),(130,3.8)],steel)
lathe('Rotating finger cap',[(130.3,4.3),(132,5.4),(135,6.2),(137,6.1),(138,4.8)],rubber)
# Thin steel tweezers, with actual paired arms and pointed jaws.
for dx in [-2,2]:
 o=cube('Precision tweezer arm',(192+dx,45,z+3),(1.1,100,1),steel,.25);o.rotation_euler.z=-dx*.017
cube('Tweezers joined heel',(192,95,z+3),(5.6,3,1),steel,.35)
# A paper process card gives an honest making context without invented electronics.
card=cube('Assembly notes',(-155,63,z+.35),(84,120,.6),paper,.4);text('Card heading','BUILD / LEARN',(-191,110,z+.67),5,ink)
for i,t in enumerate(['01  Check dimensions','02  Review housing','03  Test guidance','04  Share the method']):text('Checklist',t,(-190,94-i*13,z+.67),3.1,ink)
text('Card footer','v0.4  /  DESIGN STUDY',(-190,19,z+.67),2.6,ink)
def shot(name,loc,target,lens):
 cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=lens;focus.location=target;scene.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True);print('SHOT',name,flush=True)
shot('10_workbench_photography',(-400,-520,570),(-10,24,-7),55)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'Photography_Workbench_v0.4.blend'),compress=True)
# Close product photograph with quieter background and no accessory clutter.
for o in props.objects:
 if o.type not in {'LIGHT','EMPTY'}:o.hide_render=True
cam.data.dof.aperture_fstop=.075
shot('11_material_detail',(-305,-365,195),(-8,6,-3),75)
assert before==signature(),'Product mesh changed'
(OUT/'photography_manifest.json').write_text(json.dumps({'model':'Approved v0.4','product_mesh_sha256_before':before,'product_mesh_sha256_after':signature(),'geometry_unchanged':True,'type':'Native Blender CGI, not a physical prototype photo','tool_reference':'https://www.wera.de/en-nz/tools/2050-ph-screwdriver-for-phillips-screws-for-electronic-applications','prop_scope':'Generic illustration; not supplied hardware or claimed measured BOM','photography':['Perspective camera','Area lights','Material roughness variation','Fine procedural bump','Depth of field'],'images':['10_workbench_photography.png','11_material_detail.png']},indent=2))
