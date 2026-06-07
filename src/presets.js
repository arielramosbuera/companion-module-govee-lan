import { combineRgb } from '@companion-module/base'
import { varPrefix } from './util.js'

export function getPresetDefinitions(self) {
	const presets = {}
	const structure = []

	// --- Utility section ---
	presets.discover = {
		type: 'simple',
		name: 'Discover devices',
		style: { text: 'Scan\\nGovee', size: '14', color: combineRgb(255, 255, 255), bgcolor: combineRgb(0, 51, 102) },
		steps: [{ down: [{ actionId: 'discover', options: {} }], up: [] }],
		feedbacks: [],
	}
	presets.all_on = {
		type: 'simple',
		name: 'All devices on',
		style: { text: 'ALL\\nON', size: '18', color: combineRgb(255, 255, 255), bgcolor: combineRgb(0, 80, 0) },
		steps: [{ down: [{ actionId: 'power', options: { target: 'all', state: 'on' } }], up: [] }],
		feedbacks: [],
	}
	presets.all_off = {
		type: 'simple',
		name: 'All devices off',
		style: { text: 'ALL\\nOFF', size: '18', color: combineRgb(255, 255, 255), bgcolor: combineRgb(80, 0, 0) },
		steps: [{ down: [{ actionId: 'power', options: { target: 'all', state: 'off' } }], up: [] }],
		feedbacks: [],
	}
	structure.push({
		id: 'utility',
		name: 'Utility',
		definitions: ['discover', 'all_on', 'all_off'],
	})

	// --- Per-device sections ---
	let idx = 0
	for (const dev of self.devices.values()) {
		const ip = dev.ip
		const label = dev.name || ip
		const safe = `dev_${idx++}`
		const powerVar = `$(govee-lan:${varPrefix(ip)}_power)`

		const toggleId = `${safe}_toggle`
		const upId = `${safe}_bright_up`
		const downId = `${safe}_bright_down`
		const colorId = `${safe}_color`

		presets[toggleId] = {
			type: 'simple',
			name: `${label}: Power toggle`,
			style: {
				text: `${label}\\n${powerVar}`,
				size: '14',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(40, 40, 40),
			},
			steps: [{ down: [{ actionId: 'power', options: { target: ip, state: 'toggle' } }], up: [] }],
			feedbacks: [
				{
					feedbackId: 'devicePower',
					options: { target: ip },
					style: { bgcolor: combineRgb(0, 153, 0), color: combineRgb(255, 255, 255) },
				},
			],
		}

		presets[upId] = {
			type: 'simple',
			name: `${label}: Brightness +10`,
			style: { text: `${label}\\nBri +`, size: '14', color: combineRgb(255, 255, 255), bgcolor: combineRgb(40, 40, 40) },
			steps: [{ down: [{ actionId: 'brightness_adjust', options: { target: ip, delta: 10 } }], up: [] }],
			feedbacks: [],
		}

		presets[downId] = {
			type: 'simple',
			name: `${label}: Brightness -10`,
			style: { text: `${label}\\nBri -`, size: '14', color: combineRgb(255, 255, 255), bgcolor: combineRgb(40, 40, 40) },
			steps: [{ down: [{ actionId: 'brightness_adjust', options: { target: ip, delta: -10 } }], up: [] }],
			feedbacks: [],
		}

		presets[colorId] = {
			type: 'simple',
			name: `${label}: Color swatch`,
			style: { text: `${label}`, size: '14', color: combineRgb(255, 255, 255), bgcolor: combineRgb(40, 40, 40) },
			steps: [{ down: [{ actionId: 'refresh_status', options: { target: ip } }], up: [] }],
			feedbacks: [{ feedbackId: 'deviceColor', options: { target: ip } }],
		}

		structure.push({
			id: `device_${safe}`,
			name: label,
			definitions: [toggleId, upId, downId, colorId],
		})
	}

	return { structure, presets }
}
