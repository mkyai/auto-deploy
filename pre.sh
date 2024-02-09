#!/bin/bash

msg = "Deployment started :repeat_one:"


[-f./ slack.sh] && ./ slack.sh "$msg" ||
(curl https://raw.githubusercontent.com/mkyai/scripts/master/slack.sh -o slack.sh && 
chmod + x./ slack.sh && 
./ slack.sh "$msg")
