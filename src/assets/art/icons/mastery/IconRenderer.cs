using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Globalization;

// Deterministic, editable base art. Coordinates are in a 100 x 100 design grid.
public static class MasteryIconRenderer
{
    static Color Bronze = Color.FromArgb(211, 183, 125);
    static Color Light = Color.FromArgb(238, 215, 162);
    static Color Shade = Color.FromArgb(111, 75, 42);
    static Color Recess = Color.FromArgb(178, 30, 25, 24);

    static void UseColors(Color metal, Color light, Color shade, Color recess)
    {
        Bronze = metal;
        Light = light;
        Shade = shade;
        Recess = recess;
    }

    static Color Mix(Color from, Color to, double ratio)
    {
        return Color.FromArgb(
            (int)Math.Round(from.R + (to.R - from.R) * ratio),
            (int)Math.Round(from.G + (to.G - from.G) * ratio),
            (int)Math.Round(from.B + (to.B - from.B) * ratio));
    }

    static void SetPalette(string palette)
    {
        // Job colors are stored in class.csv. Derive the highlight and engraved recess
        // from that single color so all four strokes stay in the same material family.
        if (!String.IsNullOrEmpty(palette) && palette[0] == '#')
        {
            int rgb;
            if (palette.Length != 7 || !Int32.TryParse(palette.Substring(1), NumberStyles.HexNumber,
                CultureInfo.InvariantCulture, out rgb))
                throw new ArgumentException("Invalid mastery color: " + palette);
            Color metal = Color.FromArgb((rgb >> 16) & 255, (rgb >> 8) & 255, rgb & 255);
            Color shade = Mix(metal, Color.Black, 0.60);
            UseColors(metal, Mix(metal, Color.White, 0.44), shade,
                Color.FromArgb(178, shade.R / 2, shade.G / 2, shade.B / 2));
            return;
        }
        switch (palette ?? "")
        {
            case "":
            case "bronze":
                UseColors(Color.FromArgb(211, 183, 125), Color.FromArgb(238, 215, 162),
                    Color.FromArgb(111, 75, 42), Color.FromArgb(178, 30, 25, 24));
                break;
            case "wrath":
                UseColors(Color.FromArgb(224, 48, 48), Color.FromArgb(255, 143, 120),
                    Color.FromArgb(91, 21, 25), Color.FromArgb(178, 35, 9, 14));
                break;
            case "envy":
                UseColors(Color.FromArgb(48, 176, 80), Color.FromArgb(139, 227, 154),
                    Color.FromArgb(24, 86, 42), Color.FromArgb(178, 14, 30, 18));
                break;
            case "greed":
                UseColors(Color.FromArgb(208, 160, 32), Color.FromArgb(246, 217, 111),
                    Color.FromArgb(100, 76, 18), Color.FromArgb(178, 36, 28, 11));
                break;
            case "sloth":
                UseColors(Color.FromArgb(128, 136, 152), Color.FromArgb(198, 206, 219),
                    Color.FromArgb(61, 67, 79), Color.FromArgb(178, 22, 25, 30));
                break;
            case "gluttony":
                UseColors(Color.FromArgb(224, 112, 32), Color.FromArgb(255, 184, 103),
                    Color.FromArgb(109, 51, 16), Color.FromArgb(178, 37, 19, 9));
                break;
            case "lust":
                UseColors(Color.FromArgb(224, 48, 128), Color.FromArgb(255, 147, 193),
                    Color.FromArgb(106, 20, 59), Color.FromArgb(178, 36, 10, 23));
                break;
            case "pride":
                UseColors(Color.FromArgb(128, 64, 224), Color.FromArgb(191, 144, 255),
                    Color.FromArgb(58, 26, 112), Color.FromArgb(178, 26, 13, 42));
                break;
            default:
                throw new ArgumentException("Unknown mastery palette: " + palette);
        }
    }

