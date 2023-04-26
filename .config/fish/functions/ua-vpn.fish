function ua-vpn
         pritunl-client stop r1e5vfvldadchscs
         mullvad disconnect
         pritunl-client start r1e5vfvldadchscs
         pritunl-client list
end
