(() => {
  const cards = document.querySelectorAll('.project-card, .tool-card, .interest-card');
  if (!cards.length) return;

  cards.forEach(card => {
    card.addEventListener('pointerenter', () => {
      card.style.transform = 'translateY(-6px) scale(1.01)';
      card.style.boxShadow = '0 18px 38px rgba(0, 0, 0, 0.18)';
      card.style.borderColor = 'var(--accent)';
    });

    card.addEventListener('pointerleave', () => {
      card.style.transform = '';
      card.style.boxShadow = '';
      card.style.borderColor = '';
    });
  });
})();
