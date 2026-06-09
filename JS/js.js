// ============================================================
//  js.js — Javascript principal unificado (Scanner + Relatório)
// ============================================================

// ---------- SCANNER DE QR CODE ----------

var streamAtivo = null;
var animFrameId = null;

function iniciarScanner() {
    var container = document.getElementById('scannerContainer');
    var btnIniciar = document.getElementById('btnIniciarScanner');
    var btnParar   = document.getElementById('btnPararScanner');
    var erroEl     = document.getElementById('erroScanner');

    if (erroEl) erroEl.style.display = 'none';

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        mostrarErro('Câmera não suportada neste navegador. Use a busca manual abaixo.');
        return;
    }

    navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
    }).then(function (stream) {
        streamAtivo = stream;
        var video = document.getElementById('videoScanner');
        if (video) {
            video.srcObject = stream;
            video.play();
        }

        if (container) container.style.display  = 'block';
        if (btnIniciar) btnIniciar.style.display = 'none';
        if (btnParar) btnParar.style.display   = 'inline-block';

        if (video) {
            video.addEventListener('loadedmetadata', function () {
                escanearFrames(video);
            });
        }
    }).catch(function (err) {
        var msg = 'Não foi possível acessar a câmera.';
        if (err.name === 'NotAllowedError') {
            msg = 'Permissão de câmera negada. Autorize nas configurações do seu navegador.';
        } else if (err.name === 'NotFoundError') {
            msg = 'Nenhuma câmera encontrada no dispositivo.';
        }
        mostrarErro(msg);
    });
}

function escanearFrames(video) {
    var canvas = document.getElementById('canvasScanner');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');

    function tick() {
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.height = video.videoHeight;
            canvas.width  = video.videoWidth;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            // Usando a biblioteca jsQR para decodificar
            if (typeof jsQR !== 'undefined') {
                var code = jsQR(imageData.data, imageData.width, imageData.height, {
                    inversionAttempts: 'dontInvert'
                });

                if (code && code.data) {
                    pararScanner();
                    processarQR(code.data);
                    return;
                }
            } else {
                console.error("jsQR library not loaded yet.");
            }
        }
        animFrameId = requestAnimationFrame(tick);
    }

    animFrameId = requestAnimationFrame(tick);
}

function pararScanner() {
    if (animFrameId) cancelAnimationFrame(animFrameId);
    if (streamAtivo) {
        streamAtivo.getTracks().forEach(function (t) { t.stop(); });
        streamAtivo = null;
    }
    var container  = document.getElementById('scannerContainer');
    var btnIniciar = document.getElementById('btnIniciarScanner');
    var btnParar   = document.getElementById('btnPararScanner');
    if (container)  container.style.display  = 'none';
    if (btnIniciar) btnIniciar.style.display = 'inline-block';
    if (btnParar)   btnParar.style.display   = 'none';
}

function processarQR(dados) {
    try {
        var obj = JSON.parse(dados);
        if (obj && obj.id) {
            window.location.href = 'Relatorio.html?id=' + obj.id;
            return;
        }
    } catch (e) { }

    var id = parseInt(dados.trim());
    if (!isNaN(id)) {
        window.location.href = 'Relatorio.html?id=' + id;
        return;
    }

    mostrarErro('QR Code não reconhecido. Conteúdo: ' + dados);
}

function buscarManual() {
    var inputManual = document.getElementById('inputManual');
    if (!inputManual) return;
    var input = inputManual.value.trim();
    if (!input) { 
        mostrarErro('Digite um ID para buscar.'); 
        return; 
    }

    try {
        var obj = JSON.parse(input);
        if (obj && obj.id) {
            window.location.href = 'Relatorio.html?id=' + obj.id;
            return;
        }
    } catch (e) { }

    var id = parseInt(input);
    if (!isNaN(id)) {
        window.location.href = 'Relatorio.html?id=' + id;
        return;
    }

    mostrarErro('ID inválido: ' + input);
}

function mostrarErro(msg) {
    var el = document.getElementById('erroScanner');
    if (el) {
        el.textContent = '⚠️ ' + msg;
        el.style.display = 'block';
    }
}

// ---------- PROCESSAMENTO DO RELATÓRIO ----------

function buscarAtividadePorId(id) {
    var fazendo = JSON.parse(localStorage.getItem('fazendo') || '[]');
    var pronto  = JSON.parse(localStorage.getItem('pronto')  || '[]');
    return fazendo.concat(pronto).find(function (a) { return a.id === id; }) || null;
}

function inicializarRelatorio() {
    var params = new URLSearchParams(window.location.search);
    var idParam = params.get('id');

    if (!idParam) {
        mostrarRelatorioVazio();
        return;
    }

    var id = parseInt(idParam);
    if (isNaN(id)) {
        mostrarRelatorioErro('ID inválido na URL.');
        return;
    }

    var atv = buscarAtividadePorId(id);
    if (!atv) {
        mostrarRelatorioErro('Nenhuma atividade encontrada com o ID: ' + id);
        return;
    }

    exibirRelatorioPage(atv);
}

