#!/usr/bin/env node

/**********
 * Globals
 **********/
var path = require('path'),
    cwd = path.resolve(),
    logger,
    hooksPath,
    fs,
    _,
    fileUtils;

var restoreBackups = (function(){

    /**********************
     * Internal properties
     *********************/
    var restoreBackups = {}, context, projectName, logFn, settings;

    var PLATFORM_CONFIG_FILES = {
        "ios":{
            "{projectName}-Info.plist": "{projectName}/{projectName}-Info.plist",
            "project.pbxproj": "{projectName}.xcodeproj/project.pbxproj",
            "build.xcconfig": "cordova/build.xcconfig",
            "build-extras.xcconfig": "cordova/build-extras.xcconfig",
            "build-debug.xcconfig": "cordova/build-debug.xcconfig",
            "build-release.xcconfig": "cordova/build-release.xcconfig"
        },
        "android":{
            "AndroidManifest.xml": "AndroidManifest.xml"
        }
    };

    /*********************
     * Internal functions
     *********************/
    
    function restorePlatformBackups(platform){
        var configFiles = PLATFORM_CONFIG_FILES[platform],
            backupFile, backupFileName, backupFilePath, backupFileExists, targetFilePath;

        logger.debug("Checking to see if there are backups to restore...");
        for(backupFile in configFiles){
            backupFileName = parseProjectName(backupFile);
            backupFilePath = path.join(cwd, 'plugins', context.opts.plugin.id, "backup", platform, backupFileName);
            backupFileExists = fileUtils.fileExists(backupFilePath);
            if(backupFileExists){
                targetFilePath = path.join(cwd, 'platforms', platform, parseProjectName(configFiles[backupFile]));
                fs.copySync(backupFilePath, targetFilePath);
                logFn("Restored backup of '"+backupFileName+"' to :"+targetFilePath);
            }
        }
    }

    function parseProjectName(fileName){
        return fileName.replace(/{(projectName)}/g, projectName);
    }

    /*************
     * Public API
     *************/
    restoreBackups.init = function(ctx){
        context = ctx;

        // Load modules
        fs = require('fs-extra'),
            _ = require('lodash'),
            fileUtils = require(path.resolve(hooksPath, "fileUtils.js"))(context);

        projectName = fileUtils.getProjectName();
        logFn = context.hook === "before_plugin_uninstall" ? logger.log : logger.debug;

        settings = fileUtils.getSettings();
        if(typeof(settings.autorestore) !== "undefined" && settings.autorestore == "false"){
            logger.log("Skipping auto-restore of config file backup(s) due to config.xml preference");
            return;
        }

        // go through each of the platform directories
        var platforms = _.filter(fs.readdirSync('platforms'), function (file) {
            return fs.statSync(path.resolve('platforms', file)).isDirectory();
        });
        _.each(platforms, function (platform) {
            platform = platform.trim().toLowerCase();
            try{
                restorePlatformBackups(platform);
            }catch(e){
                logger.error("Error restoring backups for platform '"+platform+"': "+ e.message);
                if(settings.stoponerror) throw e;
            }
        });
    };

    return restoreBackups;
})();

module.exports = function(ctx) {
    hooksPath = path.resolve(ctx.opts.projectRoot, "plugins", ctx.opts.plugin.id, "hooks");
    logger = require(path.resolve(hooksPath, "logger.js"))(ctx);
    logger.debug("Running restoreBackups.js");

    if(ctx.hook === "before_plugin_uninstall"){
        restoreBackups.init(ctx); // no time to check for deps or files will get removed by plugin rm before backups can be restored
    }else{
        require(path.resolve(hooksPath, "resolveDependencies.js"))(ctx, restoreBackups.init.bind(this, ctx));
    }
};