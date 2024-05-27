const clients = [
  {
    id: "1",
    clientId: "client1",
    clientSecret: "secret1",
    redirectUris: [
      "http://localhost:3000/callback",
      "http://localhost:3000/login-rfid",
    ],
  },
];

module.exports = { clients };
