// Opens a saved deck by its id (viewer.html#<id>). The deck's own script never runs in this page: this page reads the
// deck from the device and hands it to a sandboxed frame with an opaque origin (viewer.html?frame), so a deck cannot
// read the app's storage (the research key lives there) even if its words came from a hostile website.
(function () {
  if (location.search === '?frame') {
    addEventListener('message', function once(e) {
      if (e.source !== parent || !e.data || typeof e.data.deck !== 'string') return;
      removeEventListener('message', once); document.open(); document.write(e.data.deck); document.close();
    });
    parent.postMessage({ ready: 1 }, '*');
    return;
  }
  var id = decodeURIComponent(location.hash.slice(1)), r = indexedDB.open('pitch-perfect', 1);
  var fail = function () { document.body.innerHTML = '<p style="color:#fff;font:16px sans-serif;padding:20px">That deck is not on this device.</p>'; };
  r.onerror = fail;
  r.onsuccess = function () {
    var t = r.result.transaction('kv', 'readonly').objectStore('kv').get('kit:' + id);
    t.onerror = fail;
    t.onsuccess = function () {
      var k = t.result; if (!k || !k.deck) return fail();
      var f = document.createElement('iframe');
      f.setAttribute('sandbox', 'allow-scripts'); f.setAttribute('allow', 'fullscreen'); f.title = 'Deck';
      f.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0';
      f.src = 'viewer.html?frame';
      addEventListener('message', function (e) {
        if (e.source === f.contentWindow && e.data && e.data.ready) f.contentWindow.postMessage({ deck: k.deck }, '*');
        else if (e.source === f.contentWindow && e.data && e.data.go) { /* deck navigation; nothing to sync here */ }
        else if (e.source === parent && parent !== window) f.contentWindow.postMessage(e.data, '*'); // the app driving the deck
      });
      if (document.body) document.body.appendChild(f); else addEventListener('DOMContentLoaded', function () { document.body.appendChild(f); });
    };
  };
})();
