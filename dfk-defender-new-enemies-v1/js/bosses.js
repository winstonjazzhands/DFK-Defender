
export const BOSS_DEFS = {
  5: {
    id: "honkules",
    name: "Honkules",
    baseHpMultiplier: 3.0,
    speedMultiplier: 0.9,
    damageMultiplier: 1.5,
    abilities: {
      honkSlam: { cooldownMs: 4000, knockbackTiles: 1 },
      featherFury: { triggerHpPct: 0.5, attackSpeedBonus: 0.25 }
    }
  },
  10: {
    id: "motherclucker",
    name: "Motherclucker",
    baseHpMultiplier: 4.0,
    speedMultiplier: 0.95,
    damageMultiplier: 1.0,
    abilities: {
      broodSwarm: { cooldownMs: 3000, spawnCount: 2 },
      protectTheNest: { damageReductionPct: 0.30 }
    }
  },
  15: {
    id: "mooseifer",
    name: "Mooseifer",
    baseHpMultiplier: 5.0,
    speedMultiplier: 1.1,
    damageMultiplier: 2.0,
    abilities: {
      antlerCharge: { cooldownMs: 6000, rangeTiles: 5 },
      thickHide: { flatReduction: 15 }
    }
  },
  20: {
    id: "cluckstorm",
    name: "Cluckstorm",
    baseHpMultiplier: 6.2,
    speedMultiplier: 1.05,
    damageMultiplier: 1.5,
    abilities: {
      stormBrood: { cooldownMs: 4000, spawnCount: 3, speedMultiplier: 1.5 },
      galePush: { cooldownMs: 7000, pushTiles: 1 }
    }
  }
};
