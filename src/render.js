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

var mp_list = '';
var mp_list_array = [];
var mp_list_string = '';
var ansible_inventory = '';

var targetVM = {};

function ansibleInventoryAll() {
  const multipass_list = getAllVmInfo()

  let ansible_inventory = [];
  multipass_list.forEach(vm => {
    ansible_inventory.push(`ubuntu@${vm.ipv4},`)
  });
  return ansible_inventory;
}

function multipassList() {
  const cmd = "multipass list";
  let inventory = '';
  
  const multipass_list = exec(cmd, (error, stdout, stderr) => {
    if (error) mutateDiscover(error);
    if (stderr) mutateDiscover(stderr);
    if (stdout) mp_list = stdout;
  })
};

function mutateStatus(message) {
  txtOutput.innerHTML = '';
  txtOutput.innerHTML = message;
}

function mutateDiscover(message) {
  txtListVM.innerHTML = '';
  txtListVM.innerHTML = message;
}

function convertListToObject(out) {
  const txt_lines = out.split("\n")
  let data = [];

  txt_lines.forEach(line => {
    line = line.replace(/\s+/g, ' ');  // trim multiple spaces
    line = line.split(" ");
    if ((line[0] != '' && line[0] != 'Name' && line[0] != "No")) {
      data.push({
        "name": line[0],
        "state": line[1],
        "ipv4": line[2],
        "image": line[3]
      })
    }
  });
  mp_list_array = data;
}

btnDiscoverVM.onclick = (e) => {
  mp_list_string = ``;  
  ansible_inventory = ``;
  multipassList();
  convertListToObject(mp_list);
  mp_list_array.forEach((item, index) => {
    mp_list_string += ` ${item.name}(${item.ipv4}),`
  })

  ansible_inventory = [];
  mp_list_array.forEach(vm => {
    ansible_inventory.push(` ubuntu@${vm.ipv4}`)
  });
  ansible_inventory += ','
  mutateDiscover(mp_list_string);
  mutateStatus(ansible_inventory);
};


btnCreateVM.onclick = (e) => {
  targetVM.name = txtCreateVM.value;
  const createCmd =
    `multipass launch --disk 8G --mem 512m --cpus 1 --name ${targetVM.name}`;

  txtOutput.innerHTML = `Please wait, while we run the command: ${createCmd}`;
  const ssh = exec(createCmd, (error, stdout, stderr) => {
      if (error) { txtOutput.innerHTML = error }
      if (stderr) { txtOutput.innerHTML = stderr }
      if (stdout) { txtOutput.innerHTML = stdout }
  });
};

btnConfigureVM.onclick = (e) => {
  mpCopySshKey()
}

function mpCopySshKey(){
  targetVM.name = txtCreateVM.value;
  targetVM.ipv4 = mp_list_array.find(vm => vm.name === targetVM.name).ipv4;

  const cmd = `multipass copy-files ~/.ssh/id_rsa.pub ${targetVM.name}:/home/ubuntu/.ssh/new_key`;
  console.log(cmd);
  const mp_copy = exec(cmd, (error, stdout, stderr) => {
    if (error) { txtOutput.innerHTML = `error: ${error}` }
    if (stderr) { txtOutput.innerHTML = `stderr: ${stderr}` }
    if (stdout) { txtOutput.innerHTML = `stdout: ${stdout}` }
  })

  mp_copy.on('exit', (code) => {
    console.log(`Copy command finished with code: ${code}`)
    mpModifyAuthorizeKeys()
  })
}

function mpModifyAuthorizeKeys(){
  targetVM.name = txtCreateVM.value;
  targetVM.ipv4 = mp_list_array.find(vm => vm.name === targetVM.name).ipv4;
  const sed = exec(`multipass exec ${targetVM.name} -- sed -i '$r /home/ubuntu/.ssh/new_key' /home/ubuntu/.ssh/authorized_keys`, (error, stdout, stderr) => {
    if (error) { txtOutput.innerHTML = `error: ${error}` }
    if (stderr) { txtOutput.innerHTML = `stderr: ${stderr}` }
    if (stdout) { txtOutput.innerHTML = `stdout: ${stdout}` }
  })
    
  sed.on('exit', (code) => {
      console.log(`sed command finished with code: ${code}`)
      apHostnames()
  })
}

function apHostnames() {
// We want to run this playbook via ansible command
    const ENV = 'env ANSIBLE_HOST_KEY_CHECKING=false';
    const playbook = __dirname + '/playbooks/hostnames.ansible';
    const extras = '{"ansible_python_interpreter":"/usr/bin/python3"}';
    const cmd = `${ENV} ansible-playbook -i '${ansible_inventory}' -e ${extras} ${playbook}`;
    txtOutput.innerHTML = `Please wait, while we run the command: ${cmd}`;
    
    const ansible = exec(cmd, (error, stdout, stderr) => {
      if (error) { txtOutput.innerHTML = `error: ${error}` }
      if (stderr) { txtOutput.innerHTML = `stderr: ${stderr}` }
      if (stdout) { txtOutput.innerHTML = `stdout: ${stdout}`; }
    });
    
    ansible.on('exit', (code) => {
      console.log(`ansible exit code: ${code}`);
    })
}

btnDeleteVM.onclick = (e) => {
  const deleteCmd = `multipass delete -p ${txtCreateVM.value}`;
  const ssh = exec(deleteCmd, (error, stdout, stderr) => {
    if (error) { txtOutput.innerHTML = `error: ${error.message}` }
    if (stderr) { txtOutput.innerHTML = `stderr: ${stderr}` }
    if (stdout) { txtOutput.innerHTML = `done: ${stdout}`; }
  });

  ssh.on('exit', (code) => {
    btnDiscoverVM.onclick();
  })
}