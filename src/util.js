/** Build a Companion-safe variable prefix from a device IP (e.g. 192.168.1.23 -> dev_192_168_1_23). */
export function varPrefix(ip) {
	return 'dev_' + String(ip).replace(/[^a-zA-Z0-9]/g, '_')
}

export function clampByte(n) {
	const v = Number(n)
	if (Number.isNaN(v)) return 0
	return Math.min(255, Math.max(0, Math.round(v)))
}

export function rgbToHex(color) {
	if (!color) return ''
	const h = (n) => clampByte(n).toString(16).padStart(2, '0')
	return `#${h(color.r)}${h(color.g)}${h(color.b)}`
}
