function visitObjects(root: ProtoNode, callback: (object: ProtoNode) => void) {
    const stack: (ProtoValue | undefined)[] = [root];
    while (stack.length) {
        const object = stack.pop();
        if (!object || typeof object !== "object" || ArrayBuffer.isView(object))
            continue;
        callback(object as ProtoNode);
        stack.push(...Object.values(object));
    }
}
function responsePlayers(
    type: MessageType,
    message: ProtoNode,
): Message<"Player">[] {
    if (type === "Player") return [message as Message<"Player">];
    if (type === "Watch")
        return (message as Message<"Watch">).contents
            .map((content) => content.player)
            .filter(Boolean) as Message<"Player">[];
    if (type === "ResolveUrl") {
        const player = (message as Message<"ResolveUrl">).endpoint?.watch
            ?.embedded?.response?.player;
        return player ? [player] : [];
    }
    return [];
}
function removeShortsAds(message: Message<"Shorts">) {
    const keep = message.entries.filter(
        (entry) => !entry.command?.reelWatchEndpoint?.adClientParams?.isAd,
    );
    const changed = keep.length !== message.entries.length;
    if (changed) setField(message, "entries", keep);
    return changed;
}
function filterGuide(message: Message<"Guide">, parameters: Options) {
    const blocked = new Set(["SPunlimited"]);
    if (parameters.blockUpload) blocked.add("FEuploads");
    if (parameters.blockShorts) blocked.add("FEshorts");
    let changed = false;
    visitObjects(message, (object) => {
        const items = object.rendererItems as
            Message<"RendererItem">[] | undefined;
        if (!Array.isArray(items)) return;
        const keep = items.filter(
            (item) =>
                !blocked.has(
                    (item.iconRender?.browseId ?? item.labelRender?.browseId)!,
                ),
        );
        changed = keep.length !== items.length || changed;
        if (keep.length !== items.length)
            setField(object, "rendererItems", keep);
    });
    return changed;
}
function addPremiumSettings(message: Message<"Setting">) {
    let changed = false;
    visitObjects(message, (object) => {
        const category = object as Message<"SettingCategoryCollectionRenderer">;
        if (category.categoryId !== 10135) return;
        const endpoint = (enabled: boolean): Message<"ServiceEndpoint"> => ({
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
        ) {
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
    if (
        !message.settingItems.some(
            (item) => item.backgroundPlayBackSettingRenderer,
        )
    ) {
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

function transformNavigation(
    message: Message<"ResolveUrl">,
    parameters: Options,
) {
    const player = message.endpoint?.watch?.embedded?.response?.player;
    return player ? transformPlayer(player, parameters) : false;
}
