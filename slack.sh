#!/bin/bash

source .env
curl -X POST \
  'https://slack.com/api/chat.postMessage' \
  -H "Authorization: Bearer $SLACK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "'"$1"'",
    "channel": "'"$SLACK_CHANNEL"'"
  }'
