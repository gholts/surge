const AD_LAYOUT =
    /^(?:inline_injection_entrypoint_layout|video_display_button_group_layout|full_width_portrait_image_layout|full_width_square_image_layout|video_display_full_buttoned_layout)\.eml(?:-js)?(?:-fe)?$/;
// Match active shopping components, not product words in titles or URLs.
const SHOPPING_LAYOUT =
    /^(?:shopping_|products?_in_video_)[a-z0-9_]+\.eml(?:-js)?(?:-fe)?$/;
const AD_TRACKING = textEncoder.encode("/pagead/");
const GAME_CARD = textEncoder.encode("mini_game_card.eml");
const STORE_CARD = textEncoder.encode("shopping_item_card_list.eml");
const STORE_TAB = textEncoder.encode("store");
const LIVE_BADGE = textEncoder.encode("youtube_outline_experimental/live_24pt");
const IMMERSIVE_LIVE = textEncoder.encode("immersive_live");
const PREMIUM_BROWSE_ID = textEncoder.encode("SPunlimited");
function containsMarker(bytes: Uint8Array, marker: Uint8Array = AD_TRACKING) {
    if (!marker.length) return true;
    const end = bytes.length - marker.length;
    let probes = 0,
        windowStart = 0;
    for (
        let i = bytes.indexOf(marker[0]);
        i >= 0 && i <= end;
        i = bytes.indexOf(marker[0], i + 1)
    ) {
        let matched = true;
        for (let j = 1; j < marker.length; j++)
            if (bytes[i + j] !== marker[j]) {
                matched = false;
                break;
            }
        if (matched) return true;
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
function scanMarkerTail(bytes: Uint8Array, marker: Uint8Array, start: number) {
    outer: for (let i = start; i <= bytes.length - marker.length; i++) {
        for (let j = 0; j < marker.length; j++)
            if (bytes[i + j] !== marker[j]) continue outer;
        return true;
    }
    return false;
}
function hasVerticalLiveTarget(lockup: Message<"VideoLockup">) {
    let bytes = unknownFields(lockup).find(
        (field) => field.no === 18 && field.wire === 2,
    )?.data;
    // Primary tap target only; a channel avatar may link to a different live.
    try {
        for (const no of [4, 169495254, 462702848, 1, 139608561, 50, 7, 3]) {
            if (!bytes) return false;
            bytes = wireFields(bytes).find(
                (field) => field.no === no && field.wire === 2,
            )?.data;
        }
        return !!bytes && sameBytes(bytes, IMMERSIVE_LIVE);
    } catch {
        return false;
    }
}
function isStoreTab(item: ProtoValue) {
    const params = (item as Message<"BrowseTabSupportedRenderer">).tabRenderer
        ?.endpoint?.browse?.params;
    if (!params) return false;
    try {
        const target = wireFields(
            decodeBase64(decodeURIComponent(params)),
        ).find((field) => field.no === 2 && field.wire === 2);
        return !!target && sameBytes(target.data, STORE_TAB);
    } catch {
        return false;
    }
}
function isPremiumBanner(bytes: Uint8Array) {
    // Statement banner's CTA browse ID; independent of localized display text.
    const path = [2, 11, 1, 4, 170382656, 1, 169495254, 48687626, 2];
    function matches(bytes: Uint8Array, depth: number): boolean {
        if (depth === path.length) return sameBytes(bytes, PREMIUM_BROWSE_ID);
        const fields = wireFields(bytes).filter(
            (field) => field.no === path[depth] && field.wire === 2,
        );
        // The executor contains a list of commands; other hops are singletons.
        return (
            (depth === 5 || fields.length === 1) &&
            fields.some((field) => matches(field.data, depth + 1))
        );
    }
    try {
        return matches(bytes, 0);
    } catch {
        return false;
    }
}
function isBlockedObject(
    object: ContentNode,
    blockGames: boolean,
    blockVerticalLive: boolean,
    blockStore: boolean,
) {
    const layout = object.layoutRender?.eml?.split("|")[0];
    if (
        (layout &&
            (AD_LAYOUT.test(layout) ||
                (blockStore && SHOPPING_LAYOUT.test(layout)))) ||
        (blockStore && object.shoppingShelf) ||
        object.sponsoredVideo ||
        object.sponsoredDisplay ||
        (blockVerticalLive &&
            object.videoLockup &&
            hasVerticalLiveTarget(object.videoLockup))
    )
        return true;
    return unknownFields(object).some(
        (field) =>
            field.wire === 2 &&
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
                            containsMarker(field.data, STORE_CARD))))),
    );
}
function transformContent(
    message: ProtoNode,
    {
        blockGames = true,
        blockVerticalLive = false,
        jumpAhead = true,
        blockStore = true,
        blockAi = true,
        onTheGo = true,
    }: Options = {},
) {
    let changed = transformMenus(message);
    if (onTheGo)
        try {
            changed = enableOnTheGo(message as Message<"Next">) || changed;
        } catch (error) {
            console.log("YouTube On-the-go: " + error);
        }
    const BLOCKED = 1,
        EMPTY = 2;
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
    function visit(object: ProtoValue | undefined, classify = false): number {
        if (!object || typeof object !== "object" || ArrayBuffer.isView(object))
            return 0;
        if (Array.isArray(object)) {
            let flags = 0;
            for (const child of object)
                flags |= visit(child, classify) & BLOCKED;
            return flags;
        }
        // Local and descendant blocking facts describe the pre-edit tree.
        let blocked =
            classify &&
            (isBlockedObject(
                object as ContentNode,
                blockGames,
                blockVerticalLive,
                blockStore,
            ) ||
                (blockAi && isAiOnlyCarousel(object)));
        const layout = (
            object as ContentNode
        ).renderInfo?.layoutRender?.eml?.split("|")[0];
        let empty =
            !!layout &&
            (AD_LAYOUT.test(layout) ||
                (blockStore && SHOPPING_LAYOUT.test(layout)));
        if (classify && (blocked || empty)) return BLOCKED;
        if (blockAi) changed = removeAi(object) || changed;
        const state = object[wireState];
        for (const name of Object.keys(object)) {
            if (!classify && state?.deferred) {
                const spec = schema[state.type!].find(
                    ([, key]) => key === name,
                );
                if (
                    spec &&
                    !contentTypes.has(spec[2]) &&
                    !filtered.has(name) &&
                    !pruned.has(name) &&
                    name !== "promotedContents" &&
                    !(blockStore && (name === "tabs" || name === "attachments"))
                )
                    continue;
            }
            const child = object[name];
            if (
                !child ||
                typeof child !== "object" ||
                ArrayBuffer.isView(child)
            )
                continue;
            if (!Array.isArray(child)) {
                const flags = visit(child, classify);
                if (classify && flags & BLOCKED) return BLOCKED;
                blocked = !!(flags & BLOCKED) || blocked;
                if (flags & EMPTY && wrappers.has(name)) empty = true;
                continue;
            }
            let keep: ProtoValue[] | undefined;
            const filterItems = filtered.has(name),
                pruneItems = pruned.has(name);
            const filterTabs = blockStore && name === "tabs",
                filterAttachments = blockStore && name === "attachments";
            const filterPromoted = name === "promotedContents";
            for (let index = 0; index < child.length; index++) {
                const item = child[index];
                const direct =
                    (filterTabs && isStoreTab(item)) ||
                    (filterAttachments &&
                        (item as Message<"Attachment">).products?.length) ||
                    (filterPromoted && containsMarker(item as Uint8Array));
                const flags =
                    direct && !classify
                        ? 0
                        : visit(item, classify || filterItems);
                if (classify && flags & BLOCKED) return BLOCKED;
                // Aggregate before deletion: an outer candidate still contains its original ad.
                blocked = !!(flags & BLOCKED) || blocked;
                const remove =
                    direct ||
                    (filterItems && flags & BLOCKED) ||
                    (pruneItems && flags & EMPTY);
                if (remove) keep ??= child.slice(0, index);
                else if (keep) keep.push(item);
            }
            if (keep) {
                setField(object, name, keep);
                changed = true;
                if (!keep.length && (filterItems || pruneItems)) empty = true;
            }
            if (
                blockStore &&
                name === "attachments" &&
                !(keep ?? child).length &&
                object.attachmentStateKey !== undefined
            )
                changed = removeField(object, "attachmentStateKey") || changed;
        }
        if (jumpAhead && (object as ContentNode).smartSkipButton)
            changed =
                unlockJumpAhead((object as ContentNode).smartSkipButton!) ||
                changed;
        return (blocked ? BLOCKED : 0) | (empty ? EMPTY : 0);
    }
    visit(message);
    return changed;
}
function unlockJumpAhead(button: Message<"SmartSkipButton">) {
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
            if (target.displayLimit === 0x7fffffff) continue;
            setField(target, "displayLimit", 0x7fffffff);
            changed = true;
        }
    return changed;
}
function transformMenus(message: ProtoNode) {
    const overlay = (message as Message<"Next">).playerOverlays?.renderer;
    if (!overlay?.overflowMenu) return false;
    try {
        const menu = unlockSpeedMenu(overlay.overflowMenu);
        const changed = !sameBytes(menu, overlay.overflowMenu);
        if (changed) setField(overlay, "overflowMenu", menu);
        return changed;
    } catch (error) {
        console.log("YouTube speed menu: " + error);
        return false;
    }
}
function unlockSpeedMenu(bytes: Uint8Array) {
    const upsell = textEncoder.encode("PApremium_upsell");
    // Overflow item → inline panel → playback-rate selector model (1602).
    return rewriteBinaryPath(
        bytes,
        [
            66439850, 1, 153515154, 172660663, 1, 168777401, 5, 407694004, 4, 4,
            170382688, 1, 169495254, 443434441, 1, 1, 441573002, 4, 153515154,
            172660663, 1, 168777401, 5, 413471385, 1, 1602,
        ],
        (selector) => {
            const fields = wireFields(selector);
            const maximum = fields.find(
                (field) => field.no === 5 && field.wire === 5,
            );
            if (!maximum) return selector;
            const rate = new DataView(
                maximum.data.buffer,
                maximum.data.byteOffset,
                4,
            ).getFloat32(0, true);
            if (!(rate > 0)) return selector; // Keep disabled/live controls disabled.
            let expanded = selector;
            if (rate < 4) {
                const limit = new Uint8Array(4);
                new DataView(limit.buffer).setFloat32(0, 4, true);
                expanded = concatBytes(
                    fields.map((field) =>
                        field === maximum
                            ? concatBytes([varint(45), limit])
                            : field.raw,
                    ),
                );
            }
            // Presets already contain the real rate action; field 3 overrides it
            // with the Premium panel. Remove only that preset-specific override.
            return rewriteBinaryPath(expanded, [10, 1674], (preset) => {
                const fields = wireFields(preset);
                const keep = fields.filter(
                    (field) =>
                        field.no !== 3 ||
                        field.wire !== 2 ||
                        !containsMarker(field.data, upsell),
                );
                return keep.length === fields.length
                    ? preset
                    : concatBytes(keep.map((field) => field.raw));
            });
        },
    );
}
function transformPlayer(player: Message<"Player">, parameters: Options) {
    let changed = transformContent(player, parameters);
    changed = removeField(player, "paidPromotion") || changed;
    for (const name of ["adPlacements", "adSlots"] as const)
        if (player[name]?.length) {
            setField(player, name, []);
            changed = true;
        }
    const speed = player.playerConfig?.granularVariableSpeedConfig;
    if (
        speed?.maximumPlaybackRate !== undefined &&
        speed.maximumPlaybackRate > 0 &&
        speed.maximumPlaybackRate < 400
    ) {
        setField(speed, "maximumPlaybackRate", 400);
        changed = true;
    }
    if (player.playbackTracking)
        changed =
            removeField(
                player.playbackTracking,
                "pageadViewthroughconversion",
            ) || changed;
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
function removeField<M extends ProtoNode>(message: M, name: keyof M & string) {
    if (message[name] === undefined) return false;
    delete message[name];
    if (message[wireState]) markChanged(message[wireState], name);
    return true;
}
