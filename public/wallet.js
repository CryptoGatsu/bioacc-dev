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
    const res = await fetch("https://raw.githubusercontent.com/CryptoGatsu/bioacc-dev/main/submissions.json?t=" + Date.now())
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

  if(!window.backendData || !window.backendData.profiles){
    return w.slice(0,4) + "..." + w.slice(-4)
  }

  const profile = window.backendData.profiles[w]

  if(profile && profile.username){
    return profile.username
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

  if(!provider || !provider.isPhantom){
    window.wallet = localStorage.getItem("wallet")
    return
  }

  try{
    const res = await provider.connect({ onlyIfTrusted: true })
    window.wallet = res.publicKey.toString()
    localStorage.setItem("wallet", window.wallet)
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
function updateWalletUI(){

  if(!window.wallet){
    window.wallet = localStorage.getItem("wallet")
  }

  if(!window.wallet) return

  // -------- FUND / INDEX STATUS --------
  const status = document.getElementById("walletStatus")
  if(status){
    status.innerHTML =
      `wallet: ${window.getDisplayName(window.wallet)} | tokens: ${Math.floor(window.tokenBalance)} | votes: ${window.voteBank}`
  }

  // -------- PROFILE PAGE STATUS --------
  const profileStatus = document.getElementById("profileWallet")
  if(profileStatus){
    profileStatus.innerText =
      `${window.wallet.slice(0,4)}...${window.wallet.slice(-4)}`
  }

  // -------- NAV PROFILE BUTTON (GLOBAL) --------
  const nav = document.querySelector(".nav-links") || document.querySelector(".nav div:last-child")

  if(nav){

    let el = document.getElementById("navProfile")

    // create if missing
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

    // 🔥 ALWAYS UPDATE NAME (fixes your issue)
    el.innerText = window.getDisplayName(window.wallet)

  }

}