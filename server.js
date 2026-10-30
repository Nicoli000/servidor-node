const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require ('bcrypt');

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
        console.error('Erro ao conectar ao MySQL:', err.stack);
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
            console.error('Erro ao criar tabela clientes:', err);
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
            console.error('Erro ao criar tabela endereco:', err);
            return;
        }
        console.log('Tabela endereco pronta!');
    });

    const createFornecedores = `
        CREATE TABLE IF NOT EXISTS fornecedores (
            id_fornecedor INT AUTO_INCREMENT PRIMARY KEY,
            nome VARCHAR(150) NOT NULL,
            cnpj VARCHAR(18) NOT NULL UNIQUE,
            email VARCHAR(100) NOT NULL,
            telefone VARCHAR(20) NOT NULL,
            endereco VARCHAR(200),
            cidade VARCHAR(100),
            uf VARCHAR(2)
        )
    `;

    connection.query(createFornecedores, (err) => {
        if (err) {
            console.error('Erro ao criar tabela fornecedores:', err);
            return;
        }
        console.log('Tabela fornecedores pronta!');
    });

    const createProdutos = `
        CREATE TABLE IF NOT EXISTS produtos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nome VARCHAR(150) NOT NULL,
            categoria VARCHAR(100) NOT NULL,
            marca VARCHAR(100) NOT NULL,
            modelo VARCHAR(100) NOT NULL,
            descricao TEXT,
            preco DECIMAL(10,2) NOT NULL,
            quantidade INT NOT NULL DEFAULT 0,
            fornecedor_id INT
        )
    `;

    connection.query(createProdutos, (err) => {
        if (err) {
            console.error('Erro ao criar tabela produtos:', err);
            return;
        }

        console.log('Tabela produtos pronta!');
    });
    const createUsuarios = `
    CREATE TABLE IF NOT EXISTS usuarios (
        id_usuario INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        senha VARCHAR(255) NOT NULL,
        tipo ENUM('administrador', 'cliente') DEFAULT 'cliente',
        status ENUM('ativo', 'inativo') DEFAULT 'ativo',
        data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`;

connection.query(createUsuarios, (err) => {
    if (err) {
        console.error('Erro ao criar tabela usuarios:', err);
        return;
    }

    console.log('Tabela usuarios pronta!');
});
});

// CADASTRAR CLIENTES
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
        LEFT JOIN endereco e ON c.id_cliente = e.id_cliente
        GROUP BY c.id_cliente
        ORDER BY c.id_cliente DESC
    `;

    connection.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({ erro: 'Erro ao buscar clientes' });
        }

        res.json(results);
    });
});

app.post('/clientes', (req, res) => {
    const { nome, cpf, email, telefone, enderecos } = req.body;

    if (!nome || !cpf || !email || !telefone) {
        return res.status(400).json({
            erro: 'Preencha todos os dados do cliente'
        });
    }

    const sqlCliente = `
        INSERT INTO clientes (nome, cpf, email, telefone)
        VALUES (?, ?, ?, ?)
    `;

    connection.query(sqlCliente, [nome, cpf, email, telefone], (err, resultado) => {
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
        let erroEndereco = false;

        enderecos.forEach((endereco) => {
            const sqlEndereco = `
                INSERT INTO endereco
                (id_cliente, cep, rua, numero, bairro, cidade, uf, complemento)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;

            connection.query(sqlEndereco, [
                idCliente,
                endereco.cep,
                endereco.rua,
                endereco.numero,
                endereco.bairro,
                endereco.cidade,
                endereco.uf,
                endereco.complemento
            ], (err) => {
                if (err) {
                    erroEndereco = true;
                    console.error('Erro ao cadastrar endereço:', err);
                    return res.status(500).json({
                        erro: 'Erro ao cadastrar endereço'
                    });
                }

                quantidade++;

                if (quantidade === enderecos.length && !erroEndereco) {
                    res.status(201).json({
                        mensagem: 'Cliente e endereços cadastrados com sucesso!',
                        id_cliente: idCliente
                    });
                }
            });
        });
    });
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

// DASHBOARD
app.get('/dashboard/resumo', (req, res) => {
    const sql = 'SELECT COUNT(*) AS clientes FROM clientes';

    connection.query(sql, (err, resultado) => {
        if (err) {
            return res.status(500).json({
                erro: 'Erro ao buscar resumo'
            });
        }

        res.json(resultado[0]);
    });
});

// PRODUTOS - LISTAR
app.get('/produtos', (req, res) => {
    const sql = `
        SELECT *
        FROM produtos
        ORDER BY id DESC
    `;

    connection.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({
                erro: 'Erro ao buscar produtos'
            });
        }

        res.json(results);
    });
});

