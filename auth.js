// Shared auth helpers. Prefers Firebase (compat) when initialized, falls back to localStorage demo auth.
console.info('safepet: auth.js loaded (build: 1) — ' + new Date().toISOString());
function getUser(){
  try{
    if(window.firebase && firebase.auth){
      const u = firebase.auth().currentUser;
      if(u) return { email: u.email, name: u.displayName || u.email.split('@')[0], uid: u.uid, provider: 'firebase' };
    }
  }catch(e){}
  try{ return JSON.parse(localStorage.getItem('safepet_user')||'null'); }catch(e){return null;} }

function isLoggedIn(){ return !!getUser(); }

function signOut(){
  if(window.firebase && firebase.auth){ try{ firebase.auth().signOut(); }catch(e){} }
  try{ localStorage.removeItem('safepet_user'); }catch(e){}
  if(typeof renderAccount === 'function') renderAccount();
}

function onAuthStateChanged(cb){
  if(window.firebase && firebase.auth){ try{ firebase.auth().onAuthStateChanged(()=>{ if(typeof cb==='function') cb(getUser()); if(typeof renderAccount==='function') renderAccount(); }); return; }catch(e){}
  }
  if(typeof cb==='function') cb(getUser());
}

// Notify initial state
if(typeof renderAccount==='function') renderAccount();
onAuthStateChanged();

// Lightweight in-page notifier for JS errors (helps debugging when serving files directly)
function showErrorBanner(msg){
  try{
    let b = document.getElementById('jsErrorBanner');
    if(!b){ b = document.createElement('div'); b.id='jsErrorBanner'; b.style.position='fixed'; b.style.right='16px'; b.style.bottom='16px'; b.style.background='rgba(255,80,80,0.95)'; b.style.color='#fff'; b.style.padding='10px 14px'; b.style.borderRadius='8px'; b.style.boxShadow='0 8px 30px rgba(0,0,0,0.2)'; b.style.zIndex=99999; b.style.fontSize='13px'; b.style.maxWidth='320px'; b.style.cursor='pointer'; b.title='Click para cerrar'; b.addEventListener('click',()=>b.remove()); document.body.appendChild(b); }
    b.textContent = msg;
  }catch(e){ console.error('showErrorBanner failed', e); }
}

// Minimal toast notice used across pages (non-blocking)
function showNotice(message, actionText, actionHref){
  try{
    let n = document.getElementById('safepet_notice');
    if(!n){ n = document.createElement('div'); n.id = 'safepet_notice'; n.style.position = 'fixed'; n.style.left = '50%'; n.style.transform = 'translateX(-50%)'; n.style.bottom = '18px'; n.style.background = 'rgba(32,48,64,0.95)'; n.style.color = '#fff'; n.style.padding = '10px 14px'; n.style.borderRadius = '8px'; n.style.boxShadow = '0 8px 30px rgba(0,0,0,0.15)'; n.style.zIndex = 99998; n.style.fontSize = '14px'; n.style.display='flex'; n.style.gap='10px'; n.style.alignItems='center'; document.body.appendChild(n); }
    n.innerHTML = '';
    const span = document.createElement('span'); span.textContent = message; n.appendChild(span);
    if(actionText && actionHref){ const a = document.createElement('a'); a.textContent = actionText; a.style.color='#0fb4a8'; a.style.fontWeight='700'; a.style.marginLeft='8px'; a.style.textDecoration='none';
      // If the action is the login page, prefer opening the shared login modal when available
      try{
        if(String(actionHref || '').includes('cuenta.html') && typeof window.openLoginModal === 'function'){
          a.href = '#';
          a.addEventListener('click', function(e){ e && e.preventDefault(); window.openLoginModal(); });
        } else {
          a.href = actionHref;
        }
      }catch(e){ a.href = actionHref; }
      n.appendChild(a); }
    // Auto-dismiss after 5s (slightly longer so users notice it)
    n.style.opacity = '1';
    clearTimeout(n._timeout);
    n._timeout = setTimeout(()=>{ try{ n.style.transition='opacity .25s'; n.style.opacity='0'; setTimeout(()=>{ if(n && n.parentNode) n.parentNode.removeChild(n); }, 260); }catch(e){} }, 5000);
    console.debug('showNotice:', message);
    return true;
  }catch(e){ console.error('showNotice failed', e); return false; }
}

// Small persistent guest banner used inside quantity modal to inform user they're buying as guest
function showGuestNotice(message, durationMs){
  try{
    let b = document.getElementById('safepet_guest_banner');
    if(!b){ b = document.createElement('div'); b.id = 'safepet_guest_banner'; b.style.position = 'fixed'; b.style.left = '50%'; b.style.transform = 'translateX(-50%)'; b.style.top = '18px'; b.style.background = 'linear-gradient(90deg,#fff7e6,#fff1d9)'; b.style.color = '#333'; b.style.padding = '10px 14px'; b.style.borderRadius = '8px'; b.style.boxShadow = '0 8px 30px rgba(0,0,0,0.08)'; b.style.zIndex = 99999; b.style.fontSize = '14px'; document.body.appendChild(b); }
    b.textContent = message; b.style.opacity = '1'; clearTimeout(b._timeout); b._timeout = setTimeout(()=>{ try{ b.style.transition='opacity .25s'; b.style.opacity='0'; setTimeout(()=>{ if(b && b.parentNode) b.parentNode.removeChild(b); }, 260); }catch(e){} }, durationMs || 4500);
    return true;
  }catch(e){ console.error('showGuestNotice failed', e); return false; }
}

