package com.leo10m2010.canalesmundialtv;

import android.content.Context;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.view.View;

public final class TvStyle {
    // Web palette: black canvas, translucent glass panels and a neutral white signal.
    public static final int BG = Color.rgb(7, 8, 7);
    public static final int BG_ALT = Color.rgb(10, 10, 12);
    public static final int PANEL = Color.argb(150, 255, 255, 255);
    public static final int PANEL_DEEP = Color.argb(215, 15, 15, 17);
    public static final int SIGNAL = Color.rgb(242, 242, 242);  // white highlight / active state
    public static final int TEXT = Color.rgb(255, 255, 255);
    public static final int MUTED = Color.rgb(166, 166, 170);
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
        // The web canvas is black with a restrained red ambient glow.
        return new GradientDrawable(
                GradientDrawable.Orientation.TL_BR,
                new int[] { Color.rgb(27, 8, 12), Color.rgb(8, 8, 10), Color.rgb(3, 3, 4) }
        );
    }

    public static GradientDrawable glassPill(Context context) {
        return rounded(context, Color.argb(178, 18, 18, 21), Color.argb(45, 255, 255, 255), 999);
    }

    public static void focusScale(View view, boolean hasFocus) {
        view.animate()
                .scaleX(hasFocus ? 1.035f : 1f)
                .scaleY(hasFocus ? 1.035f : 1f)
                .setDuration(140)
                .start();
    }
}
