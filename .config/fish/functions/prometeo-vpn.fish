function prometeo-vpn
         mullvad disconnect
         cd ~/.vpn
         sudo openvpn --config prometeo.ovpn
end
