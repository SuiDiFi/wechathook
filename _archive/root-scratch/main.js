// ==================== 最早期日志系统（在所有模块加载之前） ====================
const fs = require('fs');
const path = require('path');

// 设置控制台输出编码为 UTF-8（解决中文乱码问题）
// 注意：在 Windows 上，需要在启动前运行 chcp 65001，或者使用支持 UTF-8 的终端
// 如果仍然乱码，请在 VSCode 终端中先运行: chcp 65001

// 早期日志目录（在 app.isPackaged 可用之前使用 process.execPath）
const EARLY_LOG_DIR = path.join(path.dirname(process.execPath), 'logs');

// 确保早期日志目录存在
try {
  if (!fs.existsSync(EARLY_LOG_DIR)) {
    fs.mkdirSync(EARLY_LOG_DIR, { recursive: true });
  }
} catch (e) {
  // 尝试在当前目录创建
  try {
    const altLogDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(altLogDir)) {
      fs.mkdirSync(altLogDir, { recursive: true });
    }
  } catch (e2) {
    // 忽略
  }
}

// 早期日志写入函数
function writeEarlyLog(level, message) {
  try {
    const date = new Date();
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    // 尝试多个日志目录
    const logDirs = [
      EARLY_LOG_DIR,
      path.join(process.cwd(), 'logs'),
      path.join(__dirname, 'logs')
    ];
    
    const timestamp = date.toISOString();
    const logLine = `[${timestamp}] [${level}] ${message}\n`;
    
    for (const logDir of logDirs) {
      try {
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true });
        }
        const logFile = path.join(logDir, `debug_${dateStr}.log`);
        fs.appendFileSync(logFile, logLine, 'utf8');
        return; // 写入成功，退出
      } catch (e) {
        // 尝试下一个目录
      }
    }
  } catch (e) {
    // 忽略写入错误
  }
}

// 立即记录启动时间（在任何模块加载之前）
writeEarlyLog('INFO', '==========================================');
writeEarlyLog('INFO', '========== 应用进程启动 ==========');
writeEarlyLog('INFO', '==========================================');
writeEarlyLog('INFO', `启动时间: ${new Date().toLocaleString()}`);
writeEarlyLog('INFO', `process.execPath: ${process.execPath}`);
writeEarlyLog('INFO', `process.argv: ${JSON.stringify(process.argv)}`);
writeEarlyLog('INFO', `process.cwd(): ${process.cwd()}`);
writeEarlyLog('INFO', `__dirname: ${__dirname}`);
writeEarlyLog('INFO', `process.platform: ${process.platform}`);
writeEarlyLog('INFO', `process.arch: ${process.arch}`);
writeEarlyLog('INFO', `process.version: ${process.version}`);
writeEarlyLog('INFO', `process.versions: ${JSON.stringify(process.versions)}`);

// 全局未捕获异常处理（最早设置）
process.on('uncaughtException', (error) => {
  const errorMsg = `未捕获异常: ${error.message}\n堆栈: ${error.stack}`;
  writeEarlyLog('FATAL', errorMsg);
  writeEarlyLog('FATAL', `错误名称: ${error.name}`);
  writeEarlyLog('FATAL', `错误代码: ${error.code || 'N/A'}`);
  console.error('[FATAL] 未捕获异常:', error);
});

// 全局未处理的 Promise 拒绝（最早设置）
process.on('unhandledRejection', (reason, promise) => {
  const errorMsg = `未处理的Promise拒绝: ${reason}\n${reason instanceof Error ? reason.stack : ''}`;
  writeEarlyLog('ERROR', errorMsg);
  console.error('[ERROR] 未处理的Promise拒绝:', reason);
});

writeEarlyLog('INFO', '早期错误处理器已设置');

// ==================== 禁用硬件加速（解决GPU崩溃问题） ====================
writeEarlyLog('INFO', '禁用硬件加速以避免GPU进程崩溃...');

// 注意：必须在 require('electron') 之前调用
// 由于这里已经在顶部require了，我们需要在 app.whenReady() 之前禁用

// ==================== 开始加载模块 ====================
writeEarlyLog('INFO', '开始加载 Electron 模块...');

let app, BrowserWindow, ipcMain, dialog, Tray, Menu, nativeImage;
try {
  const electron = require('electron');
  app = electron.app;
  BrowserWindow = electron.BrowserWindow;
  ipcMain = electron.ipcMain;
  dialog = electron.dialog;
  Tray = electron.Tray;
  Menu = electron.Menu;
  nativeImage = electron.nativeImage;
  
  // 禁用硬件加速（解决GPU进程崩溃问题）
  app.disableHardwareAcceleration();
  writeEarlyLog('INFO', '硬件加速已禁用');
  
  writeEarlyLog('INFO', 'Electron 模块加载成功');
} catch (e) {
  writeEarlyLog('FATAL', `Electron 模块加载失败: ${e.message}\n${e.stack}`);
  process.exit(1);
}

writeEarlyLog('INFO', '开始加载其他模块...');

let spawn, execSync, iconv, http, https, io;
try {
  const childProcess = require('child_process');
  spawn = childProcess.spawn;
  execSync = childProcess.execSync;
  writeEarlyLog('INFO', 'child_process 模块加载成功');
} catch (e) {
  writeEarlyLog('FATAL', `child_process 模块加载失败: ${e.message}`);
}

try {
  iconv = require('iconv-lite');
  writeEarlyLog('INFO', 'iconv-lite 模块加载成功');
} catch (e) {
  writeEarlyLog('ERROR', `iconv-lite 模块加载失败: ${e.message}`);
}

try {
  http = require('http');
  writeEarlyLog('INFO', 'http 模块加载成功');
} catch (e) {
  writeEarlyLog('FATAL', `http 模块加载失败: ${e.message}`);
}

try {
  https = require('https');
  writeEarlyLog('INFO', 'https 模块加载成功');
} catch (e) {
  writeEarlyLog('FATAL', `https 模块加载失败: ${e.message}`);
}

try {
  const socketIO = require('socket.io-client');
  io = socketIO.io;
  writeEarlyLog('INFO', 'socket.io-client 模块加载成功');
} catch (e) {
  writeEarlyLog('ERROR', `socket.io-client 模块加载失败: ${e.message}`);
}

writeEarlyLog('INFO', '所有模块加载完成');

// ==================== 启动阶段错误捕获（Electron 级别） ====================

// 全局未捕获异常处理
process.on('uncaughtException', (error) => {
  const errorMsg = `未捕获异常: ${error.message}\n堆栈: ${error.stack}`;
  writeEarlyLog('FATAL', errorMsg);
  console.error('[FATAL] 未捕获异常:', error);
  
  // 尝试显示错误对话框（如果 app 已就绪）
  if (app.isReady()) {
    dialog.showErrorBox('程序错误', `发生未捕获的异常:\n\n${error.message}\n\n详细信息已保存到日志文件。`);
  }
});

// 全局未处理的 Promise 拒绝
process.on('unhandledRejection', (reason, promise) => {
  const errorMsg = `未处理的Promise拒绝: ${reason}\n${reason instanceof Error ? reason.stack : ''}`;
  writeEarlyLog('ERROR', errorMsg);
  console.error('[ERROR] 未处理的Promise拒绝:', reason);
});

// 捕获 Electron 渲染进程崩溃
app.on('render-process-gone', (event, webContents, details) => {
  const errorMsg = `渲染进程崩溃: reason=${details.reason}, exitCode=${details.exitCode}`;
  writeEarlyLog('FATAL', errorMsg);
  console.error('[FATAL] 渲染进程崩溃:', details);
});

// 捕获 GPU 进程崩溃
app.on('child-process-gone', (event, details) => {
  const errorMsg = `子进程崩溃: type=${details.type}, reason=${details.reason}, exitCode=${details.exitCode}`;
  writeEarlyLog('ERROR', errorMsg);
  console.error('[ERROR] 子进程崩溃:', details);
});

writeEarlyLog('INFO', '全局错误捕获已设置');

// ==================== 调试日志模块 ====================
// 日志文件路径（在应用目录下创建 logs 文件夹）
const LOG_DIR = app.isPackaged 
  ? path.join(path.dirname(process.execPath), 'logs')
  : path.join(__dirname, 'logs');

// 确保日志目录存在
function ensureLogDir() {
  try {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
  } catch (e) {
    console.error('创建日志目录失败:', e.message);
  }
}

// 获取当前日志文件路径（按日期分文件）
function getLogFilePath() {
  const date = new Date();
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return path.join(LOG_DIR, `debug_${dateStr}.log`);
}

// 写入日志到文件（受日志开关控制）
function writeLogToFile(level, ...args) {
  // 如果日志开关关闭，不写入文件
  if (!LOG_ENABLED) {
    return;
  }
  
  try {
    ensureLogDir();
    const timestamp = new Date().toISOString();
    const message = args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch (e) {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');
    
    const logLine = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
    const logFile = getLogFilePath();
    
    fs.appendFileSync(logFile, logLine, 'utf8');
  } catch (e) {
    // 写入日志失败时不抛出错误，避免影响主程序
  }
}

// 封装的日志函数
const debugLog = {
  info: (...args) => {
    console.log(...args);
    writeLogToFile('INFO', ...args);
  },
  warn: (...args) => {
    console.warn(...args);
    writeLogToFile('WARN', ...args);
  },
  error: (...args) => {
    console.error(...args);
    writeLogToFile('ERROR', ...args);
  },
  debug: (...args) => {
    console.log('[DEBUG]', ...args);
    writeLogToFile('DEBUG', ...args);
  },
  // 专门用于记录网络请求/响应
  network: (direction, data) => {
    const prefix = direction === 'in' ? '<< 收到' : '>>> 发送';
    console.log(prefix, data);
    writeLogToFile('NETWORK', prefix, data);
  }
};

// 清理旧日志文件（保留最近7天）
function cleanOldLogs() {
  try {
    ensureLogDir();
    const files = fs.readdirSync(LOG_DIR);
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7天
    
    files.forEach(file => {
      if (file.startsWith('debug_') && file.endsWith('.log')) {
        const filePath = path.join(LOG_DIR, file);
        const stat = fs.statSync(filePath);
        if (now - stat.mtime.getTime() > maxAge) {
          fs.unlinkSync(filePath);
          debugLog.info(`已清理旧日志文件: ${file}`);
        }
      }
    });
  } catch (e) {
    // 忽略清理错误
  }
}

// ==================== 单实例锁定 ====================
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // 如果获取不到锁，说明已有实例在运行，退出当前实例
  app.quit();
} else {
  // 当第二个实例启动时，聚焦到已运行的窗口
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // 有人试图运行第二个实例，我们应该聚焦我们的窗口
    debugLog.info('[second-instance] 检测到第二个实例启动，尝试显示窗口');
    
    let targetWindow = null;
    
    if (mainWindow && !mainWindow.isDestroyed()) {
      targetWindow = mainWindow;
      debugLog.debug('[second-instance] 目标窗口: mainWindow');
    } else if (loginWindow && !loginWindow.isDestroyed()) {
      targetWindow = loginWindow;
      debugLog.debug('[second-instance] 目标窗口: loginWindow');
    }
    
    if (targetWindow) {
      // 确保窗口显示
      if (!targetWindow.isVisible()) {
        targetWindow.show();
      }
      // 如果最小化则恢复
      if (targetWindow.isMinimized()) {
        targetWindow.restore();
      }
      // 将窗口置于最前
      targetWindow.setAlwaysOnTop(true);
      targetWindow.focus();
      targetWindow.setAlwaysOnTop(false);
      
      debugLog.info('[second-instance] 窗口已显示并聚焦');
    } else {
      debugLog.warn('[second-instance] 没有找到可用窗口');
    }
  });
}

// 获取运行目录（打包后为exe所在目录，开发时为项目目录）
const APP_PATH = app.isPackaged 
  ? path.dirname(process.execPath) 
  : __dirname;

// 资源目录（打包后 extraResources 在 resources 目录下）
const RESOURCES_PATH = app.isPackaged
  ? path.join(path.dirname(process.execPath), 'resources')
  : __dirname;

const CONFIG_PATH = path.join(APP_PATH, 'config.ini');
const OLD_CONFIG_JSON_PATH = path.join(APP_PATH, 'config.json');

let loginWindow;  // 登录窗口
let mainWindow;   // 主窗口
let tray = null;  // 系统托盘
let wechatInstances = []; // 存储所有微信实例信息
let callbackServer = null; // 本地回调服务器
let socketClient = null; // Socket.IO 客户端
let DEFAULT_PORT = 3363; // 默认起始端口
let LOCAL_CALLBACK_PORT = 7788; // 本地回调端口
let LOG_ENABLED = false; // 日志开关（默认关闭）
// HTTP API 基础地址（硬编码，不带 /api 后缀）
const API_BASE_URL = 'https://xvsvip.cn/api';
// const API_BASE_URL = 'http://106.119.166.240:9005';
// Socket.IO 服务器地址（硬编码，token 会在登录时动态拼接）
const SOCKET_BASE_URL = 'wss://xvsvip.cn';
// const SOCKET_BASE_URL = 'ws://106.119.166.240:9005';
let SOCKET_URL = ''; // 完整的 Socket.IO 地址（包含 token）
let CURRENT_KEY = ''; // 当前秘钥（用于与后端通信，同时作为设备ID）
let lastSocketConnected = false; // 记录上次Socket是否连接成功
let hookMsgCount = 0; // Hook消息计数
let serverMsgCount = 0; // 服务器指令计数
let WECHAT_PATH = ''; // 微信程序路径
let wechatInitialized = new Map(); // 记录每个微信实例的初始化状态 <port, boolean>
let loginTimes = new Map(); // 记录每个wxid的登录时间 <wxid, timestamp>

// ==================== INI 文件解析和写入 ====================

