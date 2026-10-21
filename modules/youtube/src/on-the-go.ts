// Native action shapes verified against YouTube iOS 21.41.5 captures.
function nativeField(no: number, value: Uint8Array | string | number) {
    return encodeField(
        [
            no,
            "",
            typeof value === "number"
                ? "uint"
                : typeof value === "string"
                  ? "string"
                  : "bytes",
        ],
        value,
    );
}

function nativePath(path: number[], value: Uint8Array | string | number) {
    for (let i = path.length - 1; i >= 0; i--)
        value = nativeField(path[i], value);
    return value as Uint8Array;
}

function binaryAt(bytes: Uint8Array, path: number[]) {
    let current: Uint8Array | undefined = bytes;
    for (const no of path) {
        current = bytesField(current, no, true);
        if (!current) return;
    }
    return current;
}

const ON_THE_GO_ID = "on-the-go";
const ON_THE_GO_MENU_ID =
    "/youtube/app/player_overflow_menu/menu_item_on_the_go";
const MENU_MODEL_PATH = [153515154, 172660663, 1, 168777401, 5, 407694004];
const MENU_CONTEXT_PATH = [153515154, 172660663, 1, 168777401];

function panelIdentifier(panel: Message<"EngagementPanel">) {
    if (!panel.renderer) return;
    const fields = unknownFields(panel.renderer);
    const structured = fields.find((f) => f.no === 18 && f.wire === 2);
    const id =
        (structured && binaryAt(structured.data, [3])) ??
        fields.find((f) => f.no === 1 && f.wire === 2)?.data;
    return id && utf8.decode(id);
}

function onTheGoAction() {
    // Native serial action: log the click, dismiss the menu, set the trigger
    // entity, then open the panel. Its template observes the trigger entity.
    const state = "/youtube/app/on_the_go_menu_trigger_state";
    return nativeField(
        170382688,
        concatBytes([
            nativePath([1, 241780379, 1], 1),
            nativePath([1, 169495254, 423731020], new Uint8Array()),
            nativePath(
                [1, 169495254, 204158123, 170382688],
                concatBytes([
                    nativePath(
                        [1, 170382720],
                        concatBytes([
                            nativeField(1, state),
                            nativeField(
                                2,
                                concatBytes([
                                    nativeField(1, state),
                                    nativeField(2, 1),
                                ]),
                            ),
                        ]),
                    ),
                    nativePath(
                        [1, 169495254, 138681778, 10],
                        concatBytes([
                            nativeField(1, 1),
                            nativeField(3, ON_THE_GO_ID),
                        ]),
                    ),
                ]),
            ),
        ]),
    );
}

function onTheGoButton(
    icon: string,
    label: string,
    command: Uint8Array,
    id?: string,
) {
    return nativeField(
        461054335,
        concatBytes([
            nativeField(2, icon),
            nativeField(4, command),
            nativeField(5, label),
            ...(id
                ? [nativeField(17, "id.player_controls." + id + ".button")]
                : [nativeField(28, 1), nativeField(29, 1)]),
        ]),
    );
}

