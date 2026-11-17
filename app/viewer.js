// Opens a saved deck by its id (viewer.html#<id>) in a page of its own, so the deck's own script can run under this
// page's rules while the app itself keeps a strict policy.
(function () {
  var id = decodeURIComponent(location.hash.slice(1)), r = indexedDB.open('pitch-perfect', 1);
  r.onsuccess = function () { var t = r.result.transaction('kv', 'readonly').objectStore('kv').get('kit:' + id);
    t.onsuccess = function () { var k = t.result; document.open(); document.write(k && k.deck ? k.deck : '<p style="color:#fff;font:16px sans-serif;padding:20px">That deck is not on this device.</p>'); document.close(); }; };
})();