// 解析 INI 文件内容
function parseIni(content) {
  const result = {};
  let currentSection = '';
  
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // 跳过空行和注释
    if (!trimmedLine || trimmedLine.startsWith(';') || trimmedLine.startsWith('#')) {
      continue;
    }
    
    // 检查是否是节（section）
    const sectionMatch = trimmedLine.match(/^\[(.+)\]$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      if (!result[currentSection]) {
        result[currentSection] = {};
      }
      continue;
    }
    
    // 解析键值对
    const equalIndex = trimmedLine.indexOf('=');
    if (equalIndex > 0) {
      const key = trimmedLine.substring(0, equalIndex).trim();
      const value = trimmedLine.substring(equalIndex + 1).trim();
      
      if (currentSection) {
        result[currentSection][key] = value;
      } else {
        result[key] = value;
      }
    }
  }
  
  return result;
}

// 将对象转换为 INI 格式字符串
function stringifyIni(obj) {
  let result = '';
  
  // 定义节的顺序和注释
  const sections = [
    { name: 'WeChat', comment: '; 微信相关配置' },
    { name: 'Auth', comment: '; 认证配置' },
    { name: 'Server', comment: '; 服务器配置' }
  ];
  
  // 定义每个键的注释
  const keyComments = {
    'WeChat': {
      'wechatPath': '; 微信程序路径'
    },
    'Auth': {
      'savedKey': '; 保存的秘钥'
    },
    'Server': {
      'socketUrl': '; Socket.IO 服务器地址（包含token）',
      'localCallbackPort': '; 本地回调端口',
      'startPort': '; 微信HTTP服务起始端口'
    }
  };
  
  for (const section of sections) {
    if (obj[section.name]) {
      result += `${section.comment}\n`;
      result += `[${section.name}]\n`;
      
      const sectionData = obj[section.name];
      const comments = keyComments[section.name] || {};
      
      for (const key of Object.keys(sectionData)) {
        if (comments[key]) {
          result += `${comments[key]}\n`;
        }
        result += `${key} = ${sectionData[key] || ''}\n`;
      }
      
      result += '\n';
    }
  }
  
  return result;
}

// 加载配置（从 INI 文件）
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const content = fs.readFileSync(CONFIG_PATH, 'utf8');
      const config = parseIni(content);
      
      // 读取 WeChat 节
      if (config.WeChat) {
        WECHAT_PATH = config.WeChat.wechatPath || '';
      }
      
      // 读取 Auth 节
      if (config.Auth) {
        CURRENT_KEY = config.Auth.savedKey || '';
      }
      
      // 读取 Server 节
      if (config.Server) {
        DEFAULT_PORT = parseInt(config.Server.startPort) || 3363;
        LOCAL_CALLBACK_PORT = parseInt(config.Server.localCallbackPort) || 7788;
        // 不再从配置文件读取 socketUrl，使用硬编码的 SOCKET_BASE_URL
      }
      
      // 如果有秘钥，使用硬编码的 SOCKET_BASE_URL 生成完整的 SOCKET_URL
      if (CURRENT_KEY) {
        SOCKET_URL = `${SOCKET_BASE_URL}?token=${encodeURIComponent(CURRENT_KEY)}`;
        debugLog.info('[loadConfig] 使用硬编码地址生成 socketUrl');
      }
      
      debugLog.info('[loadConfig] 配置已加载:', {
        wechatPath: WECHAT_PATH,
        savedKey: CURRENT_KEY ? '***' : '',
        socketUrl: SOCKET_URL ? '***' : '',
        localCallbackPort: LOCAL_CALLBACK_PORT,
        startPort: DEFAULT_PORT
      });
      
      return config;
    }
  } catch (e) {
    debugLog.error('加载配置失败:', e.message);
  }
  return {};
}

// 保存配置（到 INI 文件）
function saveConfig(updates = {}) {
  try {
    // 先读取现有配置
    let config = {};
    if (fs.existsSync(CONFIG_PATH)) {
      const content = fs.readFileSync(CONFIG_PATH, 'utf8');
      config = parseIni(content);
    }
    
    // 确保各节存在
    if (!config.WeChat) config.WeChat = {};
    if (!config.Auth) config.Auth = {};
    if (!config.Server) config.Server = {};
    
    // 合并更新
    if (updates.wechatPath !== undefined) {
      config.WeChat.wechatPath = updates.wechatPath;
      WECHAT_PATH = updates.wechatPath;
    }
    if (updates.savedKey !== undefined) {
      config.Auth.savedKey = updates.savedKey;
      CURRENT_KEY = updates.savedKey;
    }
    if (updates.socketUrl !== undefined) {
      config.Server.socketUrl = updates.socketUrl;
      SOCKET_URL = updates.socketUrl;
    }
    if (updates.localCallbackPort !== undefined) {
      config.Server.localCallbackPort = String(updates.localCallbackPort);
      LOCAL_CALLBACK_PORT = parseInt(updates.localCallbackPort) || 7788;
    }
    if (updates.startPort !== undefined) {
      config.Server.startPort = String(updates.startPort);
      DEFAULT_PORT = parseInt(updates.startPort) || 3363;
    }
    
    // 写入文件
    const iniContent = stringifyIni(config);
    fs.writeFileSync(CONFIG_PATH, iniContent, 'utf8');
    
    debugLog.info('[saveConfig] 配置已保存');
    return true;
  } catch (e) {
    console.error('保存配置失败:', e.message);
    return false;
  }
}

// 加载设置（兼容旧接口）
function loadSettings() {
  const config = loadConfig();
  
  // 返回兼容旧格式的设置对象
  return {
    socketUrl: SOCKET_URL,
    localCallbackPort: String(LOCAL_CALLBACK_PORT),
    startPort: String(DEFAULT_PORT)
  };
}

// 保存设置（兼容旧接口）
function saveSettings(settings) {
  saveConfig({
    socketUrl: settings.socketUrl,
    localCallbackPort: settings.localCallbackPort,
    startPort: settings.startPort
  });
}

// 检查端口是否被占用
function checkPortAvailable(port) {
  return new Promise((resolve) => {
    const server = require('net').createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port, '127.0.0.1');
  });
}

// 获取下一个可用端口
async function getNextAvailablePort() {
  const usedPorts = wechatInstances.map(inst => inst.port);
  let port = DEFAULT_PORT;
  
  while (true) {
    if (!usedPorts.includes(port)) {
      const available = await checkPortAvailable(port);
      if (available) {
        return port;
      }
    }
    port++;
    if (port > 65535) {
      throw new Error('没有可用端口');
    }
  }
}

// ==================== Socket.IO 连接 ====================

function connectSocketIO() {
  if (!SOCKET_URL) {
    sendLog('warn', 'Socket.IO 服务器地址未配置');
    updateSocketStatus('disconnected', 'Socket.IO 未配置');
    return;
  }
  
  // 如果已经连接，不重复连接
  if (socketClient && socketClient.connected) {
    sendLog('info', 'Socket.IO 已连接，无需重复连接');
    updateSocketStatus('connected', 'Socket.IO 已连接');
    return;
  }
  
  // 断开旧连接
  if (socketClient) {
    socketClient.removeAllListeners();
    socketClient.disconnect();
    socketClient = null;
  }
  
  updateSocketStatus('connecting', '正在连接...');
  sendLog('info', `连接 Socket.IO: ${SOCKET_URL}`);
  
  try {
    socketClient = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 3000,
      reconnectionDelayMax: 10000,
      timeout: 10000,
      autoConnect: true
    });
    
    socketClient.on('connect', () => {
      updateSocketStatus('connected', 'Socket.IO 已连接');
      sendLog('success', `Socket.IO 连接成功, ID: ${socketClient.id}`);
    });
    
    socketClient.on('disconnect', (reason) => {
      updateSocketStatus('disconnected', 'Socket.IO 已断开');
      sendLog('warn', `Socket.IO 断开: ${reason}`);
      
      // 如果是服务器主动断开或传输关闭，尝试手动重连
      if (reason === 'io server disconnect' || reason === 'transport close') {
        sendLog('info', '尝试重新连接...');
        setTimeout(() => {
          if (socketClient && !socketClient.connected) {
            socketClient.connect();
          }
        }, 3000);
      }
    });
    
    socketClient.on('connect_error', (err) => {
      updateSocketStatus('disconnected', 'Socket.IO 连接失败');
      sendLog('error', `Socket.IO 错误: ${err.message}`);
    });
    
    // 重连事件
    socketClient.on('reconnect', (attemptNumber) => {
      sendLog('success', `Socket.IO 重连成功 (第${attemptNumber}次尝试)`);
      updateSocketStatus('connected', 'Socket.IO 已连接');
    });
    
    socketClient.on('reconnect_attempt', (attemptNumber) => {
      sendLog('info', `Socket.IO 正在重连... (第${attemptNumber}次)`);
      updateSocketStatus('connecting', `正在重连(${attemptNumber})...`);
    });
    
    socketClient.on('reconnect_error', (err) => {
      sendLog('warn', `Socket.IO 重连失败: ${err.message}`);
    });
    
    socketClient.on('reconnect_failed', () => {
      sendLog('error', 'Socket.IO 重连失败，已达最大尝试次数');
      updateSocketStatus('disconnected', 'Socket.IO 重连失败');
    });
    
    // 监听服务端指令（事件名：cmd_message）
    socketClient.on('cmd_message', async (data, ack) => {
      // 打印完整请求到调试窗口
      debugLog.network('in', { event: 'cmd_message', data });
      sendDebugLog('network', `[服务器指令] ${JSON.stringify(data, null, 2)}`);
      
      // 更新服务器指令计数
      serverMsgCount++;
      
      // 更新托盘菜单
      updateTrayMenu();
      
      // 通知前端更新指令计数
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('server-command', data);
      }
      
      const result = await handleServerCommand(data);
      
      // 打印完整响应到调试窗口
      debugLog.network('out', { event: 'cmd_response', result });
      sendDebugLog('network', `[服务器响应] ${JSON.stringify(result, null, 2)}`);
      
      // 使用 ack 机制响应（严格按照文档格式: { code, msg, data }）
      if (typeof ack === 'function') {
        ack(result);
      }
    });
    
  } catch (e) {
    updateSocketStatus('disconnected', 'Socket.IO 连接异常');
    sendLog('error', `Socket.IO 异常: ${e.message}`);
  }
}

function updateSocketStatus(status, text) {
  console.log(`[Socket状态] ${status}: ${text}`);
  
  // 记录上次是否连接成功
  if (status === 'connected') {
    lastSocketConnected = true;
  } else if (status === 'disconnected' && text.includes('未配置')) {
    // 只有未配置时才重置状态
    lastSocketConnected = false;
  }
  // 注意：断开连接时不重置 lastSocketConnected，保持上次成功状态
  
  if (mainWindow && !mainWindow.isDestroyed()) {
    // 发送状态时，如果上次连接成功且当前只是暂时断开，仍显示绿色
    const displayStatus = (lastSocketConnected && status !== 'connecting') ? 'connected' : status;
    const displayText = lastSocketConnected && status === 'disconnected' && !text.includes('未配置') 
      ? '服务器已连接（自动重连中）' 
      : text;
    mainWindow.webContents.send('socket-status', { status: displayStatus, text: displayText });
  }
  // 同时发送日志
  sendLog(status === 'connected' ? 'success' : (status === 'connecting' ? 'info' : 'warn'), `[Socket] ${text}`);
}

function sendLog(type, message, wxid = null) {
  console.log(`[日志-${type}] ${message}`);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('log', { type, data: message });
  }
  // 同时发送到调试窗口
  sendDebugLog(type, message, wxid);
}

// ==================== 服务端指令处理 ====================

async function handleServerCommand(data) {
  const { wxid, cmd, data: cmdData } = data;
  
  // 找到对应的微信实例
  const instance = wechatInstances.find(i => i.wxid === wxid);
  if (!instance && cmd !== 'Ping') {
    return { code: -1, msg: '未找到对应的微信实例', data: null };
  }
  
  const port = instance ? instance.port : null;
  
  try {
    let result;
    
    switch (cmd) {
      case 'SendText':
        result = await handleSendText(port, cmdData);
        break;
      case 'SendImage':
      case 'sendImage':
        result = await handleSendImage(port, cmdData);
        break;
      case 'SendVoice':
        result = await handleSendVoice(port, cmdData);
        break;
      case 'SendEmotion':
        result = await handleSendEmotion(port, cmdData);
        break;
      case 'SendXml':
        result = await handleSendXml(port, cmdData);
        break;
      case 'GetProfile':
        result = await handleGetProfile(port);
        break;
      case 'GetContact':
        result = await handleGetContact(port, cmdData);
        break;
      case 'GetChatroomInfo':
        result = await handleGetChatroomInfo(port, cmdData);
        break;
      case 'GetRoomMembers':
        result = await handleGetRoomMembers(port, cmdData);
        break;
      case 'DelMemberFromChatroom':
        result = await handleDelMember(port, cmdData);
        break;
      case 'AddMemberToChatRoom':
        result = await handleAddMember(port, cmdData);
        break;
      case 'EnterRoom':
        result = await handleEnterRoom(port, cmdData);
        break;
      case 'DropGroup':
        result = await handleDropGroup(port, cmdData);
        break;
      case 'Ping':
        result = { code: 0, msg: 'pong', data: { timestamp: Date.now() } };
        break;
      default:
        result = { code: -1, msg: `未知指令: ${cmd}`, data: null };
    }
    
    sendLog('info', `指令 ${cmd} 执行完成: ${result.code === 0 ? '成功' : '失败'}`);
    return result;
    
  } catch (e) {
    sendLog('error', `指令 ${cmd} 执行异常: ${e.message}`);
    return { code: -1, msg: e.message, data: null };
  }
}

// 发送文本消息
async function handleSendText(port, data) {
  const { wxid, msg, roomId, wxids } = data;
  
  // 判断是否需要@人
  if (wxids && roomId) {
    // 发送AT消息
    const result = await callWechatAPI(port, 'send_at_text', {
      wxids: wxids,
      msg: msg,
      roomId: roomId
    });
    return { code: result ? 0 : -1, msg: result ? '成功' : '失败', data: result };
  } else {
    // 发送普通文本
    const result = await callWechatAPI(port, 'send_text_msg', {
      wxid: wxid,
      msg: msg
    });
    return { code: result ? 0 : -1, msg: result ? '成功' : '失败', data: result };
  }
}

