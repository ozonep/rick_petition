"use strict";

var canvas = document.getElementById("myCanvas");
var context = canvas.getContext("2d");
var mouse = {x:0, y:0};
var draw = false;
var drawComplete = false;
var submit = document.getElementById("subm");
var hidden = document.getElementById("hidden");

context.strokeStyle = "#df4b26";
context.lineJoin = "round";
context.lineWidth = 2;

canvas.addEventListener("mousedown", (e) => {
    e.preventDefault();
    mouse.x = e.pageX - canvas.offsetLeft;
    mouse.y = e.pageY - canvas.offsetTop;
    draw = true;
    context.beginPath();
    context.moveTo(mouse.x, mouse.y);

});

canvas.addEventListener("mousemove", (e) => {
    if (draw === true)   {
        mouse.x = e.pageX - canvas.offsetLeft;
        mouse.y = e.pageY - canvas.offsetTop;
        context.lineTo(mouse.x, mouse.y);
        context.stroke();
    }
});

canvas.addEventListener("mouseup", (e) => {
    mouse.x = e.pageX - canvas.offsetLeft;
    mouse.y = e.pageY - canvas.offsetTop;
    context.lineTo(mouse.x, mouse.y);
    context.stroke();
    context.closePath();
    draw = false;
    drawComplete = true;
});

submit.addEventListener("mousedown", () => {
    if (drawComplete) hidden.value = canvas.toDataURL();
});