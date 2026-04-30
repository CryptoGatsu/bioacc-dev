// ========================
// GLOBAL STATE
// ========================
window.wallet = null
window.tokenBalance = 0
window.voteBank = 0
window.backendData = null

// ========================
// LOAD BACKEND (GLOBAL)
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
// DISPLAY NAME (GLOBAL)
// ========================
window.getDisplayName = function(w){

  if(!w) return ""

  if(window.backendData?.profiles?.[w]?.username){
    return window.backendData.profiles[w].username
  }

  return w.slice(0,4) + "..." + w.slice(-4)
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
    updateWalletUI()

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

  updateWalletUI()

}

// ========================
// LOAD WALLET DATA
// ========================
async function loadWalletData(){

  try{
    if(typeof getTokenBalance === "function" && typeof TOKENS_PER_VOTE !== "undefined"){
      window.tokenBalance = await getTokenBalance(window.wallet)
      window.voteBank = Math.floor(window.tokenBalance / TOKENS_PER_VOTE)
    } else {
      window.tokenBalance = 0
      window.voteBank = 0
    }
  }catch{
    window.tokenBalance = 0
    window.voteBank = 0
  }

}

// ========================
// UI UPDATE (ALL PAGES)
// ========================
window.updateWalletUI = function(){

  if(!window.wallet){
    window.wallet = localStorage.getItem("wallet")
  }

  if(!window.wallet) return

  const name = window.getDisplayName(window.wallet)

  // -------- STATUS TEXT --------
  const status = document.getElementById("walletStatus")
  if(status){
    status.innerHTML =
      `wallet: ${name} | tokens: ${Math.floor(window.tokenBalance)} | votes: ${window.voteBank}`
  }

  // -------- PROFILE PAGE TITLE --------
 const title = document.getElementById("walletTitle")
if(title){
  title.innerText = window.getDisplayName(window.wallet)
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

  // 🔥 FORCE UPDATE EVERY TIME
  el.textContent = window.getDisplayName(window.wallet)
}

}