// 发送图片消息
async function handleSendImage(port, data) {
  const { wxid, data: imageData } = data;
  
  let filepath = imageData;
  
  // 如果是网络地址，先下载
  if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
    filepath = await downloadFile(imageData, 'image');
    if (!filepath) {
      return { code: -1, msg: '下载图片失败', data: null };
    }
  } else if (imageData.startsWith('data:image')) {
    // 带前缀的 Base64 图片，保存到临时文件
    filepath = await saveBase64Image(imageData);
    if (!filepath) {
      return { code: -1, msg: '保存图片失败', data: null };
    }
  } else if (imageData.startsWith('/9j/') || imageData.startsWith('iVBOR') || imageData.length > 100) {
    // 纯 Base64 字符串（JPEG 以 /9j/ 开头，PNG 以 iVBOR 开头）
    filepath = await saveRawBase64Image(imageData);
    if (!filepath) {
      return { code: -1, msg: '保存图片失败', data: null };
    }
  }
  
  const result = await callWechatAPI(port, 'send_image_msg', {
    wxid: wxid,
    filepath: filepath
  });
  
  return { code: result ? 0 : -1, msg: result ? '成功' : '失败', data: result };
}

// 发送语音消息
async function handleSendVoice(port, data) {
  const { wxid, data: base64Data } = data;
  
  // base64 解码为 silk 数据
  const silkBuffer = Buffer.from(base64Data, 'base64');
  
  // 保存到临时文件
  const tempDir = 'C:\\xiaov_temp';
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  const silkPath = path.join(tempDir, `voice_${Date.now()}.silk`);
  fs.writeFileSync(silkPath, silkBuffer);
  
  // 调用 Hook 的 send_voice API
  const result = await callWechatAPI(port, 'send_voice', {
    toWxid: wxid,
    silkPath: silkPath
  });
  
  // 清理临时文件
  try { fs.unlinkSync(silkPath); } catch (e) {}
  
  return { code: result ? 0 : -1, msg: result ? '成功' : '失败', data: result };
}

// 发送表情消息
async function handleSendEmotion(port, data) {
  const { wxid, md5, len } = data;
  
  const result = await callWechatAPI(port, 'send_fav_emotion', {
    wxid: wxid,
    md5: md5,
    length: len
  });
  
  return { code: result ? 0 : -1, msg: result ? '成功' : '失败', data: result };
}

// 发送XML消息
async function handleSendXml(port, data) {
  const { wxid, content, type } = data;
  
  const result = await callWechatAPI(port, 'send_app_msg', {
    wxid: wxid,
    content: content,
    type: type || '5'
  });
  
  return { code: result ? 0 : -1, msg: result ? '成功' : '失败', data: result };
}

// 获取当前用户信息
async function handleGetProfile(port) {
  const result = await callWechatAPI(port, 'get_profile_new', {});
  
  if (result && result.userInfo) {
    return {
      code: 0,
      msg: '成功',
      data: {
        headImage: result.userInfoExt?.smallHeadImgUrl || '',
        account: result.userInfo.userName?.String || '',
        nickname: result.userInfo.nickName?.String || ''
      }
    };
  }
  
  return { code: -1, msg: '获取用户信息失败', data: null };
}

// 获取联系人信息
async function handleGetContact(port, data) {
  const { wxid } = data;
  
  // 调用 hook 的 get_contact 接口
  const result = await callWechatAPI(port, 'get_contact', { wxid });
  
  if (result && result.contactList && result.contactList.length > 0) {
    const contact = result.contactList[0];
    return {
      code: 0,
      msg: '成功',
      data: {
        avatar: contact.smallHeadImgUrl || contact.bigHeadImgUrl || '',
        wxid: contact.userName?.String || wxid,
        nickname: contact.nickName?.String || '',
        remarkname: contact.remark?.String || contact.remark || ''
      }
    };
  }
  return { code: -1, msg: '获取联系人信息失败', data: null };
}

// 获取群详情
async function handleGetChatroomInfo(port, data) {
  try {
    const { roomId } = data;
    
    // 参数验证
    if (!roomId) {
      console.log('[获取群详情] 参数错误: roomId 为空');
      return { code: -1, msg: '参数错误: roomId不能为空', data: null };
    }
    
    // 先调用 init_rooms 初始化群列表
    console.log('[获取群详情] 调用 init_rooms 初始化群列表...');
    const initResult = await callWechatAPI(port, 'init_rooms', {});
    console.log('[获取群详情] init_rooms 返回:', JSON.stringify(initResult));
    
    // 调用 /api/get_rooms_info 获取所有群列表
    const result = await callWechatAPI(port, 'get_rooms_info', {});
    
    // 打印调试信息
    console.log('\n========== 获取群详情 ==========');
    console.log('roomId:', roomId);
    console.log('API返回结果类型:', result ? (Array.isArray(result) ? 'Array' : typeof result) : 'null');
    console.log('API返回群数量:', Array.isArray(result) ? result.length : 0);
    
    // 检查 API 调用是否成功
    if (!result) {
      console.log('API调用失败: 返回null');
      console.log('================================\n');
      return { code: -1, msg: 'API调用失败，请检查微信是否正常运行', data: null };
    }
    
    // 检查返回数据格式
    if (!Array.isArray(result)) {
      console.log('API返回数据格式错误:', JSON.stringify(result).substring(0, 200));
      console.log('================================\n');
      return { code: -1, msg: 'API返回数据格式错误', data: null };
    }
    
    // 从群列表中查找指定的 roomId
    const roomInfo = result.find(room => 
      room.room_wxid === roomId || 
      room.username === roomId
    );
    
    console.log('查找结果:', roomInfo ? '找到' : '未找到');
    
    if (roomInfo) {
      console.log('群信息:', {
        userName: roomInfo.room_wxid || roomInfo.username,
        nickName: roomInfo.nick_name,
        membersCount: roomInfo.members_count
      });
      console.log('================================\n');
      
      return {
        code: 0,
        msg: '成功',
        data: {
          userName: roomInfo.room_wxid || roomInfo.username || roomId,
          nickName: roomInfo.nick_name || '',
          owner: roomInfo.owner || '',
          membersCount: roomInfo.members_count || 0,
          smallHeadUrl: roomInfo.small_head_url || '',
          bigHeadUrl: roomInfo.big_head_url || '',
          remark: roomInfo.remark || ''
        }
      };
    }
    
    // 未找到指定群
    console.log('未找到指定群:', roomId);
    console.log('================================\n');
    return { code: -1, msg: `未找到群: ${roomId}`, data: null };
    
  } catch (error) {
    // 捕获所有异常
    console.error('\n========== 获取群详情异常 ==========');
    console.error('错误信息:', error.message);
    console.error('错误堆栈:', error.stack);
    console.error('=====================================\n');
    
    return { 
      code: -1, 
      msg: `获取群详情异常: ${error.message}`, 
      data: null 
    };
  }
}

// 获取群成员
async function handleGetRoomMembers(port, data) {
  const { roomId } = data;
  
  // 打印调试信息
  console.log('\n========== 获取群成员 ==========');
  console.log('roomId:', roomId);
  console.log('port:', port);
  
  // 先调用 init_rooms 初始化群列表
  console.log('[获取群成员] 调用 init_rooms 初始化群列表...');
  const initResult = await callWechatAPI(port, 'init_rooms', {});
  console.log('[获取群成员] init_rooms 返回:', JSON.stringify(initResult));
  
  // 调用 /api/get_room_members 接口，参数为 room_id
  const result = await callWechatAPI(port, 'get_room_members', { room_id: roomId });
  
  // 打印API返回结果
  console.log('API返回结果:', JSON.stringify(result, null, 2));
  console.log('================================\n');
  
  // 尝试多种可能的数据结构
  let members = [];
  
  if (result) {
    // 数据结构1: result.newChatroomData.chatRoomMember (实际API返回格式)
    if (result.newChatroomData && result.newChatroomData.chatRoomMember && Array.isArray(result.newChatroomData.chatRoomMember)) {
      members = result.newChatroomData.chatRoomMember;
    }
    // 数据结构2: result.chatRoomMember
    else if (result.chatRoomMember && Array.isArray(result.chatRoomMember)) {
      members = result.chatRoomMember;
    }
    // 数据结构3: result.memberList
    else if (result.memberList && Array.isArray(result.memberList)) {
      members = result.memberList;
    }
    // 数据结构4: result.data.memberList
    else if (result.data && result.data.memberList && Array.isArray(result.data.memberList)) {
      members = result.data.memberList;
    }
    // 数据结构5: result.members
    else if (result.members && Array.isArray(result.members)) {
      members = result.members;
    }
    // 数据结构6: result 本身就是数组
    else if (Array.isArray(result)) {
      members = result;
    }
  }
  
  if (members.length > 0) {
    const formattedMembers = members.map(m => ({
      userName: m.userName || m.wxid || m.UserName || '',
      nickName: m.nickName || m.NickName || m.nickname || '',
      displayName: m.displayName || m.DisplayName || '',
      smallHeadImgUrl: m.smallHeadImgUrl || m.headImgUrl || m.avatar || '',
      inviterUserName: m.inviterUserName || m.inviter || ''
    }));
    
    return {
      code: 0,

      msg: '成功',
      data: {
        memberCount: formattedMembers.length,
        chatRoomMember: formattedMembers
      }
    };
  }
  
  // 如果API返回了code字段，可能是错误信息
  if (result && result.code !== undefined) {
    return { code: result.code, msg: result.msg || '获取群成员失败', data: null };
  }
  
  return { code: -1, msg: '获取群成员失败', data: null };
}

// 踢出群成员
async function handleDelMember(port, data) {
  const { room_id, wxid_list } = data;
  
  const result = await callWechatAPI(port, 'del_member_from_chat_room', {
    room_id: room_id,
    wxid_list: wxid_list
  });
  
  return { code: result ? 0 : -1, msg: result ? '成功' : '失败', data: {} };
}

// 添加群成员
async function handleAddMember(port, data) {
  const { room_id, wxid_list } = data;
  
  const result = await callWechatAPI(port, 'add_member_to_chat_room', {
    room_id: room_id,
    wxid_list: wxid_list
  });
  
  return { code: result ? 0 : -1, msg: result ? '成功' : '失败', data: {} };
}

// 退群
async function handleDropGroup(port, data) {
  const { wxid } = data;
  
  console.log('\n========== 退群操作 ==========');
  console.log('群ID:', wxid);
  
  const result = await callWechatAPI(port, 'quit_and_del_chat_room', {
    roomId: wxid
  });
  
  console.log('quit_and_del_chat_room 返回:', JSON.stringify(result, null, 2));
  console.log('================================\n');
  
  // 检查返回结果
  if (result && (result.errCode === 1 || result.errCode === 0)) {
    return { code: 0, msg: result.errMsg || '成功', data: result.data || {} };
  }
  
  return { code: result ? 0 : -1, msg: result ? '成功' : '失败', data: result || {} };
}

// 链接进群
async function handleEnterRoom(port, data) {
  const { url } = data;
  
  console.log('\n========== 进群操作 ==========');
  console.log('原始URL:', url);
  
  // 先获取 a8key
  const a8Result = await callWechatAPI(port, 'get_a8key', {
    url: url,
    urlType: '0',
    scene: '0'
  });
  
  console.log('get_a8key 返回:', JSON.stringify(a8Result, null, 2));
  
  // 使用 fullUrl 而不是 url
  if (a8Result && a8Result.fullUrl) {
    console.log('使用 fullUrl:', a8Result.fullUrl);
    
    const result = await callWechatAPI(port, 'enter_room', {
      url: a8Result.fullUrl
    });
    
    console.log('enter_room 返回:', JSON.stringify(result, null, 2));
    console.log('================================\n');
    
    // 检查返回结果
    if (result && (result.errCode === 1 || result.errCode === 0)) {
      return { code: 0, msg: result.errMsg || '成功', data: result.data || {} };
    }
    return { code: result ? 0 : -1, msg: result ? '成功' : '失败', data: result || {} };
  }
  
  console.log('获取 fullUrl 失败');
  console.log('================================\n');
  
  return { code: -1, msg: '获取进群链接失败', data: null };
}

// ==================== 工具函数 ====================

