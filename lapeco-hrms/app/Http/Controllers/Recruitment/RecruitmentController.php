<?php
namespace App\Http\Controllers\Recruitment;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\Applicant;
use App\Models\Position;
use App\Traits\LogsActivity;

class RecruitmentController extends Controller
{
    use LogsActivity;

    /**
     * Recruitment activities API: returns applicants within a date range plus job openings list.
     */
    public function index(Request $request): JsonResponse
    {
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

        $query = Applicant::query()
            ->select([
                'id', 'first_name', 'middle_name', 'last_name', 'email', 'phone', 'gender',
                'job_opening_id', 'status', 'application_date', 'updated_at', 'interview_schedule'
            ])
            ->orderBy('application_date', 'desc');

        if ($startDate && $endDate) {
            $query->whereBetween('application_date', [$startDate, $endDate]);
        }

        $applicants = $query->get()->map(function (Applicant $a) {
            return [
                'id' => $a->id,
                'full_name' => $a->full_name,
                'email' => $a->email,
                'phone' => $a->phone,
                'gender' => $a->gender,
                'job_opening_id' => $a->job_opening_id,
                'status' => $a->status,
                'application_date' => $a->application_date,
                'updated_at' => $a->updated_at,
                'interview_schedule' => $a->interview_schedule,
            ];
        });

        $positions = Position::select('id', 'name')->orderBy('name')->get();

        $summary = [
            'total_applicants' => $applicants->count(),
            'hired' => $applicants->where('status', 'Hired')->count(),
            'rejected' => $applicants->where('status', 'Rejected')->count(),
            'interviews' => $applicants->where('status', 'Interview')->count(),
            'date_range' => $startDate && $endDate ? "$startDate to $endDate" : 'All time',
        ];

        return response()->json([
            'applicants' => $applicants,
            'job_openings' => $positions->map(function ($p) {
                return ['id' => $p->id, 'title' => $p->name];
            }),
            'summary' => $summary,
        ]);
    }

    /**
     * Recruitment statistics API: counts by status within date range.
     */
    public function statistics(Request $request): JsonResponse
    {
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

        $base = Applicant::query();
        if ($startDate && $endDate) {
            $base->whereBetween('application_date', [$startDate, $endDate]);
        }

        $total = (clone $base)->count();
        $hired = (clone $base)->where('status', 'Hired')->count();
        $interviews = (clone $base)->where('status', 'Interview')->count();
        $rejected = (clone $base)->where('status', 'Rejected')->count();

        return response()->json([
            'total_applicants' => $total,
            'interviews' => $interviews,
            'hired' => $hired,
            'rejected' => $rejected,
        ]);
    }

    public function storeApplicant(Request $request): JsonResponse
    {
        return response()->json(['message' => 'Applicant created'], 201);
    }

    public function updateApplicant(Request $request, $id): JsonResponse
    {
        return response()->json(['message' => 'Applicant updated']);
    }

    public function destroyApplicant($id): JsonResponse
    {
        return response()->json(null, 204);
    }
}




