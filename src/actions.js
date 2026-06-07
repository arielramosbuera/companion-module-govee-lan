import { splitRgb } from '@companion-module/base'

function targetOption(self, includeAll = true) {
	return {
		type: 'dropdown',
		id: 'target',
		label: 'Target device',
		default: includeAll ? 'all' : (self.devices.values().next().value?.ip ?? ''),
		choices: self.deviceChoices(includeAll),
		allowCustom: true,
		tooltip: 'Pick a discovered device, "All devices", or type a device IP address.',
	}
}

export function getActionDefinitions(self) {
	return {
		power: {
			name: 'Power on/off/toggle',
			options: [
				targetOption(self),
				{
					type: 'dropdown',
					id: 'state',
					label: 'State',
					default: 'on',
					choices: [
						{ id: 'on', label: 'On' },
						{ id: 'off', label: 'Off' },
						{ id: 'toggle', label: 'Toggle' },
					],
				},
			],
			callback: async (action) => {
				const ips = self.resolveTargets(action.options.target)
				for (const ip of ips) {
					let on
					if (action.options.state === 'toggle') {
						const dev = self.devices.get(ip)
						on = !(dev && dev.onOff === 1)
					} else {
						on = action.options.state === 'on'
					}
					self.client?.setPower(ip, on)
					self.scheduleStatus(ip)
				}
			},
		},

		brightness_set: {
			name: 'Set brightness',
			options: [
				targetOption(self),
				{
					type: 'number',
					id: 'value',
					label: 'Brightness (0-100)',
					default: 100,
					min: 0,
					max: 100,
					range: true,
				},
			],
			callback: async (action) => {
				const value = Number(action.options.value)
				for (const ip of self.resolveTargets(action.options.target)) {
					self.client?.setBrightness(ip, value)
					self.scheduleStatus(ip)
				}
			},
		},

		brightness_adjust: {
			name: 'Adjust brightness (relative)',
			options: [
				targetOption(self),
				{
					type: 'number',
					id: 'delta',
					label: 'Change by (-100 to 100)',
					default: 10,
					min: -100,
					max: 100,
				},
			],
			callback: async (action) => {
				const delta = Number(action.options.delta)
				for (const ip of self.resolveTargets(action.options.target)) {
					const dev = self.devices.get(ip)
					const current = Number.isFinite(dev?.brightness) ? dev.brightness : 0
					const next = Math.min(100, Math.max(0, current + delta))
					self.client?.setBrightness(ip, next)
					self.scheduleStatus(ip)
				}
			},
		},

		color_rgb: {
			name: 'Set color (RGB)',
			options: [
				targetOption(self),
				{
					type: 'colorpicker',
					id: 'color',
					label: 'Color',
					default: 0xffffff,
					returnType: 'number',
				},
			],
			callback: async (action) => {
				const { r, g, b } = splitRgb(Number(action.options.color))
				for (const ip of self.resolveTargets(action.options.target)) {
					self.client?.setColor(ip, r, g, b)
					self.scheduleStatus(ip)
				}
			},
		},

		color_rgb_manual: {
			name: 'Set color (RGB values / variables)',
			options: [
				targetOption(self),
				{ type: 'textinput', id: 'r', label: 'Red (0-255)', default: '255', useVariables: true },
				{ type: 'textinput', id: 'g', label: 'Green (0-255)', default: '255', useVariables: true },
				{ type: 'textinput', id: 'b', label: 'Blue (0-255)', default: '255', useVariables: true },
			],
			callback: async (action) => {
				const r = Number(action.options.r)
				const g = Number(action.options.g)
				const b = Number(action.options.b)
				for (const ip of self.resolveTargets(action.options.target)) {
					self.client?.setColor(ip, r, g, b)
					self.scheduleStatus(ip)
				}
			},
		},

		color_temp: {
			name: 'Set white color temperature',
			options: [
				targetOption(self),
				{
					type: 'number',
					id: 'kelvin',
					label: 'Color temperature (Kelvin, 2000-9000)',
					default: 4000,
					min: 2000,
					max: 9000,
					range: true,
				},
			],
			callback: async (action) => {
				const kelvin = Number(action.options.kelvin)
				for (const ip of self.resolveTargets(action.options.target)) {
					self.client?.setColorTemperature(ip, kelvin)
					self.scheduleStatus(ip)
				}
			},
		},

		discover: {
			name: 'Discover devices (scan LAN)',
			options: [],
			callback: async () => {
				self.client?.discover()
			},
		},

		refresh_status: {
			name: 'Refresh device status',
			options: [targetOption(self)],
			callback: async (action) => {
				for (const ip of self.resolveTargets(action.options.target)) {
					self.client?.requestStatus(ip)
				}
			},
		},
	}
}
