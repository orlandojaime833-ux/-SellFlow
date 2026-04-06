// ============================================
// API.JS - TODAS AS ROTINAS DO SELLFLOW
// Rotas, Webhook e Funções do Banco
// ============================================

const express = require('express');
const { Pool } = require('pg');

// ============ CONEXÃO COM NEON ============
const DATABASE_URL = 'postgresql://neondb_owner:npg_ku7BywFcX4QE@ep-wild-tree-anlx019d-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const router = express.Router();

// ============ FUNÇÕES DO BANCO ============

// Inicializar tabelas
async function initDatabase() {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS sellers (
                id SERIAL PRIMARY KEY,
                user_id BIGINT UNIQUE NOT NULL,
                name VARCHAR(100),
                store_name VARCHAR(100) UNIQUE,
                products_count INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                seller_id BIGINT NOT NULL,
                name VARCHAR(200) NOT NULL,
                price DECIMAL(10,2) NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Banco conectado');
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        client.release();
    }
}

// Buscar vendedor
async function getSeller(userId) {
    const res = await pool.query('SELECT * FROM sellers WHERE user_id = $1', [userId]);
    return res.rows[0];
}

// Criar vendedor
async function createSeller(userId, name, storeName) {
    await pool.query(
        'INSERT INTO sellers (user_id, name, store_name) VALUES ($1, $2, $3)',
        [userId, name, storeName]
    );
}

// Adicionar produto
async function addProduct(sellerId, name, price) {
    await pool.query(
        'INSERT INTO products (seller_id, name, price) VALUES ($1, $2, $3)',
        [sellerId, name, price]
    );
    await pool.query('UPDATE sellers SET products_count = products_count + 1 WHERE user_id = $1', [sellerId]);
}

// Listar produtos do vendedor
async function getProducts(sellerId) {
    const res = await pool.query('SELECT * FROM products WHERE seller_id = $1 ORDER BY created_at DESC', [sellerId]);
    return res.rows;
}

// Remover produto
async function deleteProduct(productId, sellerId) {
    await pool.query('DELETE FROM products WHERE id = $1 AND seller_id = $2', [productId, sellerId]);
    await pool.query('UPDATE sellers SET products_count = products_count - 1 WHERE user_id = $1', [sellerId]);
}

// Listar todos os produtos (para compradores)
async function getAllProducts() {
    const res = await pool.query(`
        SELECT p.*, s.name as seller_name, s.store_name
        FROM products p
        JOIN sellers s ON p.seller_id = s.user_id
        ORDER BY p.created_at DESC
    `);
    return res.rows;
}

// ============ ROTAS DA API ============

// Rota: listar produtos (usado pelo WebApp)
router.get('/products', async (req, res) => {
    try {
        const products = await getAllProducts();
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Rota: status do servidor
router.get('/status', (req, res) => {
    res.json({ status: 'online', bot: 'SellFlow', time: new Date() });
});

// ============ WEBHOOK DO xROCKET ============
router.post('/webhook', async (req, res) => {
    const { status, external_id, amount } = req.body;
    console.log(`📥 Webhook: ${status} - ${external_id} - $${amount}`);
    
    if (status === 'paid') {
        // Aqui você notifica o vendedor e o comprador
        console.log(`💰 Pagamento confirmado: ${external_id}`);
    }
    
    res.json({ ok: true });
});

// ============ EXPORTAR ============
module.exports = {
    router,
    initDatabase,
    getSeller,
    createSeller,
    addProduct,
    getProducts,
    deleteProduct,
    getAllProducts
};
