import http from 'http'
import path from 'path'
import { fileURLToPath } from 'url'
import express from 'express'
import { Server } from 'socket.io'

const PORT = process.env.PORT || 3000
const app = express()
const server = http.createServer(app)
const io = new Server(server, {
    connectionStateRecovery: true,
    cleanupEmptyChildNamespaces: true,
})

app.use(express.static(path.join(path.dirname(fileURLToPath(import.meta.url)), 'public')))

server.listen(PORT, () => console.log(`Server running on port ${PORT}`))

const lobby = io.of('/lobby')

let expectantId

lobby.on('connection', (socket) => {
    console.log('New WS connection in lobby', socket.handshake.auth.userId)
    console.log('expectantId', expectantId)
    socket.userId = socket.handshake.auth.userId

    let expectantSocket
    if (expectantId) {
        for (let sckt of lobby.sockets.values()) {
            if (sckt.userId === expectantId) {
                expectantSocket = sckt
                break
            }
        }
    }

    if (expectantId && expectantSocket) {
        console.log('Found expectant in lobby:', expectantId)
        const namespace = `/${expectantId}__${socket.userId}`
        console.log('namespace', namespace)
        const roles = ['producer', 'bandit'].sort(() => Math.random() - Math.random())
        socket.emit('partner-found', namespace, roles[0])
        expectantSocket.emit('partner-found', namespace, roles[1])
        expectantId = undefined
    } else {
        console.log('There are no expectants in the lobby. Adding', socket.userId)
        socket.emit('partner-not-found')
        expectantId = socket.userId
    }

    socket.on('disconnect', () => {
        if (socket.userId === expectantId) {
            expectantId = undefined
        }
        console.log(`User ${socket.userId} disconnected`)
    })
})