window.addEventListener('error', function(ev){ console.error('Global error', ev.error||ev.message); showErrorBanner(String(ev.error?.message||ev.message||'Error JS')); });
// Catch unhandled Promise rejections and show a nicer error banner for debugging
window.addEventListener('unhandledrejection', function(ev){
  try{
    console.groupCollapsed('Unhandled promise rejection');
    console.error('Reason (raw):', ev.reason);
    try{ console.dir(ev.reason); }catch(e){}
    if(ev.reason && ev.reason.stack) console.error(ev.reason.stack);
    var msg = (ev.reason && ev.reason.message) ? ev.reason.message : (typeof ev.reason === 'string' ? ev.reason : JSON.stringify(ev.reason));
    try{ showErrorBanner('Error: ' + msg); }catch(e){}

    var reason = ev.reason || {};
    var code = reason.code || (reason.data && reason.data.code) || reason.httpStatus || reason.status;
    var isPermission = (code === 403) || (String(msg||'').toLowerCase().includes('permission'));
    var logged = false; try{ logged = (typeof isLoggedIn === 'function') ? !!isLoggedIn() : false; }catch(e){ logged = false; }
    if(isPermission && !logged){
      try{ if(typeof ensureForceLoginModal === 'function') ensureForceLoginModal(); }catch(e){}
      try{
        if(typeof window.openForceLoginModal === 'function') window.openForceLoginModal();
        else if(typeof window.openLoginModal === 'function') window.openLoginModal();
        else if(typeof promptLoginIfGuest === 'function') promptLoginIfGuest();
        else showNotice('Necesitas iniciar sesión para continuar', 'Iniciar sesión', 'cuenta.html');
      }catch(e){ console.error('opening login modal from unhandledrejection failed', e); }
      try{ console.info('safepet: unhandledrejection - handled permission error by opening modal'); ev && ev.preventDefault && ev.preventDefault(); }catch(e){}
    }

    console.groupEnd();
  }catch(e){ console.error('unhandledrejection handler failed', e); }
});

// Global capture-phase click handler: ensure clicks on #checkoutBtn open the login modal for guests (protects against external scripts)
(function(){
  if(window.__safepet_force_checkout_installed) return;
  window.__safepet_force_checkout_installed = true;
  try{
    document.addEventListener('click', function(e){
      try{
        const btn = e.target && e.target.closest && e.target.closest('#checkoutBtn');
        if(!btn) return;
        // Determine login state; assume guest if check missing
        let logged = false;
        try{ logged = (typeof isLoggedIn === 'function') ? !!isLoggedIn() : false; }catch(ex){ logged = false; }
        console.warn('safepet: captured click on #checkoutBtn, logged=', logged);
        if(!logged){
          try{ e.preventDefault && e.preventDefault(); e.stopImmediatePropagation && e.stopImmediatePropagation(); }catch(er){}
          try{
            if(typeof ensureForceLoginModal === 'function') try{ ensureForceLoginModal(); }catch(e){}
            // prefer force modal -> regular modal -> prompt helper -> notice
            if(typeof window.openForceLoginModal === 'function'){
              window.openForceLoginModal();
            } else if(typeof window.openLoginModal === 'function'){
              window.openLoginModal();
            } else if(typeof promptLoginIfGuest === 'function'){
              promptLoginIfGuest();
            } else {
              showNotice('Necesitas iniciar sesión para continuar', 'Iniciar sesión', 'cuenta.html');
            }
          }catch(err){ console.error('safe open modal failed', err); showErrorBanner('Error mostrando el modal de inicio de sesión'); }
        }
      }catch(e){ console.error('global force-checkout handler error', e); }
    }, true);
  }catch(e){ console.error('installing global force-checkout failed', e); }
})();

// Wrap global fetch to proactively detect 403 permission responses and open login modal for guests
(function(){
  if(window.__safepet_fetch_wrapped) return;
  window.__safepet_fetch_wrapped = true;
  try{
    const _fetch = window.fetch;
    if(typeof _fetch !== 'function') return;
    window.fetch = async function(...args){
      try{
        const resp = await _fetch.apply(this, args);
        if(resp && typeof resp.status === 'number' && resp.status === 403){
          console.warn('safepet: fetch returned 403, opening login modal for guest', args[0]);
          try{
            if(typeof isLoggedIn === 'function' && !isLoggedIn()){
              if(typeof ensureForceLoginModal === 'function') try{ ensureForceLoginModal(); }catch(e){}
              if(typeof window.openForceLoginModal === 'function'){ window.openForceLoginModal(); }
              else if(typeof window.openLoginModal === 'function'){ window.openLoginModal(); }
              else if(typeof promptLoginIfGuest === 'function'){ promptLoginIfGuest(); }
              else { try{ showNotice('Necesitas iniciar sesión para continuar', 'Iniciar sesión', 'cuenta.html'); }catch(e){ console.warn('safepet: notice failed on fetch 403', e); showErrorBanner('Necesitas iniciar sesión para continuar'); } }
            }
          }catch(e){ console.error('fetch-403 open modal failed', e); }
        }
        return resp;
      }catch(err){
        try{
          const code = err && (err.code || err.status || (err.data && err.data.code) || err.httpStatus);
          const msg = err && err.message;
          const looksPermission = (code === 403) || (String(msg||'').toLowerCase().includes('permission'));
          if(looksPermission && typeof isLoggedIn === 'function' && !isLoggedIn()){
            console.warn('safepet: fetch threw permission error, opening login modal', err);
            try{
              if(typeof ensureForceLoginModal === 'function') try{ ensureForceLoginModal(); }catch(e){}
              if(typeof window.openForceLoginModal === 'function'){ window.openForceLoginModal(); }
              else if(typeof window.openLoginModal === 'function'){ window.openLoginModal(); }
              else if(typeof promptLoginIfGuest === 'function'){ promptLoginIfGuest(); }
              else { try{ showNotice('Necesitas iniciar sesión para continuar', 'Iniciar sesión', 'cuenta.html'); }catch(e){ console.warn('safepet: notice failed on fetch error', e); showErrorBanner('Necesitas iniciar sesión para continuar'); } }
            }catch(e){ console.error('fetch wrapper open modal failed', e); }
          }
        }catch(e){}
        throw err;
      }
    };
  }catch(e){ console.error('safepet fetch wrapper failed', e); }
})();

