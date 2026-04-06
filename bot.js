// ============================================
// SELLFLOW - BOT DE VENDAS PROFISSIONAL
// PostgreSQL + Webhook xRocket
// ============================================

const { Telegraf, Markup } = require('telegraf');
const { Pool } = require('pg');
const express = require('express');
const axios = require('axios');

// ============ CONFIGURAÇÕES (COM SEU TOKEN) ============
const BOT_TOKEN = '8203683045:AAGxKoLginDezTh-nM5AU5U5ZClwegbvW6U';
const ADMIN_ID = 7991785009;
const XROCKET_API_KEY = 'c01709a9c058bd25eeefea6b2';

// String do Neon
const DATABASE_URL = 'postgresql://neondb_owner:npg_ku7BywFcX4QE@ep-wild-tree-anlx019d-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require';

// ============ INICIALIZAÇÃO ============
const bot = new Telegraf(BOT_TOKEN);
const app = express();
app.use(express.json());

// ============ BANCO DE DADOS ============
const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Criar tabelas
async function initDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS sellers (
                id SERIAL PRIMARY KEY,
                user_id BIGINT UNIQUE NOT NULL,
                name VARCHAR(100),
                store_name VARCHAR(100) UNIQUE,
                products_count INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                seller_id BIGINT NOT NULL,
                name VARCHAR(200) NOT NULL,
                price DECIMAL(10,2) NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Banco de dados conectado');
    } catch (error) {
        console.error('❌ Erro no banco:', error.message);
    }
}

// ============ FUNÇÕES DO BANCO ============
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

// ============ WEBHOOK xROCKET ============
app.post('/webhook', async (req, res) => {
    const { status, external_id, amount } = req.body;
    console.log(`📥 Webhook: ${status} - ${external_id} - $${amount}`);
    
    if (status === 'paid') {
        await bot.telegram.sendMessage(ADMIN_ID, 
            `💰 *VENDA REALIZADA!*\n\nValor: $${amount}\nID: ${external_id}`,
            { parse_mode: 'Markdown' }
        );
    }
    res.json({ ok: true });
});

// ============ COMANDOS DO BOT ============

// /start
bot.start(async (ctx) => {
    const seller = await getSeller(ctx.from.id);
    
    if (seller) {
        await ctx.reply(
            `🏪 *${seller.store_name}*\n\n` +
            `📦 Produtos: ${seller.products_count}\n` +
            `💰 Comissão: 10%\n\n` +
            `📌 *Comandos:*\n` +
            `/produtos - Listar produtos\n` +
            `/add - Adicionar produto\n` +
            `/remover - Remover produto`,
            { parse_mode: 'Markdown' }
        );
    } else {
        await ctx.reply(
            `🚀 *Bem-vindo ao SellFlow!*\n\n` +
            `Sua plataforma de vendas no Telegram.\n\n` +
            `📌 *Comandos:*\n` +
            `/criar_loja - Criar sua loja\n` +
            `/comprar - Ver produtos à venda\n\n` +
            `🎁 *Primeiro mês GRÁTIS!*`,
            { parse_mode: 'Markdown' }
        );
    }
});

// /criar_loja
bot.command('criar_loja', async (ctx) => {
    const existing = await getSeller(ctx.from.id);
    if (existing) {
        return ctx.reply('❌ Você já tem uma loja! Use /produtos');
    }
    
    const storeName = `loja_${ctx.from.id}`;
    await createSeller(ctx.from.id, ctx.from.first_name, storeName);
    
    await ctx.reply(
        `✅ *LOJA CRIADA!*\n\n` +
        `🔗 Link da sua loja:\n` +
        `t.me/SellFlow?start=${storeName}\n\n` +
        `📝 Adicione produtos: /add Nome Preço\n` +
        `Ex: /add "Curso JS" 49.90\n\n` +
        `🎁 Primeiro mês GRÁTIS!`,
        { parse_mode: 'Markdown' }
    );
});

// /add
bot.command('add', async (ctx) => {
    const seller = await getSeller(ctx.from.id);
    if (!seller) {
        return ctx.reply('❌ Crie uma loja primeiro: /criar_loja');
    }
    
    const args = ctx.message.text.split(' ').slice(1);
    if (args.length < 2) {
        return ctx.reply('📝 *Uso:* /add Nome Preço\n\nExemplo: /add "Curso JavaScript" 49.90', { parse_mode: 'Markdown' });
    }
    
    const name = args[0];
    const price = parseFloat(args[1]);
    
    if (isNaN(price)) {
        return ctx.reply('❌ Preço inválido! Use número. Ex: 49.90');
    }
    
    await addProduct(ctx.from.id, name, price);
    await ctx.reply(`✅ *"${name}"* adicionado por *$${price}* USDT!`, { parse_mode: 'Markdown' });
});

