package com.leo10m2010.canalesmundialtv;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Handler;
import android.os.Looper;
import android.widget.ImageView;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Minimal async remote image loader (no external dependency). Decodes PNG/JPG
 * bitmaps off the UI thread with a small in-memory cache. Note: SVG URLs are not
 * supported by BitmapFactory, so use raster URLs (e.g. flagcdn .png badges).
 */
public final class RemoteImage {
    private static final ExecutorService POOL = Executors.newFixedThreadPool(4);
    private static final Handler MAIN = new Handler(Looper.getMainLooper());
    private static final ConcurrentHashMap<String, Bitmap> CACHE = new ConcurrentHashMap<>();

    private RemoteImage() {
    }

    public static void load(ImageView target, String url) {
        if (target == null || url == null || url.trim().isEmpty()) {
            return;
        }

        Bitmap cached = CACHE.get(url);
        if (cached != null) {
            target.setImageBitmap(cached);
            return;
        }

        target.setTag(url);
        POOL.execute(() -> {
            Bitmap bitmap = fetch(url);
            if (bitmap == null) {
                return;
            }
            CACHE.put(url, bitmap);
            MAIN.post(() -> {
                if (url.equals(target.getTag())) {
                    target.setImageBitmap(bitmap);
                }
            });
        });
    }

    private static Bitmap fetch(String url) {
        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) new URL(url).openConnection();
            connection.setConnectTimeout(8000);
            connection.setReadTimeout(8000);
            connection.setInstanceFollowRedirects(true);
            connection.setRequestProperty("User-Agent", "MundialTV/1.0 AndroidTV");
            InputStream input = connection.getInputStream();
            Bitmap bitmap = BitmapFactory.decodeStream(input);
            input.close();
            return bitmap;
        } catch (Exception ignored) {
            return null;
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }
}
