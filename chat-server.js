const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const OPENAI_VERIFICATION_TOKEN = process.env.OPENAI_VERIFICATION_TOKEN;
const APP_PORT = process.env.APP_PORT || 85;

let todos = {};

app.post("/todos/:username", (req, res) => {
    let username = req.params.username;
    if (!(username in todos)) {
        todos[username] = [];
    }
    todos[username].push(req.body.todo);
    res.status(200).send('OK');
});

app.get("/todos/:username", (req, res) => {
    let username = req.params.username;
    res.status(200).send(JSON.stringify(todos[username] || []));
});

app.delete("/todos/:username", (req, res) => {
    let username = req.params.username;
    let todoIdx = req.body.todo_idx;
    if (0 <= todoIdx && todoIdx < todos[username].length) {
        todos[username].splice(todoIdx, 1);
    }
    res.status(200).send('OK');
});

app.get("/logo.png", (req, res) => {
    res.sendFile(path.join(__dirname, 'logo.png'));
});

app.get("/.well-known/ai-plugin.json", (req, res) => {
    console.log('manifest');
    let host = req.headers.host;
    fs.readFile("manifest.json", 'utf8', function(err, data){
        if (err) throw err;
        data = data.replace(/PLUGIN_HOSTNAME/g, `https://${host}`).replace(/OPENAI_VERIFICATION_TOKEN/g, OPENAI_VERIFICATION_TOKEN)
        res.send(data);
    });
});

app.get("/openapi.yaml", (req, res) => {
    let host = req.headers.host;
    fs.readFile("openapi.yaml", 'utf8', function(err, data){
        if (err) throw err;
        data = data.replace(/PLUGIN_HOSTNAME/g, `https://${host}`);
        res.send(data);
    });
});

const querystring = require('querystring');
const { privateDecrypt } = require('crypto');

const OPENAI_CLIENT_ID = "id";
const OPENAI_CLIENT_SECRET = "secret";
const OPENAI_CODE = "abc123";
const OPENAI_TOKEN = "def456";

app.get('/oauth', (req, res) => {
    const kvps = {};
    const parts = req.originalUrl.split('?')[1].split('&');

    parts.forEach(part => {
        const [k, v] = part.split('=');
        kvps[k] = decodeURIComponent(v);
    });

    console.log("OAuth key value pairs from the ChatGPT Request: ", kvps);
    const url = `${kvps["redirect_uri"]}?code=${OPENAI_CODE}`;
    console.log("URL: ", url);
    res.send(`<a href="${url}">Click to authorize</a>`);
});

app.post("/auth/oauth_exchange", (req, res) => {
    if (req.body.client_id !== OPENAI_CLIENT_ID) {
        throw "bad client ID";
    }
    if (req.body.client_secret !== OPENAI_CLIENT_SECRET) {
        throw "bad client secret";
    }
    if (req.body.code !== OPENAI_CODE) {
        throw "bad code";
    }

    res.send({
        "access_token": OPENAI_TOKEN,
        "token_type": "bearer"
    });
});

app.listen(APP_PORT, '0.0.0.0', () => {
    console.log('Server is running on port ' + APP_PORT);
});
