<html>
  <head>

    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <title>xsAjaxQueues - jQuery AJAX queues and requests extension demo</title>
    
    <!-- jQuery and jQuery-UI -->
    <script type="text/javascript" src="jquery/jquery-1.4.2.js"></script>
    <link type="text/css" href="jquery/ui-lightness/jquery-ui-1.8.2.custom.css" rel="stylesheet" />
    <script type="text/javascript" src="jquery/jquery-ui-1.8.2.custom.min.js"></script>

    <!-- xsAjaxQueues -->
    <script type="text/javascript" src="xsAjaxQueues/xsAjaxQueues.js"></script>

    <!-- xsAjaxQueues demo -->
    <link rel="stylesheet" href="xsAjaxQueues/xsAjaxQueues.demo.css" type="text/css" />
    <script type="text/javascript" src="xsAjaxQueues/xsAjaxQueues.demo.js"></script>

  </head>

  <body>
    <h1 id="header">xsAjaxQueues - jQuery AJAX queues and requests extension demo</h1>
    <div id="copyright">&copy; 2010 Mariusz Alef Bąk <a href="mailto:mariusz.bak@xsolve.pl">mariusz.bak(at)xsolve.pl</a> <a href="mailto:mariusz.alef.bak@gmail.com">mariusz.alef.bak(at)gmail.com</a></div>
    <div id="description">
      <p><strong>FIFO_REQUEST queue</strong> - Requests added as first are sent as first. Next request is sent only if previous is complete (ends with an error or returns response.</p>
      <p><strong>LIFO_REQUEST queue</strong> - Requests added as last are sent as first. Next request is sent only if previous is complete (ends with an error or returns response.</p>
      <p><strong>LIFO_RESPONSE queue</strong> - Requests added as last are sent as first. Next request can be sent as soon as it is added, but response callbacks will not be executed before response from previous request is processed.</p>
      <p><strong>FIFO_PRIORITY_REQUEST queue</strong> - Requests are sent according to their priority. If few requests have the same priority requests added as first are sent as first. Next request is sent only if previous is complete (ends with an error or returns response.</p>
      <p><strong>FIFO_PRIORITY_RESPONSE queue</strong> - Requests are sent according to their priority. If few requests have the same priority requests added as first are sent as first. Next request can be sent as soon as it is added, but response will not be executed before response from previous request is processed.</p>
    </div>
    <div id="demo-container"></div>
    <div>
      <a id="code-samples" href="xsAjaxQueues/xsAjaxQueues.samples.js" target="_blank">Browse code samples</a>
      <a id="slideshow" href="slideshow/xsAjaxQueus.pdf" target="_blank">View slideshow</a>
      <a id="github" href="https://github.com/mariusz-alef-bak/xsAjaxQueues" target="_blank">Fork on GitHub</a>
    </div>
  </body>
</html>
