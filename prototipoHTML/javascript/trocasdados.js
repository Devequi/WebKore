let select = document.getElementById("tipoConta")
let divData = document.getElementById("idataNasc")

select.addEventListener("change", () => {
    if(select.value == "tecnico"){
        divData.style.display = "none"
    }
    else {
        divData.style.display = "flex"
    }
});