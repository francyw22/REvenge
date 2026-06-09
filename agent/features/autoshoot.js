import { losCheck } from "../utils/wallCache.js";
import { state } from "../utils/flags.js";
import { offsets } from "../core/offsets.js";
import { scanData } from "../core/scanner.js";
import { isLauncher, resolveBrawlerRange, resolveBrawlerProjSpeed } from "../core/brawler_db.js";
import { getFunctions } from "../core/functions.js";
import { estimateTargetVelocity, solveIntercept } from "../libs/math_aim.js";
import { getDodgeDir } from "./autododge.js";
import { getBestTargetId, getSharedBattleScreen, getSharedBattleScreenTs } from "./aimbot.js";
import { hasBall } from "./ballDetect.js";
import { CFG } from "../utils/config.js";

const AUTOSHOOT_CFG = {
    FIRE_INTERVAL_MS:           800,
    ERROR_COOLDOWN_MS:          2000,
    BATTLE_SCREEN_MAX_AGE_MS:   200,
    CHARGE_WAIT_MS:             100,
    MAX_AMMO_WAIT_MS:           2000,
    TARGET_SWITCH_PENALTY:      0.85,
    PREDICTION_CONFIDENCE_MIN:  2,
    MIN_ENGAGE_DISTANCE:        200,
};

let _wrapperFn = null;
let _tryActivateSkillFn = null;
let _lastFireMs = 0;
let _errorUntil = 0;
let _lastAmmoCount = -1;
let _ammoReadySince = 0;

const SUPER_SKILL_INDEX = 1;
const HYPER_SKILL_INDEX = 2;

const SUPER_RANGES = {
    'SHELLY': 2200, 'BULL': 1500, 'NITA': 3200, 'JESSIE': 3300,
    'BROCK': 3500, 'COLT': 3300, 'PIPER': 3700, 'BEA': 3700,
    'RICO': 3500, 'SPIKE': 2800, 'CROW': 3200, 'LEON': 3500,
    'TARA': 2900, 'GENE': 2100, 'BO': 3200, 'BARLEY': 2700,
    'DYNAMIKE': 2700, 'TICK': 3200, 'SPROUT': 1800, 'GROM': 2800,
    'NANI': 3200, 'FRANK': 2200, 'PAM': 3300, 'POCO': 2600,
    'EMZ': 2400, 'SANDY': 2200, 'MAX': 3100, 'MR_P': 2600,
    'BYRON': 3700, 'BELLE': 3700, 'SURGE': 2400, 'CARL': 3100,
    'MORTIS': 1000, 'EL_PRIMO': 1100, 'DARRYL': 2200, 'JACKY': 1200,
    'ROSA': 1300, 'BIBI': 1300, 'EDGAR': 700, 'BUZZ': 1000,
    'FANG': 1000, 'SAM': 1100, 'ASH': 1700, 'HANK': 1200,
    'MICO': 1500, 'KIT': 1300, 'DRACO': 1500, 'LILY': 700,
    'WILLOW': 2700, 'SQUEAK': 2800, 'JUJU': 2300, 'BERRY': 2300,
    'DOUG': 1200, 'CHESTER': 3100, 'GRAY': 3300, 'GUS': 3400,
    'CORDELIUS': 2000, 'BONNIE': 3300, 'JANET': 1500, 'OTIS': 3300,
    'RUFFS': 3300, 'MAISIE': 3200, 'LOLA': 3300, 'PENNY': 3200,
    'STU': 2800, 'MEG': 3300, 'AMBER': 3100, 'GALE': 3100,
    'LOU': 3400, 'CHUCK': 2400, 'CLANCY': 2800, 'OLLIE': 2300,
    'PEARL': 3300, 'MELLODIE': 2900, 'KENJI': 1000, 'SHADE': 1300,
    'KAZE': 1000, 'ALLI': 200, 'TRUNK': 1200, 'GIGI': 1200,
    'MEEPLE': 2800, 'LUMI': 2900, 'MOE': 1800, 'PIERCE': 3700,
    'JAE': 3100, 'CHARLIE': 3300, 'LARRY_AND_LAWRIE': 2700,
    'FINX': 3100,
};

let _getMaxChargeFn = null;
let _getCurrentActiveOrCastingSkillFn = null;
let _getWeaponSkillFn = null;

function _getSkillData(ownChar, skillIndex) {
    try {
        const fns = getFunctions();
        const data = fns.LogicGameObjectClient_getData(ownChar);
        if (!data || data.isNull()) return null;
        const skillsArr = data.add(0x60).readPointer();
        if (!skillsArr || skillsArr.isNull()) return null;
        const skillPtr = skillsArr.add(8 * skillIndex).readPointer();
        if (!skillPtr || skillPtr.isNull()) return null;
        return skillPtr;
    } catch (_) { return null; }
}

