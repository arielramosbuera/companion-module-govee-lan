import { combineRgb } from '@companion-module/base'

function deviceOption(self) {
	return {
		type: 'dropdown',
		id: 'target',
		label: 'Device',
		default: self.devices.values().next().value?.ip ?? '',
		choices: self.deviceChoices(false),
		allowCustom: true,
		tooltip: 'Pick a discovered device or type a device IP address.',
	}
}

export function getFeedbackDefinitions(self) {
	return {
		devicePower: {
			type: 'boolean',
			name: 'Device is powered on',
			description: 'Change button style when the selected device is on',
			defaultStyle: {
				bgcolor: combineRgb(0, 153, 0),
				color: combineRgb(255, 255, 255),
			},
			options: [deviceOption(self)],
			callback: (feedback) => {
				const dev = self.devices.get(String(feedback.options.target).trim())
				return dev?.onOff === 1
			},
		},

		deviceColor: {
			type: 'advanced',
			name: "Match button background to device's color",
			description: "Set the button background to the device's current RGB color",
			options: [deviceOption(self)],
			callback: (feedback) => {
				const dev = self.devices.get(String(feedback.options.target).trim())
				if (!dev || !dev.color) return {}
				const r = clampByte(dev.color.r)
				const g = clampByte(dev.color.g)
				const b = clampByte(dev.color.b)
				const luminance = 0.299 * r + 0.587 * g + 0.114 * b
				return {
					bgcolor: combineRgb(r, g, b),
					color: luminance > 140 ? combineRgb(0, 0, 0) : combineRgb(255, 255, 255),
				}
			},
		},
	}
}

function clampByte(n) {
	const v = Number(n)
	if (Number.isNaN(v)) return 0
	return Math.min(255, Math.max(0, Math.round(v)))
}
