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
var inventory = [];
var targetVM = {};

function ansibleInventoryAll() {
  const multipass_list = getAllVmInfo()

  //return 'ubuntu@10.203.58.74,ubuntu@10.203.58.249,ubuntu@10.203.58.239,'
  let ansible_inventory = [];
  multipass_list.forEach(vm => {
    ansible_inventory.push(`ubuntu@${vm.ipv4},`)
  });
  return ansible_inventory;
}

function getAllVmInfo() {
  const list = "multipass list";
  let data = [];

  const run = exec(list, (error, stdout, stderr) => {
    if (error) return error;
    if (stderr) return stderr;

    const txt_lines = stdout.split("\n")

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
  })

  run.on('exit', (code) => {
    if (code === 0) {
      inventory = data
    } else {
      inventory = []
    }
  })
  return inventory;
};


btnDiscoverVM.onclick = (e) => {
  txtListVM.innerHTML = "Discovered VMs: ";
  getAllVmInfo();
  inventory.forEach((item, index) => {
    txtListVM.innerHTML += ` ${item.name}(${item.ipv4}),`
  })
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

  ssh.on('exit', (code) => {
    getAllVmInfo();
  })

};

btnConfigureVM.onclick = (e) => {
  targetVM.name = txtCreateVM.value;
  let local = getAllVmInfo()
  targetVM.ipv4 = local.find(vm => vm.name === targetVM.name).ipv4;

  const mp_copy = exec(`multipass copy-files ~/.ssh/id_rsa.pub ${targetVM.name}:/home/ubuntu/.ssh/new_key`, (error, stdout, stderr) => {
    if (error) { console.log(error) }
    if (stderr) { console.log(stderr) }
    if (stdout) { console.log(stdout) }
  });

  mp_copy.on('exit', (code) => {
    console.log(`Copy command finished with code: ${code}`)
  })
    
  const sed = exec(`multipass exec ${targetVM.name} -- sed -i '$r /home/ubuntu/.ssh/new_key' /home/ubuntu/.ssh/authorized_keys`, (error, stdout, stderr) => {
    if (error) { console.log(error) }
    if (stderr) { console.log(stderr) }
    
    sed.on('exit', (code) => {
      console.log(`sed command finished with code: ${code}`)
    })

    // We want to run this playbook via ansible command
    const ENV = 'env ANSIBLE_HOST_KEY_CHECKING=false';
    const playbook = __dirname + '/playbooks/hostnames.ansible';
    const inventory = ansibleInventoryAll();
    const extras = '{"ansible_python_interpreter":"/usr/bin/python3"}';
    const cmd = `${ENV} ansible-playbook -i ${inventory} -e ${extras} ${playbook}`;

    const configCmd = `env ANSIBLE_HOST_KEY_CHECKING=false ansible all -i 'ubuntu@${targetVM.ipv4},' -m setup -b -e '{"ansible_python_interpreter":"/usr/bin/python3"}'`
    txtOutput.innerHTML = `Please wait, while we run the command: ${cmd}`;

    const ansible = exec(cmd, (error, stdout, stderr) => {
      if (error) { txtOutput.innerHTML = `error: ${error}` }
      if (stderr) { txtOutput.innerHTML = `stderr: ${stderr}` }
      if (stdout) { txtOutput.innerHTML = `done: ${stdout}`; }
    });

    ansible.on('exit', (code) => {
      console.log(`ansible exit code: ${code}`);
    })
  })

};

btnDeleteVM.onclick = (e) => {
  const deleteCmd = `multipass delete -p ${txtCreateVM.value}`;
  const ssh = exec(deleteCmd, (error, stdout, stderr) => {
    if (error) { txtOutput.innerHTML = `error: ${error.message}` }
    if (stderr) { txtOutput.innerHTML = `stderr: ${stderr}` }
    if (stdout) { txtOutput.innerHTML = `done: ${stdout}`; }
  });

  ssh.on('exit', (code) => {
    getAllVmInfo();
  })
}