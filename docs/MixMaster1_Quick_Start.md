# MixMaster1 Pro - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Step 1: Access MixMaster1 Pro
1. Navigate to: **http://localhost:3000**
2. Click on the **MixMaster1 Pro** navigation card
3. Or go directly to: **http://localhost:3000/mixmaster1-pro.html**

### Step 2: Understand the Interface

```
┌────────────────────────────────────────────────────────────┐
│ 📁 Project Controls    [New] [Open] [Save] [📸] [Export]  │  ← Header
├────────────────────────────────────────────────────────────┤
│ ⏯ Transport    [◄◄] [▶] [■] [●] [⟳]    00:00:00   120BPM │  ← Transport
├──────────────────────────────────────┬─────────────────────┤
│                                      │                     │
│     🎚️ MIXER SECTION                │  🔧 INSPECTOR       │
│                                      │                     │
│  [Channel 1] [Channel 2] [Master]   │  • EQ Controls      │  ← Main Area
│     Meters       Meters     Meters   │  • Compressor       │
│     Faders       Faders     Fader    │  • Effects          │
│      S M R       S M R                │  • Automation       │
│                                      │                     │
└──────────────────────────────────────┴─────────────────────┘
```

### Step 3: Explore Channel Controls

Each channel strip has (from top to bottom):
1. **Name** - Click to rename
2. **Meter** - Shows audio level (green/yellow/red)
3. **Pan Knob** - Drag to pan left/right
4. **Fader** - Drag up/down to adjust volume
5. **Buttons**:
   - **S** = Solo (listen to this channel only)
   - **M** = Mute (silence this channel)
   - **R** = Record arm

### Step 4: Use the Inspector Panel

Click the tabs at the top:
- **Channel Tab**: EQ, compression, effects for selected channel
- **Master Tab**: Master chain processing and LUFS metering
- **Snapshots Tab**: Save and recall mix states

### Step 5: Try the EQ

1. Select a channel (click anywhere on the strip)
2. Look at the **Inspector → Channel Tab**
3. See the **EQ graph** at the top
4. Adjust the sliders under each EQ band:
   - **Low Shelf** (80 Hz): Add warmth or remove rumble
   - **Low-Mid** (400 Hz): Body and fullness
   - **High-Mid** (2.5 kHz): Clarity and presence
   - **High Shelf** (8 kHz): Air and brightness

### Step 6: Add Compression

Scroll down in the Inspector to see the **Compressor** section:
- **Threshold**: -18 dB (lower = more compression)
- **Ratio**: 4:1 (higher = more aggressive)
- **Attack**: 5 ms (faster = tighter)
- **Release**: 50 ms (faster = punchier)

## 🎛️ Essential Controls

### Fader Control
```
│  ▐   ← Drag up/down to adjust volume
│  ▐      Range: -60dB to +12dB
│  ■   ← Shows current level
-3.2dB ← Numerical display
```

**How to use:**
1. Click and drag the **■ thumb** up/down
2. Or click anywhere on the track to jump to that level
3. Watch the **meter** above to avoid clipping (red = too loud)

### Pan Control
```
   ( C )  ← Center position
   │
```

**How to use:**
1. Click and drag the **pan knob** in a circular motion
2. **C** = Center, **L50** = 50% left, **R100** = 100% right

### Solo/Mute/Record
```
[S] ← Solo: Hear only this channel
[M] ← Mute: Silence this channel
[R] ← Record: Arm for recording (coming soon)
```

## 🎨 EQ Visualization

The **EQ graph** shows your frequency adjustments in real-time:

```
╭─────────────────╮
│    ⎛‾‾⎞         │  ← High shelf boost
│ ⎛‾⎞╱  ╲⎛‾‾⎞    │  ← Low-mid and high-mid cuts
│──────────────── │  ← 0 dB line
╰─────────────────╯
20Hz        20kHz
```

**Color meaning:**
- **Cyan line** = Your current EQ curve
- **Gray grid** = Frequency and dB references
- **Labels** = 20Hz, 100Hz, 1kHz, 10kHz, 20kHz

## 📊 Professional Metering

### Channel Meters
```
┌──┐
│▓▓│  0   ← Maximum (red zone)
│▓▓│ ───
│▓▓│ -6   ← Yellow zone (caution)
│▓▓│ -12
│▓▓│ -18  ← Green zone (optimal)
│░░│ -24
│░░│ -∞   ← No signal
└──┘
```

**Best practices:**
- **Green** = Perfect! (-18 to -6 dB)
- **Yellow** = Getting loud (-6 to 0 dB)
- **Red** = Too loud! (0 dB+) - reduce fader

### Master LUFS Meter

Switch to the **Master Tab** to see:

```
┌─────────────┐
│    -14.0    │ ← LUFS Integrated
│     LUFS    │
└─────────────┘
```

**Target levels:**
- **Spotify**: -14 LUFS
- **YouTube**: -13 LUFS
- **Apple Music**: -16 LUFS
- **Broadcast**: -23 LUFS

## 🎚️ Common Mixing Tasks

### Task 1: Make Vocals Stand Out
1. Select the vocal channel
2. **EQ**:
   - Boost **High-Mid** (2.5 kHz) by +3 dB for clarity
   - Boost **High Shelf** (8 kHz) by +2 dB for air
