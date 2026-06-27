# Tire Aligner App

A DIY wheel alignment tool I built because I got tired of paying shop prices every time I adjusted my lift or swapped tires. The idea is simple — you 3D print a jig that holds your phone flat against each wheel, and the app uses your phone's built-in sensors to measure the angles. No $200 shop visit, no guessing, just real numbers.

---

## What It Measures

- **Toe** — are your wheels pointing straight or angled in/out
- **Camber** — tilt of the wheel from vertical (in or out at the top)
- **Caster** — the forward/backward lean of the steering axis
- **Thrust Angle** — whether your rear axle is actually centered or pushing the truck sideways (dog-tracking)

---

## What You Need

**Hardware (3D printed — all files included in `/hardware`)**

| File | What It Is |
|---|---|
| `ALIGNMATEV2p.3mf` | The main jig that clamps to your wheel |
| `blockv2.3mf` | The clamp block |
| `screwcap.3mf` | The hand-tighten knob |

I printed mine on a Creality K1C in PETG. If you're on a different printer, just re-slice the .3mf files in your slicer — the geometry is the same. See [`hardware/PRINT_NOTES.md`](hardware/PRINT_NOTES.md) for full print settings.

**You also need:**
- An iPhone (iPhone 8 or newer — iOS 15.6+)
- A standard bolt and nut to assemble the clamp (check the hole size in your slicer)
- A helper for the caster measurement (someone holds the jig while you turn the steering wheel)

---

## My Setup

This was built around my truck but the app lets you enter your own mods so the target specs adjust automatically.

- **Vehicle:** 2021 Chevy Silverado 1500 Trail Boss LT 5.3L
- **Lift:** Aftermarket lift kit
- **Spacers:** Added wheel spacers
- **Tires:** Aftermarket — larger than stock

The reason I had to build this is that lifted trucks don't align the same as stock. The camber goes more negative, caster drops, and the tolerances shift. A shop alignment is fine but they're working off stock spec sheets and don't always account for what happens when you add 3 inches of lift and 25mm spacers. This app lets me dial it in to my actual setup.

---

## How It Works

### 1. Set Up Your Profile
Enter your lift height, spacer thickness, and tire size. The app uses that to calculate adjusted alignment targets — not just factory spec, but what's actually correct for your configuration.

### 2. Surface Calibration
Before measuring anything, you place the jig flat on the ground and capture a baseline reading. This is important — it tells the app how level (or not) your driveway is, and subtracts that from every wheel reading. You get accurate angles even if your surface isn't perfect.

### 3. Measure All 4 Wheels
The app walks you through it step by step:
- Start with the rear wheels — these set the "straight ahead" reference line (thrust line)
- Then measure the fronts for toe and camber
- Then do the caster sweep — steer to full left lock, capture, steer to full right lock, capture. The app calculates caster from the difference.

### 4. See Your Results
Everything comes back color-coded — green means in spec, yellow means you're getting close to the limit, red means it needs adjustment. The thrust angle gets its own visual gauge so you can see at a glance if your truck is dog-tracking.

### 5. Fix It
Tap any out-of-spec wheel and choose how you want to handle it:

**Guided Fix** — walks you through the adjustment one step at a time. Tells you which component to touch, what tools you need, which direction to turn, and roughly how many turns to make. It's aimed at people who are handy but maybe haven't done this exact adjustment before.

**Quick Brief** — if you already know what you're doing, just tap this and it gives you the short version. Something like: *"Front left toe is off by 0.12° — shorten the tie rod, 2 quarter turns clockwise."* Done.

---

## The Math (for the curious)

- **Camber** is measured using gravity alone (accelerometer only) — no magnetometer involved, which makes it very reliable
- **Toe** is measured relative to the rear axle thrust line, not an absolute compass heading, which keeps it accurate even near a metal vehicle where magnetometers go haywire
- **Caster** uses the SAE J670e steering-sweep formula: measure camber at each steering lock, calculate from the difference
- **Thrust angle** is the deviation of the rear axle centerline from straight ahead — ideally 0°, anything over 0.5° and you'll feel the truck pushing sideways

---

## Running the App

```bash
cd Tire_Aligner_App
npm install
npx expo start
```

Scan the QR code with **Expo Go** on your iPhone. That's it.

> **Note:** The app needs motion sensor permissions. When iOS asks, tap Allow.

---

## Tech Stack

- React Native / Expo
- `expo-sensors` for gyroscope and accelerometer access
- `expo-keep-awake` to keep the screen on during measurement
- React Navigation for the step-by-step flow
- TypeScript throughout

---

## Accuracy Notes

This is a DIY tool and it's pretty accurate for what it is, but there are things to know:

- **Camber is the most accurate** — it only uses gravity, which is very clean
- **Toe accuracy depends on your phone's magnetometer** — it can be affected by being close to large metal objects. Taking the reading with the rear wheels first (to establish the reference line) helps a lot
- **Caster is solid** — the steering sweep method is how professional alignment machines work too, just adapted for a phone
- Surface calibration makes a big difference. Don't skip it.

---

## Files

```
Tire_Aligner_App/
├── App.tsx                          # Navigation and route types
├── src/
│   ├── screens/
│   │   ├── WelcomeScreen.tsx        # Launch screen
│   │   ├── VehicleSetupScreen.tsx   # Profile + mod inputs
│   │   ├── CalibrationScreen.tsx    # Surface baseline capture
│   │   ├── MeasurementFlowScreen.tsx # 8-step guided measurement
│   │   ├── ResultsScreen.tsx        # Full results + thrust gauge
│   │   └── WheelDetailScreen.tsx    # Guided fix / quick brief
│   ├── utils/
│   │   ├── alignmentMath.ts         # All the angle calculations
│   │   └── sensorUtils.ts           # Sensor sampling and averaging
│   ├── constants/
│   │   ├── vehicleSpecs.ts          # Trail Boss specs + lift adjustments
│   │   └── adjustmentGuide.ts       # Fix instructions and turn estimates
│   └── theme.ts                     # Colors and fonts
└── hardware/
    ├── ALIGNMATEV2p.3mf             # Main jig body
    ├── blockv2.3mf                  # Clamp block
    ├── screwcap.3mf                 # Bolt cap
    └── PRINT_NOTES.md               # Print settings and assembly
```

---

## License

MIT — use it, modify it, print it, whatever. If you improve the jig design or add support for other vehicles I'd love to see it.
