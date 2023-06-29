function ua-vpn
         pritunl-client stop 11afcmf68bjxhyvl
         mullvad disconnect
         pritunl-client start 11afcmf68bjxhyvl
         pritunl-client list
end
