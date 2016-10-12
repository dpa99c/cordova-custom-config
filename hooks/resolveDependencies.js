#!/usr/bin/env node

module.exports = function(ctx){
    var PLUGIN_ID = ctx.opts.plugin.id;

    var exec = ctx.requireCordovaModule('child_process').exec;
    var fs = ctx.requireCordovaModule('fs');
    var path = ctx.requireCordovaModule('path');

    var hooksPath = path.resolve(ctx.opts.projectRoot, "plugins", ctx.opts.plugin.id, "hooks");
    var logger = require(path.resolve(hooksPath, "logger.js"))(ctx);

    var requiredModulePath = path.resolve(ctx.opts.projectRoot, "node_modules/"+PLUGIN_ID);
    var moduleExists;
    try {
        moduleExists =  fs.statSync(requiredModulePath).isDirectory();
    }
    catch (err) {
        moduleExists = false
    }

    if(!moduleExists){
        logger.log("npm dependencies missing - installing");
        exec('npm install '+PLUGIN_ID, function (err, stdout, stderr) {
            logger.verbose(stdout);
            logger.log("Installed npm dependencies");
        });
    }
};