function makeOnTheGoPanel(
    message: Message<"Next">,
    sourceItem: Uint8Array,
    template: string,
    speedCommand: Uint8Array | undefined,
) {
    const nextResult = message.content?.nextResult;
    if (!nextResult) return;
    const raw = unknownFields(nextResult).find(
        (f) => f.no === 4 && f.wire === 2,
    );
    const metadata = raw && binaryAt(raw.data, [61479009]);
    const endpoint = unknownFields(message).find(
        (f) => f.no === 9 && f.wire === 2,
    );
    const video = endpoint && binaryAt(endpoint.data, [48687757, 1]);
    const metadataVideo = metadata && binaryAt(metadata, [17]);
    const title = metadata && binaryAt(metadata, [1, 1, 1]);
    const author = metadata && binaryAt(metadata, [10, 1, 1]);
    const thumbnails = metadata && bytesField(metadata, 2, true);
    if (
        !video ||
        !metadataVideo ||
        !sameBytes(video, metadataVideo) ||
        !/^[\w-]{11}$/.test(utf8.decode(video)) ||
        !title ||
        !thumbnails
    )
        return;
    const context = binaryAt(sourceItem, MENU_CONTEXT_PATH);
    const theme = context && binaryAt(context, [6, 386334485, 1, 1, 1]);
    const capabilities = context && binaryAt(context, [6, 386334486, 1, 1]);
    if (!theme || !capabilities) return;

    const transport = [
        [
            1,
            6,
            176991,
            "youtube_fill_experimental/skip_previous_24pt",
            "Previous video",
            "previous",
        ],
        [
            2,
            4,
            176993,
            "youtube_outline_experimental/skip10_back_24pt",
            "Rewind",
            "seek.backward",
        ],
        [
            3,
            3,
            176994,
            "youtube_outline_experimental/skip10_forward_24pt",
            "Fast forward",
            "seek.forward",
        ],
        [
            4,
            5,
            176988,
            "youtube_fill_experimental/skip_next_24pt",
            "Next video",
            "next",
        ],
    ] as const;
    const panelTarget = concatBytes([
        nativeField(1, 1),
        nativeField(3, ON_THE_GO_ID),
    ]);
    const thumbnailModel = concatBytes(
        wireFields(thumbnails).map((field) => {
            if (field.no !== 1 || field.wire !== 2) return field.raw;
            return nativeField(
                1,
                concatBytes(
                    wireFields(field.data).map((part) =>
                        part.wire === 0 && (part.no === 2 || part.no === 3)
                            ? nativeField(part.no + 2, numberValue(part.data))
                            : part.raw,
                    ),
                ),
            );
        }),
    );
    const models = [
        nativePath([1, 1], title),
        ...(author ? [nativeField(2, author)] : []),
        nativePath(
            [3, 2329],
            concatBytes([
                ...transport.map(([no, action, ve, icon, label, id]) =>
                    nativeField(
                        no,
                        onTheGoButton(
                            icon,
                            label,
                            nativePath(
                                [169495254, 327511066],
                                concatBytes([
                                    nativeField(1, action),
                                    nativeField(2, ve),
                                ]),
                            ),
                            id,
                        ),
                    ),
                ),
                nativeField(5, "Play"),
                nativeField(6, "Pause"),
                nativeField(7, "Replay"),
            ]),
        ),
        nativeField(5, thumbnailModel),
        nativeField(
            6,
            onTheGoButton(
                "youtube_outline_experimental/headset_24pt",
                "Switch to audio mode",
                nativePath([169495254, 300135747, 2], panelTarget),
            ),
        ),
        nativeField(
            12,
            onTheGoButton(
                "youtube_outline_experimental/video_24pt",
                "Switch to video mode",
                nativePath([169495254, 300413109, 2], panelTarget),
            ),
        ),
    ];
    if (speedCommand)
        models.push(
            nativeField(
                9,
                onTheGoButton(
                    "youtube_outline_experimental/speedometer_24pt",
                    "Playback speed",
                    speedCommand,
                ),
            ),
        );
    const chapters = message.engagementPanels
        .map(panelIdentifier)
        .find(
            (id) =>
                id === "engagement-panel-macro-markers-auto-chapters" ||
                id === "engagement-panel-macro-markers-description-chapters",
        );
    if (chapters)
        models.push(
            nativeField(
                8,
                onTheGoButton(
                    "youtube_outline_experimental/view_list_24pt",
                    "Chapters",
                    nativePath(
                        [169495254, 138681778],
                        concatBytes([
                            nativeField(3, ON_THE_GO_ID),
                            nativeField(
                                10,
                                concatBytes([
                                    nativeField(1, 1),
                                    nativeField(3, chapters),
                                ]),
                            ),
                        ]),
                    ),
                ),
            ),
        );

    const subscriptions = [
        nativeField(
            1,
            concatBytes([
                nativeField(1, "/youtube/app/engagement_panel"),
                nativeField(2, 470855422),
                nativeField(3, 470855422),
            ]),
        ),
        nativeField(
            1,
            concatBytes([
                nativeField(1, "/youtube/app/player_overlay"),
                nativeField(2, 470855423),
                nativeField(3, 470855423),
            ]),
        ),
        ...[
            ["menu_trigger", 14],
            ["audio_only", 18],
        ].map(([name, no]) =>
            nativeField(
                1,
                concatBytes([
                    nativeField(1, "/youtube/app/on_the_go_" + name + "_state"),
                    nativeField(3, 1),
                    nativeField(3, 2325),
                    nativeField(3, Number(no)),
                ]),
            ),
        ),
        nativeField(2, 413471385),
    ];
    const bindings = concatBytes([
        nativeField(188490103, concatBytes(subscriptions)),
        nativeField(
            212323971,
            concatBytes([nativeField(1, 413471385), nativeField(2, 5)]),
        ),
        nativeField(
            386334485,
            concatBytes([
                nativeField(
                    1,
                    concatBytes([nativePath([1, 1], theme), nativeField(2, 4)]),
                ),
                nativeField(2, 413471385),
            ]),
        ),
        nativeField(
            386334486,
            concatBytes([
                nativeField(
                    1,
                    concatBytes([
                        nativeField(1, capabilities),
                        nativeField(2, 6),
                    ]),
                ),
                nativeField(2, 413471385),
            ]),
        ),
    ]);
    return codec("EngagementPanel").fromBinary(
        nativeField(
            138681066,
            concatBytes([
                nativePath([2, 138681548, 1, 1, 1], "On-the-go"),
                nativePath(
                    [3, 49399797, 1, 50195462, 1, 153515154, 172660663],
                    concatBytes([
                        nativePath(
                            [1, 168777401],
                            concatBytes([
                                nativePath([3, 172035250, 1], template),
                                nativePath(
                                    [5, 413471385, 1, 2325],
                                    concatBytes(models),
                                ),
                                nativeField(6, bindings),
                            ]),
                        ),
                        nativePath([2, 183314536, 1], template),
                    ]),
                ),
                nativeField(5, 282218),
                nativeField(6, 1),
                nativeField(15, 1),
                nativeField(17, 3),
                nativeField(18, panelTarget),
                nativeField(20, 1),
                nativeField(21, 2),
                nativeField(21, 1),
                nativeField(36, 2),
            ]),
        ),
    );
}

