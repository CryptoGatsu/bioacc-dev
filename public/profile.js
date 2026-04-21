// WAIT FOR APP STATE
let profileReady = false

function initProfile(){

if(profileReady) return
if(typeof wallet === "undefined") return
if(typeof backendData === "undefined") return
if(!wallet || !backendData) return

profileReady = true

// 🔥 CREATE PROFILE BUTTON IN NAV
const nav = document.querySelector(".nav div:last-child")

const btn = document.createElement("span")
btn.innerText = "profile"
btn.style.marginLeft = "0px"
btn.style.cursor = "pointer"
btn.style.color = "#7CFF3A"

nav.appendChild(btn)

// 🔥 TOOLTIP
const tooltip = document.createElement("div")
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

// CLICK
btn.onclick = () => {
tooltip.style.display = tooltip.style.display === "block" ? "none" : "block"
renderProfile(tooltip)
}

}

function renderProfile(el){

const short = wallet.slice(0,4)+"..."+wallet.slice(-4)

const projects = backendData.projects.filter(p=>p.wallet===wallet)

const votedId = backendData.voteIndex?.[wallet]
const voted = backendData.projects.find(p=>p.id===votedId)

let badges = []
if(projects.length) badges.push("builder")
if(votedId) badges.push("voter")

const signed = backendData.manifesto?.find(s=>s.wallet===wallet)
if(signed) badges.push("signer")

el.innerHTML = `
<div style="color:#7CFF3A">${short}</div>

<div style="margin-top:10px;">
<b>projects:</b>
${projects.length ? projects.map(p=>`<div>${p.name}</div>`).join("") : "none"}
</div>

<div style="margin-top:10px;">
<b>voted:</b>
${voted ? voted.name : "none"}
</div>

<div style="margin-top:10px;">
<b>status:</b>
${badges.join(" | ")}
</div>

<div style="margin-top:15px;cursor:pointer;color:#7CFF3A;"
onclick="window.location='/profile?wallet=${wallet}'">
→ full profile
</div>
`
}

// 🔥 LOOP UNTIL READY (SAFE)
setInterval(initProfile, 500)