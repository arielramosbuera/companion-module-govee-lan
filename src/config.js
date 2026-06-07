export function getConfigFields() {
	return [
		{
			type: 'static-text',
			id: 'info',
			width: 12,
			label: 'Govee LAN Control',
			value:
				'This module controls Govee lights entirely on your local network using the Govee LAN (WLAN) API. ' +
				'There is no cloud connection and no API key required.<br />' +
				'<strong>You must enable "LAN Control" for each device in the Govee Home app</strong> ' +
				'(device settings → LAN Control). Companion and the lights must be on the same subnet.',
		},
		{
			type: 'checkbox',
			id: 'autoDiscover',
			label: 'Auto-discover devices',
			width: 6,
			default: true,
		},
		{
			type: 'number',
			id: 'discoverInterval',
			label: 'Re-discover interval (seconds, 0 = once at startup)',
			width: 6,
			default: 60,
			min: 0,
			max: 3600,
		},
		{
			type: 'checkbox',
			id: 'pollStatus',
			label: 'Poll device status',
			width: 6,
			default: true,
		},
		{
			type: 'number',
			id: 'pollInterval',
			label: 'Status poll interval (seconds)',
			width: 6,
			default: 5,
			min: 1,
			max: 600,
		},
		{
			type: 'textinput',
			id: 'manualDevices',
			label: 'Manual devices (one per line: "ip" or "ip,Friendly Name")',
			width: 12,
			default: '',
		},
		{
			type: 'textinput',
			id: 'interfaceAddress',
			label: 'Network interface IP (optional, for multi-NIC machines)',
			width: 12,
			default: '',
			regex: '/^$|^(\\d{1,3}\\.){3}\\d{1,3}$/',
		},
	]
}