// /produtos
bot.command('produtos', async (ctx) => {
    const seller = await getSeller(ctx.from.id);
    if (!seller) {
        return ctx.reply('❌ Você não tem uma loja. Use /criar_loja');
    }
    
    const products = await getProducts(ctx.from.id);
    
    if (products.length === 0) {
        return ctx.reply('📦 Nenhum produto. Use /add para adicionar.');
    }
    
    let msg = '*📦 SEUS PRODUTOS:*\n\n';
    for (let i = 0; i < products.length; i++) {
        const p = products[i];
        msg += `${i+1}. *${p.name}* - *$${p.price}* USDT\n`;
    }
    msg += `\n🗑️ Para remover: /remover NUMERO`;
    
    await ctx.reply(msg, { parse_mode: 'Markdown' });
});

// /remover
bot.command('remover', async (ctx) => {
    const seller = await getSeller(ctx.from.id);
    if (!seller) {
        return ctx.reply('❌ Você não tem uma loja.');
    }
    
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
        return ctx.reply('📝 *Uso:* /remover NUMERO\n\nExemplo: /remover 1', { parse_mode: 'Markdown' });
    }
    
    const index = parseInt(args[1]) - 1;
    const products = await getProducts(ctx.from.id);
    
    if (index < 0 || index >= products.length) {
        return ctx.reply('❌ Produto não encontrado.');
    }
    
    const product = products[index];
    await deleteProduct(product.id, ctx.from.id);
    
    await ctx.reply(`✅ *"${product.name}"* removido com sucesso!`, { parse_mode: 'Markdown' });
});

// /comprar
bot.command('comprar', async (ctx) => {
    const products = await getAllProducts();
    
    if (products.length === 0) {
        return ctx.reply('📦 Nenhum produto disponível no momento.');
    }
    
    let msg = '*🛍️ PRODUTOS À VENDA:*\n\n';
    for (let i = 0; i < products.length; i++) {
        const p = products[i];
        msg += `${i+1}. *${p.name}* - *$${p.price}* USDT\n`;
        msg += `   👤 Vendedor: ${p.seller_name}\n━━━━━━━━━━\n`;
    }
    msg += `\n💰 Em breve: sistema de pagamento via xRocket!`;
    
    await ctx.reply(msg, { parse_mode: 'Markdown' });
});

// /ajuda
bot.command('ajuda', async (ctx) => {
    await ctx.reply(
        `📚 *COMANDOS SELLFLOW*\n\n` +
        `*Para vendedores:*\n` +
        `/criar_loja - Criar sua loja\n` +
        `/add Nome Preço - Adicionar produto\n` +
        `/produtos - Listar produtos\n` +
        `/remover NUMERO - Remover produto\n\n` +
        `*Para compradores:*\n` +
        `/comprar - Ver produtos\n\n` +
        `*Geral:*\n` +
        `/start - Menu principal\n` +
        `/ajuda - Este menu\n\n` +
        `🎁 *Primeiro mês GRÁTIS! Comissão 0%*`,
        { parse_mode: 'Markdown' }
    );
});

// ============ ADMIN: Ver todas as lojas ============
bot.command('admin_lojas', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    
    const res = await pool.query('SELECT * FROM sellers ORDER BY created_at DESC');
    if (res.rows.length === 0) {
        return ctx.reply('📋 Nenhuma loja cadastrada.');
    }
    
    let msg = '*🏪 TODAS AS LOJAS:*\n\n';
    for (const store of res.rows) {
        msg += `👤 ${store.name}\n`;
        msg += `🔗 ${store.store_name}\n`;
        msg += `📦 ${store.products_count} produtos\n`;
        msg += `📅 ${new Date(store.created_at).toLocaleDateString()}\n━━━━━━━━━━\n`;
    }
    await ctx.reply(msg, { parse_mode: 'Markdown' });
});

// ============ SERVIDOR ============
const PORT = process.env.PORT || 3000;

async function start() {
    await initDB();
    
    app.listen(PORT, () => {
        console.log(`✅ Servidor rodando na porta ${PORT}`);
        console.log(`🔗 Webhook: https://localhost:${PORT}/webhook`);
    });
    
    bot.launch();
    console.log('🤖 SellFlow bot iniciado!');
    console.log(`👑 Admin ID: ${ADMIN_ID}`);
}

start();

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
