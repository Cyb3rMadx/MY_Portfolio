(() => {
  const targets = document.querySelectorAll('.hero__title, .section-title');
  if (!targets.length || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  targets.forEach(target => {
    const text = target.textContent.trim();
    target.setAttribute('aria-label', text);
    target.textContent = '';
    let index = 0;
    text.split(/(\s+)/).forEach(token => {
      if (/\s+/.test(token)) {
        const space = document.createElement('span');
        space.className = 'text-depth__space';
        space.textContent = '\u00a0';
        target.appendChild(space);
        return;
      }
      const word = document.createElement('span');
      word.className = 'text-depth__word';
      [...token].forEach(character => {
        const span = document.createElement('span');
        span.className = 'text-depth__char';
        span.textContent = character;
        span.style.setProperty('--char-index', index);
        word.appendChild(span);
        index += 1;
      });
      target.appendChild(word);
    });

    target.addEventListener('pointermove', event => {
      const rect = target.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - .5;
      const y = (event.clientY - rect.top) / rect.height - .5;
      target.style.setProperty('--text-rotate-x', `${y * -5}deg`);
      target.style.setProperty('--text-rotate-y', `${x * 7}deg`);
      target.style.setProperty('--text-shift-x', `${x * 8}px`);
      target.style.setProperty('--text-shift-y', `${y * 5}px`);
    }, { passive: true });

    target.addEventListener('pointerleave', () => {
      target.style.setProperty('--text-rotate-x', '0deg');
      target.style.setProperty('--text-rotate-y', '0deg');
      target.style.setProperty('--text-shift-x', '0px');
      target.style.setProperty('--text-shift-y', '0px');
    });
  });
})();
