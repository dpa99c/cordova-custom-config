#!/usr/bin/env node

// global vars
var fs = require('fs-extra'),
    path = require('path'),
    _ = require('lodash'),
    et = require('elementtree'),
    tostr = require('tostr');

var fileUtils = (function(){

    /**********************
     * Internal properties
     *********************/
    var context, configXmlData;

    /********************
     * Internal functions
     ********************/

    /************
     * Public API
     ************/
    return{
        // Parses a given file into an elementtree object
        parseElementtreeSync: function(filename) {
            var contents = fs.readFileSync(filename, 'utf-8');
            if(contents) {
                //Windows is the BOM. Skip the Byte Order Mark.
                contents = contents.substring(contents.indexOf('<'));
            }
            return new et.ElementTree(et.XML(contents));
        },
        // Parses the config.xml into an elementtree object and stores in the config object
        getConfigXml: function() {
            if(!configXmlData) {
                configXmlData = fileUtils.parseElementtreeSync(path.join(context.opts.projectRoot, 'config.xml'));
            }
            return configXmlData;
        },
        // Returns project name from config.xml
        getProjectName: function(){
            if(!configXmlData) {
                fileUtils.getConfigXml();
            }
            return configXmlData.findtext('name');
        },
        fileExists: function(filePath){
            try {
                return fs.statSync(filePath).isFile();
            }
            catch (err) {
                return false;
            }
        },
        directoryExists: function(dirPath){
            try {
                return fs.statSync(dirPath).isDirectory();
            }
            catch (err) {
                return false;
            }
        },
        createDirectory: function (dirPath){
            return fs.mkdirSync(dirPath);
        },
        setContext: function(ctx){
            context = ctx;
        },
        debug: function(msg){
            if(context.opts.verbose){
                console.log(context.opts.plugin.id+": "+msg);
            }
        },
        log: function(msg){
            console.log(context.opts.plugin.id+": "+msg);
        }
    }

})();

module.exports = function(ctx){
    fileUtils.setContext(ctx);
    return fileUtils;
};