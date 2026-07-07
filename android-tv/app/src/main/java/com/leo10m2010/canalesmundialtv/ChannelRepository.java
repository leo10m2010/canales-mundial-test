package com.leo10m2010.canalesmundialtv;

import android.content.Context;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;

public class ChannelRepository {
    private static final String STREAMX_CHANNELS_URL = "https://canal-mundi-2026.netlify.app/.netlify/functions/streamx-channels";
    private static final String STREAMX_EVENTS_URL = "https://canal-mundi-2026.netlify.app/.netlify/functions/streamx-events";
    private static final String CACHE_STREAMX_CHANNELS = "streamx_channels_json";
    private static final String CACHE_STREAMX_EVENTS = "streamx_events_json";
    private static final TimeZone AGENDA_TIME_ZONE = TimeZone.getTimeZone("America/Lima");

    private final Context context;
    private final CacheStore cacheStore;

    public ChannelRepository(Context context) {
        this.context = context.getApplicationContext();
        this.cacheStore = new CacheStore(context);
    }

    public static class RemoteLoadResult {
        public final List<Channel> channels;
        public final boolean usedCache;
        public final boolean complete;
        public final String message;

        public RemoteLoadResult(List<Channel> channels, boolean usedCache, boolean complete, String message) {
            this.channels = channels;
            this.usedCache = usedCache;
            this.complete = complete;
            this.message = message;
        }
    }

    private static class EventCandidate {
        final JSONObject event;
        final List<ChannelSource> sources;
        final Date date;
        final String dateKey;

        EventCandidate(JSONObject event, List<ChannelSource> sources, Date date, String dateKey) {
            this.event = event;
            this.sources = sources;
            this.date = date;
            this.dateKey = dateKey;
        }
    }

    public List<Channel> loadChannels() {
        List<Channel> channels = new ArrayList<>();

        try {
            JSONArray array = new JSONArray(readRawJson());
            for (int index = 0; index < array.length(); index++) {
                JSONObject item = array.getJSONObject(index);
                List<ChannelSource> sources = parseSources(item);
                if (sources.isEmpty()) {
                    continue;
                }

                channels.add(new Channel(
                        item.optString("name", "Canal"),
                        item.optString("category", ""),
                        item.optString("language", ""),
                        item.optString("country", ""),
                        item.optString("quality", ""),
                        item.optString("type", ""),
                        sources
                ));
            }
        } catch (Exception ignored) {
            return channels;
        }

        return channels;
    }

    public List<Channel> loadRemoteChannels() {
        return refreshRemoteChannels().channels;
    }

    public RemoteLoadResult loadCachedRemoteChannels() {
        List<Channel> channels = new ArrayList<>();
        channels.addAll(parseCached(CACHE_STREAMX_CHANNELS, true));
        channels.addAll(parseCached(CACHE_STREAMX_EVENTS, false));

        String age = cacheStore.formatAge(CACHE_STREAMX_CHANNELS) + " / " + cacheStore.formatAge(CACHE_STREAMX_EVENTS);
        return new RemoteLoadResult(channels, true, !channels.isEmpty(), "Cache Netlify: " + age);
    }

    public RemoteLoadResult refreshRemoteChannels() {
        List<Channel> channels = new ArrayList<>();
        boolean usedCache = false;
        boolean complete = true;
        StringBuilder message = new StringBuilder();

        try {
            String body = fetchText(STREAMX_CHANNELS_URL);
            cacheStore.putString(CACHE_STREAMX_CHANNELS, body);
            channels.addAll(parseStreamxChannels(body));
        } catch (Exception error) {
            complete = false;
            usedCache = true;
            channels.addAll(parseCached(CACHE_STREAMX_CHANNELS, true));
            message.append("Canales 24/7 desde cache. ");
        }

        try {
            String body = fetchText(STREAMX_EVENTS_URL);
            cacheStore.putString(CACHE_STREAMX_EVENTS, body);
            channels.addAll(parseStreamxEvents(body));
        } catch (Exception error) {
            complete = false;
            usedCache = true;
            channels.addAll(parseCached(CACHE_STREAMX_EVENTS, false));
            message.append("Agenda desde cache. ");
        }

        if (message.length() == 0) {
            message.append("Netlify actualizado correctamente.");
        }

        return new RemoteLoadResult(channels, usedCache, complete, message.toString().trim());
    }

