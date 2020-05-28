const { remote } = require("electron")
const { dialog, Menu } = remote
const { exec } = require("child_process")

const btnDiscoverVM = document.getElementById("btnDiscoverVM")
const btnSetupVM = document.getElementById("btnSetupVM")
const txtListVM = document.getElementById("txtListVM")
const btnCreateVM = document.getElementById("btnCreateVM")
const txtCreateVM = document.getElementById("txtCreateVM")
const btnConfigureVM = document.getElementById("btnConfigureVM")
const btnDeleteVM = document.getElementById("btnDeleteVM")
const txtOutput = document.getElementById("txtOutput")

var mp_list = ''
var mp_list_array = []
var mp_list_string = ''
var ansible_inventory = ''
var targetVM = {}


function mutateStatus(message) {
  txtOutput.innerHTML = ''
  txtOutput.innerHTML = message
}


function mutateDiscover(message) {
  txtListVM.innerHTML = ''
  txtListVM.innerHTML = message
}


function convertListToObject(out) {
  const txt_lines = out.split("\n")
  let data = []

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
  mp_list_array = data
}


btnDiscoverVM.onclick = (e) => {
  mp_list_string = ``
  ansible_inventory = ``
  console.log(`before: ${mp_list}`)
  runCommands([`multipass list`])
  console.log(`after: ${mp_list}`)
  convertListToObject(mp_list)

  mp_list_array.forEach((item, index) => {
    mp_list_string += ` ${item.name}(${item.ipv4}),`
  })

  ansible_inventory = []
  mp_list_array.forEach(vm => {
    ansible_inventory.push(` ubuntu@${vm.ipv4}`)
  })

  ansible_inventory += ','

  mutateDiscover(mp_list_string)
  mutateStatus(ansible_inventory)
};


btnCreateVM.onclick = (e) => {
  targetVM.name = txtCreateVM.value
  const createCmd =
    `multipass launch --disk 4G --mem 512m --cpus 1 --name ${targetVM.name}`

  mutateStatus(`Please wait, while we run the command: ${createCmd}`)
  const ssh = exec(createCmd, (error, stdout, stderr) => {
      if (error) mutateStatus(error)
      if (stderr) mutateStatus(stderr)
      if (stdout) mutateStatus(stdout)
  });

  ssh.on('exit', (code) => {
    console.log(`Completed: ${createCmd}`)
  })
};


function runCommands(commands) {
  if (!commands) { return 'no command sequence provided' }

  console.log(`Running: ${commands[0]}`)
  // Run command zero in the list
  const cmd = exec(commands[0], (error, stdout, stderr) => {
    if (error)  { console.log(`error: ${error}`) }
    if (stderr) { console.log(`stderr: ${stderr}`) }
    if (stdout) { console.log(`stdout: ${stdout}`) }
  });

  cmd.on('exit', (code) => {
    if (code === 0) {
      const newCommands = commands.slice(1)
      if (newCommands.length === 0) return 'done'
      runCommands(newCommands)
    }
  });
} // runCommands(commands)


btnSetupVM.onclick = (e) => {
  // Commands in sequential order that they need to be run
  let cmdSequence = [
    `multipass copy-files ~/.ssh/id_rsa.pub tse3:/home/ubuntu/.ssh/passible_key`,
    `multipass exec tse3 -- cp -n /home/ubuntu/.ssh/authorized_keys /home/ubuntu/.ssh/original_key`,
    `multipass exec tse3 -- cp /home/ubuntu/.ssh/original_key /home/ubuntu/.ssh/authorized_keys`,
    `multipass exec tse3 -- sed -i '$r /home/ubuntu/.ssh/passible_key' /home/ubuntu/.ssh/authorized_keys`,
    `env ANSIBLE_HOST_KEY_CHECKING=false ansible-playbook -i 'ubuntu@10.203.58.62,' -e '{"ansible_python_interpreter":"/usr/bin/python3"}' ${__dirname + '/playbooks/hostnames.ansible'}`
  ]

  const result = runCommands(cmdSequence)
  console.log(result)
}


function apHostnames() {
  const ENV = 'env ANSIBLE_HOST_KEY_CHECKING=false'
  const playbook = __dirname + '/playbooks/hostnames.ansible'
  const extras = '{"ansible_python_interpreter":"/usr/bin/python3"}'
  const cmd = `${ENV} ansible-playbook -i '${ansible_inventory}' -e ${extras} ${playbook}`

  mutateStatus(`Please wait, while we run the command: ${cmd}`)

  const ansible = exec(cmd, (error, stdout, stderr) => {
    if (error) mutateStatus(`error: ${error}`)
    if (stderr) mutateStatus(`stderr: ${stderr}`)
    if (stdout) mutateStatus(`stdout: ${stdout}`)
  });

  ansible.on('exit', (code) => {
    console.log(`ansible exit code: ${code}`)
  })
}


btnConfigureVM.onclick = (e) => {
  targetVM.name = txtCreateVM.value
  targetVM.ipv4 = mp_list_array.map(function(vm) {
    if( targetVM.name === vm.name) return vm.ipv4
    if( targetVM.name != vm.name) return '0.0.0.0'
  });
  targetVM.ipv4 = targetVM.ipv4.find(ip => ip != '0.0.0.0')

  const ENV = 'env ANSIBLE_HOST_KEY_CHECKING=false'
  const playbook = __dirname + '/playbooks/mongo-appdb.ansible'
  const extras = '{"ansible_python_interpreter":"/usr/bin/python3"}'
  const cmd = `${ENV} ansible-playbook -i 'ubuntu@${targetVM.ipv4},' -e ${extras} ${playbook}`

  mutateStatus(`Please wait, while we run the command: ${cmd}`)

  const ansible = exec(cmd, (error, stdout, stderr) => {
    if (error) mutateStatus(`error: ${error}`)
    if (stderr) mutateStatus(`stderr: ${stderr}`)
    if (stdout) mutateStatus(`stdout: ${stdout}`)
  });

  ansible.on('exit', (code) => {
    console.log(`ansible exit code: ${code}`)
  })
}


btnDeleteVM.onclick = (e) => {
  const deleteCmd = `multipass delete -p ${txtCreateVM.value}`

  const ssh = exec(deleteCmd, (error, stdout, stderr) => {
    if (error) mutateStatus(`error: ${error}`)
    if (stderr) mutateStatus(`stderr: ${stderr}`)
    if (stdout) mutateStatus(`stdout: ${stdout}`)
  });

  ssh.on('exit', (code) => {
    setTimeout(function(){ btnDiscoverVM.onclick(); }, 5000)
  })
}