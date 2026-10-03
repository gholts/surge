const QUALITY_LIMIT = 64 * 1024;
function validQuality(value: unknown): value is QualityRecord {
    const record = value as QualityRecord;
    return !!(
        record &&
        typeof record === "object" &&
        !Array.isArray(record) &&
        Number.isInteger(record.height) &&
        record.height > 0 &&
        record.height <= 0x7fffffff &&
        Array.isArray(record.itags) &&
        record.itags.length > 0 &&
        record.itags.length <= 256 &&
        record.itags.every(
            (itag) => Number.isInteger(itag) && itag > 0 && itag <= 0xffffffff,
        ) &&
        new Set(record.itags).size === record.itags.length
    );
}
