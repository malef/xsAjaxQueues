/**
 * xsAjaxQueues
 * Extension of jQuery.ajax function for queueing XMLHttpRequests
 *
 * @author mariusz.bak(at)xsolve.pl
 *         mariusz.alef.bak(at)gmail.com
 *
 * @revision 2010-08-19 20:10
 */

/**
 * dodać możliwość dołączania funkcji nasłuchujących poprzez przekazanie ich w opcjach zapytania/kolejki
 * dodać możliwość przekazywania funkcji inicjalizujących zapytania/kolejki
 */

"use strict";

(function($) {

  var jQueryAjax, xsAjaxQueues;

  jQueryAjax = $.ajax;

  xsAjaxQueues = (function() {

    /**********************************************************************************************
     * GLOBALS                                                                                    *
     **********************************************************************************************/

    var requestsCount = 0, queues = {}, filters = [];

    /**********************************************************************************************
     * WRAPPERS                                                                                   *
     **********************************************************************************************/

    /**
     * Request wrapper constructor
     */
    function RequestWrapper(request) {
      this.getId = function() {
        return request.id;
      };
      this.getSettings = function() {
        return request.settings;
      };

      this.getQueue = function() {
        if (request.queue !== undefined) {
          return request.queue.getWrapper();
        }
        else {
          return undefined;
        }
      };
      this.getQueueId = function() {
        var queue = this.getQueue();
        if (queue === undefined) {
          return undefined;
        }
        else {
          return queue.getId();
        }
      };
      this.getFlags = function() {
        return request.flags;
      };
      this.isSent = function() {
        return request.flags.sent;
      };
      this.isReceived = function() {
        return request.flags.received;
      };
      this.isProcessed = function() {
        return request.flags.processed;
      };
      this.isCanceled = function() {
        return request.flags.canceled;
      };
      this.isAborted = function() {
        return request.flags.aborted;
      };
      this.getXMLHttpRequest = function() {
        if (request.flags.sent) {
          return request.XMLHttpRequest;
        }
        else {
          return undefined;
        }
      };
      this.getCallback = function(name) {
        return request.getCallback(name);
      };
      this.setCallback = function(name, callback) {
        return request.setCallback(name, callback);
      };
      this.clearCallback = function(name) {
        return request.clearCallback(name);
      };
      this.cancel = function(abort) {
        return request.cancel(abort);
      };
      this.getCallbackArgs = function(name) {
        if (name !== 'success' && name !== 'error' && name !== 'complete') {
          throw("Incorrect callback name!");
        }
        if (request.flags[name]) {
          return request.args[name];
        }
        else {
          return undefined;
        }
      };
      this.getCallbackContext = function(name) {
        if (name !== 'success' && name !== 'error' && name !== 'complete') {
          throw("Incorrect callback name!");
        }
        if (request.flags[name]) {
          return request.contexts[name];
        }
        else {
          return undefined;
        }
      };
      this.addListener = function(listener) {
        request.addListener(listener);
        return this;
      };
      this.removeListener = function(listener) {
        return request.removeListener(listener);
      };
    }

    function QueueWrapper(queue) {
      this.getId = function() {
        return queue.settings.id;
      };
      this.getSettings = function() {
        return queue.settings;
      };
      this.isLocked = function() {
        return queue.locked;
      };
      this.isEnabled = function() {
        return queue.enabled;
      };
      this.enable = function() {
        queue.enable();
        return this;
      };
      this.disable = function() {
        queue.disable();
        return this;
      };
      this.toggle = function() {
        queue.toggle();
        return this;
      };
      this.cancel = function() {
        queue.cancel();
        return this;
      };
      this.getRequests = function() {
        var requests, requestWrappers;
        requests = queue.getRequests();
        requestWrappers = [];
        $.each(requests, function(i, r) {
          requestWrappers.push(r.getWrapper());
        });
        return requestWrappers;
      };
      this.getCounters = function() {
        var counters = queue.counters;
        counters.pending = queue.requests.length;
        return counters;
      };
      this.addListener = function(listener) {
        queue.addListener(listener);
        return this;
      };
      this.removeListener = function(listener) {
        return queue.removeListener(listener);
      };
    }

    /**********************************************************************************************
     * REQUESTS                                                                                   *
     **********************************************************************************************/

    function Request(queue, settings) {
      this.id = requestsCount;
      requestsCount = requestsCount + 1;
      this.queue = queue;
      this.settings = settings;
      this.flags = {
        sent: false,
        received: false,
        processed: false,
        canceled: false,
        aborted: false,
        success: false,
        error: false,
        complete: false
      };
      if (this.queue.settings.mode === 'response') {
        this.execute = {
          success: undefined,
          error: undefined,
          complete: undefined
        };
      }
      this.callbacks = {
        success: settings.success,
        error: settings.error,
        complete: settings.complete
      };
      this.contexts = {
        success: undefined,
        error: undefined,
        complete: undefined
      };
      this.args = {
        success: undefined,
        error: undefined,
        complete: undefined
      };

      this.listeners = [];

      if (this.queue !== undefined) {
        this.initializeQueued();
      }
      else {
        if (this.settings.wrapper) {
          this.initializeUnqueued();
        }
        this.send();
      }
    }

    Request.prototype.initializeQueued = function () {
      var that = this;
      $.each(['success', 'error', 'complete'], function(i, name) {
        that.callbacks[name] = that.settings[name];
        delete that.settings[name];
      });
    };

    Request.prototype.initializeUnqueued = function () {
      var that = this;
      $.each(['success', 'error', 'complete'], function(i, name) {
        that.callbacks[name] = that.settings[name];
        that.settings[name] = function() {
          that.executeCallback(name, this, arguments);
        };
      });
    };

    /**
     * Send request
     *
     * Sends request and sets related flag.
     *
     * @return Request
     */
    Request.prototype.send = function() {
      this.XMLHttpRequest = jQueryAjax(this.settings);
      this.setFlag('sent');
      return this;
    };
    
    Request.prototype.setFlag = function(name) {
      if (['sent', 'received', 'processed', 'canceled', 'aborted', 'success', 'error', 'complete'].indexOf(name) < 0) {
        throw("Incorrect flag name!");
      }
      this.flags[name] = true;
      this.dispatchEvent(name);
      return this;
    };

    /**
     * Get callback
     *
     * Gets current function for 'success', 'error' or 'complete' callback. Returns undefined if
     * there is no callback defined.
     *
     * @param name string
     *
     * @return function|undefined
     */
    Request.prototype.getCallback = function(name) {
      if (name !== 'success' && name !== 'error' && name !== 'complete') {
        throw("Incorrect callback name!");
      }
      return this.callbacks[name];
    };

    /**
     * Set callback
     *
     * Sets function for 'success', 'error' or 'complete' callback if request
     * was not processed yet. Returns false if request is marked as processed and callback
     * was already executed.
     *
     * @param name string
     * @param callback function
     *
     * @return boolean
     */
    Request.prototype.setCallback = function(name, callback) {
      if (name !== 'success' && name !== 'error' && name !== 'complete') {
        throw("Incorrect callback name!");
      }
      if (typeof(callback) !== 'function') {
        throw("Incorrect argument - function expected!");
      }
      if (!this.flags.processed) {
        this.callbacks[name] = callback;
        return true;
      }
      else {
        return false;
      }
    };

    /**
     * Clear callback
     *
     * Removes current function for 'success', 'error' or 'complete' callback if request
     * was not processedyet. Returns false if request is already marked as processed and
     * callback was already executed.
     *
     * @param name string
     *
     * @return boolean
     */
    Request.prototype.clearCallback = function(name) {
      if (name !== 'success' && name !== 'error' && name !== 'complete') {
        throw("Incorrect callback name!");
      }
      if (this.flags.received && !this.flags.processed) {
        delete this.callbacks.current[name];
        return true;
      }
      else {
        return false;
      }
    };

    Request.prototype.executeCallback = function(name, context, args) {
      if (name !== 'success' && name !== 'error' && name !== 'complete') {
        throw("Incorrect callback name!");
      }
      if (this.contexts[name] === undefined || this.args[name] === undefined) {
        this.contexts[name] = context;
        this.args[name] = args;
      }
      if (this.callbacks[name] !== undefined) {
        this.callbacks[name].apply(context, args);
      }
      this.setFlag(name);
      if (name === 'complete') {
        this.setFlag('processed');
      }
    };

    /**
     * Cancel request
     *
     * Cancels request or optionally abort it if it was already sent, preventing callbacks from
     * being executed. Returns true if request was successfully canceled or aborted. For unqueued
     * requests use only with abort option set to true, as they are sent immediately on creation.
     *
     * @param abort boolean
     *
     * @return boolean
     */
    Request.prototype.cancel = function(abort) {
      if (abort === undefined) {
        abort = false;
      }
      if (!this.flags.canceled && !this.flags.aborted) {
        if (!this.flags.sent) {
          this.setFlag('canceled');
          if (this.queue !== null) {
            this.queue.cancelRequest(this, abort);
          }
          return true;
        }
        else if (abort && !this.flags.received) {
          this.setFlag('aborted');
          if (this.queue !== null) {
            this.XMLHttpRequest.abort();
            this.queue.cancelRequest(this, abort);
          }
          return true;
        }
        else {
          return false;
        }
      }
      else {
        return true;
      }
    };

    /**
     * Get request wrapper
     *
     * Returns wrapper object with interface to public methods and various getters and setters.
     *
     * @return RequestWrapper
     */
    Request.prototype.getWrapper = function() {
      return new RequestWrapper(this);
    };

    Request.prototype.addListener = function(listener) {
      if (typeof(listener) !== 'function') {
        throw("Function expected!");
      }
      this.listeners.push(listener);
      return this;
    };

    Request.prototype.removeListener = function(listener) {
      var index;
      $.each(this.listeners, function(i) {
        if (this === listener) {
          index = i;
          return false;
        }
      });
      if (index !== undefined) {
        this.listeners.splice(index, 1);
        return true;
      }
      else {
        return false;
      }
    };

    Request.prototype.dispatchEvent = function(name) {
      var that = this, data;
      if (typeof(name) !== 'string' || name === '') {
        throw("String expected!");
      }
      data = arguments;
      $.each(this.listeners, function () {
        this.apply(that.getWrapper(), data);
      });
      return this;
    };

    /**********************************************************************************************
     * QUEUES                                                                                     *
     **********************************************************************************************/

    /**
     * @todo Improve settings checking and default settings fallback
     */
    function Queue(settings) {
      var defaultSettings;
      if (queues[settings.id] !== undefined) {
        throw("Queue '" + settings.id + "' already exists!");
      }
      queues[settings.id] = this;
      defaultSettings = {
        order: 'fifo',
        mode: 'request'
      };
      this.settings = $.extend({}, defaultSettings, settings);
      this.locked = false;
      this.enabled = true;
      this.requests = [];
      this.counters = {
        added: 0,
        sent: 0,
        received: 0,
        processed: 0,
        canceled: 0,
        aborted: 0,
        callbacks: {
          success: 0,
          error: 0,
          complete: 0
        }
      };
      this.listeners = [];
    }

    Queue.prototype.getWrapper = function() {
      return new QueueWrapper(this);
    };

    /**
     * Add new request to queue
     *
     * Adds request to the beggining or to the end of the queue. Tries to sends next request.
     *
     * @return Request
     */
    Queue.prototype.addRequest = function(requestSettings) {
      var request = new Request(this, requestSettings);
      switch (this.settings.order) {
        case 'fifo':
          this.requests.push(request);
          break;
        case  'lifo':
          this.requests.unshift(request);
          break;
      }
      this.counters.added = this.counters.added + 1;
      request.dispatchEvent('added'); // @todo enable attaching event listeners by passing option in request settings to enable to catch this event
      this.dispatchEvent('added', request.getWrapper());
      this.sendRequest();
      return request;
    };

    /**
     * Get all pending requests
     *
     * Returns array of all pending requests added to the queue listed in order of addition
     * to the queue.
     *
     * @return array
     */
    Queue.prototype.getRequests = function() {
      return this.requests;
    };

    /**
     * Delete request from queue
     *
     * Removes passed request object from queue. All request wrappers remain connected
     * with original request object.
     * 
     * @param deletedRequest Request
     * @return Queue
     */
    Queue.prototype.deleteRequest = function(request) {
      var index;
      $.each(this.requests, function(i) {
        if (this === request) {
          index = i;
          return false;
        }
      });
      if (index === undefined) {
        throw("Request not in queue!");
      }
      this.requests.splice(index, 1);
      return this;
    };

    /**
     * Enable queue
     * 
     * Enables queue and tries to send next request.
     *
     * @author mariusz.alef.bak(at)gmail.com
     *
     * @return Queue
     */
    Queue.prototype.enable = function() {
      this.enabled = true;
      this.dispatchEvent('enabled');
      this.sendRequest();
      return this;
    };

    /**
     * Disable queue
     *
     * @author mariusz.alef.bak(at)gmail.com
     *
     * @return Queue
     */
    Queue.prototype.disable = function() {
      this.enabled = false;
      this.dispatchEvent('disabled');
      return this;
    };

    /**
     * Toggle queue
     *
     * Disables or enables queue and if enabled tries to send next request.
     *
     * @return Queue
     */
    Queue.prototype.toggle = function() {
      if (this.enabled) {
        this.disable();
      }
      else {
        this.enable();
      }
      return this;
    };

    /**
     * Send next request
     *
     * Checks if there is request waiting to be sent and sends it if queueu is enabled and not
     * locked. Adds custom callbacks depending on queue mode. Updates related counters. 
     *
     * @return Queue
     */
    Queue.prototype.sendRequest = function() {
      var that = this, request, nextRequest;
      if (this.enabled && !this.locked) {
        request = this.getNextRequest(function(request) {
          return !request.flags.sent && !request.flags.canceled;
        });
        if (request !== undefined) {
          switch (this.settings.mode) {

            case 'request':
              $.each(['success', 'error', 'complete'], function(i, name) {
                request.settings[name] = function() {
                  if (!request.flags.aborted) {
                    if (!request.flags.received) {
                      request.setFlag('received');
                      that.dispatchEvent('received', request.getWrapper());
                    }
                    request.executeCallback(name, this, arguments);
                    that.dispatchEvent(name, request.getWrapper());
                    that.counters.callbacks[name] = that.counters.callbacks[name] + 1;
                    if (name === 'complete') {
                      that.deleteRequest(request);
                      that.counters.received = that.counters.received + 1;
                      that.counters.processed = that.counters.processed + 1;
                      that.locked = false;
                      that.dispatchEvent('processed', request.getWrapper());
                      nextRequest = that.getNextRequest(function(request) {
                        return !request.flags.sent && !request.flags.canceled;
                      });
                      if (nextRequest === undefined) {
                        that.dispatchEvent('allProcessed');
                      }
                      else {
                        that.sendRequest();
                      }
                    }
                  }
                };
              });
              request.send();
              this.counters.sent = this.counters.sent + 1;
              this.locked = true;
              this.dispatchEvent('sent', request.getWrapper());
              nextRequest = this.getNextRequest(function(request) {
                return !request.flags.sent && !request.flags.canceled;
              });
              if (nextRequest === undefined) {
                this.dispatchEvent('allSent');
              }
              break;

            case 'response':
              $.each(['success', 'error', 'complete'], function(i, name) {
                if (!request.flags.aborted) {
                  request.settings[name] = function() {
                    request.execute[name] = true;
                    request.contexts[name] = this;
                    request.args[name] = arguments;
                    if (name === 'complete') {
                      request.setFlag('received');
                      that.counters.received = that.counters.received + 1;
                      that.dispatchEvent('received', request.getWrapper());
                      that.processRequest();
                    }
                  };
                }
              });
              request.send();
              this.counters.sent = this.counters.sent + 1;
              this.dispatchEvent('sent', request.getWrapper());
              nextRequest = this.getNextRequest(function(request) {
                return !request.flags.sent && !request.flags.canceled;
              });
              if (nextRequest === undefined) {
                this.dispatchEvent('allSent');
              }
              else {
                this.sendRequest();
              }
              break;

          }
        }
      }
      return this;
    };

    /**
     * Process next request
     *
     * Checks if there is request waiting to be processed and executes its callbacks if queueu
     * is enabled. Updates related counters.
     *
     * @return Queue
     */
    Queue.prototype.processRequest = function() {
      var that = this, request;
      if (this.enabled) {
        request = this.getNextRequest(function(request) {
          return request.flags.sent && !request.flags.aborted && !request.flags.processed;
        });
        if (request !== undefined && request.flags.received) {
          $.each(['success', 'error', 'complete'], function(i, name) {
            if (request.execute[name]) {
              request.executeCallback(name, request.contexts[name], request.args[name]);
              that.counters.callbacks[name] = that.counters.callbacks[name] + 1;
            }
          });
          this.counters.processed = this.counters.processed + 1;
          this.deleteRequest(request);
          request.setFlag('processed');
          this.dispatchEvent('processed', request.getWrapper());
          this.processRequest();
        }
        else {
          request = this.getNextRequest(function(request) {
            return !request.flags.processed;
          });
          if (request === undefined) {
            this.dispatchEvent('allProcessed');
          }
        }
      }
      return this;
    };

    /**
     * Cancel request
     *
     * Removes canceled request from queue and checks if it is possible to send or process nest
     * request. Updates related counters.
     *
     * @return Queue
     */
    Queue.prototype.cancelRequest = function(request, abort) {
      if (request.queue === this) {
        if (!request.flags.sent) {
          this.deleteRequest(request);
          this.counters.canceled = this.counters.canceled + 1;
          this.dispatchEvent('canceled', request.getWrapper());
        }
        else if (abort && request.flags.sent && !request.flags.processed) {
          switch (this.settings.mode) {
            case 'request':
              this.counters.aborted = this.counters.aborted + 1;
              this.locked = false;
              this.dispatchEvent('aborted', request.getWrapper());
              this.sendRequest();
              break;
            case 'response':
              this.counters.aborted = this.counters.aborted + 1;
              this.dispatchEvent('aborted', request.getWrapper());
              this.processRequest();
              break;
          }
          this.deleteRequest(request);
        }
      }
      return this;
    };

    /**
     * Get next request
     *
     * Finds next request which should be sent depending on queue mode and priority settings.
     *
     * @return Request
     */
    Queue.prototype.getNextRequest = function(filterCallback) {
      var filteredRequests, sortCallback, topPriority, topIndex;
      if (filterCallback === undefined) {
        filteredRequests = this.requests;
      }
      else {
        filteredRequests = this.requests.filter(filterCallback);
      }
      if (filteredRequests.length > 0) {
        if (this.settings.priority === undefined) {
          return filteredRequests[0];
        }
        else if (this.settings.priority === 'asc' || this.settings.priority === 'desc') {
          switch (this.settings.priority) {
            case 'asc':
              sortCallback = function(requestPriority, currentPriority) {
                return requestPriority < currentPriority;
              };
              break;
            case 'desc':
              sortCallback = function(requestPriority, currentPriority) {
                return requestPriority > currentPriority;
              };
              break;
          }
          $.each(filteredRequests, function(i, request) {
            if (topPriority === undefined || sortCallback(request.settings.priority, topPriority)) {
              topIndex = i;
              topPriority = request.settings.priority;
            }
          });
          return filteredRequests[topIndex];
        }
      }
      else {
        return undefined;
      }
    };

    /**
     * Cancel queue
     *
     * Cancels all requests and optionaly aborts sent request preventing their callbacks execution.
     *
     * @return Request
     */
    Queue.prototype.cancel = function(abort) {
      var i;
      if (abort === undefined) {
        abort = false;
      }
      i = 0;
      do {
        if (!this.requests[i].cancel(abort)) {
          i = i + 1;
        }
      } while (i < this.requests.length);
      return this;
    };

    Queue.prototype.addListener = function(listener) {
      if (typeof(listener) !== 'function') {
        throw("Function expected!");
      }
      this.listeners.push(listener);
      return this;
    };

    Queue.prototype.removeListener = function(listener) {
      var index;
      $.each(this.listeners, function(i) {
        if (this === listener) {
          index = i;
          return false;
        }
      });
      if (index !== undefined) {
        this.listeners.splice(index, 1);
        return true;
      }
      else {
        return false;
      }
    };

    Queue.prototype.dispatchEvent = function(name) {
      var that = this, data;
      if (typeof(name) !== 'string' || name === '') {
        throw("String expected!");
      }
      data = arguments;
      $.each(this.listeners, function () {
        this.apply(that, data);
      });
      return this;
    };

    /**********************************************************************************************
     * MAIN FUNCTIONS                                                                             *
     **********************************************************************************************/

    function newQueue(queueSettings) {
      var queue;
      if (queueSettings.id === undefined) {
        throw("No queue id!");
      }
      if (queues[queueSettings.id] !== undefined) {
        throw("Queue " + queueSettings.id + " already exists!");
      }
      queue = new Queue(queueSettings);
      queues[queueSettings.id] = queue;
      return queue.getWrapper();
    }

    function getQueue(queueId) {
      if (queueId === undefined) {
        throw("No queue id!");
      }
      if (queues[queueId] === undefined) {
        throw("Queue " + queueId + " does not exist!");
      }
      return queues[queueId].getWrapper();
    }

    function newUnqueuedRequest(requestSettings) {
      var request = new Request(undefined, requestSettings);
      return request.getWrapper();
    }

    function newQueuedRequest(requestSettings) {
      var queueId, queue, request;
      if (typeof(requestSettings.queue) === 'object' && requestSettings.queue !== undefined && typeof(requestSettings.queue.getId) === 'function') {
        // queueWrapper object passed
        queueId = requestSettings.queue.getId();
      }
      else {
        // queue id passed
        queueId = requestSettings.queue;
      }
      if (queueId === undefined) {
        throw('No queue id!');
      }
      if (queues[queueId] === undefined) {
        throw("Queue " + queueId + " does not exist!");
      }
      queue = queues[queueId];
      request = queue.addRequest(requestSettings);
      return request.getWrapper();
    }

    function addFilter(callback) {
      filters.push(callback);
    }

    function removeFilter(callback) {
      filters.filter(function(c) {
        return (c !== callback)
      });
    }

    function applyFilters(requestSettings) {
      var filteredSettings;
      $.each(filters, function() {
         filteredSettings = this(requestSettings);
         if (filteredSettings !== undefined) {
           return false;
         }
      });
      if (filteredSettings !== undefined) {
        return filteredSettings;
      }
      else {
        return requestSettings;
      }
    }


    /**********************************************************************************************
     * INTERFACE                                                                                  *
     **********************************************************************************************/

    return {
      newQueue: newQueue,
      getQueue: getQueue,
      newQueuedRequest: newQueuedRequest,
      newUnqueuedRequest: newUnqueuedRequest,
      addFilter: addFilter,
      applyFilters: applyFilters
    };

  }(jQuery));

  $.ajax = function(requestSettings) {
    var requestWrapper;
    requestSettings = xsAjaxQueues.applyFilters(requestSettings);
    if (requestSettings.queue === undefined) {
      requestWrapper = xsAjaxQueues.newUnqueuedRequest(requestSettings);
    }
    else if (typeof(requestSettings.queue) === 'number' || typeof(requestSettings.queue) === 'string' || (typeof(requestSettings.queue) === 'object' && requestSettings.queue !== undefined && typeof(requestSettings.queue.getId) === 'function')) {
      requestWrapper = xsAjaxQueues.newQueuedRequest(requestSettings);
    }
    else {
      throw("Incorrect queue parameter - id or queueWrapper object expected!");
    }
    if (requestSettings.wrapper) {
      return requestWrapper;
    }
    else {
      return requestWrapper.getXMLHttpRequest();
    }
  };

  $.ajaxQueue = function() {
    switch (typeof(arguments[0])) {
      case 'object':
        return xsAjaxQueues.newQueue(arguments[0]);
        break;
      case 'number':
      case 'string':
        return xsAjaxQueues.getQueue(arguments[0]);
        break;
      case 'function':
        xsAjaxQueues.addFilter(arguments[0]);
        break;
    }
  };

}(jQuery));