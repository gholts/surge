// Discord Enhance: promotion filtering and Quest playback/progress coordination.
// Retimed HLS segments activate progress mapping; metadata alone never does.
// https://github.com/Equicord/Equicord/blob/main/src/equicordplugins/questify/utils/completion.ts
// Cache public Quest metadata and local playback state, never credentials.
// Rewrite existing reports only. Actual elapsed time and server timing remain observable.
(() => {
    const key = "discord.quest.video.targets.v1";
    try {
        const match =
            /^https:\/\/discord\.com\/api\/v[0-9]+\/(quests\/@me|quests\/[0-9]+\/video-progress|science|promotions)(?:\?.*)?$/.exec(
                $request.url,
            );
        if (!match) return $done({});
        const route = match[1];
        if (route === "promotions") {
            if (
                typeof $response === "undefined" ||
                $request.method !== "GET" ||
                $response.status !== 200 ||
                typeof $argument === "undefined" ||
                $argument !== "hide-nitro-promotions"
            )
                return $done({});
            const body = JSON.parse($response.body);
            if (!Array.isArray(body)) return $done({});
            // Captured Nitro gift campaigns carry this explicit reward-list marker.
            const filtered = body.filter(
                (promotion) =>
                    !Array.isArray(
                        promotion?.metadata?.premium_promotion?.reward_sku_ids,
                    ),
            );
            return $done(
                filtered.length === body.length
                    ? {}
                    : { body: JSON.stringify(filtered) },
            );
        }
        const now = Date.now();
        const seconds = Number(
            typeof $argument === "undefined" ? 0 : $argument,
        );

        if (typeof $response !== "undefined") {
            if (
                $request.method !== "GET" ||
                $response.status !== 200 ||
                route !== "quests/@me" ||
                typeof $environment === "undefined" ||
                $environment.system !== "iOS" ||
                !Number.isFinite(seconds) ||
                seconds <= 0 ||
                seconds > 24
            )
                return $done({});
            const body = JSON.parse($response.body);
            const targets = {};
            let previous = {};
            try {
                previous = JSON.parse($persistentStore.read(key) || "{}");
            } catch {
                /* Rebuild a corrupt cache from the fresh response. */
            }
            let changed = false;
            for (const { config } of body.quests) {
                if (!config || !/^[0-9]+$/.test(config.id)) continue;
                const expires = Date.parse(config.expires_at);
                if (!(expires > now)) continue;
                const tasks = config.task_config_v2?.tasks;
                const videoTasks = ["WATCH_VIDEO", "WATCH_VIDEO_ON_MOBILE"]
                    .map((type) => tasks?.[type])
                    .filter(Boolean);
                const durations = videoTasks.map((task) => task.target);
                // Different desktop/mobile durations need platform-specific handling.
                if (
                    !durations.length ||
                    durations.some(
                        (value) =>
                            !Number.isFinite(value) ||
                            value <= 0 ||
                            value !== durations[0],
                    )
                )
                    continue;
                const hlsPattern = new RegExp(
                    `^(?:https://cdn\\.discordapp\\.com/)?quests/${config.id}/([0-9]+)\\.m3u8$`,
                );
                const sources = videoTasks.map((task) =>
                    hlsPattern.exec(task.assets?.video_hls?.url || ""),
                );
                if (sources.some((source) => !source)) continue;
                const videos = [
                    ...new Set(sources.map((source) => source[1])),
                ].sort();
                const speed = Math.min(
                    2,
                    durations[0] / Math.max(1, durations[0] - seconds),
                );
                if (speed <= 1) continue;
                const old = previous?.[config.id];
                targets[config.id] = {
                    target: durations[0],
                    expires,
                    videos,
                    speed,
                    active:
                        old?.active === true &&
                        old.speed === speed &&
                        JSON.stringify(old.videos) === JSON.stringify(videos),
                };
                for (const task of videoTasks) {
                    const url =
                        task.assets.video_hls.url +
                        `?surge_quest_speed=${speed}&surge_quest_v=1`;
                    // iOS AVPlayer supports HLS for both normal and low-resolution sources.
                    for (const name of [
                        "video_hls",
                        "video",
                        "video_low_res",
                    ]) {
                        if (task.assets[name]) task.assets[name].url = url;
                    }
                }
                changed = true;
            }
            if (!$persistentStore.write(JSON.stringify(targets), key))
                return $done({});
            return $done(changed ? { body: JSON.stringify(body) } : {});
        }

        if ($request.method !== "POST" || route === "quests/@me")
            return $done({});
        if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 24)
            return $done({});
        const targets = JSON.parse($persistentStore.read(key) || "{}");
        const body = JSON.parse($request.body);
        let changed = false;

        function playback(questId) {
            const config = targets[questId];
            return config?.active === true &&
                config.expires > now &&
                Number.isFinite(config.target) &&
                config.target > 0 &&
                Number.isFinite(config.speed) &&
                config.speed > 1 &&
                config.speed <= 2
                ? config
                : null;
        }
        function accelerate(value, config) {
            // Preserve initialization and native end reports, including overshoot.
            return config &&
                Number.isFinite(value) &&
                value >= 0.0001 &&
                value < config.target
                ? Math.min(config.target, value * config.speed)
                : value;
        }

        if (route !== "science") {
            const id = route.split("/")[1];
            const timestamp = accelerate(body.timestamp, playback(id));
            if (timestamp !== body.timestamp) {
                console.log(
                    `Discord Quest ${id}: ${body.timestamp} -> ${timestamp}`,
                );
                body.timestamp = timestamp;
                changed = true;
            }
        } else {
            for (const event of body.events) {
                const p = event?.properties;
                if (!p) continue;
                const id = p.quest_id;
                const config = playback(id);
                if (!config) continue;
                if (event.type === "network_action_quest_video_progress") {
                    if (typeof p.timestamp_sec !== "string") continue;
                    const timestamp = accelerate(
                        Number(p.timestamp_sec),
                        config,
                    );
                    if (
                        Number.isFinite(timestamp) &&
                        timestamp !== Number(p.timestamp_sec)
                    ) {
                        p.timestamp_sec = String(timestamp);
                        changed = true;
                    }
                } else if (event.type === "quest_video_progressed") {
                    // In this event the misleadingly named field holds video duration.
                    const duration = p.video_timestamp_seconds;
                    if (
                        !Number.isFinite(duration) ||
                        duration <= 0 ||
                        !Number.isFinite(p.progress) ||
                        p.progress < 0 ||
                        p.progress > 1
                    )
                        continue;
                    const timestamp = accelerate(p.progress * duration, config);
                    p.video_timestamp_seconds = duration * config.speed;
                    p.progress = timestamp / p.video_timestamp_seconds;
                    changed = true;
                } else if (event.type === "quest_video_segment_watched") {
                    if (
                        !Number.isFinite(p.segment_start_sec) ||
                        p.segment_start_sec < 0 ||
                        !Number.isFinite(p.segment_end_sec) ||
                        p.segment_end_sec < p.segment_start_sec
                    )
                        continue;
                    const start = accelerate(p.segment_start_sec, config);
                    const end = accelerate(p.segment_end_sec, config);
                    if (
                        start !== p.segment_start_sec ||
                        end !== p.segment_end_sec
                    ) {
                        p.segment_start_sec = start;
                        p.segment_end_sec = end;
                        p.segment_duration_sec = end - start;
                        changed = true;
                    }
                    if (
                        Number.isFinite(p.video_duration_sec) &&
                        p.video_duration_sec > 0
                    ) {
                        p.video_duration_sec *= config.speed;
                        changed = true;
                    }
                } else if (
                    event.type === "quest_video_app_focused" ||
                    event.type === "quest_video_app_unfocused"
                ) {
                    const timestamp = accelerate(
                        p.video_timestamp_seconds,
                        config,
                    );
                    if (timestamp !== p.video_timestamp_seconds) {
                        p.video_timestamp_seconds = timestamp;
                        changed = true;
                    }
                }
            }
        }
        $done(changed ? { body: JSON.stringify(body) } : {});
    } catch {
        console.log("Discord Enhance: skipped invalid data.");
        $done({});
    }
})();
