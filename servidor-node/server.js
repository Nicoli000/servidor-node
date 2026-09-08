// Importar o modulo nativo 'http' do node.js
const http = require('http');

// Define o endereço (localhost - Minha Máquina Local) e a porta onde o servidor vai escutar
const hostname = '127.0.0.1';
const port = 3000;

// Cria o Servidor WEB
const server = http.createServer( (req, res) => {

    //Define o status http como 200 (OK) eo tipo de conteudo como texto plano em UTF 
    res.writeHead(200, )
});


// se tiver => é uma funçao anonima