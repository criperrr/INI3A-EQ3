#!/bin/bash
bash -c "cd ./src/backend && npm ci && exit"
bash -c "cd ./src/frontend && npm ci && exit"
