<?php

function route($url, $page) {
    if ($_SERVER['REQUEST_URI'] === $url) {
        require __DIR__ . '/pages/' . $page;
        exit;
    }
}