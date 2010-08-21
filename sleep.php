<?php

sleep(isset($_REQUEST['sleep']) ? $_REQUEST['sleep'] : 1);
echo json_encode($_REQUEST); 