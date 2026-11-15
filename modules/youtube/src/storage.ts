const CONFIG_KEY = "YouTubeConfig";
const QUALITY_KEY = "YouTubeQuality";

function readConfig(
    key = CONFIG_KEY,
    limit = Infinity,
): Record<string, unknown> {
    // Propagate read errors; do not treat them as empty config.
    const stored = $persistentStore.read(key);
    if (typeof stored === "string" && stored.length > limit) return {};
    try {
        const value: unknown = JSON.parse(stored || "{}");
        return value && typeof value === "object" && !Array.isArray(value)
            ? (value as Record<string, unknown>)
            : {};
    } catch {
        return {};
    }
}
function writeConfig(config: Record<string, unknown>) {
    return $persistentStore.write(JSON.stringify(config), CONFIG_KEY);
}
