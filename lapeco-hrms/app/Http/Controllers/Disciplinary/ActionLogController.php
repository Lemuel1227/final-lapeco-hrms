<?php
namespace App\Http\Controllers\Disciplinary;
use App\Http\Controllers\Controller;
use App\Models\ActionLog;
use App\Models\DisciplinaryCase;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ActionLogController extends Controller
{
    /**
     * Store a newly created action log for a disciplinary case.
     */
    public function store(DisciplinaryCase $disciplinaryCase, Request $request): JsonResponse
    {
        $user = $request->user();

        // Authorization: HR/Admin can always add; Team Leaders only if they are the submitter and case is approved
        $isTeamLeader = (bool)($user->is_team_leader ?? false);
        if ($isTeamLeader) {
            if (($disciplinaryCase->reported_by ?? null) !== $user->id) {
                return response()->json([
                    'message' => 'Access denied. Team leaders can only manage their own submitted reports.',
                    'error_type' => 'authorization_error'
                ], 403);
            }
            if (strtolower((string)$disciplinaryCase->approval_status) !== 'approved') {
                return response()->json([
                    'message' => 'Log interactions are available once HR approves this report.',
                    'error_type' => 'authorization_error'
                ], 403);
            }
        }

        $validated = $request->validate([
            'description' => ['required', 'string', 'max:5000'],
            'date_created' => ['nullable', 'date'],
        ]);

        $log = new ActionLog([
            'description' => $validated['description'],
            'date_created' => $validated['date_created'] ?? now(),
            'user_id' => $user->id,
        ]);

        $log->disciplinaryCase()->associate($disciplinaryCase);
        $log->save();

        // Load user + position for response
        $log->load('user.position');

        return response()->json($log, 201);
    }

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


