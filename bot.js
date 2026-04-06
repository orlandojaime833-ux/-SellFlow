const { Telegraf, Markup } = require('telegraf');
const express = require('express');

const BOT_TOKEN = '8203683045:AAGxKoLginDezTh-nM5AU5U5ZClwegbvW6U';
const ADMIN_ID = 7991785009;

const bot = new Telegraf(BOT_TOKEN);
const app = express();

const mainMenu = Markup.inlineKeyboard([
    [Markup.button.webApp('🛍️ ABRIR LOJA', 'https://orlandojamie833-ux.github.io/-SellFlow/')],
    [Markup.button.callback('❓ AJUDA', 'ajuda')]
]);

bot.start(async (ctx) => {
    await ctx.reply(
        `🚀 *SELLFLOW BOT*\n\n` +
        `Plataforma de vendas profissional no Telegram.\n\n` +
        `✨ Funcionalidades:\n` +
        `• 🏪 Loja própria\n` +
        `• 📦 Produtos ilimitados\n` +
        `• 💰 Comissão 10%\n` +
        `• 🎁 Primeiro mês grátis\n\n` +
        `Clique no botão abaixo para começar:`,
        { parse_mode: 'Markdown', ...mainMenu }
    );
});

bot.action('ajuda', async (ctx) => {
    await ctx.reply(
        `❓ *AJUDA SELLFLOW*\n\n` +
        `📌 *Comandos:*\n` +
        `/start - Menu principal\n` +
        `/criar_loja - Criar sua loja\n` +
        `/produtos - Gerenciar produtos\n` +
        `/vendas - Ver histórico\n\n` +
        `🔗 *Sua loja:*\n` +
        `https://orlandojamie833-ux.github.io/-SellFlow/\n\n` +
        `💬 Dúvidas? Comunidade: @SellFlowGrupo`,
        { parse_mode: 'Markdown' }
    );
});

bot.command('criar_loja', async (ctx) => {
    await ctx.reply(
        `🏪 *CRIAR SUA LOJA*\n\n` +
        `Para criar sua loja, acesse o WebApp:\n` +
        `https://orlandojamie833-ux.github.io/-SellFlow/\n\n` +
        `Clique em "Criar Loja" e siga as instruções.\n\n` +
        `🎁 *Primeiro mês GRÁTIS!*`,
        { parse_mode: 'Markdown' }
    );
});

bot.command('produtos', async (ctx) => {
    await ctx.reply(
        `📦 *GERENCIAR PRODUTOS*\n\n` +
        `Acesse o WebApp e vá em "Meus Produtos":\n` +
        `https://orlandojamie833-ux.github.io/-SellFlow/\n\n` +
        `➕ Adicione, edite ou remova produtos facilmente.`,
        { parse_mode: 'Markdown' }
    );
});

const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.json({ status: 'online', bot: 'SellFlow' }));
app.listen(PORT, () => {
    console.log(`✅ Servidor rodando na porta ${PORT}`);
    bot.launch();
    console.log('🚀 SellFlow Bot iniciado com sucesso!');
    console.log(`🤖 Bot: @SellFlowBot`);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
