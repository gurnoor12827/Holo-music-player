package com.example;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.graphics.Shader;
import android.os.SystemClock;
import android.util.AttributeSet;
import android.view.View;

public class AudioVisualizerView extends View {

    public static final int MODE_WATER_REFLEX = 0;
    public static final int MODE_LED_BARS = 1;
    public static final int MODE_OCTAVE = 2;
    public static final int MODE_MIRROR = 3;
    public static final int MODE_RADIAL = 4;
    public static final int MODE_AREA_LINE = 5;

    public static final String[] MODE_LABELS = new String[]{
            "Water Reflex",
            "LED Bars",
            "Octave",
            "Mirror",
            "Radial",
            "Area Line"
    };

    private static final int BAND_COUNT = 28;

    private ThemeConfig theme = ThemeConfig.HOLO;
    private int mode = MODE_LED_BARS;
    private boolean playing = false;
    private long trackSeed = 1L;
    private long playbackPositionMs = 0L;

    private final float[] smoothBins = new float[BAND_COUNT];
    private final float[] peaks = new float[BAND_COUNT];
    private final float[] peakVel = new float[BAND_COUNT];
    private final float[] peakHold = new float[BAND_COUNT];
    private float smoothBass = 0f;
    private float smoothMid = 0f;
    private float phase = 0f;
    private long lastFrameTimeMs = 0L;

    private final Paint fillPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint strokePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint gridPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Path wavePath = new Path();
    private final Path linePath = new Path();
    private final Path mirrorPath = new Path();
    private final Path roundedBarPath = new Path();
    private final RectF workRect = new RectF();

    private LinearGradient cachedBgShader;
    private LinearGradient cachedBarShader;
    private LinearGradient cachedReflectionShader;
    private int cachedW = -1;
    private int cachedH = -1;
    private int cachedThemeId = -1;

    public AudioVisualizerView(Context context) {
        super(context);
        init();
    }

    public AudioVisualizerView(Context context, AttributeSet attrs) {
        super(context, attrs);
        init();
    }

    public AudioVisualizerView(Context context, AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
        init();
    }

    private void init() {
        strokePaint.setStyle(Paint.Style.STROKE);
        gridPaint.setStyle(Paint.Style.STROKE);
    }

    public void setTheme(ThemeConfig nextTheme) {
        if (nextTheme != null) {
            this.theme = nextTheme;
            cachedThemeId = -1;
            invalidate();
        }
    }

    public void setMode(int nextMode) {
        if (nextMode >= MODE_WATER_REFLEX && nextMode <= MODE_AREA_LINE) {
            this.mode = nextMode;
            invalidate();
        }
    }

    public void setPlayingState(boolean isPlaying, long songId, long positionMs) {
        this.playing = isPlaying;
        this.trackSeed = songId != -1L ? Math.abs(songId) + 17L : 1L;
        this.playbackPositionMs = Math.max(0L, positionMs);
        if (getVisibility() == VISIBLE) {
            postInvalidateOnAnimation();
        }
    }

    private int withAlpha(int color, int alpha) {
        return (Math.max(0, Math.min(255, alpha)) << 24) | (color & 0x00FFFFFF);
    }

    private void ensureShaders(int w, int h) {
        if (cachedW == w && cachedH == h && cachedThemeId == theme.id
                && cachedBgShader != null && cachedBarShader != null && cachedReflectionShader != null) {
            return;
        }
        int bgTop = theme.id == ThemeConfig.THEME_AERO
                ? 0xFFEEFAFF
                : (theme.id == ThemeConfig.THEME_SKEUOMORPHIC ? 0xFF0C0E11 : 0xFF020508);
        int bgBottom = theme.id == ThemeConfig.THEME_AERO
                ? 0xFFCEF6E9
                : (theme.id == ThemeConfig.THEME_SKEUOMORPHIC ? 0xFF16191F : 0xFF071219);
        float baselineY = h * 0.73f;
        cachedBgShader = new LinearGradient(0f, 0f, 0f, h, bgTop, bgBottom, Shader.TileMode.CLAMP);
        cachedBarShader = new LinearGradient(
                0f, 12f, 0f, baselineY,
                new int[]{theme.accentSecondary, withAlpha(theme.accent, 195), withAlpha(theme.accent, 18)},
                new float[]{0f, 0.55f, 1f},
                Shader.TileMode.CLAMP);
        cachedReflectionShader = new LinearGradient(
                0f, baselineY, 0f, h,
                withAlpha(theme.accent, 92),
                withAlpha(theme.accent, 0),
                Shader.TileMode.CLAMP);
        cachedW = w;
        cachedH = h;
        cachedThemeId = theme.id;
    }

    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        int w = getWidth();
        int h = getHeight();
        if (w <= 0 || h <= 0) {
            return;
        }

