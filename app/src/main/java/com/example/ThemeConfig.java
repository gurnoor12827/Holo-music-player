package com.example;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.ColorFilter;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.PixelFormat;
import android.graphics.PorterDuff;
import android.graphics.RadialGradient;
import android.graphics.Rect;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.drawable.ClipDrawable;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.GradientDrawable;
import android.graphics.drawable.LayerDrawable;
import android.graphics.drawable.StateListDrawable;
import android.util.TypedValue;
import android.view.Gravity;
import android.widget.ImageButton;
import android.widget.ProgressBar;
import android.widget.SeekBar;

public final class ThemeConfig {

    public static final int THEME_HOLO = 0;
    public static final int THEME_AERO = 1;
    public static final int THEME_SKEUOMORPHIC = 2;

    public final int id;
    public final String label;
    public final String subtitle;
    public final boolean isLightSurface;

    public final int bgTop;
    public final int bgBottom;
    public final int actionBarTop;
    public final int actionBarBottom;
    public final int actionBarText;
    public final int actionBarSubText;
    public final int subheaderBg;
    public final int dockTop;
    public final int dockBottom;
    public final int dockHighlight;
    public final int dividerColor;

    public final int accent;
    public final int accentSecondary;
    public final int accentDark;
    public final int onAccentText;

    public final int textPrimary;
    public final int textSecondary;
    public final int textDim;

    public final int grooveBg;
    public final int grooveBorder;
    public final int buttonTop;
    public final int buttonBottom;
    public final int buttonBorder;
    public final int rowActiveBg;

    private ThemeConfig(
            int id,
            String label,
            String subtitle,
            boolean isLightSurface,
            int bgTop,
            int bgBottom,
            int actionBarTop,
            int actionBarBottom,
            int actionBarText,
            int actionBarSubText,
            int subheaderBg,
            int dockTop,
            int dockBottom,
            int dockHighlight,
            int dividerColor,
            int accent,
            int accentSecondary,
            int accentDark,
            int onAccentText,
            int textPrimary,
            int textSecondary,
            int textDim,
            int grooveBg,
            int grooveBorder,
            int buttonTop,
            int buttonBottom,
            int buttonBorder,
            int rowActiveBg) {
        this.id = id;
        this.label = label;
        this.subtitle = subtitle;
        this.isLightSurface = isLightSurface;
        this.bgTop = bgTop;
        this.bgBottom = bgBottom;
        this.actionBarTop = actionBarTop;
        this.actionBarBottom = actionBarBottom;
        this.actionBarText = actionBarText;
        this.actionBarSubText = actionBarSubText;
        this.subheaderBg = subheaderBg;
        this.dockTop = dockTop;
        this.dockBottom = dockBottom;
        this.dockHighlight = dockHighlight;
        this.dividerColor = dividerColor;
        this.accent = accent;
        this.accentSecondary = accentSecondary;
        this.accentDark = accentDark;
        this.onAccentText = onAccentText;
        this.textPrimary = textPrimary;
        this.textSecondary = textSecondary;
        this.textDim = textDim;
        this.grooveBg = grooveBg;
        this.grooveBorder = grooveBorder;
        this.buttonTop = buttonTop;
        this.buttonBottom = buttonBottom;
        this.buttonBorder = buttonBorder;
        this.rowActiveBg = rowActiveBg;
    }

    public static final ThemeConfig HOLO = new ThemeConfig(
            THEME_HOLO,
            "Android Holo",
            "Pure #000000 background, sharp rectangular buttons, #33B5E5 cyan",
            false,
            0xFF000000,
            0xFF000000,
            0xFF0A0A0A,
            0xFF000000,
            0xFF33B5E5,
            0xFFA8B0B8,
            0xFF0A0A0A,
            0xFF111111,
            0xFF000000,
            0xFF222222,
            0xFF222222,
            0xFF33B5E5,
            0xFF33B5E5,
            0xFF0099CC,
            0xFF000000,
            0xFFFFFFFF,
            0xFFA8B0B8,
            0xFF707880,
            0xFF222222,
            0xFF2E2E2E,
            0xFF141414,
            0xFF141414,
            0xFF2D2D2D,
            0x2033B5E5
    );