// Favorites & Search utilities (global helpers)
function loadFavs(){ try{ return JSON.parse(localStorage.getItem('safepet_favs')||'[]'); }catch(e){return [];} }
function saveFavs(list){ try{ localStorage.setItem('safepet_favs', JSON.stringify(list)); }catch(e){} }
function isFav(name){ return loadFavs().some(f=>f.name===name); }
function toggleFav(product){ const list=loadFavs(); const idx=list.findIndex(f=>f.name===product.name); if(idx>-1){ list.splice(idx,1); saveFavs(list); showNotice(`${product.name} eliminado de favoritos`); } else { list.push({ name:product.name, image:product.image||'' }); saveFavs(list); showNotice(`${product.name} añadido a favoritos`); } updateFavButtons(); }
function updateFavButtons(){ const list = loadFavs(); document.querySelectorAll('.fav-btn').forEach(btn=>{ const name=btn.getAttribute('data-product'); const fav=list.some(f=>f.name===name); btn.textContent = fav ? '♥' : '♡'; btn.setAttribute('aria-pressed', fav ? 'true' : 'false'); }); const favBtn = document.getElementById('favoritesBtn'); if(favBtn){ favBtn.title = `Favoritos (${list.length})`; } }
// Ensure a small numeric badge is shown next to favorites button
function ensureFavoritesBadge(){ const favBtn = document.getElementById('favoritesBtn'); if(!favBtn) return null; let b = favBtn.querySelector('.favorites-badge'); if(!b){ b = document.createElement('span'); b.className = 'favorites-badge'; b.style.display = 'inline-block'; b.style.minWidth = '18px'; b.style.height = '18px'; b.style.padding = '0 6px'; b.style.fontSize = '12px'; b.style.lineHeight = '18px'; b.style.borderRadius = '999px'; b.style.background = 'var(--turquoise)'; b.style.color = '#fff'; b.style.marginLeft = '6px'; b.style.verticalAlign = 'middle'; b.style.fontWeight = '700'; b.textContent = '0'; favBtn.appendChild(b); }
  return b;
}

// update badge when favorites change
const _origUpdateFavButtons = updateFavButtons;
updateFavButtons = function(){ try{ _origUpdateFavButtons(); const b = ensureFavoritesBadge(); const n = loadFavs().length; if(b){ b.textContent = String(n); b.style.display = n>0 ? 'inline-block' : 'none'; } }catch(e){ console.error('updateFavButtons failed', e); } };
function attachFavoriteButtons(){
  document.querySelectorAll('.card, .product-card').forEach(card=>{
    // don't add if already present
    if(card.querySelector('.fav-btn')) return;
    // Add fav button to any product card that has a visible product name or explicit data-product
    const nameEl = (card.querySelector('h3')||card.querySelector('h4'));
    const name = nameEl ? nameEl.textContent.trim() : (card.getAttribute('data-product') || '');
    if(!name) return; // nothing meaningful to favorite
    const imgEl = card.querySelector('img');
    const img = imgEl ? imgEl.getAttribute('src') : '';

    card.style.position = card.style.position || 'relative';
    const btn = document.createElement('button');
    btn.className = 'fav-btn';
    btn.title = 'Agregar a favoritos';
    btn.setAttribute('data-product', name);
    btn.setAttribute('data-image', img);
    btn.style.position = 'absolute';
    btn.style.right = '12px';
    btn.style.top = '12px';
    btn.style.padding = '8px 10px';
    btn.style.borderRadius = '10px';
    btn.style.border = 'none';
    btn.style.background = 'rgba(255,255,255,0.95)';
    btn.style.cursor = 'pointer';
    btn.style.fontSize = '18px';
    btn.style.zIndex = '40';
    btn.style.color = 'var(--turquoise)';
    // initial visible heart state
    btn.textContent = isFav(name) ? '♥' : '♡';
    btn.setAttribute('aria-pressed', isFav(name) ? 'true' : 'false');

    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      toggleFav({ name, image: img });
      // reflect UI immediately
      btn.textContent = isFav(name) ? '♥' : '♡';
      btn.setAttribute('aria-pressed', isFav(name) ? 'true' : 'false');
      btn.classList.add('fav-anim'); setTimeout(()=>btn.classList.remove('fav-anim'), 420);
      // show a small notice for guests so they know it's saved locally
      try{ if(!isLoggedIn()){ showNotice('Favorito guardado localmente. Inicia sesión para sincronizar.'); } }catch(e){}
    });

    card.appendChild(btn);
  });

  // tiny animation + base styles
  if(!document.getElementById('fav-anim-styles')){
    const s = document.createElement('style'); s.id = 'fav-anim-styles'; s.textContent = '.fav-anim{transform:scale(1.14);box-shadow:0 8px 20px rgba(15,180,168,0.12);border-radius:12px} .fav-btn{display:inline-flex;align-items:center;justify-content:center;min-width:36px;min-height:36px;font-weight:700;background:rgba(255,255,255,0.95);color:var(--turquoise)}'; document.head.appendChild(s);
  }
  updateFavButtons();
}

