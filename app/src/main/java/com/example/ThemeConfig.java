package com.example;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.PorterDuff;
import android.graphics.RectF;
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
            "Glossy #0078D7 to #5CE65C gradients on clean light aero background",
            true,
            0xFFEEFAFF,
            0xFFE6FBF0,
            0xFF0078D7,
            0xFF199AD9,
            0xFFFFFFFF,
            0xFFE4F7FF,
            0xFFE2F4FD,
            0xFFF5FCFF,
            0xFFD8F3EE,
            0xFFFFFFFF,
            0xFF9ACCE8,
            0xFF0078D7,
            0xFF5CE65C,
            0xFF005A9E,
            0xFFFFFFFF,
            0xFF0A243A,
            0xFF2D5370,
            0xFF4C728F,
            0xFFBFE1F5,
            0xFFFFFFFF,
            0xFFFFFFFF,
            0xFFC4E8FC,
            0xFF6AB8E6,
            0x240078D7
    );

    public static final ThemeConfig SKEUOMORPHIC = new ThemeConfig(
            THEME_SKEUOMORPHIC,
            "Skeuomorphic",
            "Brushed matte slate, recessed grooves, #FF9F1C amber",
            false,
            0xFF272A30,
            0xFF15171B,
            0xFF343840,
            0xFF22252A,
            0xFFF2EDE4,
            0xFFB4AEA3,
            0xFF25282E,
            0xFF31353C,
            0xFF1B1E23,
            0xFF4F5560,
            0xFF131518,
            0xFFFF9F1C,
            0xFFFFB84D,
            0xFFC97400,
            0xFF1B1408,
            0xFFF2EDE4,
            0xFFB5AFA4,
            0xFF847E75,
            0xFF101215,
            0xFF3F444D,
            0xFF484D56,
            0xFF272A30,
            0xFF5C626E,
            0x26FF9F1C
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

    public static Drawable createControlSurface(Context ctx, ThemeConfig theme, boolean primary, int cornerDp) {
        int cornerPx = theme.id == THEME_HOLO ? 0 : dp(ctx, cornerDp);
        int strokePx = dp(ctx, 1);

        int normalTop = primary
                ? theme.accent
                : theme.buttonTop;
        int normalBottom = primary
                ? (theme.id == THEME_AERO ? theme.accentSecondary : theme.accentDark)
                : theme.buttonBottom;
        int strokeColor = primary
                ? (theme.id == THEME_AERO ? 0xCCFFFFFF : theme.accentDark)
                : theme.buttonBorder;

        GradientDrawable normal = new GradientDrawable(
                GradientDrawable.Orientation.TOP_BOTTOM,
                new int[]{normalTop, normalBottom});
        normal.setCornerRadius(cornerPx);
        normal.setStroke(strokePx, strokeColor);

        GradientDrawable pressed = new GradientDrawable(
                GradientDrawable.Orientation.TOP_BOTTOM,
                new int[]{normalBottom, normalTop});
        pressed.setCornerRadius(cornerPx);
        pressed.setStroke(strokePx, theme.accent);

        StateListDrawable states = new StateListDrawable();
        states.addState(new int[]{android.R.attr.state_pressed}, pressed);
        states.addState(new int[]{}, normal);
        return states;
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

        int thumbSize = dp(ctx, theme.id == THEME_HOLO ? 16 : 18);
        GradientDrawable thumb = new GradientDrawable(
                GradientDrawable.Orientation.TOP_BOTTOM,
                theme.id == THEME_HOLO
                        ? new int[]{theme.accent, theme.accent}
                        : theme.id == THEME_AERO
                                ? new int[]{0xFFFFFFFF, theme.accent}
                                : new int[]{0xFF6B727F, 0xFF2B2F36});
        thumb.setShape(GradientDrawable.OVAL);
        thumb.setSize(thumbSize, thumbSize);
        thumb.setStroke(
                dp(ctx, theme.id == THEME_AERO ? 2 : 1),
                theme.id == THEME_SKEUOMORPHIC ? theme.accent : 0xFFFFFFFF);
        seekBar.setThumb(thumb);
    }

    public static void tintButton(ImageButton button, int argb) {
        if (button != null && button.getDrawable() != null) {
            button.getDrawable().mutate().setColorFilter(argb, PorterDuff.Mode.SRC_IN);
        }
    }

    public static Bitmap createVinylPlaceholderBitmap(ThemeConfig theme, int sizePx) {
        Bitmap bmp = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bmp);
        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);

        // Surface fill
        paint.setColor(theme.isLightSurface ? 0xFFE3F4FD : 0xFF0E1013);
        canvas.drawRect(0f, 0f, sizePx, sizePx, paint);

        float cx = sizePx * 0.5f;
        float cy = sizePx * 0.5f;
        float rOuter = sizePx * 0.36f;

        // Vinyl disc body
        paint.setColor(theme.id == THEME_AERO ? 0xFF193247 : 0xFF14161A);
        canvas.drawCircle(cx, cy, rOuter, paint);

        // Grooves
        Paint stroke = new Paint(Paint.ANTI_ALIAS_FLAG);
        stroke.setStyle(Paint.Style.STROKE);
        stroke.setStrokeWidth(Math.max(1.5f, sizePx * 0.005f));
        for (int i = 1; i <= 5; i++) {
            stroke.setColor(i % 2 == 0 ? 0x28FFFFFF : (0x44000000 | (theme.accent & 0x00FFFFFF)));
            canvas.drawCircle(cx, cy, rOuter * (0.44f + i * 0.1f), stroke);
        }

        // Center record label
        paint.setColor(theme.accent);
        canvas.drawCircle(cx, cy, rOuter * 0.35f, paint);

        // Eighth note silhouette inside center or spindle
        paint.setColor(theme.isLightSurface ? 0xFFFFFFFF : 0xFF0E1013);
        canvas.drawCircle(cx, cy, rOuter * 0.10f, paint);

        // Crisp 1px border
        stroke.setStrokeWidth(Math.max(2f, sizePx * 0.006f));
        stroke.setColor(theme.dividerColor);
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
