

cordova-custom-config plugin [![Build Status](https://travis-ci.org/dpa99c/cordova-custom-config-example.svg?branch=master)](https://travis-ci.org/dpa99c/cordova-custom-config-example/branches) [![Latest Stable Version](https://img.shields.io/npm/v/cordova-custom-config.svg)](https://www.npmjs.com/package/cordova-custom-config) [![Total Downloads](https://img.shields.io/npm/dt/cordova-custom-config.svg)](https://npm-stat.com/charts.html?package=cordova-custom-config)
============================


<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**

- [Overview](#overview)
  - [Why should I use it?](#why-should-i-use-it)
  - [Important note for remote build environments](#important-note-for-remote-build-environments)
- [Installation](#installation)
- [Usage](#usage)
  - [Removable preferences via backup/restore](#removable-preferences-via-backuprestore)
  - [Preferences](#preferences)
  - [Config blocks](#config-blocks)
  - [Android](#android)
    - [Android preferences](#android-preferences)
      - [Android namespace attribute](#android-namespace-attribute)
      - [XPath preferences](#xpath-preferences)
    - [Android config blocks](#android-config-blocks)
    - [Android example](#android-example)
  - [iOS](#ios)
    - [iOS preferences](#ios-preferences)
      - [XCBuildConfiguration](#xcbuildconfiguration)
        - [.xcconfig files](#xcconfig-files)
        - [CODE\_SIGN\_IDENTITY preferences](#code%5C_sign%5C_identity-preferences)
      - [xcodefunc](#xcodefunc)
    - [iOS config blocks](#ios-config-blocks)
      - [iOS project plist config blocks](#ios-project-plist-config-blocks)
      - [iOS Precompile Header config blocks](#ios-precompile-header-config-blocks)
    - [iOS image resources](#ios-image-resources)
    - [iOS example](#ios-example)
  - [Plugin preferences](#plugin-preferences)
  - [Log output](#log-output)
- [Example project](#example-project)
- [TODO](#todo)
- [Credits](#credits)
- [License](#license)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Overview

This Cordova/Phonegap plugin for iOS and Android provides hook scripts to update platform configuration files based on custom preferences and config-file data defined in config.xml
that are not supported out-of-the-box by Cordova/Phonegap.

<!-- DONATE -->
[![donate](https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG_global.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=ZRD3W47HQ3EMJ)

I dedicate a considerable amount of my free time to developing and maintaining this Cordova plugin, along with my other Open Source software.
To help ensure this plugin is kept updated, new features are added and bugfixes are implemented quickly, please donate a couple of dollars (or a little more if you can stretch) as this will help me to afford to dedicate time to its maintenance. Please consider donating if you're using this plugin in an app that makes you money, if you're being paid to make the app, if you're asking for new features or priority bug fixes.
<!-- END DONATE -->


## Why should I use it?

While some platform preferences can be set via Cordova/Phonegap in the config.xml, many (especially ones related to newer platform releases) cannot.
One solution is to manually edit the configuration files in the `platforms/` directory, however this is not maintainable across multiple development machines or a CI environment
where subsequent build operations may overwrite your changes.

This plugin attempts to address this gap by allowing additional platform-specific preferences to be set after the `prepare` operation has completed,
allowing either preferences set by Cordova to be overridden or other unspecified preferences to be set.
Since the custom preferences are entered into the config.xml, they can be committed to version control and therefore applied across multiple development machines, CI environments,
and maintained between builds or even if a platform is removed and re-added.

The plugin is registered on [npm](https://www.npmjs.com/package/cordova-custom-config) (requires Cordova CLI 5.0.0+) as `cordova-custom-config`


## Important note for remote build environments

This plugin is intended for the automated application of custom configuration to native platform projects in a **local build environment**.

This plugin **WILL NOT WORK** with remote ("Cloud") build environments that do not support the execution of this plugin's [hook scripts](https://cordova.apache.org/docs/en/latest/guide/appdev/hooks/). This includes:

- [Phonegap Build](https://github.com/phonegap/build/issues/425) 
- [Intel XDK](https://software.intel.com/en-us/xdk/docs/add-manage-project-plugins)
- [Telerik Appbuilder](http://docs.telerik.com/platform/appbuilder/cordova/using-plugins/using-custom-plugins/using-custom-plugins)
- [Ionic Cloud](https://docs.ionic.io/services/package/#hooks)
 
If you are using another cloud-based Cordova/Phonegap build service and find this plugin doesn't work, the reason is probably also the same.

FWIW: if you are professionally developing Cordova/Phonegap apps, you are eventually going to find it preferable to build locally.

# Installation

`cordova-custom-config@4+` requires the plugin to be installed via the [`cordova-fetch`](https://cordova.apache.org/news/2016/05/24/tools-release.html) mechanism in order to satisfy its package dependencies by installing it via npm.

Therefore a Cordova CLI version of `cordova@7+` is required to install the plugin: 

    $ cordova plugin add cordova-custom-config

Or `cordova@6.2+` if the `--fetch` option is specified explicitly:

    $ cordova plugin add cordova-custom-config --fetch

# Usage

The hook scripts included in this plugin are run after each platform `prepare` operation and apply preferences dictated by custom keys in the project `config.xml` file to the relevant platform config files.
As such, all you need to do to "use" this plugin is include the relevant keys in your config.xml and the scripts will take care of the rest when you build your project.

NOTE: There are no run-time source files included in this plugin - it is simply a convenient package of hook scripts.

## Removable preferences via backup/restore

By default, any changes made by this plugin to platform config files are irreversible - i.e. if you want to undo changes made by the plugin, you'll need to remove then re-add the Cordova platform, for example:

    cordova platform rm android && cordova platform add android

However, if you want the changes made to be reversible, you can enable auto-backup/restore functionality by adding the following preference inside the top-level `<widget>` element of your `config.xml`:
                                                                                                                 
    <preference name="cordova-custom-config-autorestore" value="true" />

When the first `prepare` operation runs after the plugin is installed, it will make backup copies of the original configuration files before it makes any modifications. 
These backup copies are stored in `plugins/cordova-custom-config/backup/` and will be restored before each `prepare` operation, allowing Cordova to make modifications and then the plugin to make further modifications after the `prepare`.

This means changes made by the plugin are reversible, so removing a custom element from the `config.xml` will remove it from the platform configuration file on the next `prepare` operation and uninstalling the plugin will restore the configuration files to their original state (before the plugin made any modifications).

Consequently, any manual changes made to the platform configuration files in `platforms/` **after** installing the plugin will be overwritten by the plugin on the next `prepare` operation.

To prevent auto-restoring of backups and make manual changes to platform configuration files persist, remove the `autorestore` preference from the `config.xml`

## Preferences

Preferences are set by defining a `<preference>` element in the config.xml, e.g. `<preference name="android-launchMode" value="singleTop" />`

1.  Preferences defined outside of the platform element will apply to all platforms
2.  Preferences defined inside a platform element will apply only to the specified platform
3.  Platform preferences take precedence over common preferences
4.  Platform-specific preferences must be prefixed with the platform name (e.g. `name="ios-somepref"`) and be defined inside a platform element.


## Config blocks

`<config-file>` blocks allow platform-specific chunks of config to be defined as an XML subtree in the `config.xml`, which is then applied to the appropriate platform configuration file by the plugin.

1.  config-file elements MUST be defined inside a platform element, otherwise they will be ignored.
2.  config-file target attributes specify the target file to update. (AndroidManifest.xml or *-Info.plist)
3.  config-file parent attributes specify the parent element (AndroidManifest.xml) or parent key (*-Info.plist) that the child data will replace or be appended to.
4.  config-file elements are uniquely indexed by target AND parent for each platform.
5.  If there are multiple config-file's defined with the same target AND parent, the last config-file will be used
6.  Elements defined WITHIN a config-file will replace or be appended to the same elements relative to the parent element
7.  If a unique config-file contains multiples of the same elements (other than uses-permission elements which are selected by by the uses-permission name attribute), the last defined element will be retrieved.

## Android

The plugin currently supports setting of custom config only in `platforms/android/AndroidManifest.xml`.
For a list of possible manifest values see [http://developer.android.com/guide/topics/manifest/manifest-intro.html](http://developer.android.com/guide/topics/manifest/manifest-intro.html)

### Android preferences

Note: [cordova@6.4.0](https://cordova.apache.org/news/2016/10/25/tools-release.html) adds support for [`<edit-config>`](http://cordova.apache.org/docs/en/6.x/plugin_ref/spec.html#edit-config) blocks in `config.xml`, which enables you to achieve similar manipulation of Android preferences without needing this plugin.

- `<preference>` elements in `config.xml` are used to set set attributes on existing elements in the `AndroidManifest.xml`.
    - e.g. `<preference name="android-manifest/@android:hardwareAccelerated" value="false" />`
    - will result in `AndroidManifest.xml`: `<manifest android:hardwareAccelerated="false">`
- Sometimes there plugins set some defaults in AndroidManifest.xml that you may not want.
  It is also possible to delete nodes using the preferences and the `delete="true"` attribute.
  - e.g. `<preference name="android-manifest/uses-permission/[@android:name='android.permission.WRITE_CONTACTS']" delete="true" />`
  - will delete the existing node `<uses-permission android:name="android.permission.WRITE_CONTACTS" />`

#### Android namespace attribute

__Important:__ In order to user the `android:` namespace in preferences within your `config.xml`, you must include the android namespace attribute on the root `<widget>` element.
The namespace attribute fragment is:

    xmlns:android="http://schemas.android.com/apk/res/android"

so your `<widget>` element should look something like:

    <widget
        id="com.my.app"
        version="0.0.1"
        xmlns="http://www.w3.org/ns/widgets"
        xmlns:cdv="http://cordova.apache.org/ns/1.0"
        xmlns:android="http://schemas.android.com/apk/res/android">

#### XPath preferences

Android manifest preferences are set by using XPaths in the preference name to define which element attribute the value should be applied to.

The preference name should be prefixed with `android-manifest` then follow with an XPath which specifies the element and attribute to apple the value to.

For example:

    <preference name="android-manifest/application/activity/@android:launchMode" value="singleTask" />

This preference specifies that the `launchMode` attribute should be given a value of `singleTask`:

    <activity android:launchMode="singleTask">

If your manifest contains other activities, you should specify the activity name in the XPath. Note that the activity name for Cordova 4.2.0 and below was "CordovaApp" whereas Cordova 4.3.0 and above is "MainActivity". For example:

    <preference name="android-manifest/application/activity[@android:name='MainActivity']/@android:launchMode" value="singleTask" />

If the attribute you are setting is on the root `<manifest>` element, just omit the element name and specify the attribute. For example:

    <preference name="android-manifest/@android:installLocation" value="auto" />


### Android config blocks

- `<config-file>` blocks are use to define chunks of config an XML subtree, to be inserted into `AndroidManifest.xml`
- the `target` attribute must be set to `AndroidManifest.xml`: `<config-file target="AndroidManifest.xml">`
- the `parent` attribute defines an Xpath to the parent element in the `AndroidManifest.xml` under which the XML subtree block should be inserted
    - to insert a block under the root `<manifest>` element, use `parent="/*"`
    - to insert a block under a descendant of `<manifest>`, use an Xpath prefixed with `./`
        e.g `parent="./application/activity"` will insert the block under `/manifest/application/activity`
- the child elements inside the `<config-file>` block will be inserted under the parent element.

For example:

    <config-file target="AndroidManifest.xml" parent="./application">
        <some-element />
    </config-file>

will result in `AndroidManifest.xml` with:

    <manifest ...>
        <application ...>
            <some-element />
        </application>
    </manifest>

**NOTE:** By default, if the specified parent element contains an existing child element of the same name as that defined in the XML subtree, the existing element will be overwritten.
For example:

    <config-file target="AndroidManifest.xml">
        <application android:name="MyApp" />
    </config-file>

will replace the existing `<application>` element(s).
    
To force the preservation (rather than replacement) of existing child elements, you can use the `mode="add"` attribute.
So for the example above:

    <config-file target="AndroidManifest.xml" mode="add">
        <application android:name="MyApp" />
    </config-file>

will preserve the existing `<application>` element(s).


### Android example

config.xml:

    <platform name="android">
        <!-- custom preferences examples -->
        <preference name="android-manifest/application/activity/@android:windowSoftInputMode" value="stateVisible" />
        <preference name="android-manifest/@android:installLocation" value="auto" />
        <preference name="android-manifest/application/@android:hardwareAccelerated" value="false" />
        <preference name="android-manifest/@android:hardwareAccelerated" value="false" />
        <preference name="android-manifest/application/activity/@android:configChanges" value="orientation" />
        <preference name="android-manifest/application/activity/@android:theme" value="@android:style/Theme.Material" />

        <!-- specify activity name -->
        <preference name="android-manifest/application/activity[@android:name='MainActivity']/@android:launchMode" value="singleTask" />
        
        <!-- Delete an element -->
        <preference name="android-manifest/application/activity[@android:name='DeleteMe']" delete="true" />


        <!-- These preferences are actually available in Cordova by default although not currently documented -->
        <preference name="android-minSdkVersion" value="10" />
        <preference name="android-maxSdkVersion" value="22" />
        <preference name="android-targetSdkVersion" value="21" />

        <!-- Or you can use a config-file element for them -->
        <config-file target="AndroidManifest.xml" parent="/*">
            <uses-sdk android:maxSdkVersion="22" android:minSdkVersion="10" android:targetSdkVersion="21" />
        </config-file>


        <!-- custom config example -->
         <config-file target="AndroidManifest.xml" parent="/*">
            <supports-screens
                android:xlargeScreens="false"
                android:largeScreens="false"
                android:smallScreens="false" />

            <uses-permission android:name="android.permission.READ_CONTACTS" android:maxSdkVersion="15" />
            <uses-permission android:name="android.permission.WRITE_CONTACTS" />
        </config-file>
        
        <!-- Add (rather than overwrite) a config-file block -->
        <config-file target="AndroidManifest.xml" parent="./" mode="add">
            <application android:name="customApplication"></application>
        </config-file>
        
    </platform>

## iOS

- The plugin currently supports custom configuration of:
    - the project plist (`*-Info.plist`) using `<config-file>` blocks
    - build settings using `<preference>` elements
    - image asset catalogs using `<resource>` elements
- All iOS-specific config should be placed inside the `<platform name="ios">` in `config.xml`.

### iOS preferences

- Preferences for iOS can be used to define build configuration settings
- The plugin currently supports:
    - setting of `XCBuildConfiguration` block keys in the `project.pbxproj` file
    - `xcodefunc` as an interface to apply functions from [node-xcode](https://github.com/alunny/node-xcode)

#### XCBuildConfiguration

- XCBuildConfiguration `<preference>` elements are used to set preferences in the project settings file `platforms/ios/{PROJECT_NAME}/{PROJECT_NAME}.xcodeproj/project.pbxproj`
- Currently, `XCBuildConfiguration` is the only supported block type.
- However, there is no constraint on the list of keys for which values may be set.
- If an entry already exists in an `XCBuildConfiguration` block for the specified key, the existing value will be overwritten with the specified value.
- If no entry exists in any `XCBuildConfiguration` block for the specified key, a new key entry will be created in each `XCBuildConfiguration` block with the specified value.
- By default, values will be applied to both "Release" and "Debug" `XCBuildConfiguration` blocks.
- However, the block type can be specified by adding a `buildType` attribute to the `<preference>` element in the config.xml: value is either `debug` or `release`
    - e.g `<preference name="ios-XCBuildConfiguration-IPHONEOS_DEPLOYMENT_TARGET" value="7.0" buildType="release" />`
- By default, both the key (preference name) and value will be quote-escaped when inserted into the `XCBuildConfiguration` block.
    - e.g. `<preference name="ios-XCBuildConfiguration-IPHONEOS_DEPLOYMENT_TARGET" value="7.0" buildType="release" />`
    - will appear in `project.pbxproj` as: `"IPHONEOS_DEPLOYMENT_TARGET" = "7.0";`
- The default quoting can be override by setting the `quote` attribute on the `<preference>` element.
    - Valid values are:
        - "none" - don't quote key or value
        - "key" - quote key but not value
        - "value" - quote value but not key
        - "both" - quote both key and value
    - e.g. `<preference name="ios-XCBuildConfiguration-IPHONEOS_DEPLOYMENT_TARGET" value="7.0" buildType="release" quote="none" />`
    - will appear in `project.pbxproj` as: `IPHONEOS_DEPLOYMENT_TARGET = 7.0;`

- Preferences should be defined in the format `<preference name="ios-SOME_BLOCK_TYPE-SOME_KEY" value="SOME_VALUE" />`
- Therefore, the preference name should be prefixed with `ios-XCBuildConfiguration`, for example:

    <preference name="ios-XCBuildConfiguration-ENABLE_BITCODE" value="YES" />

##### .xcconfig files

- Cordova uses `.xcconfig` files in `/platforms/ios/cordova/` to override Xcode project settings in `project.pbxproj` with build-type specific values.
    - `build.xcconfig` is overriden by settings in `build-debug.xcconfig` and `build-release.xcconfig` for the corresponding build type.
- When applying a custom preference, the plugin will look for an existing entry in the `.xcconfig` file that corresponds to the buildType attribute.
    - If buildType attribute is "debug" or "release", the plugin will look in `build-debug.xcconfig` or `build-release.xcconfig` respectively.
    - If buildType is not specified or set to "none", the plugin will look in `build.xcconfig`.
- By default, if an entry is found in the `.xcconfig` file which corresponds to the custom preference name in the `config.xml`, the value in the `.xcconfig` file will be overwritten with the value in the `config.xml`.
- To prevent the plugin from overwriting the value of a specific preference in the corresponding `.xcconfig` file, set the preference attribute `xcconfigEnforce="false"`.
     - e.g `<preference name="ios-XCBuildConfiguration-SOME_PREFERENCE" value="Some value" buildType="debug" xcconfigEnforce="false" />`
- If a preference value doesn't already exist in the corresponding `.xcconfig` file, you can force its addition by setting the preference attribute `xcconfigEnforce="true"`.
This will append it to the corresponding .xcconfig` file.
     - e.g `<preference name="ios-XCBuildConfiguration-SOME_PREFERENCE" value="Some value" buildType="debug" xcconfigEnforce="true" />`
- A backup copy of any modified `.xcconfig` file will be made in 'plugins/cordova-custom-config/backup/ios'. By default, these backups will be restored prior to the next `prepare` operation.
- Auto-restore of the backups can be disabled by setting `<preference name="cordova-custom-config-autorestore" value="false" />` in the `config.xml`.
- Preference names and values will not be quote-escaped in `.xcconfig` files, so the `quote` attribute has no effect on them.

##### CODE\_SIGN\_IDENTITY preferences

- Cordova places its default CODE\_SIGN\_IDENTITY for Release builds in `build-release.xcconfig` but for Debug builds in `build.xcconfig.
- If you set a CODE\_SIGN\_IDENTITY preference in the `config.xml` with `buildType="release"`, the plugin will overwrite the defaults in `build-release.xcconfig`.
    - e.g. `<preference name="ios-XCBuildConfiguration-CODE\_SIGN\_IDENTITY" value="iPhone Distribution: My Release Profile (A1B2C3D4)" buildType="release" />`
- If you set a CODE\_SIGN\_IDENTITY preference in the `config.xml` with `buildType="debug"`, the plugin will overwrite the defaults in `build.xcconfig`.
    - e.g. `<preference name="ios-XCBuildConfiguration-CODE\_SIGN\_IDENTITY" value="iPhone Distribution: My Debug Profile (A1B2C3D4)" buildType="debug" />`
- You can prevent the CODE\_SIGN\_IDENTITY preferences being overwritten by setting `xcconfigEnforce="false"`.
    - e.g. `<preference name="ios-XCBuildConfiguration-CODE\_SIGN\_IDENTITY" value="iPhone Distribution: My Release Profile (A1B2C3D4)" buildType="release" xcconfigEnforce="false" />`
- You can force the plugin to add a new entry for CODE\_SIGN\_IDENTITY preference with `buildType="debug"` to `build-debug.xcconfig`, rather than overwriting the defaults in `build.xcconfig` by setting `xcconfigEnforce="true"`.
This will still override the defaults in `build.xcconfig`, because `build-debug.xcconfig` overrides `build.xcconfig`.
    - e.g. `<preference name="ios-XCBuildConfiguration-CODE\_SIGN\_IDENTITY" value="iPhone Distribution: My Debug Profile (A1B2C3D4)" buildType="debug" xcconfigEnforce="true" />`

#### xcodefunc

- `xcode-func` preferences enable functions within [node-xcode](https://github.com/alunny/node-xcode) to be called to edit different block types (such as Sources, Resources or Frameworks) in the `project.pbxproj`.
- The preference name should be `ios-xcodefunc`, i.e. `name="ios-xcodefunc"`
- The function to call in [node-xcode](https://github.com/alunny/node-xcode) should be specified using the `func` attribute, e.g. `func="addResourceFile"`
- Function arguments should be specified using `<arg />` child elements. It supports the following attributes:
    - `value`-  the value of the argument, e.g. `value="src/content/image.png"`
    - `type` - the type of the value, e.g. `type="String"`.
        - Supported types are:
            - `Null` - evaluates to `null`
            - `Undefined` - evaluates to `undefined`
            - `Object` - a stringified JSON object that will be parsed back into its object form
            - `Number` - a Javascript Number
            - `String` - a Javascript String
            - `Symbol` - a Javascript Symbol
        - If `type` is not specified, the argument value will be passed exactly as defined in the `value` attribute
    - `flag` - a modifier for specific types of argument, e.g. `flag="path"`
        - Currently, the only supported value is `path` which forces the path to be resolved either as an absolute path or relative to the project root.

For example:

    <preference name="ios-xcodefunc" func="addResourceFile">
        <arg type="String" value="src/content/image.png" flag="path" />
    </preference>

will add resource `image.png` from `./src/content` (i.e. `../../src/content/image.png` relative to `./platforms/ios/`)


### iOS config blocks

- `<config-file>` elements are currently used to:
    - set preferences in the project .plist file (`platforms/ios/{PROJECT_NAME}/{PROJECT_NAME}-Info.plist`).
    - add to Precompiled Headers file (`platforms/ios/{PROJECT_NAME}/{PROJECT_NAME}-Prefix.pch`).
- all `<config-file>` elements should have the  `platform` attribute set to `ios`: `<config-file platform="ios">`

#### iOS project plist config blocks

- the `target` attribute of the `<config-file>` should be set to `*-Info.plist`: `<config-file platform="ios" target="*-Info.plist">`
- the `parent` attribute is used to determine which key name to use for the custom preference
    - e.g. `<config-file platform="ios" target="*-Info.plist" parent="NSLocationAlwaysUsageDescription">`
    - will appear in `{PROJECT_NAME}-Info.plist` as `<key>NSLocationAlwaysUsageDescription</key>` under `/plist/dict`
- the value of the preference is set by the child elements of the `<config-file>` element. These will appear directly below the preference `<key>` in the .plist file.
    - For example:

        `<config-file platform="ios" target="*-Info.plist" parent="NSLocationAlwaysUsageDescription">
            <string>This app requires constant access to your location in order to track your position, even when the screen is off.</string>
        </config-file>`

    - will appear in the plist file as:

        `<key>NSLocationAlwaysUsageDescription</key>
        <string>This app requires constant access to your location in order to track your position, even when the screen is off.</string>`
- if the .plist value type is an array, by default the values in the `<config-file>` block will be merged with any existing values.
    - For example, if the plist already contains:

        `<key>LSApplicationQueriesSchemes</key>
        <array>
            <string>fbapi</string>
            <string>fb-messenger-api</string>
        </array>`

    - Then adding the `<config-file>` block:

        `<config-file parent="LSApplicationQueriesSchemes" target="*-Info.plist">
             <array>
                 <string>myapp</string>
                 <string>myapp2</string>
             </array>
        </config-file>`

    - will result in the plist file as:

        `<key>LSApplicationQueriesSchemes</key>
        <array>
            <string>fbapi</string>
            <string>fb-messenger-api</string>
            <string>myapp</string>
             <string>myapp2</string>
        </array>`

- this behaviour can also be explicitly specified by adding `mode="merge"` to the `<config-file>` block:
  - For example, the `<config-file>` block:

          `<config-file parent="LSApplicationQueriesSchemes" target="*-Info.plist" mode="replace">
               <array>
                   <string>myapp</string>
                   <string>myapp2</string>
               </array>
          </config-file>`

      - will also result in the plist file as:

          `<key>LSApplicationQueriesSchemes</key>
          <array>
              <string>fbapi</string>
              <string>fb-messenger-api</string>
              <string>myapp</string>
               <string>myapp2</string>
          </array>`

- to replace existing values with those in the `<config-file>` block, use the attribute `mode="replace"`:
     - For example, if the plist already contains:

        `<key>LSApplicationQueriesSchemes</key>
        <array>
            <string>fbapi</string>
            <string>fb-messenger-api</string>
        </array>`

    - Then adding the `<config-file>` block:

        `<config-file parent="LSApplicationQueriesSchemes" target="*-Info.plist" mode="replace">
             <array>
                 <string>myapp</string>
                 <string>myapp2</string>
             </array>
        </config-file>`

      - will result in the plist file as:

          `<key>LSApplicationQueriesSchemes</key>
          <array>
              <string>myapp</string>
               <string>myapp2</string>
          </array>`
          
- to delete existing values in the plist, specify the key to delete as the parent and use the attribute `mode="delete"`:
     - For example, if the plist already contains:

        `<key>LSApplicationQueriesSchemes</key>
        <array>
            <string>fbapi</string>
            <string>fb-messenger-api</string>
        </array>`

    - Then adding the `<config-file>` block:

        `<config-file parent="LSApplicationQueriesSchemes" target="*-Info.plist" mode="delete"/>`

      - will result in the existing block being removed from the plist
  

#### iOS Precompile Header config blocks

- the `target` attribute of the `<config-file>` should be set to `*-Prefix.pch`: `<config-file platform="ios" target="*-Prefix.pch">`

### iOS image resources

Purpose:
- Sometimes it can be necessary to create custom iOS image asset catalogs in Cordova-based iOS apps.
    - For example, some plugins require that custom images be present in a custom asset catalog in order to make use of them:
        - [cordova-plugin-themeablebrowser](https://github.com/initialxy/cordova-plugin-themeablebrowser)
        - [cordova-plugin-3dtouch](https://github.com/EddyVerbruggen/cordova-plugin-3dtouch)
    - This could be done manually by editing the platform project in XCode, but this is fragile since platform projects are volatile. 
        - i.e. can be removed when removing/updating the platform via Cordova CLI.
    - So this plugin provides a mechanism to automate the generation custom asset catalogs.

Usage:
- Image [asset catalogs](https://developer.apple.com/library/content/documentation/Xcode/Reference/xcode_ref-Asset_Catalog_Format/) can be defined using `<resource>` elements
- The `<resource>` elements must be places inside of the `<platform name="ios">` element
- The `<resource>` elements must have the attribute `type="image"`: `<resource type="image" />`
- The `src` attribute (required) should specify the relative local path to the image file. 
    - The relative root is the Cordova project root
    - e.g. `<resource src="resources/custom-catalog/back@1x.png" />`
        - where the image file is location in `/path/to/project/root/resources/custom-catalog/back@1x.png`
- The `catalog` attribute (required) specifies the name of the catalog to add the image to
    - e.g. `<resource catalog="custom-catalog"/>`
- The `scale` attribute (required) specifies the scale factor of the image
    - Valid values are: `1x`, `2x`, `3x`
    - e.g. `<resource scale="1x"/>`
- The `idiom` attribute (optional) specifies the target device family
    - Valid values are: 
        - `universal` - all devices
        - `iphone` - iPhones only
        - `ipad` - iPads only
        - `watch` - Apple Watch only
    - If not specified, defaults to `universal`
    - e.g. `<resource idiom="iphone"/>`
- Full example: 

    `<resource type="image" src="resources/custom-catalog/back@1x.png" catalog="custom-catalog" scale="1x" idiom="iphone" />`

### iOS example

config.xml:

    <platform name="ios">

        <!-- Set ENABLE_BITCODE to YES in XCode project file override NO value in /ios/cordova/build.xcconfig -->
        <preference name="ios-XCBuildConfiguration-ENABLE_BITCODE" value="YES" />

        <!-- Set deploy target SDKs for release and debug builds -->
        <preference name="ios-XCBuildConfiguration-IPHONEOS_DEPLOYMENT_TARGET" value="9.1" buildType="debug" quote="none" />
        <preference name="ios-XCBuildConfiguration-IPHONEOS_DEPLOYMENT_TARGET" value="7.0" buildType="release" />

        <!-- Custom code signing profiles (overriding those in /ios/cordova/*.xcconfig -->
        <preference name="ios-XCBuildConfiguration-CODE\_SIGN\_IDENTITY" value="iPhone Developer: Dave Alden (8VUQ6DYDLL)" buildType="debug" xcconfigEnforce="true" />
        <preference name="ios-XCBuildConfiguration-CODE\_SIGN\_IDENTITY[sdk=iphoneos*]" value="iPhone Developer: Dave Alden (8VUQ6DYDLL)" buildType="debug" />
        <preference name="ios-XCBuildConfiguration-CODE\_SIGN\_IDENTITY[sdk=iphoneos9.1]" value="iPhone Developer: Dave Alden (8VUQ6DYDLL)" buildType="debug" />
        <preference name="ios-XCBuildConfiguration-CODE\_SIGN\_IDENTITY" value="iPhone Distribution: Working Edge Ltd (556F3DRHUD)" buildType="release" xcconfigEnforce="false" />
        <preference name="ios-XCBuildConfiguration-CODE\_SIGN\_IDENTITY[sdk=iphoneos*]" value="iPhone Distribution: Working Edge Ltd (556F3DRHUD)" buildType="release" />
        <preference name="ios-XCBuildConfiguration-CODE\_SIGN\_IDENTITY[sdk=iphoneos9.1]" value="iPhone Distribution: Working Edge Ltd (556F3DRHUD)" buildType="release" />

        <!-- Add resource file by relative path -->
        <preference name="ios-xcodefunc" func="addResourceFile">
            <arg type="String" value="src/content/image.png" flag="path" />
        </preference>

       <!-- By default, merge with existing array values -->
       <config-file parent="LSApplicationQueriesSchemes" target="*-Info.plist">
           <array>
               <string>myapp</string>
               <string>myapp2</string>
               <string>myapp3</string>
           </array>
       </config-file>

       <!-- Explicitly merge with existing array values -->
       <config-file platform="ios" target="*-Info.plist" parent="UISupportedInterfaceOrientations" mode="merge" >
           <array>
               <string>UIInterfaceOrientationPortrait</string>
               <string>UIInterfaceOrientationPortraitUpsideDown</string>
           </array>
       </config-file>

       <!-- Replace existing values -->
       <config-file platform="ios" target="*-Info.plist" parent="UISupportedInterfaceOrientations~ipad" mode="replace">
           <array>
               <string>UIInterfaceOrientationPortrait</string>
               <string>UIInterfaceOrientationPortraitUpsideDown</string>
           </array>
       </config-file>

        <!-- Set background location mode -->
        <config-file platform="ios" target="*-Info.plist" parent="UIBackgroundModes">
            <array>
                <string>location</string>
            </array>
        </config-file>

        <!-- Set message displayed when app requests constant location updates -->
        <config-file platform="ios" target="*-Info.plist" parent="NSLocationAlwaysUsageDescription">
            <string>This app requires constant access to your location in order to track your position, even when the screen is off.</string>
        </config-file>

        <!-- Set message displayed when app requests foreground location updates -->
        <config-file platform="ios" target="*-Info.plist" parent="NSLocationWhenInUseUsageDescription">
            <string>This app will now only track your location when the screen is on and the app is displayed.</string>
        </config-file>

        <!-- Allow arbitrary loading of resources over HTTP on iOS9 -->
        <config-file platform="ios" target="*-Info.plist" parent="NSAppTransportSecurity">
            <dict>
                <key>NSAllowsArbitraryLoads</key>
                <true/>
            </dict>
        </config-file>
        
        <!-- Custom image asset catalog -->
        <resource type="image" catalog="custom" src="resources/ios/custom-icons/back@1x.png" scale="1x" idiom="universal" />
        <resource type="image" catalog="custom" src="resources/ios/custom-icons/back@2x.png" scale="2x" idiom="universal" />
        <resource type="image" catalog="custom" src="resources/ios/custom-icons/back@3x.png" scale="3x" idiom="universal" />
    </platform>

## Plugin preferences

The plugin supports some preferences which are used to customise the behaviour of the plugin.
These preferences should be placed at the top level (inside `<widget>`) rather than inside individual `<platform>` elements.
Each preference name is prefixed with `cordova-custom-config` to avoid name clashes, for example:

    <preference name="cordova-custom-config-autorestore" value="true" />

The following preferences are currently supported:

- `cordova-custom-config-autorestore` - if true, the plugin will restore a backup of platform configuration files taken at plugin installation time.
See the [Removable preferences](#removable-preferences-via-backuprestore) section for details. Defaults to `false`.
- `cordova-custom-config-stoponerror` - if true and an error occurs while updating config for a given platform during a `prepare` operation, the error will cause the `prepare` operation to fail.
If false, the plugin will log the error but will proceed and attempt to update any other platforms, before allowing the `prepare` operation to continue.
 Defaults to `false`.
- `cordova-custom-config-hook` - determines which Cordova hook operation to use to run the plugin and apply custom config.
Defaults to `after_prepare` if not specified.
You may wish to change this to apply custom config earlier or later, for example if config applied by this plugin is clashing with other plugins.
Possible values are: `before_prepare`, `after_prepare`, `before_compile`.
See the [Cordova hooks documentation](https://cordova.apache.org/docs/en/latest/guide/appdev/hooks/) for more on the Cordova build process.


## Log output

If you run the prepare operation with the `--verbose` command-line option, the plugin will output detail about the operations it's performing. Console messages are prefixed with `cordova-custom-config: `. For example:

    cordova prepare ios --verbose

# Example project

An example project illustrating use of this plugin can be found here: [https://github.com/dpa99c/cordova-custom-config-example](https://github.com/dpa99c/cordova-custom-config-example)

# TODO

See the [TODO list](https://github.com/dpa99c/cordova-custom-config/wiki/TODO) for planned features/improvements.


# Credits

Config update hook based on [this hook](https://github.com/diegonetto/generator-ionic/blob/master/templates/hooks/after_prepare/update_platform_config.js) by [Diego Netto](https://github.com/diegonetto)

# License
================

The MIT License

Copyright (c) 2016 Working Edge Ltd.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
