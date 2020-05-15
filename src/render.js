const { remote } = require("electron");
const { dialog, Menu } = remote;
const { exec } = require("child_process");

const btnCreateVM = document.getElementById("btnCreateVM");
const txtCreateVM = document.getElementById("txtCreateVM");
const btnConfigureVM = document.getElementById("btnConfigureVM");
const btnDeleteVM = document.getElementById("btnDeleteVM");
const txtOutput = document.getElementById("txtOutput");
var machine_list = "";

btnCreateVM.onclick = (e) => {
  console.log(txtCreateVM.value)
  const createCmd =
    `multipass launch --disk 8G --mem 512m --cpus 1 --name ${txtCreateVM.value}`;

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
    const listCmd = `multipass list`;

    exec(listCmd, (error, stdout, stderr) => {
      machine_list = stdout;
      console.log(machine_list)
    });
  });
};

// binConfigureVM increament fuction
btnConfigureVM.onclick = (e) => {
  const configCmd = `ansible all -i 'ubuntu@192.168.122.109,' -a "ufw status" -b`
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
