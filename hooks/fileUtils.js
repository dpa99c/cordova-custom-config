#!/usr/bin/env node

/**********
 * Globals
 **********/
var fs,
    path,
    _,
    et;

/**
 * Provides files utilities
 */
var fileUtils = (function(){

    /**********************
     * Internal properties
     *********************/
    var fileUtils = {}, context, configXmlData, settings;

    /************
     * Public API
     ************/

        // Parses a given file into an elementtree object
    fileUtils.parseElementtreeSync =  function(filename) {
        var contents = fs.readFileSync(filename, 'utf-8');
        if(contents) {
            //Windows is the BOM. Skip the Byte Order Mark.
            contents = contents.substring(contents.indexOf('<'));
        }
        return new et.ElementTree(et.XML(contents));
    };

    // Parses the config.xml into an elementtree object and stores in the config object
    fileUtils.getConfigXml = function() {
        if(!configXmlData) {
            configXmlData = fileUtils.parseElementtreeSync(path.join(context.opts.projectRoot, 'config.xml'));
        }
        return configXmlData;
    };

    // Returns plugin settings from config.xml
    fileUtils.getSettings = function (){
        if(!settings){
            settings = {};
            var name, preferences = fileUtils.getConfigXml().findall("preference");
            _.each(preferences, function (preference) {
                name = preference.attrib.name;
                if(name.match("cordova-custom-config")){
                    settings[name.split('-').pop()] = preference.attrib.value;
                }
            });
        }
        return settings;
    };

    /**
     * Used to get the name of the application from the xcodeCordovaProj directory path.
     * The xcodeCordovaProj directory path is defined in the locations property of the Cordova-iOS platform's API.
     */
    fileUtils.getProjectName = function(){
        const projectRoot = context.opts.projectRoot;
        const platformPath = path.join(projectRoot, 'platforms', 'ios');
        const cordova_ios = require(require.resolve('cordova-ios', { paths: [projectRoot] }));
        const iosProject = new cordova_ios('ios', platformPath);

        return path.basename(iosProject.locations.xcodeCordovaProj);
    };

    fileUtils.fileExists = function(filePath){
        try {
            return fs.statSync(filePath).isFile();
        }
        catch (err) {
            return false;
        }
    };

    fileUtils.directoryExists = function(dirPath){
        try {
            return fs.statSync(dirPath).isDirectory();
        }
        catch (err) {
            return false;
        }
    };

    fileUtils.createDirectory = function (dirPath){
        return fs.mkdirSync(dirPath);
    };

    fileUtils.copySync = function (sourcePath, targetPath){
        var contents = fs.readFileSync(sourcePath);
        fs.writeFileSync(targetPath, contents);
    };

    fileUtils.copySyncRelative = function (sourcePath, targetPath){
        fileUtils.copySync(path.resolve(sourcePath), path.resolve(targetPath));
    };

    fileUtils.init = function(ctx){
        context = ctx;

        // Load modules
        fs = require('fs');
        path = require('path');
        _ = require('lodash');
        et = require('elementtree');
    };
    return fileUtils;
})();

module.exports = function(ctx){
    fileUtils.init(ctx);
    return fileUtils;
};