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


function runCommands(commands, callback) {
  if (!commands) { console.error('no command sequence provided')}
  
  // Run command[0] if its the last/only in the list invoke callback to deal with results
  const cmd = exec(commands[0], (error, stdout, stderr) => {
    if (error && commands.length === 1) { callback(error) }
    if (stderr && commands.length === 1) { callback(stderr) }
    if (stdout && commands.length === 1) { callback(stdout) }
  });

  // If we have more commands to run slice 0 of the front and start execution again
  cmd.on('close', (code) => {
    if (code === 0) {
      const newCommands = commands.slice(1)
      if (newCommands.length != 0) { runCommands(newCommands) } 
  }});

} 


function mutateStatus(message) {
  txtOutput.innerHTML = message + ','
}


function mutateDiscover(message) {
  txtListVM.innerHTML = message
}


function mpListAsObject(out) {
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

  let mp_list = []
  runCommands([`multipass list`], function(mp_list) {
    
    const mp_inventory = mpListAsObject(mp_list)
    
    let mp_list_string = ''
    mp_inventory.forEach((item, index) => {
      mp_list_string += `${item.name}(${item.ipv4})`
      if (index != mp_inventory.length -1 ) mp_list_string += `, ` 
    })
    
    let ansible_inventory = []
    mp_inventory.forEach((vm, index) => {
      ansible_inventory.push(`ubuntu@${vm.ipv4}`)
    })
    
    mutateDiscover(mp_list_string)
    mutateStatus(ansible_inventory)
  })
};


btnCreateVM.onclick = (e) => {
  const cmd =
    `multipass launch --disk 4G --mem 512m --cpus 1 --name ${txtCreateVM.value}`

  mutateStatus(`Please wait, while we run the command: ${cmd}`)
  mutateStatus(`Result: ${runCommands([cmd])}`)
};


btnSetupVM.onclick = (e) => {
  
  const mp_list = runCommands([`multipass list`])
  const mp_inventory = mpListAsObject(mp_list)  
  
  let cmdSequence = []  
  
  // Add Multipass commands for each machine that appears in the multipass list
  mp_inventory.forEach(vm => {
    cmdSequence.push(`multipass copy-files ~/.ssh/id_rsa.pub ${vm.name}:/home/ubuntu/.ssh/passible_key`)
    cmdSequence.push(`multipass exec ${vm.name} -- cp -n /home/ubuntu/.ssh/authorized_keys /home/ubuntu/.ssh/original_key`)
    cmdSequence.push(`multipass exec ${vm.name} -- cp /home/ubuntu/.ssh/original_key /home/ubuntu/.ssh/authorized_keys`)
    cmdSequence.push(`multipass exec ${vm.name} -- sed -i '$r /home/ubuntu/.ssh/passible_key' /home/ubuntu/.ssh/authorized_keys`)
  })

  // Add an ansible inventory
  let ansible_inventory = []
  mp_inventory.forEach(vm => {
    ansible_inventory.push(` ubuntu@${vm.ipv4}`)
  })

  // Setup hostnames across the inventory using ansible as the last command
  cmdSequence.push(`env ANSIBLE_HOST_KEY_CHECKING=false ansible-playbook -i '${ansible_inventory},' -e '{"ansible_python_interpreter":"/usr/bin/python3"}' ${__dirname + '/playbooks/hostnames.ansible'}`)

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