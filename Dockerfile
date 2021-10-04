# note: if you are using --userns-remap this will not work for you, 
# alternatively you can run a separate docker daemon without if you
# need to retain that functionality and want to to use this. 
# For more info: 
# https://docs.docker.com/engine/reference/commandline/dockerd/#run-multiple-daemons
#
# Quickstart instructions:
# - docker build -t follow -t follow:latest .
# - xhost +local:nobody
# - docker run -it -d --rm --network host follow:latest 

FROM       node:latest
ENV        DEBIAN_FRONTEND noninteractive
ENV        DISPLAY :0
RUN        apt-get update && apt-get -y install libxshmfence-dev  \
                                             libnss3-dev          \
                                             libatk-bridge2.0-dev \
                                             libdrm-dev           \
                                             libgtk-3-dev         \
                                             libasound-dev
ENV        HOME /home/iohzrd/persistent
COPY       . /home/iohzrd/follow
RUN        chown -R nobody:users /home/iohzrd
USER       nobody:users
WORKDIR    /home/iohzrd/follow
RUN        npm install
VOLUME     [ "/home/iohzrd/persistent" ]
CMD        /usr/local/bin/npx quasar dev -m electron -- --no-sandbox
