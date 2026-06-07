import dgram from 'node:dgram'
import { EventEmitter } from 'node:events'

/**
 * Govee LAN (WLAN) API client.
 *
 * Protocol summary (see Govee "LAN Control" developer guide):
 *  - Discovery request: multicast UDP to 239.255.255.250:4001 with a "scan" command.
 *  - Device responses (scan + status): sent back to the multicast group, received on local UDP port 4002.
 *  - Control / status request: unicast UDP to <device-ip>:4003.
 *
 * "LAN Control" must be enabled per-device in the Govee Home app for any of this to work.
 */

export const GOVEE_MULTICAST_ADDR = '239.255.255.250'
export const GOVEE_SEND_SCAN_PORT = 4001 // we send scan requests here (multicast)
export const GOVEE_RECV_PORT = 4002 // devices reply here (we listen here)
export const GOVEE_CONTROL_PORT = 4003 // we send control/status here (unicast to device)

export class GoveeLanClient extends EventEmitter {
	constructor(options = {}) {
		super()
		/** Optional local interface address to bind/multicast on (multi-NIC machines). */
		this.interfaceAddress = options.interfaceAddress || undefined
		this.socket = null
		this.bound = false
	}

	/**
	 * Bind the receive socket and join the multicast group.
	 * Resolves once the socket is listening.
	 */
	start() {
		return new Promise((resolve, reject) => {
			if (this.socket) {
				resolve()
				return
			}

			const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true })
			this.socket = socket

			socket.on('error', (err) => {
				this.emit('error', err)
				if (!this.bound) {
					this.socket = null
					reject(err)
				}
			})

			socket.on('message', (msg, rinfo) => this._handleMessage(msg, rinfo))

			socket.on('listening', () => {
				this.bound = true
				try {
					socket.setBroadcast(true)
					socket.setMulticastTTL(128)
					if (this.interfaceAddress) {
						socket.setMulticastInterface(this.interfaceAddress)
					}
					socket.addMembership(GOVEE_MULTICAST_ADDR, this.interfaceAddress || undefined)
				} catch (err) {
					// Joining membership can fail on some interfaces; discovery may still work for
					// devices that unicast their reply. Surface as a non-fatal error.
					this.emit('error', err)
				}
				this.emit('ready')
				resolve()
			})

			// Bind to the receive port on all interfaces (or the chosen one) so we get device replies.
			socket.bind(GOVEE_RECV_PORT, this.interfaceAddress || undefined)
		})
	}

	/** Stop and clean up the socket. */
	stop() {
		if (this.socket) {
			try {
				this.socket.dropMembership(GOVEE_MULTICAST_ADDR, this.interfaceAddress || undefined)
			} catch {
				// ignore
			}
			try {
				this.socket.close()
			} catch {
				// ignore
			}
			this.socket = null
			this.bound = false
		}
	}

	/** Send a multicast scan request. Devices reply on GOVEE_RECV_PORT. */
	discover() {
		const payload = {
			msg: {
				cmd: 'scan',
				data: { account_topic: 'reserve' },
			},
		}
		this._sendRaw(payload, GOVEE_SEND_SCAN_PORT, GOVEE_MULTICAST_ADDR)
	}

	/** Power on/off. value: true/1 = on, false/0 = off. */
	setPower(ip, on) {
		return this._control(ip, 'turn', { value: on ? 1 : 0 })
	}

	/** Set brightness 0-100. */
	setBrightness(ip, value) {
		const v = clamp(Math.round(value), 0, 100)
		return this._control(ip, 'brightness', { value: v })
	}

	/** Set RGB color. r/g/b each 0-255. */
	setColor(ip, r, g, b) {
		return this._control(ip, 'colorwc', {
			color: { r: clamp(r, 0, 255), g: clamp(g, 0, 255), b: clamp(b, 0, 255) },
			colorTemInKelvin: 0,
		})
	}

	/** Set white color temperature in Kelvin (e.g. 2000-9000). */
	setColorTemperature(ip, kelvin) {
		return this._control(ip, 'colorwc', {
			color: { r: 0, g: 0, b: 0 },
			colorTemInKelvin: clamp(Math.round(kelvin), 2000, 9000),
		})
	}

	/** Request the current status of a device. Reply arrives on GOVEE_RECV_PORT. */
	requestStatus(ip) {
		return this._control(ip, 'devStatus', {})
	}

	_control(ip, cmd, data) {
		if (!ip) return false
		const payload = { msg: { cmd, data } }
		this._sendRaw(payload, GOVEE_CONTROL_PORT, ip)
		return true
	}

	_sendRaw(payloadObj, port, address) {
		if (!this.socket) {
			this.emit('error', new Error('Govee LAN socket is not started'))
			return
		}
		const buf = Buffer.from(JSON.stringify(payloadObj))
		this.socket.send(buf, 0, buf.length, port, address, (err) => {
			if (err) this.emit('error', err)
		})
	}

	_handleMessage(msg, rinfo) {
		let parsed
		try {
			parsed = JSON.parse(msg.toString('utf8'))
		} catch {
			return
		}
		const inner = parsed && parsed.msg
		if (!inner || !inner.cmd) return

		const data = inner.data || {}
		switch (inner.cmd) {
			case 'scan':
				// data: { ip, device, sku, bleVersionHard, bleVersionSoft, wifiVersionHard, wifiVersionSoft }
				this.emit('device', {
					ip: data.ip || rinfo.address,
					device: data.device,
					sku: data.sku,
					bleVersionHard: data.bleVersionHard,
					bleVersionSoft: data.bleVersionSoft,
					wifiVersionHard: data.wifiVersionHard,
					wifiVersionSoft: data.wifiVersionSoft,
				})
				break
			case 'devStatus':
				// data: { onOff, brightness, color:{r,g,b}, colorTemInKelvin }
				this.emit('status', {
					ip: rinfo.address,
					onOff: data.onOff,
					brightness: data.brightness,
					color: data.color,
					colorTemInKelvin: data.colorTemInKelvin,
				})
				break
			default:
				break
		}
	}
}

export function clamp(value, min, max) {
	const n = Number(value)
	if (Number.isNaN(n)) return min
	return Math.min(max, Math.max(min, n))
}
