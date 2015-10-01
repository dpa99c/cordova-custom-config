#!/usr/bin/env node

// modules
var fs = require('fs-extra'),
    path = require('path'),
    cwd = path.resolve(),
    _ = require('lodash'),
    fileUtils;

// global vars
var rootdir, context, configXml, projectName, logFn;

// global consts
var PLATFORM_CONFIG_FILES = {
    "ios":{
        "{projectName}-Info.plist": "{projectName}/{projectName}-Info.plist",
        "project.pbxproj": "{projectName}.xcodeproj/project.pbxproj"
    },
    "android":{
        "AndroidManifest.xml": "AndroidManifest.xml"
    }
};

function restorePlatformBackups(platform){
    var configFiles = PLATFORM_CONFIG_FILES[platform],
        backupFile, backupFileName, backupFilePath, backupFileExists, targetFilePath;
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

module.exports = function(ctx) {
    context = ctx;
    rootdir = context.opts.projectRoot;

    fileUtils = require(path.resolve(rootdir, "plugins", ctx.opts.plugin.id, "hooks", "fileUtils.js"))(context);
    configXml = fileUtils.getConfigXml();
    projectName = fileUtils.getProjectName();
    logFn = context.hook === "before_plugin_rm" ? fileUtils.log : fileUtils.debug;

    // go through each of the platform directories
    var platforms = _.filter(fs.readdirSync('platforms'), function (file) {
        return fs.statSync(path.resolve('platforms', file)).isDirectory();
    });
    _.each(platforms, function (platform) {
        platform = platform.trim().toLowerCase();
        restorePlatformBackups(platform);
    });
};