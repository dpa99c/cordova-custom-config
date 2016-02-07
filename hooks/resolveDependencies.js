#!/usr/bin/env node

/**
 * Check all necessary module dependencies are installed.
 * @module resolveDependencies
 */
var resolveDependencies = (function () {

    /**********
     * Modules
     **********/
    var exec = require('child_process').exec,
        fs = require('fs'),
        path = require('path');

    /**********************
     * Internal properties
     *********************/
    var resolveDependencies = {},
        sourcePackageJson,
        targetPackageJson,
        tempPackageJson,
        lockfile,
        completefile,
        completeCallback,
        hooksPath,
        logger;

    /*********************
     * File utilities
     *********************/
    function copyFile(source, target, cb) {
        var cbCalled = false;

        var rd = fs.createReadStream(source);
        rd.on("error", function (err) {
            done(err);
        });
        var wr = fs.createWriteStream(target);
        wr.on("error", function (err) {
            done(err);
        });
        wr.on("close", function (ex) {
            done();
        });
        rd.pipe(wr);

        function done(err) {
            if (!cbCalled) {
                cb(err);
                cbCalled = true;
            }
        }
    }

    function fileExists(target, cb) {
        fs.stat(target, function (err, stat) {
            cb(err === null);
        });
    }

    function deleteFile(target, cb) {
        fs.unlink(target, cb);
    }

    function createFile(content, target, cb) {
        var cbCalled = false;

        var wr = fs.createWriteStream(target);
        wr.on("error", function (err) {
            done(err);
        });
        wr.on("close", function (ex) {
            done();
        });
        wr.write(content);
        wr.end();

        function done(err) {
            if (!cbCalled) {
                cb(err);
                cbCalled = true;
            }
        }
    }

    function renameFile(source, target, cb) {
        fs.rename(source, target, cb);
    }

    /*********************
     * Internal procedures
     *********************/

    // Install modules via npm CLI
    function installModules(cb) {
        logger.log("Installing plugin dependencies...");
        
        var cmd = 'npm install';
        logger.debug("Running " + cmd);
        exec(cmd, function (err, stdout, stderr) {
            logger.debug("Completed " + cmd);
            cb(err);
        });
    }

    // Check for completefile, indicating this script has already successfully installed dependencies.
    function checkCompletefile(){
        fileExists(completefile, function (exists) {
            if (exists) {
                logger.debug("completefile exists, so assuming all dependencies are already installed. Aborting.");
                complete();
            } else {
                checkLockfile();
            }
        });
    }

    // Check for a lockfile, indicating an instance of this script is already running
    function checkLockfile(){
        fileExists(lockfile, function (exists) {
            if (exists) {
                logger.debug("lockfile exists, so assuming that another instance of this script is running. Aborting.");
                complete();
            } else {
                createFile("locked", lockfile, function(err){
                    if (err) {
                        logger.error("Error creating lockfile: " + err);
                        return -1;
                    }
                    checkForRealPackageJson();
                });
            }
        });
    }

    // Check if a real package.json exists in the project root
    function checkForRealPackageJson(){
        fileExists(targetPackageJson, function (exists) {
            if (exists) {
                logger.debug("package.json already exists");
                copyFile(targetPackageJson, tempPackageJson, function (err) {
                    if (err) {
                        logger.error("Error copying package.json to package.json.tmp: " + err);
                        return -1;
                    }
                    logger.debug("Copied existing package.json to package.json.tmp");
                    deployPluginPackageJson();
                });
            } else {
                deployPluginPackageJson();
            }
        });
    }

    // Dependency resolution is complete
    function complete() {
        logger.debug("Dependency resolution complete");
        if(completeCallback){
            completeCallback();
        }
    }

    // Rename our lockfile to completefile now dependency resolution is complete
    function removeLockfile(){
        renameFile(lockfile, completefile, function (err) {
            if (err) {
                logger.error("Error renaming our lockfile to completefile: " + err);
                return -1;
            }
            logger.debug("Renamed our lockfile to completefile");
            complete();
        })
    }

    // Deploy our plugin's package.json and execute npm install
    function deployPluginPackageJson() {
        logger.debug("Copying package.json");
        copyFile(sourcePackageJson, targetPackageJson, function (err) {
            if (err) {
                logger.error("Error copying plugin's package.json: " + err);
                return -1;
            }
            logger.debug("Copied package.json");
            installModules(function(err) {
                if (err) {
                    logger.error("Error installing modules: " + err);
                    return -1;
                }
                logger.debug("Installed modules");
                fileExists(tempPackageJson, function (exists) {
                    if (exists) {
                        logger.debug("package.json.tmp exists");
                        copyFile(tempPackageJson, targetPackageJson, function (err) {
                            if (err) {
                                logger.error("Error restoring package.json.tmp to package.json: " + err);
                                return -1;
                            }
                            logger.debug("Overwrote our package.json with original package.json.tmp");

                            logger.debug("Removing package.json.tmp");
                            deleteFile(tempPackageJson, function (err) {
                                if (err) {
                                    logger.error("Error removing package.json.tmp: " + err);
                                    return -1;
                                }
                                logger.debug("Removed package.json.tmp");
                                removeLockfile();
                            })
                        });
                    } else {
                        deleteFile(targetPackageJson, function (err) {
                            if (err) {
                                logger.error("Error removing our package.json: " + err);
                                return -1;
                            }
                            logger.debug("Removed our package.json");
                            removeLockfile();
                        })
                    }
                });

            });
        });
    }


    /*************
     * Public API
     *************/
    resolveDependencies.init = function (ctx, callback) {
        completeCallback = callback,
        hooksPath = path.resolve(ctx.opts.projectRoot, "plugins", ctx.opts.plugin.id, "hooks");
        logger = require(path.resolve(hooksPath, "logger.js"))(ctx),
        sourcePackageJson = path.resolve(ctx.opts.projectRoot, "plugins", ctx.opts.plugin.id, "package.json"),
        targetPackageJson = path.resolve(ctx.opts.projectRoot, "package.json"),
        tempPackageJson = path.resolve(ctx.opts.projectRoot, "package.json.tmp"),
        lockfile = path.resolve(ctx.opts.projectRoot, "plugins", ctx.opts.plugin.id, "dependency_resolution_lock"),
        completefile = path.resolve(ctx.opts.projectRoot, "plugins", ctx.opts.plugin.id, "dependency_resolution_complete");

        checkCompletefile();
    };
    return resolveDependencies;
})();

module.exports = function (ctx, callback) {
    resolveDependencies.init(ctx, callback);
};
