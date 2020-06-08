const { remote } = require("electron")
const { dialog, Menu } = remote
const { exec } = require("child_process")

// UI Elements
const btnDiscoverVM = document.getElementById("btnDiscoverVM")
const btnSetupVM = document.getElementById("btnSetupVM")
const txtListVM = document.getElementById("txtListVM")
const btnCreateVM = document.getElementById("btnCreateVM")
const txtCreateVM = document.getElementById("txtCreateVM")
const btnConfigureVM = document.getElementById("btnConfigureVM")
const btnDeleteVM = document.getElementById("btnDeleteVM")
const txtOutput = document.getElementById("txtOutput")

// Global State
let gMultiPassListArray: string[] = []
let gAnsibleInventoryString: string = ''

// --- --- --- Main --- --- ---
function runCommands(commands: string[], callback: any) {
  !commands ? console.error('no command sequence provided') : console.info(`Running: ${commands[0]}`)

  // Run command[0] if its the last/only in the list invoke callback to deal with results
  const cmd = exec(commands[0], (error: string, stdout: string, stderr: string) => {
    if (error && commands.length === 1) { callback(error) }
    if (stderr && commands.length === 1) { callback(stderr) }
    if (stdout && commands.length === 1) { callback(stdout) }
  });

  // If we have more commands to run, slice 0 of the front and start execution again
  cmd.on('close', (code: number) => {
    if (code === 0) {
      const newCommands = commands.slice(1)
      if (newCommands.length != 0) { runCommands(newCommands, callback) }
  }});

}


function mutateStatus(message: string) {
  txtOutput.innerHTML = message + ','
}

function mutateDiscover(message: string) {
  txtListVM.innerHTML = message
}


function mutateAnsibleInventory(message: string) {
  gAnsibleInventoryString = message
}


function mpListAsObject(out: string) {
  const txt_lines: string[] = out.split("\n")
  let data: object[] = []

  txt_lines.forEach(line => {
    // trim extra spaces, then split on space
    line = line.replace(/\s+/g, ' ');
    const lineComponents: string[] = line.split(" ");

    // items 4,5,6 might exist but not needed for now
    if ((lineComponents[0] != '' && lineComponents[0] != 'Name' && lineComponents[0] != "No")) {
      data.push({
        "name": lineComponents[0],
        "state": lineComponents[1],
        "ipv4": lineComponents[2],
        "image": lineComponents[3]
      })
    }
  });
  return(data)
}


btnDiscoverVM.onclick = (e) => {

  let mp_list = []
  runCommands([`multipass list`], function(mp_list: string) {
    const mp_inventory: any[] = mpListAsObject(mp_list)
    let mp_list_string: string = ''
    mp_inventory.forEach((item: any, index) => {
      mp_list_string += `${item.name}(${item.ipv4})`
      if (index != mp_inventory.length -1 ) mp_list_string += `, `
    })

    let ansible_inventory: string[] = []
    mp_inventory.forEach((vm: any, index) => {
      ansible_inventory.push(`ubuntu@${vm.ipv4}`)
    })

    mutateDiscover(mp_list_string)
    mutateStatus(ansible_inventory.toString())
    mutateAnsibleInventory(ansible_inventory.join())
    gMultiPassListArray = mp_inventory
  })
};


btnCreateVM.onclick = (e) => {

  const txtCreateVM = (document.getElementById("txtCreateVM") as HTMLInputElement).value
  const selMemory = (document.getElementById("selMemory") as HTMLInputElement).value

  const cmd =
    `multipass launch --disk 4G --mem ${selMemory} --cpus 1 --name ${txtCreateVM}`

  mutateStatus(`Please wait, while we run the command: ${cmd}`)
  runCommands([cmd], function(stdout: string ) {
    mutateStatus(`Result: ${stdout}`)
  })
};


btnSetupVM.onclick = (e) => {
  interface VirtualMachine {
    name?: string;
    ipv4?: string;
  }
  const mp_inventory: any = gMultiPassListArray
  let cmdSequence = []

  // Add Multipass commands for each machine that appears in the multipass list
  for (let vm of mp_inventory) {
    cmdSequence.push(`multipass copy-files ~/.ssh/id_rsa.pub ${vm.name}:/home/ubuntu/.ssh/passible_key`)
    cmdSequence.push(`multipass exec ${vm.name} -- cp -n /home/ubuntu/.ssh/authorized_keys /home/ubuntu/.ssh/original_key`)
    cmdSequence.push(`multipass exec ${vm.name} -- cp /home/ubuntu/.ssh/original_key /home/ubuntu/.ssh/authorized_keys`)
    cmdSequence.push(`multipass exec ${vm.name} -- sed -i '$r /home/ubuntu/.ssh/passible_key' /home/ubuntu/.ssh/authorized_keys`)
  }

  // Add an ansible inventory
  let ansible_inventory = gAnsibleInventoryString

  // Setup hostnames across the inventory using ansible as the last command
  cmdSequence.push(`env ANSIBLE_HOST_KEY_CHECKING=false ansible-playbook -i '${ansible_inventory},' -e '{"ansible_python_interpreter":"/usr/bin/python3"}' ${__dirname + '/playbooks/hostnames.ansible'}`)

  const result = runCommands(cmdSequence, function(stdout: string) {
    const ENV = 'env ANSIBLE_HOST_KEY_CHECKING=false'
    const playbook = __dirname + '/playbooks/hostnames.ansible'
    const extras = '{"ansible_python_interpreter":"/usr/bin/python3"}'
    const cmd = `${ENV} ansible-playbook -i '${ansible_inventory}' -e ${extras} ${playbook}`

    mutateStatus(`Please wait, while we run the command: ${cmd}`)
    runCommands([cmd], function(output: string) {
      console.info('Hostnames configured via ansible')
    })
  })

}


btnConfigureVM.onclick = (e) => {
  interface VirtualMachine {
    name?: string;
    ipv4?: string;
  }

  let targetVM: any = {}
  const txtCreateVM = (document.getElementById("txtCreateVM") as HTMLInputElement).value

  targetVM.name = txtCreateVM
  targetVM.ipv4 = gMultiPassListArray.map((vm: any) => {
    if( targetVM.name === vm.name) return vm.ipv4 as string
    if( targetVM.name != vm.name) return '0.0.0.0'
  });
  targetVM.ipv4 = targetVM.ipv4.find((ip: string) => ip != '0.0.0.0')

  const ENV = 'env ANSIBLE_HOST_KEY_CHECKING=false'
  const playbook = __dirname + '/playbooks/mongo-appdb.ansible'
  const extras = '{"ansible_python_interpreter":"/usr/bin/python3"}'
  const cmd = `${ENV} ansible-playbook -i 'ubuntu@${targetVM.ipv4},' -e ${extras} ${playbook}`

  mutateStatus(`Please wait, while we run the command: ${cmd}`)
  runCommands([cmd], function(output: string) {
    console.info(`MongoDB installed via ansible on ${targetVM.name}`)
  })
}


btnDeleteVM.onclick = (e) => {
  const txtCreateVM = (document.getElementById("txtCreateVM") as HTMLInputElement).value
  const cmd = `multipass delete -p ${txtCreateVM}`
  runCommands([cmd], function(stdout: string) {
    console.info(`Deleted VM with the name: ${txtCreateVM}`)
  })
}