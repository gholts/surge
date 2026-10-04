function platformKey(request: SurgeRequest): Platform {
    return Object.entries(request.headers ?? {}).some(
        ([name, value]) =>
            name.toLowerCase() === "user-agent" && /music/i.test(value),
    )
        ? "youtubeMusic"
        : "youtube";
}
