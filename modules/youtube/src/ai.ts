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

function rewriteAiFields(
    bytes: Uint8Array,
    no: number,
    transform: (bytes: Uint8Array) => Uint8Array | undefined,
) {
    let changed = false;
    const chunks = wireFields(bytes).flatMap((field) => {
        if (field.no !== no || field.wire !== 2) return [field.raw];
        const data = transform(field.data);
        if (data && sameBytes(data, field.data)) return [field.raw];
        changed = true;
        return data ? [encodeField([no, "", "bytes"], data)] : [];
    });
    return changed ? concatBytes(chunks) : bytes;
}

function removeAiActionBar(bytes: Uint8Array) {
    return rewriteAiFields(bytes, 1, (button) =>
        aiPathMatches(button, [10, 461054335, 4, 169495254, 138681778, 1])
            ? undefined
            : rewriteBinaryPath(button, [10, 37098], (menu) =>
                  rewriteAiFields(menu, 3, (item) =>
                      aiPathMatches(
                          item,
                          [489973921, 997, 3, 3, 169495254, 138681778, 1],
                      )
                          ? undefined
                          : item,
                  ),
              ),
    );
}

function removeAiQuickActions(bytes: Uint8Array) {
    return rewriteAiFields(bytes, 10, (button) =>
        aiPathMatches(button, [15, 461054335, 4, 169495254, 138681778, 1])
            ? undefined
            : rewriteBinaryPath(button, [6], (menu) =>
                  rewriteAiFields(menu, 3, (item) =>
                      aiPathMatches(
                          item,
                          [4, 16, 461054335, 4, 169495254, 138681778, 1],
                      )
                          ? undefined
                          : item,
                  ),
              ),
    );
}

function removeAiCarousel(bytes: Uint8Array) {
    return rewriteBinaryPath(bytes, [1], (carousel) => {
        const fields = wireFields(carousel);
        const headers = fields.filter(
            (field) => field.no === 1 && field.wire === 2,
        );
        const cards = fields.filter(
            (field) => field.no === 2 && field.wire === 2,
        );
        // Parallel header/card arrays must retain matching indices (Comments vs Ask).
        if (headers.length !== cards.length) return carousel;
        const removed = new Set<WireField>();
        cards.forEach((card, index) => {
            if (aiPathMatches(card.data, [8, 2, 169495254, 138681778, 1])) {
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
            const fields = wireFields(bodies[0].data);
            const headers = fields.filter(
                (field) => field.no === 1 && field.wire === 2,
            );
            const cards = fields.filter(
                (field) => field.no === 2 && field.wire === 2,
            );
            return (
                cards.length > 0 &&
                cards.length === headers.length &&
                cards.every((card) =>
                    aiPathMatches(card.data, [8, 2, 169495254, 138681778, 1]),
                )
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
            let result = rewriteAiFields(
                content,
                386137609,
                removeAiQuickActions,
            );
            result = rewriteBinaryPath(result, [413471385, 1], (data) =>
                rewriteAiFields(data, 2185, removeAiActionBar),
            );
            return rewriteAiFields(result, 408379376, removeAiCarousel);
        },
    );
}

function removeAiSummary(bytes: Uint8Array) {
    const result = rewriteAiFields(bytes, 45, (key) =>
        aiPathMatches(key, [], AI_SUMMARY, true) ? undefined : key,
    );
    // Only remove the summary update command; keep inline playback commands.
    return rewriteBinaryPath(
        result,
        [1, 19, 1, 1, 4, 424915055, 1],
        (playback) =>
            rewriteAiFields(playback, 31, (command) =>
                aiPathMatches(
                    command,
                    [1, 204158123, 194114827, 1],
                    AI_SUMMARY,
                    true,
                )
                    ? undefined
                    : command,
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
                        rewriteAiFields(collection, 1, (binding) =>
                            aiPathMatches(binding, [1], AI_SUMMARY, true)
                                ? undefined
                                : binding,
                        ),
                    ),
                ) || changed;
    } catch (error) {
        console.log("YouTube AI controls: " + error);
    }
    return changed;
}