    private List<Channel> parseStreamxChannels(String body) {
        List<Channel> channels = new ArrayList<>();

        try {
            JSONObject root = new JSONObject(body);
            JSONArray array = root.optJSONArray("channels");
            if (array == null) {
                array = root.optJSONArray("canales");
            }
            if (array == null) {
                return channels;
            }

            for (int index = 0; index < array.length(); index++) {
                JSONObject item = array.optJSONObject(index);
                if (item == null || item.optBoolean("active", true) == false || "off".equalsIgnoreCase(item.optString("status"))) {
                    continue;
                }

                String stream = firstNonEmpty(item.optString("stream"), item.optString("codigo"), item.optString("code"), item.optString("id"), extractStreamCode(item.optString("url")));
                String url = firstNonEmpty(item.optString("url"), stream.isEmpty() ? "" : "https://stream-xhd.com/live1.php?stream=" + stream);
                String name = firstNonEmpty(item.optString("name"), item.optString("nombre"), item.optString("title"), "Canal " + (index + 1));

                if (!isHttpUrl(url) || isBlocked(name + " " + url + " " + item.optString("type"))) {
                    continue;
                }

                List<ChannelSource> sources = new ArrayList<>();
                sources.add(new ChannelSource("Principal", url));
                channels.add(new Channel(
                        name,
                        "streamx-247",
                        normalizeLanguage(item),
                        countryToFlagCode(firstNonEmpty(item.optString("country"), item.optString("pais"), item.optString("category"), item.optString("categoria"))),
                        firstNonEmpty(item.optString("quality"), item.optString("calidad"), "720p"),
                        "Stream-XHD",
                        sources
                ));
            }
        } catch (Exception ignored) {
            return channels;
        }

        return channels;
    }

    private List<Channel> parseStreamxEvents(String body) {
        List<Channel> channels = new ArrayList<>();
        List<EventCandidate> candidates = new ArrayList<>();

        try {
            JSONObject root = new JSONObject(body);
            JSONArray sports = root.optJSONArray("sports");
            if (sports == null) {
                return channels;
            }

            for (int sportIndex = 0; sportIndex < sports.length(); sportIndex++) {
                JSONObject sport = sports.optJSONObject(sportIndex);
                if (sport == null) {
                    continue;
                }
                JSONArray leagues = sport.optJSONArray("leagues");
                if (leagues == null) {
                    continue;
                }

                for (int leagueIndex = 0; leagueIndex < leagues.length(); leagueIndex++) {
                    JSONObject league = leagues.optJSONObject(leagueIndex);
                    if (league == null) {
                        continue;
                    }
                    JSONArray events = league.optJSONArray("events");
                    if (events == null) {
                        continue;
                    }

                    for (int eventIndex = 0; eventIndex < events.length(); eventIndex++) {
                        JSONObject event = events.optJSONObject(eventIndex);
                        if (event == null || !isWorldCupEvent(event, league)) {
                            continue;
                        }

                        List<ChannelSource> sources = parseEventSources(event);
                        if (sources.isEmpty()) {
                            continue;
                        }

                        Date eventDate = parseEventDate(event);
                        if (eventDate == null) {
                            continue;
                        }

                        candidates.add(new EventCandidate(event, sources, eventDate, agendaDateKey(eventDate)));
                    }
                }
            }

            String selectedDateKey = chooseAgendaDateKey(candidates);
            if (selectedDateKey.isEmpty()) {
                return channels;
            }

            Collections.sort(candidates, (left, right) -> left.date.compareTo(right.date));
            for (EventCandidate candidate : candidates) {
                if (!selectedDateKey.equals(candidate.dateKey)) {
                    continue;
                }

                String title = firstNonEmpty(candidate.event.optString("title"), makeTitleFromTeams(candidate.event), "Partido Mundial");
                String quality = candidate.sources.size() == 1 ? "1 fuente" : candidate.sources.size() + " fuentes";
                String badge = eventBadge(candidate.event);

                Channel channel = new Channel(
                        title,
                        "streamx-event",
                        "Multi",
                        "world",
                        quality,
                        formatEventSlot(candidate.date),
                        badge,
                        candidate.sources
                );

                // Parseo de marcador en vivo
                String status = normalizeText(candidate.event.optString("status"));
                if (status.contains("live") || status.contains("vivo") || status.contains("jugando")) {
                    channel.isLive = true;
                    channel.liveTime = candidate.event.optString("liveTime", "");
                    String homeScore = candidate.event.optString("homeScore", "0");
                    String awayScore = candidate.event.optString("awayScore", "0");
                    channel.liveScore = homeScore + " - " + awayScore;
                }

                channels.add(channel);
            }
        } catch (Exception ignored) {
            return channels;
        }

        return channels;
    }