    static Pen Pen(Color color, float width)
    {
        Pen p = new Pen(color, width);
        p.StartCap = LineCap.Round;
        p.EndCap = LineCap.Round;
        p.LineJoin = LineJoin.Round;
        return p;
    }

    static PointF Pt(float x, float y) { return new PointF(x, y); }
    static void Stroke(Graphics g, Pen dark, Pen metal, params float[] xy)
    {
        PointF[] p = new PointF[xy.Length / 2];
        for (int i = 0; i < p.Length; i++) p[i] = Pt(xy[i * 2], xy[i * 2 + 1]);
        if (p.Length > 1) { g.DrawLines(dark, p); g.DrawLines(metal, p); }
    }
    static void Shape(Graphics g, Pen dark, Pen metal, Brush fill, params float[] xy)
    {
        PointF[] p = new PointF[xy.Length / 2];
        for (int i = 0; i < p.Length; i++) p[i] = Pt(xy[i * 2], xy[i * 2 + 1]);
        g.FillPolygon(fill, p);
        g.DrawPolygon(dark, p);
        g.DrawPolygon(metal, p);
    }
    static void Orb(Graphics g, Pen dark, Pen metal, float x, float y, float w, float h)
    {
        g.DrawEllipse(dark, x, y, w, h);
        g.DrawEllipse(metal, x, y, w, h);
    }
    static void Shield(Graphics g, Pen d, Pen p)
    {
        using (Brush fill = new SolidBrush(Recess))
            Shape(g, d, p, fill, 50,30, 65,36, 63,58, 50,69, 37,58, 35,36);
        Stroke(g, d, p, 40,40, 50,36, 60,40);
    }
    static void Dial(Graphics g, Pen d, Pen p)
    {
        g.DrawArc(d, 32, 36, 36, 36, 184, 172);
        g.DrawArc(p, 32, 36, 36, 36, 184, 172);
        Stroke(g, d, p, 35,56, 39,55);
        Stroke(g, d, p, 42,44, 44,48);
        Stroke(g, d, p, 58,44, 56,48);
        Stroke(g, d, p, 65,56, 61,55);
        Stroke(g, d, p, 50,59, 60,45);
        using (Brush b = new SolidBrush(Light)) g.FillEllipse(b, 47, 56, 6, 6);
    }
    static void Facets(Graphics g, Pen d, Pen p)
    {
        using (Brush fill = new SolidBrush(Bronze))
        {
            Shape(g, d, p, fill, 31,66, 31,53, 40,43, 40,66);
            Shape(g, d, p, fill, 45,66, 45,38, 50,31, 55,38, 55,66);
            Shape(g, d, p, fill, 60,66, 60,47, 69,38, 69,66);
        }
        Stroke(g, d, p, 29,70, 71,70);
    }
    static void Seed(Graphics g, Pen d, Pen p)
    {
        using (Brush metal = new SolidBrush(Bronze))
        using (Brush glint = new SolidBrush(Light))
        {
            g.FillEllipse(metal, 45,36,10,19);
            g.FillEllipse(glint, 47,38,3,10);
            Shape(g, d, p, metal, 49,67, 32,54, 32,44, 42,47, 49,55);
            Shape(g, d, p, metal, 51,67, 68,54, 68,44, 58,47, 51,55);
        }
    }
    static void Star(Graphics g, Pen d, Pen p)
    {
        using (Brush fill = new SolidBrush(Bronze))
            Shape(g, d, p, fill, 50,30, 55,45, 70,50, 55,55, 50,70, 45,55, 30,50, 45,45);
        using (Brush b = new SolidBrush(Shade)) g.FillEllipse(b, 46,46,8,8);
    }
    static void Gem(Graphics g, Pen d, Pen p)
    {
        using (Brush fill = new SolidBrush(Recess))
            Shape(g, d, p, fill, 50,29, 69,50, 50,71, 31,50);
        Stroke(g, d, p, 31,50, 69,50);
        Stroke(g, d, p, 50,29, 50,71);
    }
    static void Hourglass(Graphics g, Pen d, Pen p)
    {
        Stroke(g, d, p, 37,32, 63,32);
        Stroke(g, d, p, 37,68, 63,68);
        Stroke(g, d, p, 39,34, 50,49, 61,34);
        Stroke(g, d, p, 39,66, 50,51, 61,66);
        using (Brush fill = new SolidBrush(Bronze))
            Shape(g, d, p, fill, 42,61, 50,55, 58,61);
    }
    static void Drop(Graphics g, Pen d, Pen p)
    {
        using (Brush fill = new SolidBrush(Bronze))
            Shape(g, d, p, fill, 50,30, 61,49, 62,57, 57,65, 50,68, 43,65, 38,57, 39,49);
        using (Brush b = new SolidBrush(Light)) g.FillEllipse(b, 43,51,4,8);
    }
    static void Armor(Graphics g, Pen d, Pen p)
    {
        using (Brush fill = new SolidBrush(Recess))
            Shape(g, d, p, fill, 32,38, 42,32, 50,40, 58,32, 68,38, 62,67, 38,67);
        Stroke(g, d, p, 42,45, 50,50, 58,45);
        Stroke(g, d, p, 50,50, 50,64);
    }
    static void Weapon(Graphics g, Pen d, Pen p)
    {
        Stroke(g, d, p, 50,60, 50,72);
        Stroke(g, d, p, 40,61, 60,61);
        using (Brush fill = new SolidBrush(Bronze))
            Shape(g, d, p, fill, 50,27, 56,36, 54,57, 46,57, 44,36);
    }
    static void Ward(Graphics g, Pen d, Pen p)
    {
        Shield(g, d, p);
        Stroke(g, d, p, 50,44, 50,60);
        Stroke(g, d, p, 43,51, 57,51);
    }

