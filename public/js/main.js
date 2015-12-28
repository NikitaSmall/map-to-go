"use strict";

$(document).ready(function() {
  if (window["WebSocket"]) {
        var conn = new WebSocket("ws://localhost:3000/hub");
        conn.onclose = function(evt) {
            console.log("Connection closed.");
        }
        conn.onmessage = function(evt) {
            console.log(evt.data);
        }
        conn.onopen = function(evt) {
            console.log("Connection opened.");
        }
    }
});