function _isSuperCharged(ownChar) {
    if (!_getMaxChargeFn) return false;
    const skillData = _getSkillData(ownChar, SUPER_SKILL_INDEX);
    if (!skillData) return false;
    try {
        const maxCharge = _getMaxChargeFn(skillData);
        if (maxCharge <= 0) return false;
        const currentCharge = skillData.add(0x18).readS32();
        return currentCharge >= maxCharge;
    } catch (_) { return false; }
}

function _isHyperCharged(ownChar) {
    if (!_getMaxChargeFn) return false;
    const skillData = _getSkillData(ownChar, HYPER_SKILL_INDEX);
    if (!skillData) return false;
    try {
        const maxCharge = _getMaxChargeFn(skillData);
        if (maxCharge <= 0) return false;
        const currentCharge = skillData.add(0x18).readS32();
        return currentCharge >= maxCharge;
    } catch (_) { return false; }
}

function _isSkillActive(ownChar) {
    if (!_getCurrentActiveOrCastingSkillFn) return false;
    try {
        const activeSkill = _getCurrentActiveOrCastingSkillFn(ownChar);
        return activeSkill && !activeSkill.isNull();
    } catch (_) { return false; }
}

function _getCurrentAmmo(ownChar) {
    try {
        const fns = getFunctions();
        const skill = fns.LogicCharacterClient_getWeaponSkill(ownChar);
        if (!skill || skill.isNull()) return -1;
        const maxCharge = _getMaxChargeFn ? _getMaxChargeFn(skill) : -1;
        if (maxCharge <= 0) return -1;
        const currentCharge = skill.add(0x18).readS32();
        return currentCharge;
    } catch (_) { return -1; }
}

function _resolveSuperRange(brawlerName) {
    if (brawlerName && SUPER_RANGES[brawlerName] !== undefined) return SUPER_RANGES[brawlerName];
    return resolveBrawlerRange(brawlerName, scanData.myBrawlerId);
}

function _predictTargetPosition(enemy, myX, myY, projSpeed) {
    if (!enemy) return null;

    const dx = enemy.x - myX;
    const dy = enemy.y - myY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return { x: enemy.x, y: enemy.y };

    const vx = enemy.vxEma || 0;
    const vy = enemy.vyEma || 0;
    const speed = Math.sqrt(vx * vx + vy * vy);

    if (speed < 30) return { x: enemy.x, y: enemy.y };

    const travelTime = dist / projSpeed;

    let leadScale = 1.0;
    if (enemy.directionChanging) leadScale = CFG.JUKING_LEAD_SCALE;
    else if (!enemy.confident) leadScale = CFG.UNCONFIDENT_LEAD_SCALE;

    const predX = enemy.x + vx * travelTime * leadScale;
    const predY = enemy.y + vy * travelTime * leadScale;

    return { x: Math.round(predX), y: Math.round(predY) };
}

function _computeAimCoords(targetGid, rawX, rawY, myX, myY) {
    const aim = computeAimForTarget(targetGid, myX, myY);
    if (aim) return { x: aim.x, y: aim.y };
    return { x: rawX, y: rawY };
}

function _fireAt(battleScreen, own, fireX, fireY) {
    battleScreen.add(offsets.BattleScreen_manualFireX).writeS32(fireX);
    battleScreen.add(offsets.BattleScreen_manualFireY).writeS32(fireY);
    battleScreen.add(offsets.BattleScreen_autoFireX).writeS32(fireX);
    battleScreen.add(offsets.BattleScreen_autoFireY).writeS32(fireY);
    battleScreen.add(offsets.BattleScreen_autoshootPredOff).writeS32(0);
    _wrapperFn(battleScreen, own);
}

function _activateSuperSkill(battleScreen, targetX, targetY) {
    if (!_tryActivateSkillFn) return false;
    try {
        battleScreen.add(offsets.BattleScreen_manualFireX).writeS32(targetX);
        battleScreen.add(offsets.BattleScreen_manualFireY).writeS32(targetY);
        _tryActivateSkillFn(battleScreen, SUPER_SKILL_INDEX, targetX, targetY);
        return true;
    } catch (_) { return false; }
}

function _activateHyperSkill(battleScreen, targetX, targetY) {
    if (!_tryActivateSkillFn) return false;
    try {
        battleScreen.add(offsets.BattleScreen_manualFireX).writeS32(targetX);
        battleScreen.add(offsets.BattleScreen_manualFireY).writeS32(targetY);
        _tryActivateSkillFn(battleScreen, HYPER_SKILL_INDEX, targetX, targetY);
        return true;
    } catch (_) { return false; }
}

