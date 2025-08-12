require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const { OAuth2Client } = require('google-auth-library');
const cors = require('cors');
const WebSocket = require('ws');

const app = express();
app.use(cors());
app.use(express.json());

// Conexão com SEU MongoDB Atlas
mongoose.connect('mongodb+srv://joaopsb12223:MEdc0E2SSO2nH4sc@lilicord.cek8ark.mongodb.net/Lilicord?retryWrites=true&w=majority', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Modelos
const UserSchema = new mongoose.Schema({
    googleId: String,
    name: String,
    email: String,
    avatar: String
});

const MessageSchema = new mongoose.Schema({
    channel: String,
    text: String,
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Message = mongoose.model('Message', MessageSchema);

// Google Auth
const client = new OAuth2Client('380915385724-f4fl98kfa668bmokst5o0ga0idhjkfct.apps.googleusercontent.com');

// Rotas
app.post('/auth/google', async (req, res) => {
    try {
        const ticket = await client.verifyIdToken({
            idToken: req.body.token,
            audience: '380915385724-f4fl98kfa668bmokst5o0ga0idhjkfct.apps.googleusercontent.com'
        });

        const payload = ticket.getPayload();
        let user = await User.findOne({ googleId: payload.sub });

        if (!user) {
            user = new User({
                googleId: payload.sub,
                name: payload.name,
                email: payload.email,
                avatar: payload.picture
            });
            await user.save();
        }

        // Simulação de token JWT (em produção use jsonwebtoken)
        const token = `fake-jwt-${Math.random().toString(36).substring(2)}`;

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                avatar: user.avatar
            }
        });
    } catch (error) {
        res.status(401).json({ error: 'Autenticação falhou' });
    }
});

app.get('/auth/me', async (req, res) => {
    try {
        // Em produção, verifique o token JWT real
        const user = await User.findById('fake-user-id'); // Substitua pela lógica real
        res.json(user);
    } catch (error) {
        res.status(401).json({ error: 'Não autorizado' });
    }
});

app.get('/messages', async (req, res) => {
    try {
        const messages = await Message.find({ channel: req.query.channel })
            .populate('user')
            .sort({ timestamp: 1 });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao carregar mensagens' });
    }
});

app.post('/messages', async (req, res) => {
    try {
        const message = new Message({
            channel: req.body.channel,
            text: req.body.text,
            user: 'fake-user-id' // Substitua pelo ID real do usuário
        });

        await message.save();
        
        // Envia para todos via WebSocket
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'new_message',
                    message: message
                }));
            }
        });

        res.json(message);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao enviar mensagem' });
    }
});

// Inicia servidor HTTP
const server = app.listen(3000, () => {
    console.log('Servidor HTTP rodando na porta 3000');
});

// WebSocket Server
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        console.log('Mensagem recebida:', message);
    });
});
