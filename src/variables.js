import { varPrefix } from './util.js'

export function getVariableDefinitions(self) {
	const defs = {
		device_count: { name: 'Number of known devices' },
	}

	for (const dev of self.devices.values()) {
		const p = varPrefix(dev.ip)
		const label = dev.name || dev.ip
		defs[`${p}_name`] = { name: `${label}: name` }
		defs[`${p}_ip`] = { name: `${label}: IP address` }
		defs[`${p}_sku`] = { name: `${label}: SKU / model` }
		defs[`${p}_mac`] = { name: `${label}: MAC / device id` }
		defs[`${p}_power`] = { name: `${label}: power (on/off/unknown)` }
		defs[`${p}_brightness`] = { name: `${label}: brightness (0-100)` }
		defs[`${p}_color_temp`] = { name: `${label}: color temperature (Kelvin)` }
		defs[`${p}_color_r`] = { name: `${label}: color red (0-255)` }
		defs[`${p}_color_g`] = { name: `${label}: color green (0-255)` }
		defs[`${p}_color_b`] = { name: `${label}: color blue (0-255)` }
		defs[`${p}_color_hex`] = { name: `${label}: color hex` }
	}

	return defs
}
