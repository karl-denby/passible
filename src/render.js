var remote = require("electron").remote;
var dialog = remote.dialog, Menu = remote.Menu;
var exec = require("child_process").exec;
var btnDiscoverVM = document.getElementById("btnDiscoverVM");
var btnSetupVM = document.getElementById("btnSetupVM");
var btnCreateVM = document.getElementById("btnCreateVM");
var txtCreateVM = document.getElementById("txtCreateVM");
var btnConfigureVM = document.getElementById("btnConfigureVM");
var btnDeleteVM = document.getElementById("btnDeleteVM");
var txtOutput = document.getElementById("txtOutput");
var gMultiPassListArray = [];
var gAnsibleInventoryString = '';
function runCommands(commands, callback) {
    !commands
        ? console.error('no command sequence provided')
        : console.info("Running: " + commands[0]);
    var cmd = exec(commands[0], function (error, stdout, stderr) {
        if (error && commands.length === 1) {
            callback(error);
        }
        if (stderr && commands.length === 1) {
            callback(stderr);
        }
        if (stdout && commands.length === 1) {
            callback(stdout);
        }
    });
    cmd.on('close', function (code) {
        if (code === 0) {
            var newCommands = commands.slice(1);
            if (newCommands.length != 0) {
                runCommands(newCommands, callback);
            }
        }
    });
}
function mutateStatus(message) {
    txtOutput.innerHTML = message + ',';
}
function mutateDiscover(message) {
    document.getElementById("txtListVM").value = message;
}
function mutateAnsibleInventory(message) {
    gAnsibleInventoryString = message;
}
function mpListAsObject(out) {
    var txt_lines = out.split("\n");
    var data = [];
    txt_lines.forEach(function (line) {
        line = line.replace(/\s+/g, ' ');
        var lineComponents = line.split(" ");
        if ((lineComponents[0] != '' && lineComponents[0] != 'Name' && lineComponents[0] != "No")) {
            data.push({
                "name": lineComponents[0],
                "state": lineComponents[1],
                "ipv4": lineComponents[2],
                "image": lineComponents[3]
            });
        }
    });
    return (data);
}
btnDiscoverVM.onclick = function (e) {
    var mp_list = [];
    runCommands(["multipass list"], function (mp_list) {
        var mp_inventory = mpListAsObject(mp_list);
        var mp_list_string = '';
        mp_inventory.forEach(function (item, index) {
            mp_list_string += item.name + "(" + item.ipv4 + ")";
            if (index != mp_inventory.length - 1)
                mp_list_string += ", ";
        });
        var ansible_inventory = [];
        mp_inventory.forEach(function (vm, index) {
            ansible_inventory.push("ubuntu@" + vm.ipv4);
        });
        mutateDiscover(mp_list_string);
        mutateStatus(ansible_inventory.toString());
        mutateAnsibleInventory(ansible_inventory.join());
        gMultiPassListArray = mp_inventory;
    });
};
btnCreateVM.onclick = function (e) {
    var txtCreateVM = document.getElementById("txtCreateVM").value;
    var selProc = document.getElementById("selProc").value;
    var selMemory = document.getElementById("selMemory").value;
    var selDisk = document.getElementById("selDisk").value;
    var cmd = "multipass launch --disk " + selDisk + " --mem " + selMemory + " --cpus " + selProc + " --name " + txtCreateVM;
    mutateStatus("Please wait, while we run the command: " + cmd);
    runCommands([cmd], function (stdout) {
        mutateStatus("Result: " + stdout);
    });
};
btnSetupVM.onclick = function (e) {
    var mp_inventory = gMultiPassListArray;
    var cmdSequence = [];
    for (var _i = 0, mp_inventory_1 = mp_inventory; _i < mp_inventory_1.length; _i++) {
        var vm = mp_inventory_1[_i];
        cmdSequence.push("multipass copy-files ~/.ssh/id_rsa.pub " + vm.name + ":/home/ubuntu/.ssh/passible_key");
        cmdSequence.push("multipass exec " + vm.name + " -- cp -n /home/ubuntu/.ssh/authorized_keys /home/ubuntu/.ssh/original_key");
        cmdSequence.push("multipass exec " + vm.name + " -- cp /home/ubuntu/.ssh/original_key /home/ubuntu/.ssh/authorized_keys");
        cmdSequence.push("multipass exec " + vm.name + " -- sed -i '$r /home/ubuntu/.ssh/passible_key' /home/ubuntu/.ssh/authorized_keys");
    }
    var ansible_inventory = gAnsibleInventoryString;
    cmdSequence.push("env ANSIBLE_HOST_KEY_CHECKING=false ansible-playbook -i '" + ansible_inventory + ",' -e '{\"ansible_python_interpreter\":\"/usr/bin/python3\"}' " + (__dirname + '/playbooks/hostnames.yaml'));
    var result = runCommands(cmdSequence, function (stdout) {
        var ENV = "env ANSIBLE_HOST_KEY_CHECKING=false";
        var playbook = __dirname + "/playbooks/hostnames.yaml";
        var extras = "{\"ansible_python_interpreter\":\"/usr/bin/python3\"}";
        var cmd = ENV + " ansible-playbook -i '" + ansible_inventory + "' -e " + extras + " " + playbook;
        mutateStatus("Please wait, while we run the command: " + cmd);
        runCommands([cmd], function (output) {
            console.info('Hostnames configured via ansible');
        });
    });
};
btnConfigureVM.onclick = function (e) {
    var targetVM = {};
    var txtCreateVM = document.getElementById("txtCreateVM").value;
    var ansiblePlan = document.getElementById("selPlan").value;
    targetVM.name = txtCreateVM;
    targetVM.ipv4 = gMultiPassListArray.map(function (vm) {
        if (targetVM.name === vm.name)
            return vm.ipv4;
        if (targetVM.name != vm.name)
            return '0.0.0.0';
    });
    targetVM.ipv4 = targetVM.ipv4.find(function (ip) { return ip != '0.0.0.0'; });
    var ENV = "env ANSIBLE_HOST_KEY_CHECKING=false";
    var playbook = __dirname + "/playbooks/" + ansiblePlan;
    var extras = "{\"ansible_python_interpreter\":\"/usr/bin/python3\"}";
    var cmd = ENV + " ansible-playbook -i 'ubuntu@" + targetVM.ipv4 + ",' -e " + extras + " " + playbook;
    mutateStatus("Please wait, while we run the command: " + cmd);
    runCommands([cmd], function (output) {
        console.info("MongoDB installed via ansible on " + targetVM.name);
    });
};
btnDeleteVM.onclick = function (e) {
    var txtCreateVM = document.getElementById("txtCreateVM").value;
    var cmd = "multipass delete -p " + txtCreateVM;
    runCommands([cmd], function (stdout) {
        console.info("Deleted VM with the name: " + txtCreateVM);
    });
};
//# sourceMappingURL=render.js.map