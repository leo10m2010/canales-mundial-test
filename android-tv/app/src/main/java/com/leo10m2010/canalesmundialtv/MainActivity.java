package com.leo10m2010.canalesmundialtv;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.graphics.Color;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

import java.io.InputStream;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Map;

public class MainActivity extends Activity {
    private static final String APP_URL = "https://mundialplus.netlify.app/?mode=tv";
    private static final String APP_HOST = "mundialplus.netlify.app";
    private static final String BILLBOARD_FALLBACK_PATH = "/__android/billboard.webp";
    private static final int MAX_PLAYER_HTML_BYTES = 2 * 1024 * 1024;
    private static final long LOAD_TIMEOUT_MS = 20000;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private FrameLayout root;
    private WebView webView;
    private View loadingView;
    private View errorView;
    private ProgressBar loadingProgress;
    private TextView loadingStatus;
    private TextView errorDetail;
    private Button retryButton;
    private View customView;
    private WebChromeClient.CustomViewCallback customViewCallback;
    private boolean toolbarNavigationActive;
    private boolean mainFrameFailed;
    private boolean destroyed;
    private String webUserAgent;
    private final Runnable loadTimeout = () -> {
        if (!destroyed && loadingView != null && loadingView.getVisibility() == View.VISIBLE) {
            mainFrameFailed = true;
            showError(getString(R.string.connection_timeout_message));
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        super.onCreate(savedInstanceState);
        enterImmersiveMode();
        buildApp();

        if (savedInstanceState == null || webView.restoreState(savedInstanceState) == null) {
            webView.loadUrl(APP_URL);
        }
    }

    private void buildApp() {
        root = new FrameLayout(this);
        root.setBackgroundColor(Color.BLACK);

        webView = new WebView(this);
        webView.setBackgroundColor(Color.BLACK);
        webView.setVisibility(View.INVISIBLE);
        webView.setFocusable(true);
        webView.setFocusableInTouchMode(true);
        configureWebView(webView);
        root.addView(webView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));

        loadingView = createLoadingView();
        root.addView(loadingView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));

