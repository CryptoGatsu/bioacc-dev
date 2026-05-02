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
// CLEAR PROFILE CACHE
// ========================
window.clearProfileCache = function(wallet){
  if(!wallet) return
  delete window.profileCache[wallet]
}

// ========================
// RESET WALLET STATE (🔥 FIX)
// ========================
window.resetWalletState = function(){

  window.wallet = null
  window.tokenBalance = 0
  window.voteBank = 0
  window.profileCache = {}

  localStorage.removeItem("wallet")

  // UI RESET
  const status = document.getElementById("walletStatus")
  if(status) status.innerText = ""

  const title = document.getElementById("walletTitle")
  if(title) title.innerText = "wallet"

  const navProfile = document.getElementById("navProfile")
  if(navProfile) navProfile.remove()

  // SHOW CONNECT BUTTONS
  document.querySelectorAll(".connect-btn").forEach(btn=>{
    btn.style.display = "inline-block"
  })
}

// ========================
// LOAD PROFILE
// ========================
window.getProfile = async function(wallet){

  if(!wallet) return {}

  if(window.profileCache[wallet]){
    return window.profileCache[wallet]
  }

  try{
    const res = await fetch(`/api/profile?wallet=${wallet}&t=${Date.now()}`)
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
// DISPLAY NAME
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
    const newWallet = res.publicKey.toString()

    // 🔥 RESET IF SWITCHING
    if(window.wallet && window.wallet !== newWallet){
      window.resetWalletState()
    }

    window.wallet = newWallet
    localStorage.setItem("wallet", window.wallet)

    await window.loadBackend()
    await loadWalletData()
    await window.updateWalletUI(true)

    // HIDE CONNECT BUTTONS
    document.querySelectorAll(".connect-btn").forEach(btn=>{
      btn.style.display = "none"
    })

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

  await window.updateWalletUI(true)
}

// ========================
// LOAD TOKEN DATA (HELIUS)
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

    window.tokenBalance = balance
    window.voteBank = Math.floor(balance / 1000000)

  }catch(err){
    console.log("helius token fetch error", err)
    window.tokenBalance = 0
    window.voteBank = 0
  }
}

// ========================
// UI UPDATE
// ========================
window.updateWalletUI = async function(forceFresh = false){

  // 🧹 CLEAN OLD UI FIRST
const old = document.getElementById("navProfile")
if(old) old.remove()

const oldTooltip = document.getElementById("profileTooltip")
if(oldTooltip) oldTooltip.remove()

  if(!window.wallet){
    window.wallet = localStorage.getItem("wallet")
  }

  // 🔥 SHOW CONNECT IF NOT CONNECTED
  if(!window.wallet){
    document.querySelectorAll(".connect-btn").forEach(btn=>{
      btn.style.display = "inline-block"
    })
    return
  }

  // 🔥 HIDE CONNECT IF CONNECTED
  document.querySelectorAll(".connect-btn").forEach(btn=>{
    btn.style.display = "none"
  })

  if(forceFresh){
    window.clearProfileCache(window.wallet)
  }

  const name = await window.getDisplayName(window.wallet)

  const status = document.getElementById("walletStatus")
  if(status){
    status.innerHTML =
      `wallet: ${name} | tokens: ${Math.floor(window.tokenBalance)} | votes: ${window.voteBank}`
  }

  const title = document.getElementById("walletTitle")
  if(title){
    title.innerText = name
  }

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

    el.innerHTML = `
  <span id="walletDisplay">${name} ▾</span>
  <div id="walletDropdown" style="
    display:none;
    position:absolute;
    right:0;
    top:30px;
    background:#000;
    border:1px solid #222;
    padding:10px;
    width:180px;
    z-index:9999;
  ">
    <div class="dropdown-item" onclick="copyWallet()">copy address</div>
    <div class="dropdown-item" onclick="goProfile()">profile</div>
    <div class="dropdown-item" onclick="disconnectWallet()" style="color:#ff4444;">disconnect</div>
  </div>
`

el.style.position = "relative"

// toggle dropdown
el.onclick = (e)=>{
  e.stopPropagation()
  const dd = document.getElementById("walletDropdown")
  dd.style.display = dd.style.display === "block" ? "none" : "block"
}

// close on outside click
document.addEventListener("click", ()=>{
  const dd = document.getElementById("walletDropdown")
  if(dd) dd.style.display = "none"
})
  }
}

// ========================
// DISCONNECT
// ========================
window.disconnectWallet = function(){
  window.wallet = null
  localStorage.removeItem("wallet")

  // 🧹 clear UI
  const el = document.getElementById("navProfile")
  if(el) el.remove()

  const dd = document.getElementById("walletDropdown")
  if(dd) dd.remove()

  updateWalletUI()
}

// ========================
// LISTEN FOR WALLET CHANGES (🔥 CRITICAL FIX)
// ========================
window.addEventListener("DOMContentLoaded", () => {

  if(window.solana){

    window.solana.on("accountChanged", async (pubKey) => {

      if(pubKey){
        const newWallet = pubKey.toString()

        if(newWallet !== window.wallet){
          window.resetWalletState()

          window.wallet = newWallet
          localStorage.setItem("wallet", window.wallet)

          await loadWalletData()
          await window.updateWalletUI(true)
        }

      } else {
        // 🔥 DISCONNECTED
        window.resetWalletState()
      }
    })
  }
})

window.copyWallet = function(){
  navigator.clipboard.writeText(window.wallet)
  alert("wallet copied")
}

window.goProfile = function(){
  window.location = "/profile?wallet=" + window.wallet
}