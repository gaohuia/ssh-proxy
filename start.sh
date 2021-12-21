#!/bin/bash 

current_dir=$(cd $(dirname $0); pwd)
ts-node ${current_dir}/index.js "$1"
