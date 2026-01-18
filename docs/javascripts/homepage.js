
/* Tag <html> with .is-home only on the homepage.
   Works with Material's instant navigation (document$). */
document$.subscribe(() => {
  const isHome = !!document.querySelector('meta[name="is-homepage"]')
              || !!document.getElementById('home-flag');
  document.documentElement.classList.toggle('is-home', isHome);
});
