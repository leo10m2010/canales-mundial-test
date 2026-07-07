package com.leo10m2010.canalesmundialtv;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.graphics.Color;
import android.graphics.Rect;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.GridLayout;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

public class MainActivity extends Activity {
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    private ChannelRepository repository;
    private ScrollView scrollView;
    private View firstCard;
    private TextView statusText;
    private TextView networkBadge;
    private List<Channel> localChannels = new ArrayList<>();
    private List<Channel> currentChannels = new ArrayList<>();
    private final List<View> focusableCards = new ArrayList<>();
    private boolean destroyed;
    private boolean openingChannel;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        super.onCreate(savedInstanceState);

        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        enterImmersiveMode();

        repository = new ChannelRepository(this);
        setContentView(createBootView());
        mainHandler.postDelayed(this::loadInitialData, 450);
    }

    private View createBootView() {
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.BLACK);
        focusableCards.clear();

        // 1. Imagen de fondo (bg.webp)
        android.widget.ImageView bg = new android.widget.ImageView(this);
        bg.setImageResource(getResources().getIdentifier("bg", "drawable", getPackageName()));
        bg.setScaleType(android.widget.ImageView.ScaleType.CENTER_CROP);
        root.addView(bg, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        // 2. Capa verde semi-transparente (Overlay) - Opacidad aumentada para oscurecer la imagen
        View overlay = new View(this);
        overlay.setBackgroundColor(Color.argb(215, 5, 12, 5));
        root.addView(overlay, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        // 3. Contenedor de Textos
        LinearLayout centerPanel = new LinearLayout(this);
        centerPanel.setOrientation(LinearLayout.VERTICAL);
        centerPanel.setGravity(Gravity.CENTER);

        TextView title = label("Canales Mundial TV", 58, TvStyle.TEXT, true);
        title.setGravity(Gravity.CENTER);
        title.setAlpha(0f);
        title.animate().alpha(1f).setDuration(1200).start();

        TextView subTitle = label("Cargando experiencia 4K...", 16, TvStyle.SIGNAL, false);
        subTitle.setGravity(Gravity.CENTER);
        subTitle.setPadding(0, dp(14), 0, 0);
        subTitle.setAlpha(0f);
        subTitle.animate().alpha(0.7f).setStartDelay(600).setDuration(1000).start();

        centerPanel.addView(title);
        centerPanel.addView(subTitle);

        // Versión 1.0.0
        TextView versionText = label("Version 1.0.0", 14, TvStyle.MUTED, false);
        versionText.setAlpha(0.6f);

        FrameLayout.LayoutParams centerParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        centerParams.gravity = Gravity.CENTER;

        FrameLayout.LayoutParams versionParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        versionParams.gravity = Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL;
        versionParams.setMargins(0, 0, 0, dp(50));

        root.addView(centerPanel, centerParams);
        root.addView(versionText, versionParams);

        return root;
    }

    private void loadInitialData() {
        if (destroyed) return;

        // 5 segundos de Splash como pediste
        mainHandler.postDelayed(() -> {
            localChannels = repository.loadChannels();
            ChannelRepository.RemoteLoadResult cached = repository.loadCachedRemoteChannels();
            boolean online = ConnectivityHelper.hasInternet(this);
            currentChannels = mergeChannels(localChannels, cached.channels);

            String status = online ? "Sincronizando con Netlify..." : "Modo Offline.";
            setContentView(buildContent(currentChannels, status, online, !cached.channels.isEmpty()));
            focusFirstCard();

            if (online) {
                refreshRemoteData();
            }
        }, 5000);
    }

    private void refreshRemoteData() {
        updateStatus("Actualizando canales 24/7 y agenda desde Netlify...", true, false);

        new Thread(() -> {
            ChannelRepository.RemoteLoadResult result = repository.refreshRemoteChannels();
            List<Channel> merged = mergeChannels(localChannels, result.channels);

            runOnUiThread(() -> {
                if (destroyed) {
                    return;
                }
                currentChannels = merged;
                firstCard = null;
                String status = result.complete
                        ? buildRemoteStatus(merged)
                        : result.message + " La app sigue funcionando con cache/locales.";
                setContentView(buildContent(currentChannels, status, ConnectivityHelper.hasInternet(this), result.usedCache));
                focusFirstCard();
            });
        }).start();
    }

    private String buildRemoteStatus(List<Channel> channels) {
        boolean hasAgenda = hasCategory(channels, "streamx-event");
        boolean hasStreamx247 = hasCategory(channels, "streamx-247");

        if (hasAgenda && hasStreamx247) {
            return "Netlify actualizado. Agenda lista para hoy o la proxima fecha disponible; canales 24/7 activos.";
        }
        if (hasAgenda) {
            return "Netlify actualizado. Agenda lista para hoy o la proxima fecha disponible.";
        }
        if (hasStreamx247) {
            return "Netlify actualizado. Sin partidos Mundial 2026 con fuente disponible; canales 24/7 activos.";
        }
        return "Netlify actualizado. Sin agenda ni canales 24/7 remotos; usando fuentes locales incluidas.";
    }

    private boolean hasCategory(List<Channel> channels, String category) {
        for (Channel channel : channels) {
            if (category.equalsIgnoreCase(channel.category)) {
                return true;
            }
        }
        return false;
    }

    private View buildContent(List<Channel> channels, String status, boolean online, boolean usingCache) {
        firstCard = null;
        focusableCards.clear();

        FrameLayout root = new FrameLayout(this);
        root.setBackground(TvStyle.appBackground());

        scrollView = new ScrollView(this);
        scrollView.setFillViewport(false);
        scrollView.setClipToPadding(false);
        scrollView.setDescendantFocusability(ViewGroup.FOCUS_AFTER_DESCENDANTS);
        scrollView.setPadding(dp(42), dp(30), dp(42), dp(42));

        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(0, 0, 0, dp(34));

        content.addView(createHero(channels.size(), status, online, usingCache));

        if (channels.isEmpty()) {
            content.addView(createEmptyState());
        } else {
            for (Map.Entry<String, List<Channel>> section : groupChannels(channels).entrySet()) {
                content.addView(createSection(section.getKey(), section.getValue()));
            }
        }

        scrollView.addView(content, new ScrollView.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        ));
        root.addView(scrollView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));

        return root;
    }

    private View createHero(int channelCount, String status, boolean online, boolean usingCache) {
        // Usamos un RelativeLayout para tener control absoluto del orden de las capas (Z-Order)
        android.widget.RelativeLayout heroRoot = new android.widget.RelativeLayout(this);
        int heroHeight = dp(180); // Altura fija para el banner para que no se pierda

        // 1. IMAGEN DE FONDO (Al fondo del todo)
        android.widget.ImageView bg = new android.widget.ImageView(this);
        bg.setId(View.generateViewId());
        int resId = getResources().getIdentifier("bg", "drawable", getPackageName());
        if (resId != 0) bg.setImageResource(resId);
        bg.setScaleType(android.widget.ImageView.ScaleType.CENTER_CROP);
        bg.setAlpha(0.45f);

        // 2. PROTECTOR (Degradado para que el texto sea blanco y se vea perfecto)
        View protector = new View(this);
        GradientDrawable gd = new GradientDrawable(GradientDrawable.Orientation.LEFT_RIGHT, new int[] {
                Color.argb(255, 5, 12, 5),   // Negro-verde sólido a la izquierda
                Color.argb(200, 5, 12, 5),   // Semi-oscuro
                Color.argb(0, 0, 0, 0)       // Transparente a la derecha
        });
        protector.setBackground(gd);

        // 3. CONTENIDO DE TEXTO (Lo último que añadimos = Lo que queda arriba)
        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setGravity(Gravity.CENTER_VERTICAL);
        content.setPadding(dp(44), 0, dp(44), 0);

        TextView title = label("Canales Mundial TV", 52, Color.WHITE, true);
        title.setShadowLayer(12, 0, 0, Color.BLACK);

        String smartStatus = "Canales 24/7 activos · ";
        if (status.toLowerCase().contains("agenda lista") || status.toLowerCase().contains("partidos")) {
            smartStatus += "Agenda Mundial disponible";
        } else {
            smartStatus += "Sin eventos hoy";
        }
        TextView sub = label(smartStatus, 19, TvStyle.SIGNAL, false);
        sub.setPadding(0, dp(8), 0, 0);

        content.addView(title);
        content.addView(sub);

        // Scoreboard (solo si hay partido en vivo)
        Channel live = findLiveMatch();
        if (live != null) {
            LinearLayout sb = new LinearLayout(this);
            sb.setOrientation(LinearLayout.HORIZONTAL);
            sb.setGravity(Gravity.CENTER_VERTICAL);
            sb.setPadding(0, dp(15), 0, 0);
            TextView badge = label(" EN VIVO ", 11, Color.BLACK, true);
            badge.setBackground(TvStyle.rounded(this, Color.rgb(255, 60, 60), Color.rgb(255, 60, 60), 4));
            TextView st = label(live.name + "  " + live.liveScore, 22, Color.WHITE, true);
            st.setPadding(dp(15), 0, 0, 0);
            sb.addView(badge);
            sb.addView(st);
            content.addView(sb);
        }

        // --- ENSAMBLAJE RELATIVO (Garantiza visibilidad) ---
        // Ponemos la imagen
        android.widget.RelativeLayout.LayoutParams bgParams = new android.widget.RelativeLayout.LayoutParams(-1, heroHeight);
        heroRoot.addView(bg, bgParams);

        // Ponemos el protector encima de la imagen
        android.widget.RelativeLayout.LayoutParams overlayParams = new android.widget.RelativeLayout.LayoutParams(-1, heroHeight);
        heroRoot.addView(protector, overlayParams);

        // Ponemos el texto encima de todo
        android.widget.RelativeLayout.LayoutParams textParams = new android.widget.RelativeLayout.LayoutParams(-1, heroHeight);
        heroRoot.addView(content, textParams);

        // Aplicamos el marco redondeado al contenedor final
        heroRoot.setBackground(TvStyle.rounded(this, Color.BLACK, Color.argb(40, 231, 255, 85), 32));
        heroRoot.setClipToOutline(true);
        heroRoot.setOutlineProvider(new android.view.ViewOutlineProvider() {
            @Override public void getOutline(View v, android.graphics.Outline o) {
                o.setRoundRect(0, 0, v.getWidth(), v.getHeight(), (float)dp(32));
            }
        });

        LinearLayout.LayoutParams rootParams = new LinearLayout.LayoutParams(-1, heroHeight);
        rootParams.setMargins(0, 0, 0, dp(34));
        heroRoot.setLayoutParams(rootParams);

        return heroRoot;
    }

    private Channel findLiveMatch() {
        if (currentChannels == null) return null;
        for (Channel c : currentChannels) {
            if (c.isLive && "streamx-event".equals(c.category)) {
                return c;
            }
        }
        return null;
    }

    private TextView createBadge(String text, int fill, int textColor) {
        TextView badge = label(text, 13, textColor, true);
        badge.setGravity(Gravity.CENTER);
        badge.setPadding(dp(14), 0, dp(14), 0);
        badge.setBackground(TvStyle.rounded(this, fill, Color.argb(70, 245, 241, 223), 999));
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(38));
        params.setMargins(0, 0, 0, dp(9));
        badge.setLayoutParams(params);
        return badge;
    }

    private View createEmptyState() {
        LinearLayout state = new LinearLayout(this);
        state.setOrientation(LinearLayout.VERTICAL);
        state.setPadding(dp(28), dp(26), dp(28), dp(26));
        state.setBackground(gradientPanel(Color.rgb(24, 19, 18), Color.rgb(44, 25, 22), Color.argb(110, 255, 106, 91), 26));

        TextView title = label("No hay canales cargados", 27, TvStyle.TEXT, true);
        TextView body = label("Revisa que `res/raw/channels.json` exista. La app puede abrir sin internet, pero necesita datos locales o cacheados para mostrar contenido.", 18, TvStyle.MUTED, false);
        body.setPadding(0, dp(8), 0, 0);

        state.addView(title);
        state.addView(body);
        return state;
    }

    private Map<String, List<Channel>> groupChannels(List<Channel> channels) {
        Map<String, List<Channel>> groups = new LinkedHashMap<>();
        groups.put("Agenda Mundial 2026", new ArrayList<>());
        groups.put("Canales 24/7 Stream-XHD", new ArrayList<>());
        groups.put("Mundial 2026 / fuentes fijas", new ArrayList<>());
        groups.put("English", new ArrayList<>());
        groups.put("Español", new ArrayList<>());
        groups.put("Otros", new ArrayList<>());

        for (Channel channel : channels) {
            String key;
            if ("streamx-event".equalsIgnoreCase(channel.category)) {
                key = "Agenda Mundial 2026";
            } else if ("streamx-247".equalsIgnoreCase(channel.category)) {
                key = "Canales 24/7 Stream-XHD";
            } else if ("worldcup".equalsIgnoreCase(channel.category)) {
                key = "Mundial 2026 / fuentes fijas";
            } else if ("English".equalsIgnoreCase(channel.language)) {
                key = "English";
            } else if ("Español".equalsIgnoreCase(channel.language)) {
                key = "Español";
            } else {
                key = "Otros";
            }
            groups.get(key).add(channel);
        }

        Map<String, List<Channel>> visible = new LinkedHashMap<>();
        for (Map.Entry<String, List<Channel>> entry : groups.entrySet()) {
            if (!entry.getValue().isEmpty()) {
                visible.put(entry.getKey(), entry.getValue());
            }
        }
        return visible;
    }

    private View createSection(String title, List<Channel> channels) {
        LinearLayout section = new LinearLayout(this);
        section.setOrientation(LinearLayout.VERTICAL);
        section.setPadding(0, dp(8), 0, dp(26));

        LinearLayout headingRow = new LinearLayout(this);
        headingRow.setOrientation(LinearLayout.HORIZONTAL);
        headingRow.setGravity(Gravity.CENTER_VERTICAL);
        headingRow.setPadding(0, 0, 0, dp(12));

        TextView heading = label(title, 25, TvStyle.TEXT, true);
        TextView count = createBadge(channels.size() + "", Color.rgb(31, 42, 30), TvStyle.SIGNAL);
        LinearLayout.LayoutParams countParams = new LinearLayout.LayoutParams(dp(58), dp(34));
        countParams.setMargins(dp(14), 0, 0, 0);
        count.setLayoutParams(countParams);

        headingRow.addView(heading);
        headingRow.addView(count);
        section.addView(headingRow);

        GridLayout grid = new GridLayout(this);
        grid.setColumnCount(getGridColumns());
        grid.setUseDefaultMargins(false);

        for (int index = 0; index < channels.size(); index++) {
            View card = createChannelCard(channels.get(index), channels, index);
            GridLayout.LayoutParams params = new GridLayout.LayoutParams();
            params.width = dp(276);
            params.height = dp(170);
            params.setMargins(0, 0, dp(16), dp(16));
            grid.addView(card, params);
        }

        section.addView(grid);
        return section;
    }

    private int getGridColumns() {
        int width = getResources().getDisplayMetrics().widthPixels;
        float density = getResources().getDisplayMetrics().density;
        int dpWidth = Math.round(width / density);

        if (dpWidth >= 1720) {
            return 6;
        }
        if (dpWidth >= 1380) {
            return 5;
        }
        if (dpWidth >= 1050) {
            return 4;
        }
        if (dpWidth >= 780) {
            return 3;
        }
        return 2;
    }

    private View createChannelCard(Channel channel, List<Channel> playlist, int playlistIndex) {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setGravity(Gravity.BOTTOM);
        card.setPadding(dp(18), dp(14), dp(18), dp(16));
        card.setFocusable(true);
        card.setClickable(true);
        card.setBackground(cardBackground(false));
        card.setContentDescription(channel.name + ", " + channel.quality + ", " + channel.sourceCountText());

        LinearLayout topRow = new LinearLayout(this);
        topRow.setOrientation(LinearLayout.HORIZONTAL);
        topRow.setGravity(Gravity.CENTER_VERTICAL);

        TextView flag = label(cardBadge(channel), 13, TvStyle.BG, true);
        flag.setGravity(Gravity.CENTER);
        flag.setBackground(TvStyle.rounded(this, TvStyle.SIGNAL, TvStyle.SIGNAL, 999));

        LinearLayout.LayoutParams flagParams = new LinearLayout.LayoutParams(dp(50), dp(30));
        flagParams.setMargins(0, 0, dp(10), 0);
        topRow.addView(flag, flagParams);

        TextView type = label(channel.type + " / " + channel.quality, 12, TvStyle.SIGNAL, true);
        type.setSingleLine(true);
        topRow.addView(type, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));

        TextView name = label(channel.name, 23, TvStyle.TEXT, true);
        name.setMaxLines(2);
        name.setPadding(0, dp(9), 0, dp(8));

        TextView meta = label(channel.language + " · " + channel.sourceCountText(), 14, TvStyle.MUTED, false);
        meta.setSingleLine(true);

        card.addView(topRow);
        card.addView(name);
        card.addView(meta);

        card.setOnFocusChangeListener((view, hasFocus) -> {
            if (hasFocus) {
                card.setBackground(cardBackground(true));
                flag.setTextColor(TvStyle.SIGNAL);
                flag.setBackground(TvStyle.rounded(this, TvStyle.BG, TvStyle.BG, 999));
                type.setTextColor(TvStyle.BG);
                name.setTextColor(TvStyle.BG);
                meta.setTextColor(Color.rgb(34, 39, 29));
                TvStyle.focusScale(card, true);
                scrollIntoView(card);
            } else {
                card.setBackground(cardBackground(false));
                flag.setTextColor(TvStyle.BG);
                flag.setBackground(TvStyle.rounded(this, TvStyle.SIGNAL, TvStyle.SIGNAL, 999));
                type.setTextColor(TvStyle.SIGNAL);
                name.setTextColor(TvStyle.TEXT);
                meta.setTextColor(TvStyle.MUTED);
                TvStyle.focusScale(card, false);
            }
        });

        card.setOnClickListener(view -> openChannel(channel, playlist, playlistIndex));
        card.setOnKeyListener((view, keyCode, event) -> {
            if (event.getAction() == KeyEvent.ACTION_DOWN && isDirectionalKey(keyCode)) {
                return moveCardFocus(view, keyCode);
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

        if (firstCard == null) {
            firstCard = card;
        }
        focusableCards.add(card);

        return card;
    }

    private boolean isDirectionalKey(int keyCode) {
        return keyCode == KeyEvent.KEYCODE_DPAD_UP
                || keyCode == KeyEvent.KEYCODE_DPAD_DOWN
                || keyCode == KeyEvent.KEYCODE_DPAD_LEFT
                || keyCode == KeyEvent.KEYCODE_DPAD_RIGHT;
    }

    private boolean isSelectKey(int keyCode) {
        return keyCode == KeyEvent.KEYCODE_DPAD_CENTER
                || keyCode == KeyEvent.KEYCODE_ENTER
                || keyCode == KeyEvent.KEYCODE_NUMPAD_ENTER
                || keyCode == KeyEvent.KEYCODE_BUTTON_A
                || keyCode == KeyEvent.KEYCODE_BUTTON_SELECT;
    }

    private boolean moveCardFocus(View current, int keyCode) {
        View target = findSpatialTarget(current, keyCode);
        if (target == null) {
            return false;
        }

        target.requestFocus();
        scrollIntoView(target);
        return true;
    }

    private View findSpatialTarget(View current, int keyCode) {
        Rect currentRect = new Rect();
        current.getGlobalVisibleRect(currentRect);
        int currentX = currentRect.centerX();
        int currentY = currentRect.centerY();

        View best = null;
        long bestScore = Long.MAX_VALUE;

        for (View candidate : focusableCards) {
            if (candidate == current || candidate.getVisibility() != View.VISIBLE) {
                continue;
            }

            Rect candidateRect = new Rect();
            candidate.getGlobalVisibleRect(candidateRect);
            int dx = candidateRect.centerX() - currentX;
            int dy = candidateRect.centerY() - currentY;

            if (!isInDirection(dx, dy, keyCode)) {
                continue;
            }

            long primary = keyCode == KeyEvent.KEYCODE_DPAD_LEFT || keyCode == KeyEvent.KEYCODE_DPAD_RIGHT
                    ? Math.abs(dx)
                    : Math.abs(dy);
            long secondary = keyCode == KeyEvent.KEYCODE_DPAD_LEFT || keyCode == KeyEvent.KEYCODE_DPAD_RIGHT
                    ? Math.abs(dy)
                    : Math.abs(dx);
            long score = primary * 1000L + secondary * 3L;

            if (score < bestScore) {
                bestScore = score;
                best = candidate;
            }
        }

        return best;
    }

    private boolean isInDirection(int dx, int dy, int keyCode) {
        switch (keyCode) {
            case KeyEvent.KEYCODE_DPAD_LEFT:
                return dx < -8;
            case KeyEvent.KEYCODE_DPAD_RIGHT:
                return dx > 8;
            case KeyEvent.KEYCODE_DPAD_UP:
                return dy < -8;
            case KeyEvent.KEYCODE_DPAD_DOWN:
                return dy > 8;
            default:
                return false;
        }
    }

    private void openChannel(Channel channel, List<Channel> playlist, int playlistIndex) {
        if (openingChannel) {
            return;
        }
        openingChannel = true;

        Intent intent = new Intent(this, PlayerActivity.class);
        intent.putExtra(PlayerActivity.EXTRA_CHANNEL_NAME, channel.name);
        intent.putExtra(PlayerActivity.EXTRA_CHANNEL_META, channel.language + " · " + channel.quality + " · " + channel.type);
        intent.putStringArrayListExtra(PlayerActivity.EXTRA_SOURCE_NAMES, channel.sourceNames());
        intent.putStringArrayListExtra(PlayerActivity.EXTRA_SOURCE_URLS, channel.sourceUrls());
        intent.putExtra(PlayerActivity.EXTRA_SOURCE_INDEX, 0);
        intent.putExtra(PlayerActivity.EXTRA_CHANNEL_INDEX, playlistIndex);
        intent.putExtra(PlayerActivity.EXTRA_PLAYLIST_JSON, buildPlaylistJson(playlist));
        startActivity(intent);
    }

    private String buildPlaylistJson(List<Channel> playlist) {
        JSONArray array = new JSONArray();

        try {
            for (Channel channel : playlist) {
                JSONObject item = new JSONObject();
                item.put("name", channel.name);
                item.put("meta", channel.language + " · " + channel.quality + " · " + channel.type);

                JSONArray sources = new JSONArray();
                if (channel.sources != null) {
                    for (ChannelSource source : channel.sources) {
                        JSONObject sourceItem = new JSONObject();
                        sourceItem.put("name", source.name);
                        sourceItem.put("url", source.url);
                        sources.put(sourceItem);
                    }
                }
                item.put("sources", sources);
                array.put(item);
            }
        } catch (Exception ignored) {
            return "[]";
        }

        return array.toString();
    }

    private List<Channel> mergeChannels(List<Channel> local, List<Channel> remote) {
        List<Channel> merged = new ArrayList<>();
        Set<String> seen = new HashSet<>();

        // Usamos una lógica más robusta para evitar duplicados
        for (Channel channel : local) {
            String key = generateUniqueKey(channel);
            if (seen.add(key)) {
                merged.add(channel);
            }
        }
        for (Channel channel : remote) {
            String key = generateUniqueKey(channel);
            if (seen.add(key)) {
                merged.add(channel);
            }
        }

        return merged;
    }

    private String generateUniqueKey(Channel channel) {
        String firstUrl = (channel.sources == null || channel.sources.isEmpty()) ? "" : channel.sources.get(0).url;
        return (channel.category + "|" + channel.name + "|" + firstUrl).toLowerCase(Locale.US).trim();
    }


    private void updateStatus(String text, boolean online, boolean usingCache) {
        if (statusText != null) {
            statusText.setText(text);
        }
        if (networkBadge != null) {
            networkBadge.setText(online ? (usingCache ? "CACHE" : "ONLINE") : "OFFLINE");
            networkBadge.setTextColor(online ? TvStyle.BG : Color.WHITE);
            networkBadge.setBackground(TvStyle.rounded(this, online ? TvStyle.SIGNAL : TvStyle.DANGER, Color.argb(70, 245, 241, 223), 999));
        }
    }

    private void focusFirstCard() {
        if (firstCard != null) {
            firstCard.requestFocus();
        }
    }

    private String flagText(String country, String category) {
        if ("streamx-event".equalsIgnoreCase(category)) {
            return "CUP";
        }
        if (country == null || country.isEmpty() || "world".equalsIgnoreCase(country)) {
            return "GL";
        }

        String code = country.toUpperCase(Locale.US);
        if (code.length() != 2) {
            return code.length() > 3 ? code.substring(0, 3) : code;
        }

        int first = Character.codePointAt(code, 0) - 'A' + 0x1F1E6;
        int second = Character.codePointAt(code, 1) - 'A' + 0x1F1E6;
        return new String(Character.toChars(first)) + new String(Character.toChars(second));
    }

    private String cardBadge(Channel channel) {
        if (channel.badgeText != null && !channel.badgeText.isEmpty()) {
            return channel.badgeText;
        }
        return flagText(channel.country, channel.category);
    }

    private void scrollIntoView(View view) {
        if (scrollView == null) {
            return;
        }
        scrollView.post(() -> {
            Rect rect = new Rect();
            view.getDrawingRect(rect);
            scrollView.offsetDescendantRectToMyCoords(view, rect);

            int margin = dp(44);
            int visibleTop = scrollView.getScrollY() + margin;
            int visibleBottom = scrollView.getScrollY() + scrollView.getHeight() - margin;

            if (rect.top < visibleTop) {
                scrollView.scrollTo(0, Math.max(0, rect.top - margin));
            } else if (rect.bottom > visibleBottom) {
                scrollView.scrollTo(0, Math.max(0, rect.bottom - scrollView.getHeight() + margin));
            }
        });
    }

    private TextView label(String text, int sp, int color, boolean bold) {
        TextView view = new TextView(this);
        view.setText(text);
        view.setTextSize(sp);
        view.setTextColor(color);
        view.setIncludeFontPadding(true);
        if (bold) {
            view.setTypeface(Typeface.DEFAULT_BOLD);
        }
        return view;
    }

    private GradientDrawable cardBackground(boolean focused) {
        if (focused) {
            return gradientPanel(TvStyle.SIGNAL, Color.rgb(207, 229, 73), TvStyle.SIGNAL, 24);
        }
        return gradientPanel(Color.rgb(22, 31, 24), Color.rgb(11, 16, 12), Color.rgb(49, 63, 51), 24);
    }

    private GradientDrawable gradientPanel(int start, int end, int stroke, int radiusDp) {
        GradientDrawable drawable = new GradientDrawable(GradientDrawable.Orientation.TL_BR, new int[] { start, end });
        drawable.setCornerRadius(dp(radiusDp));
        drawable.setStroke(Math.max(1, dp(1)), stroke);
        return drawable;
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        int keyCode = event.getKeyCode();

        if (isSelectKey(keyCode) && focusableCards.contains(getCurrentFocus())) {
            if (event.getAction() == KeyEvent.ACTION_DOWN && event.getRepeatCount() == 0) {
                getCurrentFocus().performClick();
            }
            return true;
        }

        if (event.getAction() == KeyEvent.ACTION_DOWN && event.getKeyCode() == KeyEvent.KEYCODE_MENU) {
            if (ConnectivityHelper.hasInternet(this)) {
                refreshRemoteData();
            } else {
                updateStatus("Sin internet. La app sigue con locales/cache; conecta la red y pulsa Menu para actualizar.", false, true);
            }
            return true;
        }

        if (event.getAction() == KeyEvent.ACTION_DOWN && event.getKeyCode() == KeyEvent.KEYCODE_BACK) {
            moveTaskToBack(true);
            return true;
        }
        return super.dispatchKeyEvent(event);
    }

    @Override
    protected void onResume() {
        super.onResume();
        openingChannel = false;
        enterImmersiveMode();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            enterImmersiveMode();
        }
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
        destroyed = true;
        mainHandler.removeCallbacksAndMessages(null);
        super.onDestroy();
    }
}