// PRODUTOS - BUSCAR POR ID
app.get('/produtos/:id', (req, res) => {
    const id = req.params.id;

    const sql = 'SELECT * FROM produtos WHERE id = ?';

    connection.query(sql, [id], (err, results) => {
        if (err) {
            return res.status(500).json({
                erro: 'Erro ao buscar produto'
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                erro: 'Produto não encontrado'
            });
        }

        res.json(results[0]);
    });
});

// PRODUTOS - CADASTRAR
app.post('/produtos', (req, res) => {
    const {
        nome,
        categoria,
        marca,
        modelo,
        descricao,
        preco,
        quantidade,
        fornecedor_id
    } = req.body;

    if (!nome || !categoria || !marca || !modelo ||
        preco === '' || preco === undefined ||
        quantidade === '' || quantidade === undefined) {
        return res.status(400).json({
            erro: 'Preencha todos os campos obrigatórios'
        });
    }

    const sql = `
        INSERT INTO produtos
        (nome, categoria, marca, modelo, descricao, preco, quantidade, fornecedor_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    connection.query(sql, [
        nome,
        categoria,
        marca,
        modelo,
        descricao || null,
        preco,
        quantidade,
        fornecedor_id || null
    ], (err, resultado) => {
        if (err) {
            console.error('Erro ao cadastrar produto:', err);

            return res.status(500).json({
                erro: 'Erro ao cadastrar produto'
            });
        }

        res.status(201).json({
            mensagem: 'Produto cadastrado com sucesso!',
            id: resultado.insertId
        });
    });
});

// PRODUTOS - EDITAR
app.put('/produtos/:id', (req, res) => {
    const id = req.params.id;

    const {
        nome,
        categoria,
        marca,
        modelo,
        descricao,
        preco,
        quantidade,
        fornecedor_id
    } = req.body;

    if (!nome || !categoria || !marca || !modelo ||
        preco === '' || preco === undefined ||
        quantidade === '' || quantidade === undefined) {
        return res.status(400).json({
            erro: 'Preencha todos os campos obrigatórios'
        });
    }

    const sql = `
        UPDATE produtos
        SET nome = ?,
            categoria = ?,
            marca = ?,
            modelo = ?,
            descricao = ?,
            preco = ?,
            quantidade = ?,
            fornecedor_id = ?
        WHERE id = ?
    `;

    connection.query(sql, [
        nome,
        categoria,
        marca,
        modelo,
        descricao || null,
        preco,
        quantidade,
        fornecedor_id || null,
        id
    ], (err, resultado) => {
        if (err) {
            console.error('Erro ao atualizar produto:', err);

            return res.status(500).json({
                erro: 'Erro ao atualizar produto'
            });
        }

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                erro: 'Produto não encontrado'
            });
        }

        res.json({
            mensagem: 'Produto atualizado com sucesso!'
        });
    });
});

// PRODUTOS - EXCLUIR
app.delete('/produtos/:id', (req, res) => {
    const id = req.params.id;

    const sql = 'DELETE FROM produtos WHERE id = ?';

    connection.query(sql, [id], (err, resultado) => {
        if (err) {
            console.error('Erro ao excluir produto:', err);

            return res.status(500).json({
                erro: 'Erro ao excluir produto'
            });
        }

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                erro: 'Produto não encontrado'
            });
        }

        res.json({
            mensagem: 'Produto excluído com sucesso!'
        });
    });
});

// FORNECEDORES - LISTAR
app.get('/fornecedores', (req, res) => {
    const sql = 'SELECT * FROM fornecedores ORDER BY id_fornecedor DESC';

    connection.query(sql, (err, results) => {
        if (err) {
            console.error('Erro ao buscar fornecedores:', err);
            return res.status(500).json({ erro: 'Erro ao buscar fornecedores' });
        }

        res.json(results);
    });
});

// FORNECEDORES - BUSCAR POR ID
app.get('/fornecedores/:id', (req, res) => {
    const id = req.params.id;
    const sql = 'SELECT * FROM fornecedores WHERE id_fornecedor = ?';

    connection.query(sql, [id], (err, results) => {
        if (err) {
            console.error('Erro ao buscar fornecedor:', err);
            return res.status(500).json({ erro: 'Erro ao buscar fornecedor' });
        }

        if (results.length === 0) {
            return res.status(404).json({ erro: 'Fornecedor não encontrado' });
        }

        res.json(results[0]);
    });
});

// FORNECEDORES - CADASTRAR
app.post('/fornecedores', (req, res) => {
    const { nome, cnpj, email, telefone, endereco, cidade, uf } = req.body;

    if (!nome || !cnpj || !email || !telefone) {
        return res.status(400).json({
            erro: 'Preencha nome, CNPJ, e-mail e telefone'
        });
    }

    const sql = `
        INSERT INTO fornecedores
        (nome, cnpj, email, telefone, endereco, cidade, uf)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    connection.query(sql, [
        nome, cnpj, email, telefone,
        endereco || null, cidade || null, uf || null
    ], (err, resultado) => {
        if (err) {
            console.error('Erro ao cadastrar fornecedor:', err);

            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ erro: 'CNPJ já cadastrado' });
            }

            return res.status(500).json({ erro: 'Erro ao cadastrar fornecedor' });
        }

        res.status(201).json({
            mensagem: 'Fornecedor cadastrado com sucesso!',
            id_fornecedor: resultado.insertId
        });
    });
});

