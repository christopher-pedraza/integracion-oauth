// client.js
const express = require("express");
const request = require("request");
const cors = require("cors");
const app = express();
const port = 3001;

app.use(cors());

app.get("/login", (req, res) => {
    const authUrl =
        "https://tarea3-integracion-oauth-aux.azurewebsites.net/authorize?response_type=code&client_id=client1&redirect_uri=https://tarea3-integracion-oauth.azurewebsites.net/callback";
    res.redirect(authUrl);
});

app.get("/callback", (req, res) => {
    const authCode = req.query.code;
    const tokenUrl =
        "https://tarea3-integracion-oauth-aux.azurewebsites.net/token";
    const params = {
        code: authCode,
        client_id: "client1",
        client_secret: "secret1",
        redirect_uri: "https://tarea3-integracion-oauth.azurewebsites.net/callback",
        grant_type: "authorization_code",
    };

    request.post({ url: tokenUrl, form: params }, (err, response, body) => {
        const token = JSON.parse(body).access_token;
        res.send(`Access Token: ${token}`);
    });
});

app.listen(port, () => {
    console.log(`Backend app listening at http://localhost:${port}`);
});
