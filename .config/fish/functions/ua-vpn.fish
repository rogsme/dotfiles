function ua-vpn
         sudo wg-quick down wg0
         pritunl-client stop r1e5vfvldadchscs
         mullvad disconnect
         pritunl-client start r1e5vfvldadchscs
         pritunl-client list
end
