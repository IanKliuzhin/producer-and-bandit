import http from 'http'
import path from 'path'
import { fileURLToPath } from 'url'
import express from 'express'
import { initializeApp } from 'firebase/app'
import { getDatabase, ref, set } from 'firebase/database'
import { Server } from 'socket.io'
import { firebaseConfig } from './firebaseConfig.js'

const PORT = process.env.PORT || 3000
const app = express()
const server = http.createServer(app)
const io = new Server(server, {
    connectionStateRecovery: true,
    cleanupEmptyChildNamespaces: true,
})
const firebaseApp = initializeApp(firebaseConfig)
const database = getDatabase(firebaseApp)

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
        const namespace = `/game__${expectantId}__${socket.userId}`
        console.log('namespace', namespace)
        const roles = ['producer', 'bandit'].sort(() => Math.random() - Math.random())
        socket.emit('partner-found', namespace, roles[0])
        expectantSocket.emit('partner-found', namespace, roles[1])
        socket.partner = expectantSocket
        expectantSocket.partner = socket
        expectantId = undefined
    } else {
        console.log('There are no expectants in the lobby. Adding', socket.userId)
        socket.emit('partner-not-found')
        expectantId = socket.userId
    }

    socket.on('ready', () => {
        console.log(socket.id, 'ready')
        socket.broadcast.emit('partner-ready')
    })

    socket.on('disconnect', () => {
        console.log(`User ${socket.userId} disconnected from lobby`)
        if (expectantId) {
            console.log('There was an expectant at the moment')
            if (socket.userId === expectantId) {
                console.log('He was the user that disconnected. Clearing expectantId')
                expectantId = undefined
            } else {
                console.log('But he wasn\'t the user that disconnected')
            }
        } else {
            console.log('There wasn\'t any expectants at the moment. Making ex-partner of disconnected user expectant', socket.partner.userId)
            expectantId = socket.partner.userId
            delete socket.partner.partner
            socket.partner.emit('partner-disconnected')
        }
    })
})

const game = io.of(/\/game__\w+__\w+/)

game.on('connection', (socket) => {
    socket.id = socket.handshake.auth.id
    socket.role = socket.handshake.auth.role
    console.log(socket.id, socket.role, 'connected to game')

    socket.on('set_tax', (rate) => {
        console.log('Tax received, rate', rate)
        game.emit('set_tax', rate)
    })

    socket.on('start', () => {
        console.log('Started')
        socket.broadcast.emit('start')
    })

    socket.on('flap', (framesPassed, secondsPassed) => {
        console.log('Flapped')
        socket.broadcast.emit('flap', framesPassed, secondsPassed)
    })

    socket.on('current_score', (scorePerSecond, currentRate) => {
        console.log('Score per second', scorePerSecond, 'Current rate', currentRate)
        socket.broadcast.emit('current_score', scorePerSecond, currentRate)
    })

    socket.on('results', (results) => {
        console.log('results', results)
        set(ref(database, socket.nsp.name), {
            ...results,
        })
    })

    socket.on('survey', (answers) => {
        console.log(socket.role, 'answers', answers)
        set(ref(database, `${socket.nsp.name}/${socket.role}_${socket.id}`), { ...answers })
    })
})
