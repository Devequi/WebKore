// Seleciona todos os cards da página
const cards = document.querySelectorAll('.team-card');

// Passa por cada card para configurar o clique individualmente
cards.forEach(card => {
    // Encontra o botão e o corpo específicos DESTE card
    const botao = card.querySelector('.btn-details');
    const bodyCard = card.querySelector('.team-body');

    // Adiciona o evento de clique no botão do card
    botao.addEventListener('click', () => {
        // Verifica se o display atual é flex
        if (bodyCard.style.display === 'flex') {
            bodyCard.style.display = 'none';
        } else {
            bodyCard.style.display = 'flex';
        }
    });
});
