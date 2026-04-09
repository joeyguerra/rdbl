// Mission clock
const start = Date.now()
function tick() {
  const s = Math.floor((Date.now() - start) / 1000)
  const h = String(Math.floor(s / 3600)).padStart(2, '0')
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
  const sec = String(s % 60).padStart(2, '0')
  const el = document.getElementById('mission-clock')
  if (el) el.textContent = `T+${h}:${m}:${sec}`
}
setInterval(tick, 1000)

// Active nav link
const nav = document.querySelector('meta[name="nav-active"]')?.content ?? ''
if (nav) {
  document.querySelectorAll('[data-nav="' + nav + '"]').forEach(el => {
    el.classList.add('active')
  })
}

// Simple tab switching utility (used by demo pages)
window.initTabs = function(groupEl) {
  if (!groupEl) return
  const btns  = groupEl.querySelectorAll('.tab-btn')
  const panes = groupEl.querySelectorAll('.tab-pane')
  btns.forEach((btn, i) => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'))
      panes.forEach(p => p.classList.remove('active'))
      btn.classList.add('active')
      panes[i].classList.add('active')
    })
  })
  if (btns[0]) btns[0].click()
}
document.querySelectorAll('.tab-group').forEach(window.initTabs)

// ── Mobile drawer ──────────────────────────────────────
const hamburger = document.getElementById('hamburger')
const sidebar   = document.querySelector('.sidebar')
const overlay   = document.getElementById('sidebar-overlay')

function openDrawer() {
  sidebar.classList.add('open')
  overlay.classList.add('open')
  document.body.classList.add('drawer-open')
  hamburger.setAttribute('aria-expanded', 'true')
  hamburger.classList.add('open')
}
function closeDrawer() {
  sidebar.classList.remove('open')
  overlay.classList.remove('open')
  document.body.classList.remove('drawer-open')
  hamburger.setAttribute('aria-expanded', 'false')
  hamburger.classList.remove('open')
}

hamburger?.addEventListener('click', () =>
  sidebar.classList.contains('open') ? closeDrawer() : openDrawer()
)
overlay?.addEventListener('click', closeDrawer)
sidebar?.querySelectorAll('a').forEach(a => a.addEventListener('click', closeDrawer))

// Close on Escape
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer() })

