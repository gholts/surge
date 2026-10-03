function transformWatch(
    message: Message<"Watch"> | Message<"OnesieInnertubeResponse">,
    parameters: Options,
) {
    let changed = false;
    for (const content of message.contents) {
        if (content.player)
            changed = transformPlayer(content.player, parameters) || changed;
        if (content.next)
            changed = transformContent(content.next, parameters) || changed;
    }
    return changed;
}
