// Adds a class to <body> ONLY when the homepage is loaded
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('is-home')) {
    document.body.classList.add('is-home');
  } else {
    document.body.classList.remove('is-home');
  }
});
