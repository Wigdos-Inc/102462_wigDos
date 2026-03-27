export function createInput(canvas) {
	const keys = new Set();
	const cameraControl = {
		yaw: Math.PI,
		pitch: 0.42,
		distance: 13,
		dragging: false,
		lastX: 0,
		lastY: 0
	};

	const movementKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'];
	const interactionKeys = ['e', 'E'];
	const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

	window.addEventListener('keydown', (e) => {
		if (movementKeys.includes(e.key) || interactionKeys.includes(e.key) || e.key === 'Escape') {
			e.preventDefault();
		}
		keys.add(e.key);
	});

	window.addEventListener('keyup', (e) => {
		keys.delete(e.key);
	});

	canvas.addEventListener('mousedown', (e) => {
		cameraControl.dragging = true;
		cameraControl.lastX = e.clientX;
		cameraControl.lastY = e.clientY;
	});

	window.addEventListener('mouseup', () => {
		cameraControl.dragging = false;
	});

	window.addEventListener('mousemove', (e) => {
		if (!cameraControl.dragging) return;
		const dx = e.clientX - cameraControl.lastX;
		const dy = e.clientY - cameraControl.lastY;
		cameraControl.lastX = e.clientX;
		cameraControl.lastY = e.clientY;
		cameraControl.yaw -= dx * 0.008;
		cameraControl.pitch = Math.min(0.92, Math.max(0.14, cameraControl.pitch - dy * 0.006));
	});

	canvas.addEventListener('wheel', (e) => {
		e.preventDefault();
		cameraControl.distance = Math.min(22, Math.max(8, cameraControl.distance + e.deltaY * 0.01));
	}, { passive: false });

	document.querySelectorAll('.pad[data-k]').forEach((pad) => {
		const key = pad.getAttribute('data-k');
		['pointerdown', 'pointerenter'].forEach((eventName) => {
			pad.addEventListener(eventName, (e) => {
				if (e.buttons === 0 && eventName === 'pointerenter') return;
				keys.add(key);
				pad.style.filter = 'brightness(1.3)';
			});
		});
		['pointerup', 'pointercancel', 'pointerleave'].forEach((eventName) => {
			pad.addEventListener(eventName, () => {
				keys.delete(key);
				pad.style.filter = 'none';
			});
		});
	});

	function consumeEscape() {
		if (!keys.has('Escape')) return false;
		keys.delete('Escape');
		return true;
	}

	function movementVector() {
		let x = 0;
		let z = 0;
		if (keys.has('ArrowLeft')) x -= 1;
		if (keys.has('ArrowRight')) x += 1;
		if (keys.has('a') || keys.has('A')) x += 1;
		if (keys.has('d') || keys.has('D')) x -= 1;
		if (keys.has('ArrowUp') || keys.has('w') || keys.has('W')) z += 1;
		if (keys.has('ArrowDown') || keys.has('s') || keys.has('S')) z -= 1;
		return { x, z };
	}

	function wantsInteract() {
		return keys.has('e') || keys.has('E') || isTouch;
	}

	function clearMovement() {
		['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].forEach((k) => keys.delete(k));
	}

	return {
		cameraControl,
		isTouch,
		movementVector,
		wantsInteract,
		consumeEscape,
		clearMovement
	};
}
