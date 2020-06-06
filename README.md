# passible
multiPass and ansIble in one handy tool: **passible**

---

## Install the dependencies and run
- npm install
- npm start

## Other requirements
- Install Multipass from [multipass.run](https://multipass.run) or `snap install multipass --classic`
- Install Ansible, using `brew`/`apt`/`yum`/`dnf`/`pacman`/`eopkg` etc

## Goals
1. [POC] Create VM's with Multipass / cloud-init **[done]**
1. [POC] Configure hostname access between VM's using Ansible **[done]**
1. [POC] Install mongodb using Ansible **[done]**
1. Make a nice GUI
1. Make ansible run via a VM / no-local-ansible mode (for windows mostly)
1. Make a cloud / minikube deploy option (Digital Ocean / AWS / Azure / GCP)

---

## Releases

### 0.2.0 - Unreleased
- Refactor code sequencing commands to make more reliable/resuable [done]
- Add typescript [done]
- Upgrade to Electron 9 [done]
- Add vue.js

### 0.1.0 - 24/5/2020
- Can create VM's
- Uses `multipass exec` to setup ssh access to these VM's
- Uses `multipass list` to discover machine state / IP addres
- Uses `ansible-playbook` to setup `/etc/hosts` access between VM's
- Configure button deploys a playbook to install MongoDB community to a named VM
- Delete button will delete and purge the named machine
- Known issue: Discover sometimes returns nothing on the first click, a second click returns expected result

### 0.0.1 - Initial POC code

