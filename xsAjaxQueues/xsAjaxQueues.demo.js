/**
 * Extension of jQuery.ajax function for queueing XML HTTP requests
 *
 * @author mariusz.bak(at)xsolve.pl
 *         mariusz.alef.bak(at)gmail.com
 */

"use strict";

jQuery((function($) {

  return function() {

    var xsAjaxQueuesDemo, queues, requests;

    xsAjaxQueuesDemo = (function() {

      /**********************************************************************************************
       * COMMON                                                                                     *
       **********************************************************************************************/

      var queueDisplays = {};

      function getQueueDisplay(id) {
        return queueDisplays[id];
      }

      /**********************************************************************************************
       * REQUEST DISPLAY                                                                            *
       **********************************************************************************************/

      function QueueDisplay(queueHandle, container) {
        var that = this, markup, queueSettings;

        queueDisplays[queueHandle.getId()] = this;
        this.queueHandle = queueHandle;
        this.queueHandle.disable();
        this.queueHandle.addListener(function() {
          that.update();
        });
        this.container = $(container);

        markup = $(
          '<span class="queue-display">' +
          '<span class="queue-toggle">enable</span><span class="queue-slide">show</span>' +
          '<span class="queue-id">queue <span class="value" /></span>' +
          '<span class="queue-order">order <span class="value" /></span>' +
          '<span class="queue-priority">priority <span class="value" /></span>' +
          '<span class="queue-mode">mode <span class="value" /></span>' +
          '<span class="queue-counters">' +
          '<span class="queue-counter">added <span class="value" /></span>' +
          '<span class="queue-counter">sent <span class="value" /></span>' +
          '<span class="queue-counter">received <span class="value" /></span>' +
          '<span class="queue-counter">processed <span class="value" /></span>' +
          '<span class="queue-counter">canceled <span class="value" /></span>' +
          '<span class="queue-counter">aborted <span class="value" /></span>' +
          '</span>' +
          '<span class="queue-details">' +
          '<span class="queue-requests"><span class="queue-requests-header">Requests</span></span>' +
          '</span>' +
          '</span>'
        );
        this.elements = {
          main: markup,
          toggle: $('.queue-toggle', markup),
          slide: $('.queue-slide', markup),
          id: $('.queue-id', markup),
          order: $('.queue-order', markup),
          priority: $('.queue-priority', markup),
          mode: $('.queue-mode', markup),
          requests: $('.queue-requests', markup),
          details: $('.queue-details', markup),
          counters: {}
        };
        $.each(['added', 'sent', 'received', 'processed', 'canceled', 'aborted'], function(i, name) {
          that.elements.counters[name] = $('.queue-counter', markup).eq(i);
        });

        queueSettings = this.queueHandle.getSettings();
        $('.value', this.elements.id).text(this.queueHandle.getId());
        $('.value', this.elements.mode).html(queueSettings.order.mode ? queueSettings.order.mode : 'request');
        $('.value', this.elements.order).html(queueSettings.order ? queueSettings.order.order : 'fifo');
        $('.value', this.elements.priority).html(queueSettings.order.priority ? queueSettings.order.priority : '~');

        this.elements.slide.toggle(function() {
          that.elements.slide.html('hide');
          that.elements.details.slideDown(500);
        }, function() {
          that.elements.slide.html('show');
          that.elements.details.slideUp(500);
        });
        this.elements.details.hide();

        this.elements.toggle.click(function() {
          that.queueHandle.toggle();
          if (that.queueHandle.isEnabled()) {
            that.elements.toggle.text('disable');
          }
          else
          {
            that.elements.toggle.text('enable');
          }
        });

        this.update();

        this.container.append(this.elements.main);
      }

      QueueDisplay.prototype.update = function() {
        var that = this, counters;
        counters = this.queueHandle.getCounters();
        $.each(['added', 'sent', 'received', 'processed', 'canceled', 'aborted'], function(i, name) {
          $('.value', that.elements.counters[name]).html(counters[name]);
        });
      };

      /**********************************************************************************************
       * REQUEST DISPLAY                                                                            *
       **********************************************************************************************/

      function RequestDisplay(requestHandle) {

        var that = this, markup, requestSettings;

        this.requestHandle = requestHandle;
        this.queueDisplay = getQueueDisplay(requestHandle.getQueueId());
        this.container = this.queueDisplay.elements.requests;

        markup = $(
          '<span class="request-display">' +
          '<span class="request-priority">priority <span class="value" /></span>' +
          '<span class="request-sleep">delay <span class="value" /></span>' +
          '<span class="request-callbacks">' +
          '<span class="request-callback">success</span>' +
          '<span class="request-callback">error</span>' +
          '<span class="request-callback">complete</span>' +
          '</span>' +
          '<span class="request-flags">' +
          '<span class="request-flag">sent</span>' +
          '<span class="request-flag">canceled</span>' +
          '<span class="request-flag">aborted</span>' +
          '</span>' +
          '<span class="request-buttons">' +
          '<span class="request-button">c</span>' +
          '<span class="request-button">a</span>' +
          '<span class="request-button">i</span>' +
          '</span>' +
          '</span>'
        );
        this.elements = {
          main: markup,
          priority: $('.request-priority', markup),
          sleep: $('.request-sleep', markup),
          callbacks: {},
          flags: {},
          buttons: {}
        };
        $.each(['success', 'error', 'complete'], function(i, name){
          that.elements.callbacks[name] = $('.request-callback', markup).eq(i).css({opacity: '0.25'});
        });
        $.each(['sent', 'canceled', 'aborted'], function(i, name){
          that.elements.flags[name] = $('.request-flag', markup).eq(i).css({opacity: '0.25'});
        });
        $.each(['cancel', 'abort', 'inspect'], function(i, name){
          that.elements.buttons[name] = $('.request-button', markup).eq(i);
        });

        requestSettings = this.requestHandle.getSettings();
        $('.value', this.elements.priority).text(requestSettings.priority ? requestSettings.priority : '~');
        $('.value', this.elements.sleep).text(requestSettings.data.sleep ? requestSettings.data.sleep : '~');
        this.setPriorityColor(requestSettings.priority ? requestSettings.priority : 0);

        // button events
        this.elements.buttons.cancel.click(function() {
          that.requestHandle.cancel();
        });
        this.elements.buttons.abort.click(function() {
          that.requestHandle.cancel(true);
        });
        this.elements.buttons.inspect.click(function() {
          var inspect = {};
          $.each(['success', 'error', 'complete'], function(i, callback) {
            inspect[callback] = {
              context: requestHandle.getCallbackContext(callback),
              args: requestHandle.getCallbackArgs(callback)
            };
          });
          debugger; // intentional
        });

        this.requestHandle.addListener(function(event) {
          switch (event) {
            case 'sent':
            case 'canceled':
            case 'aborted':
              that.setFlag(event);
              break;
            case 'success':
            case 'error':
            case 'complete':
              that.setCallback(event);
              break;
          }
        });

        this.container.append(this.elements.main);
      }

      RequestDisplay.prototype.setCallback = function(name) {
        this.elements.callbacks[name].css({opacity: '1'});
        if (name === 'complete') {
          this.elements.main.css({backgroundColor: '#ffffff', border: '6px solid transparent'});
        }
      };

      RequestDisplay.prototype.setPriorityColor = function(priority) {
        var main, other, total, rgb;
        main = 1;
        other = 1 - priority / 8;
        total = (main + 2 * other) / 3;
        main = Math.min(Math.floor(188 * main / total), 255);
        other = Math.floor(188 * other / total);
        if (priority === 0) {
          main = main + 20;
          other = other + 20;
        }
        rgb = 'rgb(' + main + ',' + main + ',' + other + ')';
        this.elements.main.css({backgroundColor: rgb});
      };

      RequestDisplay.prototype.setFlag = function(name) {
        this.elements.flags[name].css({opacity: '1'});
      };

      /**********************************************************************************************
       * INTERFACE                                                                                  *
       **********************************************************************************************/

      function addQueue(queueHandle) {
        var queueDisplay = new QueueDisplay(queueHandle, '#demo-container');
      }

      function addRequest(requestHandle) {
        var requestDisplay = new RequestDisplay(requestHandle);
      }

      return {
        addQueue: addQueue,
        addRequest: addRequest
      };

    }());
    
    queues = [
      {id: 'fifo_request'},
      {id: 'lifo_request', order: 'lifo'},
      {id: 'lifo_response', order: 'lifo', mode: 'response'},
      {id: 'fifo_priority_request', priority: 'desc'},
      {id: 'fifo_priority_response', priority: 'desc', mode: 'response'},
    ];

    $.each(queues, function() {
      xsAjaxQueuesDemo.addQueue($.ajaxQueue(this));
    });

    requests = [
      {queue: 'fifo_request', type: "POST", url: "sleep.php", data: {sleep: 2}},
      {queue: 'fifo_request', type: "POST", url: "error.php", data: {sleep: 4}},
      {queue: 'fifo_request', type: "POST", url: "sleep.php", data: {sleep: 3}},
      {queue: 'fifo_request', type: "POST", url: "sleep.php", data: {sleep: 2}},
      {queue: 'fifo_request', type: "POST", url: "sleep.php", data: {sleep: 1}},
      {queue: 'fifo_request', type: "POST", url: "sleep.php", data: {sleep: 4}},
      {queue: 'fifo_request', type: "POST", url: "sleep.php", data: {sleep: 3}},
      {queue: 'fifo_request', type: "POST", url: "sleep.php", data: {sleep: 2}},
      {queue: 'lifo_request', type: "POST", url: "sleep.php", data: {sleep: 2}},
      {queue: 'lifo_request', type: "POST", url: "error.php", data: {sleep: 4}},
      {queue: 'lifo_request', type: "POST", url: "sleep.php", data: {sleep: 3}},
      {queue: 'lifo_request', type: "POST", url: "sleep.php", data: {sleep: 2}},
      {queue: 'lifo_request', type: "POST", url: "sleep.php", data: {sleep: 1}},
      {queue: 'lifo_request', type: "POST", url: "sleep.php", data: {sleep: 4}},
      {queue: 'lifo_request', type: "POST", url: "sleep.php", data: {sleep: 3}},
      {queue: 'lifo_request', type: "POST", url: "sleep.php", data: {sleep: 2}},
      {queue: 'lifo_response', type: "POST", url: "sleep.php", data: {sleep: 1}},
      {queue: 'lifo_response', type: "POST", url: "sleep.php", data: {sleep: 3}},
      {queue: 'lifo_response', type: "POST", url: "sleep.php", data: {sleep: 7}},
      {queue: 'lifo_response', type: "POST", url: "sleep.php", data: {sleep: 3}},
      {queue: 'lifo_response', type: "POST", url: "error.php", data: {sleep: 5}},
      {queue: 'lifo_response', type: "POST", url: "sleep.php", data: {sleep: 2}},
      {queue: 'lifo_response', type: "POST", url: "sleep.php", data: {sleep: 5}},
      {queue: 'lifo_response', type: "POST", url: "sleep.php", data: {sleep: 2}},
      {queue: 'fifo_priority_request', priority: 3, type: "POST", url: "sleep.php", data: {sleep: 1}},
      {queue: 'fifo_priority_request', priority: 1, type: "POST", url: "sleep.php", data: {sleep: 4}},
      {queue: 'fifo_priority_request', priority: 2, type: "POST", url: "sleep.php", data: {sleep: 2}},
      {queue: 'fifo_priority_request', priority: 4, type: "POST", url: "sleep.php", data: {sleep: 3}},
      {queue: 'fifo_priority_request', priority: 1, type: "POST", url: "sleep.php", data: {sleep: 2}},
      {queue: 'fifo_priority_request', priority: 2, type: "POST", url: "sleep.php", data: {sleep: 5}},
      {queue: 'fifo_priority_request', priority: 1, type: "POST", url: "sleep.php", data: {sleep: 3}},
      {queue: 'fifo_priority_request', priority: 3, type: "POST", url: "sleep.php", data: {sleep: 1}},
      {queue: 'fifo_priority_response', priority: 3, type: "POST", url: "sleep.php", data: {sleep: 1}},
      {queue: 'fifo_priority_response', priority: 1, type: "POST", url: "sleep.php", data: {sleep: 5}},
      {queue: 'fifo_priority_response', priority: 2, type: "POST", url: "sleep.php", data: {sleep: 6}},
      {queue: 'fifo_priority_response', priority: 4, type: "POST", url: "sleep.php", data: {sleep: 2}},
      {queue: 'fifo_priority_response', priority: 1, type: "POST", url: "sleep.php", data: {sleep: 1}},
      {queue: 'fifo_priority_response', priority: 2, type: "POST", url: "sleep.php", data: {sleep: 1}},
      {queue: 'fifo_priority_response', priority: 1, type: "POST", url: "sleep.php", data: {sleep: 9}},
      {queue: 'fifo_priority_response', priority: 3, type: "POST", url: "sleep.php", data: {sleep: 3}}
    ];

    $.each(requests, function() {
      this.handle = true;
      if (this.queue !== 'fifo_priority_response') {
        // sending requests with $.ajax
        xsAjaxQueuesDemo.addRequest($.ajax(this));
      }
      else {
        // sending requests with queue handle addRequest method
        var queueHandle = $.ajaxQueue('fifo_priority_response');
        xsAjaxQueuesDemo.addRequest(queueHandle.addRequest(this));
      }
    });

    $.ajaxQueue({id: 'intercepted_requests', priority: 'desc', mode: 'request', initializer: function() { alert(this.getId()); } }); //.disable();

    $.ajaxFilter(function() {
      return (this.queue === undefined);
    }, function() {
      this.queue = 'intercepted_requests';
      if (this.data || this.data.sleep || this.data.sleep > 4) {
        this.priority = 0;
      }
      else {
        this.priority = 1;
      }
      return this;
    },
    function() {
      this.addListener(function(event) {
        $('body').append($('<p />').text('post ' + event + ' ' + this.getId()));
      });
    });

    $.ajax({type: "POST", url: "sleep.php", data: {sleep: 5}, listeners: [
      function(event) {
        $('body').append($('<p />').append($('<em />').text(event)));
      }
    ]});

    $.ajax({type: "POST", url: "sleep.php", data: {sleep: 6}});
    $.ajax({type: "POST", url: "sleep.php", data: {sleep: 5}});
    $.ajax({type: "POST", url: "sleep.php", data: {sleep: 2}});
    $.ajax({type: "POST", url: "sleep.php", data: {sleep: 1}});
    $.ajax({type: "POST", url: "sleep.php", data: {sleep: 1}});
    $.ajax({type: "POST", url: "sleep.php", data: {sleep: 9}});
    $.ajax({type: "POST", url: "sleep.php", data: {sleep: 3}});

  };

}(jQuery)));
