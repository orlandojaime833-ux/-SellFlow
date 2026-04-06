// ============================================
// DATABASE.JS - CONEXÃO COM NEON
// ============================================

const { Pool } = require('pg');

// SUA STRING DO NEON
const DATABASE_URL = 'postgresql://neondb_owner:npg_ku7BywFcX4QE@ep-wild-tree-anlx019d-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require';

// Pool de conexão
const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Inicializar tabelas
async function initDatabase() {
    const client = await pool.connect();
    try {
        // Tabela de vendedores
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
        
        // Tabela de produtos
        await client.query(`
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                seller_id BIGINT NOT NULL,
                name VARCHAR(200) NOT NULL,
                price DECIMAL(10,2) NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        
        console.log('✅ Neon conectado e tabelas prontas');
    } catch (error) {
        console.error('❌ Erro no Neon:', error.message);
    } finally {
        client.release();
    }
}

// Funções do banco
async function getSeller(userId) {
    const res = await pool.query('SELECT * FROM sellers WHERE user_id = $1', [userId]);
    return res.rows[0];
}

async function createSeller(userId, name, storeName) {
    await pool.query(
        'INSERT INTO sellers (user_id, name, store_name) VALUES ($1, $2, $3)',
        [userId, name, storeName]
    );
}

async function addProduct(sellerId, name, price) {
    await pool.query(
        'INSERT INTO products (seller_id, name, price) VALUES ($1, $2, $3)',
        [sellerId, name, price]
    );
    await pool.query('UPDATE sellers SET products_count = products_count + 1 WHERE user_id = $1', [sellerId]);
}

async function getProducts(sellerId) {
    const res = await pool.query('SELECT * FROM products WHERE seller_id = $1 ORDER BY created_at DESC', [sellerId]);
    return res.rows;
}

async function deleteProduct(productId, sellerId) {
    await pool.query('DELETE FROM products WHERE id = $1 AND seller_id = $2', [productId, sellerId]);
    await pool.query('UPDATE sellers SET products_count = products_count - 1 WHERE user_id = $1', [sellerId]);
}

async function getAllProducts() {
    const res = await pool.query(`
        SELECT p.*, s.name as seller_name, s.store_name
        FROM products p
        JOIN sellers s ON p.seller_id = s.user_id
        ORDER BY p.created_at DESC
    `);
    return res.rows;
}

module.exports = {
    initDatabase,
    getSeller,
    createSeller,
    addProduct,
    getProducts,
    deleteProduct,
    getAllProducts
};