// 调用微信API
function callWechatAPI(port, action, data) {
  return new Promise((resolve) => {
    const postData = JSON.stringify(data || {});
    const options = {
      hostname: '127.0.0.1',
      port: port,
      path: `/api/${action}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 30000
    };
    
    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(responseData));
        } catch (e) {
          resolve(null);
        }
      });
    });
    
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.write(postData);
    req.end();
  });
}

// 下载文件
function downloadFile(url, type, maxRedirects = 5) {
  return new Promise((resolve) => {
    const ext = type === 'image' ? '.jpg' : '.mp3';
    const filename = `temp_${Date.now()}${ext}`;
    const filepath = path.join(app.getPath('temp'), filename);
    
    console.log(`[下载文件] URL: ${url}`);
    console.log(`[下载文件] 保存路径: ${filepath}`);
    
    const doDownload = (downloadUrl, redirectCount) => {
      if (redirectCount > maxRedirects) {
        console.error('[下载文件] 重定向次数过多');
        resolve(null);
        return;
      }
      
      const protocol = downloadUrl.startsWith('https') ? https : http;
      
      protocol.get(downloadUrl, (response) => {
        // 处理重定向
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          console.log(`[下载文件] 重定向到: ${response.headers.location}`);
          doDownload(response.headers.location, redirectCount + 1);
          return;
        }
        
        // 检查状态码
        if (response.statusCode !== 200) {
          console.error(`[下载文件] HTTP状态码: ${response.statusCode}`);
          resolve(null);
          return;
        }
        
        const file = fs.createWriteStream(filepath);
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          console.log(`[下载文件] 下载完成: ${filepath}`);
          resolve(filepath);
        });
        
        file.on('error', (err) => {
          console.error(`[下载文件] 写入文件失败: ${err.message}`);
          fs.unlink(filepath, () => {});
          resolve(null);
        });
        
      }).on('error', (err) => {
        console.error(`[下载文件] 请求失败: ${err.message}`);
        fs.unlink(filepath, () => {});
        resolve(null);
      });
    };
    
    doDownload(url, 0);
  });
}

// 保存Base64图片（带前缀）
function saveBase64Image(base64Data) {
  return new Promise((resolve) => {
    try {
      const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!matches) {
        resolve(null);
        return;
      }
      
      const ext = matches[1];
      const data = matches[2];
      const filename = `temp_${Date.now()}.${ext}`;
      const filepath = path.join(app.getPath('temp'), filename);
      
      fs.writeFile(filepath, data, 'base64', (err) => {
        if (err) {
          resolve(null);
        } else {
          resolve(filepath);
        }
      });
    } catch (e) {
      resolve(null);
    }
  });
}

// 保存纯Base64图片（无前缀）
function saveRawBase64Image(base64Data) {
  return new Promise((resolve) => {
    try {
      // 根据 Base64 开头判断图片类型
      let ext = 'jpg';
      if (base64Data.startsWith('/9j/')) {
        ext = 'jpg';  // JPEG
      } else if (base64Data.startsWith('iVBOR')) {
        ext = 'png';  // PNG
      } else if (base64Data.startsWith('R0lGOD')) {
        ext = 'gif';  // GIF
      } else if (base64Data.startsWith('UklGR')) {
        ext = 'webp'; // WebP
      }
      
      const filename = `temp_${Date.now()}.${ext}`;
      const filepath = path.join(app.getPath('temp'), filename);
      
      fs.writeFile(filepath, base64Data, 'base64', (err) => {
        if (err) {
          console.error('保存Base64图片失败:', err.message);
          resolve(null);
        } else {
          console.log('Base64图片已保存:', filepath);
          resolve(filepath);
        }
      });
    } catch (e) {
      console.error('保存Base64图片异常:', e.message);
      resolve(null);
    }
  });
}

// ==================== 本地回调服务器 ====================

function startCallbackServer() {
  if (callbackServer) {
    callbackServer.close();
  }
  
  callbackServer = http.createServer((req, res) => {
    if (req.method === 'POST' || req.method === 'PUT') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          
          // 打印完整的Hook回调原始数据到调试窗口
          debugLog.network('in', { source: 'Hook回调', event_type: data.event_type, data });
          sendDebugLog('network', `[Hook回调] ${JSON.stringify(data, null, 2)}`);
          
          // 更新消息计数
          hookMsgCount++;
          
          // 更新托盘菜单
          updateTrayMenu();
          
          // 发送到前端显示
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('wechat-callback', data);
          }
          
          // 格式化消息并推送到服务器（通过Socket.IO）
          pushMessageToServer(data);
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ code: 0, msg: 'success' }));
        } catch (e) {
          debugLog.error('解析回调数据失败:', e.message);
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ code: -1, msg: 'parse error' }));
        }
      });
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ code: 0, msg: '小V助手回调服务运行中' }));
    }
  });
  
  callbackServer.listen(LOCAL_CALLBACK_PORT, '127.0.0.1', () => {
    debugLog.info(`本地回调服务器启动: http://127.0.0.1:${LOCAL_CALLBACK_PORT}`);
    sendLog('success', `本地回调服务器启动: http://127.0.0.1:${LOCAL_CALLBACK_PORT}`);
  });
  
  callbackServer.on('error', (err) => {
    debugLog.error('回调服务器错误:', err.message);
    sendLog('error', `回调服务器错误: ${err.message}`);
  });
}

// 处理登录成功回调
function handleLoginSuccess(rawData) {
  const eventType = rawData.event_type;
  const eventData = rawData.data;
  const httpPort = rawData.http_port;
  const pid = rawData.pid;
  
  // 查找对应的实例
  const instance = wechatInstances.find(i => i.port === httpPort || i.pid === pid);
  if (!instance) {
    sendLog('warn', `未找到对应的实例: port=${httpPort}, pid=${pid}`);
    return;
  }
  
  // 更新实例信息
  instance.wxid = eventData.wxid;
  instance.nickname = eventData.nickname || '未知用户';
  instance.avatar = eventData.head || '';
  instance.status = 'online';
  instance.pid = pid;
  
  sendLog('success', `登录成功: ${instance.nickname} (${instance.wxid})`);
  
  // 记录该wxid的登录时间（用于15秒消息过滤）
  loginTimes.set(instance.wxid, Date.now());
  
  // 更新托盘菜单
  updateTrayMenu();
  
  // 通知前端更新状态
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('wechat-status-change', {
      id: instance.id,
      wxid: instance.wxid,
      status: 'online'
    });
    
    mainWindow.webContents.send('show-toast', {
      message: '登录成功，15秒后开始推送消息，10秒后自动初始化',
      type: 'warning'
    });
    
    // 通知前端开始15秒倒计时
    mainWindow.webContents.send('login-cooldown', { wxid: instance.wxid, seconds: 15 });
  }
  
  // 10秒后自动初始化
  setTimeout(async () => {
    try {
      sendLog('info', '开始自动初始化联系人和群列表...');
      const initResult = await callWechatAPI(httpPort, 'wechat_init', {});
      
      if (initResult && initResult.errCode === 1) {
        sendLog('success', `联系人群列表初始化成功: ${initResult.errMsg || '成功'}`);
        wechatInitialized.set(httpPort, true);
        
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('show-toast', {
            message: '联系人群列表初始化成功',
            type: 'success'
          });
        }
      } else {
        sendLog('warn', `联系人群列表初始化失败: ${JSON.stringify(initResult)}`);
        wechatInitialized.set(httpPort, false);
      }
    } catch (initError) {
      sendLog('error', `调用wechat_init失败: ${initError.message}`);
      wechatInitialized.set(httpPort, false);
    }
    
    // 初始化群列表
    try {
      sendLog('info', '开始初始化群列表 (init_rooms)...');
      const roomResult = await callWechatAPI(httpPort, 'init_rooms', {});
      sendLog('success', `init_rooms 完成: errCode=${roomResult?.errCode || -1}`);
    } catch (e) {
      sendLog('warn', `init_rooms 调用失败: ${e.message}`);
    }
    
    // 15秒冷却结束通知（10+5=15秒）
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('login-cooldown-end', { wxid: instance.wxid });
      }
      sendLog('info', `wxid=${instance.wxid} 15秒冷却结束，开始正常推送消息`);
    }, 5000);
  }, 10000);
}

// 格式化并推送消息到服务器
function pushMessageToServer(rawData) {
  // 检查是否是登录成功事件
  if (rawData.event_type === 1002) {
    handleLoginSuccess(rawData);
    return;
  }
  
  if (!socketClient || !socketClient.connected) {
    // 主动尝试重连
    if (SOCKET_URL) {
      connectSocketIO();
    }
    return;
  }
  
  // 检查是否有在线的微信实例
  const onlineInstances = wechatInstances.filter(i => i.status === 'online' && i.wxid);
  if (onlineInstances.length === 0) {
    return;
  }
  
  // 检查消息来源的微信实例是否在15秒冷却期内
  const accountWxid = rawData.account_wxid || rawData.self || '';
  if (accountWxid && loginTimes.has(accountWxid)) {
    const elapsed = Date.now() - loginTimes.get(accountWxid);
    if (elapsed < 15000) {
      sendLog('info', `wxid=${accountWxid} 登录未满15秒，跳过消息`);
      return;
    }
  }
  
  // 过滤自己发送的消息（不转发到服务器）
  const eventDesc = rawData.event_desc || '';
  const messageDesc = rawData.messageDesc || '';
  if (eventDesc.includes('自己发送') || messageDesc.includes('自己发送')) {
    return; // 自己发送的消息，不转发
  }
  
  // 格式化消息为服务端要求的格式
  const formattedMsg = formatWechatMessage(rawData);
  
  // 验证消息有效性
  if (!formattedMsg) {
    return;
  }
  
  // 过滤无效消息：必须有发送者或消息内容
  if (!formattedMsg.fromUserName && !formattedMsg.text && !formattedMsg.msgId) {
    return;
  }
  
  // 打印发送的完整消息到调试窗口
  debugLog.network('out', { event: 'chat_message', wxid: formattedMsg.currentWxid, data: formattedMsg });
  sendDebugLog('network', `[推送消息] ${JSON.stringify(formattedMsg, null, 2)}`);
  
  // 使用 chat_message 事件，传递两个参数：机器人wxid 和 消息数据，并监听响应
  socketClient.emit('chat_message', formattedMsg.currentWxid, formattedMsg, (response) => {
    debugLog.network('in', { event: 'chat_message_response', response });
    sendDebugLog('network', `[推送响应] ${JSON.stringify(response, null, 2)}`);
  });
  
  sendLog('info', `推送消息: type=${formattedMsg.msgType}, from=${formattedMsg.fromUserName?.substring(0, 15) || '-'}`);
}

// 已推送消息ID缓存（防止重复推送）
const pushedMsgIds = new Set();
const MAX_CACHED_MSG_IDS = 1000;

// 格式化微信消息
function formatWechatMessage(data) {
  try {
    // 获取消息ID
    const msgId = String(data.newMsgId || data.MsgId || data.msgId || '');
    
    // 获取当前微信wxid - 从回调数据或已登录实例中获取（提前获取，用于去重）
    let currentWxid = data.account_wxid || data.self || '';
    
    // 如果没有获取到，尝试从已登录实例匹配
    if (!currentWxid) {
      const toUserName = data.toUserName?.String || '';
      const fromUserName = data.fromUserName?.String || '';
      
      // 查找匹配的实例
      for (const inst of wechatInstances) {
        if (inst.wxid && inst.status === 'online') {
          if (toUserName === inst.wxid || fromUserName === inst.wxid) {
            currentWxid = inst.wxid;
            break;
          }
        }
      }
      
      // 如果还是没有，使用第一个在线实例
      if (!currentWxid) {
        const firstOnline = wechatInstances.find(i => i.status === 'online' && i.wxid);
        if (firstOnline) {
          currentWxid = firstOnline.wxid;
        }
      }
    }
    
    // 使用 wxid + msgId 组合作为去重键，确保不同微信实例可以独立推送相同的群消息
    const dedupeKey = currentWxid && msgId ? `${currentWxid}_${msgId}` : msgId;
    
    // 检查是否已推送过（防止重复）
    if (dedupeKey && pushedMsgIds.has(dedupeKey)) {
      return null;
    }
    
    // 检查是否是群成员变动事件
    // event_type: 1009=群员退群, 1010=群成员增加, 1011=群成员减少, 1012=群员昵称修改
    const eventType = data.event_type;
    if (eventType === 1009 || eventType === 1010 || eventType === 1011 || eventType === 1012) {
      return formatMemberChangeEvent(data, currentWxid);
    }
    // 其他情况（包括 event_type 为其他值或不存在）都按普通消息处理
    
    // 判断消息来源 - 兼容多种数据格式
    const fromUserName = data.fromUserName?.String || data.fromUserName || data.fromUser || '';
    const toUserName = data.toUserName?.String || data.toUserName || data.toUser || '';
    
    // 必须有发送者或接收者
    if (!fromUserName && !toUserName) {
      return null;
    }
    
    const isGroupMsg = fromUserName.includes('@chatroom') || toUserName.includes('@chatroom');
    
    // 获取发送者wxid和实际内容
    let talkerId = '';
    let realContent = '';
    
    const rawContent = data.content?.String || data.content || data.msg || '';
    
    if (isGroupMsg && rawContent) {
      // 群消息格式: "wxid_xxx:\n实际内容"
      const colonIndex = rawContent.indexOf(':\n');
      if (colonIndex > 0) {
        talkerId = rawContent.substring(0, colonIndex);
        realContent = rawContent.substring(colonIndex + 2);
      } else {
        talkerId = fromUserName;
        realContent = rawContent;
      }
    } else {
      talkerId = fromUserName;
      realContent = rawContent;
    }
    
    // 获取消息类型
    const msgType = parseInt(data.msgType || data.type || 1);
    
    // 提取 at_user_list - 从多个可能的来源获取
    let atUserList = [];
    
    // 来源1: 直接的 at_user_list 字段
    if (data.at_user_list && Array.isArray(data.at_user_list) && data.at_user_list.length > 0) {
      atUserList = data.at_user_list;
    }
    // 来源2: msg_soure_xml.msgsource.atuserlist（已解析的XML）
    else if (data.msg_soure_xml?.msgsource?.atuserlist) {
      const atuserlist = data.msg_soure_xml.msgsource.atuserlist;
      if (typeof atuserlist === 'string' && atuserlist.trim()) {
        // atuserlist 可能是逗号分隔的多个wxid
        atUserList = atuserlist.split(',').map(s => s.trim()).filter(s => s);
      } else if (Array.isArray(atuserlist)) {
        atUserList = atuserlist;
      }
    }
    // 来源3: 从 msgSource XML 字符串中解析
    else if (data.msgSource && typeof data.msgSource === 'string') {
      const atMatch = data.msgSource.match(/<atuserlist>([^<]+)<\/atuserlist>/);
      if (atMatch && atMatch[1]) {
        atUserList = atMatch[1].split(',').map(s => s.trim()).filter(s => s);
      }
    }
    
    // 构建标准消息格式（严格按照文档格式）
    const formattedMsg = {
      currentWxid: currentWxid,
      at_user_list: atUserList,
      msgId: msgId,
      fromUserName: fromUserName,
      toUserName: toUserName,
      talkerId: talkerId,
      msgType: msgType,
      text: realContent,
      timestamp: data.createTime || data.timestamp || Math.floor(Date.now() / 1000),
      members: data.members || null,
      raw: data.msgSource || data.raw || ''
    };
    
    // 记录已推送的消息ID（使用组合键）
    if (dedupeKey) {
      pushedMsgIds.add(dedupeKey);
      // 限制缓存大小
      if (pushedMsgIds.size > MAX_CACHED_MSG_IDS) {
        const firstId = pushedMsgIds.values().next().value;
        pushedMsgIds.delete(firstId);
      }
    }
    
    return formattedMsg;
  } catch (e) {
    console.error('格式化消息失败:', e.message);
    return null;
  }
}

