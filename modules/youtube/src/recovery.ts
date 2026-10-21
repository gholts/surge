function keyCandidates(stored: StoredKeys | undefined): StoredKeys[] {
    if (!stored) return [];
    return [
        stored,
        ...(Array.isArray(stored.previous) ? stored.previous.slice(0, 3) : []),
    ].filter(
        (pair) =>
            pair &&
            typeof pair.clientKey === "string" &&
            typeof pair.encryptKey === "string" &&
            pair.clientKey.length > 0 &&
            pair.clientKey.length <= 5500 &&
            pair.encryptKey.length > 0 &&
            pair.encryptKey.length <= 5500,
    );
}

function clearKeys(platform: Platform | undefined, expected: unknown) {
    if (platform === undefined || expected === undefined) return;
    const config = readConfig();
    if (!Object.hasOwn(config, platform)) return;
    const current = config[platform] as StoredKeys | undefined;
    const snapshot = expected as StoredKeys | undefined;
    if (JSON.stringify(current) === JSON.stringify(snapshot)) {
        delete config[platform];
        return writeConfig(config);
    }
}