    private List<Channel> parseCached(String key, boolean channelsPayload) {
        String body = cacheStore.getString(key);
        if (body.isEmpty()) {
            return new ArrayList<>();
        }

        return channelsPayload ? parseStreamxChannels(body) : parseStreamxEvents(body);
    }

    private List<ChannelSource> parseEventSources(JSONObject event) {
        List<ChannelSource> sources = new ArrayList<>();
        JSONArray servers = event.optJSONArray("servers");
        if (servers == null) {
            return sources;
        }

        for (int index = 0; index < servers.length(); index++) {
            JSONObject server = servers.optJSONObject(index);
            if (server == null || !server.optBoolean("active", true)) {
                continue;
            }

            String url = server.optString("url");
            String name = firstNonEmpty(server.optString("name"), "Servidor " + (index + 1));
            if (isHttpUrl(url) && !isBlocked(name + " " + url)) {
                sources.add(new ChannelSource(decorateSourceName(name, url, server.optString("quality")), url));
            }
        }

        sortSourcesByQuality(sources);
        return sources;
    }

    private List<ChannelSource> parseSources(JSONObject item) throws Exception {
        List<ChannelSource> sources = new ArrayList<>();
        JSONArray sourceArray = item.optJSONArray("sources");

        if (sourceArray != null) {
            for (int index = 0; index < sourceArray.length(); index++) {
                JSONObject source = sourceArray.getJSONObject(index);
                String url = source.optString("url", "");
                if (!url.startsWith("http://") && !url.startsWith("https://")) {
                    continue;
                }
                sources.add(new ChannelSource(decorateSourceName(source.optString("name", "Fuente " + (index + 1)), url, source.optString("quality")), url));
            }
            sortSourcesByQuality(sources);
            return sources;
        }

        String url = item.optString("url", "");
        if (url.startsWith("http://") || url.startsWith("https://")) {
            sources.add(new ChannelSource("Principal", url));
        }

        return sources;
    }

    private void sortSourcesByQuality(List<ChannelSource> sources) {
        Collections.sort(sources, (left, right) -> Integer.compare(sourceRank(left.url), sourceRank(right.url)));
    }

    private String decorateSourceName(String name, String url, String quality) {
        String label = normalizeSourceQuality(url, quality);
        if (label.isEmpty()) {
            return name;
        }

        String normalizedName = normalizeText(name);
        String normalizedLabel = normalizeText(label);
        if (normalizedName.contains(normalizedLabel) || normalizedName.contains("1080") || normalizedName.contains("hd")) {
            return name;
        }

        return name + " · " + label;
    }

    private String normalizeSourceQuality(String url, String quality) {
        String rawQuality = firstNonEmpty(quality);
        if (!rawQuality.isEmpty()) {
            return rawQuality;
        }

        String normalizedUrl = normalizeText(url);
        if (normalizedUrl.contains("streamhdx.xyz")) {
            return "HD 1080";
        }

        if (normalizedUrl.contains("stream-xhd.com/channel2") || normalizedUrl.contains("stream-xhd.com/channel3")) {
            return "HD";
        }

        return "";
    }

    private int sourceRank(String url) {
        String normalizedUrl = normalizeText(url);
        if (normalizedUrl.contains("streamhdx.xyz")) {
            return 0;
        }
        if (normalizedUrl.contains("stream-xhd.com/channel2") || normalizedUrl.contains("stream-xhd.com/channel3")) {
            return 1;
        }
        if (normalizedUrl.contains("stream-xhd.com/live1")) {
            return 2;
        }
        return 3;
    }

    private String readRawJson() throws Exception {
        InputStream input = context.getResources().openRawResource(R.raw.channels);
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        byte[] buffer = new byte[4096];
        int read;

        while ((read = input.read(buffer)) != -1) {
            output.write(buffer, 0, read);
        }

        input.close();
        return output.toString(StandardCharsets.UTF_8.name());
    }

    private String fetchText(String urlString) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(urlString).openConnection();
        connection.setConnectTimeout(8000);
        connection.setReadTimeout(10000);
        connection.setRequestProperty("Accept", "application/json,text/plain,*/*");
        connection.setRequestProperty("User-Agent", "CanalesMundialTV/3.0 AndroidTV");

