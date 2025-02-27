/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>

#import "RNCConfig.h"

#import <React/RCTLinkingManager.h>
#import <React/RCTHTTPRequestHandler.h>

#import <FirebaseCore/FirebaseCore.h>
#import <FirebaseAuth/FirebaseAuth.h>

#import "RNSplashScreen.h"
#import <segment_analytics_react_native-Swift.h>

#import <UserNotifications/UserNotifications.h>

static NSString *const kRNConcurrentRoot = @"concurrentRoot";

// Use same key as react-native-secure-key-store
// so we don't reset already working installs
static NSString * const kHasRunBeforeKey = @"RnSksIsAppInstalled";

static void SetCustomNSURLSessionConfiguration() {
  RCTSetCustomNSURLSessionConfigurationProvider(^NSURLSessionConfiguration *{
    NSURLSessionConfiguration *configuration = [NSURLSessionConfiguration defaultSessionConfiguration];
    
    NSDictionary *infoDictionary = NSBundle.mainBundle.infoDictionary;
    NSString *appVersion = [infoDictionary objectForKey:@"CFBundleShortVersionString"];
    NSString *userAgentAppName = [RNCConfig envFor:@"APP_REGISTRY_NAME"];
    UIDevice *device = UIDevice.currentDevice;
    // Format we want: App/1.0.0 (iOS 15.0; iPhone)
    NSString *userAgent = [NSString stringWithFormat:@"%@/%@ (%@ %@; %@)", userAgentAppName, appVersion, device.systemName, device.systemVersion, device.model];
    configuration.HTTPAdditionalHeaders = @{ @"User-Agent": userAgent };
    
    return configuration;
  });
}

@interface AppDelegate ()

@property (nonatomic, weak) UIView *blurView;

@end

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  // Reset keychain on first run to clear existing Firebase credentials
  // Note: react-native-secure-key-store also does that but is run too late
  // and hence can't clear Firebase credentials
  [self resetKeychainIfNecessary];
  
  UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
  center.delegate = self;
  
  NSString *env = [RNCConfig envFor:@"FIREBASE_ENABLED"];
  NSString *deepLinkUrlScheme = [RNCConfig envFor:@"DEEP_LINK_URL_SCHEME"];
  if (env.boolValue) {
    [FIROptions defaultOptions].deepLinkURLScheme = deepLinkUrlScheme;
    [FIRApp configure];
  }
  
  SetCustomNSURLSessionConfiguration();
  
  self.moduleName = [RNCConfig envFor:@"APP_REGISTRY_NAME"];

  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  NSDate *now = [NSDate date];
  NSTimeInterval nowEpochSeconds = [now timeIntervalSince1970];
  NSNumber *nowEpochMs = @((long long)(nowEpochSeconds * 1000));

  self.initialProps = @{
    @"appStartedMillis": nowEpochMs
  };

  bool didFinish = [super application:application didFinishLaunchingWithOptions:launchOptions];
  
  [RNSplashScreen show];  // this needs to be called after [super application:application didFinishLaunchingWithOptions:launchOptions];
  
  return didFinish;
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

// Reset keychain on first app run, this is so we don't run with leftover items
// after reinstalling the app
- (void)resetKeychainIfNecessary
{
  NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
  if ([defaults boolForKey:kHasRunBeforeKey]) {
    return;
  }
  
  NSArray *secItemClasses = @[(__bridge id)kSecClassGenericPassword,
                              (__bridge id)kSecAttrGeneric,
                              (__bridge id)kSecAttrAccount,
                              (__bridge id)kSecClassKey,
                              (__bridge id)kSecAttrService];
  for (id secItemClass in secItemClasses) {
    NSDictionary *spec = @{(__bridge id)kSecClass:secItemClass};
    SecItemDelete((__bridge CFDictionaryRef)spec);
  }
  
  [defaults setBool:YES forKey:kHasRunBeforeKey];
  [defaults synchronize];
}


- (BOOL)application:(UIApplication *)application
            openURL:(NSURL *)url
            options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options {
  BOOL handled = [RCTLinkingManager application:application openURL:url options:options];
  // Deeplink tracking in segment
  [AnalyticsReactNative trackDeepLink:url withOptions:options];  
  return handled;
}

- (void)applicationDidEnterBackground:(UIApplication *)application
{
  // Prevent sensitive information from appearing in the task switcher
  // See https://developer.apple.com/library/archive/qa/qa1838/_index.html
  
  if (self.blurView) {
    // Shouldn't happen ;)
    return;
  }
  
  UIVisualEffect *blurEffect = [UIBlurEffect effectWithStyle:UIBlurEffectStyleLight];
  UIVisualEffectView *blurView = [[UIVisualEffectView alloc] initWithEffect:blurEffect];
  blurView.frame = self.window.bounds;
  self.blurView = blurView;
  [self.window addSubview:blurView];
}

- (void)applicationWillEnterForeground:(UIApplication *)application
{
  // Remove our blur
  [self.blurView removeFromSuperview];
  self.blurView = nil;
}

- (void)application:(UIApplication *)application didReceiveRemoteNotification:(NSDictionary *)userInfo fetchCompletionHandler:(void (^)(UIBackgroundFetchResult))completionHandler{
    NSLog(@"%@: did receive remote notification completionhandler: %@", self.description, userInfo);
    completionHandler(UIBackgroundFetchResultNewData);
}

// Universal Links
- (BOOL)application:(UIApplication *)application continueUserActivity:(NSUserActivity *)userActivity
 restorationHandler:(void (^)(NSArray<id<UIUserActivityRestoring>> * _Nullable))restorationHandler
{
  return [RCTLinkingManager 
            application:application
            continueUserActivity:userActivity
            restorationHandler:restorationHandler
         ];
}

#if RCT_NEW_ARCH_ENABLED

#pragma mark - RCTCxxBridgeDelegate

- (std::unique_ptr<facebook::react::JSExecutorFactory>)jsExecutorFactoryForBridge:(RCTBridge *)bridge
{
  _turboModuleManager = [[RCTTurboModuleManager alloc] initWithBridge:bridge
                                                             delegate:self
                                                            jsInvoker:bridge.jsCallInvoker];
  return RCTAppSetupDefaultJsExecutorFactory(bridge, _turboModuleManager);
}

#pragma mark RCTTurboModuleManagerDelegate

- (Class)getModuleClassFromName:(const char *)name
{
  return RCTCoreModulesClassProvider(name);
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const std::string &)name
                                                      jsInvoker:(std::shared_ptr<facebook::react::CallInvoker>)jsInvoker
{
  return nullptr;
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const std::string &)name
                                                     initParams:
                                                         (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return nullptr;
}

- (id<RCTTurboModule>)getModuleInstanceFromClass:(Class)moduleClass
{
  return RCTAppSetupDefaultModuleFromClass(moduleClass);
}

#endif

@end

