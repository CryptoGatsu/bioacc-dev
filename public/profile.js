// ========================
// CONFIG (SET YOUR KEYS)
// ========================
const SUPABASE_URL = "YOUR_SUPABASE_URL"
const SUPABASE_KEY = "YOUR_SUPABASE_ANON_KEY"

// ========================
// GLOBAL PROFILE LOADER
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
// INIT
// ========================
let profileReady = false

async function initProfile(){

  if(profileReady) return
  if(!window.wallet) return

  profileReady = true

  // 🔥 LOAD PROFILE FROM SUPABASE
  const profile = await window.loadProfile(window.wallet)

  // 🔥 STORE LOCALLY (used everywhere)
  if(!window.backendData) window.backendData = { profiles:{} }
  if(profile){
    window.backendData.profiles[window.wallet] = profile
  }

  // 🔥 CREATE PROFILE BUTTON IN NAV
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

  // 🔥 SET NAME (LIVE)
  btn.innerText = getDisplayName(window.wallet)

  // 🔥 TOOLTIP
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

  btn.onclick = () => {
    tooltip.style.display = tooltip.style.display === "block" ? "none" : "block"
    renderProfile(tooltip)
  }

}

// ========================
// DISPLAY NAME (GLOBAL)
// ========================
window.getDisplayName = function(w){

  const profile = window.backendData?.profiles?.[w]

  if(profile && profile.username){
    return profile.username
  }

  return w.slice(0,4) + "..." + w.slice(-4)
}

// ========================
// TOOLTIP RENDER
// ========================
function renderProfile(el){

  if(!window.wallet) return

  const profile = window.backendData?.profiles?.[window.wallet] || {}

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
// AUTO LOOP INIT
// ========================
setInterval(initProfile, 500)