    public static final ThemeConfig AERO = new ThemeConfig(
            THEME_AERO,
            "Frutiger Aero",
            "Aqua-to-mint #0078D7/#5CE65C sky gradients, light rays, bokeh glass & glossy pills",
            true,
            0xFFD8F3FF,
            0xFFD2FBE8,
            0xFF0078D7,
            0xFF1BB7EA,
            0xFFFFFFFF,
            0xFFE9FAFF,
            0xFFD6F1FD,
            0xFFF7FDFF,
            0xFFC4F0DF,
            0xFFFFFFFF,
            0xFF7EC8EC,
            0xFF0078D7,
            0xFF5CE65C,
            0xFF005A9E,
            0xFFFFFFFF,
            0xFF072238,
            0xFF214E6E,
            0xFF427091,
            0xFFB8E2F8,
            0xFFFFFFFF,
            0xFFFFFFFF,
            0xFFB4E4FC,
            0xFF63B9E8,
            0x2C0078D7
    );

    public static final ThemeConfig SKEUOMORPHIC = new ThemeConfig(
            THEME_SKEUOMORPHIC,
            "Skeuomorphic",
            "Brushed dark metal, stitched leather panels, 3D hardware, #FF9F1C amber tube",
            false,
            0xFF22252B,
            0xFF101215,
            0xFF333740,
            0xFF1B1E23,
            0xFFF3EFE6,
            0xFFB8B2A7,
            0xFF261E19,
            0xFF2F333B,
            0xFF16181C,
            0xFF565D6A,
            0xFF0E1013,
            0xFFFF9F1C,
            0xFFFFB84D,
            0xFFC46D00,
            0xFF1A1104,
            0xFFF4F0E8,
            0xFFBEB7AB,
            0xFF878076,
            0xFF0B0D0F,
            0xFF3D424B,
            0xFF4E5460,
            0xFF23262C,
            0xFF697180,
            0x2CFF9F1C
    );

    public static final ThemeConfig[] ALL_THEMES = new ThemeConfig[]{
            HOLO,
            AERO,
            SKEUOMORPHIC
    };

    public static ThemeConfig fromId(int id) {
        if (id == THEME_AERO) {
            return AERO;
        }
        if (id == THEME_SKEUOMORPHIC) {
            return SKEUOMORPHIC;
        }
        return HOLO;
    }

