# works only on ubuntu

first, you need to clone this repo by `git clone https://github.com/Greenrenge/gala-noti.git`, then ssh to your system as root and might clone it to `/root/gala-noti` (if you dont have git, install it via `sudo apt-get update` then  `sudo apt-get install git`)

1. install gala-node by the official's guide
2. install `node` by `apt install nodejs` command
3. install `npm` by `apt install npm` command
4. install `pm2` by `npm install pm2 -g` command
5. prepare the LINE NOTIFY TOKEN `https://www.smith.in.th/%E0%B8%AA%E0%B8%A3%E0%B9%89%E0%B8%B2%E0%B8%87-line-notify-%E0%B8%AA%E0%B8%B3%E0%B8%AB%E0%B8%A3%E0%B8%B1%E0%B8%9A-post-%E0%B8%A5%E0%B8%87%E0%B8%81%E0%B8%A5%E0%B8%B8%E0%B9%88%E0%B8%A1/`
6. try to make sure gala-node has been configured correctly by running `gala-node stats`
7. if everything is fine then go to the folder what you have cloned eg. by command `cd /root/gala-noti` then `npm i`
9. edit `pm2.ecosystem.config.js` file by replace the `<REPLACE YOUR TOKEN HERE>` by your token in 5), eg. `LINE_NOTIFY_TOKEN: "iqPof59w9MwmGOL5ByrYJWjQyXcxxxxi0Mo9P8HoJS",`
10. in the gala-noti folder, run `pm2 start pm2.ecosystem.config.js --name gala-noti`
11. run `pm2 save`
12. run `chmod +x ./startup.sh`
13. run `crontab -e` then select the tool you use to edit the file either `nano` or `vim` then put below line to the file

```
@reboot /root/gala-noti/startup.sh
```
