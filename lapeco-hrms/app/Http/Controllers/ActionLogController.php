<?php

namespace App\Http\Controllers;

use App\Models\ActionLog;
use Illuminate\Http\JsonResponse;

class ActionLogController extends Controller
{
    /**
     * Remove the specified action log from storage.
     */
    public function destroy(ActionLog $actionLog): JsonResponse
    {
        $actionLog->delete();

        return response()->json([
            'message' => 'Action log deleted successfully'
        ]);
    }
}