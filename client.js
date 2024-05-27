// client.js
const express = require("express");
const request = require("request");
const cors = require("cors");
const app = express();

app.use(cors());

app.use(express.static("dist"));

app.get("/login", (req, res) => {
    const authUrl =
        "http://localhost:3001/authorize?response_type=code&client_id=client1&redirect_uri=http://localhost:3000/callback";
    res.redirect(authUrl);
});

app.get("/callback", (req, res) => {
    const authCode = req.query.code;
    const tokenUrl = "http://localhost:3001/token";
    const params = {
        code: authCode,
        client_id: "client1",
        client_secret: "secret1",
        redirect_uri: "http://localhost:3000/callback",
        grant_type: "authorization_code",
    };

    request.post({ url: tokenUrl, form: params }, (err, response, body) => {
        const token = JSON.parse(body).access_token;
        res.send(`Access Token: ${token}`);
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Backend Server listening on port ${PORT}`);
});
