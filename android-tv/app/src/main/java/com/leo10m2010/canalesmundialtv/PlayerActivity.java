package com.leo10m2010.canalesmundialtv;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Context;
import android.content.pm.ActivityInfo;
import android.content.pm.ApplicationInfo;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.media.AudioManager;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;

public class PlayerActivity extends Activity {
    public static final String EXTRA_CHANNEL_NAME = "channelName";
    public static final String EXTRA_CHANNEL_META = "channelMeta";
    public static final String EXTRA_SOURCE_NAMES = "sourceNames";
    public static final String EXTRA_SOURCE_URLS = "sourceUrls";
    public static final String EXTRA_SOURCE_INDEX = "sourceIndex";
    public static final String EXTRA_PLAYLIST_JSON = "playlistJson";
    public static final String EXTRA_CHANNEL_INDEX = "channelIndex";

    private static class PlayerChannel {
        final String name;
        final String meta;
        final ArrayList<String> sourceNames;
        final ArrayList<String> sourceUrls;

        PlayerChannel(String name, String meta, ArrayList<String> sourceNames, ArrayList<String> sourceUrls) {
            this.name = name;
            this.meta = meta;
            this.sourceNames = sourceNames;
            this.sourceUrls = sourceUrls;
        }
    }

    private final Handler handler = new Handler(Looper.getMainLooper());
    private static final int PANE_PRIMARY = 0;
    private static final int PANE_SECONDARY = 1;

    private FrameLayout root;
    private LinearLayout paneGrid;
    private FrameLayout primaryPane;
    private FrameLayout secondaryPane;
    private WebView webView;
    private WebView secondaryWebView;
    private TextView primaryPaneBadge;
    private TextView secondaryPaneBadge;
    private LinearLayout hud;
    private TextView hudTitle;
    private TextView hudMeta;
    private LinearLayout loadingOverlay;
    private LinearLayout errorOverlay;
    private LinearLayout sourcePanel;
    private View fullscreenView;
    private WebChromeClient.CustomViewCallback fullscreenCallback;
    private AudioManager audioManager;
    private ArrayList<String> sourceNames;
    private ArrayList<String> sourceUrls;
    private final ArrayList<View> sourceRows = new ArrayList<>();
    private ArrayList<PlayerChannel> playlist = new ArrayList<>();
    private String channelName;
    private String channelMeta;
    private int currentChannelIndex;
    private int currentSourceIndex;
    private int activePane = PANE_PRIMARY;
    private final int[] paneChannelIndexes = new int[] { 0, 0 };
    private final int[] paneSourceIndexes = new int[] { 0, 0 };
    private final boolean[] paneLoadFailed = new boolean[] { false, false };
    private boolean splitMode;
    private Runnable hideHudRunnable;
    private Runnable loadTimeoutRunnable;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        super.onCreate(savedInstanceState);

        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        setVolumeControlStream(AudioManager.STREAM_MUSIC);
        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        enterImmersiveMode();

