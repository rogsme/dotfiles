function prometeo-vpn
         sudo wg-quick down wg0 
         mullvad disconnect
         sudo wg-quick up wg0 
end
