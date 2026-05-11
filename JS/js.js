let servicoAtual = '';

function abrirPopup(service, price) {
    document.getElementById("meuPopupe").style.display = "flex";
    servicoAtual = service;
    document.getElementById('valor').value = price;
}

function fechar() {
    document.getElementById("meuPopupe").style.display = "none";
}

function pegarDadosForm() {
    var empresa = document.getElementById('nomeEmpresa').value.trim();
    var atividade = document.getElementById('nomeAtividade').value.trim();
    var horas = parseFloat(document.getElementById('tempo').value);
    var valorTexto = document.getElementById('valor').value;
    var valorNumero = parseFloat(valorTexto.replace('R$:', '').replace('R$', '').replace(',', '.').trim());
    if (!empresa || !atividade || !horas || !valorNumero) return null;
    return { empresa: empresa, atividade: atividade, horas: horas, valorNumero: valorNumero };
}

function salvarAtividade(multiplicador) {
    var dados = pegarDadosForm();
    if (!dados) { alert('Preencha todos os campos!'); return; }
    var precoFinal = (dados.horas * dados.valorNumero * multiplicador).toFixed(2).replace('.', ',');
    var urgencia = multiplicador === 1 ? 'Normal' : multiplicador === 1.2 ? 'Urgente' : 'Muito Urgente';

    var nova = {
        id: Date.now(),
        empresa: dados.empresa,
        servico: servicoAtual,
        atividade: dados.atividade,
        horas: dados.horas,
        urgencia: urgencia,
        precoTotal: 'R$: ' + precoFinal
    };

    var lista = JSON.parse(localStorage.getItem('fazendo') || '[]');
    lista.push(nova);
    localStorage.setItem('fazendo', JSON.stringify(lista));
    fechar();
    document.getElementById('atividadeForm').reset();
    alert('Atividade adicionada! (' + urgencia + ')');
}

function adicionarUrgente(multiplicador) {
    salvarAtividade(multiplicador);
}

document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('atividadeForm');
    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            salvarAtividade(1);
        });
    }
    if (document.getElementById('listaFazendo')) carregarFazendo();
    if (document.getElementById('listaPronto')) carregarPronto();
});

function criarCard(atv, tipo) {
    var urgTag = '';
    if (atv.urgencia === 'Urgente') urgTag = '<span class="tag-urgente">Urgente</span>';
    if (atv.urgencia === 'Muito Urgente') urgTag = '<span class="tag-muito-urgente">Muito Urgente</span>';

    var html =
        '<div class="card-info">' +
        '<p><b>Empresa:</b> ' + atv.empresa + '</p>' +
        '<p><b>Servico:</b> ' + atv.servico + '</p>' +
        '<p><b>Atividade:</b> ' + atv.atividade + '</p>' +
        urgTag +
        (atv.desconto ? '<span class="tag-desconto">-' + atv.desconto + '%</span>' : '') +
        '</div>' +
        '<div class="card-preco">' +
        '<span>Preco total:</span>' +
        '<b>' + atv.precoTotal + '</b>' +
        (atv.dataConclusao ? '<small>Concluido: ' + atv.dataConclusao + '</small>' : '') +
        '</div>' +
        '<div class="card-botoes">';

    if (tipo === 'fazendo') {
        html += '<button class="btn-pronto" onclick="moverParaPronto(' + atv.id + ')">Pronto</button>';
        html += '<button class="btn-desconto" onclick="abrirDesconto(' + atv.id + ')">Desconto</button>';
    }
    html += '<button class="btn-excluir" onclick="excluir(\'' + tipo + '\',' + atv.id + ')">Excluir</button>';
    html += '</div>';
    return html;
}

function carregarFazendo() {
    var lista = document.getElementById('listaFazendo');
    var dados = JSON.parse(localStorage.getItem('fazendo') || '[]');
    lista.innerHTML = '';
    if (dados.length === 0) {
        lista.innerHTML = '<p class="vazio">Nenhuma atividade no momento.</p>';
        return;
    }
    dados.forEach(function (atv) {
        var card = document.createElement('div');
        card.className = 'atividade-card';
        if (atv.urgencia === 'Urgente') card.className += ' card-urgente';
        if (atv.urgencia === 'Muito Urgente') card.className += ' card-muito-urgente';
        card.innerHTML = criarCard(atv, 'fazendo');
        lista.appendChild(card);
    });
}

function carregarPronto() {
    var lista = document.getElementById('listaPronto');
    var dados = JSON.parse(localStorage.getItem('pronto') || '[]');
    lista.innerHTML = '';
    if (dados.length === 0) {
        lista.innerHTML = '<p class="vazio">Nenhuma atividade concluida.</p>';
        return;
    }
    dados.forEach(function (atv) {
        var card = document.createElement('div');
        card.className = 'atividade-card pronto';
        card.innerHTML = criarCard(atv, 'pronto');
        lista.appendChild(card);
    });
}

function moverParaPronto(id) {
    var fazendo = JSON.parse(localStorage.getItem('fazendo') || '[]');
    var pronto = JSON.parse(localStorage.getItem('pronto') || '[]');
    var index = fazendo.findIndex(function (a) { return a.id === id; });
    if (index === -1) return;
    var atv = fazendo[index];
    atv.dataConclusao = new Date().toLocaleDateString('pt-BR');
    pronto.push(atv);
    fazendo.splice(index, 1);
    localStorage.setItem('fazendo', JSON.stringify(fazendo));
    localStorage.setItem('pronto', JSON.stringify(pronto));
    carregarFazendo();
}

function excluir(tipo, id) {
    if (!confirm('Excluir esta atividade?')) return;
    var dados = JSON.parse(localStorage.getItem(tipo) || '[]');
    dados = dados.filter(function (a) { return a.id !== id; });
    localStorage.setItem(tipo, JSON.stringify(dados));
    if (tipo === 'fazendo') carregarFazendo();
    else carregarPronto();
}

var descontoIdAtual = null;

function abrirDesconto(id) {
    descontoIdAtual = id;
    document.getElementById('popupDesconto').style.display = 'flex';
    document.getElementById('valorDesconto').value = '';
}

function fecharDesconto() {
    document.getElementById('popupDesconto').style.display = 'none';
    descontoIdAtual = null;
}

function aplicarDesconto() {
    var porcento = parseFloat(document.getElementById('valorDesconto').value);
    if (!porcento || porcento <= 0 || porcento > 100) {
        alert('Digite um valor entre 1 e 100.');
        return;
    }
    var dados = JSON.parse(localStorage.getItem('fazendo') || '[]');
    var index = dados.findIndex(function (a) { return a.id === descontoIdAtual; });
    if (index === -1) return;
    var atv = dados[index];
    var precoAtual = parseFloat(atv.precoTotal.replace('R$:', '').replace('R$', '').replace(',', '.').trim());
    var precoNovo = (precoAtual * (1 - porcento / 100)).toFixed(2).replace('.', ',');
    atv.precoTotal = 'R$: ' + precoNovo;
    atv.desconto = porcento;
    dados[index] = atv;
    localStorage.setItem('fazendo', JSON.stringify(dados));
    fecharDesconto();
    carregarFazendo();
}