        try {
            int status = connection.getResponseCode();
            if (status < 200 || status >= 300) {
                throw new IllegalStateException("HTTP " + status);
            }

            InputStream input = new BufferedInputStream(connection.getInputStream());
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            byte[] buffer = new byte[4096];
            int read;

            while ((read = input.read(buffer)) != -1) {
                output.write(buffer, 0, read);
            }

            input.close();
            return output.toString(StandardCharsets.UTF_8.name());
        } finally {
            connection.disconnect();
        }
    }

    private boolean isWorldCupEvent(JSONObject event, JSONObject league) {
        String text = normalizeText(event.optString("code") + " "
                + event.optString("league") + " "
                + event.optString("competition") + " "
                + event.optString("tournament") + " "
                + league.optString("name"));
        return text.contains("mundial") || text.contains("copa del mundo") || text.contains("world cup");
    }

    private Date parseEventDate(JSONObject event) {
        String value = firstNonEmpty(event.optString("time"), event.optString("datetime"), event.optString("date"));
        if (value.isEmpty()) {
            return null;
        }

        String zoneName = firstNonEmpty(event.optString("timezone"), event.optString("tz"), "America/Lima");
        TimeZone zone = TimeZone.getTimeZone(zoneName);
        return parseEventDate(value, zone);
    }

    private String chooseAgendaDateKey(List<EventCandidate> candidates) {
        List<String> dates = new ArrayList<>();
        for (EventCandidate candidate : candidates) {
            if (!candidate.dateKey.isEmpty() && !dates.contains(candidate.dateKey)) {
                dates.add(candidate.dateKey);
            }
        }

        Collections.sort(dates);
        String today = agendaDateKey(new Date());
        if (dates.contains(today)) {
            return today;
        }

        for (String date : dates) {
            if (date.compareTo(today) > 0) {
                return date;
            }
        }

        return dates.isEmpty() ? "" : dates.get(0);
    }

    private String agendaDateKey(Date date) {
        SimpleDateFormat dayFormat = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
        dayFormat.setTimeZone(AGENDA_TIME_ZONE);
        return dayFormat.format(date);
    }

    private String formatEventSlot(Date date) {
        SimpleDateFormat timeFormat = new SimpleDateFormat("HH:mm", Locale.US);
        timeFormat.setTimeZone(AGENDA_TIME_ZONE);

        String dateKey = agendaDateKey(date);
        if (dateKey.equals(agendaDateKey(new Date()))) {
            return "Hoy " + timeFormat.format(date);
        }

        return dateKey + " " + timeFormat.format(date);
    }

    private Date parseEventDate(String value, TimeZone zone) {
        String text = value.trim();
        String[] patterns = {
                "yyyy-MM-dd HH:mm",
                "yyyy-MM-dd HH:mm:ss",
                "yyyy-MM-dd'T'HH:mm:ss'Z'",
                "yyyy-MM-dd'T'HH:mm:ssXXX"
        };

        for (String pattern : patterns) {
            try {
                SimpleDateFormat format = new SimpleDateFormat(pattern, Locale.US);
                format.setLenient(false);
                format.setTimeZone(pattern.contains("XXX") || pattern.contains("'Z'") ? TimeZone.getTimeZone("UTC") : zone);
                return format.parse(text);
            } catch (Exception ignored) {
            }
        }

        return null;
    }

    private String eventBadge(JSONObject event) {
        String home = teamToFlagCode(event.optString("homeTeam"));
        String away = teamToFlagCode(event.optString("awayTeam"));
        if (!home.isEmpty() && !away.isEmpty()) {
            return flagEmoji(home) + " " + flagEmoji(away);
        }
        return "CUP";
    }

    private String teamToFlagCode(String teamName) {
        String normalized = normalizeText(teamName).replaceAll("[^a-z0-9]+", " ").trim();
        switch (normalized) {
            case "argentina": return "ar";
            case "australia": return "au";
            case "austria": return "at";
            case "belgica":
            case "belgium": return "be";
            case "bosnia":
            case "bosnia and herzegovina":
            case "bosnia herzegovina": return "ba";
            case "brasil":
            case "brazil": return "br";
            case "cabo verde":
            case "cape verde": return "cv";
            case "canada": return "ca";
            case "chile": return "cl";
            case "colombia": return "co";
            case "croacia":
            case "croatia": return "hr";
            case "curacao": return "cw";
            case "ecuador": return "ec";
            case "egipto":
            case "egypt": return "eg";
            case "england": return "gb";
            case "espana":
            case "spain": return "es";
            case "francia":
            case "france": return "fr";
            case "alemania":
            case "germany": return "de";
            case "ghana": return "gh";
            case "haiti": return "ht";
            case "iran": return "ir";
            case "iraq": return "iq";
            case "japon":
            case "japan": return "jp";
            case "mexico": return "mx";
            case "marruecos":
            case "morocco": return "ma";
            case "netherlands":
            case "paises bajos": return "nl";
            case "nueva zelanda":
            case "new zealand": return "nz";
            case "paraguay": return "py";
            case "portugal": return "pt";
            case "qatar": return "qa";
            case "arabia saudita":
            case "saudi arabia": return "sa";
            case "scotland":
            case "escocia": return "gb";
            case "south africa":
            case "sudafrica": return "za";
            case "south korea":
            case "corea del sur": return "kr";
            case "sweden":
            case "suecia": return "se";
            case "switzerland":
            case "suiza": return "ch";
            case "tunisia":
            case "tunez": return "tn";
            case "turkey":
            case "turquia": return "tr";
            case "united states":
            case "usa":
            case "estados unidos": return "us";
            case "uruguay": return "uy";
            default: return "";
        }
    }

    private String flagEmoji(String code) {
        if (code == null || code.length() != 2) {
            return "";
        }
        String upper = code.toUpperCase(Locale.US);
        int first = Character.codePointAt(upper, 0) - 'A' + 0x1F1E6;
        int second = Character.codePointAt(upper, 1) - 'A' + 0x1F1E6;
        return new String(Character.toChars(first)) + new String(Character.toChars(second));
    }

    private String makeTitleFromTeams(JSONObject event) {
        String home = event.optString("homeTeam");
        String away = event.optString("awayTeam");
        if (!home.isEmpty() && !away.isEmpty()) {
            return home + " vs " + away;
        }
        return "";
    }

    private String normalizeLanguage(JSONObject item) {
        StringBuilder raw = new StringBuilder();
        raw.append(item.optString("language")).append(' ')
                .append(item.optString("lang")).append(' ')
                .append(item.optString("idioma")).append(' ')
                .append(item.optString("customLanguages"));

        JSONArray languages = item.optJSONArray("languages");
        if (languages != null) {
            for (int index = 0; index < languages.length(); index++) {
                raw.append(' ').append(languages.optString(index));
            }
        }

        String text = normalizeText(raw.toString());
        if (text.contains("english") || text.contains("ingles")) {
            return "English";
        }
        return "Español";
    }

    private String countryToFlagCode(String country) {
        String normalized = normalizeText(country).replaceAll("[^a-z0-9]+", " ").trim();
        switch (normalized) {
            case "argentina":
                return "ar";
            case "brasil":
            case "brazil":
                return "br";
            case "canada":
                return "ca";
            case "chile":
                return "cl";
            case "colombia":
                return "co";
            case "ecuador":
                return "ec";
            case "espana":
            case "spain":
                return "es";
            case "estados":
            case "estados unidos":
            case "usa":
                return "us";
            case "mexico":
                return "mx";
            case "paraguay":
                return "py";
            case "peru":
                return "pe";
            default:
                return "world";
        }
    }

    private String extractStreamCode(String url) {
        int index = url == null ? -1 : url.indexOf("stream=");
        if (index == -1) {
            return "";
        }
        String value = url.substring(index + "stream=".length());
        int end = value.indexOf('&');
        return end == -1 ? value : value.substring(0, end);
    }

    private boolean isHttpUrl(String url) {
        return url != null && (url.startsWith("http://") || url.startsWith("https://"));
    }

    private boolean isBlocked(String value) {
        String text = normalizeText(value);
        return text.contains("adult") || text.contains("adulto") || text.contains("xxx")
                || text.contains("playboy") || text.contains("venus") || text.contains("+18")
                || text.contains("18+");
    }

    private String firstNonEmpty(String... values) {
        for (String value : values) {
            if (value != null && !value.trim().isEmpty()) {
                return value.trim();
            }
        }
        return "";
    }

    private String normalizeText(String value) {
        String normalized = java.text.Normalizer.normalize(String.valueOf(value), java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        return normalized.toLowerCase(Locale.US);
    }
}
