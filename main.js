const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require('fs');
const ini = require('ini');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile("index.html");
    
    // 개발자 도구 자동 실행 (개발 중에만 사용)
    // mainWindow.webContents.openDevTools();
    
    // 창이 준비되면 표시
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.setFullScreen(true);
    });
    
    // ESC 키로 전체화면 종료 방지
    mainWindow.on('leave-full-screen', () => {
        mainWindow.setFullScreen(true);
    });
}

function loadConfig() {
    try {
        const configPath = path.join(__dirname, 'config.ini');
        const configContent = fs.readFileSync(configPath, 'utf-8');
        return ini.parse(configContent);
    } catch (error) {
        console.error('설정 파일을 읽는 중 오류가 발생했습니다:', error);
        return null;
    }
}

app.whenReady().then(() => {
    createWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

// 설정 요청 처리
ipcMain.on('get-config', (event) => {
    const config = loadConfig();
    if (config) {
        event.reply('config-loaded', config);
    } else {
        console.error('설정을 로드할 수 없습니다.');
    }
});