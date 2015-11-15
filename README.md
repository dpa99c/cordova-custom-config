cordova-custom-config plugin
============================

* [Overview](#overview)
    * [Why should I use it?](#why-should-i-use-it)
* [Installation](#installation)
* [Usage](#usage)
    * [Backups](#backups)
    * [Preferences](#preferences)
    * [Config Files](#config-files)
    * [Android](#android)
        * [Android preferences](#android-preferences)
        * [Android example](#android-example)
    * [iOS](#ios)
        * [iOS preferences](#ios-preferences)
        * [iOS example](#ios-example)
    * [Plugin preferences](#plugin-preferences)
    * [Log output](#log-output)
* [Example project](#example-project)
* [TODO](#todo)
* [Credits](#credits)

# Overview

This Cordova/Phonegap plugin for iOS and Android provides hook scripts to update platform configuration files based on custom preferences and config-file data defined in config.xml
that are not supported out-of-the-box by Cordova/Phonegap.

## Why should I use it?

While some platform preferences can be set via Cordova/Phonegap in the config.xml, many (especially ones related to newer platform releases) cannot.
One solution is to manually edit the configuration files in the `platforms/` directory, however this is not maintainable across multiple development machines
and subsequent build operations may overwrite your changes.

This plugin attempts to address this gap by allowing additional platform-specific preferences to be set after the `prepare` operation has completed,
allowing either preferences set by Cordova to be overridden or other unspecified preferences to be set.
Since the custom preferences are entered into the config.xml, they can be committed to version control and therefore applied across multiple development machines,
and maintained between builds or even if a platform is removed and re-added.

As of version 1.1.0, changes made by the plugin are reversible, so removing a custom element from the config.xml will remove it from the platform configuration file on the next `prepare` operation,
and uninstalling the plugin will restore the original configuration files.

The plugin is registered on [npm](https://www.npmjs.com/package/cordova-custom-config) (requires Cordova CLI 5.0.0+) as `cordova-custom-config`

# Installation

Upon installing this plugin, an `after_plugin_add` hook script will run to satisfy npm dependencies defined in the package.json.
Any modules that need to be installed will be placed in a `node_modules` folder inside the project folder.

## Using the Cordova/Phonegap [CLI](http://docs.phonegap.com/en/edge/guide_cli_index.md.html)

    $ cordova plugin add cordova-custom-config
    $ phonegap plugin add cordova-custom-config

## Using [Cordova Plugman](https://github.com/apache/cordova-plugman)

    $ plugman install --plugin=cordova-custom-config --platform=<platform> --project=<project_path> --plugins_dir=plugins

For example, to install for the Android platform

    $ plugman install --plugin=cordova-custom-config --platform=android --project=platforms/android --plugins_dir=plugins

## PhoneGap Build
Add the following xml to your config.xml to use the latest version from [npm](https://www.npmjs.com/package/cordova-custom-config):

    <gap:plugin name="cordova-custom-config" source="npm" />

# Usage

The hook scripts included in this plugin are run after each platform `prepare` operation and apply preferences dictated by custom keys in the project `config.xml` file to the relevant platform config files.
As such, all you need to do to "use" this plugin is include the relevant keys in your config.xml and the scripts will take care of the rest when you build your project.

NOTE: There are no run-time source files included in this plugin - it is simply a convenient package of hook scripts.

## Backups

When the first `prepare` operation runs after the plugin is installed, it will make backup copies of the original configuration files before it makes any modifications. These backup copies are stored in `plugins/cordova-custom-config/backup/` and by default are restored before each `prepare` operation, allowing Cordova to make modifications and then the plugin to make further modifications after the `prepare`.

This means changes made by the plugin are reversible, so removing a custom element from the config.xml will remove it from the platform configuration file on the next `prepare` operation and uninstalling the plugin will restore the configuration files to their original state (before the plugin made any modifications).

Consequently, any manual changes made to the platform configuration files in `platforms/` **after** installing the plugin will be overwritten by the plugin on the next `prepare` operation.

To prevent auto-restoring of backups and make manual changes to platform configuration files persist, add the following preference inside the top-level `<widget>` element:

    <preference name="cordova-custom-config-autorestore" value="false" />

## Preferences

Preferences are set by defining a `<preference>` element in the config.xml, e.g. `<preference name="android-launchMode" value="singleTop" />`

1.  Preferences defined outside of the platform element will apply to all platforms
2.  Preferences defined inside a platform element will apply only to the specified platform
3.  Platform preferences take precedence over common preferences
4.  Platform-specific preferences must be prefixed with the platform name (e.g. `name="ios-somepref"`) and be defined inside a platform element.


## Config Files

config-file blocks allow platform-specific chunks of config to be defined as an XML subtree in the config.xml, which is then applied to the appropriate platform configuration file by the plugin.

1.  config-file elements MUST be defined inside a platform element, otherwise they will be ignored.
2.  config-file target attributes specify the target file to update. (AndroidManifest.xml or *-Info.plist)
3.  config-file parent attributes specify the parent element (AndroidManifest.xml) or parent key (*-Info.plist) that the child data will replace or be appended to.
4.  config-file elements are uniquely indexed by target AND parent for each platform.
5.  If there are multiple config-file's defined with the same target AND parent, the last config-file will be used
6.  Elements defined WITHIN a config-file will replace or be appended to the same elements relative to the parent element
7.  If a unique config-file contains multiples of the same elements (other than uses-permission elements which are selected by by the uses-permission name attribute), the last defined element will be retrieved.

## Android

### Android preferences

The plugin currently supports setting of custom config only in AndroidManifest.xml.

For a list of possible manifest values see [http://developer.android.com/guide/topics/manifest/manifest-intro.html](http://developer.android.com/guide/topics/manifest/manifest-intro.html)

### XPath prefernces

As of `cordova-custom-config@1.1.8`, Android manifest preferences are set by using XPaths in the preference name to define which element attribute the value should be applied to.

The preference name should be prefixed with `android-manifest` then follow with an XPath which specifies the element and attribute to apple the value to.

For example:

    <preference name="android-manifest/application/activity/@android:launchMode" value="singleTask" />

This preference specifies that the `launchMode` attribute should be given a value of `singleTask`:

    <activity android:launchMode="singleTask">

If your manifest contains other activities, you should specify the activity name in the XPath. Note that the activity name for Cordova 4.2.0 and below was "CordovaApp" whereas Cordova 4.3.0 and above is "MainActivity". For example:

    <preference name="android-manifest/application/activity[@android:name='MainActivity']/@android:launchMode" value="singleTask" />

If the attribute you are setting is on the root `<manifest>` element, just omit the element name and specify the attribute. For example:

    <preference name="android-manifest/@android:installLocation" value="auto" />

### Pre-defined preferences

Prior to `cordova-custom-config@1.1.8`, Android preferences were constrained to those explicitly defined by the plugin.
While these are still supported for backward compatibility, their use has been deprecated and will result in a warning message in the console output.

**NOTE**: Support pre-defined preferences will be removed in `cordova-custom-config@2`

Supported pre-defined preferences are:

* `android-manifest-hardwareAccelerated` => `//manifest@android:hardwareAccelerated`
* `android-activity-hardwareAccelerated` => `//manifest/application@android:hardwareAccelerated`
* `android-installLocation` => `//manifest@android:installLocation`
* `android-configChanges` => `//manifest/application/activity@android:installLocation`
* `android-launchMode` => `//manifest/application/activity@android:launchMode`
* `android-theme` => `//manifest/application/activity@android:theme`
* `android-windowSoftInputMode` => `//manifest/application/activity@android:windowSoftInputMode`

### Android example

    <platform name="android">
        <!--  custom preferences examples -->
        <preference name="android-manifest/application/activity/@android:windowSoftInputMode" value="stateVisible" />
        <preference name="android-manifest/@android:installLocation" value="auto" />
        <preference name="android-manifest/application/@android:hardwareAccelerated" value="false" />
        <preference name="android-manifest/@android:hardwareAccelerated" value="false" />
        <preference name="android-manifest/application/activity/@android:configChanges" value="orientation" />
        <preference name="android-manifest/application/activity/@android:theme" value="@android:style/Theme.Red.NoTitleBar" />

        <!-- specify activity name -->
        <preference name="android-manifest/application/activity[@android:name='MainActivity']/@android:launchMode" value="singleTask" />


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
    </platform>

## iOS

The plugin currently supports setting of custom settings in the project plist (`*-Info.plist`) and project settings (`project.pbxproj`) files.

### iOS preferences

1. Preferences should be defined in the format `<preference name="ios-SOME_BLOCK_TYPE-SOME_KEY" value="SOME_VALUE" />`
2. For example `<preference name="ios-XCBuildConfiguration-ENABLE_BITCODE" value="NO" />`
3. Currently `XCBuildConfiguration` is the only supported block type in the `project.pbxproj`.
4. However, there is no constraint on the list of keys for which values may be set.
5. If an entry already exists in an `XCBuildConfiguration` block for the specified key, the existing value will be overwritten with the specified value.
6. If no entry exists in any `XCBuildConfiguration` block for the specified key, a new key entry will be created in each `XCBuildConfiguration` block with the specified value.
7. By default, values will be applied to both "Release" and "Debug" `XCBuildConfiguration` blocks.
8. However, the block type can be specified by adding a `buildType` attribute to the `<preference>` element in the config.xml: value is either `debug` or `release`
9. For example `<preference name="ios-XCBuildConfiguration-IPHONEOS_DEPLOYMENT_TARGET" value="7.0" buildType="release" />`
10. Cordova uses some `.xcconfig` files in `/platforms/ios/cordova/` to override Xcode project settings with build-type specific values.
If a preference is defined in the `config.xml` which exists in one of the `.xcconfig` files, the value in the `config.xml` will be used to overwrite the value in the `.xcconfig` file,
as well as in the Xcode project file.
11. By default, a backup will be made of any modified `.xcconfig` file. Auto-restore of backups can be disabled by setting `<preference name="cordova-custom-config-autorestore" value="true" />`
12. If the preference contains a buildType attribute, it will be applied appropriately to the `build-debug.xcconfig` or `build-release.xcconfig` files.

### iOS example

    <platform name="ios">

        <!-- ENABLE_BITCODE to YES in Xcode project file and override NO value in /ios/cordova/build.xcconfig -->
        <preference name="ios-XCBuildConfiguration-ENABLE_BITCODE" value="YES" />

        <!-- Set deploy target SDKs for release and debug builds -->
        <preference name="ios-XCBuildConfiguration-IPHONEOS_DEPLOYMENT_TARGET" value="9.1" buildType="debug" />
        <preference name="ios-XCBuildConfiguration-IPHONEOS_DEPLOYMENT_TARGET" value="7.0" buildType="release" />

        <!-- Custom code signing profiles (overriding those already in /ios/cordova/*.xcconfig -->
        <preference name="ios-XCBuildConfiguration-CODE_SIGN_IDENTITY" value="Custom Developer" buildType="debug" />
        <preference name="ios-XCBuildConfiguration-CODE_SIGN_IDENTITY[sdk=iphoneos*]" value="Custom Developer (All iOS SDKs)" buildType="debug" />
        <preference name="ios-XCBuildConfiguration-CODE_SIGN_IDENTITY[sdk=iphoneos9.1]" value="Custom Developer (iOS 9.1)" buildType="debug" />
        <preference name="ios-XCBuildConfiguration-CODE_SIGN_IDENTITY" value="Custom Distribution" buildType="release" />
        <preference name="ios-XCBuildConfiguration-CODE_SIGN_IDENTITY[sdk=iphoneos*]" value="Custom Distribution (All iOS SDK)" buildType="release" />
        <preference name="ios-XCBuildConfiguration-CODE_SIGN_IDENTITY[sdk=iphoneos9.1]" value="Custom Distribution (iOS 9.1)" buildType="release" />

        <!-- Set orientation on iPhone -->
        <config-file platform="ios" target="*-Info.plist" parent="UISupportedInterfaceOrientations">
            <array>
                <string>UIInterfaceOrientationPortrait</string>
                <string>UIInterfaceOrientationPortraitUpsideDown</string>
            </array>
        </config-file>

        <!-- Set orientation on iPad -->
        <config-file platform="ios" target="*-Info.plist" parent="UISupportedInterfaceOrientations~ipad">
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
    </platform>

## Plugin preferences

The plugin supports some preferences which are used to customise the behaviour of the plugin. Each preference name is prefixed with `cordova-custom-config` to avoid name clashes, for example:

    <preference name="cordova-custom-config-autorestore" value="true" />

The following preferences are currently supported:

- `cordova-custom-config-autorestore` - if true, the plugin will restore a backup of platform configuration files taken at plugin installation time.
See [Backups](#backups) section for details. Defaults to true.
- `cordova-custom-config-stoponerror` - if true and an error occurs while updating config for a given platform during a `prepare` operation, the error will cause the `prepare` operation to fail.
If false, the plugin will log the error but will proceed and attempt to update any other platforms, before allowing the `prepare` operation to continue.
 Defaults to false.

## Log output

If you run the prepare operation with the `--verbose` command-line option, the plugin will output detail about the operations it's performing. Console messages are prefixed with `cordova-custom-config: `. For example:

    cordova prepare ios --verbose

# Example project

An example project illustrating use of this plugin can be found here: [https://github.com/dpa99c/cordova-custom-config-example](https://github.com/dpa99c/cordova-custom-config-example)

# TODO

See the [TODO list](https://github.com/dpa99c/cordova-custom-config/wiki/TODO) for planned features/improvements.


# Credits

Config update hook based on [this hook](https://github.com/diegonetto/generator-ionic/blob/master/templates/hooks/after_prepare/update_platform_config.js) by [Diego Netto](https://github.com/diegonetto)

NPM module dependency resolution is based on [this hook](https://github.com/nordnet/cordova-universal-links-plugin/blob/master/hooks/afterPluginAddHook.js) by [@nikDemyankov](https://github.com/nikDemyankov)