function exibirRelatorioPage(atv) {
    var prontoLista = JSON.parse(localStorage.getItem('pronto') || '[]');
    var ehPronto = atv.dataConclusao || prontoLista.some(function (a) { return a.id === atv.id; });

    // Preencher títulos se existirem
    var rTitulo = document.getElementById('rTitulo');
    var rSubtitulo = document.getElementById('rSubtitulo');
    if (rTitulo) rTitulo.textContent = 'Relatório — ' + (atv.empresa || 'Empresa');
    if (rSubtitulo) rSubtitulo.textContent = (atv.servico || 'Serviço') + ' · ' + (ehPronto ? 'Concluído' : 'Em Andamento');

    // Preencher campos
    var rEmpresa = document.getElementById('rEmpresa');
    var rServico = document.getElementById('rServico');
    var rDataEntrega = document.getElementById('rDataEntrega');
    var rHoras = document.getElementById('rHoras');
    var rDesconto = document.getElementById('rDesconto');
    var rPreco = document.getElementById('rPreco');
    var rId = document.getElementById('rId');

    if (rEmpresa) rEmpresa.textContent = atv.empresa || '—';
    if (rServico) rServico.textContent = atv.servico || '—';
    if (rDataEntrega) {
        rDataEntrega.textContent = atv.dataEntrega
            ? atv.dataEntrega.split('-').reverse().join('/')
            : '—';
    }
    if (rHoras) rHoras.textContent = atv.horas ? atv.horas + 'h' : '—';
    if (rDesconto) rDesconto.textContent = atv.desconto ? atv.desconto + '%' : 'Sem desconto';
    if (rPreco) rPreco.textContent = atv.precoTotal || '—';
    if (rId) rId.textContent = atv.id || '—';

    // Urgência
    var urgEl = document.getElementById('rUrgencia');
    if (urgEl) {
        urgEl.textContent = atv.urgencia || 'Normal';
        if (atv.urgencia === 'Muito Urgente') urgEl.style.color = '#ff4444';
        else if (atv.urgencia === 'Urgente') urgEl.style.color = '#ff8800';
        else urgEl.style.color = '#2ecc71';
    }

    // Conclusão
    var itemConc = document.getElementById('itemConclusao');
    var rConclusao = document.getElementById('rConclusao');
    if (itemConc && rConclusao) {
        if (atv.dataConclusao) {
            itemConc.style.display = 'flex';
            rConclusao.textContent = atv.dataConclusao;
        } else {
            itemConc.style.display = 'none';
        }
    }

    // Badge de status
    var badge = document.getElementById('statusBadge');
    if (badge) {
        if (ehPronto) {
            badge.textContent = '✅ Concluído';
            badge.className   = 'status-badge status-concluido';
        } else {
            badge.textContent = '🔄 Em Andamento';
            badge.className   = 'status-badge status-em-andamento';
        }
    }

    // Gerar QR Code grande do relatório
    gerarQRCodeRelatorio(atv);

    // Exibir seções
    var estadoVazio = document.getElementById('estadoVazio');
    var estadoErro = document.getElementById('estadoErro');
    var secaoRelatorio = document.getElementById('secaoRelatorio');

    if (estadoVazio) estadoVazio.style.display = 'none';
    if (estadoErro) estadoErro.style.display = 'none';
    if (secaoRelatorio) secaoRelatorio.style.display = 'flex';
}

function gerarQRCodeRelatorio(atv) {
    var container = document.getElementById('qrCodeImagem');
    if (!container) return;
    container.innerHTML = '';
    
    var payload = JSON.stringify({ 
        id: atv.id, 
        empresa: atv.empresa, 
        servico: atv.servico, 
        precoTotal: atv.precoTotal 
    });

    try {
        if (typeof QRCode !== 'undefined') {
            new QRCode(container, {
                text: payload,
                width: 160,
                height: 160,
                colorDark: '#000000',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.M
            });
        } else {
            container.innerHTML = '<p style="color:#aaa;font-size:0.8rem;">Erro: biblioteca QRCode.js não carregada.</p>';
        }
    } catch (e) {
        container.innerHTML = '<p style="color:#aaa;font-size:0.8rem;">QR Code indisponível.</p>';
    }
}

function mostrarRelatorioVazio() {
    var estadoVazio = document.getElementById('estadoVazio');
    var estadoErro = document.getElementById('estadoErro');
    var secaoRelatorio = document.getElementById('secaoRelatorio');

    if (estadoVazio) estadoVazio.style.display = 'flex';
    if (estadoErro) estadoErro.style.display = 'none';
    if (secaoRelatorio) secaoRelatorio.style.display = 'none';
}

function mostrarRelatorioErro(msg) {
    var estadoVazio = document.getElementById('estadoVazio');
    var estadoErro = document.getElementById('estadoErro');
    var secaoRelatorio = document.getElementById('secaoRelatorio');
    var msgErro = document.getElementById('msgErro');

    if (estadoVazio) estadoVazio.style.display = 'none';
    if (estadoErro) estadoErro.style.display = 'flex';
    if (secaoRelatorio) secaoRelatorio.style.display = 'none';
    if (msgErro) msgErro.textContent = msg;
}

// ---------- INICIALIZAÇÃO ----------

document.addEventListener('DOMContentLoaded', function () {
    // Inicializa o relatório se os elementos correspondentes existirem (ou seja, se estiver na Relatorio.html)
    if (document.getElementById('secaoRelatorio')) {
        inicializarRelatorio();
    }
});