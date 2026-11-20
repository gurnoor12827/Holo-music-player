package com.example;

import android.Manifest;
import android.annotation.SuppressLint;
import android.annotation.TargetApi;
import android.app.ActionBar;
import android.app.Activity;
import android.app.AlertDialog;
import android.app.FragmentTransaction;
import android.content.ContentResolver;
import android.content.ContentUris;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.Insets;
import android.graphics.PorterDuff;
import android.graphics.Typeface;
import android.graphics.drawable.ColorDrawable;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.GradientDrawable;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaExtractor;
import android.media.MediaFormat;
import android.media.MediaPlayer;
import android.media.audiofx.EnvironmentalReverb;
import android.media.audiofx.PresetReverb;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.provider.MediaStore;
import android.provider.Settings;
import android.text.Editable;
import android.text.SpannableString;
import android.text.Spanned;
import android.text.TextWatcher;
import android.text.style.ForegroundColorSpan;
import android.util.LruCache;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.widget.AdapterView;
import android.widget.BaseAdapter;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.CompoundButton;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ImageButton;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ListView;
import android.widget.ProgressBar;
import android.widget.RadioButton;
import android.widget.RadioGroup;
import android.widget.ScrollView;
import android.widget.SearchView;
import android.widget.SeekBar;
import android.widget.TextView;
import android.widget.Toast;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Random;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@SuppressWarnings("deprecation")
public class MainActivity extends Activity {

    private static final int REQUEST_PERMISSION_AUDIO = 1001;
    private static final int REQUEST_PICK_ALBUM_ART = 1002;

    private static final int TAB_ALL_SONGS = 0;
    private static final int TAB_RECENT = 1;
    private static final int TAB_FAVORITES = 2;

    private static final int SORT_TITLE_ASC = 0;
    private static final int SORT_ARTIST_ASC = 1;
    private static final int SORT_DURATION_DESC = 2;
    private static final int SORT_DATE_DESC = 3;

    private static final int REPEAT_OFF = 0;
    private static final int REPEAT_ALL = 1;
    private static final int REPEAT_ONE = 2;

    private static final int NP_STAGE_SPLIT = 0;
    private static final int NP_STAGE_VISUALIZER = 1;
    private static final int NP_STAGE_ARTWORK = 2;

    private static final int MENU_ID_SEARCH = 1;
    private static final int MENU_ID_SORT = 2;
    private static final int MENU_ID_SETTINGS = 3;

    private static final String PREFS_NAME = "holo_music_prefs";
    private static final String KEY_FAVORITE_IDS = "favorite_song_ids";
    private static final String KEY_SORT_MODE = "sort_mode";
    private static final String KEY_THEME_ID = "theme_id";
    private static final String KEY_SHOW_LIST_ART = "show_list_art";
    private static final String KEY_SHUFFLE = "shuffle_enabled";
    private static final String KEY_REPEAT_MODE = "repeat_mode";
    private static final String KEY_SHAKE_TO_SKIP = "shake_to_skip";
    private static final String KEY_CROSSFADE_SEC = "crossfade_seconds";
    private static final String KEY_REVERB_PRESET = "reverb_preset";
    private static final String KEY_VISUALIZER_MODE = "visualizer_mode";

    private static final String[] REVERB_LABELS = new String[]{
            "Off",
            "Small Room",
            "Medium Hall",
            "Large Hall",
            "Studio Plate"
    };
    private static final int[] CROSSFADE_VALUES = new int[]{0, 2, 4, 6};
    private static final String[] CROSSFADE_LABELS = new String[]{
            "Off",
            "2 seconds",
            "4 seconds",
            "6 seconds"
    };

    public static final class Song {
        final long id;
        final long albumId;
        final String title;
        final String artist;
        final String album;
        final long durationMs;
        final long dateAddedSec;
        final String filePath;

        Song(long id, long albumId, String title, String artist, String album,
             long durationMs, long dateAddedSec, String filePath) {
            this.id = id;
            this.albumId = albumId;
            this.title = title;
            this.artist = artist;
            this.album = album;
            this.durationMs = durationMs;
            this.dateAddedSec = dateAddedSec;
            this.filePath = filePath != null ? filePath : "";
        }
    }

    private final List<Song> allSongs = new ArrayList<>();
    private final List<Song> displayedSongs = new ArrayList<>();
    private final Set<Long> favoriteSongIds = new HashSet<>();

    private final LruCache<Long, Bitmap> artThumbCache = new LruCache<Long, Bitmap>(4 * 1024 * 1024) {
        @Override
        protected int sizeOf(Long key, Bitmap value) {
            return value != null ? value.getByteCount() : 0;
        }
    };
    private final Set<Long> artLoadInFlight = new HashSet<>();
    private final Set<Long> noArtSongIds = new HashSet<>();
    private final Set<Long> corruptedArtSongIds = new HashSet<>();
    private final Set<Long> customArtSongIds = new HashSet<>();
    private Bitmap listNotePlaceholderBitmap;

    private FrameLayout rootLayout;
    private LinearLayout libraryContainer;
    private View viewActionBarRule;
    private LinearLayout subheaderBar;
    private View dividerSubheader;
    private View dividerDockTop;
    private LinearLayout bottomPlaybackBar;
    private LinearLayout miniPlayerClickable;
    private ProgressBar miniProgressBar;

    private ListView listSongs;
    private View emptyView;
    private TextView tvEmptyTitle;
    private TextView tvEmptyMessage;
    private Button btnEmptyAction;
    private TextView tvSectionHeader;
    private TextView tvTrackCount;

    private ImageView ivNowPlayingArt;
    private TextView tvNowPlayingTitle;
    private TextView tvNowPlayingArtist;
    private ImageButton btnPrevious;
    private ImageButton btnPlayPause;
    private ImageButton btnNext;

    // Full-screen Now Playing controls
    private LinearLayout nowPlayingScreen;
    private LinearLayout npHeaderBar;
    private View dividerNpTop;
    private View dividerNpBottom;
    private FrameLayout npArtFrame;
    private LinearLayout npTransportBar;
    private ImageButton btnNpCollapse;
    private TextView tvNpHeaderTitle;
    private TextView tvNpQueuePos;
    private ImageButton btnNpEditArt;
    private ImageView ivNpArtwork;
    private TextView tvNpTitle;
    private TextView tvNpArtist;
    private TextView tvNpElapsed;
    private TextView tvNpTotal;
    private SeekBar seekBarNp;
    private ImageButton btnNpShuffle;
    private ImageButton btnNpPrev;
    private ImageButton btnNpPlayPause;
    private ImageButton btnNpNext;
    private ImageButton btnNpRepeat;
    private ImageButton btnNpVizSettings;
    private AudioVisualizerView audioVisualizer;

    // Settings screen controls
    private LinearLayout settingsScreen;
    private LinearLayout settingsHeaderBar;
    private View dividerSettingsTop;
    private View dividerSettingsMid;
    private View dividerSettingsFx;
    private ImageButton btnSettingsBack;
    private TextView tvSettingsHeaderTitle;
    private TextView tvSettingsThemeLabel;
    private RadioGroup rgThemes;
    private RadioButton rbThemeHolo;
    private RadioButton rbThemeAero;
    private RadioButton rbThemeSkeuo;
    private TextView tvThemeSummary;
    private TextView tvSettingsLibraryLabel;
    private CheckBox cbShowListArt;
    private Button btnSettingsSort;
    private Button btnSettingsRescan;
    private TextView tvSettingsFxLabel;
    private CheckBox cbShakeToSkip;
    private Button btnSettingsCrossfade;
    private Button btnSettingsReverb;
    private Button btnSettingsVisualizer;
    private Button btnSettingsSleep;
    private View dividerSettingsAbout;
    private TextView tvSettingsAboutLabel;
    private TextView tvSettingsVersion;
    private FrameLayout startupSplashOverlay;
    private StartupSplashView startupSplashView;

    private SongAdapter songAdapter;
    private MediaPlayer mediaPlayer;
    private MediaPlayer fadingOutPlayer;
    private EnvironmentalReverb environmentalReverb;
    private int environmentalReverbSessionId = 0;
    private PresetReverb presetReverb;
    private AudioManager audioManager;
    private AudioFocusRequest audioFocusRequest;
    private SensorManager sensorManager;
    private Sensor accelerometer;
    private boolean isShakeListenerRegistered = false;
    private long lastShakeSkipMs = 0L;

    private final Handler uiHandler = new Handler(Looper.getMainLooper());
    private final ExecutorService queryExecutor = Executors.newSingleThreadExecutor();
    private final ExecutorService artExecutor = Executors.newFixedThreadPool(2);
    private final Random shuffleRng = new Random();

    private ImageView activeArtPreviewView;
    private Bitmap activeArtPreviewBitmap;
    private TextView activeArtStatusText;

    private long currentSongId = -1L;
    private int currentPlaylistIndex = -1;
    private final List<Song> playbackQueue = new ArrayList<>();

    private boolean isMediaPrepared = false;
    private boolean isUserSeeking = false;
    private boolean resumeOnFocusGain = false;
    private boolean hasRequestedPermissionOnce = false;
    private boolean isNowPlayingOpen = false;
    private int nowPlayingStageMode = NP_STAGE_SPLIT;
    private boolean isSettingsOpen = false;
    private Object backInvokedCallback;
    private boolean isBackCallbackRegistered = false;
    private long startupShownAtMs = 0L;
    private boolean isStartupSplashDismissed = false;

    private long crossfadeStartMs = 0L;
    private long crossfadeDurationMs = 0L;
    private boolean autoCrossfadeTriggeredForCurrentTrack = false;

    private ThemeConfig currentTheme = ThemeConfig.HOLO;
    private boolean showListArtwork = true;
    private boolean shuffleEnabled = false;
    private int repeatMode = REPEAT_OFF;
    private boolean shakeToSkipEnabled = false;
    private int crossfadeSeconds = 0;
    private int reverbPresetIndex = 0;
    private int visualizerMode = AudioVisualizerView.MODE_LED_BARS;
    private int sleepTimerMinutes = 0;
    private long sleepTimerDeadlineMs = 0L;
    private float sleepFadeMultiplier = 1.0f;

    private int activeTab = TAB_ALL_SONGS;
    private int currentSortMode = SORT_TITLE_ASC;
    private String searchQuery = "";

    private final Runnable progressRunnable = new Runnable() {
        @Override
        public void run() {
            updateSeekProgress();
            if (mediaPlayer != null && isMediaPrepared && isPlayingSafe()) {
                uiHandler.postDelayed(this, 250L);
            }
        }
    };

    private final Runnable crossfadeRunnable = new Runnable() {
        @Override
        public void run() {
            if (fadingOutPlayer == null || crossfadeDurationMs <= 0L) {
                return;
            }
            long elapsed = SystemClock.uptimeMillis() - crossfadeStartMs;
            float t = Math.max(0f, Math.min(1f, (float) elapsed / (float) crossfadeDurationMs));
            float outVol = Math.max(0f, 1.0f - t);
            float inVol = t;
            try {
                fadingOutPlayer.setVolume(outVol, outVol);
            } catch (IllegalStateException ignored) {
            }
            if (mediaPlayer != null && isMediaPrepared) {
                try {
                    mediaPlayer.setVolume(inVol, inVol);
                } catch (IllegalStateException ignored) {
                }
            }
            if (t >= 1.0f) {
                releaseFadingOutPlayer();
                if (mediaPlayer != null && isMediaPrepared) {
                    try {
                        mediaPlayer.setVolume(1.0f, 1.0f);
                    } catch (IllegalStateException ignored) {
                    }
                }
            } else {
                uiHandler.postDelayed(this, 50L);
            }
        }
    };

    private final Runnable sleepTimerRunnable = new Runnable() {
        @Override
        public void run() {
            if (sleepTimerDeadlineMs <= 0L) {
                return;
            }
            long remainingMs = sleepTimerDeadlineMs - SystemClock.uptimeMillis();
            if (remainingMs <= 0L) {
                sleepTimerMinutes = 0;
                sleepTimerDeadlineMs = 0L;
                sleepFadeMultiplier = 1.0f;
                pausePlayback();
                if (mediaPlayer != null && isMediaPrepared) {
                    try {
                        mediaPlayer.setVolume(1.0f, 1.0f);
                    } catch (IllegalStateException ignored) {
                    }
                }
                updateAudioEffectsButtonLabels();
                updateQueueCounterText();
                Toast.makeText(MainActivity.this, "Sleep timer paused playback.", Toast.LENGTH_SHORT).show();
                return;
            }

            if (remainingMs <= 6000L) {
                sleepFadeMultiplier = Math.max(0f, (float) remainingMs / 6000f);
                if (mediaPlayer != null && isMediaPrepared && isPlayingSafe()) {
                    try {
                        mediaPlayer.setVolume(sleepFadeMultiplier, sleepFadeMultiplier);
                    } catch (IllegalStateException ignored) {
                    }
                }
                updateAudioEffectsButtonLabels();
                updateQueueCounterText();
                uiHandler.postDelayed(this, 200L);
            } else {
                sleepFadeMultiplier = 1.0f;
                updateAudioEffectsButtonLabels();
                updateQueueCounterText();
                uiHandler.postDelayed(this, 1000L);
            }
        }
    };

    private final SensorEventListener shakeSensorListener = new SensorEventListener() {
        @Override
        public void onSensorChanged(SensorEvent event) {
            if (!shakeToSkipEnabled || event == null || event.values == null || event.values.length < 3) {
                return;
            }
            float gX = event.values[0] / SensorManager.GRAVITY_EARTH;
            float gY = event.values[1] / SensorManager.GRAVITY_EARTH;
            float gZ = event.values[2] / SensorManager.GRAVITY_EARTH;
            double gForce = Math.sqrt(gX * gX + gY * gY + gZ * gZ);
            if (gForce > 2.35d) {
                long now = SystemClock.uptimeMillis();
                if (now - lastShakeSkipMs > 1400L) {
                    lastShakeSkipMs = now;
                    playNext();
                    Toast.makeText(MainActivity.this, "Skipped track (shake)", Toast.LENGTH_SHORT).show();
                }
            }
        }

        @Override
        public void onAccuracyChanged(Sensor sensor, int accuracy) {
        }
    };

    private final AudioManager.OnAudioFocusChangeListener audioFocusListener =
            new AudioManager.OnAudioFocusChangeListener() {
                @Override
                public void onAudioFocusChange(int focusChange) {
                    if (mediaPlayer == null || !isMediaPrepared) {
                        return;
                    }
                    switch (focusChange) {
                        case AudioManager.AUDIOFOCUS_LOSS:
                            resumeOnFocusGain = false;
                            if (isPlayingSafe()) {
                                pausePlayback();
                            }
                            break;
                        case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT:
                            if (isPlayingSafe()) {
                                resumeOnFocusGain = true;
                                pausePlayback();
                            }
                            break;
                        case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK:
                            mediaPlayer.setVolume(0.25f, 0.25f);
                            break;
                        case AudioManager.AUDIOFOCUS_GAIN:
                            mediaPlayer.setVolume(1.0f, 1.0f);
                            if (resumeOnFocusGain && !isPlayingSafe()) {
                                resumeOnFocusGain = false;
                                resumePlayback();
                            }
                            break;
                        default:
                            break;
                    }
                }
            };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        applySystemBarInsetsIfEnforced();
        loadPreferences();

        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        sensorManager = (SensorManager) getSystemService(Context.SENSOR_SERVICE);
        if (sensorManager != null) {
            accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
        }

        bindViews();
        setupActionBarTabs();
        setupListeners();
        applyTheme(currentTheme);

