// Shared colour tokens (GDD §17). Numbers for Three.js; UI uses its own CSS vars with the same values.

export const PAL = {
  // sky & light
  skyTop: 0x141a3a,
  skyHorizon: 0x2b2f6b,
  skyDawnTop: 0x4a5a9a,
  skyDawnHorizon: 0xffb38a,
  moon: 0xf4f1d8,
  star: 0xfff8e0,
  ambientNight: 0x6a5acd,
  hemiSky: 0x5460b0,
  hemiGround: 0x2a2440,
  moonLight: 0xb8c4ff,
  windowWarm: 0xffd27a,
  streetlight: 0xffae4a,
  porchLight: 0xffe3a0,
  flashlight: 0xfff4c8,
  denGlow: 0xffc86a,

  // ground
  asphalt: 0x3a3d4c,
  asphaltLine: 0xe8d98a,
  sidewalk: 0x8c8aa0,
  curb: 0xa6a3b8,
  driveway: 0x77758a,
  lawn: 0x3f7a4a,
  lawnDark: 0x33643d,
  park: 0x4a8a50,
  dirt: 0x6b5140,
  water: 0x2f5f8f,
  patio: 0x9a8472,
  alley: 0x4a4854,

  // houses (walls)
  houseWalls: [0x9fdcc4, 0xf6b89a, 0xc5b3e6, 0xf7e08c, 0x9fc9f0, 0xf29a8a, 0xb5d49b, 0xf0d2b0] as readonly number[],
  houseRoofs: [0x5a4a6e, 0x8a4a3e, 0x3e5a6e, 0x6e5a3e, 0x4a4a5a, 0x7a3e5a] as readonly number[],
  trim: 0xfff6e8,

  // raccoon
  furBody: 0x5b5e66,
  furLight: 0x8c8f98,
  furMask: 0x2a2b30,
  muzzle: 0xd9d4cc,
  nose: 0x121216,
  eyeWhite: 0xffffff,
  eyePupil: 0x16161c,
  pawPink: 0x3a3238,

  // cans
  canSilver: 0xb8c0cc,
  canBlue: 0x3f7fd8,
  dumpsterGreen: 0x2f7a52,
  premiumGold: 0xe8c45a,
  specialGold: 0xffd24a,

  // gameplay accents
  outline: 0x15131c,
  focusRing: 0x7df9ff,
  visionIdle: 0xfff6c8,
  visionAlert: 0xffb13d,
  visionChase: 0xff4a4a,
  noiseRing: 0xe8e6ff,
} as const;

/** CSS hex helper: 0xffaa00 → '#ffaa00'. */
export function css(hex: number): string {
  return '#' + hex.toString(16).padStart(6, '0');
}