    static void Glyph(Graphics g, string key, Pen d, Pen p)
    {
        switch (key)
        {
            case "speed_dial": Dial(g,d,p); break;
            case "rising_facets": Facets(g,d,p); break;
            case "living_seed": Seed(g,d,p); break;
            case "focused_star": Star(g,d,p); break;
            case "split_diamond": Gem(g,d,p); Stroke(g,d,p,45,39, 55,61); break;
            case "pierced_shield": Shield(g,d,p); Stroke(g,d,p,50,25, 50,73); Stroke(g,d,p,44,44, 56,44); break;
            case "mirrored_blades":
                Stroke(g,d,p,31,31, 45,56, 53,64);
                Stroke(g,d,p,69,31, 55,56, 47,64);
                Stroke(g,d,p,29,39, 36,35); Stroke(g,d,p,71,39, 64,35); break;
            case "broken_ward": Shield(g,d,p); Stroke(g,d,p,51,35, 45,47, 55,53, 48,66); break;
            case "coin_stack":
                for (int i=0; i<3; i++) { Orb(g,d,p,34,48-i*7,32,11); Stroke(g,d,p,34,53-i*7,34,60-i*7, 66,60-i*7,66,53-i*7); } break;
            case "search_lens": Orb(g,d,p,34,31,28,28); Stroke(g,d,p,59,57,70,69); Stroke(g,d,p,45,36,51,36); break;
            case "faceted_gem": Gem(g,d,p); Stroke(g,d,p,31,50,42,40,58,40,69,50); break;
            case "solid_ward": Ward(g,d,p); break;
            case "short_hourglass": Hourglass(g,d,p); break;
            case "renewing_sprout":
                Stroke(g,d,p,50,69,50,42);
                using (Brush b = new SolidBrush(Bronze)) {
                    Shape(g,d,p,b,49,51,31,43,35,34,46,37,51,46);
                    Shape(g,d,p,b,51,48,69,39,65,31,54,35,49,43);
                } break;
            case "cracked_stone":
                using (Brush b = new SolidBrush(Recess)) Shape(g,d,p,b,35,33,64,33,68,65,32,65);
                Stroke(g,d,p,53,33,48,45,55,51,45,65); break;
            case "four_wards":
                using (Brush b = new SolidBrush(Bronze)) {
                    Shape(g,d,p,b,50,29,57,39,50,49,43,39);
                    Shape(g,d,p,b,69,48,59,55,49,48,59,41);
                    Shape(g,d,p,b,50,69,57,59,50,49,43,59);
                    Shape(g,d,p,b,31,48,41,55,51,48,41,41);
                } break;
            case "drawn_drop": Drop(g,d,p); Stroke(g,d,p,30,49,38,49); Stroke(g,d,p,62,49,70,49); break;
            case "restoring_flask":
                using (Brush b = new SolidBrush(Recess)) Shape(g,d,p,b,44,31,56,31,55,42,64,61,59,69,41,69,36,61,45,42);
                Stroke(g,d,p,43,53,57,53); Stroke(g,d,p,47,59,53,59); break;
            case "double_ward": Ward(g,d,p); Orb(g,d,p,42,42,16,16); break;
            case "steadfast_pillar":
                using (Brush b = new SolidBrush(Recess)) Shape(g,d,p,b,42,32,58,32,57,66,43,66);
                Stroke(g,d,p,35,69,65,69); Stroke(g,d,p,39,31,61,31); Stroke(g,d,p,39,45,32,55); Stroke(g,d,p,61,45,68,55); break;
            case "armor_plate": Armor(g,d,p); break;
            case "sustained_flame":
                using (Brush b = new SolidBrush(Bronze)) Shape(g,d,p,b,50,28,56,41,54,49,62,39,64,54,59,65,50,70,41,65,36,54,41,43,44,51);
                Stroke(g,d,p,31,36,31,64); Stroke(g,d,p,69,36,69,64); break;
            case "bullseye": Orb(g,d,p,31,31,38,38); Orb(g,d,p,40,40,20,20); using (Brush b = new SolidBrush(Light)) g.FillEllipse(b,47,47,6,6); break;
            case "weapon_power": Weapon(g,d,p); Stroke(g,d,p,37,34,35,46); Stroke(g,d,p,63,34,65,46); break;
            case "weapon_tempo": Weapon(g,d,p); Stroke(g,d,p,32,40,37,35,42,40); Stroke(g,d,p,68,40,63,35,58,40); break;
            case "heavy_tempo": Armor(g,d,p); Stroke(g,d,p,42,52,48,58,59,44); break;
            case "robe_ward":
                using (Brush b = new SolidBrush(Recess)) Shape(g,d,p,b,43,32,50,42,57,32,67,67,33,67);
                Stroke(g,d,p,40,42,50,48,60,42); Stroke(g,d,p,50,49,50,62); break;
            case "light_vitality": Armor(g,d,p); using (Brush b = new SolidBrush(Light)) g.FillEllipse(b,46,45,8,13); break;
            default: throw new ArgumentException("Unknown mastery glyph: " + key);
        }
    }

    public static void Render(string glyph, string output, string palette)
    {
        SetPalette(palette);
        using (Bitmap bitmap = new Bitmap(256,256,PixelFormat.Format32bppArgb))
        using (Graphics g = Graphics.FromImage(bitmap))
        using (Pen ringShade = Pen(Shade,3.4f))
        using (Pen ring = Pen(Bronze,1.9f))
        using (Pen ringLight = Pen(Light,0.55f))
        using (Pen glyphShade = Pen(Shade,6.5f))
        using (Pen glyphMetal = Pen(Bronze,3.6f))
        {
            g.Clear(Color.Transparent);
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.CompositingQuality = CompositingQuality.HighQuality;
            g.ScaleTransform(2.56f,2.56f);
            // The ring remains one uninterrupted, perfectly smooth circle.
            g.DrawEllipse(ringShade,14,14,72,72);
            g.DrawEllipse(ring,14,14,72,72);
            g.DrawEllipse(ringLight,15.2f,15.2f,69.6f,69.6f);
            Glyph(g,glyph,glyphShade,glyphMetal);
            bitmap.Save(output,ImageFormat.Png);
        }
    }
}
