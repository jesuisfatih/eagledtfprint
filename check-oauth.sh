#!/bin/bash
grep -i "OAUTH\|callback\|shopify/callback" /root/.pm2/logs/eagle-api-out.log | tail -10
echo "---ERRORS---"
grep -i "OAUTH\|callback\|shopify/callback" /root/.pm2/logs/eagle-api-error.log | tail -10
