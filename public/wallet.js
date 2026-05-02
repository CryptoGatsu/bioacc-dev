// ========================
// GLOBAL STATE
// ========================
window.wallet = null
window.tokenBalance = 0
window.voteBank = 0
window.backendData = null
window.profileCache = {}

// ========================
// LOAD BACKEND (PROJECT DATA ONLY)
// ========================
window.loadBackend = async function(){

  try{
    const url = "https://raw.githubusercontent.com/CryptoGatsu/bioacc-dev/main/submissions.json"

    const res = await fetch(url + "?t=" + Date.now(), {
      cache: "no-store"
    })

    window.backendData = await res.json()

  }catch(err){
    console.log("backend load error", err)
    window.backendData = null
  }

}

// ========================
// FORCE CLEAR PROFILE CACHE (🔥 IMPORTANT)
// ========================
window.clearProfileCache = function(wallet){
  if(!wallet) return
  delete window.profileCache[wallet]
}

// ========================
// LOAD PROFILE (SUPABASE)
// ========================
window.getProfile = async function(wallet){

  if(!wallet) return {}

  // 🔥 ALWAYS REVALIDATE IF CALLED AFTER SAVE
  if(window.profileCache[wallet]){
    return window.profileCache[wallet]
  }

  try{
    const res = await fetch(`/api/profile?wallet=${wallet}&t=${Date.now()}`) // 🔥 CACHE BUST
    const data = await res.json()

    const profile = data || {}

    window.profileCache[wallet] = profile
    return profile

  }catch(err){
    console.log("profile load error", err)
    return {}
  }
}

// ========================
// DISPLAY NAME (ASYNC)
// ========================
window.getDisplayName = async function(wallet){

  if(!wallet) return ""

  const profile = await window.getProfile(wallet)

  if(profile && profile.username){
    return profile.username
  }

  return wallet.slice(0,4) + "..." + wallet.slice(-4)
}

// ========================
// CONNECT WALLET
// ========================
window.connectWallet = async function(){

  const provider = window.solana

  if(!provider || !provider.isPhantom){
    alert("Phantom not found")
    return
  }

  try{
    const res = await provider.connect()
    window.wallet = res.publicKey.toString()

    localStorage.setItem("wallet", window.wallet)

    await window.loadBackend()
    await loadWalletData()
    await window.updateWalletUI(true) // 🔥 force refresh

  }catch(err){
    console.log("connect error", err)
  }

}

// ========================
// AUTO CONNECT
// ========================
window.autoConnect = async function(){

  const provider = window.solana

  try{
    if(provider && provider.isPhantom){
      const res = await provider.connect({ onlyIfTrusted: true })
      window.wallet = res.publicKey.toString()
      localStorage.setItem("wallet", window.wallet)
    } else {
      window.wallet = localStorage.getItem("wallet")
    }
  }catch{
    window.wallet = localStorage.getItem("wallet")
  }

  if(window.wallet){
    await window.loadBackend()
    await loadWalletData()
  }

  await window.updateWalletUI(true) // 🔥 force refresh
}

// ========================
// LOAD TOKEN DATA
// ========================
async function loadWalletData(){

  try{

    if(!window.wallet){
      window.tokenBalance = 0
      window.voteBank = 0
      return
    }

    const TOKEN_MINT = "CLP3exiqE8drZSzwhPas257cTh1evzq6nr7i1Xwvpump"

    const HELIUS_RPC = "https://rpc.helius.xyz/?api-key=abe30281-08a6-4f68-921b-4da93db84835"

    const res = await fetch(HELIUS_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTokenAccountsByOwner",
        params: [
          window.wallet,
          { mint: TOKEN_MINT },
          { encoding: "jsonParsed" }
        ]
      })
    })

    const data = await res.json()

    let balance = 0

    if(data.result && data.result.value.length > 0){
      balance = data.result.value[0].account.data.parsed.info.tokenAmount.uiAmount || 0
    }

    // 🔥 SAVE BALANCE
    window.tokenBalance = balance

    // 🔥 1 VOTE = 1M TOKENS
    window.voteBank = Math.floor(balance / 1000000)

  }catch(err){
    console.log("helius token fetch error", err)
    window.tokenBalance = 0
    window.voteBank = 0
  }
}

// ========================
// UI UPDATE (FIXED)
// ========================
window.updateWalletUI = async function(forceFresh = false){

  if(!window.wallet){
    window.wallet = localStorage.getItem("wallet")
  }

  if(!window.wallet) return

  // 🔥 HIDE CONNECT BUTTONS IF CONNECTED
const connectBtns = document.querySelectorAll(".connect-btn")

connectBtns.forEach(btn=>{
  if(window.wallet){
    btn.style.display = "none"
  } else {
    btn.style.display = "inline-block"
  }
})

  // 🔥 FORCE REFRESH AFTER SAVE
  if(forceFresh){
    window.clearProfileCache(window.wallet)
  }

  const name = await window.getDisplayName(window.wallet)

  // -------- STATUS TEXT --------
  const status = document.getElementById("walletStatus")
  if(status){
    status.innerHTML =
      `wallet: ${name} | tokens: ${Math.floor(window.tokenBalance)} | votes: ${window.voteBank}`
  }

  // -------- PROFILE TITLE --------
  const title = document.getElementById("walletTitle")
  if(title){
    title.innerText = name
  }

  // -------- NAV PROFILE BUTTON --------
  const nav = document.querySelector(".nav-links") || document.querySelector(".nav div:last-child")

  if(nav){

    let el = document.getElementById("navProfile")

    if(!el){
      el = document.createElement("span")
      el.id = "navProfile"
      el.className = "profile-link"
      el.style.marginLeft = "20px"
      el.style.cursor = "pointer"

      el.onclick = () => {
        window.location = "/profile?wallet=" + window.wallet
      }

      nav.appendChild(el)
    }

    el.textContent = name
  }

}

window.disconnectWallet = function(){

  window.wallet = null
  window.tokenBalance = 0
  window.voteBank = 0

  localStorage.removeItem("wallet")

  // 🔥 CLEAR CACHE
  window.profileCache = {}

  // 🔥 CLEAR UI
  const title = document.getElementById("walletTitle")
  if(title) title.innerText = "wallet"

  const status = document.getElementById("walletStatus")
  if(status) status.innerText = ""

  const navProfile = document.getElementById("navProfile")
  if(navProfile) navProfile.remove()

  updateWalletUI()
}