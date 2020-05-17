function update_all
    yay
    doom -d upgrade
    paccache -r
    sudo pacman -Rns (pacman -Qtdq)
end
