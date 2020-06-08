var _a = require('electron'), app = _a.app, BrowserWindow = _a.BrowserWindow;
var path = require('path');
if (require('electron-squirrel-startup')) {
    app.quit();
}
var createWindow = function () {
    var mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true
        }
    });
    mainWindow.loadFile(path.join(__dirname, 'index.html'));
    mainWindow.webContents.openDevTools();
};
app.on('ready', createWindow);
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
//# sourceMappingURL=index.js.map