//Importamos las dependencias
const express = require("express");
const bodyParser = require("body-parser");
const oauth2orize = require("oauth2orize");
const passport = require("passport");
const RFIDStrategy = require("passport-custom").Strategy;

const BasicStrategy = require("passport-http").BasicStrategy;
const ClientPasswordStrategy =
    require("passport-oauth2-client-password").Strategy;
const bcrypt = require("bcryptjs");
const User = require("./models/user");
//const { users } = require("./models/users");
const { clients } = require("./models/clients");
const { tokens } = require("./models/tokens");
const cors = require("cors");
const session = require("express-session");

app.use(express.static("dist"));

// Configuración del servidor
const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("dist"));
app.use(
    session({
        secret: "your-strong-secret-key",
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false },
    })
);

// Crear servidor OAuth2
const server = oauth2orize.createServer();

// Serializar y deserializar tokens
server.serializeClient((client, done) => done(null, client.id));
server.deserializeClient((id, done) => {
    const client = clients.find((client) => client.id === id);
    return done(null, client);
});

// Estrategia de RFID
passport.use(
    "rfid",
    new RFIDStrategy(async (req, done) => {
        try {
            console.log("Body received:", req.body); // Debug log
            const rfid = req.body.rfid;
            if (!rfid) {
                console.log("RFID is missing"); // Debug log
                return done(null, false, { message: "RFID is required" });
            }
            const user = await User.findOne({ rfid });
            if (!user) {
                console.log("RFID not recognized"); // Debug log
                return done(null, false, { message: "RFID not recognized" });
            }
            return done(null, user);
        } catch (err) {
            console.log("Error:", err); // Debug log
            return done(err);
        }
    })
);

// Estrategia de contraseña
passport.use(
    new BasicStrategy(async (username, password, done) => {
        try {
            const user = await User.findOne({ username });
            if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
                return done(null, false);
            }
            return done(null, user);
        } catch (err) {
            return done(err);
        }
    })
);

passport.use(
    new ClientPasswordStrategy((clientId, clientSecret, done) => {
        const client = clients.find((client) => client.clientId === clientId);
        if (!client || client.clientSecret !== clientSecret) {
            return done(null, false);
        }
        return done(null, client);
    })
);

// Grant code
server.grant(
    oauth2orize.grant.code((client, redirectUri, user, ares, done) => {
        const code = "code-" + Date.now();
        tokens.push({
            code,
            clientId: client.clientId,
            redirectUri,
            userId: user.id,
        });
        done(null, code);
    })
);

// Exchange code for token
server.exchange(
    oauth2orize.exchange.code((client, code, redirectUri, done) => {
        const tokenInfo = tokens.find(
            (token) =>
                token.code === code &&
                token.clientId === client.clientId &&
                token.redirectUri === redirectUri
        );
        if (!tokenInfo) {
            return done(null, false);
        }
        const token = "token-" + Date.now();
        tokens.push({
            token,
            userId: tokenInfo.userId,
            clientId: client.clientId,
        });
        done(null, token);
    })
);

// Endpoints
app.get(
    "/authorize",
    passport.authenticate("basic", { session: false }),
    server.authorize((clientId, redirectUri, done) => {
        console.log(clientId);
        const client = clients.find((client) => client.clientId === clientId);
        if (!client) {
            return done(null, false);
        }
        if (client.redirectUris.indexOf(redirectUri) === -1) {
            return done(null, false);
        }
        return done(null, client, redirectUri);
    }),
    (req, res) => {
        res.send(
            `<form method="post" action="/decision"><input type="hidden" name="transaction_id" value="${req.oauth2.transactionID}"><button type="submit">Allow</button></form>`
        );
    }
);

app.post(
    "/decision",
    passport.authenticate("basic", { session: false }),
    server.decision()
);

app.post(
    "/token",
    passport.authenticate(["basic", "oauth2-client-password"], {
        session: false,
    }),
    server.token(),
    server.errorHandler()
);

app.post(
    "/login-rfid",
    passport.authenticate("rfid", { session: false }),
    (req, res) => {
        // Generar token o responder con los datos del usuario
        res.json({ message: "Login successful", user: req.user });
    }
);

const port = process.env.PORT || 3001;
app.listen(port, () => {
    console.log(`OAuth Server listening on port ${port}`);
});
