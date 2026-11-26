from PIL import Image, ImageDraw, ImageFont
import os, sys
root, out = sys.argv[1], sys.argv[2]
s = os.path.join(root, "src/assets/art/icons_source")
ib = s + "/items/item_base/"; wb = s + "/items/weapon_base/"
equip = [ib+"amulet_2.png", ib+"gloves_leather_1.png", wb+"axe/hand_axe.png", ib+"boots_leather_1.png"]
rows = [("now", [s+"/materials/ores/ore_t2.png", s+"/materials/herbs/herb_t1.png", s+"/materials/timbers/timber_t1.png", s+"/currency/dust.png"])]
for k in ["a_style_1","a_style_2","b_redraw_1","b_redraw_2"]:
    rows.append((k, [os.path.join(out,"cut",f"{k}_{c}.png") for c in ("r1c1","r1c2","r2c1","r2c2")]))
BG=(30,27,33); CELL=(46,41,50)
def board(S, path):
    pad=6; lab=150
    W = lab + 8*(S+pad) + 20; H = len(rows)*(S+pad) + pad
    im = Image.new("RGB",(W,H),BG); d = ImageDraw.Draw(im)
    try: f = ImageFont.truetype("arial.ttf", 18)
    except: f = None
    for r,(name,files) in enumerate(rows):
        y = pad + r*(S+pad)
        d.text((8, y+S//2-9), name, fill=(220,220,220), font=f)
        for i,fp in enumerate(files+equip):
            x = lab + i*(S+pad) + (20 if i>=4 else 0)
            d.rectangle([x,y,x+S-1,y+S-1], fill=CELL)
            t = Image.open(fp).convert("RGBA").resize((S,S), Image.LANCZOS)
            im.paste(t,(x,y),t)
    im.save(path); print(path, im.size)
board(96, os.path.join(out,"board_96.png"))
board(40, os.path.join(out,"board_40.png"))
