const searchParams = new URLSearchParams(window.location.search)
const userId = searchParams.get('id')
// eslint-disable-next-line no-undef
const lobbySocket = io('/lobby', { autoConnect: false })
lobbySocket.auth = { userId }
lobbySocket.connect()

let role

const connectionElement = document.querySelector('.connection')
const statusElement = connectionElement.querySelector('.status')
const roleElement = connectionElement.querySelector('.role')
const showInstructionsBtn = connectionElement.querySelector('.show_instructions')

const instructionsElement = document.querySelector('.instructions')
const roleExplanationElement = instructionsElement.querySelector('.role_instructions')
const readyBtn = instructionsElement.querySelector('.ready')
const partnerStatusElement = document.querySelector('.partner_status')

lobbySocket.on('partner-found', (namespace, assignedRole) => {
    console.log('A partner was found. Namespace:', namespace, ', role:', assignedRole)
    role = assignedRole
    localStorage.setItem(userId, JSON.stringify({ namespace, role }))
    connectionElement.classList.add('connected')
    const partnerElement = document.createElement('div')
    partnerElement.classList.add('partner')
    partnerElement.textContent = 'A partner was found.'
    roleElement.before(partnerElement)
    roleElement.textContent = `Your role is ${role}`
})

lobbySocket.on('partner-not-found', () => {
    console.log('A partner was not found')
    statusElement.textContent = 'Waiting for someone to connect...'
})

lobbySocket.on('partner-disconnected', () => {
    console.log('Partner disconnected')
    connectionElement.classList.remove('connected')
    const partnerElement = document.createElement('div')
    partnerElement.classList.add('partner')
    partnerElement.textContent = 'Previous partner disconnected. Waiting for another one...'
    roleElement.before(partnerElement)
    roleElement.textContent = ''
    localStorage.removeItem(userId)
    role = undefined
})

const showInstructions = () => {
    showInstructionsBtn.removeEventListener('click', showInstructions)
    showInstructionsBtn.remove()

    roleExplanationElement.innerHTML = role
    instructionsElement.classList.add('visible')

    let isReady = false
    let isPartnerReady = false

    readyBtn.onclick = () => {
        lobbySocket.emit('ready')
        isReady = true
        if (isPartnerReady) {
            window.location.assign(`./game.html${window.location.search}`)
        } else {
            readyBtn.remove()
            partnerStatusElement.innerHTML = 'Wating for partner to get ready...'
        }
    }

    lobbySocket.on('partner-ready', () => {
        console.log('partner-ready')
        isPartnerReady = true
        if (isReady) {
            window.location.assign(`./game.html${window.location.search}`)
        }
    })
}

showInstructionsBtn.addEventListener('click', showInstructions)
