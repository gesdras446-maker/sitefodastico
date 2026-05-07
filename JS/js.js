function abrirPopup(service, price) {
    document.getElementById("meuPopupe").style.display = "flex";
    document.getElementById('nomeAtividade').value = service;
    document.getElementById('valor').value = price;
}

function fechar() {
    document.getElementById("meuPopupe").style.display = "none";
}