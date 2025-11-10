import Constants from 'expo-constants'
import { APP_BUNDLE_ID, APP_NAME } from 'src/config'
import { v4 as uuidv4 } from 'uuid'
import { Hex } from 'viem'

const UUID = uuidv4()
const ICON_BASE64 = Constants.expoConfig?.extra?.appIconBase64 as string | undefined

export function getInjectedProviderScript({
  isConnected = false,
  chainId = null,
}: {
  isConnected: boolean
  chainId: Hex | null
}): string {
  return `
    (function() {
      // Prevent multiple injections
      if (window.ethereum) {
        return;
      }

      var _isConnected = ${isConnected};
      var _chainId = ${JSON.stringify(chainId)};

      var requestId = 0;
      var pendingRequests = {};
      var eventListeners = {};

      // Generate unique request ID
      function generateRequestId() {
        return 'req_' + (++requestId) + '_' + Date.now();
      }

      // Execute callback with error handling
      function executeCallback(callback, data) {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      }

      // Update internal state based on events
      function updateInternalState(event, data) {
        switch (event) {
          case 'connect':
            if (data && data.chainId) {
              _chainId = data.chainId;
              _isConnected = true;
            }
            break;
          case 'disconnect':
            _isConnected = false;
            break;
        }
      }

      // Handle responses from React Native
      function handleResponse(response) {
        var id = response.id;
        var result = response.result;
        var error = response.error;
        var resolver = pendingRequests[id];
        
        if (resolver) {
          delete pendingRequests[id];
          if (error) {
            resolver.reject(error);
          } else {
            resolver.resolve(result);
          }
        }
      }

      // Handle events from React Native
      function handleEvent(eventData) {
        var event = eventData.event;
        var data = eventData.data;
        
        // Update internal state
        updateInternalState(event, data);
        
        var listeners = eventListeners[event] || [];
        for (var i = 0; i < listeners.length; i++) {
          executeCallback(listeners[i], data);
        }
      }

      // Ethereum provider
      window.ethereum = {        
        request: function(args) {
          var method = args.method;
          var params = args.params || [];
          
          return new Promise(function(resolve, reject) {
            var id = generateRequestId();
            var request = {
              id: id,
              method: method,
              params: params
            };

            // Store the promise resolvers
            pendingRequests[id] = { resolve: resolve, reject: reject };

            // Send request to React Native
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'request',
              data: request
            }));
          });
        },

        on: function(event, callback) {
          if (!eventListeners[event]) {
            eventListeners[event] = [];
          }
          eventListeners[event].push(callback);
          
          // Auto-fire 'connect' event for late subscribers
          if (event === 'connect' && _isConnected && _chainId) {
            executeCallback(callback, { chainId: _chainId });
          }
        },

        removeListener: function(event, callback) {
          var listeners = eventListeners[event];
          if (listeners) {
            var index = listeners.indexOf(callback);
            if (index > -1) {
              listeners.splice(index, 1);
            }
          }
        },

        // Internal methods for React Native communication
        _handleResponse: handleResponse,
        _handleEvent: handleEvent,
      };

      // EIP-6963 Provider Discovery
      function announceProvider() {
        var info = {
          uuid: ${JSON.stringify(UUID)},
          name: ${JSON.stringify(APP_NAME)},
          rdns: ${JSON.stringify(APP_BUNDLE_ID)},
          icon: ${JSON.stringify(ICON_BASE64)},
        };

        window.dispatchEvent(
          new CustomEvent('eip6963:announceProvider', {
            detail: { info: info, provider: window.ethereum }
          })
        );
      }

      // Listen for dapp requests for providers
      window.addEventListener('eip6963:requestProvider', announceProvider);

      // Announce immediately
      announceProvider();
    })();
    true; // Required for injection to work
  `
}
