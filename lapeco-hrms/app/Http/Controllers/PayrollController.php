<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class PayrollController extends Controller
{
    public function index()
    {
        // TODO: Implement payroll listing
        return response()->json([]);
    }

    public function generate(Request $request)
    {
        // TODO: Implement payroll generation
        return response()->json(['message' => 'Payroll generated'], 201);
    }

    public function update(Request $request, $id)
    {
        // TODO: Implement payroll update
        return response()->json(['message' => 'Payroll updated']);
    }
}
