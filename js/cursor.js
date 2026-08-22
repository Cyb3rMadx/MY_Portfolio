(() => {
	if (!matchMedia('(pointer:fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

	const core = document.createElement('div');
	const trail = document.createElement('div');
	core.className = 'cursor-glow';
	trail.className = 'cursor-smoke';
	core.setAttribute('aria-hidden', 'true');
	trail.setAttribute('aria-hidden', 'true');
	document.body.append(core, trail);
	document.body.classList.add('has-custom-cursor');

	const pointer = { targetX: 0, targetY: 0, x: 0, y: 0, velocityX: 0, velocityY: 0 };
	let active = false;
	let frame = 0;
	let lastSmoke = 0;
	let lastMove = 0;

	const spawnSmoke = (time) => {
		if (time - lastSmoke < 18 || trail.childElementCount >= 48) return;
		lastSmoke = time;
		const speed = Math.min(1, Math.hypot(pointer.velocityX, pointer.velocityY) / 36);
		const particleCount = speed > .35 ? 2 : 1;
		for (let index = 0; index < particleCount; index += 1) {
			const particle = document.createElement('span');
			const size = 10 + Math.random() * 20;
			particle.className = 'cursor-smoke__particle';
			particle.style.left = `${pointer.x - pointer.velocityX * index * .45}px`;
			particle.style.top = `${pointer.y - pointer.velocityY * index * .45}px`;
			particle.style.setProperty('--smoke-size', `${size}px`);
			particle.style.setProperty('--smoke-drift-x', `${-pointer.velocityX * (1.4 + Math.random() * 1.2) + (Math.random() - .5) * 34}px`);
			particle.style.setProperty('--smoke-drift-y', `${-pointer.velocityY * (1.4 + Math.random() * 1.2) - 18 - Math.random() * 28}px`);
			particle.style.setProperty('--smoke-duration', `${1.6 + Math.random() * .7}s`);
			trail.appendChild(particle);
			particle.addEventListener('animationend', () => particle.remove(), { once: true });
			setTimeout(() => particle.remove(), 2700);
		}
	};

	const animate = (time) => {
		frame = 0;
		if (time - lastMove > 140) active = false;
		pointer.x += (pointer.targetX - pointer.x) * .22;
		pointer.y += (pointer.targetY - pointer.y) * .22;
		core.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0)`;
		spawnSmoke(time);
		if (active && (Math.abs(pointer.targetX - pointer.x) > .2 || Math.abs(pointer.targetY - pointer.y) > .2)) {
			frame = requestAnimationFrame(animate);
		}
	};

	const move = event => {
		if (!pointer.targetX) pointer.x = event.clientX, pointer.y = event.clientY;
		pointer.velocityX = event.clientX - pointer.targetX;
		pointer.velocityY = event.clientY - pointer.targetY;
		pointer.targetX = event.clientX;
		pointer.targetY = event.clientY;
		lastMove = performance.now();
		active = true;
		core.classList.add('is-visible');
		if (!frame) frame = requestAnimationFrame(animate);
	};

	addEventListener('pointermove', move, { passive: true });
	addEventListener('pointerleave', () => {
		active = false;
		core.classList.remove('is-visible');
	});

	document.querySelectorAll('.magnetic').forEach(button => {
		button.addEventListener('pointermove', event => {
			const rect = button.getBoundingClientRect();
			button.style.transform = `translate(${(event.clientX - rect.left - rect.width / 2) * .08}px, ${(event.clientY - rect.top - rect.height / 2) * .08}px)`;
		});
		button.addEventListener('pointerleave', () => { button.style.transform = ''; });
	});
})();
