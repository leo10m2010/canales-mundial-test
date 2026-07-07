package com.leo10m2010.canalesmundialtv;

import android.content.Context;
import android.content.SharedPreferences;

public class CacheStore {
    private static final String PREFS = "canales_mundial_cache";

    private final SharedPreferences prefs;

    public CacheStore(Context context) {
        prefs = context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    public String getString(String key) {
        return prefs.getString(key, "");
    }

    public long getUpdatedAt(String key) {
        return prefs.getLong(key + "_updated_at", 0L);
    }

    public void putString(String key, String value) {
        prefs.edit()
                .putString(key, value)
                .putLong(key + "_updated_at", System.currentTimeMillis())
                .apply();
    }

    public String formatAge(String key) {
        long updatedAt = getUpdatedAt(key);
        if (updatedAt <= 0L) {
            return "sin cache";
        }

        long minutes = Math.max(0L, (System.currentTimeMillis() - updatedAt) / 60000L);
        if (minutes < 1L) {
            return "actualizado hace segundos";
        }
        if (minutes == 1L) {
            return "actualizado hace 1 min";
        }
        if (minutes < 60L) {
            return "actualizado hace " + minutes + " min";
        }

        long hours = minutes / 60L;
        return hours == 1L ? "actualizado hace 1 h" : "actualizado hace " + hours + " h";
    }
}
