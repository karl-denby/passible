const { remote } = require('electron');
const { dialog, Menu } = remote;

const btnCreateVM = document.getElementById('btnCreateVM');
const btnConfigureVM = document.getElementById('btnConfigureVM');
const btnDeleteVM = document.getElementById('btnDeleteVM');
let total = 0;

// binCreateVM increament fuction
btnCreateVM.onclick = e => {
    total++
    btnCreateVM.innerText = `You clicked me ${total} times`
}

// binConfigureVM increament fuction
btnConfigureVM.onclick = e => {
    total++
    btnConfigureVM.innerText = `You clicked me ${total} times`
}

// binDeleteVM increament fuction
btnDeleteVM.onclick = e => {
    total++
    btnDeleteVM.innerText = `You clicked me ${total} times`
}