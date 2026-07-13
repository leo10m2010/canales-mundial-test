package com.leo10m2010.canalesmundialtv;

import android.content.Context;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.view.View;

public final class TvStyle {
    private TvStyle() {
    }

    public static int dp(Context context, int value) {
        return Math.round(value * context.getResources().getDisplayMetrics().density);
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

    public static void focusScale(View view, boolean hasFocus) {
        view.animate()
                .scaleX(hasFocus ? 1.035f : 1f)
                .scaleY(hasFocus ? 1.035f : 1f)
                .setDuration(140)
                .start();
    }
}
