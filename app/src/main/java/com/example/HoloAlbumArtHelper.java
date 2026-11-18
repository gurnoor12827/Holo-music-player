package com.example;

import android.content.ContentResolver;
import android.content.ContentUris;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.RadialGradient;
import android.graphics.Rect;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.Typeface;
import android.media.MediaMetadataRetriever;
import android.net.Uri;
import android.provider.MediaStore;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Locale;
import java.util.Random;

public final class HoloAlbumArtHelper {

    public static final int STYLE_HOLO_WAVE = 0;
    public static final int STYLE_VINYL = 1;
    public static final int STYLE_GRID = 2;
    public static final int STYLE_CASSETTE = 3;
    public static final int STYLE_MINIMAL = 4;

    public static final String[] STYLE_LABELS = new String[]{
            "Holo Wave",
            "KitKat Vinyl",
            "Matrix Grid",
            "Cassette",
            "Minimal"
    };

    private static final String ART_DIR_NAME = "album_art";

    private HoloAlbumArtHelper() {
    }

    public static final class ArtworkLoadResult {
        public final Bitmap bitmap;
        public final boolean isCustom;
        public final boolean embeddedCorrupted;

        ArtworkLoadResult(Bitmap bitmap, boolean isCustom, boolean embeddedCorrupted) {
            this.bitmap = bitmap;
            this.isCustom = isCustom;
            this.embeddedCorrupted = embeddedCorrupted;
        }
    }

    public static File getCustomArtFile(Context context, long songId) {
        File dir = new File(context.getFilesDir(), ART_DIR_NAME);
        return new File(dir, "song_" + songId + ".jpg");
    }

    public static boolean hasCustomArt(Context context, long songId) {
        File file = getCustomArtFile(context, songId);
        return file.exists() && file.length() > 0L;
    }

    public static boolean saveCustomArtBitmap(Context context, long songId, Bitmap bitmap) {
        if (bitmap == null) {
            return false;
        }
        File file = getCustomArtFile(context, songId);
        File parent = file.getParentFile();
        if (parent != null && !parent.exists() && !parent.mkdirs()) {
            return false;
        }
        FileOutputStream fos = null;
        try {
            fos = new FileOutputStream(file);
            bitmap.compress(Bitmap.CompressFormat.JPEG, 90, fos);
            fos.flush();
            return true;
        } catch (IOException e) {
            return false;
        } finally {
            if (fos != null) {
                try {
                    fos.close();
                } catch (IOException ignored) {
                }
            }
        }
    }

    public static void deleteCustomArt(Context context, long songId) {
        File file = getCustomArtFile(context, songId);
        if (file.exists()) {
            //noinspection ResultOfMethodCallIgnored
            file.delete();
        }
    }

    public static ArtworkLoadResult loadTrackArtwork(Context context, long songId, int targetPx) {
        File customFile = getCustomArtFile(context, songId);
        if (customFile.exists() && customFile.length() > 0L) {
            Bitmap customBmp = decodeSampledFile(customFile.getAbsolutePath(), targetPx);
            if (customBmp != null) {
                return new ArtworkLoadResult(customBmp, true, false);
            }
        }

        byte[] embeddedBytes = null;
        MediaMetadataRetriever retriever = new MediaMetadataRetriever();
        try {
            Uri trackUri = ContentUris.withAppendedId(
                    MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, songId);
            retriever.setDataSource(context.getApplicationContext(), trackUri);
            embeddedBytes = retriever.getEmbeddedPicture();
        } catch (Exception ignored) {
        } finally {
            try {
                retriever.release();
            } catch (Exception ignored) {
            }
        }

        if (embeddedBytes != null && embeddedBytes.length > 0) {
            Bitmap embeddedBmp = decodeSampledBytes(embeddedBytes, targetPx);
            if (embeddedBmp != null) {
                return new ArtworkLoadResult(embeddedBmp, false, false);
            }
            return new ArtworkLoadResult(null, false, true);
        }

        return new ArtworkLoadResult(null, false, false);
    }

