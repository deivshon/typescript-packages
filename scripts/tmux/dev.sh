#!/bin/sh

tmux new-session -d -s deivshon/*

tmux split-window -h
tmux split-window -v -t 0

sleep 0.1

tmux send-keys -t 0 'pnpm dev:packages' C-m
tmux send-keys -t 1 'pnpm typecheck:packages:watch' 

tmux select-pane -t 1
tmux attach -t deivshon/*
