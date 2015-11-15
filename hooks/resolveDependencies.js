#!/usr/bin/env node

/**
 * Check all necessary module dependencies and install the missing ones locally.
 * @module resolveDependencies
 */
var resolveDependencies = (function(){

  /**********
   * Modules
   **********/
  var exec = require('child_process').exec,
      path = require('path'),
      cwd = path.resolve(),
      logger;

  /**********************
   * Internal properties
   *********************/
  var resolveDependencies = {},
      modules = [],
      MAX_RETRIES = 3,
      POST_INSTALL_DELAY = 10;

  /*********************
   * Internal functions
   *********************/

  /**
   * Discovers module dependencies in plugin's package.json and installs those modules.
   * @param {String} pluginId - ID of the plugin calling this hook
   */
  function getPackagesFromJson(pluginId, callback){
    var readJson = require('read-package-json');
    readJson(path.join(cwd, 'plugins', pluginId, 'package.json'), logger.error, false, function (er, data) {
      if (er) {
        logger.error("There was an error reading the file: "+er);
        return;
      }
      if(data['dependencies']){
        for(var k in data['dependencies']){
          modules.push(k);
        }
        installRequiredNodeModules(function(){
          logger.debug('All module dependencies are installed');
          callback();
        });
      }
    });
  }

  /**
   * Check if node package is installed.
   *
   * @param {String} moduleName
   * @return {Boolean} true if package already installed
   */
  function isNodeModuleInstalled(moduleName) {
    var installed = true;
    try {
      require.resolve(moduleName);
    } catch (err) {
      installed = false;
    }

    return installed;
  }

  /**
   * Install node module locally.
   * Basically, it runs 'npm install module_name'.
   *
   * @param {String} moduleName
   * @param {Callback(error)} callback
   */
  function installNodeModule(moduleName, callback) {
    var tries = 0;
    function checkInstall(err){
      if (isNodeModuleInstalled(moduleName)) {
        logger.debug('Node module ' + moduleName + ' is found');
        callback();
        return;
      }
      if(tries < MAX_RETRIES){
        logger.debug('Can\'t find module ' + moduleName + ', running npm install');
        doInstall();
        tries++;
      }else if(err){
        callback(err);
      }else{
        callback("Failed to install '"+moduleName+"' after "+MAX_RETRIES+" attempts");
      }
    }

    function doInstall(){
      var cmd = 'npm install ' + moduleName;
      exec(cmd, function(err, stdout, stderr) {
        setTimeout(checkInstall.bind(this, err), POST_INSTALL_DELAY);
      });
    }
    checkInstall();
  }

  /**
   * Install all required node packages.
   */
  function installRequiredNodeModules(callback) {
    if (modules.length == 0) {
      callback();
      return;
    }

    var moduleName = modules.shift();
    logger.debug('Installing "' + moduleName + '"');
    installNodeModule(moduleName, function(err) {
      if (err) {
        logger.error('Failed to install module ' + moduleName+": "+err);
        return;
      } else {
        logger.debug('Installed "' + moduleName + '"');
        installRequiredNodeModules(callback);
      }
    });
  }

  /*************
   * Public API
   *************/
  resolveDependencies.init = function(ctx, callback){
    logger = require(path.resolve(ctx.opts.projectRoot, "plugins", ctx.opts.plugin.id, "hooks", "logger.js"))(ctx);
    logger.debug("Running resolveDependencies.js");

    logger.debug("Installing pre-requisite modules");
    modules =['read-package-json'];
    installRequiredNodeModules(function(){
      logger.debug("Pre-requisite modules installed");
      getPackagesFromJson(ctx.opts.plugin.id, callback ? callback : function(){});
    });
  };
  return resolveDependencies;
})();

module.exports = function(ctx, callback) {
  resolveDependencies.init(ctx, callback);
};
