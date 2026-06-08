import { offsets } from "../core/offsets.js";
import { getFunctions } from "../core/functions.js";

let g_wall = null;
let g_wallW = 0;
let g_wallH = 0;
let g_builtForPtr = null;

// NEW: LOS cache with TTL for better performance
const _losCache = new Map();
const LOS_CACHE_MAX = 512;
const LOS_CACHE_TTL_MS = 150;

function rebuild(tm) {
    if (!tm || tm.isNull()) return;
    if (g_wall && g_builtForPtr && !g_builtForPtr.isNull() && g_builtForPtr.equals(tm)) return;

    const w = tm.add(offsets.TileMap_Width).readS32();
    const h = tm.add(offsets.TileMap_Height).readS32();
    if (w <= 0 || w > 120 || h <= 0 || h > 120) return;
    const tilesArr = tm.add(offsets.TileMap_TilesArray).readPointer();
    if (tilesArr.isNull()) return;

    const total = w * h;
    if (total <= 0 || total > 14400) return;

    const ps = Process.pointerSize;
    const blkOff = offsets.TileTypeData_BlocksMovement;
    const out = new Uint8Array(total);

    for (let i = 0; i < total; i++) {
        const tile = tilesArr.add(i * ps).readPointer();
        if (tile.isNull()) { out[i] = 0; continue; }
        const ttype = tile.readPointer();
        if (ttype.isNull()) { out[i] = 0; continue; }
        const flags = ttype.add(blkOff).readU16();
        const blocksMove = (flags & 0xff) ? 0x80 : 0;
        const blocksProj = ((flags >> 8) & 0xff) ? 0x40 : 0;
        out[i] = blocksMove | blocksProj;
    }

    g_wall = out;
    g_wallW = w;
    g_wallH = h;
    g_builtForPtr = tm;

    // Clear LOS cache when map changes
    _losCache.clear();
}

export function notifyBattleModeChanged(bm) {
    if (!bm || bm.isNull()) return;
    try {
        const tm = getFunctions().LogicBattleModeClient_getTileMap(bm);
        if (tm && !tm.isNull()) rebuild(tm);
    } catch (_) {}
}

export function getWallCache()  { return g_wall;  }
export function getWallCacheW() { return g_wallW; }
export function getWallCacheH() { return g_wallH; }

// IMPROVED: LOS check with caching for better performance
export function losCheck(wx0, wy0, wx1, wy1, checkBit) {
    const wall = g_wall;
    if (!wall) return true;
    const w = g_wallW, h = g_wallH;

    let cx = (wx0 / 300) | 0;
    let cy = (wy0 / 300) | 0;
    const tx = (wx1 / 300) | 0;
    const ty = (wy1 / 300) | 0;
    if (cx === tx && cy === ty) return true;

    // NEW: Check LOS cache
    const cacheKey = (((cx & 0x7f) << 21) | ((cy & 0x7f) << 14) | ((tx & 0x7f) << 7) | (ty & 0x7f)) | 0;
    const now = Date.now();
    const cached = _losCache.get(cacheKey);
    if (cached !== undefined && now - cached.ts < LOS_CACHE_TTL_MS) return cached.v;

    const dx = Math.abs(tx - cx);
    const dy = -Math.abs(ty - cy);
    const sx = cx < tx ? 1 : -1;
    const sy = cy < ty ? 1 : -1;
    let err = dx + dy;
    const maxSteps = dx + (-dy) + 2;

    let result = true;
    for (let n = 0; n < maxSteps; n++) {
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; cx += sx; }
        if (e2 <= dx) { err += dx; cy += sy; }
        if (cx === tx && cy === ty) break;
        if (cx < 0 || cx >= w || cy < 0 || cy >= h) continue;
        if (wall[cy * w + cx] & checkBit) { result = false; break; }
    }

    // NEW: Store in cache (with periodic cleanup)
    if (_losCache.size < LOS_CACHE_MAX) {
        _losCache.set(cacheKey, { v: result, ts: now });
    } else {
        // Purge oldest entries
        let oldest = null;
        let oldestTs = Infinity;
        for (const [k, val] of _losCache) {
            if (val.ts < oldestTs) { oldestTs = val.ts; oldest = k; }
        }
        if (oldest !== null) _losCache.delete(oldest);
        _losCache.set(cacheKey, { v: result, ts: now });
    }

    return result;
}

// NEW: Clear LOS cache (called when map changes)
export function clearLosCache() {
    _losCache.clear();
}
