import { InstanceBase, InstanceStatus } from '@companion-module/base'
import { GoveeLanClient } from './govee.js'
import { getConfigFields } from './config.js'
import { getActionDefinitions } from './actions.js'
import { getFeedbackDefinitions } from './feedbacks.js'
import { getVariableDefinitions } from './variables.js'
import { getPresetDefinitions } from './presets.js'
import { varPrefix, rgbToHex } from './util.js'

export { UpgradeScripts } from './upgrades.js'

export default class GoveeLanInstance extends InstanceBase {
	constructor(internal) {
		super(internal)

		/** Known devices keyed by IP. */
		this.devices = new Map()
		this.client = null
		this.discoverTimer = null
		this.pollTimer = null
		this._statusRefreshTimers = new Map()
	}

	async init(config) {
		this.config = config || {}
		this.updateStatus(InstanceStatus.Connecting)

		try {
			await this.startClient()
		} catch (err) {
			this.log('error', `Failed to start Govee LAN listener: ${err.message}`)
			this.updateStatus(InstanceStatus.ConnectionFailure, err.message)
			return
		}

		this.applyManualDevices()
		this.rebuildDefinitions()
		this.startTimers()

		// Initial discovery + status pull.
		if (this.config.autoDiscover !== false) this.client.discover()
		this.requestAllStatus()

		this.updateStatus(InstanceStatus.Ok)
	}

	async destroy() {
		this.stopTimers()
		for (const t of this._statusRefreshTimers.values()) clearTimeout(t)
		this._statusRefreshTimers.clear()
		if (this.client) {
			this.client.stop()
			this.client.removeAllListeners()
			this.client = null
		}
	}

	async configUpdated(config) {
		this.config = config || {}
		// Restart the listener (interface address may have changed) and rebuild everything.
		this.stopTimers()
		if (this.client) {
			this.client.stop()
			this.client.removeAllListeners()
			this.client = null
		}

		// Drop manual entries; discovered ones will refresh. We keep nothing stale.
		this.devices.clear()

		this.updateStatus(InstanceStatus.Connecting)
		try {
			await this.startClient()
		} catch (err) {
			this.updateStatus(InstanceStatus.ConnectionFailure, err.message)
			return
		}

		this.applyManualDevices()
		this.rebuildDefinitions()
		this.startTimers()

		if (this.config.autoDiscover !== false) this.client.discover()
		this.requestAllStatus()
		this.updateStatus(InstanceStatus.Ok)
	}

	getConfigFields() {
		return getConfigFields()
	}

	// ---- LAN client setup ---------------------------------------------------

	async startClient() {
		const client = new GoveeLanClient({
			interfaceAddress: this.config.interfaceAddress || undefined,
		})

		client.on('error', (err) => {
			this.log('debug', `Govee LAN socket error: ${err.message}`)
		})
		client.on('device', (d) => this.onDeviceDiscovered(d))
		client.on('status', (s) => this.onDeviceStatus(s))

		this.client = client
		await client.start()
	}

	startTimers() {
		const discoverInterval = Number(this.config.discoverInterval ?? 60)
		if (this.config.autoDiscover !== false && discoverInterval > 0) {
			this.discoverTimer = setInterval(() => {
				if (this.client) this.client.discover()
			}, discoverInterval * 1000)
		}

		if (this.config.pollStatus !== false) {
			const pollInterval = Math.max(1, Number(this.config.pollInterval ?? 5))
			this.pollTimer = setInterval(() => this.requestAllStatus(), pollInterval * 1000)
		}
	}

	stopTimers() {
		if (this.discoverTimer) {
			clearInterval(this.discoverTimer)
			this.discoverTimer = null
		}
		if (this.pollTimer) {
			clearInterval(this.pollTimer)
			this.pollTimer = null
		}
	}

	// ---- Device registry ----------------------------------------------------

