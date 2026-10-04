// Generated from modules/youtube/src/; edit fragments, then run npm run build --workspace youtube.
(() => {
    const textEncoder = new TextEncoder();
    const utf8 = new TextDecoder("utf-8", { fatal: true });
    const schema = {"BrowseContent":[[58173949,"singleColumnResultsRenderer","SingleColumnResultsRenderer"],[153515154,"elementRenderer","ElementRenderer"],[49399797,"sectionListRenderer","SectionListRenderer"]],"SingleColumnResultsRenderer":[[1,"tabs","BrowseTabSupportedRenderer",true]],"BrowseTabSupportedRenderer":[[58174010,"tabRenderer","TabRenderer"]],"TabRenderer":[[1,"endpoint","TabEndpoint"],[4,"content","BrowseContent"]],"TabEndpoint":[[48687626,"browse","TabBrowseEndpoint"]],"TabBrowseEndpoint":[[3,"params","string"]],"ElementRenderer":[[172660663,"videoRendererContent","VideoRendererContent"]],"VideoRendererContent":[[1,"richItemContents","VideoInfo",true],[2,"renderInfo","RenderInfo"]],"VideoInfo":[[168777401,"videoContext","VideoContext"]],"VideoContext":[[3,"layout","ElementLayout"],[5,"videoContent","VideoContent"]],"ElementLayout":[[172035250,"layoutRender","LayoutRender"]],"VideoContent":[[413471385,"element","ElementModel"],[512694658,"smartSkipButton","SmartSkipButton"],[232954548,"videoLockup","VideoLockup"],[454362329,"sponsoredVideo","bytes"],[491441836,"sponsoredDisplay","bytes"]],"ElementModel":[[1,"data","ElementData"]],"ElementData":[[1829,"shoppingShelf","bytes"]],"SmartSkipButton":[[1,"actions","SmartSkipActions"],[13,"controller","SmartSkipController"],[17,"displayLimit","uint"]],"SmartSkipActions":[[3,"items","SmartSkipAction",true]],"SmartSkipAction":[[9,"displayLimit","uint"]],"SmartSkipController":[[7,"promotionMode","bool"]],"VideoLockup":[[33,"attachments","Attachment",true],[34,"attachmentStateKey","bytes"]],"Attachment":[[9,"products","bytes",true]],"RenderInfo":[[183314536,"layoutRender","LayoutRender"]],"LayoutRender":[[1,"eml","string"]],"SectionListRenderer":[[1,"sectionListSupportedRenderers","SectionListSupportedRenderer",true],[32,"promotedContents","bytes",true]],"SectionListSupportedRenderer":[[50195462,"itemSectionRenderer","ItemSectionRenderer"],[51845067,"shelfRenderer","ShelfRenderer"]],"ItemSectionRenderer":[[1,"richItemContents","RichItemContent",true]],"RichItemContent":[[153515154,"videoWithContextRenderer","ElementRenderer"]],"ShelfRenderer":[[5,"richSectionContent","RichSectionContent"]],"RichSectionContent":[[51431404,"reelShelfRenderer","ReelShelfRenderer"]],"ReelShelfRenderer":[[1,"richItemContents","RichItemContent",true]],"Next":[[7,"content","NextContent"],[8,"onResponseReceivedAction","BrowseContent"],[14,"playerOverlays","PlayerOverlays"],[25,"engagementPanels","EngagementPanel",true]],"EngagementPanel":[[138681066,"renderer","EngagementPanelRenderer"]],"EngagementPanelRenderer":[[3,"content","BrowseContent"]],"NextContent":[[51779735,"nextResult","NextResult"]],"NextResult":[[1,"content","BrowseContent"]],"PlayerOverlays":[[78882851,"renderer","PlayerOverlayRenderer"]],"PlayerOverlayRenderer":[[2,"overflowMenu","bytes"],[3,"related","RelatedOverlay"],[42,"overlayCollections","OverlayCollection",true]],"OverlayCollection":[[401855120,"renderer","OverlayCollectionRenderer"]],"OverlayCollectionRenderer":[[2,"overlays","OverlayItem",true]],"OverlayItem":[[401855122,"content","OverlayContent"]],"OverlayContent":[[1,"item","RichItemContent"]],"RelatedOverlay":[[29209665,"contents","RelatedOverlayContents"]],"RelatedOverlayContents":[[2,"contents","RichItemContent",true]],"Player":[[15,"playerConfig","PlayerConfig"],[60,"overlayCollections","OverlayCollection",true],[61,"paidPromotion","bytes"],[7,"adPlacements","bytes",true],[2,"playabilityStatus","PlayabilityStatus"],[9,"playbackTracking","PlaybackTracking"],[68,"adSlots","bytes",true]],"PlayerConfig":[[1,"granularVariableSpeedConfig","PlaybackSpeedConfig"]],"PlaybackSpeedConfig":[[1,"minimumPlaybackRate","uint"],[2,"maximumPlaybackRate","uint"]],"PlayabilityStatus":[[21,"pictureInPictureRender","PictureInPictureSupportedRenderer"],[11,"backgroundPlayerRender","BackgroundSupportedRenderer"]],"PictureInPictureSupportedRenderer":[[151635310,"pictureInPictureAbility","PictureInPictureAbility"]],"PictureInPictureAbility":[[1,"active","bool"],[4,"f4","uint"],[6,"f6","uint"],[8,"f8","uint"]],"BackgroundSupportedRenderer":[[64657230,"backgroundAbility","BackgroundAbility"]],"BackgroundAbility":[[1,"active","bool"]],"PlaybackTracking":[[18,"pageadViewthroughconversion","bytes"]],"WatchContent":[[2,"player","Player"],[3,"next","Next"]],"EncryptedResponsePart":[[1,"encryptedContent","bytes"],[2,"hmac","bytes"],[3,"iv","bytes"],[4,"compressionAlgorithm","uint"]],"OnesieInnertubeResponse":[[4,"contents","WatchContent",true]]};
    const contentTypes = new Set(["BrowseContent","BrowseTabSupportedRenderer","ElementRenderer","EngagementPanel","EngagementPanelRenderer","ItemSectionRenderer","Next","NextContent","NextResult","OnesieInnertubeResponse","OverlayCollection","OverlayCollectionRenderer","OverlayContent","OverlayItem","Player","PlayerOverlayRenderer","PlayerOverlays","ReelShelfRenderer","RelatedOverlay","RelatedOverlayContents","RichItemContent","RichSectionContent","SectionListRenderer","SectionListSupportedRenderer","ShelfRenderer","SingleColumnResultsRenderer","TabRenderer","VideoContent","VideoContext","VideoInfo","VideoLockup","VideoRendererContent","WatchContent"]);

    const CONFIG_KEY = "YouTubeConfig";
    const QUALITY_KEY = "YouTubeQuality";
    function readConfig(key = CONFIG_KEY, limit = Infinity) {
        // I/O errors must propagate: a failed read is not an empty configuration.
        const stored = $persistentStore.read(key);
        if (typeof stored === "string" && stored.length > limit)
            return {};
        try {
            const value = JSON.parse(stored || "{}");
            return value && typeof value === "object" && !Array.isArray(value)
                ? value
                : {};
        }
        catch {
            return {};
        }
    }
    function writeConfig(config, key = CONFIG_KEY) {
        return $persistentStore.write(JSON.stringify(config), key);
    }

    function concatBytes(chunks) {
        const result = new Uint8Array(chunks.reduce((n, b) => n + b.length, 0));
        let offset = 0;
        for (const bytes of chunks) {
            result.set(bytes, offset);
            offset += bytes.length;
        }
        return result;
    }
    function sameBytes(a, b) {
        return (a === b ||
            (a.length === b.length && a.every((value, i) => value === b[i])));
    }
    function varint(value) {
        const bytes = [];
        do {
            bytes.push((value % 128) | (value > 127 ? 128 : 0));
            value = Math.floor(value / 128);
        } while (value);
        return new Uint8Array(bytes);
    }

    function wireFields(bytes) {
        const fields = [];
        let offset = 0;
        function read() {
            let value = 0, scale = 1;
            for (let i = 0; i < 5; i++) {
                if (offset >= bytes.length)
                    throw new Error("Truncated protobuf varint");
                const byte = bytes[offset++];
                value += (byte & 127) * scale;
                if (!(byte & 128)) {
                    if (value > 0xffffffff)
                        throw new Error("Protobuf length/tag overflow");
                    return value;
                }
                scale *= 128;
            }
            throw new Error("Invalid protobuf varint");
        }
        while (offset < bytes.length) {
            const start = offset, tag = read(), no = Math.floor(tag / 8), wire = tag % 8;
            if (!no)
                throw new Error("Invalid protobuf field");
            let payloadStart = offset;
            if (wire === 2) {
                const length = read();
                payloadStart = offset;
                offset += length;
            }
            else if (wire === 1)
                offset += 8;
            else if (wire === 5)
                offset += 4;
            else if (wire === 0) {
                let count = 0, byte;
                do {
                    if (offset >= bytes.length || count++ === 10)
                        throw new Error("Invalid protobuf integer");
                    byte = bytes[offset++];
                    if (count === 10 && byte > 1)
                        throw new Error("Protobuf integer overflow");
                } while (byte & 128);
            }
            else
                throw new Error("Unsupported protobuf wire type " + wire);
            if (offset > bytes.length)
                throw new Error("Truncated protobuf field");
            fields.push({
                no,
                wire,
                data: bytes.subarray(payloadStart, offset),
                raw: bytes.subarray(start, offset),
            });
        }
        return fields;
    }

    function readInteger(bytes) {
        let value = 0, scale = 1;
        for (const byte of bytes) {
            value += (byte & 127) * scale;
            scale *= 128;
        }
        return value;
    }

    function readOptions(defaults = {}) {
        return typeof $argument === "string" && !$argument.includes("{{{")
            ? { ...defaults, ...JSON.parse($argument) }
            : defaults;
    }

    function platformKey(request) {
        return Object.entries(request.headers ?? {}).some(([name, value]) => name.toLowerCase() === "user-agent" && /music/i.test(value))
            ? "youtubeMusic"
            : "youtube";
    }

    function clearKeys(platform, expected) {
        if (platform === undefined || expected === undefined)
            return;
        const config = readConfig();
        if (!Object.hasOwn(config, platform))
            return;
        const current = config[platform];
        const snapshot = expected;
        if (JSON.stringify([current?.clientKey, current?.encryptKey]) ===
            JSON.stringify([snapshot?.clientKey, snapshot?.encryptKey])) {
            delete config[platform];
            return writeConfig(config);
        }
    }

    function numberValue(bytes) {
        const value = readInteger(bytes);
        if (!Number.isSafeInteger(value))
            throw new Error("Unsafe decoded integer");
        return value;
    }

    function decodeBase64(value) {
        const normalized = value.replace(/[-_\s=]/g, (character) => character === "-" ? "+" : character === "_" ? "/" : "");
        // Preserve the existing decoder's ignored final six bits; validate that character too.
        const partial = normalized.length % 4 === 1;
        const bytes = Uint8Array.fromBase64(partial ? normalized + "A" : normalized);
        return partial ? bytes.subarray(0, -1) : bytes;
    }

    const QUALITY_LIMIT = 64 * 1024;
    function validQuality(value) {
        const record = value;
        return !!(record &&
            typeof record === "object" &&
            !Array.isArray(record) &&
            Number.isInteger(record.height) &&
            record.height > 0 &&
            record.height <= 0x7fffffff &&
            Array.isArray(record.itags) &&
            record.itags.length > 0 &&
            record.itags.length <= 256 &&
            record.itags.every((itag) => Number.isInteger(itag) && itag > 0 && itag <= 0xffffffff) &&
            new Set(record.itags).size === record.itags.length);
    }

    function sameQuality(a, b) {
        return (a !== undefined &&
            a.height === b.height &&
            a.itags.length === b.itags.length &&
            b.itags.every((itag) => a.itags.includes(itag)));
    }
    function cacheQuality(players) {
        if (!players.length)
            return;
        const streams = players
            .map((player) => unknownFields(player).find((field) => field.no === 4 && field.wire === 2)?.data)
            .filter(Boolean);
        if (!streams.length)
            return;
        let stored;
        try {
            stored = readConfig(QUALITY_KEY, QUALITY_LIMIT);
        }
        catch (error) {
            console.log("YouTube quality read: " + error);
            return;
        }
        const cache = Object.create(null);
        let changed = false;
        const keys = Object.keys(stored);
        if (keys.length > 16)
            changed = true;
        for (const id of keys.slice(-16)) {
            const record = stored[id];
            if (id.length > 256 || !validQuality(record)) {
                changed = true;
                continue;
            }
            cache[id] = { height: record.height, itags: record.itags };
            if (Object.keys(record).length !== 2)
                changed = true;
        }
        for (const stream of streams) {
            try {
                const fields = wireFields(stream);
                const url = fields.find((field) => field.no === 15 && field.wire === 2);
                const match = url && /[?&]id=([^&]+)/.exec(utf8.decode(url.data));
                if (!match)
                    continue;
                const id = decodeURIComponent(match[1]), quality = { height: 0, itags: [] };
                if (id.length > 256)
                    continue;
                const itags = new Set();
                let overflow = false;
                for (const field of fields) {
                    if (field.no !== 3 || field.wire !== 2)
                        continue;
                    const format = wireFields(field.data);
                    const mime = format.find((field) => field.no === 5 && field.wire === 2);
                    if (!mime || !utf8.decode(mime.data).startsWith("video/"))
                        continue;
                    const value = (no) => {
                        const field = format.find((field) => field.no === no && field.wire === 0);
                        return field ? numberValue(field.data) : 0;
                    };
                    const height = Math.min(value(7), value(8)), itag = value(1);
                    if (!itag ||
                        !height ||
                        height > 0x7fffffff ||
                        height < quality.height)
                        continue;
                    if (height > quality.height) {
                        quality.height = height;
                        quality.itags = [];
                        itags.clear();
                        overflow = false;
                    }
                    if (overflow || itags.has(itag))
                        continue;
                    if (itags.size === 256) {
                        overflow = true;
                        continue;
                    }
                    itags.add(itag);
                    quality.itags.push(itag);
                }
                if (overflow ||
                    !validQuality(quality) ||
                    sameQuality(cache[id], quality))
                    continue;
                delete cache[id];
                cache[id] = quality;
                changed = true;
            }
            catch (error) {
                console.log("YouTube quality metadata: " + error);
            }
        }
        if (changed) {
            const keys = Object.keys(cache);
            for (const key of keys.slice(0, Math.max(0, keys.length - 16)))
                delete cache[key];
            try {
                let serialized = JSON.stringify(cache);
                while (textEncoder.encode(serialized).length > QUALITY_LIMIT) {
                    delete cache[Object.keys(cache)[0]];
                    serialized = JSON.stringify(cache);
                }
                if (!$persistentStore.write(serialized, QUALITY_KEY))
                    console.log("YouTube quality write failed");
            }
            catch (error) {
                console.log("YouTube quality cache: " + error);
            }
        }
    }

    const AD_LAYOUTS = new Set([
        "inline_injection_entrypoint_layout.eml",
        "video_display_button_group_layout.eml-fe",
        "full_width_portrait_image_layout.eml-fe",
        "full_width_square_image_layout.eml-fe",
        "video_display_full_buttoned_layout.eml-fe",
    ]);
    // Match active shopping components, not product words in titles or URLs.
    const SHOPPING_LAYOUT = /^(?:shopping_|products?_in_video_)[a-z0-9_]+\.eml(?:-js)?(?:-fe)?$/;
    const AD_TRACKING = textEncoder.encode("/pagead/");
    const GAME_CARD = textEncoder.encode("mini_game_card.eml");
    const STORE_CARD = textEncoder.encode("shopping_item_card_list.eml");
    const STORE_TAB = textEncoder.encode("store");
    const LIVE_BADGE = textEncoder.encode("youtube_outline_experimental/live_24pt");
    const IMMERSIVE_LIVE = textEncoder.encode("immersive_live");
    function containsMarker(bytes, marker = AD_TRACKING) {
        if (!marker.length)
            return true;
        const end = bytes.length - marker.length;
        let probes = 0, windowStart = 0;
        for (let i = bytes.indexOf(marker[0]); i >= 0 && i <= end; i = bytes.indexOf(marker[0], i + 1)) {
            let matched = true;
            for (let j = 1; j < marker.length; j++)
                if (bytes[i + j] !== marker[j]) {
                    matched = false;
                    break;
                }
            if (matched)
                return true;
            if (++probes === 8) {
                // Native search wins for sparse candidates; dense prefixes favor direct scanning.
                if (i - windowStart < 256)
                    return scanMarkerTail(bytes, marker, i + 1);
                windowStart = i;
                probes = 0;
            }
        }
        return false;
    }
    function scanMarkerTail(bytes, marker, start) {
        outer: for (let i = start; i <= bytes.length - marker.length; i++) {
            for (let j = 0; j < marker.length; j++)
                if (bytes[i + j] !== marker[j])
                    continue outer;
            return true;
        }
        return false;
    }
    function hasVerticalLiveTarget(lockup) {
        let bytes = unknownFields(lockup).find((field) => field.no === 18 && field.wire === 2)?.data;
        // Primary tap target only; a channel avatar may link to a different live.
        try {
            for (const no of [4, 169495254, 462702848, 1, 139608561, 50, 7, 3]) {
                if (!bytes)
                    return false;
                bytes = wireFields(bytes).find((field) => field.no === no && field.wire === 2)?.data;
            }
            return !!bytes && sameBytes(bytes, IMMERSIVE_LIVE);
        }
        catch {
            return false;
        }
    }
    function isStoreTab(item) {
        const params = item.tabRenderer
            ?.endpoint?.browse?.params;
        if (!params)
            return false;
        try {
            const target = wireFields(decodeBase64(decodeURIComponent(params))).find((field) => field.no === 2 && field.wire === 2);
            return !!target && sameBytes(target.data, STORE_TAB);
        }
        catch {
            return false;
        }
    }
    function isBlockedObject(object, blockGames, blockVerticalLive, blockStore) {
        const layout = object.layoutRender?.eml?.split("|")[0];
        if (AD_LAYOUTS.has(layout) ||
            (blockStore &&
                (SHOPPING_LAYOUT.test(layout ?? "") || object.shoppingShelf)) ||
            object.sponsoredVideo ||
            object.sponsoredDisplay ||
            (blockVerticalLive &&
                object.videoLockup &&
                hasVerticalLiveTarget(object.videoLockup)))
            return true;
        return unknownFields(object).some((field) => field.wire === 2 &&
            (containsMarker(field.data) ||
                (blockStore && field.no === 400157044) ||
                field.no === 455507059 ||
                (blockVerticalLive &&
                    field.no === 519005951 &&
                    containsMarker(field.data, LIVE_BADGE)) ||
                (field.no === 312131490 &&
                    ((blockGames && containsMarker(field.data, GAME_CARD)) ||
                        (blockStore &&
                            containsMarker(field.data, STORE_CARD))))));
    }
    function transformContent(message, { blockGames = true, blockVerticalLive = false, jumpAhead = true, blockStore = true, } = {}) {
        let changed = transformMenus(message);
        const BLOCKED = 1, EMPTY = 2;
        const filtered = new Set(["richItemContents", "overlays"]);
        const pruned = new Set([
            "richItemContents",
            "contents",
            "sectionListSupportedRenderers",
            "overlayCollections",
        ]);
        const wrappers = new Set([
            "videoWithContextRenderer",
            "videoRendererContent",
            "itemSectionRenderer",
            "shelfRenderer",
            "richSectionContent",
            "reelShelfRenderer",
            "renderer",
            "content",
            "item",
        ]);
        function visit(object, classify = false) {
            if (!object || typeof object !== "object" || ArrayBuffer.isView(object))
                return 0;
            if (Array.isArray(object)) {
                let flags = 0;
                for (const child of object)
                    flags |= visit(child, classify) & BLOCKED;
                return flags;
            }
            // Local and descendant blocking facts describe the pre-edit tree.
            let blocked = classify &&
                isBlockedObject(object, blockGames, blockVerticalLive, blockStore);
            const layout = object.renderInfo?.layoutRender?.eml?.split("|")[0];
            let empty = AD_LAYOUTS.has(layout) ||
                (blockStore && SHOPPING_LAYOUT.test(layout ?? ""));
            if (classify && (blocked || empty))
                return BLOCKED;
            const state = object[wireState];
            for (const name of Object.keys(object)) {
                if (!classify && state?.deferred) {
                    const spec = schema[state.type].find(([, key]) => key === name);
                    if (spec &&
                        !contentTypes.has(spec[2]) &&
                        !filtered.has(name) &&
                        !pruned.has(name) &&
                        name !== "promotedContents" &&
                        !(blockStore && (name === "tabs" || name === "attachments")))
                        continue;
                }
                const child = object[name];
                if (!child ||
                    typeof child !== "object" ||
                    ArrayBuffer.isView(child))
                    continue;
                if (!Array.isArray(child)) {
                    const flags = visit(child, classify);
                    if (classify && flags & BLOCKED)
                        return BLOCKED;
                    blocked = !!(flags & BLOCKED) || blocked;
                    if (flags & EMPTY && wrappers.has(name))
                        empty = true;
                    continue;
                }
                let keep;
                const filterItems = filtered.has(name), pruneItems = pruned.has(name);
                const filterTabs = blockStore && name === "tabs", filterAttachments = blockStore && name === "attachments";
                const filterPromoted = name === "promotedContents";
                for (let index = 0; index < child.length; index++) {
                    const item = child[index];
                    const direct = (filterTabs && isStoreTab(item)) ||
                        (filterAttachments &&
                            item.products?.length) ||
                        (filterPromoted && containsMarker(item));
                    const flags = direct && !classify
                        ? 0
                        : visit(item, classify || filterItems);
                    if (classify && flags & BLOCKED)
                        return BLOCKED;
                    // Aggregate before deletion: an outer candidate still contains its original ad.
                    blocked = !!(flags & BLOCKED) || blocked;
                    const remove = direct ||
                        (filterItems && flags & BLOCKED) ||
                        (pruneItems && flags & EMPTY);
                    if (remove)
                        keep ??= child.slice(0, index);
                    else if (keep)
                        keep.push(item);
                }
                if (keep) {
                    setField(object, name, keep);
                    changed = true;
                    if (!keep.length && (filterItems || pruneItems))
                        empty = true;
                }
                if (blockStore &&
                    name === "attachments" &&
                    !(keep ?? child).length &&
                    object.attachmentStateKey !== undefined)
                    changed = removeField(object, "attachmentStateKey") || changed;
            }
            if (jumpAhead && object.smartSkipButton)
                changed =
                    unlockJumpAhead(object.smartSkipButton) ||
                        changed;
            return (blocked ? BLOCKED : 0) | (empty ? EMPTY : 0);
        }
        visit(message);
        return changed;
    }
    function unlockJumpAhead(button) {
        let changed = false;
        const controller = button.controller;
        // smart_skip_button.eml selects a promo placeholder when field 7 is
        // true, and the client's timely_action button when false. Keep every
        // timing, gesture, entity binding and native seek action unchanged.
        if (controller?.promotionMode === true) {
            setField(controller, "promotionMode", false);
            changed = true;
        }
        // The client checks both total and per-action display counters. Use
        // YouTube's existing unlimited sentinel without resetting client state.
        if (button.actions?.items?.length)
            for (const target of [button, ...button.actions.items]) {
                if (target.displayLimit === 0x7fffffff)
                    continue;
                setField(target, "displayLimit", 0x7fffffff);
                changed = true;
            }
        return changed;
    }
    function transformMenus(message) {
        const overlay = message.playerOverlays?.renderer;
        if (!overlay?.overflowMenu)
            return false;
        try {
            const menu = unlockSpeedMenu(overlay.overflowMenu);
            const changed = !sameBytes(menu, overlay.overflowMenu);
            if (changed)
                setField(overlay, "overflowMenu", menu);
            return changed;
        }
        catch (error) {
            console.log("YouTube speed menu: " + error);
            return false;
        }
    }
    function unlockSpeedMenu(bytes) {
        const upsell = textEncoder.encode("PApremium_upsell");
        // Overflow item → inline panel → playback-rate selector model (1602).
        return rewriteBinaryPath(bytes, [
            66439850, 1, 153515154, 172660663, 1, 168777401, 5, 407694004, 4, 4,
            170382688, 1, 169495254, 443434441, 1, 1, 441573002, 4, 153515154,
            172660663, 1, 168777401, 5, 413471385, 1, 1602,
        ], (selector) => {
            const fields = wireFields(selector);
            const maximum = fields.find((field) => field.no === 5 && field.wire === 5);
            if (!maximum)
                return selector;
            const rate = new DataView(maximum.data.buffer, maximum.data.byteOffset, 4).getFloat32(0, true);
            if (!(rate > 0))
                return selector; // Keep disabled/live controls disabled.
            const limit = new Uint8Array(4);
            new DataView(limit.buffer).setFloat32(0, Math.max(4, rate), true);
            const expanded = concatBytes(fields.map((field) => field === maximum && rate < 4
                ? concatBytes([varint(45), limit])
                : field.raw));
            // Presets already contain the real rate action; field 3 overrides it
            // with the Premium panel. Remove only that preset-specific override.
            return rewriteBinaryPath(expanded, [10, 1674], (preset) => {
                const fields = wireFields(preset);
                const keep = fields.filter((field) => field.no !== 3 ||
                    field.wire !== 2 ||
                    !containsMarker(field.data, upsell));
                return keep.length === fields.length
                    ? preset
                    : concatBytes(keep.map((field) => field.raw));
            });
        });
    }
    function transformPlayer(player, parameters) {
        let changed = transformContent(player, parameters);
        changed = removeField(player, "paidPromotion") || changed;
        for (const name of ["adPlacements", "adSlots"])
            if (player[name]?.length) {
                setField(player, name, []);
                changed = true;
            }
        const speed = player.playerConfig?.granularVariableSpeedConfig;
        if (speed?.maximumPlaybackRate !== undefined &&
            speed.maximumPlaybackRate > 0 &&
            speed.maximumPlaybackRate < 400) {
            setField(speed, "maximumPlaybackRate", 400);
            changed = true;
        }
        if (player.playbackTracking)
            changed =
                removeField(player.playbackTracking, "pageadViewthroughconversion") || changed;
        const status = player.playabilityStatus;
        if (status) {
            const pip = status.pictureInPictureRender ?? {};
            setField(status, "pictureInPictureRender", pip);
            const ability = pip.pictureInPictureAbility ?? {};
            setField(pip, "pictureInPictureAbility", ability);
            changed = setField(ability, "active", true) || changed;
            changed = setField(ability, "f4", 0) || changed;
            changed = setField(ability, "f6", 0) || changed;
            changed = setField(ability, "f8", 1) || changed;
            const background = status.backgroundPlayerRender ?? {};
            setField(status, "backgroundPlayerRender", background);
            const backgroundAbility = background.backgroundAbility ?? {};
            setField(background, "backgroundAbility", backgroundAbility);
            changed = setField(backgroundAbility, "active", true) || changed;
        }
        return changed;
    }
    function removeField(message, name) {
        if (message[name] === undefined)
            return false;
        delete message[name];
        if (message[wireState])
            markChanged(message[wireState], name);
        return true;
    }

    function transformWatch(message, parameters) {
        let changed = false;
        for (const content of message.contents) {
            if (content.player)
                changed = transformPlayer(content.player, parameters) || changed;
            if (content.next)
                changed = transformContent(content.next, parameters) || changed;
        }
        return changed;
    }

    const fieldSpecs = Object.create(null);
    const wireState = Symbol("wireState");
    function markChanged(state, name) {
        while (state) {
            (state.changed ??= new Set()).add(name);
            name = state.parentName;
            state = state.parent;
        }
    }
    function readField(field, depth, state) {
        const [, name, kind] = field.spec;
        return kind === "bytes"
            ? field.data
            : kind === "string"
                ? utf8.decode(field.data)
                : kind === "bool"
                    ? numberValue(field.data) !== 0
                    : kind === "uint"
                        ? numberValue(field.data)
                        : decodeMessage(kind, field.data, depth + 1, state, name);
    }
    function decodeMessage(type, bytes, depth = 0, parent, parentName) {
        if (depth > 64)
            throw new Error("Protobuf nesting limit");
        const message = {}, fields = wireFields(bytes);
        const counts = fields.length > 1 ? new Map() : null;
        const state = { bytes, fields, parent, parentName };
        const specs = (fieldSpecs[type] ??= new Map(schema[type].map((spec) => [spec[0], spec])));
        Object.defineProperty(message, wireState, { value: state });
        for (const [, name, , repeated] of schema[type])
            if (repeated)
                message[name] = [];
        if (counts)
            for (const field of fields) {
                const spec = specs.get(field.no);
                if (!spec ||
                    field.wire !==
                        (spec[2] === "bool" || spec[2] === "uint" ? 0 : 2))
                    continue;
                field.spec = spec;
                if (!spec[3])
                    counts.set(spec[1], (counts.get(spec[1]) ?? 0) + 1);
            }
        let lazyNames;
        for (const field of fields) {
            const spec = counts ? field.spec : specs.get(field.no);
            if (!spec ||
                field.wire !== (spec[2] === "bool" || spec[2] === "uint" ? 0 : 2))
                continue;
            field.spec = spec;
            const [, name, kind, repeated] = spec;
            if (!repeated && (counts?.get(name) ?? 0) > 1) {
                delete field.spec;
                continue;
            }
            // Normal content stays eager; only present optional branches get a getter.
            if (schema[kind] && !contentTypes.has(kind)) {
                if (lazyNames?.has(name))
                    continue;
                (lazyNames ??= new Set()).add(name);
                const records = fields.filter((candidate) => candidate.spec?.[1] === name);
                state.type = type;
                state.deferred = true;
                Object.defineProperty(message, name, {
                    enumerable: true,
                    configurable: true,
                    get() {
                        const value = repeated
                            ? records.map((record) => readField(record, depth, state))
                            : readField(records[0], depth, state);
                        Object.defineProperty(message, name, {
                            value,
                            enumerable: true,
                            writable: true,
                            configurable: true,
                        });
                        return value;
                    },
                });
            }
            else {
                const value = readField(field, depth, state);
                if (repeated)
                    message[name].push(value);
                else
                    message[name] = value;
            }
        }
        return message;
    }
    function setField(message, name, value) {
        const previous = message[name];
        const same = Array.isArray(previous) && Array.isArray(value)
            ? previous.length === value.length &&
                previous.every((item, i) => item === value[i])
            : previous === value;
        if (same)
            return false;
        message[name] = value;
        if (message[wireState])
            markChanged(message[wireState], name);
        return true;
    }
    function encodeField(spec, value) {
        const [no, , kind] = spec, wire = kind === "bool" || kind === "uint" ? 0 : 2;
        const data = kind === "bytes"
            ? value
            : kind === "string"
                ? textEncoder.encode(value)
                : kind === "bool"
                    ? varint(value ? 1 : 0)
                    : kind === "uint"
                        ? varint(value)
                        : encodeMessage(kind, value);
        return concatBytes(wire === 2
            ? [varint(no * 8 + wire), varint(data.length), data]
            : [varint(no * 8), data]);
    }
    function encodeMessage(type, message) {
        const state = message[wireState];
        if (state && !state.changed)
            return state.bytes;
        // Repeated edits filter existing values or append new ones; survivors keep wire order.
        const chunks = [], remaining = new Map(), handled = new Set();
        const identity = (value, kind) => schema[kind]
            ? (value[wireState]?.bytes ?? value)
            : value;
        function values(spec) {
            const [, name, , repeated] = spec;
            return repeated
                ? (message[name] ?? [])
                : message[name] === undefined
                    ? []
                    : [message[name]];
        }
        for (const spec of schema[type]) {
            const [, name, kind, repeated] = spec;
            if (!repeated || !state?.changed?.has(name))
                continue;
            remaining.set(name, new Map(values(spec).map((value) => [identity(value, kind), value])));
        }
        for (const field of state?.fields ?? []) {
            if (!field.spec || !state.changed.has(field.spec[1])) {
                chunks.push(field.raw);
                continue;
            }
            const [, name, kind, repeated] = field.spec;
            handled.add(name);
            if (repeated) {
                const pending = remaining.get(name);
                if (!pending.has(field.data))
                    continue;
                const value = pending.get(field.data);
                pending.delete(field.data);
                chunks.push(!schema[kind] ||
                    !value[wireState]?.changed
                    ? field.raw
                    : encodeField(field.spec, value));
            }
            else {
                const value = message[name];
                if (value !== undefined)
                    chunks.push(identity(value, kind) === field.data &&
                        (!schema[kind] ||
                            !value[wireState]?.changed)
                        ? field.raw
                        : encodeField(field.spec, value));
            }
        }
        for (const spec of schema[type]) {
            const [, name, , repeated] = spec;
            if (state && !state.changed.has(name))
                continue;
            if (repeated && remaining.has(name)) {
                for (const value of remaining.get(name).values())
                    chunks.push(encodeField(spec, value));
            }
            else if (!handled.has(name))
                for (const value of values(spec))
                    chunks.push(encodeField(spec, value));
        }
        const output = concatBytes(chunks);
        return state && sameBytes(output, state.bytes) ? state.bytes : output;
    }
    function codec(type) {
        return {
            fromBinary: (bytes) => decodeMessage(type, bytes),
            toBinary: (message) => encodeMessage(type, message),
        };
    }
    const EMPTY_FIELDS = [];
    function unknownFields(message) {
        const state = message[wireState];
        if (!state)
            return EMPTY_FIELDS;
        if (state.unknown)
            return state.unknown;
        if (!state.fields.length ||
            (state.fields.length === 1 && state.fields[0].spec))
            return EMPTY_FIELDS;
        let unknown;
        for (const field of state.fields)
            if (!field.spec)
                (unknown ??= []).push(field);
        return (state.unknown = unknown ?? EMPTY_FIELDS);
    }
    // Edit a declared binary path; keep all siblings and repeated occurrences.
    function rewriteBinaryPath(bytes, path, transform) {
        if (!path.length)
            return transform(bytes);
        let changed = false;
        const chunks = wireFields(bytes).map((field) => {
            if (field.no !== path[0] || field.wire !== 2)
                return field.raw;
            const data = rewriteBinaryPath(field.data, path.slice(1), transform);
            if (sameBytes(data, field.data))
                return field.raw;
            changed = true;
            return encodeField([field.no, "", "bytes"], data);
        });
        return changed ? concatBytes(chunks) : bytes;
    }

    class UmpReader {
        constructor(buffer) {
            this.buffer = buffer;
            this.offset = 0;
        }
        readByte() {
            if (this.offset >= this.buffer.length)
                throw new Error("Truncated UMP header");
            return this.buffer[this.offset++];
        }
        readVarint() {
            const first = this.readByte();
            let size = 5;
            for (let candidate = 1; candidate < 5; candidate++) {
                if (!(first & (128 >> (candidate - 1)))) {
                    size = candidate;
                    break;
                }
            }
            let bits = size === 5 ? 0 : 8 - size;
            let value = size === 5 ? 0 : first & ((1 << bits) - 1);
            for (let index = 1; index < size; index++, bits += 8)
                value += this.readByte() * 2 ** bits;
            return value;
        }
        readPart() {
            const start = this.offset;
            const type = this.readVarint(), length = this.readVarint();
            if (length > this.buffer.length - this.offset)
                throw new Error("Truncated UMP payload");
            const data = this.buffer.subarray(this.offset, this.offset + length);
            this.offset += length;
            return {
                type,
                data,
                originalData: data,
                raw: this.buffer.subarray(start, this.offset),
            };
        }
        get hasNext() {
            return this.offset < this.buffer.length;
        }
    }
    class UmpWriter {
        constructor(capacity = 1024) {
            this.buffer = new Uint8Array(capacity);
            this.length = 0;
        }
        ensureCapacity(length) {
            if (this.length + length <= this.buffer.length)
                return;
            const buffer = new Uint8Array(Math.max(this.buffer.length * 2, this.length + length));
            buffer.set(this.buffer);
            this.buffer = buffer;
        }
        writeByte(value) {
            this.ensureCapacity(1);
            this.buffer[this.length++] = value & 255;
        }
        writeVarint(value) {
            if (!Number.isInteger(value) || value < 0 || value > 0xffffffff)
                throw new Error("Invalid UMP integer");
            const size = value < 128
                ? 1
                : value < 16384
                    ? 2
                    : value < 2097152
                        ? 3
                        : value < 268435456
                            ? 4
                            : 5;
            if (size === 1)
                return this.writeByte(value);
            if (size === 5)
                this.writeByte(240);
            else
                this.writeByte((256 - (256 >> (size - 1))) | (value & ((1 << (8 - size)) - 1)));
            for (let index = 1, shift = size === 5 ? 0 : 8 - size; index < size; index++, shift += 8)
                this.writeByte(Math.floor(value / 2 ** shift));
        }
        writePart({ type, data }) {
            this.writeVarint(type);
            this.writeVarint(data.length);
            this.ensureCapacity(data.length);
            this.buffer.set(data, this.length);
            this.length += data.length;
        }
        finish() {
            return this.buffer.subarray(0, this.length);
        }
    }
    async function transformUmp(body, key, options) {
        let crypto;
        const envelopeCodec = codec("EncryptedResponsePart");
        const contentCodec = codec("OnesieInnertubeResponse");
        const reader = new UmpReader(body), chunks = [];
        const players = [];
        let changed = false;
        let rewriteNextPart = false;
        async function rewritePayload(bytes) {
            const part = envelopeCodec.fromBinary(bytes);
            if (!(part.encryptedContent instanceof Uint8Array) ||
                part.iv?.length !== 16 ||
                part.hmac?.length !== 32)
                throw new Error("Malformed encrypted UMP envelope");
            if ((part.compressionAlgorithm ?? 0) > 1)
                throw new Error("Unsupported UMP compression");
            if (!crypto) {
                const { CryptoContext } = createUmpPrimitives();
                crypto = new CryptoContext(key);
            }
            const decrypted = crypto.decrypt(part);
            const gzipped = decrypted[0] === 31 && decrypted[1] === 139;
            if (part.compressionAlgorithm === 1 && !gzipped)
                throw new Error("Invalid UMP gzip payload");
            const plaintext = gzipped
                ? await transformGzip(decrypted, true)
                : decrypted;
            const content = contentCodec.fromBinary(plaintext);
            if (options.autoHd !== false)
                for (const item of content.contents)
                    if (item.player)
                        players.push(item.player);
            if (!transformWatch(content, options))
                return bytes;
            const output = contentCodec.toBinary(content);
            if (sameBytes(output, plaintext))
                return bytes;
            const compressed = gzipped
                ? await transformGzip(output, false)
                : output;
            const encrypted = crypto.encrypt(compressed);
            setField(part, "encryptedContent", encrypted.encryptedContent);
            setField(part, "hmac", encrypted.hmac);
            return envelopeCodec.toBinary(part);
        }
        while (reader.hasNext) {
            const part = reader.readPart();
            if (part.type === 10) {
                const type = wireFields(part.data).find((field) => field.no === 1 && field.wire === 0);
                rewriteNextPart = !!type && numberValue(type.data) === 25;
            }
            else if (part.type === 11 && rewriteNextPart) {
                part.data = await rewritePayload(part.data);
                rewriteNextPart = false;
            }
            if (part.data === part.originalData)
                chunks.push(part.raw);
            else {
                changed = true;
                const writer = new UmpWriter(part.data.length + 10);
                writer.writePart(part);
                chunks.push(writer.finish());
            }
        }
        return { body: changed ? concatBytes(chunks) : body, players };
    }
    async function transformGzip(bytes, decompress) {
        const stream = decompress
            ? new DecompressionStream("gzip")
            : new CompressionStream("gzip");
        const reader = stream.readable.getReader();
        const writer = stream.writable.getWriter();
        const reading = (async () => {
            const chunks = [];
            let length = 0;
            while (true) {
                const { value, done } = await reader.read();
                if (done)
                    break;
                length += value.length;
                if (decompress && length > 16 * 1024 * 1024)
                    throw new Error("UMP decompression exceeds 16 MiB");
                chunks.push(value);
            }
            return concatBytes(chunks);
        })();
        const writing = (async () => {
            await writer.write(bytes);
            await writer.close();
        })();
        try {
            return (await Promise.all([reading, writing]))[0];
        }
        catch (error) {
            await Promise.allSettled([reader.cancel(error), writer.abort(error)]);
            // Surge's stream rejects concatenated members; its native utility
            // preserves the previous inflater's first-member behavior.
            if (decompress &&
                error?.message ===
                    "Extra bytes past the end.") {
                const firstMember = $utils.ungzip(bytes);
                if (firstMember && firstMember.length <= 16 * 1024 * 1024)
                    return firstMember;
            }
            throw error;
        }
        finally {
            reader.releaseLock();
            writer.releaseLock();
        }
    }

    /*
    Third-party components bundled below use the MIT License.

    @noble/ciphers
    Copyright (c) 2022 Paul Miller (https://paulmillr.com)
    Copyright (c) 2016 Thomas Pornin <pornin@bolet.org>

    @noble/hashes
    Copyright (c) 2022 Paul Miller (https://paulmillr.com)

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
    */
    function createUmpPrimitives() {
        function abytes(value, ...lengths) {
            if (!(value instanceof Uint8Array ||
                (ArrayBuffer.isView(value) &&
                    value.constructor.name === "Uint8Array")))
                throw new Error("Uint8Array expected");
            if (lengths.length && !lengths.includes(value.length))
                throw new Error("Invalid byte length: " + value.length);
        }
        function u32(arr) {
            return new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
        }
        function clean(...arrays) {
            for (const array of arrays)
                array.fill(0);
        }
        function isAligned32(bytes) {
            return bytes.byteOffset % 4 === 0;
        }
        function copyBytes(bytes) {
            return Uint8Array.from(bytes);
        }
        if (new Uint8Array(new Uint32Array([287454020]).buffer)[0] !== 68)
            throw new Error("Non little-endian hardware is not yet supported");
        var BLOCK_SIZE = 16, BLOCK_SIZE32 = 4;
        var POLY = 283;
        function mul2(n) {
            return (n << 1) ^ (POLY & -(n >> 7));
        }
        function mul(a, b) {
            let res = 0;
            for (; b > 0; b >>= 1)
                ((res ^= a & -(b & 1)), (a = mul2(a)));
            return res;
        }
        var sbox = /* @__PURE__ */ (() => {
            let t = new Uint8Array(256);
            for (let i = 0, x2 = 1; i < 256; i++, x2 ^= mul2(x2))
                t[i] = x2;
            let box = new Uint8Array(256);
            box[0] = 99;
            for (let i = 0; i < 255; i++) {
                let x2 = t[255 - i];
                ((x2 |= x2 << 8),
                    (box[t[i]] =
                        (x2 ^ (x2 >> 4) ^ (x2 >> 5) ^ (x2 >> 6) ^ (x2 >> 7) ^ 99) &
                            255));
            }
            return (clean(t), box);
        })();
        var rotr32_8 = (n) => (n << 24) | (n >>> 8), rotl32_8 = (n) => (n << 8) | (n >>> 24);
        function genTtable(sbox2, fn2) {
            if (sbox2.length !== 256)
                throw new Error("Wrong sbox length");
            let T0 = new Uint32Array(256).map((_2, j) => fn2(sbox2[j])), T1 = T0.map(rotl32_8), T2 = T1.map(rotl32_8), T3 = T2.map(rotl32_8), T01 = new Uint32Array(256 * 256), T23 = new Uint32Array(256 * 256), sbox22 = new Uint16Array(256 * 256);
            for (let i = 0; i < 256; i++)
                for (let j = 0; j < 256; j++) {
                    let idx = i * 256 + j;
                    ((T01[idx] = T0[i] ^ T1[j]),
                        (T23[idx] = T2[i] ^ T3[j]),
                        (sbox22[idx] = (sbox2[i] << 8) | sbox2[j]));
                }
            return { sbox2: sbox22, T01, T23 };
        }
        var tableEncoding = /* @__PURE__ */ genTtable(sbox, (s) => (mul(s, 3) << 24) | (s << 16) | (s << 8) | mul(s, 2));
        var xPowers = /* @__PURE__ */ (() => {
            let p2 = new Uint8Array(16);
            for (let i = 0, x2 = 1; i < 16; i++, x2 = mul2(x2))
                p2[i] = x2;
            return p2;
        })();
        function expandKeyLE(key) {
            abytes(key);
            let len = key.length;
            if (![16, 24, 32].includes(len))
                throw new Error("aes: invalid key size, should be 16, 24 or 32, got " + len);
            let { sbox2 } = tableEncoding, toClean = [];
            isAligned32(key) || toClean.push((key = copyBytes(key)));
            let k32 = u32(key), Nk = k32.length, subByte = (n) => applySbox(sbox2, n, n, n, n), xk = new Uint32Array(len + 28);
            xk.set(k32);
            for (let i = Nk; i < xk.length; i++) {
                let t = xk[i - 1];
                (i % Nk === 0
                    ? (t = subByte(rotr32_8(t)) ^ xPowers[i / Nk - 1])
                    : Nk > 6 && i % Nk === 4 && (t = subByte(t)),
                    (xk[i] = xk[i - Nk] ^ t));
            }
            return (clean(...toClean), xk);
        }
        function apply0123(T01, T23, s0, s1, s2, s3) {
            return (T01[((s0 << 8) & 65280) | ((s1 >>> 8) & 255)] ^
                T23[((s2 >>> 8) & 65280) | ((s3 >>> 24) & 255)]);
        }
        function applySbox(sbox2, s0, s1, s2, s3) {
            return (sbox2[(s0 & 255) | (s1 & 65280)] |
                (sbox2[((s2 >>> 16) & 255) | ((s3 >>> 16) & 65280)] << 16));
        }
        function encrypt(xk, s0, s1, s2, s3) {
            let { sbox2, T01, T23 } = tableEncoding, k = 0;
            ((s0 ^= xk[k++]), (s1 ^= xk[k++]), (s2 ^= xk[k++]), (s3 ^= xk[k++]));
            let rounds = xk.length / 4 - 2;
            for (let i = 0; i < rounds; i++) {
                let t02 = xk[k++] ^ apply0123(T01, T23, s0, s1, s2, s3), t12 = xk[k++] ^ apply0123(T01, T23, s1, s2, s3, s0), t22 = xk[k++] ^ apply0123(T01, T23, s2, s3, s0, s1), t32 = xk[k++] ^ apply0123(T01, T23, s3, s0, s1, s2);
                ((s0 = t02), (s1 = t12), (s2 = t22), (s3 = t32));
            }
            let t0 = xk[k++] ^ applySbox(sbox2, s0, s1, s2, s3), t1 = xk[k++] ^ applySbox(sbox2, s1, s2, s3, s0), t2 = xk[k++] ^ applySbox(sbox2, s2, s3, s0, s1), t3 = xk[k++] ^ applySbox(sbox2, s3, s0, s1, s2);
            return { s0: t0, s1: t1, s2: t2, s3: t3 };
        }
        function ctrCounter(xk, nonce, src) {
            (abytes(nonce, BLOCK_SIZE), abytes(src));
            let srcLen = src.length;
            const dst = new Uint8Array(srcLen);
            let ctr2 = nonce, c32 = u32(ctr2), { s0, s1, s2, s3 } = encrypt(xk, c32[0], c32[1], c32[2], c32[3]), src32 = u32(src), dst32 = u32(dst);
            for (let i = 0; i + 4 <= src32.length; i += 4) {
                ((dst32[i + 0] = src32[i + 0] ^ s0),
                    (dst32[i + 1] = src32[i + 1] ^ s1),
                    (dst32[i + 2] = src32[i + 2] ^ s2),
                    (dst32[i + 3] = src32[i + 3] ^ s3));
                let carry = 1;
                for (let i2 = ctr2.length - 1; i2 >= 0; i2--)
                    ((carry = (carry + (ctr2[i2] & 255)) | 0),
                        (ctr2[i2] = carry & 255),
                        (carry >>>= 8));
                ({ s0, s1, s2, s3 } = encrypt(xk, c32[0], c32[1], c32[2], c32[3]));
            }
            let start = BLOCK_SIZE * Math.floor(src32.length / BLOCK_SIZE32);
            if (start < srcLen) {
                let b32 = new Uint32Array([s0, s1, s2, s3]), buf = new Uint8Array(b32.buffer);
                for (let i = start, pos = 0; i < srcLen; i++, pos++)
                    dst[i] = src[i] ^ buf[pos];
                clean(b32);
            }
            return dst;
        }
        function aesCtr(expandedKey, nonce, input) {
            const counter = copyBytes(nonce);
            const source = isAligned32(input) ? input : copyBytes(input);
            try {
                return ctrCounter(expandedKey, counter, source);
            }
            finally {
                clean(counter);
                if (source !== input)
                    clean(source);
            }
        }
        function createView2(arr) {
            return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
        }
        function rotr(word, shift) {
            return (word << (32 - shift)) | (word >>> shift);
        }
        // SHA-2 base
        function Chi(a, b, c) {
            return (a & b) ^ (~a & c);
        }
        function Maj(a, b, c) {
            return (a & b) ^ (a & c) ^ (b & c);
        }
        const SHA256_IV = /* @__PURE__ */ Uint32Array.from([
            1779033703, 3144134277, 1013904242, 2773480762, 1359893119, 2600822924,
            528734635, 1541459225,
        ]);
        // SHA-2
        var SHA256_K = /* @__PURE__ */ Uint32Array.from([
            1116352408, 1899447441, 3049323471, 3921009573, 961987163,
            1508970993, 2453635748, 2870763221, 3624381080, 310598401,
            607225278, 1426881987, 1925078388, 2162078206, 2614888103,
            3248222580, 3835390401, 4022224774, 264347078, 604807628, 770255983,
            1249150122, 1555081692, 1996064986, 2554220882, 2821834349,
            2952996808, 3210313671, 3336571891, 3584528711, 113926993,
            338241895, 666307205, 773529912, 1294757372, 1396182291, 1695183700,
            1986661051, 2177026350, 2456956037, 2730485921, 2820302411,
            3259730800, 3345764771, 3516065817, 3600352804, 4094571909,
            275423344, 430227734, 506948616, 659060556, 883997877, 958139571,
            1322822218, 1537002063, 1747873779, 1955562222, 2024104815,
            2227730452, 2361852424, 2428436474, 2756734187, 3204031479,
            3329325298,
        ]), SHA256_W = /* @__PURE__ */ new Uint32Array(64), SHA256 = class {
            constructor() {
                this.length = 0;
                this.pos = 0;
                this.buffer = new Uint8Array(64);
                this.view = createView2(this.buffer);
                this.set(SHA256_IV[0], SHA256_IV[1], SHA256_IV[2], SHA256_IV[3], SHA256_IV[4], SHA256_IV[5], SHA256_IV[6], SHA256_IV[7]);
            }
            update(data) {
                const { view, buffer } = this;
                const len = data.length;
                for (let pos = 0; pos < len;) {
                    const take = Math.min(64 - this.pos, len - pos);
                    if (take === 64) {
                        const dataView = createView2(data);
                        for (; 64 <= len - pos; pos += 64)
                            this.process(dataView, pos);
                        continue;
                    }
                    buffer.set(data.subarray(pos, pos + take), this.pos);
                    this.pos += take;
                    pos += take;
                    if (this.pos === 64) {
                        this.process(view, 0);
                        this.pos = 0;
                    }
                }
                this.length += data.length;
                clean(SHA256_W);
                return this;
            }
            digest() {
                const { buffer, view, pos } = this;
                buffer[pos] = 128;
                buffer.fill(0, pos + 1);
                if (pos >= 56) {
                    this.process(view, 0);
                    buffer.fill(0);
                }
                view.setBigUint64(56, BigInt(this.length * 8), false);
                this.process(view, 0);
                const output = new Uint8Array(32);
                const outputView = createView2(output);
                const { A, B, C, D, E, F, G, H } = this;
                const state = [A, B, C, D, E, F, G, H];
                for (let i = 0; i < 8; i++)
                    outputView.setUint32(4 * i, state[i], false);
                this.set(0, 0, 0, 0, 0, 0, 0, 0);
                clean(buffer);
                return output;
            }
            // prettier-ignore
            set(A, B, C, D2, E2, F, G, H2) {
                this.A = A | 0, this.B = B | 0, this.C = C | 0, this.D = D2 | 0, this.E = E2 | 0, this.F = F | 0, this.G = G | 0, this.H = H2 | 0;
            }
            process(view, offset) {
                for (let i = 0; i < 16; i++, offset += 4)
                    SHA256_W[i] = view.getUint32(offset, !1);
                for (let i = 16; i < 64; i++) {
                    let W15 = SHA256_W[i - 15], W2 = SHA256_W[i - 2], s0 = rotr(W15, 7) ^ rotr(W15, 18) ^ (W15 >>> 3), s1 = rotr(W2, 17) ^ rotr(W2, 19) ^ (W2 >>> 10);
                    SHA256_W[i] =
                        (s1 + SHA256_W[i - 7] + s0 + SHA256_W[i - 16]) | 0;
                }
                let { A, B, C, D: D2, E: E2, F, G, H: H2 } = this;
                for (let i = 0; i < 64; i++) {
                    let sigma1 = rotr(E2, 6) ^ rotr(E2, 11) ^ rotr(E2, 25), T1 = (H2 +
                        sigma1 +
                        Chi(E2, F, G) +
                        SHA256_K[i] +
                        SHA256_W[i]) |
                        0, T2 = ((rotr(A, 2) ^ rotr(A, 13) ^ rotr(A, 22)) +
                        Maj(A, B, C)) |
                        0;
                    ((H2 = G),
                        (G = F),
                        (F = E2),
                        (E2 = (D2 + T1) | 0),
                        (D2 = C),
                        (C = B),
                        (B = A),
                        (A = (T1 + T2) | 0));
                }
                ((A = (A + this.A) | 0),
                    (B = (B + this.B) | 0),
                    (C = (C + this.C) | 0),
                    (D2 = (D2 + this.D) | 0),
                    (E2 = (E2 + this.E) | 0),
                    (F = (F + this.F) | 0),
                    (G = (G + this.G) | 0),
                    (H2 = (H2 + this.H) | 0),
                    this.set(A, B, C, D2, E2, F, G, H2));
            }
        };
        class CryptoContext {
            constructor(key) {
                this.expandedKey = expandKeyLE(key.slice(0, 16));
                this.hmacKey = key.slice(16);
            }
            signature(content) {
                const pad = new Uint8Array(64);
                pad.set(this.hmacKey.length > 64
                    ? new SHA256().update(this.hmacKey).digest()
                    : this.hmacKey);
                for (let i = 0; i < pad.length; i++)
                    pad[i] ^= 54;
                // Feed ciphertext and IV separately; avoid copying the complete payload.
                const inner = new SHA256()
                    .update(pad)
                    .update(content)
                    .update(this.iv)
                    .digest();
                for (let i = 0; i < pad.length; i++)
                    pad[i] ^= 106;
                const signature = new SHA256().update(pad).update(inner).digest();
                clean(pad, inner);
                return signature;
            }
            decrypt(part) {
                this.iv = part.iv;
                const signature = this.signature(part.encryptedContent);
                if (!equalBytes2(signature, part.hmac))
                    throw new Error("HMAC verification failed");
                return aesCtr(this.expandedKey, this.iv, part.encryptedContent);
            }
            encrypt(content) {
                const encryptedContent = aesCtr(this.expandedKey, this.iv, content);
                return { encryptedContent, hmac: this.signature(encryptedContent) };
            }
        }
        function equalBytes2(left, right) {
            if (left.length !== right.length)
                return false;
            let difference = 0;
            for (let index = 0; index < left.length; index++)
                difference |= left[index] ^ right[index];
            return difference === 0;
        }
        return { CryptoContext };
    }

    async function umpMain() {
        let platform, expected, invalidStoredKey = false;
        try {
            const status = Number($response.status);
            if (status >= 300 && status < 400)
                return $done();
            platform = platformKey($request);
            expected = readConfig()[platform];
            const clientKey = expected?.clientKey;
            if (!clientKey)
                throw new Error("YouTubeConfig requires stored clientKey");
            let key;
            try {
                if (typeof clientKey !== "string")
                    throw new Error("Invalid stored clientKey");
                key = decodeBase64(clientKey);
                if (key.length < 16)
                    throw new Error("Invalid stored clientKey");
            }
            catch (error) {
                invalidStoredKey = true;
                throw error;
            }
            if (!$response.body)
                throw new Error("YouTubeConfig requires body");
            const options = readOptions({ blockGames: true });
            const result = await transformUmp($response.body, key, options);
            if (options.autoHd !== false)
                cacheQuality(result.players);
            $done(result.body === $response.body ? undefined : { body: result.body });
        }
        catch (error) {
            console.log(String(error));
            if (invalidStoredKey ||
                error?.message ===
                    "HMAC verification failed") {
                try {
                    clearKeys(platform, expected);
                }
                catch (storeError) {
                    console.log("YouTube key recovery: " + storeError);
                }
            }
            $done({
                status: 200,
                headers: { "Content-Type": "text/plain" },
                body: new Uint8Array(),
            });
        }
    }

    umpMain();
})();