        long now = SystemClock.uptimeMillis();
        float dt = lastFrameTimeMs == 0L ? 0.016f : Math.min(0.05f, (now - lastFrameTimeMs) / 1000f);
        lastFrameTimeMs = now;
        float density = getResources().getDisplayMetrics().density;

        float songPhase = (trackSeed % 97) * 0.13f + (playbackPositionMs * 0.0018f);
        float bassSum = 0f;
        float midSum = 0f;
        for (int i = 0; i < BAND_COUNT; i++) {
            float raw = 0f;
            if (playing) {
                float w1 = (float) Math.sin(phase * 2.1f + i * 0.41f + songPhase);
                float w2 = (float) Math.cos(phase * 3.2f - i * 0.27f + songPhase * 0.5f);
                float pulse = (float) Math.pow(Math.max(0f, Math.sin(phase * 1.7f + songPhase)), 2.0);
                float tilt = 1.0f - (i / (float) BAND_COUNT) * 0.34f;
                raw = Math.max(0.06f, Math.min(1f, (0.28f + 0.28f * w1 + 0.18f * w2 + 0.30f * pulse) * tilt));
            }
            float rate = raw > smoothBins[i] ? 18f : 9f;
            float alpha = 1f - (float) Math.exp(-rate * dt);
            smoothBins[i] += (raw - smoothBins[i]) * alpha;
            if (smoothBins[i] >= peaks[i]) {
                peaks[i] = smoothBins[i];
                peakVel[i] = 0f;
                peakHold[i] = 0.18f;
            } else if (peakHold[i] > 0f) {
                peakHold[i] -= dt;
            } else {
                peakVel[i] += 2.4f * dt;
                peaks[i] = Math.max(smoothBins[i], peaks[i] - peakVel[i] * dt);
            }
            if (i < 6) {
                bassSum += smoothBins[i];
            } else if (i < 16) {
                midSum += smoothBins[i];
            }
        }
        smoothBass += ((bassSum / 6f) - smoothBass) * Math.min(1f, dt * 10f);
        smoothMid += ((midSum / 10f) - smoothMid) * Math.min(1f, dt * 10f);
        phase += dt * (playing ? (1.45f + smoothBass * 1.8f) : 0.25f);

        ensureShaders(w, h);
        fillPaint.setShader(cachedBgShader);
        canvas.drawRect(0f, 0f, w, h, fillPaint);
        fillPaint.setShader(null);

        int gridColor = withAlpha(theme.accent, 34);
        switch (mode) {
            case MODE_WATER_REFLEX:
                drawWaterReflexMode(canvas, w, h, density, gridColor);
                break;
            case MODE_LED_BARS:
                drawLedBarsMode(canvas, w, h, density);
                break;
            case MODE_OCTAVE:
                drawOctaveMode(canvas, w, h, density, gridColor);
                break;
            case MODE_MIRROR:
                drawMirrorMode(canvas, w, h, density, gridColor);
                break;
            case MODE_RADIAL:
                drawRadialMode(canvas, w, h, density, gridColor);
                break;
            case MODE_AREA_LINE:
            default:
                drawAreaLineMode(canvas, w, h, density, gridColor);
                break;
        }

