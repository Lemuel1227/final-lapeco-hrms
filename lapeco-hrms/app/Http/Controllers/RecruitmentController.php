<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class RecruitmentController extends Controller
{
    public function index()
    {
        // TODO: Implement recruitment listing
        return response()->json([]);
    }

    public function storeApplicant(Request $request)
    {
        // TODO: Implement applicant creation
        return response()->json(['message' => 'Applicant created'], 201);
    }

    public function updateApplicant(Request $request, $id)
    {
        // TODO: Implement applicant update
        return response()->json(['message' => 'Applicant updated']);
    }

    public function destroyApplicant($id)
    {
        // TODO: Implement applicant deletion
        return response()->json(null, 204);
    }
}
