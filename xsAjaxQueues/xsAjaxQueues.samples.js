/**
 * xsAjaxQueues
 *
 * Code samples
 * 
 * @author mariusz.bak(at)xsolve.pl mariusz.alef.bak(at)gmail.com
 */

jQuery(function() {

  var $ = jQuery;

  /************************************************************************************************
   * SIMPLE REQUESTS                                                                              *
   ************************************************************************************************/

  /**
   * Send request and later alter its callback functions.
   */
  var requestHandle1 = $.ajax({
    type: "POST",
    url: "sleep.php",
    data: {sleep: 3}, // it will be 3 seconds until response
    success: function() {
      alert("Base 'success' callback - it will not be executed because callback functions will be altered 2 seconds after sending the request.");
      debugger; // intentional
    },
    complete: function() {
      alert("Base 'complete' callback - it will not be executed because callback functions will be altered 2 seconds after sending the request.");
      debugger; // intentional
    },
    wrapper: true
  });
  // alter request callback functions 1 second after sending the request
  setTimeout(function() {
    requestHandle1.setCallback('success', function() {
      alert("Successfully altered 'success' callback will execute when response will be received.");
    });
    requestHandle1.setCallback('complete', function() {
      alert("Successfully altered 'complete' callback will execute when response will be received.");
    });
  }, 1000);

  /**
   * Send request and abort it
   */
  var requestHandle2 = $.ajax({
    type: "POST",
    url: "sleep.php",
    data: {sleep: 3}, // it will be 3 seconds until response
    complete: function() {
      alert("This callback should not be executed because the request will be aborted");
    },
    wrapper: true
  });
  // abort request 2 seconds after sending the request
  requestHandle2.addListener(function(event) {
    if (event === 'aborted') {
      alert("The request was aborted.");
    }
  });

  /**
   * Send request and check response after it is received and processed
   */
  var requestHandle3 = $.ajax({
    type: "POST",
    url: "sleep.php",
    data: {sleep: 3}, // it will be 3 seconds until response arrives
    wrapper: true
  });
  // Even though no 'complete' or 'success' callback function was defined, arguments and context
  // that would be passed to these functions can be inspected
  requestHandle3.addListened(function(event) {
    if (event === 'processed') {
      var successThis = requestHandle3.getCallbackContext('success');
      var successArgs = requestHandle3.getCallbackArgs('success');
      var completeThis = requestHandle3.getCallbackContext('complete');
      var completeArgs = requestHandle3.getCallbackArgs('complete');
      debugger; // intentional
    }
  });

  /************************************************************************************************
   * QUEUES AND QUEUED REQUESTS                                                                   *
   ************************************************************************************************/

  // simple FIFO queue, no priorities, request queueing
  $.ajaxQueue({
    id: 'fifo_request'
  });

  // simple LIFO queue, no priorities, request queueing
  $.ajaxQueue({
    id: 'lifo_request',
    order: 'lifo'
  });

  // simple FIFO queue, no priorities, response queueing
  // get queue handle
  var queueHandle1 = $.ajaxQueue({
    name: 'lifo_response',
    order: 'lifo',
    mode: 'response'
  });

  // simple FIFO queue, descending priorities, response queueing
  $.ajaxQueue({
    id: 'fifo_priority_response',
    priority: 'desc',
    mode: 'response'
  });
  
  // get queue handle by queue name
  var queueHandle2 = $.ajaxQueue('fifo_priority_response');

  // disable queue
  queueHandle2.disable();
  
  // add request to selected queue
  $.ajax({
    queue: 'fifo_request',
    type: "POST",
    url: "sleep.php",
    data: {sleep: 2}
  });

  // enable queue
  // pending requests will be sent immediately
  queueHandle2.enable();

  // get queue counters of sent, received, processed, aborted, cancelled and pending requests
  var queueCounters = queueHandle2.getCounters();

  // cancel all requests that have not been sent yet
  queueHandle2.cancel();

  // cancel all requests that have not been sent yet and abort those that were sent
  queueHandle2.cancel(true);

});