    public static Bitmap decodeAndCropFromUri(Context context, Uri uri, int outputSizePx) {
        if (context == null || uri == null) {
            return null;
        }
        ContentResolver resolver = context.getContentResolver();
        BitmapFactory.Options boundsOpts = new BitmapFactory.Options();
        boundsOpts.inJustDecodeBounds = true;

        InputStream boundsStream = null;
        try {
            boundsStream = resolver.openInputStream(uri);
            if (boundsStream == null) {
                return null;
            }
            BitmapFactory.decodeStream(boundsStream, null, boundsOpts);
        } catch (Exception e) {
            return null;
        } finally {
            closeQuietly(boundsStream);
        }

        if (boundsOpts.outWidth <= 0 || boundsOpts.outHeight <= 0) {
            return null;
        }

        BitmapFactory.Options decodeOpts = new BitmapFactory.Options();
        decodeOpts.inSampleSize = computeInSampleSize(
                boundsOpts.outWidth, boundsOpts.outHeight, outputSizePx, outputSizePx);

        InputStream decodeStream = null;
        Bitmap decoded = null;
        try {
            decodeStream = resolver.openInputStream(uri);
            if (decodeStream == null) {
                return null;
            }
            decoded = BitmapFactory.decodeStream(decodeStream, null, decodeOpts);
        } catch (Exception e) {
            return null;
        } finally {
            closeQuietly(decodeStream);
        }

        if (decoded == null) {
            return null;
        }

        int srcW = decoded.getWidth();
        int srcH = decoded.getHeight();
        int square = Math.min(srcW, srcH);
        int cropX = (srcW - square) / 2;
        int cropY = (srcH - square) / 2;

        Bitmap result = Bitmap.createBitmap(outputSizePx, outputSizePx, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(result);
        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.FILTER_BITMAP_FLAG);
        Rect srcRect = new Rect(cropX, cropY, cropX + square, cropY + square);
        Rect dstRect = new Rect(0, 0, outputSizePx, outputSizePx);
        canvas.drawBitmap(decoded, srcRect, dstRect, paint);

        if (decoded != result) {
            decoded.recycle();
        }
        return result;
    }

