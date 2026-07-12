package com.leo10m2010.canalesmundialtv;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
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
import java.util.WeakHashMap;

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
    private final Map<Channel, TextView> countdownLabels = new WeakHashMap<>();
    private final Set<String> favoriteKeys = new HashSet<>();
    private SharedPreferences preferences;
    private final Runnable countdownRunnable = new Runnable() {
        @Override public void run() {
            updateCountdownLabels();
            mainHandler.postDelayed(this, 30000);
        }
    };
    private boolean destroyed;
    private boolean openingChannel;

    // Agenda view tabs mirror the web navigation.
    private String selectedView = "all";
    private String lastStatus = "";
    private boolean lastOnline;
    private boolean lastUsingCache;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        super.onCreate(savedInstanceState);

        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        enterImmersiveMode();

        repository = new ChannelRepository(this);
        preferences = getSharedPreferences("mundial_tv", MODE_PRIVATE);
        favoriteKeys.addAll(preferences.getStringSet("favorite_channels", java.util.Collections.emptySet()));
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
        overlay.setBackgroundColor(Color.argb(215, 8, 8, 10));
        root.addView(overlay, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        // 3. Contenedor de Textos
        LinearLayout centerPanel = new LinearLayout(this);
        centerPanel.setOrientation(LinearLayout.VERTICAL);
        centerPanel.setGravity(Gravity.CENTER);

        TextView title = label("Mundial+", 58, TvStyle.TEXT, true);
        title.setGravity(Gravity.CENTER);
        title.setAlpha(0f);
        title.animate().alpha(1f).setDuration(1200).start();

        TextView subTitle = label("Cargando…", 16, TvStyle.MUTED, false);
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
        countdownLabels.clear();
        lastStatus = status;
        lastOnline = online;
        lastUsingCache = usingCache;

        FrameLayout root = new FrameLayout(this);
        root.setBackground(TvStyle.appBackground());
        root.setClipChildren(false);
        root.setClipToPadding(false);

        scrollView = new ScrollView(this);
        scrollView.setFillViewport(false);
        scrollView.setClipToPadding(false);
        scrollView.setClipChildren(false);
        scrollView.setDescendantFocusability(ViewGroup.FOCUS_AFTER_DESCENDANTS);
        scrollView.setPadding(0, 0, 0, dp(42));

        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setClipChildren(false);
        content.setClipToPadding(false);
        content.setPadding(0, 0, 0, dp(34));

        content.addView(createHero(channels.size(), status, online, usingCache));

        LinearLayout shell = new LinearLayout(this);
        shell.setOrientation(LinearLayout.VERTICAL);
        shell.setClipChildren(false);
        shell.setClipToPadding(false);
        shell.setPadding(0, dp(28), 0, 0);
        LinearLayout.LayoutParams shellParams = new LinearLayout.LayoutParams(
                Math.min(dp(1180), getResources().getDisplayMetrics().widthPixels - dp(32)),
                ViewGroup.LayoutParams.WRAP_CONTENT);
        shellParams.gravity = Gravity.CENTER_HORIZONTAL;
        shell.setLayoutParams(shellParams);
        shell.addView(createViewHeading());

        List<Channel> visible = filterByView(channels);
        List<Channel> agenda = new ArrayList<>();
        List<Channel> library = new ArrayList<>();
        for (Channel channel : visible) {
            if ("streamx-event".equalsIgnoreCase(channel.category)) agenda.add(channel);
            else library.add(channel);
        }
        if (!agenda.isEmpty()) {
            shell.addView(createSection("Agenda de eventos", agenda, true));
        } else if (!"all".equals(selectedView) || library.isEmpty()) {
            shell.addView(createEmptyState());
        }
        if ("all".equals(selectedView) && !library.isEmpty()) {
            shell.addView(createLibraryHeading(library.size()));
            for (Map.Entry<String, List<Channel>> section : groupChannels(library).entrySet()) {
                shell.addView(createSection(section.getKey(), section.getValue(), false));
            }
        }
        content.addView(shell);

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

    private View createTabBar() {
        LinearLayout bar = new LinearLayout(this);
        bar.setOrientation(LinearLayout.HORIZONTAL);
        bar.setGravity(Gravity.CENTER);
        bar.setClipChildren(false);
        bar.setClipToPadding(false);
        bar.setPadding(dp(6), dp(6), dp(6), dp(6));
        bar.setBackground(TvStyle.glassPill(this));

        String[][] tabs = {
                { "today", "Hoy" },
                { "results", "Resultados" },
                { "upcoming", "Próximos" },
                { "all", "Todos" },
                { "favorites", "Favoritos" }
        };
        for (String[] tab : tabs) {
            bar.addView(createTab(tab[0], tab[1]));
        }
        return bar;
    }

    private View createTab(String key, String labelText) {
        boolean active = key.equals(selectedView);
        TextView tab = label(labelText, 14, active ? TvStyle.BG : TvStyle.MUTED, true);
        tab.setGravity(Gravity.CENTER);
        tab.setFocusable(true);
        tab.setClickable(true);
        tab.setPadding(dp(16), dp(9), dp(16), dp(9));
        tab.setBackground(tabBackground(active, false));

        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        params.setMargins(dp(2), 0, dp(2), 0);
        tab.setLayoutParams(params);

        tab.setOnFocusChangeListener((view, hasFocus) -> {
            tab.setBackground(tabBackground(key.equals(selectedView), hasFocus));
            TvStyle.focusScale(tab, hasFocus);
        });
        tab.setOnClickListener(view -> {
            if (!key.equals(selectedView)) {
                selectedView = key;
                setContentView(buildContent(currentChannels, lastStatus, lastOnline, lastUsingCache));
                focusFirstCard();
            }
        });
        tab.setOnKeyListener((view, keyCode, event) -> {
            if (event.getAction() == KeyEvent.ACTION_DOWN && isSelectKey(keyCode)) {
                view.performClick();
                return true;
            }
            if (event.getAction() == KeyEvent.ACTION_UP && isSelectKey(keyCode)) {
                return true;
            }
            return false;
        });

        focusableCards.add(tab);
        if (active && firstCard == null) {
            firstCard = tab;
        }
        return tab;
    }

    private GradientDrawable tabBackground(boolean active, boolean focused) {
        if (active) {
            return TvStyle.rounded(this, TvStyle.SIGNAL, TvStyle.SIGNAL, 999);
        }
        if (focused) {
            return TvStyle.rounded(this, Color.argb(32, 255, 255, 255), Color.WHITE, 999);
        }
        return TvStyle.rounded(this, Color.argb(18, 255, 255, 255), TvStyle.LINE, 999);
    }

    private List<Channel> filterByView(List<Channel> all) {
        if ("all".equals(selectedView)) {
            return all;
        }
        List<Channel> out = new ArrayList<>();
        for (Channel channel : all) {
            boolean isEvent = "streamx-event".equalsIgnoreCase(channel.category)
                    && channel.startEpochMs > 0;
            if ("today".equals(selectedView) && isEvent
                    && agendaDateKey(System.currentTimeMillis()).equals(channel.dateKey)) {
                out.add(channel);
            } else if ("favorites".equals(selectedView) && favoriteKeys.contains(favoriteKey(channel))) {
                out.add(channel);
            } else if ("results".equals(selectedView) && isEvent && "finished".equals(channel.statusKey)) {
                out.add(channel);
            } else if ("upcoming".equals(selectedView) && isEvent && "upcoming".equals(channel.statusKey)) {
                out.add(channel);
            }
        }
        return out;
    }

    private String agendaDateKey(long epochMs) {
        java.text.SimpleDateFormat format = new java.text.SimpleDateFormat("yyyy-MM-dd", Locale.US);
        format.setTimeZone(java.util.TimeZone.getTimeZone("America/Lima"));
        return format.format(new java.util.Date(epochMs));
    }

    private View createHero(int channelCount, String status, boolean online, boolean usingCache) {
        // Usamos un RelativeLayout para tener control absoluto del orden de las capas (Z-Order)
        android.widget.RelativeLayout heroRoot = new android.widget.RelativeLayout(this);
        int heroHeight = Math.min(dp(920), Math.round(getResources().getDisplayMetrics().heightPixels * 0.88f));

        // 1. IMAGEN DE FONDO (Al fondo del todo)
        android.widget.ImageView bg = new android.widget.ImageView(this);
        bg.setId(View.generateViewId());
        int resId = getResources().getIdentifier("bg", "drawable", getPackageName());
        if (resId != 0) bg.setImageResource(resId);
        bg.setScaleType(android.widget.ImageView.ScaleType.CENTER_CROP);
        bg.setAlpha(0.45f);

        // 2. PROTECTOR (Degradado que oscurece abajo, donde va el texto — estilo billboard)
        View protector = new View(this);
        GradientDrawable gd = new GradientDrawable(GradientDrawable.Orientation.BOTTOM_TOP, new int[] {
                Color.argb(252, 6, 6, 8),    // Oscuro sólido abajo
                Color.argb(150, 6, 6, 8),    // Semi-oscuro
                Color.argb(0, 0, 0, 0)       // Transparente arriba
        });
        protector.setBackground(gd);

        // 3. CONTENIDO DE TEXTO (Lo último que añadimos = Lo que queda arriba)
        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setGravity(Gravity.BOTTOM);
        content.setPadding(dp(56), 0, dp(56), dp(54));

        Channel featured = findFeaturedMatch();

        // Real match photo (TheSportsDB strThumb) as billboard backdrop when available.
        if (featured != null && featured.thumbUrl != null && !featured.thumbUrl.trim().isEmpty()) {
            RemoteImage.load(bg, featured.thumbUrl);
            bg.setAlpha(0.6f);
        }

        if (featured != null) {
            // Billboard estilo Netflix: partido destacado + botón Ver.
            if (featured.leagueBadgeUrl != null && !featured.leagueBadgeUrl.trim().isEmpty()) {
                android.widget.ImageView leagueBadge = new android.widget.ImageView(this);
                leagueBadge.setScaleType(android.widget.ImageView.ScaleType.FIT_START);
                RemoteImage.load(leagueBadge, featured.leagueBadgeUrl);
                LinearLayout.LayoutParams badgeParams = new LinearLayout.LayoutParams(dp(90), dp(52));
                badgeParams.setMargins(0, dp(10), 0, 0);
                content.addView(leagueBadge, badgeParams);
            }
            String[] teams = splitTeams(featured.name);
            if (!teams[1].isEmpty()) {
                LinearLayout badgesRow = new LinearLayout(this);
                badgesRow.setOrientation(LinearLayout.HORIZONTAL);
                badgesRow.setGravity(Gravity.CENTER_VERTICAL);
                badgesRow.setPadding(0, dp(12), 0, 0);
                LinearLayout.LayoutParams homeLp = new LinearLayout.LayoutParams(dp(58), dp(58));
                homeLp.setMargins(0, 0, dp(12), 0);
                badgesRow.addView(teamBadge(teams[0], featured.homeFlagUrl), homeLp);
                badgesRow.addView(teamBadge(teams[1], featured.awayFlagUrl), new LinearLayout.LayoutParams(dp(58), dp(58)));
                content.addView(badgesRow);
            }
            String teamsText = teams[1].isEmpty() ? teams[0] : teams[0] + "  vs  " + teams[1];
            TextView teamsLabel = label(teamsText, 34, Color.WHITE, true);
            teamsLabel.setShadowLayer(10, 0, 0, Color.BLACK);
            teamsLabel.setMaxLines(2);
            teamsLabel.setPadding(0, dp(10), 0, 0);
            content.addView(teamsLabel);

            LinearLayout metaRow = new LinearLayout(this);
            metaRow.setOrientation(LinearLayout.HORIZONTAL);
            metaRow.setGravity(Gravity.CENTER_VERTICAL);
            metaRow.setPadding(0, dp(12), 0, 0);
            if (featured.isLive) {
                TextView livePill = label("EN VIVO", 12, Color.WHITE, true);
                livePill.setPadding(dp(11), dp(4), dp(11), dp(4));
                livePill.setBackground(TvStyle.rounded(this, Color.argb(42, 255, 90, 77), TvStyle.DANGER, 999));
                metaRow.addView(livePill);
                if (featured.liveScore != null && !featured.liveScore.trim().isEmpty()) {
                    TextView score = label("   " + featured.liveScore, 22, Color.WHITE, true);
                    metaRow.addView(score);
                }
            } else {
                TextView slot = label(featured.type, 17, TvStyle.SIGNAL, true);
                metaRow.addView(slot);
            }
            content.addView(metaRow);

            final Channel featuredMatch = featured;
            TextView watch = label("▶  Ver", 17, TvStyle.BG, true);
            watch.setGravity(Gravity.CENTER);
            watch.setFocusable(true);
            watch.setClickable(true);
            watch.setPadding(dp(24), dp(12), dp(26), dp(12));
            watch.setBackground(TvStyle.rounded(this, TvStyle.SIGNAL, TvStyle.SIGNAL, 12));
            LinearLayout.LayoutParams watchParams = new LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            watchParams.setMargins(0, dp(20), 0, 0);
            watch.setLayoutParams(watchParams);
            watch.setOnClickListener(view -> openChannel(featuredMatch, java.util.Collections.singletonList(featuredMatch), 0));
            watch.setOnFocusChangeListener((view, hasFocus) -> {
                watch.setBackground(TvStyle.rounded(this, Color.WHITE, Color.WHITE, 12));
                TvStyle.focusScale(watch, hasFocus);
            });
            watch.setOnKeyListener((view, keyCode, event) -> {
                if (event.getAction() == KeyEvent.ACTION_DOWN && isSelectKey(keyCode)) {
                    view.performClick();
                    return true;
                }
                if (event.getAction() == KeyEvent.ACTION_UP && isSelectKey(keyCode)) {
                    return true;
                }
                return false;
            });
            content.addView(watch);
            if (firstCard == null) {
                firstCard = watch;
            }
            focusableCards.add(watch);
        } else {
            String smartStatus = status.toLowerCase().contains("disponible")
                    || status.toLowerCase().contains("agenda lista")
                    || status.toLowerCase().contains("partidos")
                    ? "Canales 24/7 activos · Agenda Mundial disponible"
                    : "Canales 24/7 activos · Sin eventos hoy";
            content.setGravity(Gravity.CENTER);
            TextView brand = label("Mundial+", 58, Color.WHITE, true);
            brand.setGravity(Gravity.CENTER);
            brand.setShadowLayer(12, 0, 0, Color.BLACK);
            content.addView(brand);
            TextView sub = label(smartStatus, 19, TvStyle.MUTED, false);
            sub.setGravity(Gravity.CENTER);
            sub.setPadding(0, dp(8), 0, 0);
            content.addView(sub);
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

        TextView navBrand = label("Mundial+", 22, Color.WHITE, true);
        navBrand.setPadding(dp(48), dp(18), 0, 0);
        android.widget.RelativeLayout.LayoutParams brandParams = new android.widget.RelativeLayout.LayoutParams(
                dp(240), dp(70));
        brandParams.addRule(android.widget.RelativeLayout.ALIGN_PARENT_START);
        brandParams.addRule(android.widget.RelativeLayout.ALIGN_PARENT_TOP);
        heroRoot.addView(navBrand, brandParams);

        View tabs = createTabBar();
        android.widget.RelativeLayout.LayoutParams tabsParams = new android.widget.RelativeLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        tabsParams.addRule(android.widget.RelativeLayout.CENTER_HORIZONTAL);
        tabsParams.setMargins(0, dp(18), 0, 0);
        heroRoot.addView(tabs, tabsParams);

        heroRoot.setBackgroundColor(Color.BLACK);

        LinearLayout.LayoutParams rootParams = new LinearLayout.LayoutParams(-1, heroHeight);
        rootParams.setMargins(0, 0, 0, 0);
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

    private Channel findFeaturedMatch() {
        if (currentChannels == null) {
            return null;
        }
        // Live World Cup wins, then any live event. Upcoming events only enter the
        // billboard during the two-hour window before kickoff.
        for (Channel c : currentChannels) {
            if (c.isLive && c.isWorldCup && "streamx-event".equalsIgnoreCase(c.category)) {
                return c;
            }
        }
        for (Channel c : currentChannels) {
            if (c.isLive && "streamx-event".equalsIgnoreCase(c.category) && hasTwoTeams(c)) {
                return c;
            }
        }
        long now = System.currentTimeMillis();
        for (Channel c : currentChannels) {
            long untilStart = c.startEpochMs - now;
            if ("streamx-event".equalsIgnoreCase(c.category) && hasTwoTeams(c)
                    && untilStart >= 0 && untilStart <= 2 * 60 * 60 * 1000L) {
                return c;
            }
        }
        return null;
    }

    private boolean hasTwoTeams(Channel c) {
        if (c.homeTeam != null && !c.homeTeam.trim().isEmpty()
                && c.awayTeam != null && !c.awayTeam.trim().isEmpty()) {
            return true;
        }
        return c.name != null && c.name.toLowerCase(Locale.US).contains(" vs ");
    }

    private TextView createBadge(String text, int fill, int textColor) {
        TextView badge = label(text, 13, textColor, true);
        badge.setGravity(Gravity.CENTER);
        badge.setPadding(dp(14), 0, dp(14), 0);
        badge.setBackground(TvStyle.rounded(this, fill, Color.argb(70, 255, 255, 255), 999));
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(38));
        params.setMargins(0, 0, 0, dp(9));
        badge.setLayoutParams(params);
        return badge;
    }

    private View createViewHeading() {
        LinearLayout heading = new LinearLayout(this);
        heading.setOrientation(LinearLayout.VERTICAL);
        heading.setPadding(0, 0, 0, dp(6));

        String title;
        String subtitle;
        switch (selectedView) {
            case "today":
                title = "Hoy";
                subtitle = "Partidos y eventos de hoy";
                break;
            case "results":
                title = "Resultados";
                subtitle = "Marcadores y eventos finalizados";
                break;
            case "upcoming":
                title = "Próximos";
                subtitle = "Lo que viene en la agenda";
                break;
            case "favorites":
                title = "Favoritos";
                subtitle = "Tus eventos y canales guardados";
                break;
            default:
                title = "World Cup";
                subtitle = "Partidos y resultados";
                break;
        }
        TextView titleView = label(title, 38, TvStyle.TEXT, true);
        TextView subtitleView = label(subtitle, 16, TvStyle.MUTED, false);
        subtitleView.setPadding(0, dp(4), 0, 0);
        heading.addView(titleView);
        heading.addView(subtitleView);
        return heading;
    }

    private View createLibraryHeading(int count) {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.BOTTOM);
        row.setPadding(0, dp(16), 0, dp(4));

        LinearLayout copy = new LinearLayout(this);
        copy.setOrientation(LinearLayout.VERTICAL);
        TextView eyebrow = label("CANALES RÁPIDOS", 12, TvStyle.SIGNAL, true);
        TextView title = label("Biblioteca en vivo", 36, TvStyle.TEXT, true);
        title.setPadding(0, dp(4), 0, 0);
        copy.addView(eyebrow);
        copy.addView(title);
        row.addView(copy, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        row.addView(createBadge(count + " fuentes", TvStyle.SIGNAL, TvStyle.BG),
                new LinearLayout.LayoutParams(dp(112), dp(38)));
        return row;
    }

    private View createEmptyState() {
        LinearLayout state = new LinearLayout(this);
        state.setOrientation(LinearLayout.VERTICAL);
        state.setPadding(dp(28), dp(26), dp(28), dp(26));
        state.setBackground(gradientPanel(Color.rgb(26, 24, 26), Color.rgb(40, 28, 30), Color.argb(110, 255, 90, 77), 26));

        TextView title = label("No hay contenido en esta vista", 27, TvStyle.TEXT, true);
        TextView body = label("Prueba otra pestaña o pulsa Menu para actualizar la agenda.", 18, TvStyle.MUTED, false);
        body.setPadding(0, dp(8), 0, 0);

        state.addView(title);
        state.addView(body);
        return state;
    }

    private Map<String, List<Channel>> groupChannels(List<Channel> channels) {
        Map<String, List<Channel>> groups = new LinkedHashMap<>();
        groups.put("Agenda de hoy", new ArrayList<>());
        groups.put("Canales 24/7 Stream-XHD", new ArrayList<>());
        groups.put("Mundial 2026 / fuentes fijas", new ArrayList<>());
        groups.put("English", new ArrayList<>());
        groups.put("Español", new ArrayList<>());
        groups.put("Otros", new ArrayList<>());

        for (Channel channel : channels) {
            String key;
            if ("streamx-event".equalsIgnoreCase(channel.category)) {
                key = "Agenda de hoy";
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
        boolean agenda = !channels.isEmpty() && "streamx-event".equalsIgnoreCase(channels.get(0).category);
        return createSection(title, channels, agenda);
    }

    private View createSection(String title, List<Channel> channels, boolean isAgenda) {
        LinearLayout section = new LinearLayout(this);
        section.setOrientation(LinearLayout.VERTICAL);
        section.setClipChildren(false);
        section.setClipToPadding(false);
        section.setPadding(0, dp(18), 0, dp(26));

        LinearLayout headingRow = new LinearLayout(this);
        headingRow.setOrientation(LinearLayout.HORIZONTAL);
        headingRow.setGravity(Gravity.CENTER_VERTICAL);
        headingRow.setPadding(0, 0, 0, dp(12));

        TextView heading = label(title, 25, TvStyle.TEXT, true);
        TextView count = createBadge(channels.size() + "", Color.rgb(40, 40, 46), TvStyle.SIGNAL);
        LinearLayout.LayoutParams countParams = new LinearLayout.LayoutParams(dp(58), dp(34));
        countParams.setMargins(dp(14), 0, 0, 0);
        count.setLayoutParams(countParams);

        headingRow.addView(heading);
        headingRow.addView(count);
        section.addView(headingRow);

        GridLayout grid = new GridLayout(this);
        grid.setColumnCount(isAgenda ? Math.min(2, getGridColumns()) : getGridColumns());
        grid.setUseDefaultMargins(false);
        grid.setClipChildren(false);
        grid.setClipToPadding(false);

        for (int index = 0; index < channels.size(); index++) {
            View card = isAgenda
                    ? createMatchCard(channels.get(index), channels, index)
                    : createChannelCard(channels.get(index), channels, index);
            GridLayout.LayoutParams params = new GridLayout.LayoutParams();
            params.width = isAgenda ? dp(564) : dp(276);
            params.height = isAgenda ? dp(214) : dp(150);
            params.setMargins(0, 0, dp(18), dp(18));
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

    private boolean isRasterLogo(String url) {
        if (url == null) {
            return false;
        }
        String u = url.trim().toLowerCase(Locale.US);
        return !u.isEmpty() && !u.endsWith(".svg");
    }

    private View teamBadge(String teamName, String url) {
        if (isRasterLogo(url)) {
            android.widget.ImageView img = new android.widget.ImageView(this);
            img.setScaleType(android.widget.ImageView.ScaleType.FIT_CENTER);
            img.setBackground(TvStyle.rounded(this, Color.WHITE, TvStyle.LINE, 999));
            img.setPadding(dp(5), dp(5), dp(5), dp(5));
            img.setClipToOutline(true);
            img.setOutlineProvider(new android.view.ViewOutlineProvider() {
                @Override public void getOutline(View v, android.graphics.Outline o) {
                    o.setOval(0, 0, v.getWidth(), v.getHeight());
                }
            });
            RemoteImage.load(img, url);
            return img;
        }
        TextView initials = label(teamInitials(teamName), 15, TvStyle.TEXT, true);
        initials.setGravity(Gravity.CENTER);
        initials.setBackground(TvStyle.rounded(this, Color.argb(30, 255, 255, 255), TvStyle.LINE, 999));
        return initials;
    }

    private String teamInitials(String name) {
        if (name == null || name.trim().isEmpty()) {
            return "?";
        }
        String[] words = name.trim().split("\\s+");
        if (words.length >= 2 && !words[0].isEmpty() && !words[1].isEmpty()) {
            return ("" + words[0].charAt(0) + words[1].charAt(0)).toUpperCase(Locale.US);
        }
        String w = words[0];
        return w.substring(0, Math.min(3, w.length())).toUpperCase(Locale.US);
    }

    private String[] splitTeams(String title) {
        if (title == null || title.trim().isEmpty()) {
            return new String[] { "Local", "Visitante" };
        }
        String[] parts = title.split("(?i)\\s+vs\\.?\\s+", 2);
        if (parts.length == 2) {
            return new String[] { parts[0].trim(), parts[1].trim() };
        }
        return new String[] { title.trim(), "" };
    }

    private View createMatchCard(Channel channel, List<Channel> playlist, int playlistIndex) {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(dp(20), dp(16), dp(20), dp(16));
        card.setFocusable(true);
        card.setClickable(true);
        card.setTag(channel);
        card.setBackground(cardBackground(false));
        card.setContentDescription(channel.name + ", " + channel.type);

        // Top row: kickoff time + live pill.
        LinearLayout topRow = new LinearLayout(this);
        topRow.setOrientation(LinearLayout.HORIZONTAL);
        topRow.setGravity(Gravity.CENTER_VERTICAL);

        String league = channel.leagueName == null ? "" : channel.leagueName.trim();
        String slotText = league.isEmpty() ? channel.type : league + " · " + channel.type;
        TextView time = label(slotText, 13, TvStyle.MUTED, true);
        time.setSingleLine(true);
        topRow.addView(time, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));

        if (channel.isLive) {
            TextView live = label("EN VIVO", 11, Color.WHITE, true);
            live.setGravity(Gravity.CENTER);
            live.setPadding(dp(10), dp(4), dp(10), dp(4));
            live.setBackground(TvStyle.rounded(this, Color.argb(42, 255, 90, 77), TvStyle.DANGER, 999));
            topRow.addView(live);
        }
        card.addView(topRow);

        // Teams row: [badge] home  ·  VS/score  ·  away [badge]
        String[] teams = splitTeams(channel.name);
        LinearLayout teamsRow = new LinearLayout(this);
        teamsRow.setOrientation(LinearLayout.HORIZONTAL);
        teamsRow.setGravity(Gravity.CENTER_VERTICAL);
        teamsRow.setPadding(0, dp(16), 0, dp(14));

        if (teams[1].isEmpty()) {
            TextView single = label(teams[0], 22, TvStyle.TEXT, true);
            single.setMaxLines(2);
            teamsRow.addView(single, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        } else {
            LinearLayout homeBlock = new LinearLayout(this);
            homeBlock.setOrientation(LinearLayout.HORIZONTAL);
            homeBlock.setGravity(Gravity.CENTER_VERTICAL | Gravity.END);
            LinearLayout.LayoutParams homeBadgeLp = new LinearLayout.LayoutParams(dp(46), dp(46));
            homeBadgeLp.setMargins(0, 0, dp(10), 0);
            homeBlock.addView(teamBadge(teams[0], channel.homeFlagUrl), homeBadgeLp);
            TextView home = label(teams[0], 20, TvStyle.TEXT, true);
            home.setMaxLines(2);
            homeBlock.addView(home);
            teamsRow.addView(homeBlock, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));

            boolean hasScore = channel.isLive && channel.liveScore != null && !channel.liveScore.trim().isEmpty();
            TextView center = label(hasScore ? channel.liveScore : "VS", hasScore ? 22 : 15,
                    hasScore ? TvStyle.TEXT : TvStyle.MUTED, true);
            center.setGravity(Gravity.CENTER);
            center.setPadding(dp(12), 0, dp(12), 0);
            teamsRow.addView(center);

            LinearLayout awayBlock = new LinearLayout(this);
            awayBlock.setOrientation(LinearLayout.HORIZONTAL);
            awayBlock.setGravity(Gravity.CENTER_VERTICAL | Gravity.START);
            TextView away = label(teams[1], 20, TvStyle.TEXT, true);
            away.setMaxLines(2);
            awayBlock.addView(away);
            LinearLayout.LayoutParams awayBadgeLp = new LinearLayout.LayoutParams(dp(46), dp(46));
            awayBadgeLp.setMargins(dp(10), 0, 0, 0);
            awayBlock.addView(teamBadge(teams[1], channel.awayFlagUrl), awayBadgeLp);
            teamsRow.addView(awayBlock, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        }
        card.addView(teamsRow);

        TextView source = label(eventTimingText(channel) + " · " + channel.quality, 13, TvStyle.MUTED, false);
        source.setPadding(0, dp(2), 0, 0);
        card.addView(source);
        countdownLabels.put(channel, source);

        card.setOnFocusChangeListener((view, hasFocus) -> {
            card.setBackground(cardBackground(hasFocus));
            TvStyle.focusScale(card, hasFocus);
            if (hasFocus) {
                scrollIntoView(card);
            }
        });
        card.setOnClickListener(view -> openChannel(channel, playlist, playlistIndex));
        card.setOnLongClickListener(view -> {
            toggleFavorite(channel);
            return true;
        });
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

    private View createChannelCard(Channel channel, List<Channel> playlist, int playlistIndex) {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setGravity(Gravity.BOTTOM);
        card.setPadding(dp(18), dp(14), dp(18), dp(16));
        card.setFocusable(true);
        card.setClickable(true);
        card.setTag(channel);
        card.setBackground(cardBackground(false));
        card.setContentDescription(channel.name + ", " + channel.quality + ", " + channel.sourceCountText());

        LinearLayout topRow = new LinearLayout(this);
        topRow.setOrientation(LinearLayout.HORIZONTAL);
        topRow.setGravity(Gravity.CENTER_VERTICAL);

        TextView flag = label(cardBadge(channel), 15, TvStyle.TEXT, true);
        flag.setGravity(Gravity.CENTER);
        flag.setBackground(TvStyle.rounded(this, Color.argb(24, 255, 255, 255), TvStyle.LINE, 12));

        LinearLayout.LayoutParams flagParams = new LinearLayout.LayoutParams(dp(52), dp(34));
        flagParams.setMargins(0, 0, dp(10), 0);
        topRow.addView(flag, flagParams);

        TextView type = label(channel.type + " / " + channel.quality, 12, TvStyle.MUTED, true);
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
            card.setBackground(cardBackground(hasFocus));
            TvStyle.focusScale(card, hasFocus);
            if (hasFocus) {
                scrollIntoView(card);
            }
        });

        card.setOnClickListener(view -> openChannel(channel, playlist, playlistIndex));
        card.setOnLongClickListener(view -> {
            toggleFavorite(channel);
            return true;
        });
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

    private String favoriteKey(Channel channel) {
        return generateUniqueKey(channel);
    }

    private void toggleFavorite(Channel channel) {
        String key = favoriteKey(channel);
        boolean added = favoriteKeys.add(key);
        if (!added) {
            favoriteKeys.remove(key);
        }
        preferences.edit().putStringSet("favorite_channels", new HashSet<>(favoriteKeys)).apply();
        updateStatus(added ? "Añadido a Favoritos." : "Eliminado de Favoritos.", lastOnline, lastUsingCache);
    }

    private String eventTimingText(Channel channel) {
        if (channel.isLive) return "EN VIVO";
        if ("finished".equals(channel.statusKey)) return "Finalizado";
        if (channel.startEpochMs <= 0) return channel.type;
        long remaining = channel.startEpochMs - System.currentTimeMillis();
        if (remaining <= 0) return "Por comenzar";
        long minutes = remaining / 60000L;
        if (minutes < 60) return "Comienza en " + Math.max(1, minutes) + " min";
        long hours = minutes / 60;
        if (hours < 24) return "Comienza en " + hours + " h " + (minutes % 60) + " min";
        return channel.type;
    }

    private void updateCountdownLabels() {
        for (Map.Entry<Channel, TextView> entry : countdownLabels.entrySet()) {
            Channel channel = entry.getKey();
            TextView label = entry.getValue();
            if (channel != null && label != null) {
                label.setText(eventTimingText(channel) + " · " + channel.quality);
            }
        }
    }


    private void updateStatus(String text, boolean online, boolean usingCache) {
        if (statusText != null) {
            statusText.setText(text);
        }
        if (networkBadge != null) {
            networkBadge.setText(online ? (usingCache ? "CACHE" : "ONLINE") : "OFFLINE");
            networkBadge.setTextColor(online ? TvStyle.BG : Color.WHITE);
            networkBadge.setBackground(TvStyle.rounded(this, online ? TvStyle.SIGNAL : TvStyle.DANGER, Color.argb(70, 255, 255, 255), 999));
        }
    }

    private void focusFirstCard() {
        if (firstCard != null) {
            firstCard.requestFocus();
        }
    }

    private String flagText(String country, String category) {
        if ("streamx-event".equalsIgnoreCase(category)) {
            return "";
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
            // Apple-TV focus: lighter dark card + bright white ring (no full-white invert).
            return gradientPanel(Color.rgb(42, 44, 50), Color.rgb(32, 34, 39), Color.WHITE, 24);
        }
        return gradientPanel(Color.rgb(24, 24, 28), Color.rgb(16, 16, 19), Color.argb(38, 255, 255, 255), 24);
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

        if (event.getAction() == KeyEvent.ACTION_DOWN
                && (keyCode == KeyEvent.KEYCODE_F || keyCode == KeyEvent.KEYCODE_BUTTON_Y)
                && getCurrentFocus() != null && getCurrentFocus().getTag() instanceof Channel) {
            toggleFavorite((Channel) getCurrentFocus().getTag());
            return true;
        }

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
        mainHandler.removeCallbacks(countdownRunnable);
        mainHandler.post(countdownRunnable);
    }

    @Override
    protected void onPause() {
        mainHandler.removeCallbacks(countdownRunnable);
        super.onPause();
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