// 格式化群成员变动事件（群员昵称修改、群成员增加、群成员减少）
function formatMemberChangeEvent(data, currentWxid) {
  const eventType = data.event_type;
  const eventDesc = data.event_desc || '';
  const eventData = data.data || {};
  
  // 打印事件数据（调试用）
  console.log('\n========== 群成员变动事件 ==========');
  console.log('event_type:', eventType);
  console.log('event_desc:', eventDesc);
  console.log('eventData:', JSON.stringify(eventData, null, 2));
  console.log('currentWxid:', currentWxid);
  console.log('=====================================\n');
  
  // 生成唯一消息ID - 使用时间戳确保唯一性
  const msgId = `event_${eventType}_${data.pid || ''}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // 检查是否已推送过
  if (pushedMsgIds.has(msgId)) {
    return null;
  }
  
  // 获取群ID - 尝试多种可能的路径
  const fromUserName = eventData.roomid || eventData.room_id || eventData.chatroomId || eventData.chatroom_id || '';
  
  // 获取变动成员的wxid - 尝试多种可能的路径
  let talkerId = '';
  if (eventData.memberlist) {
    if (typeof eventData.memberlist === 'string') {
      talkerId = eventData.memberlist;
    } else if (eventData.memberlist.userName) {
      talkerId = eventData.memberlist.userName;
    } else if (eventData.memberlist.wxid) {
      talkerId = eventData.memberlist.wxid;
    }
  } else if (eventData.wxid) {
    talkerId = eventData.wxid;
  } else if (eventData.member_wxid) {
    talkerId = eventData.member_wxid;
  }
  
  // 构建 members 信息 - 统一使用 "群成员变动"
  const members = [{ remark: '群成员变动' }];
  
  // 获取时间戳
  const timestamp = eventData.createtime || eventData.create_time || eventData.timestamp || Math.floor(Date.now() / 1000);
  
  const formattedMsg = {
    currentWxid: currentWxid,
    at_user_list: [],
    msgId: msgId,
    fromUserName: fromUserName,
    toUserName: currentWxid,
    talkerId: talkerId,
    msgType: 1, // 使用普通文本消息类型，而不是事件类型
    text: eventDesc || `群成员变动事件(${eventType})`,
    timestamp: timestamp,
    members: members,
    raw: JSON.stringify(data)
  };
  
  console.log('\n========== 格式化后的事件消息 ==========');
  console.log(JSON.stringify(formattedMsg, null, 2));
  console.log('=========================================\n');
  
  // 记录已推送的消息ID
  pushedMsgIds.add(msgId);
  if (pushedMsgIds.size > MAX_CACHED_MSG_IDS) {
    const firstId = pushedMsgIds.values().next().value;
    pushedMsgIds.delete(firstId);
  }
  
  return formattedMsg;
}

// ==================== HTTP API 调用 ====================

// 绑定设备（code和deviceId都传秘钥）
function bindDevice(code) {
  return new Promise((resolve) => {
    if (!API_BASE_URL) {
      resolve({ code: -1, message: 'API地址未配置' });
      return;
    }
    
    // 两个参数都传秘钥
    const postData = JSON.stringify({
      code: code,
      deviceId: code
    });
    
    const url = new URL(`${API_BASE_URL}/open/bot/device_license/bind`);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 10000
    };
    
    const reqModule = url.protocol === 'https:' ? https : http;
    const req = reqModule.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => { responseData += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(responseData));
        } catch (e) {
          resolve({ code: -1, message: '解析响应失败' });
        }
      });
    });
    
    req.on('error', (err) => resolve({ code: -1, message: err.message }));
    req.on('timeout', () => { req.destroy(); resolve({ code: -1, message: '请求超时' }); });
    req.write(postData);
    req.end();
  });
}

// 检查版本
function checkVersion() {
  return new Promise((resolve) => {
    if (!API_BASE_URL) {
      resolve({ code: -1, message: 'API地址未配置' });
      return;
    }
    
    const postData = JSON.stringify({
      protocolVersion: 'V9'
    });
    
    const url = new URL(`${API_BASE_URL}/open/bot/client_version/checkLatestVersion`);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 10000
    };
    
    const reqModule = url.protocol === 'https:' ? https : http;
    const req = reqModule.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => { responseData += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(responseData));
        } catch (e) {
          resolve({ code: -1, message: '解析响应失败' });
        }
      });
    });
    
    req.on('error', (err) => resolve({ code: -1, message: err.message }));
    req.on('timeout', () => { req.destroy(); resolve({ code: -1, message: '请求超时' }); });
    req.write(postData);
    req.end();
  });
}

// 检查微信账号绑定状态
function checkWxidStatus(wxid) {
  return new Promise((resolve) => {
    if (!API_BASE_URL) {
      resolve({ code: -1, message: 'API地址未配置' });
      return;
    }
    
    // deviceId 传秘钥
    const postData = JSON.stringify({
      wxid: wxid,
      deviceId: CURRENT_KEY
    });
    
    const url = new URL(`${API_BASE_URL}/open/bot/device_license/checkStatus`);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 10000
    };
    
    const reqModule = url.protocol === 'https:' ? https : http;
    const req = reqModule.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => { responseData += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(responseData));
        } catch (e) {
          resolve({ code: -1, message: '解析响应失败' });
        }
      });
    });
    
    req.on('error', (err) => resolve({ code: -1, message: err.message }));
    req.on('timeout', () => { req.destroy(); resolve({ code: -1, message: '请求超时' }); });
    req.write(postData);
    req.end();
  });
}

// ==================== 窗口创建 ====================

// 创建登录窗口
function createLoginWindow() {
  if (loginWindow && !loginWindow.isDestroyed()) {
    loginWindow.show();
    loginWindow.focus();
    return;
  }
  
  loginWindow = new BrowserWindow({
    width: 480,
    height: 420,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    resizable: false,
    frame: false,
    title: '小V助手 - 登录'
  });

  loginWindow.setMenu(null);
  loginWindow.loadFile('index.html', { query: { page: 'login' } });
  
  loginWindow.on('closed', () => {
    loginWindow = null;
  });
}

// 创建主窗口
function createMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
    return;
  }
  
  mainWindow = new BrowserWindow({
    width: 480,
    height: 720,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    resizable: false,
    frame: false,
    title: '小V助手'
  });

  mainWindow.setMenu(null);
  mainWindow.loadFile('index.html', { query: { page: 'main' } });
  
  // 窗口加载完成后同步 Socket 状态
  mainWindow.webContents.on('did-finish-load', () => {
    syncSocketStatus();
  });
  
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 同步 Socket 状态到前端
function syncSocketStatus() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  
  if (socketClient && socketClient.connected) {
    console.log('[syncSocketStatus] Socket已连接, ID:', socketClient.id);
    updateSocketStatus('connected', 'Socket.IO 已连接');
  } else if (SOCKET_URL) {
    console.log('[syncSocketStatus] Socket未连接，尝试重连...');
    updateSocketStatus('connecting', '正在连接...');
    // 如果有配置但未连接，尝试重连
    connectSocketIO();
  } else {
    console.log('[syncSocketStatus] Socket未配置');
    updateSocketStatus('disconnected', 'Socket.IO 未配置');
  }
}

app.whenReady().then(async () => {
  // 初始化日志系统
  ensureLogDir();
  cleanOldLogs();
  
  // 打印路径信息（调试用）
  debugLog.info('========== 应用启动 ==========');
  debugLog.info('APP_PATH:', APP_PATH);
  debugLog.info('CONFIG_PATH:', CONFIG_PATH);
  debugLog.info('LOG_DIR:', LOG_DIR);
  debugLog.info('app.isPackaged:', app.isPackaged);
  debugLog.info('process.execPath:', process.execPath);
  debugLog.info('__dirname:', __dirname);
  debugLog.info('================================');
  
  // 确保配置文件存在
  initConfigFiles();
  
  // 加载配置
  loadConfig();
  
  // 创建系统托盘
  createTray();
  
  // 启动时显示登录窗口
  // 注意：Socket连接和回调服务器在登录成功后才启动
  createLoginWindow();
});

// 初始化配置文件
function initConfigFiles() {
  // 检查是否存在旧的 config.json 文件，如果存在则迁移数据
  try {
    if (fs.existsSync(OLD_CONFIG_JSON_PATH)) {
      console.log('[initConfigFiles] 发现旧的 config.json，准备迁移...');
      
      // 读取旧配置
      const oldContent = fs.readFileSync(OLD_CONFIG_JSON_PATH, 'utf8');
      const oldConfig = JSON.parse(oldContent);
      
      // 读取或创建新的 INI 配置
      let newConfig = {};
      if (fs.existsSync(CONFIG_PATH)) {
        const iniContent = fs.readFileSync(CONFIG_PATH, 'utf8');
        newConfig = parseIni(iniContent);
      }
      
      // 确保各节存在
      if (!newConfig.WeChat) newConfig.WeChat = {};
      if (!newConfig.Auth) newConfig.Auth = {};
      if (!newConfig.Server) newConfig.Server = {};
      
      // 迁移数据（只迁移 INI 中没有的数据）
      if (oldConfig.wechatPath && !newConfig.WeChat.wechatPath) {
        newConfig.WeChat.wechatPath = oldConfig.wechatPath;
        console.log('[initConfigFiles] 迁移 wechatPath:', oldConfig.wechatPath);
      }
      if (oldConfig.savedKey && !newConfig.Auth.savedKey) {
        newConfig.Auth.savedKey = oldConfig.savedKey;
        console.log('[initConfigFiles] 迁移 savedKey');
      }
      
      // 保存到 INI 文件
      const iniContent = stringifyIni(newConfig);
      fs.writeFileSync(CONFIG_PATH, iniContent, 'utf8');
      console.log('[initConfigFiles] 配置已迁移到 config.ini');
      
      // 删除旧的 config.json 文件
      try {
        fs.unlinkSync(OLD_CONFIG_JSON_PATH);
        console.log('[initConfigFiles] 已删除旧的 config.json');
      } catch (e) {
        console.warn('[initConfigFiles] 删除 config.json 失败:', e.message);
      }
    }
  } catch (e) {
    console.error('[initConfigFiles] 迁移旧配置失败:', e.message);
  }
  
  // 确保 config.ini 存在
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      console.log('[initConfigFiles] 创建 config.ini');
      // 创建默认的 INI 配置文件
      const defaultConfig = {
        WeChat: {
          wechatPath: ''
        },
        Auth: {
          savedKey: ''
        },
        Server: {
          socketUrl: '',
          localCallbackPort: '7788',
          startPort: '3363'
        }
      };
      const iniContent = stringifyIni(defaultConfig);
      fs.writeFileSync(CONFIG_PATH, iniContent, 'utf8');
    } else {
      console.log('[initConfigFiles] config.ini 已存在');
      // 验证文件可读
      const content = fs.readFileSync(CONFIG_PATH, 'utf8');
      console.log('[initConfigFiles] config.ini 内容:', content.substring(0, 200) + '...');
    }
  } catch (e) {
    console.error('[initConfigFiles] config.ini 初始化失败:', e.message);
  }
}

// 窗口控制 IPC
ipcMain.on('window-minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed()) {
    // 最小化到托盘而不是任务栏
    win.hide();
    
    // 更新托盘菜单
    updateTrayMenu();
  }
});

ipcMain.on('window-close', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed()) {
    // 检查是否有在线的机器人
    const onlineCount = wechatInstances.filter(i => i.status === 'online').length;
    
    if (onlineCount > 0) {
      // 有在线机器人，发送到前端显示美化弹窗
      win.webContents.send('show-close-confirm', {
        onlineCount: onlineCount
      });
      // 前端会通过 confirm-close 事件回复
    } else {
      // 没有在线机器人，直接关闭
      win.close();
    }
  }
});

// 处理前端确认关闭的响应
ipcMain.on('confirm-close', async (event, confirmed) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (confirmed && win && !win.isDestroyed()) {
    await closeAllWechatProcesses();
    win.close();
  }
});

// 登录成功 - 关闭登录窗口，打开主窗口，启动服务
ipcMain.on('login-success', () => {
  // 启动回调服务器和Socket连接（只有登录成功后才启动）
  startCallbackServer();
  connectSocketIO();
  
  createMainWindow();
  if (loginWindow && !loginWindow.isDestroyed()) {
    loginWindow.close();
  }
});

// 退出登录 - 关闭主窗口，打开登录窗口
ipcMain.on('logout-to-login', () => {
  createLoginWindow();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close();
  }
});

app.on('window-all-closed', async () => {
  // 关闭所有窗口后，销毁托盘并退出应用
  if (process.platform !== 'darwin') {
    // 关闭所有微信进程
    await closeAllWechatProcesses();
    
    // 销毁托盘
    if (tray) {
      tray.destroy();
      tray = null;
    }
    
    app.quit();
  }
});

// ==================== 系统托盘 ====================

// 创建系统托盘
function createTray() {
  if (tray) return;
  
  try {
    let trayIcon = null;
    
    // 尝试多个可能的图标路径
    const iconPaths = [
      path.join(APP_PATH, '小V透明图标.png'),
      path.join(APP_PATH, '小v助手4.png'),
      path.join(__dirname, '小V透明图标.png'),
      path.join(__dirname, '小v助手4.png')
    ];
    
    for (const iconPath of iconPaths) {
      console.log(`尝试加载托盘图标: ${iconPath}`);
      if (fs.existsSync(iconPath)) {
        console.log(`图标文件存在: ${iconPath}`);
        const img = nativeImage.createFromPath(iconPath);
        if (!img.isEmpty()) {
          // 调整图标大小为 16x16（Windows 托盘标准尺寸）
          trayIcon = img.resize({ width: 16, height: 16 });
          console.log(`图标加载成功: ${iconPath}, 尺寸: ${trayIcon.getSize().width}x${trayIcon.getSize().height}`);
          break;
        } else {
          console.log(`图标加载失败（空图像）: ${iconPath}`);
        }
      } else {
        console.log(`图标文件不存在: ${iconPath}`);
      }
    }
    
    // 如果没有找到图标，创建一个简单的默认图标
    if (!trayIcon || trayIcon.isEmpty()) {
      console.log('使用默认图标');
      // 创建一个简单的蓝色方块作为默认图标
      const size = 16;
      const canvas = Buffer.alloc(size * size * 4);
      for (let i = 0; i < size * size; i++) {
        canvas[i * 4] = 24;      // R (蓝色)
        canvas[i * 4 + 1] = 144; // G
        canvas[i * 4 + 2] = 255; // B
        canvas[i * 4 + 3] = 255; // A
      }
      trayIcon = nativeImage.createFromBuffer(canvas, { width: size, height: size });
    }
    
    tray = new Tray(trayIcon);
    tray.setToolTip('小V助手');
    
    updateTrayMenu();
    
    // 点击托盘图标显示窗口
    tray.on('click', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isVisible()) {
          mainWindow.focus();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      } else if (loginWindow && !loginWindow.isDestroyed()) {
        if (loginWindow.isVisible()) {
          loginWindow.focus();
        } else {
          loginWindow.show();
          loginWindow.focus();
        }
      }
    });
    
    console.log('系统托盘已创建');
  } catch (e) {
    console.error('创建系统托盘失败:', e.message);
    console.error('错误堆栈:', e.stack);
  }
}


// 更新托盘菜单
function updateTrayMenu() {
  if (!tray) return;
  
  const onlineCount = wechatInstances.filter(i => i.status === 'online').length;
  const socketStatus = (socketClient && socketClient.connected) ? '已连接' : '未连接';
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: `接收消息: ${hookMsgCount}`,
      enabled: false
    },
    {
      label: `服务器指令: ${serverMsgCount}`,
      enabled: false
    },
    {
      label: `在线机器人: ${onlineCount}`,
      enabled: false
    },
    {
      label: `服务器状态: ${socketStatus}`,
      enabled: false
    },
    { type: 'separator' },
    {
      label: '显示窗口',
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.show();
          mainWindow.focus();
        } else if (loginWindow && !loginWindow.isDestroyed()) {
          loginWindow.show();
          loginWindow.focus();
        }
      }
    },
    {
      label: '退出',
      click: async () => {
        // 检查是否有在线的机器人
        const currentOnlineCount = wechatInstances.filter(i => i.status === 'online').length;
        
        const { response } = await dialog.showMessageBox({
          type: 'question',
          buttons: ['取消', '确定退出'],
          defaultId: 1,
          title: '确认退出',
          message: '确定要退出小V助手吗？',
          detail: currentOnlineCount > 0 
            ? `当前有 ${currentOnlineCount} 个在线机器人\n将关闭所有机器人进程` 
            : '将退出小V助手'
        });
        
        if (response === 1) {
          await closeAllWechatProcesses();
          
          if (tray) {
            tray.destroy();
            tray = null;
          }
          
          app.quit();
        }
      }
    }
  ]);
  
  tray.setContextMenu(contextMenu);
}

// 关闭所有微信进程
async function closeAllWechatProcesses() {
  const { execSync } = require('child_process');
  
  for (const instance of wechatInstances) {
    if (instance.pid) {
      try {
        execSync(`taskkill /F /PID ${instance.pid}`, { encoding: 'utf8' });
        console.log(`已结束微信进程 PID: ${instance.pid}`);
      } catch (e) {
        // 进程可能已结束
      }
    }
  }
  
  wechatInstances = [];
  
  if (callbackServer) {
    callbackServer.close();
  }
  if (socketClient) {
    socketClient.disconnect();
  }
}

// ==================== IPC 处理 ====================

// 获取设置
ipcMain.handle('get-settings', async () => {
  return loadSettings();
});

// 保存设置
ipcMain.handle('save-settings', async (event, settings) => {
  saveSettings(settings);
  // 重启服务
  startCallbackServer();
  connectSocketIO();
  return { success: true };
});

// 获取设备ID（返回秘钥）
ipcMain.handle('get-device-id', async () => {
  return CURRENT_KEY;
});

// 绑定设备
ipcMain.handle('bind-device', async (event, code) => {
  // 先调用服务器 API 验证秘钥
  const result = await bindDevice(code);
  
  // 只有在登录成功（code=1000）时才保存秘钥
  if (result.code === 1000) {
    // 使用硬编码的 SOCKET_BASE_URL 生成完整的 socketUrl
    const newSocketUrl = `${SOCKET_BASE_URL}?token=${encodeURIComponent(code)}`;
    SOCKET_URL = newSocketUrl;
    
    // 只保存秘钥到配置文件（socketUrl 不再保存，因为是硬编码）
    saveConfig({
      savedKey: code
    });
    
    console.log('[bind-device] 登录成功，秘钥和Socket地址已保存');
    sendLog('success', `秘钥已保存到配置文件`);
    
    // 重新连接 Socket.IO
    connectSocketIO();
    
    sendLog('info', `Socket 连接已配置`);
  } else {
    console.log('[bind-device] 登录失败，秘钥未保存');
    sendLog('warn', `登录失败，秘钥未保存: ${result.message || '未知错误'}`);
  }
  
  return result;
});

// 检查版本
ipcMain.handle('check-version', async () => {
  return await checkVersion();
});

// 获取保存的秘钥
ipcMain.handle('get-saved-key', async () => {
  console.log('[get-saved-key] 返回 CURRENT_KEY:', CURRENT_KEY ? '***' : '(空)');
  return CURRENT_KEY || '';
});

// 重连Socket
ipcMain.handle('reconnect-socket', async () => {
  try {
    if (socketClient) {
      socketClient.disconnect();
      socketClient = null;
    }
    
    loadSettings();
    
    if (!SOCKET_URL) {
      return { success: false, message: 'Socket.IO 服务器地址未配置' };
    }
    
    connectSocketIO();
    
    return new Promise((resolve) => {
      let resolved = false;
      
      if (socketClient) {
        socketClient.once('connect', () => {
          if (!resolved) {
            resolved = true;
            resolve({ success: true, message: '重连成功' });
          }
        });
        
        socketClient.once('connect_error', (err) => {
          if (!resolved) {
            resolved = true;
            resolve({ success: false, message: err.message });
          }
        });
      }
      
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          if (socketClient && socketClient.connected) {
            resolve({ success: true, message: '重连成功' });
          } else {
            resolve({ success: false, message: '连接超时' });
          }
        }
      }, 10000);
    });
  } catch (e) {
    return { success: false, message: e.message };
  }
});

// 检查微信绑定状态
ipcMain.handle('check-wxid-status', async (event, wxid) => {
  return await checkWxidStatus(wxid);
});

// 验证密钥（秘钥必须由前端传入，不能为空）
ipcMain.handle('verify-key', async (event, key) => {
  // 秘钥不能为空
  if (!key || key.trim() === '') {
    return { success: false, message: '秘钥不能为空' };
  }
  // 秘钥有效，返回成功
  return { success: true, message: '秘钥验证通过' };
});

// 添加微信
ipcMain.handle('add-wechat', async () => {
  try {
    const { execSync } = require('child_process');
    
    // 打印调试信息
    sendLog('info', `APP_PATH: ${APP_PATH}`);
    sendLog('info', `process.execPath: ${process.execPath}`);
    sendLog('info', `__dirname: ${__dirname}`);
    sendLog('info', `app.isPackaged: ${app.isPackaged}`);
    
    // 从全局变量读取微信安装路径
    let wechatPath = '';
    
    // 先检查全局变量
    if (WECHAT_PATH && fs.existsSync(WECHAT_PATH)) {
      wechatPath = WECHAT_PATH;
    }
    
    if (!wechatPath) {
      try {
        // 读取微信安装目录
        const regQuery = 'reg query "HKCU\\Software\\Tencent\\Weixin" /v InstallPath';
        sendLog('info', `执行注册表查询: ${regQuery}`);
        const result = execSync(regQuery, { encoding: 'utf8' });
        sendLog('info', `注册表查询结果: ${result}`);
        const match = result.match(/InstallPath\s+REG_SZ\s+(.+)/);
        sendLog('info', `正则匹配结果: ${JSON.stringify(match)}`);
        
        if (match && match[1]) {
          const installDir = match[1].trim();
          sendLog('info', `安装目录: ${installDir}`);
          // 微信exe文件名是 Weixin.exe
          wechatPath = path.join(installDir, 'Weixin.exe');
          sendLog('info', `拼接后路径: ${wechatPath}`);
          sendLog('info', `文件是否存在: ${fs.existsSync(wechatPath)}`);
        }
      } catch (e) {
        sendLog('error', `注册表查询失败: ${e.message}`);
        // 尝试常见路径
        const possiblePaths = [
          'C:\\Program Files\\Tencent\\Weixin\\Weixin.exe',
          'C:\\Program Files (x86)\\Tencent\\Weixin\\Weixin.exe',
          'D:\\Program Files\\Tencent\\Weixin\\Weixin.exe',
          'D:\\wechat\\Weixin\\Weixin.exe'
        ];
        
        sendLog('info', `尝试常见路径...`);
        for (const p of possiblePaths) {
          sendLog('info', `检查路径: ${p}, 存在: ${fs.existsSync(p)}`);
          if (fs.existsSync(p)) {
            wechatPath = p;
            break;
          }
        }
      }
    }
    
    if (!wechatPath || !fs.existsSync(wechatPath)) {
      // 弹出文件选择对话框
      const result = await dialog.showOpenDialog(mainWindow, {
        title: '请选择微信程序',
        defaultPath: 'C:\\Program Files',
        filters: [
          { name: '可执行文件', extensions: ['exe'] },
          { name: '所有文件', extensions: ['*'] }
        ],
        properties: ['openFile']
      });
      
      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        throw new Error('未选择微信路径');
      }
      
      wechatPath = result.filePaths[0];
      
      if (!fs.existsSync(wechatPath)) {
        throw new Error('选择的文件不存在');
      }
      
      // 保存路径（使用 saveConfig）
      saveConfig({ wechatPath: wechatPath });
    }
    
    const dllPath = path.join(RESOURCES_PATH, 'libencode46.dll');
    const injectPath = path.join(RESOURCES_PATH, 'x64 inject.exe');
    
    // 打印路径信息
    sendLog('info', `DLL路径: ${dllPath}`);
    sendLog('info', `注入工具路径: ${injectPath}`);
    sendLog('info', `DLL文件存在: ${fs.existsSync(dllPath)}`);
    sendLog('info', `注入工具存在: ${fs.existsSync(injectPath)}`);
    
    // 获取下一个可用端口
    const httpPort = await getNextAvailablePort();
    sendLog('info', `分配HTTP端口: ${httpPort}`);
    
    // 配置参数 - 回调地址指向本地回调服务器
    const config = {
      recivemode: 'http',
      tcp_ip: '127.0.0.1',
      tcp_port: 61108,
      http_server_port: httpPort,
      http_callback_url: `http://127.0.0.1:${LOCAL_CALLBACK_PORT}/api/recvMsg`,
      usedefault: false,
      start_server_while_login: true
    };
    
    const configJson = JSON.stringify(config);
    const instanceId = Date.now().toString();
    
    if (!fs.existsSync(injectPath)) {
      throw new Error(`注入工具不存在: ${injectPath}`);
    }
    if (!fs.existsSync(dllPath)) {
      throw new Error(`DLL文件不存在: ${dllPath}`);
    }
    
    sendLog('info', `开始执行注入...`);
    
    // 使用 spawn 执行
    const childProcess = spawn(injectPath, [wechatPath, dllPath, configJson], {
      cwd: APP_PATH,
      windowsHide: false
    });
    
    let stdout = '';
    let stderr = '';
    
    childProcess.stdout.on('data', (data) => {
      // 尝试 GBK 解码，如果失败则使用 UTF-8
      let text = '';
      try {
        text = iconv.decode(data, 'gbk');
        // 检查是否有乱码（包含大量不可打印字符）
        if (text.includes('�') || /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(text)) {
          text = data.toString('utf8');
        }
      } catch (e) {
        text = data.toString('utf8');
      }
      stdout += text;
      sendLog('success', `输出: ${text.trim()}`);
    });
    
    childProcess.stderr.on('data', (data) => {
      // 尝试 GBK 解码，如果失败则使用 UTF-8
      let text = '';
      try {
        text = iconv.decode(data, 'gbk');
        // 检查是否有乱码
        if (text.includes('�') || /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(text)) {
          text = data.toString('utf8');
        }
      } catch (e) {
        text = data.toString('utf8');
      }
      stderr += text;
      sendLog('error', `错误: ${text.trim()}`);
    });
    
    // 等待注入进程完成
    const injectResult = await new Promise((resolve) => {
      childProcess.on('close', (code) => {
        sendLog('info', `进程退出: ${code}`);
        resolve({ code, stdout, stderr });
      });
      
      setTimeout(() => {
        resolve({ code: -1, stdout, stderr, timeout: true });
      }, 30000);
    });
    
    if (injectResult.code !== 0 && !injectResult.timeout) {
      sendLog('error', `注入进程退出码: ${injectResult.code}`);
    }
    
    sendLog('info', '等待微信HTTP服务启动...');
    await new Promise(r => setTimeout(r, 5000));
    
    // 提取PID
    let wechatPid = null;
    const pidMatch = stdout.match(/PID:\s*(\d+)/);
    if (pidMatch && pidMatch[1]) {
      wechatPid = parseInt(pidMatch[1]);
      sendLog('info', `微信进程PID: ${wechatPid}`);
    }
    
    const instance = {
      id: instanceId,
      port: httpPort,
      pid: wechatPid,
      wxid: null,
      nickname: null,
      avatar: null,
      status: 'pending'
    };
    wechatInstances.push(instance);
    
    return { success: true, message: '微信启动命令已执行', port: httpPort, instanceId, pid: wechatPid };
  } catch (error) {
    sendLog('error', error.message);
    return { success: false, message: error.message };
  }
});

