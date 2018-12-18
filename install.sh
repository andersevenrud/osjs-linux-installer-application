#!/bin/sh

$DISK=/dev/`node -p 'require("./install-data.json").disk.disk.name)'`
NEW_HOSTNAME=`node -p 'require("./install-data.json").personalization.hostname)'`

setup() {
  pacstrap /mnt base git nodejs npm git xorg-xinit xorg-server xorg-xdpyinfo xorg-xprop chromium python2 make gcc pulseaudio pulseaudio-alsa openssh networkmanager autofs sudo grub efibootmgr dosfstools os-prober mtools zsh
  echo "[Installer] pacstrapped rootfs of installation"
  genfstab -U /mnt >> /mnt/etc/fstab
  echo `node -p 'require("./install-data.json").personalization.hostname)'` >> /mnt/etc/hostname
  cat << EOF > /mnt/etc/hosts
  127.0.0.1 localhost
  ::1 localhost
  127.0.1.1 ${NEW_HOSTNAME}.localdomain ${NEW_HOSTNAME}
  EOF
  cp /usr/lib/os-release /mnt/usr/lib/os-release
  cp /etc/autofs/auto.misc /mnt/etc/autofs/auto.misc
  cp /etc/sudoers /mnt/etc/sudoers
  cp /etc/X11/xinit/xinitrc /mnt/etc/X11/xinit/xinitr
  cp /etc/skel /mnt/etc/ -r
  mkdir /mnt/etc/systemd/scripts
  mkdir /etc/systemd/system/getty@tty1.service.d
  cp /etc/systemd/scripts/choose-mirror /mnt/etc/systemd/scripts/choose-mirror
  cp /etc/systemd/system/pacman-init.service /mnt/etc/systemd/system/pacman-init.service
  cp /etc/systemd/system/choose-mirror.service /mnt/etc/systemd/system/choose-mirror.service
  cp /etc/systemd/system/getty@tty1.service.d/autologin.conf /mnt/etc/systemd/system/getty@tty1.service.d/autologin.conf
  cp /etc/polkit-1/rules.d/50-org.freedesktop.NetworkManager.rules /mnt/etc/polkit-1/rules.d/50-org.freedesktop.NetworkManager.rules
  if [ "`node -p 'Boolean(require("./install-data.json").disk.efi)'`" = "true" ]; then
    mount ${DISK}1 /mnt/boot/
  fi;
  cat << EOF | arch-chroot /mnt/
    mkinitcpio -p linux
    if [ "`node -p 'Boolean(require("./install-data.json").disk.efi)'`" = "true" ]; then \
      grub-install --target=x86_64-efi --bootloader-id=grub_uefi --recheck ${DISK} \
    else \
      grub-install --target=i386-pc --bootloader-id=grub_uefi --recheck ${DISK} \
    fi; \
    grub-mkconfig -o /boot/grub/grub.cfg
    curl -o- https://raw.githubusercontent.com/SpaceboyRoss01/osjs-linux/master/configs/osjs/airootfs/root/customize_airootfs.sh | bash
    su osjs -c "cd /opt/os.js && npm remove osjs-linux-installer-application && npm run package:discover"
  EOF
  umount /mnt
  echo "[Installer] finished installing"
}

if [ "`node -p 'Boolean(require("./install-data.json").disk.efi)'`" = "true" ]; then
  echo "[Installer] EFI boot enabled"
  sed -e 's/\s*\([\+0-9a-zA-Z]*\).*/\1/' << EOF | fdisk $DISK
    g # format the disk with GPT
    n # create new partition
    p # primary partition
    1 # partion number 1
      # default - start at beginning of disk
    +300M # create a 300mb size partition
    n # create new partition
    p # primary partition
    2 # partion number 2
      # default, start immediately after preceding partition
      # default, extend partition to end of disk
    a # make a partition bootable
    1 # bootable partition is partition 1
    t # change the partition type
    1 # first partition
    1 # EFI type
    p # print the in-memory partition table
    w # write the changes
    q # quit
  EOF
  echo "[Installer] Disk was successfully formated"
  mkfs.fat -F32 /dev/`node -p 'require("./install-data.json").disk.disk.name)'`1
  mkfs.ext2 /dev/`node -p 'require("./install-data.json").disk.disk.name)'`2
  echo "[Installer] Disk now has 1 FAT32 partition and 1 EXT2 partition"
  mount /dev/`node -p 'require("./install-data.json").disk.disk.name)'`2 /mnt/
  setup
else
  echo "[Installer] Legacy boot enabled"
  sed -e 's/\s*\([\+0-9a-zA-Z]*\).*/\1/' << EOF | fdisk `node -p 'require("./install-data.json").disk.disk.name)'`
    o # format the disk with MBR
    n # create new partition
    p # primary partition
    1 # partion number 1
      # default, start immediately after preceding partition
      # default, extend partition to end of disk
    w # write the changes
    q # quit
  EOF
  echo "[Installer] Disk was successfully formated"
  mkfs.ext2 /dev/`node -p 'require("./install-data.json").disk.disk.name)'`1
  echo "[Installer] Disk now has 1 EXT2 partition"
  mount /dev/`node -p 'require("./install-data.json").disk.disk.name)'`1 /mnt/
  setup
fi;
