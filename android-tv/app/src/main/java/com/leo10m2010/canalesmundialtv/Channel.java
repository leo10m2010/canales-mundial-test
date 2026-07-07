package com.leo10m2010.canalesmundialtv;

import java.util.ArrayList;
import java.util.List;

public class Channel {
    public final String name;
    public final String category;
    public final String language;
    public final String country;
    public final String quality;
    public final String type;
    public final String badgeText;
    public final List<ChannelSource> sources;
    public String liveScore;
    public String liveTime;
    public boolean isLive;

    public Channel(String name, String category, String language, String country, String quality, String type, List<ChannelSource> sources) {
        this(name, category, language, country, quality, type, "", sources);
    }

    public Channel(String name, String category, String language, String country, String quality, String type, String badgeText, List<ChannelSource> sources) {
        this.name = name;
        this.category = category;
        this.language = language;
        this.country = country;
        this.quality = quality;
        this.type = type;
        this.badgeText = badgeText;
        this.sources = sources;
    }

    public String sourceCountText() {
        int count = sources == null ? 0 : sources.size();
        return count == 1 ? "1 fuente" : count + " fuentes";
    }

    public ArrayList<String> sourceNames() {
        ArrayList<String> names = new ArrayList<>();
        if (sources == null) {
            return names;
        }
        for (ChannelSource source : sources) {
            names.add(source.name);
        }
        return names;
    }

    public ArrayList<String> sourceUrls() {
        ArrayList<String> urls = new ArrayList<>();
        if (sources == null) {
            return urls;
        }
        for (ChannelSource source : sources) {
            urls.add(source.url);
        }
        return urls;
    }
}
