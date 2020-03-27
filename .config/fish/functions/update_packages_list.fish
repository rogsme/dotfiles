function update_packages_list
    rm -f ~/.aur-package-list && pacman -Qqem >> ~/.aur-package-list
    rm -f ~/.package-list && pacman -Qqen >> ~/.package-list
end
