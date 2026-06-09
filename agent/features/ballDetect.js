import { offsets } from "../core/offsets.js";
import { getFunctions } from "../core/functions.js";
import { scanData } from "../core/scanner.js";

let _isCarryableFn = null;
let _getLinkedCarryableFn = null;
let _getCarryableDataFn = null;
let _ballState = false;
let _ballStateTs = 0;
const BALL_CHECK_INTERVAL_MS = 100;

export function initBallDetection(base) {
    try {
        _isCarryableFn = new NativeFunction(base.add(offsets.LogicCharacterData__isCarryable), 'bool', ['pointer']);
    } catch (_) { _isCarryableFn = null; }

    try {
        _getLinkedCarryableFn = new NativeFunction(base.add(offsets.LogicCharacterClient__getLinkedCarryable), 'pointer', ['pointer']);
    } catch (_) { _getLinkedCarryableFn = null; }

    try {
        _getCarryableDataFn = new NativeFunction(base.add(offsets.LogicCharacterClient__getCarryableData), 'pointer', ['pointer']);
    } catch (_) { _getCarryableDataFn = null; }
}

function _checkBallDirect() {
    const own = scanData.ownCharacter;
    if (!own || own.isNull()) return false;

    if (_getLinkedCarryableFn) {
        try {
            const carryable = _getLinkedCarryableFn(own);
            if (carryable && !carryable.isNull()) return true;
        } catch (_) {}
    }

    if (_getCarryableDataFn) {
        try {
            const carryableData = _getCarryableDataFn(own);
            if (carryableData && !carryableData.isNull()) return true;
        } catch (_) {}
    }

    if (_isCarryableFn) {
        try {
            const fns = getFunctions();
            const ownData = fns.LogicGameObjectClient_getData(own);
            if (ownData && !ownData.isNull()) {
                if (_isCarryableFn(ownData)) return true;
            }
        } catch (_) {}
    }

    return false;
}

export function updateBallState() {
    const now = Date.now();
    if (now - _ballStateTs < BALL_CHECK_INTERVAL_MS) return;
    _ballStateTs = now;
    _ballState = _checkBallDirect();
}

export function hasBall() {
    return _ballState;
}

export function resetBallState() {
    _ballState = false;
    _ballStateTs = 0;
}