// 移除微信实例
ipcMain.handle('remove-wechat', async (event, instanceId, pid) => {
  try {
    const { execSync } = require('child_process');
    
    const index = wechatInstances.findIndex(inst => inst.id === instanceId);
    let instancePid = pid;
    
    if (index !== -1) {
      if (!instancePid && wechatInstances[index].pid) {
        instancePid = wechatInstances[index].pid;
      }
      wechatInstances.splice(index, 1);
    }
    
    if (instancePid) {
      try {
        execSync(`taskkill /F /PID ${instancePid}`, { encoding: 'utf8' });
        sendLog('success', `已结束微信进程 PID: ${instancePid}`);
      } catch (e) {
        sendLog('warn', `进程 ${instancePid} 可能已结束`);
      }
    } else {
      sendLog('warn', `未找到进程PID，无法自动结束进程`);
    }
    
    // 更新托盘菜单
    updateTrayMenu();
    
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// 获取微信用户信息（已废弃，改为监听 Hook 回调）
ipcMain.handle('get-wechat-info', async (event, port) => {
  // 此函数已不再使用，登录信息通过 Hook 回调 (event_type: 1002) 获取
  // 保留此函数仅为兼容性，直接返回实例信息
  const instance = wechatInstances.find(i => i.port === port);
  if (instance && instance.wxid) {
    return {
      userInfo: {
        userName: { String: instance.wxid },
        nickName: { String: instance.nickname }
      },
      userInfoExt: {
        smallHeadImgUrl: instance.avatar
      }
    };
  }
  return null;
});

// 调用微信API（供前端使用）
ipcMain.handle('call-wechat-api', async (event, port, action, data) => {
  try {
    const result = await callWechatAPI(port, action, data);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// 获取所有微信实例
ipcMain.handle('get-wechat-instances', async () => {
  return wechatInstances;
});

// 手动检查微信登录状态
ipcMain.handle('check-wechat-login-status', async (event, port) => {
  try {
    const result = await callWechatAPI(port, 'check_login', {});
    
    if (result && result.errCode === 1 && result.data && result.data.status === true) {
      return { status: true };
    } else {
      return { status: false };
    }
  } catch (e) {
    return { status: false, error: e.message };
  }
});

// 手动初始化微信实例的联系人和群列表
ipcMain.handle('initialize-wechat-contacts', async (event, port) => {
  try {
    sendLog('info', `正在初始化联系人和群列表 (端口: ${port})...`);
    
    const result = await callWechatAPI(port, 'wechat_init', {});
    
    if (result && result.errCode === 1) {
      sendLog('success', `联系人群列表初始化成功: ${result.errMsg || '成功'}`);
      
      // 标记该实例已初始化完成
      wechatInitialized.set(port, true);
      
      return { success: true, message: '初始化成功' };
    } else {
      sendLog('warn', `联系人群列表初始化失败: ${JSON.stringify(result)}`);
      return { success: false, message: result?.errMsg || '初始化失败' };
    }
  } catch (error) {
    sendLog('error', `初始化异常: ${error.message}`);
    return { success: false, message: error.message };
  }
});

// 手动添加微信实例（用于用户自己注入后手动添加）
ipcMain.handle('manual-add-wechat', async (event, pid, port) => {
  try {
    sendLog('info', `手动添加微信实例: PID=${pid}, Port=${port}`);
    
    // 检查端口是否已被使用
    const existingInstance = wechatInstances.find(i => i.port === port);
    if (existingInstance) {
      return { success: false, message: `端口 ${port} 已被其他实例使用` };
    }
    
    // 创建实例ID
    const instanceId = `manual_${Date.now()}`;
    
    // 创建实例对象
    const instance = {
      id: instanceId,
      port: port,
      pid: pid,
      wxid: null,
      nickname: null,
      avatar: null,
      status: 'pending'
    };
    
    // 添加到实例列表
    wechatInstances.push(instance);
    
    sendLog('success', `手动添加实例成功: ID=${instanceId}, Port=${port}`);
    
    // 更新托盘菜单
    updateTrayMenu();
    
    return { 
      success: true, 
      message: '实例已添加，正在查询登录信息...', 
      instanceId: instanceId,
      port: port,
      pid: pid
    };
  } catch (error) {
    sendLog('error', `手动添加实例失败: ${error.message}`);
    return { success: false, message: error.message };
  }
});

// 退出登录 - 结束所有微信进程
ipcMain.handle('logout', async () => {
  const { execSync } = require('child_process');
  
  sendLog('info', '正在退出登录，结束所有微信进程...');
  
  // 结束所有已记录的微信进程
  for (const instance of wechatInstances) {
    if (instance.pid) {
      try {
        execSync(`taskkill /F /PID ${instance.pid}`, { encoding: 'utf8' });
        sendLog('info', `已结束微信进程 PID: ${instance.pid}`);
      } catch (e) {
        // 进程可能已结束
      }
    }
  }
  
  // 清空实例列表
  wechatInstances = [];
  
  // 断开 Socket.IO 连接并重置状态
  if (socketClient) {
    socketClient.disconnect();
    socketClient = null;
  }
  lastSocketConnected = false; // 退出登录时重置连接状态
  updateSocketStatus('disconnected', 'Socket.IO 未连接');
  
  sendLog('success', '已退出登录');
  return { success: true };
});

// 获取微信路径（自动检测并保存）
ipcMain.handle('get-wechat-path', async () => {
  const { execSync } = require('child_process');
  
  // 先检查全局变量
  if (WECHAT_PATH && fs.existsSync(WECHAT_PATH)) {
    console.log('从全局变量读取微信路径:', WECHAT_PATH);
    return WECHAT_PATH;
  }
  
  // 全局变量没有或路径无效，尝试自动检测
  let wechatPath = '';
  
  try {
    // 从注册表读取微信安装目录
    const regQuery = 'reg query "HKCU\\Software\\Tencent\\Weixin" /v InstallPath';
    console.log('执行注册表查询:', regQuery);
    const result = execSync(regQuery, { encoding: 'utf8' });
    console.log('注册表查询结果:', result);
    const match = result.match(/InstallPath\s+REG_SZ\s+(.+)/);
    console.log('正则匹配结果:', match);
    
    if (match && match[1]) {
      const installDir = match[1].trim();
      console.log('安装目录:', installDir);
      wechatPath = path.join(installDir, 'Weixin.exe');
      console.log('拼接后路径:', wechatPath);
      console.log('文件是否存在:', fs.existsSync(wechatPath));
    }
  } catch (e) {
    console.error('注册表查询失败:', e.message);
  }
  
  // 如果注册表查询失败，尝试常见路径
  if (!wechatPath || !fs.existsSync(wechatPath)) {
    const possiblePaths = [
      'C:\\Program Files\\Tencent\\Weixin\\Weixin.exe',
      'C:\\Program Files (x86)\\Tencent\\Weixin\\Weixin.exe',
      'D:\\Program Files\\Tencent\\Weixin\\Weixin.exe',
      'D:\\wechat\\Weixin\\Weixin.exe',
      'E:\\Program Files\\Tencent\\Weixin\\Weixin.exe'
    ];
    
    console.log('尝试常见路径...');
    for (const p of possiblePaths) {
      console.log('检查路径:', p, '存在:', fs.existsSync(p));
      if (fs.existsSync(p)) {
        wechatPath = p;
        break;
      }
    }
  }
  
  // 如果找到了微信路径，保存到配置文件
  if (wechatPath && fs.existsSync(wechatPath)) {
    saveConfig({ wechatPath: wechatPath });
    console.log('微信路径已保存到配置文件:', wechatPath);
    return wechatPath;
  }
  
  return '';
});

// 选择微信路径
ipcMain.handle('select-wechat-path', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '请选择微信程序 (Weixin.exe)',
      defaultPath: 'C:\\Program Files\\Tencent\\Weixin',
      filters: [
        { name: '微信程序', extensions: ['exe'] },
        { name: '所有文件', extensions: ['*'] }
      ],
      properties: ['openFile']
    });
    
    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return { success: false, canceled: true };
    }
    
    const selectedPath = result.filePaths[0];
    
    // 验证文件是否存在
    if (!fs.existsSync(selectedPath)) {
      return { success: false, message: '选择的文件不存在' };
    }
    
    // 保存到配置文件（使用 saveConfig）
    saveConfig({ wechatPath: selectedPath });
    
    sendLog('success', `微信路径已保存: ${selectedPath}`);
    return { success: true, path: selectedPath };
    
  } catch (error) {
    sendLog('error', `选择微信路径失败: ${error.message}`);
    return { success: false, message: error.message };
  }
});

// 获取微信版本
ipcMain.handle('get-wechat-version', async () => {
  const { execSync } = require('child_process');
  
  try {
    // 先获取微信路径
    let wechatPath = '';
    
    // 1. 从全局变量读取
    if (WECHAT_PATH && fs.existsSync(WECHAT_PATH)) {
      wechatPath = WECHAT_PATH;
      console.log('从全局变量读取微信路径:', wechatPath);
    }
    
    // 2. 如果全局变量没有，从注册表读取
    if (!wechatPath) {
      try {
        const regQuery = 'reg query "HKCU\\Software\\Tencent\\Weixin" /v InstallPath';
        const result = execSync(regQuery, { encoding: 'utf8' });
        const match = result.match(/InstallPath\s+REG_SZ\s+(.+)/);
        if (match && match[1]) {
          const testPath = path.join(match[1].trim(), 'Weixin.exe');
          if (fs.existsSync(testPath)) {
            wechatPath = testPath;
            console.log('从注册表读取微信路径:', wechatPath);
          }
        }
      } catch (e) {
        console.error('注册表查询失败:', e.message);
      }
    }
    
    // 3. 尝试常见路径
    if (!wechatPath) {
      const possiblePaths = [
        'C:\\Program Files\\Tencent\\Weixin\\Weixin.exe',
        'C:\\Program Files (x86)\\Tencent\\Weixin\\Weixin.exe',
        'D:\\Program Files\\Tencent\\Weixin\\Weixin.exe',
        'D:\\wechat\\Weixin\\Weixin.exe',
        'E:\\Program Files\\Tencent\\Weixin\\Weixin.exe'
      ];
      
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          wechatPath = p;
          console.log('从常见路径找到微信:', wechatPath);
          break;
        }
      }
    }
    
    if (!wechatPath || !fs.existsSync(wechatPath)) {
      return { success: false, version: '', message: '未找到微信程序' };
    }
    
    console.log('准备获取版本，微信路径:', wechatPath);
    
    // 使用 PowerShell 获取文件版本信息
    const psCommand = `(Get-Item '${wechatPath.replace(/'/g, "''")}').VersionInfo.FileVersion`;
    
    try {
      const version = execSync(`powershell -Command "${psCommand}"`, { encoding: 'utf8' }).trim();
      console.log('PowerShell获取版本成功:', version);
      if (version) {
        return { success: true, version: version, path: wechatPath };
      }
    } catch (e) {
      console.error('PowerShell获取版本失败:', e.message);
    }
    
    // 备用方案：使用 wmic
    try {
      const escapedPath = wechatPath.replace(/\\/g, '\\\\');
      const wmicCommand = `wmic datafile where "name='${escapedPath}'" get version /value`;
      console.log('尝试wmic命令:', wmicCommand);
      const wmicResult = execSync(wmicCommand, { encoding: 'utf8' });
      const versionMatch = wmicResult.match(/Version=(.+)/);
      if (versionMatch && versionMatch[1]) {
        const version = versionMatch[1].trim();
        console.log('wmic获取版本成功:', version);
        return { success: true, version: version, path: wechatPath };
      }
    } catch (e2) {
      console.error('wmic获取版本失败:', e2.message);
    }
    
    // 备用方案2：使用 PowerShell Get-ItemProperty
    try {
      const psCommand2 = `(Get-ItemProperty '${wechatPath.replace(/'/g, "''")}').VersionInfo.ProductVersion`;
      const version = execSync(`powershell -Command "${psCommand2}"`, { encoding: 'utf8' }).trim();
      if (version) {
        console.log('PowerShell ProductVersion获取成功:', version);
        return { success: true, version: version, path: wechatPath };
      }
    } catch (e3) {
      console.error('PowerShell ProductVersion失败:', e3.message);
    }
    
    return { success: false, version: '', message: '无法获取版本信息', path: wechatPath };
  } catch (error) {
    console.error('获取微信版本异常:', error.message);
    return { success: false, version: '', message: error.message };
  }
});