    public static int dp(Context context, int dp) {
        return Math.round(TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP, dp, context.getResources().getDisplayMetrics()));
    }

    public static Drawable createVerticalSurface(
            int topColor, int bottomColor, int cornerPx, int strokePx, int strokeColor) {
        GradientDrawable d = new GradientDrawable(
                GradientDrawable.Orientation.TOP_BOTTOM, new int[]{topColor, bottomColor});
        if (cornerPx > 0) {
            d.setCornerRadius(cornerPx);
        }
        if (strokePx > 0) {
            d.setStroke(strokePx, strokeColor);
        }
        return d;
    }

    public static Drawable createBackdropDrawable(final ThemeConfig theme) {
        if (theme.id == THEME_HOLO) {
            return createVerticalSurface(theme.bgTop, theme.bgBottom, 0, 0, 0);
        }
        return new Drawable() {
            private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);

            @Override
            public void draw(Canvas canvas) {
                Rect b = getBounds();
                int w = b.width();
                int h = b.height();
                if (w <= 0 || h <= 0) {
                    return;
                }

                if (theme.id == THEME_AERO) {
                    paint.setShader(new LinearGradient(
                            0f, 0f, w * 0.45f, h,
                            new int[]{0xFFBCE9FF, 0xFFE5F9FF, 0xFFCFFAEA},
                            new float[]{0f, 0.52f, 1f},
                            Shader.TileMode.CLAMP));
                    canvas.drawRect(b, paint);

                    // Top-left aqua sky bloom
                    paint.setShader(new RadialGradient(
                            w * 0.14f, h * 0.12f, Math.max(w, h) * 0.55f,
                            0x660078D7, 0x000078D7, Shader.TileMode.CLAMP));
                    canvas.drawRect(b, paint);

                    // Bottom-right mint glow
                    paint.setShader(new RadialGradient(
                            w * 0.88f, h * 0.86f, Math.max(w, h) * 0.52f,
                            0x525CE65C, 0x005CE65C, Shader.TileMode.CLAMP));
                    canvas.drawRect(b, paint);

                    // Diagonal white light rays + soft bokeh water-reflection bubbles
                    paint.setShader(new LinearGradient(
                            0f, 0f, w * 0.7f, h * 0.65f,
                            new int[]{0x4DFFFFFF, 0x16FFFFFF, 0x00FFFFFF},
                            new float[]{0f, 0.45f, 1f},
                            Shader.TileMode.CLAMP));
                    Path ray1 = new Path();
                    ray1.moveTo(w * 0.08f, 0f);
                    ray1.lineTo(w * 0.36f, 0f);
                    ray1.lineTo(w * 0.72f, h * 0.78f);
                    ray1.lineTo(w * 0.34f, h * 0.78f);
                    ray1.close();
                    canvas.drawPath(ray1, paint);

                    paint.setShader(null);
                    paint.setColor(0x40FFFFFF);
                    canvas.drawCircle(w * 0.80f, h * 0.22f, w * 0.13f, paint);
                    paint.setColor(0x2EFFFFFF);
                    canvas.drawCircle(w * 0.68f, h * 0.36f, w * 0.08f, paint);
                    paint.setColor(0x36FFFFFF);
                    canvas.drawCircle(w * 0.22f, h * 0.72f, w * 0.11f, paint);
                    paint.setStyle(Paint.Style.STROKE);
                    paint.setStrokeWidth(2f);
                    paint.setColor(0x66FFFFFF);
                    canvas.drawCircle(w * 0.80f, h * 0.22f, w * 0.13f, paint);
                    canvas.drawCircle(w * 0.22f, h * 0.72f, w * 0.11f, paint);
                    paint.setStyle(Paint.Style.FILL);
                } else {
                    // Skeuomorphic brushed dark slate + warm subtle vacuum-tube radiance
                    paint.setShader(new LinearGradient(
                            0f, 0f, 0f, h,
                            new int[]{0xFF282B32, 0xFF181A1F, 0xFF0E1013},
                            new float[]{0f, 0.55f, 1f},
                            Shader.TileMode.CLAMP));
                    canvas.drawRect(b, paint);

                    paint.setShader(new RadialGradient(
                            w * 0.5f, h * 0.18f, Math.max(w, h) * 0.65f,
                            0x1CFF9F1C, 0x00FF9F1C, Shader.TileMode.CLAMP));
                    canvas.drawRect(b, paint);

                    paint.setShader(null);
                    paint.setStrokeWidth(1f);
                    for (int y = b.top; y < b.bottom; y += 6) {
                        paint.setColor((y / 6) % 2 == 0 ? 0x08FFFFFF : 0x0C000000);
                        canvas.drawLine(b.left, y, b.right, y, paint);
                    }
                }
            }

            @Override
            public void setAlpha(int alpha) {
            }

            @Override
            public void setColorFilter(ColorFilter colorFilter) {
            }

            @Override
            public int getOpacity() {
                return PixelFormat.OPAQUE;
            }
        };
    }

    public static Drawable createControlSurface(Context ctx, ThemeConfig theme, boolean primary, int cornerDp) {
        int cornerPx = theme.id == THEME_HOLO ? 0 : dp(ctx, cornerDp);
        int strokePx = dp(ctx, 1);

        int normalTop = primary
                ? (theme.id == THEME_SKEUOMORPHIC ? 0xFFFFB548 : theme.accent)
                : theme.buttonTop;
        int normalBottom = primary
                ? (theme.id == THEME_AERO ? theme.accentSecondary : theme.accentDark)
                : theme.buttonBottom;
        int strokeColor = primary
                ? (theme.id == THEME_AERO ? 0xE6FFFFFF : (theme.id == THEME_SKEUOMORPHIC ? 0xFF784200 : theme.accentDark))
                : theme.buttonBorder;

        Drawable normalDrawable = buildControlLayer(ctx, theme, normalTop, normalBottom, strokePx, strokeColor, cornerPx, primary);
        Drawable pressedDrawable = buildControlLayer(ctx, theme, normalBottom, normalTop, strokePx, theme.accent, cornerPx, primary);

        StateListDrawable states = new StateListDrawable();
        states.addState(new int[]{android.R.attr.state_pressed}, pressedDrawable);
        states.addState(new int[]{}, normalDrawable);
        return states;
    }

    private static Drawable buildControlLayer(
            Context ctx,
            ThemeConfig theme,
            int topColor,
            int bottomColor,
            int strokePx,
            int strokeColor,
            int cornerPx,
            boolean primary) {
        GradientDrawable body = new GradientDrawable(
                GradientDrawable.Orientation.TOP_BOTTOM,
                new int[]{topColor, bottomColor});
        body.setCornerRadius(cornerPx);
        body.setStroke(strokePx, strokeColor);

        if (theme.id == THEME_AERO) {
            GradientDrawable gloss = new GradientDrawable(
                    GradientDrawable.Orientation.TOP_BOTTOM,
                    new int[]{0xB8FFFFFF, 0x26FFFFFF, 0x00FFFFFF});
            gloss.setCornerRadius(Math.max(0, cornerPx - strokePx));
            LayerDrawable layer = new LayerDrawable(new Drawable[]{body, gloss});
            int inset = dp(ctx, 2);
            layer.setLayerInset(1, inset, strokePx, inset, dp(ctx, 10));
            return layer;
        }

        if (theme.id == THEME_SKEUOMORPHIC) {
            GradientDrawable shadowRim = new GradientDrawable();
            shadowRim.setColor(0x99000000);
            shadowRim.setCornerRadius(cornerPx + dp(ctx, 1));

            GradientDrawable innerBevel = new GradientDrawable(
                    GradientDrawable.Orientation.TOP_BOTTOM,
                    new int[]{primary ? 0x66FFFFFF : 0x4DFFFFFF, 0x00FFFFFF, 0x44000000});
            innerBevel.setCornerRadius(Math.max(0, cornerPx - 1));

            LayerDrawable layer = new LayerDrawable(new Drawable[]{shadowRim, body, innerBevel});
            int dropPx = dp(ctx, 2);
            layer.setLayerInset(0, 0, dp(ctx, 1), 0, 0);
            layer.setLayerInset(1, 0, 0, 0, dropPx);
            layer.setLayerInset(2, strokePx, strokePx, strokePx, dropPx + strokePx);
            return layer;
        }

        return body;
    }

    public static void styleProgressTrack(Context ctx, ProgressBar bar, ThemeConfig theme) {
        if (bar == null) {
            return;
        }
        int radiusPx = theme.id == THEME_HOLO ? 0 : dp(ctx, 4);
        int heightPx = theme.id == THEME_SKEUOMORPHIC ? dp(ctx, 6) : dp(ctx, 4);

        GradientDrawable bg = new GradientDrawable();
        bg.setColor(theme.grooveBg);
        bg.setCornerRadius(radiusPx);
        bg.setStroke(dp(ctx, 1), theme.grooveBorder);
        bg.setSize(-1, heightPx);

        GradientDrawable fill = new GradientDrawable(
                GradientDrawable.Orientation.LEFT_RIGHT,
                new int[]{theme.accent, theme.accentSecondary});
        fill.setCornerRadius(radiusPx);
        fill.setSize(-1, heightPx);

        ClipDrawable progressClip = new ClipDrawable(fill, Gravity.LEFT, ClipDrawable.HORIZONTAL);

        GradientDrawable secondaryFill = new GradientDrawable();
        secondaryFill.setColor(theme.accentDark);
        secondaryFill.setCornerRadius(radiusPx);
        ClipDrawable secondaryClip = new ClipDrawable(secondaryFill, Gravity.LEFT, ClipDrawable.HORIZONTAL);

        LayerDrawable layers = new LayerDrawable(new Drawable[]{bg, secondaryClip, progressClip});
        layers.setId(0, android.R.id.background);
        layers.setId(1, android.R.id.secondaryProgress);
        layers.setId(2, android.R.id.progress);
        bar.setProgressDrawable(layers);
    }

    public static void styleSeekBar(Context ctx, SeekBar seekBar, ThemeConfig theme) {
        if (seekBar == null) {
            return;
        }
        styleProgressTrack(ctx, seekBar, theme);

        if (theme.id == THEME_SKEUOMORPHIC) {
            int knobSize = dp(ctx, 22);
            GradientDrawable ring = new GradientDrawable(
                    GradientDrawable.Orientation.TOP_BOTTOM,
                    new int[]{0xFF7B8392, 0xFF3A3F48, 0xFF1F2228});
            ring.setShape(GradientDrawable.OVAL);
            ring.setSize(knobSize, knobSize);
            ring.setStroke(dp(ctx, 1), 0xFF98A0B0);

            GradientDrawable amberPip = new GradientDrawable();
            amberPip.setShape(GradientDrawable.OVAL);
            amberPip.setColor(theme.accent);
            amberPip.setStroke(dp(ctx, 1), 0xFFFFD18A);

            LayerDrawable rotaryKnob = new LayerDrawable(new Drawable[]{ring, amberPip});
            int pipInset = dp(ctx, 7);
            rotaryKnob.setLayerInset(1, pipInset, pipInset, pipInset, pipInset);
            seekBar.setThumb(rotaryKnob);
            return;
        }

        int thumbSize = dp(ctx, theme.id == THEME_HOLO ? 16 : 19);
        GradientDrawable thumb = new GradientDrawable(
                GradientDrawable.Orientation.TOP_BOTTOM,
                theme.id == THEME_HOLO
                        ? new int[]{theme.accent, theme.accent}
                        : new int[]{0xFFFFFFFF, 0xFF77DCFF, theme.accent});
        thumb.setShape(GradientDrawable.OVAL);
        thumb.setSize(thumbSize, thumbSize);
        thumb.setStroke(
                dp(ctx, theme.id == THEME_AERO ? 2 : 1),
                0xFFFFFFFF);
        seekBar.setThumb(thumb);
    }

    public static void tintButton(ImageButton button, int argb) {
        if (button != null && button.getDrawable() != null) {
            button.getDrawable().mutate().setColorFilter(argb, PorterDuff.Mode.SRC_IN);
        }
    }

    public static Bitmap createMusicNotePlaceholderBitmap(ThemeConfig theme, int sizePx) {
        int s = Math.max(48, sizePx);
        Bitmap bmp = Bitmap.createBitmap(s, s, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bmp);
        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);

        if (theme.id == THEME_AERO) {
            paint.setShader(new LinearGradient(
                    0f, 0f, s, s,
                    new int[]{0xFFD7F2FF, 0xFF8CD5F7, 0xFF9DF2CE},
                    new float[]{0f, 0.58f, 1f},
                    Shader.TileMode.CLAMP));
            canvas.drawRect(0f, 0f, s, s, paint);
            paint.setShader(new LinearGradient(
                    0f, 0f, 0f, s * 0.55f,
                    0xB8FFFFFF, 0x10FFFFFF, Shader.TileMode.CLAMP));
            canvas.drawRect(0f, 0f, s, s * 0.55f, paint);
            paint.setShader(null);
        } else if (theme.id == THEME_SKEUOMORPHIC) {
            paint.setShader(new LinearGradient(
                    0f, 0f, 0f, s,
                    0xFF333740, 0xFF15181C, Shader.TileMode.CLAMP));
            canvas.drawRect(0f, 0f, s, s, paint);
            paint.setShader(new RadialGradient(
                    s * 0.5f, s * 0.5f, s * 0.56f,
                    0x28FF9F1C, 0x00FF9F1C, Shader.TileMode.CLAMP));
            canvas.drawRect(0f, 0f, s, s, paint);
            paint.setShader(null);
        } else {
            paint.setShader(new LinearGradient(
                    0f, 0f, s, s,
                    0xFF131920, 0xFF0A0E13, Shader.TileMode.CLAMP));
            canvas.drawRect(0f, 0f, s, s, paint);
            paint.setShader(null);
        }

        // High-contrast retro double-beamed music note emblem
        int noteColor = theme.id == THEME_AERO ? 0xFF005A9E : theme.accent;
        paint.setColor(noteColor);
        paint.setStyle(Paint.Style.FILL);
        canvas.drawOval(new RectF(s * 0.21f, s * 0.62f, s * 0.42f, s * 0.79f), paint);
        canvas.drawOval(new RectF(s * 0.55f, s * 0.54f, s * 0.76f, s * 0.71f), paint);

        Paint stem = new Paint(Paint.ANTI_ALIAS_FLAG);
        stem.setColor(noteColor);
        stem.setStyle(Paint.Style.STROKE);
        stem.setStrokeWidth(Math.max(2.5f, s * 0.085f));
        stem.setStrokeCap(Paint.Cap.SQUARE);
        canvas.drawLine(s * 0.39f, s * 0.68f, s * 0.39f, s * 0.27f, stem);
        canvas.drawLine(s * 0.73f, s * 0.60f, s * 0.73f, s * 0.21f, stem);

        Path beam = new Path();
        beam.moveTo(s * 0.37f, s * 0.26f);
        beam.lineTo(s * 0.75f, s * 0.19f);
        beam.lineTo(s * 0.75f, s * 0.29f);
        beam.lineTo(s * 0.37f, s * 0.36f);
        beam.close();
        canvas.drawPath(beam, paint);

        // Crisp border frame
        Paint border = new Paint(Paint.ANTI_ALIAS_FLAG);
        border.setStyle(Paint.Style.STROKE);
        border.setStrokeWidth(Math.max(1.5f, s * 0.03f));
        border.setColor(theme.id == THEME_AERO ? 0xCCFFFFFF : theme.dividerColor);
        canvas.drawRect(1f, 1f, s - 1f, s - 1f, border);
        return bmp;
    }

    public static Bitmap createVinylPlaceholderBitmap(ThemeConfig theme, int sizePx) {
        Bitmap bmp = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bmp);
        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);

        // Surface fill
        if (theme.id == THEME_AERO) {
            paint.setShader(new LinearGradient(
                    0f, 0f, sizePx, sizePx,
                    0xFFD5F0FE, 0xFF9DE6DA, Shader.TileMode.CLAMP));
            canvas.drawRect(0f, 0f, sizePx, sizePx, paint);
            paint.setShader(null);
        } else {
            paint.setColor(0xFF0E1013);
            canvas.drawRect(0f, 0f, sizePx, sizePx, paint);
        }

        float cx = sizePx * 0.5f;
        float cy = sizePx * 0.5f;
        float rOuter = sizePx * 0.36f;

        // Vinyl disc body
        paint.setColor(theme.id == THEME_AERO ? 0xFF112C42 : 0xFF14161A);
        canvas.drawCircle(cx, cy, rOuter, paint);

        // Grooves
        Paint stroke = new Paint(Paint.ANTI_ALIAS_FLAG);
        stroke.setStyle(Paint.Style.STROKE);
        stroke.setStrokeWidth(Math.max(1.5f, sizePx * 0.005f));
        for (int i = 1; i <= 5; i++) {
            stroke.setColor(i % 2 == 0 ? 0x33FFFFFF : (0x55000000 | (theme.accent & 0x00FFFFFF)));
            canvas.drawCircle(cx, cy, rOuter * (0.44f + i * 0.1f), stroke);
        }

        // Center record label
        paint.setColor(theme.accent);
        canvas.drawCircle(cx, cy, rOuter * 0.35f, paint);

        // Spindle cutout
        paint.setColor(theme.isLightSurface ? 0xFFFFFFFF : 0xFF0E1013);
        canvas.drawCircle(cx, cy, rOuter * 0.10f, paint);

        // Crisp 1px border
        stroke.setStrokeWidth(Math.max(2f, sizePx * 0.006f));
        stroke.setColor(theme.id == THEME_AERO ? 0xCCFFFFFF : theme.dividerColor);
        canvas.drawRect(1f, 1f, sizePx - 1f, sizePx - 1f, stroke);
        return bmp;
    }

    public static Bitmap createCollapseIconBitmap(Context ctx, int tintColor) {
        int s = dp(ctx, 24);
        Bitmap bmp = Bitmap.createBitmap(s, s, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(bmp);
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setStyle(Paint.Style.STROKE);
        p.setStrokeCap(Paint.Cap.SQUARE);
        p.setStrokeJoin(Paint.Join.MITER);
        p.setStrokeWidth(dp(ctx, 2));
        p.setColor(tintColor);

        Path path = new Path();
        path.moveTo(s * 0.25f, s * 0.38f);
        path.lineTo(s * 0.50f, s * 0.65f);
        path.lineTo(s * 0.75f, s * 0.38f);
        c.drawPath(path, p);
        return bmp;
    }

    public static Bitmap createBackArrowBitmap(Context ctx, int tintColor) {
        int s = dp(ctx, 24);
        Bitmap bmp = Bitmap.createBitmap(s, s, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(bmp);
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setStyle(Paint.Style.STROKE);
        p.setStrokeCap(Paint.Cap.SQUARE);
        p.setStrokeJoin(Paint.Join.MITER);
        p.setStrokeWidth(dp(ctx, 2));
        p.setColor(tintColor);

        Path path = new Path();
        path.moveTo(s * 0.56f, s * 0.24f);
        path.lineTo(s * 0.26f, s * 0.50f);
        path.lineTo(s * 0.56f, s * 0.76f);
        c.drawPath(path, p);
        c.drawLine(s * 0.28f, s * 0.50f, s * 0.78f, s * 0.50f, p);
        return bmp;
    }

    public static Bitmap createShuffleIconBitmap(Context ctx, int tintColor) {
        int s = dp(ctx, 22);
        Bitmap bmp = Bitmap.createBitmap(s, s, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(bmp);
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setStyle(Paint.Style.STROKE);
        p.setStrokeWidth(dp(ctx, 2));
        p.setColor(tintColor);

        // Two crossing tracks
        c.drawLine(s * 0.16f, s * 0.32f, s * 0.42f, s * 0.32f, p);
        c.drawLine(s * 0.42f, s * 0.32f, s * 0.64f, s * 0.68f, p);
        c.drawLine(s * 0.64f, s * 0.68f, s * 0.84f, s * 0.68f, p);

        c.drawLine(s * 0.16f, s * 0.68f, s * 0.42f, s * 0.68f, p);
        c.drawLine(s * 0.42f, s * 0.68f, s * 0.64f, s * 0.32f, p);
        c.drawLine(s * 0.64f, s * 0.32f, s * 0.84f, s * 0.32f, p);

        // Arrow heads
        c.drawLine(s * 0.74f, s * 0.22f, s * 0.86f, s * 0.32f, p);
        c.drawLine(s * 0.74f, s * 0.42f, s * 0.86f, s * 0.32f, p);
        c.drawLine(s * 0.74f, s * 0.58f, s * 0.86f, s * 0.68f, p);
        c.drawLine(s * 0.74f, s * 0.78f, s * 0.86f, s * 0.68f, p);
        return bmp;
    }

    public static Bitmap createRepeatIconBitmap(Context ctx, int tintColor, boolean singleTrack) {
        int s = dp(ctx, 22);
        Bitmap bmp = Bitmap.createBitmap(s, s, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(bmp);
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setStyle(Paint.Style.STROKE);
        p.setStrokeWidth(dp(ctx, 2));
        p.setColor(tintColor);

        RectF loop = new RectF(s * 0.20f, s * 0.28f, s * 0.80f, s * 0.72f);
        c.drawRoundRect(loop, dp(ctx, 3), dp(ctx, 3), p);

        if (singleTrack) {
            Paint textPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            textPaint.setColor(tintColor);
            textPaint.setTextSize(s * 0.36f);
            textPaint.setTextAlign(Paint.Align.CENTER);
            textPaint.setFakeBoldText(true);
            Paint.FontMetrics fm = textPaint.getFontMetrics();
            float cy = s * 0.50f - (fm.ascent + fm.descent) * 0.5f;
            c.drawText("1", s * 0.50f, cy, textPaint);
        }
        return bmp;
    }
}