	applyManualDevices() {
		const raw = (this.config.manualDevices || '').trim()
		if (!raw) return
		for (const line of raw.split(/\s*[;\r\n]+\s*/)) {
			const trimmed = line.trim()
			if (!trimmed) continue
			const [ipPart, ...nameParts] = trimmed.split(',')
			const ip = ipPart.trim()
			if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
				this.log('warn', `Ignoring invalid manual device line: "${trimmed}"`)
				continue
			}
			const name = nameParts.join(',').trim()
			const existing = this.devices.get(ip) || {}
			this.devices.set(ip, {
				ip,
				mac: existing.mac,
				sku: existing.sku,
				name: name || existing.name || ip,
				source: 'manual',
				onOff: existing.onOff,
				brightness: existing.brightness,
				color: existing.color,
				colorTemInKelvin: existing.colorTemInKelvin,
				lastSeen: existing.lastSeen,
			})
		}
	}

	onDeviceDiscovered(d) {
		if (!d.ip) return
		const existing = this.devices.get(d.ip) || {}
		const isNew = !this.devices.has(d.ip)
		this.devices.set(d.ip, {
			ip: d.ip,
			mac: d.device || existing.mac,
			sku: d.sku || existing.sku,
			name: existing.name && existing.source === 'manual' ? existing.name : existing.name || d.sku || d.ip,
			source: existing.source === 'manual' ? 'manual' : 'discovered',
			onOff: existing.onOff,
			brightness: existing.brightness,
			color: existing.color,
			colorTemInKelvin: existing.colorTemInKelvin,
			lastSeen: Date.now(),
		})

		if (isNew) {
			this.log('info', `Discovered Govee device ${d.sku || ''} at ${d.ip} (${d.device || 'unknown MAC'})`)
			this.rebuildDefinitions()
			// Pull status for the newly found device.
			this.client?.requestStatus(d.ip)
		} else {
			this.updateAllVariables()
		}
	}

	onDeviceStatus(s) {
		const dev = this.devices.get(s.ip)
		if (!dev) {
			// A status from an unknown IP (e.g. broadcast) - register it lightly.
			this.devices.set(s.ip, {
				ip: s.ip,
				name: s.ip,
				source: 'discovered',
				onOff: s.onOff,
				brightness: s.brightness,
				color: s.color,
				colorTemInKelvin: s.colorTemInKelvin,
				lastSeen: Date.now(),
			})
			this.rebuildDefinitions()
			return
		}
		dev.onOff = s.onOff
		dev.brightness = s.brightness
		dev.color = s.color
		dev.colorTemInKelvin = s.colorTemInKelvin
		dev.lastSeen = Date.now()
		this.updateAllVariables()
		this.checkFeedbacks('devicePower', 'deviceColor')
	}

	requestAllStatus() {
		if (!this.client) return
		for (const ip of this.devices.keys()) {
			this.client.requestStatus(ip)
		}
	}

	/** After a control command, pull fresh status shortly so feedback/variables update. */
	scheduleStatus(ip, delay = 400) {
		if (!ip || !this.client) return
		const prev = this._statusRefreshTimers.get(ip)
		if (prev) clearTimeout(prev)
		const t = setTimeout(() => {
			this._statusRefreshTimers.delete(ip)
			if (this.client) this.client.requestStatus(ip)
		}, delay)
		this._statusRefreshTimers.set(ip, t)
	}

	/** Resolve an action's target option to a list of IPs. 'all' expands to every known device. */
	resolveTargets(target) {
		if (!target || target === 'all') return [...this.devices.keys()]
		return [String(target).trim()]
	}

	// ---- Definitions --------------------------------------------------------

	rebuildDefinitions() {
		this.setActionDefinitions(getActionDefinitions(this))
		this.setFeedbackDefinitions(getFeedbackDefinitions(this))
		const { structure, presets } = getPresetDefinitions(this)
		this.setPresetDefinitions(structure, presets)
		this.setVariableDefinitions(getVariableDefinitions(this))
		this.updateAllVariables()
		this.checkFeedbacks('devicePower', 'deviceColor')
	}

	updateAllVariables() {
		const values = {}
		values.device_count = this.devices.size
		for (const dev of this.devices.values()) {
			const p = varPrefix(dev.ip)
			values[`${p}_name`] = dev.name || dev.ip
			values[`${p}_ip`] = dev.ip
			values[`${p}_sku`] = dev.sku || ''
			values[`${p}_mac`] = dev.mac || ''
			values[`${p}_power`] = dev.onOff === 1 ? 'on' : dev.onOff === 0 ? 'off' : 'unknown'
			values[`${p}_brightness`] = dev.brightness ?? ''
			values[`${p}_color_temp`] = dev.colorTemInKelvin ?? ''
			if (dev.color) {
				values[`${p}_color_r`] = dev.color.r ?? ''
				values[`${p}_color_g`] = dev.color.g ?? ''
				values[`${p}_color_b`] = dev.color.b ?? ''
				values[`${p}_color_hex`] = rgbToHex(dev.color)
			} else {
				values[`${p}_color_r`] = ''
				values[`${p}_color_g`] = ''
				values[`${p}_color_b`] = ''
				values[`${p}_color_hex`] = ''
			}
		}
		this.setVariableValues(values)
	}

	/** Build dropdown choices for target selection. */
	deviceChoices(includeAll = true) {
		const choices = []
		if (includeAll) choices.push({ id: 'all', label: 'All devices' })
		for (const dev of this.devices.values()) {
			choices.push({ id: dev.ip, label: `${dev.name || dev.ip} (${dev.ip})` })
		}
		if (choices.length === (includeAll ? 1 : 0)) {
			choices.push({ id: '', label: '(no devices found yet)' })
		}
		return choices
	}
}