function enableOnTheGo(message: Message<"Next">) {
    const overlay = message.playerOverlays?.renderer;
    if (!overlay?.overflowMenu || !Array.isArray(message.engagementPanels))
        return false;
    if (
        message.engagementPanels.some(
            (p) => panelIdentifier(p) === ON_THE_GO_ID,
        )
    )
        return false;
    const menu = binaryAt(overlay.overflowMenu, [66439850]);
    if (!menu) return false;
    const fields = wireFields(menu);
    let source: Uint8Array | undefined, speed: Uint8Array | undefined;
    let insertion = fields.length;
    for (const [index, item] of fields.entries()) {
        if (item.no !== 1 || item.wire !== 2) continue;
        const model = binaryAt(item.data, MENU_MODEL_PATH);
        const state = model && bytesField(model, 10, true);
        if (!model || !state) continue;
        const id = utf8.decode(state);
        if (id === ON_THE_GO_MENU_ID) return false;
        if (id.endsWith("/menu_item_additional_settings")) insertion = index;
        source ??= item.data;
        if (id.endsWith("/menu_item_playback_speed")) {
            const commands = binaryAt(model, [4, 4, 170382688]);
            if (commands)
                for (const command of wireFields(commands))
                    if (
                        command.no === 1 &&
                        binaryAt(command.data, [169495254, 443434441])
                    )
                        speed = command.data;
        }
    }
    if (!source) return false;
    const resources = prepareOnTheGoResources(message);
    if (!resources) return false;
    const panel = makeOnTheGoPanel(message, source, resources.template, speed);
    if (!panel) return false;
    let entry = rewriteBinaryPath(source, MENU_MODEL_PATH, (model) =>
        concatBytes([
            ...wireFields(model)
                .filter((f) => [1, 2, 13, 17].includes(f.no))
                .map((f) => f.raw),
            nativeField(
                4,
                concatBytes([
                    nativeField(2, "youtube_outline_experimental/headset_24pt"),
                    nativeField(3, "On-the-go"),
                    nativeField(4, onTheGoAction()),
                ]),
            ),
            nativeField(10, ON_THE_GO_MENU_ID),
            nativeField(12, 1),
        ]),
    );
    entry = rewriteBinaryPath(
        entry,
        [...MENU_CONTEXT_PATH, 6, 188490103, 1, 1],
        () => textEncoder.encode(ON_THE_GO_MENU_ID),
    );
    entry = rewriteBinaryPath(entry, [153515154, 3, 396644439, 1], () =>
        textEncoder.encode("menu_item_on_the_go"),
    );
    const chunks = fields.map((field) => field.raw);
    chunks.splice(insertion, 0, nativeField(1, entry));
    const output = rewriteBinaryPath(overlay.overflowMenu, [66439850], () =>
        concatBytes(chunks),
    );
    setField(message, "frameworkUpdates", resources.framework);
    setField(message, "engagementPanels", [...message.engagementPanels, panel]);
    return setField(overlay, "overflowMenu", output);
}
