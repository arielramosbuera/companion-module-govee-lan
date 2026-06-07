# Govee LAN

Control Govee lights **100% locally** using the Govee LAN (WLAN) API. No cloud account,
no API key, and no internet connection required — Companion talks directly to the lights
over your local network using UDP.

## Requirements

1. **Enable LAN Control on each light.** Open the **Govee Home** app → select the device →
   device settings (gear icon) → **LAN Control** → turn it **ON**.
   (Only certain models support LAN Control. If you don't see the option, your model is not supported.)
2. Companion and the lights must be on the **same network / subnet**.
3. The following UDP ports must not be blocked by a firewall on the Companion machine:
   - `4001` (outbound multicast scan)
   - `4002` (inbound device replies) — make sure inbound UDP 4002 is allowed
   - `4003` (outbound control)

## Configuration

| Field | Description |
| --- | --- |
| **Auto-discover devices** | Periodically send a multicast scan to find LAN-enabled Govee lights. |
| **Re-discover interval** | How often (seconds) to re-scan. `0` = scan only once at startup. |
| **Poll device status** | Periodically ask each device for its on/off, brightness and color. |
| **Status poll interval** | How often (seconds) to poll status. |
| **Manual devices** | Add devices by IP if discovery doesn't find them. One per line: `192.168.1.50` or `192.168.1.50,Stage Left`. |
| **Network interface IP** | Optional. On machines with multiple network adapters, set the IP of the adapter on the same subnet as the lights. |

## Actions

- **Power on/off/toggle** — turn a device (or all devices) on, off, or toggle.
- **Set brightness** — 0–100%.
- **Adjust brightness (relative)** — increase/decrease by a delta, based on the last known brightness.
- **Set color (RGB)** — pick a color with the color picker.
- **Set color (RGB values / variables)** — set R/G/B from numbers or variables.
- **Set white color temperature** — 2000–9000 K.
- **Discover devices (scan LAN)** — trigger a discovery scan.
- **Refresh device status** — request fresh status from a device (or all).

Every action lets you target a specific discovered device, **All devices**, or a custom IP address.

## Feedbacks

- **Device is powered on** — change the button style when the device is on.
- **Match button background to device's color** — tints the button with the device's current color.

## Variables

A `device_count` variable plus, for every known device, a set of variables prefixed with
`dev_<ip>` (dots replaced by underscores), e.g. `dev_192_168_1_50_power`,
`dev_192_168_1_50_brightness`, `dev_192_168_1_50_color_hex`, etc.

## Notes

- The Govee LAN API does not report scenes/effects back, and this module focuses on the
  documented LAN commands: power, brightness, color, and color temperature.
- If a device isn't discovered, confirm LAN Control is enabled, that you're on the same
  subnet, and try adding it under **Manual devices**.