        checkPermissionAndLoadSongs(true);
    }

    @TargetApi(30)
    private void applySystemBarInsetsIfEnforced() {
        if (Build.VERSION.SDK_INT >= 35 && getApplicationInfo().targetSdkVersion >= 35) {
            final View decorView = getWindow().getDecorView();
            if (decorView instanceof ViewGroup && ((ViewGroup) decorView).getChildCount() > 0) {
                final View decorContent = ((ViewGroup) decorView).getChildAt(0);
                decorView.setOnApplyWindowInsetsListener(new View.OnApplyWindowInsetsListener() {
                    @Override
                    @TargetApi(30)
                    public WindowInsets onApplyWindowInsets(View v, WindowInsets windowInsets) {
                        Insets bars = windowInsets.getInsets(
                                WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                        decorContent.setPadding(bars.left, bars.top, bars.right, bars.bottom);
                        return WindowInsets.CONSUMED;
                    }
                });
            }
        }
    }

    private void loadPreferences() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        currentSortMode = prefs.getInt(KEY_SORT_MODE, SORT_TITLE_ASC);
        currentTheme = ThemeConfig.fromId(prefs.getInt(KEY_THEME_ID, ThemeConfig.THEME_HOLO));
        showListArtwork = prefs.getBoolean(KEY_SHOW_LIST_ART, true);
        shuffleEnabled = prefs.getBoolean(KEY_SHUFFLE, false);
        repeatMode = prefs.getInt(KEY_REPEAT_MODE, REPEAT_OFF);
        shakeToSkipEnabled = prefs.getBoolean(KEY_SHAKE_TO_SKIP, false);
        crossfadeSeconds = prefs.getInt(KEY_CROSSFADE_SEC, 0);
        reverbPresetIndex = Math.max(0, Math.min(REVERB_LABELS.length - 1, prefs.getInt(KEY_REVERB_PRESET, 0)));
        visualizerMode = Math.max(AudioVisualizerView.MODE_WATER_REFLEX,
                Math.min(AudioVisualizerView.MODE_AREA_LINE,
                        prefs.getInt(KEY_VISUALIZER_MODE, AudioVisualizerView.MODE_LED_BARS)));

        Set<String> storedIds = prefs.getStringSet(KEY_FAVORITE_IDS, Collections.<String>emptySet());
        favoriteSongIds.clear();
        if (storedIds != null) {
            for (String rawId : storedIds) {
                try {
                    favoriteSongIds.add(Long.parseLong(rawId));
                } catch (NumberFormatException ignored) {
                }
            }
        }
    }

    private void saveFavoriteIds() {
        Set<String> encoded = new HashSet<>();
        for (Long id : favoriteSongIds) {
            encoded.add(String.valueOf(id));
        }
        getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
                .edit()
                .putStringSet(KEY_FAVORITE_IDS, encoded)
                .apply();
    }

    private void bindViews() {
        rootLayout = findViewById(R.id.root_layout);
        libraryContainer = findViewById(R.id.library_container);
        viewActionBarRule = findViewById(R.id.view_actionbar_rule);
        subheaderBar = findViewById(R.id.subheader_bar);
        dividerSubheader = findViewById(R.id.divider_subheader);
        dividerDockTop = findViewById(R.id.divider_dock_top);
        bottomPlaybackBar = findViewById(R.id.bottom_playback_bar);
        miniPlayerClickable = findViewById(R.id.mini_player_clickable);
        miniProgressBar = findViewById(R.id.mini_progress_bar);

        listSongs = findViewById(R.id.list_songs);
        emptyView = findViewById(R.id.empty_view);
        tvEmptyTitle = findViewById(R.id.tv_empty_title);
        tvEmptyMessage = findViewById(R.id.tv_empty_message);
        btnEmptyAction = findViewById(R.id.btn_empty_action);
        tvSectionHeader = findViewById(R.id.tv_section_header);
        tvTrackCount = findViewById(R.id.tv_track_count);

        ivNowPlayingArt = findViewById(R.id.iv_now_playing_art);
        tvNowPlayingTitle = findViewById(R.id.tv_now_playing_title);
        tvNowPlayingArtist = findViewById(R.id.tv_now_playing_artist);
        btnPrevious = findViewById(R.id.btn_previous);
        btnPlayPause = findViewById(R.id.btn_play_pause);
        btnNext = findViewById(R.id.btn_next);

        nowPlayingScreen = findViewById(R.id.now_playing_screen);
        npHeaderBar = findViewById(R.id.np_header_bar);
        dividerNpTop = findViewById(R.id.divider_np_top);
        dividerNpBottom = findViewById(R.id.divider_np_bottom);
        npArtFrame = findViewById(R.id.np_art_frame);
        npTransportBar = findViewById(R.id.np_transport_bar);
        btnNpCollapse = findViewById(R.id.btn_np_collapse);
        tvNpHeaderTitle = findViewById(R.id.tv_np_header_title);
        tvNpQueuePos = findViewById(R.id.tv_np_queue_pos);
        btnNpEditArt = findViewById(R.id.btn_np_edit_art);
        ivNpArtwork = findViewById(R.id.iv_np_artwork);
        tvNpTitle = findViewById(R.id.tv_np_title);
        tvNpArtist = findViewById(R.id.tv_np_artist);
        tvNpElapsed = findViewById(R.id.tv_np_elapsed);
        tvNpTotal = findViewById(R.id.tv_np_total);
        seekBarNp = findViewById(R.id.seek_bar_np);
        btnNpShuffle = findViewById(R.id.btn_np_shuffle);
        btnNpPrev = findViewById(R.id.btn_np_prev);
        btnNpPlayPause = findViewById(R.id.btn_np_play_pause);
        btnNpNext = findViewById(R.id.btn_np_next);
        btnNpRepeat = findViewById(R.id.btn_np_repeat);
        btnNpVizSettings = findViewById(R.id.btn_np_viz_settings);
        audioVisualizer = findViewById(R.id.audio_visualizer);

        settingsScreen = findViewById(R.id.settings_screen);
        settingsHeaderBar = findViewById(R.id.settings_header_bar);
        dividerSettingsTop = findViewById(R.id.divider_settings_top);
        dividerSettingsMid = findViewById(R.id.divider_settings_mid);
        dividerSettingsFx = findViewById(R.id.divider_settings_fx);
        btnSettingsBack = findViewById(R.id.btn_settings_back);
        tvSettingsHeaderTitle = findViewById(R.id.tv_settings_header_title);
        tvSettingsThemeLabel = findViewById(R.id.tv_settings_theme_label);
        rgThemes = findViewById(R.id.rg_themes);
        rbThemeHolo = findViewById(R.id.rb_theme_holo);
        rbThemeAero = findViewById(R.id.rb_theme_aero);
        rbThemeSkeuo = findViewById(R.id.rb_theme_skeuo);
        tvThemeSummary = findViewById(R.id.tv_theme_summary);
        tvSettingsLibraryLabel = findViewById(R.id.tv_settings_library_label);
        cbShowListArt = findViewById(R.id.cb_show_list_art);
        btnSettingsSort = findViewById(R.id.btn_settings_sort);
        btnSettingsRescan = findViewById(R.id.btn_settings_rescan);
        tvSettingsFxLabel = findViewById(R.id.tv_settings_fx_label);
        cbShakeToSkip = findViewById(R.id.cb_shake_to_skip);
        btnSettingsCrossfade = findViewById(R.id.btn_settings_crossfade);
        btnSettingsReverb = findViewById(R.id.btn_settings_reverb);
        btnSettingsVisualizer = findViewById(R.id.btn_settings_visualizer);
        btnSettingsSleep = findViewById(R.id.btn_settings_sleep);
        dividerSettingsAbout = findViewById(R.id.divider_settings_about);
        tvSettingsAboutLabel = findViewById(R.id.tv_settings_about_label);
        tvSettingsVersion = findViewById(R.id.tv_settings_version);
        startupSplashOverlay = findViewById(R.id.startup_splash_overlay);
        startupSplashView = findViewById(R.id.startup_splash_view);

        startupShownAtMs = SystemClock.uptimeMillis();
        if (startupSplashOverlay != null && !isStartupSplashDismissed) {
            startupSplashOverlay.setVisibility(View.VISIBLE);
            startupSplashOverlay.setAlpha(1f);
            ActionBar initialAb = getActionBar();
            if (initialAb != null) {
                initialAb.hide();
            }
            if (startupSplashView != null) {
                startupSplashView.setThemeTint(currentTheme);
                startupSplashView.startAnimationLoop();
            }
        }

        tvNowPlayingTitle.setSelected(true);
        tvNpTitle.setSelected(true);
        listSongs.setEmptyView(emptyView);

        cbShowListArt.setChecked(showListArtwork);
        cbShakeToSkip.setChecked(shakeToSkipEnabled);
        audioVisualizer.setMode(visualizerMode);
        updateAudioEffectsButtonLabels();
        if (currentTheme.id == ThemeConfig.THEME_AERO) {
            rbThemeAero.setChecked(true);
        } else if (currentTheme.id == ThemeConfig.THEME_SKEUOMORPHIC) {
            rbThemeSkeuo.setChecked(true);
        } else {
            rbThemeHolo.setChecked(true);
        }

        songAdapter = new SongAdapter();
        listSongs.setAdapter(songAdapter);
    }

    private int getControlCornerDp(ThemeConfig theme) {
        if (theme.id == ThemeConfig.THEME_HOLO) {
            return 2;
        }
        return theme.id == ThemeConfig.THEME_AERO ? 22 : 6;
    }

    private void applyTheme(ThemeConfig theme) {
        currentTheme = theme;
        int radius = getControlCornerDp(theme);
        listNotePlaceholderBitmap = ThemeConfig.createMusicNotePlaceholderBitmap(
                theme, ThemeConfig.dp(this, 40));

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            if (!isStartupSplashDismissed) {
                getWindow().setStatusBarColor(0xFF000000);
                getWindow().setNavigationBarColor(0xFF000000);
            } else {
                getWindow().setStatusBarColor(theme.actionBarTop);
                getWindow().setNavigationBarColor(theme.dockBottom);
            }
        }
        if (startupSplashView != null) {
            startupSplashView.setThemeTint(theme);
        }

        rootLayout.setBackground(ThemeConfig.createBackdropDrawable(theme));
        libraryContainer.setBackground(ThemeConfig.createBackdropDrawable(theme));

        ActionBar actionBar = getActionBar();
        if (actionBar != null) {
            actionBar.setBackgroundDrawable(
                    ThemeConfig.createVerticalSurface(theme.actionBarTop, theme.actionBarBottom, 0, 0, 0));
            actionBar.setStackedBackgroundDrawable(new ColorDrawable(theme.subheaderBg));
            updateActionBarLabels();
        }

        viewActionBarRule.setBackgroundColor(theme.accent);
        subheaderBar.setBackgroundColor(theme.subheaderBg);
        dividerSubheader.setBackgroundColor(theme.dividerColor);
        dividerDockTop.setBackgroundColor(theme.dockHighlight);

        tvSectionHeader.setTextColor(theme.accent);
        tvTrackCount.setTextColor(theme.textSecondary);
        listSongs.setDivider(new ColorDrawable(theme.dividerColor));
        listSongs.setDividerHeight(ThemeConfig.dp(this, 1));

        tvEmptyTitle.setTextColor(theme.textPrimary);
        tvEmptyMessage.setTextColor(theme.textSecondary);
        btnEmptyAction.setBackground(ThemeConfig.createControlSurface(this, theme, false, radius));
        btnEmptyAction.setTextColor(theme.accent);

        // Mini-Player
        bottomPlaybackBar.setBackground(
                ThemeConfig.createVerticalSurface(theme.dockTop, theme.dockBottom, 0, 0, 0));
        ThemeConfig.styleProgressTrack(this, miniProgressBar, theme);
        tvNowPlayingTitle.setTextColor(theme.textPrimary);
        tvNowPlayingArtist.setTextColor(theme.accent);
        btnPrevious.setBackground(ThemeConfig.createControlSurface(this, theme, false, radius));
        btnPlayPause.setBackground(ThemeConfig.createControlSurface(this, theme, true, radius));
        btnNext.setBackground(ThemeConfig.createControlSurface(this, theme, false, radius));
        ThemeConfig.tintButton(btnPrevious, theme.textPrimary);
        ThemeConfig.tintButton(btnPlayPause, theme.onAccentText);
        ThemeConfig.tintButton(btnNext, theme.textPrimary);

        // Full-Screen Now Playing
        nowPlayingScreen.setBackground(ThemeConfig.createBackdropDrawable(theme));
        npHeaderBar.setBackground(ThemeConfig.createVerticalSurface(theme.dockTop, theme.dockBottom, 0, 0, 0));
        dividerNpTop.setBackgroundColor(theme.dividerColor);
        dividerNpBottom.setBackgroundColor(theme.dividerColor);
        npTransportBar.setBackground(ThemeConfig.createVerticalSurface(theme.dockTop, theme.dockBottom, 0, 0, 0));
        npArtFrame.setBackground(ThemeConfig.createVerticalSurface(
                theme.buttonTop, theme.buttonBottom,
                theme.id == ThemeConfig.THEME_HOLO ? 0 : ThemeConfig.dp(this, 10),
                ThemeConfig.dp(this, 1),
                theme.dividerColor));

        btnNpCollapse.setImageBitmap(ThemeConfig.createCollapseIconBitmap(this, theme.textPrimary));
        tvNpHeaderTitle.setTextColor(theme.textPrimary);
        tvNpQueuePos.setTextColor(theme.textSecondary);
        ThemeConfig.tintButton(btnNpEditArt, theme.accent);
        tvNpTitle.setTextColor(theme.textPrimary);
        tvNpArtist.setTextColor(theme.accent);
        tvNpElapsed.setTextColor(theme.accent);
        tvNpTotal.setTextColor(theme.textSecondary);
        ThemeConfig.styleSeekBar(this, seekBarNp, theme);

        btnNpPrev.setBackground(ThemeConfig.createControlSurface(this, theme, false, radius));
        btnNpPlayPause.setBackground(ThemeConfig.createControlSurface(this, theme, true, radius));
        btnNpNext.setBackground(ThemeConfig.createControlSurface(this, theme, false, radius));
        ThemeConfig.tintButton(btnNpPrev, theme.textPrimary);
        ThemeConfig.tintButton(btnNpPlayPause, theme.onAccentText);
        ThemeConfig.tintButton(btnNpNext, theme.textPrimary);
        audioVisualizer.setTheme(theme);
        styleNowPlayingCornerSettingsButton(theme, radius);
        updateShuffleRepeatButtons();

        // Settings screen
        settingsScreen.setBackground(ThemeConfig.createBackdropDrawable(theme));
        settingsHeaderBar.setBackground(ThemeConfig.createVerticalSurface(theme.dockTop, theme.dockBottom, 0, 0, 0));
        dividerSettingsTop.setBackgroundColor(theme.dividerColor);
        dividerSettingsMid.setBackgroundColor(theme.dividerColor);
        dividerSettingsFx.setBackgroundColor(theme.dividerColor);
        btnSettingsBack.setImageBitmap(ThemeConfig.createBackArrowBitmap(this, theme.textPrimary));
        tvSettingsHeaderTitle.setTextColor(theme.textPrimary);
        tvSettingsThemeLabel.setTextColor(theme.accent);
        rbThemeHolo.setTextColor(theme.textPrimary);
        rbThemeAero.setTextColor(theme.textPrimary);
        rbThemeSkeuo.setTextColor(theme.textPrimary);
        tvThemeSummary.setText(theme.subtitle);
        tvThemeSummary.setTextColor(theme.textSecondary);
        tvSettingsLibraryLabel.setTextColor(theme.accent);
        cbShowListArt.setTextColor(theme.textPrimary);
        btnSettingsSort.setBackground(ThemeConfig.createControlSurface(this, theme, false, radius));
        btnSettingsSort.setTextColor(theme.textPrimary);
        btnSettingsRescan.setBackground(ThemeConfig.createControlSurface(this, theme, true, radius));
        btnSettingsRescan.setTextColor(theme.onAccentText);
        tvSettingsFxLabel.setTextColor(theme.accent);
        cbShakeToSkip.setTextColor(theme.textPrimary);
        btnSettingsCrossfade.setBackground(ThemeConfig.createControlSurface(this, theme, false, radius));
        btnSettingsCrossfade.setTextColor(theme.textPrimary);
        btnSettingsReverb.setBackground(ThemeConfig.createControlSurface(this, theme, false, radius));
        btnSettingsReverb.setTextColor(theme.textPrimary);
        btnSettingsVisualizer.setBackground(ThemeConfig.createControlSurface(this, theme, false, radius));
        btnSettingsVisualizer.setTextColor(theme.textPrimary);
        btnSettingsSleep.setBackground(ThemeConfig.createControlSurface(this, theme, false, radius));
        btnSettingsSleep.setTextColor(theme.textPrimary);
        dividerSettingsAbout.setBackgroundColor(theme.dividerColor);
        tvSettingsAboutLabel.setTextColor(theme.accent);
        tvSettingsVersion.setTextColor(theme.textPrimary);

        updateNowPlayingArtworkView(currentSongId);
        updatePlayPauseIcon(isPlayingSafe());
        songAdapter.notifyDataSetChanged();
    }

    private void styleNowPlayingCornerSettingsButton(ThemeConfig theme, int radius) {
        if (btnNpVizSettings == null) {
            return;
        }
        boolean vizVisible = nowPlayingStageMode != NP_STAGE_ARTWORK;
        btnNpVizSettings.setBackground(ThemeConfig.createControlSurface(
                this, theme, vizVisible, radius));
        ThemeConfig.tintButton(
                btnNpVizSettings,
                vizVisible ? theme.onAccentText : theme.textPrimary);
    }

    private void setNowPlayingStageMode(int stageMode) {
        if (stageMode < NP_STAGE_SPLIT || stageMode > NP_STAGE_ARTWORK) {
            stageMode = NP_STAGE_SPLIT;
        }
        nowPlayingStageMode = stageMode;
        boolean showArtwork = stageMode != NP_STAGE_VISUALIZER;
        boolean showVisualizer = stageMode != NP_STAGE_ARTWORK;

        if (npArtFrame != null) {
            npArtFrame.setVisibility(showArtwork ? View.VISIBLE : View.GONE);
            ViewGroup.LayoutParams lp = npArtFrame.getLayoutParams();
            if (lp != null) {
                int targetPx = dpToPx(stageMode == NP_STAGE_ARTWORK ? 248 : 148);
                if (lp.width != targetPx || lp.height != targetPx) {
                    lp.width = targetPx;
                    lp.height = targetPx;
                    npArtFrame.setLayoutParams(lp);
                }
            }
        }
        if (ivNpArtwork != null) {
            ivNpArtwork.setVisibility(showArtwork ? View.VISIBLE : View.GONE);
        }
        if (audioVisualizer != null) {
            audioVisualizer.setVisibility(showVisualizer ? View.VISIBLE : View.GONE);
        }

        int radius = getControlCornerDp(currentTheme);
        styleNowPlayingCornerSettingsButton(currentTheme, radius);
        long pos = 0L;
        if (mediaPlayer != null && isMediaPrepared) {
            try {
                pos = mediaPlayer.getCurrentPosition();
            } catch (IllegalStateException ignored) {
            }
        }
        audioVisualizer.setPlayingState(isPlayingSafe(), currentSongId, pos);
    }

    private void setVisualizerMode(int mode) {
        visualizerMode = Math.max(AudioVisualizerView.MODE_WATER_REFLEX,
                Math.min(AudioVisualizerView.MODE_AREA_LINE, mode));
        getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
                .edit()
                .putInt(KEY_VISUALIZER_MODE, visualizerMode)
                .apply();
        audioVisualizer.setMode(visualizerMode);
        updateAudioEffectsButtonLabels();
    }

    private void updateAudioEffectsButtonLabels() {
        if (btnSettingsCrossfade != null) {
            String cf = crossfadeSeconds <= 0 ? "Off" : (crossfadeSeconds + "s");
            btnSettingsCrossfade.setText(getString(R.string.settings_crossfade_prefix) + cf);
        }
        if (btnSettingsReverb != null) {
            btnSettingsReverb.setText(getString(R.string.settings_reverb_prefix) + REVERB_LABELS[reverbPresetIndex]);
        }
        if (btnSettingsVisualizer != null) {
            btnSettingsVisualizer.setText(getString(R.string.settings_visualizer_prefix)
                    + AudioVisualizerView.MODE_LABELS[visualizerMode]);
        }
        if (btnSettingsSleep != null) {
            if (sleepTimerDeadlineMs > 0L) {
                long rem = Math.max(0L, sleepTimerDeadlineMs - SystemClock.uptimeMillis());
                btnSettingsSleep.setText(getString(R.string.settings_sleep_prefix) + formatDuration(rem));
            } else {
                btnSettingsSleep.setText(getString(R.string.settings_sleep_prefix) + "Off");
            }
        }
    }

    private void updateActionBarLabels() {
        ActionBar actionBar = getActionBar();
        if (actionBar == null) {
            return;
        }
        SpannableString title = new SpannableString("Holo Player");
        title.setSpan(new ForegroundColorSpan(currentTheme.actionBarText), 0, title.length(),
                Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
        actionBar.setTitle(title);

        int count = allSongs.size();
        String subText = count + (count == 1 ? " local track" : " local tracks");
        SpannableString sub = new SpannableString(subText);
        sub.setSpan(new ForegroundColorSpan(currentTheme.actionBarSubText), 0, sub.length(),
                Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
        actionBar.setSubtitle(sub);
    }

    private void updateShuffleRepeatButtons() {
        btnNpShuffle.setImageBitmap(ThemeConfig.createShuffleIconBitmap(
                this, shuffleEnabled ? currentTheme.accent : currentTheme.textDim));
        btnNpRepeat.setImageBitmap(ThemeConfig.createRepeatIconBitmap(
                this,
                repeatMode != REPEAT_OFF ? currentTheme.accent : currentTheme.textDim,
                repeatMode == REPEAT_ONE));
    }

    private void updateQueueCounterText() {
        if (tvNpQueuePos == null) {
            return;
        }
        String base = (playbackQueue.isEmpty() || currentPlaylistIndex < 0)
                ? "-- / --"
                : (currentPlaylistIndex + 1) + " / " + playbackQueue.size();
        if (sleepTimerDeadlineMs > 0L) {
            long rem = Math.max(0L, sleepTimerDeadlineMs - SystemClock.uptimeMillis());
            tvNpQueuePos.setText(base + "  ·  Sleep " + formatDuration(rem));
        } else {
            tvNpQueuePos.setText(base);
        }
    }

    private void openNowPlaying() {
        isSettingsOpen = false;
        isNowPlayingOpen = true;
        settingsScreen.setVisibility(View.GONE);
        nowPlayingScreen.setVisibility(View.VISIBLE);
        ActionBar ab = getActionBar();
        if (ab != null) {
            ab.hide();
        }
        updateQueueCounterText();
        Song current = findSongById(currentSongId);
        if (tvNpHeaderTitle != null) {
            tvNpHeaderTitle.setText(current != null ? current.title : getString(R.string.np_title));
        }
        updateNowPlayingArtworkView(currentSongId);
        setNowPlayingStageMode(nowPlayingStageMode);
        updateBackNavigationCallback();
    }

    private void closeNowPlaying() {
        isNowPlayingOpen = false;
        nowPlayingScreen.setVisibility(View.GONE);
        if (!isSettingsOpen) {
            ActionBar ab = getActionBar();
            if (ab != null) {
                ab.show();
            }
        }
        updateBackNavigationCallback();
    }

    private void openSettings() {
        isNowPlayingOpen = false;
        isSettingsOpen = true;
        nowPlayingScreen.setVisibility(View.GONE);
        settingsScreen.setVisibility(View.VISIBLE);
        ActionBar ab = getActionBar();
        if (ab != null) {
            ab.hide();
        }
        updateBackNavigationCallback();
    }

    private void closeSettings() {
        isSettingsOpen = false;
        settingsScreen.setVisibility(View.GONE);
        ActionBar ab = getActionBar();
        if (ab != null) {
            ab.show();
        }
        updateBackNavigationCallback();
    }

    private boolean handleOverlayBackNavigation() {
        if (isSettingsOpen) {
            closeSettings();
            return true;
        }
        if (isNowPlayingOpen) {
            closeNowPlaying();
            return true;
        }
        return false;
    }

    private void updateBackNavigationCallback() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            return;
        }
        boolean shouldIntercept = isSettingsOpen || isNowPlayingOpen;
        OnBackInvokedDispatcher dispatcher = getOnBackInvokedDispatcher();
        if (shouldIntercept && !isBackCallbackRegistered) {
            if (backInvokedCallback == null) {
                backInvokedCallback = new OnBackInvokedCallback() {
                    @Override
                    public void onBackInvoked() {
                        handleOverlayBackNavigation();
                    }
                };
            }
            dispatcher.registerOnBackInvokedCallback(
                    OnBackInvokedDispatcher.PRIORITY_DEFAULT,
                    (OnBackInvokedCallback) backInvokedCallback);
            isBackCallbackRegistered = true;
        } else if (!shouldIntercept && isBackCallbackRegistered && backInvokedCallback != null) {
            dispatcher.unregisterOnBackInvokedCallback((OnBackInvokedCallback) backInvokedCallback);
            isBackCallbackRegistered = false;
        }
    }

    @Override
    @SuppressLint("GestureBackNavigation")
    public void onBackPressed() {
        if (handleOverlayBackNavigation()) {
            return;
        }
        super.onBackPressed();
    }

    private void setupActionBarTabs() {
        ActionBar actionBar = getActionBar();
        if (actionBar == null) {
            return;
        }
        updateActionBarLabels();
        actionBar.setDisplayShowHomeEnabled(false);
        actionBar.setNavigationMode(ActionBar.NAVIGATION_MODE_TABS);

        ActionBar.TabListener tabListener = new ActionBar.TabListener() {
            @Override
            public void onTabSelected(ActionBar.Tab tab, FragmentTransaction ft) {
                Object tag = tab.getTag();
                if (tag instanceof Integer) {
                    activeTab = (Integer) tag;
                    applyFiltersAndSort();
                }
            }

            @Override
            public void onTabUnselected(ActionBar.Tab tab, FragmentTransaction ft) {
            }

            @Override
            public void onTabReselected(ActionBar.Tab tab, FragmentTransaction ft) {
                if (listSongs != null && !displayedSongs.isEmpty()) {
                    listSongs.smoothScrollToPosition(0);
                }
            }
        };

        actionBar.addTab(actionBar.newTab()
                .setText("SONGS")
                .setTag(TAB_ALL_SONGS)
                .setTabListener(tabListener));
        actionBar.addTab(actionBar.newTab()
                .setText("RECENT")
                .setTag(TAB_RECENT)
                .setTabListener(tabListener));
        actionBar.addTab(actionBar.newTab()
                .setText("FAVORITES")
                .setTag(TAB_FAVORITES)
                .setTabListener(tabListener));
    }

    private void setupListeners() {
        listSongs.setOnItemClickListener(new AdapterView.OnItemClickListener() {
            @Override
            public void onItemClick(AdapterView<?> parent, View view, int position, long id) {
                if (position >= 0 && position < displayedSongs.size()) {
                    playbackQueue.clear();
                    playbackQueue.addAll(displayedSongs);
                    currentPlaylistIndex = position;
                    playSong(playbackQueue.get(position));
                }
            }
        });

        listSongs.setOnItemLongClickListener(new AdapterView.OnItemLongClickListener() {
            @Override
            public boolean onItemLongClick(AdapterView<?> parent, View view, int position, long id) {
                if (position < 0 || position >= displayedSongs.size()) {
                    return false;
                }
                showTrackActionsDialog(displayedSongs.get(position), position);
                return true;
            }
        });

        miniPlayerClickable.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                openNowPlaying();
            }
        });

        btnNpCollapse.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                closeNowPlaying();
            }
        });

        ivNpArtwork.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Song current = findSongById(currentSongId);
                if (current != null) {
                    showTrackMetadataDialog(current);
                } else if (!displayedSongs.isEmpty()) {
                    showTrackMetadataDialog(displayedSongs.get(0));
                } else {
                    Toast.makeText(MainActivity.this,
                            "Scan or select a song first to inspect ID3 metadata.",
                            Toast.LENGTH_SHORT).show();
                }
            }
        });
        btnNpEditArt.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Song current = findSongById(currentSongId);
                if (current != null) {
                    showAlbumArtEditorDialog(current);
                } else if (!displayedSongs.isEmpty()) {
                    showAlbumArtEditorDialog(displayedSongs.get(0));
                } else {
                    Toast.makeText(MainActivity.this,
                            "Scan or select a song first to edit its album art.",
                            Toast.LENGTH_SHORT).show();
                }
            }
        });

        View.OnClickListener playPauseClick = new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                togglePlayPause();
            }
        };
        View.OnClickListener prevClick = new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                playPrevious();
            }
        };
        View.OnClickListener nextClick = new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                playNext();
            }
        };

        btnPlayPause.setOnClickListener(playPauseClick);
        btnNpPlayPause.setOnClickListener(playPauseClick);
        btnPrevious.setOnClickListener(prevClick);
        btnNpPrev.setOnClickListener(prevClick);
        btnNext.setOnClickListener(nextClick);
        btnNpNext.setOnClickListener(nextClick);

        btnNpShuffle.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                shuffleEnabled = !shuffleEnabled;
                getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
                        .edit()
                        .putBoolean(KEY_SHUFFLE, shuffleEnabled)
                        .apply();
                updateShuffleRepeatButtons();
            }
        });

        btnNpRepeat.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                repeatMode = (repeatMode + 1) % 3;
                getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
                        .edit()
                        .putInt(KEY_REPEAT_MODE, repeatMode)
                        .apply();
                updateShuffleRepeatButtons();
            }
        });

        seekBarNp.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            @Override
            public void onProgressChanged(SeekBar bar, int progress, boolean fromUser) {
                if (fromUser && isMediaPrepared) {
                    tvNpElapsed.setText(formatDuration(progress));
                    miniProgressBar.setProgress(progress);
                }
            }

            @Override
            public void onStartTrackingTouch(SeekBar bar) {
                isUserSeeking = true;
            }

            @Override
            public void onStopTrackingTouch(SeekBar bar) {
                isUserSeeking = false;
                if (mediaPlayer != null && isMediaPrepared) {
                    mediaPlayer.seekTo(bar.getProgress());
                    tvNpElapsed.setText(formatDuration(bar.getProgress()));
                    miniProgressBar.setProgress(bar.getProgress());
                }
            }
        });

        btnSettingsBack.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                closeSettings();
            }
        });

        rgThemes.setOnCheckedChangeListener(new RadioGroup.OnCheckedChangeListener() {
            @Override
            public void onCheckedChanged(RadioGroup group, int checkedId) {
                int selectedId = ThemeConfig.THEME_HOLO;
                if (checkedId == R.id.rb_theme_aero) {
                    selectedId = ThemeConfig.THEME_AERO;
                } else if (checkedId == R.id.rb_theme_skeuo) {
                    selectedId = ThemeConfig.THEME_SKEUOMORPHIC;
                }
                if (selectedId != currentTheme.id) {
                    getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
                            .edit()
                            .putInt(KEY_THEME_ID, selectedId)
                            .apply();
                    applyTheme(ThemeConfig.fromId(selectedId));
                }
            }
        });

        cbShowListArt.setOnCheckedChangeListener(new CompoundButton.OnCheckedChangeListener() {
            @Override
            public void onCheckedChanged(CompoundButton buttonView, boolean isChecked) {
                showListArtwork = isChecked;
                getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
                        .edit()
                        .putBoolean(KEY_SHOW_LIST_ART, showListArtwork)
                        .apply();
                songAdapter.notifyDataSetChanged();
            }
        });

        btnSettingsSort.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                showHoloSortDialog();
            }
        });

        btnSettingsRescan.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (hasAudioPermission()) {
                    scanLocalAudioFiles();
                    closeSettings();
                } else {
                    requestAudioPermission();
                }
            }
        });

        btnNpVizSettings.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                showNowPlayingDisplayDialog();
            }
        });

        cbShakeToSkip.setOnCheckedChangeListener(new CompoundButton.OnCheckedChangeListener() {
            @Override
            public void onCheckedChanged(CompoundButton buttonView, boolean isChecked) {
                shakeToSkipEnabled = isChecked;
                getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
                        .edit()
                        .putBoolean(KEY_SHAKE_TO_SKIP, shakeToSkipEnabled)
                        .apply();
                updateShakeListenerRegistration();
                if (isChecked && accelerometer == null) {
                    Toast.makeText(MainActivity.this,
                            "No accelerometer sensor detected on this device.",
                            Toast.LENGTH_SHORT).show();
                }
            }
        });

        btnSettingsCrossfade.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                showCrossfadeDialog();
            }
        });

        btnSettingsReverb.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                showReverbDialog();
            }
        });

        btnSettingsVisualizer.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                showVisualizerDialog();
            }
        });

        btnSettingsSleep.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                showSleepTimerDialog();
            }
        });

        btnEmptyAction.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (hasAudioPermission()) {
                    scanLocalAudioFiles();
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                        && hasRequestedPermissionOnce
                        && !shouldShowRequestPermissionRationale(getRequiredAudioPermission())) {
                    openAppPermissionSettings();
                } else {
                    requestAudioPermission();
                }
            }
        });
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        MenuItem searchItem = menu.add(Menu.NONE, MENU_ID_SEARCH, 1, "Search");
        searchItem.setIcon(android.R.drawable.ic_menu_search);
        searchItem.setShowAsAction(
                MenuItem.SHOW_AS_ACTION_IF_ROOM | MenuItem.SHOW_AS_ACTION_COLLAPSE_ACTION_VIEW);

        final SearchView searchView = new SearchView(this);
        searchView.setQueryHint("Search tracks or artists");
        searchView.setOnQueryTextListener(new SearchView.OnQueryTextListener() {
            @Override
            public boolean onQueryTextSubmit(String query) {
                searchQuery = query != null ? query.trim() : "";
                applyFiltersAndSort();
                searchView.clearFocus();
                return true;
            }

            @Override
            public boolean onQueryTextChange(String newText) {
                searchQuery = newText != null ? newText.trim() : "";
                applyFiltersAndSort();
                return true;
            }
        });
        searchItem.setActionView(searchView);

        MenuItem sortItem = menu.add(Menu.NONE, MENU_ID_SORT, 2, "Sort");
        sortItem.setIcon(android.R.drawable.ic_menu_sort_by_size);
        sortItem.setShowAsAction(MenuItem.SHOW_AS_ACTION_IF_ROOM);

        MenuItem settingsItem = menu.add(Menu.NONE, MENU_ID_SETTINGS, 3, "Settings");
        settingsItem.setIcon(android.R.drawable.ic_menu_preferences);
        settingsItem.setShowAsAction(MenuItem.SHOW_AS_ACTION_ALWAYS);

        return true;
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        if (item.getItemId() == MENU_ID_SORT) {
            showHoloSortDialog();
            return true;
        }
        if (item.getItemId() == MENU_ID_SETTINGS) {
            openSettings();
            return true;
        }
        return super.onOptionsItemSelected(item);
    }

    private void showHoloSortDialog() {
        final String[] sortLabels = new String[]{
                "Title (A - Z)",
                "Artist (A - Z)",
                "Duration (Longest first)",
                "Recently Added"
        };

        AlertDialog.Builder builder = createThemedDialogBuilder();
        builder.setTitle("Sort Tracks By");
        builder.setSingleChoiceItems(sortLabels, currentSortMode, new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                currentSortMode = which;
                getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
                        .edit()
                        .putInt(KEY_SORT_MODE, currentSortMode)
                        .apply();
                applyFiltersAndSort();
                dialog.dismiss();
            }
        });
        builder.setNegativeButton("Cancel", null);
        builder.show();
    }

    private void showSleepTimerDialog() {
        final int[] minuteOptions = new int[]{0, 15, 30, 45, 60};
        final String[] labels = new String[]{
                "Off",
                "15 minutes",
                "30 minutes",
                "45 minutes",
                "60 minutes"
        };
        int checked = 0;
        for (int i = 0; i < minuteOptions.length; i++) {
            if (minuteOptions[i] == sleepTimerMinutes) {
                checked = i;
                break;
            }
        }
        AlertDialog.Builder builder = createThemedDialogBuilder();
        builder.setTitle("Sleep Timer");
        builder.setSingleChoiceItems(labels, checked, new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                setSleepTimerMinutes(minuteOptions[which]);
                dialog.dismiss();
            }
        });
        builder.setNegativeButton("Cancel", null);
        builder.show();
    }

    private void setSleepTimerMinutes(int minutes) {
        uiHandler.removeCallbacks(sleepTimerRunnable);
        sleepTimerMinutes = minutes;
        sleepFadeMultiplier = 1.0f;
        if (mediaPlayer != null && isMediaPrepared) {
            try {
                mediaPlayer.setVolume(1.0f, 1.0f);
            } catch (IllegalStateException ignored) {
            }
        }
        if (minutes <= 0) {
            sleepTimerDeadlineMs = 0L;
            Toast.makeText(this, "Sleep timer disabled.", Toast.LENGTH_SHORT).show();
        } else {
            sleepTimerDeadlineMs = SystemClock.uptimeMillis() + minutes * 60_000L;
            uiHandler.post(sleepTimerRunnable);
            Toast.makeText(this, "Sleep timer set for " + minutes + " min.", Toast.LENGTH_SHORT).show();
        }
        updateAudioEffectsButtonLabels();
        updateQueueCounterText();
    }

    private void showCrossfadeDialog() {
        int checked = 0;
        for (int i = 0; i < CROSSFADE_VALUES.length; i++) {
            if (CROSSFADE_VALUES[i] == crossfadeSeconds) {
                checked = i;
                break;
            }
        }
        AlertDialog.Builder builder = createThemedDialogBuilder();
        builder.setTitle("Crossfade Duration");
        builder.setSingleChoiceItems(CROSSFADE_LABELS, checked, new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                crossfadeSeconds = CROSSFADE_VALUES[which];
                getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
                        .edit()
                        .putInt(KEY_CROSSFADE_SEC, crossfadeSeconds)
                        .apply();
                updateAudioEffectsButtonLabels();
                dialog.dismiss();
            }
        });
        builder.setNegativeButton("Cancel", null);
        builder.show();
    }

    private void showReverbDialog() {
        AlertDialog.Builder builder = createThemedDialogBuilder();
        builder.setTitle("Reverb Preset");
        builder.setSingleChoiceItems(REVERB_LABELS, reverbPresetIndex, new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                reverbPresetIndex = which;
                getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
                        .edit()
                        .putInt(KEY_REVERB_PRESET, reverbPresetIndex)
                        .apply();
                applyReverbToPlayer(mediaPlayer);
                updateAudioEffectsButtonLabels();
                dialog.dismiss();
            }
        });
        builder.setNegativeButton("Cancel", null);
        builder.show();
    }

    private void showVisualizerDialog() {
        AlertDialog.Builder builder = createThemedDialogBuilder();
        builder.setTitle("Visualizer Preset");
        builder.setSingleChoiceItems(AudioVisualizerView.MODE_LABELS, visualizerMode, new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                setVisualizerMode(which);
                dialog.dismiss();
            }
        });
        builder.setNegativeButton("Cancel", null);
        builder.show();
    }

    private void showNowPlayingDisplayDialog() {
        final int radius = getControlCornerDp(currentTheme);
        int pad = dpToPx(16);

        ScrollView scroll = new ScrollView(this);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(pad, pad, pad, pad);
        scroll.addView(root);

        TextView tvStageLabel = new TextView(this);
        tvStageLabel.setText("STAGE MODE");
        tvStageLabel.setTextColor(currentTheme.accent);
        tvStageLabel.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
        tvStageLabel.setTypeface(Typeface.DEFAULT_BOLD);
        root.addView(tvStageLabel);

        LinearLayout stageRow = new LinearLayout(this);
        stageRow.setOrientation(LinearLayout.HORIZONTAL);
        LinearLayout.LayoutParams stageRowLp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dpToPx(40));
        stageRowLp.topMargin = dpToPx(8);
        root.addView(stageRow, stageRowLp);

        final Button btnSplitStage = new Button(this);
        btnSplitStage.setText("SPLIT");
        btnSplitStage.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
        btnSplitStage.setTypeface(Typeface.DEFAULT_BOLD);
        stageRow.addView(btnSplitStage, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, 1f));

        final Button btnVisualizerStage = new Button(this);
        btnVisualizerStage.setText("VISUALIZER");
        btnVisualizerStage.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
        btnVisualizerStage.setTypeface(Typeface.DEFAULT_BOLD);
        LinearLayout.LayoutParams vizStageLp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, 1f);
        vizStageLp.setMarginStart(dpToPx(6));
        stageRow.addView(btnVisualizerStage, vizStageLp);

        final Button btnArtworkStage = new Button(this);
        btnArtworkStage.setText("ARTWORK");
        btnArtworkStage.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
        btnArtworkStage.setTypeface(Typeface.DEFAULT_BOLD);
        LinearLayout.LayoutParams artStageLp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, 1f);
        artStageLp.setMarginStart(dpToPx(6));
        stageRow.addView(btnArtworkStage, artStageLp);

        TextView tvPresetLabel = new TextView(this);
        tvPresetLabel.setText("VISUALIZER PRESET");
        tvPresetLabel.setTextColor(currentTheme.accent);
        tvPresetLabel.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
        tvPresetLabel.setTypeface(Typeface.DEFAULT_BOLD);
        LinearLayout.LayoutParams presetLabelLp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        presetLabelLp.topMargin = dpToPx(16);
        presetLabelLp.bottomMargin = dpToPx(8);
        root.addView(tvPresetLabel, presetLabelLp);

        final Button[] presetBtns = new Button[AudioVisualizerView.MODE_LABELS.length];
        for (int row = 0; row < 3; row++) {
            LinearLayout presetRow = new LinearLayout(this);
            presetRow.setOrientation(LinearLayout.HORIZONTAL);
            LinearLayout.LayoutParams rowLp = new LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT, dpToPx(38));
            if (row > 0) {
                rowLp.topMargin = dpToPx(6);
            }
            root.addView(presetRow, rowLp);

            for (int col = 0; col < 2; col++) {
                final int idx = row * 2 + col;
                Button btnPreset = new Button(this);
                btnPreset.setText(AudioVisualizerView.MODE_LABELS[idx]);
                btnPreset.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
                btnPreset.setTypeface(Typeface.DEFAULT_BOLD);
                LinearLayout.LayoutParams btnLp = new LinearLayout.LayoutParams(
                        0, ViewGroup.LayoutParams.MATCH_PARENT, 1f);
                if (col > 0) {
                    btnLp.setMarginStart(dpToPx(6));
                }
                presetRow.addView(btnPreset, btnLp);
                presetBtns[idx] = btnPreset;
            }
        }

        final Runnable refreshDialogStates = new Runnable() {
            @Override
            public void run() {
                boolean splitActive = nowPlayingStageMode == NP_STAGE_SPLIT;
                btnSplitStage.setBackground(ThemeConfig.createControlSurface(
                        MainActivity.this, currentTheme, splitActive, radius));
                btnSplitStage.setTextColor(splitActive
                        ? currentTheme.onAccentText
                        : currentTheme.textPrimary);

                boolean vizActive = nowPlayingStageMode == NP_STAGE_VISUALIZER;
                btnVisualizerStage.setBackground(ThemeConfig.createControlSurface(
                        MainActivity.this, currentTheme, vizActive, radius));
                btnVisualizerStage.setTextColor(vizActive
                        ? currentTheme.onAccentText
                        : currentTheme.textPrimary);

                boolean artActive = nowPlayingStageMode == NP_STAGE_ARTWORK;
                btnArtworkStage.setBackground(ThemeConfig.createControlSurface(
                        MainActivity.this, currentTheme, artActive, radius));
                btnArtworkStage.setTextColor(artActive
                        ? currentTheme.onAccentText
                        : currentTheme.textPrimary);

                for (int i = 0; i < presetBtns.length; i++) {
                    boolean active = i == visualizerMode;
                    presetBtns[i].setBackground(ThemeConfig.createControlSurface(
                            MainActivity.this, currentTheme, active, radius));
                    presetBtns[i].setTextColor(active ? currentTheme.onAccentText : currentTheme.textPrimary);
                }
            }
        };

        btnSplitStage.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                setNowPlayingStageMode(NP_STAGE_SPLIT);
                refreshDialogStates.run();
            }
        });
        btnArtworkStage.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                setNowPlayingStageMode(NP_STAGE_ARTWORK);
                refreshDialogStates.run();
            }
        });
        btnVisualizerStage.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                setNowPlayingStageMode(NP_STAGE_VISUALIZER);
                refreshDialogStates.run();
            }
        });
        for (int i = 0; i < presetBtns.length; i++) {
            final int modeIdx = i;
            presetBtns[i].setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    setVisualizerMode(modeIdx);
                    if (nowPlayingStageMode == NP_STAGE_ARTWORK) {
                        setNowPlayingStageMode(NP_STAGE_SPLIT);
                    }
                    refreshDialogStates.run();
                }
            });
        }

        refreshDialogStates.run();

        AlertDialog.Builder builder = createThemedDialogBuilder();
        builder.setTitle("Display & Visualizer");
        builder.setView(scroll);
        builder.setPositiveButton("Done", null);
        builder.show();
    }

    private String getRequiredAudioPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return Manifest.permission.READ_MEDIA_AUDIO;
        }
        return Manifest.permission.READ_EXTERNAL_STORAGE;
    }

    private boolean hasAudioPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            return true;
        }
        return checkSelfPermission(getRequiredAudioPermission()) == PackageManager.PERMISSION_GRANTED;
    }

    private void checkPermissionAndLoadSongs(boolean autoPrompt) {
        if (hasAudioPermission()) {
            scanLocalAudioFiles();
        } else {
            updateEmptyStateForPermission();
            if (autoPrompt) {
                requestAudioPermission();
            }
        }
    }

    private void requestAudioPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            hasRequestedPermissionOnce = true;
            requestPermissions(new String[]{getRequiredAudioPermission()}, REQUEST_PERMISSION_AUDIO);
        }
    }

    private void openAppPermissionSettings() {
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.fromParts("package", getPackageName(), null));
            startActivity(intent);
        } catch (Exception e) {
            Toast.makeText(this, "Enable audio permission in system settings.", Toast.LENGTH_LONG).show();
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQUEST_PERMISSION_AUDIO) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                scanLocalAudioFiles();
            } else {
                updateEmptyStateForPermission();
            }
        }
    }

    private void updateEmptyStateForPermission() {
        allSongs.clear();
        displayedSongs.clear();
        songAdapter.notifyDataSetChanged();

        tvSectionHeader.setText("PERMISSION REQUIRED");
        tvTrackCount.setText("LOCKED");
        tvEmptyTitle.setText("Audio Storage Permission Needed");
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            tvEmptyMessage.setText(
                    "Grant Music & Audio access (READ_MEDIA_AUDIO) so Holo Player can scan and play songs stored on your phone.");
        } else {
            tvEmptyMessage.setText(
                    "Grant storage access (READ_EXTERNAL_STORAGE) so Holo Player can scan and play songs stored on your phone.");
        }
        btnEmptyAction.setText("GRANT AUDIO PERMISSION");
        btnEmptyAction.setVisibility(View.VISIBLE);
        scheduleDismissStartupSplash();
    }

    private void scheduleDismissStartupSplash() {
        if (isStartupSplashDismissed || startupSplashOverlay == null) {
            return;
        }
        long elapsed = SystemClock.uptimeMillis() - startupShownAtMs;
        long delayMs = Math.max(0L, 900L - elapsed);
        uiHandler.postDelayed(new Runnable() {
            @Override
            public void run() {
                dismissStartupSplash();
            }
        }, delayMs);
    }

    private void dismissStartupSplash() {
        if (isStartupSplashDismissed || isFinishing() || isDestroyed()) {
            return;
        }
        isStartupSplashDismissed = true;
        if (!isNowPlayingOpen && !isSettingsOpen) {
            ActionBar ab = getActionBar();
            if (ab != null) {
                ab.show();
            }
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            getWindow().setStatusBarColor(currentTheme.actionBarTop);
            getWindow().setNavigationBarColor(currentTheme.dockBottom);
        }
        if (startupSplashOverlay == null) {
            return;
        }
        startupSplashOverlay.animate()
                .alpha(0f)
                .setDuration(420L)
                .withEndAction(new Runnable() {
                    @Override
                    public void run() {
                        if (startupSplashView != null) {
                            startupSplashView.stopAnimationLoop();
                        }
                        if (startupSplashOverlay != null) {
                            startupSplashOverlay.setVisibility(View.GONE);
                        }
                    }
                })
                .start();
    }

    private void scanLocalAudioFiles() {
        tvSectionHeader.setText("SCANNING MEDIASTORE...");
        btnEmptyAction.setEnabled(false);

        queryExecutor.execute(new Runnable() {
            @Override
            public void run() {
                final List<Song> loaded = queryMediaStoreAudio(getContentResolver());
                uiHandler.post(new Runnable() {
                    @Override
                    public void run() {
                        if (isFinishing() || isDestroyed()) {
                            return;
                        }
                        btnEmptyAction.setEnabled(true);
                        allSongs.clear();
                        allSongs.addAll(loaded);
                        applyFiltersAndSort();
                        updateActionBarLabels();
                        scheduleDismissStartupSplash();
                    }
                });
            }
        });
    }

    private List<Song> queryMediaStoreAudio(ContentResolver resolver) {
        List<Song> results = queryMediaStoreSelection(
                resolver,
                MediaStore.Audio.Media.IS_MUSIC + " != 0");
        if (results.isEmpty()) {
            results = queryMediaStoreSelection(
                    resolver,
                    MediaStore.Audio.Media.DURATION + " >= 1000");
        }
        return results;
    }

    private List<Song> queryMediaStoreSelection(ContentResolver resolver, String selection) {
        List<Song> list = new ArrayList<>();
        String[] projection = new String[]{
                MediaStore.Audio.Media._ID,
                MediaStore.Audio.Media.ALBUM_ID,
                MediaStore.Audio.Media.TITLE,
                MediaStore.Audio.Media.ARTIST,
                MediaStore.Audio.Media.ALBUM,
                MediaStore.Audio.Media.DURATION,
                MediaStore.Audio.Media.DATE_ADDED,
                MediaStore.Audio.Media.DATA
        };

        Cursor cursor = null;
        try {
            cursor = resolver.query(
                    MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
                    projection,
                    selection,
                    null,
                    MediaStore.Audio.Media.TITLE + " COLLATE NOCASE ASC");

            if (cursor != null) {
                int idCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media._ID);
                int albumIdCol = cursor.getColumnIndex(MediaStore.Audio.Media.ALBUM_ID);
                int titleCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.TITLE);
                int artistCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ARTIST);
                int albumCol = cursor.getColumnIndex(MediaStore.Audio.Media.ALBUM);
                int durationCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DURATION);
                int dateCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DATE_ADDED);
                int dataCol = cursor.getColumnIndex(MediaStore.Audio.Media.DATA);

                while (cursor.moveToNext()) {
                    long id = cursor.getLong(idCol);
                    long albumId = albumIdCol >= 0 ? cursor.getLong(albumIdCol) : -1L;
                    String rawTitle = cursor.getString(titleCol);
                    String rawArtist = cursor.getString(artistCol);
                    String rawAlbum = albumCol >= 0 ? cursor.getString(albumCol) : null;
                    long durationMs = cursor.getLong(durationCol);
                    long dateAdded = cursor.getLong(dateCol);
                    String filePath = dataCol >= 0 ? cursor.getString(dataCol) : null;

                    if (durationMs <= 0L) {
                        continue;
                    }

                    String cleanTitle = (rawTitle == null || rawTitle.trim().isEmpty())
                            ? "Untitled Track #" + id
                            : rawTitle.trim();
                    String cleanArtist = (rawArtist == null
                            || rawArtist.trim().isEmpty()
                            || "<unknown>".equalsIgnoreCase(rawArtist.trim()))
                            ? "Unknown Artist"
                            : rawArtist.trim();
                    String cleanAlbum = (rawAlbum == null
                            || rawAlbum.trim().isEmpty()
                            || "<unknown>".equalsIgnoreCase(rawAlbum.trim()))
                            ? "Local Library"
                            : rawAlbum.trim();

                    list.add(new Song(id, albumId, cleanTitle, cleanArtist, cleanAlbum, durationMs, dateAdded, filePath));
                }
            }
        } catch (SecurityException ignored) {
        } catch (Exception ignored) {
        } finally {
            if (cursor != null) {
                cursor.close();
            }
        }
        return list;
    }

    private void applyFiltersAndSort() {
        if (!hasAudioPermission()) {
            updateEmptyStateForPermission();
            return;
        }

        List<Song> working = new ArrayList<>();
        String needle = searchQuery.toLowerCase(Locale.US);

        for (Song song : allSongs) {
            if (activeTab == TAB_FAVORITES && !favoriteSongIds.contains(song.id)) {
                continue;
            }
            if (!needle.isEmpty()) {
                boolean matchesTitle = song.title.toLowerCase(Locale.US).contains(needle);
                boolean matchesArtist = song.artist.toLowerCase(Locale.US).contains(needle);
                if (!matchesTitle && !matchesArtist) {
                    continue;
                }
            }
            working.add(song);
        }

        if (activeTab == TAB_RECENT) {
            Collections.sort(working, new Comparator<Song>() {
                @Override
                public int compare(Song a, Song b) {
                    return Long.compare(b.dateAddedSec, a.dateAddedSec);
                }
            });
            if (working.size() > 50) {
                working = new ArrayList<>(working.subList(0, 50));
            }
        } else {
            sortSongList(working, currentSortMode);
        }

        displayedSongs.clear();
        displayedSongs.addAll(working);
        songAdapter.notifyDataSetChanged();

        updateHeaderAndEmptyCopy();
    }

    private void sortSongList(List<Song> list, int sortMode) {
        switch (sortMode) {
            case SORT_ARTIST_ASC:
                Collections.sort(list, new Comparator<Song>() {
                    @Override
                    public int compare(Song a, Song b) {
                        int artistCmp = a.artist.compareToIgnoreCase(b.artist);
                        return artistCmp != 0 ? artistCmp : a.title.compareToIgnoreCase(b.title);
                    }
                });
                break;
            case SORT_DURATION_DESC:
                Collections.sort(list, new Comparator<Song>() {
                    @Override
                    public int compare(Song a, Song b) {
                        return Long.compare(b.durationMs, a.durationMs);
                    }
                });
                break;
            case SORT_DATE_DESC:
                Collections.sort(list, new Comparator<Song>() {
                    @Override
                    public int compare(Song a, Song b) {
                        return Long.compare(b.dateAddedSec, a.dateAddedSec);
                    }
                });
                break;
            case SORT_TITLE_ASC:
            default:
                Collections.sort(list, new Comparator<Song>() {
                    @Override
                    public int compare(Song a, Song b) {
                        return a.title.compareToIgnoreCase(b.title);
                    }
                });
                break;
        }
    }

    private void updateHeaderAndEmptyCopy() {
        String sortSuffix;
        switch (currentSortMode) {
            case SORT_ARTIST_ASC:
                sortSuffix = "BY ARTIST";
                break;
            case SORT_DURATION_DESC:
                sortSuffix = "BY DURATION";
                break;
            case SORT_DATE_DESC:
                sortSuffix = "NEWEST FIRST";
                break;
            case SORT_TITLE_ASC:
            default:
                sortSuffix = "A - Z";
                break;
        }

        if (activeTab == TAB_RECENT) {
            tvSectionHeader.setText("RECENTLY ADDED TRACKS");
        } else if (activeTab == TAB_FAVORITES) {
            tvSectionHeader.setText("FAVORITES (LONG-PRESS TRACK TO TOGGLE)");
        } else if (!searchQuery.isEmpty()) {
            tvSectionHeader.setText("SEARCH RESULTS: \"" + searchQuery.toUpperCase(Locale.US) + "\"");
        } else {
            tvSectionHeader.setText("TRACKS - " + sortSuffix);
        }

        int shown = displayedSongs.size();
        tvTrackCount.setText(shown + (shown == 1 ? " TRACK" : " TRACKS"));

        if (allSongs.isEmpty()) {
            tvEmptyTitle.setText("No Local Audio Files Found");
            tvEmptyMessage.setText(
                    "Place MP3, M4A, OGG, WAV, or FLAC audio files in your device's Music or Download folder, then tap Rescan.");
            btnEmptyAction.setText("RESCAN MEDIASTORE");
            btnEmptyAction.setVisibility(View.VISIBLE);
        } else if (displayedSongs.isEmpty() && activeTab == TAB_FAVORITES) {
            tvEmptyTitle.setText("No Favorite Tracks Yet");
            tvEmptyMessage.setText(
                    "Long-press any song in the SONGS or RECENT tab to add it to your Favorites list.");
            btnEmptyAction.setVisibility(View.GONE);
        } else if (displayedSongs.isEmpty()) {
            tvEmptyTitle.setText("No Matching Tracks");
            tvEmptyMessage.setText("No songs or artists matched \"" + searchQuery + "\".");
            btnEmptyAction.setVisibility(View.GONE);
        }
    }

    private void releaseFadingOutPlayer() {
        uiHandler.removeCallbacks(crossfadeRunnable);
        if (fadingOutPlayer != null) {
            try {
                if (fadingOutPlayer.isPlaying()) {
                    fadingOutPlayer.stop();
                }
            } catch (IllegalStateException ignored) {
            }
            try {
                fadingOutPlayer.release();
            } catch (Exception ignored) {
            }
            fadingOutPlayer = null;
        }
        crossfadeDurationMs = 0L;
    }

    private void releaseEnvironmentalReverb() {
        if (environmentalReverb != null) {
            try {
                environmentalReverb.setEnabled(false);
            } catch (Exception ignored) {
            }
            try {
                environmentalReverb.release();
            } catch (Exception ignored) {
            }
            environmentalReverb = null;
            environmentalReverbSessionId = 0;
        }
    }

    private void applyReverbToPlayer(MediaPlayer player) {
        if (player == null) {
            return;
        }
        int sessionId = 0;
        try {
            sessionId = player.getAudioSessionId();
        } catch (Exception ignored) {
        }

        if (reverbPresetIndex <= 0) {
            try {
                player.setAuxEffectSendLevel(0.0f);
            } catch (Exception ignored) {
            }
            if (environmentalReverb != null) {
                try {
                    environmentalReverb.setEnabled(false);
                } catch (Exception ignored) {
                }
            }
            if (presetReverb != null) {
                try {
                    presetReverb.setEnabled(false);
                } catch (Exception ignored) {
                }
            }
            return;
        }

        // 1. Prefer per-session EnvironmentalReverb (insert effect directly on MediaPlayer audioSessionId)
        boolean envApplied = false;
        if (sessionId > 0) {
            try {
                if (environmentalReverb == null || environmentalReverbSessionId != sessionId) {
                    releaseEnvironmentalReverb();
                    environmentalReverb = new EnvironmentalReverb(0, sessionId);
                    environmentalReverbSessionId = sessionId;
                }
                switch (reverbPresetIndex) {
                    case 1: // Small Room
                        environmentalReverb.setRoomLevel((short) -400);
                        environmentalReverb.setRoomHFLevel((short) -600);
                        environmentalReverb.setDecayTime(750);
                        environmentalReverb.setDecayHFRatio((short) 700);
                        environmentalReverb.setReflectionsLevel((short) -450);
                        environmentalReverb.setReflectionsDelay(14);
                        environmentalReverb.setReverbLevel((short) 150);
                        environmentalReverb.setReverbDelay(22);
                        environmentalReverb.setDiffusion((short) 850);
                        environmentalReverb.setDensity((short) 850);
                        break;
                    case 2: // Medium Hall
                        environmentalReverb.setRoomLevel((short) -200);
                        environmentalReverb.setRoomHFLevel((short) -450);
                        environmentalReverb.setDecayTime(1700);
                        environmentalReverb.setDecayHFRatio((short) 650);
                        environmentalReverb.setReflectionsLevel((short) -300);
                        environmentalReverb.setReflectionsDelay(24);
                        environmentalReverb.setReverbLevel((short) 450);
                        environmentalReverb.setReverbDelay(38);
                        environmentalReverb.setDiffusion((short) 950);
                        environmentalReverb.setDensity((short) 900);
                        break;
                    case 3: // Large Hall
                        environmentalReverb.setRoomLevel((short) -100);
                        environmentalReverb.setRoomHFLevel((short) -350);
                        environmentalReverb.setDecayTime(2900);
                        environmentalReverb.setDecayHFRatio((short) 600);
                        environmentalReverb.setReflectionsLevel((short) -200);
                        environmentalReverb.setReflectionsDelay(36);
                        environmentalReverb.setReverbLevel((short) 750);
                        environmentalReverb.setReverbDelay(55);
                        environmentalReverb.setDiffusion((short) 1000);
                        environmentalReverb.setDensity((short) 1000);
                        break;
                    case 4: // Studio Plate
                    default:
                        environmentalReverb.setRoomLevel((short) -150);
                        environmentalReverb.setRoomHFLevel((short) -150);
                        environmentalReverb.setDecayTime(2100);
                        environmentalReverb.setDecayHFRatio((short) 900);
                        environmentalReverb.setReflectionsLevel((short) -250);
                        environmentalReverb.setReflectionsDelay(10);
                        environmentalReverb.setReverbLevel((short) 600);
                        environmentalReverb.setReverbDelay(18);
                        environmentalReverb.setDiffusion((short) 1000);
                        environmentalReverb.setDensity((short) 950);
                        break;
                }
                int enableRes = environmentalReverb.setEnabled(true);
                envApplied = (enableRes == android.media.audiofx.AudioEffect.SUCCESS)
                        || environmentalReverb.getEnabled();
            } catch (Exception ignored) {
                releaseEnvironmentalReverb();
            }
        }

        if (envApplied) {
            try {
                player.setAuxEffectSendLevel(0.0f);
                if (presetReverb != null) {
                    presetReverb.setEnabled(false);
                }
            } catch (Exception ignored) {
            }
            return;
        }

        // 2. Fallback to session-0 PresetReverb aux bus with full send level
        try {
            if (presetReverb == null) {
                presetReverb = new PresetReverb(0, 0);
            }
            short presetCode;
            switch (reverbPresetIndex) {
                case 1:
                    presetCode = PresetReverb.PRESET_SMALLROOM;
                    break;
                case 2:
                    presetCode = PresetReverb.PRESET_MEDIUMHALL;
                    break;
                case 3:
                    presetCode = PresetReverb.PRESET_LARGEHALL;
                    break;
                case 4:
                    presetCode = PresetReverb.PRESET_PLATE;
                    break;
                default:
                    presetCode = PresetReverb.PRESET_NONE;
                    break;
            }
            presetReverb.setPreset(presetCode);
            presetReverb.setEnabled(true);
            player.attachAuxEffect(presetReverb.getId());
            player.setAuxEffectSendLevel(1.0f);
        } catch (Exception ignored) {
        }
    }

    private void playSong(final Song song) {
        if (song == null) {
            return;
        }

        requestAudioFocusIfNeeded();
        uiHandler.removeCallbacks(progressRunnable);

        boolean shouldCrossfade = crossfadeSeconds > 0
                && mediaPlayer != null
                && isMediaPrepared
                && isPlayingSafe();

        autoCrossfadeTriggeredForCurrentTrack = false;
        releaseFadingOutPlayer();

        if (shouldCrossfade) {
            fadingOutPlayer = mediaPlayer;
            try {
                fadingOutPlayer.setOnCompletionListener(null);
                fadingOutPlayer.setOnErrorListener(new MediaPlayer.OnErrorListener() {
                    @Override
                    public boolean onError(MediaPlayer mp, int what, int extra) {
                        releaseFadingOutPlayer();
                        return true;
                    }
                });
            } catch (IllegalStateException ignored) {
            }
            mediaPlayer = new MediaPlayer();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                mediaPlayer.setAudioAttributes(new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .build());
            } else {
                mediaPlayer.setAudioStreamType(AudioManager.STREAM_MUSIC);
            }
        } else if (mediaPlayer == null) {
            mediaPlayer = new MediaPlayer();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                mediaPlayer.setAudioAttributes(new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .build());
            } else {
                mediaPlayer.setAudioStreamType(AudioManager.STREAM_MUSIC);
            }
        } else {
            try {
                mediaPlayer.reset();
            } catch (IllegalStateException ignored) {
                mediaPlayer.release();
                mediaPlayer = new MediaPlayer();
            }
        }

        isMediaPrepared = false;
        currentSongId = song.id;

        tvNowPlayingTitle.setText(song.title);
        tvNowPlayingArtist.setText(song.artist + " - " + song.album);
        if (tvNpHeaderTitle != null) {
            tvNpHeaderTitle.setText(song.title);
        }
        tvNpTitle.setText(song.title);
        tvNpArtist.setText(song.artist + " - " + song.album);
        tvNpElapsed.setText("0:00");
        tvNpTotal.setText(formatDuration(song.durationMs));
        int maxMs = (int) Math.max(song.durationMs, 1000L);
        miniProgressBar.setMax(maxMs);
        miniProgressBar.setProgress(0);
        seekBarNp.setMax(maxMs);
        seekBarNp.setProgress(0);
        updateQueueCounterText();
        updateNowPlayingArtworkView(song.id);
        audioVisualizer.setPlayingState(true, song.id, 0L);

        Uri trackUri = ContentUris.withAppendedId(
                MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, song.id);

        final boolean fadeInActive = shouldCrossfade;
        try {
            mediaPlayer.setDataSource(getApplicationContext(), trackUri);
            mediaPlayer.setOnPreparedListener(new MediaPlayer.OnPreparedListener() {
                @Override
                public void onPrepared(MediaPlayer mp) {
                    if (mp != mediaPlayer) {
                        return;
                    }
                    isMediaPrepared = true;
                    int duration = mp.getDuration();
                    if (duration > 0) {
                        miniProgressBar.setMax(duration);
                        seekBarNp.setMax(duration);
                        tvNpTotal.setText(formatDuration(duration));
                    }
                    applyReverbToPlayer(mp);
                    if (fadeInActive && fadingOutPlayer != null) {
                        mp.setVolume(0f, 0f);
                        crossfadeDurationMs = crossfadeSeconds * 1000L;
                        crossfadeStartMs = SystemClock.uptimeMillis();
                        uiHandler.removeCallbacks(crossfadeRunnable);
                        uiHandler.post(crossfadeRunnable);
                    } else {
                        mp.setVolume(1.0f, 1.0f);
                    }
                    mp.start();
                    updatePlayPauseIcon(true);
                    audioVisualizer.setPlayingState(true, song.id, 0L);
                    songAdapter.notifyDataSetChanged();
                    uiHandler.post(progressRunnable);
                }
            });
            mediaPlayer.setOnCompletionListener(new MediaPlayer.OnCompletionListener() {
                @Override
                public void onCompletion(MediaPlayer mp) {
                    if (mp == mediaPlayer) {
                        handleTrackCompletion();
                    }
                }
            });
            mediaPlayer.setOnErrorListener(new MediaPlayer.OnErrorListener() {
                @Override
                public boolean onError(MediaPlayer mp, int what, int extra) {
                    if (mp == mediaPlayer) {
                        isMediaPrepared = false;
                        updatePlayPauseIcon(false);
                        audioVisualizer.setPlayingState(false, currentSongId, 0L);
                        songAdapter.notifyDataSetChanged();
                        Toast.makeText(MainActivity.this,
                                "Unable to play: " + song.title,
                                Toast.LENGTH_SHORT).show();
                    }
                    return true;
                }
            });
            mediaPlayer.prepareAsync();
        } catch (IOException | IllegalArgumentException | SecurityException e) {
            isMediaPrepared = false;
            updatePlayPauseIcon(false);
            audioVisualizer.setPlayingState(false, currentSongId, 0L);
            Toast.makeText(this, "Error opening audio file: " + song.title, Toast.LENGTH_SHORT).show();
        }
    }

    private void handleTrackCompletion() {
        if (repeatMode == REPEAT_ONE && mediaPlayer != null && isMediaPrepared) {
            mediaPlayer.seekTo(0);
            mediaPlayer.start();
            updatePlayPauseIcon(true);
            return;
        }
        if (playbackQueue.isEmpty()) {
            resetTransportToIdle();
            return;
        }
        if (shuffleEnabled && playbackQueue.size() > 1) {
            playNext();
            return;
        }
        if (currentPlaylistIndex < playbackQueue.size() - 1 || repeatMode == REPEAT_ALL) {
            playNext();
        } else {
            resetTransportToIdle();
        }
    }

    private void resetTransportToIdle() {
        updatePlayPauseIcon(false);
        miniProgressBar.setProgress(0);
        seekBarNp.setProgress(0);
        tvNpElapsed.setText("0:00");
        songAdapter.notifyDataSetChanged();
    }

    private void togglePlayPause() {
        if (mediaPlayer != null && isMediaPrepared) {
            if (isPlayingSafe()) {
                pausePlayback();
            } else {
                requestAudioFocusIfNeeded();
                resumePlayback();
            }
            return;
        }

        if (!displayedSongs.isEmpty()) {
            playbackQueue.clear();
            playbackQueue.addAll(displayedSongs);
            currentPlaylistIndex = 0;
            playSong(playbackQueue.get(0));
        } else if (!allSongs.isEmpty()) {
            playbackQueue.clear();
            playbackQueue.addAll(allSongs);
            currentPlaylistIndex = 0;
            playSong(playbackQueue.get(0));
        } else {
            Toast.makeText(this, "No audio tracks available to play.", Toast.LENGTH_SHORT).show();
        }
    }

    private void pausePlayback() {
        releaseFadingOutPlayer();
        if (mediaPlayer != null && isMediaPrepared && isPlayingSafe()) {
            mediaPlayer.pause();
            uiHandler.removeCallbacks(progressRunnable);
            updatePlayPauseIcon(false);
            audioVisualizer.setPlayingState(false, currentSongId, 0L);
            songAdapter.notifyDataSetChanged();
        }
    }

    private void resumePlayback() {
        if (mediaPlayer != null && isMediaPrepared && !isPlayingSafe()) {
            mediaPlayer.setVolume(1.0f, 1.0f);
            applyReverbToPlayer(mediaPlayer);
            mediaPlayer.start();
            updatePlayPauseIcon(true);
            audioVisualizer.setPlayingState(true, currentSongId, mediaPlayer.getCurrentPosition());
            songAdapter.notifyDataSetChanged();
            uiHandler.removeCallbacks(progressRunnable);
            uiHandler.post(progressRunnable);
        }
    }

    private void playPrevious() {
        if (mediaPlayer != null && isMediaPrepared && mediaPlayer.getCurrentPosition() > 3000) {
            mediaPlayer.seekTo(0);
            miniProgressBar.setProgress(0);
            seekBarNp.setProgress(0);
            tvNpElapsed.setText("0:00");
            return;
        }

        ensureQueueSeeded();
        if (playbackQueue.isEmpty()) {
            return;
        }

        currentPlaylistIndex--;
        if (currentPlaylistIndex < 0) {
            currentPlaylistIndex = playbackQueue.size() - 1;
        }
        playSong(playbackQueue.get(currentPlaylistIndex));
    }

    private void playNext() {
        ensureQueueSeeded();
        if (playbackQueue.isEmpty()) {
            return;
        }

        if (shuffleEnabled && playbackQueue.size() > 1) {
            int nextIndex = currentPlaylistIndex;
            while (nextIndex == currentPlaylistIndex) {
                nextIndex = shuffleRng.nextInt(playbackQueue.size());
            }
            currentPlaylistIndex = nextIndex;
        } else {
            currentPlaylistIndex = (currentPlaylistIndex + 1) % playbackQueue.size();
        }
        playSong(playbackQueue.get(currentPlaylistIndex));
    }

    private void ensureQueueSeeded() {
        if (playbackQueue.isEmpty()) {
            if (!displayedSongs.isEmpty()) {
                playbackQueue.addAll(displayedSongs);
                currentPlaylistIndex = 0;
            } else if (!allSongs.isEmpty()) {
                playbackQueue.addAll(allSongs);
                currentPlaylistIndex = 0;
            }
        }
    }

    private void updatePlayPauseIcon(boolean playing) {
        int resId = playing ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play;
        btnPlayPause.setImageResource(resId);
        btnNpPlayPause.setImageResource(resId);
        ThemeConfig.tintButton(btnPlayPause, currentTheme.onAccentText);
        ThemeConfig.tintButton(btnNpPlayPause, currentTheme.onAccentText);
    }

    private void updateSeekProgress() {
        if (mediaPlayer == null || !isMediaPrepared) {
            return;
        }
        try {
            int pos = mediaPlayer.getCurrentPosition();
            int dur = mediaPlayer.getDuration();
            if (!isUserSeeking) {
                miniProgressBar.setProgress(pos);
                seekBarNp.setProgress(pos);
                tvNpElapsed.setText(formatDuration(pos));
            }
            audioVisualizer.setPlayingState(isPlayingSafe(), currentSongId, pos);

            if (crossfadeSeconds > 0
                    && !autoCrossfadeTriggeredForCurrentTrack
                    && repeatMode != REPEAT_ONE
                    && !playbackQueue.isEmpty()
                    && dur > crossfadeSeconds * 1000 + 1500) {
                long remainingMs = (long) dur - (long) pos;
                if (remainingMs > 200L && remainingMs <= crossfadeSeconds * 1000L) {
                    boolean hasNext = (shuffleEnabled && playbackQueue.size() > 1)
                            || currentPlaylistIndex < playbackQueue.size() - 1
                            || repeatMode == REPEAT_ALL;
                    if (hasNext) {
                        autoCrossfadeTriggeredForCurrentTrack = true;
                        playNext();
                    }
                }
            }
        } catch (IllegalStateException ignored) {
        }
    }

    private boolean isPlayingSafe() {
        try {
            return mediaPlayer != null && isMediaPrepared && mediaPlayer.isPlaying();
        } catch (IllegalStateException e) {
            return false;
        }
    }

    private void requestAudioFocusIfNeeded() {
        if (audioManager == null) {
            return;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (audioFocusRequest == null) {
                AudioAttributes attrs = new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .build();
                audioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                        .setAudioAttributes(attrs)
                        .setOnAudioFocusChangeListener(audioFocusListener)
                        .build();
            }
            audioManager.requestAudioFocus(audioFocusRequest);
        } else {
            audioManager.requestAudioFocus(
                    audioFocusListener,
                    AudioManager.STREAM_MUSIC,
                    AudioManager.AUDIOFOCUS_GAIN);
        }
    }

    private void abandonAudioFocus() {
        if (audioManager == null) {
            return;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && audioFocusRequest != null) {
            audioManager.abandonAudioFocusRequest(audioFocusRequest);
        } else {
            audioManager.abandonAudioFocus(audioFocusListener);
        }
    }

    public static String formatDuration(long durationMs) {
        long totalSeconds = Math.max(0L, durationMs / 1000L);
        long hours = totalSeconds / 3600L;
        long minutes = (totalSeconds % 3600L) / 60L;
        long seconds = totalSeconds % 60L;
        if (hours > 0L) {
            return String.format(Locale.US, "%d:%02d:%02d", hours, minutes, seconds);
        }
        return String.format(Locale.US, "%d:%02d", minutes, seconds);
    }

    private void updateShakeListenerRegistration() {
        if (sensorManager == null || accelerometer == null) {
            return;
        }
        if (shakeToSkipEnabled && !isShakeListenerRegistered && !isFinishing() && !isDestroyed()) {
            sensorManager.registerListener(shakeSensorListener, accelerometer, SensorManager.SENSOR_DELAY_UI);
            isShakeListenerRegistered = true;
        } else if (!shakeToSkipEnabled && isShakeListenerRegistered) {
            sensorManager.unregisterListener(shakeSensorListener);
            isShakeListenerRegistered = false;
        }
    }

    private void unregisterShakeListener() {
        if (sensorManager != null && isShakeListenerRegistered) {
            sensorManager.unregisterListener(shakeSensorListener);
            isShakeListenerRegistered = false;
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        updateShakeListenerRegistration();
        if (hasAudioPermission() && allSongs.isEmpty()) {
            scanLocalAudioFiles();
        }
        if (isPlayingSafe()) {
            uiHandler.removeCallbacks(progressRunnable);
            uiHandler.post(progressRunnable);
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        unregisterShakeListener();
    }

    @Override
    protected void onStop() {
        super.onStop();
        uiHandler.removeCallbacks(progressRunnable);
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        unregisterShakeListener();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && isBackCallbackRegistered
                && backInvokedCallback != null) {
            getOnBackInvokedDispatcher().unregisterOnBackInvokedCallback(
                    (OnBackInvokedCallback) backInvokedCallback);
            isBackCallbackRegistered = false;
        }
        if (startupSplashView != null) {
            startupSplashView.stopAnimationLoop();
        }
        uiHandler.removeCallbacksAndMessages(null);
        queryExecutor.shutdownNow();
        artExecutor.shutdownNow();
        artThumbCache.evictAll();
        abandonAudioFocus();
        releaseFadingOutPlayer();
        releaseEnvironmentalReverb();
        if (presetReverb != null) {
            try {
                presetReverb.release();
            } catch (Exception ignored) {
            }
            presetReverb = null;
        }
        if (mediaPlayer != null) {
            try {
                if (isMediaPrepared && mediaPlayer.isPlaying()) {
                    mediaPlayer.stop();
                }
            } catch (IllegalStateException ignored) {
            }
            mediaPlayer.release();
            mediaPlayer = null;
        }
    }

    private Song findSongById(long songId) {
        if (songId == -1L) {
            return null;
        }
        for (Song s : allSongs) {
            if (s.id == songId) {
                return s;
            }
        }
        return null;
    }

    private AlertDialog.Builder createThemedDialogBuilder() {
        return new AlertDialog.Builder(
                this,
                currentTheme.isLightSurface
                        ? android.R.style.Theme_Holo_Light_Dialog
                        : android.R.style.Theme_Holo_Dialog);
    }

    private void showTrackActionsDialog(final Song target, final int position) {
        final boolean isFav = favoriteSongIds.contains(target.id);
        final String[] options = new String[]{
                "Play Track",
                isFav ? "Remove from Favorites" : "Add to Favorites",
                "Inspect ID3 Metadata",
                "Edit / Generate Album Art"
        };

        AlertDialog.Builder builder = createThemedDialogBuilder();
        builder.setTitle(target.title);
        builder.setItems(options, new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                if (which == 0) {
                    playbackQueue.clear();
                    playbackQueue.addAll(displayedSongs);
                    currentPlaylistIndex = position;
                    playSong(target);
                } else if (which == 1) {
                    if (isFav) {
                        favoriteSongIds.remove(target.id);
                        Toast.makeText(MainActivity.this,
                                "Removed from Favorites: " + target.title,
                                Toast.LENGTH_SHORT).show();
                    } else {
                        favoriteSongIds.add(target.id);
                        Toast.makeText(MainActivity.this,
                                "Added to Favorites: " + target.title,
                                Toast.LENGTH_SHORT).show();
                    }
                    saveFavoriteIds();
                    applyFiltersAndSort();
                } else if (which == 2) {
                    showTrackMetadataDialog(target);
                } else if (which == 3) {
                    showAlbumArtEditorDialog(target);
                }
            }
        });
        builder.setNegativeButton("Cancel", null);
        builder.show();
    }

    private void showTrackMetadataDialog(final Song song) {
        if (song == null) {
            return;
        }
        String formatLabel = "Audio Container";
        String sampleRateLabel = "Device Native";
        String bitrateLabel = "Variable / VBR";
        String channelsLabel = "Stereo (2 ch)";
        String fileSizeLabel = "Unknown";

        Uri trackUri = ContentUris.withAppendedId(
                MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, song.id);
        long fileBytes = 0L;
        if (!song.filePath.isEmpty()) {
            File f = new File(song.filePath);
            if (f.exists() && f.length() > 0L) {
                fileBytes = f.length();
                if (fileBytes >= 1024L * 1024L) {
                    fileSizeLabel = String.format(Locale.US, "%.2f MB", fileBytes / (1024.0 * 1024.0));
                } else {
                    fileSizeLabel = Math.max(1L, fileBytes / 1024L) + " KB";
                }
            }
        }

        MediaExtractor extractor = new MediaExtractor();
        try {
            extractor.setDataSource(this, trackUri, null);
            for (int i = 0; i < extractor.getTrackCount(); i++) {
                MediaFormat fmt = extractor.getTrackFormat(i);
                String mime = fmt.getString(MediaFormat.KEY_MIME);
                if (mime != null && mime.startsWith("audio/")) {
                    formatLabel = mime.replace("audio/", "").toUpperCase(Locale.US);
                    if ("MPEG".equals(formatLabel)) {
                        formatLabel = "MP3 (MPEG Audio)";
                    } else if ("MP4A-LATM".equals(formatLabel)) {
                        formatLabel = "M4A / AAC";
                    }
                    if (fmt.containsKey(MediaFormat.KEY_SAMPLE_RATE)) {
                        int sr = fmt.getInteger(MediaFormat.KEY_SAMPLE_RATE);
                        sampleRateLabel = String.format(Locale.US, "%,d Hz (%.1f kHz)", sr, sr / 1000.0);
                    }
                    if (fmt.containsKey(MediaFormat.KEY_CHANNEL_COUNT)) {
                        int ch = fmt.getInteger(MediaFormat.KEY_CHANNEL_COUNT);
                        channelsLabel = ch == 1 ? "Mono (1 ch)" : (ch == 2 ? "Stereo (2 ch)" : (ch + " ch"));
                    }
                    if (fmt.containsKey(MediaFormat.KEY_BIT_RATE)) {
                        int br = fmt.getInteger(MediaFormat.KEY_BIT_RATE);
                        if (br > 0) {
                            bitrateLabel = Math.round(br / 1000.0) + " kbps";
                        }
                    } else if (fileBytes > 0L && song.durationMs > 0L) {
                        long estKbps = Math.round((fileBytes * 8.0) / song.durationMs);
                        if (estKbps > 0L) {
                            bitrateLabel = "~" + estKbps + " kbps";
                        }
                    }
                    break;
                }
            }
        } catch (Exception ignored) {
        } finally {
            try {
                extractor.release();
            } catch (Exception ignored) {
            }
        }

        String pathDisplay = !song.filePath.isEmpty() ? song.filePath : trackUri.toString();
        String details = "Title: " + song.title + "\n"
                + "Artist: " + song.artist + "\n"
                + "Album: " + song.album + "\n\n"
                + "Format: " + formatLabel + "\n"
                + "Bitrate: " + bitrateLabel + "\n"
                + "Sample Rate: " + sampleRateLabel + "\n"
                + "Channels: " + channelsLabel + "\n"
                + "Duration: " + formatDuration(song.durationMs) + "\n"
                + "File Size: " + fileSizeLabel + "\n"
                + "Path: " + pathDisplay;

        AlertDialog.Builder builder = createThemedDialogBuilder();
        builder.setTitle("ID3 Metadata Inspector");
        builder.setMessage(details);
        builder.setNeutralButton("Edit Cover Art", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                showAlbumArtEditorDialog(song);
            }
        });
        builder.setPositiveButton("Close", null);
        builder.show();
    }

    private void loadSongThumbnailAsync(final long songId) {
        if (songId <= 0L || artThumbCache.get(songId) != null || artLoadInFlight.contains(songId)) {
            return;
        }
        if (noArtSongIds.contains(songId) && !HoloAlbumArtHelper.hasCustomArt(this, songId)) {
            return;
        }
        final Song meta = findSongById(songId);
        final long albumId = meta != null ? meta.albumId : -1L;
        artLoadInFlight.add(songId);
        artExecutor.execute(new Runnable() {
            @Override
            public void run() {
                final HoloAlbumArtHelper.ArtworkLoadResult result =
                        HoloAlbumArtHelper.loadTrackArtwork(MainActivity.this, songId, albumId, 160);
                uiHandler.post(new Runnable() {
                    @Override
                    public void run() {
                        artLoadInFlight.remove(songId);
                        if (isFinishing() || isDestroyed()) {
                            return;
                        }
                        if (result.bitmap != null) {
                            artThumbCache.put(songId, result.bitmap);
                            noArtSongIds.remove(songId);
                            corruptedArtSongIds.remove(songId);
                            if (result.isCustom) {
                                customArtSongIds.add(songId);
                            }
                        } else {
                            noArtSongIds.add(songId);
                            if (result.embeddedCorrupted) {
                                corruptedArtSongIds.add(songId);
                            }
                        }
                        if (songId == currentSongId) {
                            updateNowPlayingArtworkView(songId);
                        }
                        songAdapter.notifyDataSetChanged();
                    }
                });
            }
        });
    }

    private void updateNowPlayingArtworkView(final long songId) {
        Bitmap bmp = songId > 0L ? artThumbCache.get(songId) : null;
        if (bmp != null) {
            if (ivNowPlayingArt != null) {
                ivNowPlayingArt.setScaleType(ImageView.ScaleType.CENTER_CROP);
                ivNowPlayingArt.setColorFilter(null);
                ivNowPlayingArt.setImageBitmap(bmp);
            }
            if (ivNpArtwork != null) {
                ivNpArtwork.setScaleType(ImageView.ScaleType.CENTER_CROP);
                ivNpArtwork.setColorFilter(null);
                ivNpArtwork.setImageBitmap(bmp);
                if (isNowPlayingOpen) {
                    final Song meta = findSongById(songId);
                    final long albumId = meta != null ? meta.albumId : -1L;
                    artExecutor.execute(new Runnable() {
                        @Override
                        public void run() {
                            final HoloAlbumArtHelper.ArtworkLoadResult full =
                                    HoloAlbumArtHelper.loadTrackArtwork(MainActivity.this, songId, albumId, 512);
                            if (full.bitmap != null) {
                                uiHandler.post(new Runnable() {
                                    @Override
                                    public void run() {
                                        if (!isFinishing() && !isDestroyed()
                                                && songId == currentSongId && ivNpArtwork != null) {
                                            ivNpArtwork.setImageBitmap(full.bitmap);
                                        }
                                    }
                                });
                            }
                        }
                    });
                }
            }
        } else {
            Bitmap miniVinyl = ThemeConfig.createVinylPlaceholderBitmap(
                    currentTheme, ThemeConfig.dp(this, 42));
            if (ivNowPlayingArt != null) {
                ivNowPlayingArt.setScaleType(ImageView.ScaleType.CENTER_CROP);
                ivNowPlayingArt.setColorFilter(null);
                ivNowPlayingArt.setImageBitmap(miniVinyl);
            }
            if (ivNpArtwork != null) {
                Bitmap largeVinyl = ThemeConfig.createVinylPlaceholderBitmap(
                        currentTheme, ThemeConfig.dp(this, 244));
                ivNpArtwork.setScaleType(ImageView.ScaleType.CENTER_CROP);
                ivNpArtwork.setColorFilter(null);
                ivNpArtwork.setImageBitmap(largeVinyl);
            }
            if (songId > 0L) {
                loadSongThumbnailAsync(songId);
            }
        }
    }

    private int dpToPx(int dp) {
        return Math.round(TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP, dp, getResources().getDisplayMetrics()));
    }

    private void showAlbumArtEditorDialog(final Song song) {
        if (song == null) {
            return;
        }

        final int[] selectedStyle = new int[]{HoloAlbumArtHelper.STYLE_HOLO_WAVE};
        final int[] variantCounter = new int[]{0};

        final boolean initialMissingOrCorrupted =
                !HoloAlbumArtHelper.hasCustomArt(this, song.id)
                        && (corruptedArtSongIds.contains(song.id)
                        || noArtSongIds.contains(song.id)
                        || artThumbCache.get(song.id) == null);

        Bitmap existingFull = HoloAlbumArtHelper.loadTrackArtwork(this, song.id, song.albumId, 512).bitmap;
        final String defaultSeed = !"Local Library".equals(song.album) ? song.album : song.title;
        if (existingFull == null) {
            activeArtPreviewBitmap = HoloAlbumArtHelper.generateHoloCoverArt(
                    song.title, song.artist, song.album, selectedStyle[0], defaultSeed, 512);
        } else {
            activeArtPreviewBitmap = existingFull;
        }

        ScrollView scroll = new ScrollView(this);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        int pad = dpToPx(16);
        root.setPadding(pad, pad, pad, pad);
        scroll.addView(root);

        TextView tvNotice = new TextView(this);
        tvNotice.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        tvNotice.setPadding(dpToPx(10), dpToPx(8), dpToPx(10), dpToPx(8));
        if (corruptedArtSongIds.contains(song.id)) {
            tvNotice.setText("Embedded metadata image was corrupted. Generated a KitKat Holo cover below, or pick an image from your device.");
            tvNotice.setTextColor(0xFFFFE082);
            tvNotice.setBackgroundColor(0x33FFA000);
        } else if (initialMissingOrCorrupted) {
            tvNotice.setText("No embedded album art found. Generated a KitKat Holo cover below, or pick an image from your device.");
            tvNotice.setTextColor(0xFF9EE3FB);
            tvNotice.setBackgroundColor(0x2633B5E5);
        } else {
            tvNotice.setText("Customize album cover via generated Holo artwork, device gallery photo, or library search.");
            tvNotice.setTextColor(0xB3FFFFFF);
            tvNotice.setBackgroundColor(0x14FFFFFF);
        }
        LinearLayout.LayoutParams noticeLp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        noticeLp.bottomMargin = dpToPx(12);
        root.addView(tvNotice, noticeLp);
        activeArtStatusText = tvNotice;

        // Live preview frame + track info
        LinearLayout previewRow = new LinearLayout(this);
        previewRow.setOrientation(LinearLayout.HORIZONTAL);
        previewRow.setGravity(Gravity.CENTER_VERTICAL);
        root.addView(previewRow);

        ImageView ivPreview = new ImageView(this);
        int previewPx = dpToPx(116);
        LinearLayout.LayoutParams imgLp = new LinearLayout.LayoutParams(previewPx, previewPx);
        GradientDrawable frameBg = new GradientDrawable();
        frameBg.setColor(currentTheme.dockBottom);
        frameBg.setStroke(dpToPx(2), currentTheme.accent);
        ivPreview.setBackground(frameBg);
        ivPreview.setPadding(dpToPx(2), dpToPx(2), dpToPx(2), dpToPx(2));
        ivPreview.setScaleType(ImageView.ScaleType.CENTER_CROP);
        ivPreview.setImageBitmap(activeArtPreviewBitmap);
        previewRow.addView(ivPreview, imgLp);
        activeArtPreviewView = ivPreview;

        LinearLayout metaCol = new LinearLayout(this);
        metaCol.setOrientation(LinearLayout.VERTICAL);
        LinearLayout.LayoutParams metaLp = new LinearLayout.LayoutParams(
                0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
        metaLp.setMarginStart(dpToPx(12));
        previewRow.addView(metaCol, metaLp);

        TextView tvTrackName = new TextView(this);
        tvTrackName.setText(song.title);
        tvTrackName.setTextColor(currentTheme.textPrimary);
        tvTrackName.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
        tvTrackName.setTypeface(Typeface.DEFAULT_BOLD);
        metaCol.addView(tvTrackName);

        TextView tvArtistAlbum = new TextView(this);
        tvArtistAlbum.setText(song.artist + " - " + song.album);
        tvArtistAlbum.setTextColor(currentTheme.accent);
        tvArtistAlbum.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        tvArtistAlbum.setPadding(0, dpToPx(4), 0, dpToPx(8));
        metaCol.addView(tvArtistAlbum);

        Button btnPickDevice = new Button(this);
        btnPickDevice.setText("Pick From Device...");
        btnPickDevice.setTextColor(currentTheme.accent);
        btnPickDevice.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        btnPickDevice.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                launchDeviceImagePicker();
            }
        });
        metaCol.addView(btnPickDevice);

        // Cover Label / Visual Seed input + Shuffle
        TextView tvSeedLabel = new TextView(this);
        tvSeedLabel.setText("GENERATE HOLO COVER (LABEL & STYLE)");
        tvSeedLabel.setTextColor(currentTheme.accent);
        tvSeedLabel.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
        tvSeedLabel.setTypeface(Typeface.DEFAULT_BOLD);
        tvSeedLabel.setPadding(0, dpToPx(14), 0, dpToPx(4));
        root.addView(tvSeedLabel);

        LinearLayout seedRow = new LinearLayout(this);
        seedRow.setOrientation(LinearLayout.HORIZONTAL);
        seedRow.setGravity(Gravity.CENTER_VERTICAL);
        root.addView(seedRow);

        final EditText etSeed = new EditText(this);
        etSeed.setText(defaultSeed);
        etSeed.setHint("Album or cover title");
        etSeed.setTextColor(currentTheme.textPrimary);
        etSeed.setHintTextColor(currentTheme.textDim);
        etSeed.setSingleLine(true);
        seedRow.addView(etSeed, new LinearLayout.LayoutParams(
                0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));

        Button btnShuffle = new Button(this);
        btnShuffle.setText("Shuffle");
        btnShuffle.setTextColor(currentTheme.accent);
        btnShuffle.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        seedRow.addView(btnShuffle);

        final Runnable regenerateAction = new Runnable() {
            @Override
            public void run() {
                String label = etSeed.getText().toString().trim();
                String effectiveSeed = variantCounter[0] > 0
                        ? (label.isEmpty() ? defaultSeed : label) + " #" + variantCounter[0]
                        : label;
                Bitmap generated = HoloAlbumArtHelper.generateHoloCoverArt(
                        song.title,
                        song.artist,
                        song.album,
                        selectedStyle[0],
                        effectiveSeed,
                        512);
                activeArtPreviewBitmap = generated;
                if (activeArtPreviewView != null) {
                    activeArtPreviewView.setImageBitmap(generated);
                }
            }
        };

        etSeed.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {
            }

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                regenerateAction.run();
            }

            @Override
            public void afterTextChanged(Editable s) {
            }
        });

        btnShuffle.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                variantCounter[0]++;
                regenerateAction.run();
            }
        });

        // Style selector row (wrapping across 2 clean rows)
        LinearLayout styleRow1 = new LinearLayout(this);
        styleRow1.setOrientation(LinearLayout.HORIZONTAL);
        root.addView(styleRow1);

        LinearLayout styleRow2 = new LinearLayout(this);
        styleRow2.setOrientation(LinearLayout.HORIZONTAL);
        root.addView(styleRow2);

        final List<Button> styleButtons = new ArrayList<>();
        for (int i = 0; i < HoloAlbumArtHelper.STYLE_LABELS.length; i++) {
            final int styleIdx = i;
            Button btnStyle = new Button(this);
            btnStyle.setText(HoloAlbumArtHelper.STYLE_LABELS[i]);
            btnStyle.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
            btnStyle.setTextColor(i == selectedStyle[0] ? currentTheme.accent : currentTheme.textPrimary);
            btnStyle.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    selectedStyle[0] = styleIdx;
                    for (int j = 0; j < styleButtons.size(); j++) {
                        styleButtons.get(j).setTextColor(
                                j == styleIdx ? currentTheme.accent : currentTheme.textPrimary);
                    }
                    regenerateAction.run();
                }
            });
            styleButtons.add(btnStyle);
            LinearLayout.LayoutParams btnLp = new LinearLayout.LayoutParams(
                    0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
            if (i < 3) {
                styleRow1.addView(btnStyle, btnLp);
            } else {
                styleRow2.addView(btnStyle, btnLp);
            }
        }

        // Library Artwork Search section
        TextView tvSearchLabel = new TextView(this);
        tvSearchLabel.setText("SEARCH EXISTING LIBRARY ARTWORK");
        tvSearchLabel.setTextColor(currentTheme.accent);
        tvSearchLabel.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
        tvSearchLabel.setTypeface(Typeface.DEFAULT_BOLD);
        tvSearchLabel.setPadding(0, dpToPx(12), 0, dpToPx(4));
        root.addView(tvSearchLabel);

        EditText etSearchArt = new EditText(this);
        etSearchArt.setHint("Search tracks or albums with cover art");
        etSearchArt.setTextColor(currentTheme.textPrimary);
        etSearchArt.setHintTextColor(currentTheme.textDim);
        etSearchArt.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
        etSearchArt.setSingleLine(true);
        root.addView(etSearchArt);

        final LinearLayout searchResultsBox = new LinearLayout(this);
        searchResultsBox.setOrientation(LinearLayout.VERTICAL);
        root.addView(searchResultsBox);

        populateLibraryArtMatches(searchResultsBox, "", song.id);

        etSearchArt.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {
            }

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                String q = s != null ? s.toString().trim().toLowerCase(Locale.US) : "";
                populateLibraryArtMatches(searchResultsBox, q, song.id);
            }

            @Override
            public void afterTextChanged(Editable s) {
            }
        });

        // Apply to album checkbox
        final List<Song> sameAlbumSongs = new ArrayList<>();
        for (Song candidate : allSongs) {
            if (candidate.album.equals(song.album) && candidate.artist.equals(song.artist)) {
                sameAlbumSongs.add(candidate);
            }
        }
        final CheckBox cbApplyAlbum = new CheckBox(this);
        if (sameAlbumSongs.size() > 1) {
            cbApplyAlbum.setText("Apply to all " + sameAlbumSongs.size() + " tracks in \"" + song.album + "\"");
            cbApplyAlbum.setTextColor(currentTheme.textPrimary);
            cbApplyAlbum.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
            cbApplyAlbum.setChecked(true);
            LinearLayout.LayoutParams cbLp = new LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            cbLp.topMargin = dpToPx(10);
            root.addView(cbApplyAlbum, cbLp);
        }

        AlertDialog.Builder builder = createThemedDialogBuilder();
        builder.setTitle(R.string.holo_art_dialog_title);
        builder.setView(scroll);
        builder.setPositiveButton("Save Cover", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                Bitmap toSave = activeArtPreviewBitmap;
                if (toSave != null) {
                    List<Song> targets = (sameAlbumSongs.size() > 1 && cbApplyAlbum.isChecked())
                            ? sameAlbumSongs
                            : Collections.singletonList(song);
                    applyCustomArtworkToSongs(targets, toSave);
                }
                clearActiveArtEditorRefs();
            }
        });
        builder.setNeutralButton("Clear Custom", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                List<Song> targets = (sameAlbumSongs.size() > 1 && cbApplyAlbum.isChecked())
                        ? sameAlbumSongs
                        : Collections.singletonList(song);
                clearCustomArtworkFromSongs(targets);
                clearActiveArtEditorRefs();
            }
        });
        builder.setNegativeButton("Cancel", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                clearActiveArtEditorRefs();
            }
        });
        builder.setOnCancelListener(new DialogInterface.OnCancelListener() {
            @Override
            public void onCancel(DialogInterface dialog) {
                clearActiveArtEditorRefs();
            }
        });
        builder.show();
    }

    private void populateLibraryArtMatches(
            LinearLayout container, String queryLower, long excludeSongId) {
        container.removeAllViews();
        int added = 0;
        for (final Song candidate : allSongs) {
            if (candidate.id == excludeSongId) {
                continue;
            }
            Bitmap thumb = artThumbCache.get(candidate.id);
            if (thumb == null) {
                continue;
            }
            if (!queryLower.isEmpty()) {
                boolean match = candidate.title.toLowerCase(Locale.US).contains(queryLower)
                        || candidate.artist.toLowerCase(Locale.US).contains(queryLower)
                        || candidate.album.toLowerCase(Locale.US).contains(queryLower);
                if (!match) {
                    continue;
                }
            }
            LinearLayout row = new LinearLayout(this);
            row.setOrientation(LinearLayout.HORIZONTAL);
            row.setGravity(Gravity.CENTER_VERTICAL);
            row.setPadding(dpToPx(6), dpToPx(6), dpToPx(6), dpToPx(6));
            row.setBackgroundColor(currentTheme.rowActiveBg);

            ImageView iv = new ImageView(this);
            int thumbSize = dpToPx(34);
            iv.setScaleType(ImageView.ScaleType.CENTER_CROP);
            iv.setImageBitmap(thumb);
            row.addView(iv, new LinearLayout.LayoutParams(thumbSize, thumbSize));

            TextView tv = new TextView(this);
            tv.setText(candidate.album + " - " + candidate.artist);
            tv.setTextColor(currentTheme.textPrimary);
            tv.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
            tv.setSingleLine(true);
            LinearLayout.LayoutParams tvLp = new LinearLayout.LayoutParams(
                    0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
            tvLp.setMarginStart(dpToPx(10));
            row.addView(tv, tvLp);

            row.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    Bitmap full = HoloAlbumArtHelper.loadTrackArtwork(
                            MainActivity.this, candidate.id, candidate.albumId, 512).bitmap;
                    if (full != null) {
                        activeArtPreviewBitmap = full;
                        if (activeArtPreviewView != null) {
                            activeArtPreviewView.setImageBitmap(full);
                        }
                        if (activeArtStatusText != null) {
                            activeArtStatusText.setText("Loaded cover from \"" + candidate.album + "\". Tap Save Cover to apply.");
                        }
                    }
                }
            });

            LinearLayout.LayoutParams rowLp = new LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            rowLp.topMargin = dpToPx(4);
            container.addView(row, rowLp);
            added++;
            if (added >= 6) {
                break;
            }
        }
        if (added == 0) {
            TextView empty = new TextView(this);
            empty.setText("No cached library covers matched yet. Generate or pick from device above.");
            empty.setTextColor(currentTheme.textDim);
            empty.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
            empty.setPadding(0, dpToPx(4), 0, dpToPx(4));
            container.addView(empty);
        }
    }

    private void launchDeviceImagePicker() {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("image/*");
        try {
            startActivityForResult(intent, REQUEST_PICK_ALBUM_ART);
        } catch (Exception e) {
            Intent fallback = new Intent(Intent.ACTION_GET_CONTENT);
            fallback.setType("image/*");
            try {
                startActivityForResult(Intent.createChooser(fallback, "Select Album Art"), REQUEST_PICK_ALBUM_ART);
            } catch (Exception ex) {
                Toast.makeText(this, "No image picker app available on device.", Toast.LENGTH_SHORT).show();
            }
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQUEST_PICK_ALBUM_ART && resultCode == RESULT_OK
                && data != null && data.getData() != null) {
            final Uri pickedUri = data.getData();
            artExecutor.execute(new Runnable() {
                @Override
                public void run() {
                    final Bitmap cropped = HoloAlbumArtHelper.decodeAndCropFromUri(
                            MainActivity.this, pickedUri, 512);
                    uiHandler.post(new Runnable() {
                        @Override
                        public void run() {
                            if (isFinishing() || isDestroyed()) {
                                return;
                            }
                            if (cropped != null) {
                                activeArtPreviewBitmap = cropped;
                                if (activeArtPreviewView != null) {
                                    activeArtPreviewView.setImageBitmap(cropped);
                                }
                                if (activeArtStatusText != null) {
                                    activeArtStatusText.setText("Loaded selected image from device. Tap Save Cover to apply.");
                                    activeArtStatusText.setTextColor(0xFF9EE3FB);
                                }
                            } else {
                                Toast.makeText(MainActivity.this,
                                        "Selected image could not be decoded.",
                                        Toast.LENGTH_SHORT).show();
                            }
                        }
                    });
                }
            });
        }
    }

    private void applyCustomArtworkToSongs(final List<Song> targets, final Bitmap coverBitmap) {
        final Bitmap thumb = Bitmap.createScaledBitmap(coverBitmap, 160, 160, true);
        artExecutor.execute(new Runnable() {
            @Override
            public void run() {
                for (Song s : targets) {
                    HoloAlbumArtHelper.saveCustomArtBitmap(MainActivity.this, s.id, coverBitmap);
                }
                uiHandler.post(new Runnable() {
                    @Override
                    public void run() {
                        if (isFinishing() || isDestroyed()) {
                            return;
                        }
                        for (Song s : targets) {
                            artThumbCache.put(s.id, thumb);
                            customArtSongIds.add(s.id);
                            noArtSongIds.remove(s.id);
                            corruptedArtSongIds.remove(s.id);
                        }
                        updateNowPlayingArtworkView(currentSongId);
                        songAdapter.notifyDataSetChanged();
                        Toast.makeText(MainActivity.this,
                                "Saved album art for " + targets.size()
                                        + (targets.size() == 1 ? " track." : " tracks."),
                                Toast.LENGTH_SHORT).show();
                    }
                });
            }
        });
    }

    private void clearCustomArtworkFromSongs(final List<Song> targets) {
        artExecutor.execute(new Runnable() {
            @Override
            public void run() {
                for (Song s : targets) {
                    HoloAlbumArtHelper.deleteCustomArt(MainActivity.this, s.id);
                }
                uiHandler.post(new Runnable() {
                    @Override
                    public void run() {
                        if (isFinishing() || isDestroyed()) {
                            return;
                        }
                        for (Song s : targets) {
                            artThumbCache.remove(s.id);
                            customArtSongIds.remove(s.id);
                            noArtSongIds.remove(s.id);
                            corruptedArtSongIds.remove(s.id);
                            loadSongThumbnailAsync(s.id);
                        }
                        updateNowPlayingArtworkView(currentSongId);
                        songAdapter.notifyDataSetChanged();
                        Toast.makeText(MainActivity.this,
                                "Cleared custom album art.",
                                Toast.LENGTH_SHORT).show();
                    }
                });
            }
        });
    }

    private void clearActiveArtEditorRefs() {
        activeArtPreviewView = null;
        activeArtPreviewBitmap = null;
        activeArtStatusText = null;
    }

    private final class SongAdapter extends BaseAdapter {

        private final LayoutInflater inflater = LayoutInflater.from(MainActivity.this);

        @Override
        public int getCount() {
            return displayedSongs.size();
        }

        @Override
        public Song getItem(int position) {
            return displayedSongs.get(position);
        }

        @Override
        public long getItemId(int position) {
            return displayedSongs.get(position).id;
        }

        @Override
        public View getView(int position, View convertView, ViewGroup parent) {
            ViewHolder holder;
            if (convertView == null) {
                convertView = inflater.inflate(R.layout.item_song, parent, false);
                holder = new ViewHolder(convertView);
                convertView.setTag(holder);
            } else {
                holder = (ViewHolder) convertView.getTag();
            }

            final Song song = getItem(position);
            boolean isCurrent = (song.id == currentSongId);
            boolean isFav = favoriteSongIds.contains(song.id);

            holder.tvTitle.setText(isFav ? "FAV - " + song.title : song.title);
            holder.tvArtist.setText(song.artist + " - " + song.album);
            holder.tvArtist.setTextColor(currentTheme.textSecondary);
            holder.tvDuration.setText(formatDuration(song.durationMs));
            holder.viewIndicator.setBackgroundColor(currentTheme.accent);

            if (showListArtwork) {
                holder.ivArt.setVisibility(View.VISIBLE);
                holder.ivArt.setBackgroundColor(currentTheme.isLightSurface ? 0xFFD9EEF9 : 0xFF12171D);
                holder.ivArt.setScaleType(ImageView.ScaleType.CENTER_CROP);
                holder.ivArt.setColorFilter(null);
                Bitmap thumb = artThumbCache.get(song.id);
                if (thumb != null) {
                    holder.ivArt.setImageBitmap(thumb);
                } else {
                    if (listNotePlaceholderBitmap == null) {
                        listNotePlaceholderBitmap = ThemeConfig.createMusicNotePlaceholderBitmap(
                                currentTheme, ThemeConfig.dp(MainActivity.this, 40));
                    }
                    holder.ivArt.setImageBitmap(listNotePlaceholderBitmap);
                    loadSongThumbnailAsync(song.id);
                }
            } else {
                holder.ivArt.setVisibility(View.GONE);
            }

            holder.btnEditArt.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    showAlbumArtEditorDialog(song);
                }
            });
            if (holder.btnEditArt.getDrawable() != null) {
                holder.btnEditArt.getDrawable().mutate().setColorFilter(
                        artThumbCache.get(song.id) == null ? currentTheme.accent : currentTheme.textDim,
                        PorterDuff.Mode.SRC_IN);
            }

            if (isCurrent) {
                boolean activelyPlaying = isPlayingSafe();
                holder.viewIndicator.setVisibility(View.VISIBLE);
                holder.ivStatus.setVisibility(View.VISIBLE);
                holder.ivStatus.setImageResource(
                        activelyPlaying
                                ? android.R.drawable.ic_media_play
                                : android.R.drawable.ic_media_pause);
                if (holder.ivStatus.getDrawable() != null) {
                    holder.ivStatus.getDrawable().mutate().setColorFilter(
                            activelyPlaying ? currentTheme.accent : currentTheme.accentDark,
                            PorterDuff.Mode.SRC_IN);
                }
                holder.tvTitle.setTextColor(currentTheme.accent);
                holder.tvTitle.setTypeface(Typeface.DEFAULT_BOLD);
                holder.tvDuration.setTextColor(currentTheme.accent);
                convertView.setBackgroundColor(currentTheme.rowActiveBg);
            } else {
                holder.viewIndicator.setVisibility(View.INVISIBLE);
                holder.ivStatus.setVisibility(View.GONE);
                holder.tvTitle.setTextColor(currentTheme.textPrimary);
                holder.tvTitle.setTypeface(Typeface.DEFAULT);
                holder.tvDuration.setTextColor(currentTheme.textDim);
                convertView.setBackgroundColor(0x00000000);
            }

            return convertView;
        }

        private final class ViewHolder {
            final View viewIndicator;
            final ImageView ivStatus;
            final ImageView ivArt;
            final TextView tvTitle;
            final TextView tvArtist;
            final TextView tvDuration;
            final ImageButton btnEditArt;

            ViewHolder(View root) {
                viewIndicator = root.findViewById(R.id.view_playing_indicator);
                ivStatus = root.findViewById(R.id.iv_row_status);
                ivArt = root.findViewById(R.id.iv_item_art);
                tvTitle = root.findViewById(R.id.tv_item_title);
                tvArtist = root.findViewById(R.id.tv_item_artist);
                tvDuration = root.findViewById(R.id.tv_item_duration);
                btnEditArt = root.findViewById(R.id.btn_item_edit_art);
            }
        }
    }
}
