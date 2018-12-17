const cfg = require('./install-data.json');
const child_process = require('child_process');
const fs = require('fs-extra');

child_process.execSync('timedatectl set-ntp true');

child_process.execSync('fdisk /dev/'+cfg.disk.disk.name,{
  input: Buffer.from((cfg.disk.efi ? 'g' : 'o')+'\n'+(cfg.disk.efi ? 'n\np\n1\n2048\n+300M\nt\n1\na\n' : '')+'n\np\n1\n\n\nw\n')
});

if(cfg.disk.efi) child_process.execSync('mkfs.fat','-F32 /dev/'+cfg.disk.disk.name+(cfg.disk.efi ? 2 : 1));
child_process.execSync('mkfs.ext4 /dev/'+cfg.disk.disk.name+(cfg.disk.efi ? 2 : 1));

child_process.execSync('mount /dev/'+cfg.disk.disk.name+(cfg.disk.efi ? 2 : 1)+' /mnt');
child_process.execSync('pacstrap /mnt base git nodejs npm git xorg-xinit xorg-server xorg-xdpyinfo xorg-xprop chromium python2 make gcc pulseaudio pulseaudio-alsa openssh networkmanager autofs sudo grub efibootmgr dosfstools os-prober mtools');
child_process.spawnSync('genfstab',['-U','/mnt']).pipe(fs.createWriteStream('/mnt/etc/fstab'));

fs.writeFileSync('/mnt/etc/hostname',cfg.personalization.hostname);
fs.writeFileSync('/mnt/etc/hosts',[
  '127.0.0.1 localhost',
  '::1       localhost',
  '127.0.1.1 '+cfg.personalization.hostname+'.localdomain '+cfg.personalization.hostname
].join('\n'));

if(cfg.disk.efi) fs.mkdirSync('/mnt/boot/EFI');

fs.copySync('/usr/lib/os-release','/mnt/usr/lib/os-release');
fs.copySync('/etc/autofs/os-release','/mnt/etc/autofs/auto.misc');
fs.copySync('/etc/skel','/mnt/etc/skel');
fs.copySync('/etc/sudoers','/mnt/etc/sudoers');
fs.copySync('/etc/X11/xinit/xinitrc','/mnt/etc/X11/xinit/xinitrc');

child_process.execSync('arch-chroot',['/mnt'],{
  input: Buffer.from('mkinitcpio -p linux\n'+(cfg.disk.efi ? 'mount /dev/'+cfg.disk.disk.name+'1 /boot/EFI\n' : '')+'grub-install --target=x86_64-efi  --bootloader-id=grub_uefi --recheck\ngrub-mkconfig -o /boot/grub/grub.cfg\ncurl -o- https://github.com/SpaceboyRoss01/osjs-linux/raw/master/configs/osjs/airootfs/root/customize_airootfs.sh | bash\n')
});