// FORNECEDORES - EDITAR
app.put('/fornecedores/:id', (req, res) => {
    const id = req.params.id;
    const { nome, cnpj, email, telefone, endereco, cidade, uf } = req.body;

    if (!nome || !cnpj || !email || !telefone) {
        return res.status(400).json({
            erro: 'Preencha nome, CNPJ, e-mail e telefone'
        });
    }

    const sql = `
        UPDATE fornecedores
        SET nome = ?,
            cnpj = ?,
            email = ?,
            telefone = ?,
            endereco = ?,
            cidade = ?,
            uf = ?
        WHERE id_fornecedor = ?
    `;

    connection.query(sql, [
        nome, cnpj, email, telefone,
        endereco || null, cidade || null, uf || null, id
    ], (err, resultado) => {
        if (err) {
            console.error('Erro ao atualizar fornecedor:', err);

            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ erro: 'CNPJ já cadastrado' });
            }

            return res.status(500).json({ erro: 'Erro ao atualizar fornecedor' });
        }

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ erro: 'Fornecedor não encontrado' });
        }

        res.json({ mensagem: 'Fornecedor atualizado com sucesso!' });
    });
});

// FORNECEDORES - EXCLUIR
app.delete('/fornecedores/:id', (req, res) => {
    const id = req.params.id;
    const sql = 'DELETE FROM fornecedores WHERE id_fornecedor = ?';

    connection.query(sql, [id], (err, resultado) => {
        if (err) {
            console.error('Erro ao excluir fornecedor:', err);
            return res.status(500).json({ erro: 'Erro ao excluir fornecedor' });
        }

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ erro: 'Fornecedor não encontrado' });
        }

        res.json({ mensagem: 'Fornecedor excluído com sucesso!' });
    });
});
// USUARIOS - CADASTRAR
app.post('/usuarios', async (req, res) => {
    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
        return res.status(400).json({
            erro: 'Preencha todos os campos'
        });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({
            erro: 'E-mail inválido'
        });
    }

    if (senha.length < 8) {
        return res.status(400).json({
            erro: 'A senha deve ter pelo menos 8 caracteres'
        });
    }

    try {
        const senhaHash = await bcrypt.hash(senha, 12);

        const sql = `
            INSERT INTO usuarios (nome, email, senha)
            VALUES (?, ?, ?)
        `;

        connection.query(sql, [
            nome.trim(),
            email.trim().toLowerCase(),
            senhaHash
        ], (err, resultado) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({
                        erro: 'E-mail já cadastrado'
                    });
                }

                return res.status(500).json({
                    erro: 'Erro ao cadastrar usuário'
                });
            }

            res.status(201).json({
                mensagem: 'Usuário cadastrado com sucesso!',
                id_usuario: resultado.insertId
            });
        });

    } catch (err) {
        res.status(500).json({
            erro: 'Erro ao proteger a senha'
        });
    }
});

// USUARIOS - LOGIN
app.post('/login', (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({
            erro: 'Informe e-mail e senha'
        });
    }

    const sql = `
        SELECT id_usuario, nome, email, senha, tipo, status
        FROM usuarios
        WHERE email = ?
    `;

    connection.query(sql, [
        email.trim().toLowerCase()
    ], async (err, resultados) => {
        if (err) {
            return res.status(500).json({
                erro: 'Erro ao realizar login'
            });
        }

        if (resultados.length === 0) {
            return res.status(401).json({
                erro: 'E-mail ou senha incorretos'
            });
        }

        const usuario = resultados[0];

        if (usuario.status !== 'ativo') {
            return res.status(403).json({
                erro: 'Conta inativa'
            });
        }

        try {
            const senhaCorreta = await bcrypt.compare(
                senha,
                usuario.senha
            );

            if (!senhaCorreta) {
                return res.status(401).json({
                    erro: 'E-mail ou senha incorretos'
                });
            }

            res.json({
                mensagem: 'Login realizado com sucesso!',
                usuario: {
                    id_usuario: usuario.id_usuario,
                    nome: usuario.nome,
                    email: usuario.email,
                    tipo: usuario.tipo
                }
            });

        } catch (err) {
            res.status(500).json({
                erro: 'Erro ao verificar senha'
            });
        }
    });
});
// PÁGINA INICIAL
app.get('/', (req, res) => {
    res.send('Servidor TechParts funcionando!');
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});

