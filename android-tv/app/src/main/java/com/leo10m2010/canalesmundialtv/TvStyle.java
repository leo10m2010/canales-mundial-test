package com.leo10m2010.canalesmundialtv;

import android.content.Context;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.view.View;

public final class TvStyle {
    // Apple-TV style palette (matches the web app: warm cinematic dark + white highlight)
    public static final int BG = Color.rgb(8, 8, 10);          // near-black, used as text-on-highlight
    public static final int BG_ALT = Color.rgb(14, 14, 16);
    public static final int PANEL = Color.argb(150, 30, 30, 34);
    public static final int PANEL_DEEP = Color.argb(200, 18, 18, 22);
    public static final int SIGNAL = Color.rgb(242, 242, 242);  // white highlight / active state
    public static final int TEXT = Color.rgb(255, 255, 255);
    public static final int MUTED = Color.rgb(154, 154, 154);
    public static final int LINE = Color.argb(38, 255, 255, 255);
    public static final int DANGER = Color.rgb(255, 90, 77);    // live red

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
        // Subtle warm-to-black diagonal, like the web ambient glow.
        return new GradientDrawable(
                GradientDrawable.Orientation.TL_BR,
                new int[] { Color.rgb(16, 10, 12), Color.rgb(9, 9, 11), Color.rgb(5, 5, 6) }
        );
    }

    public static void focusScale(View view, boolean hasFocus) {
        view.animate()
                .scaleX(hasFocus ? 1.06f : 1f)
                .scaleY(hasFocus ? 1.06f : 1f)
                .setDuration(140)
                .start();
    }
}
