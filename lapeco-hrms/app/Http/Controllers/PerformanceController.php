<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class PerformanceController extends Controller
{
    public function index()
    {
        // TODO: Implement performance listing
        return response()->json([]);
    }

    public function storeEvaluation(Request $request)
    {
        // TODO: Implement evaluation creation
        return response()->json(['message' => 'Evaluation created'], 201);
    }

    public function updateEvaluation(Request $request, $id)
    {
        // TODO: Implement evaluation update
        return response()->json(['message' => 'Evaluation updated']);
    }
}
