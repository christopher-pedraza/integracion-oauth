//Importamos las dependencias
const express = require("express");
const bodyParser = require("body-parser");
const oauth2orize = require("oauth2orize");
const passport = require("passport");
const BasicStrategy = require("passport-http").BasicStrategy;
const ClientPasswordStrategy =
  require("passport-oauth2-client-password").Strategy;
const bcrypt = require("bcryptjs");
const { users } = require("./models/users");
const { clients } = require("./models/clients");
const { tokens } = require("./models/tokens");
const cors = require("cors");
const session = require("express-session");

// Configuración del servidor
const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  session({
    secret: "keyboard cat", // Utiliza una clave secreta para firmar la cookie de sesión
    resave: false, // Evita guardar la sesión si no se modificó
    saveUninitialized: true, // Guarda la sesión incluso si no se ha inicializado
    cookie: { secure: false }, // Para desarrollo, en producción deberías considerar usar 'true' para HTTPS
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

// Estrategia de contraseña
passport.use(
  new BasicStrategy((username, password, done) => {
    console.log(users);
    const user = users.find((user) => user.username === username);
    /*if (!user || !bcrypt.compareSync(password, user.password)) {
      return done(null, false);
    } */
    return done(null, user);
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
    tokens.push({ token, userId: tokenInfo.userId, clientId: client.clientId });
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

app.listen(3000, () => {
  console.log("OAuth2 server listening on port 3000");
});
