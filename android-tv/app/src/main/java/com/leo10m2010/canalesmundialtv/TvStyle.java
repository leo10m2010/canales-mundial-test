package com.leo10m2010.canalesmundialtv;

import android.content.Context;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.view.View;

public final class TvStyle {
    public static final int BG = Color.rgb(7, 8, 7);
    public static final int BG_ALT = Color.rgb(12, 18, 13);
    public static final int PANEL = Color.rgb(20, 28, 22);
    public static final int PANEL_DEEP = Color.rgb(11, 15, 12);
    public static final int SIGNAL = Color.rgb(231, 255, 85);
    public static final int TEXT = Color.rgb(245, 241, 223);
    public static final int MUTED = Color.rgb(167, 171, 154);
    public static final int DANGER = Color.rgb(255, 106, 91);

    private static float cachedDensity = -1;

    private TvStyle() {
    }

    public static int dp(Context context, int value) {
        if (cachedDensity < 0) {
            cachedDensity = context.getResources().getDisplayMetrics().density;
        }
        return Math.round(value * cachedDensity);
    }

    public static GradientDrawable rounded(Context context, int fill, int stroke, int radiusDp) {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setColor(fill);
        drawable.setCornerRadius(dp(context, radiusDp));
        int strokeWidth = Math.max(1, dp(context, 1));
        drawable.setStroke(strokeWidth, stroke);
        return drawable;
    }

    public static GradientDrawable appBackground() {
        GradientDrawable drawable = new GradientDrawable(
                GradientDrawable.Orientation.TL_BR,
                new int[] { BG, Color.rgb(10, 23, 14), Color.rgb(2, 4, 3) }
        );
        return drawable;
    }

    public static void focusScale(View view, boolean hasFocus) {
        view.animate()
                .scaleX(hasFocus ? 1.055f : 1f)
                .scaleY(hasFocus ? 1.055f : 1f)
                .setDuration(130)
                .start();
    }
}
