cordova-custom-config plugin
============================

* [Overview](#overview)
* [Installation](#installation)
* [Notes](#notes)
    * [Preferences](#preferences)
    * [Config Files](#config-files)
* [Example usage](#example-usage)
    * [Android](#android)
        * [AndroidManifest.xml](#androidmanifest.xml)
    * [iOS](#ios)
        * [-Info.plist](-info.plist)
* [Example project](#example-project)
* [TODO](#todo)
* [Credits](#credits)

# Overview

This Cordova/Phonegap plugin for iOS and Android provides hook scripts to update platform configuration files based on preferences and config-file data defined in config.xml.

The plugin is registered on [npm](https://www.npmjs.com/package/cordova-custom-config) (requires Cordova CLI 5.0.0+) as `cordova-custom-config`

# Installation

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

# Notes

Currently only the AndroidManifest.xml and IOS *-Info.plist file are supported.

## Preferences

1.  Preferences defined outside of the platform element will apply to all platforms
2.  Preferences defined inside a platform element will apply only to the specified platform
3.  Platform preferences take precedence over common preferences
4.  The preferenceMappingData object contains all of the possible custom preferences to date including the target file they belong to, parent element, and destination element or attribute

## Config Files

1.  config-file elements MUST be defined inside a platform element, otherwise they will be ignored.
2.  config-file target attributes specify the target file to update. (AndroidManifest.xml or *-Info.plist)
3.  config-file parent attributes specify the parent element (AndroidManifest.xml) or parent key (*-Info.plist) that the child data will replace or be appended to.
4.  config-file elements are uniquely indexed by target AND parent for each platform.
5.  If there are multiple config-file's defined with the same target AND parent, the last config-file will be used
6.  Elements defined WITHIN a config-file will replace or be appended to the same elements relative to the parent element
7.  If a unique config-file contains multiples of the same elements (other than uses-permission elements which are selected by by the uses-permission name attribute), the last defined element will be retrieved.

# Example usage

The hook scripts included in the plugin are run after each platform `prepare` operation and apply preferences dictated by custom keys in the project `config.xml` file to the relevant platform config files.
For Android, this is currently only the AndroidManifest.xml. For iOS, this is currently on the *-Info.plist.

As such, all you need to do is include the custom keys in your config.xml and the scripts will take care of the rest when you build your project.

NOTE: There are no run-time source files included in this plugin - it is simply a convenient package of hook scripts.

NOTE: Currently, items aren't removed from the platform config files if you remove them from config.xml.
For example, if you add a custom permission, build the remove it, it will still be in the manifest.
If you make a mistake, for example adding an element to the wrong parent, you may need to remove and add your platform,
or revert to your previous manifest/plist file.

## Android

### AndroidManifest.xml

NOTE: For possible manifest values see http://developer.android.com/guide/topics/manifest/manifest-intro.html

    <platform name="android">
        //These preferences are actually available in Cordova by default although not currently documented
        <preference name="android-minSdkVersion" value="10" />
        <preference name="android-maxSdkVersion" value="22" />
        <preference name="android-targetSdkVersion" value="121" />

         //custom preferences examples
         <preference name="android-windowSoftInputMode" value="stateVisible" />
         <preference name="android-installLocation" value="auto" />
         <preference name="android-launchMode" value="singleTop" />
         <preference name="android-activity-hardwareAccelerated" value="false" />
         <preference name="android-manifest-hardwareAccelerated" value="false" />
         <preference name="android-configChanges" value="orientation" />
         <preference name="android-theme" value="@android:style/Theme.Black.NoTitleBar" />

         <config-file target="AndroidManifest.xml" parent="/*>
            <supports-screens
                android:xlargeScreens="false"
                android:largeScreens="false"
                android:smallScreens="false" />

            <uses-permission android:name="android.permission.READ_CONTACTS" android:maxSdkVersion="15" />
            <uses-permission android:name="android.permission.WRITE_CONTACTS" />
        </config-file>
    </platform>

## iOS

### -Info.plist

    <platform name="ios">
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


# Example project

An example project illustrating use of this plugin can be found here: [https://github.com/dpa99c/cordova-custom-config-example](https://github.com/dpa99c/cordova-custom-config-example)

# TODO

See the [TODO list](https://github.com/dpa99c/cordova-custom-config/wiki/TODO) for planned features/improvements.

# Credits

Config update hook based on [this hook](https://github.com/diegonetto/generator-ionic/blob/master/templates/hooks/after_prepare/update_platform_config.js) by [Diego Netto](https://github.com/diegonetto)

NPM module dependency resolution is based on [this hook](https://github.com/nordnet/cordova-universal-links-plugin/blob/master/hooks/afterPluginAddHook.js) by [@nikDemyankov](https://github.com/nikDemyankov)