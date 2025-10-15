<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Since this is now an API-only application, these routes are minimal.
| The main functionality is in routes/api.php
|
*/

Route::get('/', function () {
    return view('api-docs');
});

// Redirect all dashboard routes to API documentation
Route::get('/dashboard{any}', function () {
    return redirect('/');
})->where('any', '.*');