const { remote } = require('electron');
const { dialog, Menu } = remote;

const clickMeBtn = document.getElementById('clickMe');

// ClickMeBtn increament fuction
let total = 0;
clickMeBtn.onclick = e => {
    total++
    clickMeBtn.innerText = `You clicked me ${total} times`
}