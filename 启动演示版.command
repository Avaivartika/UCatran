#!/bin/zsh
set -eu
project_dir="${0:A:h}"
app_binary="$project_dir/dist/mac-arm64/UCatran.app/Contents/MacOS/UCatran"
if [[ ! -x "$app_binary" ]]; then
  print '没有找到已打包的 UCatran 应用。'
  read '?按回车退出'
  exit 1
fi
export UCL_STUDY_DEMO=1
export UCL_STUDY_TEST_HOME="$HOME/Library/Application Support/UCL Study Demo"
exec "$app_binary"
