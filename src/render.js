const { remote } = require("electron");
const { dialog, Menu } = remote;
const { exec } = require("child_process");

const btnDiscoverVM = document.getElementById("btnDiscoverVM");
const txtListVM = document.getElementById("txtListVM");

const btnCreateVM = document.getElementById("btnCreateVM");
const txtCreateVM = document.getElementById("txtCreateVM");
const btnConfigureVM = document.getElementById("btnConfigureVM");
const btnDeleteVM = document.getElementById("btnDeleteVM");
const txtOutput = document.getElementById("txtOutput");
let inventory = []
let targetVM = {}

function getAllVmInfo() {
  const list = "multipass list"
  exec(list, (error, stdout, stderr) => {
    if (error) return error;
    if (stderr) return stderr;

    const txt_lines = stdout.split("\n")
    let data = []
    
    txt_lines.forEach(line => {  
      line = line.replace(/\s+/g, ' ');  // trim multiple spaces
      line = line.split(" ")
      if ((line[0] != '' && line[0] != 'Name' && line[0] != "No")) {
        data.push({ 
          "name": line[0], 
          "state": line[1], 
          "ipv4": line[2], 
          "image": line[3]
        })
      }
    });
    inventory = data
  });
}  

btnDiscoverVM.onclick = (e) => {
   getAllVmInfo()
   txtListVM.innerHTML = "Discovered VMs: "
   inventory.forEach((item, index) => {   
     txtListVM.innerHTML += ` ${item.name},`
   })
};

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
  getAllVmInfo()
};

btnConfigureVM.onclick = (e) => {
  targetVM.name = txtCreateVM.value
  exec(`multipass copy-files ~/.ssh/id_rsa.pub ${targetVM.name}:/home/ubuntu/.ssh/authorized_keys`, (error, stdout, stderr) => {
    if (error) { console.log(error) }
    if (stderr) { console.log(stderr) }
    if (stdout) { console.log(stdout) }
  });

  const configCmd = `env ANSIBLE_HOST_KEY_CHECKING=false ansible all -i 'ubuntu@${targetVM.ipv4},' -m setup -b -e '{"ansible_python_interpreter":"/usr/bin/python3"}'`
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
  getAllVmInfo()
};
