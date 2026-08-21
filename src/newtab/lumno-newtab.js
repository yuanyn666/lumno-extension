(function() {
  const target = new URL('newtab.html', window.location.href);
  target.search = window.location.search || '';
  target.searchParams.delete('focus');
  target.hash = window.location.hash || '';
  window.location.replace(target.href);
})();
