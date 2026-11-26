from PIL import Image
import os, sys, glob
base = r"c:\Users\user\Desktop\python_text\git\TheSevenSimulationRPG\src\assets\art\icons_source"
out = sys.argv[1]
def sheet(files, cols, S, path):
    rows=(len(files)+cols-1)//cols
    im=Image.new("RGB",(cols*S,rows*S),(255,255,255))
    for i,f in enumerate(files):
        t=Image.open(f).convert("RGBA").resize((int(S*0.9),int(S*0.9)),Image.LANCZOS)
        bg=Image.new("RGBA",t.size,(255,255,255,255)); bg.alpha_composite(t)
        o=(S-t.size[0])//2
        im.paste(bg.convert("RGB"),((i%cols)*S+o,(i//cols)*S+o))
    im.save(path); print(path, im.size)
ib=base+"/items/item_base/"
wb=base+"/items/weapon_base/"
style=[ib+"amulet_2.png", ib+"helmet_plate_1.png", wb+"axe/hand_axe.png",
       ib+"gloves_leather_1.png", ib+"armor_light_1.png", ib+"ring_1.png",
       ib+"boots_leather_1.png", glob.glob(wb+"mace/*.png")[0], glob.glob(wb+"bible/*.png")[0]]
print([os.path.basename(x) for x in style])
sheet(style,3,340,os.path.join(out,"refs","style_equipment.png"))
cur=[base+"/materials/ores/ore_t2.png",base+"/materials/herbs/herb_t1.png",base+"/materials/timbers/timber_t1.png",base+"/currency/dust.png"]
sheet(cur,2,512,os.path.join(out,"refs","current_materials.png"))
