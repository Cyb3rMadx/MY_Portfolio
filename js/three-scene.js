(() => {
	const canvas = document.getElementById('hero-canvas');
	if (!canvas || !window.THREE) return;
	let renderer;
	try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true }); }
	catch (error) { canvas.setAttribute('aria-label', '3D hero visual unavailable in this browser'); return; }

	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera(42, 1, .1, 100);
	camera.position.z = 4.8;
	renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));

	const group = new THREE.Group();
	const core = new THREE.Mesh(
		new THREE.IcosahedronGeometry(1.1, 2),
		new THREE.MeshBasicMaterial({ color: 0x65e6c2, wireframe: true, transparent: true, opacity: .72 })
	);
	const innerCore = new THREE.Mesh(
		new THREE.IcosahedronGeometry(.72, 1),
		new THREE.MeshBasicMaterial({ color: 0xf2b86b, wireframe: true, transparent: true, opacity: .32 })
	);
	const ring = new THREE.Mesh(
		new THREE.TorusGeometry(1.55, .012, 8, 100),
		new THREE.MeshBasicMaterial({ color: 0xf2b86b, transparent: true, opacity: .65 })
	);
	const ringTwo = new THREE.Mesh(
		new THREE.TorusGeometry(1.9, .008, 8, 100),
		new THREE.MeshBasicMaterial({ color: 0x65e6c2, transparent: true, opacity: .38 })
	);
	ring.rotation.x = .8;
	ringTwo.rotation.y = 1.1;
	group.add(core, innerCore, ring, ringTwo);

	const particleGeometry = new THREE.BufferGeometry();
	const particlePositions = new Float32Array(420 * 3);
	for (let index = 0; index < particlePositions.length; index += 3) {
		const radius = 2.2 + Math.random() * 1.2;
		const angle = Math.random() * Math.PI * 2;
		particlePositions[index] = Math.cos(angle) * radius;
		particlePositions[index + 1] = (Math.random() - .5) * 3.2;
		particlePositions[index + 2] = Math.sin(angle) * radius;
	}
	particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
	const particles = new THREE.Points(
		particleGeometry,
		new THREE.PointsMaterial({ color: 0x65e6c2, size: .018, transparent: true, opacity: .65 })
	);
	scene.add(group, particles);

	const pointer = { x: 0, y: 0 };
	const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
	let active = true;
	let animationFrame = 0;
	addEventListener('pointermove', event => {
		pointer.x = (event.clientX / innerWidth - .5) * .25;
		pointer.y = (event.clientY / innerHeight - .5) * .18;
	}, { passive: true });
	const resize = () => {
		const rect = canvas.getBoundingClientRect();
		renderer.setSize(rect.width, rect.height, false);
		canvas.width = Math.max(1, Math.floor(rect.width * renderer.getPixelRatio()));
		canvas.height = Math.max(1, Math.floor(rect.height * renderer.getPixelRatio()));
		camera.aspect = rect.width / rect.height;
		camera.updateProjectionMatrix();
	};
	addEventListener('resize', resize);
	resize();
	const wake = () => {
		if (!animationFrame && active && !document.hidden) animationFrame = requestAnimationFrame(animate);
	};
	const observer = new IntersectionObserver(entries => {
		active = entries[0].isIntersecting;
		wake();
	});
	observer.observe(canvas);
	document.addEventListener('visibilitychange', wake);
	const animate = () => {
		animationFrame = 0;
		if (!active || document.hidden) return;
		if (!reduce) {
			group.rotation.y += .002;
			group.rotation.x += .001;
			ring.rotation.z -= .003;
			ringTwo.rotation.x += .002;
			particles.rotation.y -= .0005;
			group.rotation.y += (pointer.x - group.rotation.y) * .0008;
			group.rotation.x += (pointer.y - group.rotation.x) * .0008;
		}
		renderer.render(scene, camera);
		if (!reduce) animationFrame = requestAnimationFrame(animate);
	};
	wake();
})();
