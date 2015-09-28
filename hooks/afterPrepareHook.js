#!/usr/bin/env node

// global vars
var fs = require('fs'),
    path = require('path'),
    _ = require('lodash'),
    et = require('elementtree'),
    plist = require('plist'),
    xcode = require('xcode'),
    tostr = require('tostr');

var rootdir, context;

var platformConfig = (function(){

    /**********************
     * Internal properties
     *********************/

    /*  Global object that defines the available custom preferences for each platform.
     Maps a config.xml preference to a specific target file, parent element, and destination attribute or element
     */
    var preferenceMappingData = {
        'android': {
            'android-manifest-hardwareAccelerated': {target: 'AndroidManifest.xml', parent: './', destination: 'android:hardwareAccelerated'},
            'android-installLocation': {target: 'AndroidManifest.xml', parent: './', destination: 'android:installLocation'},
            'android-activity-hardwareAccelerated': {target: 'AndroidManifest.xml', parent: 'application', destination: 'android:hardwareAccelerated'},
            'android-configChanges': {target: 'AndroidManifest.xml', parent: 'application/activity[@android:name=\'CordovaApp\']', destination: 'android:configChanges'},
            'android-launchMode': {target: 'AndroidManifest.xml', parent: 'application/activity[@android:name=\'CordovaApp\']', destination: 'android:launchMode'},
            'android-theme': {target: 'AndroidManifest.xml', parent: 'application/activity[@android:name=\'CordovaApp\']', destination: 'android:theme'},
            'android-windowSoftInputMode': {target: 'AndroidManifest.xml', parent: 'application/activity[@android:name=\'CordovaApp\']', destination: 'android:windowSoftInputMode'}
        },
        'ios': {}
    };
    var configXmlData, preferencesData;

    var debug = function(msg){
        if(context.opts.verbose){
            console.log("afterPrepareHook: "+msg);
        }
    };

    /********************
     * Internal functions
     ********************/

    // Parses a given file into an elementtree object
    function parseElementtreeSync(filename) {
        var contents = fs.readFileSync(filename, 'utf-8');
        if(contents) {
            //Windows is the BOM. Skip the Byte Order Mark.
            contents = contents.substring(contents.indexOf('<'));
        }
        return new et.ElementTree(et.XML(contents));
    }

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

    // Parses the config.xml into an elementtree object and stores in the config object
    function getConfigXml() {
        if(!configXmlData) {
            configXmlData = parseElementtreeSync(path.join(rootdir, 'config.xml'));
        }

        return configXmlData;
    }

    /* Retrieves all <preferences ..> from config.xml and returns a map of preferences with platform as the key.
     *  If a platform is supplied, common prefs + platform prefs will be returned, otherwise just common prefs are returned.
     */
    function getPreferences(platform) {
        var configXml = getConfigXml();

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
        var configFileData = getConfigXml().findall('platform[@name=\'' + platform + '\']/config-file');

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
    function updateAndroidManifest(targetFile, configItems) {
        var tempManifest = parseElementtreeSync(targetFile),
            root = tempManifest.getroot();

        _.each(configItems, function (item) {
            // if parent is not found on the root, child/grandchild nodes are searched
            var parentEl = root.find(item.parent) || root.find('*/' + item.parent),
                data = item.data,
                childSelector = item.destination,
                childEl;

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

        fs.writeFileSync(targetFile, tempManifest.write({indent: 4}), 'utf-8');
    }

    /* Updates the *-Info.plist file with data from config.xml by parsing to an xml string, then using the plist
     module to convert the data to a map.  The config.xml data is then replaced or appended to the original plist file
     */
    function updateIosPlist (targetFile, configItems) {
        var infoPlist = plist.parse(fs.readFileSync(targetFile, 'utf-8')),
            tempInfoPlist;

        _.each(configItems, function (item) {
            var key = item.parent;
            var plistXml = '<plist><dict><key>' + key + '</key>';
            plistXml += eltreeToXmlString(item.data) + '</dict></plist>';

            var configPlistObj = plist.parse(plistXml);
            infoPlist[key] = configPlistObj[key];
            debug("Write to plist; key="+key+"; value="+tostr(configPlistObj[key]));
        });

        tempInfoPlist = plist.build(infoPlist);
        tempInfoPlist = tempInfoPlist.replace(/<string>[\s\r\n]*<\/string>/g,'<string></string>');
        fs.writeFileSync(targetFile, tempInfoPlist, 'utf-8');
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
                debug(mode+" XCBuildConfiguration key='"+item.name+"' to value='"+item.value+"' for build type='"+block['name']+"' in block='"+blockName+"'");
            }
        }
        return modified;
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
                var projectName, targetFile;

                if (platform === 'ios') {
                    projectName = getConfigXml().findtext('name');
                    if (targetFileName.indexOf("Info.plist") > -1) {
                        targetFile = path.join(platformPath, projectName, projectName + '-Info.plist');
                        updateIosPlist(targetFile, configItems);
                    }else if (targetFileName === "project.pbxproj") {
                        targetFile = path.join(platformPath, projectName + '.xcodeproj', targetFileName);
                        updateIosPbxProj(targetFile, configItems);
                    }


                } else if (platform === 'android' && targetFileName === 'AndroidManifest.xml') {
                    targetFile = path.join(platformPath, targetFileName);
                    updateAndroidManifest(targetFile, configItems);
                }
            });
        }
    };
})();

// Main
module.exports = function(ctx) {
    context = ctx;
    rootdir = context.opts.projectRoot;

    // go through each of the platform directories that have been prepared
    var platforms = _.filter(fs.readdirSync('platforms'), function (file) {
        return fs.statSync(path.resolve('platforms', file)).isDirectory();
    });
    _.each(platforms, function (platform) {
        platform = platform.trim().toLowerCase();
        platformConfig.updatePlatformConfig(platform);
    });
};