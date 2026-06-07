# companion-module-govee-lan

A [Bitfocus Companion](https://bitfocus.io/companion) module to control **Govee lights
100% locally** via the Govee **LAN (WLAN) API**. No cloud, no API key, no internet required.

Unlike the cloud-based Govee modules, this module communicates directly with the lights over
UDP on your local network using Govee's documented LAN Control protocol:

- Multicast discovery scan to `239.255.255.250:4001`
- Device replies received on UDP `4002`
- Control + status commands sent to each device on UDP `4003`

## Features

- Auto-discovery of LAN-enabled Govee devices (plus manual IP entry)
- Power on / off / toggle (per device or all devices)
- Set brightness (absolute and relative)
- Set RGB color (color picker or numeric/variable values)
- Set white color temperature (Kelvin)
- Status polling with feedbacks (power state, color swatch) and variables
- Generated presets per device

## Requirements

- **LAN Control must be enabled per device** in the Govee Home app (device settings → LAN Control).
- Only Govee models that support LAN Control will work.
- Companion and the lights must be on the same subnet, with UDP ports 4001/4002/4003 unblocked.

See [`companion/HELP.md`](companion/HELP.md) for full usage details.

## Development

```bash
corepack enable
yarn install      # install dependencies
yarn package      # build an importable module package (pkg.tgz)
```

To develop against a running Companion instance, point Companion's *Developer modules path*
at the folder containing this module (after `yarn install`).

## Building an importable package

```bash
yarn package
```

This produces a `pkg.tgz` you can import in Companion via
**Modules → Import module package**.

## License

MIT
