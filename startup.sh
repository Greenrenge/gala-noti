#!/bin/sh

systemctl start gala-node
sleep 10
pm2 resurrect