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
    // trim extra spaces, then split on space
    line = line.replace(/\s+/g, ' ');
    line = line.split(" ");

    // items 4,5,6 might exist but not needed for now
    if ((line[0] != '' && line[0] != 'Name' && line[0] != "No")) {
      data.push({
        "name": line[0],
        "state": line[1],
        "ipv4": line[2],
        "image": line[3]
      })
    }
  });
  return(data)
}


btnDiscoverVM.onclick = (e) => {

  const mp_list = runCommands([`multipass list`])
  const mp_inventory = convertListToObject(mp_list)

  let mp_list_string = ''
  mp_inventory.forEach((item, index) => {
    mp_list_string += ` ${item.name}(${item.ipv4}),`
  })

  let ansible_inventory = []
  mp_inventory.forEach(vm => {
    ansible_inventory.push(` ubuntu@${vm.ipv4}`)
  })

  if (ansible_inventory.length > 0) {
    ansible_inventory += ','
  }

  mutateDiscover(mp_list_string)
  mutateStatus(ansible_inventory)
};


btnCreateVM.onclick = (e) => {
  const cmd =
    `multipass launch --disk 4G --mem 512m --cpus 1 --name ${txtCreateVM.value}`

  mutateStatus(`Please wait, while we run the command: ${cmd}`)
  mutateStatus(`Result: ${runCommands([cmd])}`)
};


function runCommands(commands) {
  if (!commands) { return 'no command sequence provided' }

  let last_output = ''

  console.log(`Running: ${commands[0]}`)
  // Run command zero in the list
  const cmd = exec(commands[0], (error, stdout, stderr) => {
    if (error)  { last_output = error }
    if (stderr) { last_output = stderr }
    if (stdout) { last_output = stdout }
  });

  cmd.on('exit', (code) => {
    if (code === 0) {
      const newCommands = commands.slice(1)
      newCommands.length === 0 ? last_output : runCommands(newCommands)
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

  runCommands([cmd])
}


btnConfigureVM.onclick = (e) => {
  targetVM.name = txtCreateVM.value
  targetVM.ipv4 = mp_list_array.map((vm) => {
    if( targetVM.name === vm.name) return vm.ipv4
    if( targetVM.name != vm.name) return '0.0.0.0'
  });
  targetVM.ipv4 = targetVM.ipv4.find(ip => ip != '0.0.0.0')

  const ENV = 'env ANSIBLE_HOST_KEY_CHECKING=false'
  const playbook = __dirname + '/playbooks/mongo-appdb.ansible'
  const extras = '{"ansible_python_interpreter":"/usr/bin/python3"}'
  const cmd = `${ENV} ansible-playbook -i 'ubuntu@${targetVM.ipv4},' -e ${extras} ${playbook}`

  mutateStatus(`Please wait, while we run the command: ${cmd}`)
  runCommands([cmd])
}


btnDeleteVM.onclick = (e) => {
  const cmd = `multipass delete -p ${txtCreateVM.value}`
  runCommands([cmd])
}