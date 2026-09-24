Add-Type -AssemblyName System.Drawing

$source = @'
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;

public static class MasterySealMockup
{
    static readonly Color Bg = ColorTranslator.FromHtml("#191b24");
    static readonly Color Cell = ColorTranslator.FromHtml("#242630");
    static readonly Color Metal = ColorTranslator.FromHtml("#cdbb92");
    static readonly Color Edge = ColorTranslator.FromHtml("#7d6a48");
    static readonly Color Text = ColorTranslator.FromHtml("#e5e5ed");
    static readonly Color Muted = ColorTranslator.FromHtml("#9a9ba7");

    static void Line(Graphics g, Pen p, params PointF[] points)
    {
        if (points.Length > 1) g.DrawLines(p, points);
    }

    static void Seal(Graphics g, float x, float y, float size, int kind, bool chrome = true)
    {
        var state = g.Save();
        g.TranslateTransform(x, y);
        g.ScaleTransform(size / 100f, size / 100f);

        if (chrome)
        {
            using (var fill = new SolidBrush(Cell)) g.FillRectangle(fill, 0, 0, 100, 100);
            using (var border = new Pen(Edge, 1.2f)) g.DrawRectangle(border, 0.6f, 0.6f, 98.8f, 98.8f);
        }
        using (var ring = new Pen(Metal, 1.9f)) g.DrawEllipse(ring, 14, 14, 72, 72);
        using (var pen = new Pen(Metal, 4.1f))
        using (var brush = new SolidBrush(Metal))
        {
            pen.StartCap = LineCap.Round;
            pen.EndCap = LineCap.Round;
            pen.LineJoin = LineJoin.Round;

            if (kind == 0) // Swiftness: an engraved speed dial, no weapon or motion trail
            {
                g.DrawArc(pen, 32, 36, 36, 36, 184, 172);
                using (var fine = new Pen(Metal, 2.7f))
                {
                    fine.StartCap = LineCap.Round;
                    fine.EndCap = LineCap.Round;
                    g.DrawLine(fine, 34, 56, 39, 55);
                    g.DrawLine(fine, 42, 43, 44, 48);
                    g.DrawLine(fine, 58, 43, 56, 48);
                    g.DrawLine(fine, 66, 56, 61, 55);
                }
                g.DrawLine(pen, 50, 59, 60, 45);
                g.FillEllipse(brush, 46.5f, 55.5f, 7, 7);
            }
            else if (kind == 1) // Assault: three rising stone facets, no sword or impact burst
            {
                PointF[] left = { new PointF(31, 66), new PointF(31, 53), new PointF(40, 43), new PointF(40, 66) };
                PointF[] center = { new PointF(45, 66), new PointF(45, 38), new PointF(50, 31), new PointF(55, 38), new PointF(55, 66) };
                PointF[] right = { new PointF(60, 66), new PointF(60, 47), new PointF(69, 38), new PointF(69, 66) };
                g.FillPolygon(brush, left);
                g.FillPolygon(brush, center);
                g.FillPolygon(brush, right);
            }
            else // Vitality: a seed held by two leaves, no heart or healing cross
            {
                g.FillEllipse(brush, 45, 36, 10, 19);
                using (var path = new GraphicsPath())
                {
                    path.AddBezier(49, 66, 38, 60, 31, 52, 33, 42);
                    path.AddBezier(33, 42, 43, 46, 47, 51, 49, 66);
                    g.FillPath(brush, path);
                }
                using (var path = new GraphicsPath())
                {
                    path.AddBezier(51, 66, 62, 60, 69, 52, 67, 42);
                    path.AddBezier(67, 42, 57, 46, 53, 51, 51, 66);
                    g.FillPath(brush, path);
                }
            }
        }

        if (chrome)
        {
            using (var badge = new SolidBrush(Bg)) g.FillRectangle(badge, 73, 85, 24, 12);
            using (var badgeText = new SolidBrush(Muted))
            using (var font = new Font("Arial", 8, FontStyle.Regular, GraphicsUnit.Pixel))
                g.DrawString("0/5", font, badgeText, 76, 86);
        }
        g.Restore(state);
    }

    public static void RenderAssets(string directory)
    {
        string[] names = { "aspd_pct_seal.png", "atk_pct_seal.png", "hp_pct_seal.png" };
        for (int i = 0; i < names.Length; i++)
        {
            using (var bmp = new Bitmap(256, 256, PixelFormat.Format32bppArgb))
            using (var g = Graphics.FromImage(bmp))
            {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                g.Clear(Color.Transparent);
                Seal(g, 0, 0, 256, i, false);
                bmp.Save(System.IO.Path.Combine(directory, names[i]), ImageFormat.Png);
            }
        }
    }

    public static void Render(string output)
    {
        using (var bmp = new Bitmap(920, 430))
        using (var g = Graphics.FromImage(bmp))
        using (var bg = new SolidBrush(Bg))
        using (var white = new SolidBrush(Text))
        using (var muted = new SolidBrush(Muted))
        using (var title = new Font("Malgun Gothic", 19, FontStyle.Bold, GraphicsUnit.Pixel))
        using (var label = new Font("Malgun Gothic", 15, FontStyle.Bold, GraphicsUnit.Pixel))
        using (var small = new Font("Malgun Gothic", 12, FontStyle.Regular, GraphicsUnit.Pixel))
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.TextRenderingHint = System.Drawing.Text.TextRenderingHint.AntiAliasGridFit;
            g.FillRectangle(bg, 0, 0, bmp.Width, bmp.Height);
            g.DrawString("마스터리 문장 시안", title, white, 50, 25);
            g.DrawString("같은 봉인선 · 정면 문양 · 청동색 / 사각 칸과 랭크 표시는 유지", small, muted, 52, 57);

            string[] names = { "신속", "맹공", "활력" };
            string[] notes = { "속도 눈금", "솟는 각면", "씨앗과 잎" };
            for (int i = 0; i < 3; i++)
            {
                float cx = 170 + i * 290;
                Seal(g, cx - 87, 95, 174, i);
                var nameSize = g.MeasureString(names[i], label);
                g.DrawString(names[i], label, white, cx - nameSize.Width / 2, 282);
                var noteSize = g.MeasureString(notes[i], small);
                g.DrawString(notes[i], small, muted, cx - noteSize.Width / 2, 307);

                Seal(g, cx - 29, 347, 58, i);
            }
            g.DrawString("실제 칸 크기 근사", small, muted, 50, 390);
            bmp.Save(output, ImageFormat.Png);
        }
    }
}
'@

Add-Type -TypeDefinition $source -ReferencedAssemblies System.Drawing
[MasterySealMockup]::Render((Join-Path $PSScriptRoot 'mastery_seal_mockup.png'))
[MasterySealMockup]::RenderAssets((Join-Path $PSScriptRoot '..\src\assets\art\icons\mastery'))
