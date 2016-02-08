#!/usr/bin/env node

/**
 * Check all necessary module dependencies are installed.
 * @module resolveDependencies
 */
(function () {

    /**********
     * Modules
     **********/
    var exec, fs, path, deferral;

    /**********************
     * Internal properties
     *********************/
    var sourcePackageJson,
        targetPackageJson,
        tempPackageJson,
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

    // Check if a real package.json exists in the project root
    function checkForRealPackageJson(){
        fileExists(targetPackageJson, function (exists) {
            if (exists) {
                logger.debug("package.json already exists");
                copyFile(targetPackageJson, tempPackageJson, function (err) {
                    if (err) {
                        deferral.reject("Error copying package.json to package.json.tmp: " + err);
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
        deferral.resolve();
    }


    // Deploy our plugin's package.json and execute npm install
    function deployPluginPackageJson() {
        logger.debug("Copying package.json");
        copyFile(sourcePackageJson, targetPackageJson, function (err) {
            if (err) {
                deferral.reject("Error copying plugin's package.json: " + err);
                return -1;
            }
            logger.debug("Copied package.json");
            installModules(function(err) {
                if (err) {
                    deferral.reject("Error installing modules: " + err);
                    return -1;
                }
                logger.debug("Installed modules");
                fileExists(tempPackageJson, function (exists) {
                    if (exists) {
                        logger.debug("package.json.tmp exists");
                        copyFile(tempPackageJson, targetPackageJson, function (err) {
                            if (err) {
                                deferral.reject("Error restoring package.json.tmp to package.json: " + err);
                                return -1;
                            }
                            logger.debug("Overwrote our package.json with original package.json.tmp");

                            logger.debug("Removing package.json.tmp");
                            deleteFile(tempPackageJson, function (err) {
                                if (err) {
                                    deferral.reject("Error removing package.json.tmp: " + err);
                                    return -1;
                                }
                                logger.debug("Removed package.json.tmp");
                                complete();
                            })
                        });
                    } else {
                        deleteFile(targetPackageJson, function (err) {
                            if (err) {
                                deferral.reject("Error removing our package.json: " + err);
                                return -1;
                            }
                            logger.debug("Removed our package.json");
                            complete();
                        })
                    }
                });

            });
        });
    }

    module.exports = function (ctx) {
        // resolve modules
        exec = ctx.requireCordovaModule('child_process').exec,
        fs = ctx.requireCordovaModule('fs'),
        path = ctx.requireCordovaModule('path'),
        deferral = ctx.requireCordovaModule('q').defer();

        // resolve paths
        hooksPath = path.resolve(ctx.opts.projectRoot, "plugins", ctx.opts.plugin.id, "hooks");
        logger = require(path.resolve(hooksPath, "logger.js"))(ctx),
        sourcePackageJson = path.resolve(ctx.opts.projectRoot, "plugins", ctx.opts.plugin.id, "package.json"),
        targetPackageJson = path.resolve(ctx.opts.projectRoot, "package.json"),
        tempPackageJson = path.resolve(ctx.opts.projectRoot, "package.json.tmp");

        checkForRealPackageJson();
        return deferral.promise;
    };
})();