3. **Compression**:
   - Threshold: -18 dB
   - Ratio: 4:1
   - Attack: 5 ms
   - Release: 50 ms

### Task 2: Add Punch to Drums
1. Select the kick channel
2. **EQ**:
   - Boost **Low Shelf** (80 Hz) by +3 dB for weight
   - Cut **Low-Mid** (400 Hz) by -2 dB to reduce mud
3. **Compression**:
   - Threshold: -24 dB
   - Ratio: 6:1
   - Attack: 0.5 ms (fast)
   - Release: 100 ms

### Task 3: Widen the Mix
1. Go to **Master Tab**
2. Scroll to **Stereo Widener**
3. Increase **Width** slider to 120-150%
4. Check **Phase Correlation** meter (should stay positive)

### Task 4: Add Reverb
1. Select a channel (e.g., vocals)
2. Scroll to **Sends** section
3. Increase **Reverb** slider from -∞ to -20 dB
4. Adjust to taste (higher = more reverb)

### Task 5: Save Your Mix
1. Click **[📸 Snapshot]** in the header
2. Name it (e.g., "Verse Balance", "Chorus Energy")
3. Access saved snapshots in the **Snapshots Tab**
4. Click **[Load]** to recall any snapshot instantly

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **Space** | Play/Pause |
| **Cmd/Ctrl + S** | Save project |
| **Cmd/Ctrl + Z** | Undo |
| **Cmd/Ctrl + Shift + Z** | Redo |
| **1-9** | Select channels 1-9 |
| **0** | Select master channel |
| **S** | Toggle solo on selected channel |
| **M** | Toggle mute on selected channel |

## 🎯 Mixing Workflow

### Complete Mix Process (30 minutes)

**Phase 1: Balance (10 min)**
1. Set all faders to -∞ (bottom)
2. Start with kick drum, bring to -12 dB
3. Add bass, balance with kick
4. Add other drums, create drum balance
5. Add instruments one by one
6. Add vocals last, make them stand out

**Phase 2: EQ (10 min)**
1. Remove unwanted frequencies (cut)
2. Add character where needed (boost)
3. Make space for each instrument:
   - Bass: 60-200 Hz
   - Kick: 40-80 Hz
   - Snare: 200 Hz, 5 kHz
   - Vocals: 1-5 kHz
   - Guitars: 500 Hz-4 kHz

**Phase 3: Dynamics (5 min)**
1. Compress drums (tight control)
2. Compress bass (consistency)
3. Compress vocals (intimacy)
4. Light compression on instruments

**Phase 4: Effects (5 min)**
1. Add reverb to vocals
2. Add delay to lead elements
3. Add subtle reverb to drums (room sound)

**Phase 5: Master (5 min)**
1. Switch to **Master Tab**
2. Apply gentle EQ correction
3. Apply mastering compression (ratio 2:1)
4. Apply true peak limiter (ceiling -0.3 dB)
5. Check LUFS target (-14 LUFS for streaming)

## 💡 Pro Tips

### Tip 1: Gain Staging
- Keep channels at **-18 to -12 dB** average
- Leave **6 dB headroom** on the master
- This prevents clipping and maintains clarity

### Tip 2: Subtractive EQ
- **Cut** frequencies you don't want (removes mud)
- **Boost** sparingly (adds character)
- Cutting is more transparent than boosting

### Tip 3: Parallel Compression
1. Create a duplicate channel (coming soon)
2. Compress heavily (ratio 8:1, threshold -30 dB)
3. Blend with original (fader at -15 dB)
4. Result: Punchy yet dynamic

### Tip 4: Reference Tracks
1. Import a professional track you admire
2. A/B compare with your mix
3. Match the overall balance
4. Match the brightness/darkness
5. Match the LUFS level

### Tip 5: Take Breaks
- Mix for 30-45 minutes
- Take a 10-15 minute break
- Your ears need rest to stay accurate

## 🐛 Troubleshooting

### Problem: Audio is distorting
**Solution**: 
- Lower all faders by 3-6 dB
- Check for red meters
- Reduce master fader if needed

### Problem: Mix sounds muddy
**Solution**:
- Cut **Low-Mid** (200-500 Hz) on most tracks
- High-pass filter on everything except bass/kick
- Add **High Shelf** boost for clarity

### Problem: Mix sounds thin
**Solution**:
- Check **Low Shelf** on bass instruments
- Make sure kick and bass aren't canceling each other
- Add subtle **Low-Mid** boost to add body

### Problem: Meters not moving
**Solution**:
- Click **[▶ Play]** to start playback
- Audio files need to be imported (feature coming soon)
- Check browser console for errors (F12)

## 📚 Next Steps

1. **Read the full guide**: [MixMaster1_Pro_Guide.md](MixMaster1_Pro_Guide.md)
2. **Watch video tutorials**: (Coming soon)
3. **Join the Discord**: Ask questions and share tips
4. **Upgrade to Pro+**: Unlock advanced features

## 🎉 You're Ready!

You now know enough to start mixing professionally in MixMaster1 Pro. Remember:

- **Start simple** - Balance, then EQ, then compression
- **Use your ears** - If it sounds good, it is good
- **Reference often** - Compare to professional tracks
- **Take breaks** - Fresh ears = better decisions
- **Have fun!** - Music production should be enjoyable

**Happy mixing! 🎧**

---

*Need help? Contact support@creatorsync.com*
