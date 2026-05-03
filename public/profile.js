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
// LOAD PROFILE STATS
// ========================

async function loadProfileStats(wallet){

  if(!wallet){
    console.log("no wallet for stats")
    return
  }

  try{
    console.log("loading stats for:", wallet)

    const res = await fetch(`/api/profile-stats?wallet=${wallet}`)

    const text = await res.text()

    let data
    try{
      data = JSON.parse(text)
    }catch{
      console.error("stats parse failed:", text)
      return
    }

    console.log("stats data:", data)

    document.getElementById("statVotes").innerText = data.totalVotes || 0
    document.getElementById("statProjects").innerText = (data.projectsVoted || []).length
    document.getElementById("statManifesto").innerText = data.hasSigned ? "yes" : "no"

    // tokens
    document.getElementById("statTokens").innerText =
      Math.floor(window.tokenBalance || 0)

  }catch(err){
    console.log("stats error:", err)
  }
}

// ========================
// INIT STATE
// ========================
let profileReady = false


// ========================
// LOAD PROFILE + STATS
// ========================
async function initProfile(){

  if(profileReady) return
  if(!window.wallet) return

  profileReady = true

  try{

    // 🔥 LOAD PROFILE
    const profile = await window.getProfile(window.wallet)

    // 🔥 LOAD STATS
    await loadProfileStats(window.wallet)

    // 🔥 STORE GLOBALLY
    if(!window.backendData) window.backendData = { profiles:{} }
    window.backendData.profiles[window.wallet] = profile

  }catch(err){
    console.log("initProfile error:", err)
  }
}


// ========================
// RESET WHEN WALLET CHANGES
// ========================
function watchWalletChange(){

  let lastWallet = null

  setInterval(() => {

    if(window.wallet !== lastWallet){
      lastWallet = window.wallet
      profileReady = false

      if(window.wallet){
        initProfile()
      }
    }

  }, 500)
}


// ========================
// PAGE LOAD
// ========================
window.addEventListener("load", () => {

  // slight delay for wallet injection
  setTimeout(() => {
    initProfile()
  }, 300)

  watchWalletChange()
})



