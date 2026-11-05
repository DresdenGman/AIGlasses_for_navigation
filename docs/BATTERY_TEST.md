# Battery endurance test — protocol and results

Battery life is the second most common problem in the [participant feedback](FEEDBACK.md) (36% of users; one reported under an hour of continuous use). It has never been measured under a recorded protocol. This document fixes the protocol first, so the result — whenever it is measured — can be checked and repeated.

**Status: protocol defined; no measurement has been recorded yet.** Any battery-life figure stated anywhere else for this project is a participant report, not a measurement.

## Creator-reported everyday endurance (not a protocol result)

In everyday use the glasses run about 3 hours 15 minutes per charge (creator's report, 2026-11-05; not a timed run, mixed use). This figure is anecdotal: the protocol below has not been run yet, and this number must not be cited as its result.

## Protocol

1. **Record the build under test.** Battery model and rated capacity (mAh), board, camera module, speaker type, firmware/software version, and the release tag or commit of the software used.
2. **Charge fully** using the build's normal charging method. Start the test within 15 minutes of removing the charger.
3. **Workload (continuous guidance use).** The device runs the guidance demo continuously for the whole test: camera path active, a guidance event triggered at least once per minute, audio output at the volume used in community sessions. Screen/phone stays awake. No idle periods longer than 2 minutes.
4. **Environment.** Indoor, room temperature (record it), Wi-Fi connected if the build normally uses it.
5. **Check-ins every 15 minutes.** Note the time, whether the device is still running, and the battery indicator reading if the build exposes one.
6. **End condition.** The device shuts down, or the guidance function stops working. Record total elapsed time from step 2.
7. **Repetitions.** Three runs on the same build. Report all three, plus the mean and the range — not just the best run.

## Results

| Run | Date | Build (battery, capacity) | Elapsed time | Notes |
|---|---|---|---|---|
| 1 | — | — | — | *Not yet measured* |
| 2 | — | — | — | |
| 3 | — | — | — | |

## Reading the result

- This is an endurance figure for one build under one workload. It is not a promise for other builds, batteries or usage patterns.
- If a measured figure replaces a participant report anywhere in the documentation, the wording will say which one it is.
