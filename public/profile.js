// ========================
// CONFIG (SET YOUR KEYS)
// ========================
const SUPABASE_URL = "YOUR_SUPABASE_URL"
const SUPABASE_KEY = "YOUR_SUPABASE_ANON_KEY"

// ========================
// GLOBAL PROFILE LOADER (DIRECT SUPABASE)
// ========================
window.loadProfile = async function(wallet){

  try{
    const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?wallet=eq.${wallet}`, {
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`
      }
    })

    const data = await res.json()
    return data[0] || null

  }catch(err){
    console.log("profile load error", err)
    return null
  }

}

// ========================
// GLOBAL PROFILE CACHE + FETCH (USED EVERYWHERE)
// ========================
window.profileCache = {}

window.getProfile = async function(wallet){

  if(window.profileCache[wallet]){
    return window.profileCache[wallet]
  }

  try{
    const res = await fetch(`/api/profile?wallet=${wallet}`)
    const data = await res.json()

    const profile = data || {}

    window.profileCache[wallet] = profile
    return profile

  }catch(err){
    console.log("getProfile error", err)
    return {}
  }
}

// ========================
// DISPLAY NAME (ASYNC SAFE)
// ========================
window.getDisplayName = async function(wallet){

  if(!wallet) return ""

  const profile = await window.getProfile(wallet)

  if(profile?.username){
    return profile.username
  }

  return wallet.slice(0,4) + "..." + wallet.slice(-4)
}

// ========================
// INIT
// ========================
let profileReady = false

async function initProfile(){

  if(profileReady) return
  if(!window.wallet) return

  profileReady = true

  // 🔥 ALWAYS LOAD FRESH PROFILE
  const profile = await window.getProfile(window.wallet)

  // 🔥 STORE IN GLOBAL BACKEND (optional but useful)
  if(!window.backendData) window.backendData = { profiles:{} }
  window.backendData.profiles[window.wallet] = profile

  // ========================
  // NAV PROFILE BUTTON
  // ========================
  const nav = document.querySelector(".nav div:last-child") || document.querySelector(".nav-links")

  if(!nav) return

  let btn = document.getElementById("navProfile")

  if(!btn){
    btn = document.createElement("span")
    btn.id = "navProfile"
    btn.style.marginLeft = "20px"
    btn.style.cursor = "pointer"
    btn.style.color = "#7CFF3A"
    nav.appendChild(btn)
  }

  // 🔥 ASYNC NAME SET
  window.getDisplayName(window.wallet).then(name => {
    btn.innerText = name
  })

  // ========================
  // TOOLTIP
  // ========================
  let tooltip = document.getElementById("profileTooltip")

  if(!tooltip){
    tooltip = document.createElement("div")
    tooltip.id = "profileTooltip"
    tooltip.style.position = "fixed"
    tooltip.style.top = "70px"
    tooltip.style.right = "30px"
    tooltip.style.background = "#000"
    tooltip.style.border = "1px solid #222"
    tooltip.style.padding = "15px"
    tooltip.style.width = "260px"
    tooltip.style.display = "none"
    tooltip.style.zIndex = "9999"
    document.body.appendChild(tooltip)
  }

  btn.onclick = async () => {
    tooltip.style.display = tooltip.style.display === "block" ? "none" : "block"
    await renderProfile(tooltip)
  }

}

// ========================
// TOOLTIP RENDER (LIVE DATA)
// ========================
async function renderProfile(el){

  if(!window.wallet) return

  const profile = await window.getProfile(window.wallet)

  const short = window.wallet.slice(0,4)+"..."+window.wallet.slice(-4)

  el.innerHTML = `
  <div style="color:#7CFF3A">${profile.username || short}</div>

  <div style="margin-top:8px;color:#777;">
    ${profile.bio || ""}
  </div>

  <div style="margin-top:15px;cursor:pointer;color:#7CFF3A;"
  onclick="window.location='/profile?wallet=${window.wallet}'">
  → full profile
  </div>
  `
}

// ========================
// FORCE REFRESH (IMPORTANT)
// ========================
window.refreshProfileUI = async function(wallet){

  if(!wallet) return

  // 🔥 CLEAR CACHE
  delete window.profileCache[wallet]

  // 🔥 RELOAD
  const profile = await window.getProfile(wallet)

  // 🔥 UPDATE NAV
  const btn = document.getElementById("navProfile")
  if(btn){
    btn.innerText = profile.username || wallet.slice(0,4)+"..."+wallet.slice(-4)
  }

  // 🔥 UPDATE TITLE IF EXISTS
  const title = document.getElementById("walletTitle")
  if(title){
    title.innerText = profile.username || wallet.slice(0,4)+"..."+wallet.slice(-4)
  }

}

// ========================
// AUTO LOOP INIT
// ========================
setInterval(initProfile, 500)