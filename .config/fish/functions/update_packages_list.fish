function update_packages_list
    set distro (grep ^ID= /etc/os-release | cut -d= -f2)

    echo "Updating package lists for $distro"
    if test "$distro" = "manjaro" -o "$distro" = "arch"
        rm -f ~/.aur-package-list && pacman -Qqem >> ~/.aur-package-list
        rm -f ~/.package-list && pacman -Qqen >> ~/.package-list

    else if test "$distro" = "debian" -o "$distro" = "ubuntu"
        dpkg --get-selections | awk '{print $1}' > ~/.debian-package-list

    else
        echo "Unsupported distro: $distro"
    end
end
