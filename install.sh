sudo apt update && sudo apt upgrade -y

sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

sudo tee /etc/apt/sources.list.d/docker.sources > /dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now 


# clone git repo
git clone https://github.com/mweigle/skiresordle.git
cd skiresordle

# transfer image
docker buildx build --platform linux/amd64 --tag skiresordle:latest --load .
docker save skiresordle:latest -o skiresordle.tar
scp ./skiresordle.tar root@YOUR_DROPLET_IP:/tmp/skiresordle.tar
# ... and then on the server
sudo docker load -i /tmp/skiresordle.tar

# make API requests without timeout
curl.exe --max-time 120 -X POST http://localhost:3000/api/

# TODO: 
# - DNS entry
# - SSL certificate
# - do not run docker as root!