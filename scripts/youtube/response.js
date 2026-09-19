// Standalone Surge runtime.
/*
Third-party components bundled below use the MIT License.

fflate
Copyright (c) 2023 Arjun Barrett

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
(() => {
    // Binary editing: decode only declared fields; preserve every other byte.
    const wireState = Symbol("wireState");
    const utf8 = new TextDecoder("utf-8", { fatal: true });
    const textEncoder = new TextEncoder();
    function concatBytesLocal(chunks) {
        const result = new Uint8Array(chunks.reduce((n, b) => n + b.length, 0));
        let offset = 0;
        for (const bytes of chunks) {
            result.set(bytes, offset);
            offset += bytes.length;
        }
        return result;
    }
    function sameBytes(a, b) {
        return (
            a === b ||
            (a.length === b.length && a.every((value, i) => value === b[i]))
        );
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
            let value = 0,
                scale = 1;
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
            const start = offset,
                tag = read(),
                no = Math.floor(tag / 8),
                wire = tag % 8;
            if (!no) throw new Error("Invalid protobuf field");
            let payloadStart = offset;
            if (wire === 2) {
                const length = read();
                payloadStart = offset;
                offset += length;
            } else if (wire === 1) offset += 8;
            else if (wire === 5) offset += 4;
            else if (wire === 0) {
                let count = 0,
                    byte;
                do {
                    if (offset >= bytes.length || count++ === 10)
                        throw new Error("Invalid protobuf integer");
                    byte = bytes[offset++];
                    if (count === 10 && byte > 1)
                        throw new Error("Protobuf integer overflow");
                } while (byte & 128);
            } else throw new Error("Unsupported protobuf wire type " + wire);
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
    function numberValue(bytes) {
        let value = 0,
            scale = 1;
        for (const byte of bytes) {
            value += (byte & 127) * scale;
            scale *= 128;
        }
        if (!Number.isSafeInteger(value))
            throw new Error("Unsafe decoded integer");
        return value;
    }
    function createMessage(type, values = {}) {
        const message = { ...values };
        for (const [, name, , repeated] of schema[type])
            if (repeated && !message[name]) message[name] = [];
        return message;
    }
    function decodeMessage(type, bytes, depth = 0) {
        if (depth > 64) throw new Error("Protobuf nesting limit");
        const message = createMessage(type),
            fields = wireFields(bytes),
            opaqueNames = new Set();
        for (const field of fields) {
            const spec = schema[type].find(([no]) => no === field.no);
            if (!spec) continue;
            const [, name, kind, repeated] = spec;
            if (field.wire !== (kind === "bool" || kind === "uint" ? 0 : 2))
                continue;
            // A changed cardinality is opaque, rather than silently dropping occurrences.
            if (opaqueNames.has(name)) continue;
            if (!repeated && Object.hasOwn(message, name)) {
                for (const previous of fields)
                    if (previous.spec?.[1] === name) delete previous.spec;
                delete message[name];
                opaqueNames.add(name);
                continue;
            }
            const value =
                kind === "bytes"
                    ? field.data
                    : kind === "string"
                      ? utf8.decode(field.data)
                      : kind === "bool"
                        ? numberValue(field.data) !== 0
                        : kind === "uint"
                          ? numberValue(field.data)
                          : decodeMessage(kind, field.data, depth + 1);
            field.spec = spec;
            if (repeated) message[name].push(value);
            else message[name] = value;
        }
        Object.defineProperty(message, wireState, { value: { bytes, fields } });
        return message;
    }
    function encodeField(spec, value) {
        const [no, , kind] = spec,
            wire = kind === "bool" || kind === "uint" ? 0 : 2;
        const data =
            kind === "bytes"
                ? value
                : kind === "string"
                  ? textEncoder.encode(value)
                  : kind === "bool"
                    ? varint(value ? 1 : 0)
                    : kind === "uint"
                      ? varint(value)
                      : encodeMessage(kind, value);
        return concatBytesLocal(
            wire === 2
                ? [varint(no * 8 + wire), varint(data.length), data]
                : [varint(no * 8), data],
        );
    }
    function encodeMessage(type, message) {
        const chunks = [],
            positions = new Map(),
            state = message[wireState];
        for (const field of state?.fields ?? []) {
            if (!field.spec) {
                chunks.push(field.raw);
                continue;
            }
            const [, name, , repeated] = field.spec,
                index = positions.get(name) ?? 0;
            const values = repeated
                ? (message[name] ?? [])
                : message[name] === undefined
                  ? []
                  : [message[name]];
            if (index < values.length)
                chunks.push(encodeField(field.spec, values[index]));
            positions.set(name, index + 1);
        }
        for (const spec of schema[type]) {
            const [, name, , repeated] = spec;
            const values = repeated
                ? (message[name] ?? [])
                : message[name] === undefined
                  ? []
                  : [message[name]];
            for (let i = positions.get(name) ?? 0; i < values.length; i++)
                chunks.push(encodeField(spec, values[i]));
        }
        const output = concatBytesLocal(chunks);
        return state && sameBytes(output, state.bytes) ? state.bytes : output;
    }
    function codec(type) {
        return {
            fromBinary: (bytes) => decodeMessage(type, bytes),
            toBinary: (message) => encodeMessage(type, message),
        };
    }
    function unknownFields(message) {
        return message[wireState]?.fields.filter((field) => !field.spec) ?? [];
    }

    // Editable protobuf fields. Everything not declared here remains opaque.
    const schema = {
        Browse: [
            [9, "content", "BrowseContent"],
            [10, "onResponseReceivedAction", "BrowseContent"],
        ],
        BrowseContent: [
            [
                58173949,
                "singleColumnResultsRenderer",
                "SingleColumnResultsRenderer",
            ],
            [153515154, "elementRenderer", "ElementRenderer"],
            [49399797, "sectionListRenderer", "SectionListRenderer"],
        ],
        SingleColumnResultsRenderer: [
            [1, "tabs", "BrowseTabSupportedRenderer", true],
        ],
        BrowseTabSupportedRenderer: [[58174010, "tabRenderer", "TabRenderer"]],
        TabRenderer: [[4, "content", "BrowseContent"]],
        ElementRenderer: [
            [172660663, "videoRendererContent", "VideoRendererContent"],
        ],
        VideoRendererContent: [
            [1, "richItemContents", "VideoInfo", true],
            [2, "renderInfo", "RenderInfo"],
        ],
        VideoInfo: [[168777401, "videoContext", "VideoContext"]],
        VideoContext: [[5, "videoContent", "VideoContent"]],
        VideoContent: [
            [512694658, "smartSkipButton", "SmartSkipButton"],
            [232954548, "videoLockup", "VideoLockup"],
            [454362329, "sponsoredVideo", "bytes"],
            [491441836, "sponsoredDisplay", "bytes"],
        ],
        SmartSkipButton: [[13, "controller", "SmartSkipController"]],
        SmartSkipController: [
            [6, "seekEducationEnabled", "bool"],
            [8, "promoKey", "string"],
        ],
        VideoLockup: [
            [33, "attachments", "Attachment", true],
            [34, "attachmentStateKey", "bytes"],
        ],
        Attachment: [[9, "products", "bytes", true]],
        RenderInfo: [[183314536, "layoutRender", "LayoutRender"]],
        LayoutRender: [[1, "eml", "string"]],
        SectionListRenderer: [
            [
                1,
                "sectionListSupportedRenderers",
                "SectionListSupportedRenderer",
                true,
            ],
            [32, "promotedContents", "bytes", true],
        ],
        SectionListSupportedRenderer: [
            [50195462, "itemSectionRenderer", "ItemSectionRenderer"],
            [51845067, "shelfRenderer", "ShelfRenderer"],
        ],
        ItemSectionRenderer: [[1, "richItemContents", "RichItemContent", true]],
        RichItemContent: [
            [153515154, "videoWithContextRenderer", "ElementRenderer"],
        ],
        ShelfRenderer: [[5, "richSectionContent", "RichSectionContent"]],
        RichSectionContent: [
            [51431404, "reelShelfRenderer", "ReelShelfRenderer"],
        ],
        ReelShelfRenderer: [[1, "richItemContents", "RichItemContent", true]],
        Next: [
            [7, "content", "NextContent"],
            [8, "onResponseReceivedAction", "BrowseContent"],
            [14, "playerOverlays", "PlayerOverlays"],
            [25, "engagementPanels", "EngagementPanel", true],
        ],
        EngagementPanel: [[138681066, "renderer", "EngagementPanelRenderer"]],
        EngagementPanelRenderer: [[3, "content", "BrowseContent"]],
        NextContent: [[51779735, "nextResult", "NextResult"]],
        NextResult: [[1, "content", "BrowseContent"]],
        PlayerOverlays: [[78882851, "renderer", "PlayerOverlayRenderer"]],
        PlayerOverlayRenderer: [
            [2, "overflowMenu", "bytes"],
            [3, "related", "RelatedOverlay"],
            [42, "overlayCollections", "OverlayCollection", true],
        ],
        OverlayCollection: [
            [401855120, "renderer", "OverlayCollectionRenderer"],
        ],
        OverlayCollectionRenderer: [[2, "overlays", "OverlayItem", true]],
        OverlayItem: [[401855122, "content", "OverlayContent"]],
        OverlayContent: [[1, "item", "RichItemContent"]],
        RelatedOverlay: [[29209665, "contents", "RelatedOverlayContents"]],
        RelatedOverlayContents: [[2, "contents", "RichItemContent", true]],
        Player: [
            [15, "playerConfig", "PlayerConfig"],
            [60, "overlayCollections", "OverlayCollection", true],
            [61, "paidPromotion", "bytes"],
            [7, "adPlacements", "bytes", true],
            [2, "playabilityStatus", "PlayabilityStatus"],
            [9, "playbackTracking", "PlaybackTracking"],
            [68, "adSlots", "bytes", true],
        ],
        PlayerConfig: [[1, "granularVariableSpeedConfig", "PlaybackSpeedConfig"]],
        PlaybackSpeedConfig: [
            [1, "minimumPlaybackRate", "uint"],
            [2, "maximumPlaybackRate", "uint"],
        ],
        PlayabilityStatus: [
            [21, "pictureInPictureRender", "PictureInPictureSupportedRenderer"],
            [11, "backgroundPlayerRender", "BackgroundSupportedRenderer"],
        ],
        PictureInPictureSupportedRenderer: [
            [151635310, "pictureInPictureAbility", "PictureInPictureAbility"],
        ],
        PictureInPictureAbility: [
            [1, "active", "bool"],
            [4, "f4", "uint"],
            [6, "f6", "uint"],
            [8, "f8", "uint"],
        ],
        BackgroundSupportedRenderer: [
            [64657230, "backgroundAbility", "BackgroundAbility"],
        ],
        BackgroundAbility: [[1, "active", "bool"]],
        PlaybackTracking: [[18, "pageadViewthroughconversion", "bytes"]],
        Search: [
            [4, "content", "BrowseContent"],
            [7, "onResponseReceivedCommand", "OnResponseReceivedCommand"],
        ],
        OnResponseReceivedCommand: [
            [50195462, "itemSectionRenderer", "ItemSectionRenderer"],
            [49399797, "appendContinuationItemsAction", "SectionListRenderer"],
        ],
        Shorts: [[2, "entries", "Entry", true]],
        Entry: [[1, "command", "Command"]],
        Command: [[139608561, "reelWatchEndpoint", "ReelWatchEndpoint"]],
        ReelWatchEndpoint: [[16, "adClientParams", "AdClientParams"]],
        AdClientParams: [[1, "isAd", "bool"]],
        Guide: [
            [4, "labelItems", "GuideItem", true],
            [6, "iconItems", "GuideItem", true],
        ],
        GuideItem: [
            [117866661, "guideSectionRenderer", "GuideSectionRenderer"],
        ],
        GuideSectionRenderer: [[1, "rendererItems", "RendererItem", true]],
        RendererItem: [
            [318370163, "iconRender", "guideEntryRenderer"],
            [117501096, "labelRender", "guideEntryRenderer"],
        ],
        guideEntryRenderer: [[1, "browseId", "string"]],
        Setting: [
            [6, "settingItems", "SettingItem", true],
            [7, "collectionItems", "SettingItem", true],
        ],
        SettingItem: [
            [
                88478200,
                "backgroundPlayBackSettingRenderer",
                "BackgroundPlayBackSettingRenderer",
            ],
            [
                66930374,
                "settingCategoryCollectionRenderer",
                "SettingCategoryCollectionRenderer",
            ],
        ],
        BackgroundPlayBackSettingRenderer: [
            [2, "backgroundPlayback", "bool"],
            [3, "download", "bool"],
            [9, "downloadQualitySelection", "bool"],
            [10, "smartDownload", "bool"],
            [14, "icon", "Icon"],
        ],
        Icon: [[1, "iconType", "uint"]],
        SettingCategoryCollectionRenderer: [
            [3, "subSettings", "SubSetting", true],
            [4, "categoryId", "uint"],
        ],
        SubSetting: [
            [61331416, "settingBooleanRenderer", "SettingBooleanRenderer"],
        ],
        SettingBooleanRenderer: [
            [5, "enableServiceEndpoint", "ServiceEndpoint"],
            [6, "disableServiceEndpoint", "ServiceEndpoint"],
            [15, "itemId", "uint"],
        ],
        ServiceEndpoint: [
            [81212182, "setClientSettingEndpoint", "SetClientSettingEndpoint"],
        ],
        SetClientSettingEndpoint: [[1, "settingData", "SettingData"]],
        SettingData: [
            [1, "clientSettingEnum", "ClientSettingEnum"],
            [3, "boolValue", "bool"],
        ],
        ClientSettingEnum: [[1, "item", "uint"]],
        Watch: [[1, "contents", "WatchContent", true]],
        ResolveUrl: [[2, "endpoint", "NavigationEndpoint"]],
        NavigationEndpoint: [[48687757, "watch", "NavigationWatch"]],
        NavigationWatch: [[68146959, "embedded", "EmbeddedPlayer"]],
        EmbeddedPlayer: [[68202535, "response", "EmbeddedPlayerBody"]],
        EmbeddedPlayerBody: [[1, "player", "Player"]],
        WatchContent: [
            [2, "player", "Player"],
            [3, "next", "Next"],
        ],
        Config: [[1, "responseContext", "ConfigResponseContext"]],
        ConfigResponseContext: [[16, "globalConfigGroup", "GlobalConfigGroup"]],
        GlobalConfigGroup: [[7, "hotConfigGroup", "HotConfigGroup"]],
        HotConfigGroup: [[138536474, "mediaHotConfig", "MediaHotConfig"]],
        MediaHotConfig: [[146311580, "onesieHotConfig", "OnesieHotConfig"]],
        OnesieHotConfig: [
            [1, "clientKey", "bytes"],
            [2, "encryptKey", "bytes"],
        ],
        EncryptedResponsePart: [
            [1, "encryptedContent", "bytes"],
            [2, "hmac", "bytes"],
            [3, "iv", "bytes"],
            [4, "compressionAlgorithm", "uint"],
        ],
        OnesieInnertubeResponse: [[4, "contents", "WatchContent", true]],
    };
    const Browse = codec("Browse");
    const Next = codec("Next");
    const Player = codec("Player");
    const Search = codec("Search");
    const Shorts = codec("Shorts");
    const Guide = codec("Guide");
    const Setting = codec("Setting");
    const Watch = codec("Watch");
    const Config = codec("Config");
    const EncryptedResponsePart = codec("EncryptedResponsePart");
    const OnesieInnertubeResponse = codec("OnesieInnertubeResponse");

    // Surge state and API routing.
    const CONFIG_KEY = "YouTubeConfig";
    function platformKey(request) {
        return Object.entries(request.headers ?? {}).some(
            ([name, value]) =>
                name.toLowerCase() === "user-agent" && /music/i.test(value),
        )
            ? "youtubeMusic"
            : "youtube";
    }
    class SurgeEnvironment {
        constructor() {
            this.request = { ...$request, bodyBytes: $request.body };
            this.response = { ...$response, bodyBytes: $response.body };
        }
        parameters(defaults) {
            return typeof $argument === "string" && !$argument.includes("{{{")
                ? { ...defaults, ...JSON.parse($argument) }
                : defaults;
        }
        getJSON(key) {
            try {
                return JSON.parse($persistentStore.read(key) || "{}");
            } catch {
                return {};
            }
        }
        setJSON(value, key) {
            $persistentStore.write(JSON.stringify(value), key);
        }
        done(result = {}) {
            if (result.bodyBytes !== undefined) {
                result.body = result.bodyBytes;
                delete result.bodyBytes;
            }
            $done(result);
        }
        exit() {
            $done({});
        }
    }
    function loadConfig(environment) {
        return environment.getJSON(CONFIG_KEY);
    }
    function currentKeys(environment, key) {
        return loadConfig(environment)[key] ?? {};
    }
    function clearCurrentKeys(environment, key) {
        const config = loadConfig(environment);
        if (config[key]) {
            delete config[key];
            environment.setJSON(config, CONFIG_KEY);
        }
    }
    function encodeBase64(bytes) {
        const alphabet =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        let result = "";
        for (let i = 0; i < bytes.length; i += 3) {
            const value =
                bytes[i] * 65536 +
                (bytes[i + 1] ?? 0) * 256 +
                (bytes[i + 2] ?? 0);
            result +=
                alphabet[value >>> 18] +
                alphabet[(value >>> 12) & 63] +
                (i + 1 < bytes.length ? alphabet[(value >>> 6) & 63] : "=") +
                (i + 2 < bytes.length ? alphabet[value & 63] : "=");
        }
        return result;
    }

    // Ad classification is local to a rendered item, never learned across requests.
    const AD_LAYOUTS = new Set([
        "inline_injection_entrypoint_layout.eml",
        "video_display_button_group_layout.eml-fe",
        "full_width_portrait_image_layout.eml-fe",
        "full_width_square_image_layout.eml-fe",
        "video_display_full_buttoned_layout.eml-fe",
        "shopping_description_shelf.eml-fe",
    ]);
    const AD_TRACKING = textEncoder.encode("/pagead/");
    const GAME_CARD = textEncoder.encode("mini_game_card.eml");
    const LIVE_BADGE = textEncoder.encode("youtube_outline_experimental/live_24pt");
    const IMMERSIVE_LIVE = textEncoder.encode("immersive_live");
    function containsMarker(bytes, marker = AD_TRACKING) {
        outer: for (let i = 0; i <= bytes.length - marker.length; i++) {
            for (let j = 0; j < marker.length; j++)
                if (bytes[i + j] !== marker[j]) continue outer;
            return true;
        }
        return false;
    }
    function visitObjects(root, callback) {
        const stack = [root];
        while (stack.length) {
            const object = stack.pop();
            if (
                !object ||
                typeof object !== "object" ||
                ArrayBuffer.isView(object)
            )
                continue;
            callback(object);
            stack.push(...Object.values(object));
        }
    }
    function hasVerticalLiveTarget(lockup) {
        let bytes = unknownFields(lockup).find((field) => field.no === 18 && field.wire === 2)?.data;
        // Primary tap target only; a channel avatar may link to a different live.
        try {
            for (const no of [4, 169495254, 462702848, 1, 139608561, 50, 7, 3]) {
                if (!bytes) return false;
                bytes = wireFields(bytes).find((field) => field.no === no && field.wire === 2)?.data;
            }
            return !!bytes && sameBytes(bytes, IMMERSIVE_LIVE);
        } catch {
            return false;
        }
    }
    function isBlockedItem(item, blockGames, blockVerticalLive) {
        let ad = false;
        visitObjects(item, (object) => {
            const layout = object.layoutRender?.eml?.split("|")[0];
            if (
                AD_LAYOUTS.has(layout) ||
                object.sponsoredVideo ||
                object.sponsoredDisplay ||
                (blockVerticalLive && object.videoLockup && hasVerticalLiveTarget(object.videoLockup))
            )
                ad = true;
            if (
                unknownFields(object).some(
                    (field) =>
                        field.wire === 2 &&
                        (containsMarker(field.data) ||
                            field.no === 400157044 || // Product overlay.
                            field.no === 455507059 || // Paid-promotion overlay.
                            (blockVerticalLive &&
                                field.no === 519005951 &&
                                containsMarker(field.data, LIVE_BADGE)) ||
                            (blockGames &&
                                field.no === 312131490 &&
                                containsMarker(field.data, GAME_CARD))),
                )
            )
                ad = true;
        });
        return ad;
    }
    function removeFeedAds(message, { blockGames = true, blockVerticalLive = false, jumpAhead = true } = {}) {
        let changed = false;
        const overlay = message.playerOverlays?.renderer;
        if (overlay?.overflowMenu) {
            try {
                const menu = unlockSpeedMenu(overlay.overflowMenu);
                changed = !sameBytes(menu, overlay.overflowMenu);
                overlay.overflowMenu = menu;
            } catch (error) {
                console.log("YouTube speed menu: " + error);
            }
        }
        const emptied = new WeakSet();
        visitObjects(message, (object) => {
            if (jumpAhead && object.smartSkipButton)
                changed = unlockJumpAhead(object.smartSkipButton) || changed;
            for (const field of ["richItemContents", "overlays"]) {
                if (!Array.isArray(object[field])) continue;
                const keep = object[field].filter(
                    (item) => !isBlockedItem(item, blockGames, blockVerticalLive),
                );
                changed = keep.length !== object[field].length || changed;
                if (object[field].length && !keep.length) emptied.add(object);
                object[field] = keep;
            }
            if (Array.isArray(object.promotedContents)) {
                const keep = object.promotedContents.filter(
                    (bytes) => !containsMarker(bytes),
                );
                changed =
                    keep.length !== object.promotedContents.length || changed;
                object.promotedContents = keep;
            }
            if (Array.isArray(object.attachments)) {
                const keep = object.attachments.filter(
                    (attachment) => !attachment.products?.length,
                );
                changed = keep.length !== object.attachments.length || changed;
                object.attachments = keep;
                // The expansion-state key otherwise keeps an empty attachment
                // area alive, including responses stripped by an older script.
                if (!keep.length && object.attachmentStateKey !== undefined) {
                    delete object.attachmentStateKey;
                    changed = true;
                }
            }
        });
        // Remove only wrappers emptied by filtering, not pre-existing placeholders
        // or ordinary videos whose shopping attachment was removed.
        function emptyContainer(object) {
            if (!object || typeof object !== "object") return false;
            if (emptied.has(object)) return true;
            return [
                "videoWithContextRenderer",
                "videoRendererContent",
                "itemSectionRenderer",
                "shelfRenderer",
                "richSectionContent",
                "reelShelfRenderer",
                "renderer",
                "content",
                "item",
            ].some((key) => emptyContainer(object[key]));
        }
        function prune(object) {
            if (
                !object ||
                typeof object !== "object" ||
                ArrayBuffer.isView(object)
            )
                return;
            for (const child of Object.values(object)) prune(child);
            for (const field of [
                "richItemContents",
                "contents",
                "sectionListSupportedRenderers",
                "overlayCollections",
            ]) {
                if (!Array.isArray(object[field])) continue;
                const keep = object[field].filter(
                    (item) => !emptyContainer(item),
                );
                if (keep.length === object[field].length) continue;
                changed = true;
                if (!keep.length) emptied.add(object);
                object[field] = keep;
            }
        }
        prune(message);
        return changed;
    }
    function unlockJumpAhead(button) {
        const controller = button.controller;
        if (!controller?.promoKey) return false;
        try {
            const key = decodeBase64(decodeURIComponent(controller.promoKey));
            const name = wireFields(key).find((field) => field.no === 2 && field.wire === 2);
            if (!name || !/^promo_command_entity_key_.*jump_?ahead/i.test(utf8.decode(name.data)))
                return false;
            // Leave server targets, eligibility windows, gestures and native
            // seek actions intact. The native controller queries
            // player_overlay_player_seek_edu when controller field 6 is true.
            if (controller.seekEducationEnabled === true)
                controller.seekEducationEnabled = false;
            delete controller.promoKey;
            return true;
        } catch {
            return false;
        }
    }
    // Edit a declared binary path; keep all siblings and repeated occurrences.
    function rewriteBinaryPath(bytes, path, transform) {
        if (!path.length) return transform(bytes);
        let changed = false;
        const chunks = wireFields(bytes).map((field) => {
            if (field.no !== path[0] || field.wire !== 2) return field.raw;
            const data = rewriteBinaryPath(field.data, path.slice(1), transform);
            if (sameBytes(data, field.data)) return field.raw;
            changed = true;
            return encodeField([field.no, "", "bytes"], data);
        });
        return changed ? concatBytesLocal(chunks) : bytes;
    }
    function unlockSpeedMenu(bytes) {
        const upsell = textEncoder.encode("PApremium_upsell");
        // Overflow item → inline panel → playback-rate selector model (1602).
        return rewriteBinaryPath(bytes, [
            66439850, 1, 153515154, 172660663, 1, 168777401, 5, 407694004,
            4, 4, 170382688, 1, 169495254, 443434441, 1, 1, 441573002,
            4, 153515154, 172660663, 1, 168777401, 5, 413471385, 1, 1602,
        ], (selector) => {
            const fields = wireFields(selector);
            const maximum = fields.find((field) => field.no === 5 && field.wire === 5);
            if (!maximum) return selector;
            const rate = new DataView(maximum.data.buffer, maximum.data.byteOffset, 4).getFloat32(0, true);
            if (!(rate > 0)) return selector; // Keep disabled/live controls disabled.
            const limit = new Uint8Array(4);
            new DataView(limit.buffer).setFloat32(0, Math.max(4, rate), true);
            const expanded = concatBytesLocal(fields.map((field) =>
                field === maximum ? concatBytesLocal([varint(45), limit]) : field.raw));
            // Presets already contain the real rate action; field 3 overrides it
            // with the Premium panel. Remove only that preset-specific override.
            return rewriteBinaryPath(expanded, [10, 1674], (preset) =>
                concatBytesLocal(wireFields(preset)
                    .filter((field) => field.no !== 3 || field.wire !== 2 ||
                        !containsMarker(field.data, upsell))
                    .map((field) => field.raw)));
        });
    }
    function enhancePlayer(player, parameters) {
        removeFeedAds(player, parameters);
        delete player.paidPromotion;
        player.adPlacements = [];
        player.adSlots = [];
        const speed = player.playerConfig?.granularVariableSpeedConfig;
        if (speed?.maximumPlaybackRate > 0)
            speed.maximumPlaybackRate = Math.max(400, speed.maximumPlaybackRate);
        if (player.playbackTracking)
            delete player.playbackTracking.pageadViewthroughconversion;
        const status = player.playabilityStatus;
        if (status) {
            status.pictureInPictureRender ??= {};
            status.pictureInPictureRender.pictureInPictureAbility ??= {};
            Object.assign(
                status.pictureInPictureRender.pictureInPictureAbility,
                { active: true, f4: 0, f6: 0, f8: 1 },
            );
            status.backgroundPlayerRender ??= {};
            status.backgroundPlayerRender.backgroundAbility ??= {};
            status.backgroundPlayerRender.backgroundAbility.active = true;
        }
        return true;
    }
    function removeShortsAds(message) {
        const keep = message.entries.filter(
            (entry) => !entry.command?.reelWatchEndpoint?.adClientParams?.isAd,
        );
        const changed = keep.length !== message.entries.length;
        message.entries = keep;
        return changed;
    }
    function filterGuide(message, parameters) {
        const blocked = new Set(["SPunlimited"]);
        if (parameters.blockUpload) blocked.add("FEuploads");
        if (parameters.blockShorts) blocked.add("FEshorts");
        let changed = false;
        visitObjects(message, (object) => {
            if (!Array.isArray(object.rendererItems)) return;
            const keep = object.rendererItems.filter(
                (item) =>
                    !blocked.has(
                        item.iconRender?.browseId ?? item.labelRender?.browseId,
                    ),
            );
            changed = keep.length !== object.rendererItems.length || changed;
            object.rendererItems = keep;
        });
        return changed;
    }
    function addPremiumSettings(message) {
        visitObjects(message, (category) => {
            if (category.categoryId !== 10135) return;
            const endpoint = (enabled) => ({
                setClientSettingEndpoint: {
                    settingData: {
                        clientSettingEnum: { item: 151 },
                        boolValue: enabled,
                    },
                },
            });
            if (
                !category.subSettings.some(
                    (item) =>
                        item.settingBooleanRenderer?.enableServiceEndpoint
                            ?.setClientSettingEndpoint?.settingData
                            ?.clientSettingEnum?.item === 151,
                )
            )
                category.subSettings.push({
                    settingBooleanRenderer: {
                        itemId: 0,
                        enableServiceEndpoint: endpoint(true),
                        disableServiceEndpoint: endpoint(false),
                    },
                });
        });
        if (
            !message.settingItems.some(
                (item) => item.backgroundPlayBackSettingRenderer,
            )
        )
            message.settingItems.push({
                backgroundPlayBackSettingRenderer: {
                    backgroundPlayback: true,
                    download: true,
                    downloadQualitySelection: true,
                    smartDownload: true,
                    icon: { iconType: 1093 },
                },
            });
        return true;
    }
    function enhanceWatch(message, parameters) {
        for (const content of message.contents) {
            if (content.player) enhancePlayer(content.player, parameters);
            if (content.next) removeFeedAds(content.next, parameters);
        }
        return true;
    }
    function enhanceNavigation(message, parameters) {
        const player = message.endpoint?.watch?.embedded?.response?.player;
        return player ? enhancePlayer(player, parameters) : false;
    }
    const routes = [
        {
            path: "navigation/resolve_url",
            type: codec("ResolveUrl"),
            handle: enhanceNavigation,
        },
        { path: "browse", type: Browse, handle: removeFeedAds },
        { path: "next", type: Next, handle: removeFeedAds },
        { path: "player", type: Player, handle: enhancePlayer },
        { path: "search", type: Search, handle: removeFeedAds },
        {
            path: "reel/reel_watch_sequence",
            type: Shorts,
            handle: removeShortsAds,
        },
        { path: "guide", type: Guide, handle: filterGuide },
        {
            path: "account/get_setting",
            type: Setting,
            handle: addPremiumSettings,
        },
        { path: "get_watch", type: Watch, handle: enhanceWatch },
        { path: "config", type: Config },
        { path: "log_event", type: Config },
    ];
    function captureKeys(message, environment) {
        const keys =
            message.responseContext?.globalConfigGroup?.hotConfigGroup
                ?.mediaHotConfig?.onesieHotConfig;
        if (!keys?.clientKey?.length || !keys.encryptKey?.length) return;
        const key = platformKey(environment.request),
            config = loadConfig(environment);
        const value = {
            clientKey: encodeBase64(keys.clientKey),
            encryptKey: encodeBase64(keys.encryptKey),
        };
        if (JSON.stringify(config[key]) !== JSON.stringify(value)) {
            config[key] = value;
            environment.setJSON(config, CONFIG_KEY);
        }
    }
    function handleApiResponse() {
        const environment = new SurgeEnvironment();
        try {
            const path = environment.request.url
                .split("?")[0]
                .split("/youtubei/v1/")[1];
            const route = routes.find((route) => route.path === path);
            if (!route || !environment.response.bodyBytes?.length)
                return environment.exit();
            const message = route.type.fromBinary(
                environment.response.bodyBytes,
            );
            if (!route.handle) {
                captureKeys(message, environment);
                return environment.exit();
            }
            const parameters = environment.parameters({
                blockUpload: true,
                blockShorts: false,
            });
            if (route.handle(message, parameters))
                return environment.done({
                    bodyBytes: route.type.toBinary(message),
                });
            environment.exit();
        } catch (error) {
            console.log("YouTube response: " + error);
            environment.exit();
        }
    }

    // Gzip
    var u8 = Uint8Array,
        u16 = Uint16Array,
        i32 = Int32Array,
        fleb = new u8([
            0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4,
            4, 5, 5, 5, 5, 0 /* unused */, 0, 0 /* impossible */, 0,
        ]),
        fdeb = new u8([
            0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9,
            10, 10, 11, 11, 12, 12, 13, 13 /* unused */, 0, 0,
        ]),
        clim = new u8([
            16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15,
        ]),
        freb = function (eb, start) {
            for (var b = new u16(31), i = 0; i < 31; ++i)
                b[i] = start += 1 << eb[i - 1];
            for (var r = new i32(b[30]), i = 1; i < 30; ++i)
                for (var j = b[i]; j < b[i + 1]; ++j)
                    r[j] = ((j - b[i]) << 5) | i;
            return { b, r };
        },
        _a = freb(fleb, 2),
        fl = _a.b,
        revfl = _a.r;
    ((fl[28] = 258), (revfl[258] = 28));
    var _b = freb(fdeb, 0),
        fd = _b.b,
        revfd = _b.r,
        rev = new u16(32768);
    for (i = 0; i < 32768; ++i)
        ((x2 = ((i & 43690) >> 1) | ((i & 21845) << 1)),
            (x2 = ((x2 & 52428) >> 2) | ((x2 & 13107) << 2)),
            (x2 = ((x2 & 61680) >> 4) | ((x2 & 3855) << 4)),
            (rev[i] = (((x2 & 65280) >> 8) | ((x2 & 255) << 8)) >> 1));
    var x2,
        i,
        hMap = function (cd, mb, r) {
            for (var s = cd.length, i = 0, l = new u16(mb); i < s; ++i)
                cd[i] && ++l[cd[i] - 1];
            var le2 = new u16(mb);
            for (i = 1; i < mb; ++i) le2[i] = (le2[i - 1] + l[i - 1]) << 1;
            var co;
            if (r) {
                co = new u16(1 << mb);
                var rvb = 15 - mb;
                for (i = 0; i < s; ++i)
                    if (cd[i])
                        for (
                            var sv = (i << 4) | cd[i],
                                r_1 = mb - cd[i],
                                v2 = le2[cd[i] - 1]++ << r_1,
                                m2 = v2 | ((1 << r_1) - 1);
                            v2 <= m2;
                            ++v2
                        )
                            co[rev[v2] >> rvb] = sv;
            } else
                for (co = new u16(s), i = 0; i < s; ++i)
                    cd[i] && (co[i] = rev[le2[cd[i] - 1]++] >> (15 - cd[i]));
            return co;
        },
        flt = new u8(288);
    for (i = 0; i < 144; ++i) flt[i] = 8;
    var i;
    for (i = 144; i < 256; ++i) flt[i] = 9;
    var i;
    for (i = 256; i < 280; ++i) flt[i] = 7;
    var i;
    for (i = 280; i < 288; ++i) flt[i] = 8;
    var i,
        fdt = new u8(32);
    for (i = 0; i < 32; ++i) fdt[i] = 5;
    var i,
        flm = /* @__PURE__ */ hMap(flt, 9, 0),
        flrm = /* @__PURE__ */ hMap(flt, 9, 1),
        fdm = /* @__PURE__ */ hMap(fdt, 5, 0),
        fdrm = /* @__PURE__ */ hMap(fdt, 5, 1),
        max = function (a) {
            for (var m2 = a[0], i = 1; i < a.length; ++i)
                a[i] > m2 && (m2 = a[i]);
            return m2;
        },
        bits = function (d2, p2, m2) {
            var o = (p2 / 8) | 0;
            return ((d2[o] | (d2[o + 1] << 8)) >> (p2 & 7)) & m2;
        },
        bits16 = function (d2, p2) {
            var o = (p2 / 8) | 0;
            return (d2[o] | (d2[o + 1] << 8) | (d2[o + 2] << 16)) >> (p2 & 7);
        },
        shft = function (p2) {
            return ((p2 + 7) / 8) | 0;
        },
        slc = function (v2, s, e) {
            return (
                (s == null || s < 0) && (s = 0),
                (e == null || e > v2.length) && (e = v2.length),
                new u8(v2.subarray(s, e))
            );
        };
    var ec = [
            "unexpected EOF",
            "invalid block type",
            "invalid length/literal",
            "invalid distance",
            "stream finished",
            "no stream handler",
            ,
            "no callback",
            "invalid UTF-8 data",
            "extra field too long",
            "date not in range 1980-2099",
            "filename too long",
            "stream finishing",
            "invalid zip data",
            // determined by unknown compression method
        ],
        err = function (ind, msg, nt2) {
            var e = new Error(msg || ec[ind]);
            if (
                ((e.code = ind),
                Error.captureStackTrace && Error.captureStackTrace(e, err),
                !nt2)
            )
                throw e;
            return e;
        },
        inflt = function (dat, st2, buf, dict) {
            var sl = dat.length,
                dl2 = dict ? dict.length : 0;
            if (!sl || (st2.f && !st2.l)) return buf || new u8(0);
            var noBuf = !buf,
                resize = noBuf || st2.i != 2,
                noSt = st2.i;
            noBuf && (buf = new u8(sl * 3));
            var cbuf = function (l2) {
                    var bl = buf.length;
                    if (l2 > bl) {
                        var nbuf = new u8(Math.max(bl * 2, l2));
                        (nbuf.set(buf), (buf = nbuf));
                    }
                },
                final = st2.f || 0,
                pos = st2.p || 0,
                bt2 = st2.b || 0,
                lm = st2.l,
                dm = st2.d,
                lbt = st2.m,
                dbt = st2.n,
                tbts = sl * 8;
            do {
                if (!lm) {
                    final = bits(dat, pos, 1);
                    var type = bits(dat, pos + 1, 3);
                    if (((pos += 3), type))
                        if (type == 1)
                            ((lm = flrm), (dm = fdrm), (lbt = 9), (dbt = 5));
                        else if (type == 2) {
                            var hLit = bits(dat, pos, 31) + 257,
                                hcLen = bits(dat, pos + 10, 15) + 4,
                                tl = hLit + bits(dat, pos + 5, 31) + 1;
                            pos += 14;
                            for (
                                var ldt = new u8(tl), clt = new u8(19), i = 0;
                                i < hcLen;
                                ++i
                            )
                                clt[clim[i]] = bits(dat, pos + i * 3, 7);
                            pos += hcLen * 3;
                            for (
                                var clb = max(clt),
                                    clbmsk = (1 << clb) - 1,
                                    clm = hMap(clt, clb, 1),
                                    i = 0;
                                i < tl;
                            ) {
                                var r = clm[bits(dat, pos, clbmsk)];
                                pos += r & 15;
                                var s = r >> 4;
                                if (s < 16) ldt[i++] = s;
                                else {
                                    var c = 0,
                                        n = 0;
                                    for (
                                        s == 16
                                            ? ((n = 3 + bits(dat, pos, 3)),
                                              (pos += 2),
                                              (c = ldt[i - 1]))
                                            : s == 17
                                              ? ((n = 3 + bits(dat, pos, 7)),
                                                (pos += 3))
                                              : s == 18 &&
                                                ((n = 11 + bits(dat, pos, 127)),
                                                (pos += 7));
                                        n--;
                                    )
                                        ldt[i++] = c;
                                }
                            }
                            var lt2 = ldt.subarray(0, hLit),
                                dt2 = ldt.subarray(hLit);
                            ((lbt = max(lt2)),
                                (dbt = max(dt2)),
                                (lm = hMap(lt2, lbt, 1)),
                                (dm = hMap(dt2, dbt, 1)));
                        } else err(1);
                    else {
                        var s = shft(pos) + 4,
                            l = dat[s - 4] | (dat[s - 3] << 8),
                            t = s + l;
                        if (t > sl) {
                            noSt && err(0);
                            break;
                        }
                        (resize && cbuf(bt2 + l),
                            buf.set(dat.subarray(s, t), bt2),
                            (st2.b = bt2 += l),
                            (st2.p = pos = t * 8),
                            (st2.f = final));
                        continue;
                    }
                    if (pos > tbts) {
                        noSt && err(0);
                        break;
                    }
                }
                resize && cbuf(bt2 + 131072);
                for (
                    var lms = (1 << lbt) - 1, dms = (1 << dbt) - 1, lpos = pos;
                    ;
                    lpos = pos
                ) {
                    var c = lm[bits16(dat, pos) & lms],
                        sym = c >> 4;
                    if (((pos += c & 15), pos > tbts)) {
                        noSt && err(0);
                        break;
                    }
                    if ((c || err(2), sym < 256)) buf[bt2++] = sym;
                    else if (sym == 256) {
                        ((lpos = pos), (lm = null));
                        break;
                    } else {
                        var add = sym - 254;
                        if (sym > 264) {
                            var i = sym - 257,
                                b = fleb[i];
                            ((add = bits(dat, pos, (1 << b) - 1) + fl[i]),
                                (pos += b));
                        }
                        var d2 = dm[bits16(dat, pos) & dms],
                            dsym = d2 >> 4;
                        (d2 || err(3), (pos += d2 & 15));
                        var dt2 = fd[dsym];
                        if (dsym > 3) {
                            var b = fdeb[dsym];
                            ((dt2 += bits16(dat, pos) & ((1 << b) - 1)),
                                (pos += b));
                        }
                        if (pos > tbts) {
                            noSt && err(0);
                            break;
                        }
                        resize && cbuf(bt2 + 131072);
                        var end = bt2 + add;
                        if (bt2 < dt2) {
                            var shift = dl2 - dt2,
                                dend = Math.min(dt2, end);
                            for (shift + bt2 < 0 && err(3); bt2 < dend; ++bt2)
                                buf[bt2] = dict[shift + bt2];
                        }
                        for (; bt2 < end; ++bt2) buf[bt2] = buf[bt2 - dt2];
                    }
                }
                ((st2.l = lm),
                    (st2.p = lpos),
                    (st2.b = bt2),
                    (st2.f = final),
                    lm &&
                        ((final = 1),
                        (st2.m = lbt),
                        (st2.d = dm),
                        (st2.n = dbt)));
            } while (!final);
            return bt2 != buf.length && noBuf
                ? slc(buf, 0, bt2)
                : buf.subarray(0, bt2);
        },
        wbits = function (d2, p2, v2) {
            v2 <<= p2 & 7;
            var o = (p2 / 8) | 0;
            ((d2[o] |= v2), (d2[o + 1] |= v2 >> 8));
        },
        wbits16 = function (d2, p2, v2) {
            v2 <<= p2 & 7;
            var o = (p2 / 8) | 0;
            ((d2[o] |= v2), (d2[o + 1] |= v2 >> 8), (d2[o + 2] |= v2 >> 16));
        },
        hTree = function (d2, mb) {
            for (var t = [], i = 0; i < d2.length; ++i)
                d2[i] && t.push({ s: i, f: d2[i] });
            var s = t.length,
                t2 = t.slice();
            if (!s) return { t: et2, l: 0 };
            if (s == 1) {
                var v2 = new u8(t[0].s + 1);
                return ((v2[t[0].s] = 1), { t: v2, l: 1 });
            }
            (t.sort(function (a, b) {
                return a.f - b.f;
            }),
                t.push({ s: -1, f: 25001 }));
            var l = t[0],
                r = t[1],
                i0 = 0,
                i1 = 1,
                i2 = 2;
            for (t[0] = { s: -1, f: l.f + r.f, l, r }; i1 != s - 1;)
                ((l = t[t[i0].f < t[i2].f ? i0++ : i2++]),
                    (r = t[i0 != i1 && t[i0].f < t[i2].f ? i0++ : i2++]),
                    (t[i1++] = { s: -1, f: l.f + r.f, l, r }));
            for (var maxSym = t2[0].s, i = 1; i < s; ++i)
                t2[i].s > maxSym && (maxSym = t2[i].s);
            var tr2 = new u16(maxSym + 1),
                mbt = ln2(t[i1 - 1], tr2, 0);
            if (mbt > mb) {
                var i = 0,
                    dt2 = 0,
                    lft = mbt - mb,
                    cst = 1 << lft;
                for (
                    t2.sort(function (a, b) {
                        return tr2[b.s] - tr2[a.s] || a.f - b.f;
                    });
                    i < s;
                    ++i
                ) {
                    var i2_1 = t2[i].s;
                    if (tr2[i2_1] > mb)
                        ((dt2 += cst - (1 << (mbt - tr2[i2_1]))),
                            (tr2[i2_1] = mb));
                    else break;
                }
                for (dt2 >>= lft; dt2 > 0;) {
                    var i2_2 = t2[i].s;
                    tr2[i2_2] < mb ? (dt2 -= 1 << (mb - tr2[i2_2]++ - 1)) : ++i;
                }
                for (; i >= 0 && dt2; --i) {
                    var i2_3 = t2[i].s;
                    tr2[i2_3] == mb && (--tr2[i2_3], ++dt2);
                }
                mbt = mb;
            }
            return { t: new u8(tr2), l: mbt };
        },
        ln2 = function (n, l, d2) {
            return n.s == -1
                ? Math.max(ln2(n.l, l, d2 + 1), ln2(n.r, l, d2 + 1))
                : (l[n.s] = d2);
        },
        lc = function (c) {
            for (var s = c.length; s && !c[--s];);
            for (
                var cl = new u16(++s),
                    cli = 0,
                    cln = c[0],
                    cls = 1,
                    w = function (v2) {
                        cl[cli++] = v2;
                    },
                    i = 1;
                i <= s;
                ++i
            )
                if (c[i] == cln && i != s) ++cls;
                else {
                    if (!cln && cls > 2) {
                        for (; cls > 138; cls -= 138) w(32754);
                        cls > 2 &&
                            (w(
                                cls > 10
                                    ? ((cls - 11) << 5) | 28690
                                    : ((cls - 3) << 5) | 12305,
                            ),
                            (cls = 0));
                    } else if (cls > 3) {
                        for (w(cln), --cls; cls > 6; cls -= 6) w(8304);
                        cls > 2 && (w(((cls - 3) << 5) | 8208), (cls = 0));
                    }
                    for (; cls--;) w(cln);
                    ((cls = 1), (cln = c[i]));
                }
            return { c: cl.subarray(0, cli), n: s };
        },
        clen = function (cf, cl) {
            for (var l = 0, i = 0; i < cl.length; ++i) l += cf[i] * cl[i];
            return l;
        },
        wfblk = function (out, pos, dat) {
            var s = dat.length,
                o = shft(pos + 2);
            ((out[o] = s & 255),
                (out[o + 1] = s >> 8),
                (out[o + 2] = out[o] ^ 255),
                (out[o + 3] = out[o + 1] ^ 255));
            for (var i = 0; i < s; ++i) out[o + i + 4] = dat[i];
            return (o + 4 + s) * 8;
        },
        wblk = function (dat, out, final, syms, lf, df, eb, li, bs, bl, p2) {
            (wbits(out, p2++, final), ++lf[256]);
            for (
                var _a2 = hTree(lf, 15),
                    dlt = _a2.t,
                    mlb = _a2.l,
                    _b2 = hTree(df, 15),
                    ddt = _b2.t,
                    mdb = _b2.l,
                    _c = lc(dlt),
                    lclt = _c.c,
                    nlc = _c.n,
                    _d = lc(ddt),
                    lcdt = _d.c,
                    ndc = _d.n,
                    lcfreq = new u16(19),
                    i = 0;
                i < lclt.length;
                ++i
            )
                ++lcfreq[lclt[i] & 31];
            for (var i = 0; i < lcdt.length; ++i) ++lcfreq[lcdt[i] & 31];
            for (
                var _e2 = hTree(lcfreq, 7),
                    lct = _e2.t,
                    mlcb = _e2.l,
                    nlcc = 19;
                nlcc > 4 && !lct[clim[nlcc - 1]];
                --nlcc
            );
            var flen = (bl + 5) << 3,
                ftlen = clen(lf, flt) + clen(df, fdt) + eb,
                dtlen =
                    clen(lf, dlt) +
                    clen(df, ddt) +
                    eb +
                    14 +
                    3 * nlcc +
                    clen(lcfreq, lct) +
                    2 * lcfreq[16] +
                    3 * lcfreq[17] +
                    7 * lcfreq[18];
            if (bs >= 0 && flen <= ftlen && flen <= dtlen)
                return wfblk(out, p2, dat.subarray(bs, bs + bl));
            var lm, ll, dm, dl2;
            if (
                (wbits(out, p2, 1 + (dtlen < ftlen)), (p2 += 2), dtlen < ftlen)
            ) {
                ((lm = hMap(dlt, mlb, 0)),
                    (ll = dlt),
                    (dm = hMap(ddt, mdb, 0)),
                    (dl2 = ddt));
                var llm = hMap(lct, mlcb, 0);
                (wbits(out, p2, nlc - 257),
                    wbits(out, p2 + 5, ndc - 1),
                    wbits(out, p2 + 10, nlcc - 4),
                    (p2 += 14));
                for (var i = 0; i < nlcc; ++i)
                    wbits(out, p2 + 3 * i, lct[clim[i]]);
                p2 += 3 * nlcc;
                for (var lcts = [lclt, lcdt], it2 = 0; it2 < 2; ++it2)
                    for (var clct = lcts[it2], i = 0; i < clct.length; ++i) {
                        var len = clct[i] & 31;
                        (wbits(out, p2, llm[len]),
                            (p2 += lct[len]),
                            len > 15 &&
                                (wbits(out, p2, (clct[i] >> 5) & 127),
                                (p2 += clct[i] >> 12)));
                    }
            } else ((lm = flm), (ll = flt), (dm = fdm), (dl2 = fdt));
            for (var i = 0; i < li; ++i) {
                var sym = syms[i];
                if (sym > 255) {
                    var len = (sym >> 18) & 31;
                    (wbits16(out, p2, lm[len + 257]),
                        (p2 += ll[len + 257]),
                        len > 7 &&
                            (wbits(out, p2, (sym >> 23) & 31),
                            (p2 += fleb[len])));
                    var dst = sym & 31;
                    (wbits16(out, p2, dm[dst]),
                        (p2 += dl2[dst]),
                        dst > 3 &&
                            (wbits16(out, p2, (sym >> 5) & 8191),
                            (p2 += fdeb[dst])));
                } else (wbits16(out, p2, lm[sym]), (p2 += ll[sym]));
            }
            return (wbits16(out, p2, lm[256]), p2 + ll[256]);
        },
        deo = /* @__PURE__ */ new i32([
            65540, 131080, 131088, 131104, 262176, 1048704, 1048832, 2114560,
            2117632,
        ]),
        et2 = /* @__PURE__ */ new u8(0),
        dflt = function (dat, lvl, plvl, pre, post, st2) {
            var s = st2.z || dat.length,
                o = new u8(pre + s + 5 * (1 + Math.ceil(s / 7e3)) + post),
                w = o.subarray(pre, o.length - post),
                lst = st2.l,
                pos = (st2.r || 0) & 7;
            if (lvl) {
                pos && (w[0] = st2.r >> 3);
                for (
                    var opt = deo[lvl - 1],
                        n = opt >> 13,
                        c = opt & 8191,
                        msk_1 = (1 << plvl) - 1,
                        prev = st2.p || new u16(32768),
                        head = st2.h || new u16(msk_1 + 1),
                        bs1_1 = Math.ceil(plvl / 3),
                        bs2_1 = 2 * bs1_1,
                        hsh = function (i2) {
                            return (
                                (dat[i2] ^
                                    (dat[i2 + 1] << bs1_1) ^
                                    (dat[i2 + 2] << bs2_1)) &
                                msk_1
                            );
                        },
                        syms = new i32(25e3),
                        lf = new u16(288),
                        df = new u16(32),
                        lc_1 = 0,
                        eb = 0,
                        i = st2.i || 0,
                        li = 0,
                        wi2 = st2.w || 0,
                        bs = 0;
                    i + 2 < s;
                    ++i
                ) {
                    var hv = hsh(i),
                        imod = i & 32767,
                        pimod = head[hv];
                    if (((prev[imod] = pimod), (head[hv] = imod), wi2 <= i)) {
                        var rem = s - i;
                        if ((lc_1 > 7e3 || li > 24576) && (rem > 423 || !lst)) {
                            ((pos = wblk(
                                dat,
                                w,
                                0,
                                syms,
                                lf,
                                df,
                                eb,
                                li,
                                bs,
                                i - bs,
                                pos,
                            )),
                                (li = lc_1 = eb = 0),
                                (bs = i));
                            for (var j = 0; j < 286; ++j) lf[j] = 0;
                            for (var j = 0; j < 30; ++j) df[j] = 0;
                        }
                        var l = 2,
                            d2 = 0,
                            ch_1 = c,
                            dif = (imod - pimod) & 32767;
                        if (rem > 2 && hv == hsh(i - dif))
                            for (
                                var maxn = Math.min(n, rem) - 1,
                                    maxd = Math.min(32767, i),
                                    ml2 = Math.min(258, rem);
                                dif <= maxd && --ch_1 && imod != pimod;
                            ) {
                                if (dat[i + l] == dat[i + l - dif]) {
                                    for (
                                        var nl = 0;
                                        nl < ml2 &&
                                        dat[i + nl] == dat[i + nl - dif];
                                        ++nl
                                    );
                                    if (nl > l) {
                                        if (((l = nl), (d2 = dif), nl > maxn))
                                            break;
                                        for (
                                            var mmd = Math.min(dif, nl - 2),
                                                md = 0,
                                                j = 0;
                                            j < mmd;
                                            ++j
                                        ) {
                                            var ti2 = (i - dif + j) & 32767,
                                                pti = prev[ti2],
                                                cd = (ti2 - pti) & 32767;
                                            cd > md &&
                                                ((md = cd), (pimod = ti2));
                                        }
                                    }
                                }
                                ((imod = pimod),
                                    (pimod = prev[imod]),
                                    (dif += (imod - pimod) & 32767));
                            }
                        if (d2) {
                            syms[li++] =
                                268435456 | (revfl[l] << 18) | revfd[d2];
                            var lin = revfl[l] & 31,
                                din = revfd[d2] & 31;
                            ((eb += fleb[lin] + fdeb[din]),
                                ++lf[257 + lin],
                                ++df[din],
                                (wi2 = i + l),
                                ++lc_1);
                        } else ((syms[li++] = dat[i]), ++lf[dat[i]]);
                    }
                }
                for (i = Math.max(i, wi2); i < s; ++i)
                    ((syms[li++] = dat[i]), ++lf[dat[i]]);
                ((pos = wblk(
                    dat,
                    w,
                    lst,
                    syms,
                    lf,
                    df,
                    eb,
                    li,
                    bs,
                    i - bs,
                    pos,
                )),
                    lst ||
                        ((st2.r = (pos & 7) | (w[(pos / 8) | 0] << 3)),
                        (pos -= 7),
                        (st2.h = head),
                        (st2.p = prev),
                        (st2.i = i),
                        (st2.w = wi2)));
            } else {
                for (var i = st2.w || 0; i < s + lst; i += 65535) {
                    var e = i + 65535;
                    (e >= s && ((w[(pos / 8) | 0] = lst), (e = s)),
                        (pos = wfblk(w, pos + 1, dat.subarray(i, e))));
                }
                st2.i = s;
            }
            return slc(o, 0, pre + shft(pos) + post);
        },
        crct = /* @__PURE__ */ (function () {
            for (var t = new Int32Array(256), i = 0; i < 256; ++i) {
                for (var c = i, k = 9; --k;)
                    c = (c & 1 && -306674912) ^ (c >>> 1);
                t[i] = c;
            }
            return t;
        })(),
        crc = function () {
            var c = -1;
            return {
                p: function (d2) {
                    for (var cr2 = c, i = 0; i < d2.length; ++i)
                        cr2 = crct[(cr2 & 255) ^ d2[i]] ^ (cr2 >>> 8);
                    c = cr2;
                },
                d: function () {
                    return ~c;
                },
            };
        };
    var dopt = function (dat, opt, pre, post, st2) {
        if (!st2 && ((st2 = { l: 1 }), opt.dictionary)) {
            var dict = opt.dictionary.subarray(-32768),
                newDat = new u8(dict.length + dat.length);
            (newDat.set(dict),
                newDat.set(dat, dict.length),
                (dat = newDat),
                (st2.w = dict.length));
        }
        return dflt(
            dat,
            opt.level == null ? 6 : opt.level,
            opt.mem == null
                ? st2.l
                    ? Math.ceil(
                          Math.max(8, Math.min(13, Math.log(dat.length))) * 1.5,
                      )
                    : 20
                : 12 + opt.mem,
            pre,
            post,
            st2,
        );
    };
    var wbytes = function (d2, b, v2) {
            for (; v2; ++b) ((d2[b] = v2), (v2 >>>= 8));
        },
        gzh = function (c, o) {
            var fn2 = o.filename;
            if (
                ((c[0] = 31),
                (c[1] = 139),
                (c[2] = 8),
                (c[8] = o.level < 2 ? 4 : o.level == 9 ? 2 : 0),
                (c[9] = 3),
                o.mtime != 0 &&
                    wbytes(
                        c,
                        4,
                        Math.floor(new Date(o.mtime || Date.now()) / 1e3),
                    ),
                fn2)
            ) {
                c[3] = 8;
                for (var i = 0; i <= fn2.length; ++i)
                    c[i + 10] = fn2.charCodeAt(i);
            }
        },
        gzs = function (d2) {
            (d2[0] != 31 || d2[1] != 139 || d2[2] != 8) &&
                err(6, "invalid gzip data");
            var flg = d2[3],
                st2 = 10;
            flg & 4 && (st2 += (d2[10] | (d2[11] << 8)) + 2);
            for (
                var zs = ((flg >> 3) & 1) + ((flg >> 4) & 1);
                zs > 0;
                zs -= !d2[st2++]
            );
            return st2 + (flg & 2);
        },
        gzl = function (d2) {
            var l = d2.length;
            return (
                (d2[l - 4] |
                    (d2[l - 3] << 8) |
                    (d2[l - 2] << 16) |
                    (d2[l - 1] << 24)) >>>
                0
            );
        },
        gzhl = function (o) {
            return 10 + (o.filename ? o.filename.length + 1 : 0);
        };
    function gzipSync(data, opts) {
        opts || (opts = {});
        var c = crc(),
            l = data.length;
        c.p(data);
        var d2 = dopt(data, opts, gzhl(opts), 8),
            s = d2.length;
        return (
            gzh(d2, opts),
            wbytes(d2, s - 8, c.d()),
            wbytes(d2, s - 4, l),
            d2
        );
    }
    function gunzipSync(data, opts) {
        var st2 = gzs(data);
        return (
            st2 + 8 > data.length && err(6, "invalid gzip data"),
            inflt(
                data.subarray(st2, -8),
                { i: 2 },
                (opts && opts.out) || new u8(gzl(data)),
                opts && opts.dictionary,
            )
        );
    }
    var td = typeof TextDecoder < "u" && /* @__PURE__ */ new TextDecoder(),
        tds = 0;
    try {
        (td.decode(et2, { stream: !0 }), (tds = 1));
    } catch {}

    // Protobuf helpers
    function decodeBase64(value) {
        let alphabet =
                "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
            output = [],
            buffer = 0,
            bits2 = 0;
        for (let character of value.replace(/[-_]/g, (item) =>
            item === "-" ? "+" : "/",
        )) {
            if (/\s|=/.test(character)) continue;
            let index = alphabet.indexOf(character);
            if (index < 0) throw new Error("invalid base64 string");
            ((buffer = (buffer << 6) | index),
                (bits2 += 6),
                bits2 >= 8 &&
                    ((bits2 -= 8), output.push((buffer >>> bits2) & 255)));
        }
        return new Uint8Array(output);
    }

    // UMP container
    var UmpReader = class {
            constructor(buffer) {
                ((this.buffer = buffer), (this.offset = 0));
            }
            readByte() {
                if (this.offset >= this.buffer.length)
                    throw new Error("Truncated UMP header");
                return this.buffer[this.offset++];
            }
            readVarint() {
                let first = this.readByte(),
                    size = 5;
                for (let candidate = 1; candidate < 5; candidate++)
                    if (!(first & (128 >> (candidate - 1)))) {
                        size = candidate;
                        break;
                    }
                let bits2 = size === 5 ? 0 : 8 - size,
                    value = size === 5 ? 0 : first & ((1 << (8 - size)) - 1);
                for (let index = 1; index < size; index++)
                    ((value += this.readByte() * 2 ** bits2), (bits2 += 8));
                return value;
            }
            readPart() {
                let type = this.readVarint(),
                    length = this.readVarint();
                if (length > this.buffer.length - this.offset)
                    throw new Error("Truncated UMP payload");
                const data = this.buffer.subarray(
                    this.offset,
                    this.offset + length,
                );
                return ((this.offset += length), { type, data });
            }
            get hasNext() {
                return this.offset < this.buffer.length;
            }
        },
        UmpWriter = class {
            constructor(capacity = 1024) {
                ((this.buffer = new Uint8Array(capacity)), (this.length = 0));
            }
            ensureCapacity(additionalLength) {
                if (this.length + additionalLength <= this.buffer.length)
                    return;
                let expanded = new Uint8Array(
                    Math.max(
                        this.buffer.length * 2,
                        this.length + additionalLength,
                    ),
                );
                (expanded.set(this.buffer), (this.buffer = expanded));
            }
            writeByte(value) {
                (this.ensureCapacity(1),
                    (this.buffer[this.length++] = value & 255));
            }
            writeVarint(value) {
                if (!Number.isInteger(value) || value < 0 || value > 0xffffffff)
                    throw new Error("Invalid UMP integer");
                const size =
                    value < 128
                        ? 1
                        : value < 16384
                          ? 2
                          : value < 2097152
                            ? 3
                            : value < 268435456
                              ? 4
                              : 5;
                size === 1
                    ? this.writeByte(value)
                    : size === 2
                      ? (this.writeByte((value & 63) | 128),
                        this.writeByte(value >> 6))
                      : size === 3
                        ? (this.writeByte((value & 31) | 192),
                          this.writeByte((value >> 5) & 255),
                          this.writeByte(value >> 13))
                        : size === 4
                          ? (this.writeByte((value & 15) | 224),
                            this.writeByte((value >> 4) & 255),
                            this.writeByte((value >> 12) & 255),
                            this.writeByte(value >> 20))
                          : (this.writeByte(240),
                            this.writeByte(value),
                            this.writeByte(value >> 8),
                            this.writeByte(value >> 16),
                            this.writeByte(value >> 24));
            }
            writePart(part) {
                (this.writeVarint(part.type),
                    this.writeVarint(part.data.length),
                    this.ensureCapacity(part.data.length),
                    this.buffer.set(part.data, this.length),
                    (this.length += part.data.length));
            }
            finish() {
                return this.buffer.subarray(0, this.length);
            }
        };

    // Cipher helpers
    /*! noble-ciphers - MIT License (c) 2023 Paul Miller (paulmillr.com) */
    function isBytes(a) {
        return (
            a instanceof Uint8Array ||
            (ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array")
        );
    }
    function abytes(b, ...lengths) {
        if (!isBytes(b)) throw new Error("Uint8Array expected");
        if (lengths.length > 0 && !lengths.includes(b.length))
            throw new Error(
                "Uint8Array expected of length " +
                    lengths +
                    ", got length=" +
                    b.length,
            );
    }
    function u82(arr) {
        return new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
    }
    function u32(arr) {
        return new Uint32Array(
            arr.buffer,
            arr.byteOffset,
            Math.floor(arr.byteLength / 4),
        );
    }
    function clean(...arrays) {
        for (let i = 0; i < arrays.length; i++) arrays[i].fill(0);
    }
    var isLE = new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68;
    function overlapBytes(a, b) {
        return (
            a.buffer === b.buffer && // best we can do, may fail with an obscure Proxy
            a.byteOffset < b.byteOffset + b.byteLength && // a starts before b end
            b.byteOffset < a.byteOffset + a.byteLength
        );
    }
    function complexOverlapBytes(input, output) {
        if (overlapBytes(input, output) && input.byteOffset < output.byteOffset)
            throw new Error(
                "complex overlap of input and output is not supported",
            );
    }
    var wrapCipher = /* @__NO_SIDE_EFFECTS__ */ (params, constructor) => {
        function wrappedCipher(key, ...args) {
            if ((abytes(key), !isLE))
                throw new Error(
                    "Non little-endian hardware is not yet supported",
                );
            if (params.nonceLength !== void 0) {
                let nonce = args[0];
                if (!nonce) throw new Error("nonce / iv required");
                params.varSizeNonce
                    ? abytes(nonce)
                    : abytes(nonce, params.nonceLength);
            }
            let tagl = params.tagLength;
            tagl && args[1] !== void 0 && abytes(args[1]);
            let cipher = constructor(key, ...args),
                checkOutput = (fnLength, output) => {
                    if (output !== void 0) {
                        if (fnLength !== 2)
                            throw new Error("cipher output not supported");
                        abytes(output);
                    }
                },
                called = !1;
            return {
                encrypt(data, output) {
                    if (called)
                        throw new Error(
                            "cannot encrypt() twice with same key + nonce",
                        );
                    return (
                        (called = !0),
                        abytes(data),
                        checkOutput(cipher.encrypt.length, output),
                        cipher.encrypt(data, output)
                    );
                },
                decrypt(data, output) {
                    if ((abytes(data), tagl && data.length < tagl))
                        throw new Error(
                            "invalid ciphertext length: smaller than tagLength=" +
                                tagl,
                        );
                    return (
                        checkOutput(cipher.decrypt.length, output),
                        cipher.decrypt(data, output)
                    );
                },
            };
        }
        return (Object.assign(wrappedCipher, params), wrappedCipher);
    };
    function getOutput(expectedLength, out, onlyAligned = !0) {
        if (out === void 0) return new Uint8Array(expectedLength);
        if (out.length !== expectedLength)
            throw new Error(
                "invalid output length, expected " +
                    expectedLength +
                    ", got: " +
                    out.length,
            );
        if (onlyAligned && !isAligned32(out))
            throw new Error("invalid output, must be aligned");
        return out;
    }
    function isAligned32(bytes) {
        return bytes.byteOffset % 4 === 0;
    }
    function copyBytes(bytes) {
        return Uint8Array.from(bytes);
    }

    // AES-CTR
    var BLOCK_SIZE = 16,
        BLOCK_SIZE32 = 4;
    var POLY = 283;
    function mul2(n) {
        return (n << 1) ^ (POLY & -(n >> 7));
    }
    function mul(a, b) {
        let res = 0;
        for (; b > 0; b >>= 1) ((res ^= a & -(b & 1)), (a = mul2(a)));
        return res;
    }
    var sbox = /* @__PURE__ */ (() => {
        let t = new Uint8Array(256);
        for (let i = 0, x2 = 1; i < 256; i++, x2 ^= mul2(x2)) t[i] = x2;
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
    var rotr32_8 = (n) => (n << 24) | (n >>> 8),
        rotl32_8 = (n) => (n << 8) | (n >>> 24);
    function genTtable(sbox2, fn2) {
        if (sbox2.length !== 256) throw new Error("Wrong sbox length");
        let T0 = new Uint32Array(256).map((_2, j) => fn2(sbox2[j])),
            T1 = T0.map(rotl32_8),
            T2 = T1.map(rotl32_8),
            T3 = T2.map(rotl32_8),
            T01 = new Uint32Array(256 * 256),
            T23 = new Uint32Array(256 * 256),
            sbox22 = new Uint16Array(256 * 256);
        for (let i = 0; i < 256; i++)
            for (let j = 0; j < 256; j++) {
                let idx = i * 256 + j;
                ((T01[idx] = T0[i] ^ T1[j]),
                    (T23[idx] = T2[i] ^ T3[j]),
                    (sbox22[idx] = (sbox2[i] << 8) | sbox2[j]));
            }
        return { sbox: sbox2, sbox2: sbox22, T0, T1, T2, T3, T01, T23 };
    }
    var tableEncoding = /* @__PURE__ */ genTtable(
        sbox,
        (s) => (mul(s, 3) << 24) | (s << 16) | (s << 8) | mul(s, 2),
    );
    var xPowers = /* @__PURE__ */ (() => {
        let p2 = new Uint8Array(16);
        for (let i = 0, x2 = 1; i < 16; i++, x2 = mul2(x2)) p2[i] = x2;
        return p2;
    })();
    function expandKeyLE(key) {
        abytes(key);
        let len = key.length;
        if (![16, 24, 32].includes(len))
            throw new Error(
                "aes: invalid key size, should be 16, 24 or 32, got " + len,
            );
        let { sbox2 } = tableEncoding,
            toClean = [];
        isAligned32(key) || toClean.push((key = copyBytes(key)));
        let k32 = u32(key),
            Nk = k32.length,
            subByte = (n) => applySbox(sbox2, n, n, n, n),
            xk = new Uint32Array(len + 28);
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
        return (
            T01[((s0 << 8) & 65280) | ((s1 >>> 8) & 255)] ^
            T23[((s2 >>> 8) & 65280) | ((s3 >>> 24) & 255)]
        );
    }
    function applySbox(sbox2, s0, s1, s2, s3) {
        return (
            sbox2[(s0 & 255) | (s1 & 65280)] |
            (sbox2[((s2 >>> 16) & 255) | ((s3 >>> 16) & 65280)] << 16)
        );
    }
    function encrypt(xk, s0, s1, s2, s3) {
        let { sbox2, T01, T23 } = tableEncoding,
            k = 0;
        ((s0 ^= xk[k++]), (s1 ^= xk[k++]), (s2 ^= xk[k++]), (s3 ^= xk[k++]));
        let rounds = xk.length / 4 - 2;
        for (let i = 0; i < rounds; i++) {
            let t02 = xk[k++] ^ apply0123(T01, T23, s0, s1, s2, s3),
                t12 = xk[k++] ^ apply0123(T01, T23, s1, s2, s3, s0),
                t22 = xk[k++] ^ apply0123(T01, T23, s2, s3, s0, s1),
                t32 = xk[k++] ^ apply0123(T01, T23, s3, s0, s1, s2);
            ((s0 = t02), (s1 = t12), (s2 = t22), (s3 = t32));
        }
        let t0 = xk[k++] ^ applySbox(sbox2, s0, s1, s2, s3),
            t1 = xk[k++] ^ applySbox(sbox2, s1, s2, s3, s0),
            t2 = xk[k++] ^ applySbox(sbox2, s2, s3, s0, s1),
            t3 = xk[k++] ^ applySbox(sbox2, s3, s0, s1, s2);
        return { s0: t0, s1: t1, s2: t2, s3: t3 };
    }
    function ctrCounter(xk, nonce, src, dst) {
        (abytes(nonce, BLOCK_SIZE), abytes(src));
        let srcLen = src.length;
        ((dst = getOutput(srcLen, dst)), complexOverlapBytes(src, dst));
        let ctr2 = nonce,
            c32 = u32(ctr2),
            { s0, s1, s2, s3 } = encrypt(xk, c32[0], c32[1], c32[2], c32[3]),
            src32 = u32(src),
            dst32 = u32(dst);
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
            let b32 = new Uint32Array([s0, s1, s2, s3]),
                buf = u82(b32);
            for (let i = start, pos = 0; i < srcLen; i++, pos++)
                dst[i] = src[i] ^ buf[pos];
            clean(b32);
        }
        return dst;
    }
    var ctr = /* @__PURE__ */ wrapCipher(
        { blockSize: 16, nonceLength: 16 },
        function (key, nonce) {
            function processCtr(buf, dst) {
                if (
                    (abytes(buf),
                    dst !== void 0 && (abytes(dst), !isAligned32(dst)))
                )
                    throw new Error("unaligned destination");
                let xk = expandKeyLE(key),
                    n = copyBytes(nonce),
                    toClean = [xk, n];
                isAligned32(buf) || toClean.push((buf = copyBytes(buf)));
                let out = ctrCounter(xk, n, buf, dst);
                return (clean(...toClean), out);
            }
            return {
                encrypt: (plaintext, dst) => processCtr(plaintext, dst),
                decrypt: (ciphertext, dst) => processCtr(ciphertext, dst),
            };
        },
    );

    // Hash helpers
    /*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
    function isBytes2(a) {
        return (
            a instanceof Uint8Array ||
            (ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array")
        );
    }
    function anumber(n) {
        if (!Number.isSafeInteger(n) || n < 0)
            throw new Error("positive integer expected, got " + n);
    }
    function abytes2(b, ...lengths) {
        if (!isBytes2(b)) throw new Error("Uint8Array expected");
        if (lengths.length > 0 && !lengths.includes(b.length))
            throw new Error(
                "Uint8Array expected of length " +
                    lengths +
                    ", got length=" +
                    b.length,
            );
    }
    function ahash(h2) {
        if (typeof h2 != "function" || typeof h2.create != "function")
            throw new Error("Hash should be wrapped by utils.createHasher");
        (anumber(h2.outputLen), anumber(h2.blockLen));
    }
    function aexists(instance, checkFinished = !0) {
        if (instance.destroyed)
            throw new Error("Hash instance has been destroyed");
        if (checkFinished && instance.finished)
            throw new Error("Hash#digest() has already been called");
    }
    function aoutput(out, instance) {
        abytes2(out);
        let min = instance.outputLen;
        if (out.length < min)
            throw new Error(
                "digestInto() expects output buffer of length at least " + min,
            );
    }
    function clean2(...arrays) {
        for (let i = 0; i < arrays.length; i++) arrays[i].fill(0);
    }
    function createView2(arr) {
        return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
    }
    function rotr(word, shift) {
        return (word << (32 - shift)) | (word >>> shift);
    }
    function utf8ToBytes(str) {
        if (typeof str != "string") throw new Error("string expected");
        return new Uint8Array(new TextEncoder().encode(str));
    }
    function toBytes(data) {
        return (
            typeof data == "string" && (data = utf8ToBytes(data)),
            abytes2(data),
            data
        );
    }
    function concatBytes2(...arrays) {
        let sum = 0;
        for (let i = 0; i < arrays.length; i++) {
            let a = arrays[i];
            (abytes2(a), (sum += a.length));
        }
        let res = new Uint8Array(sum);
        for (let i = 0, pad = 0; i < arrays.length; i++) {
            let a = arrays[i];
            (res.set(a, pad), (pad += a.length));
        }
        return res;
    }
    var Hash = class {};
    function createHasher(hashCons) {
        let hashC = (msg) => hashCons().update(toBytes(msg)).digest(),
            tmp = hashCons();
        return (
            (hashC.outputLen = tmp.outputLen),
            (hashC.blockLen = tmp.blockLen),
            (hashC.create = () => hashCons()),
            hashC
        );
    }

    // HMAC
    var HMAC = class extends Hash {
            constructor(hash, _key) {
                (super(),
                    (this.finished = !1),
                    (this.destroyed = !1),
                    ahash(hash));
                let key = toBytes(_key);
                if (
                    ((this.iHash = hash.create()),
                    typeof this.iHash.update != "function")
                )
                    throw new Error(
                        "Expected instance of class which extends utils.Hash",
                    );
                ((this.blockLen = this.iHash.blockLen),
                    (this.outputLen = this.iHash.outputLen));
                let blockLen = this.blockLen,
                    pad = new Uint8Array(blockLen);
                pad.set(
                    key.length > blockLen
                        ? hash.create().update(key).digest()
                        : key,
                );
                for (let i = 0; i < pad.length; i++) pad[i] ^= 54;
                (this.iHash.update(pad), (this.oHash = hash.create()));
                for (let i = 0; i < pad.length; i++) pad[i] ^= 106;
                (this.oHash.update(pad), clean2(pad));
            }
            update(buf) {
                return (aexists(this), this.iHash.update(buf), this);
            }
            digestInto(out) {
                (aexists(this),
                    abytes2(out, this.outputLen),
                    (this.finished = !0),
                    this.iHash.digestInto(out),
                    this.oHash.update(out),
                    this.oHash.digestInto(out),
                    this.destroy());
            }
            digest() {
                let out = new Uint8Array(this.oHash.outputLen);
                return (this.digestInto(out), out);
            }
            _cloneInto(to) {
                to || (to = Object.create(Object.getPrototypeOf(this), {}));
                let { oHash, iHash, finished, destroyed, blockLen, outputLen } =
                    this;
                return (
                    (to = to),
                    (to.finished = finished),
                    (to.destroyed = destroyed),
                    (to.blockLen = blockLen),
                    (to.outputLen = outputLen),
                    (to.oHash = oHash._cloneInto(to.oHash)),
                    (to.iHash = iHash._cloneInto(to.iHash)),
                    to
                );
            }
            clone() {
                return this._cloneInto();
            }
            destroy() {
                ((this.destroyed = !0),
                    this.oHash.destroy(),
                    this.iHash.destroy());
            }
        },
        hmac = (hash, key, message) =>
            new HMAC(hash, key).update(message).digest();
    hmac.create = (hash, key) => new HMAC(hash, key);

    // SHA-2 base
    function setBigUint642(view, byteOffset, value, isLE2) {
        if (typeof view.setBigUint64 == "function")
            return view.setBigUint64(byteOffset, value, isLE2);
        let _32n = BigInt(32),
            _u32_max = BigInt(4294967295),
            wh = Number((value >> _32n) & _u32_max),
            wl = Number(value & _u32_max),
            h2 = isLE2 ? 4 : 0,
            l = isLE2 ? 0 : 4;
        (view.setUint32(byteOffset + h2, wh, isLE2),
            view.setUint32(byteOffset + l, wl, isLE2));
    }
    function Chi(a, b, c) {
        return (a & b) ^ (~a & c);
    }
    function Maj(a, b, c) {
        return (a & b) ^ (a & c) ^ (b & c);
    }
    var HashMD = class extends Hash {
            constructor(blockLen, outputLen, padOffset, isLE2) {
                (super(),
                    (this.finished = !1),
                    (this.length = 0),
                    (this.pos = 0),
                    (this.destroyed = !1),
                    (this.blockLen = blockLen),
                    (this.outputLen = outputLen),
                    (this.padOffset = padOffset),
                    (this.isLE = isLE2),
                    (this.buffer = new Uint8Array(blockLen)),
                    (this.view = createView2(this.buffer)));
            }
            update(data) {
                (aexists(this), (data = toBytes(data)), abytes2(data));
                let { view, buffer, blockLen } = this,
                    len = data.length;
                for (let pos = 0; pos < len;) {
                    let take = Math.min(blockLen - this.pos, len - pos);
                    if (take === blockLen) {
                        let dataView = createView2(data);
                        for (; blockLen <= len - pos; pos += blockLen)
                            this.process(dataView, pos);
                        continue;
                    }
                    (buffer.set(data.subarray(pos, pos + take), this.pos),
                        (this.pos += take),
                        (pos += take),
                        this.pos === blockLen &&
                            (this.process(view, 0), (this.pos = 0)));
                }
                return ((this.length += data.length), this.roundClean(), this);
            }
            digestInto(out) {
                (aexists(this), aoutput(out, this), (this.finished = !0));
                let { buffer, view, blockLen, isLE: isLE2 } = this,
                    { pos } = this;
                ((buffer[pos++] = 128),
                    clean2(this.buffer.subarray(pos)),
                    this.padOffset > blockLen - pos &&
                        (this.process(view, 0), (pos = 0)));
                for (let i = pos; i < blockLen; i++) buffer[i] = 0;
                (setBigUint642(
                    view,
                    blockLen - 8,
                    BigInt(this.length * 8),
                    isLE2,
                ),
                    this.process(view, 0));
                let oview = createView2(out),
                    len = this.outputLen;
                if (len % 4)
                    throw new Error(
                        "_sha2: outputLen should be aligned to 32bit",
                    );
                let outLen = len / 4,
                    state = this.get();
                if (outLen > state.length)
                    throw new Error("_sha2: outputLen bigger than state");
                for (let i = 0; i < outLen; i++)
                    oview.setUint32(4 * i, state[i], isLE2);
            }
            digest() {
                let { buffer, outputLen } = this;
                this.digestInto(buffer);
                let res = buffer.slice(0, outputLen);
                return (this.destroy(), res);
            }
            _cloneInto(to) {
                (to || (to = new this.constructor()), to.set(...this.get()));
                let { blockLen, buffer, length, finished, destroyed, pos } =
                    this;
                return (
                    (to.destroyed = destroyed),
                    (to.finished = finished),
                    (to.length = length),
                    (to.pos = pos),
                    length % blockLen && to.buffer.set(buffer),
                    to
                );
            }
            clone() {
                return this._cloneInto();
            }
        },
        SHA256_IV = /* @__PURE__ */ Uint32Array.from([
            1779033703, 3144134277, 1013904242, 2773480762, 1359893119,
            2600822924, 528734635, 1541459225,
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
        ]),
        SHA256_W = /* @__PURE__ */ new Uint32Array(64),
        SHA256 = class extends HashMD {
            constructor(outputLen = 32) {
                (super(64, outputLen, 8, !1),
                    (this.A = SHA256_IV[0] | 0),
                    (this.B = SHA256_IV[1] | 0),
                    (this.C = SHA256_IV[2] | 0),
                    (this.D = SHA256_IV[3] | 0),
                    (this.E = SHA256_IV[4] | 0),
                    (this.F = SHA256_IV[5] | 0),
                    (this.G = SHA256_IV[6] | 0),
                    (this.H = SHA256_IV[7] | 0));
            }
            get() {
                let { A, B, C, D: D2, E: E2, F, G, H: H2 } = this;
                return [A, B, C, D2, E2, F, G, H2];
            }
            // prettier-ignore
            set(A, B, C, D2, E2, F, G, H2) {
      this.A = A | 0, this.B = B | 0, this.C = C | 0, this.D = D2 | 0, this.E = E2 | 0, this.F = F | 0, this.G = G | 0, this.H = H2 | 0;
    }
            process(view, offset) {
                for (let i = 0; i < 16; i++, offset += 4)
                    SHA256_W[i] = view.getUint32(offset, !1);
                for (let i = 16; i < 64; i++) {
                    let W15 = SHA256_W[i - 15],
                        W2 = SHA256_W[i - 2],
                        s0 = rotr(W15, 7) ^ rotr(W15, 18) ^ (W15 >>> 3),
                        s1 = rotr(W2, 17) ^ rotr(W2, 19) ^ (W2 >>> 10);
                    SHA256_W[i] =
                        (s1 + SHA256_W[i - 7] + s0 + SHA256_W[i - 16]) | 0;
                }
                let { A, B, C, D: D2, E: E2, F, G, H: H2 } = this;
                for (let i = 0; i < 64; i++) {
                    let sigma1 = rotr(E2, 6) ^ rotr(E2, 11) ^ rotr(E2, 25),
                        T1 =
                            (H2 +
                                sigma1 +
                                Chi(E2, F, G) +
                                SHA256_K[i] +
                                SHA256_W[i]) |
                            0,
                        T2 =
                            ((rotr(A, 2) ^ rotr(A, 13) ^ rotr(A, 22)) +
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
            roundClean() {
                clean2(SHA256_W);
            }
            destroy() {
                (this.set(0, 0, 0, 0, 0, 0, 0, 0), clean2(this.buffer));
            }
        };
    var sha256 = /* @__PURE__ */ createHasher(() => new SHA256());

    // SHA-256
    var sha2562 = sha256;

    // UMP crypto
    var CryptoContext = class {
        constructor(key) {
            ((this.aesKey = key.slice(0, 16)), (this.hmacKey = key.slice(16)));
        }
        signature(content) {
            return hmac(sha2562, this.hmacKey, concatBytes2(content, this.iv));
        }
        decrypt(part) {
            this.iv = part.iv;
            let signature = this.signature(part.encryptedContent);
            if (!equalBytes2(signature, part.hmac))
                throw new Error("HMAC verification failed");
            return ctr(this.aesKey, this.iv).decrypt(part.encryptedContent);
        }
        encrypt(content) {
            let encryptedContent = ctr(this.aesKey, this.iv).encrypt(content);
            return { encryptedContent, hmac: this.signature(encryptedContent) };
        }
    };
    function equalBytes2(left, right) {
        if (left.length !== right.length) return !1;
        let difference = 0;
        for (let index = 0; index < left.length; index++)
            difference |= left[index] ^ right[index];
        return difference === 0;
    }

    // UMP response handler
    var ONESIE_HEADER_PART = 10,
        ENCRYPTED_RESPONSE_PART = 11,
        ONESIE_INNERTUBE_RESPONSE = 25;
    function headerType(bytes) {
        const field = wireFields(bytes).find(
            (field) => field.no === 1 && field.wire === 0,
        );
        return field ? numberValue(field.data) : 0;
    }
    function rewriteEncryptedPart(bytes, crypto, parameters) {
        const part = EncryptedResponsePart.fromBinary(bytes);
        if (part.compressionAlgorithm > 1)
            throw new Error("Unsupported UMP compression");
        const decrypted = crypto.decrypt(part);
        const gzipped = decrypted[0] === 31 && decrypted[1] === 139;
        if (part.compressionAlgorithm === 1 && !gzipped)
            throw new Error("Invalid UMP gzip payload");
        const plaintext = gzipped ? gunzipSync(decrypted) : decrypted;
        const response = OnesieInnertubeResponse.fromBinary(plaintext);
        for (let content of response.contents)
            (content.player && enhancePlayer(content.player, parameters),
                content.next && removeFeedAds(content.next, parameters));
        const output = OnesieInnertubeResponse.toBinary(response);
        if (sameBytes(output, plaintext)) return bytes;
        const compressed = gzipped
            ? gzipSync(output, { level: 0, mtime: 0 })
            : output;
        const encrypted = crypto.encrypt(compressed);
        return (
            (part.hmac = encrypted.hmac),
            (part.encryptedContent = encrypted.encryptedContent),
            EncryptedResponsePart.toBinary(part)
        );
    }
    function handleUmpResponse() {
        let environment2 = new SurgeEnvironment(),
            key = platformKey(environment2.request);
        // Keep redirector responses intact so the CDN request can be intercepted.
        if (
            Number(environment2.response?.status) >= 300 &&
            Number(environment2.response?.status) < 400
        )
            return environment2.exit();
        try {
            let { clientKey } = currentKeys(environment2, key);
            if (!clientKey)
                throw new Error("YouTubeConfig requires stored clientKey");
            if (!environment2.response?.bodyBytes)
                throw new Error("YouTubeConfig requires body");
            let crypto = new CryptoContext(decodeBase64(clientKey)),
                reader = new UmpReader(environment2.response.bodyBytes),
                writer = new UmpWriter(environment2.response.bodyBytes.length),
                rewriteNextPart = !1;
            const parameters = environment2.parameters({ blockGames: true });
            for (; reader.hasNext;) {
                let part = reader.readPart();
                (part.type === ONESIE_HEADER_PART
                    ? (rewriteNextPart =
                          headerType(part.data) === ONESIE_INNERTUBE_RESPONSE)
                    : part.type === ENCRYPTED_RESPONSE_PART &&
                      rewriteNextPart &&
                      ((part.data = rewriteEncryptedPart(
                          part.data,
                          crypto,
                          parameters,
                      )),
                      (rewriteNextPart = !1)),
                    writer.writePart(part));
            }
            environment2.done({ bodyBytes: writer.finish() });
        } catch (error) {
            (console.log(String(error)),
                clearCurrentKeys(environment2, key),
                environment2.done({
                    status: 200,
                    headers: { "Content-Type": "text/plain" },
                    bodyBytes: new Uint8Array(),
                }));
        }
    }

    // Response dispatch
    $request.url.includes("/initplayback")
        ? handleUmpResponse()
        : handleApiResponse();
})();