// Ensure fav buttons are added after DOM is ready
if(typeof window !== 'undefined'){
  document.addEventListener('DOMContentLoaded', ()=>{ try{ attachFavoriteButtons(); }catch(e){} });
}
function openFavoritesModal(){
  console.info('safepet: openFavoritesModal invoked');
  let modal=document.getElementById('favoritesModal');
  if(!modal){ const wrapper=document.createElement('div'); wrapper.innerHTML=`<div class="modal" id="favoritesModal" aria-hidden="true" role="dialog"><div class="modal-dialog" role="document" aria-modal="true"><div class="modal-header"><span class="modal-title">Favoritos</span><button class="modal-close" id="favoritesClose" aria-label="Cerrar">&times;</button></div><div class="modal-body" id="favoritesBody"></div><div class="modal-footer"><button class="btn-outline" id="favoritesClose2">Cerrar</button></div></div></div>`; document.body.appendChild(wrapper.firstElementChild); }
  modal=document.getElementById('favoritesModal'); const close1=document.getElementById('favoritesClose'); const close2=document.getElementById('favoritesClose2'); const body=document.getElementById('favoritesBody'); const list=loadFavs();
  body.innerHTML = list.length ? list.map((f,i)=>`<div style="display:flex;gap:12px;align-items:center;margin-bottom:12px"><img src="${f.image}" style="width:56px;height:56px;object-fit:cover;border-radius:8px"/><div style="flex:1"><strong>${f.name}</strong></div><div><button class="btn-outline fav-remove" data-index="${i}">Eliminar</button> <button class="btn-primary fav-addcart" data-index="${i}">Agregar al carrito</button></div></div>`).join('') : '<p>No hay favoritos aún.</p>';
  body.querySelectorAll('.fav-remove').forEach(b=>b.addEventListener('click',()=>{ const idx=parseInt(b.getAttribute('data-index')); const l=loadFavs(); l.splice(idx,1); saveFavs(l); openFavoritesModal(); updateFavButtons(); }));
  body.querySelectorAll('.fav-addcart').forEach(b=>b.addEventListener('click',()=>{ const idx=parseInt(b.getAttribute('data-index')); const f=loadFavs()[idx]; if(window.addToCart) addToCart({ name:f.name, image:f.image, pricingMode:'unit', qty:1, price:9.99 }); showNotice(`${f.name} agregado al carrito`); }));
  function closeHandlers(){ try{ modal.classList.remove('active'); if(document.getElementById('modalBackdrop')){ document.getElementById('modalBackdrop').classList.remove('active'); try{ document.body.style.overflow = ''; }catch(e){} } }catch(e){}
  }
  if(close1) close1.addEventListener('click', closeHandlers);
  if(close2) close2.addEventListener('click', closeHandlers);
  // show and ensure proper z-index
  if(modal) { modal.classList.add('active'); try{ modal.style.zIndex = 100001; }catch(e){} }
  if(document.getElementById('modalBackdrop')){ document.getElementById('modalBackdrop').classList.add('active'); try{ document.getElementById('modalBackdrop').style.zIndex = 100000; }catch(e){} }
  try{ document.body.style.overflow = 'hidden'; }catch(e){}
}
function attachHeaderActions(){ const favBtn = document.getElementById('favoritesBtn'); if(favBtn){ favBtn.addEventListener('click',(e)=>{ e.preventDefault(); openFavoritesModal(); }); }
  const searchBtn = document.getElementById('searchBtn'); if(searchBtn){ searchBtn.addEventListener('click',(e)=>{ e.preventDefault(); openSearchOverlay(); }); }
}
function openSearchOverlay(){
  console.debug('openSearchOverlay called');
  const pages = ['tienda.html','comida.html','cosmeticos.html','juguetes.html','kennel.html','index.html'];
  function slugify(t){ return String(t||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); }
  async function buildIndex(){
    // Use a Map to keep only one entry per product title (case-insensitive)
    const seen = new Map();
    // include current page items first (helps when fetch is not allowed locally)
    try{
      const currentPage = window.location.pathname.split('/').pop() || 'index.html';
      const localCards = Array.from(document.querySelectorAll('.card, .product-card'));
      localCards.forEach(c=>{
        const title = (c.querySelector('h3')||c.querySelector('h4'))?.textContent?.trim() || c.getAttribute('data-product') || '';
        if(!title) return;
        const key = title.toLowerCase();
        if(seen.has(key)) return; // keep first occurrence (prefer current page)
        const img = (c.querySelector('img')||{}).getAttribute('src')||'';
        const id = c.id || ('product-' + slugify(title));
        seen.set(key, { title, img, page: currentPage, id });
      });
    }catch(e){}
    await Promise.all(pages.map(async (p)=>{
      try{
        const resp = await fetch(p,{cache:'no-store'});
        if(!resp.ok) return;
        const text = await resp.text();
        const dp = new DOMParser();
        const doc = dp.parseFromString(text, 'text/html');
        const cards = Array.from(doc.querySelectorAll('.card, .product-card'));
        cards.forEach(c=>{
          const title = (c.querySelector('h3')||c.querySelector('h4'))?.textContent?.trim() || c.getAttribute('data-product') || '';
          if(!title) return;
          const key = title.toLowerCase();
          if(seen.has(key)) return; // don't duplicate
          const img = (c.querySelector('img')||{}).getAttribute('src')||'';
          let id = c.id || ('product-' + slugify(title));
          seen.set(key, { title, img, page: p, id });
        });
      }catch(e){ /* ignore fetch errors for offline or file: */ }
    }));
    return Array.from(seen.values());
  }

  let overlay=document.getElementById('searchOverlay');
  if(!overlay){ const wrapper=document.createElement('div'); wrapper.innerHTML=`<div id="searchOverlay" style="position:fixed;inset:0;display:flex;align-items:flex-start;justify-content:center;padding:40px;z-index:2000"><div style="width:min(820px,96%);background:#fff;border-radius:12px;padding:16px;box-shadow:0 18px 40px rgba(0,0,0,0.2)"><div style="display:flex;gap:8px"><input id="searchInput" placeholder="Buscar productos en todo el sitio..." style="flex:1;padding:10px 12px;border:1px solid #e6f3ef;border-radius:8px;font-size:16px" /> <div style=\"display:flex;gap:8px;align-items:center\"><button id=\"searchSiteBtn\" class=\"btn-outline\">Buscar sitio</button> <button id=\"searchClose\" class=\"btn-outline\">Cerrar</button></div></div><div id="searchResults" style="margin-top:12px"></div></div></div>`; document.body.appendChild(wrapper.firstElementChild); }
  overlay=document.getElementById('searchOverlay'); const input=document.getElementById('searchInput'); const close=document.getElementById('searchClose'); const siteBtn=document.getElementById('searchSiteBtn'); const results=document.getElementById('searchResults');

  function renderResults(list){
    results.innerHTML = list.length ? list.map(i=>`<div style="display:flex;gap:12px;align-items:center;padding:8px;border-bottom:1px solid #f1f6f4"><img src="${i.img||''}" style="width:56px;height:56px;object-fit:cover;border-radius:6px"/><div style="flex:1"><strong>${i.title}</strong><div style="font-size:12px;color:#667;">${i.page}</div></div><div><button class="btn-primary search-go" data-page="${i.page}" data-id="${i.id}">Ir al producto</button></div></div>`).join('') : '<p>No se encontraron productos.</p>';
    results.querySelectorAll('.search-go').forEach(b=>b.addEventListener('click',(e)=>{
      const page = b.getAttribute('data-page'); const id = b.getAttribute('data-id'); overlay.remove(); if(page === window.location.pathname.split('/').pop() || page === window.location.href.split('/').pop()){
        // same page - scroll and highlight
        const el = document.getElementById(id);
        if(el){ el.scrollIntoView({behavior:'smooth', block:'center'}); el.classList.add('product-highlight'); setTimeout(()=>el.classList.remove('product-highlight'), 3500); }
      } else {
        // navigate to page with hash
        window.location.href = page + '#' + id;
      }
    }));
  }

  overlay.style.display='flex'; input.focus();
  let indexPromise = buildIndex();
  // 'Buscar sitio' button will force fetching and rendering of full index when clicked
  if(siteBtn){ siteBtn.addEventListener('click', async ()=>{ siteBtn.disabled = true; siteBtn.textContent = 'Buscando...'; const index = await buildIndex(); renderResults(index); siteBtn.textContent = 'Buscar sitio'; siteBtn.disabled = false; }); }
  input.addEventListener('input', async ()=>{
    const q = input.value.trim(); const index = await indexPromise; if(!q){ results.innerHTML = '<p>Escribe para buscar productos...</p>'; return; }
    const matches = index.filter(i=> i.title.toLowerCase().includes(q.toLowerCase())); renderResults(matches);
  });
  input.addEventListener('keydown', async (e)=>{ if(e.key==='Enter'){ const index = await indexPromise; const matches = index.filter(i=> i.title.toLowerCase().includes(input.value.trim().toLowerCase())); renderResults(matches); } });
  if(close) close.addEventListener('click', ()=>{ overlay.remove(); });
}

