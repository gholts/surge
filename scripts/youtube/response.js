// Generated from modules/youtube/src/; edit fragments, then run npm run build --workspace youtube.
(() => {
    const textEncoder = new TextEncoder();
    const utf8 = new TextDecoder("utf-8", { fatal: true });
    const schema = {"Browse":[[9,"content","BrowseContent"],[10,"onResponseReceivedAction","BrowseContent"]],"BrowseContent":[[58173949,"singleColumnResultsRenderer","SingleColumnResultsRenderer"],[153515154,"elementRenderer","ElementRenderer"],[49399797,"sectionListRenderer","SectionListRenderer"]],"SingleColumnResultsRenderer":[[1,"tabs","BrowseTabSupportedRenderer",true]],"BrowseTabSupportedRenderer":[[58174010,"tabRenderer","TabRenderer"]],"TabRenderer":[[1,"endpoint","TabEndpoint"],[4,"content","BrowseContent"]],"TabEndpoint":[[48687626,"browse","TabBrowseEndpoint"]],"TabBrowseEndpoint":[[3,"params","string"]],"ElementRenderer":[[172660663,"videoRendererContent","VideoRendererContent"]],"VideoRendererContent":[[1,"richItemContents","VideoInfo",true],[2,"renderInfo","RenderInfo"]],"VideoInfo":[[168777401,"videoContext","VideoContext"]],"VideoContext":[[3,"layout","ElementLayout"],[5,"videoContent","VideoContent"]],"ElementLayout":[[172035250,"layoutRender","LayoutRender"]],"VideoContent":[[413471385,"element","ElementModel"],[512694658,"smartSkipButton","SmartSkipButton"],[232954548,"videoLockup","VideoLockup"],[454362329,"sponsoredVideo","bytes"],[491441836,"sponsoredDisplay","bytes"]],"ElementModel":[[1,"data","ElementData"]],"ElementData":[[1829,"shoppingShelf","bytes"]],"SmartSkipButton":[[1,"actions","SmartSkipActions"],[13,"controller","SmartSkipController"],[17,"displayLimit","uint"]],"SmartSkipActions":[[3,"items","SmartSkipAction",true]],"SmartSkipAction":[[9,"displayLimit","uint"]],"SmartSkipController":[[7,"promotionMode","bool"]],"VideoLockup":[[33,"attachments","Attachment",true],[34,"attachmentStateKey","bytes"]],"Attachment":[[9,"products","bytes",true]],"RenderInfo":[[183314536,"layoutRender","LayoutRender"]],"LayoutRender":[[1,"eml","string"]],"SectionListRenderer":[[1,"sectionListSupportedRenderers","SectionListSupportedRenderer",true],[32,"promotedContents","bytes",true]],"SectionListSupportedRenderer":[[50195462,"itemSectionRenderer","ItemSectionRenderer"],[51845067,"shelfRenderer","ShelfRenderer"]],"ItemSectionRenderer":[[1,"richItemContents","RichItemContent",true]],"RichItemContent":[[153515154,"videoWithContextRenderer","ElementRenderer"]],"ShelfRenderer":[[5,"richSectionContent","RichSectionContent"]],"RichSectionContent":[[51431404,"reelShelfRenderer","ReelShelfRenderer"]],"ReelShelfRenderer":[[1,"richItemContents","RichItemContent",true]],"Next":[[7,"content","NextContent"],[8,"onResponseReceivedAction","BrowseContent"],[14,"playerOverlays","PlayerOverlays"],[25,"engagementPanels","EngagementPanel",true]],"EngagementPanel":[[138681066,"renderer","EngagementPanelRenderer"]],"EngagementPanelRenderer":[[3,"content","BrowseContent"]],"NextContent":[[51779735,"nextResult","NextResult"]],"NextResult":[[1,"content","BrowseContent"]],"PlayerOverlays":[[78882851,"renderer","PlayerOverlayRenderer"]],"PlayerOverlayRenderer":[[2,"overflowMenu","bytes"],[3,"related","RelatedOverlay"],[42,"overlayCollections","OverlayCollection",true]],"OverlayCollection":[[401855120,"renderer","OverlayCollectionRenderer"]],"OverlayCollectionRenderer":[[2,"overlays","OverlayItem",true]],"OverlayItem":[[401855122,"content","OverlayContent"]],"OverlayContent":[[1,"item","RichItemContent"]],"RelatedOverlay":[[29209665,"contents","RelatedOverlayContents"]],"RelatedOverlayContents":[[2,"contents","RichItemContent",true]],"Player":[[15,"playerConfig","PlayerConfig"],[60,"overlayCollections","OverlayCollection",true],[61,"paidPromotion","bytes"],[7,"adPlacements","bytes",true],[2,"playabilityStatus","PlayabilityStatus"],[9,"playbackTracking","PlaybackTracking"],[68,"adSlots","bytes",true]],"PlayerConfig":[[1,"granularVariableSpeedConfig","PlaybackSpeedConfig"]],"PlaybackSpeedConfig":[[1,"minimumPlaybackRate","uint"],[2,"maximumPlaybackRate","uint"]],"PlayabilityStatus":[[21,"pictureInPictureRender","PictureInPictureSupportedRenderer"],[11,"backgroundPlayerRender","BackgroundSupportedRenderer"]],"PictureInPictureSupportedRenderer":[[151635310,"pictureInPictureAbility","PictureInPictureAbility"]],"PictureInPictureAbility":[[1,"active","bool"],[4,"f4","uint"],[6,"f6","uint"],[8,"f8","uint"]],"BackgroundSupportedRenderer":[[64657230,"backgroundAbility","BackgroundAbility"]],"BackgroundAbility":[[1,"active","bool"]],"PlaybackTracking":[[18,"pageadViewthroughconversion","bytes"]],"Search":[[4,"content","BrowseContent"],[7,"onResponseReceivedCommand","OnResponseReceivedCommand"]],"OnResponseReceivedCommand":[[50195462,"itemSectionRenderer","ItemSectionRenderer"],[49399797,"appendContinuationItemsAction","SectionListRenderer"]],"Shorts":[[2,"entries","Entry",true]],"Entry":[[1,"command","Command"]],"Command":[[139608561,"reelWatchEndpoint","ReelWatchEndpoint"]],"ReelWatchEndpoint":[[16,"adClientParams","AdClientParams"]],"AdClientParams":[[1,"isAd","bool"]],"Guide":[[4,"labelItems","GuideItem",true],[6,"iconItems","GuideItem",true]],"GuideItem":[[117866661,"guideSectionRenderer","GuideSectionRenderer"]],"GuideSectionRenderer":[[1,"rendererItems","RendererItem",true]],"RendererItem":[[318370163,"iconRender","guideEntryRenderer"],[117501096,"labelRender","guideEntryRenderer"]],"guideEntryRenderer":[[1,"browseId","string"]],"Setting":[[6,"settingItems","SettingItem",true],[7,"collectionItems","SettingItem",true]],"SettingItem":[[88478200,"backgroundPlayBackSettingRenderer","BackgroundPlayBackSettingRenderer"],[66930374,"settingCategoryCollectionRenderer","SettingCategoryCollectionRenderer"]],"BackgroundPlayBackSettingRenderer":[[2,"backgroundPlayback","bool"],[3,"download","bool"],[9,"downloadQualitySelection","bool"],[10,"smartDownload","bool"],[14,"icon","Icon"]],"Icon":[[1,"iconType","uint"]],"SettingCategoryCollectionRenderer":[[3,"subSettings","SubSetting",true],[4,"categoryId","uint"]],"SubSetting":[[61331416,"settingBooleanRenderer","SettingBooleanRenderer"]],"SettingBooleanRenderer":[[5,"enableServiceEndpoint","ServiceEndpoint"],[6,"disableServiceEndpoint","ServiceEndpoint"],[15,"itemId","uint"]],"ServiceEndpoint":[[81212182,"setClientSettingEndpoint","SetClientSettingEndpoint"]],"SetClientSettingEndpoint":[[1,"settingData","SettingData"]],"SettingData":[[1,"clientSettingEnum","ClientSettingEnum"],[3,"boolValue","bool"]],"ClientSettingEnum":[[1,"item","uint"]],"Watch":[[1,"contents","WatchContent",true]],"ResolveUrl":[[2,"endpoint","NavigationEndpoint"]],"NavigationEndpoint":[[48687757,"watch","NavigationWatch"]],"NavigationWatch":[[68146959,"embedded","EmbeddedPlayer"]],"EmbeddedPlayer":[[68202535,"response","EmbeddedPlayerBody"]],"EmbeddedPlayerBody":[[1,"player","Player"]],"WatchContent":[[2,"player","Player"],[3,"next","Next"]]};
    const contentTypes = new Set(["Browse","BrowseContent","BrowseTabSupportedRenderer","ElementRenderer","EmbeddedPlayer","EmbeddedPlayerBody","EngagementPanel","EngagementPanelRenderer","ItemSectionRenderer","NavigationEndpoint","NavigationWatch","Next","NextContent","NextResult","OnResponseReceivedCommand","OverlayCollection","OverlayCollectionRenderer","OverlayContent","OverlayItem","Player","PlayerOverlayRenderer","PlayerOverlays","ReelShelfRenderer","RelatedOverlay","RelatedOverlayContents","ResolveUrl","RichItemContent","RichSectionContent","Search","SectionListRenderer","SectionListSupportedRenderer","ShelfRenderer","SingleColumnResultsRenderer","TabRenderer","VideoContent","VideoContext","VideoInfo","VideoLockup","VideoRendererContent","Watch","WatchContent"]);

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
    const PREMIUM_BROWSE_ID = textEncoder.encode("SPunlimited");
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
    function isPremiumBanner(bytes) {
        // Statement banner's CTA browse ID; independent of localized display text.
        const path = [2, 11, 1, 4, 170382656, 1, 169495254, 48687626, 2];
        function matches(bytes, depth) {
            if (depth === path.length)
                return sameBytes(bytes, PREMIUM_BROWSE_ID);
            const fields = wireFields(bytes).filter((field) => field.no === path[depth] && field.wire === 2);
            // The executor contains a list of commands; other hops are singletons.
            return ((depth === 5 || fields.length === 1) &&
                fields.some((field) => matches(field.data, depth + 1)));
        }
        try {
            return matches(bytes, 0);
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
                (field.no === 325515470 && isPremiumBanner(field.data)) ||
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

    function visitObjects(root, callback) {
        const stack = [root];
        while (stack.length) {
            const object = stack.pop();
            if (!object || typeof object !== "object" || ArrayBuffer.isView(object))
                continue;
            callback(object);
            stack.push(...Object.values(object));
        }
    }
    function responsePlayers(type, message) {
        if (type === "Player")
            return [message];
        if (type === "Watch")
            return message.contents
                .map((content) => content.player)
                .filter(Boolean);
        if (type === "ResolveUrl") {
            const player = message.endpoint?.watch
                ?.embedded?.response?.player;
            return player ? [player] : [];
        }
        return [];
    }
    function removeShortsAds(message) {
        const keep = message.entries.filter((entry) => !entry.command?.reelWatchEndpoint?.adClientParams?.isAd);
        const changed = keep.length !== message.entries.length;
        if (changed)
            setField(message, "entries", keep);
        return changed;
    }
    function filterGuide(message, parameters) {
        const blocked = new Set(["SPunlimited"]);
        if (parameters.blockUpload)
            blocked.add("FEuploads");
        if (parameters.blockShorts)
            blocked.add("FEshorts");
        let changed = false;
        visitObjects(message, (object) => {
            const items = object.rendererItems;
            if (!Array.isArray(items))
                return;
            const keep = items.filter((item) => !blocked.has((item.iconRender?.browseId ?? item.labelRender?.browseId)));
            changed = keep.length !== items.length || changed;
            if (keep.length !== items.length)
                setField(object, "rendererItems", keep);
        });
        return changed;
    }
    function addPremiumSettings(message) {
        let changed = false;
        visitObjects(message, (object) => {
            const category = object;
            if (category.categoryId !== 10135)
                return;
            const endpoint = (enabled) => ({
                setClientSettingEndpoint: {
                    settingData: {
                        clientSettingEnum: { item: 151 },
                        boolValue: enabled,
                    },
                },
            });
            if (!category.subSettings.some((item) => item.settingBooleanRenderer?.enableServiceEndpoint
                ?.setClientSettingEndpoint?.settingData
                ?.clientSettingEnum?.item === 151)) {
                changed = true;
                setField(category, "subSettings", [
                    ...category.subSettings,
                    {
                        settingBooleanRenderer: {
                            itemId: 0,
                            enableServiceEndpoint: endpoint(true),
                            disableServiceEndpoint: endpoint(false),
                        },
                    },
                ]);
            }
        });
        if (!message.settingItems.some((item) => item.backgroundPlayBackSettingRenderer)) {
            changed = true;
            setField(message, "settingItems", [
                ...message.settingItems,
                {
                    backgroundPlayBackSettingRenderer: {
                        backgroundPlayback: true,
                        download: true,
                        downloadQualitySelection: true,
                        smartDownload: true,
                        icon: { iconType: 1093 },
                    },
                },
            ]);
        }
        return changed;
    }
    function transformNavigation(message, parameters) {
        const player = message.endpoint?.watch?.embedded?.response?.player;
        return player ? transformPlayer(player, parameters) : false;
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

    const ROUTES = {
        "navigation/resolve_url": ["ResolveUrl", transformNavigation],
        browse: ["Browse", transformContent],
        next: ["Next", transformContent],
        player: ["Player", transformPlayer],
        search: ["Search", transformContent],
        "reel/reel_watch_sequence": ["Shorts", removeShortsAds],
        guide: ["Guide", filterGuide],
        "account/get_setting": ["Setting", addPremiumSettings],
        get_watch: ["Watch", transformWatch],
    };
    function apiMain() {
        try {
            const endpoint = $request.url.split("?")[0].split("/youtubei/v1/")[1];
            const route = Object.hasOwn(ROUTES, endpoint) &&
                ROUTES[endpoint];
            if (!route || !$response.body?.length)
                return $done();
            const [type, transform] = route, messageCodec = codec(type);
            const message = messageCodec.fromBinary($response.body);
            const options = readOptions({
                blockUpload: true,
                blockShorts: false,
            });
            if (options.autoHd !== false)
                cacheQuality(responsePlayers(type, message));
            $done(transform(message, options)
                ? { body: messageCodec.toBinary(message) }
                : undefined);
        }
        catch (error) {
            console.log("YouTube response: " + error);
            $done();
        }
    }

    apiMain();
})();
