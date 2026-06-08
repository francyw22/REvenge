export const CONFIG = {
    // ─── Safety margins ──────────────────────────────────────────────
    SAFETY_MARGIN:                 30.0,    // Increased from 25 for more breathing room
    MOVING_EXTRA_MARGIN:           25.0,    // Increased from 20 for safety while dodging

    // ─── Timing windows ─────────────────────────────────────────────
    T_URGENT_MIN:                  0.40,    // Tighter min (was 0.45) - react faster
    T_URGENT_MAX:                  0.65,    // Tighter max (was 0.70) - overall faster reaction
    T_FIELD:                       1.2,     // Increased from 1.0 - look further ahead

    // ─── Clearance ──────────────────────────────────────────────────
    MIN_CLEARANCE:                 80.0,    // Increased from 70 - keep further from projectiles
    MIN_CLEARANCE_RADIUS_FACTOR:   1.25,    // Increased from 1.15 - scale with character size

    // ─── Dodge commitment ───────────────────────────────────────────
    DODGE_COMMIT_MS:               120,     // Increased from 100 - commit longer to avoid jitter

    // ─── Direction sampling ─────────────────────────────────────────
    N_DIRECTIONS:                  16,      // Base count (now adaptive: 16/24/32)
    N_COARSE_DIRECTIONS:          8,       // Coarse scan step

    // ─── Stale / tracking ───────────────────────────────────────────
    STALE_MS:                      250,     // Reduced from 300 - clean up faster
    MAX_TRACK_DIST:                5500.0,  // Increased from 5000 - track further

    // ─── Dodge direction weights ────────────────────────────────────
    PERP_WEIGHT:                   3.0,     // Increased from 2.6 - stronger perpendicular escape
    AWAY_WEIGHT:                   1.2,     // Increased from 1.0 - stronger away bias
    INTENT_WEIGHT:                 1.0,     // Unchanged

    // ─── Character speed ────────────────────────────────────────────
    CHAR_SPEED:                    720.0,

    // ─── Lag compensation ───────────────────────────────────────────
    LAG_COMPENSATION_S:            0.035,   // Slightly increased from 0.030 for network lag

    // ─── Lock / drift ───────────────────────────────────────────────
    LOCK_DRIFT_MAX:                450.0,   // Increased from 400 - allow more drift before unlock

    // ─── Score thresholds ───────────────────────────────────────────
    IMPACT_SCORE_THRESHOLD:        35000000.0,  // Lowered from 40M - trigger spiral search sooner

    // ─── Spiral search ──────────────────────────────────────────────
    SPIRAL_SAMPLES:                40,      // Increased from 32 - more thorough search

    // ─── Stale frames ───────────────────────────────────────────────
    STALE_FRAMES_MAX:              4,       // Reduced from 5 - detect stale projectiles faster

    // ─── Probe distances ────────────────────────────────────────────
    PROBE_TIME_S:                  0.55,
    PROBE_MIN:                     360.0,
    PROBE_MAX:                     820.0,

    // ─── Fast projectile margins ────────────────────────────────────
    MARGIN_FAST_PROJ_THRESHOLD:    2200.0,  // Lowered from 2500 - treat fast projectiles sooner
    MARGIN_FAST_PROJ_GAIN:         0.015,   // Increased from 0.0125 - bigger margin for fast
    MARGIN_FAST_PROJ_CAP:          40.0,    // Increased from 30 - allow bigger margins

    // ─── Wall penalties ─────────────────────────────────────────────
    CORNER_WALL_PENALTY:           200000.0,    // Increased from 150K - avoid corners more
    WALL_CORNER_THRESHOLD:         2,           // NEW: wall sides threshold for corner detection
    WALL_PROXIMITY_PENALTY:        80000.0,     // NEW: penalty per wall side too close
    WALL_CORNER_PENALTY:           500000.0,    // NEW: heavy penalty for corner trapping
    WALL_EDGE_PENALTY:             300000.0,    // NEW: penalty for moving toward map edge

    // ─── Super attack awareness ─────────────────────────────────────
    SUPER_EXTRA_MARGIN:            40.0,    // NEW: extra margin for super projectiles

    // ─── Prediction system ──────────────────────────────────────────
    PREDICTED_PROJ_SPEED:          2800.0,  // NEW: assumed projectile speed for aim prediction
    PREDICTED_PROJ_RADIUS:         80.0,    // NEW: assumed radius for predicted threats
    PREDICTED_IMPACT_RADIUS:       160.0,   // NEW: assumed impact radius for predicted threats

    // ─── Juke patterns ──────────────────────────────────────────────
    JUKE_BIAS_STRENGTH:            0.6,     // NEW: strength of juke direction bias
    JUKE_ZIGZAG_FREQ:              3.0,     // NEW: zigzag oscillation frequency
    JUKE_CIRCLE_FREQ:              2.0,     // NEW: circle rotation frequency
    JUKE_FEINT_FREQ:               4.0,     // NEW: feint pattern frequency
};

export const CFG = {
    HISTORY_LEN:                   10,
    STALE_MS:                      1500,
    SHOOT_LAG_S:                   0.025,
    BURST_LOCK_MS:                 100,
    BURST_LOCK_MAX_DRIFT:          160.0,
    EMA_ALPHA:                     0.4,
    LOS_CACHE_TTL_MS:              100,
    LOS_CACHE_PURGE_MS:            500,
    DEFAULT_PROJ_SPEED:            3000.0,
    DEFAULT_MOVE_SPEED:            720.0,
    STATIONARY_VEL_FLOOR:          30.0,
    STATIONARY_VEL_RATIO:          0.07,
    SCORE_DIST_WEIGHT:             1.0,
    SCORE_SPEED_WEIGHT:            0.3,
    SCORE_APPROACH_WEIGHT:         0.4,
    SCORE_FACING_WEIGHT:           0.5,
    UNCONFIDENT_LEAD_SCALE:        0.45,
    JUKING_LEAD_SCALE:             0.35,
    TARGET_STICKY_RATIO:           0.85,
};
