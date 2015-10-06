#!/usr/bin/env node

// global vars
var fs = require('fs-extra'),
    path = require('path'),
    cwd = path.resolve(),
    _ = require('lodash'),
    et = require('elementtree'),
    plist = require('plist'),
    xcode = require('xcode'),
    tostr = require('tostr'),
    fileUtils;

var rootdir, context, configXml, projectName, updatedFiles = {};

var platformConfig = (function(){

    /**********************
     * Internal properties
     *********************/

    var androidActivityNames = [
        "CordovaApp",  // Cordova <= 4.2.0
        "MainActivity" // Cordova >= 4.3.0
    ];

    /*  Global object that defines the available custom preferences for each platform.
     Maps a config.xml preference to a specific target file, parent element, and destination attribute or element
     */
    var preferenceMappingData = {
        'android': {
            'android-manifest-hardwareAccelerated': {target: 'AndroidManifest.xml', parent: './', destination: 'android:hardwareAccelerated'},
            'android-installLocation': {target: 'AndroidManifest.xml', parent: './', destination: 'android:installLocation'},
            'android-activity-hardwareAccelerated': {target: 'AndroidManifest.xml', parent: 'application', destination: 'android:hardwareAccelerated'},
            'android-configChanges': {target: 'AndroidManifest.xml', parent: 'application/activity[@android:name=\'{ActivityName}\']', destination: 'android:configChanges'},
            'android-launchMode': {target: 'AndroidManifest.xml', parent: 'application/activity[@android:name=\'{ActivityName}\']', destination: 'android:launchMode'},
            'android-theme': {target: 'AndroidManifest.xml', parent: 'application/activity[@android:name=\'{ActivityName}\']', destination: 'android:theme'},
            'android-windowSoftInputMode': {target: 'AndroidManifest.xml', parent: 'application/activity[@android:name=\'{ActivityName}\']', destination: 'android:windowSoftInputMode'}
        },
        'ios': {}
    };
    var preferencesData;


    /********************
     * Internal functions
     ********************/

    // Converts an elementtree object to an xml string.  Since this is used for plist values, we don't care about attributes
    function eltreeToXmlString(data) {
        var tag = data.tag;
        var el = '<' + tag + '>';

        if(data.text && data.text.trim()) {
            el += data.text.trim();
        } else {
            _.each(data.getchildren(), function (child) {
                el += eltreeToXmlString(child);
            });
        }

        el += '</' + tag + '>';
        return el;
    }


    /* Retrieves all <preferences ..> from config.xml and returns a map of preferences with platform as the key.
     *  If a platform is supplied, common prefs + platform prefs will be returned, otherwise just common prefs are returned.
     */
    function getPreferences(platform) {
        //init common config.xml prefs if we haven't already
        if(!preferencesData) {
            preferencesData = {
                common: configXml.findall('preference')
            };
        }

        var prefs = preferencesData.common || [];
        if(platform) {
            if(!preferencesData[platform]) {
                preferencesData[platform] = configXml.findall('platform[@name=\'' + platform + '\']/preference');
            }
            prefs = prefs.concat(preferencesData[platform]);
        }

        return prefs;
    }

    /* Retrieves all configured xml for a specific platform/target/parent element nested inside a platforms config-file
     element within the config.xml.  The config-file elements are then indexed by target|parent so if there are
     any config-file elements per platform that have the same target and parent, the last config-file element is used.
     */
    function getConfigFilesByTargetAndParent(platform) {
        var configFileData = configXml.findall('platform[@name=\'' + platform + '\']/config-file');

        return  _.indexBy(configFileData, function(item) {
            var parent = item.attrib.parent;
            //if parent attribute is undefined /* or */, set parent to top level elementree selector
            if(!parent || parent === '/*' || parent === '*/') {
                parent = './';
            }
            return item.attrib.target + '|' + parent;
        });
    }

    // Parses the config.xml's preferences and config-file elements for a given platform
    function parseConfigXml(platform) {
        var configData = {};
        parsePreferences(configData, platform);
        parseConfigFiles(configData, platform);

        return configData;
    }

    // Retrieves the config.xml's pereferences for a given platform and parses them into JSON data
    function parsePreferences(configData, platform) {
        var preferences = getPreferences(platform);
        switch(platform){
            case "ios":
                parseiOSPreferences(preferences, configData, platform);
                break;
            case "android":
                parseAndroidPreferences(preferences, configData, platform);
                break;
        }
    }

    // Parses iOS preferences into project.pbxproj
    function parseiOSPreferences(preferences, configData, platform){
        _.each(preferences, function (preference) {
            if(preference.attrib.name.match(new RegExp("^"+platform+"-"))){
                var parts = preference.attrib.name.split("-"),
                    target = "project.pbxproj",
                    prefData = {
                        type: parts[1],
                        name: parts[2],
                        value: preference.attrib.value
                };
                if(preference.attrib.buildType){
                    prefData["buildType"] = preference.attrib.buildType;
                }

                if(!configData[target]) {
                    configData[target] = [];
                }
                configData[target].push(prefData);
            }
        });
    }

    // Parses supported Android preferences using the preference mapping into the appropriate XML elements in AndroidManifest.xml
    function parseAndroidPreferences(preferences, configData, platform){
        var type = 'preference';

        _.each(preferences, function (preference) {
            var prefMappingData = preferenceMappingData[platform][preference.attrib.name],
                target,
                prefData;

            if (prefMappingData) {
                prefData = {
                    parent: prefMappingData.parent,
                    type: type,
                    destination: prefMappingData.destination,
                    data: preference
                };

                target = prefMappingData.target;
                if(!configData[target]) {
                    configData[target] = [];
                }
                configData[target].push(prefData);
            }
        });
    }

    // Retrieves the config.xml's config-file elements for a given platform and parses them into JSON data
    function parseConfigFiles(configData, platform) {
        var configFiles = getConfigFilesByTargetAndParent(platform),
            type = 'configFile';

        _.each(configFiles, function (configFile, key) {
            var keyParts = key.split('|');
            var target = keyParts[0];
            var parent = keyParts[1];
            var items = configData[target] || [];

            _.each(configFile.getchildren(), function (element) {
                items.push({
                    parent: parent,
                    type: type,
                    destination: element.tag,
                    data: element
                });
            });

            configData[target] = items;
        });
    }

    // Updates the AndroidManifest.xml target file with data from config.xml
    function updateAndroidManifest(targetFilePath, configItems) {
        var tempManifest = fileUtils.parseElementtreeSync(targetFilePath),
            root = tempManifest.getroot();

        _.each(configItems, function (item) {
            // if parent is not found on the root, child/grandchild nodes are searched
            var parentEl = root.find(item.parent) || root.find('*/' + item.parent),
                parentSelector,
                data = item.data,
                childSelector = item.destination,
                childEl;

            _.each(androidActivityNames, function(activityName){
                if(parentEl){
                    return;
                }
                parentSelector = item.parent.replace("{ActivityName}", activityName);
                parentEl = root.find(parentSelector) || root.find('*/' + parentSelector);
            });

            if(!parentEl) {
                return;
            }

            if(item.type === 'preference') {
                parentEl.attrib[childSelector] = data.attrib['value'];
            } else {
                // since there can be multiple uses-permission elements, we need to select them by unique name
                if(childSelector === 'uses-permission') {
                    childSelector += '[@android:name=\'' + data.attrib['android:name'] + '\']';
                }

                childEl = parentEl.find(childSelector);
                // if child element doesnt exist, create new element
                if(!childEl) {
                    childEl = new et.Element(item.destination);
                    parentEl.append(childEl);
                }

                // copy all config.xml data except for the generated _id property
                _.each(data, function (prop, propName) {
                    if(propName !== '_id') {
                        childEl[propName] = prop;
                    }
                });
            }
        });
        fs.writeFileSync(targetFilePath, tempManifest.write({indent: 4}), 'utf-8');
    }

    /* Updates the *-Info.plist file with data from config.xml by parsing to an xml string, then using the plist
     module to convert the data to a map.  The config.xml data is then replaced or appended to the original plist file
     */
    function updateIosPlist (targetFilePath, configItems) {
        var infoPlist = plist.parse(fs.readFileSync(targetFilePath, 'utf-8')),
            tempInfoPlist;

        _.each(configItems, function (item) {
            var key = item.parent;
            var plistXml = '<plist><dict><key>' + key + '</key>';
            plistXml += eltreeToXmlString(item.data) + '</dict></plist>';

            var configPlistObj = plist.parse(plistXml);
            infoPlist[key] = configPlistObj[key];
            fileUtils.debug("Write to plist; key="+key+"; value="+tostr(configPlistObj[key]));
        });

        tempInfoPlist = plist.build(infoPlist);
        tempInfoPlist = tempInfoPlist.replace(/<string>[\s\r\n]*<\/string>/g,'<string></string>');
        fs.writeFileSync(targetFilePath, tempInfoPlist, 'utf-8');
    }

    /**
     * Updates the project.pbxproj file with data from config.xml
     * @param {String} xcodeProjectPath - path to XCode project file
     * @param {Array} configItems - config items to update project file with
     */
    function updateIosPbxProj(xcodeProjectPath, configItems) {
        var xcodeProject = xcode.project(xcodeProjectPath);
        xcodeProject.parse(function(err){
            if(err){
                shell.echo('An error occurred during parsing of [' + xcodeProjectPath + ']: ' + JSON.stringify(err));
            }else{
                _.each(configItems, function (item) {
                    switch(item.type){
                        case "XCBuildConfiguration":
                            var buildConfig = xcodeProject.pbxXCBuildConfigurationSection();
                            var replaced = updateXCBuildConfiguration(item, buildConfig, "replace");
                            if(!replaced){
                                updateXCBuildConfiguration(item, buildConfig, "add");
                            }
                            break;
                    }
                });
                fs.writeFileSync(xcodeProjectPath, xcodeProject.writeSync(), 'utf-8');
            }
        });
    }

    /**
     * Updates an XCode build configuration setting with the given item.
     * @param {Object} item - configuration item containing setting data
     * @param {Object} buildConfig - XCode build config object
     * @param {String} mode - update mode: "replace" to replace only existing keys or "add" to add a new key to every block
     * @returns {boolean} true if buildConfig was modified
     */
    function updateXCBuildConfiguration(item, buildConfig, mode){
        var modified = false;
        for(var blockName in buildConfig){
            var block = buildConfig[blockName];
            if(typeof(block) === "object" && (block["buildSettings"][item.name] || mode === "add") &&
                (!item.buildType || item.buildType.toLowerCase() === block['name'].toLowerCase())){
                block["buildSettings"][item.name] = item.value;
                modified = true;
                fileUtils.debug(mode+" XCBuildConfiguration key='"+item.name+"' to value='"+item.value+"' for build type='"+block['name']+"' in block='"+blockName+"'");
            }
        }
        return modified;
    }


    function ensureBackup(targetFilePath, platform, targetFileName){
        var backupDirPath = path.join(cwd, 'plugins', context.opts.plugin.id, "backup"),
            backupPlatformPath = path.join(backupDirPath, platform),
            backupFilePath = path.join(backupPlatformPath, targetFileName);


        var backupDirExists = fileUtils.directoryExists(backupDirPath);
        if(!backupDirExists){
            fileUtils.createDirectory(backupDirPath);
            fileUtils.debug("Created backup directory: "+backupDirPath);
        }

        var backupPlatformExists = fileUtils.directoryExists(backupPlatformPath);
        if(!backupPlatformExists){
            fileUtils.createDirectory(backupPlatformPath);
            fileUtils.debug("Created backup platform directory: "+backupPlatformPath);
        }

        var backupFileExists = fileUtils.fileExists(backupFilePath);
        if(!backupFileExists){
            fs.copySync(targetFilePath, backupFilePath);
            fileUtils.debug("Backed up "+targetFilePath+" to "+backupFilePath);
        }else{
            fileUtils.debug("Backup exists for '"+targetFileName+"' at: "+backupFilePath);
        }

        if(!updatedFiles[targetFilePath]){
            fileUtils.log("Applied custom config from config.xml to "+targetFilePath);
            updatedFiles[targetFilePath] = true;
        }
    }

    /************
     * Public API
     ************/
    return {

        // Parses config.xml data, and update each target file for a specified platform
        updatePlatformConfig: function (platform) {
            var configData = parseConfigXml(platform),
                platformPath = path.join(rootdir, 'platforms', platform);

            _.each(configData, function (configItems, targetFileName) {
                var targetFilePath;

                if (platform === 'ios') {
                    if (targetFileName.indexOf("Info.plist") > -1) {
                        targetFileName =  projectName + '-Info.plist';
                        targetFilePath = path.join(platformPath, projectName, targetFileName);
                        ensureBackup(targetFilePath, platform, targetFileName);
                        updateIosPlist(targetFilePath, configItems);
                    }else if (targetFileName === "project.pbxproj") {
                        targetFilePath = path.join(platformPath, projectName + '.xcodeproj', targetFileName);
                        ensureBackup(targetFilePath, platform, targetFileName);
                        updateIosPbxProj(targetFilePath, configItems);
                    }

                } else if (platform === 'android' && targetFileName === 'AndroidManifest.xml') {
                    targetFilePath = path.join(platformPath, targetFileName);
                    ensureBackup(targetFilePath, platform, targetFileName);
                    updateAndroidManifest(targetFilePath, configItems);
                }
            });
        }
    };
})();

// Main
module.exports = function(ctx) {
    context = ctx;
    rootdir = context.opts.projectRoot;

    fileUtils = require(path.resolve(rootdir, "plugins", ctx.opts.plugin.id, "hooks", "fileUtils.js"))(context);
    configXml = fileUtils.getConfigXml();
    projectName = fileUtils.getProjectName();

    // go through each of the platform directories that have been prepared
    var platforms = _.filter(fs.readdirSync('platforms'), function (file) {
        return fs.statSync(path.resolve('platforms', file)).isDirectory();
    });
    _.each(platforms, function (platform) {
        platform = platform.trim().toLowerCase();
        platformConfig.updatePlatformConfig(platform);
    });
};