        readIntentData();
        buildLayout();
        configureWebView(webView, PANE_PRIMARY);
        configureWebView(secondaryWebView, PANE_SECONDARY);
        loadCurrentSource();
    }

    private void readIntentData() {
        channelName = getIntent().getStringExtra(EXTRA_CHANNEL_NAME);
        channelMeta = getIntent().getStringExtra(EXTRA_CHANNEL_META);
        sourceNames = getIntent().getStringArrayListExtra(EXTRA_SOURCE_NAMES);
        sourceUrls = getIntent().getStringArrayListExtra(EXTRA_SOURCE_URLS);
        currentSourceIndex = getIntent().getIntExtra(EXTRA_SOURCE_INDEX, 0);
        currentChannelIndex = getIntent().getIntExtra(EXTRA_CHANNEL_INDEX, 0);

        if (channelName == null || channelName.trim().isEmpty()) {
            channelName = "Canal";
        }
        if (channelMeta == null) {
            channelMeta = "";
        }
        if (sourceNames == null) {
            sourceNames = new ArrayList<>();
        }
        if (sourceUrls == null) {
            sourceUrls = new ArrayList<>();
        }

        playlist = parsePlaylist(getIntent().getStringExtra(EXTRA_PLAYLIST_JSON));
        if (playlist.isEmpty()) {
            playlist.add(new PlayerChannel(channelName, channelMeta, new ArrayList<>(sourceNames), new ArrayList<>(sourceUrls)));
        }

        if (currentChannelIndex < 0 || currentChannelIndex >= playlist.size()) {
            currentChannelIndex = 0;
        }

        paneChannelIndexes[PANE_PRIMARY] = currentChannelIndex;
        paneSourceIndexes[PANE_PRIMARY] = currentSourceIndex;
        paneChannelIndexes[PANE_SECONDARY] = playlist.size() > 1 ? (currentChannelIndex + 1) % playlist.size() : currentChannelIndex;
        paneSourceIndexes[PANE_SECONDARY] = 0;

        applyCurrentChannel(false);
    }

    private ArrayList<PlayerChannel> parsePlaylist(String json) {
        ArrayList<PlayerChannel> channels = new ArrayList<>();
        if (json == null || json.trim().isEmpty()) {
            return channels;
        }

        try {
            JSONArray array = new JSONArray(json);
            for (int index = 0; index < array.length(); index++) {
                JSONObject item = array.optJSONObject(index);
                if (item == null) {
                    continue;
                }

                ArrayList<String> names = new ArrayList<>();
                ArrayList<String> urls = new ArrayList<>();
                JSONArray sources = item.optJSONArray("sources");
                if (sources != null) {
                    for (int sourceIndex = 0; sourceIndex < sources.length(); sourceIndex++) {
                        JSONObject source = sources.optJSONObject(sourceIndex);
                        if (source == null) {
                            continue;
                        }
                        String url = source.optString("url", "");
                        if (!url.startsWith("http://") && !url.startsWith("https://")) {
                            continue;
                        }
                        names.add(source.optString("name", "Fuente " + (sourceIndex + 1)));
                        urls.add(url);
                    }
                }

                if (!urls.isEmpty()) {
                    channels.add(new PlayerChannel(
                            item.optString("name", "Canal " + (index + 1)),
                            item.optString("meta", ""),
                            names,
                            urls
                    ));
                }
            }
        } catch (Exception ignored) {
            return new ArrayList<>();
        }

        return channels;
    }

    private void applyCurrentChannel(boolean resetSource) {
        PlayerChannel channel = playlist.get(currentChannelIndex);
        channelName = channel.name;
        channelMeta = channel.meta;
        sourceNames = new ArrayList<>(channel.sourceNames);
        sourceUrls = new ArrayList<>(channel.sourceUrls);

        if (resetSource) {
            currentSourceIndex = 0;
        }
        if (currentSourceIndex < 0 || currentSourceIndex >= sourceUrls.size()) {
            currentSourceIndex = 0;
        }

        if (hudTitle != null) {
            showHud("Canal listo", false);
        }
        syncPaneStateFromCurrent();
        updatePaneBadges();
    }

    private void buildLayout() {
        root = new FrameLayout(this);
        root.setBackgroundColor(Color.BLACK);

        webView = new WebView(this);
        secondaryWebView = new WebView(this);
        webView.setBackgroundColor(Color.BLACK);
        secondaryWebView.setBackgroundColor(Color.BLACK);

        paneGrid = new LinearLayout(this);
        paneGrid.setOrientation(LinearLayout.HORIZONTAL);
        paneGrid.setBackgroundColor(Color.BLACK);

        primaryPane = createPaneContainer(webView, PANE_PRIMARY);
        secondaryPane = createPaneContainer(secondaryWebView, PANE_SECONDARY);
        paneGrid.addView(primaryPane, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, 1f));
        paneGrid.addView(secondaryPane, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, 1f));
        secondaryPane.setVisibility(View.GONE);

        root.addView(paneGrid, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));

        loadingOverlay = createOverlayContainer();
        errorOverlay = createOverlayContainer();
        sourcePanel = createSourcePanel();
        hud = createHud();

        root.addView(loadingOverlay, fullParams());
        root.addView(errorOverlay, fullParams());
        root.addView(sourcePanel, sourcePanelParams());
        root.addView(hud, hudParams());

        loadingOverlay.setVisibility(View.GONE);
        errorOverlay.setVisibility(View.GONE);
        sourcePanel.setVisibility(View.GONE);

        setContentView(root);
        updatePaneBadges();
    }

    private FrameLayout createPaneContainer(WebView paneWebView, int paneIndex) {
        FrameLayout pane = new FrameLayout(this);
        pane.setPadding(splitMode ? dp(4) : 0, 0, splitMode ? dp(4) : 0, 0);
        pane.setBackgroundColor(Color.BLACK);
        pane.addView(paneWebView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));

        TextView badge = label(paneIndex == PANE_PRIMARY ? "Ventana 1" : "Ventana 2", 13, TvStyle.BG, true);
        badge.setGravity(Gravity.CENTER);
        badge.setPadding(dp(12), 0, dp(12), 0);
        badge.setBackground(panelBackground(TvStyle.SIGNAL, TvStyle.SIGNAL, 999));
        FrameLayout.LayoutParams badgeParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                dp(34)
        );
        badgeParams.gravity = Gravity.TOP | Gravity.START;
        badgeParams.setMargins(dp(12), dp(12), dp(12), dp(12));
        pane.addView(badge, badgeParams);

        if (paneIndex == PANE_PRIMARY) {
            primaryPaneBadge = badge;
        } else {
            secondaryPaneBadge = badge;
        }

        return pane;
    }

    private LinearLayout createHud() {
        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setPadding(dp(18), dp(12), dp(18), dp(12));
        panel.setBackground(panelBackground(Color.argb(226, 7, 8, 7), Color.argb(80, 255, 255, 255), 18));

        hudTitle = label(channelName, 18, TvStyle.TEXT, true);
        hudTitle.setSingleLine(true);
        hudMeta = label("", 13, TvStyle.MUTED, false);
        hudMeta.setPadding(0, dp(3), 0, 0);

        panel.addView(hudTitle);
        panel.addView(hudMeta);
        return panel;
    }

    private FrameLayout.LayoutParams hudParams() {
        FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        params.gravity = Gravity.TOP | Gravity.START;
        params.setMargins(dp(24), dp(20), dp(24), dp(20));
        return params;
    }

    private LinearLayout createOverlayContainer() {
        LinearLayout overlay = new LinearLayout(this);
        overlay.setOrientation(LinearLayout.VERTICAL);
        overlay.setGravity(Gravity.CENTER);
        overlay.setPadding(dp(36), dp(36), dp(36), dp(36));
        overlay.setBackgroundColor(Color.argb(178, 0, 0, 0));
        return overlay;
    }

    private FrameLayout.LayoutParams fullParams() {
        return new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        );
    }

    private LinearLayout createSourcePanel() {
        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setPadding(dp(18), dp(18), dp(18), dp(18));
        panel.setBackground(panelBackground(Color.argb(238, 16, 16, 20), Color.argb(130, 255, 255, 255), 26));
        return panel;
    }

    private FrameLayout.LayoutParams sourcePanelParams() {
        FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(dp(470), ViewGroup.LayoutParams.MATCH_PARENT);
        params.gravity = Gravity.END;
        params.setMargins(dp(18), dp(18), dp(18), dp(18));
        return params;
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void configureWebView(WebView targetWebView, int paneIndex) {
        boolean debuggable = (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        WebView.setWebContentsDebuggingEnabled(debuggable);

        targetWebView.setFocusable(true);
        targetWebView.setFocusableInTouchMode(true);
        targetWebView.setInitialScale(100);
        targetWebView.setLayerType(View.LAYER_TYPE_HARDWARE, null);

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(targetWebView, true);

        WebSettings settings = targetWebView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setLoadsImagesAutomatically(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setTextZoom(100);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE); // Para streaming es mejor no cachear
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        settings.setUserAgentString(settings.getUserAgentString() + " CanalesMundialTV/3.0 AndroidTV NativePlayer");

        targetWebView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                if (!paneLoadFailed[paneIndex] && paneIndex == activePane) {
                    unmuteVisibleMedia(view);
                    hideError();
                    hideLoading();
                    showHud("Fuente cargada", false);
                }
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (request != null && request.isForMainFrame() && paneIndex == activePane) {
                    showError("No se pudo cargar esta fuente", "El WebView no recibio una respuesta valida. Puedes reintentar, cambiar de fuente o volver al menu.");
                }
            }

            @Override
            public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse errorResponse) {
                super.onReceivedHttpError(view, request, errorResponse);
                if (request != null && request.isForMainFrame() && errorResponse != null && errorResponse.getStatusCode() >= 400 && paneIndex == activePane) {
                    showError("Fuente no disponible", "El servidor respondio HTTP " + errorResponse.getStatusCode() + ". Prueba otra fuente disponible.");
                }
            }
        });

        targetWebView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onShowCustomView(View view, CustomViewCallback callback) {
                if (fullscreenView != null) {
                    callback.onCustomViewHidden();
                    return;
                }

                fullscreenView = view;
                fullscreenCallback = callback;
                root.addView(view, new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                ));
                paneGrid.setVisibility(View.GONE);
                enterImmersiveMode();
            }

            @Override
            public void onHideCustomView() {
                hideCustomView();
            }

            @Override
            public void onPermissionRequest(PermissionRequest request) {
                String[] resources = request.getResources();
                for (String resource : resources) {
                    if (PermissionRequest.RESOURCE_PROTECTED_MEDIA_ID.equals(resource)) {
                        request.grant(new String[] { PermissionRequest.RESOURCE_PROTECTED_MEDIA_ID });
                        return;
                    }
                }
                request.deny();
            }
        });
    }

    private void loadCurrentSource() {
        closeSourcePanel(false);

        if (sourceUrls.isEmpty()) {
            showError("Canal sin fuentes", "Este canal no tiene URL disponible en los datos cargados.");
            return;
        }

        if (!ConnectivityHelper.hasInternet(this)) {
            showError("Sin conexion a internet", "La app puede navegar canales sin internet, pero el reproductor necesita conexion para abrir la fuente.");
            return;
        }

        if (currentSourceIndex < 0 || currentSourceIndex >= sourceUrls.size()) {
            currentSourceIndex = 0;
        }

        paneLoadFailed[activePane] = false;
        hideError();
        showLoading("Cargando canal", channelPositionText() + "\n" + channelName + "\nFuente: " + getCurrentSourceName());
        showHud("Abriendo fuente", true);
        syncPaneStateFromCurrent();
        activeWebView().requestFocus();
        activeWebView().loadUrl(sourceUrls.get(currentSourceIndex));
    }

    private void showLoading(String title, String detail) {
        loadingOverlay.removeAllViews();
        LinearLayout panel = centeredPanel();
        panel.addView(label(title, 30, TvStyle.TEXT, true));

        TextView copy = label(detail + "\nSi tarda demasiado, usa Menu para cambiar de fuente.", 18, TvStyle.MUTED, false);
        copy.setGravity(Gravity.CENTER);
        copy.setPadding(0, dp(10), 0, 0);
        panel.addView(copy);

        LinearLayout rail = new LinearLayout(this);
        rail.setOrientation(LinearLayout.HORIZONTAL);
        rail.setGravity(Gravity.CENTER);
        rail.setPadding(0, dp(22), 0, 0);
        rail.addView(statusDot(TvStyle.SIGNAL));
        rail.addView(statusDot(Color.rgb(255, 255, 255)));
        rail.addView(statusDot(Color.rgb(120, 120, 120)));
        panel.addView(rail);

        loadingOverlay.addView(panel);
        loadingOverlay.setVisibility(View.VISIBLE);

        if (loadTimeoutRunnable != null) {
            handler.removeCallbacks(loadTimeoutRunnable);
        }
        loadTimeoutRunnable = () -> showError("La fuente demora en responder", "El sitio externo no termino de cargar. Puedes reintentar o pasar a otra fuente.");
        handler.postDelayed(loadTimeoutRunnable, 18000);
    }

    private void hideLoading() {
        loadingOverlay.setVisibility(View.GONE);
        if (loadTimeoutRunnable != null) {
            handler.removeCallbacks(loadTimeoutRunnable);
        }
    }

    private View statusDot(int color) {
        View dot = new View(this);
        dot.setBackground(TvStyle.rounded(this, color, color, 999));
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(dp(74), dp(6));
        params.setMargins(dp(5), 0, dp(5), 0);
        dot.setLayoutParams(params);
        return dot;
    }

    private void showError(String title, String body) {
        paneLoadFailed[activePane] = true;
        hideLoading();
        errorOverlay.removeAllViews();

        LinearLayout panel = centeredPanel();
        panel.addView(label(title, 31, TvStyle.TEXT, true));

        TextView copy = label(body, 18, TvStyle.MUTED, false);
        copy.setGravity(Gravity.CENTER);
        copy.setPadding(0, dp(10), 0, dp(22));
        panel.addView(copy);

        LinearLayout actions = new LinearLayout(this);
        actions.setOrientation(LinearLayout.HORIZONTAL);
        actions.setGravity(Gravity.CENTER);

        TextView retry = actionButton("Reintentar", true);
        retry.setOnClickListener(view -> loadCurrentSource());
        actions.addView(retry);

        if (sourceUrls.size() > 1) {
            TextView next = actionButton("Siguiente fuente", false);
            next.setOnClickListener(view -> moveSource(1));
            actions.addView(next);
        }

        if (playlist.size() > 1) {
            TextView nextChannel = actionButton("Siguiente canal", false);
            nextChannel.setOnClickListener(view -> moveChannel(1));
            actions.addView(nextChannel);
        }

        TextView back = actionButton("Volver", false);
        back.setOnClickListener(view -> finish());
        actions.addView(back);

        panel.addView(actions);
        errorOverlay.addView(panel);
        errorOverlay.setVisibility(View.VISIBLE);
        retry.requestFocus();
    }

    private void hideError() {
        errorOverlay.setVisibility(View.GONE);
    }

    private LinearLayout centeredPanel() {
        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setGravity(Gravity.CENTER);
        panel.setPadding(dp(42), dp(34), dp(42), dp(34));
        panel.setBackground(panelBackground(Color.rgb(18, 18, 22), Color.argb(110, 255, 255, 255), 30));
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(dp(800), ViewGroup.LayoutParams.WRAP_CONTENT);
        panel.setLayoutParams(params);
        return panel;
    }

    private TextView actionButton(String text, boolean primary) {
        TextView button = label(text, 16, primary ? TvStyle.BG : TvStyle.TEXT, true);
        button.setGravity(Gravity.CENTER);
        button.setFocusable(true);
        button.setClickable(true);
        button.setPadding(dp(18), 0, dp(18), 0);
        button.setBackground(panelBackground(primary ? TvStyle.SIGNAL : Color.rgb(40, 40, 46), primary ? TvStyle.SIGNAL : Color.argb(120, 255, 255, 255), 999));

        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(dp(150), dp(54));
        params.setMargins(dp(6), 0, dp(6), 0);
        button.setLayoutParams(params);

        button.setOnFocusChangeListener((view, hasFocus) -> {
            button.setTextColor(hasFocus ? TvStyle.BG : (primary ? TvStyle.BG : TvStyle.TEXT));
            button.setBackground(panelBackground(hasFocus ? TvStyle.SIGNAL : (primary ? TvStyle.SIGNAL : Color.rgb(40, 40, 46)), hasFocus ? TvStyle.SIGNAL : Color.argb(120, 255, 255, 255), 999));
            TvStyle.focusScale(button, hasFocus);
        });
        button.setOnKeyListener((view, keyCode, event) -> {
            if (event.getAction() == KeyEvent.ACTION_DOWN && isSelectKey(keyCode)) {
                view.performClick();
                return true;
            }
            if (event.getAction() == KeyEvent.ACTION_UP && isSelectKey(keyCode)) {
                return true;
            }
            return false;
        });

        return button;
    }

    @SuppressLint("SetTextI18n")
    private void showHud(String state, boolean persistent) {
        hudTitle.setText(channelPositionText() + " · " + channelName);
        hudMeta.setText("Fuente: " + getCurrentSourceName() + " · " + state + " · Vol+/- volumen · CH+/- canal · Menu fuentes · Back volver");
        hud.setVisibility(View.VISIBLE);

        if (hideHudRunnable != null) {
            handler.removeCallbacks(hideHudRunnable);
        }
        if (!persistent) {
            hideHudRunnable = () -> {
                if (sourcePanel.getVisibility() != View.VISIBLE && errorOverlay.getVisibility() != View.VISIBLE && loadingOverlay.getVisibility() != View.VISIBLE) {
                    hud.setVisibility(View.GONE);
                }
            };
            handler.postDelayed(hideHudRunnable, 4300);
        }
    }

    private void toggleSourcePanel() {
        if (sourcePanel.getVisibility() == View.VISIBLE) {
            closeSourcePanel(true);
        } else {
            openSourcePanel();
        }
    }

    private void openSourcePanel() {
        sourcePanel.removeAllViews();
        sourceRows.clear();
        sourcePanel.setVisibility(View.VISIBLE);
        showHud("Panel de control", true);

        TextView title = label(channelPositionText() + " · " + channelName, 25, TvStyle.TEXT, true);
        sourcePanel.addView(title);

        TextView meta = label(channelMeta, 14, TvStyle.MUTED, false);
        meta.setPadding(0, dp(6), 0, dp(14));
        sourcePanel.addView(meta);

        // --- SECCIÓN VOLUMEN ---
        LinearLayout volumeSection = new LinearLayout(this);
        volumeSection.setOrientation(LinearLayout.HORIZONTAL);
        volumeSection.setGravity(Gravity.CENTER_VERTICAL);
        volumeSection.setPadding(0, 0, 0, dp(14));

        TextView volDown = actionButton("Vol -", false);
        volDown.setOnClickListener(v -> handleVolumeKey(KeyEvent.KEYCODE_VOLUME_DOWN));

        TextView volUp = actionButton("Vol +", false);
        volUp.setOnClickListener(v -> handleVolumeKey(KeyEvent.KEYCODE_VOLUME_UP));

        volumeSection.addView(volDown);
        volumeSection.addView(volUp);
        sourcePanel.addView(volumeSection);

        // --- SECCIÓN VISTA DOBLE ---
        LinearLayout splitActions = new LinearLayout(this);
        splitActions.setOrientation(LinearLayout.HORIZONTAL);
        splitActions.setGravity(Gravity.CENTER_VERTICAL);
        splitActions.setPadding(0, 0, 0, dp(14));

        TextView splitButton = actionButton(splitMode ? "Cambiar ventana" : "Vista doble", false);
        splitButton.setOnClickListener(view -> {
            if (splitMode) {
                switchActivePane();
                openSourcePanel();
            } else {
                enableSplitMode();
            }
        });
        splitActions.addView(splitButton);

        if (splitMode) {
            TextView closeSplitButton = actionButton("Cerrar doble", false);
            closeSplitButton.setOnClickListener(view -> {
                closeSplitMode();
                openSourcePanel();
            });
            splitActions.addView(closeSplitButton);
        }

        sourcePanel.addView(splitActions);

        ScrollView sourceScroll = new ScrollView(this);
        LinearLayout sourceList = new LinearLayout(this);
        sourceList.setOrientation(LinearLayout.VERTICAL);

        View focused = null;
        for (int index = 0; index < sourceUrls.size(); index++) {
            TextView row = createSourceRow(index);
            sourceList.addView(row);
            if (index == currentSourceIndex) {
                focused = row;
            }
        }

        sourceScroll.addView(sourceList);
        sourcePanel.addView(sourceScroll, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                0,
                1f
        ));

        View target = focused != null ? focused : sourceList.getChildAt(0);
        if (target != null) {
            target.requestFocus();
        }
    }

    private TextView createSourceRow(int index) {
        boolean active = index == currentSourceIndex;
        String activeLabel = active ? " · EN USO" : "";
        TextView row = label("Fuente " + (index + 1) + " de " + sourceUrls.size() + " · " + getSourceName(index) + activeLabel,
                16, active ? TvStyle.BG : TvStyle.TEXT, true);
        row.setGravity(Gravity.START | Gravity.CENTER_VERTICAL);
        row.setFocusable(true);
        row.setClickable(true);
        row.setPadding(dp(14), 0, dp(14), 0);
        row.setBackground(sourceRowBackground(active, false));

        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(64));
        params.setMargins(0, 0, 0, dp(10));
        row.setLayoutParams(params);

        row.setOnFocusChangeListener((view, hasFocus) -> {
            boolean nowActive = index == currentSourceIndex;
            row.setTextColor(hasFocus || nowActive ? TvStyle.BG : TvStyle.TEXT);
            row.setBackground(sourceRowBackground(nowActive, hasFocus));
            TvStyle.focusScale(row, hasFocus);
        });
        row.setOnClickListener(view -> {
            currentSourceIndex = index;
            closeSourcePanel(false);
            loadCurrentSource();
        });
        row.setOnKeyListener((view, keyCode, event) -> {
            if (event.getAction() == KeyEvent.ACTION_DOWN
                    && (keyCode == KeyEvent.KEYCODE_DPAD_UP || keyCode == KeyEvent.KEYCODE_DPAD_DOWN)) {
                return moveSourceRowFocus(row, keyCode == KeyEvent.KEYCODE_DPAD_DOWN ? 1 : -1);
            }

            if (event.getAction() == KeyEvent.ACTION_DOWN && isSelectKey(keyCode)) {
                view.performClick();
                return true;
            }
            if (event.getAction() == KeyEvent.ACTION_UP && isSelectKey(keyCode)) {
                return true;
            }
            return false;
        });
        sourceRows.add(row);
        return row;
    }

    private boolean moveSourceRowFocus(View current, int offset) {
        int index = sourceRows.indexOf(current);
        if (index == -1 || sourceRows.isEmpty()) {
            return false;
        }

        int targetIndex = Math.max(0, Math.min(sourceRows.size() - 1, index + offset));
        if (targetIndex == index) {
            return true;
        }

        sourceRows.get(targetIndex).requestFocus();
        return true;
    }

    private GradientDrawable sourceRowBackground(boolean active, boolean focused) {
        if (focused || active) {
            return panelBackground(TvStyle.SIGNAL, TvStyle.SIGNAL, 16);
        }
        return panelBackground(Color.rgb(34, 34, 40), Color.argb(100, 255, 255, 255), 16);
    }

    private void closeSourcePanel(boolean showControlHud) {
        sourcePanel.setVisibility(View.GONE);
        activeWebView().requestFocus();
        if (showControlHud) {
            showHud("Control del player activo", false);
        }
    }

    private void moveSource(int offset) {
        if (sourceUrls.isEmpty()) {
            return;
        }
        currentSourceIndex = (currentSourceIndex + offset + sourceUrls.size()) % sourceUrls.size();
        syncPaneStateFromCurrent();
        closeSourcePanel(false);
        loadCurrentSource();
    }

    private void moveChannel(int offset) {
        if (playlist.size() <= 1) {
            showHud("No hay mas canales en esta seccion", false);
            return;
        }

        currentChannelIndex = (currentChannelIndex + offset + playlist.size()) % playlist.size();
        currentSourceIndex = 0;
        applyCurrentChannel(true);
        closeSourcePanel(false);
        loadCurrentSource();
    }

    private void enableSplitMode() {
        if (playlist.size() <= 1) {
            showHud("Vista doble necesita al menos dos canales en esta seccion", false);
            return;
        }

        splitMode = true;
        secondaryPane.setVisibility(View.VISIBLE);
        primaryPane.setPadding(0, 0, dp(4), 0);
        secondaryPane.setPadding(dp(4), 0, 0, 0);

        int primaryChannel = paneChannelIndexes[PANE_PRIMARY];
        paneChannelIndexes[PANE_SECONDARY] = (primaryChannel + 1) % playlist.size();
        paneSourceIndexes[PANE_SECONDARY] = 0;
        paneLoadFailed[PANE_SECONDARY] = false;

        applyPaneState(PANE_SECONDARY);
        closeSourcePanel(false);
        loadCurrentSource();
        showHud("Vista doble activa. Arriba/Abajo cambia ventana", false);
    }

    private void closeSplitMode() {
        if (!splitMode) {
            return;
        }

        secondaryWebView.loadUrl("about:blank");
        splitMode = false;
        secondaryPane.setVisibility(View.GONE);
        primaryPane.setPadding(0, 0, 0, 0);
        activePane = PANE_PRIMARY;
        applyPaneState(PANE_PRIMARY);
        showHud("Vista doble cerrada", false);
    }

    private void switchActivePane() {
        if (!splitMode) {
            return;
        }

        applyPaneState(activePane == PANE_PRIMARY ? PANE_SECONDARY : PANE_PRIMARY);
        showHud("Ventana activa cambiada", false);
    }

    private WebView activeWebView() {
        return activePane == PANE_SECONDARY ? secondaryWebView : webView;
    }

    private void syncPaneStateFromCurrent() {
        paneChannelIndexes[activePane] = currentChannelIndex;
        paneSourceIndexes[activePane] = currentSourceIndex;
    }

    private void applyPaneState(int paneIndex) {
        activePane = paneIndex;
        currentChannelIndex = paneChannelIndexes[activePane];
        currentSourceIndex = paneSourceIndexes[activePane];
        applyCurrentChannel(false);
        updatePaneBadges();
    }

    private void updatePaneBadges() {
        updatePaneBadge(primaryPaneBadge, PANE_PRIMARY);
        updatePaneBadge(secondaryPaneBadge, PANE_SECONDARY);

        // Auto-ocultar etiquetas después de 4 segundos
        handler.removeCallbacks(hideBadgesRunnable);
        handler.postDelayed(hideBadgesRunnable, 4000);
    }

    private final Runnable hideBadgesRunnable = () -> {
        if (primaryPaneBadge != null) primaryPaneBadge.setVisibility(View.GONE);
        if (secondaryPaneBadge != null) secondaryPaneBadge.setVisibility(View.GONE);
    };

    @SuppressLint("SetTextI18n")
    private void updatePaneBadge(TextView badge, int paneIndex) {
        if (badge == null || playlist.isEmpty()) {
            return;
        }

        int channelIndex = Math.max(0, Math.min(playlist.size() - 1, paneChannelIndexes[paneIndex]));
        String label = paneIndex == PANE_PRIMARY ? "Ventana 1" : "Ventana 2";
        if (splitMode) {
            label += paneIndex == activePane ? " · ACTIVA" : "";
        }
        badge.setText(label + " · " + playlist.get(channelIndex).name);
        boolean active = paneIndex == activePane;
        badge.setTextColor(active ? TvStyle.BG : TvStyle.TEXT);
        badge.setBackground(panelBackground(active ? TvStyle.SIGNAL : Color.argb(210, 7, 8, 7), active ? TvStyle.SIGNAL : Color.argb(95, 255, 255, 255), 999));

        // Solo mostrar si es necesario (ej. cambio de canal o modo split)
        badge.setVisibility(View.VISIBLE);
    }

    private String getCurrentSourceName() {
        return getSourceName(currentSourceIndex);
    }

    private String channelPositionText() {
        int total = Math.max(1, playlist.size());
        return "Canal " + (currentChannelIndex + 1) + "/" + total;
    }

    private String getSourceName(int index) {
        if (sourceNames.isEmpty() || index < 0 || index >= sourceNames.size()) {
            return "Fuente " + (index + 1);
        }
        return sourceNames.get(index);
    }

    private boolean isSelectKey(int keyCode) {
        return keyCode == KeyEvent.KEYCODE_DPAD_CENTER
                || keyCode == KeyEvent.KEYCODE_ENTER
                || keyCode == KeyEvent.KEYCODE_NUMPAD_ENTER
                || keyCode == KeyEvent.KEYCODE_BUTTON_A
                || keyCode == KeyEvent.KEYCODE_BUTTON_SELECT;
    }

    private boolean isVolumeKey(int keyCode) {
        return keyCode == KeyEvent.KEYCODE_VOLUME_UP
                || keyCode == KeyEvent.KEYCODE_VOLUME_DOWN
                || keyCode == KeyEvent.KEYCODE_VOLUME_MUTE
                || keyCode == KeyEvent.KEYCODE_MUTE;
    }

    private void handleVolumeKey(int keyCode) {
        if (audioManager == null) {
            return;
        }

        int direction;
        if (keyCode == KeyEvent.KEYCODE_VOLUME_UP) {
            direction = AudioManager.ADJUST_RAISE;
        } else if (keyCode == KeyEvent.KEYCODE_VOLUME_DOWN) {
            direction = AudioManager.ADJUST_LOWER;
        } else {
            direction = AudioManager.ADJUST_TOGGLE_MUTE;
        }

        audioManager.adjustStreamVolume(AudioManager.STREAM_MUSIC, direction, AudioManager.FLAG_SHOW_UI);
        unmuteVisibleMedia(activeWebView());
        showVolumeHud();
    }

    @SuppressLint("SetTextI18n")
    private void showVolumeHud() {
        if (audioManager == null) {
            return;
        }

        int maxVolume = Math.max(1, audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC));
        int currentVolume = audioManager.getStreamVolume(AudioManager.STREAM_MUSIC);
        int percent = Math.round((currentVolume * 100f) / maxVolume);
        showHud("Volumen " + percent + "%", false);
    }

    private void unmuteVisibleMedia(WebView targetWebView) {
        if (targetWebView == null) {
            return;
        }

        // Script quirúrgico: Bloquea el pause automático, fuerza play y limpia overlays
        String autoPlayScript = "(function(){" +
                "  var count = 0;" +
                "  var forcePlay = function() {" +
                "    var nodes = document.querySelectorAll('video, audio');" +
                "    for(var i=0; i < nodes.length; i++) {" +
                "      var v = nodes[i];" +
                "      var wasPaused = v.paused;" +
                "      if(wasPaused) v.muted = true;" +
                "      v.setAttribute('autoplay', 'true');" +
                "      v.setAttribute('playsinline', 'true');" +
                "      if(v.volume === 0) v.volume = 1;" +
                "      if(wasPaused) v.play().then(function(){" +
                "        setTimeout(function(){ v.muted = false; v.volume = 1; }, 800);" +
                "      }).catch(function(){});" +
                "      else { v.muted = false; v.volume = 1; }" +
                "      /* Bloquear pausas accidentales por 5s */" +
                "      if(!v._hooked) {" +
                "        var originalPause = v.pause;" +
                "        v.pause = function() { if(count > 15) originalPause.apply(v); else console.log('Pause prevented'); };" +
                "        v._hooked = true;" +
                "      }" +
                "    }" +
                "    /* Buscar y remover overlays de play que bloquean el click */" +
                "    var overlays = document.querySelectorAll('[class*=\"overlay\"], [class*=\"poster\"], [class*=\"big-play\"]');" +
                "    for(var k=0; k < overlays.length; k++) {" +
                "       if((overlays[k].innerText || '').toLowerCase().includes('play') || String(overlays[k].className).includes('play')) overlays[k].style.display='none';" +
                "    }" +
                "    var playButtons = document.querySelectorAll('button, [class*=\"play\"], [id*=\"play\"], .vjs-big-play-button');" +
                "    for(var j=0; j < playButtons.length; j++) {" +
                "      if(playButtons[j].offsetWidth > 0 || playButtons[j].offsetHeight > 0) playButtons[j].click();" +
                "    }" +
                "  };" +
                "  var interval = setInterval(function() {" +
                "    forcePlay();" +
                "    count++;" +
                "    if(count > 20) clearInterval(interval);" +
                "  }, 500);" +
                "})();";

        targetWebView.evaluateJavascript(autoPlayScript, null);
    }

    private void togglePlayPause(WebView targetWebView) {
        if (targetWebView == null) return;
        String script = "(function(){" +
                "  var v = document.querySelector('video, audio');" +
                "  if(v) { if(v.paused) v.play(); else v.pause(); }" +
                "})();";
        targetWebView.evaluateJavascript(script, null);
        showHud("Play/Pausa", false);
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        if (event.getAction() != KeyEvent.ACTION_DOWN) {
            return super.dispatchKeyEvent(event);
        }

        int keyCode = event.getKeyCode();
        if (isVolumeKey(keyCode)) {
            handleVolumeKey(keyCode);
            return true;
        }

        if (keyCode == KeyEvent.KEYCODE_BACK) {
            if (sourcePanel.getVisibility() == View.VISIBLE) {
                closeSourcePanel(true);
            } else if (fullscreenView != null) {
                hideCustomView();
            } else if (splitMode) {
                closeSplitMode();
            } else {
                finish();
            }
            return true;
        }

        // Si el selector de fuentes o errores están visibles, dejamos que el sistema maneje las flechas y OK
        if (sourcePanel.getVisibility() == View.VISIBLE || errorOverlay.getVisibility() == View.VISIBLE || loadingOverlay.getVisibility() == View.VISIBLE) {
            return super.dispatchKeyEvent(event);
        }

        // BOTÓN CENTRAL: Play / Pausa
        if (isSelectKey(keyCode)) {
            togglePlayPause(activeWebView());
            return true;
        }

        // FLECHAS IZQUIERDA/DERECHA: Cambio rápido de fuente (sin abrir menú)
        if (keyCode == KeyEvent.KEYCODE_DPAD_LEFT || keyCode == KeyEvent.KEYCODE_DPAD_RIGHT) {
            moveSource(keyCode == KeyEvent.KEYCODE_DPAD_RIGHT ? 1 : -1);
            return true;
        }

        // Manejo de flechas Arriba/Abajo para Zapping o cambio de ventana
        if (keyCode == KeyEvent.KEYCODE_DPAD_UP || keyCode == KeyEvent.KEYCODE_DPAD_DOWN) {
            if (splitMode) {
                switchActivePane();
            } else {
                // Abajo = Siguiente (+1), Arriba = Anterior (-1)
                moveChannel(keyCode == KeyEvent.KEYCODE_DPAD_DOWN ? 1 : -1);
            }
            return true;
        }

        if (keyCode == KeyEvent.KEYCODE_MENU) {
            toggleSourcePanel();
            return true;
        }

        if (keyCode == KeyEvent.KEYCODE_R) {
            loadCurrentSource();
            return true;
        }

        if (keyCode == KeyEvent.KEYCODE_CHANNEL_UP) {
            moveChannel(-1); // Anterior
            return true;
        }

        if (keyCode == KeyEvent.KEYCODE_CHANNEL_DOWN) {
            moveChannel(1); // Siguiente
            return true;
        }

        return super.dispatchKeyEvent(event);
    }

    private void hideCustomView() {
        if (fullscreenView == null) {
            return;
        }

        root.removeView(fullscreenView);
        fullscreenView = null;

        if (fullscreenCallback != null) {
            fullscreenCallback.onCustomViewHidden();
            fullscreenCallback = null;
        }

        paneGrid.setVisibility(View.VISIBLE);
        enterImmersiveMode();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            enterImmersiveMode();
        }
    }

    private TextView label(String text, int sp, int color, boolean bold) {
        TextView view = new TextView(this);
        view.setText(text);
        view.setTextSize(sp);
        view.setTextColor(color);
        if (bold) {
            view.setTypeface(Typeface.DEFAULT_BOLD);
        }
        return view;
    }

    private GradientDrawable panelBackground(int fill, int stroke, int radiusDp) {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setColor(fill);
        drawable.setCornerRadius(dp(radiusDp));
        drawable.setStroke(Math.max(1, dp(1)), stroke);
        return drawable;
    }

    private void enterImmersiveMode() {
        getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        );
    }

    private int dp(int value) {
        return TvStyle.dp(this, value);
    }

    @Override
    protected void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        if (webView != null) {
            webView.stopLoading();
            webView.loadUrl("about:blank");
            if (primaryPane != null) primaryPane.removeView(webView);
            webView.destroy();
            webView = null;
        }
        if (secondaryWebView != null) {
            secondaryWebView.stopLoading();
            secondaryWebView.loadUrl("about:blank");
            if (secondaryPane != null) secondaryPane.removeView(secondaryWebView);
            secondaryWebView.destroy();
            secondaryWebView = null;
        }
        super.onDestroy();
    }
}