// 测试 Socket 连接
ipcMain.handle('test-socket-connection', async (event, socketUrl) => {
  return new Promise((resolve) => {
    const testUrl = socketUrl || SOCKET_URL;
    
    if (!testUrl) {
      resolve({ success: false, message: 'Socket.IO 服务器地址未配置' });
      return;
    }
    
    sendLog('info', `测试 Socket 连接: ${testUrl}`);
    
    // 如果已有连接且已连接，直接返回成功
    if (socketClient && socketClient.connected) {
      resolve({ success: true, message: '已连接', socketId: socketClient.id });
      return;
    }
    
    // 创建临时测试连接
    let testSocket = null;
    let timeoutId = null;
    
    try {
      testSocket = io(testUrl, {
        transports: ['websocket'],
        reconnection: false,
        timeout: 10000
      });
      
      // 设置超时
      timeoutId = setTimeout(() => {
        if (testSocket) {
          testSocket.disconnect();
          testSocket = null;
        }
        resolve({ success: false, message: '连接超时（10秒）' });
      }, 10000);
      
      testSocket.on('connect', () => {
        clearTimeout(timeoutId);
        const socketId = testSocket.id;
        sendLog('success', `测试连接成功, ID: ${socketId}`);
        
        // 断开测试连接
        testSocket.disconnect();
        testSocket = null;
        
        // 如果主连接未连接，重新连接
        if (!socketClient || !socketClient.connected) {
          connectSocketIO();
        }
        
        resolve({ success: true, message: '连接成功', socketId: socketId });
      });
      
      testSocket.on('connect_error', (err) => {
        clearTimeout(timeoutId);
        sendLog('error', `测试连接失败: ${err.message}`);
        
        if (testSocket) {
          testSocket.disconnect();
          testSocket = null;
        }
        
        resolve({ success: false, message: `连接失败: ${err.message}` });
      });
      
    } catch (e) {
      if (timeoutId) clearTimeout(timeoutId);
      if (testSocket) {
        testSocket.disconnect();
        testSocket = null;
      }
      resolve({ success: false, message: `异常: ${e.message}` });
    }
  });
});

