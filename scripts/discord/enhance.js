// Discord Enhance: promotion filtering and experimental Quest progress rewriting.
// Quest timing reference: Equicord Questify's 24-second reduction, not a server guarantee.
// https://github.com/Equicord/Equicord/blob/main/src/equicordplugins/questify/utils/completion.ts
// Cache only public durations and expiry dates. Never store account credentials.
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

        if (typeof $response !== "undefined") {
            if (
                $request.method !== "GET" ||
                $response.status !== 200 ||
                route !== "quests/@me"
            )
                return $done({});
            const body = JSON.parse($response.body);
            const targets = {};
            for (const { config } of body.quests) {
                if (!config || !/^[0-9]+$/.test(config.id)) continue;
                const expires = Date.parse(config.expires_at);
                if (!(expires > now)) continue;
                const tasks = config.task_config_v2?.tasks;
                const durations = ["WATCH_VIDEO", "WATCH_VIDEO_ON_MOBILE"]
                    .map((type) => tasks?.[type]?.target)
                    .filter((value) => Number.isFinite(value) && value > 0);
                // Different desktop/mobile durations need platform-specific handling.
                if (
                    !durations.length ||
                    durations.some((value) => value !== durations[0])
                )
                    continue;
                targets[config.id] = { target: durations[0], expires };
            }
            $persistentStore.write(JSON.stringify(targets), key);
            return $done({});
        }

        if ($request.method !== "POST" || route === "quests/@me")
            return $done({});
        const seconds = Number(
            typeof $argument === "undefined" ? 24 : $argument,
        );
        if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 24)
            return $done({});
        const targets = JSON.parse($persistentStore.read(key) || "{}");
        const body = JSON.parse($request.body);
        let changed = false;

        function accelerate(value, questId) {
            const config = targets[questId];
            if (
                !config ||
                !(config.expires > now) ||
                !Number.isFinite(config.target) ||
                config.target <= 0 ||
                !Number.isFinite(value) ||
                value < 1 ||
                value >= config.target
            )
                return;
            // Preserve initialization and native end reports, including overshoot.
            return Math.min(
                config.target,
                (value * config.target) / Math.max(1, config.target - seconds),
            );
        }

        if (route !== "science") {
            const timestamp = accelerate(body.timestamp, route.split("/")[1]);
            if (timestamp !== undefined) {
                body.timestamp = timestamp;
                changed = true;
            }
        } else {
            for (const event of body.events) {
                const p = event?.properties;
                if (!p) continue;
                const id = p.quest_id;
                if (event.type === "network_action_quest_video_progress") {
                    if (typeof p.timestamp_sec !== "string") continue;
                    const timestamp = accelerate(Number(p.timestamp_sec), id);
                    if (timestamp !== undefined) {
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
                    const timestamp = accelerate(p.progress * duration, id);
                    if (timestamp !== undefined && timestamp <= duration) {
                        p.progress = timestamp / duration;
                        changed = true;
                    }
                } else if (event.type === "quest_video_segment_watched") {
                    if (
                        !Number.isFinite(p.segment_start_sec) ||
                        p.segment_start_sec < 0 ||
                        !Number.isFinite(p.segment_end_sec) ||
                        p.segment_end_sec < p.segment_start_sec
                    )
                        continue;
                    const start =
                        accelerate(p.segment_start_sec, id) ??
                        p.segment_start_sec;
                    const end =
                        accelerate(p.segment_end_sec, id) ?? p.segment_end_sec;
                    if (
                        start !== p.segment_start_sec ||
                        end !== p.segment_end_sec
                    ) {
                        p.segment_start_sec = start;
                        p.segment_end_sec = end;
                        p.segment_duration_sec = end - start;
                        changed = true;
                    }
                } else if (
                    event.type === "quest_video_app_focused" ||
                    event.type === "quest_video_app_unfocused"
                ) {
                    const timestamp = accelerate(p.video_timestamp_seconds, id);
                    if (timestamp !== undefined) {
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
