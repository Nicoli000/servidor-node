const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();

const port = 3000;

app.use(cors());

app.use(express.json());

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'techparts'
});

connection.connect((err) => {

    if (err) {

        console.error('Erro ao conectar ao MySQL: ', err.stack);

        return;
    }

    console.log('Conectado ao MySQL com sucesso!');

    const createClientes = `
        CREATE TABLE IF NOT EXISTS clientes (
            id_cliente INT AUTO_INCREMENT PRIMARY KEY,
            nome VARCHAR(100) NOT NULL,
            cpf VARCHAR(14) NOT NULL UNIQUE,
            email VARCHAR(100) NOT NULL UNIQUE,
            telefone VARCHAR(20) NOT NULL
        )
    `;

    connection.query(createClientes, (err) => {

        if (err) {

            console.error('Erro ao criar tabela clientes: ', err.stack);

            return;
        }

        console.log('Tabela clientes pronta!');
    });

    const createEndereco = `
        CREATE TABLE IF NOT EXISTS endereco (
            id_endereco INT AUTO_INCREMENT PRIMARY KEY,
            id_cliente INT NOT NULL,
            cep VARCHAR(9) NOT NULL,
            rua VARCHAR(150) NOT NULL,
            numero VARCHAR(10) NOT NULL,
            bairro VARCHAR(100) NOT NULL,
            cidade VARCHAR(100) NOT NULL,
            uf VARCHAR(2) NOT NULL,
            complemento VARCHAR(150),
            FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente)
        )
    `;

    connection.query(createEndereco, (err) => {

        if (err) {

            console.error('Erro ao criar tabela endereco: ', err.stack);

            return;
        }

        console.log('Tabela endereco pronta!');
    });
});

app.get('/clientes', (req, res) => {

    const sql = `
        SELECT 
            c.id_cliente,
            c.nome,
            c.cpf,
            c.email,
            c.telefone,
            COUNT(e.id_endereco) AS quantidade_enderecos
        FROM clientes c
        LEFT JOIN endereco e
        ON c.id_cliente = e.id_cliente
        GROUP BY c.id_cliente
        ORDER BY c.id_cliente DESC
    `;

    connection.query(sql, (err, results) => {

        if (err) {

            return res.status(500).json({
                erro: 'Erro ao buscar clientes'
            });
        }

        res.json(results);
    });
});

app.post('/clientes', (req, res) => {

    const nome = req.body.nome;
    const cpf = req.body.cpf;
    const email = req.body.email;
    const telefone = req.body.telefone;
    const enderecos = req.body.enderecos;

    if (!nome || !cpf || !email || !telefone) {

        return res.status(400).json({
            erro: 'Preencha todos os dados do cliente'
        });
    }

    const sqlCliente = `
        INSERT INTO clientes
        (nome, cpf, email, telefone)
        VALUES (?, ?, ?, ?)
    `;

    connection.query(
        sqlCliente,
        [nome, cpf, email, telefone],
        (err, resultado) => {

            if (err) {

                if (err.code === 'ER_DUP_ENTRY') {

                    return res.status(400).json({
                        erro: 'CPF ou e-mail já cadastrado'
                    });
                }

                return res.status(500).json({
                    erro: 'Erro ao cadastrar cliente'
                });
            }

            const idCliente = resultado.insertId;

            if (!enderecos || enderecos.length === 0) {

                return res.status(201).json({
                    mensagem: 'Cliente cadastrado com sucesso!',
                    id_cliente: idCliente
                });
            }

            let quantidade = 0;

            enderecos.forEach((endereco) => {

                const sqlEndereco = `
                    INSERT INTO endereco
                    (
                        id_cliente,
                        cep,
                        rua,
                        numero,
                        bairro,
                        cidade,
                        uf,
                        complemento
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `;

                connection.query(
                    sqlEndereco,
                    [
                        idCliente,
                        endereco.cep,
                        endereco.rua,
                        endereco.numero,
                        endereco.bairro,
                        endereco.cidade,
                        endereco.uf,
                        endereco.complemento
                    ],
                    (err) => {

                        if (err) {

                            console.error(
                                'Erro ao cadastrar endereço: ',
                                err
                            );

                            return;
                        }

                        quantidade++;

                        if (quantidade === enderecos.length) {

                            res.status(201).json({
                                mensagem: 'Cliente e endereços cadastrados com sucesso!',
                                id_cliente: idCliente
                            });
                        }
                    }
                );
            });
        }
    );
});

app.get('/clientes/:id/endereco', (req, res) => {

    const idCliente = req.params.id;

    const sql = `
        SELECT *
        FROM endereco
        WHERE id_cliente = ?
    `;

    connection.query(sql, [idCliente], (err, results) => {

        if (err) {

            return res.status(500).json({
                erro: 'Erro ao buscar endereços'
            });
        }

        res.json(results);
    });
});

app.get('/', (req, res) => {
  res.send('Servidor TechParts funcionando!');
});

app.listen(port, () => {

    console.log(`Servidor rodando em http://localhost:${port}`);
});