        errorView = createErrorView();
        errorView.setVisibility(View.GONE);
        root.addView(errorView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));

        setContentView(root);
        showLoading();
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void configureWebView(WebView view) {
        WebSettings settings = view.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setLoadsImagesAutomatically(true);
        settings.setLoadWithOverviewMode(false);
        settings.setUseWideViewPort(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setSupportMultipleWindows(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) settings.setSafeBrowsingEnabled(true);
        webUserAgent = settings.getUserAgentString() + " MundialPlus-AndroidTV/" + BuildConfig.VERSION_NAME + " AndroidTV";
        settings.setUserAgentString(webUserAgent);

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(view, true);

        view.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView webView, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (APP_HOST.equalsIgnoreCase(uri.getHost()) && BILLBOARD_FALLBACK_PATH.equals(uri.getPath())) {
                    InputStream image = getResources().openRawResource(R.raw.bg);
                    return new WebResourceResponse("image/webp", null, image);
                }
                if (isStreamXPlayer(uri)) {
                    WebResourceResponse response = createAutoplayPlayerResponse(uri, request.getRequestHeaders());
                    if (response != null) return response;
                }
                return super.shouldInterceptRequest(webView, request);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView webView, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (!request.isForMainFrame()) return false;
                return !"https".equalsIgnoreCase(uri.getScheme())
                        || !APP_HOST.equalsIgnoreCase(uri.getHost());
            }

            @Override
            public void onPageStarted(WebView webView, String url, Bitmap favicon) {
                if (destroyed || "about:blank".equals(url)) return;
                mainFrameFailed = false;
                toolbarNavigationActive = false;
                showLoading();
            }

            @Override
            public void onPageFinished(WebView webView, String url) {
                if (destroyed || mainFrameFailed || "about:blank".equals(url)) return;
                showContent();
                installAndroidTvEnhancements(webView);
            }

            @Override
            public void onReceivedError(WebView webView, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    mainFrameFailed = true;
                    showError(getString(R.string.connection_error_message));
                }
            }

            @Override
            public void onReceivedHttpError(WebView webView, WebResourceRequest request,
                                            android.webkit.WebResourceResponse errorResponse) {
                if (request.isForMainFrame() && errorResponse.getStatusCode() >= 400) {
                    mainFrameFailed = true;
                    showError(getString(R.string.connection_error_message));
                }
            }
        });

        view.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int progress) {
                if (loadingProgress != null) loadingProgress.setProgress(progress);
                if (loadingStatus != null) loadingStatus.setText(getString(R.string.loading_progress, progress));
            }

            @Override
            public void onShowCustomView(View view, CustomViewCallback callback) {
                if (customView != null) {
                    callback.onCustomViewHidden();
                    return;
                }
                customView = view;
                customViewCallback = callback;
                root.addView(view, new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT));
                webView.setVisibility(View.INVISIBLE);
                enterImmersiveMode();
            }

            @Override
            public void onHideCustomView() {
                hideCustomView();
            }
        });
    }

    private boolean isStreamXPlayer(Uri uri) {
        String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase(Locale.ROOT);
        return (host.equals("streamx-hd.com") || host.equals("www.streamx-hd.com"))
                && "https".equalsIgnoreCase(uri.getScheme())
                && "/live1.php".equalsIgnoreCase(uri.getPath());
    }

    private WebResourceResponse createAutoplayPlayerResponse(Uri uri, Map<String, String> requestHeaders) {
        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) new URL(uri.toString()).openConnection();
            connection.setConnectTimeout(8000);
            connection.setReadTimeout(12000);
            connection.setInstanceFollowRedirects(false);
            connection.setRequestProperty("User-Agent", webUserAgent);
            String acceptLanguage = requestHeaders.get("Accept-Language");
            if (acceptLanguage != null) connection.setRequestProperty("Accept-Language", acceptLanguage);

            int status = connection.getResponseCode();
            if (status < 200 || status >= 300) return null;
            int contentLength = connection.getContentLength();
            if (contentLength > MAX_PLAYER_HTML_BYTES) return null;
            String contentType = connection.getContentType();
            if (contentType != null && !contentType.toLowerCase(Locale.ROOT).contains("text/html")) return null;

            ByteArrayOutputStream output = new ByteArrayOutputStream();
            try (InputStream input = connection.getInputStream()) {
                byte[] buffer = new byte[8192];
                int count;
                while ((count = input.read(buffer)) != -1) {
                    if (output.size() + count > MAX_PLAYER_HTML_BYTES) return null;
                    output.write(buffer, 0, count);
                }
            }

            String original = output.toString(StandardCharsets.UTF_8.name());
            String html = original
                    .replace("autoPlay: false", "autoPlay: true")
                    .replace("window.player = player;", "window.player = player; setTimeout(function(){try{player.play();}catch(e){}},350);");
            if (html.equals(original)) return null;
            return new WebResourceResponse("text/html", "UTF-8",
                    new ByteArrayInputStream(html.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ignored) {
            return null;
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    private void installAndroidTvEnhancements(WebView view) {
        String script = "(function(){" +
                "document.documentElement.classList.add('android-tv-app');" +
                "document.body.classList.add('is-tv-mode');" +
                "if(window.__mundialPlusAndroidTvPatch)return;" +
                "window.__mundialPlusAndroidTvPatch=true;" +
                "var original=window.getTvHomeFocusables;" +
                "if(typeof original==='function'){window.getTvHomeFocusables=function(){" +
                "return original.call(this).filter(function(el){" +
                "var card=el.closest&&el.closest('.event-card');" +
                "if(card)return el.matches('.watch-button:not(:disabled)');" +
                "if(el.matches('.agenda-filter-panel button')&&!el.closest('.agenda-filter.is-open'))return false;" +
                "return true;});};}" +
                "function simplify(root){" +
                "if(!root||!root.querySelectorAll)return;" +
                "root.querySelectorAll('.event-card button:not(.watch-button)').forEach(function(button){button.tabIndex=-1;});" +
                "}" +
                "simplify(document);" +
                "var grid=document.getElementById('agendaGrid');" +
                "if(grid)new MutationObserver(function(records){records.forEach(function(record){" +
                "record.addedNodes.forEach(function(node){if(node.nodeType===1)simplify(node);});" +
                "});}).observe(grid,{childList:true,subtree:true});" +
                "var style=document.createElement('style');" +
                "style.textContent='.android-tv-app .event-card button:not(.watch-button):focus{outline:none!important;box-shadow:none!important}' +" +
                "'.android-tv-app .agenda-filter:not(.is-open) .agenda-filter-panel{visibility:hidden!important}' +" +
                "'.android-tv-app .highlights-frame{display:none!important}' +" +
                "'.android-tv-app .toolbar .icon-button:focus,.android-tv-app .toolbar .icon-button.android-focused{outline:4px solid #fff!important;outline-offset:4px!important;box-shadow:0 0 0 8px rgba(255,255,255,.22)!important}' +" +
                "'.android-tv-app .toolbar .icon-button:focus::after,.android-tv-app .toolbar .icon-button.android-focused::after{opacity:1!important;transform:translate(0,-50%)!important}' +" +
                "'.android-tv-app .player.android-controls-hidden .toolbar{opacity:0!important;pointer-events:none!important;transform:translate(18px,-50%)!important}' +" +
                "'.android-tv-app .player.android-controls-hidden .tv-overlay span,.android-tv-app .player.android-controls-hidden .tv-overlay small{opacity:0!important}' +" +
                "'.android-tv-app .player.android-toolbar-open .toolbar{opacity:1!important;pointer-events:auto!important;transform:translateY(-50%)!important}' +" +
                "'.android-tv-app .player.android-toolbar-open .tv-overlay span,.android-tv-app .player.android-toolbar-open .tv-overlay small{opacity:0!important}';" +
                "document.head.appendChild(style);" +
                "var hint=document.querySelector('#tvOverlay small');" +
                "if(hint)hint.textContent='OK/Menu abre herramientas · Flechas navegan · Back vuelve';" +
                "var player=document.getElementById('player');var androidIdleTimer=0;" +
                "window.__androidTvShowControls=function(keepOpen){if(!player||player.hidden)return;" +
                "clearTimeout(androidIdleTimer);player.classList.remove('android-controls-hidden');" +
                "if(!keepOpen)androidIdleTimer=setTimeout(function(){" +
                "var switcher=document.getElementById('channelSwitcher');" +
                "if(!player.classList.contains('android-toolbar-open')&&!(switcher&&switcher.classList.contains('is-open')))player.classList.add('android-controls-hidden');" +
                "},3000);};" +
                "window.__androidTvCloseToolbar=function(){if(!player)return;player.classList.remove('android-toolbar-open');document.querySelectorAll('.toolbar .android-focused').forEach(function(button){button.classList.remove('android-focused');});window.__androidTvShowControls(false);};" +
                "if(player)new MutationObserver(function(){if(!player.hidden)window.__androidTvShowControls(false);}).observe(player,{attributes:true,attributeFilter:['hidden']});" +
                "var switcher=document.getElementById('channelSwitcher');" +
                "if(switcher)new MutationObserver(function(){if(player&&!switcher.classList.contains('is-open')&&!player.hidden)window.__androidTvShowControls(false);}).observe(switcher,{attributes:true,attributeFilter:['class']});" +
                "function ensureBillboard(){" +
                "var thumb=document.querySelector('.highlights-thumb');if(!thumb)return;" +
                "var value=thumb.style.backgroundImage||'';" +
                "var match=value.match(/url\\([\"']?(.*?)[\"']?\\)/);" +
                "if(!match){thumb.style.backgroundImage='url(https://" + APP_HOST + BILLBOARD_FALLBACK_PATH + ")';return;}" +
                "if(match[1].indexOf('" + BILLBOARD_FALLBACK_PATH + "')>=0)return;" +
                "var image=new Image();image.onerror=function(){if(thumb.isConnected)thumb.style.backgroundImage='url(https://" + APP_HOST + BILLBOARD_FALLBACK_PATH + ")';};image.src=match[1];" +
                "}" +
                "ensureBillboard();" +
                "var billboard=document.getElementById('highlightsCard');" +
                "if(billboard)new MutationObserver(ensureBillboard).observe(billboard,{childList:true,subtree:true,attributes:true,attributeFilter:['style']});" +
                "})();";
        view.evaluateJavascript(script, null);
    }

    private View createLoadingView() {
        FrameLayout frame = new FrameLayout(this);
        frame.setBackground(TvStyle.appBackground());

        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setGravity(Gravity.CENTER_HORIZONTAL);

        TextView brand = text(getString(R.string.loading_title), 54, Color.WHITE, true);
        TextView message = text(getString(R.string.loading_message), 18, Color.rgb(180, 180, 184), false);
        message.setPadding(0, dp(10), 0, dp(28));

        loadingProgress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        loadingProgress.setMax(100);
        loadingProgress.setProgress(0);
        loadingProgress.setIndeterminate(false);

        loadingStatus = text(getString(R.string.loading_progress, 0), 14, Color.rgb(154, 154, 158), false);
        loadingStatus.setPadding(0, dp(12), 0, 0);

        panel.addView(brand);
        panel.addView(message);
        panel.addView(loadingProgress, new LinearLayout.LayoutParams(dp(380), dp(6)));
        panel.addView(loadingStatus);

        FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        params.gravity = Gravity.CENTER;
        frame.addView(panel, params);
        return frame;
    }

    private void showLoading() {
        if (destroyed || loadingView == null) return;
        mainHandler.removeCallbacks(loadTimeout);
        loadingProgress.setProgress(0);
        loadingStatus.setText(getString(R.string.loading_progress, 0));
        loadingView.setAlpha(1f);
        loadingView.setVisibility(View.VISIBLE);
        errorView.setVisibility(View.GONE);
        webView.setVisibility(View.INVISIBLE);
        mainHandler.postDelayed(loadTimeout, LOAD_TIMEOUT_MS);
    }

    private void showContent() {
        if (destroyed) return;
        mainHandler.removeCallbacks(loadTimeout);
        errorView.setVisibility(View.GONE);
        webView.setVisibility(View.VISIBLE);
        webView.requestFocus();
        loadingView.animate().alpha(0f).setDuration(220).withEndAction(() -> {
            if (!destroyed) loadingView.setVisibility(View.GONE);
        }).start();
    }

    private void showError(String detail) {
        if (destroyed) return;
        mainHandler.removeCallbacks(loadTimeout);
        toolbarNavigationActive = false;
        loadingView.setVisibility(View.GONE);
        webView.setVisibility(View.INVISIBLE);
        errorDetail.setText(detail);
        errorView.setVisibility(View.VISIBLE);
        retryButton.requestFocus();
    }

    private View createErrorView() {
        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setGravity(Gravity.CENTER);
        panel.setPadding(dp(48), dp(48), dp(48), dp(48));
        panel.setBackgroundColor(Color.rgb(6, 6, 6));

        TextView brand = text(getString(R.string.app_name), 42, Color.WHITE, true);
        TextView title = text(getString(R.string.connection_error_title), 26, Color.WHITE, true);
        title.setPadding(0, dp(24), 0, dp(8));
        errorDetail = text(getString(R.string.connection_error_message), 16,
                Color.rgb(154, 154, 154), false);
        retryButton = new Button(this);
        retryButton.setText(R.string.retry);
        retryButton.setTextSize(17);
        retryButton.setTextColor(Color.rgb(16, 16, 16));
        retryButton.setAllCaps(false);
        retryButton.setTypeface(retryButton.getTypeface(), android.graphics.Typeface.BOLD);
        retryButton.setGravity(Gravity.CENTER);
        retryButton.setFocusable(true);
        retryButton.setPadding(dp(28), dp(14), dp(28), dp(14));
        retryButton.setBackground(TvStyle.rounded(this, Color.WHITE, Color.WHITE, 999));
        LinearLayout.LayoutParams retryParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        retryParams.setMargins(0, dp(28), 0, 0);
        retryButton.setLayoutParams(retryParams);
        retryButton.setOnClickListener(v -> {
            mainFrameFailed = false;
            showLoading();
            webView.loadUrl(APP_URL);
        });
        retryButton.setOnFocusChangeListener((v, focused) -> {
            retryButton.setTextColor(focused ? Color.WHITE : Color.rgb(16, 16, 16));
            retryButton.setBackground(TvStyle.rounded(this,
                    focused ? Color.rgb(32, 32, 36) : Color.WHITE,
                    Color.WHITE, 999));
            TvStyle.focusScale(v, focused);
        });

        panel.addView(brand);
        panel.addView(title);
        panel.addView(errorDetail);
        panel.addView(retryButton);
        return panel;
    }

    private TextView text(String value, int size, int color, boolean bold) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextSize(size);
        view.setTextColor(color);
        view.setGravity(Gravity.CENTER);
        if (bold) view.setTypeface(view.getTypeface(), android.graphics.Typeface.BOLD);
        return view;
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        if (errorView != null && errorView.getVisibility() == View.VISIBLE) {
            return super.dispatchKeyEvent(event);
        }

        TvKey key = TvKey.fromAndroid(event.getKeyCode());
        if (key == null) return super.dispatchKeyEvent(event);

        if (event.getKeyCode() == KeyEvent.KEYCODE_MENU) {
            if (event.getAction() == KeyEvent.ACTION_DOWN) toggleToolbarNavigation();
            return true;
        }

        if (toolbarNavigationActive) {
            if (event.getAction() == KeyEvent.ACTION_DOWN) handleToolbarKey(event.getKeyCode());
            return true;
        }

        if (key.keyCode == 27 && event.getAction() == KeyEvent.ACTION_DOWN) {
            handleBack();
            return true;
        }

        if (isSelectKey(event.getKeyCode())) {
            if (event.getAction() == KeyEvent.ACTION_DOWN) openToolbarFromCenter();
            return true;
        }

        dispatchWebKey(key, event.getAction() == KeyEvent.ACTION_DOWN, event.getRepeatCount());
        return true;
    }

    private boolean isSelectKey(int keyCode) {
        return keyCode == KeyEvent.KEYCODE_DPAD_CENTER
                || keyCode == KeyEvent.KEYCODE_ENTER
                || keyCode == KeyEvent.KEYCODE_NUMPAD_ENTER
                || keyCode == KeyEvent.KEYCODE_BUTTON_A;
    }

    private void openToolbarFromCenter() {
        if (destroyed || webView == null) return;
        toolbarNavigationActive = true;
        String script = "(function(){var player=document.getElementById('player');" +
                "var switcher=document.getElementById('channelSwitcher');" +
                "if(!player||player.hidden||(switcher&&switcher.classList.contains('is-open')))return false;" +
                "if(typeof __androidTvShowControls==='function')__androidTvShowControls(true);" +
                "player.classList.add('android-toolbar-open');" +
                "var buttons=Array.from(document.querySelectorAll('.toolbar .icon-button:not([hidden])')).filter(function(button){return button.offsetWidth&&button.offsetHeight;});" +
                "if(!buttons.length)return false;buttons.forEach(function(button){button.classList.remove('android-focused');});" +
                "buttons[0].classList.add('android-focused');buttons[0].focus({preventScroll:true});return true;})()";
        webView.evaluateJavascript(script, value -> {
            if (destroyed || webView == null) return;
            if (!"true".equals(value)) {
                toolbarNavigationActive = false;
                dispatchWebKey(TvKey.fromAndroid(KeyEvent.KEYCODE_DPAD_CENTER), true, 0);
                dispatchWebKey(TvKey.fromAndroid(KeyEvent.KEYCODE_DPAD_CENTER), false, 0);
            }
        });
    }

    private void toggleToolbarNavigation() {
        if (destroyed || webView == null) return;
        if (toolbarNavigationActive) {
            exitToolbarNavigation();
            return;
        }
        toolbarNavigationActive = true;
        String script = "(function(){" +
                "var player=document.getElementById('player');var switcher=document.getElementById('channelSwitcher');" +
                "if(!player||player.hidden||(switcher&&switcher.classList.contains('is-open')))return false;" +
                "if(typeof revealControls==='function')revealControls();" +
                "if(typeof __androidTvShowControls==='function')__androidTvShowControls(true);player.classList.add('android-toolbar-open');" +
                "var buttons=Array.from(document.querySelectorAll('.toolbar .icon-button:not([hidden])')).filter(function(button){return button.offsetWidth&&button.offsetHeight;});" +
                "if(!buttons.length)return false;buttons.forEach(function(button){button.classList.remove('android-focused');});" +
                "buttons[0].classList.add('android-focused');buttons[0].focus({preventScroll:true});return true;})()";
        webView.evaluateJavascript(script, value -> {
            if (destroyed || webView == null) return;
            if (!"true".equals(value)) {
                toolbarNavigationActive = false;
                dispatchWebKey(TvKey.fromAndroid(KeyEvent.KEYCODE_MENU), true, 0);
                dispatchWebKey(TvKey.fromAndroid(KeyEvent.KEYCODE_MENU), false, 0);
            }
        });
    }

    private void handleToolbarKey(int keyCode) {
        if (destroyed || webView == null) {
            toolbarNavigationActive = false;
            return;
        }
        if (keyCode == KeyEvent.KEYCODE_BACK || keyCode == KeyEvent.KEYCODE_MENU) {
            exitToolbarNavigation();
            return;
        }
        if (keyCode == KeyEvent.KEYCODE_DPAD_UP || keyCode == KeyEvent.KEYCODE_DPAD_DOWN
                || keyCode == KeyEvent.KEYCODE_DPAD_LEFT || keyCode == KeyEvent.KEYCODE_DPAD_RIGHT) {
            int direction = keyCode == KeyEvent.KEYCODE_DPAD_UP || keyCode == KeyEvent.KEYCODE_DPAD_LEFT ? -1 : 1;
            String script = "(function(){if(typeof revealControls==='function')revealControls();" +
                    "if(typeof __androidTvShowControls==='function')__androidTvShowControls(true);" +
                    "var buttons=Array.from(document.querySelectorAll('.toolbar .icon-button:not([hidden])')).filter(function(button){return button.offsetWidth&&button.offsetHeight;});" +
                    "if(!buttons.length)return;var current=document.querySelector('.toolbar .icon-button.android-focused');var index=buttons.indexOf(current);" +
                    "index=(Math.max(index,0)+(" + direction + ")+buttons.length)%buttons.length;" +
                    "buttons.forEach(function(button){button.classList.remove('android-focused');});buttons[index].classList.add('android-focused');buttons[index].focus({preventScroll:true});})()";
            webView.evaluateJavascript(script, null);
            return;
        }
        if (keyCode == KeyEvent.KEYCODE_DPAD_CENTER || keyCode == KeyEvent.KEYCODE_ENTER
                || keyCode == KeyEvent.KEYCODE_NUMPAD_ENTER || keyCode == KeyEvent.KEYCODE_BUTTON_A) {
            toolbarNavigationActive = false;
            String script = "(function(){var button=document.querySelector('.toolbar .icon-button.android-focused');" +
                    "if(!button)return false;" +
                    "var id=button.id;button.click();if(typeof revealControls==='function')revealControls();" +
                    "return id;})()";
            webView.evaluateJavascript(script, value -> {
                if (destroyed || webView == null) return;
                String id = value == null ? "" : value.replace("\"", "");
                boolean closesToolbar = id.isEmpty() || id.equals("false")
                        || id.equals("channelsButton") || id.equals("splitButton")
                        || id.equals("closeButton");
                if (closesToolbar) {
                    webView.evaluateJavascript("if(typeof __androidTvCloseToolbar==='function')__androidTvCloseToolbar();", null);
                } else {
                    toolbarNavigationActive = true;
                    webView.evaluateJavascript(
                            "if(typeof __androidTvShowControls==='function')__androidTvShowControls(true);" +
                            "var active=document.getElementById('" + id + "');if(active)active.focus({preventScroll:true});", null);
                }
            });
        }
    }

    private void exitToolbarNavigation() {
        toolbarNavigationActive = false;
        if (destroyed || webView == null) return;
        webView.evaluateJavascript(
                "if(typeof __androidTvCloseToolbar==='function')__androidTvCloseToolbar();" +
                "if(typeof revealControls==='function')revealControls();" +
                "if(typeof focusTvOverlay==='function')focusTvOverlay();", null);
    }

    private void dispatchWebKey(TvKey key, boolean down, int repeatCount) {
        if (destroyed || webView == null || key == null) return;
        String type = down ? "keydown" : "keyup";
        String script = "document.dispatchEvent(new KeyboardEvent('" + type + "',{" +
                "key:'" + key.key + "',code:'" + key.code + "',keyCode:" + key.keyCode + "," +
                "which:" + key.keyCode + ",bubbles:true,cancelable:true,repeat:" + (repeatCount > 0) + "}));";
        webView.evaluateJavascript(script, null);
    }

    private void handleBack() {
        if (destroyed || webView == null) return;
        if (customView != null) {
            hideCustomView();
            return;
        }
        String script = "(function(){" +
                "var p=document.getElementById('player');" +
                "var open=p&&!p.hidden;" +
                "if(open){document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',keyCode:27,which:27,bubbles:true}));}" +
                "return open;})()";
        webView.evaluateJavascript(script, value -> {
            if (destroyed) return;
            if (!"true".equals(value)) moveTaskToBack(true);
        });
    }

    private void hideCustomView() {
        if (customView == null) return;
        root.removeView(customView);
        customView = null;
        webView.setVisibility(View.VISIBLE);
        if (customViewCallback != null) customViewCallback.onCustomViewHidden();
        customViewCallback = null;
        webView.requestFocus();
        enterImmersiveMode();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        if (webView != null) webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
        if (loadingView != null && loadingView.getVisibility() == View.VISIBLE) {
            mainHandler.postDelayed(loadTimeout, LOAD_TIMEOUT_MS);
        }
        enterImmersiveMode();
    }

    @Override
    protected void onPause() {
        toolbarNavigationActive = false;
        mainHandler.removeCallbacks(loadTimeout);
        if (webView != null) {
            webView.evaluateJavascript("if(typeof __androidTvCloseToolbar==='function')__androidTvCloseToolbar();", null);
            webView.onPause();
        }
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        destroyed = true;
        mainHandler.removeCallbacksAndMessages(null);
        hideCustomView();
        if (webView != null) {
            webView.stopLoading();
            webView.loadUrl("about:blank");
            webView.clearHistory();
            webView.removeAllViews();
            if (root != null) root.removeView(webView);
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) enterImmersiveMode();
    }

    private void enterImmersiveMode() {
        getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                        | View.SYSTEM_UI_FLAG_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private static final class TvKey {
        final String key;
        final String code;
        final int keyCode;

        TvKey(String key, String code, int keyCode) {
            this.key = key;
            this.code = code;
            this.keyCode = keyCode;
        }

        static TvKey fromAndroid(int androidCode) {
            switch (androidCode) {
                case KeyEvent.KEYCODE_DPAD_UP: return new TvKey("ArrowUp", "ArrowUp", 38);
                case KeyEvent.KEYCODE_DPAD_DOWN: return new TvKey("ArrowDown", "ArrowDown", 40);
                case KeyEvent.KEYCODE_DPAD_LEFT: return new TvKey("ArrowLeft", "ArrowLeft", 37);
                case KeyEvent.KEYCODE_DPAD_RIGHT: return new TvKey("ArrowRight", "ArrowRight", 39);
                case KeyEvent.KEYCODE_DPAD_CENTER:
                case KeyEvent.KEYCODE_ENTER:
                case KeyEvent.KEYCODE_NUMPAD_ENTER:
                case KeyEvent.KEYCODE_BUTTON_A: return new TvKey("Enter", "Enter", 13);
                case KeyEvent.KEYCODE_MENU: return new TvKey("ContextMenu", "ContextMenu", 93);
                case KeyEvent.KEYCODE_CHANNEL_UP: return new TvKey("ChannelUp", "ChannelUp", 166);
                case KeyEvent.KEYCODE_CHANNEL_DOWN: return new TvKey("ChannelDown", "ChannelDown", 167);
                case KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE: return new TvKey("MediaPlayPause", "MediaPlayPause", 179);
                case KeyEvent.KEYCODE_MEDIA_NEXT: return new TvKey("MediaTrackNext", "MediaTrackNext", 176);
                case KeyEvent.KEYCODE_MEDIA_PREVIOUS: return new TvKey("MediaTrackPrevious", "MediaTrackPrevious", 177);
                case KeyEvent.KEYCODE_BACK: return new TvKey("Escape", "Escape", 27);
                default: return null;
            }
        }
    }
}
