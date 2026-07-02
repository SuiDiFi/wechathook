@echo off
chcp 65001 >nul
setlocal

REM Hook 4.1.8.27 注入脚本 — 请先启动 wechathook gateway (pnpm start)

set "WECHAT=C:\Program Files\Tencent\weixin\Weixin.exe"
set "HOOK_DIR=D:\HOOK\HOOK 4.1.8.27\4.1.8.27"
set "DLL=%HOOK_DIR%\libGLESv1.dll"
set "INJECT=%HOOK_DIR%\x64 inject.exe"

set "CONFIG={\"recivemode\":\"http\",\"tcp_ip\":\"127.0.0.1\",\"tcp_port\":61108,\"http_server_port\":19088,\"http_callback_url\":\"http://127.0.0.1:8787/api/recvMsg\",\"usedefault\":false,\"start_server_while_login\":true}"

echo === WeChat Hook 4.1.8.27 注入 ===
echo 微信: %WECHAT%
echo DLL:  %DLL%
echo 回调: http://127.0.0.1:8787/api/recvMsg
echo.

if not exist "%WECHAT%" (
  echo [错误] 找不到微信: %WECHAT%
  exit /b 1
)
if not exist "%DLL%" (
  echo [错误] 找不到 DLL: %DLL%
  exit /b 1
)
if not exist "%INJECT%" (
  echo [错误] 找不到 inject: %INJECT%
  exit /b 1
)

cd /d "%HOOK_DIR%"
echo 正在注入，请以管理员身份运行本脚本...
"%INJECT%" "%WECHAT%" "%DLL%" "%CONFIG%"

pause