    public static Bitmap generateHoloCoverArt(
            String title,
            String artist,
            String album,
            int style,
            String seedText,
            int sizePx) {

        String cleanTitle = title != null && !title.trim().isEmpty() ? title.trim() : "Holo Audio";
        String cleanArtist = artist != null && !artist.trim().isEmpty() ? artist.trim() : "Unknown Artist";
        String cleanSeed = seedText != null && !seedText.trim().isEmpty()
                ? seedText.trim()
                : (album != null && !album.trim().isEmpty() ? album.trim() : cleanTitle);

        long seed = hashString(cleanTitle + "|" + cleanArtist + "|" + cleanSeed + "|" + style);
        Random rng = new Random(seed);

        Bitmap bitmap = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);
        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);

        int[] accentPalette = pickHoloAccentPalette(rng);
        int accent = accentPalette[0];
        int accentDeep = accentPalette[1];
        int accentGlow = accentPalette[2];

        // KitKat dark metallic background gradient
        paint.setShader(new LinearGradient(
                0f, 0f, sizePx, sizePx,
                new int[]{0xFF0A1016, 0xFF141E28, 0xFF080B0E},
                new float[]{0f, 0.55f, 1f},
                Shader.TileMode.CLAMP));
        canvas.drawRect(0f, 0f, sizePx, sizePx, paint);

        // Ambient radial Holo glow
        paint.setShader(new RadialGradient(
                sizePx * 0.5f, sizePx * 0.42f, sizePx * 0.58f,
                accentGlow, 0x00000000, Shader.TileMode.CLAMP));
        canvas.drawRect(0f, 0f, sizePx, sizePx, paint);
        paint.setShader(null);

        // Style artwork
        switch (style) {
            case STYLE_VINYL:
                drawVinylStyle(canvas, sizePx, accent, accentDeep);
                break;
            case STYLE_GRID:
                drawGridStyle(canvas, sizePx, accent, accentDeep);
                break;
            case STYLE_CASSETTE:
                drawCassetteStyle(canvas, sizePx, accent, accentDeep);
                break;
            case STYLE_MINIMAL:
                drawMinimalStyle(canvas, sizePx, cleanSeed, accent, accentDeep);
                break;
            case STYLE_HOLO_WAVE:
            default:
                drawWaveStyle(canvas, sizePx, rng, accent, accentDeep);
                break;
        }

        // Subtle KitKat grain speckle overlay
        Paint grainPaint = new Paint();
        for (int i = 0; i < 650; i++) {
            int gx = rng.nextInt(sizePx);
            int gy = rng.nextInt(sizePx);
            boolean bright = rng.nextBoolean();
            grainPaint.setColor(bright ? 0x10FFFFFF : 0x18000000);
            canvas.drawRect(gx, gy, gx + 2, gy + 2, grainPaint);
        }

        // Bottom gradient scrim + Holo accent rule + metadata
        paint.setShader(new LinearGradient(
                0f, sizePx * 0.62f, 0f, sizePx,
                0x0005070A, 0xE605070A, Shader.TileMode.CLAMP));
        canvas.drawRect(0f, sizePx * 0.62f, sizePx, sizePx, paint);
        paint.setShader(null);

        paint.setColor(accent);
        canvas.drawRect(sizePx * 0.08f, sizePx * 0.77f, sizePx * 0.92f, sizePx * 0.77f + Math.max(2f, sizePx * 0.006f), paint);

        String displayHeadline = cleanSeed.toUpperCase(Locale.US);
        if (displayHeadline.length() > 26) {
            displayHeadline = displayHeadline.substring(0, 25) + "…";
        }
        String displaySub = cleanArtist;
        if (displaySub.length() > 30) {
            displaySub = displaySub.substring(0, 29) + "…";
        }

        Paint titlePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        titlePaint.setColor(0xFFF3FAFF);
        titlePaint.setTypeface(Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD));
        titlePaint.setTextSize(sizePx * 0.062f);
        canvas.drawText(displayHeadline, sizePx * 0.08f, sizePx * 0.855f, titlePaint);

        Paint subPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        subPaint.setColor(accent);
        subPaint.setTypeface(Typeface.SANS_SERIF);
        subPaint.setTextSize(sizePx * 0.043f);
        canvas.drawText(displaySub, sizePx * 0.08f, sizePx * 0.915f, subPaint);

        // Subtle crisp outer frame
        Paint borderPaint = new Paint();
        borderPaint.setStyle(Paint.Style.STROKE);
        borderPaint.setStrokeWidth(Math.max(2f, sizePx * 0.006f));
        borderPaint.setColor(0x4033B5E5);
        canvas.drawRect(1f, 1f, sizePx - 1f, sizePx - 1f, borderPaint);

        return bitmap;
    }

    private static void drawWaveStyle(Canvas canvas, int sizePx, Random rng, int accent, int accentDeep) {
        Paint barPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        int barCount = 24;
        float startX = sizePx * 0.1f;
        float totalW = sizePx * 0.8f;
        float step = totalW / barCount;
        float barW = step * 0.6f;
        float centerY = sizePx * 0.42f;

        for (int i = 0; i < barCount; i++) {
            float env = (float) Math.sin(((i + 0.5) / barCount) * Math.PI);
            float h = (0.12f + rng.nextFloat() * 0.34f) * (0.4f + 0.6f * env) * sizePx;
            float left = startX + i * step;
            barPaint.setShader(new LinearGradient(
                    left, centerY - h, left, centerY + h,
                    new int[]{accent, accentDeep, accent},
                    new float[]{0f, 0.5f, 1f},
                    Shader.TileMode.CLAMP));
            RectF rect = new RectF(left, centerY - h, left + barW, centerY + h);
            canvas.drawRoundRect(rect, 3f, 3f, barPaint);
        }
    }

    private static void drawVinylStyle(Canvas canvas, int sizePx, int accent, int accentDeep) {
        float cx = sizePx * 0.5f;
        float cy = sizePx * 0.42f;
        float outerR = sizePx * 0.30f;

        Paint discPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        discPaint.setColor(0xFF0A0D10);
        canvas.drawCircle(cx, cy, outerR, discPaint);

        Paint groovePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        groovePaint.setStyle(Paint.Style.STROKE);
        groovePaint.setStrokeWidth(Math.max(1.2f, sizePx * 0.003f));
        for (int i = 1; i <= 7; i++) {
            groovePaint.setColor(i % 2 == 0 ? 0x22FFFFFF : 0x3333B5E5);
            canvas.drawCircle(cx, cy, outerR * (0.45f + i * 0.072f), groovePaint);
        }

        Paint labelPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        labelPaint.setShader(new LinearGradient(
                cx - outerR * 0.32f, cy - outerR * 0.32f,
                cx + outerR * 0.32f, cy + outerR * 0.32f,
                accent, accentDeep, Shader.TileMode.CLAMP));
        canvas.drawCircle(cx, cy, outerR * 0.32f, labelPaint);

        Paint spindlePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        spindlePaint.setColor(0xFF0A0D10);
        canvas.drawCircle(cx, cy, outerR * 0.09f, spindlePaint);
    }

    private static void drawGridStyle(Canvas canvas, int sizePx, int accent, int accentDeep) {
        Paint linePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        linePaint.setStrokeWidth(Math.max(1.2f, sizePx * 0.0035f));

        float horizonY = sizePx * 0.44f;
        linePaint.setColor(accent);
        canvas.drawLine(0f, horizonY, sizePx, horizonY, linePaint);

        for (int i = 1; i <= 7; i++) {
            float t = (float) i / 7f;
            float y = horizonY + (t * t) * (sizePx * 0.34f);
            linePaint.setColor((0x20 << 24) | (accent & 0x00FFFFFF));
            canvas.drawLine(0f, y, sizePx, y, linePaint);
        }

        float cx = sizePx * 0.5f;
        for (int i = -6; i <= 6; i++) {
            linePaint.setColor(0x4533B5E5);
            canvas.drawLine(cx + i * (sizePx * 0.03f), horizonY, cx + i * (sizePx * 0.16f), sizePx * 0.78f, linePaint);
        }

        Paint sunPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        sunPaint.setShader(new LinearGradient(
                cx, sizePx * 0.14f, cx, horizonY,
                accent, accentDeep, Shader.TileMode.CLAMP));
        canvas.drawArc(
                new RectF(cx - sizePx * 0.18f, horizonY - sizePx * 0.18f, cx + sizePx * 0.18f, horizonY + sizePx * 0.18f),
                180f, 180f, true, sunPaint);
    }

    private static void drawCassetteStyle(Canvas canvas, int sizePx, int accent, int accentDeep) {
        float w = sizePx * 0.74f;
        float h = sizePx * 0.46f;
        float left = (sizePx - w) * 0.5f;
        float top = sizePx * 0.2f;

        Paint shellPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        shellPaint.setColor(0xFF172028);
        canvas.drawRoundRect(new RectF(left, top, left + w, top + h), 14f, 14f, shellPaint);

        Paint strokePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        strokePaint.setStyle(Paint.Style.STROKE);
        strokePaint.setStrokeWidth(Math.max(2f, sizePx * 0.006f));
        strokePaint.setColor(accent);
        canvas.drawRoundRect(new RectF(left, top, left + w, top + h), 14f, 14f, strokePaint);

        Paint stripPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        stripPaint.setShader(new LinearGradient(left, top, left + w, top, accent, accentDeep, Shader.TileMode.CLAMP));
        canvas.drawRect(left + w * 0.08f, top + h * 0.14f, left + w * 0.92f, top + h * 0.34f, stripPaint);

        float reelY = top + h * 0.62f;
        float reelR = h * 0.16f;
        Paint reelPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        reelPaint.setColor(0xFF0A0F14);
        canvas.drawCircle(left + w * 0.32f, reelY, reelR, reelPaint);
        canvas.drawCircle(left + w * 0.68f, reelY, reelR, reelPaint);

        strokePaint.setColor(0xCCFFFFFF);
        canvas.drawCircle(left + w * 0.32f, reelY, reelR, strokePaint);
        canvas.drawCircle(left + w * 0.68f, reelY, reelR, strokePaint);
    }

    private static void drawMinimalStyle(Canvas canvas, int sizePx, String seed, int accent, int accentDeep) {
        float cx = sizePx * 0.5f;
        float cy = sizePx * 0.42f;
        float boxR = sizePx * 0.22f;

        Paint framePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        framePaint.setStyle(Paint.Style.STROKE);
        framePaint.setStrokeWidth(Math.max(3f, sizePx * 0.01f));
        framePaint.setColor(accent);
        canvas.drawRect(cx - boxR, cy - boxR, cx + boxR, cy + boxR, framePaint);

        framePaint.setColor(accentDeep);
        framePaint.setStrokeWidth(Math.max(2f, sizePx * 0.005f));
        canvas.drawRect(cx - boxR * 1.18f, cy - boxR * 1.18f, cx + boxR * 1.18f, cy + boxR * 1.18f, framePaint);

        String letter = seed.isEmpty() ? "H" : seed.substring(0, 1).toUpperCase(Locale.US);
        Paint glyphPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        glyphPaint.setColor(accent);
        glyphPaint.setTypeface(Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD));
        glyphPaint.setTextSize(sizePx * 0.22f);
        glyphPaint.setTextAlign(Paint.Align.CENTER);
        Paint.FontMetrics fm = glyphPaint.getFontMetrics();
        float textY = cy - (fm.ascent + fm.descent) * 0.5f;
        canvas.drawText(letter, cx, textY, glyphPaint);
    }

    private static int[] pickHoloAccentPalette(Random rng) {
        int[][] palettes = new int[][]{
                {0xFF33B5E5, 0xFF0099CC, 0x5533B5E5},
                {0xFF47C8F5, 0xFF007EA8, 0x5547C8F5},
                {0xFF56D2C6, 0xFF008B80, 0x5556D2C6},
                {0xFF70B8FF, 0xFF2268B5, 0x5570B8FF}
        };
        return palettes[rng.nextInt(palettes.length)];
    }

    private static long hashString(String s) {
        long h = 1125899906842597L;
        for (int i = 0; i < s.length(); i++) {
            h = 31L * h + s.charAt(i);
        }
        return h;
    }

    private static Bitmap decodeSampledFile(String path, int targetPx) {
        try {
            BitmapFactory.Options opts = new BitmapFactory.Options();
            opts.inJustDecodeBounds = true;
            BitmapFactory.decodeFile(path, opts);
            if (opts.outWidth <= 0 || opts.outHeight <= 0) {
                return null;
            }
            opts.inSampleSize = computeInSampleSize(opts.outWidth, opts.outHeight, targetPx, targetPx);
            opts.inJustDecodeBounds = false;
            return BitmapFactory.decodeFile(path, opts);
        } catch (Exception e) {
            return null;
        }
    }

    private static Bitmap decodeSampledBytes(byte[] bytes, int targetPx) {
        try {
            BitmapFactory.Options opts = new BitmapFactory.Options();
            opts.inJustDecodeBounds = true;
            BitmapFactory.decodeByteArray(bytes, 0, bytes.length, opts);
            if (opts.outWidth <= 0 || opts.outHeight <= 0) {
                return null;
            }
            opts.inSampleSize = computeInSampleSize(opts.outWidth, opts.outHeight, targetPx, targetPx);
            opts.inJustDecodeBounds = false;
            return BitmapFactory.decodeByteArray(bytes, 0, bytes.length, opts);
        } catch (Exception e) {
            return null;
        }
    }

    private static int computeInSampleSize(int width, int height, int reqWidth, int reqHeight) {
        int inSampleSize = 1;
        if (height > reqHeight || width > reqWidth) {
            int halfHeight = height / 2;
            int halfWidth = width / 2;
            while ((halfHeight / inSampleSize) >= reqHeight && (halfWidth / inSampleSize) >= reqWidth) {
                inSampleSize *= 2;
            }
        }
        return Math.max(1, inSampleSize);
    }

    private static void closeQuietly(InputStream stream) {
        if (stream != null) {
            try {
                stream.close();
            } catch (IOException ignored) {
            }
        }
    }
}
