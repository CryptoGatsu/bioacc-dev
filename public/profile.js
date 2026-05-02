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

}

// ========================
// AUTO LOOP INIT
// ========================
setInterval(initProfile, 500)