        if (getVisibility() == VISIBLE && (playing || smoothBass > 0.02f)) {
            postInvalidateOnAnimation();
        }
    }

    private void drawWaterReflexMode(Canvas canvas, int w, int h, float density, int gridColor) {
        float horizonY = h * 0.68f;
        gridPaint.setColor(gridColor);
        gridPaint.setStrokeWidth(Math.max(1f, density));
        canvas.drawLine(0f, horizonY, w, horizonY, gridPaint);

        wavePath.reset();
        linePath.reset();
        mirrorPath.reset();

        wavePath.moveTo(0f, horizonY);
        mirrorPath.moveTo(0f, horizonY);

        for (int i = 0; i < BAND_COUNT; i++) {
            float x = (i / (float) (BAND_COUNT - 1)) * w;
            float amp = smoothBins[i] * (horizonY * 0.78f);
            float yTop = horizonY - amp;
            float yReflect = horizonY + amp * 0.42f;

            wavePath.lineTo(x, yTop);
            mirrorPath.lineTo(x, yReflect);
            if (i == 0) {
                linePath.moveTo(x, yTop);
            } else {
                linePath.lineTo(x, yTop);
            }
        }

        wavePath.lineTo(w, horizonY);
        wavePath.close();
        mirrorPath.lineTo(w, horizonY);
        mirrorPath.close();

        fillPaint.setShader(cachedBarShader);
        canvas.drawPath(wavePath, fillPaint);

        fillPaint.setShader(cachedReflectionShader);
        canvas.drawPath(mirrorPath, fillPaint);
        fillPaint.setShader(null);

        strokePaint.setColor(theme.accentSecondary);
        strokePaint.setStrokeWidth(2f * density);
        canvas.drawPath(linePath, strokePaint);
    }

    private void drawRoundedTopBar(Canvas canvas, float left, float top, float right, float bottom, float r) {
        if (bottom - top <= 0.5f || right - left <= 0.5f) {
            return;
        }
        float rad = Math.min(r, Math.min((right - left) * 0.5f, bottom - top));
        roundedBarPath.reset();
        roundedBarPath.moveTo(left, bottom);
        roundedBarPath.lineTo(left, top + rad);
        roundedBarPath.quadTo(left, top, left + rad, top);
        roundedBarPath.lineTo(right - rad, top);
        roundedBarPath.quadTo(right, top, right, top + rad);
        roundedBarPath.lineTo(right, bottom);
        roundedBarPath.close();
        canvas.drawPath(roundedBarPath, fillPaint);
    }

    private void drawLedBarsMode(Canvas canvas, int w, int h, float density) {
        float padX = 12f * density;
        float baselineY = h * 0.73f;
        float usableW = w - padX * 2f;
        float usableH = Math.max(24f, baselineY - 14f * density);
        float maxReflH = Math.max(12f, h - baselineY - 6f * density);
        float slotW = usableW / BAND_COUNT;
        float barW = Math.max(3f * density, slotW * 0.64f);
        float radius = Math.min(5f * density, barW * 0.5f);

        gridPaint.setColor(withAlpha(theme.accent, 96));
        gridPaint.setStrokeWidth(Math.max(1f, density));
        canvas.drawLine(padX, baselineY, w - padX, baselineY, gridPaint);

        int capColor = theme.isLightSurface ? theme.textPrimary : 0xFFC8F3FF;
        if (theme.id == ThemeConfig.THEME_SKEUOMORPHIC) {
            capColor = 0xFFFFE2A8;
        }

        for (int i = 0; i < BAND_COUNT; i++) {
            float barH = Math.max(3f * density, smoothBins[i] * usableH);
            float x = padX + i * slotW + (slotW - barW) * 0.5f;
            float topY = baselineY - barH;

            fillPaint.setShader(cachedBarShader);
            drawRoundedTopBar(canvas, x, topY, x + barW, baselineY, radius);

            // Gravity peak-decay indicator floating above the bar
            float peakY = baselineY - Math.max(barH, peaks[i] * usableH) - 4f * density;
            fillPaint.setShader(null);
            if (peaks[i] > 0.02f && peakY >= 4f) {
                fillPaint.setColor(capColor);
                workRect.set(x, peakY, x + barW, peakY + 2f * density);
                canvas.drawRoundRect(workRect, density, density, fillPaint);
            }

            // Subtle baseline mirror reflection
            float reflH = Math.min(maxReflH, barH * 0.36f);
            if (reflH > 2f) {
                fillPaint.setShader(cachedReflectionShader);
                workRect.set(x, baselineY + 2f, x + barW, baselineY + 2f + reflH);
                canvas.drawRoundRect(workRect, radius, radius, fillPaint);
                fillPaint.setShader(null);
            }
        }
    }

    private void drawOctaveMode(Canvas canvas, int w, int h, float density, int gridColor) {
        gridPaint.setColor(gridColor);
        gridPaint.setStrokeWidth(Math.max(1f, density * 0.8f));
        for (int row = 1; row <= 3; row++) {
            float gy = (h * 0.72f / 4f) * row;
            canvas.drawLine(0f, gy, w, gy, gridPaint);
        }

        float padX = 12f * density;
        float baselineY = h * 0.73f;
        float usableW = w - padX * 2f;
        float usableH = Math.max(24f, baselineY - 14f * density);
        float maxReflH = Math.max(12f, h - baselineY - 6f * density);
        float slotW = usableW / BAND_COUNT;
        float barW = Math.max(3f * density, slotW * 0.72f);
        float radius = Math.min(5f * density, barW * 0.5f);

        gridPaint.setColor(withAlpha(theme.accent, 96));
        canvas.drawLine(padX, baselineY, w - padX, baselineY, gridPaint);

        for (int i = 0; i < BAND_COUNT; i++) {
            float barH = Math.max(3f * density, smoothBins[i] * usableH);
            float x = padX + i * slotW + (slotW - barW) * 0.5f;
            float y = baselineY - barH;
            fillPaint.setShader(cachedBarShader);
            drawRoundedTopBar(canvas, x, y, x + barW, baselineY, radius);

            float reflH = Math.min(maxReflH, barH * 0.34f);
            if (reflH > 2f) {
                fillPaint.setShader(cachedReflectionShader);
                workRect.set(x, baselineY + 2f, x + barW, baselineY + 2f + reflH);
                canvas.drawRoundRect(workRect, radius, radius, fillPaint);
            }
        }
        fillPaint.setShader(null);

        fillPaint.setColor(theme.isLightSurface ? theme.textPrimary : 0xFFE8FAFF);
        for (int i = 0; i < BAND_COUNT; i++) {
            float x = padX + i * slotW + (slotW - barW) * 0.5f;
            float peakY = baselineY - Math.max(3f * density, peaks[i] * usableH) - 4f * density;
            canvas.drawRect(x, peakY, x + barW, peakY + 2f * density, fillPaint);
        }
    }

    private void drawMirrorMode(Canvas canvas, int w, int h, float density, int gridColor) {
        float cy = h * 0.5f;
        gridPaint.setColor(gridColor);
        gridPaint.setStrokeWidth(Math.max(1f, density));
        canvas.drawLine(0f, cy, w, cy, gridPaint);

        float padX = 12f * density;
        float usableW = w - padX * 2f;
        float maxHalfH = h * 0.42f;
        float slotW = usableW / BAND_COUNT;
        float barW = Math.max(2f * density, slotW * 0.65f);

        for (int i = 0; i < BAND_COUNT; i++) {
            float half = Math.max(2f * density, smoothBins[i] * maxHalfH);
            float x = padX + i * slotW + (slotW - barW) * 0.5f;
            fillPaint.setColor(theme.accent);
            canvas.drawRect(x, cy - half, x + barW, cy, fillPaint);
            fillPaint.setColor(withAlpha(theme.accentSecondary, 170));
            canvas.drawRect(x, cy, x + barW, cy + half * 0.85f, fillPaint);
        }
    }

    private void drawRadialMode(Canvas canvas, int w, int h, float density, int gridColor) {
        float cx = w * 0.5f;
        float cy = h * 0.5f;
        float baseR = Math.min(w, h) * 0.21f;
        float maxLen = Math.min(w, h) * 0.23f;

        gridPaint.setColor(gridColor);
        gridPaint.setStrokeWidth(Math.max(1f, density));
        canvas.drawCircle(cx, cy, baseR * 0.65f, gridPaint);
        canvas.drawCircle(cx, cy, baseR, gridPaint);
        canvas.drawCircle(cx, cy, baseR * 1.55f, gridPaint);

        strokePaint.setStrokeWidth(2.2f * density);
        for (int i = 0; i < BAND_COUNT; i++) {
            double theta = (i / (double) BAND_COUNT) * Math.PI * 2.0 + phase * 0.25f;
            float mag = smoothBins[i];
            float rIn = baseR * (0.95f + smoothBass * 0.12f);
            float rOut = rIn + 4f * density + mag * maxLen;

            strokePaint.setColor(i % 2 == 0 ? theme.accent : theme.accentSecondary);
            canvas.drawLine(
                    cx + (float) Math.cos(theta) * rIn,
                    cy + (float) Math.sin(theta) * rIn,
                    cx + (float) Math.cos(theta) * rOut,
                    cy + (float) Math.sin(theta) * rOut,
                    strokePaint);
        }
    }

    private void drawAreaLineMode(Canvas canvas, int w, int h, float density, int gridColor) {
        gridPaint.setColor(gridColor);
        gridPaint.setStrokeWidth(Math.max(1f, density * 0.8f));
        for (int gx = 1; gx < 6; gx++) {
            float px = (w / 6f) * gx;
            canvas.drawLine(px, 0f, px, h, gridPaint);
        }
        for (int gy = 1; gy < 5; gy++) {
            float py = (h / 5f) * gy;
            canvas.drawLine(0f, py, w, py, gridPaint);
        }

        float bottomY = h - 10f * density;
        float topPad = 16f * density;
        float usableH = bottomY - topPad;

        wavePath.reset();
        linePath.reset();
        wavePath.moveTo(0f, bottomY);

        for (int i = 0; i < BAND_COUNT; i++) {
            float x = (i / (float) (BAND_COUNT - 1)) * w;
            float y = bottomY - smoothBins[i] * usableH;
            wavePath.lineTo(x, y);
            if (i == 0) {
                linePath.moveTo(x, y);
            } else {
                linePath.lineTo(x, y);
            }
        }
        wavePath.lineTo(w, bottomY);
        wavePath.close();

        fillPaint.setColor(withAlpha(theme.accent, 75));
        canvas.drawPath(wavePath, fillPaint);

        strokePaint.setColor(theme.accent);
        strokePaint.setStrokeWidth(2.2f * density);
        canvas.drawPath(linePath, strokePaint);
    }
}
