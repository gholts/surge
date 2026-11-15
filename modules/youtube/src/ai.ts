const AI_PANEL = textEncoder.encode("PAyouchat");
const AI_SUMMARY = textEncoder.encode("ai_summary_");

function aiPathMatches(
    bytes: Uint8Array,
    path: number[],
    target = AI_PANEL,
    prefix = false,
): boolean {
    if (!path.length)
        return prefix
            ? sameBytes(bytes.subarray(0, target.length), target)
            : sameBytes(bytes, target);
    return wireFields(bytes).some(
        (field) =>
            field.no === path[0] &&
            field.wire === 2 &&
            aiPathMatches(field.data, path.slice(1), target, prefix),
    );
}

const AI_CARD = [8, 2, 169495254, 138681778, 1];

function dropAiFields(
    bytes: Uint8Array,
    no: number,
    path: number[],
    target = AI_PANEL,
    prefix = false,
) {
    return rewriteFields(bytes, no, (data) =>
        aiPathMatches(data, path, target, prefix) ? undefined : data,
    );
}

function removeAiActionBar(bytes: Uint8Array) {
    return rewriteFields(bytes, 1, (button) =>
        aiPathMatches(button, [10, 461054335, 4, 169495254, 138681778, 1])
            ? undefined
            : rewriteBinaryPath(button, [10, 37098], (menu) =>
                  dropAiFields(
                      menu,
                      3,
                      [489973921, 997, 3, 3, 169495254, 138681778, 1],
                  ),
              ),
    );
}

function removeAiQuickActions(bytes: Uint8Array) {
    return rewriteFields(bytes, 10, (button) => {
        if (aiPathMatches(button, [15, 461054335, 4, 169495254, 138681778, 1]))
            return;
        const primary = rewriteBinaryPath(button, [15, 37098], (menu) =>
            dropAiFields(menu, 3, [461054335, 4, 169495254, 138681778, 1]),
        );
        return rewriteBinaryPath(primary, [6], (menu) =>
            dropAiFields(
                menu,
                3,
                [4, 16, 461054335, 4, 169495254, 138681778, 1],
            ),
        );
    });
}

function carouselParts(bytes: Uint8Array) {
    const fields = wireFields(bytes);
    const part = (no: number) =>
        fields.filter((field) => field.no === no && field.wire === 2);
    return { fields, headers: part(1), cards: part(2) };
}

function removeAiCarousel(bytes: Uint8Array) {
    return rewriteBinaryPath(bytes, [1], (carousel) => {
        const { fields, headers, cards } = carouselParts(carousel);
        // Keep header/card indices aligned (Comments vs Ask).
        if (headers.length !== cards.length) return carousel;
        const removed = new Set<WireField>();
        cards.forEach((card, index) => {
            if (aiPathMatches(card.data, AI_CARD)) {
                removed.add(card);
                removed.add(headers[index]);
            }
        });
        return removed.size
            ? concatBytes(
                  fields
                      .filter((field) => !removed.has(field))
                      .map((field) => field.raw),
              )
            : carousel;
    });
}

function isAiOnlyCarousel(object: ProtoNode) {
    try {
        return unknownFields(object).some((field) => {
            if (field.no !== 408379376 || field.wire !== 2) return false;
            const bodies = wireFields(field.data).filter(
                (field) => field.no === 1 && field.wire === 2,
            );
            if (bodies.length !== 1) return false;
            const { headers, cards } = carouselParts(bodies[0].data);
            return (
                cards.length > 0 &&
                cards.length === headers.length &&
                cards.every((card) => aiPathMatches(card.data, AI_CARD))
            );
        });
    } catch {
        return false;
    }
}

function removeAiElement(bytes: Uint8Array) {
    return rewriteBinaryPath(
        bytes,
        [153515154, 172660663, 1, 168777401, 5],
        (content) => {
            let result = rewriteFields(
                content,
                386137609,
                removeAiQuickActions,
            );
            result = rewriteBinaryPath(result, [413471385, 1], (data) =>
                rewriteFields(data, 2185, removeAiActionBar),
            );
            result = rewriteBinaryPath(
                result,
                [389155117, 17],
                removeAiActionBar,
            );
            return rewriteFields(result, 408379376, removeAiCarousel);
        },
    );
}

function removeAiSummary(bytes: Uint8Array) {
    const result = dropAiFields(bytes, 45, [], AI_SUMMARY, true);
    // Remove summary updates; keep inline playback commands.
    return rewriteBinaryPath(
        result,
        [1, 19, 1, 1, 4, 424915055, 1],
        (playback) =>
            dropAiFields(
                playback,
                31,
                [1, 204158123, 194114827, 1],
                AI_SUMMARY,
                true,
            ),
    );
}

function removeAi(object: ProtoNode) {
    let changed = false;
    try {
        const next = object as Message<"Next">;
        if (next.engagementPanels?.length) {
            const keep = next.engagementPanels.filter((panel) => {
                const renderer = panel.renderer;
                return (
                    !renderer ||
                    !unknownFields(renderer).some(
                        (field) =>
                            field.no === 1 &&
                            field.wire === 2 &&
                            sameBytes(field.data, AI_PANEL),
                    )
                );
            });
            changed = setField(next, "engagementPanels", keep) || changed;
            for (const panel of keep) {
                if (!panel.renderer) continue;
                changed =
                    rewriteUnknownField(panel.renderer, 10, (footer) =>
                        aiPathMatches(
                            footer,
                            [
                                260791572, 1, 153515154, 172660663, 1,
                                168777401, 5, 413471385, 1, 2553, 997, 3, 3,
                                170382688, 1, 169495254, 138681778, 1,
                            ],
                        )
                            ? undefined
                            : footer,
                    ) || changed;
            }
        }
        if (next.playerOverlays?.renderer)
            changed =
                rewriteUnknownField(
                    next.playerOverlays.renderer,
                    37,
                    removeAiElement,
                ) || changed;
        changed =
            rewriteUnknownField(object, 216561405, (metadata) =>
                rewriteBinaryPath(metadata, [1], removeAiElement),
            ) || changed;
        changed =
            rewriteUnknownField(object, 386137609, removeAiQuickActions) ||
            changed;
        changed =
            rewriteUnknownField(object, 408379376, removeAiCarousel) || changed;
        const content = object as Message<"VideoContent">;
        if (content.element?.data)
            changed =
                rewriteUnknownField(
                    content.element.data,
                    2185,
                    removeAiActionBar,
                ) || changed;
        if (content.videoLockup)
            changed =
                rewriteUnknownField(content.videoLockup, 18, removeAiSummary) ||
                changed;
        if ((object as Message<"VideoContext">).videoContent?.videoLockup)
            changed =
                rewriteUnknownField(object, 6, (bindings) =>
                    rewriteBinaryPath(bindings, [188490103], (collection) =>
                        dropAiFields(collection, 1, [1], AI_SUMMARY, true),
                    ),
                ) || changed;
    } catch (error) {
        console.log("YouTube AI controls: " + error);
    }
    return changed;
}