// When arriving with a product hash, highlight it
function handleProductHashOnLoad(){ try{ const h = (window.location.hash||'').replace('#',''); if(!h) return; if(!h.startsWith('product-')) return; const el = document.getElementById(h); if(!el) return; el.scrollIntoView({behavior:'smooth', block:'center'}); el.classList.add('product-highlight'); setTimeout(()=>el.classList.remove('product-highlight'), 3500); }catch(e){} }
window.addEventListener('DOMContentLoaded', handleProductHashOnLoad);
// Ensure a polished, shared login modal exists and expose open/close helpers
function ensureLoginModal(){
  // If we previously initialized but the modal element was removed, reset so we can recreate it
  if(window.__safepet_login_modal_initialized){
    if(document.getElementById('safepet_login_modal')) return; else window.__safepet_login_modal_initialized = false;
  }
  window.__safepet_login_modal_initialized = true;
  try{
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <div class="modal" id="safepet_login_modal" aria-hidden="true" role="dialog">
        <div class="modal-dialog" style="max-width:580px;padding:0;overflow:hidden;border-radius:14px">
          <div class="modal-header" style="display:flex;align-items:center;gap:14px;padding:20px 22px;background:linear-gradient(90deg,var(--turquoise) 0%,var(--turquoise-400) 100%);color:#fff">
            <div style="width:72px;height:72px;display:flex;align-items:center;justify-content:center;border-radius:14px;background:rgba(255,255,255,0.12);font-size:34px">🔒</div>
            <div style="flex:1">
              <div style="font-size:22px;font-weight:800">Necesitas iniciar sesión</div>
              <div style="opacity:.95;font-size:14px;margin-top:6px">Para proceder al pago debes iniciar sesión o crear una cuenta. Es rápido y seguro.</div>
            </div>
            <button class="modal-close" id="safepet_login_close" aria-label="Cerrar" style="background:transparent;border:none;color:#fff;font-size:22px;cursor:pointer">&times;</button>
          </div>
          <div class="modal-body" style="padding:22px;background:linear-gradient(180deg,#ffffff,#f6fffc)">
            <div style="display:flex;gap:18px;align-items:center">
              <img src="imagenes/perrofeliz.png" alt="Ilustración" style="width:100px;height:100px;object-fit:cover;border-radius:12px;box-shadow:0 12px 36px rgba(15,180,168,0.12)" />
              <div style="flex:1">
                <p style="margin:0 0 8px;color:#203040;font-size:15px">Inicia sesión para completar tu compra y sincronizar tu carrito con tu cuenta. Si prefieres, puedes continuar como invitado.</p>
                <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:14px">
                  <button class="btn-outline" id="safepet_login_cancel">Continuar como invitado</button>
                  <button class="btn-primary" id="safepet_login_goto">Iniciar sesión</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(wrapper.firstElementChild);
    // Ensure global backdrop exists and push z-index to top so modal is visible over other overlays
    if(!document.getElementById('modalBackdrop')){
      const bd = document.createElement('div'); bd.className = 'modal-backdrop'; bd.id = 'modalBackdrop'; document.body.appendChild(bd);
    }
    const modal = document.getElementById('safepet_login_modal');
    const close = document.getElementById('safepet_login_close');
    const cancel = document.getElementById('safepet_login_cancel');
    const goto = document.getElementById('safepet_login_goto');
    try{ if(modal) { modal.style.zIndex = 100001; } if(document.getElementById('modalBackdrop')) document.getElementById('modalBackdrop').style.zIndex = 100000; }catch(e){}
    console.info('ensureLoginModal: created shared login modal', !!modal);

    function closeHandlers(){ if(modal) modal.classList.remove('active'); if(document.getElementById('modalBackdrop')) document.getElementById('modalBackdrop').classList.remove('active'); }
    if(close) close.addEventListener('click', closeHandlers);
    if(cancel) cancel.addEventListener('click', closeHandlers);
    if(goto) goto.addEventListener('click', (e)=>{ e && e.preventDefault(); // redirect to login
      window.location.href = 'cuenta.html?next=' + encodeURIComponent(window.location.href);
    });

    window.openLoginModal = function(){ console.info('safepet: openLoginModal invoked'); ensureLoginModal(); const modal = document.getElementById('safepet_login_modal'); const bd = document.getElementById('modalBackdrop'); if(bd){ bd.classList.add('active'); bd.style.zIndex = 100000; } if(modal){ modal.classList.add('active'); modal.style.zIndex = 100001; try{ document.getElementById('safepet_login_goto').focus(); }catch(e){} } else { console.warn('safepet: openLoginModal - modal element not found'); } };
    window.closeLoginModal = function(){ ensureLoginModal(); if(modal) modal.classList.remove('active'); if(document.getElementById('modalBackdrop')) document.getElementById('modalBackdrop').classList.remove('active'); };
  }catch(e){ console.error('ensureLoginModal failed', e); }

  // Force-login modal: same visual but requires login to proceed (no "continue as guest")
  function ensureForceLoginModal(){
    // If we previously initialized but the modal element was removed, reset so we can recreate it
    if(window.__safepet_force_login_modal_initialized){
      if(document.getElementById('safepet_force_login_modal')) return; else window.__safepet_force_login_modal_initialized = false;
    }
    if(window.__safepet_force_login_modal_initialized) return; window.__safepet_force_login_modal_initialized = true; try{
    // ensure global backdrop exists
    if(!document.getElementById('modalBackdrop')){
      const bd = document.createElement('div'); bd.className = 'modal-backdrop'; bd.id = 'modalBackdrop'; document.body.appendChild(bd);
    }
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <div class="modal" id="safepet_force_login_modal" aria-hidden="true" role="dialog">
        <div class="modal-dialog" style="max-width:560px;padding:0;overflow:hidden;border-radius:14px">
          <div class="modal-header" style="display:flex;align-items:center;gap:14px;padding:20px 22px;background:linear-gradient(90deg,var(--turquoise) 0%,var(--turquoise-400) 100%);color:#fff">
            <div style="width:72px;height:72px;display:flex;align-items:center;justify-content:center;border-radius:14px;background:rgba(255,255,255,0.12);font-size:34px">🔒</div>
            <div style="flex:1">
              <div style="font-size:22px;font-weight:800">Necesitas iniciar sesión</div>
              <div style="opacity:.95;font-size:14px;margin-top:6px">Para continuar con tu compra debes iniciar sesión. Si no tienes una cuenta, crea una ahora.</div>
            </div>
            <button class="modal-close" id="safepet_force_login_close" aria-label="Cerrar" style="background:transparent;border:none;color:#fff;font-size:22px;cursor:pointer">&times;</button>
          </div>
          <div class="modal-body" style="padding:22px;background:linear-gradient(180deg,#ffffff,#f6fffc)">
            <div style="display:flex;gap:18px;align-items:center">
              <img src="imagenes/perrofeliz.png" alt="Ilustración" style="width:100px;height:100px;object-fit:cover;border-radius:12px;box-shadow:0 12px 36px rgba(15,180,168,0.12)" />
              <div style="flex:1">
                <p style="margin:0 0 8px;color:#203040;font-size:15px">Inicia sesión para completar tu compra y sincronizar tu carrito con tu cuenta. Al finalizar, volverás al carrito para completar el pago.</p>
                <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:14px">
                  <button class="btn-outline" id="safepet_force_login_cancel">Cancelar</button>
                  <button class="btn-primary" id="safepet_force_login_goto">Iniciar sesión</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(wrapper.firstElementChild);
    const modal2 = document.getElementById('safepet_force_login_modal');
    const close2 = document.getElementById('safepet_force_login_close');
    const cancel2 = document.getElementById('safepet_force_login_cancel');
    const goto2 = document.getElementById('safepet_force_login_goto');
    console.info('ensureForceLoginModal: created force login modal', !!modal2);
    function closeHandlers2(){ if(modal2) modal2.classList.remove('active'); if(document.getElementById('modalBackdrop')) document.getElementById('modalBackdrop').classList.remove('active'); }
    if(close2) close2.addEventListener('click', closeHandlers2);
    if(cancel2) cancel2.addEventListener('click', closeHandlers2);
    if(goto2) goto2.addEventListener('click', (e)=>{ e && e.preventDefault(); window.location.href = 'cuenta.html?next=' + encodeURIComponent(window.location.href); });
window.openForceLoginModal = function(){ console.info('safepet: openForceLoginModal invoked'); ensureForceLoginModal(); const modal = document.getElementById('safepet_force_login_modal'); const bd = document.getElementById('modalBackdrop'); if(bd){ bd.classList.add('active'); bd.style.zIndex = 100000; } if(modal){ modal.classList.add('active'); modal.style.zIndex = 100001; try{ document.getElementById('safepet_force_login_goto').focus(); }catch(e){} } else { console.warn('safepet: openForceLoginModal - modal element not found'); } };
    window.closeForceLoginModal = function(){ ensureForceLoginModal(); if(modal2) modal2.classList.remove('active'); if(document.getElementById('modalBackdrop')) document.getElementById('modalBackdrop').classList.remove('active'); };
  }catch(e){ console.error('ensureForceLoginModal failed', e); } }
}

