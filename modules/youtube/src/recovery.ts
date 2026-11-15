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
    if (JSON.stringify(config[platform]) === JSON.stringify(expected)) {
        delete config[platform];
        return writeConfig(config);
    }
}
