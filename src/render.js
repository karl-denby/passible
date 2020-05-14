const { remote } = require("electron");
const { dialog, Menu } = remote;
const { exec } = require("child_process");

const btnCreateVM = document.getElementById("btnCreateVM");
const btnConfigureVM = document.getElementById("btnConfigureVM");
const btnDeleteVM = document.getElementById("btnDeleteVM");
const txtOutput = document.getElementById("txtOutput");
let total = 0;

btnCreateVM.onclick = (e) => {
  const createCmd =
    "multipass launch --disk 6G --mem 512m --cpus 1 --name passible0";

  txtOutput.innerHTML = `Please wait, while we run the command: ${createCmd}`;
  exec(createCmd, (error, stdout, stderr) => {
    if (error) {
      txtOutput.innerHTML = `error: ${error.message}`;
      return;
    }
    if (stderr) {
      txtOutput.innerHTML = `stderr: ${stderr}`;
      return;
    }
    txtOutput.innerHTML = `done: ${stdout}`;
  });
};

// binConfigureVM increament fuction
btnConfigureVM.onclick = (e) => {
  configCmd = `ansible all -i 'ubuntu@192.168.122.109,' -a "ufw status" -b`
  txtOutput.innerHTML = `Please wait, while we run the command: ${configCmd}`;
  exec(configCmd, (error, stdout, stderr) => {
    if (error) {
      txtOutput.innerHTML = `error: ${error.message}`;
      return;
    }
    if (stderr) {
      txtOutput.innerHTML = `stderr: ${stderr}`;
      return;
    }
    txtOutput.innerHTML = `done: ${stdout}`;
  });
};

// binDeleteVM increament fuction
btnDeleteVM.onclick = (e) => {
  const deleteCmd = "multipass delete passible0 && multipass purge";
  exec(deleteCmd, (error, stdout, stderr) => {
    if (error) {
      txtOutput.innerHTML = `error: ${error.message}`;
      return;
    }
    if (stderr) {
      txtOutput.innerHTML = `stderr: ${stderr}`;
      return;
    }
    txtOutput.innerHTML = `done: ${stdout}`;
  });
};