// Prompt guest to login or continue as guest before buying - returns Promise<boolean>
function promptLoginIfGuest(){
  return new Promise((resolve)=>{
    if(typeof isLoggedIn === 'function' && isLoggedIn()) return resolve(true);
    ensureLoginModal();
    const modal = document.getElementById('safepet_login_modal');
    const cancel = document.getElementById('safepet_login_cancel');
    const goto = document.getElementById('safepet_login_goto');
    function cleanup(){ try{ if(cancel) cancel.removeEventListener('click', onCancel); if(goto) goto.removeEventListener('click', onLogin); if(modal) modal.classList.remove('active'); if(document.getElementById('modalBackdrop')) document.getElementById('modalBackdrop').classList.remove('active'); try{ document.body.style.overflow = ''; }catch(e){} }catch(e){} }
    function onCancel(e){ e && e.preventDefault(); cleanup(); resolve(true); }
    function onLogin(e){ e && e.preventDefault(); cleanup(); window.location.href = 'cuenta.html?next=' + encodeURIComponent(window.location.href); resolve(false); }
    if(cancel) cancel.addEventListener('click', onCancel);
    if(goto) goto.addEventListener('click', onLogin);
    if(modal) { modal.classList.add('active'); try{ modal.style.zIndex = 100001; }catch(e){} }
    if(document.getElementById('modalBackdrop')){ document.getElementById('modalBackdrop').classList.add('active'); try{ document.getElementById('modalBackdrop').style.zIndex = 100000; }catch(e){} }
    try{ document.body.style.overflow = 'hidden'; goto && goto.focus(); }catch(e){}
  });
}
// inject highlight, responsive and modal animation styles once
(function ensureHighlightStyles(){ if(document.getElementById('safepet-highlight-styles')) return; try{ const s = document.createElement('style'); s.id = 'safepet-highlight-styles'; s.textContent = `
/* ---------- Visual polish / animations ---------- */
.product-highlight{animation:pulseHighlight 1.4s ease both;border-radius:8px;box-shadow:0 8px 30px rgba(15,180,168,0.16);transform:translateY(-4px)}
@keyframes pulseHighlight{0%{box-shadow:0 6px 20px rgba(15,180,168,0.12)}50%{box-shadow:0 22px 60px rgba(15,180,168,0.18)}100%{box-shadow:0 6px 20px rgba(15,180,168,0.12)}}

/* Modal entrance animation */
.modal-dialog{transform-origin:center;animation:modalIn 1s cubic-bezier(.2,.9,.3,1) both}
@keyframes modalIn{0%{opacity:0;transform:translateY(10px) scale(.98)}60%{opacity:1;transform:translateY(-6px) scale(1.02)}100%{transform:translateY(0) scale(1)}}

/* Modal message and image subtle animations */
.modal-body img#modalImage{animation:modalImagePop 1.1s ease both}
@keyframes modalImagePop{0%{opacity:0;transform:translateY(8px) scale(.96)}40%{opacity:1;transform:translateY(-6px) scale(1.12)}100%{transform:translateY(0) scale(1)}}
.modal-body .modal-msg{animation:popInLong 1s ease both}
@keyframes popInLong{0%{opacity:0;transform:translateY(8px) scale(.96)}100%{opacity:1;transform:translateY(0) scale(1)}}

/* ---------- Responsive base ---------- */
html{font-size:clamp(14px, 1.6vw, 18px)}
body{line-height:1.45}
header,.section,footer{padding-inline:clamp(12px,3vw,48px)}

/* Header responsiveness */
header{display:flex;flex-wrap:wrap;align-items:center;gap:12px}
header .logo{flex:1 1 auto}
header nav{flex:2 1 400px}
header .icons{flex:1 1 auto;display:flex;justify-content:flex-end;gap:10px}

/* Nav compact for small screens */
@media (max-width:720px){
  header nav ul{display:flex;gap:10px;overflow:auto;padding-bottom:6px}
  header nav ul li{white-space:nowrap}
  .hero{padding:20px}
}

/* Grid adjustments */
.grid{grid-auto-rows:1fr}
@media (max-width:1024px){.grid{grid-template-columns:repeat(3,1fr)}}
@media (max-width:768px){.grid{grid-template-columns:repeat(2,1fr);gap:14px;padding-inline:8px}}
@media (max-width:520px){.grid{grid-template-columns:1fr;gap:12px;padding-inline:8px}}
/* Touch-friendly buttons on small screens */
@media (max-width:520px){ .btn, .btn-primary, .btn-outline{ padding:12px 18px; font-size:16px; display:block; width:100%; text-align:center; border-radius:10px } }
@media (min-width:1600px){.grid{grid-template-columns:repeat(5,1fr);gap:24px}}

/* Card & buttons polish */
.card{transition:transform .28s cubic-bezier(.2,.9,.3,1), box-shadow .28s; animation:cardIn .46s ease both; will-change:transform,opacity}
.card:hover{transform:translateY(-6px);box-shadow:0 26px 60px rgba(9,45,40,0.12)}
@keyframes cardIn{0%{opacity:0;transform:translateY(8px) scale(.998)}100%{opacity:1;transform:translateY(0) scale(1)}}
.btn-primary{transition:transform .18s ease, box-shadow .18s ease}
.btn-primary:hover{transform:translateY(-3px);box-shadow:0 16px 40px rgba(15,180,168,0.12)}
.btn-outline{transition:background .18s ease, transform .18s ease}
.btn-outline:hover{transform:translateY(-2px)}

/* Favorites button improvements */
.fav-btn{transition:transform .22s ease, box-shadow .22s ease, background .18s}
.fav-btn:hover{transform:scale(1.08);box-shadow:0 8px 30px rgba(15,180,168,0.08)}
.favorites-badge{transition:transform .18s ease}

/* Modal responsiveness */
.modal{padding:8px}
.modal-dialog{width:min(880px,96%);max-height:90vh;overflow:auto}
@media(max-width:600px){
  .modal{align-items:flex-end;padding:12px}
  .modal-dialog{width:100%;border-radius:12px 12px 0 0;margin:0;max-height:75vh}
}

/* Toast and guest banner polish */
#safepet_notice{border-radius:10px;padding:12px 16px;background:linear-gradient(90deg,#ffffff,#fbfffd);box-shadow:0 12px 36px rgba(9,45,40,0.06);border:1px solid rgba(15,180,168,0.06)}
#safepet_notice a{color:var(--turquoise);font-weight:700}
#safepet_guest_banner{border-radius:10px;padding:10px 14px;background:linear-gradient(90deg,#fffef6,#fff9f0);box-shadow:0 12px 36px rgba(9,45,40,0.06);border:1px solid rgba(15,180,168,0.06);}
#safepet_guest_banner::before{content:'🔔';margin-right:8px}


/* Accessibility focus states */
:focus{outline:3px solid rgba(15,180,168,0.18);outline-offset:2px}

/* Subtle decorative shimmer for hero on large screens */
@media(min-width:1200px){ .hero{background-image:linear-gradient(90deg, rgba(255,255,255,.02) 0%, rgba(255,255,255,.04) 50%, rgba(255,255,255,.02) 100%);} }

/* Light performance-friendly animations only */
@media (prefers-reduced-motion: reduce){
  *{animation-duration:0.001ms !important;transition-duration:0.001ms !important}
}

// Debug helpers: call from console to confirm modal behavior
window.testOpenLogin = function(){ console.info('safepet: testOpenLogin called'); if(typeof window.openLoginModal === 'function') window.openLoginModal(); else console.warn('safepet: openLoginModal is not defined'); };
window.testOpenForceLogin = function(){ console.info('safepet: testOpenForceLogin called'); if(typeof window.openForceLoginModal === 'function') window.openForceLoginModal(); else console.warn('safepet: openForceLoginModal is not defined'); };

`; document.head.appendChild(s);}catch(e){ console.error('ensureHighlightStyles failed', e); } })();
