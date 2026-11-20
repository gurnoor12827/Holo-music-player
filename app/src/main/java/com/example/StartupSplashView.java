package com.example;

import android.animation.ValueAnimator;
import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RadialGradient;
import android.graphics.RectF;
import android.graphics.Shader;
import android.util.AttributeSet;
import android.view.View;
import android.view.animation.LinearInterpolator;

/**
 * Minimalist classic Android/Nexus-inspired concentric spinning circles boot loader.
 * Renders on a pitch-black surface and tints dynamically to the active theme's accent.
 */
public class StartupSplashView extends View {

    private final Paint trackPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint outerArcPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint midArcPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint innerArcPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint coreArcPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint glowPaint = new Paint(Paint.ANTI_ALIAS_FLAG);

    private final RectF arcBounds = new RectF();

    private int primaryColor = 0xFF33B5E5;
    private int secondaryColor = 0xFF0099CC;
    private int highlightColor = 0xFF8CE0FF;

    private float phaseDegrees = 0f;
    private ValueAnimator animator;
    private int lastGlowSize = -1;
    private int lastGlowColor = 0;

    public StartupSplashView(Context context) {
        super(context);
        init();
    }

    public StartupSplashView(Context context, AttributeSet attrs) {
        super(context, attrs);
        init();
    }

    public StartupSplashView(Context context, AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
        init();
    }

    private void init() {
        trackPaint.setStyle(Paint.Style.STROKE);

        outerArcPaint.setStyle(Paint.Style.STROKE);
        outerArcPaint.setStrokeCap(Paint.Cap.ROUND);

        midArcPaint.setStyle(Paint.Style.STROKE);
        midArcPaint.setStrokeCap(Paint.Cap.ROUND);

        innerArcPaint.setStyle(Paint.Style.STROKE);
        innerArcPaint.setStrokeCap(Paint.Cap.ROUND);

        coreArcPaint.setStyle(Paint.Style.STROKE);
        coreArcPaint.setStrokeCap(Paint.Cap.ROUND);

        glowPaint.setStyle(Paint.Style.FILL);
        updatePaintColors();
    }

    public void setAccentPalette(int primary, int secondary, int highlight) {
        this.primaryColor = primary;
        this.secondaryColor = secondary;
        this.highlightColor = highlight;
        updatePaintColors();
        lastGlowSize = -1;
        invalidate();
    }

    public void setThemeTint(ThemeConfig theme) {
        if (theme == null || theme.id == ThemeConfig.THEME_HOLO) {
            setAccentPalette(0xFF33B5E5, 0xFF0099CC, 0xFF8CE0FF);
        } else if (theme.id == ThemeConfig.THEME_AERO) {
            setAccentPalette(0xFF00C4FF, 0xFF0078D7, 0xFF7CEEFF);
        } else {
            setAccentPalette(0xFFFF9F1C, 0xFFD97706, 0xFFFFE096);
        }
    }

    private void updatePaintColors() {
        trackPaint.setColor(withAlpha(primaryColor, 38));
        outerArcPaint.setColor(withAlpha(secondaryColor, 212));
        midArcPaint.setColor(primaryColor);
        innerArcPaint.setColor(withAlpha(highlightColor, 242));
        coreArcPaint.setColor(withAlpha(primaryColor, 228));
    }

    private static int withAlpha(int color, int alpha) {
        return Color.argb(alpha, Color.red(color), Color.green(color), Color.blue(color));
    }

    public void startAnimationLoop() {
        if (animator == null) {
            animator = ValueAnimator.ofFloat(0f, 3600f);
            animator.setDuration(24000L);
            animator.setRepeatCount(ValueAnimator.INFINITE);
            animator.setInterpolator(new LinearInterpolator());
            animator.addUpdateListener(new ValueAnimator.AnimatorUpdateListener() {
                @Override
                public void onAnimationUpdate(ValueAnimator animation) {
                    phaseDegrees = (Float) animation.getAnimatedValue();
                    invalidate();
                }
            });
        }
        if (!animator.isStarted()) {
            animator.start();
        }
    }

    public void stopAnimationLoop() {
        if (animator != null) {
            animator.cancel();
            animator = null;
        }
    }

    @Override
    protected void onDetachedFromWindow() {
        stopAnimationLoop();
        super.onDetachedFromWindow();
    }

    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        int w = getWidth();
        int h = getHeight();
        int size = Math.min(w, h);
        if (size <= 0) {
            return;
        }

        float cx = w * 0.5f;
        float cy = h * 0.5f;
        float maxR = size * 0.44f;

        if (lastGlowSize != size || lastGlowColor != primaryColor) {
            lastGlowSize = size;
            lastGlowColor = primaryColor;
            glowPaint.setShader(new RadialGradient(
                    cx,
                    cy,
                    maxR * 0.95f,
                    new int[]{withAlpha(primaryColor, 44), Color.TRANSPARENT},
                    new float[]{0f, 1f},
                    Shader.TileMode.CLAMP
            ));
        }
        canvas.drawCircle(cx, cy, maxR * 0.95f, glowPaint);

        float dpScale = size / 200f;
        trackPaint.setStrokeWidth(Math.max(1f, 1.25f * dpScale));
        outerArcPaint.setStrokeWidth(Math.max(2f, 2.6f * dpScale));
        midArcPaint.setStrokeWidth(Math.max(2.4f, 3.1f * dpScale));
        innerArcPaint.setStrokeWidth(Math.max(2f, 2.5f * dpScale));
        coreArcPaint.setStrokeWidth(Math.max(1.8f, 2.1f * dpScale));

        // Ring 1 (Outer): Faint circular guide + slow CW sweep
        float r1 = maxR;
        canvas.drawCircle(cx, cy, r1, trackPaint);
        arcBounds.set(cx - r1, cy - r1, cx + r1, cy + r1);
        float a1 = (phaseDegrees * 0.85f) % 360f;
        canvas.drawArc(arcBounds, a1, 95f, false, outerArcPaint);
        canvas.drawArc(arcBounds, a1 + 190f, 45f, false, outerArcPaint);

        // Ring 2 (Outer-Mid): Counter-rotating crisp primary arcs
        float r2 = maxR * 0.77f;
        canvas.drawCircle(cx, cy, r2, trackPaint);
        arcBounds.set(cx - r2, cy - r2, cx + r2, cy + r2);
        float a2 = (-phaseDegrees * 1.15f) % 360f;
        canvas.drawArc(arcBounds, a2, 112f, false, midArcPaint);
        canvas.drawArc(arcBounds, a2 + 192f, 58f, false, midArcPaint);

        // Ring 3 (Inner-Mid): Highlight orbital arcs
        float r3 = maxR * 0.54f;
        arcBounds.set(cx - r3, cy - r3, cx + r3, cy + r3);
        float a3 = (phaseDegrees * 1.55f) % 360f;
        canvas.drawArc(arcBounds, a3, 115f, false, innerArcPaint);
        canvas.drawArc(arcBounds, a3 + 195f, 54f, false, innerArcPaint);

        // Ring 4 (Core): Fast counter-rotating inner circle
        float r4 = maxR * 0.32f;
        arcBounds.set(cx - r4, cy - r4, cx + r4, cy + r4);
        float a4 = (-phaseDegrees * 2.1f) % 360f;
        canvas.drawArc(arcBounds, a4, 148f, false, coreArcPaint);
        canvas.drawArc(arcBounds, a4 + 230f, 46f, false, coreArcPaint);
    }
}
