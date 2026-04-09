const menuButton = document.querySelector('.menu-toggle');
const mainNav = document.querySelector('#main-nav');

if (menuButton && mainNav) {
  menuButton.addEventListener('click', () => {
    const isOpen = mainNav.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(isOpen));
  });

  mainNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      mainNav.classList.remove('open');
      menuButton.setAttribute('aria-expanded', 'false');
    });
  });
}

const yearNode = document.querySelector('#year');
if (yearNode) {
  yearNode.textContent = new Date().getFullYear();
}

const engineTrack = document.querySelector('#engine-track');
const enginePrev = document.querySelector('#engine-prev');
const engineNext = document.querySelector('#engine-next');

if (engineTrack && enginePrev && engineNext) {
  const slideBy = () => engineTrack.clientWidth * 0.9;

  enginePrev.addEventListener('click', () => {
    engineTrack.scrollBy({ left: -slideBy(), behavior: 'smooth' });
  });

  engineNext.addEventListener('click', () => {
    engineTrack.scrollBy({ left: slideBy(), behavior: 'smooth' });
  });
}