function _findBestEnemyInRange(myX, myY, rangeSq, requireLOS) {
    let bestDist = 1e18, bestX = 0, bestY = 0, bestGid = null, found = false;
    for (const e of (scanData.enemies || [])) {
        const dx = e.x - myX, dy = e.y - myY, d2 = dx * dx + dy * dy;
        if (d2 >= rangeSq || d2 >= bestDist) continue;
        if (d2 < AUTOSHOOT_CFG.MIN_ENGAGE_DISTANCE) continue;
        if (requireLOS && !losCheck(myX, myY, e.x, e.y, 0x40)) continue;
        bestDist = d2; bestX = e.x; bestY = e.y; bestGid = e.gid; found = true;
    }
    return found ? { dist: bestDist, x: bestX, y: bestY, gid: bestGid } : null;
}

export function updateAutoShoot(now) {
    if (!state.aimbot) return;

    const _battleScreen = getSharedBattleScreen();
    if (!_battleScreen) return;
    if (now === undefined) now = Date.now();
    if (now < _errorUntil) return;
    if (now - scanData.lastUpdate > 500) return;
    if (now - getSharedBattleScreenTs() > AUTOSHOOT_CFG.BATTLE_SCREEN_MAX_AGE_MS) return;

    if (hasBall()) return;

    try {
        const myX = scanData.myX, myY = scanData.myY;
        const own = scanData.ownCharacter;
        if (!own || own.isNull()) return;

        if (_isSkillActive(own)) return;

        const range = resolveBrawlerRange(scanData.myBrawlerName, scanData.myBrawlerId);
        if (range <= 0) return;

        const requireLOS = !isLauncher(scanData.myBrawlerId, scanData.myBrawlerName);

        const superCharged = _isSuperCharged(own);
        if (superCharged && _tryActivateSkillFn) {
            const superRange = _resolveSuperRange(scanData.myBrawlerName);
            const superRangeSq = superRange * superRange;
            const target = _findBestEnemyInRange(myX, myY, superRangeSq, requireLOS);
            if (target) {
                const coords = _computeAimCoords(target.gid, target.x, target.y, myX, myY);
                _activateSuperSkill(_battleScreen, coords.x, coords.y);
                return;
            }
        }

        const hyperCharged = _isHyperCharged(own);
        if (hyperCharged && _tryActivateSkillFn) {
            const superRange = _resolveSuperRange(scanData.myBrawlerName);
            const superRangeSq = superRange * superRange;
            const target = _findBestEnemyInRange(myX, myY, superRangeSq, requireLOS);
            if (target) {
                const coords = _computeAimCoords(target.gid, target.x, target.y, myX, myY);
                _activateHyperSkill(_battleScreen, coords.x, coords.y);
                return;
            }
        }

        const currentAmmo = _getCurrentAmmo(own);
        if (currentAmmo === 0) {
            _ammoReadySince = 0;
            return;
        }
        if (currentAmmo > 0 && _lastAmmoCount === 0) {
            _ammoReadySince = now;
        }
        if (_ammoReadySince > 0 && now - _ammoReadySince < AUTOSHOOT_CFG.CHARGE_WAIT_MS) return;
        _lastAmmoCount = currentAmmo;

        if (now - _lastFireMs < AUTOSHOOT_CFG.FIRE_INTERVAL_MS) return;

        const rangeSq = range * range;
        const target = _findBestEnemyInRange(myX, myY, rangeSq, requireLOS);
        if (!target) return;

        const coords = _computeAimCoords(target.gid, target.x, target.y, myX, myY);
        _fireAt(_battleScreen, own, coords.x, coords.y);
        _lastFireMs = now;
    } catch (e) {
        _errorUntil = Date.now() + AUTOSHOOT_CFG.ERROR_COOLDOWN_MS;
    }
}

export function setupAutoShoot(base) {
    _wrapperFn = new NativeFunction(base.add(offsets.BattleScreen_fireWrapperFn), 'int', ['pointer', 'pointer']);

    try {
        _tryActivateSkillFn = new NativeFunction(base.add(offsets.BattleScreen__tryToActivateSkill), 'bool', ['pointer', 'int', 'int', 'int']);
    } catch (_) { _tryActivateSkillFn = null; }

    try {
        _getMaxChargeFn = new NativeFunction(base.add(offsets.LogicSkillData__getMaxCharge), 'int', ['pointer']);
    } catch (_) { _getMaxChargeFn = null; }

    try {
        _getCurrentActiveOrCastingSkillFn = new NativeFunction(
            base.add(offsets.LogicCharacterClient__getCurrentActiveOrCastingSkill), 'pointer', ['pointer']
        );
    } catch (_) { _getCurrentActiveOrCastingSkillFn = null; }
}

export function resetAutoShoot() {
    _lastFireMs = 0;
    _errorUntil = 0;
    _lastAmmoCount = -1;
    _ammoReadySince = 0;
}
