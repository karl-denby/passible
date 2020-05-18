const { remote } = require("electron");
const { dialog, Menu } = remote;
const { exec } = require("child_process");

const btnCreateVM = document.getElementById("btnCreateVM");
const txtCreateVM = document.getElementById("txtCreateVM");
const btnConfigureVM = document.getElementById("btnConfigureVM");
const btnDeleteVM = document.getElementById("btnDeleteVM");
const txtOutput = document.getElementById("txtOutput");
let targetVM = {}

btnCreateVM.onclick = (e) => {
  targetVM.name = txtCreateVM.value
  const createCmd =
    `multipass launch --disk 8G --mem 512m --cpus 1 --name ${targetVM.name}`;

  txtOutput.innerHTML = `Please wait, while we run the command: ${createCmd}`;
  exec(createCmd, (error, stdout, stderr) => {
      if (error) { txtOutput.innerHTML = error }
      if (stderr) { txtOutput.innerHTML = stderr }
      if (stdout) { txtOutput.innerHTML = stdout }
  });

  // TODO - get ip for machines that has just been created and set it
  targetVM.ip = '192.168.64.8'
};

btnConfigureVM.onclick = (e) => {
  exec(`multipass copy-files ~/.ssh/id_rsa.pub ${txtCreateVM.value}:/home/ubuntu/.ssh/authorized_keys`, (error, stdout, stderr) => {
    if (error) { console.log(error) }
    if (stderr) { console.log(stderr) }
    if (stdout) { console.log(stdout) }
  });

  const configCmd = `env ANSIBLE_HOST_KEY_CHECKING=false ansible all -i 'ubuntu@${targetVM.ip},' -m setup -b -e '{"ansible_python_interpreter":"/usr/bin/python3"}'`
  txtOutput.innerHTML = `Please wait, while we run the command: ${configCmd}`;
  exec(configCmd, (error, stdout, stderr) => {
    if (error) { txtOutput.innerHTML = `error: ${error.message}` }
    if (stderr) { txtOutput.innerHTML = `stderr: ${stderr}` }
    txtOutput.innerHTML = `done: ${stdout}`;
  });

};

btnDeleteVM.onclick = (e) => {
  const deleteCmd = `multipass delete ${txtCreateVM.value} && multipass purge`;
  exec(deleteCmd, (error, stdout, stderr) => {
    if (error) { txtOutput.innerHTML = `error: ${error.message}` }
    if (stderr) { txtOutput.innerHTML = `stderr: ${stderr}` }
    txtOutput.innerHTML = `done: ${stdout}`;
  });
};