// 初始化微信（启动后自动关闭）
ipcMain.handle('init-wechat', async () => {
  try {
    const { execSync } = require('child_process');
    
    sendLog('info', '开始初始化微信...');
    
    // 从全局变量读取微信安装路径
    let wechatPath = '';
    
    // 先检查全局变量
    if (WECHAT_PATH && fs.existsSync(WECHAT_PATH)) {
      wechatPath = WECHAT_PATH;
    }
    
    if (!wechatPath) {
      try {
        // 读取微信安装目录
        const regQuery = 'reg query "HKCU\\Software\\Tencent\\Weixin" /v InstallPath';
        const result = execSync(regQuery, { encoding: 'utf8' });
        const match = result.match(/InstallPath\s+REG_SZ\s+(.+)/);
        
        if (match && match[1]) {
          const installDir = match[1].trim();
          wechatPath = path.join(installDir, 'Weixin.exe');
        }
      } catch (e) {
        // 尝试常见路径
        const possiblePaths = [
          'C:\\Program Files\\Tencent\\Weixin\\Weixin.exe',
          'C:\\Program Files (x86)\\Tencent\\Weixin\\Weixin.exe',
          'D:\\Program Files\\Tencent\\Weixin\\Weixin.exe',
          'D:\\wechat\\Weixin\\Weixin.exe'
        ];
        
        for (const p of possiblePaths) {
          if (fs.existsSync(p)) {
            wechatPath = p;
            break;
          }
        }
      }
    }
    
    if (!wechatPath || !fs.existsSync(wechatPath)) {
      return { success: false, message: '未找到微信路径，请先设置微信路径' };
    }
    
    const dllPath = path.join(RESOURCES_PATH, 'libencode46.dll');
    const injectPath = path.join(RESOURCES_PATH, 'x64 inject.exe');
    
    if (!fs.existsSync(injectPath)) {
      return { success: false, message: `注入工具不存在: ${injectPath}` };
    }
    if (!fs.existsSync(dllPath)) {
      return { success: false, message: `DLL文件不存在: ${dllPath}` };
    }
    
    // 获取下一个可用端口
    const httpPort = await getNextAvailablePort();
    sendLog('info', `初始化使用端口: ${httpPort}`);
    
    // 配置参数
    const config = {
      recivemode: 'http',
      tcp_ip: '127.0.0.1',
      tcp_port: 61108,
      http_server_port: httpPort,
      http_callback_url: `http://127.0.0.1:${LOCAL_CALLBACK_PORT}/api/recvMsg`,
      usedefault: false,
      start_server_while_login: true
    };
    
    const configJson = JSON.stringify(config);
    
    sendLog('info', '正在启动微信进行初始化...');
    
    // 使用 spawn 执行
    const childProcess = spawn(injectPath, [wechatPath, dllPath, configJson], {
      cwd: APP_PATH,
      windowsHide: false
    });
    
    let stdout = '';
    let wechatPid = null;
    
    childProcess.stdout.on('data', (data) => {
      let text = '';
      try {
        text = iconv.decode(data, 'gbk');
        if (text.includes('�') || /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(text)) {
          text = data.toString('utf8');
        }
      } catch (e) {
        text = data.toString('utf8');
      }
      stdout += text;
      sendLog('info', `[初始化] ${text.trim()}`);
    });
    
    childProcess.stderr.on('data', (data) => {
      let text = '';
      try {
        text = iconv.decode(data, 'gbk');
        if (text.includes('�') || /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(text)) {
          text = data.toString('utf8');
        }
      } catch (e) {
        text = data.toString('utf8');
      }
      sendLog('warn', `[初始化] ${text.trim()}`);
    });
    
    // 等待注入进程完成
    await new Promise((resolve) => {
      childProcess.on('close', (code) => {
        sendLog('info', `注入进程退出: ${code}`);
        resolve();
      });
      
      setTimeout(() => {
        resolve();
      }, 15000);
    });
    
    // 提取PID
    const pidMatch = stdout.match(/PID:\s*(\d+)/);
    if (pidMatch && pidMatch[1]) {
      wechatPid = parseInt(pidMatch[1]);
      sendLog('info', `微信进程PID: ${wechatPid}`);
    }
    
    if (!wechatPid) {
      sendLog('warn', '未能获取微信PID，尝试通过进程名查找...');
      // 尝试通过进程名查找最新的微信进程
      try {
        const tasklist = execSync('tasklist /FI "IMAGENAME eq Weixin.exe" /FO CSV /NH', { encoding: 'utf8' });
        const lines = tasklist.trim().split('\n');
        if (lines.length > 0) {
          const lastLine = lines[lines.length - 1];
          const pidMatch2 = lastLine.match(/"Weixin\.exe","(\d+)"/);
          if (pidMatch2 && pidMatch2[1]) {
            wechatPid = parseInt(pidMatch2[1]);
            sendLog('info', `通过进程列表找到PID: ${wechatPid}`);
          }
        }
      } catch (e) {
        sendLog('warn', `查找进程失败: ${e.message}`);
      }
    }
    
    // 等待5秒让微信完成初始化
    sendLog('info', '等待5秒让微信完成初始化...');
    await new Promise(r => setTimeout(r, 5000));
    
    // 结束微信进程
    if (wechatPid) {
      sendLog('info', `正在结束微信进程 PID: ${wechatPid}...`);
      try {
        execSync(`taskkill /F /PID ${wechatPid}`, { encoding: 'utf8' });
        sendLog('success', `已结束微信进程 PID: ${wechatPid}`);
      } catch (e) {
        sendLog('warn', `结束进程失败: ${e.message}`);
      }
    } else {
      sendLog('warn', '未找到微信PID，无法自动结束进程');
    }
    
    sendLog('success', '微信初始化完成');
    return { success: true, message: '微信初始化完成，进程已自动关闭' };
    
  } catch (error) {
    sendLog('error', `初始化失败: ${error.message}`);
    return { success: false, message: error.message };
  }
});

// 获取日志开关状态
ipcMain.handle('get-log-enabled', async () => {
  return LOG_ENABLED;
});

// 设置日志开关状态
ipcMain.handle('set-log-enabled', async (event, enabled) => {
  LOG_ENABLED = enabled;
  debugLog.info(`日志开关已${enabled ? '开启' : '关闭'}`);
  sendLog('info', `日志写入已${enabled ? '开启' : '关闭'}`);
  return { success: true };
});

// ==================== 日志调试窗口管理 ====================

let debugWindow = null;

// 打开日志调试窗口
ipcMain.on('open-debug-window', () => {
  if (debugWindow && !debugWindow.isDestroyed()) {
    debugWindow.focus();
    return;
  }
  
  debugWindow = new BrowserWindow({
    width: 1200,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webSecurity: false
    },
    frame: false,
    resizable: true,
    title: '日志调试 - 小V助手'
  });
  
  debugWindow.setMenu(null);
  
  // 打包后和开发时使用不同的路径
  let debugHtmlPath;
  if (app.isPackaged) {
    // 打包后，文件在 asar 包内
    debugHtmlPath = path.join(__dirname, 'debug-log.html');
  } else {
    // 开发时
    debugHtmlPath = path.join(__dirname, 'debug-log.html');
  }
  
  debugLog.info(`[日志窗口] 加载路径: ${debugHtmlPath}`);
  debugLog.info(`[日志窗口] 文件存在: ${fs.existsSync(debugHtmlPath)}`);
  
  debugWindow.loadFile(debugHtmlPath).catch(err => {
    debugLog.error(`[日志窗口] 加载失败: ${err.message}`);
  });
  
  // 打开开发者工具以便调试（仅在开发模式）
  if (!app.isPackaged) {
    debugWindow.webContents.openDevTools();
  }
  
  debugWindow.on('closed', () => {
    debugWindow = null;
  });
  
  debugLog.info('日志调试窗口已打开');
});

// 日志窗口控制
ipcMain.on('debug-window-minimize', (event) => {
  if (debugWindow && !debugWindow.isDestroyed()) {
    debugWindow.minimize();
  }
});

ipcMain.on('debug-window-close', (event) => {
  if (debugWindow && !debugWindow.isDestroyed()) {
    debugWindow.close();
  }
});

// 发送日志到调试窗口
function sendDebugLog(type, message, wxid = null) {
  if (debugWindow && !debugWindow.isDestroyed()) {
    debugWindow.webContents.send('debug-log', {
      type: type,
      message: message,
      wxid: wxid
    });
  }
}

// 导出日志
ipcMain.handle('export-logs', async (event, logs) => {
  try {
    const result = await dialog.showSaveDialog(debugWindow || mainWindow, {
      title: '导出日志',
      defaultPath: `logs_${Date.now()}.txt`,
      filters: [{ name: 'Text Files', extensions: ['txt'] }]
    });
    
    if (!result.canceled && result.filePath) {
      const content = logs.map(log => {
        const time = new Date(log.timestamp).toLocaleString();
        const wxid = log.wxid ? ` [${log.wxid}]` : '';
        return `[${time}]${wxid} [${log.type.toUpperCase()}] ${log.message}`;
      }).join('\n');
      
      fs.writeFileSync(result.filePath, content, 'utf8');
      return { success: true, path: result.filePath };
    }
    return { success: false, message: '用户取消' };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

// 禁用微信更新 - 修改hosts文件
ipcMain.handle('disable-wechat-update', async () => {
  const { execSync } = require('child_process');
  
  try {
    const hostsPath = 'C:\\Windows\\System32\\drivers\\etc\\hosts';
    const domain1 = 'dldir1.qq.com';
    const domain2 = 'dldir1v6.qq.com';
    
    // 创建备份目录
    const backupDir = path.join(APP_PATH, 'back');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // 读取当前hosts文件
    let hostsContent = '';
    try {
      hostsContent = fs.readFileSync(hostsPath, 'utf8');
    } catch (e) {
      return { success: false, message: '无法读取hosts文件，请以管理员身份运行程序' };
    }
    
    // 检查域名是否已存在
    const exist1 = hostsContent.includes(domain1);
    const exist2 = hostsContent.includes(domain2);
    
    if (exist1 && exist2) {
      return { success: true, message: '微信更新已被禁用，无需重复操作' };
    }
    
    // 备份原始hosts文件
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const backupPath = path.join(backupDir, `hosts_backup_${timestamp}.txt`);
    
    try {
      fs.writeFileSync(backupPath, hostsContent, 'utf8');
      sendLog('info', `hosts文件已备份到: ${backupPath}`);
    } catch (e) {
      sendLog('warn', `备份hosts文件失败: ${e.message}`);
    }
    
    // 构建新内容
    let newContent = hostsContent;
    
    // 确保文件末尾有换行
    if (!newContent.endsWith('\n')) {
      newContent += '\n';
    }
    
    // 添加注释和规则
    newContent += '\n# ========================================\n';
    newContent += `# 小V助手 - 禁用微信自动更新 - ${new Date().toLocaleString()}\n`;
    newContent += '# ========================================\n';
    
    if (!exist1) {
      newContent += `127.0.0.1 ${domain1}\n`;
    }
    if (!exist2) {
      newContent += `127.0.0.1 ${domain2}\n`;
    }
    
    newContent += '# ========================================\n';
    
    // 写入hosts文件（需要管理员权限）
    try {
      fs.writeFileSync(hostsPath, newContent, 'utf8');
    } catch (e) {
      // 尝试使用PowerShell以管理员权限写入
      try {
        const tempFile = path.join(app.getPath('temp'), 'hosts_temp.txt');
        fs.writeFileSync(tempFile, newContent, 'utf8');
        
        // 使用PowerShell复制文件（需要UAC提权）
        const psCommand = `Start-Process powershell -Verb RunAs -ArgumentList '-Command', 'Copy-Item -Path "${tempFile.replace(/\\/g, '\\\\')}" -Destination "${hostsPath.replace(/\\/g, '\\\\')}" -Force'`;
        execSync(`powershell -Command "${psCommand}"`, { encoding: 'utf8' });
        
        // 等待一下让操作完成
        await new Promise(r => setTimeout(r, 2000));
        
        // 清理临时文件
        try { fs.unlinkSync(tempFile); } catch (e) {}
        
      } catch (e2) {
        return { success: false, message: '修改hosts文件失败，请以管理员身份运行程序\n\n或手动将以下内容添加到 C:\\Windows\\System32\\drivers\\etc\\hosts 文件：\n\n127.0.0.1 dldir1.qq.com\n127.0.0.1 dldir1v6.qq.com' };
      }
    }
    
    // 刷新DNS缓存
    try {
      execSync('ipconfig /flushdns', { encoding: 'utf8' });
      sendLog('info', 'DNS缓存已刷新');
    } catch (e) {
      sendLog('warn', '刷新DNS缓存失败');
    }
    
    sendLog('success', '微信更新已禁用');
    return { 
      success: true, 
      message: `微信自动更新已禁用！\n\n已添加规则：\n127.0.0.1 ${domain1}\n127.0.0.1 ${domain2}\n\n备份文件：${backupPath}` 
    };
    
  } catch (error) {
    sendLog('error', `禁用微信更新失败: ${error.message}`);
    return { success: false, message: error.message };
  }
});
